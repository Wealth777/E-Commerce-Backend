const mongoose = require('mongoose')
const { softDeletePlugin } = require('./base.schema')

const founder = new mongoose.Schema({
  serialNumber: {
    type: String,
    unique: true
  },

  role: {
    type: String,
    enum: ['founder'],
    default: 'founder'
  },

  fullName: {
    type: String,
    required: true,
    trim: true
  },

  googleId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
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

  phoneNo: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  passwordResetToken: String,

  passwordResetExpires: Date,

  updatePasswordDate: Date,

  onboardingCompleted: {
    type: Boolean,
    default: true,
  },

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
      "active",
      "deleted"
    ],
    default: "active"
  },

  updatedAt: Date
}, {
  timestamps: true
});

founder.plugin(softDeletePlugin)

module.exports = mongoose.model('Founder', founder)