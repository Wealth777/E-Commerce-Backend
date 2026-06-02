const mongoose = require('mongoose');
const { softDeletePlugin } = require('./base.schema');

const vendor = new mongoose.Schema({
  serialNumber: {
    type: String,
    unique: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phoneNo: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['vendor'],
    default: 'vendor'
  },

  username: {
    type: String,
    unique: true,
    sparse: true
  },
  profilePhoto: String,
  country: String,
  state: String,
  address: String,
  supportContact: String,
  storeName: String,
  storeDescription: String,
  bannerImage: String,

  socialLinks: {
    facebook: String,
    instagram: String,
    x: String
  },

  preferredLanguage: String,

  notificationPreference: {
    type: String,
    enum: ['whatsapp', 'email', 'both']
  },

  bankDetails: {
    bankName: String,
    accountName: String,
    accountNumber: {
      type: String,
      unique: true
    }
  },

  profileUpdateNotificationSent: { type: Boolean, default: false },

  isActive: {
    type: Boolean,
    default: true
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  verificationApprovedAt: Date,
  verificationApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Founder'
  },
  verificationRejectedAt: Date,
  verificationRejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Founder'
  },
  verificationRejectionReason: String,



  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deleteReason: String,

  updatedAt: Date

}, {
  timestamps: true
});

vendor.plugin(softDeletePlugin)

module.exports = mongoose.model('Vendor', vendor);