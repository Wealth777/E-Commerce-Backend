const buyerService = require('../../services/founder/buyer.service');
const usersService = require('../../services/founder/users.service');
const { sendSuccess } = require('../../utils/responseStruture');
const { actorFromReq, handleError } = require('./common.controller');

exports.getBuyers = async (req, res) => {
  try {
    const data = await buyerService.getBuyers(req.query);
    return sendSuccess(res, 200, 'Buyers fetched successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to fetch buyers');
  }
};

exports.getBuyerDetails = async (req, res) => {
  try {
    const data = await buyerService.getBuyerDetails(req.params.buyerId);
    return sendSuccess(res, 200, 'Buyer details fetched successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to fetch buyer details');
  }
};

exports.banBuyer = async (req, res) => {
  try {
    const data = await usersService.changeUserActiveState({
      id: req.params.buyerId,
      active: false,
      actor: actorFromReq(req),
      reason: req.body.reason || 'Buyer banned',
      action: 'BAN_BUYER',
    });
    return sendSuccess(res, 200, 'Buyer banned successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to ban buyer');
  }
};

exports.unbanBuyer = async (req, res) => {
  try {
    const data = await usersService.changeUserActiveState({
      id: req.params.buyerId,
      active: true,
      actor: actorFromReq(req),
      reason: req.body.reason,
      action: 'UNBAN_BUYER',
    });
    return sendSuccess(res, 200, 'Buyer unbanned successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to unban buyer');
  }
};
