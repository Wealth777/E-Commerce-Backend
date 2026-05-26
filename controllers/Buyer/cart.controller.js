const logger = require('../../logger');
const cartService = require('../../services/buyer/cart.service');
const { sendSuccess, sendError } = require('../../utils/responseStruture');

const handleError = (res, error, fallbackMessage) => {
  logger.error(error);
  return sendError(res, error.statusCode || 500, error.statusCode ? error.message : fallbackMessage, error.errors || null);
};

exports.addToCart = async (req, res) => {
  try {
    const cart = await cartService.addToCart({
      userId: req.user._id,
      productId: req.body.productId,
      quantity: req.body.quantity,
    });

    return sendSuccess(res, 200, 'Cart added successfully', cart);
  } catch (error) {
    return sendError(res, error.statusCode || 500, error.message || 'Failed to add to cart');
  }
};

exports.getCart = async (req, res) => {
  try {
    const cart = await cartService.getCart({ userId: req.user._id });
    return sendSuccess(res, 200, 'Cart fetched successfully', cart);
  } catch (error) {
    return handleError(res, error, 'Error fetching cart');
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const cart = await cartService.updateCartItem({
      userId: req.user._id,
      productId: req.body.productId,
      quantity: req.body.quantity,
    });

    return sendSuccess(res, 200, 'Cart updated successfully', cart);
  } catch (error) {
    return handleError(res, error, 'Error updating cart');
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const cart = await cartService.removeFromCart({
      userId: req.user._id,
      productId: req.params.productId,
    });

    return sendSuccess(res, 200, 'Product removed from cart', cart);
  } catch (error) {
    return handleError(res, error, 'Error removing from cart');
  }
};
