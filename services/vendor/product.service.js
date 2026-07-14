const AddProduct = require('../../models/addproduct.model');
const AuditLog = require('../../models/auditLog.model');
const { validateLimit, groupProductsByVendor, buildInterleavedFeed } = require('../../utils/feedAlgorithm');
const Category = require('../../models/category.model');
const AppError = require('../common/AppError');

const mongoose = require('mongoose');

const getStockStatus = (stock) => {
  if (stock === 0) return 'out-of-stock';
  if (stock <= 5) return 'low-in-stock';
  return 'in-stock';
};

const addProduct = async ({ vendorId, body, file, session }) => {
  const {
    name,
    description,
    category,
    subCategory,
    price,
    originalPrice,
    stock,
    imageUrl,
  } = body;

  if (!name || !category || price === undefined || stock === undefined) {
    throw new AppError('All required fields must be filled', 400);
  }

  const mainCategory = await Category.findOne({
    _id: category,
    level: 1,
    status: 'approved',
    isActive: true,
  }).session(session);

  if (!mainCategory) {
    throw new AppError('Invalid or unapproved category', 400);
  }

  let selectedSubCategory = null;

  if (subCategory) {
    selectedSubCategory = await Category.findOne({
      _id: subCategory,
      parentCategory: mainCategory._id,
      level: 2,
      status: 'approved',
      isActive: true,
    }).session(session);

    if (!selectedSubCategory) {
      throw new AppError('Invalid or unapproved subcategory', 400);
    }
  }

  const image = file?.path || imageUrl;
  if (!image) throw new AppError('Provide an image file or image URL', 400);

  const parsedPrice = Number(price);
  const parsedStock = Number(stock);

  if (Number.isNaN(parsedPrice) || Number.isNaN(parsedStock)) {
    throw new AppError('Price and stock must be valid numbers', 400);
  }

  const [product] = await AddProduct.create(
    [
      {
        vendor: vendorId,
        name,
        description,
        image,
        category: mainCategory._id,
        subCategory: selectedSubCategory?._id || null,
        price: parsedPrice,
        originalPrice: originalPrice || parsedPrice,
        stock: parsedStock,
        status: getStockStatus(parsedStock),
      },
    ],
    { session }
  );

  await AuditLog.create(
    [
      {
        user: vendorId,
        role: 'vendor',
        action: 'ADD_PRODUCT',
        entity: 'Product',
        entityId: product._id,
        metadata: {
          name: product.name,
          price: product.price,
          category: mainCategory.name,
          subCategory: selectedSubCategory?.name || null,
        },
      },
    ],
    { session }
  );

  return product;
};

const getVendorProducts = async ({ vendorId }) => {
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    throw new AppError('Invalid vendor ID', 400);
  }

  return AddProduct.find({ vendor: vendorId })
    .populate('vendor', 'storeName businessName fullName profilePhoto country state')
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug')
    .sort({ createdAt: -1 });
};

const getAllProducts = async ({ limitParam, user }) => {
  const limit = validateLimit(limitParam);
  const products = await AddProduct.find()
    .populate({
      path: "vendor",
      select: "storeName profilePhoto country state accountStatus",
      match: {
        accountStatus: "active",
        isActive: true,
      },
    })
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug');


  if (!products || products.length === 0) {
    return { count: 0, totalProducts: 0, items: [] };
  }

  const filteredProducts = products.filter(product => product.vendor);
  const vendorGroups = groupProductsByVendor(filteredProducts);
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
        totalProducts: filteredProducts.length,
        vendorsCount: Object.keys(vendorGroups).length,
      },
    });
  }

  return { count: items.length, totalProducts: filteredProducts.length, products: items, };
};

const updateProduct = async ({ productId, vendorId, body, file, session }) => {
  const product = await AddProduct.findById(productId).session(session);
  if (!product) throw new AppError('Product not found', 404);
  if (product.vendor.toString() !== vendorId.toString()) throw new AppError('Unauthorized', 403);

  const { name, description, category, subCategory, price, stock, imageUrl } = body;
  if (name) product.name = name;

  if (description) product.description = description;

  if (category) {
    const mainCategory = await Category.findOne({
      _id: category,
      level: 1,
      status: 'approved',
      isActive: true,
    }).session(session);

    if (!mainCategory) {
      throw new AppError('Invalid or unapproved category', 400);
    }

    product.category = mainCategory._id;
    product.subCategory = null;
  }

  if (subCategory) {
    const selectedSubCategory = await Category.findOne({
      _id: subCategory,
      parentCategory: product.category,
      level: 2,
      status: 'approved',
      isActive: true,
    }).session(session);

    if (!selectedSubCategory) {
      throw new AppError('Invalid or unapproved subcategory', 400);
    }

    product.subCategory = selectedSubCategory._id;
  };

  if (price !== undefined) {
    const parsedPrice = Number(price);

    if (Number.isNaN(parsedPrice)) {
      throw new AppError(
        'Price must be a valid number',
        400
      );
    }

    product.price = parsedPrice;
  }

  if (stock !== undefined) {
    const parsedStock = Number(stock);

    if (Number.isNaN(parsedStock)) {
      throw new AppError(
        'Stock must be a valid number',
        400
      );
    }

    product.stock = parsedStock;
    product.status = getStockStatus(parsedStock);
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
    .populate({
      path: "vendor",
      select:
        "serialNumber fullName storeName storeDescription profilePhoto country state socialLinks accountStatus isActive",
      match: {
        accountStatus: "active",
        isActive: true,
      },
    })
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug');

  if (!product || !product.vendor) throw new AppError('Product not found', 404);

  return {
    product: {
      id: product._id,
      name: product.name,
      description: product.description,
      image: product.image,
      category: product.category,
      subCategory: product.subCategory,
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
  if (!category) {
    throw new AppError('Category is required', 400);
  }

  const categoryDoc = await Category.findOne({
    $or: [
      {
        _id: mongoose.Types.ObjectId.isValid(category)
          ? category
          : null,
      },
      {
        slug: category,
      },
    ],
    status: 'approved',
    isActive: true,
  });

  if (!categoryDoc) {
    throw new AppError('Category not found', 404);
  }

  const products = await AddProduct.find({
    vendor: vendorId,
    $or: [
      {
        category: categoryDoc._id,
      },
      {
        subCategory: categoryDoc._id,
      },
    ],
  })
    .sort({ createdAt: -1 })
    .populate({
      path: "vendor",
      select: "fullName storeName profilePhoto country state accountStatus",
      match: {
        accountStatus: "active",
        isActive: true,
      },
    })
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug');

  const filteredProducts = products.filter(product => product.vendor);

  return {
    count: filteredProducts.length,
    category: categoryDoc.name,
    vendor: products[0]?.vendor
      ? {
        id: products[0].vendor._id,
        fullName: products[0].vendor.fullName,
        storeName: products[0].vendor.storeName,
      }
      : null,
    products: filteredProducts.length,
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
