const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  role: {
    type: String,
    enum: ['buyer', 'vendor', 'founder'],
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
  metadata: {
    type: Object
  }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);