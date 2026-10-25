// server/src/utils/logger.js
// Thin wrapper around console for structured logging.
// In production you could swap this for winston or pino without changing call sites.
const env = require('../config/env');

const isDev = env.NODE_ENV === 'development';

const logger = {
  info: (...args) => console.log('[INFO]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[WARN]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[ERROR]', new Date().toISOString(), ...args),
  // Debug logs only in development
  debug: (...args) => {
    if (isDev) console.log('[DEBUG]', new Date().toISOString(), ...args);
  },
};

module.exports = logger;
