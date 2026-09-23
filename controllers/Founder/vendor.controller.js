const { getAllVendors, getVendorById, lockVendor, unlockVendor, banVendor, deleteVendor, } = require("../../services/founder/vendor.service");

const { sendSuccess, sendError } = require("../../utils/responseStruture");
const logger = require("../../logger");


const getAllVendorController = async (req, res) => {
  try {
    const vendor = await getAllVendors();

    return sendSuccess(
      res,
      200,
      "vendor fetched successfully",
      vendor
    );
  } catch (error) {
    logger.error("Failed to fetch vendor", { error: error.message, stack: error.stack,});

    return sendError( res, error.statusCode || 500, error.message || "Failed to fetch vendor" );
  }
};

const getVendorByIdController = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await getVendorById(vendorId);

    return sendSuccess( res, 200, "Vendor fetched successfully", vendor);
  } catch (error) {
    logger.error("Failed to fetch vendor", {
      vendorId: req.params.vendorId,
      error: error.message,
      stack: error.stack,
    });

    return sendError( res, error.statusCode || 500, error.message || "Failed to fetch vendor" );
  }
};


const lockVendorController = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { reason } = req.body;

    const founderId = req.user._id;

    const vendor = await lockVendor(
      vendorId,
      founderId,
      reason,
      req
    );

    return sendSuccess( res, 200, "Vendor account locked successfully", vendor );
  } catch (error) {
    logger.error("Failed to lock vendor", {
      vendorId: req.params.vendorId,
      founderId: req.user?._id,
      error: error.message,
      stack: error.stack,
    });

    return sendError( res, error.statusCode || 500, error.message || "Failed to lock vendor" );
  }
};


const unlockVendorController = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const founderId = req.user._id;

    const vendor = await unlockVendor(
      vendorId,
      founderId,
      req
    );

    return sendSuccess( res, 200, "Vendor account unlocked successfully",  );
  } catch (error) {
    logger.error("Failed to unlock vendor", {
      vendorId: req.params.vendorId,
      founderId: req.user?._id,
      error: error.message,
      stack: error.stack,
    });

    return sendError(res, error.statusCode || 500, error.message || "Failed to unlock vendor" );
  }
};

const banVendorController = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { reason } = req.body;

    const founderId = req.user._id;

    const vendor = await banVendor(
      vendorId,
      founderId,
      reason,
      req
    );

    return sendSuccess( res, 200, "Vendor account banned successfully", vendor );
  } catch (error) {
    logger.error("Failed to ban vendor", {
      vendorId: req.params.vendorId,
      founderId: req.user?._id,
      error: error.message,
      stack: error.stack,
    });

    return sendError( res, error.statusCode || 500, error.message || "Failed to ban vendor" );
  }
};


const deleteVendorController = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { reason } = req.body;

    const founderId = req.user._id;

    const vendor = await deleteVendor(
      vendorId,
      founderId,
      reason,
      req
    );

    return sendSuccess(res, 200, "Vendor account deleted successfully", vendor );
  } catch (error) {
    logger.error("Failed to delete vendor", {
      endorId: req.params.vendorId,
      founderId: req.user?._id,
      error: error.message,
      stack: error.stack,
    });

    return sendError( res, error.statusCode || 500, error.message || "Failed to delete vendor" );
  }
};


module.exports = {
  getAllVendorController,
  getVendorByIdController,
  lockVendorController,
  unlockVendorController,
  banVendorController,
  deleteVendorController,
};