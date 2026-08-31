const mongoose = require('mongoose')
const { softDeletePlugin } = require('./base.schema')

const buyer = new mongoose.Schema({
  serialNumber: {
    type: String,
    unique: true
  },

  role: {
    type: String,
    enum: ['buyer'],
    default: 'buyer',
    trim: true
  },

  fullName: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  emailVerified: {
    type: Boolean,
    default: false,
  },

  emailVerifiedDate: Date,

  emailHistory: [
    {
      email: String,
      changedAt: Date,
      verifiedAt: Date
    }
  ],

  pendingEmail: {
    type: String,
    default: null,
  },

  changeEmailDate: Date,

  googleId: {
    type: String,
    trim: true
  },

  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: function () {
      return !this.googleId;
    }
  },

  state: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: function () {
      return !this.googleId;
    }
  },

  phoneNo: {
    type: String,
    required: function () {
      return !this.googleId;
    },
    unique: true,
    trim: true
  },

  password: {
    type: String,
    required: function () {
      return !this.googleId;
    },
    trim: true
  },

  passwordResetToken: String,

  passwordResetExpires: Date,

  updatePasswordDate: Date,

  onboardingCompleted: {
    type: Boolean,
    default: false,
  },

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
    matricNumber: {
      type: String,
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

  preferences: {
    notificationPreference: {
      type: String,
      enum: ['whatsapp', 'email', 'both', ''],
      default: "",
      trim: true
    },

    promotionalMessages: {
      type: Boolean,
      default: false,
    },
  },

  profileUpdateNotificationSent: { type: Boolean, default: false },

  isActive: {
    type: Boolean,
    default: true
  },

  isSuspend: {
    type: Boolean,
    default: false,
  },

  suspendReason: String,

  suspendDate: Date,

  isLocked: {
    type: Boolean,
    default: false,
  },

  lockReason: String,

  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },

  deleteReason: String,

  deleteDate: Date,

  tokenVersion: {
    type: Number,
    default: 0,
  },

  sessionId: {
    type: String,
    index: true
  },

  accountStatus: {
    type: String,
    enum: [
      "pending",
      "active",
      "suspended",
      "locked",
      "banned",
      "deleted"
    ],
    default: "active"
  },

  updatedAt: Date
}, {
  timestamps: true
})

buyer.index(
  { googleId: 1 },
  {
    unique: true,
    sparse: true,
  }
);

buyer.plugin(softDeletePlugin)

module.exports = mongoose.model('Buyer', buyer)