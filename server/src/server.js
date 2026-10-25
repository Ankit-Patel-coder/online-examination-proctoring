// server/src/server.js
// Entry point — connects to MongoDB, then starts the HTTP server.
// Handles graceful shutdown on SIGTERM/SIGINT.
require('dotenv').config();

const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');
const logger = require('./utils/logger');
const { initSocket } = require('./config/socket');

const server = http.createServer(app);

// ─── Socket.IO (Real-time proctoring & teacher alerts) ────────────────────
const io = initSocket(server);

const start = async () => {
  await connectDB();

  server.listen(env.PORT, () => {
    logger.info(`🚀  Server running on port ${env.PORT} (${env.NODE_ENV})`);
    logger.info(`   Health check: http://localhost:${env.PORT}/api/health`);
  });
};

start().catch(err => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = signal => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
  // Force exit after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forceful shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
  // Don't exit — log and continue; the error handler will catch route-level rejections
});
