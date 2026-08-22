const mongoose = require('mongoose')

const founder = new mongoose.Schema({
  serialNumber: {
    type: String,
    unique: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
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
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['founder'],
    default: 'founder'
  },
  isActive: {
    type: Boolean,
    default: true
  },

  tokenVersion: {
    type: Number,
    default: 0,
  },

  passwordResetToken: String,

  passwordResetExpires: Date,
}, {
  timestamps: true
});

module.exports = mongoose.model('Founder', founder)