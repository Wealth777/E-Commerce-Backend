const mongoose = require('mongoose');
const { softDeletePlugin } = require('./base.schema');

const productRatingSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'AddProduct', required: true, index: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true, index: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true, maxlength: 500 },
  status: { type: String, enum: ['active', 'hidden', 'deleted'], default: 'active', index: true },
}, { timestamps: true });

productRatingSchema.index({ product: 1, buyer: 1 }, { unique: true, partialFilterExpression: { deleted: { $ne: true } } });
productRatingSchema.index({ createdAt: -1 });
productRatingSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('ProductRating', productRatingSchema);
