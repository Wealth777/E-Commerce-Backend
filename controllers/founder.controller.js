const logger = require('../logger');
const founderAuthService = require('../services/founder/auth.service');
const { sendSuccess, sendError } = require('../utils/responseStruture');

const handleError = (res, error, fallbackMessage) => {
  logger.error(error);
  return sendError(res, error.statusCode || 500, error.statusCode ? error.message : fallbackMessage, error.errors || null);
};

exports.createUser = async (req, res) => {
  try {
    await founderAuthService.createUser(req.body);
    return sendSuccess(res, 201, '🎉 User Account Created Successfully!.');
  } catch (error) {
    return handleError(res, error, 'Internal Server Error');
  }
};

exports.loginUser = async (req, res) => {
  try {
    const result = await founderAuthService.loginUser(req.body);
    return sendSuccess(res, 200, '🎉 User Login Successfully!.', result);
  } catch (error) {
    return handleError(res, error, 'Internal Server Error');
  }
};

exports.getUsersDetails = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    const profile = await founderAuthService.getUsersDetails({ userId });
    return sendSuccess(res, 200, 'Founder profile fetched successfully', profile);
  } catch (error) {
    return handleError(res, error, 'Internal Server Error');
  }
};
