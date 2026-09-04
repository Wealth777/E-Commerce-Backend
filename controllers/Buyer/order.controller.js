const logger = require("../../logger");
const buyerModel = require("../../models/buyer.model");
const AuditLog = require("../../models/auditLog.model");
const AddProduct = require("../../models/addproduct.model");
const BuyerOrder = require("../../models/buyerOrder.model");
const Cart = require("../../models/addToCart.model");
const notificationService = require("../../services/notification/notification.service");
const orderSocket = require("../../sockets/order.socket");

const mongoose = require("mongoose");

const {
  sendResponse,
  sendSuccess,
  sendError,
} = require("../../utils/responseStruture");

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return number;
};


const toPositiveNumber = (value, fallback = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return fallback;
  }
  return number;
};

const getOrderReference = (order) => {
  if (!order?._id) {
    return "N/A";
  }
  return `#${order._id.toString().slice(-8).toUpperCase()}`;
};

const abortTransaction = async (session) => {
  if (session?.inTransaction()) {
    await session.abortTransaction();
  }
};

const notifyAfterOrderPlaced = async ({ buyerId, orders }) => {
  for (const order of orders) {
    try {
      const orderRef = getOrderReference(order);
      await notificationService.safeCreateNotification({
        recipientId: buyerId,
        recipientRole: "buyer",
        type: "ORDER_PLACED",
        title: "Order placed",
        message: `Your order ${orderRef} has been placed successfully.`,
        metadata: {
          orderId: order._id,
          vendorId: order.vendor,
          orderRef,
        },
        dedupeKey: `buyer:${buyerId}:BUYER_ORDER_PLACED:${order._id}`,
      });

      await notificationService.safeCreateNotification({
        recipientId: order.vendor,
        recipientRole: "vendor",
        type: "ORDER_PLACED",
        title: "New order received",
        message: `A buyer placed a new order ${orderRef}.`,
        metadata: {
          orderId: order._id,
          buyerId,
          orderRef,
        },
        dedupeKey: `vendor:${order.vendor}:VENDOR_ORDER_PLACED:${order._id}`,
      });
    } catch (notificationError) {
      logger.error(
        "Order notification error:",
        notificationError
      );
    }
  }
};

