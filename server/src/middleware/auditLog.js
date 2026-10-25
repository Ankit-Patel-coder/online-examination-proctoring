// server/src/middleware/auditLog.js
// Middleware factory that records a structured audit event after a route handler succeeds.
// Usage: router.patch('/users/:id', authenticate, authorize('ADMIN'), auditLog('USER_UPDATED', 'User'), controller)
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * @param {string} action      - Action name, e.g. 'USER_DEACTIVATED'
 * @param {string} targetType  - Model name, e.g. 'User', 'Exam'
 * @param {Function} [getTargetId] - Optional fn(req, res) to extract the target document ID.
 *                                   Defaults to req.params.id
 */
const auditLog = (action, targetType, getTargetId) => {
  return (req, res, next) => {
    // Capture the original res.json to hook into after success
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Only log on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const targetId = getTargetId
          ? getTargetId(req, body)
          : req.params.id;

        AuditLog.create({
          actorId: req.user._id,
          actorRole: req.user.role,
          action,
          targetType,
          targetId,
          safeMetadata: {
            method: req.method,
            path: req.originalUrl,
          },
        }).catch(err => logger.error('Failed to write audit log:', err.message));
      }

      return originalJson(body);
    };

    next();
  };
};

module.exports = auditLog;
