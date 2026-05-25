const logger = require('../../logger');
const AuditLog = require('../../models/auditLog.model');
const BuyerOrder = require("../../models/buyerOrder.model");
const notificationService = require("../../services/notification/notification.service");
const { updateProductStockAfterOrder, restoreProductStockAfterReturn } = require("../../utils/feedAlgorithm");
const mongoose = require('mongoose');
const { sendResponse, sendSuccess } = require('../../utils/responseStruture');

const sendLowStockNotifications = async ({ vendorId, order }) => {
  const productIds = order.items.map((item) => item.productId);
  const lowStockProducts = await AddProduct.find({
    _id: { $in: productIds },
    vendor: vendorId,
    stock: { $lte: 5 },
  }).select('name stock status');

  for (const product of lowStockProducts) {
    await notificationService.safeCreateNotification({
      recipientId: vendorId,
      recipientRole: 'vendor',
      type: 'VENDOR_LOW_STOCK',
      title: 'Low stock alert',
      message: `${product.name} is low in stock. Current stock: ${product.stock}.`,
      metadata: { productId: product._id, orderId: order._id, stock: product.stock, status: product.status },
      dedupeKey: `vendor:${vendorId}:VENDOR_LOW_STOCK:${product._id}:${product.stock}`,
    });
  }
};

exports.getVendorOrders = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    const [orders, totalCount] = await Promise.all([
      BuyerOrder.find({ vendor: vendorId })
        .populate("buyer", "username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BuyerOrder.countDocuments({ vendor: vendorId })
    ]);

    return sendSuccess(res, 200, 'Vendor orders fetched successfully', {
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      count: orders.length,
      orders,
    });

  } catch (error) {
    logger.error("Fetch Vendor Orders Error:", error);
    sendResponse(res, 500, false, "Internal Server Error");
  }
};

exports.getSingleVendorOrder = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { orderId } = req.params;

    const order = await BuyerOrder.findOne({
      _id: orderId,
      vendor: vendorId,
    })
      .populate("buyer", "username fullName email")
      .populate("items.vendor", "storeName");

    if (!order) {
      return sendResponse(res, 404, "Order not found");
    }

    return sendSuccess(res, 200, "Order fetched successfully", order);
  } catch (error) {
    logger.error("Fetch Single Vendor Order Error:", error);
    return sendResponse(res, 500, "Internal Server Error");
  }
};

exports.vendorConfirmPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId, status } = req.body;

    const allowed = ["paid", "failed"];
    if (!allowed.includes(status)) {
      await session.abortTransaction();
      return sendResponse(res, 400, false, "Invalid payment status");
    }

    const order = await BuyerOrder.findOne({ _id: orderId, vendor: req.user._id }).session(session)
    if (!order){
      await session.commitTransaction();
      return sendResponse(res, 404, false, "Order not found")
    };

    const previousStatus = order.payment.status;

    order.payment.status = status;

    await order.save({ session });

    await session.commitTransaction();

    const orderRef = order._id
      ? `#${order._id.toString().slice(-8).toUpperCase()}`
      : "N/A";

    await notificationService.safeCreateNotification({
      recipientId: order.buyer,
      recipientRole: "buyer",
      type: "ORDER_PAYMENT_CONFIRMED",
      title: "Order payment confirmed",
      message: `Your payment for order ${orderRef} has been confirmed by the vendor.`,
      metadata: { orderId: order._id, vendorId: order.vendor },
      dedupeKey: `buyer:${order.buyer}:BUYER_ORDER_PAYMENT_CONFIRMED:${order._id}`,
    });

    await AuditLog.create({
      user: req.user._id,
      role: "vendor",
      action: "PAYMENT_STATUS_UPDATED",
      entity: "ORDER",
      entityId: orderId,
      metadata: {
        previousStatus,
        newStatus: status,
        timestamp: Date.now()
      },
    });

    return sendResponse(res, 200, true, "Payment status updated", { payment: order.payment.status })
  } catch (err) {
    await session.abortTransaction();
    logger.error('Error Occured', err.message)
    return sendResponse(res, 500, false, "Internal Server Error");
  } finally {
    session.endSession();
  }
};

