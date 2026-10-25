// server/src/controllers/exam.controller.js
// Teacher exam CRUD + publish/cancel + question management.
const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Verify the requesting user owns (created) the exam — or is admin. */
const assertOwnerOrAdmin = (exam, req) => {
  if (
    exam.createdBy.toString() !== req.user._id.toString() &&
    req.user.role !== 'ADMIN'
  ) {
    throw ApiError.forbidden('You do not have permission to modify this exam');
  }
};

/** Recalculate maximumMarks and totalQuestions from the questions collection. */
const syncExamTotals = async (examId) => {
  const targetId = typeof examId === 'string' ? new mongoose.Types.ObjectId(examId) : examId;
  const agg = await Question.aggregate([
    { $match: { examId: targetId } },
    { $group: { _id: null, totalMarks: { $sum: '$marks' }, count: { $sum: 1 } } },
  ]);
  const { totalMarks = 0, count = 0 } = agg[0] || {};
  await Exam.findByIdAndUpdate(examId, { maximumMarks: totalMarks, totalQuestions: count });
};

// ─── Exam CRUD ────────────────────────────────────────────────────────────────

/**
 * POST /api/exams
 * Create a new exam (DRAFT by default). Teacher/Admin only.
 */
const createExam = async (req, res, next) => {
  try {
    const exam = await Exam.create({ ...req.body, createdBy: req.user._id });

    await AuditLog.create({
      action: 'EXAM_CREATED',
      actorId: req.user._id,
      actorRole: req.user.role,
      targetType: 'Exam',
      targetId: exam._id,
      safeMetadata: { title: exam.title, status: exam.status },
    });

    return res.status(201).json({ success: true, message: 'Exam created', data: exam });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/exams
 * List exams. Teachers see only their own. Admins see all.
 * Students see only PUBLISHED exams within the active window (Phase 5).
 */
const listExams = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.user.role === 'TEACHER') filter.createdBy = req.user._id;
    if (req.user.role === 'STUDENT') filter.status = 'PUBLISHED';
    if (req.query.status) filter.status = req.query.status;

    const [exams, total] = await Promise.all([
      Exam.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email'),
      Exam.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      message: 'Exams retrieved',
      data: {
        exams,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/exams/:id
 * Get a single exam with its questions (answer keys excluded for students).
 */
const getExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id).populate('createdBy', 'name email');
    if (!exam) throw ApiError.notFound('Exam not found');

    // Students can only see published exams
    if (req.user.role === 'STUDENT' && exam.status !== 'PUBLISHED') {
      throw ApiError.notFound('Exam not found');
    }

    // Fetch questions — include answerKey only for teacher/admin
    const questionsQuery = Question.find({ examId: exam._id }).sort({ displayOrder: 1 });
    if (req.user.role !== 'STUDENT') {
      questionsQuery.select('+answerKey');
    }
    const questions = await questionsQuery;

    return res.json({
      success: true,
      message: 'Exam retrieved',
      data: { exam, questions },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/exams/:id
 * Update exam settings. Only allowed while in DRAFT or SCHEDULED status.
 */
const updateExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) throw ApiError.notFound('Exam not found');
    assertOwnerOrAdmin(exam, req);

    if (!['DRAFT', 'SCHEDULED'].includes(exam.status)) {
      throw ApiError.badRequest('Only DRAFT or SCHEDULED exams can be edited');
    }

    Object.assign(exam, req.body);
    await exam.save();

    return res.json({ success: true, message: 'Exam updated', data: exam });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/exams/:id
 * Delete a DRAFT exam and all its questions.
 */
const deleteExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) throw ApiError.notFound('Exam not found');
    assertOwnerOrAdmin(exam, req);

    if (exam.status !== 'DRAFT') {
      throw ApiError.badRequest('Only DRAFT exams can be deleted');
    }

    await Promise.all([
      Question.deleteMany({ examId: exam._id }),
      exam.deleteOne(),
    ]);

    await AuditLog.create({
      action: 'EXAM_DELETED',
      actorId: req.user._id,
      actorRole: req.user.role,
      targetType: 'Exam',
      targetId: exam._id,
      safeMetadata: { title: exam.title },
    });

    return res.json({ success: true, message: 'Exam deleted', data: null });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/exams/:id/publish
 * Publish a DRAFT or SCHEDULED exam. Requires at least 1 question.
 */
const publishExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) throw ApiError.notFound('Exam not found');
    assertOwnerOrAdmin(exam, req);

    if (!['DRAFT', 'SCHEDULED'].includes(exam.status)) {
      throw ApiError.badRequest('Only DRAFT or SCHEDULED exams can be published');
    }

    const questionCount = await Question.countDocuments({ examId: exam._id });
    if (questionCount === 0) {
      throw ApiError.badRequest('You must add at least one question before publishing');
    }

    exam.status = 'PUBLISHED';
    exam.publishedAt = new Date();
    await exam.save();

    await AuditLog.create({
      action: 'EXAM_PUBLISHED',
      actorId: req.user._id,
      actorRole: req.user.role,
      targetType: 'Exam',
      targetId: exam._id,
      safeMetadata: { title: exam.title, questionCount },
    });

    return res.json({ success: true, message: 'Exam published successfully', data: exam });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/exams/:id/cancel
 * Cancel a PUBLISHED or SCHEDULED exam.
 */
const cancelExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) throw ApiError.notFound('Exam not found');
    assertOwnerOrAdmin(exam, req);

    if (!['PUBLISHED', 'SCHEDULED'].includes(exam.status)) {
      throw ApiError.badRequest('Only PUBLISHED or SCHEDULED exams can be cancelled');
    }

    exam.status = 'CANCELLED';
    exam.cancelledAt = new Date();
    exam.cancelReason = req.body.reason || 'No reason provided';
    await exam.save();

    await AuditLog.create({
      action: 'EXAM_CANCELLED',
      actorId: req.user._id,
      actorRole: req.user.role,
      targetType: 'Exam',
      targetId: exam._id,
      safeMetadata: { title: exam.title, reason: exam.cancelReason },
    });

    return res.json({ success: true, message: 'Exam cancelled', data: exam });
  } catch (err) {
    next(err);
  }
};

