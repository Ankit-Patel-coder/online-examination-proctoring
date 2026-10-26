// client/src/pages/dashboards/TeacherDashboard.jsx
// Full Phase 4 Teacher Dashboard:
//   - Exam list with status badges and action buttons
//   - Create/Edit Exam modal (settings form)
//   - Inline Question Editor per exam
//   - Publish / Cancel / Delete lifecycle actions
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap, LogOut, PlusCircle, BookOpen, ClipboardList,
  Pencil, Trash2, Send, XCircle, ChevronDown, RefreshCw,
  ChevronRight, Users, BarChart2, ShieldAlert,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import examApi from '../../api/examApi';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal, { ConfirmDialog } from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import Spinner from '../../components/ui/Spinner';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import SubmissionsModal from '../../components/teacher/SubmissionsModal';
import AnalyticsModal from '../../components/teacher/AnalyticsModal';
import ProctoringEventsModal from '../../components/teacher/ProctoringEventsModal';

// ─── Status colour map ────────────────────────────────────────────────────────
const statusColor = {
  DRAFT: 'gray', SCHEDULED: 'yellow', PUBLISHED: 'blue',
  COMPLETED: 'green', CANCELLED: 'red',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—';

// ─── Exam Form Modal ──────────────────────────────────────────────────────────
function ExamFormModal({ isOpen, onClose, onSaved, initial }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial;

  const blank = {
    title: '', description: '', durationMinutes: 60,
    startTime: '', endTime: '', maximumMarks: 100,
    instructions: '', randomizeQuestions: false,
    negativeMarking: { enabled: false, defaultPenaltyFraction: 0.25 },
    resultRelease: { mode: 'MANUAL', showAnswerKey: false, showQuestionWise: true },
    proctoring: { enabled: false, webcamRequired: true, tabSwitchDetection: true, fullscreenRequired: false },
    attemptLimit: 1,
  };

  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (isOpen) {
      if (initial) {
        setForm({
          ...blank,
          ...initial,
          proctoring: {
            ...blank.proctoring,
            ...(initial.proctoring || {}),
          },
          startTime: initial.startTime ? new Date(initial.startTime).toISOString().slice(0, 16) : '',
          endTime: initial.endTime ? new Date(initial.endTime).toISOString().slice(0, 16) : '',
        });
      } else {
        setForm(blank);
      }
      setError('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initial]);

  const set = (path, val) =>
    setForm(prev => {
      const parts = path.split('.');
      if (parts.length === 1) return { ...prev, [path]: val };
      return {
        ...prev,
        [parts[0]]: { ...prev[parts[0]], [parts[1]]: val },
      };
    });

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        durationMinutes: Number(form.durationMinutes),
        maximumMarks: Number(form.maximumMarks),
        attemptLimit: Number(form.attemptLimit),
      };
      const res = isEdit
        ? await examApi.update(initial._id, payload)
        : await examApi.create(payload);
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save exam');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Exam' : 'New Exam'} size="lg">
      {error && <Alert variant="error" className="mb-4" dismissible onDismiss={() => setError('')}>{error}</Alert>}
      <form id="exam-form" onSubmit={handleSave} className="space-y-4">
        {/* Title */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-surface-700">Title *</label>
          <input id="exam-title" className="input-base" required value={form.title}
            onChange={e => set('title', e.target.value)} placeholder="Mid-term Mathematics" />
        </div>
        {/* Description */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-surface-700">Description</label>
          <textarea id="exam-description" className="input-base resize-none" rows={2}
            value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Optional exam description" />
        </div>
        {/* Duration + Marks */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-surface-700">Duration (minutes) *</label>
            <input id="exam-duration" className="input-base" type="number" min={1} max={480} required
              value={form.durationMinutes} onChange={e => set('durationMinutes', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-surface-700">Max Marks *</label>
            <input id="exam-max-marks" className="input-base" type="number" min={0} required
              value={form.maximumMarks} onChange={e => set('maximumMarks', e.target.value)} />
          </div>
        </div>
        {/* Start / End time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-surface-700">Start Time *</label>
            <input id="exam-start-time" className="input-base" type="datetime-local" required
              value={form.startTime} onChange={e => set('startTime', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-surface-700">End Time *</label>
            <input id="exam-end-time" className="input-base" type="datetime-local" required
              value={form.endTime} onChange={e => set('endTime', e.target.value)} />
          </div>
        </div>
        {/* Attempt limit */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-surface-700">Attempt Limit</label>
          <input id="exam-attempt-limit" className="input-base" type="number" min={1}
            value={form.attemptLimit} onChange={e => set('attemptLimit', e.target.value)} />
        </div>
        {/* Toggles */}
        <div className="grid grid-cols-2 gap-3">
          {[
            ['randomizeQuestions', 'Randomize question order'],
            ['negativeMarking.enabled', 'Enable negative marking'],
            ['proctoring.enabled', 'Enable proctoring'],
            ['proctoring.webcamRequired', 'Require webcam monitoring'],
            ['proctoring.tabSwitchDetection', 'Detect tab switching'],
            ['proctoring.fullscreenRequired', 'Require fullscreen'],
          ].map(([path, label]) => {
            const val = path.includes('.')
              ? form[path.split('.')[0]][path.split('.')[1]]
              : form[path];
            return (
              <label key={path} className="flex items-center gap-2 cursor-pointer text-sm text-surface-700">
                <input type="checkbox" checked={!!val}
                  onChange={e => set(path, e.target.checked)}
                  className="w-4 h-4 rounded accent-primary-600" />
                {label}
              </label>
            );
          })}
        </div>
        {/* Instructions */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-surface-700">Instructions</label>
          <textarea id="exam-instructions" className="input-base resize-none" rows={3}
            value={form.instructions} onChange={e => set('instructions', e.target.value)}
            placeholder="Instructions shown to students before the exam begins…" />
        </div>
        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button id="exam-save-btn" type="submit" variant="primary" loading={saving}>
            {isEdit ? 'Save Changes' : 'Create Exam'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Question Editor (inline per exam) ───────────────────────────────────────
function QuestionEditor({ exam, onClose }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingType, setAddingType] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await examApi.get(exam._id);
      setQuestions(res.data.data.questions || []);
    } catch { setError('Failed to load questions'); }
    finally { setLoading(false); }
  }, [exam._id]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  // ── Add question blank form ──
  const [qForm, setQForm] = useState(null);

  const openAddForm = (type) => {
    setAddingType(type);
    const isChoice = ['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE'].includes(type);
    setQForm({
      type,
      text: '',
      marks: 1,
      negativeMarks: 0,
      explanation: '',
      options: isChoice && type !== 'TRUE_FALSE'
        ? [{ text: '' }, { text: '' }]
        : [],
      answerKey: { correctOptionIds: [], sampleAnswer: '' },
    });
  };

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      await examApi.addQuestion(exam._id, qForm);
      setQForm(null);
      setAddingType('');
      loadQuestions();
    } catch (err) {
      setSaveError(err?.response?.data?.message || 'Failed to add question');
    } finally { setSaving(false); }
  };

  const handleDeleteQuestion = async () => {
    setDeleting(true);
    try {
      await examApi.deleteQuestion(exam._id, deleteTarget._id);
      setDeleteTarget(null);
      loadQuestions();
    } finally { setDeleting(false); }
  };

  const isChoice = qForm && ['MCQ_SINGLE', 'MCQ_MULTIPLE'].includes(qForm.type);

  return (
    <div className="fixed inset-0 z-50 bg-surface-900/60 flex items-start justify-center pt-12 px-4 overflow-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mb-12">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <div>
            <h2 className="text-base font-semibold text-surface-900">Question Editor</h2>
            <p className="text-xs text-surface-500 mt-0.5">{exam.title}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} id="qeditor-close">Close</Button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {error && <Alert variant="error">{error}</Alert>}

          {/* Existing questions */}
          {loading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : questions.length === 0 && !qForm ? (
            <p className="text-center text-sm text-surface-400 py-4">No questions yet. Add your first question below.</p>
          ) : (
            <ol className="space-y-3">
              {questions.map((q, i) => (
                <li key={q._id} className="flex gap-3 p-4 border border-surface-200 rounded-xl bg-surface-50">
                  <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-800 font-medium line-clamp-2">{q.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge status={q.type === 'MCQ_SINGLE' || q.type === 'MCQ_MULTIPLE' ? 'PUBLISHED' : 'DRAFT'} className="text-xs">
                        {q.type.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-surface-400">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <button
                    id={`qeditor-delete-${q._id}`}
                    onClick={() => setDeleteTarget(q)}
                    className="text-surface-300 hover:text-danger transition-colors flex-shrink-0"
                    aria-label="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ol>
          )}

          {/* Add question form */}
          {qForm ? (
            <form id="add-question-form" onSubmit={handleAddQuestion} className="border border-primary-200 rounded-xl p-4 bg-primary-50/40 space-y-3">
              <p className="text-sm font-semibold text-primary-700">New {qForm.type.replace(/_/g, ' ')} Question</p>

              {saveError && <Alert variant="error" dismissible onDismiss={() => setSaveError('')}>{saveError}</Alert>}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-surface-600">Question text *</label>
                <textarea className="input-base resize-none text-sm" rows={3} required
                  value={qForm.text} onChange={e => setQForm(f => ({ ...f, text: e.target.value }))}
                  placeholder="Enter your question…" />
              </div>

              {/* MCQ options */}
              {isChoice && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-surface-600">Options *</label>
                  {qForm.options.map((opt, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type={qForm.type === 'MCQ_MULTIPLE' ? 'checkbox' : 'radio'}
                        name="correctOption"
                        checked={qForm.answerKey.correctOptionIds.includes(String(idx))}
                        onChange={() => {
                          const ids = qForm.type === 'MCQ_MULTIPLE'
                            ? qForm.answerKey.correctOptionIds.includes(String(idx))
                              ? qForm.answerKey.correctOptionIds.filter(x => x !== String(idx))
                              : [...qForm.answerKey.correctOptionIds, String(idx)]
                            : [String(idx)];
                          setQForm(f => ({ ...f, answerKey: { ...f.answerKey, correctOptionIds: ids } }));
                        }}
                        className="accent-primary-600 flex-shrink-0"
                        aria-label={`Option ${idx + 1} is correct`}
                      />
                      <input className="input-base flex-1 text-sm" value={opt.text} required
                        onChange={e => {
                          const opts = [...qForm.options];
                          opts[idx] = { text: e.target.value };
                          setQForm(f => ({ ...f, options: opts }));
                        }}
                        placeholder={`Option ${idx + 1}`} />
                      {qForm.options.length > 2 && (
                        <button type="button" onClick={() =>
                          setQForm(f => ({ ...f, options: f.options.filter((_, i) => i !== idx) }))
                        } className="text-surface-300 hover:text-danger" aria-label="Remove option">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() =>
                    setQForm(f => ({ ...f, options: [...f.options, { text: '' }] }))
                  } className="text-xs text-primary-600 hover:text-primary-700 font-medium mt-1">
                    + Add option
                  </button>
                </div>
              )}

              {/* TRUE_FALSE answer */}
              {qForm.type === 'TRUE_FALSE' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-surface-600">Correct answer *</label>
                  <div className="flex gap-4">
                    {['True', 'False'].map(v => (
                      <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="tf-answer" value={v}
                          checked={qForm.answerKey.correctOptionIds[0] === v}
                          onChange={() => setQForm(f => ({ ...f, answerKey: { ...f.answerKey, correctOptionIds: [v] } }))}
                          className="accent-primary-600" />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* SHORT_ANSWER sample */}
              {(qForm.type === 'SHORT_ANSWER' || qForm.type === 'DESCRIPTIVE') && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-surface-600">Sample / Model answer</label>
                  <textarea className="input-base resize-none text-sm" rows={2}
                    value={qForm.answerKey.sampleAnswer}
                    onChange={e => setQForm(f => ({ ...f, answerKey: { ...f.answerKey, sampleAnswer: e.target.value } }))}
                    placeholder="Reference answer for grading…" />
                </div>
              )}

              {/* Marks */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-surface-600">Marks *</label>
                  <input type="number" step="0.5" min={0} className="input-base text-sm"
                    value={qForm.marks} onChange={e => setQForm(f => ({ ...f, marks: Number(e.target.value) }))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-surface-600">Negative marks</label>
                  <input type="number" step="0.5" min={0} className="input-base text-sm"
                    value={qForm.negativeMarks} onChange={e => setQForm(f => ({ ...f, negativeMarks: Number(e.target.value) }))} />
                </div>
              </div>

              {/* Explanation */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-surface-600">Explanation (shown after result)</label>
                <textarea className="input-base resize-none text-sm" rows={2}
                  value={qForm.explanation}
                  onChange={e => setQForm(f => ({ ...f, explanation: e.target.value }))}
                  placeholder="Why is this the correct answer?" />
              </div>

              <div className="flex gap-2 pt-1">
                <Button id="add-question-save" type="submit" variant="primary" size="sm" loading={saving}>Save Question</Button>
                <Button type="button" variant="ghost" size="sm"
                  onClick={() => { setQForm(null); setAddingType(''); setSaveError(''); }}>
                  Discard
                </Button>
              </div>
            </form>
          ) : (
            /* Question type picker */
            <div>
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">Add Question</p>
              <div className="flex flex-wrap gap-2">
                {[
                  ['MCQ_SINGLE', 'Multiple Choice (Single)'],
                  ['MCQ_MULTIPLE', 'Multiple Choice (Multi)'],
                  ['TRUE_FALSE', 'True / False'],
                  ['SHORT_ANSWER', 'Short Answer'],
                  ['DESCRIPTIVE', 'Descriptive'],
                ].map(([type, label]) => (
                  <Button key={type} id={`add-q-${type}`} variant="secondary" size="sm"
                    onClick={() => openAddForm(type)}>
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-surface-100 text-xs text-surface-400">
          {questions.length} question{questions.length !== 1 ? 's' : ''} · Total marks auto-calculated
        </div>
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteQuestion}
        loading={deleting}
        title="Delete Question"
        message={`Delete question "${deleteTarget?.text?.slice(0, 60)}…"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

// ─── Teacher Dashboard ────────────────────────────────────────────────────────
export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  // Modals / dialogs
  const [showExamModal, setShowExamModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [qEditorExam, setQEditorExam] = useState(null);
  const [submissionsExam, setSubmissionsExam] = useState(null);
  const [analyticsExam, setAnalyticsExam] = useState(null);
  const [proctoringExam, setProctoringExam] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type, exam }
  const [actionLoading, setActionLoading] = useState(false);

  // ── Load exams ──
  const loadExams = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const res = await examApi.list({
        page, limit: 10,
        ...(statusFilter && { status: statusFilter }),
      });
      setExams(res.data.data.exams);
      setPagination(res.data.data.pagination);
    } catch (err) {
      setListError(err?.response?.data?.message || 'Failed to load exams');
    } finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { loadExams(); }, [loadExams]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };

  // ── Confirm action handler ──
  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      const { type, exam } = confirmAction;
      if (type === 'publish') await examApi.publish(exam._id);
      if (type === 'cancel') await examApi.cancel(exam._id, 'Cancelled by teacher');
      if (type === 'delete') await examApi.delete(exam._id);
      setConfirmAction(null);
      loadExams();
    } catch (err) {
      console.error(err?.response?.data?.message);
      setConfirmAction(null);
    } finally { setActionLoading(false); }
  };

  const confirmMessages = {
    publish: (exam) => ({
      title: 'Publish Exam',
      message: `Publish "${exam?.title}"? Students will be able to see and attempt it.`,
      confirmLabel: 'Publish',
      variant: 'primary',
    }),
    cancel: (exam) => ({
      title: 'Cancel Exam',
      message: `Cancel "${exam?.title}"? Students will no longer be able to attempt it.`,
      confirmLabel: 'Cancel Exam',
      variant: 'danger',
    }),
    delete: (exam) => ({
      title: 'Delete Exam',
      message: `Permanently delete "${exam?.title}" and all its questions? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    }),
  };

  const activeConfirm = confirmAction
    ? confirmMessages[confirmAction.type]?.(confirmAction.exam) || {}
    : {};

  // ── Stats ──
  const total = pagination.total;
  const published = exams.filter(e => e.status === 'PUBLISHED').length;
  const drafts = exams.filter(e => e.status === 'DRAFT').length;

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Nav */}
      <header className="bg-white border-b border-surface-200 sticky top-0 z-10">
        <div className="max-w-content mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-semibold text-surface-900">ExamPortal</span>
              <span className="ml-2 text-xs text-surface-400">Teacher</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-surface-800">{user?.name}</p>
              <p className="text-xs text-surface-400">{user?.email}</p>
            </div>
            <Badge status="TEACHER" dot>Teacher</Badge>
            <Button id="teacher-logout-btn" variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-content mx-auto px-6 py-8 space-y-6">
        {/* Page title */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">My Exams</h1>
            <p className="text-sm text-surface-500 mt-1">Create, manage, and publish your examinations</p>
          </div>
          <Button id="teacher-new-exam-btn" variant="primary" onClick={() => { setEditingExam(null); setShowExamModal(true); }}>
            <PlusCircle className="w-4 h-4" /> New Exam
          </Button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: ClipboardList, label: 'Total Exams', value: pagination.total, color: 'bg-primary-600' },
            { icon: Send, label: 'Published', value: exams.filter(e => e.status === 'PUBLISHED').length, color: 'bg-success' },
            { icon: BookOpen, label: 'Drafts', value: exams.filter(e => e.status === 'DRAFT').length, color: 'bg-surface-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <Card key={label} className="p-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-surface-500">{label}</p>
                  <p className="text-xl font-bold text-surface-900">{loading ? '…' : value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Exam list */}
        <Card>
          <Card.Header
            title="Exam List"
            action={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select id="teacher-status-filter" value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="input-base pr-7 appearance-none text-sm cursor-pointer">
                    <option value="">All statuses</option>
                    {['DRAFT','SCHEDULED','PUBLISHED','COMPLETED','CANCELLED'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400 pointer-events-none" />
                </div>
                <Button id="teacher-refresh-btn" variant="ghost" size="sm" onClick={loadExams}>
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            }
          />

          {listError && <div className="px-6 pt-4"><Alert variant="error" dismissible onDismiss={() => setListError('')}>{listError}</Alert></div>}

          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Exams table">
              <thead>
                <tr className="bg-surface-50 text-xs font-semibold text-surface-500 uppercase tracking-wide text-left">
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Questions</th>
                  <th className="px-6 py-3">Marks</th>
                  <th className="px-6 py-3">Start Time</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {loading
                  ? <TableRowSkeleton columns={6} rows={5} />
                  : exams.length === 0
                  ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-surface-400">
                      No exams yet. Click "New Exam" to get started.
                    </td></tr>
                  )
                  : exams.map(exam => (
                    <tr key={exam._id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-6 py-3">
                        <p className="text-sm font-medium text-surface-900 max-w-xs truncate">{exam.title}</p>
                        {exam.description && <p className="text-xs text-surface-400 truncate max-w-xs">{exam.description}</p>}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={statusColor[exam.status]} dot>{exam.status}</Badge>
                      </td>
                      <td className="px-6 py-3 text-sm text-surface-600">{exam.totalQuestions}</td>
                      <td className="px-6 py-3 text-sm text-surface-600">{exam.maximumMarks}</td>
                      <td className="px-6 py-3 text-sm text-surface-500">{fmtDate(exam.startTime)}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1.5 justify-end flex-wrap">
                          {/* Submissions & Grading */}
                          {['PUBLISHED', 'COMPLETED', 'SCHEDULED'].includes(exam.status) && (
                            <Button id={`exam-submissions-${exam._id}`} variant="secondary" size="sm"
                              onClick={() => setSubmissionsExam(exam)}
                              className="text-xs py-1 px-2.5">
                              <Users className="w-3.5 h-3.5 mr-1" /> Submissions
                            </Button>
                          )}
                          {/* Analytics */}
                          {['PUBLISHED', 'COMPLETED'].includes(exam.status) && (
                            <Button id={`exam-analytics-${exam._id}`} variant="secondary" size="sm"
                              onClick={() => setAnalyticsExam(exam)}
                              className="text-xs py-1 px-2.5">
                              <BarChart2 className="w-3.5 h-3.5 mr-1" /> Analytics
                            </Button>
                          )}
                          {/* Proctoring Flags */}
                          {['PUBLISHED', 'COMPLETED'].includes(exam.status) && (
                            <Button id={`exam-proctoring-${exam._id}`} variant="secondary" size="sm"
                              onClick={() => setProctoringExam(exam)}
                              className="text-xs py-1 px-2.5 text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200">
                              <ShieldAlert className="w-3.5 h-3.5 mr-1 text-amber-600" /> Flags
                            </Button>
                          )}
                          {/* Question Editor */}
                          {['DRAFT', 'SCHEDULED'].includes(exam.status) && (
                            <Button id={`exam-questions-${exam._id}`} variant="secondary" size="sm"
                              onClick={() => setQEditorExam(exam)}>
                              <ClipboardList className="w-3.5 h-3.5" /> Questions
                            </Button>
                          )}
                          {/* Edit */}
                          {['DRAFT', 'SCHEDULED'].includes(exam.status) && (
                            <Button id={`exam-edit-${exam._id}`} variant="ghost" size="sm"
                              onClick={() => { setEditingExam(exam); setShowExamModal(true); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {/* Publish */}
                          {['DRAFT', 'SCHEDULED'].includes(exam.status) && (
                            <Button id={`exam-publish-${exam._id}`} variant="primary" size="sm"
                              onClick={() => setConfirmAction({ type: 'publish', exam })}>
                              <Send className="w-3.5 h-3.5" /> Publish
                            </Button>
                          )}
                          {/* Cancel */}
                          {['PUBLISHED', 'SCHEDULED'].includes(exam.status) && (
                            <Button id={`exam-cancel-${exam._id}`} variant="danger" size="sm"
                              onClick={() => setConfirmAction({ type: 'cancel', exam })}>
                              <XCircle className="w-3.5 h-3.5" /> Cancel
                            </Button>
                          )}
                          {/* Delete */}
                          {exam.status === 'DRAFT' && (
                            <Button id={`exam-delete-${exam._id}`} variant="ghost" size="sm"
                              onClick={() => setConfirmAction({ type: 'delete', exam })}
                              className="text-danger hover:bg-danger/10">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>

          {!loading && pagination.totalPages > 1 && (
            <Card.Footer>
              <div className="flex items-center justify-between text-sm text-surface-500">
                <span>Showing {((page - 1) * 10) + 1}–{Math.min(page * 10, pagination.total)} of {pagination.total}</span>
                <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />
              </div>
            </Card.Footer>
          )}
        </Card>
      </main>

      {/* Exam form modal */}
      <ExamFormModal
        isOpen={showExamModal}
        onClose={() => { setShowExamModal(false); setEditingExam(null); }}
        initial={editingExam}
        onSaved={() => loadExams()}
      />

      {/* Question editor */}
      {qEditorExam && (
        <QuestionEditor
          exam={qEditorExam}
          onClose={() => { setQEditorExam(null); loadExams(); }}
        />
      )}

      {/* Lifecycle confirm dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        loading={actionLoading}
        title={activeConfirm.title}
        message={activeConfirm.message}
        confirmLabel={activeConfirm.confirmLabel}
        variant={activeConfirm.variant}
      />

      {/* Submissions & Manual Grading Modal */}
      {submissionsExam && (
        <SubmissionsModal
          exam={submissionsExam}
          isOpen={!!submissionsExam}
          onClose={() => setSubmissionsExam(null)}
          onUpdated={loadExams}
        />
      )}

      {/* Analytics Modal */}
      {analyticsExam && (
        <AnalyticsModal
          exam={analyticsExam}
          isOpen={!!analyticsExam}
          onClose={() => setAnalyticsExam(null)}
        />
      )}

      {/* Proctoring Events Review Modal */}
      {proctoringExam && (
        <ProctoringEventsModal
          exam={proctoringExam}
          isOpen={!!proctoringExam}
          onClose={() => setProctoringExam(null)}
        />
      )}
    </div>
  );
}
