const vendorModel = require('../models/vendor.model');
const AddProduct = require('../models/addproduct.model')
const AuditLog = require('../models/auditLog')
const BuyerOrder = require("../models/buyerOrder.model");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateSerialNumber } = require('../utils/generateSerial');
const { westAfricaCountries, nigeriaStates } = require("../utils/location");
const { groupProductsByVendor, buildInterleavedFeed, validateLimit } = require('../utils/feedAlgorithm');

const saltRounds = 10;

exports.createUser = async (req, res) => {
  try {
    const { fullName, email, phoneNo, password } = req.body;

    if (!fullName || !email || !phoneNo || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await vendorModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashPassword = await bcrypt.hash(password, saltRounds);
    const serialNo = await generateSerialNumber("vendor");

    const createAcc = new vendorModel({
      serialNumber: serialNo,
      fullName,
      email,
      phoneNo,
      password: hashPassword
    });

    await createAcc.save();

    await AuditLog.create({
      user: createAcc._id,
      role: 'vendor',
      action: 'REGISTER_ACCOUNT',
      entity: 'Vendor',
      entityId: createAcc._id,
      metadata: {
        email: createAcc.email
      }
    });


    return res.status(201).json({
      success: true,
      message: 'User Account Created Successfully'
    });

  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await vendorModel.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const confirmPassword = await bcrypt.compare(password, user.password);

    if (!confirmPassword) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_KEY,
      { expiresIn: "7d" }
    );

    await AuditLog.create({
      user: user._id,
      role: 'vendor',
      action: 'LOG_IN',
      entity: 'Vendor',
      entityId: user._id,
      metadata: {
        email: user.email
      }
    });

    // const decoded = jwt.verify(token, process.env.JWT_KEY);
    // console.log(decoded);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token
    });


  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }
};

exports.logoutUser = async (req, res) => {
  try {

    if (req.user?._id) {
      const user = await vendorModel.findById(req.user._id).select('email');

      await AuditLog.create({
        user: req.user._id,
        role: 'vendor',
        action: 'LOG_OUT',
        entity: 'Vendor',
        entityId: req.user._id,
        metadata: {
          email: user.email
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: "Logout successful"
    });


  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Logout failed"
    });
  }
};

