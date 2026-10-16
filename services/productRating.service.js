const ProductRating = require('../models/productRating.model');
const Review = require('../models/review.model');
const Product = require('../models/addproduct.model');
const Order = require('../models/buyerOrder.model');
const AuditLog = require('../models/auditLog.model');
const AppError = require('./common/AppError');
const { applyDateRange, paginate } = require('./common/query.service');

const canVerifyPurchase = true;

const refreshProductRatingSummary = async (productId) => {
  const rows = await ProductRating.aggregate([
    { $match: { product: productId, status: 'active', deleted: { $ne: true } } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]).option({ withDeleted: true });
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0; let sum = 0;
  rows.forEach((row) => { breakdown[row._id] = row.count; total += row.count; sum += row._id * row.count; });
  const averageRating = total ? Number((sum / (total * 5)).toFixed(4)) : 0;
  await Product.findByIdAndUpdate(productId, { $set: { ratingSummary: { averageRating, totalRatings: total, breakdown } } });
  return { averageRating, totalRatings: total, breakdown };
};

const verifyPurchase = async ({ buyerId, productId, orderId }) => {
  const filter = { buyer: buyerId, status: 'delivered', 'items.productId': productId };
  if (orderId) filter._id = orderId;
  return Order.findOne(filter).select('_id vendor items').lean();
};

const createRating = async ({ buyerId, productId, body }) => {
  const product = await Product.findById(productId).populate('vendor', '_id fullName business').lean();
  if (!product) throw new AppError('Product not found', 404);
  if (String(product.vendor?._id || product.vendor) === String(buyerId)) throw new AppError('You cannot rate your own product', 403);

  const order = await verifyPurchase({ buyerId, productId, orderId: body.orderId });
  if (canVerifyPurchase && !order) throw new AppError('You can only rate products from delivered orders', 403);

  const existing = await ProductRating.findOne({ buyer: buyerId, product: productId }).setOptions({ withDeleted: true });
  if (existing) throw new AppError('You already rated this product. Update your rating instead.', 409);

  if (!Number.isInteger(Number(body.rating)) || Number(body.rating) < 1 || Number(body.rating) > 5) throw new AppError('Rating must be an integer between 1 and 5', 400);
  const rating = await ProductRating.create({ product: productId, buyer: buyerId, vendor: product.vendor?._id || product.vendor, order: order?._id || body.orderId || null, rating: Number(body.rating), comment: body.comment, status: 'active' });
  await refreshProductRatingSummary(product._id);
  await AuditLog.create({ user: buyerId, userModel: 'Buyer', role: 'buyer', actor: buyerId, actorModel: 'Buyer', actorRole: 'buyer', action: 'RATING_CREATED', entity: 'ProductRating', entityId: rating._id, metadata: { product: productId, rating: rating.rating } });
  return rating;
};

const updateRating = async ({ buyerId, ratingId, body }) => {
  const rating = await ProductRating.findOne({ _id: ratingId, buyer: buyerId });
  if (!rating) throw new AppError('Rating not found', 404);
  if (body.rating !== undefined) {
    if (!Number.isInteger(Number(body.rating)) || Number(body.rating) < 1 || Number(body.rating) > 5) throw new AppError('Rating must be an integer between 1 and 5', 400);
    rating.rating = Number(body.rating);
  }
  if (body.comment !== undefined) rating.comment = body.comment;
  rating.status = 'active';
  await rating.save();
  await refreshProductRatingSummary(rating.product);
  await AuditLog.create({ user: buyerId, userModel: 'Buyer', role: 'buyer', actor: buyerId, actorModel: 'Buyer', actorRole: 'buyer', action: 'RATING_UPDATED', entity: 'ProductRating', entityId: rating._id, metadata: { rating: rating.rating } });
  return rating;
};

const deleteOwnRating = async ({ buyerId, ratingId }) => {
  const rating = await ProductRating.findOne({ _id: ratingId, buyer: buyerId });
  if (!rating) throw new AppError('Rating not found', 404);
  rating.status = 'deleted';
  rating.deleted = true;
  rating.deletedAt = new Date();
  rating.deletedBy = buyerId;
  rating.deletedByModel = 'Buyer';
  await rating.save();
  await refreshProductRatingSummary(rating.product);
  await AuditLog.create({ user: buyerId, userModel: 'Buyer', role: 'buyer', actor: buyerId, actorModel: 'Buyer', actorRole: 'buyer', action: 'RATING_DELETED', entity: 'ProductRating', entityId: rating._id });
  return { deleted: true };
};

const buildFilter = (query = {}) => {
  const filter = { deleted: { $ne: true } };
  if (query.productId) filter.product = query.productId;
  if (query.buyerId) filter.buyer = query.buyerId;
  if (query.vendorId) filter.vendor = query.vendorId;
  if (query.status) filter.status = query.status;
  if (query.rating) filter.rating = Number(query.rating);
  applyDateRange(filter, query);
  return filter;
};

const listRatings = (query) => paginate({ model: ProductRating, filter: buildFilter(query), query, select: '-__v', populate: [{ path: 'buyer', select: 'fullName username profilePhoto' }, { path: 'product', select: 'name image price' }, { path: 'vendor', select: 'fullName business' }] });
const getProductRatings = (productId, query) => listRatings({ ...query, productId, status: query.status || 'active' });
const getBuyerRatings = (buyerId, query) => listRatings({ ...query, buyerId });
const getVendorProductRatings = (vendorId, query) => listRatings({ ...query, vendorId });

const getProductRatingSummary = async (productId) => {
  const product = await Product.findById(productId).select('ratingSummary').lean();
  if (!product) throw new AppError('Product not found', 404);
  const summary = product.ratingSummary;
  const latestRatings = await ProductRating.find({ product: productId, status: 'active' }).sort({ createdAt: -1 }).limit(5).populate('buyer', 'fullName username profilePhoto').lean();
  return { ...summary, latestRatings };
};

module.exports = { createRating, updateRating, deleteOwnRating, listRatings, getProductRatings, getProductRatingSummary, getBuyerRatings, getVendorProductRatings, refreshProductRatingSummary };