exports.createBuyerOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const userId = req.user._id;

    let {
      items,
      orderTotal,
      delivery,
      paymentMethod,
      note,
      state,
      address,
      deliveryFee,
    } = req.body;

    try {
      items = typeof items === "string"
        ? JSON.parse(items)
        : items;
    } catch (error) {
      await abortTransaction(session);
      return sendResponse(res, 400, false, "Invalid items format");
    }

    if (!Array.isArray(items) || items.length === 0) {
      await abortTransaction(session);
      return sendResponse(res, 400, false, "Cart is empty");
    }

    if (!["pay_now", "pod"].includes(paymentMethod)) {
      await abortTransaction(session);
      return sendResponse(res, 400, false, "Invalid payment method");
    }

    if (!["standard", "express"].includes(delivery)) {
      await abortTransaction(session);
      return sendResponse(res, 400, false, "Invalid delivery method");
    }

    const buyer = await buyerModel.findById(userId).session(session);

    if (!buyer) {
      await abortTransaction(session);
      return sendResponse(res, 404, false, "Buyer not found");
    }

    const invalidProductId = items.some(
      (item) => !item?.id || !isValidObjectId(item.id)
    );

    if (invalidProductId) {
      await abortTransaction(session);
      return sendResponse(res, 400, false, "One or more product IDs are invalid");
    }

    const invalidQuantity = items.some((item) => {
      const quantity = Number(item.quantity);
      return (!Number.isInteger(quantity) || quantity <= 0);
    });

    if (invalidQuantity) {
      await abortTransaction(session);
      return sendResponse(res, 400, false, "Product quantity must be a positive whole number");
    }

    const uniqueProductIds = [
      ...new Set(
        items.map((item) => item.id.toString())
      ),
    ];

    const products = await AddProduct.find({
      _id: {
        $in: uniqueProductIds,
      },
    }).populate("vendor", "_id business.storeName fullName bankDetails.bankName bankDetails.accountName bankDetails.accountNumber").session(session);


    if (products.length !== uniqueProductIds.length) {
      await abortTransaction(session);
      return sendResponse(res, 400, false, "One or more products do not exist");
    }

    const productMap = new Map();

    products.forEach((product) => {
      productMap.set(
        product._id.toString(),
        product
      );
    });

    const enrichedItems = [];

    for (const item of items) {
      const product = productMap.get(
        item.id.toString()
      );

      if (!product) {
        await abortTransaction(session);
        return sendResponse(res, 400, false, `Product ${item.id} does not exist`);
      }

      if (!product.vendor) {
        await abortTransaction(session);
        return sendResponse(res, 400, false, `Product ${item.id} has no vendor`);
      }

      const quantity = Number(item.quantity);

      const productPrice = toPositiveNumber(product.price);

      if (productPrice <= 0) {
        await abortTransaction(session);
        return sendResponse(res, 400, false, `Product ${product.name || item.id} has an invalid price`);
      }

      enrichedItems.push({
        product,
        productId: product._id,
        name: product.name || item.name || "Product",
        price: productPrice,
        quantity,
        image:
          product.image ||
          product.images?.[0] ||
          item.image ||
          "",
        vendorId: product.vendor._id.toString(),
        vendorName: product.vendor.business?.storeName || "Vendor",
      });
    }

    const grouped = enrichedItems.reduce(
      (acc, item) => {
        if (!acc[item.vendorId]) {
          acc[item.vendorId] = [];
        }
        acc[item.vendorId].push(item);
        return acc;
      },
      {}
    );

    const checkoutSubtotal = enrichedItems.reduce(
      (sum, item) => {
        return (
          sum + item.price * item.quantity
        );
      },
      0
    );

    const checkoutDeliveryFee = toPositiveNumber(deliveryFee, 0);

    const calculatedOrderTotal = checkoutSubtotal + checkoutDeliveryFee;

    const frontendOrderTotal = toPositiveNumber(orderTotal, 0);

    if (
      frontendOrderTotal > 0 &&
      Math.abs(
        frontendOrderTotal -
        calculatedOrderTotal
      ) > 1
    ) {
      logger.warn(
        `Order total mismatch. Frontend: ${frontendOrderTotal}, Backend: ${calculatedOrderTotal}`
      );
    }

    const checkoutRef = new mongoose.Types.ObjectId();

    const allProofs = [];

    if (
      paymentMethod === "pay_now" &&
      Array.isArray(req.files)
    ) {
      req.files.forEach((file) => {
        if (
          file?.fieldname?.startsWith("proof_")
        ) {
          const vendorId =
            file.fieldname.split("_")[1];

          if (
            vendorId &&
            isValidObjectId(vendorId)
          ) {
            allProofs.push({
              vendorId,
              file: file.path || file.location || file.filename,
            });
          }
        }
      });
    }

    const buyerAddress = address || buyer.student?.address || "";

    const buyerState = state || buyer.state || null;

    const createdOrders = [];

    const vendorIds = Object.keys(grouped);

    for (const vendorId of vendorIds) {
      const vendorItems = grouped[vendorId];

      const vendorSubtotal =
        vendorItems.reduce(
          (sum, item) => {
            return (
              sum +
              item.price *
              item.quantity
            );
          },
          0
        );

      const vendorShare = checkoutSubtotal > 0 ? vendorSubtotal / checkoutSubtotal : 0;


      const vendorDeliveryFee =
        Number(
          (
            checkoutDeliveryFee *
            vendorShare
          ).toFixed(2)
        );

      const vendorTotal =
        vendorSubtotal +
        vendorDeliveryFee;

      const formattedItems =
        vendorItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          vendor: item.vendorId,
          vendorName: item.vendorName,
        }));

      const vendorProof =
        allProofs.find(
          (proof) =>
            proof.vendorId === vendorId
        );


      const [createdOrder] =
        await BuyerOrder.create(
          [
            {
              buyer: userId,
              vendor: vendorId,
              checkoutRef,
              items: formattedItems,
              pricing: {
                subtotal: vendorSubtotal,
                deliveryFee: vendorDeliveryFee,
                total: vendorTotal,
              },
              delivery: {
                method: delivery,
                address: buyerAddress,
                state: buyerState,
              },
              payment: {
                method: paymentMethod,
                status: "pending",
                proofs: vendorProof
                  ? [vendorProof]
                  : [],
              },
              note:
                typeof note === "string"
                  ? note.trim()
                  : "",

              status: "pending",
            },
          ],
          { session }
        );

      createdOrders.push(
        createdOrder
      );
    }


    await Cart.findOneAndUpdate(
      {
        user: userId,
      },
      {
        $set: {
          items: [],
        },
      }, { session, }
    );


    const isMultiVendor = createdOrders.length > 1;


    await AuditLog.create(
      [
        {
          user: userId,
          role: "buyer",
          action: isMultiVendor
            ? "CREATE_MULTI_VENDOR_ORDER"
            : "CREATE_ORDER",
          entity: "Order",
          metadata: {
            checkoutRef,
            orderCount: createdOrders.length,
            subtotal: checkoutSubtotal,
            deliveryFee: checkoutDeliveryFee,
            totalAmount: calculatedOrderTotal,
            frontendTotal: frontendOrderTotal,
            paymentMethod,
            deliveryMethod: delivery,
            vendorIds,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    await notifyAfterOrderPlaced({
      buyerId: userId,
      orders: createdOrders,
    });

    for (const order of createdOrders) {
      try {
        orderSocket.emitNewOrderToVendor({
          order,
          vendorId: order.vendor,
        });
      } catch (socketError) {
        logger.error("New order socket error:", socketError);
      }
    }

    return sendResponse(res, 201, true, "Orders created successfully",
      {
        data: createdOrders,
        checkout: {
          checkoutRef,
          subtotal: checkoutSubtotal,
          deliveryFee: checkoutDeliveryFee,
          total: calculatedOrderTotal,
          orderCount: createdOrders.length,
          isMultiVendor,
        },
      }
    );

  } catch (error) {
    await abortTransaction(session);
    logger.error("Create Buyer Order Error:", error);
    return sendResponse(res, 500, false, "Internal Server Error", { error: error.message, });
  } finally {
    await session.endSession();
  }
};

exports.getBuyerOrders = async (req, res) => {
  try {
    const userId = req.user._id;

    const page = Math.max(
      1,
      Number(req.query.page) || 1
    );

    const limit = Math.min(
      Math.max(
        1,
        Number(req.query.limit) || 20
      ),
      100
    );

    const skip =
      (page - 1) * limit;


    const [orders, totalCount] =
      await Promise.all([
        BuyerOrder.find({
          buyer: userId,
        })
          .populate(
            "vendor",
            "_id business.storeName fullName"
          )
          .populate(
            "items.productId",
            "name price image images"
          )
          .populate(
            "items.vendor",
            "_id business.storeName fullName"
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        BuyerOrder.countDocuments({
          buyer: userId,
        }),
      ]);



    const normalizedOrders =
      orders.map((order) => ({
        ...order,

        orderRef: getOrderReference(order),

        vendorName: order.vendor?.business?.storeName || order.items?.[0]?.vendorName || "Vendor",

        itemCount:
          order.items?.reduce(
            (total, item) =>
              total +
              Number(item.quantity || 0),
            0
          ) || 0,

        total: order.pricing?.total || 0,

        paymentStatus: order.payment?.status || "pending",

        paymentMethod: order.payment?.method || "",

        deliveryMethod: order.delivery?.method || "standard",

        deliveryAddress: order.delivery?.address || "",

        deliveryState: order.delivery?.state || "",
      }));


    return sendSuccess(res, 200, "Orders fetched successfully",
      {
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems: totalCount,
          totalPages:
            Math.ceil(
              totalCount / limit
            ),
        },
        count: normalizedOrders.length,
        orders: normalizedOrders,
      }
    );

  } catch (error) {
    logger.error("Fetch Buyer Orders Error:", error);
    return sendResponse(res, 500, false, "Internal Server Error");
  }
};

exports.getSingleBuyerOrder = async (req, res) => {
  try {
    const userId = req.user._id;

    const { orderId } = req.params;

    if (!isValidObjectId(orderId)) {
      return sendError(res, 400, "Invalid order ID");
    }


    const order =
      await BuyerOrder.findOne({
        _id: orderId,
        buyer: userId,
      })
        .populate(
          "vendor",
          "_id business.storeName fullName"
        )
        .populate(
          "items.productId",
          "name price image images"
        )
        .populate(
          "items.vendor",
          "_id business.storeName fullName"
        )
        .lean();


    if (!order) {
      return sendError(res, 404, "Order not found");
    }
    const normalizedOrder = {
      ...order,

      orderRef: getOrderReference(order),

      vendorName: order.vendor?.business?.storeName || order.items?.[0]?.vendorName || "Vendor",

      itemCount:
        order.items?.reduce(
          (total, item) =>
            total +
            Number(item.quantity || 0),
          0
        ) || 0,

      total: order.pricing?.total || 0,

      paymentStatus: order.payment?.status || "pending",

      paymentMethod: order.payment?.method || "",

      deliveryMethod: order.delivery?.method || "standard",

      deliveryAddress: order.delivery?.address || "",

      deliveryState: order.delivery?.state || "",
    };

    return sendSuccess(res, 200, "Order fetched successfully", normalizedOrder);
  } catch (error) {
    logger.error("Fetch Single Buyer Order Error:", error);
    return sendError(res, 500, "Internal Server Error");
  }
};

exports.buyerConfirmDelivery = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const userId = req.user._id;

    const { orderId } = req.body;


    if (!isValidObjectId(orderId)) {
      await abortTransaction(session);
      return sendResponse(res, 400, false, "Invalid order ID");
    }

    const order =
      await BuyerOrder.findOne({
        _id: orderId,
        buyer: userId,
      }).session(session);


    if (!order) {
      await abortTransaction(session);
      return sendResponse(res, 404, false, "Order not found");
    }

    if (order.status !== "shipped") {
      await abortTransaction(session);
      return sendResponse(res, 400, false, "Order is not yet shipped");
    }


    const previousStatus = order.status;
    const deliveredAt = new Date();
    order.status = "delivered";
    order.deliveredAt = deliveredAt;

    await order.save({ session });


    await AuditLog.create(
      [
        {
          user: userId,
          role: "buyer",
          action: "ORDER_DELIVERED",
          entity: "ORDER",
          entityId: orderId,
          metadata: {
            previousStatus,
            newStatus: "delivered",
            deliveredAt,
          },
        },
      ], { session }
    );

    await session.commitTransaction();

    try {
      orderSocket.emitOrderDelivered({
        order,
        buyerId: order.buyer,
        vendorId: order.vendor,
      });
    } catch (socketError) {
      logger.error("Order delivered socket error:", socketError);
    }

    const orderRef = getOrderReference(order);

    try {
      await notificationService.safeCreateNotification(
        {
          recipientId:
            order.vendor,
          recipientRole: "vendor",
          type: "ORDER_CONFIRMED_DELIVERY",
          title: "Buyer confirmed delivery",
          message: `The buyer confirmed delivery for order ${orderRef}.`,
          metadata: {
            orderId: order._id,
            buyerId: order.buyer,
            orderRef,
          },
          dedupeKey: `vendor:${order.vendor}:VENDOR_ORDER_CONFIRMED_DELIVERY:${order._id}`,
        }
      );
    } catch (notificationError) {
      logger.error("Delivery notification error:", notificationError);
    }

    return sendResponse(res, 200, true, "Order marked as delivered",
      {
        orderId: order._id,
        orderRef,
        status: order.status,
        deliveredAt: order.deliveredAt,
      }
    );
  } catch (error) {
    await abortTransaction(session);
    logger.error("Buyer Confirm Delivery Error:", error);
    return sendResponse(res, 500, false, "Internal Server Error");
  } finally {
    await session.endSession();
  }
};

