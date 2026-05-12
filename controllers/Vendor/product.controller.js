const logger = require('../../logger');
const { default: mongoose } = require('mongoose');
const AddProduct = require('../../models(Copy)/addproduct.model')
const AuditLog = require('../../models(Copy)/auditLog')
const { validateLimit, groupProductsByVendor, buildInterleavedFeed } = require('../../utils(copy)/feedAlgorithm');

exports.addProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, description, category, price, originalPrice, stock, imageUrl } = req.body;

    if (!name || !category || !price || !stock) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled"
      });
    }

    let image = null;

    if (req.file) {
      image = req.file.path;
    } else if (imageUrl) {
      image = imageUrl;
    } else {
      return res.status(400).json({
        success: false,
        message: "Provide an image file or image URL"
      });
    }

    const parsedPrice = Number(price);
    const parsedStock = Number(stock);

    if (isNaN(parsedPrice) || isNaN(parsedStock)) {
      return res.status(400).json({
        success: false,
        message: "Price and stock must be valid numbers"
      });
    }

    let status = "in-stock";
    if (parsedStock === 0) status = "out-of-stock";
    else if (parsedStock <= 5) status = "low-in-stock";

    const product = await AddProduct.create([{
      vendor: req.user._id,
      name,
      description,
      image,
      category,
      price: parsedPrice,
      originalPrice: originalPrice || parsedPrice,
      stock: parsedStock,
      status
    }], { session });

    await AuditLog.create([{
      user: req.user._id,
      role: 'vendor',
      action: 'ADD_PRODUCT',
      entity: 'Product',
      entityId: product._id,
      metadata: {
        name: product.name,
        price: product.price
      }
    }], { session });

await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "Product added successfully",
      data: product
    });

  } catch (err) {
    await session.abortTransaction();
    logger.error("ADD PRODUCT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  } finally {
    session.endSession();
  }
};

exports.getVendorProducts = async (req, res) => {
  try {
    const vendorId = req.user._id;

    const products = await AddProduct.find({ vendor: vendorId });

    if (!products || products.length === 0) {
      return res.status(200).json({
        success: true,
        data: products || []
      });
    }

    return res.status(200).json({
      success: true,
      data: products
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const limit = validateLimit(req.query.limit);

    const products = await AddProduct.find()
      .populate("vendor", "storeName profilePhoto country state");

    if (!products || products.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        totalProducts: 0,
        data: []
      });
    }

    const vendorGroups = groupProductsByVendor(products);
    const interleavedFeed = buildInterleavedFeed(vendorGroups, limit);

    if (req.user?._id) {
      await AuditLog.create({
        user: req.user._id,
        role: req.user.role || 'buyer',
        action: 'VIEW_PRODUCT_FEED',
        entity: 'Feed',
        entityId: null,
        metadata: {
          limit,
          productsReturned: interleavedFeed.length,
          totalProducts: products.length,
          vendorsCount: Object.keys(vendorGroups).length
        }
      });
    }

    return res.status(200).json({
      success: true,
      count: interleavedFeed.length,
      totalProducts: products.length,
      data: interleavedFeed
    });

  } catch (err) {
    logger.error("GET ALL PRODUCTS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message
    });
  }
};

exports.updateProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const productId = req.params.id;
    const vendorId = req.user._id;

    const product = await AddProduct.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    if (product.vendor.toString() !== vendorId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const { name, description, category, price, stock, imageUrl } = req.body;

    if (name) product.name = name;
    if (description) product.description = description;
    if (category) product.category = category;
    if (price) product.price = Number(price);
    if (stock) product.stock = Number(stock);
    if (imageUrl) product.imageUrl = imageUrl;

    if (stock !== undefined) {
      if (product.stock === 0) product.status = "out-of-stock";
      else if (product.stock <= 5) product.status = "low-in-stock";
      else product.status = "in-stock";
    }

    if (req.file) {
      product.image = req.file.path;
    } else if (imageUrl) {
      product.image = imageUrl;
    }

    await product.save().session(session);

    await AuditLog.create([{
      user: req.user._id,
      role: 'vendor',
      action: 'UPDATE_PRODUCT',
      entity: 'Product',
      entityId: product._id
    }], { session });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product
    });

  } catch (err) {
    await session.abortTransaction();
    logger.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message
    });
  } finally {
    session.endSession();
  }
};

