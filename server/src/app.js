// server/src/app.js
// Express application factory — creates and configures the app but does NOT start listening.
// This separation makes it easy to import in tests without starting the server.
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const sanitizeNoSql = require('./middleware/sanitize');
const mongoose = require('mongoose');

const app = express();

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  })
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Allow configured frontend origin and Vercel cloud deployments with credentials (cookies).
const allowedOrigins = (env.CLIENT_URL || '').split(',').map(s => s.trim()).filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Requested-With'],
  })
);

// ─── Global rate limiter ──────────────────────────────────────────────────────
// Stricter limits are applied per-route for auth endpoints.
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,             // 200 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// ─── Body parsing & Sanitization ──────────────────────────────────────────────
app.use(express.json({ limit: '2mb' })); // Large enough for base64 screenshot in proctoring
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitizeNoSql); // Deep NoSQL operator injection sanitizer

// ─── HTTP request logging ─────────────────────────────────────────────────────
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Minimal combined log in production — no query strings (may contain sensitive data)
  app.use(morgan('combined'));
}

// ─── Health check & Kubernetes / Cloud Readiness Probe ────────────────────────
app.get('/api/health', (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;
  res.status(isDbReady ? 200 : 503).json({
    success: isDbReady,
    status: isDbReady ? 'UP' : 'DEGRADED',
    message: isDbReady ? 'Server is healthy' : 'Database connection unavailable',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      connected: isDbReady,
      host: mongoose.connection.host || 'unknown',
    },
    memory: {
      rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  });
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── 404 and error handling ───────────────────────────────────────────────────
// These MUST be after all other middleware and routes.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
