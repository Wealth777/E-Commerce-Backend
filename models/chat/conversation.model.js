const mongoose = require('mongoose');
const { getChatConnection } = require('../../config/chatDatabase');

const participantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  role: { type: String, enum: ['buyer', 'vendor'], required: true },
  name: { type: String, trim: true },
  businessName: { type: String, trim: true },
  profilePhoto: { type: String },
  joinedAt: { type: Date, default: Date.now },
}, { _id: false });

const perUserStatusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true },
  role: { type: String, enum: ['buyer', 'vendor'], required: true },
  archived: { type: Boolean, default: false },
  archivedAt: { type: Date, default: null },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  blocked: { type: Boolean, default: false },
  blockedAt: { type: Date, default: null },
  unreadCount: { type: Number, default: 0, min: 0 },
  lastReadAt: { type: Date, default: null },
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  participants: { type: [participantSchema], validate: v => v.length === 2, required: true },
  participantKey: { type: String, required: true, unique: true, index: true },
  lastMessage: {
    messageId: { type: mongoose.Schema.Types.ObjectId, default: null },
    text: { type: String, default: '' },
    type: { type: String, enum: ['text', 'image', 'file', 'mixed'], default: 'text' },
    sender: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdAt: { type: Date, default: null },
  },
  lastMessageAt: { type: Date, default: null, index: true },
  userStatus: { type: [perUserStatusSchema], default: [] },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  firstMessageNotificationSent: { type: Boolean, default: false },
  blocked: { type: Boolean, default: false, index: true },
  blockedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  blockedAt: { type: Date, default: null },
}, { timestamps: true });

conversationSchema.index({ 'participants.user': 1, lastMessageAt: -1 });
conversationSchema.index({ 'participants.name': 'text', 'participants.businessName': 'text', 'lastMessage.text': 'text' });
conversationSchema.index({ 'userStatus.user': 1, 'userStatus.archived': 1, 'userStatus.blocked': 1 });

module.exports = getChatConnection().model('Conversation', conversationSchema);
