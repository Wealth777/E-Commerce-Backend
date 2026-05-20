const logger = require('../../logger');
const mongoose = require('mongoose');
const productService = require('../../services/vendor/product.service');
const { sendSuccess, sendError } = require('../../utils/responseStruture');

const handleError = (res, error, fallbackMessage) => {
  logger.error(error);
  return sendError(res, error.statusCode || 500, error.statusCode ? error.message : fallbackMessage, error.errors || null);
};

exports.addProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await productService.addProduct({ vendorId: req.user._id, body: req.body, file: req.file, session });
    await session.commitTransaction();
    return sendSuccess(res, 201, 'Product added successfully', product);
  } catch (error) {
    await session.abortTransaction();
    return handleError(res, error, 'Error adding product');
  } finally {
    session.endSession();
  }
};

exports.getVendorProducts = async (req, res) => {
  try {
    const products = await productService.getVendorProducts({ vendorId: req.user._id });
    return sendSuccess(res, 200, 'Vendor products fetched successfully', products || []);
  } catch (error) {
    return handleError(res, error, 'Internal Server Error');
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const products = await productService.getAllProducts({ limitParam: req.query.limit, user: req.user });
    return sendSuccess(res, 200, 'Products fetched successfully', products);
  } catch (error) {
    return handleError(res, error, 'Internal Server Error');
  }
};

exports.updateProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await productService.updateProduct({
      productId: req.params.id,
      vendorId: req.user._id,
      body: req.body,
      file: req.file,
      session,
    });

    await session.commitTransaction();
    return sendSuccess(res, 200, 'Product updated successfully', product);
  } catch (error) {
    await session.abortTransaction();
    return handleError(res, error, 'Internal Server Error');
  } finally {
    session.endSession();
  }
};

exports.deleteProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await productService.softDeleteProduct({ productId: req.params.id, vendorId: req.user._id, session });
    await session.commitTransaction();
    return sendSuccess(res, 200, 'Product deleted successfully');
  } catch (error) {
    await session.abortTransaction();
    return handleError(res, error, 'Error deleting product');
  } finally {
    session.endSession();
  }
};

exports.getProductDetails = async (req, res) => {
  try {
    const product = await productService.getProductDetails({ productId: req.params.productId });
    return sendSuccess(res, 200, 'Product details fetched successfully', product);
  } catch (error) {
    return handleError(res, error, 'Internal Server Error');
  }
};

exports.getVendorProductsByCategory = async (req, res) => {
  try {
    const products = await productService.getVendorProductsByCategory({ vendorId: req.params.vendorId, category: req.params.category });
    const message = products.count === 0 ? 'No products found in this category' : 'Products fetched successfully';
    return sendSuccess(res, 200, message, products);
  } catch (error) {
    return handleError(res, error, 'Internal Server Error');
  }
};

exports.searchVendorProducts = async (req, res) => {
  return sendError(res, 501, 'Search vendor products service is not wired to a route yet');
};