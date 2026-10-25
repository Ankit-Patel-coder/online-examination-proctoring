// server/src/middleware/authorize.js
// Role-based access control middleware factory.
// Usage: router.get('/admin', authenticate, authorize('ADMIN'), controller)
//        router.get('/any', authenticate, authorize('ADMIN', 'TEACHER'), controller)
const ApiError = require('../utils/ApiError');

/**
 * @param {...string} allowedRoles - One or more roles permitted to access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied. Required role: ${allowedRoles.join(' or ')}.`
        )
      );
    }

    next();
  };
};

module.exports = authorize;
