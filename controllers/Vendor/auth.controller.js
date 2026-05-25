const logger = require('../../logger');
const vendorModel = require('../../models/vendor.model');
const AuditLog = require('../../models/auditLog.model')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateSerialNumber } = require('../../utils/generateSerial');
const { westAfricaCountries, nigeriaStates } = require("../../utils/location");
const { validationResult } = require('express-validator');
const VendorDTO = require('../../dtos/vendor.dto');
const AddProduct = require('../../models/addproduct.model');
const notificationService = require('../../services/notification/notification.service');
const { sendSuccess, sendError } = require('../../utils/responseStruture');
const mongoose = require("mongoose");

const saltRounds = 10;

exports.createUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await session.abortTransaction();
      return sendError(res, 400, 'Validation failed', errors.array());
    }
    const { fullName, email, phoneNo, password } = req.body;

    if (!fullName || !email || !phoneNo || !password) {
      await session.abortTransaction();
      return sendError(res, 400, 'All fields are required');
    }

    const existingUser = await vendorModel.findOne({ email });
    if (existingUser) {
      await session.abortTransaction();
      return sendError(res, 400, 'User already exists');
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

    await createAcc.save({ session });

    await AuditLog.create([
      {
      user: createAcc._id,
      role: 'vendor',
      action: 'REGISTER_ACCOUNT',
      entity: 'Vendor',
      entityId: createAcc._id,
      metadata: {
        email: createAcc.email
      }
    }
    ], { session });

    await session.commitTransaction();

    return sendSuccess(res, 201, 'User Account Created Successfully');
  } catch (err) {
    await session.abortTransaction();
    logger.error(err);
    return sendError(res, 500, 'Internal Server Error');
  } finally {
    session.endSession();
  }
};

exports.loginUser = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Email and password are required');
    }

    session.startTransaction();

    const user = await vendorModel.findOne({ email }).session(session);

    if (!user) {
      await session.abortTransaction();
      return sendError(res, 400, 'Invalid credentials');
    }

    const confirmPassword = await bcrypt.compare(password, user.password);

    if (!confirmPassword) {
      await session.abortTransaction();
      return sendError(res, 400, 'Invalid credentials');
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_KEY,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    await AuditLog.create([
      {
        user: user._id,
        role: 'vendor',
        action: 'LOG_IN',
        entity: 'Vendor',
        entityId: user._id,
        metadata: {
          email: user.email
        }
      }
    ], { session });

    await session.commitTransaction();

    if (!user.profileUpdateNotificationSent) {
      await notificationService.safeCreateProfileUpdateNotification({
        userId: user._id,
        role: 'vendor'
      });

      await vendorModel.updateOne(
        { _id: user._id },
        { $set: { profileUpdateNotificationSent: true } }
      );
    }

    return sendSuccess(res, 200, 'Login successful', {
      user: VendorDTO.authUser(user),
      accessToken: token,
      refreshToken,
      expiresIn: 86400
    });

  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    logger.error(err);
    return sendError(res, 500, 'Internal Server Error');
  } finally {
    session.endSession();
  }
};

exports.logoutUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {

    if (req.user?._id) {
      const user = await vendorModel.findById(req.user._id).select('email').session(session);

      await AuditLog.create([
        {
        user: req.user._id,
        role: 'vendor',
        action: 'LOG_OUT',
        entity: 'Vendor',
        entityId: req.user._id,
        metadata: {
          email: user.email
        }
      }
      ], { session });
    }

    await session.commitTransaction();

    return sendSuccess(res, 200, 'Logout successful');

  } catch (err) {
    await session.abortTransaction();
    return sendError(res, 500, 'Logout failed');
  } finally {
    session.endSession()
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
      return sendError(res, 404, 'User not found');
    }

    return sendSuccess(res, 200, 'Vendor profile fetched successfully', VendorDTO.fromModel(vendor));

  } catch (err) {
    logger.error(err);
    return sendError(res, 500, 'Internal Server Error');
  }
};

exports.updateVendorProfile = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

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

    const vendor = await vendorModel.findById(vendorId).session(session);

    if (!vendor) {
      await session.abortTransaction();
      return sendError(res, 404, 'Vendor not found');
    }

    if (country && !westAfricaCountries.includes(country)) {
      await session.abortTransaction();
      return sendError(res, 400, 'Invalid country');
    }

    if (country === 'Nigeria' && state && !nigeriaStates.includes(state)) {
      await session.abortTransaction();
      return sendError(res, 400, 'Invalid Nigerian state');
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

    await vendor.save({ session });

    await AuditLog.create([
      {
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
    }
    ], { session });

    await session.commitTransaction();

    return sendSuccess(res, 200, 'Profile updated successfully', VendorDTO.fromModel(vendor));

  } catch (error) {
    await session.abortTransaction();
    logger.error(error);
    return sendError(res, 500, 'Server error');
  } finally {
    session.endSession()
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
      return sendError(res, 404, 'Vendor not found');
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

    return sendSuccess(res, 200, 'Vendor details fetched successfully', {
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
    return sendError(res, 500, 'Internal Server Error', err.message);
  }
};