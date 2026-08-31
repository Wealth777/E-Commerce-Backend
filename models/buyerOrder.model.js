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
      index: true
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true
    },

    checkoutRef: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      index: true,
    },

    items: [orderItemSchema],

    pricing: {
      subtotal: { type: Number, required: true },
      deliveryFee: { type: Number, default: 0 },
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
      index: true
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      role: {
        type: String,
        enum: ["buyer", "vendor", "admin"],
      },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "cancelledBy.userModel",
      },
      userModel: {
        type: String,
        enum: ["Buyer", "Vendor", "Founder"],
      },
      cancelledAt: Date,
    },

    refundRequest: {
      requested: {
        type: Boolean,
        default: false,
      },

      status: {
        type: String,
        enum: [
          "none",
          "pending_review",
          "approved",
          "processing",
          "refunded",
          "completed",
          "rejected"
        ],
        default: "none"
      },

      triggeredByReturn: {
        type: Boolean,
        default: false,
      },

      reason: String,
      details: String,

      refundAmount: Number,

      accountNumber: String,
      bankName: String,
      accountName: String,

      refundReference: String,

      requestedAt: Date,
      reviewedAt: Date,
      refundedAt: Date,

      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
      },

      response: String,
    },

    returnRequest: {
      requested: {
        type: Boolean,
        default: false,
      },

      status: {
        type: String,
        enum: [
          "none",
          "pending_review",
          "approved",
          "buyer_shipping",
          "returned",
          "inspection",
          "completed",
          "rejected"
        ],
        default: "none"
      },

      reason: String,
      details: String,

      requestedAt: Date,
      reviewedAt: Date,
      returnedAt: Date,

      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
      },

      inspectionNote: String,
      response: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', buyerOrderSchema);