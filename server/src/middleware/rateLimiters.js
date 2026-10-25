// server/src/middleware/rateLimiters.js
// Specialized Express rate limiters for security-sensitive routes.
const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const isDev = env.NODE_ENV === 'development';

/**
 * Strict rate limiter for authentication endpoints (login, register, change password).
 * Prevents credential stuffing and brute-force attacks.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 100 : 15,    // 15 attempts in production, 100 in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
});

/**
 * Throttler for recording proctoring events.
 * Allows high throughput from real-time watchers while preventing event flooding attacks.
 */
const proctoringEventLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 500 : 120, // 120 events per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Proctoring event rate limit exceeded. Please wait a moment.',
  },
});

/**
 * Exam attempt action limiter (saving answers, submitting).
 */
const attemptActionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 300 : 90, // 90 saves/actions per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many exam actions sent. Your changes are queued.',
  },
});

module.exports = {
  authLimiter,
  proctoringEventLimiter,
  attemptActionLimiter,
};
