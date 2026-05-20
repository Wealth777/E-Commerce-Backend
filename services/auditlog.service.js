const AuditLog = require('../models/auditLog.model');

const getUserActivities = async ({ userId, limit = 3 }) => {
  return AuditLog.find({ user: userId }).sort({ createdAt: -1 }).limit(limit);
};

module.exports = { getUserActivities };
