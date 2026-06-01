const mongoose = require('mongoose');
const { getChatConnection } = require('../../config/chatDatabase');

const readReceiptSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent', index: true },
  sentAt: { type: Date, default: Date.now },
  deliveredAt: { type: Date, default: null },
  readAt: { type: Date, default: null },
}, { timestamps: true });

readReceiptSchema.index({ message: 1, user: 1 }, { unique: true });

module.exports = getChatConnection().model('ReadReceipt', readReceiptSchema);
