const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel',
    default: null,
    index: true
  },

  userModel: {
    type: String,
    enum: ['Buyer', 'Vendor', 'Founder'],
    default: null
  },

  role: {
    type: String,
    enum: ['buyer', 'vendor', 'founder'],
    required: true,
    index: true
  },

  email: {
    type: String,
    lowercase: true,
    trim: true
  },

  phoneNo: { type: String, trim: true },

  loginMethod: {
    type: String,
    enum: [
      "password",
      "google",
    ],
    default: "password"
  },

  ipAddress: String,

  userAgent: String,

  deviceInfo: {
    browser: String,
    browserVersion: String,
    os: String,
    osVersion: String,
    deviceType: String,
    deviceModel: String,
    vendor: String,
    cpu: String,
    userAgent: String
  },

  location: {
    city: String,
    region: String,
    country: String,
    timezone: String,
    latitude: Number,
    longitude: Number
  },

  sessionId: {
    type: String,
    required: true,
    index: true
  },

  loginAt: {
    type: Date,
    default: Date.now
  },

  logoutAt: Date,

  sessionStatus: {
    type: String,
    enum: [
      "active",
      "logged_out",
      "expired",
      "revoked"
    ],
    default: "active"
  },

  logoutReason: {
    type: String,
    enum: [
      "manual",
      "expired",
      "revoked",
      "unknown"
    ]
  },

  success: {
    type: Boolean,
    required: true,
    index: true
  },

  failureReason: String,
}, { timestamps: true });

loginHistorySchema.index({ user: 1, role: 1, createdAt: -1, loginAt: -1 });

module.exports = mongoose.model('LoginHistory', loginHistorySchema);