const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');

const founderModel = require('../../models/founder.model');

const { generateSerialNumber } = require('../../utils/generateSerial');

const AppError = require('../common/AppError');

const loginHistory = require('../../models/loginHistory.model');

const crypto = require('crypto');
const getRequestInfo = require('../../utils/getRequestHelper');
const auditLogModel = require('../../models/auditLog.model');
const FounderDTO = require('../../dtos/founder.dto');

const { verifyGoogleToken } = require('../googleAuth.service');

const googleLogin = async ({ idToken }, req = null) => {
  const requestInfo = getRequestInfo(req);

  if (!idToken) {
    throw new AppError(400, "idToken required");
  }

  const payload = await verifyGoogleToken(idToken);

  if (!payload) {
    throw new AppError(401, "Invalid Google token");
  }

  const {
    email,
    name,
    picture,
    sub: googleId,
    email_verified: googleEmailVerified
  } = payload;

  if (!email || !googleId) {
    await loginHistory.create({
      req,
      role: 'founder',
      email,
      loginMethod: "google",
      sessionId: crypto.randomUUID(),
      ipAddress: requestInfo.ip,
      userAgent: requestInfo.device.userAgent,
      deviceInfo: requestInfo.device,
      location: requestInfo.location,
      success: false,
      failureReason: 'Google account information is incomplete'
    });

    throw new AppError('Google account information is incomplete', 400);
  }

  const normalizedEmail = email.toLowerCase().trim();

  // ======================================================
  // FIND EXISTING FOUNDER
  // ======================================================

  let user = await founderModel.findOne({
    email: normalizedEmail
  });

  if (!user) {
    await loginHistory.create({
      req,
      role: 'founder',
      email,
      loginMethod: "google",
      sessionId: crypto.randomUUID(),
      ipAddress: requestInfo.ip,
      userAgent: requestInfo.device.userAgent,
      deviceInfo: requestInfo.device,
      location: requestInfo.location,
      success: false,
      failureReason: 'No Founder account exists with this Google account.'
    });

    throw new AppError('No Founder account exists with this Google account.', 403);
  }

  // ======================================================
  // CHECK GOOGLE EMAIL VERIFICATION
  // ======================================================

  if (!googleEmailVerified) {
    await loginHistory.create({
      req,
      user,
      role: "founder",
      email: user.email,
      phoneNo: user.phoneNo,
      loginMethod: "google",
      sessionId: crypto.randomUUID(),
      ipAddress: requestInfo.ip,
      userAgent: requestInfo.device.userAgent,
      deviceInfo: requestInfo.device,
      location: requestInfo.location,
      success: false,
      failureReason: "Google email is not verified"
    });

    throw new AppError("Your Google email address is not verified.", 403);
  }

  // ======================================================
  // LINK GOOGLE ACCOUNT
  // ======================================================

  if (!user.googleId) {
    user.googleId = googleId;
    user.emailVerified = true;
    user.emailVerifiedDate = new Date();

    await user.save();
  } else if (user.googleId !== googleId) {
    await loginHistory.create({
      req,
      user,
      role: "founder",
      email: user.email,
      phoneNo: user.phoneNo,
      loginMethod: "google",
      sessionId: crypto.randomUUID(),
      ipAddress: requestInfo.ip,
      userAgent: requestInfo.device.userAgent,
      deviceInfo: requestInfo.device,
      location: requestInfo.location,
      success: false,
      failureReason: "Google account does not match linked account"
    });

    throw new AppError("This Google account is not linked to your Founder account.", 403);
  }

  // ======================================================
  // ACCOUNT STATUS
  // ======================================================

  if (user.accountStatus !== "active" || !user.isActive) {
    await loginHistory.create({
      req,
      user,
      role: "founder",
      email: user.email,
      phoneNo: user.phoneNo,
      loginMethod: "google",
      sessionId: crypto.randomUUID(),
      ipAddress: requestInfo.ip,
      userAgent: requestInfo.device.userAgent,
      deviceInfo: requestInfo.device,
      location: requestInfo.location,
      success: false,
      failureReason: `Account is ${user.accountStatus}`
    });

    throw new AppError("Your Founder account is not active. Please contact support.", 403);
  }

  const serialNumber = await generateSerialNumber('founder');

  user.serialNumber = serialNumber

  await user.save()

  // ======================================================
  // CREATE SESSION
  // ======================================================

  const sessionId = crypto.randomUUID();

  const accessToken = jwt.sign(
    {
      id: user._id,
      role: "founder",
      sessionId,
      tokenVersion: user.tokenVersion
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
      tokenVersion: user.tokenVersion
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "7d"
    }
  );

  // ======================================================
  // LOGIN HISTORY
  // ======================================================

  await loginHistory.create({
    req,
    user,
    role: "founder",
    email: user.email,
    phoneNo: user.phoneNo,
    loginMethod: "google",
    sessionId,
    ipAddress: requestInfo.ip,
    userAgent: requestInfo.device.userAgent,
    deviceInfo: requestInfo.device,
    location: requestInfo.location,
    success: true
  });

  // ======================================================
  // AUDIT LOG
  // ======================================================

  await auditLogModel.create({
    user: user._id,
    role: "founder",
    action: "GOOGLE_LOGIN",
    entity: "Founder",
    entityId: user._id,
    reason: "Google login to application",
    metadata: {
      email: user.email,
      sessionId,
      ipAddress: requestInfo.ip,
      device: requestInfo.deviceName,
      location: requestInfo.location
    }
  });

  // ======================================================
  // RESPONSE
  // ======================================================

  return {
    user: FounderDTO.authUser(user),
    sessionId,
    accessToken,
    refreshToken,
    expiresIn: 86400,
    onboardingCompleted: user.onboardingCompleted
  };
};

