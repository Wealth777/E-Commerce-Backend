const logger = require('../../logger');
const mongoose = require('mongoose');
const payoutService = require('../../services/vendor/payout.service');
const { sendSuccess, sendError } = require('../../utils/responseStruture');

exports.saveVendorPayout = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vendor = await payoutService.saveVendorPayout({
      userId: req.user._id,
      bankName: req.body.bankName,
      accountName: req.body.accountName,
      accountNumber: req.body.accountNumber,
      session,
    });

    await session.commitTransaction();
    return sendSuccess(res, 200, 'Payout details saved successfully', vendor);
  } catch (error) {
    await session.abortTransaction();
    logger.error(error);
    return sendError(res, error.statusCode || 500, error.statusCode ? error.message : 'Server error', error.errors || null);
  } finally {
    session.endSession();
  }
};
