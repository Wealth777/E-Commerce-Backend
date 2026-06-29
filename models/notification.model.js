const mongoose = require('mongoose');

const channelStatusSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    sent: { type: Boolean, default: false },
    read: { type: Boolean, default: false },
    sentAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    error: { type: String, default: null },
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'recipientModel',
      index: true,
    },
    recipientModel: {
      type: String,
      enum: ['Buyer', 'Vendor', 'Founder'],
      required: true,
    },
    recipientRole: {
      type: String,
      enum: ['buyer', 'vendor', 'founder'],
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    channels: {
      inApp: { type: channelStatusSchema, default: () => ({ enabled: true }) },
      email: { type: channelStatusSchema, default: () => ({ enabled: false }) },
      whatsapp: { type: channelStatusSchema, default: () => ({ enabled: false }) },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    dedupeKey: {
      type: String,
      trim: true,
    },
    deletedInAppAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, recipientRole: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, recipientRole: 1, 'channels.inApp.read': 1, deletedInAppAt: 1 });
notificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Notification', notificationSchema);
