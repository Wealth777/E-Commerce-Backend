const logger = require('../../logger');
const wishlistService = require('../../services/buyer/wishlist.service');
const { sendSuccess, sendError } = require('../../utils/responseStruture');

const handleError = (res, error, fallbackMessage) => {
  logger.error(error);
  return sendError(res, error.statusCode || 500, error.statusCode ? error.message : fallbackMessage, error.errors || null);
};

exports.addToWishlist = async (req, res) => {
  try {
    const wishlist = await wishlistService.addToWishlist({
      userId: req.user._id,
      productId: req.body.productId,
    });

    return sendSuccess(res, 201, 'Product added to wishlist', wishlist);
  } catch (error) {
    return handleError(res, error, 'Failed to add to wishlist');
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const wishlist = await wishlistService.removeFromWishlist({
      userId: req.user._id,
      productId: req.params.productId,
    });

    return sendSuccess(res, 200, 'Product removed from wishlist', wishlist);
  } catch (error) {
    return handleError(res, error, 'Failed to remove item');
  }
};

exports.clearWishlist = async (req, res) => {
  try {
    const wishlist = await wishlistService.clearWishlist({ userId: req.user._id });
    return sendSuccess(res, 200, 'Wishlist cleared successfully', wishlist);
  } catch (error) {
    return handleError(res, error, 'Failed to clear wishlist');
  }
};

exports.getWishlist = async (req, res) => {
  try {
    const wishlist = await wishlistService.getWishlist({ userId: req.user._id });
    return sendSuccess(res, 200, 'Wishlist fetched successfully', wishlist);
  } catch (error) {
    return handleError(res, error, 'Failed to fetch wishlist');
  }
};
