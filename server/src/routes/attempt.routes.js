// server/src/routes/attempt.routes.js
// Student exam taking and attempt routes.
const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  startAttemptSchema,
  saveAnswersSchema,
  submitAttemptSchema,
  proctoringEventSchema,
} = require('../validators/attempt.validators');
const {
  startAttempt,
  getAttempt,
  saveAnswers,
  submitAttempt,
  recordProctoringEvent,
  getMyAttempts,
  getAttemptResults,
} = require('../controllers/attempt.controller');

const {
  evaluateAttemptSchema,
  reviewProctoringEventSchema,
} = require('../validators/evaluation.validators');
const {
  getAttemptForEvaluation,
  evaluateAttempt,
  reviewProctoringEvent,
} = require('../controllers/evaluation.controller');

const {
  proctoringEventLimiter,
  attemptActionLimiter,
} = require('../middleware/rateLimiters');

// All routes require authentication
router.use(authenticate);

// Student routes
router.post('/start', authorize('STUDENT', 'ADMIN'), validate(startAttemptSchema), startAttempt);
router.get('/my', authorize('STUDENT'), getMyAttempts);
router.get('/:id', getAttempt);
router.put('/:id/save', authorize('STUDENT'), attemptActionLimiter, validate(saveAnswersSchema), saveAnswers);
router.post('/:id/submit', authorize('STUDENT'), attemptActionLimiter, validate(submitAttemptSchema), submitAttempt);
router.post('/:id/events', authorize('STUDENT'), proctoringEventLimiter, validate(proctoringEventSchema), recordProctoringEvent);
router.get('/:id/results', getAttemptResults);

// Teacher/Admin Evaluation & Review routes
router.get('/:id/evaluation', authorize('TEACHER', 'ADMIN'), getAttemptForEvaluation);
router.put('/:id/evaluate', authorize('TEACHER', 'ADMIN'), validate(evaluateAttemptSchema), evaluateAttempt);
router.patch('/events/:id/review', authorize('TEACHER', 'ADMIN'), validate(reviewProctoringEventSchema), reviewProctoringEvent);

module.exports = router;
