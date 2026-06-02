const mongoose = require('mongoose');
const { softDeletePlugin } = require('./base.schema');

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, refPath: 'reporterModel', required: true, index: true },
  reporterModel: { type: String, enum: ['Buyer', 'Vendor', 'Founder'], required: true },
  reporterRole: { type: String, enum: ['buyer', 'vendor', 'founder', 'admin'], required: true, index: true },
  reportedUser: { type: mongoose.Schema.Types.ObjectId, refPath: 'reportedUserModel', default: null, index: true },
  reportedUserModel: { type: String, enum: ['Buyer', 'Vendor', 'Founder'], default: null },
  reportedRole: { type: String, enum: ['buyer', 'vendor', 'founder', 'admin'], default: null, index: true },
  targetType: { type: String, enum: ['user', 'vendor', 'buyer', 'product', 'review', 'order'], required: true, index: true },
  target: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  reason: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['pending', 'under_review', 'resolved', 'rejected'], default: 'pending', index: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium', index: true },
  evidenceAttachments: [{ url: String, publicId: String, fileType: String }],
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Founder', default: null },
  resolvedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Founder', default: null },
  resolutionNote: String,
}, { timestamps: true });

reportSchema.index({ reporter: 1, targetType: 1, target: 1, status: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Report', reportSchema);
