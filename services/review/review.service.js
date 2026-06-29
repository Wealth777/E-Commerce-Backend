// const Review = require('../../models/review.model');
// const ProductRating = require('../../models/productRating.model');
// const Product = require('../../models/addproduct.model');
// const Order = require('../../models/buyerOrder.model');
// const AuditLog = require('../../models/auditLog.model');
// const AppError = require('../common/AppError');
// const { addDateRange, addSearch, paginated } = require('../common/query.service');

// const populateReview = [
//   { path: 'reviewer', select: 'fullName username email profilePhoto serialNumber storeName' },
//   { path: 'vendor', select: 'fullName storeName email serialNumber' },
//   { path: 'product', select: 'name image price ratingSummary' },
//   { path: 'rating', select: 'rating comment status' },
//   { path: 'order', select: 'status payment.status createdAt' },
// ];

// const verifyPurchase = ({ buyerId, productId, orderId }) => {
//   const filter = { buyer: buyerId, status: 'delivered', 'items.productId': productId };
//   if (orderId) filter._id = orderId;
//   return Order.findOne(filter).select('_id vendor status');
// };

// const createReview = async ({ buyerId, body }) => {
//   const { productId, orderId, ratingId, comment } = body;
//   if (!productId || !comment) throw new AppError('Product ID and comment are required', 400);
//   const product = await Product.findById(productId).select('vendor name');
//   if (!product) throw new AppError('Product not found', 404);
//   const order = await verifyPurchase({ buyerId, productId, orderId });
//   if (!order) throw new AppError('Only buyers who received this product can review it', 403);
//   const existing = await Review.findOne({ reviewer: buyerId, product: productId, status: { $ne: 'deleted' } });
//   if (existing) throw new AppError('You have already reviewed this product. Update your review instead', 409);
//   const rating = ratingId ? await ProductRating.findOne({ _id: ratingId, buyer: buyerId, product: productId }) : await ProductRating.findOne({ buyer: buyerId, product: productId, status: 'active' });
//   const review = await Review.create({
//     reviewer: buyerId,
//     reviewerModel: 'Buyer',
//     reviewerRole: 'buyer',
//     vendor: product.vendor,
//     product: productId,
//     order: order._id,
//     rating: rating?._id || null,
//     ratingValue: rating?.rating || body.ratingValue || null,
//     comment,
//   });
//   await AuditLog.create({ user: buyerId, role: 'buyer', action: 'REVIEW_CREATED', entity: 'Review', entityId: review._id, metadata: { productId, vendorId: product.vendor } });
//   return Review.findById(review._id).populate(populateReview);
// };

// const updateOwnReview = async ({ userId, reviewId, body }) => {
//   const review = await Review.findOne({ _id: reviewId, reviewer: userId, status: { $ne: 'deleted' } });
//   if (!review) throw new AppError('Review not found', 404);
//   if (body.comment !== undefined) review.comment = body.comment;
//   if (body.ratingValue !== undefined) review.ratingValue = body.ratingValue;
//   await review.save();
//   await AuditLog.create({ user: userId, role: 'buyer', action: 'REVIEW_UPDATED', entity: 'Review', entityId: review._id, metadata: { productId: review.product } });
//   return Review.findById(review._id).populate(populateReview);
// };

// const deleteOwnReview = async ({ userId, reviewId, role = 'buyer' }) => {
//   const review = await Review.findOneAndUpdate({ _id: reviewId, reviewer: userId, status: { $ne: 'deleted' } }, { status: 'deleted', deletedAt: new Date(), deletedBy: userId, deletedByModel: role === 'vendor' ? 'Vendor' : 'Buyer' }, { new: true });
//   if (!review) throw new AppError('Review not found', 404);
//   await AuditLog.create({ user: userId, role, action: 'REVIEW_DELETED', entity: 'Review', entityId: review._id, metadata: { productId: review.product } });
//   return review;
// };

// const listReviews = (query = {}, base = {}) => {
//   const filter = { ...base };
//   if (query.status) filter.status = query.status;
//   else filter.status = { $ne: 'deleted' };
//   if (query.rating) filter.ratingValue = Number(query.rating);
//   addDateRange(filter, query);
//   addSearch(filter, query.search, ['comment']);
//   return paginated({ model: Review, filter, query, sortFields: ['createdAt', 'updatedAt', 'ratingValue', 'status'], populate: populateReview });
// };

// const moderateReview = async ({ founderId, reviewId, action, reason }) => {
//   const updates = {};
//   let auditAction = '';
//   if (action === 'hide') {
//     Object.assign(updates, { status: 'hidden', hiddenAt: new Date(), hiddenBy: founderId });
//     auditAction = 'REVIEW_HIDDEN';
//   } else if (action === 'restore') {
//     Object.assign(updates, { status: 'active', restoredAt: new Date(), restoredBy: founderId });
//     auditAction = 'REVIEW_RESTORED';
//   } else if (action === 'delete') {
//     Object.assign(updates, { status: 'deleted', deletedAt: new Date(), deletedBy: founderId, deletedByModel: 'Founder' });
//     auditAction = 'REVIEW_SOFT_DELETED';
//   } else {
//     throw new AppError('Invalid review moderation action', 400);
//   }
//   const review = await Review.findByIdAndUpdate(reviewId, updates, { new: true }).populate(populateReview);
//   if (!review) throw new AppError('Review not found', 404);
//   await AuditLog.create({ user: founderId, role: 'founder', action: auditAction, entity: 'Review', entityId: review._id, metadata: { reason } });
//   return review;
// };

// module.exports = { createReview, updateOwnReview, deleteOwnReview, listReviews, moderateReview };

