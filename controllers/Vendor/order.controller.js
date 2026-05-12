const logger = require('../../logger');
const AuditLog = require('../../models/auditLog');
const BuyerOrder = require("../../models/buyerOrder.model");
const { updateProductStockAfterOrder } = require("../../utils(copy)/feedAlgorithm");
const mongoose = require('mongoose');
const { sendResponse } = require('../../utils(copy)/responseStruture');


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

    res.status(200).json({
      success: true,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      count: orders.length,
      data: orders,
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
      .populate("buyer", "username email")
      .populate("items.productId", "name image");

    if (!order) {
      return sendResponse(res, 404, false, "Order not found")
    }

    sendResponse(res, 200, true, { data: order })

  } catch (error) {
    logger.error("Fetch Single Vendor Order Error:", error);
    sendResponse(res, 500, false, "Internal Server Error");
  }
};

exports.vendorConfirmPayment = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    const allowed = ["paid", "failed"];
    if (!allowed.includes(status)) {
      return sendResponse(res, 400, false, "Invalid payment status");
    }

    const order = await BuyerOrder.findOne({ _id: orderId, vendor: req.user._id })
    if (!order) return sendResponse(res, 404, false, "Order not found");

    const previousStatus = order.payment.status;

    order.payment.status = status;

    await order.save();

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
    logger.error('Error Occured', err.message)
    return sendResponse(res, 500, false, "Internal Server Error");
  }
};

exports.vendorConfirmOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId } = req.body;

    const order = await BuyerOrder.findOne({ _id: orderId, vendor: req.user._id });

    if (!order) {
      return sendResponse(res, 400, false, "Order not found");
    }

    if (order.status !== "pending") {
      return sendResponse(res, 400, false, "Order already processed");
    }

    if (order.payment.method === "pay_now" && order.payment.status !== "paid") {
      return sendResponse(res, 400, false, "Payment must be confirmed first");
    }

    await updateProductStockAfterOrder(order.items);

    const previousStatus = order.status;
    order.status = "confirmed";

    await order.save({ session });

    await session.commitTransaction();

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

    return res.json({
      message: "Order confirmed and stock updated",
      status: order.status
    });

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

    const order = await BuyerOrder.findOne({ _id: orderId, vendor: req.user._id });
    if (!order) return sendResponse(res, 400, false, "Order not found");

    if (order.status !== "confirmed") {
      return sendResponse(res, 400, false, "Order must be confirmed firsr");
    }

    const previousStatus = order.status;
    order.status = "shipped";

    await order.save();

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

    return res.status(200).json({
      success: true,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      count: refundRequests.length,
      data: refundRequests,
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

    return res.status(200).json({
      success: true,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      count: returnRequests.length,
      data: returnRequests,
    });
  } catch (error) {
    logger.error("Get Return Requests Error:", error);
    return sendResponse(res, 500, false, "Internal Server Error", { error: error.message });
  }
};

exports.reviewRefundRequest = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { orderId } = req.params;
    const { action, response } = req.body;

    // Validation
    if (!action || !["approved", "rejected"].includes(action)) {
      return sendResponse(res, 400, false, "Action must be either 'approved' or 'rejected'");
    }

    if (action === "rejected" && (!response || response.trim() === "")) {
      return sendResponse(res, 400, false, "Response message is required when rejecting refund request");
    }

    const order = await BuyerOrder.findOne({
      _id: orderId,
      vendor: vendorId,
    });

    if (!order) {
      return sendResponse(res, 404, false, "Order not found or you do not have permission");
    }

    if (!order.refundRequest.requested) {
      return sendResponse(res, 400, false, "No refund request found for this order");
    }

    if (order.refundRequest.status !== "pending") {
      return sendResponse(res, 400, false, `Cannot review refund request with status: ${order.refundRequest.status}`);
    }

    // Update refund request
    order.refundRequest.status = action === "approved" ? "approved" : "rejected";
    order.refundRequest.reviewedAt = new Date();
    order.refundRequest.reviewedBy = vendorId;
    order.refundRequest.response = response || "";

    await order.save();

    await AuditLog.create({
      user: vendorId,
      role: "vendor",
      action: `REFUND_REQUEST_${action.toUpperCase()}`,
      entity: "ORDER",
      entityId: orderId,
      metadata: {
        buyerId: order.buyer,
        reason: order.refundRequest.reason,
        totalAmount: order.pricing.total,
        response,
      },
    });

    return sendResponse(res, 200, true, `Refund request ${action}`, {
      data: {
        orderId: order._id,
        refundRequest: order.refundRequest,
      }
    });
  } catch (error) {
    logger.error("Review Refund Request Error:", error);
    return sendResponse(res, 500, false, "Internal Server Error", {error: error.message});
  }
};

exports.reviewReturnRequest = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { orderId } = req.params;
    const { action, response } = req.body;

    // Validation
    if (!action || !["approved", "rejected"].includes(action)) {
      return sendResponse(res, 400, false, "Action must be either 'approved' or 'rejected'");
    }

    if (action === "rejected" && (!response || response.trim() === "")) {
      return sendResponse(res, 400, false, "Response message is required when rejecting return request");
    }

    const order = await BuyerOrder.findOne({
      _id: orderId,
      vendor: vendorId,
    });

    if (!order) {
      return sendResponse(res, 404, false, "Order not found or you do not have permission");
    }

    if (!order.returnRequest.requested) {
      return sendResponse(res, 400, false, "No return request found for this order");
    }

    if (order.returnRequest.status !== "pending") {
      return sendResponse(res, 400, false, `Cannot review return request with status: ${order.returnRequest.status}`);
    }

    // Update return request
    order.returnRequest.status = action === "approved" ? "approved" : "rejected";
    order.returnRequest.reviewedAt = new Date();
    order.returnRequest.reviewedBy = vendorId;
    order.returnRequest.response = response || "";

    await order.save();

    await AuditLog.create({
      user: vendorId,
      role: "vendor",
      action: `RETURN_REQUEST_${action.toUpperCase()}`,
      entity: "ORDER",
      entityId: orderId,
      metadata: {
        buyerId: order.buyer,
        reason: order.returnRequest.reason,
        totalAmount: order.pricing.total,
        response,
      },
    });

    return sendResponse(res, 200, true, `Return request ${action}`, {
      data: {
        orderId: order._id,
        returnRequest: order.returnRequest,
      }
    });
  } catch (error) {
    logger.error("Review Return Request Error:", error);
    return sendResponse(res, 500, false, "Internal Server Error", { error: error.message });
  }
};