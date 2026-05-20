const AddProduct = require('../../models/addproduct.model');
const AuditLog = require('../../models/auditLog.model');
const { validateLimit, groupProductsByVendor, buildInterleavedFeed } = require('../../utils/feedAlgorithm');
const AppError = require('../common/AppError');

const getStockStatus = (stock) => {
  if (stock === 0) return 'out-of-stock';
  if (stock <= 5) return 'low-in-stock';
  return 'in-stock';
};

const addProduct = async ({ vendorId, body, file, session }) => {
  const { name, description, category, price, originalPrice, stock, imageUrl } = body;
  if (!name || !category || price === undefined || stock === undefined) {
    throw new AppError('All required fields must be filled', 400);
  }

  const image = file?.path || imageUrl;
  if (!image) throw new AppError('Provide an image file or image URL', 400);

  const parsedPrice = Number(price);
  const parsedStock = Number(stock);
  if (Number.isNaN(parsedPrice) || Number.isNaN(parsedStock)) {
    throw new AppError('Price and stock must be valid numbers', 400);
  }

  const [product] = await AddProduct.create([{
    vendor: vendorId,
    name,
    description,
    image,
    category,
    price: parsedPrice,
    originalPrice: originalPrice || parsedPrice,
    stock: parsedStock,
    status: getStockStatus(parsedStock),
  }], { session });

  await AuditLog.create([{
    user: vendorId,
    role: 'vendor',
    action: 'ADD_PRODUCT',
    entity: 'Product',
    entityId: product._id,
    metadata: { name: product.name, price: product.price },
  }], { session });

  return product;
};

const getVendorProducts = async ({ vendorId }) => AddProduct.find({ vendor: vendorId });

const getAllProducts = async ({ limitParam, user }) => {
  const limit = validateLimit(limitParam);
  const products = await AddProduct.find().populate('vendor', 'storeName profilePhoto country state');

  if (!products || products.length === 0) {
    return { count: 0, totalProducts: 0, items: [] };
  }

  const vendorGroups = groupProductsByVendor(products);
  const items = buildInterleavedFeed(vendorGroups, limit);

  if (user?._id) {
    await AuditLog.create({
      user: user._id,
      role: user.role || 'buyer',
      action: 'VIEW_PRODUCT_FEED',
      entity: 'Feed',
      entityId: null,
      metadata: {
        limit,
        productsReturned: items.length,
        totalProducts: products.length,
        vendorsCount: Object.keys(vendorGroups).length,
      },
    });
  }

  return { count: items.length, totalProducts: products.length, products: items, };
};

const updateProduct = async ({ productId, vendorId, body, file, session }) => {
  const product = await AddProduct.findById(productId).session(session);
  if (!product) throw new AppError('Product not found', 404);
  if (product.vendor.toString() !== vendorId.toString()) throw new AppError('Unauthorized', 403);

  const { name, description, category, price, stock, imageUrl } = body;
  if (name) product.name = name;
  if (description) product.description = description;
  if (category) product.category = category;
  if (price !== undefined) product.price = Number(price);
  if (stock !== undefined) {
    product.stock = Number(stock);
    product.status = getStockStatus(product.stock);
  }
  if (file?.path) product.image = file.path;
  else if (imageUrl) product.image = imageUrl;

  await product.save({ session });

  await AuditLog.create([{
    user: vendorId,
    role: 'vendor',
    action: 'UPDATE_PRODUCT',
    entity: 'Product',
    entityId: product._id,
  }], { session });

  return product;
};

const softDeleteProduct = async ({ productId, vendorId, session }) => {
  const product = await AddProduct.findById(productId).session(session);
  if (!product) throw new AppError('Product not found', 404);
  if (product.vendor.toString() !== vendorId.toString()) throw new AppError('Unauthorized', 403);

  await AddProduct.deleteOne({ _id: productId }).session(session);

  await AuditLog.create([{
    user: vendorId,
    role: 'vendor',
    action: 'DELETE_PRODUCT',
    entity: 'Product',
    entityId: productId,
  }], { session });
};

const getProductDetails = async ({ productId }) => {
  const product = await AddProduct.findById(productId)
    .populate('vendor', 'serialNumber fullName storeName storeDescription profilePhoto country state socialLinks');

  if (!product) throw new AppError('Product not found', 404);

  return {
    product: {
      id: product._id,
      name: product.name,
      description: product.description,
      image: product.image,
      category: product.category,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0,
      stock: product.stock,
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    },
    vendor: {
      id: product.vendor._id,
      serialNumber: product.vendor.serialNumber,
      fullName: product.vendor.fullName,
      storeName: product.vendor.storeName,
      storeDescription: product.vendor.storeDescription,
      profilePhoto: product.vendor.profilePhoto,
      location: { country: product.vendor.country, state: product.vendor.state },
      socialLinks: product.vendor.socialLinks,
    },
  };
};

const getVendorProductsByCategory = async ({ vendorId, category }) => {
  if (!category) throw new AppError('Category is required', 400);

  const products = await AddProduct.find({ vendor: vendorId, category: { $regex: category, $options: 'i' } })
    .sort({ createdAt: -1 })
    .populate('vendor', 'fullName storeName profilePhoto country state');

  if (!products || products.length === 0) {
    return { count: 0, category, vendor: null, products: [] };
  }

  const vendor = products[0].vendor;

  return {
    count: products.length,
    category,
    vendor: { id: vendor._id, fullName: vendor.fullName, storeName: vendor.storeName },
    products: products.map((product) => ({
      id: product._id,
      name: product.name,
      description: product.description,
      image: product.image,
      price: product.price,
      originalPrice: product.originalPrice,
      stock: product.stock,
      status: product.status,
    })),
  };
};

module.exports = {
  addProduct,
  getVendorProducts,
  getAllProducts,
  updateProduct,
  softDeleteProduct,
  getProductDetails,
  getVendorProductsByCategory,
};
