const dashboardService = require('../../services/founder/dashboard.service');
const { sendSuccess } = require('../../utils/responseStruture');
const { handleError } = require('./common.controller');

exports.getDashboardOverview = async (req, res) => {
  try {
    const data = await dashboardService.getDashboardOverview();
    return sendSuccess(res, 200, 'Founder dashboard overview fetched successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to fetch dashboard overview');
  }
};
