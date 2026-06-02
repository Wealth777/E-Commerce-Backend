const vendorService = require('../../services/founder/vendor.service');
const usersService = require('../../services/founder/users.service');
const { sendSuccess } = require('../../utils/responseStruture');
const { actorFromReq, handleError } = require('./common.controller');

exports.getVendors = async (req, res) => {
  try {
    const data = await vendorService.getVendors(req.query);
    return sendSuccess(res, 200, 'Vendors fetched successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to fetch vendors');
  }
};

exports.getPendingVendors = async (req, res) => {
  req.query.verificationStatus = 'pending';
  return exports.getVendors(req, res);
};

exports.getApprovedVendors = async (req, res) => {
  req.query.verificationStatus = 'approved';
  return exports.getVendors(req, res);
};

exports.getRejectedVendors = async (req, res) => {
  req.query.verificationStatus = 'rejected';
  return exports.getVendors(req, res);
};

exports.getVendorDetails = async (req, res) => {
  try {
    const data = await vendorService.getVendorDetails(req.params.vendorId);
    return sendSuccess(res, 200, 'Vendor details fetched successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to fetch vendor details');
  }
};

exports.approveVendor = async (req, res) => {
  try {
    const data = await vendorService.approveVendor({
      id: req.params.vendorId,
      actor: actorFromReq(req),
      reason: req.body.reason,
    });
    return sendSuccess(res, 200, 'Vendor approved successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to approve vendor');
  }
};

exports.rejectVendor = async (req, res) => {
  try {
    const data = await vendorService.rejectVendor({
      id: req.params.vendorId,
      actor: actorFromReq(req),
      reason: req.body.reason,
    });
    return sendSuccess(res, 200, 'Vendor rejected successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to reject vendor');
  }
};

exports.suspendVendor = async (req, res) => {
  try {
    const data = await usersService.changeUserActiveState({
      id: req.params.vendorId,
      active: false,
      actor: actorFromReq(req),
      reason: req.body.reason,
      action: 'SUSPEND_VENDOR',
    });
    return sendSuccess(res, 200, 'Vendor suspended successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to suspend vendor');
  }
};

exports.activateVendor = async (req, res) => {
  try {
    const data = await usersService.changeUserActiveState({
      id: req.params.vendorId,
      active: true,
      actor: actorFromReq(req),
      reason: req.body.reason,
      action: 'ACTIVATE_VENDOR',
    });
    return sendSuccess(res, 200, 'Vendor activated successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to activate vendor');
  }
};

exports.getVendorActiveProducts = async (req, res) => {
  try {
    const data = await vendorService.getVendorActiveProducts(req.params.vendorId, req.query);
    return sendSuccess(res, 200, 'Vendor active products fetched successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to fetch vendor products');
  }
};
