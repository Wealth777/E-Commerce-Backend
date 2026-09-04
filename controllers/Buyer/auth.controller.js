const { default: mongoose } = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const logger = require('../../logger');

const buyerModel = require('../../models/buyer.model');
const School = require("../../models/school.model");
const AuditLog = require('../../models/auditLog.model');
const bcrypt = require('bcrypt');
const LoginHistory = require("../../models/loginHistory.model");

const BuyerDTO = require('../../dtos/buyer.dto');

const emailService = require("../../services/email.service");
const notificationService = require('../../services/notification/notification.service')
const verificationTokenService = require("../../services/verificationToken.service");
const { verifyGoogleToken } = require('../../services/googleAuth.service');
const { generateSerialNumber } = require('../../utils/generateSerial');

const { sendSuccess, sendError } = require('../../utils/responseStruture');
const getRequestInfo = require("../../utils/getRequestHelper");

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
      return sendError(res, 400, false, "All fields are required");
    }

    const existingUser = await buyerModel.findOne({ email }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      logger.info('User already exist')
      return sendError(res, 400, false, 'User already exist... Try to login or use another ID(email)');
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

    const verificationToken =
      await verificationTokenService.create(
        createAcc._id,
        "Buyer"
      );

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

    try {
      await emailService.sendVerificationEmail({
        email: createAcc.email,
        name: createAcc.fullName,
        verificationToken: verificationToken.token,
      });
    } catch (emailError) {
      logger.error("Verification email failed", {
        user: createAcc._id,
        email: createAcc.email,
        error: emailError.message,
      });
    }

    return sendSuccess(res, 201, true, '🎉 Account created successfully. Please check your email to verify your account before logging in.')
  } catch (err) {
    await session.abortTransaction();
    logger.error(err);
    return sendError(res, 500, false, 'Internal Server Error')
  } finally {
    session.endSession();
  };
};

exports.loginUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, password } = req.body;

    const requestInfo = getRequestInfo(req);

    if (!email || !password) {
      await session.abortTransaction();

      await LoginHistory.create({
        role: "buyer",
        email,
        loginMethod: "password",
        sessionId: crypto.randomUUID(),
        ipAddress: requestInfo.ip,
        userAgent: requestInfo.device.userAgent,
        deviceInfo: requestInfo.device,
        location: requestInfo.location,
        success: false,
        failureReason: "Email and password are required"
      });

      return sendError(res, 400, "Email and password are required");
    }

    const user = await buyerModel.findOne({ email }).session(session);

    if (!user) {
      await session.abortTransaction();

      await LoginHistory.create({
        role: "buyer",
        email,
        loginMethod: "password",
        sessionId: crypto.randomUUID(),
        ipAddress: requestInfo.ip,
        userAgent: requestInfo.device.userAgent,
        deviceInfo: requestInfo.device,
        location: requestInfo.location,
        success: false,
        failureReason: "Invalid email"
      });

      return sendError(res, 400, "Invalid credentials");
    }

    const confirmPassword = await bcrypt.compare(password, user.password);

    if (!confirmPassword) {
      await session.abortTransaction();

      await LoginHistory.create({
        user: user._id,
        userModel: "Buyer",
        role: "buyer",
        email: user.email,
        phoneNo: user.phoneNo,
        loginMethod: "password",
        sessionId: crypto.randomUUID(),
        ipAddress: requestInfo.ip,
        userAgent: requestInfo.device.userAgent,
        deviceInfo: requestInfo.device,
        location: requestInfo.location,
        success: false,
        failureReason: "Invalid password"
      });

      return sendError(res, 400, "Invalid credentials");
    }

    if (!user.emailVerified) {
      await session.abortTransaction();

      await LoginHistory.create({
        user: user._id,
        userModel: "Buyer",
        role: "buyer",
        email: user.email,
        phoneNo: user.phoneNo,
        loginMethod: "password",
        sessionId: crypto.randomUUID(),
        ipAddress: requestInfo.ip,
        userAgent: requestInfo.device.userAgent,
        deviceInfo: requestInfo.device,
        location: requestInfo.location,
        success: false,
        failureReason: "Email not verified"
      });

      return sendError(res, 403, "Please verify your email before logging in.");
    }

    const sessionId = crypto.randomUUID();

    const accessToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
        sessionId,
        tokenVersion: user.tokenVersion,
      },
      process.env.JWT_KEY,
      {
        expiresIn: "24h"
      }
    );

    const refreshToken = jwt.sign(
      {
        id: user._id,
        sessionId,
        tokenVersion: user.tokenVersion,
      },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: "7d"
      }
    );

    await LoginHistory.create(
      [
        {
          user: user._id,
          userModel: "Buyer",
          role: "buyer",
          email: user.email,
          phoneNo: user.phoneNo,
          loginMethod: "password",
          sessionId,
          ipAddress: requestInfo.ip,
          userAgent: requestInfo.device.userAgent,
          deviceInfo: requestInfo.device,
          location: requestInfo.location,
          success: true
        }
      ], { session }
    );

    await AuditLog.create(
      [
        {
          user: user._id,
          role: "buyer",
          action: "LOG_IN",
          entity: "Buyer",
          entityId: user._id,
          reason: 'Login to application',
          metadata: {
            email: user.email,
            sessionId,
            ipAddress: requestInfo.ip,
            device: requestInfo.deviceName,
            location: requestInfo.location
          }
        }
      ], { session }
    );

    if (!user.profileUpdateNotificationSent) {
      await notificationService.safeCreateProfileUpdateNotification({
        userId: user._id,
        role: "buyer"
      });

      await buyerModel.findByIdAndUpdate(
        user._id,
        {
          $set: {
            profileUpdateNotificationSent: true
          }
        },
        {
          session
        }
      );
    }

    await session.commitTransaction();

    return sendSuccess(res, 200, "Login successful", {
      user: BuyerDTO.authUser(user),
      sessionId,
      accessToken,
      refreshToken,
      expiresIn: 86400
    });

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

