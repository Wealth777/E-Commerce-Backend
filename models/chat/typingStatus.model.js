const mongoose = require('mongoose');
const { getChatConnection } = require('../../config/chatDatabase');

const typingStatusSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  role: { type: String, enum: ['buyer', 'vendor'], required: true },
  isTyping: { type: Boolean, default: false, index: true },
  startedAt: { type: Date, default: null },
  stoppedAt: { type: Date, default: null },
}, { timestamps: true });

typingStatusSchema.index({ conversation: 1, user: 1 }, { unique: true });

module.exports = getChatConnection().model('TypingStatus', typingStatusSchema);
