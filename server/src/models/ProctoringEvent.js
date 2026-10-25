// server/src/models/ProctoringEvent.js
const mongoose = require('mongoose');

const proctoringEventSchema = new mongoose.Schema(
  {
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamAttempt',
      required: true,
    },
    eventType: {
      type: String,
      enum: [
        'TAB_HIDDEN',
        'FULLSCREEN_EXIT',
        'FACE_NOT_DETECTED',
        'MULTIPLE_FACES_DETECTED',
        'CAMERA_INTERRUPTED',
        'CONNECTION_INTERRUPTED',
      ],
      required: true,
    },
    occurredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // How long the event lasted, in milliseconds (optional — some events are momentary)
    durationMs: {
      type: Number,
      min: 0,
    },
    // Short, factual description of the event (no judgment language)
    description: {
      type: String,
      maxlength: 500,
    },
    // IMPORTANT: Review status is for human reviewer workflow only.
    // It has NO bearing on automatic scoring or pass/fail decisions.
    reviewStatus: {
      type: String,
      enum: ['UNREVIEWED', 'REVIEWED', 'DISMISSED'],
      default: 'UNREVIEWED',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    reviewerNotes: {
      type: String,
      maxlength: 1000,
    },
    // Optional: base64 screenshot (only if exam has screenshot capture enabled AND consent obtained)
    // Stored as a string here; in production consider GridFS or S3 for large blobs.
    screenshotData: {
      type: String,
      select: false, // Never returned to students; only accessible to teachers
    },
  },
  {
    timestamps: true,
  }
);

proctoringEventSchema.index({ attemptId: 1, occurredAt: -1 });
proctoringEventSchema.index({ attemptId: 1, reviewStatus: 1 });
proctoringEventSchema.index({ attemptId: 1, eventType: 1 });

const ProctoringEvent = mongoose.model('ProctoringEvent', proctoringEventSchema);
module.exports = ProctoringEvent;
