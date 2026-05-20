const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const founderModel = require('../../models/founder.model');
const { generateSerialNumber } = require('../../utils/generateSerial');
const AppError = require('../common/AppError');

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

const loginUser = async ({ email, password }) => {
  if (!email || !password) throw new AppError('Email and password are required', 400);

  const user = await founderModel.findOne({ email }).select('+password');
  if (!user) throw new AppError('Invalid credentials', 400);

  const confirmPassword = await bcrypt.compare(password, user.password);
  if (!confirmPassword) throw new AppError('Invalid credentials', 400);

  const token = jwt.sign({ id: user._id }, process.env.JWT_KEY, { expiresIn: '1h' });

  return {
    token,
    user: {
      _id: user._id,
      serialNumber: user.serialNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNo: user.phoneNo,
    },
  };
};

const getUsersDetails = async ({ userId }) => {
  const profile = await founderModel.findById(userId).select('serialNumber firstName lastName email phoneNo');
  if (!profile) throw new AppError('User not found', 404);
  return profile;
};

module.exports = { createUser, loginUser, getUsersDetails };