const { syncProductReviewSummary } = require('../common/productFeedbackSync.service');
const Review = require('../../models/review.model');
const ProductRating = require('../../models/productRating.model');
const Product = require('../../models/addproduct.model');
const Order = require('../../models/buyerOrder.model');
const AuditLog = require('../../models/auditLog.model');
const AppError = require('../common/AppError');
const { addDateRange, addSearch, paginated } = require('../common/query.service');

const populateReview = [
  { path: 'reviewer', select: 'fullName username email profilePhoto serialNumber storeName' },
  { path: 'vendor', select: 'fullName storeName email serialNumber' },
  { path: 'product', select: 'name image price ratingSummary' },
  { path: 'rating', select: 'rating comment status' },
  { path: 'order', select: 'status payment.status createdAt' },
];

const verifyPurchase = ({ buyerId, productId, orderId }) => {
  const filter = { buyer: buyerId, status: 'delivered', 'items.productId': productId };
  if (orderId) filter._id = orderId;
  return Order.findOne(filter).select('_id vendor status');
};

const createReview = async ({ buyerId, body }) => {
  const { productId, orderId, ratingId, comment } = body;
  if (!productId || !comment) throw new AppError('Product ID and comment are required', 400);
  const product = await Product.findById(productId).select('vendor name');
  if (!product) throw new AppError('Product not found', 404);
  const order = await verifyPurchase({ buyerId, productId, orderId });
  if (!order) throw new AppError('Only buyers who received this product can review it', 403);
  const existing = await Review.findOne({ reviewer: buyerId, product: productId, status: { $ne: 'deleted' } });
  if (existing) throw new AppError('You have already reviewed this product. Update your review instead', 409);
  const rating = ratingId ? await ProductRating.findOne({ _id: ratingId, buyer: buyerId, product: productId }) : await ProductRating.findOne({ buyer: buyerId, product: productId, status: 'active' });
  const review = await Review.create({
    reviewer: buyerId,
    reviewerModel: 'Buyer',
    reviewerRole: 'buyer',
    vendor: product.vendor,
    product: productId,
    order: order._id,
    rating: rating?._id || null,
    ratingValue: rating?.rating || body.ratingValue || null,
    comment,
  });
  await syncProductReviewSummary(productId);
  await AuditLog.create({ user: buyerId, role: 'buyer', action: 'REVIEW_CREATED', entity: 'Review', entityId: review._id, metadata: { productId, vendorId: product.vendor } });
  return Review.findById(review._id).populate(populateReview);
};

const updateOwnReview = async ({ userId, reviewId, body }) => {
  const review = await Review.findOne({ _id: reviewId, reviewer: userId, status: { $ne: 'deleted' } });
  if (!review) throw new AppError('Review not found', 404);
  if (body.comment !== undefined) review.comment = body.comment;
  if (body.ratingValue !== undefined) review.ratingValue = body.ratingValue;
  await review.save();
  await syncProductReviewSummary(review.product);
  await AuditLog.create({ user: userId, role: 'buyer', action: 'REVIEW_UPDATED', entity: 'Review', entityId: review._id, metadata: { productId: review.product } });
  return Review.findById(review._id).populate(populateReview);
};

const deleteOwnReview = async ({ userId, reviewId, role = 'buyer' }) => {
  const review = await Review.findOneAndUpdate({ _id: reviewId, reviewer: userId, status: { $ne: 'deleted' } }, { status: 'deleted', deletedAt: new Date(), deletedBy: userId, deletedByModel: role === 'vendor' ? 'Vendor' : 'Buyer' }, { new: true });
  if (!review) throw new AppError('Review not found', 404);
  await syncProductReviewSummary(review.product);
  await AuditLog.create({ user: userId, role, action: 'REVIEW_DELETED', entity: 'Review', entityId: review._id, metadata: { productId: review.product } });
  return review;
};

const listReviews = (query = {}, base = {}) => {
  const filter = { ...base };
  if (query.status) filter.status = query.status;
  else filter.status = { $ne: 'deleted' };
  if (query.rating) filter.ratingValue = Number(query.rating);
  addDateRange(filter, query);
  addSearch(filter, query.search, ['comment']);
  return paginated({ model: Review, filter, query, sortFields: ['createdAt', 'updatedAt', 'ratingValue', 'status'], populate: populateReview });
};

const moderateReview = async ({ founderId, reviewId, action, reason }) => {
  const updates = {};
  let auditAction = '';
  if (action === 'hide') {
    Object.assign(updates, { status: 'hidden', hiddenAt: new Date(), hiddenBy: founderId });
    auditAction = 'REVIEW_HIDDEN';
  } else if (action === 'restore') {
    Object.assign(updates, { status: 'active', restoredAt: new Date(), restoredBy: founderId });
    auditAction = 'REVIEW_RESTORED';
  } else if (action === 'delete') {
    Object.assign(updates, { status: 'deleted', deletedAt: new Date(), deletedBy: founderId, deletedByModel: 'Founder' });
    auditAction = 'REVIEW_SOFT_DELETED';
  } else {
    throw new AppError('Invalid review moderation action', 400);
  }
  const review = await Review.findByIdAndUpdate(reviewId, updates, { new: true }).populate(populateReview);
  if (!review) throw new AppError('Review not found', 404);
  await syncProductReviewSummary(review.product);
  await AuditLog.create({ user: founderId, role: 'founder', action: auditAction, entity: 'Review', entityId: review._id, metadata: { reason } });
  return review;
};

module.exports = { createReview, updateOwnReview, deleteOwnReview, listReviews, moderateReview };