exports.deleteProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const productId = req.params.id;
    const vendorId = req.user._id;

    await productService.softDeleteProduct({ productId, vendorId, session });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });

  } catch (error) {
    await session.abortTransaction();
    logger.error("Delete Product Error", {
      error: error.message,
      stack: error.stack,
      productId: req.params.id,
      vendorId: req.user?._id,
    });

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Error deleting product"
    });
  } finally {
    session.endSession();
  }
};

exports.getProductDetails = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await AddProduct.findById(productId)
      .populate("vendor", "serialNumber fullName storeName storeDescription profilePhoto country state socialLinks");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: {
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
          updatedAt: product.updatedAt
        },
        vendor: {
          id: product.vendor._id,
          serialNumber: product.vendor.serialNumber,
          fullName: product.vendor.fullName,
          storeName: product.vendor.storeName,
          storeDescription: product.vendor.storeDescription,
          profilePhoto: product.vendor.profilePhoto,
          location: {
            country: product.vendor.country,
            state: product.vendor.state
          },
          socialLinks: product.vendor.socialLinks
        }
      }
    });

  } catch (err) {
    logger.error("GET PRODUCT DETAILS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message
    });
  }
};

exports.getVendorProductsByCategory = async (req, res) => {
  try {
    const { vendorId, category } = req.params;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required"
      });
    }

    const products = await AddProduct.find({
      vendor: vendorId,
      category: { $regex: category, $options: 'i' }
    })
      .sort({ createdAt: -1 })
      .populate("vendor", "fullName storeName profilePhoto country state");

    if (!products || products.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: "No products found in this category"
      });
    }

    const vendor = products[0].vendor;

    const productList = products.map(product => ({
      id: product._id,
      name: product.name,
      description: product.description,
      image: product.image,
      price: product.price,
      originalPrice: product.originalPrice,
      stock: product.stock,
      status: product.status
    }));

    return res.status(200).json({
      success: true,
      count: products.length,
      category,
      vendor: {
        id: vendor._id,
        fullName: vendor.fullName,
        storeName: vendor.storeName
      },
      products: productList
    });

  } catch (err) {
    logger.error("GET VENDOR PRODUCTS BY CATEGORY ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message
    });
  }
};

exports.searchVendorProducts = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { q, category, minPrice, maxPrice } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }

    // Build filter query
    const filterQuery = {
      vendor: vendorId,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
      ]
    };

    // Add price filter if provided
    if (minPrice || maxPrice) {
      filterQuery.price = {};
      if (minPrice) filterQuery.price.$gte = Number(minPrice);
      if (maxPrice) filterQuery.price.$lte = Number(maxPrice);
    }

    // Add category filter if provided
    if (category) {
      filterQuery.category = category;
    }

    const products = await AddProduct.find(filterQuery)
      .sort({ createdAt: -1 })
      .populate("vendor", "fullName storeName profilePhoto");

    if (!products || products.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: "No products found matching your search"
      });
    }

    const vendor = products[0].vendor;

    const productList = products.map(product => ({
      id: product._id,
      name: product.name,
      description: product.description,
      image: product.image,
      category: product.category,
      price: product.price,
      originalPrice: product.originalPrice,
      stock: product.stock,
      status: product.status,
      relevance: "search-match"
    }));

    return res.status(200).json({
      success: true,
      count: products.length,
      searchQuery: q,
      filters: { category, minPrice, maxPrice },
      vendor: {
        id: vendor._id,
        fullName: vendor.fullName,
        storeName: vendor.storeName
      },
      products: productList
    });

  } catch (err) {
    logger.error("SEARCH VENDOR PRODUCTS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message
    });
  }
};