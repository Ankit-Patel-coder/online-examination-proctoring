// server/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must be 100 characters or less'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // NEVER returned in queries by default
    },
    role: {
      type: String,
      enum: ['ADMIN', 'TEACHER', 'STUDENT'],
      default: 'STUDENT',
    },
    accountStatus: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'PENDING'],
      default: 'ACTIVE',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    lastLoginAt: Date,
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Indexes for efficient lookups
// Note: email already has a unique index from the schema definition above.
userSchema.index({ role: 1, accountStatus: 1 });

/**
 * Hash the plain password and store it.
 * Call this before saving a new user or changing a password.
 * Do NOT call this if you're only modifying other fields.
 */
userSchema.methods.hashPassword = async function (plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, env.BCRYPT_ROUNDS);
};

/**
 * Compare a plain password against the stored hash.
 * Requires the passwordHash field to be explicitly selected in the query.
 */
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

/**
 * Return a safe user object — never includes passwordHash or tokens.
 */
userSchema.methods.toSafeObject = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    accountStatus: this.accountStatus,
    emailVerified: this.emailVerified,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const User = mongoose.model('User', userSchema);
module.exports = User;
