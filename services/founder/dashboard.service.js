const {
  Buyer,
  Vendor,
  Product,
  Order,
  AuditLog,
  completedOrderQuery,
  orderStats,
  notificationSummary,
  LoginHistory,
  ProductRating,
  Review,
  Report,
} = require('./shared.service');

const getDashboardOverview = async () => {
  const [
    totalBuyers,
    totalVendors,
    totalProducts,
    totalOrders,
    revenue,
    pendingApprovals,
    recentAuditActivities,
    recentLoginActivities,
    recentRatingActivities,
    recentReviewActivities,
    recentReportActivities,
    notifications,
    monthlyOrders,
  ] = await Promise.all([
    Buyer.countDocuments({ deleted: { $ne: true } }).setOptions({ withDeleted: true }),
    Vendor.countDocuments({ deleted: { $ne: true } }).setOptions({ withDeleted: true }),
    Product.countDocuments({ deleted: { $ne: true } }).setOptions({ withDeleted: true }),
    Order.countDocuments({}),
    orderStats(completedOrderQuery),
    Vendor.countDocuments({ verificationStatus: 'pending', deleted: { $ne: true } }).setOptions({ withDeleted: true }),
    AuditLog.find({}).sort({ createdAt: -1 }).limit(10).lean(),
    LoginHistory.find({}).sort({ createdAt: -1 }).limit(5).lean(),
    ProductRating.find({ deleted: { $ne: true } }).sort({ createdAt: -1 }).limit(5).lean(),
    Review.find({ deleted: { $ne: true } }).sort({ createdAt: -1 }).limit(5).lean(),
    Report.find({ deleted: { $ne: true } }).sort({ createdAt: -1 }).limit(5).lean(),
    notificationSummary(),
    Order.aggregate([
      { $match: completedOrderQuery },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, orders: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$pricing.total', 0] } } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]),
  ]);

  return {
    totals: {
      totalUsers: totalBuyers + totalVendors,
      totalBuyers,
      totalVendors,
      totalProducts,
      totalOrders,
      pendingApprovals,
    },
    revenue: {
      totalRevenue: revenue.grossRevenue,
      grossRevenue: revenue.grossRevenue,
      platformCommission: revenue.platformCommission,
      completedOrdersCount: revenue.totalOrders,
    },
    analyticsCards: [
      { key: 'users', label: 'Total Users', value: totalBuyers + totalVendors },
      { key: 'vendors', label: 'Total Vendors', value: totalVendors },
      { key: 'products', label: 'Total Products', value: totalProducts },
      { key: 'grossRevenue', label: 'Gross Revenue', value: revenue.grossRevenue },
    ],
    statistics: { monthlyOrders },
    recentActivities: [
      ...recentAuditActivities.map((item) => ({ type: 'audit', ...item })),
      ...recentLoginActivities.map((item) => ({ type: 'login', ...item })),
      ...recentRatingActivities.map((item) => ({ type: 'rating', ...item })),
      ...recentReviewActivities.map((item) => ({ type: 'review', ...item })),
      ...recentReportActivities.map((item) => ({ type: 'report', ...item })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20),
    notifications,
  };
};

module.exports = {
  getDashboardOverview,
};
