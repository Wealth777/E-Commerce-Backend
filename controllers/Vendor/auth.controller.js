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
const Order = require("../../models/buyerOrder.model");
const notificationService = require('../../services/notification/notification.service');
const { sendSuccess, sendError } = require('../../utils/responseStruture');
const mongoose = require("mongoose");
const { verifyGoogleToken } = require('../../services/googleAuth.service');

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

    const existingUser = await vendorModel.findOne({ email }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      return sendError(res, 400, 'User already exists');
    }

    const hashPassword = await bcrypt.hash(password, saltRounds);
    const serialNo = await generateSerialNumber("vendor", session);

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
  session.startTransaction();

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      await session.abortTransaction();
      return sendError(res, 400, 'Email and password are required');
    }

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

    const accessToken = jwt.sign(
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
          email: user?.email || null
        }
      }
    ], { session });

    if (!user.profileUpdateNotificationSent) {
      await notificationService.safeCreateProfileUpdateNotification({
        userId: user._id,
        role: 'vendor'
      });

      await vendorModel.findByIdAndUpdate(
        user._id,
        { $set: { profileUpdateNotificationSent: true } },
        { session }
      );
    }

    await session.commitTransaction();

    return sendSuccess(res, 200, 'Login successful', {
      user: VendorDTO.authUser(user),
      accessToken,
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
        role
        fullName
        email
        phoneNo
        onboardingCompleted
        onboardingCompletedAt

        student.profilePhoto
        student.gender
        student.institution
        student.state
        student.matricNumber
        student.faculty
        student.department
        student.level
        student.residence
        student.address

        business.storeName
        business.type
        business.description
        business.logo
        business.banner
        business.socials

        verificationDocuments

        bankDetails.bankName
        bankDetails.accountName
        bankDetails.accountNumber

        notificationPreference

        isVerified
        verificationStatus
        accountStatus
        isActive

        createdAt
        updatedAt
      `)
      .populate("student.institution", "name")
      .populate("student.state", "name");

    if (!vendor) {
      return sendError(res, 404, "Vendor not found");
    }

    return sendSuccess(
      res,
      200,
      "Vendor profile fetched successfully",
      VendorDTO.fromModel(vendor)
    );
  } catch (err) {
    logger.error(err);
    return sendError(res, 500, "Internal Server Error");
  }
};

exports.updateVendorProfile = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vendor = await vendorModel
      .findById(req.user._id)
      .session(session);

    if (!vendor) {
      await session.abortTransaction();
      return sendError(res, 404, "Vendor not found");
    }

    const { fullName } = req.body;

    if (fullName) {
      vendor.fullName = fullName.trim();
    }

    if (req.body.business) {
      const business =
        typeof req.body.business === "string"
          ? JSON.parse(req.body.business)
          : req.body.business;

      vendor.business.storeName =
        business.storeName ?? vendor.business.storeName;

      vendor.business.type =
        business.type ?? vendor.business.type;

      vendor.business.description =
        business.description ?? vendor.business.description;

      vendor.business.socials = {
        facebook:
          business.socials?.facebook ??
          vendor.business.socials?.facebook,

        instagram:
          business.socials?.instagram ??
          vendor.business.socials?.instagram,

        whatsapp:
          business.socials?.whatsapp ??
          vendor.business.socials?.whatsapp,

        tiktok:
          business.socials?.tiktok ??
          vendor.business.socials?.tiktok,
      };
    }

    if (req.files?.["student.profilePhoto"]) {
      vendor.student.profilePhoto =
        req.files["student.profilePhoto"][0].path;
    }

    if (req.files?.["business.logo"]) {
      vendor.business.logo =
        req.files["business.logo"][0].path;
    }

    if (req.files?.["business.banner"]) {
      vendor.business.banner =
        req.files["business.banner"][0].path;
    }

    await vendor.save({ session });

    await AuditLog.create(
      [
        {
          user: vendor._id,
          role: "vendor",
          action: "UPDATE_ACCOUNT",
          entity: "Vendor",
          entityId: vendor._id,
          metadata: {
            serialNumber: vendor.serialNumber,
            email: vendor.email,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return sendSuccess(
      res,
      200,
      "Profile updated successfully",
      VendorDTO.fromModel(vendor)
    );
  } catch (error) {
    await session.abortTransaction();
    logger.error(error);

    return sendError(res, 500, "Server error");
  } finally {
    session.endSession();
  }
};

exports.getVendorDetails = async (req, res) => {
  try {
    const { id: vendorId } = req.params;
    const { category, status, sortBy } = req.query;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return sendError(res, 400, 'Invalid vendor ID');
    }

    const vendorDetails = await vendorModel
      .findById(vendorId)
      .select(
        'serialNumber fullName storeName storeDescription profilePhoto bannerImage country state email phoneNo socialLinks rating reviews isVerified'
      )
      .lean();

    if (!vendorDetails) {
      return sendError(res, 404, 'Vendor not found');
    }

    const filterQuery = {
      vendor: vendorId,
    };

    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return sendError(res, 400, 'Invalid category ID');
      }

      filterQuery.$or = [
        { category },
        { subCategory: category },
      ];
    }

    if (status) {
      filterQuery.status = status;
    }

    let sortQuery = { createdAt: -1 };

    if (sortBy === 'price-asc') {
      sortQuery = { price: 1 };
    }

    if (sortBy === 'price-desc') {
      sortQuery = { price: -1 };
    }

    if (sortBy === 'stock') {
      sortQuery = { stock: -1 };
    }

    const products = await AddProduct.find(filterQuery)
      .populate(
        'vendor',
        'storeName businessName fullName profilePhoto country state'
      )
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .sort(sortQuery)
      .lean();

    const productList = products.map((product) => {
      const originalPrice = Number(product.originalPrice || 0);
      const price = Number(product.price || 0);

      return {
        _id: product._id,
        id: product._id,

        name: product.name,
        description: product.description,
        image: product.image,

        category: product.category || null,
        subCategory: product.subCategory || null,

        categoryName:
          product.category?.name || 'General',

        subCategoryName:
          product.subCategory?.name || '',

        vendor: product.vendor || null,

        vendorName:
          product.vendor?.storeName ||
          product.vendor?.businessName ||
          product.vendor?.fullName ||
          vendorDetails.storeName ||
          'Unknown vendor',

        price,
        originalPrice,

        discount:
          originalPrice > price && originalPrice > 0
            ? Math.round(((originalPrice - price) / originalPrice) * 100)
            : 0,

        stock: Number(product.stock || 0),
        status: product.status,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });

    return sendSuccess(res, 200, 'Vendor details fetched successfully', {
      count: productList.length,

      vendorInfo: {
        id: vendorDetails._id,
        _id: vendorDetails._id,
        serialNumber: vendorDetails.serialNumber,
        fullName: vendorDetails.fullName,
        storeName: vendorDetails.storeName,
        storeDescription: vendorDetails.storeDescription,
        profilePhoto: vendorDetails.profilePhoto,
        bannerImage: vendorDetails.bannerImage,
        country: vendorDetails.country,
        state: vendorDetails.state,
        email: vendorDetails.email,
        phoneNo: vendorDetails.phoneNo,
        socialLinks: vendorDetails.socialLinks,
        rating: vendorDetails.rating,
        reviews: vendorDetails.reviews,
        isVerified: vendorDetails.isVerified,
      },

      products: productList,
    });
  } catch (err) {
    logger.error('GET VENDOR DETAILS ERROR:', err);
    return sendError(res, 500, 'Internal Server Error', err.message);
  }
};

exports.completeOnboarding = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      await session.abortTransaction();
      return sendError(res, 400, "Validation failed", errors.array());
    }

    const vendorId = req.user._id;

    const student =
      typeof req.body.student === "string"
        ? JSON.parse(req.body.student)
        : req.body.student;

    const business =
      typeof req.body.business === "string"
        ? JSON.parse(req.body.business)
        : req.body.business;

    const verificationDocuments =
      typeof req.body.verificationDocuments === "string"
        ? JSON.parse(req.body.verificationDocuments)
        : req.body.verificationDocuments;

    const terms =
      typeof req.body.terms === "string"
        ? JSON.parse(req.body.terms)
        : req.body.terms;


    const vendor = await vendorModel.findById(vendorId).session(session);

    if (!vendor) {
      await session.abortTransaction();
      return sendError(res, 404, "Vendor not found");
    }

    if (vendor.onboardingCompleted) {
      await session.abortTransaction();
      return sendError(
        res,
        409,
        "Vendor onboarding has already been completed"
      );
    }

    const profilePhoto =
      req.files?.profilePhoto?.[0]?.path || vendor.student?.profilePhoto;

    const businessLogo =
      req.files?.businessLogo?.[0]?.path || vendor.business?.logo;

    const schoolIdCard =
      req.files?.schoolIdCard?.[0]?.path ||
      vendor.verificationDocuments?.schoolIdCard;

    const nationalId =
      req.files?.nationalId?.[0]?.path ||
      vendor.verificationDocuments?.nationalId;

    if (!profilePhoto) {
      await session.abortTransaction();
      return sendError(res, 400, "Profile photo is required");
    }

    if (!schoolIdCard) {
      await session.abortTransaction();
      return sendError(res, 400, "School ID card is required");
    }

    if (!nationalId) {
      await session.abortTransaction();
      return sendError(res, 400, "National ID is required");
    }

    vendor.student = {
      profilePhoto,
      gender: student.gender,
      institution: student.institution,
      state: student.state,
      matricNumber: student.matricNumber,
      faculty: student.faculty,
      department: student.department,
      level: student.level,
      residence: student.residence,
      address: student.address,
    };

    vendor.business = {
      storeName: business.storeName,
      type: business.type,
      description: business.description,
      logo: businessLogo,
      socials: {
        facebook: business.socials?.facebook || null,
        instagram: business.socials?.instagram || null,
        whatsapp: business.socials?.whatsapp || null,
        tiktok: business.socials?.tiktok || null,
      },
    };

    vendor.verificationDocuments = {
      schoolIdCard,
      nationalId,
    };

    vendor.terms = {
      acceptedVendorTerms: terms.acceptedVendorTerms,
      acceptedMarketplacePolicy: terms.acceptedMarketplacePolicy,
      acceptedFraudPolicy: terms.acceptedFraudPolicy,
      acceptedAt: terms.acceptedAt || new Date(),
    };

    vendor.onboardingCompleted = true;
    vendor.onboardingCompletedAt = new Date();

    await vendor.save({ session });

    await AuditLog.create(
      [
        {
          user: vendor._id,
          role: "vendor",
          action: "COMPLETE_ONBOARDING",
          entity: "Vendor",
          entityId: vendor._id,
          metadata: {
            serialNumber: vendor.serialNumber,
            institution: student.institution,
            matricNumber: student.matricNumber,
            businessName: business.storeName,
            businessType: business.type,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return sendSuccess(
      res,
      200,
      "Vendor onboarding completed successfully. Your account is awaiting verification.",
      VendorDTO.fromModel(vendor)
    );
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    logger.error(err);

    return sendError(res, 500, "Internal Server Error");
  } finally {
    session.endSession();
  }
};

exports.suspendVendorAccount = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { reason } = req.body;
    const vendorId = req.user._id;

    const vendor = await vendorModel
      .findById(vendorId)
      .session(session);

    if (!vendor) {
      await session.abortTransaction();
      return sendError(res, 404, "Vendor not found");
    }

    if (vendor.accountStatus === "suspended") {
      await session.abortTransaction();
      return sendError(res, 409, "Account is already suspended.");
    }

    if (vendor.accountStatus === "deleted") {
      await session.abortTransaction();
      return sendError(res, 409, "Deleted accounts cannot be suspended.");
    }

    const pendingOrder = await Order.exists({
      vendor: vendorId,
      orderStatus: {
        $in: [
          "pending",
          "confirmed",
          "shipped"
        ]
      }
    }).session(session);

    if (pendingOrder) {
      await session.abortTransaction();

      return sendError(
        res,
        400,
        "Finalize all pending orders before suspending account."
      );
    }

    vendor.accountStatus = "suspended";
    vendor.isActive = false;
    vendor.suspendReason = reason?.trim() || null;
    vendor.suspendDate = new Date();

    await vendor.save({ session });

    await AuditLog.create([
      {
        user: vendor._id,
        role: "vendor",
        action: "SUSPEND_ACCOUNT",
        entity: "Vendor",
        entityId: vendor._id,
        metadata: {
          serialNumber: vendor.serialNumber,
          email: vendor.email,
          reason: vendor.suspendReason
        }
      }
    ], { session });

    await session.commitTransaction();
    return sendSuccess(
      res,
      200,
      "Account suspended successfully."
    );
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    logger.error(err);
    return sendError(
      res,
      500,
      "Internal Server Error"
    );
  } finally {
    session.endSession();
  }
};

exports.reactivateVendorAccount = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const vendorId = req.user._id;

    const vendor = await vendorModel
      .findById(vendorId)
      .session(session);

    if (!vendor) {
      await session.abortTransaction();
      return sendError(res, 404, "Vendor not found");
    }

    if (vendor.accountStatus !== "suspended") {
      await session.abortTransaction();
      return sendError(
        res,
        400,
        "Account is not suspended."
      );
    }

    vendor.accountStatus = "active";
    vendor.isActive = true;
    vendor.suspendReason = null;
    vendor.suspendDate = null;
    vendor.reactivatedAt = new Date();

    await vendor.save({ session });

    await AuditLog.create([
      {
        user: vendor._id,
        role: "vendor",
        action: "REACTIVATE_ACCOUNT",
        entity: "Vendor",
        entityId: vendor._id,
        metadata: {
          serialNumber: vendor.serialNumber,
          email: vendor.email
        }
      }
    ], { session });

    await session.commitTransaction();
    return sendSuccess(
      res,
      200,
      "Account reactivated successfully."
    );
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    logger.error(err);
    return sendError(
      res,
      500,
      "Internal Server Error"
    );
  } finally {
    session.endSession();
  }
};

exports.VendorDeleteAccount = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { reason } = req.body;
    const vendorId = req.user._id;

    const vendor = await vendorModel
      .findById(vendorId)
      .session(session);

    if (!vendor) {
      await session.abortTransaction();
      return sendError(res, 404, "Vendor not found");
    }

    if (vendor.deleted) {
      await session.abortTransaction();
      return sendError(res, 409, "Vendor account has already been deleted");
    }

    // Additional deletion metadata
    vendor.isDeleted = true;
    vendor.deleteReason = reason?.trim() || null;
    vendor.deleteDate = new Date();
    vendor.isActive = false
    vendor.accountStatus = 'deleted'

    // Soft delete plugin fields
    vendor.deleted = true;
    vendor.deletedAt = new Date();
    vendor.deletedBy = vendor._id;
    vendor.deletedByModel = "Vendor";

    await vendor.save({ session });

    await AuditLog.create(
      [
        {
          user: vendor._id,
          role: "vendor",
          action: "DELETE_ACCOUNT",
          entity: "Vendor",
          entityId: vendor._id,
          metadata: {
            serialNumber: vendor.serialNumber,
            email: vendor.email,
            reason: reason?.trim() || null,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return sendSuccess(
      res,
      200,
      "Your account has been deleted successfully."
    );
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    logger.error(err);

    return sendError(res, 500, "Internal Server Error");
  } finally {
    await session.endSession();
  }
};