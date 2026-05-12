const AddProduct = require('../../models/addproduct.model');
const BuyerOrder = require('../../models/buyerOrder.model');
const AuditLog = require('../../models/auditLog');

async function getProductForVendor(productId, vendorId, session) {
  const product = await AddProduct.findById(productId).session(session);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  if (product.vendor.toString() !== vendorId.toString()) {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  return product;
}

async function softDeleteProduct({ productId, vendorId, session }) {
  const product = await getProductForVendor(productId, vendorId, session);

  const pendingOrders = await BuyerOrder.countDocuments({
    'items.productId': productId,
    status: { $in: ['pending', 'confirmed'] },
  }).session(session);

  if (pendingOrders > 0) {
    const error = new Error(`Cannot delete product with ${pendingOrders} pending orders`);
    error.statusCode = 400;
    throw error;
  }

  await product.softDelete(vendorId, 'Vendor');

  await AuditLog.create([{
    user: vendorId,
    role: 'vendor',
    action: 'DELETE_PRODUCT',
    entity: 'Product',
    entityId: productId,
    metadata: {
      productName: product.name,
      productPrice: product.price,
      deletedAt: product.deletedAt,
    },
  }], { session });

  return product;
}

async function restoreProduct({ productId, vendorId }) {
  const product = await AddProduct.findOne({ _id: productId, deleted: true }).setOptions({ withDeleted: true });
  if (!product) {
    const error = new Error('Deleted product not found');
    error.statusCode = 404;
    throw error;
  }

  if (product.vendor.toString() !== vendorId.toString()) {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  await product.restore();
  return product;
}

module.exports = {
  softDeleteProduct,
  restoreProduct,
  getProductForVendor,
};
