// server/src/middleware/errorHandler.js
// Global error handler — must be the LAST middleware registered in app.js.
// Converts ApiErrors and unexpected errors into consistent JSON responses.
const env = require('../config/env');
const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Log every error server-side (include stack in development)
  if (env.NODE_ENV === 'development') {
    logger.error(err.stack || err.message);
  } else {
    logger.error(`[${err.statusCode || 500}] ${err.message}`);
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
      errors: [{ field, message: `${field} already exists` }],
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  // Handle our custom ApiError
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors.length ? err.errors : undefined,
    });
  }

  // Unknown / programmer error — don't leak details in production
  const statusCode = err.statusCode || 500;
  const message =
    env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message;

  return res.status(statusCode).json({ success: false, message });
};

module.exports = errorHandler;
