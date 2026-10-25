// server/src/models/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    actorRole: {
      type: String,
      enum: ['ADMIN', 'TEACHER', 'STUDENT', 'SYSTEM'],
    },
    // Standardised action codes — use SCREAMING_SNAKE_CASE
    action: {
      type: String,
      required: true,
      // Examples: USER_CREATED, USER_DEACTIVATED, EXAM_PUBLISHED,
      //           EXAM_CANCELLED, SCORE_UPDATED, RESULT_RELEASED,
      //           PROCTORING_REVIEWED, ATTEMPT_EXPIRED
    },
    targetType: {
      type: String, // 'User' | 'Exam' | 'ExamAttempt' | 'Question' | 'ProctoringEvent'
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    // Only safe, non-sensitive metadata — NO passwords, tokens, or answer keys
    safeMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true, // Audit records must never be modified
    },
  },
  {
    // No timestamps: true — we manage the single `timestamp` field manually
    // so there's no confusion with createdAt/updatedAt
    versionKey: false,
  }
);

auditLogSchema.index({ actorId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
