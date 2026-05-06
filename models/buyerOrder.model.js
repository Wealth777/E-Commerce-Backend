const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AddProduct",
    required: true,
  },
  name: String,
  price: Number,
  quantity: Number,
  image: String,
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
  },
  vendorName: String,
});

const paymentProofSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
  },
  file: String,
});

const buyerOrderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Buyer",
      required: true,
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    items: [orderItemSchema],

    pricing: {
      subtotal: { type: Number, required: true },
      deliveryFee: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      total: { type: Number, required: true },
    },

    delivery: {
      method: {
        type: String,
        enum: ["standard", "express"],
        default: "standard",
      },
      address: String,
      state: String,
    },

    payment: {
      method: {
        type: String,
        enum: ["pay_now", "pod"],
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending",
      },
      proofs: [paymentProofSchema], 
    },

    note: String,

    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },

    cancelledBy: {
      role: {
        type: String,
        enum: ["buyer", "vendor", "admin"],
      },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Buyer",
      },
      cancelledAt: Date,
    },

    refundRequest: {
      requested: { type: Boolean, default: false },
      status: {
        type: String,
        enum: ["none", "pending", "approved", "rejected", "completed"],
        default: "none",
      },
      reason: String,
      details: String,
      requestedAt: Date,
      reviewedAt: Date,
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
      },
      response: String,
    },

    returnRequest: {
      requested: { type: Boolean, default: false },
      status: {
        type: String,
        enum: ["none", "pending", "approved", "rejected", "completed"],
        default: "none",
      },
      reason: String,
      details: String,
      requestedAt: Date,
      reviewedAt: Date,
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
      },
      response: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', buyerOrderSchema);