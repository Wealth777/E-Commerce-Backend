const mongoose = require('mongoose');
const Buyer = require('../../models/buyer.model');
const Vendor = require('../../models/vendor.model');
const Founder = require('../../models/founder.model');
const Product = require('../../models/addproduct.model');
const Order = require('../../models/buyerOrder.model');
const AuditLog = require('../../models/auditLog.model');
const Notification = require('../../models/notification.model');
const LoginHistory = require('../../models/loginHistory.model');
const ProductRating = require('../../models/productRating.model');
const Review = require('../../models/review.model');
const Report = require('../../models/report.model');
const AppError = require('../common/AppError');

const safeUserProjection = '-password -__v -bankDetails.accountNumber';
const completedOrderQuery = { status: 'delivered' };

const toBool = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  return value === true || value === 'true';
};

const parsePagination = ({ page = 1, limit = 20 }) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
};

const dateFilter = ({ from, to }) => {
  if (!from && !to) return undefined;
  const createdAt = {};
  if (from) createdAt.$gte = new Date(from);
  if (to) createdAt.$lte = new Date(to);
  return createdAt;
};

const buildSort = ({ sortBy = 'createdAt', sortOrder = 'desc' }) => ({
  [sortBy]: sortOrder === 'asc' ? 1 : -1,
});

const deletedFilter = (query) => {
  const deleted = toBool(query.deleted);
  if (deleted === undefined) return { deleted: { $ne: true } };
  return { deleted };
};

const buildPersonQuery = (query, role) => {
  const filter = { ...deletedFilter(query) };
  if (role) filter.role = role;

  const isActive = toBool(query.isActive);
  if (isActive !== undefined) filter.isActive = isActive;

  if (query.country) filter.country = new RegExp(query.country, 'i');
  if (query.state) filter.state = new RegExp(query.state, 'i');

  const createdAt = dateFilter(query);
  if (createdAt) filter.createdAt = createdAt;

  if (query.search) {
    const regex = new RegExp(query.search, 'i');
    filter.$or = [
      { fullName: regex },
      { username: regex },
      { email: regex },
      { phoneNo: regex },
      { serialNumber: regex },
      { country: regex },
      { state: regex },
      { role: regex },
    ];
  }

  return filter;
};

const buildVendorQuery = (query) => {
  const filter = buildPersonQuery(query, 'vendor');
  const isVerified = toBool(query.isVerified);
  if (isVerified !== undefined) filter.isVerified = isVerified;

  if (query.verificationStatus === 'pending') {
    filter.$and = [
      ...(filter.$and || []),
      { $or: [{ verificationStatus: 'pending' }, { verificationStatus: { $exists: false }, isVerified: false }] },
    ];
  } else if (query.verificationStatus === 'approved') {
    filter.$and = [
      ...(filter.$and || []),
      { $or: [{ verificationStatus: 'approved' }, { isVerified: true }] },
    ];
  } else if (query.verificationStatus === 'rejected') {
    filter.verificationStatus = 'rejected';
  }

  if (query.search) {
    const regex = new RegExp(query.search, 'i');
    filter.$or = [
      { fullName: regex },
      { username: regex },
      { email: regex },
      { phoneNo: regex },
      { serialNumber: regex },
      { country: regex },
      { state: regex },
      { storeName: regex },
      { storeDescription: regex },
      { verificationStatus: regex },
    ];
  }

  return filter;
};

const paginate = async ({ model, filter, query, select = safeUserProjection, populate = [] }) => {
  const { page, limit, skip } = parsePagination(query);
  const sort = buildSort(query);

  let findQuery = model.find(filter).setOptions({ withDeleted: true }).select(select).sort(sort).skip(skip).limit(limit);
  populate.forEach((item) => { findQuery = findQuery.populate(item); });

  const [items, totalItems] = await Promise.all([
    findQuery.lean(),
    model.countDocuments(filter).setOptions({ withDeleted: true }),
  ]);

  return {
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
    count: items.length,
    items,
  };
};

