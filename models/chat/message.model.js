const mongoose = require('mongoose');
const { getChatConnection } = require('../../config/chatDatabase');

const attachmentSchema = new mongoose.Schema({
  originalName: { type: String, required: true, trim: true },
  fileName: { type: String, required: true, trim: true },
  mimeType: { type: String, required: true },
  extension: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  resourceType: { type: String, default: 'auto' },
}, { _id: false });

const perUserDeleteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true },
  deletedAt: { type: Date, default: Date.now },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  senderRole: { type: String, enum: ['buyer', 'vendor'], required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  receiverRole: { type: String, enum: ['buyer', 'vendor'], required: true },
  type: { type: String, enum: ['text', 'image', 'file', 'mixed'], default: 'text', index: true },
  text: { type: String, trim: true, maxlength: 5000, default: '' },
  attachments: { type: [attachmentSchema], default: [] },
  delivered: { type: Boolean, default: false, index: true },
  deliveredAt: { type: Date, default: null },
  read: { type: Boolean, default: false, index: true },
  readAt: { type: Date, default: null },
  edited: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  deletedForMe: { type: [perUserDeleteSchema], default: [] },
  deletedForEveryone: { type: Boolean, default: false, index: true },
  deletedForEveryoneAt: { type: Date, default: null },
}, { timestamps: true });

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ text: 'text', 'attachments.originalName': 'text' });

module.exports = getChatConnection().model('Message', messageSchema);
