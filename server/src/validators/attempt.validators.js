// server/src/validators/attempt.validators.js
const { z } = require('zod');

const startAttemptSchema = z.object({
  examId: z.string().min(1, 'Exam ID is required'),
});

const answerItemSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  selectedOptionIds: z.array(z.string()).optional(),
  textAnswer: z.string().max(10000).optional(),
});

const saveAnswersSchema = z.object({
  answers: z.array(answerItemSchema).min(1, 'At least one answer must be provided'),
});

const submitAttemptSchema = z.object({
  answers: z.array(answerItemSchema).optional(),
});

const proctoringEventSchema = z.object({
  eventType: z.enum([
    'TAB_HIDDEN',
    'FULLSCREEN_EXIT',
    'FACE_NOT_DETECTED',
    'MULTIPLE_FACES_DETECTED',
    'CAMERA_INTERRUPTED',
    'CONNECTION_INTERRUPTED',
  ]),
  durationMs: z.number().min(0).optional(),
  description: z.string().max(500).optional(),
});

module.exports = {
  startAttemptSchema,
  saveAnswersSchema,
  submitAttemptSchema,
  proctoringEventSchema,
};
