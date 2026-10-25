// server/src/config/socket.js
// Socket.IO server initialization and room-based real-time event management.
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('./env');
const logger = require('../utils/logger');
const User = require('../models/User');

let io = null;

/**
 * Parse cookies from raw cookie header string.
 */
const parseCookies = (cookieString = '') => {
  return cookieString
    .split(';')
    .reduce((res, c) => {
      const [key, val] = c.trim().split('=');
      if (key && val) res[key] = decodeURIComponent(val);
      return res;
    }, {});
};

/**
 * Initialize Socket.IO with HTTP server.
 */
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Socket middleware for authentication (optional handshake verification)
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const cookies = parseCookies(cookieHeader);
      const token = cookies.access_token || socket.handshake.auth?.token;

      if (token) {
        try {
          const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
          const user = await User.findById(payload.userId).select('name email role');
          if (user) {
            socket.user = user;
          }
        } catch {
          // Allow connection even if token verification fails, but socket.user will be undefined
        }
      }
      return next();
    } catch (err) {
      return next(err);
    }
  });

  io.on('connection', (socket) => {
    logger.info(`🔌  Socket connected: ${socket.id} (User: ${socket.user?.email || 'Anonymous'})`);

    // Join exam monitoring room
    socket.on('join:exam', (examId) => {
      if (examId) {
        socket.join(`exam:${examId}`);
        logger.debug(`Socket ${socket.id} joined exam room: exam:${examId}`);
      }
    });

    // Leave exam monitoring room
    socket.on('leave:exam', (examId) => {
      if (examId) {
        socket.leave(`exam:${examId}`);
        logger.debug(`Socket ${socket.id} left exam room: exam:${examId}`);
      }
    });

    // Join individual attempt room (for student or proctor)
    socket.on('join:attempt', (attemptId) => {
      if (attemptId) {
        socket.join(`attempt:${attemptId}`);
        logger.debug(`Socket ${socket.id} joined attempt room: attempt:${attemptId}`);
      }
    });

    // Teacher sends a real-time warning to a student
    socket.on('teacher:warning', ({ attemptId, examId, message, level = 'WARNING' }) => {
      if (attemptId && message) {
        io.to(`attempt:${attemptId}`).emit('student:warning', {
          message,
          level,
          sentAt: new Date().toISOString(),
          from: socket.user?.name || 'Exam Proctor',
        });
        logger.warn(`Proctor warning sent to attempt ${attemptId}: "${message}"`);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`🔌  Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  logger.info('✅  Socket.IO initialized successfully');
  return io;
};

/**
 * Access the global io instance anywhere in controllers.
 */
const getIO = () => {
  return io;
};

module.exports = {
  initSocket,
  getIO,
};