exports.buyerCancelOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const userId = req.user._id;

    const { orderId } = req.body;

    if (!isValidObjectId(orderId)) {
      await abortTransaction(session);
      return sendResponse(res, 400, false, "Invalid order ID");
    }

    const order =
      await BuyerOrder.findOne({ _id: orderId, buyer: userId, }).session(session);

    if (!order) {
      await abortTransaction(session);
      return sendResponse(res, 404, false, "Order not found");
    }

    if (order.status !== "pending") {
      await abortTransaction(session);
      return sendResponse(res, 400, false, "Order cannot be cancelled now");
    }

    const previousStatus = order.status;
    const cancelledAt = new Date();

    order.status = "cancelled";
    order.cancelledBy = {
      role: "buyer",
      user: userId,
      userModel: "Buyer",
      cancelledAt,
    };

    await order.save({ session });

    await AuditLog.create(
      [
        {
          user: userId,
          role: "buyer",
          action: "ORDER_CANCELLED",
          entity: "ORDER",
          entityId: orderId,
          metadata: {
            previousStatus,
            newStatus: "cancelled",
            cancelledBy: "buyer",
            timestamp: cancelledAt,
          },
        },
      ], { session }
    );

    await session.commitTransaction();

    try {
      orderSocket.emitOrderCancelled({
        order,
        buyerId: order.buyer,
        vendorId: order.vendor,
      });
    } catch (socketError) {
      logger.error("Order cancellation socket error:", socketError);
    }

    const orderRef = getOrderReference(order);


    try {
      await notificationService.safeCreateNotification(
        {
          recipientId: order.vendor,
          recipientRole: "vendor",
          type: "ORDER_CANCELLED",
          title: "Order cancelled",
          message: `A buyer cancelled order ${orderRef}.`,
          metadata: {
            orderId: order._id,
            buyerId: order.buyer,
            orderRef,
          },
          dedupeKey: `vendor:${order.vendor}:VENDOR_ORDER_CANCELLED:${order._id}`,
        }
      );
    } catch (notificationError) {
      logger.error("Cancellation notification error:", notificationError);
    }

    return sendResponse(res, 200, true, "Order cancelled successfully",
      {
        orderId: order._id,
        orderRef,
        status: order.status,
        cancelledBy: order.cancelledBy,
      }
    );
  } catch (error) {
    await abortTransaction(session);
    logger.error("Buyer Cancel Order Error:", error);
    return sendResponse(res, 500, false, "Internal Server Error");
  } finally {
    await session.endSession();
  }
};


