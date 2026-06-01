const mongoose = require('mongoose');
const { getChatConnection } = require('../../config/chatDatabase');

const chatReportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  reporterRole: { type: String, enum: ['buyer', 'vendor'], required: true },
  reportedUser: { type: mongoose.Schema.Types.ObjectId, index: true },
  reportedUserRole: { type: String, enum: ['buyer', 'vendor'] },
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', index: true },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['open', 'reviewing', 'resolved', 'dismissed'], default: 'open', index: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = getChatConnection().model('ChatReport', chatReportSchema);
