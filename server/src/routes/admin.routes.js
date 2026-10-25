// server/src/routes/admin.routes.js
// Admin-only routes — all protected by authenticate + authorize('ADMIN').
const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createTeacherSchema,
  updateStatusSchema,
  userListQuerySchema,
} = require('../validators/admin.validators');
const {
  getDashboard,
  getUsers,
  getUser,
  createTeacher,
  updateUserStatus,
  getAuditLogs,
} = require('../controllers/admin.controller');

// Every admin route requires authentication + ADMIN role
router.use(authenticate, authorize('ADMIN'));

// Dashboard stats
router.get('/dashboard', getDashboard);

// User management
router.get('/users', validate(userListQuerySchema, 'query'), getUsers);
router.get('/users/:id', getUser);
router.post('/users/teacher', validate(createTeacherSchema), createTeacher);
router.patch('/users/:id/status', validate(updateStatusSchema), updateUserStatus);

// Audit logs
router.get('/audit-logs', getAuditLogs);

module.exports = router;
