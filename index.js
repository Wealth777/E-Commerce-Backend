const dns = require("dns");

dns.setServers([
  "8.8.8.8",
  "8.8.4.4"
]);

require('dotenv').config();

const logger = require('./logger');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { initializeSocket } = require('./sockets/notification.socket');
const { connectChatDatabase } = require('./config/chatDatabase');
const { verifyEmailConnection } = require('./config/email')

const port = process.env.PORT || 6778;


async function validateEnvironment() {
  const required = [
    'JWT_KEY',
    'JWT_REFRESH_SECRET',

    'MONGO_URL',
    'CHAT_DB_URL',

    'PORT',
    'frontedURL',

    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',

    'NODE_ENV',

    // 'EMAIL_HOST',
    // 'EMAIL_PORT',
    // 'EMAIL_SECURE',
    // 'EMAIL_USER',
    // 'EMAIL_PASSWORD',

    'RESEND_API_KEY',
    
    'APP_NAME',
    
    'EMAIL_FROM',
    'EMAIL_SUPPORT',
    'EMAIL_LOGO'
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (Number.isNaN(Number(process.env.PORT))) {
    throw new Error('PORT must be a valid number');
  }

  if (process.env.JWT_KEY.length < 32) {
    throw new Error('JWT_KEY must be at least 32 characters');
  }
}

async function startServer() {
  try {
    await validateEnvironment();

    await verifyEmailConnection();

    await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      connectTimeoutMS: 10000,
      appName: 'CampusTradeMain',
    });

    const chatDB = await connectChatDatabase();

    mongoose.connection.on('error', (err) => {
      logger.error('Main MongoDB connection error:', err);
      process.exit(1);
    });

    chatDB.on('error', (err) => {
      logger.error('Chat MongoDB connection error:', err);
      process.exit(1);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Main MongoDB disconnected');
    });

    chatDB.on('disconnected', () => {
      logger.warn('Chat MongoDB disconnected');
    });

    logger.info('✅ Main Database Connected Successfully');
    logger.info('✅ Chat Database Connected Successfully');

    const server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin: process.env.frontedURL,
        credentials: true,
        methods: ['GET', 'POST'],
      },
    });

    initializeSocket(io);

    server.listen(port, () => {
      logger.info(`🚀 Server running on port ${port}`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`, {
      stack: err.stack,
    });

    process.exit(1);
  }
}

startServer();