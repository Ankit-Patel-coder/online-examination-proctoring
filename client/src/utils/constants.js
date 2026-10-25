// client/src/utils/constants.js
// Application-wide constants. Import from here, not hardcoded strings in components.

export const ROLES = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
};

export const EXAM_STATUS = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const ATTEMPT_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  EVALUATED: 'EVALUATED',
  EXPIRED: 'EXPIRED',
};

export const QUESTION_TYPES = {
  MCQ_SINGLE:   { value: 'MCQ_SINGLE',   label: 'Single-answer MCQ' },
  MCQ_MULTIPLE: { value: 'MCQ_MULTIPLE', label: 'Multiple-select MCQ' },
  TRUE_FALSE:   { value: 'TRUE_FALSE',   label: 'True / False' },
  SHORT_ANSWER: { value: 'SHORT_ANSWER', label: 'Short Answer' },
  DESCRIPTIVE:  { value: 'DESCRIPTIVE',  label: 'Descriptive' },
};

export const PROCTORING_EVENTS = {
  TAB_HIDDEN:              'TAB_HIDDEN',
  FULLSCREEN_EXIT:         'FULLSCREEN_EXIT',
  FACE_NOT_DETECTED:       'FACE_NOT_DETECTED',
  MULTIPLE_FACES_DETECTED: 'MULTIPLE_FACES_DETECTED',
  CAMERA_INTERRUPTED:      'CAMERA_INTERRUPTED',
  CONNECTION_INTERRUPTED:  'CONNECTION_INTERRUPTED',
};

export const RESULT_RELEASE_MODES = {
  MANUAL:             'MANUAL',
  AUTO_AFTER_DEADLINE:'AUTO_AFTER_DEADLINE',
};

// Answer auto-save interval in milliseconds
export const ANSWER_SYNC_INTERVAL_MS = 30_000;

// Proctoring event batch interval in milliseconds
export const PROCTORING_BATCH_INTERVAL_MS = 10_000;

// Page limits for paginated APIs
export const DEFAULT_PAGE_LIMIT = 20;
