const logger = require('../../logger');
const vendorModel = require('../../models/vendor.model');
const AuditLog = require('../../models/auditLog')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateSerialNumber } = require('../../utils(copy)/generateSerial');
const { westAfricaCountries, nigeriaStates } = require("../../utils(copy)/location");
const { validationResult } = require('express-validator');
const VendorDTO = require('../../dtos/vendor.dto');

const saltRounds = 10;

exports.createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
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
    logger.error(err);
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
      { id: user._id, role: user.role },
      process.env.JWT_KEY,
      { expiresIn: "24h" }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
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

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: VendorDTO.authUser(user),
      accessToken: token,
      refreshToken: refreshToken,
      expiresIn: 86400  // 24 hours in seconds
    });


  } catch (err) {
    logger.error(err);
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
      data: VendorDTO.fromModel(vendor)
    });

  } catch (err) {
    logger.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

exports.updateVendorProfile = async (req, res) => {
  try {
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

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    if (country && !westAfricaCountries.includes(country)) {
      return res.status(400).json({ message: 'Invalid country' });
    }

    if (country === 'Nigeria' && state && !nigeriaStates.includes(state)) {
      return res.status(400).json({ message: 'Invalid Nigerian state' });
    }

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

    vendor.socialLinks = {
      facebook: facebook || vendor.socialLinks?.facebook,
      instagram: instagram || vendor.socialLinks?.instagram,
      x: x || vendor.socialLinks?.x
    };

    if (password) {
      const hash = await bcrypt.hash(password, saltRounds);
      vendor.password = hash;
    }

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
      data: VendorDTO.fromModel(vendor)
    });

  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getVendorDetails = async (req, res) => {
  try {
    const { id: vendorId } = req.params;
    const { category, status, sortBy } = req.query;

    const filterQuery = { vendor: vendorId };

    if (category) filterQuery.category = category;
    if (status) filterQuery.status = status;

    let sortQuery = { createdAt: -1 };

    if (sortBy === 'price-asc') sortQuery = { price: 1 };
    if (sortBy === 'price-desc') sortQuery = { price: -1 };
    if (sortBy === 'newest') sortQuery = { createdAt: -1 };
    if (sortBy === 'stock') sortQuery = { stock: -1 };

    const vendordetails = await vendorModel.findById(vendorId).select(
      "serialNumber fullName storeName storeDescription profilePhoto bannerImage country state email phoneNo socialLinks rating reviews isVerified"
    );

    if (!vendordetails) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }

    const products = await AddProduct.find(filterQuery).sort(sortQuery);

    const productList = products.map(product => ({
      id: product._id,
      name: product.name,
      description: product.description,
      image: product.image,
      category: product.category,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.originalPrice
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0,
      stock: product.stock,
      status: product.status,
      createdAt: product.createdAt
    }));

    return res.status(200).json({
      success: true,
      count: products.length,
      vendorInfo: {
        id: vendordetails._id,
        serialNumber: vendordetails.serialNumber,
        fullName: vendordetails.fullName,
        storeName: vendordetails.storeName,
        storeDescription: vendordetails.storeDescription,
        profilePhoto: vendordetails.profilePhoto,
        bannerImage: vendordetails.bannerImage,
        country: vendordetails.country,
        state: vendordetails.state,
        email: vendordetails.email,
        phoneNo: vendordetails.phoneNo,
        socialLinks: vendordetails.socialLinks
      },
      products: productList
    });

  } catch (err) {
    logger.error("GET VENDOR PRODUCT DETAILS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message
    });
  }
};