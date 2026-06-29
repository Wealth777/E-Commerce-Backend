const logger = require('../../logger');
const buyerModel = require('../../models/buyer.model');
const AuditLog = require('../../models/auditLog.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateSerialNumber } = require('../../utils/generateSerial');
const { validationResult } = require('express-validator');
const notificationService = require('../../services/notification/notification.service')
const School = require("../../models/school.model");

const { default: mongoose } = require('mongoose');
const { sendResponse, sendSuccess, sendError } = require('../../utils/responseStruture');
const BuyerDTO = require('../../dtos/buyer.dto');
const { verifyGoogleToken } = require('../../services/googleAuth.service');

const saltRounds = 10;

const validatePassword = (password) => {
  const errors = [];

  if (password.length < 8) errors.push('At least 8 characters required');
  if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter required');
  if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter required');
  if (!/[0-9]/.test(password)) errors.push('At least one number required');
  if (!/[!@#$%^&*]/.test(password)) errors.push('At least one special character required');

  return errors;
};

exports.createUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await session.abortTransaction();
      return sendError(res, 400, 'Validation failed', errors.array());
    }
    const { fullName, email, phoneNo, school, state, password } = req.body;

    if (!fullName || !email || !phoneNo || !school || !state || !password) {
      await session.abortTransaction();
      return sendResponse(res, 400, false, "All fields are required");
    }

    const existingUser = await buyerModel.findOne({ email }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      logger.info('User already exist')
      return sendResponse(res, 400, false, 'User already exist... Try to login or use another ID(email)');
    };

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      await session.abortTransaction();
      return sendError(res, 400, 'Password does not meet requirements', passwordErrors);
    }

    const hashPassword = await bcrypt.hash(password, saltRounds);

    const serialNo = await generateSerialNumber("buyer", session);

    const createAcc = new buyerModel({
      serialNumber: serialNo,
      fullName,
      email,
      phoneNo,
      school,
      state,
      password: hashPassword,
      onboardingCompleted: true
    });

    await createAcc.save({ session });

    await AuditLog.create([{
      user: createAcc._id,
      role: 'buyer',
      action: 'REGISTER_ACCOUNT',
      entity: 'Buyer',
      entityId: createAcc._id,
      metadata: {
        email: createAcc.email
      }
    }], { session });

    await session.commitTransaction();

    sendResponse(res, 201, true, '🎉 User Account Created Successfully!.')
  } catch (err) {
    await session.abortTransaction();
    logger.error(err);
    sendResponse(res, 500, false, 'Internal Server Error')
  } finally {
    session.endSession();
  };
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

    const user = await buyerModel.findOne({ email }).session(session);

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

    await AuditLog.create([{
      user: user._id,
      role: 'buyer',
      action: 'LOG_IN',
      entity: 'Buyer',
      entityId: user._id,
      metadata: { email: user.email },
    }], { session });

    if (!user.profileUpdateNotificationSent) {
      try {
        await notificationService.safeCreateProfileUpdateNotification({
          userId: user._id,
          role: 'buyer'
        });

        await buyerModel.findByIdAndUpdate(
          // user._id,
          { id: user._id },
          { $set: { profileUpdateNotificationSent: true } },
          { session }
        );
      } catch (e) {
        logger.error(e);
      }
    }

    const responseData = {
      user: BuyerDTO.fromModel(user),
      accessToken,
      refreshToken,
      expiresIn: 86400,
    };

    await session.commitTransaction();

    return sendSuccess(res, 200, 'Login successful', responseData);

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

exports.googleLogin = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { idToken } = req.body;

    if (!idToken) {
      await session.abortTransaction();
      return sendError(res, 400, 'idToken required');
    }

    const payload = await verifyGoogleToken(idToken);

    if (!payload) {
      await session.abortTransaction();
      return sendError(res, 401, 'Invalid Google token');
    }

    const { email, name, picture, sub: googleId } = payload;

    let user = await buyerModel.findOne({ email }).session(session);

    if (!user) {
      const serialNo = await generateSerialNumber("buyer", session);

      user = await buyerModel.create([{
        serialNumber: serialNo,
        email,
        fullName: name,
        profilePhoto: picture,
        googleId,
        isEmailVerified: true,
        role: 'buyer',
        onboardingCompleted: false,
      }], { session });

      user = user[0];
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

    await AuditLog.create([{
      user: user._id,
      role: 'buyer',
      action: 'GOOGLE_LOGIN',
      entity: 'Buyer',
      entityId: user._id,
      metadata: { email: user.email }
    }], { session });

    if (!user.profileUpdateNotificationSent) {
      try {
        await notificationService.safeCreateProfileUpdateNotification({
          userId: user._id,
          role: 'buyer'
        });

        await buyerModel.findByIdAndUpdate(
          // user._id,
          { id: user._id },
          { $set: { profileUpdateNotificationSent: true } },
          { session }
        );
      } catch (e) {
        logger.error(e);
      }
    }

    const responseData = {
      user: BuyerDTO.fromModel(user),
      accessToken,
      refreshToken,
      expiresIn: 86400,
      onboardingCompleted: user.onboardingCompleted,
    };

    await session.commitTransaction();

    return sendSuccess(res, 200, 'Google login successful', responseData);

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    logger.error(error);
    return sendError(res, 401, 'Google authentication failed');
  } finally {
    session.endSession();
  }
};