exports.getUsersDetails = async (req, res) => {
  try {
    const vendor = await vendorModel
      .findById(req.user._id)
      .select(`
        serialNumber
        username
        fullName
        email
        phoneNo
        profilePhoto
        country
        state
        businessAddress
        supportContact
        storeName
        storeDescription
        bannerImage
        socialLinks
        preferredLanguage
        notificationPreferencess
        bankName
        accountName
        accountNumber
      `);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        identity: {
          id: vendor._id,
          serialNumber: vendor.serialNumber,
          username: vendor.username,
          fullName: vendor.fullName,
          profilePhoto: vendor.profilePhoto
        },
        contact: {
          email: vendor.email,
          phoneNo: vendor.phoneNo,
          businessAddress: vendor.businessAddress,
          supportContact: vendor.supportContact
        },
        location: {
          country: vendor.country,
          state: vendor.state
        },
        store: {
          storeName: vendor.storeName,
          storeDescription: vendor.storeDescription,
          bannerImage: vendor.bannerImage
        },
        preferences: {
          preferredLanguage: vendor.preferredLanguage,
          notificationPreferencess: vendor.notificationPreferencess
        },
        socialLinks: vendor.socialLinks,
        payout: {
          bankName: vendor.bankName,
          accountName: vendor.accountName,
          accountNumber: vendor.accountNumber,
        }
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

exports.updateVendorProfile = async (req, res) => {
  try {
    // console.log("Decoded ID from token:", req.user._id);
    // console.log("Type of ID:", typeof req.user._id);

    const vendorId = req.user._id;

    const {
      username,
      fullName,
      country,
      state,
      email,
      phoneNo,
      address,
      password,
      supportContact,
      storeName,
      storeDescription,
      preferredLanguage,
      notificationPreferences,
      facebook,
      instagram,
      x
    } = req.body;

    const vendor = await vendorModel.findById(vendorId);
    // console.log("Vendor from DB:", vendor);

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Validate country
    if (country && !westAfricaCountries.includes(country)) {
      return res.status(400).json({ message: 'Invalid country' });
    }

    // Validate state
    if (country === 'Nigeria' && state && !nigeriaStates.includes(state)) {
      return res.status(400).json({ message: 'Invalid Nigerian state' });
    }

    // Update fields
    if (username) vendor.username = username;
    if (fullName) vendor.fullName = fullName;
    if (country) vendor.country = country;
    if (state) vendor.state = state;

    if (email) vendor.email = email;
    if (phoneNo) vendor.phoneNo = phoneNo;
    if (address) vendor.address = address;
    if (supportContact) vendor.supportContact = supportContact;

    if (storeName) vendor.storeName = storeName;
    if (storeDescription) vendor.storeDescription = storeDescription;

    if (preferredLanguage) vendor.preferredLanguage = preferredLanguage;
    if (notificationPreferences) vendor.notificationPreferences = notificationPreferences;

    // socialLinks
    vendor.socialLinks = {
      facebook: facebook || vendor.socialLinks?.facebook,
      instagram: instagram || vendor.socialLinks?.instagram,
      x: x || vendor.socialLinks?.x
    };

    // Password update
    if (password) {
      const hash = await bcrypt.hash(password, saltRounds);
      vendor.password = hash; // FIXED
    }

    // File uploads
    if (req.files?.profilePhoto) {
      vendor.profilePhoto = req.files.profilePhoto[0].path;
    }

    if (req.files?.bannerImage) {
      vendor.bannerImage = req.files.bannerImage[0].path;
    }

    await vendor.save();

    await AuditLog.create({
      user: vendor._id,
      role: 'vendor',
      action: 'UPDATE_ACCOUNT',
      entity: 'Vendor',
      entityId: vendor._id,
      metadata: {
        serialNumber: vendor.serialNumber,
        email: vendor.email,
        phoneNo: vendor.phoneNo
      }
    });

    res.json({
      message: 'Profile updated successfully',
      data: vendor
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const { name, description, category, price, originalPrice, stock, imageUrl } = req.body;

    if (!name || !category || !price || !stock) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled"
      });
    }

    // Handle image
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

    const product = await AddProduct.create({
      vendor: req.user._id,
      name,
      description,
      image,
      category,
      price: parsedPrice,
      originalPrice: originalPrice || parsedPrice,
      stock: parsedStock,
      status
    });

    await AuditLog.create({
      user: req.user._id,
      role: 'vendor',
      action: 'ADD_PRODUCT',
      entity: 'Product',
      entityId: product._id,
      metadata: {
        name: product.name,
        price: product.price
      }
    });


    return res.status(201).json({
      success: true,
      message: "Product added successfully",
      data: product
    });

  } catch (err) {
    console.error("ADD PRODUCT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
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
    console.error(err);
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
    console.error("GET ALL PRODUCTS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message
    });
  }
};

exports.updateProduct = async (req, res) => {
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

    // check ownership
    if (product.vendor.toString() !== vendorId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const { name, description, category, price, stock, imageUrl } = req.body;

    // update fields
    if (name) product.name = name;
    if (description) product.description = description;
    if (category) product.category = category;
    if (price) product.price = Number(price);
    if (stock) product.stock = Number(stock);
    if (imageUrl) product.imageUrl = imageUrl;

    // update status from stock
    if (stock !== undefined) {
      if (product.stock === 0) product.status = "out-of-stock";
      else if (product.stock <= 5) product.status = "low-in-stock";
      else product.status = "in-stock";
    }

    // update image if new one is uploaded
    if (req.file) {
      product.image = req.file.path;
    } else if (imageUrl) {
      product.image = imageUrl;
    }

    await product.save();

    await AuditLog.create({
      user: req.user._id,
      role: 'vendor',
      action: 'UPDATE_PRODUCT',
      entity: 'Product',
      entityId: product._id
    });


    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const vendorId = req.user?._id || req.userId;

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

    await product.deleteOne();

    await AuditLog.create({
      user: req.user._id,
      role: 'vendor',
      action: 'DELETE_PRODUCT',
      entity: 'Product',
      entityId: productId
    });


    return res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });

  } catch (err) {
    console.error("DELETE ERROR:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message
    });
  }
};

