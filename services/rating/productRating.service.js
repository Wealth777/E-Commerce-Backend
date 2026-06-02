const mongoose = require('mongoose');
const ProductRating = require('../../models/productRating.model');
const Product = require('../../models/addproduct.model');
const Order = require('../../models/buyerOrder.model');
const AuditLog = require('../../models/auditLog.model');
const AppError = require('../common/AppError');
const { addDateRange, addSearch, paginated } = require('../common/query.service');

const populateRating = [
  { path: 'buyer', select: 'fullName username email profilePhoto serialNumber' },
  { path: 'vendor', select: 'fullName storeName email serialNumber' },
  { path: 'product', select: 'name image price ratingSummary' },
  { path: 'order', select: 'status payment.status createdAt' },
];

const recalculateProductRating = async (productId, session = null) => {
  const rows = await ProductRating.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), status: 'active' } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]).session(session || null);

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalRatings = 0;
  let totalScore = 0;
  rows.forEach((row) => {
    breakdown[row._id] = row.count;
    totalRatings += row.count;
    totalScore += row._id * row.count;
  });
  const averageRating = totalRatings ? Number((totalScore / totalRatings).toFixed(2)) : 0;

  await Product.findByIdAndUpdate(productId, { $set: { ratingSummary: { averageRating, totalRatings, breakdown } } }, { session });
  return { averageRating, totalRatings, breakdown };
};

const verifyPurchase = async ({ buyerId, productId, orderId }) => {
  const filter = { buyer: buyerId, status: 'delivered', 'items.productId': productId };
  if (orderId) filter._id = orderId;
  return Order.findOne(filter).select('_id vendor status');
};

const createRating = async ({ buyerId, body }) => {
  const { productId, orderId, rating, comment } = body;
  if (!productId || !rating) throw new AppError('Product ID and rating are required', 400);
  if (rating < 1 || rating > 5) throw new AppError('Rating must be between 1 and 5', 400);

  const product = await Product.findById(productId).select('vendor name');
  if (!product) throw new AppError('Product not found', 404);
  if (String(product.vendor) === String(buyerId)) throw new AppError('Vendors cannot rate their own products', 403);

  const order = await verifyPurchase({ buyerId, productId, orderId });
  if (!order) throw new AppError('Only buyers who received this product can rate it', 403);

  const existing = await ProductRating.findOne({ product: productId, buyer: buyerId });
  if (existing && existing.status !== 'deleted') throw new AppError('You have already rated this product. Update your rating instead', 409);

  const doc = await ProductRating.findOneAndUpdate(
    { product: productId, buyer: buyerId },
    { product: productId, buyer: buyerId, vendor: product.vendor, order: order._id, rating, comment, status: 'active', deletedAt: null },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await recalculateProductRating(productId);
  await AuditLog.create({ user: buyerId, role: 'buyer', action: 'RATING_CREATED', entity: 'ProductRating', entityId: doc._id, metadata: { productId, rating } });
  return ProductRating.findById(doc._id).populate(populateRating);
};

const updateRating = async ({ buyerId, ratingId, body }) => {
  const ratingDoc = await ProductRating.findOne({ _id: ratingId, buyer: buyerId, status: { $ne: 'deleted' } });
  if (!ratingDoc) throw new AppError('Rating not found', 404);
  if (body.rating !== undefined) {
    if (body.rating < 1 || body.rating > 5) throw new AppError('Rating must be between 1 and 5', 400);
    ratingDoc.rating = body.rating;
  }
  if (body.comment !== undefined) ratingDoc.comment = body.comment;
  await ratingDoc.save();
  await recalculateProductRating(ratingDoc.product);
  await AuditLog.create({ user: buyerId, role: 'buyer', action: 'RATING_UPDATED', entity: 'ProductRating', entityId: ratingDoc._id, metadata: { productId: ratingDoc.product } });
  return ProductRating.findById(ratingDoc._id).populate(populateRating);
};

const deleteOwnRating = async ({ buyerId, ratingId }) => {
  const ratingDoc = await ProductRating.findOneAndUpdate({ _id: ratingId, buyer: buyerId, status: { $ne: 'deleted' } }, { status: 'deleted', deletedAt: new Date() }, { new: true });
  if (!ratingDoc) throw new AppError('Rating not found', 404);
  await recalculateProductRating(ratingDoc.product);
  await AuditLog.create({ user: buyerId, role: 'buyer', action: 'RATING_DELETED', entity: 'ProductRating', entityId: ratingDoc._id, metadata: { productId: ratingDoc.product } });
  return ratingDoc;
};

const listRatings = (query = {}, base = {}) => {
  const filter = { status: { $ne: 'deleted' }, ...base };
  if (query.status) filter.status = query.status;
  if (query.rating) filter.rating = Number(query.rating);
  addDateRange(filter, query);
  return paginated({ model: ProductRating, filter, query, sortFields: ['createdAt', 'updatedAt', 'rating'], populate: populateRating });
};

const getProductSummary = async (productId) => {
  const product = await Product.findById(productId).select('name ratingSummary');
  if (!product) throw new AppError('Product not found', 404);
  const latestRatings = await ProductRating.find({ product: productId, status: 'active' }).sort({ createdAt: -1 }).limit(5).populate(populateRating);
  return { product, summary: product.ratingSummary || {}, latestRatings };
};

module.exports = { createRating, updateRating, deleteOwnRating, listRatings, getProductSummary, recalculateProductRating };
