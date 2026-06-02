const Review = require('../models/review.model');
const ProductRating = require('../models/productRating.model');
const Product = require('../models/addproduct.model');
const Order = require('../models/buyerOrder.model');
const AuditLog = require('../models/auditLog.model');
const AppError = require('./common/AppError');
const { applyDateRange, paginate } = require('./common/query.service');

const verifyPurchase = ({ buyerId, productId, orderId }) => {
  const filter = { buyer: buyerId, status: 'delivered', 'items.productId': productId };
  if (orderId) filter._id = orderId;
  return Order.findOne(filter).select('_id').lean();
};

const createReview = async ({ buyerId, productId, body }) => {
  const product = await Product.findById(productId).select('vendor name').lean();
  if (!product) throw new AppError('Product not found', 404);
  const order = await verifyPurchase({ buyerId, productId, orderId: body.orderId });
  if (!order) throw new AppError('You can only review products from delivered orders', 403);
  const existing = await Review.findOne({ reviewer: buyerId, product: productId }).setOptions({ withDeleted: true });
  if (existing && !existing.deleted) throw new AppError('You already reviewed this product. Update your review instead.', 409);
  const rating = body.ratingId ? await ProductRating.findOne({ _id: body.ratingId, buyer: buyerId, product: productId }).lean() : null;
  const review = await Review.create({ reviewer: buyerId, reviewerModel: 'Buyer', reviewerRole: 'buyer', vendor: product.vendor, product: productId, order: order._id, rating: rating?._id || null, ratingValue: rating?.rating || body.ratingValue, comment: body.comment, status: 'active' });
  await AuditLog.create({ user: buyerId, userModel: 'Buyer', role: 'buyer', actor: buyerId, actorModel: 'Buyer', actorRole: 'buyer', action: 'REVIEW_CREATED', entity: 'Review', entityId: review._id, metadata: { product: productId } });
  return review;
};

const updateOwnReview = async ({ userId, reviewId, body }) => {
  const review = await Review.findOne({ _id: reviewId, reviewer: userId });
  if (!review) throw new AppError('Review not found', 404);
  if (body.comment !== undefined) review.comment = body.comment;
  if (body.ratingValue !== undefined) review.ratingValue = body.ratingValue;
  review.status = 'active';
  await review.save();
  await AuditLog.create({ user: userId, userModel: 'Buyer', role: 'buyer', actor: userId, actorModel: 'Buyer', actorRole: 'buyer', action: 'REVIEW_UPDATED', entity: 'Review', entityId: review._id });
  return review;
};

const deleteOwnReview = async ({ userId, reviewId }) => {
  const review = await Review.findOne({ _id: reviewId, reviewer: userId });
  if (!review) throw new AppError('Review not found', 404);
  review.status = 'deleted'; review.deleted = true; review.deletedAt = new Date(); review.deletedBy = userId; review.deletedByModel = 'Buyer';
  await review.save();
  await AuditLog.create({ user: userId, userModel: 'Buyer', role: 'buyer', actor: userId, actorModel: 'Buyer', actorRole: 'buyer', action: 'REVIEW_DELETED', entity: 'Review', entityId: review._id });
  return { deleted: true };
};

const buildFilter = (query = {}) => {
  const filter = { deleted: { $ne: true } };
  if (query.productId) filter.product = query.productId;
  if (query.vendorId) filter.vendor = query.vendorId;
  if (query.buyerId) filter.reviewer = query.buyerId;
  if (query.status) filter.status = query.status;
  if (query.rating) filter.ratingValue = Number(query.rating);
  if (query.search) filter.comment = new RegExp(query.search, 'i');
  applyDateRange(filter, query);
  return filter;
};

const listReviews = (query) => paginate({ model: Review, filter: buildFilter(query), query, select: '-__v', populate: [{ path: 'reviewer', select: 'fullName username profilePhoto' }, { path: 'product', select: 'name image price' }, { path: 'vendor', select: 'fullName storeName' }] });
const getProductReviews = (productId, query) => listReviews({ ...query, productId, status: query.status || 'active' });
const getVendorReviews = (vendorId, query) => listReviews({ ...query, vendorId });
const getBuyerReviews = (buyerId, query) => listReviews({ ...query, buyerId });
const founderGetAllReviews = (query) => listReviews(query);

const moderateReview = async ({ reviewId, actor, status, reason }) => {
  const review = await Review.findById(reviewId).setOptions({ withDeleted: true });
  if (!review) throw new AppError('Review not found', 404);
  review.status = status;
  review.moderatedAt = new Date(); review.moderatedBy = actor._id; review.moderationReason = reason;
  if (status === 'deleted') { review.deleted = true; review.deletedAt = new Date(); review.deletedBy = actor._id; review.deletedByModel = 'Founder'; }
  if (status === 'active') { review.deleted = false; review.deletedAt = null; }
  await review.save();
  await AuditLog.create({ user: actor._id, userModel: 'Founder', role: 'founder', actor: actor._id, actorModel: 'Founder', actorRole: 'founder', action: status === 'active' ? 'REVIEW_RESTORED' : status === 'hidden' ? 'REVIEW_HIDDEN' : 'REVIEW_SOFT_DELETED', entity: 'Review', entityId: review._id, reason });
  return review;
};

module.exports = { createReview, updateOwnReview, deleteOwnReview, listReviews, getProductReviews, getVendorReviews, getBuyerReviews, founderGetAllReviews, moderateReview };
