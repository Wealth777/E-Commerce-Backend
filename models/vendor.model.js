const mongoose = require("mongoose");
const { softDeletePlugin } = require("./base.schema");

const vendorSchema = new mongoose.Schema(
  {
    // ======================================================
    // SYSTEM INFORMATION
    // ======================================================

    serialNumber: {
      type: String,
      unique: true,
    },

    role: {
      type: String,
      enum: ["vendor"],
      default: "vendor",
    },

    // ======================================================
    // ACCOUNT INFORMATION (Registration)
    // ======================================================

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

    // ======================================================
    // ONBOARDING STATUS
    // ======================================================

    onboardingCompleted: {
      type: Boolean,
      default: false,
    },

    onboardingCompletedAt: Date,

    // ======================================================
    // STUDENT INFORMATION
    // ======================================================

    student: {
      profilePhoto: {
        type: String,
        trim: true,
      },
      gender: {
        type: String,
        enum: [
          "male",
          "female"
        ],
        trim: true
      },
      institution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        trim: true
      },
      state: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        trim: true,
      },
      matricNumber: {
        type: String,
        unique: true,
        trim: true,
      },
      faculty: {
        type: String,
        trim: true,
      },
      department: {
        type: String,
        trim: true,
      },
      level: {
        type: String,
        trim: true,
      },
      residence: {
        type: String,
        enum: [
          "hostel",
          "off-campus"
        ]
      },
      address: {
        type: String,
        trim: true
      }
    },

    // ======================================================
    // BUSINESS INFORMATION
    // ======================================================

    business: {
      storeName: {
        type: String,
        trim: true,
        index: true,
      },
      type: {
        type: String,
        enum: [
          "freelancer",
          "reseller",
          "service-provider"
        ]
      },
      description: {
        type: String,
        trim: true,
        minlength: 20,
        maxlength: 2000,
      },
      logo: {
        type: String,
        trim: true,
      },
      socials: {
        facebook: String,
        instagram: String,
        whatsapp: String,
        tiktok: String,
      }
    },

    // ======================================================
    // VERIFICATION DOCUMENTS
    // ======================================================

    verificationDocuments: {
      schoolIdCard: {
        type: String,
      },
      nationalId: {
        type: String,
      }
    },

    // ======================================================
    // TERMS ACCEPTANCE
    // ======================================================

    terms: {
      acceptedVendorTerms: {
        type: Boolean,
        default: false,
      },
      acceptedMarketplacePolicy: {
        type: Boolean,
        default: false,
      },
      acceptedFraudPolicy: {
        type: Boolean,
        default: false,
      },
      acceptedAt: Date,
    },

    // ======================================================
    // BANK DETAILS
    // ======================================================

    bankDetails: {
      bankName: String,
      accountName: String,
      accountNumber: String,
    },

    // ======================================================
    // VERIFICATION
    // ======================================================

    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationStatus: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected"
      ],
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

    // ======================================================
    // NOTIFICATIONS
    // ======================================================

    notificationPreference: {
      type: String,
      enum: [
        "email",
        "whatsapp",
        "both",
        ""
      ],
      default: "",
    },

    profileUpdateNotificationSent: {
      type: Boolean,
      default: false,
    },

    // ======================================================
    // ACCOUNT STATUS
    // ======================================================

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deleteReason: String,

    deleteDate: Date,

    accountStatus: {
      type: String,
      enum: [
        "pending",
        "active",
        "suspended",
        "banned",
        "deleted"
      ],
      default: "pending"
    }
  },
  {
    timestamps: true,
  });

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