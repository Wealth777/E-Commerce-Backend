const { body, validationResult } = require('express-validator');
const xss = require('xss');

const validateRegister = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ max: 100 }).withMessage('Full name too long')
    .custom(value => {
      if (/[<>\"'&]/g.test(value)) throw new Error('Invalid characters');
      return true;
    }),
  body('email')
    .trim()
    .isEmail().withMessage('Invalid email'),
  body('phoneNo')
    .trim()
    .isMobilePhone().withMessage('Invalid phone number'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password too short')
];

module.exports = {validateRegister}