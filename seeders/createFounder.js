require('dotenv').config();

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const founderModel = require('../models/founder.model');
const logger = require('../logger');

const createFounder = async () => {
  try {
    if (!process.env.MONGO_URL) {
      throw new Error('MONGO_URL is missing from your .env file.');
    }

    await mongoose.connect(process.env.MONGO_URL);

    logger.info('Connected to MongoDB');

    const email = process.env.FOUNDER_EMAIL?.toLowerCase().trim();
    const phoneNo = process.env.FOUNDER_PHONENO?.trim();
    const plainPassword = process.env.FOUNDER_PASSWORD;

    if (!email || !phoneNo || !plainPassword) {
      throw new Error(
        'Founder email, phone number, and password are required.'
      );
    }

    if (plainPassword.length < 8) {
      throw new Error(
        'Founder password must contain at least 8 characters.'
      );
    }

    const existingFounder = await founderModel.findOne({
      $or: [
        { email },
        { phoneNo }
      ]
    });

    if (existingFounder) {
      logger.warn(
        'A Founder already exists with this email or phone number.'
      );

      await mongoose.disconnect();
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(
      plainPassword,
      12
    );

    const founder = await founderModel.create({
      serialNumber: process.env.FOUNDER_SERIALNUMBER,
      role: 'founder',
      fullName: process.env.FOUNDER_FULLNAME,
      email,
      emailVerified: true,
      emailVerifiedDate: new Date(),
      phoneNo,
      password: hashedPassword,
      onboardingCompleted: true,
      isActive: true,
      isDeleted: false,
      accountStatus: 'active',
      tokenVersion: 0
    });

    logger.info('Founder account created successfully.');

    logger.info({
      id: founder._id.toString(),
      serialNumber: founder.serialNumber,
      fullName: founder.fullName,
      email: founder.email,
      phoneNo: founder.phoneNo,
      role: founder.role,
      emailVerified: founder.emailVerified,
      onboardingCompleted: founder.onboardingCompleted,
      accountStatus: founder.accountStatus
    });

    await mongoose.disconnect();

    process.exit(0);
  } catch (error) {
    logger.error('Failed to create Founder account:', {
      message: error.message,
      code: error.code,
      syscall: error.syscall,
      hostname: error.hostname
    });

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    process.exit(1);
  }
};

createFounder();