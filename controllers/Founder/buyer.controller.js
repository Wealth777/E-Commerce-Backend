const { getAllBuyers, getBuyerById, lockBuyer, unlockBuyer, banBuyer, deleteBuyer, } = require("../../services/founder/buyer.service");

const { sendSuccess, sendError } = require("../../utils/responseStruture");
const logger = require("../../logger");


const getAllBuyersController = async (req, res) => {
  try {
    const buyers = await getAllBuyers();

    return sendSuccess(
      res,
      200,
      "Buyers fetched successfully",
      buyers
    );
  } catch (error) {
    logger.error("Failed to fetch buyers", {
      error: error.message,
      stack: error.stack,
    });

    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Failed to fetch buyers"
    );
  }
};


/* Get one buyer */
const getBuyerByIdController = async (req, res) => {
  try {
    const { buyerId } = req.params;

    const buyer = await getBuyerById(buyerId);

    return sendSuccess(
      res,
      200,
      "Buyer fetched successfully",
      buyer
    );
  } catch (error) {
    logger.error("Failed to fetch buyer", {
      buyerId: req.params.buyerId,
      error: error.message,
      stack: error.stack,
    });

    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Failed to fetch buyer"
    );
  }
};


/* Lock buyer */
const lockBuyerController = async (req, res) => {
  try {
    const { buyerId } = req.params;
    const { reason } = req.body;

    const founderId = req.user._id;

    const buyer = await lockBuyer(
      buyerId,
      founderId,
      reason,
      req
    );

    return sendSuccess(
      res,
      200,
      "Buyer account locked successfully",
      buyer
    );
  } catch (error) {
    logger.error("Failed to lock buyer", {
      buyerId: req.params.buyerId,
      founderId: req.user?._id,
      error: error.message,
      stack: error.stack,
    });

    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Failed to lock buyer"
    );
  }
};


/* Unlock buyer */
const unlockBuyerController = async (req, res) => {
  try {
    const { buyerId } = req.params;

    const founderId = req.user._id;

    const buyer = await unlockBuyer(
      buyerId,
      founderId,
      req
    );

    return sendSuccess(
      res,
      200,
      "Buyer account unlocked successfully",
      buyer
    );
  } catch (error) {
    logger.error("Failed to unlock buyer", {
      buyerId: req.params.buyerId,
      founderId: req.user?._id,
      error: error.message,
      stack: error.stack,
    });

    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Failed to unlock buyer"
    );
  }
};


/* Ban buyer */
const banBuyerController = async (req, res) => {
  try {
    const { buyerId } = req.params;
    const { reason } = req.body;

    const founderId = req.user._id;

    const buyer = await banBuyer(
      buyerId,
      founderId,
      reason,
      req
    );

    return sendSuccess(
      res,
      200,
      "Buyer account banned successfully",
      buyer
    );
  } catch (error) {
    logger.error("Failed to ban buyer", {
      buyerId: req.params.buyerId,
      founderId: req.user?._id,
      error: error.message,
      stack: error.stack,
    });

    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Failed to ban buyer"
    );
  }
};


/* Delete buyer */
const deleteBuyerController = async (req, res) => {
  try {
    const { buyerId } = req.params;
    const { reason } = req.body;

    const founderId = req.user._id;

    const buyer = await deleteBuyer(
      buyerId,
      founderId,
      reason,
      req
    );

    return sendSuccess(
      res,
      200,
      "Buyer account deleted successfully",
      buyer
    );
  } catch (error) {
    logger.error("Failed to delete buyer", {
      buyerId: req.params.buyerId,
      founderId: req.user?._id,
      error: error.message,
      stack: error.stack,
    });

    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Failed to delete buyer"
    );
  }
};


module.exports = {
  getAllBuyersController,
  getBuyerByIdController,
  lockBuyerController,
  unlockBuyerController,
  banBuyerController,
  deleteBuyerController,
};