const {
  Buyer,
  Order,
  AuditLog,
  AppError,
  safeUserProjection,
  buildPersonQuery,
  paginate,
  getEngagementForUser,
} = require('./shared.service');

const getBuyers = async (query) => paginate({ model: Buyer, filter: buildPersonQuery(query, 'buyer'), query });

const getBuyerDetails = async (id) => {
  const buyer = await Buyer.findById(id).setOptions({ withDeleted: true }).select(safeUserProjection).lean();
  if (!buyer) throw new AppError('Buyer not found', 404);

  const [orders, activityHistory, engagement] = await Promise.all([
    Order.find({ buyer: id }).sort({ createdAt: -1 }).limit(20).lean(),
    AuditLog.find({ $or: [{ targetUser: id }, { actor: id }, { user: id }] }).sort({ createdAt: -1 }).limit(20).lean(),
    getEngagementForUser({ id, role: 'buyer' }),
  ]);

  return {
    buyer,
    activityHistory: {
      orders,
      reviews: engagement.reviews,
      reports: engagement.reports,
      ratings: engagement.ratings,
      loginHistory: engagement.loginHistory,
      accountActions: activityHistory,
    },
  };
};

module.exports = {
  getBuyers,
  getBuyerDetails,
};
