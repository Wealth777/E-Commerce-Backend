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
  googleId: {
    type: String
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
    }
  },
  role: {
    type: String,
    enum: ['buyer'],
    default: 'buyer'
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

  preferredLanguage: String,

  notificationPreference: {
    type: String,
    enum: ['whatsapp', 'email', 'both']
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

  updatedAt: Date
}, {
  timestamps: true
})

buyer.plugin(softDeletePlugin)

module.exports = mongoose.model('Buyer', buyer)