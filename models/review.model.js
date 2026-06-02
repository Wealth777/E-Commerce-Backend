const mongoose = require('mongoose');
const { softDeletePlugin } = require('./base.schema');

const reviewSchema = new mongoose.Schema({
  reviewer: { type: mongoose.Schema.Types.ObjectId, refPath: 'reviewerModel', required: true, index: true },
  reviewerModel: { type: String, enum: ['Buyer', 'Vendor', 'Founder'], default: 'Buyer' },
  reviewerRole: { type: String, enum: ['buyer', 'vendor', 'founder', 'admin'], required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'AddProduct', index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  rating: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductRating', default: null },
  ratingValue: { type: Number, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['active', 'hidden', 'flagged', 'deleted'], default: 'active', index: true },
  moderatedAt: Date,
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Founder' },
  moderationReason: String,
}, { timestamps: true });

reviewSchema.index({ product: 1, reviewer: 1 }, { unique: true, partialFilterExpression: { deleted: { $ne: true } } });
reviewSchema.index({ createdAt: -1 });
reviewSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Review', reviewSchema);
