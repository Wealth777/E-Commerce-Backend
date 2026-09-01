const AuditLog = require('../models/auditLog.model');

const getUserActivities = async ({ userId, limit = 20 }) => {
  return AuditLog.find({ user: userId }).sort({ createdAt: -1 }).limit(limit);
};

module.exports = { getUserActivities };