// server/src/config/db.js
// Establishes and manages the MongoDB connection via Mongoose.
const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      // These are the recommended options to avoid deprecation warnings
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`✅  MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected.');
    });

    mongoose.connection.on('error', err => {
      logger.error('MongoDB connection error:', err);
    });

  } catch (error) {
    logger.error('❌  MongoDB connection failed:', error.message);
    process.exit(1); // Exit immediately — the server is unusable without a database
  }
};

module.exports = connectDB;
