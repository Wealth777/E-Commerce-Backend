const {
  getPendingVendorApprovals,
  getVendorOnboardingDetails,
  approveVendor,
  rejectVendor,
} = require("../../services/founder/vendorApproval.service");

const { sendSuccess, sendError } = require("../../utils/responseStruture");
const AppError = require("../../services/common/AppError");
const logger = require("../../logger");


const getPendingVendorApprovalsController = async (req, res) => {
  try {
    const vendors = await getPendingVendorApprovals();

    return sendSuccess(
      res,
      200,
      "Pending vendor approvals retrieved successfully",
      vendors
    );
  } catch (error) {
    logger.error("Get pending vendor approvals controller error", {
      error: error.message,
      stack: error.stack,
    });

    return sendError(
      res,
      error instanceof AppError ? error.statusCode : 500,
      error.message || "Failed to retrieve pending vendor approvals",
      error.errors || null
    );
  }
};


const getVendorOnboardingDetailsController = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await getVendorOnboardingDetails(vendorId);

    return sendSuccess(
      res,
      200,
      "Vendor onboarding details retrieved successfully",
      vendor
    );
  } catch (error) {
    logger.error("Get vendor onboarding details controller error", {
      vendorId: req.params.vendorId,
      error: error.message,
      stack: error.stack,
    });

    return sendError(
      res,
      error instanceof AppError ? error.statusCode : 500,
      error.message || "Failed to retrieve vendor onboarding details",
      error.errors || null
    );
  }
};


const approveVendorController = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const founderId = req.user?._id;

    if (!founderId) {
      throw new AppError(
        "Authenticated Founder information not found",
        401
      );
    }

    const vendor = await approveVendor(
      vendorId,
      founderId,
      req
    );

    return sendSuccess(
      res,
      200,
      "Vendor approved successfully",
      vendor
    );
  } catch (error) {
    logger.error("Approve vendor controller error", {
      vendorId: req.params.vendorId,
      founderId: req.user?._id,
      error: error.message,
      stack: error.stack,
    });

    return sendError(
      res,
      error instanceof AppError ? error.statusCode : 500,
      error.message || "Failed to approve vendor",
      error.errors || null
    );
  }
};


const rejectVendorController = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { rejectionReason } = req.body;

    const founderId = req.user?._id;

    if (!founderId) {
      throw new AppError(
        "Authenticated Founder information not found",
        401
      );
    }

    const vendor = await rejectVendor(
      vendorId,
      founderId,
      rejectionReason,
      req
    );

    return sendSuccess(
      res,
      200,
      "Vendor rejected successfully",
      vendor
    );
  } catch (error) {
    logger.error("Reject vendor controller error", {
      vendorId: req.params.vendorId,
      founderId: req.user?._id,
      error: error.message,
      stack: error.stack,
    });

    return sendError(
      res,
      error instanceof AppError ? error.statusCode : 500,
      error.message || "Failed to reject vendor",
      error.errors || null
    );
  }
};


module.exports = {
  getPendingVendorApprovalsController,
  getVendorOnboardingDetailsController,
  approveVendorController,
  rejectVendorController,
};