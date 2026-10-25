// server/src/controllers/attempt.controller.js
// Student exam attempt lifecycle, answer auto-saving, auto-grading, and proctoring events.
const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const ExamAttempt = require('../models/ExamAttempt');
const ProctoringEvent = require('../models/ProctoringEvent');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const { getIO } = require('../config/socket');

/**
 * POST /api/attempts/start
 * Start a new exam attempt or resume an ongoing one.
 */
const startAttempt = async (req, res, next) => {
  try {
    const { examId } = req.body;
    const studentId = req.user._id;

    const exam = await Exam.findById(examId);
    if (!exam) throw ApiError.notFound('Exam not found');

    if (exam.status !== 'PUBLISHED') {
      throw ApiError.badRequest('This exam is not currently available for taking');
    }

    const now = new Date();
    if (exam.startTime && now < new Date(exam.startTime)) {
      throw ApiError.badRequest('This exam has not started yet');
    }
    if (exam.endTime && now > new Date(exam.endTime)) {
      throw ApiError.badRequest('This exam window has closed');
    }

    // Check if there is an already IN_PROGRESS attempt
    let existingAttempt = await ExamAttempt.findOne({
      examId: exam._id,
      studentId,
      status: 'IN_PROGRESS',
    });

    if (existingAttempt) {
      // Check if deadline has passed
      if (now > existingAttempt.deadlineAt) {
        existingAttempt.status = 'EXPIRED';
        await existingAttempt.save();
      } else {
        // Resume active attempt
        const questions = await Question.find({ examId: exam._id })
          .sort({ displayOrder: 1 })
          .select('-answerKey');

        return res.json({
          success: true,
          message: 'Resuming existing attempt',
          data: {
            attempt: existingAttempt,
            exam: {
              _id: exam._id,
              title: exam.title,
              instructions: exam.instructions,
              durationMinutes: exam.durationMinutes,
              endTime: exam.endTime,
              proctoring: exam.proctoring,
            },
            questions,
            timeRemainingSeconds: Math.max(
              0,
              Math.floor((new Date(existingAttempt.deadlineAt).getTime() - Date.now()) / 1000)
            ),
          },
        });
      }
    }

    // Check attempt count
    const attemptCount = await ExamAttempt.countDocuments({
      examId: exam._id,
      studentId,
      status: { $in: ['SUBMITTED', 'EVALUATED', 'EXPIRED'] },
    });

    if (attemptCount >= exam.attemptLimit) {
      throw ApiError.badRequest(
        `You have reached the maximum allowed attempts (${exam.attemptLimit}) for this exam`
      );
    }

    // Calculate deadline: startedAt + durationMinutes, capped at exam.endTime
    const startedAt = new Date();
    const durationDeadline = new Date(startedAt.getTime() + exam.durationMinutes * 60 * 1000);
    const examEndDeadline = exam.endTime ? new Date(exam.endTime) : durationDeadline;
    const deadlineAt = durationDeadline < examEndDeadline ? durationDeadline : examEndDeadline;

    const attempt = await ExamAttempt.create({
      examId: exam._id,
      studentId,
      attemptNumber: attemptCount + 1,
      status: 'IN_PROGRESS',
      startedAt,
      deadlineAt,
      answers: [],
      proctoringSettingsSnapshot: exam.proctoring || {},
      ipAddress: req.ip,
    });

    await AuditLog.create({
      action: 'EXAM_ATTEMPT_STARTED',
      actorId: studentId,
      actorRole: req.user.role,
      targetType: 'ExamAttempt',
      targetId: attempt._id,
      safeMetadata: { examId: exam._id, attemptNumber: attempt.attemptNumber },
    });

    const questions = await Question.find({ examId: exam._id })
      .sort({ displayOrder: 1 })
      .select('-answerKey');

    return res.status(201).json({
      success: true,
      message: 'Exam attempt started',
      data: {
        attempt,
        exam: {
          _id: exam._id,
          title: exam.title,
          instructions: exam.instructions,
          durationMinutes: exam.durationMinutes,
          endTime: exam.endTime,
          proctoring: exam.proctoring,
        },
        questions,
        timeRemainingSeconds: Math.max(
          0,
          Math.floor((new Date(deadlineAt).getTime() - Date.now()) / 1000)
        ),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/attempts/:id
 * Retrieve details and state of an attempt.
 */
const getAttempt = async (req, res, next) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.id);
    if (!attempt) throw ApiError.notFound('Exam attempt not found');

    if (
      attempt.studentId.toString() !== req.user._id.toString() &&
      !['TEACHER', 'ADMIN'].includes(req.user.role)
    ) {
      throw ApiError.forbidden('Access denied');
    }

    // Check expiry
    if (attempt.status === 'IN_PROGRESS' && new Date() > attempt.deadlineAt) {
      attempt.status = 'EXPIRED';
      await attempt.save();
    }

    const exam = await Exam.findById(attempt.examId).select(
      'title instructions durationMinutes endTime proctoring negativeMarking randomizeQuestions'
    );

    const questionsQuery = Question.find({ examId: attempt.examId }).sort({ displayOrder: 1 });
    if (req.user.role === 'STUDENT') {
      questionsQuery.select('-answerKey');
    } else {
      questionsQuery.select('+answerKey');
    }
    const questions = await questionsQuery;

    const timeRemainingSeconds =
      attempt.status === 'IN_PROGRESS'
        ? Math.max(0, Math.floor((new Date(attempt.deadlineAt).getTime() - Date.now()) / 1000))
        : 0;

    return res.json({
      success: true,
      data: {
        attempt,
        exam,
        questions,
        timeRemainingSeconds,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/attempts/:id/save
 * Auto-save answers while attempt is in progress.
 */
const saveAnswers = async (req, res, next) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.id);
    if (!attempt) throw ApiError.notFound('Attempt not found');

    if (attempt.studentId.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('Access denied');
    }

    if (attempt.status !== 'IN_PROGRESS') {
      throw ApiError.badRequest('This attempt is no longer in progress');
    }

    if (new Date() > attempt.deadlineAt) {
      attempt.status = 'EXPIRED';
      await attempt.save();
      throw ApiError.badRequest('Time expired. Your attempt has been closed.');
    }

    const { answers } = req.body;
    if (Array.isArray(answers)) {
      answers.forEach(newAns => {
        const idx = attempt.answers.findIndex(
          a => a.questionId.toString() === newAns.questionId.toString()
        );
        const ansObj = {
          questionId: newAns.questionId,
          selectedOptionIds: newAns.selectedOptionIds || [],
          textAnswer: newAns.textAnswer || '',
          savedAt: new Date(),
        };

        if (idx >= 0) {
          attempt.answers[idx] = ansObj;
        } else {
          attempt.answers.push(ansObj);
        }
      });
    }

    await attempt.save();

    return res.json({
      success: true,
      message: 'Answers saved',
      data: {
        savedCount: attempt.answers.length,
        savedAt: new Date(),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/attempts/:id/submit
 * Submit exam, compute auto-grading for MCQs & True/False, set score.
 */
const submitAttempt = async (req, res, next) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.id);
    if (!attempt) throw ApiError.notFound('Attempt not found');

    if (attempt.studentId.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('Access denied');
    }

    if (attempt.status !== 'IN_PROGRESS') {
      throw ApiError.badRequest('Attempt has already been submitted or expired');
    }

    // Save final answers batch if provided
    if (req.body.answers && Array.isArray(req.body.answers)) {
      req.body.answers.forEach(newAns => {
        const idx = attempt.answers.findIndex(
          a => a.questionId.toString() === newAns.questionId.toString()
        );
        const ansObj = {
          questionId: newAns.questionId,
          selectedOptionIds: newAns.selectedOptionIds || [],
          textAnswer: newAns.textAnswer || '',
          savedAt: new Date(),
        };
        if (idx >= 0) {
          attempt.answers[idx] = ansObj;
        } else {
          attempt.answers.push(ansObj);
        }
      });
    }

    const exam = await Exam.findById(attempt.examId);
    const questions = await Question.find({ examId: attempt.examId }).select('+answerKey');

    let totalScore = 0;
    let maxPossibleScore = 0;
    let hasManualGrading = false;
    const questionResults = [];

    const answerMap = new Map();
    attempt.answers.forEach(a => answerMap.set(a.questionId.toString(), a));

    for (const q of questions) {
      maxPossibleScore += q.marks;
      const studentAns = answerMap.get(q._id.toString());
      let marksAwarded = 0;
      let isCorrect = null;

      if (['MCQ_SINGLE', 'TRUE_FALSE'].includes(q.type)) {
        const correctId = q.answerKey?.correctOptionIds?.[0]?.toString();
        const selectedId = studentAns?.selectedOptionIds?.[0]?.toString();

        if (selectedId) {
          if (correctId && selectedId === correctId) {
            isCorrect = true;
            marksAwarded = q.marks;
          } else {
            isCorrect = false;
            marksAwarded = exam.negativeMarking?.enabled
              ? -(q.negativeMarks || (q.marks * (exam.negativeMarking.defaultPenaltyFraction || 0)))
              : 0;
          }
        } else {
          isCorrect = false;
          marksAwarded = 0;
        }
      } else if (q.type === 'MCQ_MULTIPLE') {
        const correctSet = new Set((q.answerKey?.correctOptionIds || []).map(id => id.toString()));
        const selectedList = (studentAns?.selectedOptionIds || []).map(id => id.toString());

        if (selectedList.length > 0) {
          const allCorrectChosen =
            correctSet.size === selectedList.length &&
            selectedList.every(id => correctSet.has(id));

          if (allCorrectChosen) {
            isCorrect = true;
            marksAwarded = q.marks;
          } else {
            isCorrect = false;
            marksAwarded = exam.negativeMarking?.enabled
              ? -(q.negativeMarks || (q.marks * (exam.negativeMarking.defaultPenaltyFraction || 0)))
              : 0;
          }
        } else {
          isCorrect = false;
          marksAwarded = 0;
        }
      } else {
        // SHORT_ANSWER or DESCRIPTIVE requires manual review
        hasManualGrading = true;
        isCorrect = null;
        marksAwarded = 0;
      }

      totalScore += marksAwarded;
      questionResults.push({
        questionId: q._id,
        marksAwarded,
        isCorrect,
        gradedAt: hasManualGrading && isCorrect === null ? null : new Date(),
      });
    }

    attempt.status = 'SUBMITTED';
    attempt.submittedAt = new Date();
    attempt.score = Math.max(0, totalScore);
    attempt.maxScore = maxPossibleScore;
    attempt.questionResults = questionResults;
    attempt.evaluationStatus = hasManualGrading ? 'MANUAL_PENDING' : 'AUTO_GRADED';

    await attempt.save();

    await AuditLog.create({
      action: 'EXAM_ATTEMPT_SUBMITTED',
      actorId: req.user._id,
      actorRole: req.user.role,
      targetType: 'ExamAttempt',
      targetId: attempt._id,
      safeMetadata: {
        examId: exam._id,
        score: attempt.score,
        maxScore: attempt.maxScore,
        evaluationStatus: attempt.evaluationStatus,
      },
    });

    const io = getIO();
    if (io) {
      io.to(`exam:${exam._id}`).emit('attempt:submitted', {
        attemptId: attempt._id,
        examId: exam._id,
        studentName: req.user.name,
        score: attempt.score,
        maxScore: attempt.maxScore,
        submittedAt: attempt.submittedAt,
      });
    }

    return res.json({
      success: true,
      message: 'Exam submitted successfully',
      data: {
        attemptId: attempt._id,
        status: attempt.status,
        submittedAt: attempt.submittedAt,
        score: attempt.score,
        maxScore: attempt.maxScore,
        evaluationStatus: attempt.evaluationStatus,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/attempts/:id/events
 * Record a proctoring violation event (tab hidden, fullscreen exit, etc.).
 */
const recordProctoringEvent = async (req, res, next) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.id);
    if (!attempt) throw ApiError.notFound('Attempt not found');

    if (
      attempt.studentId.toString() !== req.user._id.toString() &&
      !['TEACHER', 'ADMIN'].includes(req.user.role)
    ) {
      throw ApiError.forbidden('Access denied');
    }

    const { eventType, durationMs, description } = req.body;

    const event = await ProctoringEvent.create({
      attemptId: attempt._id,
      eventType,
      durationMs: durationMs || 0,
      description: description || `Proctoring alert: ${eventType}`,
      occurredAt: new Date(),
    });

    const io = getIO();
    if (io) {
      io.to(`exam:${attempt.examId}`).emit('proctoring:incident', {
        attemptId: attempt._id,
        examId: attempt.examId,
        studentName: req.user.name,
        studentEmail: req.user.email,
        eventType: event.eventType,
        description: event.description,
        occurredAt: event.occurredAt,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Event recorded',
      data: {
        id: event._id,
        eventType: event.eventType,
        occurredAt: event.occurredAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/attempts/my
 * Get all attempts made by the authenticated student.
 */
const getMyAttempts = async (req, res, next) => {
  try {
    const attempts = await ExamAttempt.find({ studentId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('examId', 'title durationMinutes maximumMarks startTime endTime resultRelease');

    return res.json({
      success: true,
      message: 'Student attempts retrieved',
      data: { attempts },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/attempts/:id/results
 * Get graded results for an attempt if authorized or released.
 */
const getAttemptResults = async (req, res, next) => {
  try {
    const attempt = await ExamAttempt.findById(req.params.id)
      .populate('examId', 'title description maximumMarks resultRelease')
      .populate('studentId', 'name email');

    if (!attempt) throw ApiError.notFound('Attempt not found');

    const isOwner = attempt.studentId._id.toString() === req.user._id.toString();
    const isTeacherOrAdmin = ['TEACHER', 'ADMIN'].includes(req.user.role);

    if (!isOwner && !isTeacherOrAdmin) {
      throw ApiError.forbidden('Access denied');
    }

    // If student, check if result release is allowed
    if (isOwner && !isTeacherOrAdmin) {
      const exam = attempt.examId;
      const isAutoReleased =
        exam?.resultRelease?.mode === 'AUTO_AFTER_DEADLINE' &&
        new Date() > new Date(exam.endTime);
      const isExplicitlyReleased = !!attempt.resultReleasedAt;

      if (!isAutoReleased && !isExplicitlyReleased) {
        return res.json({
          success: true,
          message: 'Results are pending release by instructor',
          data: {
            isReleased: false,
            status: attempt.status,
            evaluationStatus: attempt.evaluationStatus,
            submittedAt: attempt.submittedAt,
          },
        });
      }
    }

    // Return full results with questions
    const questions = await Question.find({ examId: attempt.examId._id })
      .sort({ displayOrder: 1 })
      .select('+answerKey');

    return res.json({
      success: true,
      message: 'Attempt results retrieved',
      data: {
        isReleased: true,
        attempt,
        questions,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  startAttempt,
  getAttempt,
  saveAnswers,
  submitAttempt,
  recordProctoringEvent,
  getMyAttempts,
  getAttemptResults,
};
