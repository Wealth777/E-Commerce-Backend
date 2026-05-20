// Deprecated aggregate controller kept for backward compatibility.
// Active vendor routes import from controllers/Vendor/* directly.
module.exports = {
  ...require('./Vendor/auth.controller'),
  ...require('./Vendor/product.controller'),
  ...require('./Vendor/payout.controller'),
  ...require('./Vendor/order.controller'),
  ...require('./Vendor/analytics.controller'),
};
