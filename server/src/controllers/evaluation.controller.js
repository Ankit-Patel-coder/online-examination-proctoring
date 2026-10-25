// server/src/controllers/evaluation.controller.js
// Manual grading, results release, proctoring incident review, and exam performance analytics.
const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const ExamAttempt = require('../models/ExamAttempt');
const ProctoringEvent = require('../models/ProctoringEvent');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');

// Helper: Assert exam ownership or admin
const assertExamOwnerOrAdmin = (exam, req) => {
  if (
    exam.createdBy.toString() !== req.user._id.toString() &&
    req.user.role !== 'ADMIN'
  ) {
    throw ApiError.forbidden('You do not have permission to manage this exam');
  }
};

/**
 * GET /api/exams/:id/attempts
 * List all student attempts for a particular exam.
 */
const listExamAttempts = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) throw ApiError.notFound('Exam not found');
    assertExamOwnerOrAdmin(exam, req);

    const attempts = await ExamAttempt.find({ examId: exam._id })
      .sort({ createdAt: -1 })
      .populate('studentId', 'name email');

    // Aggregate proctoring violation counts per attempt
    const attemptIds = attempts.map(a => a._id);
    const eventCounts = await ProctoringEvent.aggregate([
      { $match: { attemptId: { $in: attemptIds } } },
      { $group: { _id: '$attemptId', count: { $sum: 1 } } },
    ]);

    const eventCountMap = new Map();
    eventCounts.forEach(item => eventCountMap.set(item._id.toString(), item.count));

    const attemptsWithFlags = attempts.map(att => {
      const doc = att.toObject();
      doc.proctoringFlagCount = eventCountMap.get(att._id.toString()) || 0;
      return doc;
    });

    return res.json({
      success: true,
      data: { attempts: attemptsWithFlags, examTitle: exam.title },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/attempts/:id/evaluation
 * Fetch full attempt details with questions (+answerKey) for manual evaluation.
 */
const getAttemptForEvaluation = async (req, res, next) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.id)
      .populate('studentId', 'name email')
      .populate('examId', 'title description maximumMarks createdBy');

    if (!attempt) throw ApiError.notFound('Attempt not found');
    assertExamOwnerOrAdmin(attempt.examId, req);

    const questions = await Question.find({ examId: attempt.examId._id })
      .sort({ displayOrder: 1 })
      .select('+answerKey');

    return res.json({
      success: true,
      data: {
        attempt,
        questions,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/attempts/:id/evaluate
 * Grade questions manually (descriptive/short answers), adjust marks, and finalize score.
 */
const evaluateAttempt = async (req, res, next) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.id).populate('examId');
    if (!attempt) throw ApiError.notFound('Attempt not found');
    assertExamOwnerOrAdmin(attempt.examId, req);

    const { evaluations } = req.body;
    const questions = await Question.find({ examId: attempt.examId._id });
    const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

    // Apply manual evaluations to questionResults
    evaluations.forEach(ev => {
      const q = questionMap.get(ev.questionId);
      if (!q) return;

      const marksAwarded = Math.min(Math.max(0, Number(ev.marksAwarded)), q.marks);
      const existingIdx = attempt.questionResults.findIndex(
        qr => qr.questionId.toString() === ev.questionId
      );

      const resultObj = {
        questionId: q._id,
        marksAwarded,
        isCorrect: marksAwarded === q.marks ? true : marksAwarded > 0 ? null : false,
        teacherFeedback: ev.teacherFeedback || '',
        gradedAt: new Date(),
        gradedBy: req.user._id,
      };

      if (existingIdx >= 0) {
        attempt.questionResults[existingIdx] = resultObj;
      } else {
        attempt.questionResults.push(resultObj);
      }
    });

    // Recompute total score
    const totalScore = attempt.questionResults.reduce(
      (sum, qr) => sum + (qr.marksAwarded || 0),
      0
    );

    attempt.score = Math.max(0, totalScore);

    // Check if any question remains ungraded
    const totalQuestionsCount = questions.length;
    const gradedCount = attempt.questionResults.filter(qr => qr.gradedAt).length;

    attempt.evaluationStatus = gradedCount >= totalQuestionsCount ? 'COMPLETE' : 'MANUAL_PENDING';
    if (attempt.status === 'SUBMITTED' && attempt.evaluationStatus === 'COMPLETE') {
      attempt.status = 'EVALUATED';
    }

    await attempt.save();

    await AuditLog.create({
      action: 'EXAM_EVALUATED',
      actorId: req.user._id,
      actorRole: req.user.role,
      targetType: 'ExamAttempt',
      targetId: attempt._id,
      safeMetadata: {
        score: attempt.score,
        evaluationStatus: attempt.evaluationStatus,
        evaluatedBy: req.user.name,
      },
    });

    return res.json({
      success: true,
      message: 'Evaluation saved successfully',
      data: {
        attemptId: attempt._id,
        score: attempt.score,
        maxScore: attempt.maxScore,
        evaluationStatus: attempt.evaluationStatus,
        status: attempt.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/exams/:id/release-results
 * Release results for all student attempts of this exam.
 */
const releaseExamResults = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) throw ApiError.notFound('Exam not found');
    assertExamOwnerOrAdmin(exam, req);

    const releasedDate = new Date();

    const updateRes = await ExamAttempt.updateMany(
      { examId: exam._id, status: { $in: ['SUBMITTED', 'EVALUATED'] } },
      { $set: { resultReleasedAt: releasedDate } }
    );

    exam.resultRelease.showAnswerKey = true;
    await exam.save();

    await AuditLog.create({
      action: 'RESULTS_RELEASED',
      actorId: req.user._id,
      actorRole: req.user.role,
      targetType: 'Exam',
      targetId: exam._id,
      safeMetadata: {
        examTitle: exam.title,
        updatedAttemptsCount: updateRes.modifiedCount,
      },
    });

    return res.json({
      success: true,
      message: `Results released to ${updateRes.modifiedCount} student(s)`,
      data: {
        modifiedCount: updateRes.modifiedCount,
        releasedAt: releasedDate,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/exams/:id/analytics
 * Comprehensive performance metrics, score distributions, and question difficulty rates.
 */
const getExamAnalytics = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) throw ApiError.notFound('Exam not found');
    assertExamOwnerOrAdmin(exam, req);

    const [attempts, questions, proctoringEvents] = await Promise.all([
      ExamAttempt.find({ examId: exam._id }).populate('studentId', 'name email'),
      Question.find({ examId: exam._id }).sort({ displayOrder: 1 }),
      ProctoringEvent.find({
        attemptId: { $in: await ExamAttempt.find({ examId: exam._id }).distinct('_id') },
      }),
    ]);

    const completedAttempts = attempts.filter(a =>
      ['SUBMITTED', 'EVALUATED'].includes(a.status)
    );

    const scores = completedAttempts.map(a => a.score ?? 0);
    const maxMarks = exam.maximumMarks || 100;

    let averageScore = 0;
    let highestScore = 0;
    let lowestScore = 0;
    let medianScore = 0;
    let passCount = 0;

    if (scores.length > 0) {
      scores.sort((a, b) => a - b);
      highestScore = scores[scores.length - 1];
      lowestScore = scores[0];
      const sum = scores.reduce((acc, val) => acc + val, 0);
      averageScore = Math.round((sum / scores.length) * 10) / 10;

      const mid = Math.floor(scores.length / 2);
      medianScore = scores.length % 2 !== 0 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;

      // Pass criteria: score >= 40% of max marks
      const passThreshold = maxMarks * 0.4;
      passCount = scores.filter(s => s >= passThreshold).length;
    }

    const passRate = scores.length > 0 ? Math.round((passCount / scores.length) * 100) : 0;

    // Score distribution buckets (0-25%, 26-50%, 51-75%, 76-100%)
    const distribution = [
      { range: '0-25%', count: 0 },
      { range: '26-50%', count: 0 },
      { range: '51-75%', count: 0 },
      { range: '76-100%', count: 0 },
    ];

    scores.forEach(s => {
      const pct = (s / (maxMarks || 1)) * 100;
      if (pct <= 25) distribution[0].count++;
      else if (pct <= 50) distribution[1].count++;
      else if (pct <= 75) distribution[2].count++;
      else distribution[3].count++;
    });

    // Question-level accuracy analysis
    const questionAnalytics = questions.map((q, idx) => {
      let correctAnswers = 0;
      let totalAnswered = 0;

      completedAttempts.forEach(att => {
        const qr = att.questionResults?.find(
          r => r.questionId.toString() === q._id.toString()
        );
        if (qr) {
          totalAnswered++;
          if (qr.isCorrect === true || qr.marksAwarded === q.marks) {
            correctAnswers++;
          }
        }
      });

      const accuracy =
        totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;

      return {
        questionNumber: idx + 1,
        questionId: q._id,
        text: q.text,
        type: q.type,
        marks: q.marks,
        totalAnswered,
        correctAnswers,
        accuracyPercentage: accuracy,
      };
    });

    // Proctoring violation statistics
    const proctoringBreakdown = {};
    proctoringEvents.forEach(ev => {
      proctoringBreakdown[ev.eventType] = (proctoringBreakdown[ev.eventType] || 0) + 1;
    });

    return res.json({
      success: true,
      data: {
        exam: {
          id: exam._id,
          title: exam.title,
          maximumMarks: maxMarks,
          durationMinutes: exam.durationMinutes,
        },
        overview: {
          totalSubmissions: completedAttempts.length,
          totalInComplete: attempts.length - completedAttempts.length,
          averageScore,
          highestScore,
          lowestScore,
          medianScore,
          passRate,
        },
        scoreDistribution: distribution,
        questionAnalytics,
        proctoringSummary: {
          totalEvents: proctoringEvents.length,
          breakdown: proctoringBreakdown,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/exams/:id/proctoring-events
 * List all suspicious events flagged across an exam.
 */
const listExamProctoringEvents = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) throw ApiError.notFound('Exam not found');
    assertExamOwnerOrAdmin(exam, req);

    const attempts = await ExamAttempt.find({ examId: exam._id }).select('_id studentId');
    const attemptIds = attempts.map(a => a._id);

    const events = await ProctoringEvent.find({ attemptId: { $in: attemptIds } })
      .sort({ occurredAt: -1 })
      .populate({
        path: 'attemptId',
        select: 'studentId startedAt submittedAt status',
        populate: { path: 'studentId', select: 'name email' },
      });

    return res.json({
      success: true,
      data: { events, examTitle: exam.title },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/proctoring/events/:id/review
 * Update the review status of an incident (REVIEWED or DISMISSED) with reviewer notes.
 */
const reviewProctoringEvent = async (req, res, next) => {
  try {
    const event = await ProctoringEvent.findById(req.params.id).populate('attemptId');
    if (!event) throw ApiError.notFound('Proctoring event not found');

    const exam = await Exam.findById(event.attemptId.examId);
    if (exam) assertExamOwnerOrAdmin(exam, req);

    const { reviewStatus, reviewerNotes } = req.body;
    event.reviewStatus = reviewStatus;
    event.reviewerNotes = reviewerNotes || '';
    event.reviewedBy = req.user._id;
    event.reviewedAt = new Date();

    await event.save();

    return res.json({
      success: true,
      message: `Incident marked as ${reviewStatus}`,
      data: event,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listExamAttempts,
  getAttemptForEvaluation,
  evaluateAttempt,
  releaseExamResults,
  getExamAnalytics,
  listExamProctoringEvents,
  reviewProctoringEvent,
};
