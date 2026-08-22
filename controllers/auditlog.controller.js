const logger = require('../logger');
const auditLogService = require('../services/auditlog.service');
const { sendSuccess, sendError } = require('../utils/responseStruture');

exports.getUsersActivities = async (req, res) => {
  try {
    const logs = await auditLogService.getUserActivities({ userId: req.user._id });
    return sendSuccess(res, 200, 'Activities fetched successfully', logs || []);
  } catch (error) {
    logger.error(error);
    return sendError(res, 500, 'Failed to fetch activities');
  }
};