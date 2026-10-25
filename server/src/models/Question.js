// server/src/models/Question.js
const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
  },
  { _id: true } // Each option gets its own ObjectId — used as the answer key reference
);

const questionSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    type: {
      type: String,
      enum: ['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE', 'SHORT_ANSWER', 'DESCRIPTIVE'],
      required: [true, 'Question type is required'],
    },
    text: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    imageUrl: String,
    // Options are only relevant for MCQ_SINGLE, MCQ_MULTIPLE, TRUE_FALSE
    options: [optionSchema],
    // ─────────────────────────────────────────────────────────
    // SECURITY: answerKey is NEVER returned to clients.
    // select: false ensures it is excluded from all queries
    // unless explicitly `.select('+answerKey')` is called.
    // ─────────────────────────────────────────────────────────
    answerKey: {
      type: {
        // For MCQ_SINGLE / MCQ_MULTIPLE / TRUE_FALSE: array of correct option _ids
        correctOptionIds: [mongoose.Schema.Types.ObjectId],
        // For SHORT_ANSWER: a model answer for teacher reference
        sampleAnswer: String,
      },
      select: false,
    },
    marks: {
      type: Number,
      required: [true, 'Marks are required'],
      min: [0, 'Marks cannot be negative'],
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    // Explanation shown to students only after result release
    explanation: String,
  },
  {
    timestamps: true,
  }
);

// Compound index for efficiently fetching questions for an exam in order
questionSchema.index({ examId: 1, displayOrder: 1 });

const Question = mongoose.model('Question', questionSchema);
module.exports = Question;
