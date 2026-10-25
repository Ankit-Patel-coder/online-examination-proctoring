// server/src/routes/exam.routes.js
// Exam and question routes — accessible by TEACHER and ADMIN (and STUDENT for read).
const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createExamSchema,
  updateExamSchema,
  addQuestionSchema,
  updateQuestionSchema,
  reorderQuestionsSchema,
} = require('../validators/exam.validators');
const {
  createExam, listExams, getExam, updateExam, deleteExam,
  publishExam, cancelExam,
  addQuestion, updateQuestion, deleteQuestion, reorderQuestions,
} = require('../controllers/exam.controller');

const {
  listExamAttempts,
  getExamAnalytics,
  listExamProctoringEvents,
  releaseExamResults,
} = require('../controllers/evaluation.controller');

// All exam routes require authentication
router.use(authenticate);

// ── Exam CRUD ──
router.post('/', authorize('TEACHER', 'ADMIN'), validate(createExamSchema), createExam);
router.get('/', listExams); // teachers=own, admins=all, students=published
router.get('/:id', getExam);
router.put('/:id', authorize('TEACHER', 'ADMIN'), validate(updateExamSchema), updateExam);
router.delete('/:id', authorize('TEACHER', 'ADMIN'), deleteExam);

// ── Exam lifecycle ──
router.patch('/:id/publish', authorize('TEACHER', 'ADMIN'), publishExam);
router.patch('/:id/cancel', authorize('TEACHER', 'ADMIN'), cancelExam);

// ── Question management ──
router.post('/:id/questions', authorize('TEACHER', 'ADMIN'), validate(addQuestionSchema), addQuestion);
router.patch('/:id/questions/reorder', authorize('TEACHER', 'ADMIN'), validate(reorderQuestionsSchema), reorderQuestions);
router.put('/:examId/questions/:questionId', authorize('TEACHER', 'ADMIN'), validate(updateQuestionSchema), updateQuestion);
router.delete('/:examId/questions/:questionId', authorize('TEACHER', 'ADMIN'), deleteQuestion);

// ── Evaluation, Analytics & Proctoring ──
router.get('/:id/attempts', authorize('TEACHER', 'ADMIN'), listExamAttempts);
router.get('/:id/analytics', authorize('TEACHER', 'ADMIN'), getExamAnalytics);
router.get('/:id/proctoring-events', authorize('TEACHER', 'ADMIN'), listExamProctoringEvents);
router.patch('/:id/release-results', authorize('TEACHER', 'ADMIN'), releaseExamResults);

module.exports = router;
