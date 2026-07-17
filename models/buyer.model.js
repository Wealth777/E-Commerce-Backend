const mongoose = require('mongoose')
const { softDeletePlugin } = require('./base.schema')

const buyer = new mongoose.Schema({
  serialNumber: {
    type: String,
    unique: true
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
    trim: true
  },
  googleId: {
    type: String,
    trim: true
  },
  school: {
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
  role: {
    type: String,
    enum: ['buyer'],
    default: 'buyer',
    trim: true
  },
  country: {
    type: String,
    enum: ['Nigeria'],
    default: 'Nigeria',
    trim: true
  },

  onboardingCompleted: {
    type: Boolean,
    default: false,
  },

  username: {
    type: String,
    trim: true,
  },
  profilePhoto: String,
  address: String,

  preferredLanguage: String,

  notificationPreference: {
    type: String,
    enum: ['whatsapp', 'email', 'both'],
    trim: true
  },
  profileUpdateNotificationSent: { type: Boolean, default: false },

  isActive: {
    type: Boolean,
    default: true
  },

  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },

  deleteReason: String,

  passwordResetToken: String,

  passwordResetExpires: Date,

  updatedAt: Date
}, {
  timestamps: true
})

buyer.index(
  { "username": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "username": {
        $exists: true,
        $ne: null,
      },
    },
  }
);

buyer.index(
  { googleId: 1 },
  {
    unique: true,
    sparse: true,
  }
);

buyer.plugin(softDeletePlugin)

module.exports = mongoose.model('Buyer', buyer)