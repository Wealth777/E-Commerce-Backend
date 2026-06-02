const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const founderModel = require('../../models/founder.model');
const { generateSerialNumber } = require('../../utils/generateSerial');
const AppError = require('../common/AppError');
const loginHistoryService = require('../loginHistory.service');

const saltRounds = 10;

const createUser = async ({ firstName, lastName, email, phoneNo, password }) => {
  if (!firstName || !lastName || !email || !phoneNo || !password) {
    throw new AppError('All fields are required', 400);
  }

  const existingUser = await founderModel.findOne({ email });
  if (existingUser) throw new AppError('User already exist... Try to login or use another ID(email)', 400);

  const hashPassword = await bcrypt.hash(password, saltRounds);
  const serialNo = await generateSerialNumber('founder');

  const founder = new founderModel({ serialNumber: serialNo, firstName, lastName, email, phoneNo, password: hashPassword });
  await founder.save();

  return founder;
};

// const loginUser = async ({ email, password }, req = null) => {
//   if (!email || !password) {
//     await loginHistoryService.trackLogin({ req, role: 'founder', email, success: false, failureReason: 'Missing email or password' });
//     throw new AppError('Email and password are required', 400);
//   }

//   const user = await founderModel.findOne({ email }).select('+password');
//   if (!user) {
//     await loginHistoryService.trackLogin({ req, role: 'founder', email, success: false, failureReason: 'Invalid credentials' });
//     throw new AppError('Invalid credentials', 400);
//   }

//   const confirmPassword = await bcrypt.compare(password, user.password);
//   if (!confirmPassword) {
//     await loginHistoryService.trackLogin({ req, user, role: 'founder', email, success: false, failureReason: 'Invalid credentials' });
//     throw new AppError('Invalid credentials', 400);
//   }
//   await loginHistoryService.trackLogin({ req, user, role: 'founder', email: user.email, success: true });

//   const token = jwt.sign({ id: user._id, role: 'founder' }, process.env.JWT_KEY, { expiresIn: '1h' });

//   return {
//     token,
//     user: {
//       _id: user._id,
//       serialNumber: user.serialNumber,
//       firstName: user.firstName,
//       lastName: user.lastName,
//       email: user.email,
//       phoneNo: user.phoneNo,
//       role: 'founder',
//     },
//   };
// };

const loginUser = async ({ email, password }, req = null) => {
  if (!email || !password) {
    await loginHistoryService.trackLogin({
      req,
      role: 'founder',
      email,
      success: false,
      failureReason: 'Missing email or password'
    });

    throw new AppError('Email and password are required', 400);
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await founderModel.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    await loginHistoryService.trackLogin({
      req,
      role: 'founder',
      email: normalizedEmail,
      success: false,
      failureReason: 'Invalid credentials'
    });

    throw new AppError('Invalid credentials', 400);
  }

  const confirmPassword = await bcrypt.compare(password, user.password);

  if (!confirmPassword) {
    await loginHistoryService.trackLogin({
      req,
      user,
      role: 'founder',
      email: normalizedEmail,
      success: false,
      failureReason: 'Invalid credentials'
    });

    throw new AppError('Invalid credentials', 400);
  }

  await loginHistoryService.trackLogin({
    req,
    user,
    role: 'founder',
    email: user.email,
    success: true
  });

  const token = jwt.sign(
    { id: user._id, role: 'founder' },
    process.env.JWT_KEY,
    { expiresIn: '1h' }
  );

  return {
    token,
    user: {
      _id: user._id,
      serialNumber: user.serialNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNo: user.phoneNo,
      role: 'founder',
    },
  };
};

const getUsersDetails = async ({ userId }) => {
  const profile = await founderModel.findById(userId).select('serialNumber firstName lastName email phoneNo role isActive');
  if (!profile) throw new AppError('User not found', 404);
  return profile;
};

module.exports = { createUser, loginUser, getUsersDetails };