exports.requestRefund = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const userId = req.user._id;

    const { orderId } = req.params;

    const {
      reason,
      details,
      accountNumber,
      bankName,
      accountName,
    } = req.body;


    if (!isValidObjectId(orderId)) {
      await abortTransaction(session);
      return sendResponse(res, 400, false, "Invalid order ID");
    }


    if (
      !reason ||
      typeof reason !== "string" ||
      reason.trim() === ""
    ) {
      await abortTransaction(session);
      return sendResponse(res, 400, false, "Reason is required for refund request");
    }

    const order = await BuyerOrder.findOne({ _id: orderId, buyer: userId, }).session(session);

    if (!order) {
      await abortTransaction(session);
      return sendResponse(res, 404, false, "Order not found");
    }

    const canRefundCancelledOrder = order.status === "cancelled" && order.cancelledBy?.role === "buyer";

    const canRefundReturnedOrder =
      order.returnRequest?.requested === true &&
      [
        "approved",
        "returned",
        "completed",
      ].includes(
        order.returnRequest?.status
      );

    if (!canRefundCancelledOrder && !canRefundReturnedOrder) {
      await abortTransaction(session);
      return sendError(res, 400, "Refund request is not allowed for this order");
    }

    const existingRefund = order.refundRequest;

    if (
      existingRefund?.requested &&
      [
        "pending_review",
        "approved",
        "processing",
        "refunded",
        "completed",
      ].includes(
        existingRefund.status
      )
    ) {
      await abortTransaction(session);
      return sendResponse(res, 400, false, `A refund request already exists with status: ${existingRefund.status}`);
    }

    if (
      !accountNumber ||
      !bankName ||
      !accountName
    ) {
      await abortTransaction(session);
      return sendResponse(res, 400, false, "Bank account number, bank name and account name are required");
    }

    order.refundRequest = {
      requested: true,
      status: "pending_review",
      reason: reason.trim(),
      details: typeof details === "string" ? details.trim() : "",
      accountNumber: accountNumber.trim(),
      bankName: bankName.trim(),
      accountName: accountName.trim(),
      refundAmount: order.pricing?.total || 0,
      triggeredByReturn: canRefundReturnedOrder,
      requestedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      response: "",
    };

    await order.save({ session, });

    await AuditLog.create(
      [
        {
          user: userId,
          role: "buyer",
          action: "REFUND_REQUEST_CREATED",
          entity: "ORDER",
          entityId: orderId,
          metadata: {
            reason: reason.trim(),
            orderStatus: order.status,
            totalAmount: order.pricing?.total || 0,
            triggeredByReturn: canRefundReturnedOrder,
          },
        },
      ], { session, }
    );

    await session.commitTransaction();

    try {
      orderSocket.emitRefundRequested({
        order,
        buyerId: order.buyer,
        vendorId: order.vendor,
      });
    } catch (socketError) {
      logger.error("Refund request socket error:", socketError);
    }

    const orderRef = getOrderReference(order);

    try {
      await notificationService.safeCreateNotification(
        {
          recipientId: order.vendor,
          recipientRole: "vendor",
          type: "ORDER_REFUND_REQUEST",
          title: "Refund request received",
          message: `A buyer requested a refund for order ${orderRef}.`,
          metadata: {
            orderId: order._id,
            buyerId: order.buyer,
            reason: reason.trim(),
            orderRef,
          },
          dedupeKey: `vendor:${order.vendor}:VENDOR_REFUND_REQUEST:${order._id}`,
        }
      );
    } catch (notificationError) {
      logger.error("Refund notification error:", notificationError);
    }

    return sendResponse(res, 201, true, "Refund request submitted successfully",
      {
        data: {
          orderId: order._id,
          orderRef,
          refundRequest: order.refundRequest,
        },
      }
    );

  } catch (error) {
    await abortTransaction(session);
    logger.error("Request Refund Error:", error);
    return sendResponse(res, 500, false, "Internal Server Error");
  } finally {
    await session.endSession();
  }
};