const loginUser = async ({ email, password }, req = null) => {
  const requestInfo = getRequestInfo(req);

  if (!email || !password) {
    await loginHistory.create({
      req,
      role: 'founder',
      email,
      loginMethod: "password",
      sessionId: crypto.randomUUID(),
      ipAddress: requestInfo.ip,
      userAgent: requestInfo.device.userAgent,
      deviceInfo: requestInfo.device,
      location: requestInfo.location,
      success: false,
      failureReason: 'Missing email or password'
    });

    throw new AppError('Email and password are required', 400);
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await founderModel.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    await loginHistory.create({
      req,
      role: 'founder',
      email: normalizedEmail,
      loginMethod: "password",
      sessionId: crypto.randomUUID(),
      ipAddress: requestInfo.ip,
      userAgent: requestInfo.device.userAgent,
      deviceInfo: requestInfo.device,
      location: requestInfo.location,
      success: false,
      failureReason: 'Invalid credentials'
    });

    throw new AppError('Invalid credentials', 400);
  }

  const confirmPassword = await bcrypt.compare(password, user.password);

  if (!confirmPassword) {
    await loginHistory.create({
      req,
      user,
      role: 'founder',
      email: normalizedEmail,
      loginMethod: "password",
      sessionId: crypto.randomUUID(),
      ipAddress: requestInfo.ip,
      userAgent: requestInfo.device.userAgent,
      deviceInfo: requestInfo.device,
      location: requestInfo.location,
      success: false,
      failureReason: 'Invalid credentials'
    });

    throw new AppError('Invalid credentials', 400);
  }

  if (!user.emailVerified) {
    await session.abortTransaction();

    await LoginHistory.create({
      user: user._id,
      userModel: "Founder",
      role: "founder",
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
      role: 'founder',
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

  await loginHistory.create({
    req,
    user,
    role: 'founder',
    email: user.email,
    loginMethod: "password",
    sessionId: sessionId,
    ipAddress: getRequestInfo.ip,
    userAgent: requestInfo.device.userAgent,
    deviceInfo: requestInfo.device,
    location: requestInfo.location,
    success: true
  });

  await auditLogModel.create(
    {
      user: user._id,
      role: "founder",
      action: "LOG_IN",
      entity: "Founder",
      entityId: user._id,
      reason: 'Login to application',
      metadata: {
        email: user.email,
        sessionId,
        ipAddress: requestInfo.ip,
        device: requestInfo.deviceName,
        location: requestInfo.location
      }
    });

  return {
    user: FounderDTO.authUser(user),
    sessionId,
    accessToken,
    refreshToken,
    expiresIn: 86400
  };
};

const getUsersDetails = async ({ userId }) => {
  const profile = await founderModel.findById(userId).select('serialNumber firstName lastName email phoneNo role isActive');
  if (!profile) throw new AppError('User not found', 404);
  return profile;
};

module.exports = { googleLogin, loginUser, getUsersDetails };