exports.googleLogin = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { idToken } = req.body;
    const requestInfo = getRequestInfo(req);

    if (!idToken) {
      await session.abortTransaction();
      return sendError(res, 400, "idToken required");
    }

    const payload = await verifyGoogleToken(idToken);

    if (!payload) {
      await session.abortTransaction();
      return sendError(res, 401, "Invalid Google token");
    }

    const { email, name, picture, sub: googleId, } = payload;

    if (!email || !googleId) {
      await session.abortTransaction();
      return sendError(res, 400, "Google account information is incomplete");
    }

    const normalizedEmail = email.toLowerCase().trim();

    let user = await buyerModel.findOne({ email: normalizedEmail }).session(session);

    let isNewUser = false;

    if (!user) {
      const existingGoogleUser = await buyerModel.findOne({ googleId }).session(session);

      if (existingGoogleUser) {
        user = existingGoogleUser;
      } else {
        const serialNo = await generateSerialNumber("buyer", session);

        const createdUsers = await buyerModel.create(
          [
            {
              serialNumber: serialNo,
              email: normalizedEmail,
              fullName: name,

              student: {
                profilePhoto: picture || "",
              },

              googleId,
              emailVerified: true,
              role: "buyer",
              onboardingCompleted: false,
            },
          ], { session }
        );

        user = createdUsers[0];
        isNewUser = true;
      }
    }

    if (!user.googleId) {
      user.googleId = googleId;
      user.emailVerified = true;

      await user.save({ session });
    }

    if (user.accountStatus && user.accountStatus !== "active") {
      await session.abortTransaction();

      await LoginHistory.create({
        user: user._id,
        userModel: "Buyer",
        role: "buyer",
        email: user.email,
        phoneNo: user.phoneNo,
        loginMethod: "google",
        sessionId: crypto.randomUUID(),
        ipAddress: requestInfo.ip,
        userAgent: requestInfo.device.userAgent,
        deviceInfo: requestInfo.device,
        location: requestInfo.location,
        success: false,
        failureReason: `Account is ${user.accountStatus}`,
      });

      return sendError(res, 403, "Your account is not active. Please contact support.");
    }

    const sessionId = crypto.randomUUID();

    const accessToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
        sessionId,
        tokenVersion: user.tokenVersion,
      },
      process.env.JWT_KEY,
      {
        expiresIn: "24h",
      }
    );

    const refreshToken = jwt.sign(
      {
        id: user._id,
        sessionId,
        tokenVersion: user.tokenVersion,
      },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: "7d",
      }
    );

    if (isNewUser) {
      try {
        await emailService.sendBuyerWelcome({
          email: user.email,
          name: user.fullName,
        });
      } catch (emailError) {
        logger.error("Failed to send welcome email", {
          userId: user._id,
          role: user.role,
          error: emailError.message,
        });
      }
    }

    await LoginHistory.create(
      [
        {
          user: user._id,
          userModel: "Buyer",
          role: "buyer",
          email: user.email,
          phoneNo: user.phoneNo,
          loginMethod: "google",
          sessionId,
          ipAddress: requestInfo.ip,
          userAgent: requestInfo.device.userAgent,
          deviceInfo: requestInfo.device,
          location: requestInfo.location,
          success: true,
        },
      ],
      { session }
    );

    await AuditLog.create(
      [
        {
          user: user._id,
          role: "buyer",
          action: "GOOGLE_LOGIN",
          entity: "Buyer",
          entityId: user._id,
          reason: "Google login to application",
          metadata: {
            email: user.email,
            sessionId,
            ipAddress: requestInfo.ip,
            device: requestInfo.deviceName,
            location: requestInfo.location,
          },
        },
      ],
      { session }
    );

    if (!user.profileUpdateNotificationSent) {
      await notificationService.safeCreateProfileUpdateNotification({
        userId: user._id,
        role: "buyer",
      });

      await buyerModel.findByIdAndUpdate(
        user._id,
        {
          $set: {
            profileUpdateNotificationSent: true,
          },
        },
        { session }
      );
    }

    await session.commitTransaction();

    return sendSuccess(res, 200, "Google login successful", {
      user: BuyerDTO.authUser(user),
      sessionId,
      accessToken,
      refreshToken,
      expiresIn: 86400,
      onboardingCompleted: user.onboardingCompleted,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    logger.error("Google login error", {
      message: error.message,
      stack: error.stack,
    });

    return sendError(res, 401, "Google authentication failed");
  } finally {
    await session.endSession();
  }
};