// ─── Question CRUD ────────────────────────────────────────────────────────────

/**
 * POST /api/exams/:id/questions
 * Add a question to an exam. Only allowed in DRAFT/SCHEDULED.
 */
const addQuestion = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) throw ApiError.notFound('Exam not found');
    assertOwnerOrAdmin(exam, req);

    if (!['DRAFT', 'SCHEDULED'].includes(exam.status)) {
      throw ApiError.badRequest('Questions can only be added to DRAFT or SCHEDULED exams');
    }

    // Auto-fill TRUE_FALSE options if omitted
    let { options } = req.body;
    if (req.body.type === 'TRUE_FALSE' && (!options || options.length === 0)) {
      options = [{ text: 'True' }, { text: 'False' }];
    }

    // Determine displayOrder (append to end)
    const lastQuestion = await Question.findOne({ examId: exam._id })
      .sort({ displayOrder: -1 })
      .select('displayOrder');
    const displayOrder = req.body.displayOrder ?? ((lastQuestion?.displayOrder ?? -1) + 1);

    const question = await Question.create({
      ...req.body,
      options: options || [],
      examId: exam._id,
      displayOrder,
    });

    // Keep exam totals in sync
    await syncExamTotals(exam._id);

    return res.status(201).json({ success: true, message: 'Question added', data: question });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/exams/:examId/questions/:questionId
 * Update a question.
 */
const updateQuestion = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) throw ApiError.notFound('Exam not found');
    assertOwnerOrAdmin(exam, req);

    if (!['DRAFT', 'SCHEDULED'].includes(exam.status)) {
      throw ApiError.badRequest('Questions can only be edited on DRAFT or SCHEDULED exams');
    }

    const question = await Question.findOne({ _id: req.params.questionId, examId: exam._id });
    if (!question) throw ApiError.notFound('Question not found');

    Object.assign(question, req.body);
    await question.save();
    await syncExamTotals(exam._id);

    return res.json({ success: true, message: 'Question updated', data: question });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/exams/:examId/questions/:questionId
 * Remove a question from an exam.
 */
const deleteQuestion = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) throw ApiError.notFound('Exam not found');
    assertOwnerOrAdmin(exam, req);

    if (!['DRAFT', 'SCHEDULED'].includes(exam.status)) {
      throw ApiError.badRequest('Questions can only be removed from DRAFT or SCHEDULED exams');
    }

    const question = await Question.findOneAndDelete({ _id: req.params.questionId, examId: exam._id });
    if (!question) throw ApiError.notFound('Question not found');

    await syncExamTotals(exam._id);

    return res.json({ success: true, message: 'Question deleted', data: null });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/exams/:id/questions/reorder
 * Bulk-update displayOrder for multiple questions at once.
 * Body: { order: [{ questionId, displayOrder }] }
 */
const reorderQuestions = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) throw ApiError.notFound('Exam not found');
    assertOwnerOrAdmin(exam, req);

    const { order } = req.body;
    await Promise.all(
      order.map(({ questionId, displayOrder }) =>
        Question.updateOne({ _id: questionId, examId: exam._id }, { displayOrder })
      )
    );

    const questions = await Question.find({ examId: exam._id })
      .sort({ displayOrder: 1 })
      .select('+answerKey');

    return res.json({ success: true, message: 'Questions reordered', data: questions });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createExam, listExams, getExam, updateExam, deleteExam,
  publishExam, cancelExam,
  addQuestion, updateQuestion, deleteQuestion, reorderQuestions,
};
