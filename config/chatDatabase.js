const mongoose = require('mongoose');
const logger = require('../logger');

let chatConnection = null;

const getOptions = () => ({
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2,
  connectTimeoutMS: 10000,
  appName: 'CampusTradeChat',
});

const getChatConnection = () => {
  if (!chatConnection) {
    chatConnection = mongoose.createConnection();

    chatConnection.on('error', (err) => {
      logger.error('Chat MongoDB connection error:', err);
    });

    chatConnection.on('disconnected', () => {
      logger.warn('Chat MongoDB disconnected');
    });
  }

  return chatConnection;
};

const connectChatDatabase = async () => {
  if (!process.env.CHAT_DB_URL) {
    throw new Error('CHAT_DB_URL environment variable is required');
  }

  const connection = getChatConnection();

  if (connection.readyState === 1) return connection;
  if (connection.readyState === 2) {
    await connection.asPromise();
    return connection;
  }

  await connection.openUri(process.env.CHAT_DB_URL, getOptions());
  return connection;
};

module.exports = { connectChatDatabase, getChatConnection };
