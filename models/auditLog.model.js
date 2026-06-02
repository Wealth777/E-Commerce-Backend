const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel',
    required: true
  },
  userModel: {
    type: String,
    enum: ['Buyer', 'Vendor', 'Founder'],
    default: 'Vendor'
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'actorModel',
    default: null
  },
  actorModel: {
    type: String,
    enum: ['Buyer', 'Vendor', 'Founder'],
    default: null
  },
  actorRole: {
    type: String,
    enum: ['buyer', 'vendor', 'founder', 'admin'],
    default: null
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  role: {
    type: String,
    enum: ['buyer', 'vendor', 'founder', 'admin'],
    default: 'vendor'
  },
  action: {
    type: String,
    required: true
  },
  entity: {
    type: String
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  reason: {
    type: String,
    default: null
  },
  metadata: {
    type: Object
  }
}, { timestamps: true });

auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ targetUser: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
