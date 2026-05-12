const logger = require('../../logger');
const vendorModel = require('../../models/vendor.model');
const AuditLog = require('../../models/auditLog');
const { default: mongoose } = require('mongoose');

const validateBankingDetails = (bankName, accountName, accountNumber, bankCode) => {
  const errors = [];

  if (!bankName || bankName.trim() === '') {
    errors.push('Bank name is required');
  }

  if (!accountName || accountName.trim() === '') {
    errors.push('Account name is required');
  }

  // Check if numeric and exactly 10 digits
  if (!/^\d{10}$/.test(accountNumber)) {
    errors.push('Account number must be exactly 10 digits');
  }

  return errors;
};

exports.saveVendorPayout = async (req, res) => {
  const session = await mongoose.startSession();
    session.startTransaction();
  try {
    const userId = req.user._id;

    const {
      bankName,
      accountName,
      accountNumber,
    } = req.body;

    if (accountNumber.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Account number must be 10 digits'
      });
    }

    const errors = validateBankingDetails(bankName, accountName, accountNumber);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Banking details validation failed",
        errors
      });
    }

    const vendor = await vendorModel.findById(userId);

    if (bankName) vendor.bankName = bankName;
    if (accountName) vendor.accountName = accountName;
    if (accountNumber) vendor.accountNumber = accountNumber;

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    await vendor.save();

    await AuditLog.create([{
      user: req.user._id,
      role: 'vendor',
      action: 'UPDATE_PAYOUT',
      entity: 'Vendor'
    }], { session });

    await session.commitTransaction();


    return res.status(200).json({
      success: true,
      message: 'Payout details saved successfully',
      data: vendor
    });

  } catch (error) {
    await session.abortTransaction();
    logger.error(error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  } finally {
    session.endSession();
  };
};