// server/src/utils/sanitize.js
// Field-stripping utilities to ensure sensitive data never reaches clients.
// These are used in controllers when sending user/exam/attempt data in responses.

/**
 * Strip sensitive fields from a user object before sending to the client.
 * Call this on any user document fetched for a response.
 * @param {object} user - Mongoose user document or plain object
 * @returns {object} Safe user object without passwordHash, tokens, etc.
 */
const sanitizeUser = (user) => {
  if (!user) return null;
  const obj = user.toObject ? user.toObject() : { ...user };

  // Remove all sensitive fields
  delete obj.passwordHash;
  delete obj.emailVerificationToken;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.__v;

  return obj;
};

/**
 * Strip answerKey from a question before sending to students.
 * Teachers and admins may still receive answerKey via separate teacher-only endpoints.
 * @param {object} question - Mongoose question document
 * @returns {object} Question without answerKey and explanation (if not yet released)
 */
const sanitizeQuestionForStudent = (question, { showExplanation = false } = {}) => {
  if (!question) return null;
  const obj = question.toObject ? question.toObject() : { ...question };

  // answerKey is select:false, so it shouldn't be here — but double-check
  delete obj.answerKey;
  delete obj.__v;

  if (!showExplanation) {
    delete obj.explanation;
  }

  return obj;
};

/**
 * Strip sensitive fields from an attempt before sending to a student.
 * Students must never see other students' answers, scores before release, or proctoring data.
 * @param {object} attempt
 * @param {{ resultReleased: boolean }} options
 */
const sanitizeAttemptForStudent = (attempt, { resultReleased = false } = {}) => {
  if (!attempt) return null;
  const obj = attempt.toObject ? attempt.toObject() : { ...attempt };

  delete obj.__v;
  delete obj.ipAddress;

  // Never send score or questionResults until results are released
  if (!resultReleased) {
    delete obj.score;
    delete obj.maxScore;
    delete obj.questionResults;
  }

  return obj;
};

module.exports = { sanitizeUser, sanitizeQuestionForStudent, sanitizeAttemptForStudent };