exports.logoutUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    if (req.user?._id) {
      const user = await buyerModel.findById(req.user._id).select('email').session(session);

      await AuditLog.create([{
        user: req.user._id,
        role: 'buyer',
        action: 'LOG_OUT',
        entity: 'Buyer',
        entityId: req.user._id,
        metadata: {
          email: user.email
        }
      }], { session });
    };

    await session.commitTransaction();

    return sendSuccess(res, 200, 'Logout successful');
  } catch (err) {
    await session.abortTransaction();
    logger.error('Error occured', err)
    return sendError(res, 500, 'Logout failed');
  } finally {
    session.endSession();
  };
};

exports.getUsersDetails = async (req, res) => {
  try {
    const buyer = await buyerModel
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
        school
        state
        address
        preferredLanguage
        notificationPreference
      `);

    if (!buyer) {
      return sendError(res, 404, 'User not found');
    }

    return sendSuccess(res, 200, 'Buyer profile fetched successfully', BuyerDTO.fromModel(buyer));

  } catch (err) {
    logger.error(err);
    return sendError(res, 500, 'Internal Server Error');
  }
};

exports.updateBuyerProfile = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const buyerId = req.user._id;

    const {
      username,
      fullName,
      country,
      state,
      address,
      email,
      phoneNo,
      preferredLanguage,
      notificationPreference,
    } = req.body;

    const buyer = await buyerModel
      .findById(buyerId)
      .populate("school", "name type")
      .populate("state", "name type");

    if (!buyer) {
      await session.abortTransaction();
      return sendError(res, 404, 'Buyer not found');
    }

    if (username) buyer.username = username;
    if (fullName) buyer.fullName = fullName;
    if (country) buyer.country = country;
    if (state) buyer.state = state;
    if (address) buyer.address = address;

    if (email) buyer.email = email;
    if (phoneNo) buyer.phoneNo = phoneNo;
    if (address) buyer.address = address;

    if (preferredLanguage) buyer.preferredLanguage = preferredLanguage;
    if (notificationPreference) buyer.notificationPreference = notificationPreference;

    if (req.files?.profilePhoto) {
      buyer.profilePhoto = req.files.profilePhoto[0].path;
    }

    await buyer.save();

    await AuditLog.create([{
      user: buyer._id,
      role: 'buyer',
      action: 'UPDATE_ACCOUNT',
      entity: 'Buyer',
      entityId: buyer._id,
      metadata: {
        serialNumber: buyer.serialNumber,
        email: buyer.email,
        phoneNo: buyer.phoneNo
      }
    }], { session });

    await session.commitTransaction();

    return sendSuccess(res, 200, 'Profile updated successfully', BuyerDTO.fromModel(buyer));

  } catch (error) {
    await session.abortTransaction();
    logger.error(error);
    return sendError(res, 500, 'Server error');
  } finally {
    session.endSession();
  }
};

exports.completeBuyerProfile = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const buyerId = req.user._id;

    const {
      school,
      state,
      phoneNo,
    } = req.body;

    if (!school || !state || !phoneNo) {
      await session.abortTransaction();

      return sendError(
        res,
        400,
        "School, state and phone number are required"
      );
    }

    const buyer = await buyerModel
      .findById(buyerId)
      .session(session);

    if (!buyer) {
      await session.abortTransaction();

      return sendError(
        res,
        404,
        "Buyer not found"
      );
    }

    if (buyer.onboardingCompleted) {
      await session.abortTransaction();

      return sendError(
        res,
        400,
        "Profile onboarding already completed"
      );
    }

    const schoolRecord = await School.findOne({
      _id: school,
      type: "school",
      isActive: true,
      status: "approved",
    }).session(session);

    if (!schoolRecord) {
      await session.abortTransaction();

      return sendError(
        res,
        404,
        "Selected school does not exist"
      );
    }

    const stateRecord = await School.findOne({
      _id: state,
      type: "state",
      isActive: true,
      status: "approved",
      parent: school,
    }).session(session);

    if (!stateRecord) {
      await session.abortTransaction();

      return sendError(
        res,
        400,
        "Selected state does not belong to the selected school"
      );
    }

    const existingPhone = await buyerModel.findOne({
      phoneNo,
      _id: { $ne: buyerId },
    }).session(session);

    if (existingPhone) {
      await session.abortTransaction();

      return sendError(
        res,
        409,
        "Phone number already exists"
      );
    }

    buyer.school = schoolRecord._id;
    buyer.state = stateRecord._id;
    buyer.phoneNo = phoneNo;
    buyer.onboardingCompleted = true;

    await buyer.save({ session });

    await AuditLog.create(
      [
        {
          user: buyer._id,
          role: "buyer",
          action: "COMPLETE_PROFILE",
          entity: "Buyer",
          entityId: buyer._id,
          metadata: {
            school: schoolRecord.name,
            state: stateRecord.name,
            phoneNo,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    const populatedBuyer = await buyerModel
      .findById(buyer._id)
      .populate("school", "name type")
      .populate("state", "name type");

    return sendSuccess(
      res,
      200,
      "Profile completed successfully",
      BuyerDTO.fromModel(populatedBuyer)
    );
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error(error);

    return sendError(
      res,
      500,
      "Failed to complete profile"
    );
  } finally {
    session.endSession();
  }
};