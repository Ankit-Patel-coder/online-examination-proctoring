// server/src/middleware/validate.js
// Zod request validation middleware factory.
// Usage: router.post('/route', validate(myZodSchema), controller)
// Validates req.body by default; optionally validates req.query or req.params.
const ApiError = require('../utils/ApiError');

/**
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body'|'query'|'params'} source - Which part of the request to validate
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(ApiError.badRequest('Validation failed', errors));
    }

    // Replace the source with the parsed (and possibly transformed) data
    req[source] = result.data;
    next();
  };
};

module.exports = validate;