exports.requestReturn = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const userId = req.user._id;

    const { orderId } = req.params;

    const { reason, details, } = req.body;

    if (!isValidObjectId(orderId)) {
      await abortTransaction(session);
      return sendResponse(res, 400, false, "Invalid order ID");
    }

    if (
      !reason ||
      typeof reason !== "string" ||
      reason.trim() === ""
    ) {
      await abortTransaction(session);
      return sendResponse(res, 400, false, "Reason is required for return request");
    }

    const order = await BuyerOrder.findOne({ _id: orderId, buyer: userId, }).session(session);

    if (!order) {
      await abortTransaction(session);
      return sendResponse(res, 404, false, "Order not found");
    }

    if (order.status !== "delivered") {
      await abortTransaction(session);
      return sendResponse(res, 400, false, "Return request can only be made for delivered orders");
    }

    const RETURN_WINDOW_HOURS = 72;

    const deliveredAt = order.deliveredAt || order.updatedAt;

    if (!deliveredAt) {
      await abortTransaction(session);
      return sendResponse(res, 400, false, "Delivery date could not be determined");
    }


    const returnDeadline = new Date(deliveredAt.getTime() + RETURN_WINDOW_HOURS * 60 * 60 * 1000);


    if (
      Date.now() >
      returnDeadline.getTime()
    ) {
      await abortTransaction(session);

      return sendResponse(res, 400, false, "Return window has expired. Returns are only allowed within 72 hours after delivery confirmation.");
    }

    const existingReturn = order.returnRequest;

    if (
      existingReturn?.requested &&
      [
        "pending_review",
        "approved",
        "buyer_shipping",
        "returned",
        "inspection",
        "completed",
      ].includes(
        existingReturn.status
      )
    ) {
      await abortTransaction(session);
      return sendResponse(res, 400, false, `A return request already exists with status: ${existingReturn.status}`);
    }

    order.returnRequest = {
      requested: true,
      status: "pending_review",
      reason: reason.trim(),
      details: typeof details === "string" ? details.trim() : "",
      requestedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      returnedAt: null,
      response: "",
    };

    await order.save({ session, });

    await AuditLog.create(
      [
        {
          user: userId,
          role: "buyer",
          action: "RETURN_REQUEST_CREATED",
          entity: "ORDER",
          entityId: orderId,
          metadata: {
            reason: reason.trim(),
            orderStatus: order.status,
            totalAmount: order.pricing?.total || 0,
          },
        },
      ], { session, }
    );

    await session.commitTransaction();

    try {
      orderSocket.emitReturnRequested({
        order,
        buyerId: order.buyer,
        vendorId: order.vendor,
      });
    } catch (socketError) {
      logger.error("Return request socket error:", socketError);
    }

    const orderRef = getOrderReference(order);


    try {
      await notificationService.safeCreateNotification(
        {
          recipientId: order.vendor,
          recipientRole: "vendor",
          type: "ORDER_RETURN_REQUEST",
          title: "Return request received",
          message: `A buyer requested a return for order ${orderRef}.`,
          metadata: {
            orderId: order._id,
            buyerId: order.buyer,
            reason: reason.trim(),
            orderRef,
          },
          dedupeKey: `vendor:${order.vendor}:VENDOR_RETURN_REQUEST:${order._id}`,
        }
      );
    } catch (notificationError) {
      logger.error("Return notification error:", notificationError);
    }

    return sendResponse(res, 201, true, "Return request submitted successfully",
      {
        data: {
          orderId: order._id,
          orderRef,
          returnRequest: order.returnRequest,
        },
      }
    );
  } catch (error) {
    await abortTransaction(session);
    logger.error("Request Return Error:", error);
    return sendResponse(res, 500, false, "Internal Server Error");
  } finally {
    await session.endSession();
  }
};