const logAction = async ({ actor, action, entity, entityId, targetUser, reason, metadata = {} }) => {
  return AuditLog.create({
    actor: actor._id,
    actorModel: actor.model || 'Founder',
    actorRole: actor.role || 'founder',
    user: actor._id,
    role: actor.role || 'founder',
    targetUser,
    action,
    entity,
    entityId,
    reason,
    metadata,
  });
};

const productCountByVendor = async (vendorIds) => {
  const rows = await Product.aggregate([
    { $match: { vendor: { $in: vendorIds }, deleted: { $ne: true } } },
    { $group: { _id: '$vendor', totalProducts: { $sum: 1 }, activeProducts: { $sum: { $cond: [{ $ne: ['$status', 'out-of-stock'] }, 1, 0] } } } },
  ]);

  return rows.reduce((acc, row) => {
    acc[row._id.toString()] = row;
    return acc;
  }, {});
};

const orderStats = async (match = {}) => {
  const rows = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        grossRevenue: { $sum: { $ifNull: ['$pricing.total', 0] } },
      },
    },
  ]);

  const stat = rows[0] || { totalOrders: 0, grossRevenue: 0 };
  // Commission percentage is not stored in the current order/payment schema, so platform commission stays 0 until a commission field exists.
  return { ...stat, platformCommission: 0 };
};

const notificationSummary = async (owner = {}) => {
  const baseFilter = { deletedInAppAt: null };
  if (owner.recipient) {
    baseFilter.recipient = owner.recipient;
    if (owner.recipientModel) baseFilter.recipientModel = owner.recipientModel;
  }

  const [totalNotifications, unreadNotifications, recentNotifications, importantCounts] = await Promise.all([
    Notification.countDocuments(baseFilter),
    Notification.countDocuments({ ...baseFilter, 'channels.inApp.read': false }),
    Notification.find(baseFilter).sort({ createdAt: -1 }).limit(10).lean(),
    Notification.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return { totalNotifications, unreadNotifications, recentNotifications, importantCounts };
};


const getEngagementForUser = async ({ id, role }) => {
  const baseReport = { $or: [{ reporter: id }, { reportedUser: id }] };
  const [loginHistory, ratings, reviews, reports] = await Promise.all([
    LoginHistory.find({ user: id }).sort({ createdAt: -1 }).limit(20).lean(),
    role === 'vendor'
      ? ProductRating.find({ vendor: id, deleted: { $ne: true } }).sort({ createdAt: -1 }).limit(20).populate('product', 'name image price').populate('buyer', 'fullName username').lean()
      : ProductRating.find({ buyer: id, deleted: { $ne: true } }).sort({ createdAt: -1 }).limit(20).populate('product', 'name image price').populate('vendor', 'fullName storeName').lean(),
    role === 'vendor'
      ? Review.find({ vendor: id, deleted: { $ne: true } }).sort({ createdAt: -1 }).limit(20).populate('product', 'name image price').populate('reviewer', 'fullName username').lean()
      : Review.find({ reviewer: id, deleted: { $ne: true } }).sort({ createdAt: -1 }).limit(20).populate('product', 'name image price').populate('vendor', 'fullName storeName').lean(),
    Report.find(baseReport).sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  return { loginHistory, ratings, reviews, reports };
};

const findUserById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid user id', 400);

  const [buyer, vendor, founder] = await Promise.all([
    Buyer.findById(id).setOptions({ withDeleted: true }).select(safeUserProjection).lean(),
    Vendor.findById(id).setOptions({ withDeleted: true }).select(safeUserProjection).lean(),
    Founder.findById(id).select('-password -__v').lean(),
  ]);

  const user = buyer || vendor || founder;
  if (!user) throw new AppError('User not found', 404);
  return user;
};

module.exports = {
  Buyer,
  Vendor,
  Founder,
  Product,
  Order,
  AuditLog,
  Notification,
  LoginHistory,
  ProductRating,
  Review,
  Report,
  AppError,
  safeUserProjection,
  completedOrderQuery,
  parsePagination,
  buildPersonQuery,
  buildVendorQuery,
  paginate,
  logAction,
  productCountByVendor,
  orderStats,
  notificationSummary,
  findUserById,
  getEngagementForUser,
};
