// server/src/middleware/sanitize.js
// NoSQL injection prevention middleware — recursively sanitizes request objects
// by stripping keys that start with '$' or contain '.' which could alter MongoDB queries.

/**
 * Recursively clean an object or array of NoSQL operator keys.
 */
const cleanObject = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map(cleanObject);
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(payload)) {
    // Drop keys that start with '$' or contain '.'
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    cleaned[key] = cleanObject(value);
  }

  return cleaned;
};

/**
 * Express middleware to sanitize req.body, req.query, and req.params.
 */
const sanitizeNoSql = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = cleanObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = cleanObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = cleanObject(req.params);
  }
  next();
};

module.exports = sanitizeNoSql;
