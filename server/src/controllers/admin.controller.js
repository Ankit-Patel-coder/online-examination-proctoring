// server/src/controllers/admin.controller.js
// Admin controller — platform stats, user management (list, create teacher, toggle status).
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const {
  attachCookies,
  signAccessToken,
  signRefreshToken,
} = require('../middleware/authenticate');

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

/**
 * GET /api/admin/dashboard
 * Returns platform-wide aggregate statistics.
 */
const getDashboard = async (req, res, next) => {
  try {
    // Run all counts in parallel for performance
    const [
      totalUsers,
      totalAdmins,
      totalTeachers,
      totalStudents,
      activeUsers,
      pendingUsers,
      inactiveUsers,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'ADMIN' }),
      User.countDocuments({ role: 'TEACHER' }),
      User.countDocuments({ role: 'STUDENT' }),
      User.countDocuments({ accountStatus: 'ACTIVE' }),
      User.countDocuments({ accountStatus: 'PENDING' }),
      User.countDocuments({ accountStatus: 'INACTIVE' }),
      // 5 most recent registrations
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name email role accountStatus createdAt'),
    ]);

    return res.json({
      success: true,
      message: 'Dashboard stats retrieved',
      data: {
        users: {
          total: totalUsers,
          byRole: { ADMIN: totalAdmins, TEACHER: totalTeachers, STUDENT: totalStudents },
          byStatus: { ACTIVE: activeUsers, PENDING: pendingUsers, INACTIVE: inactiveUsers },
        },
        // Exams / attempts will be added in Phase 4+
        exams: { total: 0, published: 0, draft: 0 },
        attempts: { total: 0, today: 0 },
        recentUsers,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── User List ────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 * Paginated, filterable user list.
 * Query: ?page=1&limit=20&role=STUDENT&status=ACTIVE&search=jane
 */
const getUsers = async (req, res, next) => {
  try {
    const { page, limit, role, status, search } = req.query;

    // Build MongoDB filter
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.accountStatus = status;
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: re }, { email: re }];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-passwordHash -emailVerificationToken -passwordResetToken -passwordResetExpires'),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.json({
      success: true,
      message: 'Users retrieved',
      data: {
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Single User ──────────────────────────────────────────────────────────────

/**
 * GET /api/admin/users/:id
 * Get a single user's full profile (excluding secrets).
 */
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      '-passwordHash -emailVerificationToken -passwordResetToken -passwordResetExpires'
    );
    if (!user) throw ApiError.notFound('User not found');

    return res.json({ success: true, message: 'User retrieved', data: user });
  } catch (err) {
    next(err);
  }
};

// ─── Create Teacher ───────────────────────────────────────────────────────────

/**
 * POST /api/admin/users/teacher
 * Create a teacher account. Only admins can do this.
 * Body: { name, email, password }
 */
const createTeacher = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) throw ApiError.conflict('An account with this email already exists');

    const teacher = new User({ name, email, role: 'TEACHER', accountStatus: 'ACTIVE' });
    await teacher.hashPassword(password);
    await teacher.save();

    await AuditLog.create({
      action: 'USER_CREATED',
      actorId: req.user._id,
      actorRole: req.user.role,
      targetType: 'User',
      targetId: teacher._id,
      safeMetadata: { email, role: 'TEACHER', createdBy: req.user.email },
    });

    return res.status(201).json({
      success: true,
      message: 'Teacher account created successfully',
      data: teacher.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Update User Status ───────────────────────────────────────────────────────

/**
 * PATCH /api/admin/users/:id/status
 * Activate, deactivate, or set a user to pending.
 * Body: { status: 'ACTIVE' | 'INACTIVE' | 'PENDING' }
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Prevent admin from deactivating their own account
    if (id === req.user._id.toString()) {
      throw ApiError.badRequest('You cannot change your own account status');
    }

    const user = await User.findById(id);
    if (!user) throw ApiError.notFound('User not found');

    const previousStatus = user.accountStatus;
    user.accountStatus = status;
    await user.save();

    await AuditLog.create({
      action: status === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      actorId: req.user._id,
      actorRole: req.user.role,
      targetType: 'User',
      targetId: user._id,
      safeMetadata: { previousStatus, newStatus: status, targetEmail: user.email },
    });

    return res.json({
      success: true,
      message: `User ${status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
      data: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Audit Log ────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/audit-logs
 * Paginated audit log for all admin actions.
 * Query: ?page=1&limit=20&action=USER_DEACTIVATED
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.action) filter.action = req.query.action;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actorId', 'name email role'),
      AuditLog.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      message: 'Audit logs retrieved',
      data: {
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard, getUsers, getUser, createTeacher, updateUserStatus, getAuditLogs };