exports.vendorConfirmOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId } = req.body;

    const order = await BuyerOrder.findOne({ _id: orderId, vendor: req.user._id }).session(session);

    if (!order) {
      await session.abortTransaction();
      return sendResponse(res, 400, false, "Order not found");
    }

    if (order.status !== "pending") {
      await session.abortTransaction();
      return sendResponse(res, 400, false, "Order already processed");
    }

    if (order.payment.method === "pay_now" && order.payment.status !== "paid") {
      await session.abortTransaction();
      return sendResponse(res, 400, false, "Payment must be confirmed first");
    }

    await updateProductStockAfterOrder(order.items, session);

    const previousStatus = order.status;
    order.status = "confirmed";

    await order.save({ session });

    await session.commitTransaction();

    const orderRef = order._id
      ? `#${order._id.toString().slice(-8).toUpperCase()}`
      : "N/A";

    await notificationService.safeCreateNotification({
      recipientId: order.buyer,
      recipientRole: "buyer",
      type: "ORDER_CONFIRMED",
      title: "Order confirmed",
      message: `Your order ${orderRef} has been confirmed by the vendor.`,
      metadata: { orderId: order._id, vendorId: order.vendor },
      dedupeKey: `buyer:${order.buyer}:BUYER_ORDER_CONFIRMED:${order._id}`,
    });

    await sendLowStockNotifications({ vendorId: req.user._id, order });

    await AuditLog.create({
      user: req.user._id,
      role: "vendor",
      action: "ORDER_CONFIRMED",
      entity: "ORDER",
      entityId: orderId,
      metadata: {
        previousStatus,
        newStatus: "confirmed",
        timestamp: Date.now()
      }
    });

    return sendSuccess(res, 200, 'Order confirmed and stock updated', { status: order.status });

  } catch (err) {
    await session.abortTransaction();
    logger.error("Error Occured: ", err.message)
    return sendResponse(res, 500, false, "Internal Server Error")
  } finally {
    session.endSession();
  }
};

exports.vendorShipOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId } = req.body;

    const order = await BuyerOrder.findOne({ _id: orderId, vendor: req.user._id }).session(session);
    if (!order){
      await session.abortTransaction();
      return sendResponse(res, 400, false, "Order not found")
    };

    if (order.status !== "confirmed") {
      await session.abortTransaction();
      return sendResponse(res, 400, false, "Order must be confirmed firsr");
    }

    const previousStatus = order.status;
    order.status = "shipped";

    await order.save({ session });

    await session.commitTransaction();

    const orderRef = order._id
      ? `#${order._id.toString().slice(-8).toUpperCase()}`
      : "N/A";

    await notificationService.safeCreateNotification({
      recipientId: order.buyer,
      recipientRole: "buyer",
      type: "ORDER_SHIPPED",
      title: "Order shipped",
      message: `Your order ${orderRef} has been shipped by the vendor.`,
      metadata: { orderId: order._id, vendorId: order.vendor },
      dedupeKey: `buyer:${order.buyer}:BUYER_ORDER_SHIPPED:${order._id}`,
    });

    await AuditLog.create({
      user: req.user._id,
      role: "vendor",
      action: "ORDER_SHIPPED",
      entity: "ORDER",
      entityId: orderId,
      metadata: {
        previousStatus,
        newStatus: "shipped",
        timestamp: Date.now()
      },
    });

    return sendResponse(res, 200, true, "Order marked as shipped", { status: order.status })
  } catch (err) {
    await session.abortTransaction();
    logger.error("Error Occured: ", err.message)
    return sendResponse(res, 500, false, "Internal Server Error");
  } finally {
    session.endSession();
  }
};

exports.getRefundRequests = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    const [orders, totalCount] = await Promise.all([
      BuyerOrder.find({ vendor: vendorId, "refundRequest.requested": true, })
        .populate("buyer", "username email fullName")
        .sort({ "refundRequest.requestedAt": -1 })
        .skip(skip)
        .limit(limit),
      BuyerOrder.countDocuments({ vendor: vendorId, "refundRequest.requested": true, })
    ]);

    const refundRequests = orders
      .filter((order) => order.refundRequest.requested)
      .map((order) => ({
        orderId: order._id,
        buyerInfo: {
          id: order.buyer._id,
          username: order.buyer.username,
          email: order.buyer.email,
          fullName: order.buyer.fullName,
        },
        orderStatus: order.status,
        pricing: order.pricing,
        refundRequest: order.refundRequest,
      }));

    return sendSuccess(res, 200, 'Refund requests fetched successfully', {
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      count: refundRequests.length,
      refundRequests,
    });
  } catch (error) {
    logger.error("Get Refund Requests Error:", error);
    return sendResponse(res, 500, false, "Internal Server Error", { error: error.message });
  }
};