exports.getUsersDetails = async (req, res) => {
  try {
    const buyer = await buyerModel
      .findById(req.user._id)
      .select(`
        serialNumber
        role
        fullName
        email
        emailVerified
        phoneNo
        onboardingCompleted

        institution
        state

        student.profilePhoto
        student.gender
        student.matricNumber
        student.faculty
        student.department
        student.level
        student.residence
        student.address

        preferences.notificationPreference
        preferences.promotionalMessages

        isActive
        isLocked
        isSuspend
        isDeleted
        accountStatus

        lockReason
        suspendReason
        suspendDate
        deleteReason
        deleteDate
        pendingEmail
        changeEmailDate
        updatePasswordDate

        createdAt
        updatedAt
      `)
      .populate("institution", "name")
      .populate("state", "name");

    if (!buyer) {
      return sendError(res, 404, "Buyer not found");
    }

    return sendSuccess(
      res,
      200,
      "Buyer profile fetched successfully",
      BuyerDTO.fromModel(buyer)
    );
  } catch (err) {
    logger.error(err);
    return sendError(res, 500, "Internal Server Error");
  }
};

exports.updateBuyerProfile = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const buyerId = req.user._id;

    const {
      fullName,
      gender,
      institution,
      state,
      matricNumber,
      faculty,
      department,
      level,
      residence,
      address,
    } = req.body;

    const buyer = await buyerModel
      .findById(buyerId)
      .session(session);

    if (!buyer) {
      await session.abortTransaction();
      return sendError(res, 404, 'Buyer not found');
    }

    // Account information
    if (fullName !== undefined) {
      buyer.fullName = fullName;
    }

    // Location information
    if (institution !== undefined) {
      buyer.institution = institution;
    }

    if (state !== undefined) {
      buyer.state = state;
    }

    // Student information
    if (gender !== undefined) {
      buyer.student.gender = gender;
    }

    if (matricNumber !== undefined) {
      buyer.student.matricNumber = matricNumber;
    }

    if (faculty !== undefined) {
      buyer.student.faculty = faculty;
    }

    if (department !== undefined) {
      buyer.student.department = department;
    }

    if (level !== undefined) {
      buyer.student.level = level;
    }

    if (residence !== undefined) {
      buyer.student.residence = residence;
    }

    if (address !== undefined) {
      buyer.student.address = address;
    }

    // Profile photo
    if (req.files?.profilePhoto?.[0]) {
      buyer.student.profilePhoto = req.files.profilePhoto[0].path;
    }

    await buyer.save({ session });

    await AuditLog.create(
      [{
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
      }],
      { session }
    );

    await session.commitTransaction();

    return sendSuccess(
      res,
      200,
      'Profile updated successfully',
      BuyerDTO.fromModel(buyer)
    );

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
      return sendError(res, 400, "School, state and phone number are required");
    }

    const buyer = await buyerModel.findById(buyerId).session(session);

    if (!buyer) {
      await session.abortTransaction();
      return sendError(res, 404, "Buyer not found");
    }

    if (buyer.onboardingCompleted) {
      await session.abortTransaction();
      return sendError(res, 400, "Profile onboarding already completed");
    }

    const schoolRecord = await School.findOne({
      _id: school,
      type: "school",
      isActive: true,
      status: "approved",
    }).session(session);

    if (!schoolRecord) {
      await session.abortTransaction();
      return sendError(res, 404, "Selected school does not exist");
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
      return sendError(res, 400, "Selected state does not belong to the selected school");
    }

    const existingPhone = await buyerModel.findOne({
      phoneNo,
      _id: { $ne: buyerId },
    }).session(session);

    if (existingPhone) {
      await session.abortTransaction();
      return sendError(res, 409, "Phone number already exists");
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

    return sendSuccess(res, 200, "Profile completed successfully", BuyerDTO.fromModel(populatedBuyer));
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    logger.error(error);
    return sendError(res, 500, "Failed to complete profile");
  } finally {
    session.endSession();
  }
};