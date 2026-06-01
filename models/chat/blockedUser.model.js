const mongoose = require('mongoose');
const { getChatConnection } = require('../../config/chatDatabase');

const blockedUserSchema = new mongoose.Schema({
  blocker: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  blockerRole: { type: String, enum: ['buyer', 'vendor'], required: true },
  blocked: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  blockedRole: { type: String, enum: ['buyer', 'vendor'], required: true },
  reason: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });

blockedUserSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

module.exports = getChatConnection().model('BlockedUser', blockedUserSchema);
