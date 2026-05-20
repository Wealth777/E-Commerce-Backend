const logger = require('../../logger');
const buyerModel = require('../../models/buyer.model');
const AuditLog = require('../../models/auditLog.model');
const AddProduct = require('../../models/addproduct.model');
const BuyerOrder = require("../../models/buyerOrder.model");
const Cart = require("../../models/addToCart.model");

// const { getTaxRate } = require('../../config/taxRate');
const mongoose = require("mongoose");
const { sendResponse, sendSuccess, sendError } = require('../../utils/responseStruture');

// const validateOrderCreation = (body) => {
//   const errors = [];

//   if (!Array.isArray(body.items) || body.items.length === 0) {
//     errors.push('Items array is required and must not be empty');
//   }

//   if (typeof body.subtotal !== 'number' || body.subtotal <= 0) {
//     errors.push('Subtotal must be a positive number');
//   }

//   if (typeof body.deliveryFee !== 'number' || body.deliveryFee < 0) {
//     errors.push('Delivery fee must be a non-negative number');
//   }

//   if (typeof body.orderTotal !== 'number' || body.orderTotal <= 0) {
//     errors.push('Order total must be a positive number');
//   }

//   // Validate address fields
//   if (!body.address || body.address.trim() === '') {
//     errors.push('Delivery address is required');
//   }

//   if (!body.state || body.state.trim() === '') {
//     errors.push('State is required');
//   }

//   return errors;
// };

