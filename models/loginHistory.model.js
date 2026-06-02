const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, refPath: 'userModel', default: null, index: true },
  userModel: { type: String, enum: ['Buyer', 'Vendor', 'Founder', 'Admin'], default: null },
  role: { type: String, enum: ['buyer', 'vendor', 'founder', 'admin'], required: true, index: true },
  email: { type: String, lowercase: true, trim: true },
  phoneNo: { type: String, trim: true },
  loginMethod: { type: String, default: 'password' },
  ipAddress: String,
  userAgent: String,
  deviceInfo: Object,
  location: Object,
  success: { type: Boolean, required: true, index: true },
  failureReason: String,
}, { timestamps: true });

loginHistorySchema.index({ createdAt: -1 });
loginHistorySchema.index({ user: 1, role: 1, createdAt: -1 });

module.exports = mongoose.model('LoginHistory', loginHistorySchema);
