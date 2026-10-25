// server/src/controllers/auth.controller.js
// Auth controller — handles register, login, logout, me, changePassword, refresh.
// All business logic lives here; the router just maps paths to these handlers.
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const {
  attachCookies,
  signAccessToken,
  signRefreshToken,
} = require('../middleware/authenticate');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Build the token payload, sign both tokens, attach cookies, and return safe user data.
 */
const issueTokensAndRespond = (res, user, statusCode = 200, message = 'Success') => {
  const payload = { userId: user._id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  attachCookies(res, accessToken, refreshToken);
  return res.status(statusCode).json({ success: true, message, data: user.toSafeObject() });
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Create a new STUDENT account.
 * Body: { name, email, password }
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check uniqueness
    const existing = await User.findOne({ email });
    if (existing) {
      throw ApiError.conflict('An account with this email already exists');
    }

    const user = new User({ name, email, role: 'STUDENT', accountStatus: 'ACTIVE' });
    await user.hashPassword(password);
    await user.save();

    // Audit log
    await AuditLog.create({
      action: 'USER_REGISTERED',
      actorId: user._id,
      actorRole: user.role,
      targetType: 'User',
      targetId: user._id,
      safeMetadata: { email, role: 'STUDENT' },
    });

    return issueTokensAndRespond(res, user, 201, 'Account created successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Authenticate with email + password.
 * Body: { email, password }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Fetch with passwordHash (select: false by default)
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      // Use generic message to avoid user-enumeration
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (user.accountStatus !== 'ACTIVE') {
      throw ApiError.unauthorized(
        user.accountStatus === 'PENDING'
          ? 'Your account is pending approval. Contact an administrator.'
          : 'Your account has been deactivated. Contact an administrator.'
      );
    }

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    return issueTokensAndRespond(res, user, 200, 'Login successful');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 * Clear auth cookies. Requires a valid session (authenticate middleware runs first).
 */
const logout = (req, res) => {
  const isProd = env.NODE_ENV === 'production';
  const cookieOpts = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  };

  res.clearCookie('access_token', cookieOpts);
  res.clearCookie('refresh_token', { ...cookieOpts, path: '/api/auth/refresh' });
  return res.json({ success: true, message: 'Logged out successfully', data: null });
};

/**
 * GET /api/auth/me
 * Return the currently authenticated user.
 * req.user is attached by the authenticate middleware.
 */
const me = (req, res) => {
  return res.json({ success: true, message: 'User profile retrieved', data: req.user.toSafeObject() });
};

/**
 * POST /api/auth/change-password
 * Change the authenticated user's password.
 * Body: { currentPassword, newPassword, confirmPassword }
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Re-fetch with passwordHash
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) throw ApiError.notFound('User not found');

    const passwordMatch = await user.comparePassword(currentPassword);
    if (!passwordMatch) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    await user.hashPassword(newPassword);
    await user.save();

    // Audit log
    await AuditLog.create({
      action: 'PASSWORD_CHANGED',
      actorId: user._id,
      actorRole: user.role,
      targetType: 'User',
      targetId: user._id,
      safeMetadata: { method: 'self-service' },
    });

    // Re-issue tokens so active sessions continue working
    return issueTokensAndRespond(res, user, 200, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/refresh
 * Exchange a valid refresh_token cookie for new access + refresh tokens.
 * No authenticate middleware — reads refresh_token directly.
 */
const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw ApiError.unauthorized('No refresh token provided');
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    } catch {
      throw ApiError.unauthorized('Session expired, please log in again');
    }

    const user = await User.findById(payload.userId);
    if (!user || user.accountStatus !== 'ACTIVE') {
      throw ApiError.unauthorized('Account is inactive or does not exist');
    }

    return issueTokensAndRespond(res, user, 200, 'Tokens refreshed');
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, logout, me, changePassword, refresh };
