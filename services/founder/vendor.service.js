const {
  Vendor,
  Product,
  Order,
  AuditLog,
  AppError,
  safeUserProjection,
  completedOrderQuery,
  buildVendorQuery,
  paginate,
  productCountByVendor,
  orderStats,
  logAction,
  getEngagementForUser,
} = require('./shared.service');

const getVendors = async (query) => {
  const result = await paginate({ model: Vendor, filter: buildVendorQuery(query), query });
  const ids = result.items.map((item) => item._id);
  const counts = await productCountByVendor(ids);

  result.items = result.items.map((vendor) => ({
    ...vendor,
    productSummary: counts[vendor._id.toString()] || { totalProducts: 0, activeProducts: 0 },
  }));

  return result;
};

const getVendorDetails = async (id) => {
  const vendor = await Vendor.findById(id).setOptions({ withDeleted: true }).select(safeUserProjection).lean();
  if (!vendor) throw new AppError('Vendor not found', 404);

  const [activeProducts, counts, orders, revenue, activityHistory, engagement] = await Promise.all([
    Product.find({ vendor: id, deleted: { $ne: true }, status: { $ne: 'out-of-stock' } }).limit(20).lean(),
    productCountByVendor([vendor._id]),
    Order.find({ vendor: id }).sort({ createdAt: -1 }).limit(20).lean(),
    orderStats({ ...completedOrderQuery, vendor: vendor._id }),
    AuditLog.find({ $or: [{ targetUser: id }, { actor: id }, { user: id }] }).sort({ createdAt: -1 }).limit(20).lean(),
    getEngagementForUser({ id, role: 'vendor' }),
  ]);

  return {
    vendor,
    productSummary: counts[vendor._id.toString()] || { totalProducts: 0, activeProducts: 0 },
    activeProducts,
    orders,
    revenue,
    reviews: engagement.reviews,
    reports: engagement.reports,
    productRatings: engagement.ratings,
    loginHistory: engagement.loginHistory,
    activityHistory,
  };
};

const approveVendor = async ({ id, actor, reason }) => {
  const updated = await Vendor.findByIdAndUpdate(id, {
    $set: { isVerified: true, verificationStatus: 'approved', verificationApprovedAt: new Date(), verificationApprovedBy: actor._id, verificationRejectionReason: null },
  }, { new: true }).setOptions({ withDeleted: true }).select(safeUserProjection);

  if (!updated) throw new AppError('Vendor not found', 404);
  await logAction({ actor, action: 'APPROVE_VENDOR', entity: 'vendor', entityId: id, targetUser: id, reason });
  return updated;
};

const rejectVendor = async ({ id, actor, reason }) => {
  const updated = await Vendor.findByIdAndUpdate(id, {
    $set: { isVerified: false, verificationStatus: 'rejected', verificationRejectedAt: new Date(), verificationRejectedBy: actor._id, verificationRejectionReason: reason },
  }, { new: true }).setOptions({ withDeleted: true }).select(safeUserProjection);

  if (!updated) throw new AppError('Vendor not found', 404);
  await logAction({ actor, action: 'REJECT_VENDOR', entity: 'vendor', entityId: id, targetUser: id, reason });
  return updated;
};

const getVendorActiveProducts = async (id, query) => {
  const vendor = await Vendor.exists({ _id: id });
  if (!vendor) throw new AppError('Vendor not found', 404);

  return paginate({
    model: Product,
    filter: { vendor: id, deleted: { $ne: true }, status: { $ne: 'out-of-stock' } },
    query,
    select: '-__v',
  });
};

module.exports = {
  getVendors,
  getVendorDetails,
  approveVendor,
  rejectVendor,
  getVendorActiveProducts,
};
