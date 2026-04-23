const mongoose = require('mongoose')

const buyer = new mongoose.Schema({
  serialNumber: { type: String, unique: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNo: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  username: String,
  profilePhoto: String,
  country: String,
  state: String,
  address: String,

  preferredLanguage: String,

  notificationPreference: {
    type: String,
    enum: ['whatsapp', 'email', 'both']
  },
  // isVerified: { type: Boolean, default: false },
  updatedAt: Date
})

module.exports = mongoose.model('Buyer', buyer)