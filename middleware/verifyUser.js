const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/responseStruture');
const buyerModel = require('../models/buyer.model');
const vendorModel = require("../models/vendor.model");


const verifyUser = (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return sendError(res, 401, 'No token provided');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_KEY);

    req.user = {
      _id: decoded.id,
      role: decoded.role
    };

    next();

  } catch (error) {
    return sendError(res, 401, 'Invalid or expired token');
  }
};

const requireRole = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return sendError(res, 403, 'Access denied');
  }
  next();
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // Max 5 requests per windowMs
  handler: (req, res) => sendError(res, 429, 'Too many login attempts, please try again later'),
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,  // 100 requests per 15 min
  skip: (req) => req.user && req.user.role === 'founder',
  handler: (req, res) => sendError(res, 429, 'Too many requests, please try again later')
});


const requireCompletedProfile = async (
  req,
  res,
  next
) => {
  try {
    const buyer = await buyerModel.findById(req.user._id);

    if (!buyer) {
      return sendError(
        res,
        404,
        'Buyer not found'
      );
    }

    if (!buyer.onboardingCompleted) {
      return sendError(
        res,
        403,
        'Please complete your profile'
      );
    }

    req.buyer = buyer;

    next();
  } catch (error) {
    return sendError(
      res,
      500,
      'Profile verification failed'
    );
  }
};

const requireVerifiedEmail = async (req, res, next) => {
  try {
    const Model = req.user.role === "buyer"
      ? buyerModel
      : vendorModel;

    const user = await Model.findById(req.user._id).select("emailVerified");

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    if (!user.emailVerified) {
      return sendError(
        res,
        403,
        "Please verify your email address before continuing."
      );
    }

    next();
  } catch (error) {
    return sendError(res, 500, "Verification failed");
  }
};

const requireCompletedOnboarding = (req, res, next) => {
    if (!req.user.onboardingCompleted) {
        return sendError(
            res,
            403,
            "Please complete your onboarding first."
        );
    }

    next();
};

module.exports = { verifyUser, requireRole, requireCompletedProfile, loginLimiter, apiLimiter, requireVerifiedEmail, requireCompletedOnboarding };
