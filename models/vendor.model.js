const mongoose = require("mongoose");
const { softDeletePlugin } = require("./base.schema");

const vendorSchema = new mongoose.Schema(
  {
    serialNumber: {
      type: String,
      unique: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phoneNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["vendor"],
      default: "vendor",
    },

    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      trim: true,
      required: true
    },

    state: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      trim: true,
      required: true
    },

    profilePhoto: String,

    onboardingCompleted: {
      type: Boolean,
      default: false,
    },

    vendorType: {
      type: String,
      enum: ["selling", "artisan"],
      lowercase: true,
      trim: true,
    },

    businessCategory: {
      type: String,
      trim: true,
    },

    brandName: {
      type: String,
      trim: true,
      index: true,
    },

    brandDescription: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    brandPhoneNo: {
      type: String,
      trim: true,
    },

    brandEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },

    bannerImage: String,

    address: String,

    socialLinks: {
      facebook: {
        type: String,
        trim: true,
      },

      instagram: {
        type: String,
        trim: true,
      },

      tiktok: {
        type: String,
        trim: true,
      },

      x: {
        type: String,
        trim: true,
      },

      website: {
        type: String,
        trim: true,
      },
    },

    preferredLanguage: {
      type: String,
      default: "english",
    },

    notificationPreference: {
      type: String,
      enum: ["whatsapp", "email", "both"],
      default: "both",
    },

    bankDetails: {
      bankName: String,

      accountName: String,

      accountNumber: String,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    verificationApprovedAt: Date,

    verificationApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Founder",
    },

    verificationRejectedAt: Date,

    verificationRejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Founder",
    },

    verificationRejectionReason: String,

    isActive: {
      type: Boolean,
      default: true,
    },

    profileUpdateNotificationSent: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deleteReason: String,
  },
  {
    timestamps: true,
  }
);

vendorSchema.index(
  { "bankDetails.accountNumber": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "bankDetails.accountNumber": {
        $exists: true,
        $ne: null,
      },
    },
  }
);

vendorSchema.plugin(softDeletePlugin);

module.exports = mongoose.model("Vendor", vendorSchema);