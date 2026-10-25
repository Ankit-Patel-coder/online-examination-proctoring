// server/src/routes/auth.routes.js
// Authentication routes — register, login, logout, me, change-password, refresh.
const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { authenticate } = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} = require('../validators/auth.validators');
const {
  register,
  login,
  logout,
  me,
  changePassword,
  refresh,
} = require('../controllers/auth.controller');

// Strict rate limit for auth endpoints: 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many authentication attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.post('/refresh', refresh);

module.exports = router;
