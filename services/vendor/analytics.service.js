const AddProduct = require('../../models/addproduct.model');
const BuyerOrder = require('../../models/buyerOrder.model');
const { getDateRange } = require('../../utils/feedAlgorithm');

const getVendorAnalytics = async ({ vendorId, range = '7days' }) => {
  const startDate = getDateRange(range);

  const orders = await BuyerOrder.find({
    vendor: vendorId,
    createdAt: { $gte: startDate },
    'payment.status': 'paid',
  }).populate('buyer', 'username email').sort({ createdAt: -1 });

  const totalSales = orders.reduce((sum, order) => sum + (order.pricing?.total || 0), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

  const salesOverviewMap = {};
  orders.forEach((order) => {
    const date = order.createdAt.toISOString().split('T')[0];
    salesOverviewMap[date] = (salesOverviewMap[date] || 0) + (order.pricing?.total || 0);
  });

  const topProducts = await AddProduct.find({ vendor: vendorId })
    .sort({ sold: -1 })
    .limit(5)
    .select('name image price sold stock');

  return {
    summary: { totalSales, totalOrders, avgOrderValue },
    salesOverview: Object.keys(salesOverviewMap).map((date) => ({ date, sales: salesOverviewMap[date] })),
    recentOrders: orders.slice(0, 5),
    topProducts,
  };
};

module.exports = { getVendorAnalytics };
