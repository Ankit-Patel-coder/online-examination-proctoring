// server/src/middleware/authenticate.js
// Reads the JWT from the httpOnly access_token cookie and attaches req.user.
// If the access token is expired, attempts to refresh it using the refresh_token cookie.
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

/**
 * Attach signed JWT cookies to a response.
 * Called after login and after a successful token refresh.
 */
const attachCookies = (res, accessToken, refreshToken) => {
  const isProd = env.NODE_ENV === 'production';

  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes in ms
  });

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/api/auth/refresh', // Refresh cookie only sent to this path
  });
};

/**
 * Sign a new access token for a given user payload.
 */
const signAccessToken = payload =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });

/**
 * Sign a new refresh token for a given user payload.
 */
const signRefreshToken = payload =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });

/**
 * Authentication middleware — requires a valid access_token cookie.
 * Automatically refreshes the access token if it is expired but the refresh token is valid.
 */
const authenticate = async (req, res, next) => {
  try {
    const accessToken = req.cookies?.access_token;

    if (!accessToken) {
      throw ApiError.unauthorized('No authentication token provided');
    }

    let payload;
    try {
      payload = jwt.verify(accessToken, env.JWT_ACCESS_SECRET);
    } catch (err) {
      // Access token expired — try to refresh
      if (err.name === 'TokenExpiredError') {
        const refreshToken = req.cookies?.refresh_token;
        if (!refreshToken) throw ApiError.unauthorized('Session expired, please log in again');

        let refreshPayload;
        try {
          refreshPayload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
        } catch {
          throw ApiError.unauthorized('Session expired, please log in again');
        }

        // Issue new tokens
        const user = await User.findById(refreshPayload.userId).select('-passwordHash');
        if (!user || user.accountStatus !== 'ACTIVE') {
          throw ApiError.unauthorized('Account is inactive or does not exist');
        }

        const tokenPayload = { userId: user._id, role: user.role };
        const newAccessToken = signAccessToken(tokenPayload);
        const newRefreshToken = signRefreshToken(tokenPayload);
        attachCookies(res, newAccessToken, newRefreshToken);

        payload = tokenPayload;
        req.user = user;
        return next();
      }
      throw ApiError.unauthorized('Invalid token');
    }

    // Token is valid — fetch fresh user to ensure account is still active
    const user = await User.findById(payload.userId).select('-passwordHash');
    if (!user) throw ApiError.unauthorized('User no longer exists');
    if (user.accountStatus !== 'ACTIVE') {
      throw ApiError.unauthorized('Your account has been deactivated. Contact an administrator.');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, attachCookies, signAccessToken, signRefreshToken };
