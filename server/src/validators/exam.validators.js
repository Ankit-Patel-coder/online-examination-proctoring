// server/src/validators/exam.validators.js
// Zod schemas for exam and question operations.
const { z } = require('zod');

// ─── Exam ─────────────────────────────────────────────────────────────────────

const examBaseSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be 200 characters or less'),
  description: z.string().trim().max(2000).optional(),
  durationMinutes: z
    .number({ required_error: 'Duration is required', invalid_type_error: 'Duration must be a number' })
    .int('Duration must be a whole number')
    .min(1, 'Duration must be at least 1 minute')
    .max(480, 'Duration cannot exceed 480 minutes'),
  startTime: z
    .string({ required_error: 'Start time is required' })
    .datetime({ message: 'Start time must be a valid ISO 8601 date-time' }),
  endTime: z
    .string({ required_error: 'End time is required' })
    .datetime({ message: 'End time must be a valid ISO 8601 date-time' }),
  maximumMarks: z
    .number({ required_error: 'Maximum marks are required', invalid_type_error: 'Marks must be a number' })
    .min(0, 'Marks cannot be negative'),
  attemptLimit: z.number().int().min(1).default(1),
  negativeMarking: z
    .object({
      enabled: z.boolean().default(false),
      defaultPenaltyFraction: z.number().min(0).max(1).default(0.25),
    })
    .default({ enabled: false, defaultPenaltyFraction: 0.25 }),
  randomizeQuestions: z.boolean().default(false),
  resultRelease: z
    .object({
      mode: z.enum(['MANUAL', 'AUTO_AFTER_DEADLINE']).default('MANUAL'),
      showAnswerKey: z.boolean().default(false),
      showQuestionWise: z.boolean().default(true),
    })
    .default({}),
  proctoring: z
    .object({
      enabled: z.boolean().default(false),
      webcamRequired: z.boolean().default(false),
      faceDetectionEnabled: z.boolean().default(false),
      fullscreenRequired: z.boolean().default(false),
      tabSwitchDetection: z.boolean().default(true),
    })
    .default({}),
  instructions: z.string().trim().max(5000).optional(),
});

const createExamSchema = examBaseSchema.refine(
  data => new Date(data.endTime) > new Date(data.startTime),
  { message: 'End time must be after start time', path: ['endTime'] }
);

// For updates: allow partial fields — no cross-field refine needed since fields may be absent
const updateExamSchema = examBaseSchema.partial();

// ─── Question ─────────────────────────────────────────────────────────────────

const optionSchema = z.object({
  text: z.string().trim().min(1, 'Option text cannot be empty').max(500),
});

// addQuestion base (without refine) used for partial update
const addQuestionBaseSchema = z.object({
  type: z.enum(
    ['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE', 'SHORT_ANSWER', 'DESCRIPTIVE'],
    { required_error: 'Question type is required' }
  ),
  text: z
    .string({ required_error: 'Question text is required' })
    .trim()
    .min(1, 'Question text cannot be empty')
    .max(5000),
  options: z.array(optionSchema).optional(),
  answerKey: z
    .object({
      correctOptionIds: z.array(z.string()).optional(),
      sampleAnswer: z.string().trim().optional(),
    })
    .optional(),
  marks: z
    .number({ required_error: 'Marks are required', invalid_type_error: 'Marks must be a number' })
    .min(0),
  negativeMarks: z.number().min(0).default(0),
  explanation: z.string().trim().max(2000).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

const addQuestionSchema = addQuestionBaseSchema.refine(
  data => {
    if (data.type === 'MCQ_SINGLE' || data.type === 'MCQ_MULTIPLE') {
      return data.options && data.options.length >= 2;
    }
    return true;
  },
  { message: 'MCQ questions must have at least 2 options', path: ['options'] }
);

const updateQuestionSchema = addQuestionBaseSchema.partial();

const reorderQuestionsSchema = z.object({
  // Array of { questionId, displayOrder }
  order: z.array(
    z.object({
      questionId: z.string().min(1),
      displayOrder: z.number().int().min(0),
    })
  ).min(1, 'At least one question must be provided'),
});

module.exports = {
  createExamSchema,
  updateExamSchema,
  addQuestionSchema,
  updateQuestionSchema,
  reorderQuestionsSchema,
};
