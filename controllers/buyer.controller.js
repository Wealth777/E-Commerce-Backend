// Deprecated aggregate controller kept for backward compatibility.
// Active buyer routes import from controllers/Buyer/* directly.
module.exports = {
  ...require('./Buyer/auth.controller'),
  ...require('./Buyer/cart.controller'),
  ...require('./Buyer/order.controller'),
  ...require('./Buyer/wishlist.controller'),
};
