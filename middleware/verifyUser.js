const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/responseStruture');

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

    // Attach vendor info to request
    // req.user = {}; 
    // req.user._id = decoded.id;
    req.user = {
      _id: decoded.id,
      role: decoded.role  // ADD ROLE!
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


module.exports = { verifyUser, requireRole, loginLimiter, apiLimiter };
