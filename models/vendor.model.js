const mongoose = require('mongoose');

const vendor = new mongoose.Schema({
  serialNumber: { type: String, unique: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNo: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['vendor'], default: 'vendor' },

  username: String,
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

  bankName: String,
  accountName: String,
  accountNumber: String,
  // isVerified: { type: Boolean, default: false },
  updatedAt: Date

});

module.exports = mongoose.model('Vendor', vendor);