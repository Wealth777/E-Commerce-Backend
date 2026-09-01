const vendorModel = require('../../models/vendor.model');
const AuditLog = require('../../models/auditLog.model');
const AppError = require('../common/AppError');

const validateBankingDetails = ({ bankName, accountName, accountNumber }) => {
  const errors = [];
  if (!bankName || bankName.trim() === '') errors.push('Bank name is required');
  if (!accountName || accountName.trim() === '') errors.push('Account name is required');
  if (!/^\d{10}$/.test(accountNumber || '')) errors.push('Account number must be exactly 10 digits');
  return errors;
};

const saveVendorPayout = async ({ userId, bankName, accountName, accountNumber, session }) => {
  const errors = validateBankingDetails({ bankName, accountName, accountNumber });
  if (errors.length > 0) throw new AppError('Banking details validation failed', 400, errors);

  const vendor = await vendorModel.findById(userId).session(session);
  if (!vendor) throw new AppError('Vendor not found', 404);

  vendor.bankDetails.bankName = bankName;
  vendor.bankDetails.accountName = accountName;
  vendor.bankDetails.accountNumber = accountNumber;
  await vendor.save({ session });

  await AuditLog.create([{
    user: userId,
    role: 'vendor',
    action: 'UPDATE_PAYOUT',
    entity: 'Vendor',
    entityId: vendor._id,
  }], { session });

  return vendor;
};

module.exports = { saveVendorPayout };
