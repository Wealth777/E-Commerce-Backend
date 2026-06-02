const usersService = require('../../services/founder/users.service');
const { sendSuccess } = require('../../utils/responseStruture');
const { actorFromReq, handleError } = require('./common.controller');

exports.getUsers = async (req, res) => {
  try {
    const data = await usersService.getUsers(req.query);
    return sendSuccess(res, 200, 'Users fetched successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to fetch users');
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const data = await usersService.getUserDetails(req.params.userId);
    return sendSuccess(res, 200, 'User details fetched successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to fetch user details');
  }
};

exports.suspendUser = async (req, res) => {
  try {
    const data = await usersService.changeUserActiveState({
      id: req.params.userId,
      active: false,
      actor: actorFromReq(req),
      reason: req.body.reason,
      action: 'SUSPEND_USER',
    });
    return sendSuccess(res, 200, 'User suspended successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to suspend user');
  }
};

exports.activateUser = async (req, res) => {
  try {
    const data = await usersService.changeUserActiveState({
      id: req.params.userId,
      active: true,
      actor: actorFromReq(req),
      reason: req.body.reason,
      action: 'ACTIVATE_USER',
    });
    return sendSuccess(res, 200, 'User activated successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to activate user');
  }
};

exports.softDeleteUser = async (req, res) => {
  try {
    const data = await usersService.softDeleteUser({
      id: req.params.userId,
      actor: actorFromReq(req),
      reason: req.body.reason,
    });
    return sendSuccess(res, 200, 'User soft deleted successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to delete user');
  }
};
