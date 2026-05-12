const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

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
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
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
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

const requireRole = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Access denied"
    });
  }
  next();
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // Max 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,  // 100 requests per 15 min
  skip: (req) => req.user && req.user.role === 'founder'  // Skip for founders
});


module.exports = { verifyUser, requireRole, loginLimiter, apiLimiter };
