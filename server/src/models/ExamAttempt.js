// server/src/models/ExamAttempt.js
const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    // For MCQ_SINGLE, MCQ_MULTIPLE, TRUE_FALSE — array of selected option IDs
    selectedOptionIds: [mongoose.Schema.Types.ObjectId],
    // For SHORT_ANSWER and DESCRIPTIVE
    textAnswer: { type: String, maxlength: 10000 },
    savedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const questionResultSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
    },
    marksAwarded: { type: Number, default: 0 },
    isCorrect: { type: Boolean, default: null }, // null = not auto-gradeable (descriptive)
    teacherFeedback: String,
    gradedAt: Date,
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null = auto-graded
  },
  { _id: false }
);

const examAttemptSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    attemptNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    // State machine: IN_PROGRESS → SUBMITTED → EVALUATED
    //                         ↘ EXPIRED (server-side deadline passed)
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'SUBMITTED', 'EVALUATED', 'EXPIRED'],
      default: 'IN_PROGRESS',
    },
    startedAt: {
      type: Date,
      required: true,
    },
    // Server-computed deadline: startedAt + exam.durationMinutes
    // The server NEVER accepts submissions after this timestamp.
    deadlineAt: {
      type: Date,
      required: true,
    },
    submittedAt: Date,
    // Saved answers — upserted on every /answers PUT request
    answers: [answerSchema],
    // Populated after auto-grading and manual evaluation
    score: { type: Number, default: null },
    maxScore: { type: Number, default: null },
    questionResults: [questionResultSchema],
    evaluationStatus: {
      type: String,
      enum: ['PENDING', 'AUTO_GRADED', 'MANUAL_PENDING', 'COMPLETE'],
      default: 'PENDING',
    },
    // Timestamp when teacher explicitly released results for this attempt
    resultReleasedAt: Date,
    // Snapshot of proctoring settings at the time the attempt started.
    // This ensures later teacher changes to exam settings don't rewrite
    // what was actually active during the attempt.
    proctoringSettingsSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // IP address for auditing — not used for any access decisions
    ipAddress: String,
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate in-progress attempts: one student, one exam, same attempt number
examAttemptSchema.index(
  { examId: 1, studentId: 1, attemptNumber: 1 },
  { unique: true }
);
examAttemptSchema.index({ studentId: 1, status: 1 });
examAttemptSchema.index({ examId: 1, status: 1 });
examAttemptSchema.index({ deadlineAt: 1 }); // For scheduled expiry jobs

const ExamAttempt = mongoose.model('ExamAttempt', examAttemptSchema);
module.exports = ExamAttempt;
