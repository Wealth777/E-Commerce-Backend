const logger = require('../../logger');
const buyerModel = require('../../models/buyer.model');
const AuditLog = require('../../models/auditLog.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { westAfricaCountries, nigeriaStates } = require("../../utils/location");
const { generateSerialNumber } = require('../../utils/generateSerial');
const { validationResult } = require('express-validator');

const { default: mongoose } = require('mongoose');
const { sendResponse, sendSuccess, sendError } = require('../../utils/responseStruture');
const BuyerDTO = require('../../dtos/buyer.dto');

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
      return sendError(res, 400, 'Validation failed', errors.array());
    }
    const { fullName, email, phoneNo, password } = req.body;

    if (!fullName || !email || !phoneNo || !password) {
      return sendResponse(res, 400, false, "All fields are required");
    }

    const existingUser = await buyerModel.findOne({ email });
    if (existingUser) {
      logger.info('User already exist')
      return sendResponse(res, 400, false, 'User already exist... Try to login or use another ID(email)');
    };

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return sendError(res, 400, 'Password does not meet requirements', passwordErrors);
    }

    const hashPassword = await bcrypt.hash(password, saltRounds);

    const serialNo = await generateSerialNumber("buyer");

    const createAcc = new buyerModel({
      serialNumber: serialNo,
      fullName,
      email,
      phoneNo,
      password: hashPassword
    });

    await createAcc.save();

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

// exports.loginUser = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return sendError(res, 400, 'Email and password are required')
//     }

//     const user = await buyerModel.findOne({ email });

//     if (!user) {
//       return sendError(res, 400, 'Invalid credentials');
//     }

//     const confirmPassword = await bcrypt.compare(password, user.password);

//     if (!confirmPassword) {
//       return sendError(res, 400, 'Invalid credentials');
//     }

//     const token = jwt.sign(
//       { id: user._id, role: user.role },
//       process.env.JWT_KEY,
//       { expiresIn: "24h" }
//     );

//     const refreshToken = jwt.sign(
//       { id: user._id },
//       process.env.JWT_REFRESH_SECRET,
//       { expiresIn: "7d" }
//     );

//     await AuditLog.create([{
//       user: user._id,
//       role: 'buyer',
//       action: 'LOG_IN',
//       entity: 'Buyer',
//       entityId: user._id,
//       metadata: {
//         email: user.email
//       }
//     }], { session });

//     await session.commitTransaction();

//     return sendSuccess(res, 200, 'Login successful', {
//       user: BuyerDTO.authUser(user),
//       accessToken: token,
//       refreshToken,
//       expiresIn: 86400
//     });


//   } catch (err) {
//     await session.abortTransaction();
//     logger.error(err);
//     return sendError(res, 500, 'Internal Server Error');
//   } finally {
//     session.endSession();
//   };
// };

exports.loginUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      await session.abortTransaction();
      return sendError(res, 400, 'Email and password are required');
    }

    const user = await buyerModel.findOne({ email });

    if (!user) {
      await session.abortTransaction();
      return sendError(res, 400, 'Invalid credentials');
    }

    const confirmPassword = await bcrypt.compare(password, user.password);

    if (!confirmPassword) {
      await session.abortTransaction();
      return sendError(res, 400, 'Invalid credentials');
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_KEY,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    const responseData = {
      user: BuyerDTO.fromModel(user),
      accessToken: token,
      refreshToken,
      expiresIn: 86400,
    };

    await AuditLog.create([{
      user: user._id,
      role: 'buyer',
      action: 'LOG_IN',
      entity: 'Buyer',
      entityId: user._id,
      metadata: {
        email: user.email,
      },
    }], { session });

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

exports.logoutUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    if (req.user?._id) {
      const user = await buyerModel.findById(req.user._id).select('email');

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

    const buyer = await buyerModel.findById(buyerId);

    if (!buyer) {
      await session.abortTransaction();
      return sendError(res, 404, 'Buyer not found');
    }

    if (country && !westAfricaCountries.includes(country)) {
      return sendError(res, 400, 'Invalid country');
    }

    if (country === 'Nigeria' && state && !nigeriaStates.includes(state)) {
      return sendError(res, 400, 'Invalid Nigerian state');
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