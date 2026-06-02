const Report = require('../models/report.model');
const Buyer = require('../models/buyer.model');
const Vendor = require('../models/vendor.model');
const Product = require('../models/addproduct.model');
const Review = require('../models/review.model');
const Order = require('../models/buyerOrder.model');
const AuditLog = require('../models/auditLog.model');
const AppError = require('./common/AppError');
const { applyDateRange, paginate } = require('./common/query.service');

const modelInfo = (role) => ({ buyer: 'Buyer', vendor: 'Vendor', founder: 'Founder', admin: 'Founder' }[role] || 'Buyer');

const validateTarget = async ({ targetType, targetId }) => {
  if (targetType === 'buyer') return { doc: await Buyer.findById(targetId).lean(), model: 'Buyer', role: 'buyer' };
  if (targetType === 'vendor') return { doc: await Vendor.findById(targetId).lean(), model: 'Vendor', role: 'vendor' };
  if (targetType === 'user') {
    const buyer = await Buyer.findById(targetId).lean(); if (buyer) return { doc: buyer, model: 'Buyer', role: 'buyer' };
    const vendor = await Vendor.findById(targetId).lean(); if (vendor) return { doc: vendor, model: 'Vendor', role: 'vendor' };
  }
  if (targetType === 'product') { const doc = await Product.findById(targetId).lean(); return { doc, model: 'AddProduct', role: null, reportedUser: doc?.vendor, reportedUserModel: 'Vendor', reportedRole: 'vendor' }; }
  if (targetType === 'review') { const doc = await Review.findById(targetId).lean(); return { doc, model: 'Review', role: doc?.reviewerRole, reportedUser: doc?.reviewer, reportedUserModel: doc?.reviewerModel, reportedRole: doc?.reviewerRole }; }
  if (targetType === 'order') { const doc = await Order.findById(targetId).lean(); return { doc, model: 'Order', role: null, reportedUser: doc?.vendor, reportedUserModel: 'Vendor', reportedRole: 'vendor' }; }
  return { doc: null };
};

const createReport = async ({ user, body }) => {
  const target = await validateTarget({ targetType: body.targetType, targetId: body.targetId });
  if (!target.doc) throw new AppError('Report target not found', 404);
  const existing = await Report.findOne({ reporter: user._id, targetType: body.targetType, target: body.targetId, status: { $in: ['pending', 'under_review'] } });
  if (existing) throw new AppError('You already have an open report for this target', 409);
  const report = await Report.create({ reporter: user._id, reporterModel: modelInfo(user.role), reporterRole: user.role, reportedUser: target.reportedUser || target.doc._id, reportedUserModel: target.reportedUserModel || target.model, reportedRole: target.reportedRole || target.role, targetType: body.targetType, target: body.targetId, reason: body.reason, description: body.description, priority: body.priority || 'medium', evidenceAttachments: body.evidenceAttachments || [] });
  await AuditLog.create({ user: user._id, userModel: modelInfo(user.role), role: user.role, actor: user._id, actorModel: modelInfo(user.role), actorRole: user.role, action: 'REPORT_CREATED', entity: 'Report', entityId: report._id, metadata: { targetType: body.targetType, targetId: body.targetId } });
  return report;
};

const buildFilter = (query = {}) => {
  const filter = { deleted: { $ne: true } };
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.targetType || query.reportType) filter.targetType = query.targetType || query.reportType;
  if (query.reportedRole) filter.reportedRole = query.reportedRole;
  if (query.reporter) filter.reporter = query.reporter;
  if (query.reportedUser) filter.reportedUser = query.reportedUser;
  if (query.search) { const r = new RegExp(query.search, 'i'); filter.$or = [{ reason: r }, { description: r }, { status: r }, { priority: r }]; }
  applyDateRange(filter, query);
  return filter;
};

const listReports = (query) => paginate({ model: Report, filter: buildFilter(query), query, select: '-__v', populate: [{ path: 'reporter', select: 'fullName username email role storeName' }, { path: 'reportedUser', select: 'fullName username email role storeName' }, { path: 'resolvedBy', select: 'fullName email' }] });
const getMyReports = (user, query) => listReports({ ...query, reporter: user._id });
const getReportDetails = async (id) => { const report = await Report.findById(id).populate('reporter', 'fullName username email role storeName').populate('reportedUser', 'fullName username email role storeName').lean(); if (!report) throw new AppError('Report not found', 404); return report; };
const updateReportStatus = async ({ reportId, actor, body }) => {
  const report = await Report.findById(reportId); if (!report) throw new AppError('Report not found', 404);
  if (body.status) report.status = body.status; if (body.priority) report.priority = body.priority; if (body.assignedTo) report.assignedTo = body.assignedTo;
  if (body.resolutionNote !== undefined) report.resolutionNote = body.resolutionNote;
  if (['resolved', 'rejected'].includes(body.status)) { report.resolvedAt = new Date(); report.resolvedBy = actor._id; }
  await report.save();
  await AuditLog.create({ user: actor._id, userModel: 'Founder', role: 'founder', actor: actor._id, actorModel: 'Founder', actorRole: 'founder', action: body.status === 'resolved' ? 'REPORT_RESOLVED' : 'REPORT_STATUS_UPDATED', entity: 'Report', entityId: report._id, reason: body.resolutionNote, metadata: { status: report.status, priority: report.priority } });
  return report;
};

module.exports = { createReport, getMyReports, listReports, getReportDetails, updateReportStatus };
