const BuyerOrder = require("../../models/buyerOrder.model");
const AuditLog = require("../../models/auditLog.model");
const logger = require("../../logger");

const { safeCreateNotification, } = require("../notification/notification.service");

const orderSocket = require("../../sockets/order.socket");

const AUTO_CANCEL_HOURS = 72;

const AUTO_CANCEL_REASON = "Vendor did not respond within 72 hours";

const autoCancelExpiredOrders = async () => {
    const cutoffTime = new Date(
        Date.now() - AUTO_CANCEL_HOURS * 60 * 60 * 1000
    );

    try {
        const expiredOrders = await BuyerOrder.find({
            status: "pending",
            "payment.status": "pending",
            createdAt: {
                $lte: cutoffTime,
            },
        });

        if (expiredOrders.length === 0) {
            logger.info("No expired orders found for automatic cancellation.");
            return {
                cancelledCount: 0,
                orders: [],
            };
        }

        const cancelledOrders = [];

        for (const order of expiredOrders) {
            const previousStatus = order.status;

            const cancelledOrder = await BuyerOrder.findOneAndUpdate(
                {
                    _id: order._id,
                    status: "pending",
                    "payment.status": "pending",
                    createdAt: {
                        $lte: cutoffTime,
                    },
                },
                {
                    $set: {
                        status: "cancelled",
                        cancelledBy: {
                            role: "system",
                            cancelledAt: new Date(),
                        },
                        cancellationReason: AUTO_CANCEL_REASON,
                    },
                },
                {
                    new: true,
                }
            );

            if (!cancelledOrder) {
                continue;
            }

            cancelledOrders.push(cancelledOrder);

            try {
                orderSocket.emitOrderCancelled({
                    order: cancelledOrder,
                    buyerId: cancelledOrder.buyer,
                    vendorId: cancelledOrder.vendor,
                });
            } catch (socketError) {
                logger.error(
                    "Auto cancellation socket error:",
                    socketError
                );
            }

            const orderRef = cancelledOrder._id
                ? `#${cancelledOrder._id
                      .toString()
                      .slice(-8)
                      .toUpperCase()}`
                : "N/A";

            await safeCreateNotification({
                recipientId: cancelledOrder.buyer,
                recipientRole: "buyer",
                type: "ORDER_AUTO_CANCELLED",
                title: "Order automatically cancelled",
                message: `Your order ${orderRef} was automatically cancelled because the vendor did not respond within 72 hours.`,
                metadata: {
                    orderId: cancelledOrder._id,
                    vendorId: cancelledOrder.vendor,
                    reason: AUTO_CANCEL_REASON,
                },
                dedupeKey: `buyer:${cancelledOrder.buyer}:ORDER_AUTO_CANCELLED:${cancelledOrder._id}`,
            });

            await AuditLog.create({
                user: cancelledOrder.buyer,
                userModel: "Buyer",
                role: "buyer",
                action: "ORDER_AUTO_CANCELLED",
                entity: "ORDER",
                entityId: cancelledOrder._id,
                metadata: {
                    previousStatus,
                    newStatus: "cancelled",
                    reason: AUTO_CANCEL_REASON,
                    orderCreatedAt: cancelledOrder.createdAt,
                    cancelledAt: new Date(),
                },
            });
        }

        logger.info(`Automatically cancelled ${cancelledOrders.length} expired order(s).`);

        return {
            cancelledCount: cancelledOrders.length,
            orders: cancelledOrders,
        };
    } catch (error) {
        logger.error("Auto Cancel Expired Orders Error:", error);
        throw error;
    }
};

module.exports = { autoCancelExpiredOrders, };