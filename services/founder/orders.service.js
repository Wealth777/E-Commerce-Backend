const mongoose = require("mongoose");

const vendorModel = require("../../models/vendor.model");
const buyerModel = require("../../models/buyer.model");
const orderModel = require("../../models/buyerOrder.model");
const auditLogModel = require("../../models/auditLog.model");

const requestInfo = require("../../utils/getRequestHelper");

const AppError = require('../common/AppError');

const logger = require("../../logger");

const getAllOrders = async ({
    page = 1,
    limit = 20,
    search = "",
    status = "",
    paymentStatus = "",
    paymentMethod = "",
    deliveryMethod = "",
    startDate = "",
    endDate = "",
} = {}) => {
    try {
        const parsedPage = Math.max(Number(page) || 1, 1);

        const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100 );
        const skip = (parsedPage - 1) * parsedLimit;

        const filter = {};

        if (status) {
            filter.status = status;
        }

        if (paymentStatus) {
            filter["payment.status"] = paymentStatus;
        }

        if (paymentMethod) {
            filter["payment.method"] = paymentMethod;
        }

        if (deliveryMethod) {
            filter["delivery.method"] = deliveryMethod;
        }

        if (startDate || endDate) {
            filter.createdAt = {};

            if (startDate) {
                const start = new Date(startDate);
                if (Number.isNaN(start.getTime())) {
                    throw new AppError("Invalid start date", 400);
                }
                start.setHours(0, 0, 0, 0);
                filter.createdAt.$gte = start;
            }

            if (endDate) {
                const end = new Date(endDate);
                if (Number.isNaN(end.getTime())) {
                    throw new AppError("Invalid end date",);
                }
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        if (search?.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");

            const [buyers, vendors] =
                await Promise.all([
                    buyerModel
                        .find({
                            $or: [
                                {fullName: searchRegex,},
                                {email: searchRegex,},
                            ],
                            isDeleted: false,
                        })
                        .select("_id")
                        .lean(),

                    vendorModel
                        .find({
                            $or: [
                                {fullName: searchRegex,},
                                {email: searchRegex, },
                                {"business.storeName": searchRegex,},
                            ],
                            isDeleted: false,
                        })
                        .select("_id")
                        .lean(),
                ]);

            const buyerIds = buyers.map((buyer) => buyer._id);
            const vendorIds = vendors.map((vendor) => vendor._id);

            filter.$or = [{code: searchRegex,},];

            if (buyerIds.length > 0) {
                filter.$or.push({
                    buyer: {$in: buyerIds,},
                });
            }

            if (vendorIds.length > 0) {
                filter.$or.push({
                    vendor: {$in: vendorIds,},
                });
            }
        }

        const [orders, total] =
            await Promise.all([
                orderModel
                    .find(filter)
                    .populate({
                        path: "buyer",
                        select: "fullName email serialNumber phoneNo student.profilePhoto",
                    })
                    .populate({
                        path: "vendor",
                        select: "fullName email serialNumber phoneNo business",
                    })
                    .populate({
                        path: "items.productId",
                        select: "name image price",
                    })
                    .sort({createdAt: -1,})
                    .skip(skip)
                    .limit(parsedLimit)
                    .lean(),

                orderModel.countDocuments(filter),
            ]);

        return {
            orders,
            pagination: {
                page: parsedPage,
                limit: parsedLimit,
                total,
                totalPages: Math.ceil(total / parsedLimit),
                hasNextPage: parsedPage < Math.ceil(total / parsedLimit),
                hasPreviousPage: parsedPage > 1,
            },
        };
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        logger.error("Failed to fetch all orders",
            {
                error: error.message,
                stack: error.stack,
            }
        );
        throw new AppError("Failed to fetch orders", 500);
    }
};

const getOrderById = async (orderId) => {
    try {
        if (
            !mongoose.Types.ObjectId.isValid(
                orderId
            )
        ) {
            throw new AppError("Invalid order ID",400);
        }

        const order =
            await orderModel
                .findById(orderId)
                .populate({
                    path: "buyer",
                    select:
                        "fullName email serialNumber phoneNo student profilePhoto accountStatus isActive",
                })
                .populate({
                    path: "vendor",
                    select:
                        "fullName email serialNumber phoneNo business accountStatus isActive verificationStatus",
                })
                .populate({
                    path: "items.productId",
                    select:
                        "name description image price originalPrice stock category status",
                })
                .populate({
                    path: "cancelledBy.user",
                    select:
                        "fullName email serialNumber",
                })
                .populate({
                    path: "refundRequest.reviewedBy",
                    select:
                        "fullName email serialNumber",
                })
                .populate({
                    path: "returnRequest.reviewedBy",
                    select:
                        "fullName email serialNumber",
                })
                .lean();

        if (!order) { throw new AppError("Order not found",404); }

        return order;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        logger.error("Failed to fetch order details",
            {
                orderId,
                error: error.message,
                stack: error.stack,
            }
        );

        throw new AppError("Failed to fetch order details", 500);
    }
};

const getOrderStats = async () => {
    try {
        const now = new Date();

        const startOfToday = new Date(now);

        startOfToday.setHours( 0, 0, 0, 0 );

        const startOfMonth = new Date( now.getFullYear(), now.getMonth(), 1 );

        const [
            totalOrders,
            pendingOrders,
            confirmedOrders,
            shippedOrders,
            deliveredOrders,
            cancelledOrders,
            paymentPending,
            paymentPaid,
            paymentFailed,
            refundRequests,
            returnRequests,
            todayOrders,
            monthOrders,
        ] = await Promise.all([
            orderModel.countDocuments(),

            orderModel.countDocuments({ status: "pending", }),

            orderModel.countDocuments({ status: "confirmed", }),

            orderModel.countDocuments({ status: "shipped", }),

            orderModel.countDocuments({ status: "delivered", }),

            orderModel.countDocuments({ status: "cancelled", }),

            orderModel.countDocuments({ "payment.status": "pending", }),

            orderModel.countDocuments({ "payment.status": "paid", }),

            orderModel.countDocuments({ "payment.status":  "failed", }),

            orderModel.countDocuments({ "refundRequest.requested": true, }),

            orderModel.countDocuments({ "returnRequest.requested": true, }),

            orderModel.countDocuments({ createdAt: {$gte: startOfToday,} }),

            orderModel.countDocuments({ createdAt: {$gte: startOfMonth,} }),
        ]);

        return {
            orders: {
                total: totalOrders,
                pending: pendingOrders,
                confirmed: confirmedOrders,
                shipped: shippedOrders,
                delivered: deliveredOrders,
                cancelled: cancelledOrders,
            },

            payments: {
                pending: paymentPending,
                paid: paymentPaid,
                failed: paymentFailed,
            },

            disputes: {
                refundRequests,
                returnRequests,
            },

            activity: {
                today: todayOrders,
                thisMonth: monthOrders,
            },
        };
    } catch (error) {
        logger.error("Failed to fetch order statistics",
            {
                error: error.message,
                stack: error.stack,
            }
        );
        throw new AppError("Failed to fetch order statistics",500);
    }
};

module.exports = {
    getAllOrders,
    getOrderById,
    getOrderStats,
};