exports.saveVendorPayout = async (req, res) => {
  try {
    const userId = req.user._id;

    const {
      bankName,
      accountName,
      accountNumber,
    } = req.body;

    if (accountNumber.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Account number must be 10 digits'
      });
    }

    // Find vendor
    const vendor = await vendorModel.findById(userId);

    // Update fields
    if (bankName) vendor.bankName = bankName;
    if (accountName) vendor.accountName = accountName;
    if (accountNumber) vendor.accountNumber = accountNumber;

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    await vendor.save();

    await AuditLog.create({
      user: req.user._id,
      role: 'vendor',
      action: 'UPDATE_PAYOUT',
      entity: 'Vendor'
    });


    return res.status(200).json({
      success: true,
      message: 'Payout details saved successfully',
      data: vendor
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.getVendorOrders = async (req, res) => {
  try {
    const vendorId = req.user._id;

    const orders = await BuyerOrder.find({ vendor: vendorId })
      // const orders = await BuyerOrder.find({ "items.vendor": vendorId })
      .populate("buyer", "username email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });

  } catch (error) {
    console.error("Fetch Vendor Orders Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching vendor orders",
    });
  }
};

exports.getSingleVendorOrder = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { orderId } = req.params;

    const order = await BuyerOrder.findOne({
      _id: orderId,
      vendor: vendorId,
    })
      .populate("buyer", "username email")
      .populate("items.productId", "name image");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });

  } catch (error) {
    console.error("Fetch Single Vendor Order Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching order",
    });
  }
};

// confirm payment status
exports.vendorConfirmPayment = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    const allowed = ["paid", "failed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }

    const order = await BuyerOrder.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.payment.status = status;

    await order.save();

    await AuditLog.create({
      user: req.user._id,
      role: "vendor",
      action: "PAYMENT_STATUS_UPDATED",
      entity: "ORDER",
      entityId: orderId,
      metadata: {
        previousStatus: order.payment.status,
        newStatus: status,
        timestamp: Date.now()
      },
    });

    return res.json({
      message: "Payment status updated",
      payment: order.payment.status,
    });


  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// confirm order (pending → confirmed)
exports.vendorConfirmOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await BuyerOrder.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "pending") {
      return res.status(400).json({ message: "Order already processed" });
    }

    order.status = "confirmed";

    await order.save();

    await AuditLog.create({
      user: req.user._id,
      role: "vendor",
      action: "ORDER_CONFIRMED",
      entity: "ORDER",
      entityId: orderId,
      metadata: {
        previousStatus: order.status,
        newStatus: "confirmed",
        timestamp: Date.now()
      },
    });

    return res.json({
      message: "Order confirmed",
      status: order.status,
    });


  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// mark order as shipped (confirmed → shipped)
exports.vendorShipOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    
    const order = await BuyerOrder.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "confirmed") {
      return res.status(400).json({ message: "Order must be confirmed first" });
    }

    order.status = "shipped";

    await order.save();

    await AuditLog.create({
      user: req.user._id,
      role: "vendor",
      action: "ORDER_SHIPPED",
      entity: "ORDER",
      entityId: orderId,
      metadata: {
        previousStatus: order.status,
        newStatus: "shipped",
        timestamp: Date.now()
      },
    });

    return res.json({
      message: "Order marked as shipped",
      status: order.status,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getVendorAnalytics = async (req, res) => {
  try {
    const vendorId = req.user._id;

    // 1. Get products
    const products = await AddProduct.find({ vendor: vendorId });

    // 2. Get orders (only those linked to this vendor)
    const orders = await Order.find({ vendor: vendorId }).sort({ createdAt: -1 });

    // 3. Calculate stats
    const totalOrders = orders.length;

    const totalSales = orders.reduce((acc, order) => {
      return acc + order.totalAmount;
    }, 0);

    const completedOrders = orders.filter(o => o.status === "completed").length;

    const avgOrderValue = totalOrders > 0
      ? totalSales / totalOrders
      : 0;

    const completionRate = totalOrders > 0
      ? (completedOrders / totalOrders) * 100
      : 0;

    // 4. Get top products (simple version)
    const topProducts = products
      .slice(0, 5); // improve later with sales count

    // 5. Recent orders
    const recentOrders = orders.slice(0, 5);

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalSales,
          totalOrders,
          avgOrderValue,
          completionRate
        },
        recentOrders,
        topProducts
      }
    });

  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.getVendorActivities = async (req, res) => {
  try {
    const logs = await AuditLog.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(3);

    if (!logs || logs.length === 0) {
      return res.status(200).json({
        success: true,
        data: logs || []
      });
    }

    res.status(200).json({
      success: true,
      data: logs
    });

  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch activities'
    });
  }
};