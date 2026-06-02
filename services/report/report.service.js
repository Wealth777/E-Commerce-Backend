const Report = require('../../models/report.model');
const Buyer = require('../../models/buyer.model');
const Vendor = require('../../models/vendor.model');
const Product = require('../../models/addproduct.model');
const Review = require('../../models/review.model');
const Order = require('../../models/buyerOrder.model');
const AuditLog = require('../../models/auditLog.model');
const AppError = require('../common/AppError');
const { addDateRange, addSearch, paginated } = require('../common/query.service');
const { getRefByRole } = require('../common/authz.service');

const populateReport = [
  { path: 'reporter', select: 'fullName username email profilePhoto serialNumber storeName firstName lastName' },
  { path: 'reportedUser', select: 'fullName username email profilePhoto serialNumber storeName firstName lastName isActive' },
  { path: 'resolvedBy', select: 'firstName lastName email serialNumber' },
  { path: 'assignedTo', select: 'firstName lastName email serialNumber' },
];

const getTarget = async (targetType, targetId) => {
  if (targetType === 'buyer') return { doc: await Buyer.findById(targetId), model: 'Buyer', role: 'buyer' };
  if (targetType === 'vendor') return { doc: await Vendor.findById(targetId), model: 'Vendor', role: 'vendor' };
  if (targetType === 'user') return { doc: (await Buyer.findById(targetId)) || (await Vendor.findById(targetId)), model: null, role: null };
  if (targetType === 'product') return { doc: await Product.findById(targetId).populate('vendor', 'role'), model: 'AddProduct', role: null };
  if (targetType === 'review') return { doc: await Review.findById(targetId), model: 'Review', role: null };
  if (targetType === 'order') return { doc: await Order.findById(targetId), model: 'Order', role: null };
  return { doc: null };
};

const createReport = async ({ userId, role, body }) => {
  const { targetType, targetId, reason, description, priority, evidenceAttachments } = body;
  if (!targetType || !targetId || !reason) throw new AppError('Target type, target ID, and reason are required', 400);
  const target = await getTarget(targetType, targetId);
  if (!target.doc) throw new AppError('Report target not found', 404);

  let reportedUser = body.reportedUserId || null;
  let reportedRole = body.reportedRole || null;
  let reportedUserModel = null;

  if (targetType === 'buyer' || targetType === 'vendor') {
    reportedUser = target.doc._id;
    reportedRole = targetType;
    reportedUserModel = targetType === 'buyer' ? 'Buyer' : 'Vendor';
  } else if (targetType === 'product' && target.doc.vendor) {
    reportedUser = target.doc.vendor._id || target.doc.vendor;
    reportedRole = 'vendor';
    reportedUserModel = 'Vendor';
  } else if (targetType === 'review') {
    reportedUser = target.doc.reviewer;
    reportedRole = target.doc.reviewerRole;
    reportedUserModel = target.doc.reviewerModel;
  } else if (targetType === 'order') {
    reportedUser = target.doc.vendor || target.doc.buyer;
    reportedRole = target.doc.vendor ? 'vendor' : 'buyer';
    reportedUserModel = target.doc.vendor ? 'Vendor' : 'Buyer';
  }

  const duplicate = await Report.findOne({ reporter: userId, targetType, target: targetId, status: { $in: ['pending', 'under_review'] } });
  if (duplicate) throw new AppError('You already have an open report for this target', 409);

  const report = await Report.create({
    reporter: userId,
    reporterModel: getRefByRole(role),
    reporterRole: role,
    reportedUser,
    reportedUserModel,
    reportedRole,
    targetType,
    target: targetId,
    reason,
    description,
    priority: priority || 'medium',
    evidenceAttachments: evidenceAttachments || [],
  });

  await AuditLog.create({ user: userId, role, action: 'REPORT_CREATED', entity: 'Report', entityId: report._id, metadata: { targetType, targetId, reason } });
  return Report.findById(report._id).populate(populateReport);
};

const listReports = (query = {}, base = {}) => {
  const filter = { deletedAt: null, ...base };
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.targetType || query.reportType) filter.targetType = query.targetType || query.reportType;
  if (query.reportedRole) filter.reportedRole = query.reportedRole;
  addDateRange(filter, query);
  addSearch(filter, query.search, ['reason', 'description', 'status', 'priority', 'targetType']);
  return paginated({ model: Report, filter, query, sortFields: ['createdAt', 'updatedAt', 'status', 'priority'], populate: populateReport });
};

const getReportDetails = async (reportId) => {
  const report = await Report.findById(reportId).populate(populateReport);
  if (!report) throw new AppError('Report not found', 404);
  return report;
};

const updateReportStatus = async ({ founderId, reportId, body }) => {
  const { status, priority, assignedTo, resolutionNote } = body;
  const updates = {};
  if (status) updates.status = status;
  if (priority) updates.priority = priority;
  if (assignedTo) updates.assignedTo = assignedTo;
  if (['resolved', 'rejected'].includes(status)) {
    updates.resolvedAt = new Date();
    updates.resolvedBy = founderId;
    updates.resolutionNote = resolutionNote;
  } else if (resolutionNote) updates.resolutionNote = resolutionNote;
  const report = await Report.findByIdAndUpdate(reportId, updates, { new: true }).populate(populateReport);
  if (!report) throw new AppError('Report not found', 404);
  await AuditLog.create({ user: founderId, role: 'founder', action: status === 'resolved' ? 'REPORT_RESOLVED' : 'REPORT_STATUS_UPDATED', entity: 'Report', entityId: report._id, metadata: { status, priority, assignedTo } });
  return report;
};

module.exports = { createReport, listReports, getReportDetails, updateReportStatus };