exports.createBuyerOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;

    let {
      items,
      subtotal,
      deliveryFee,
      totalTax,
      orderTotal,
      delivery,
      paymentMethod,
      note,
      state,
      address,
    } = req.body;

    // const validationErrors = validateOrderCreation(req.body);

    // if (validationErrors.length > 0) {
    //   await session.abortTransaction();
    //   return sendResponse(res, 400, false, "Validation failed", {
    //     errors: validationErrors,
    //   });
    // }

    try {
      items = typeof items === "string" ? JSON.parse(items) : items;
    } catch (error) {
      await session.abortTransaction();
      return sendResponse(res, 400, false, "Invalid items format");
    }

    if (!Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return sendResponse(res, 400, false, "Cart is empty");
    }

    const buyer = await buyerModel.findById(userId).session(session);

    if (!buyer) {
      await session.abortTransaction();
      return sendResponse(res, 404, false, "User not found");
    }

    const productIds = items.map((item) => item.id);

    const products = await AddProduct.find({
      _id: { $in: productIds },
    })
      .populate("vendor", "_id storeName")
      .session(session);

    if (products.length !== productIds.length) {
      await session.abortTransaction();
      return sendResponse(res, 400, false, "One or more products do not exist");
    }

    const productMap = new Map(
      products.map((product) => [product._id.toString(), product])
    );

    const enrichedItems = items.map((item) => {
      const product = productMap.get(item.id.toString());

      if (!product) {
        throw new Error(`Product ${item.id} does not exist`);
      }

      if (!product.vendor) {
        throw new Error(`Product ${item.id} has no vendor`);
      }

      return {
        ...item,
        vendorId: product.vendor._id.toString(),
        vendorName: product.vendor.storeName || "N/A",
        product,
      };
    });

    const grouped = enrichedItems.reduce((acc, item) => {
      if (!acc[item.vendorId]) {
        acc[item.vendorId] = [];
      }

      acc[item.vendorId].push(item);
      return acc;
    }, {});

    const checkoutRef = new mongoose.Types.ObjectId();

    const allProofs = [];

    if (paymentMethod === "pay_now" && req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname.startsWith("proof_")) {
          const vendorId = file.fieldname.split("_")[1];

          allProofs.push({
            vendorId,
            file: file.path,
          });
        }
      });
    }

    const createdOrders = [];

    for (const vendorId of Object.keys(grouped)) {
      const vendorItems = grouped[vendorId];

      const formattedItems = vendorItems.map((item) => ({
        productId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        vendor: item.vendorId,
        vendorName: item.vendorName,
      }));

      const vendorSubtotal = vendorItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const TAX_PER_VENDOR = 10;
      const vendorDeliveryFee = delivery === "express" ? 1000 : 0;
      const vendorTotal = vendorSubtotal + vendorDeliveryFee + TAX_PER_VENDOR;

      const vendorProof = allProofs.find(
        (proof) => proof.vendorId === vendorId
      );

      const order = await BuyerOrder.create(
        [
          {
            buyer: userId,
            vendor: vendorId,
            checkoutRef,
            items: formattedItems,

            pricing: {
              subtotal: vendorSubtotal,
              deliveryFee: vendorDeliveryFee,
              tax: TAX_PER_VENDOR,
              total: vendorTotal,
            },

            delivery: {
              method: delivery,
              address: address || buyer?.location?.address || "",
              state: state || buyer?.location?.state || "",
            },

            payment: {
              method: paymentMethod,
              status: "pending",
              proofs: vendorProof ? [vendorProof] : [],
            },

            note,
          },
        ],
        { session }
      );

      createdOrders.push(order[0]);
    }

    await Cart.findOneAndUpdate(
      { user: userId },
      { $set: { items: [] } },
      { session }
    );

    const isMultiVendor = createdOrders.length > 1;

    await AuditLog.create(
      [
        {
          user: userId,
          role: "buyer",
          action: isMultiVendor ? "CREATE_MULTI_VENDOR_ORDER" : "CREATE_ORDER",
          entity: "Order",
          metadata: {
            checkoutRef,
            orderCount: createdOrders.length,
            totalAmount: orderTotal,
            paymentMethod,
            deliveryMethod: delivery,
            vendorIds: Object.keys(grouped),
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return sendResponse(res, 201, true, "Orders created per vendor", {
      data: createdOrders,
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error("Create Order Error:", error);

    return sendResponse(res, 500, false, "Internal Server Error", {
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

exports.getBuyerOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    const [orders, totalCount] = await Promise.all([
      BuyerOrder.find({ buyer: userId })
        .populate("items.vendor", "storeName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BuyerOrder.countDocuments({ buyer: userId })
    ]);

    return sendSuccess(res, 200, 'Orders fetched successfully', {
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
    logger.error("Fetch Orders Error:", error);
    sendResponse(res, 500, false, "Internal Server Error")
  }
};

exports.getSingleBuyerOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;

    const order = await BuyerOrder.findOne({
      _id: orderId,
      buyer: userId,
    }).populate("items.vendor", "storeName");

    if (!order) {
      return sendError(res, 404, "Order not found");
    }

    return sendSuccess(res, 200, "Order fetched successfully", order);
  } catch (error) {
    logger.error("Fetch Single Buyer Order Error:", error);
    return sendError(res, 500, "Internal Server Error");
  }
};

exports.buyerConfirmDelivery = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId } = req.body;

    const order = await BuyerOrder.findById(orderId);
    if (!order) return sendResponse(res, 404, "Order not found");

    if (order.status !== "shipped") {
      return sendResponse(res, 400, false, "Order not yet shipped");
    }

    const previousStatus = order.status;
    order.status = "delivered";

    await order.save();

    await AuditLog.create({
      user: req.user._id,
      role: "buyer",
      action: "ORDER_DELIVERED",
      entity: "ORDER",
      entityId: orderId,
      metadata: {
        previousStatus,
        newStatus: "delivered",
        timestamp: Date.now()
      },
    });

    await session.commitTransaction();

    return sendResponse(res, 200, true, "Order marked as delivered", { status: order.status });

  } catch (err) {
    await session.abortTransaction();
    logger.error('Error occur', err)
    return sendResponse(res, 500, 'Internal Server Error');
  } finally {
    session.endSession()
  }
};

exports.buyerCancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId } = req.body;

    const order = await BuyerOrder.findById(orderId);
    if (!order) return sendResponse(res, 404, false, "Ordre not found");

    if (order.status !== "pending") {
      return sendResponse(res, 400, false, "Order cannot be cancelled now");
    }

    const previousStatus = order.status;
    order.status = "cancelled";
    order.cancelledBy = {
      role: "buyer",
      user: req.user._id,
      cancelledAt: new Date(),
    };

    await order.save();

    await AuditLog.create({
      user: req.user._id,
      role: "buyer",
      action: "ORDER_CANCELLED",
      entity: "ORDER",
      entityId: orderId,
      metadata: {
        previousStatus,
        newStatus: "cancelled",
        cancelledBy: "buyer",
        timestamp: Date.now()
      },
    });

    await session.commitTransaction();

    return sendResponse(res, 200, true, "Order cancelled", { status: order.status });
  } catch (err) {
    await session.abortTransaction();
    logger.error("Error happended", err)
    return sendResponse(res, 500, false, "Internal Server Error");
  } finally {
    session.endSession();
  }
};

exports.requestRefund = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { orderId } = req.params;

    const {
      reason,
      details,
      accountNumber,
      bankName,
      accountName,
    } = req.body;

    // Validation
    if (!reason || reason.trim() === "") {
      return sendResponse(res, 400, false, "Reason is required for refund request");
    }

    const order = await BuyerOrder.findById(orderId).session(session);

    if (!order) {
      return sendResponse(res, 404, false, "Order not found");
    }

    // Verify ownership
    if (order.buyer.toString() !== userId.toString()) {
      return sendResponse(res, 403, false, "You can only request refund for your own orders");
    }

    // Check if order is cancelled
    const canRefundCancelledOrder =
      order.status === "cancelled" &&
      order.cancelledBy?.role === "buyer";

    const canRefundReturnedOrder =
      order.returnRequest?.requested &&
      ["approved", "returned", "completed"].includes(
        order.returnRequest.status
      );

    if (!canRefundCancelledOrder && !canRefundReturnedOrder) {
      return sendError(
        res,
        400,
        "Refund request not allowed for this order"
      );
    }

    if (canRefundCancelledOrder) {
      if (!order.cancelledBy || order.cancelledBy.role !== "buyer") {
        return sendResponse(res, 400, false, "Refund request can only be made for orders cancelled by you");
      }
    }

    // Check if refund request already exists and is pending/approved/completed
    if (
      order.refundRequest.requested &&
      [
        "pending_review",
        "approved",
        "processing",
        "refunded",
        "completed"
      ].includes(order.refundRequest.status)
    ) {
      return sendResponse(res, 400, false, `A refund request already exists with status: ${order.refundRequest.status}`);
    }

    // Create/Update refund request
    order.refundRequest = {
      requested: true,
      status: "pending_review",
      reason,
      details: details || "",
      accountNumber: accountNumber,
      bankName: bankName,
      accountName: accountName,
      refundAmount: order.pricing.total,
      triggeredByReturn: canRefundReturnedOrder,
      requestedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      response: "",
    };

    await order.save({ session });

    await AuditLog.create([{
      user: userId,
      role: "buyer",
      action: "REFUND_REQUEST_CREATED",
      entity: "ORDER",
      entityId: orderId,
      metadata: {
        reason,
        orderStatus: order.status,
        totalAmount: order.pricing.total,
      },
    }], { session });

    await session.commitTransaction();

    return sendResponse(res, 201, true, "Refund request submitted successfully", {
      data: {
        orderId: order._id,
        refundRequest: order.refundRequest,
      }
    });
  } catch (error) {
    await session.abortTransaction()
    logger.error("Request Refund Error:", error);
    return sendResponse(res, 500, false, "Internal Server Error", { error: error.message });
  } finally {
    session.endSession();
  }
};

