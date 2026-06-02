const Buyer = require('../../models/buyer.model');
const Vendor = require('../../models/vendor.model');
const Founder = require('../../models/founder.model');

const getModelByRole = (role) => {
  if (role === 'buyer') return Buyer;
  if (role === 'vendor') return Vendor;
  if (role === 'founder' || role === 'admin') return Founder;
  return null;
};

const getRefByRole = (role) => {
  if (role === 'buyer') return 'Buyer';
  if (role === 'vendor') return 'Vendor';
  if (role === 'founder' || role === 'admin') return 'Founder';
  return null;
};

const safeUserSelect = '-password -refreshToken -token -otp -otpCode -passwordResetToken -passwordResetExpires';

module.exports = { getModelByRole, getRefByRole, safeUserSelect };
