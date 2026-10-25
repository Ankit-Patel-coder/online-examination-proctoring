// server/src/validators/evaluation.validators.js
// Zod schemas for manual grading, result release, and proctoring event reviews.
const { z } = require('zod');

const evaluateQuestionItemSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  marksAwarded: z
    .number({ required_error: 'Marks awarded is required' })
    .min(0, 'Marks cannot be negative'),
  teacherFeedback: z.string().max(2000).optional(),
});

const evaluateAttemptSchema = z.object({
  evaluations: z
    .array(evaluateQuestionItemSchema)
    .min(1, 'At least one question evaluation must be provided'),
});

const reviewProctoringEventSchema = z.object({
  reviewStatus: z.enum(['REVIEWED', 'DISMISSED']),
  reviewerNotes: z.string().max(1000).optional(),
});

module.exports = {
  evaluateAttemptSchema,
  reviewProctoringEventSchema,
};