exports.getReturnRequests = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    const [orders, totalCount] = await Promise.all([
      BuyerOrder.find({ vendor: vendorId, "returnRequest.requested": true, })
        .populate("buyer", "username email fullName")
        .sort({ "returnRequest.requestedAt": -1 })
        .skip(skip)
        .limit(limit),
      BuyerOrder.countDocuments({ vendor: vendorId, "returnRequest.requested": true, })
    ]);

    const returnRequests = orders
      .filter((order) => order.returnRequest.requested)
      .map((order) => ({
        orderId: order._id,
        buyerInfo: {
          id: order.buyer._id,
          username: order.buyer.username,
          email: order.buyer.email,
          fullName: order.buyer.fullName,
        },
        orderStatus: order.status,
        pricing: order.pricing,
        returnRequest: order.returnRequest,
      }));

    return sendSuccess(res, 200, 'Return requests fetched successfully', {
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      count: returnRequests.length,
      returnRequests,
    });
  } catch (error) {
    logger.error("Get Return Requests Error:", error);
    return sendResponse(res, 500, false, "Internal Server Error", { error: error.message });
  }
};

exports.reviewRefundRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vendorId = req.user._id;
    const { orderId } = req.params;
    const { action, response, refundReference } = req.body;

    const allowedActions = [
      "approved",
      "processing",
      "refunded",
      "completed",
      "rejected",
    ];

    if (!action || !allowedActions.includes(action)) {
      await session.abortTransaction();
      return sendResponse(res, 400, false, "Invalid refund action");
    }

    if (action === "rejected" && (!response || response.trim() === "")) {
      await session.abortTransaction();
      return sendResponse(res, 400, false, "Response is required when rejecting refund request");
    }

    if (action === "refunded" && (!refundReference || refundReference.trim() === "")) {
      await session.abortTransaction();
      return sendResponse(res, 400, false, "Refund reference is required when marking as refunded");
    }

    const order = await BuyerOrder.findOne({
      _id: orderId,
      vendor: vendorId,
    }).session(session);

    if (!order) {
      await session.abortTransaction();
      return sendResponse(res, 404, false, "Order not found or you do not have permission");
    }

    if (!order.refundRequest?.requested) {
      await session.abortTransaction();
      return sendResponse(res, 400, false, "No refund request found for this order");
    }

    const currentStatus = order.refundRequest.status;

    const allowedTransitions = {
      pending_review: ["approved", "rejected"],
      approved: ["processing", "rejected"],
      processing: ["refunded", "rejected"],
      refunded: ["completed"],
      completed: [],
      rejected: [],
    };

    if (!allowedTransitions[currentStatus]?.includes(action)) {
      return sendResponse(
        res,
        400,
        false,
        `Cannot move refund request from ${currentStatus} to ${action}`
      );
    }

    const previousStatus = currentStatus;

    order.refundRequest.status = action;
    order.refundRequest.reviewedBy = vendorId;
    order.refundRequest.response = response || order.refundRequest.response || "";

    if (["approved", "rejected"].includes(action)) {
      order.refundRequest.reviewedAt = new Date();
    }

    if (action === "refunded") {
      order.refundRequest.refundReference = refundReference;
      order.refundRequest.refundedAt = new Date();
    }

    await order.save({ session });

    await session.commitTransaction();

    const orderRef = order._id
      ? `#${order._id.toString().slice(-8).toUpperCase()}`
      : "N/A";

    await notificationService.safeCreateNotification({
      recipientId: order.buyer,
      recipientRole: "buyer",
      type: `REFUND_${action.toUpperCase()}`,
      title: "Refund request updated",
      message: `Your refund request for order ${orderRef} was updated to ${action}.`,
      metadata: { orderId: order._id, vendorId, status: action, previousStatus },
      dedupeKey: `buyer:${order.buyer}:BUYER_REFUND_${action.toUpperCase()}:${order._id}`,
    });

    await AuditLog.create({
      user: vendorId,
      role: "vendor",
      action: `REFUND_REQUEST_${action.toUpperCase()}`,
      entity: "ORDER",
      entityId: orderId,
      metadata: {
        buyerId: order.buyer,
        previousStatus,
        newStatus: action,
        reason: order.refundRequest.reason,
        totalAmount: order.pricing.total,
        response,
      },
    });

    return sendResponse(res, 200, true, `Refund request updated to ${action}`, {
      data: {
        orderId: order._id,
        refundRequest: order.refundRequest,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error("Review Refund Request Error:", error);
    return sendResponse(res, 500, false, "Internal Server Error", {
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

exports.reviewReturnRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vendorId = req.user._id;
    const { orderId } = req.params;
    const { action, response, inspectionNote } = req.body;

    const allowedActions = [
      "approved",
      "buyer_shipping",
      "returned",
      "inspection",
      "completed",
      "rejected",
    ];

    if (!action || !allowedActions.includes(action)) {
      await session.abortTransaction();
      return sendResponse(res, 400, false, "Invalid return action");
    }

    if (action === "rejected" && (!response || response.trim() === "")) {
      await session.abortTransaction();
      return sendResponse(res, 400, false, "Response is required when rejecting return request");
    }

    const order = await BuyerOrder.findOne({
      _id: orderId,
      vendor: vendorId,
    }).session(session);

    if (!order) {
      await session.abortTransaction();
      return sendResponse(res, 404, false, "Order not found or you do not have permission");
    }

    if (!order.returnRequest?.requested) {
      await session.abortTransaction();
      return sendResponse(res, 400, false, "No return request found for this order");
    }

    const currentStatus = order.returnRequest.status;

    const allowedTransitions = {
      pending_review: ["approved", "rejected"],
      approved: ["buyer_shipping", "rejected"],
      buyer_shipping: ["returned", "rejected"],
      returned: ["inspection", "rejected"],
      inspection: ["completed", "rejected"],
      completed: [],
      rejected: [],
    };

    if (!allowedTransitions[currentStatus]?.includes(action)) {
      await session.abortTransaction();
      return sendResponse(
        res,
        400,
        false,
        `Cannot move return request from ${currentStatus} to ${action}`
      );
    }

    const previousStatus = currentStatus;

    order.returnRequest.status = action;
    order.returnRequest.reviewedBy = vendorId;
    order.returnRequest.response = response || order.returnRequest.response || "";

    if (["approved", "rejected"].includes(action)) {
      order.returnRequest.reviewedAt = new Date();
    }

    if (action === "returned") {
      order.returnRequest.returnedAt = new Date();
    }

    if (action === "inspection" && inspectionNote) {
      order.returnRequest.inspectionNote = inspectionNote;
    }

    if (action === "completed") {
      if (currentStatus === "completed") {
        await session.abortTransaction();
        return sendResponse(res, 400, false, "Return request is already completed");
      }
      await restoreProductStockAfterReturn(order.items, session);
    }

    await order.save({ session });

    await session.commitTransaction();

    const orderRef = order._id
      ? `#${order._id.toString().slice(-8).toUpperCase()}`
      : "N/A";

    await notificationService.safeCreateNotification({
      recipientId: order.buyer,
      recipientRole: "buyer",
      type: `RETURN_${action.toUpperCase()}`,
      title: "Return request updated",
      message: `Your return request for order ${orderRef} was updated to ${action}.`,
      metadata: { orderId: order._id, vendorId, status: action, previousStatus },
      dedupeKey: `buyer:${order.buyer}:BUYER_RETURN_${action.toUpperCase()}:${order._id}`,
    });

    await AuditLog.create({
      user: vendorId,
      role: "vendor",
      action: `RETURN_REQUEST_${action.toUpperCase()}`,
      entity: "ORDER",
      entityId: orderId,
      metadata: {
        buyerId: order.buyer,
        previousStatus,
        newStatus: action,
        reason: order.returnRequest.reason,
        totalAmount: order.pricing.total,
        response,
        inspectionNote,
      },
    });

    return sendResponse(res, 200, true, `Return request updated to ${action}`, {
      data: {
        orderId: order._id,
        returnRequest: order.returnRequest,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error("Review Return Request Error:", error);
    return sendResponse(res, 500, false, "Internal Server Error", {
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};