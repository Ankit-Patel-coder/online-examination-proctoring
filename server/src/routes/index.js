// server/src/routes/index.js
// Master router — mounts all feature route modules under /api.
const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const examRoutes = require('./exam.routes');
const attemptRoutes = require('./attempt.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/exams', examRoutes);
router.use('/attempts', attemptRoutes);

// Future route modules — added in subsequent phases:
// router.use('/proctoring', proctoringRoutes);
// router.use('/analytics', analyticsRoutes);

module.exports = router;
