const { body, param, query, validationResult } = require('express-validator');
const { sendError } = require('../utils/responseStruture');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 400, 'Validation failed', errors.array());
  }
  return next();
};

const mongoIdParam = (name) => [
  param(name).isMongoId().withMessage(`${name} must be a valid id`),
  handleValidation,
];

const listQueryValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive number'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('search is too long'),
  query('role').optional().isIn(['buyer', 'vendor', 'founder']).withMessage('invalid role'),
  query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  query('isVerified').optional().isBoolean().withMessage('isVerified must be boolean'),
  query('verificationStatus').optional().isIn(['pending', 'approved', 'rejected']).withMessage('invalid verificationStatus'),
  query('country').optional().trim().isLength({ max: 80 }).withMessage('country is too long'),
  query('state').optional().trim().isLength({ max: 80 }).withMessage('state is too long'),
  query('deleted').optional().isBoolean().withMessage('deleted must be boolean'),
  query('from').optional().isISO8601().withMessage('from must be a valid date'),
  query('to').optional().isISO8601().withMessage('to must be a valid date'),
  query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'fullName', 'storeName', 'totalOrders', 'totalProducts', 'revenue']).withMessage('invalid sortBy'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc'),
  handleValidation,
];

const reasonBodyValidator = [
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('reason is too long'),
  handleValidation,
];

const rejectVendorValidator = [
  body('reason').trim().notEmpty().withMessage('rejection reason is required').isLength({ max: 500 }).withMessage('reason is too long'),
  handleValidation,
];

module.exports = {
  handleValidation,
  mongoIdParam,
  listQueryValidator,
  reasonBodyValidator,
  rejectVendorValidator,
};