exports.requestReturn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { orderId } = req.params;
    const { reason, details } = req.body;

    // Validation
    if (!reason || reason.trim() === "") {
      return sendResponse(res, 400, false, "Reason is required for return request");
    }

    const order = await BuyerOrder.findById(orderId).session(session);

    if (!order) {
      return sendResponse(res, 404, false, "Order not found");
    }

    // Verify ownership
    if (order.buyer.toString() !== userId.toString()) {
      return sendResponse(res, 403, false, "You can only request return for your own orders");
    }

    // Check if order is delivered
    if (order.status !== "delivered") {
      return sendResponse(res, 400, false, "Return request can only be made for delivered orders");
    }

    // Check if return request already exists and is pending/approved/completed
    if (
      order.returnRequest.requested &&
      [
        "pending_review",
        "approved",
        "buyer_shipping",
        "returned",
        "inspection",
        "completed"
      ].includes(order.returnRequest.status)
    ) {
      return sendResponse(res, 400, false, `A return request already exists with status: ${order.returnRequest.status}`);
    }

    // Create/Update return request
    order.returnRequest = {
      requested: true,
      status: "pending_review",
      reason,
      details: details || "",
      requestedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      response: "",
    };

    await order.save({ session });

    await AuditLog.create([{
      user: userId,
      role: "buyer",
      action: "RETURN_REQUEST_CREATED",
      entity: "ORDER",
      entityId: orderId,
      metadata: {
        reason,
        orderStatus: order.status,
        totalAmount: order.pricing.total,
      },
    }], { session });

    await session.commitTransaction();

    return sendResponse(res, 201, true, "Return request submitted successfully",
      {
        data: {
          orderId: order._id,
          returnRequest: order.returnRequest,
        }
      });
  } catch (error) {
    await session.abortTransaction();
    logger.error("Request Return Error:", error);
    return sendResponse(res, 500, false, "Internal Server Error", { error: error.message });
  } finally {
    session.endSession();
  }
};