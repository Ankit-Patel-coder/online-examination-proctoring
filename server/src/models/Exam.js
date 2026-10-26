// server/src/models/Exam.js
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Exam title is required'],
      trim: true,
      maxlength: [200, 'Title must be 200 characters or less'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description must be 2000 characters or less'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Exam duration is required'],
      min: [1, 'Duration must be at least 1 minute'],
      max: [480, 'Duration cannot exceed 480 minutes (8 hours)'],
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'COMPLETED', 'CANCELLED'],
      default: 'DRAFT',
    },
    maximumMarks: {
      type: Number,
      required: [true, 'Maximum marks are required'],
      min: [0, 'Maximum marks cannot be negative'],
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    attemptLimit: {
      type: Number,
      default: 1,
      min: [1, 'Attempt limit must be at least 1'],
    },
    negativeMarking: {
      enabled: { type: Boolean, default: false },
      // Fraction of the question's marks to deduct per wrong answer (e.g., 0.25 = 25%)
      defaultPenaltyFraction: { type: Number, default: 0.25, min: 0, max: 1 },
    },
    randomizeQuestions: {
      type: Boolean,
      default: false,
    },
    resultRelease: {
      mode: {
        type: String,
        enum: ['MANUAL', 'AUTO_AFTER_DEADLINE'],
        default: 'MANUAL',
      },
      releaseAt: Date, // Used when mode is AUTO_AFTER_DEADLINE or MANUAL with a scheduled date
      showAnswerKey: { type: Boolean, default: false },
      showQuestionWise: { type: Boolean, default: true },
    },
    proctoring: {
      enabled: { type: Boolean, default: false },
      webcamRequired: { type: Boolean, default: false },
      faceDetectionEnabled: { type: Boolean, default: false },
      fullscreenRequired: { type: Boolean, default: false },
      tabSwitchDetection: { type: Boolean, default: true },
    },
    instructions: {
      type: String,
      maxlength: [5000, 'Instructions must be 5000 characters or less'],
    },
    allowedResources: String,
    publishedAt: Date,
    cancelledAt: Date,
    cancelReason: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
examSchema.index({ createdBy: 1, status: 1 });
examSchema.index({ status: 1, startTime: 1, endTime: 1 });

/**
 * Validate that endTime is after startTime + durationMinutes.
 * Runs before save.
 */
examSchema.pre('save', async function () {
  if (this.startTime && this.endTime) {
    if (this.endTime <= this.startTime) {
      throw ApiError.badRequest('End time must be after start time');
    }
    const minEnd = new Date(this.startTime.getTime() + this.durationMinutes * 60 * 1000);
    if (this.endTime < minEnd) {
      throw ApiError.badRequest('End time must allow at least the exam duration after start time');
    }
  }
});

const Exam = mongoose.model('Exam', examSchema);
module.exports = Exam;
