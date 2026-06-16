const logger = require('../../logger');
const ratingService = require('../../services/productRating.service');
const { sendSuccess, sendError } = require('../../utils/responseStruture');

const handleError = (res, error, fallback) => { logger.error(error); return sendError(res, error.statusCode || 500, error.statusCode ? error.message : fallback, error.errors || null); };

exports.createProductRating = async (req, res) => {
  try { return sendSuccess(res, 201, 'Product rating created successfully', await ratingService.createRating({ buyerId: req.user._id, productId: req.params.productId, body: req.body })); }
  catch (error) { return handleError(res, error, 'Failed to create product rating'); }
};
exports.updateProductRating = async (req, res) => {
  try { return sendSuccess(res, 200, 'Product rating updated successfully', await ratingService.updateRating({ buyerId: req.user._id, ratingId: req.params.ratingId, body: req.body })); }
  catch (error) { return handleError(res, error, 'Failed to update product rating'); }
};
exports.deleteOwnProductRating = async (req, res) => {
  try { return sendSuccess(res, 200, 'Product rating deleted successfully', await ratingService.deleteOwnRating({ buyerId: req.user._id, ratingId: req.params.ratingId })); }
  catch (error) { return handleError(res, error, 'Failed to delete product rating'); }
};
exports.getProductRatings = async (req, res) => {
  try { return sendSuccess(res, 200, 'Product ratings fetched successfully', await ratingService.getProductRatings(req.params.productId, req.query)); }
  catch (error) { return handleError(res, error, 'Failed to fetch product ratings'); }
};
exports.getProductRatingSummary = async (req, res) => {
  try { return sendSuccess(res, 200, 'Product rating summary fetched successfully', await ratingService.getProductRatingSummary(req.params.productId)); }
  catch (error) { return handleError(res, error, 'Failed to fetch product rating summary'); }
};
exports.getBuyerRatings = async (req, res) => {
  try { return sendSuccess(res, 200, 'Buyer ratings fetched successfully', await ratingService.getBuyerRatings(req.user._id, req.query)); }
  catch (error) { return handleError(res, error, 'Failed to fetch buyer ratings'); }
};
exports.getVendorProductRatings = async (req, res) => {
  try { return sendSuccess(res, 200, 'Vendor product ratings fetched successfully', await ratingService.getVendorProductRatings(req.user._id, req.query)); }
  catch (error) { return handleError(res, error, 'Failed to fetch vendor product ratings'); }
};