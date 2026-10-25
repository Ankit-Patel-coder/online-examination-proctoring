// server/src/validators/admin.validators.js
// Zod schemas for admin-only operations.
const { z } = require('zod');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/[0-9]/, 'Must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Must contain a special character');

// Schema for creating a teacher account
const createTeacherSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be 100 characters or less'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: passwordSchema,
});

// Schema for toggling account status
const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING'], {
    required_error: 'Status is required',
    invalid_type_error: "Status must be 'ACTIVE', 'INACTIVE', or 'PENDING'",
  }),
});

// Schema for user list query params
const userListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform(v => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().min(1)),
  limit: z
    .string()
    .optional()
    .transform(v => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().min(1).max(100)),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
  search: z.string().trim().optional(),
});

module.exports = { createTeacherSchema, updateStatusSchema, userListQuerySchema };
