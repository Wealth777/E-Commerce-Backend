const {
  Buyer,
  Vendor,
  Order,
  AuditLog,
  AppError,
  safeUserProjection,
  parsePagination,
  buildPersonQuery,
  buildVendorQuery,
  paginate,
  logAction,
  notificationSummary,
  findUserById,
  getEngagementForUser,
} = require('./shared.service');

const getUsers = async (query) => {
  const buyerFilter = buildPersonQuery(query, 'buyer');
  const vendorFilter = buildVendorQuery(query);
  const role = query.role;

  if (role === 'buyer') return paginate({ model: Buyer, filter: buyerFilter, query });
  if (role === 'vendor') return paginate({ model: Vendor, filter: vendorFilter, query });

  const [buyers, vendors] = await Promise.all([
    Buyer.find(buyerFilter).setOptions({ withDeleted: true }).select(safeUserProjection).lean(),
    Vendor.find(vendorFilter).setOptions({ withDeleted: true }).select(safeUserProjection).lean(),
  ]);

  const users = [...buyers, ...vendors].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const { page, limit, skip } = parsePagination(query);

  return {
    pagination: { currentPage: page, pageSize: limit, totalItems: users.length, totalPages: Math.ceil(users.length / limit) },
    count: users.slice(skip, skip + limit).length,
    items: users.slice(skip, skip + limit),
  };
};

const getUserDetails = async (id) => {
  const user = await findUserById(id);
  const role = user.role || (user.storeName ? 'vendor' : 'buyer');
  const modelName = role === 'vendor' ? 'Vendor' : role === 'founder' ? 'Founder' : 'Buyer';

  const [orders, activityHistory, notifications, engagement] = await Promise.all([
    role === 'buyer' ? Order.find({ buyer: id }).sort({ createdAt: -1 }).limit(20).lean() : Order.find({ vendor: id }).sort({ createdAt: -1 }).limit(20).lean(),
    AuditLog.find({ $or: [{ targetUser: id }, { actor: id }, { user: id }] }).sort({ createdAt: -1 }).limit(20).lean(),
    notificationSummary({ recipient: id, recipientModel: modelName }),
    getEngagementForUser({ id, role }),
  ]);

  return { profile: user, role, orders, reviews: engagement.reviews, reports: engagement.reports, ratings: engagement.ratings, loginHistory: engagement.loginHistory, activityHistory, notificationsSummary: notifications };
};

const changeUserActiveState = async ({ id, active, actor, reason, action }) => {
  const user = await findUserById(id);
  if (user.role === 'founder') throw new AppError('Founder accounts cannot be changed from this API', 403);

  const Model = user.role === 'vendor' ? Vendor : Buyer;
  const updated = await Model.findByIdAndUpdate(id, { $set: { isActive: active } }, { new: true }).setOptions({ withDeleted: true }).select(safeUserProjection);

  await logAction({ actor, action, entity: user.role, entityId: id, targetUser: id, reason, metadata: { isActive: active } });
  return updated;
};

const softDeleteUser = async ({ id, actor, reason }) => {
  const user = await findUserById(id);
  if (user.role === 'founder') throw new AppError('Founder accounts cannot be deleted from this API', 403);

  const Model = user.role === 'vendor' ? Vendor : Buyer;
  const updated = await Model.findByIdAndUpdate(id, {
    $set: {
      deleted: true,
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: actor._id,
      deletedByModel: 'Founder',
      deleteReason: reason || null,
      isActive: false,
    },
  }, { new: true }).setOptions({ withDeleted: true }).select(safeUserProjection);

  await logAction({ actor, action: 'SOFT_DELETE_USER', entity: user.role, entityId: id, targetUser: id, reason });
  return updated;
};

module.exports = {
  getUsers,
  getUserDetails,
  changeUserActiveState,
  softDeleteUser,
};
