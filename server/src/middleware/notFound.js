// server/src/middleware/notFound.js
// Catches any request that didn't match a route and converts it to a 404.
const ApiError = require('../utils/ApiError');

const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

module.exports = notFound;
