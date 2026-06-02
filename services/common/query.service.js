const mongoose = require('mongoose');

const toObjectId = (id) => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null);

const parsePagination = ({ page = 1, limit = 20 }) => {
  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(Math.max(1, Number(limit) || 20), 100);
  return { page: currentPage, limit: pageSize, skip: (currentPage - 1) * pageSize };
};

const buildSort = ({ sortBy = 'createdAt', sortOrder = 'desc' }) => ({ [sortBy]: sortOrder === 'asc' ? 1 : -1 });

const applyDateRange = (filter, query) => {
  if (query.dateFrom || query.dateTo || query.from || query.to) {
    filter.createdAt = {};
    if (query.dateFrom || query.from) filter.createdAt.$gte = new Date(query.dateFrom || query.from);
    if (query.dateTo || query.to) filter.createdAt.$lte = new Date(query.dateTo || query.to);
  }
  return filter;
};

const paginate = async ({ model, filter = {}, query = {}, select = '-__v', populate = [] }) => {
  const { page, limit, skip } = parsePagination(query);
  const sort = buildSort(query);
  let findQuery = model.find(filter).setOptions({ withDeleted: true }).select(select).sort(sort).skip(skip).limit(limit);
  populate.forEach((item) => { findQuery = findQuery.populate(item); });
  const [items, totalItems] = await Promise.all([
    findQuery.lean(),
    model.countDocuments(filter).setOptions({ withDeleted: true }),
  ]);
  return { pagination: { currentPage: page, pageSize: limit, totalItems, totalPages: Math.ceil(totalItems / limit) }, count: items.length, items };
};

module.exports = { toObjectId, parsePagination, buildSort, applyDateRange, paginate };
