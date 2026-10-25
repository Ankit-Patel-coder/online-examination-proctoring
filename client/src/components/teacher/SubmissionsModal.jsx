// client/src/components/teacher/SubmissionsModal.jsx
// Teacher modal to view all student exam submissions, launch manual grading, and release results.
import { useState, useEffect } from 'react';
import {
  Users, CheckCircle2, AlertCircle, Award, Check,
  Send, ShieldAlert, Edit3, X, Eye, Clock
} from 'lucide-react';

import evaluationApi from '../../api/evaluationApi';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';

export default function SubmissionsModal({ exam, isOpen, onClose, onUpdated }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [releasing, setReleasing] = useState(false);
  const [releaseSuccess, setReleaseSuccess] = useState('');

  // Manual evaluation active attempt
  const [evaluatingAttempt, setEvaluatingAttempt] = useState(null);
  const [evalQuestions, setEvalQuestions] = useState([]);
  const [evalData, setEvalData] = useState({}); // questionId -> { marksAwarded, teacherFeedback }
  const [evalLoading, setEvalLoading] = useState(false);
  const [savingEval, setSavingEval] = useState(false);

  const loadAttempts = async () => {
    if (!exam) return;
    try {
      setLoading(true);
      setError('');
      const res = await evaluationApi.listAttempts(exam._id);
      setAttempts(res.data.data.attempts || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load exam submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && exam) {
      loadAttempts();
      setReleaseSuccess('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, exam]);

  // Open manual evaluation modal
  const handleOpenEvaluation = async (att) => {
    try {
      setEvaluatingAttempt(att);
      setEvalLoading(true);
      const res = await evaluationApi.getEvaluation(att._id);
      const { questions, attempt } = res.data.data;
      setEvalQuestions(questions || []);

      // Prepopulate marks and feedback from attempt.questionResults
      const initial = {};
      (attempt.questionResults || []).forEach(qr => {
        initial[qr.questionId] = {
          marksAwarded: qr.marksAwarded ?? 0,
          teacherFeedback: qr.teacherFeedback || '',
        };
      });
      setEvalData(initial);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to fetch evaluation details.');
      setEvaluatingAttempt(null);
    } finally {
      setEvalLoading(false);
    }
  };

  const handleSaveEvaluation = async () => {
    if (!evaluatingAttempt) return;
    try {
      setSavingEval(true);
      const payload = Object.entries(evalData).map(([qId, data]) => ({
        questionId: qId,
        marksAwarded: Number(data.marksAwarded) || 0,
        teacherFeedback: data.teacherFeedback || '',
      }));

      await evaluationApi.submitEvaluation(evaluatingAttempt._id, payload);
      setEvaluatingAttempt(null);
      await loadAttempts();
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save evaluation.');
    } finally {
      setSavingEval(false);
    }
  };

  const handleReleaseResults = async () => {
    if (!window.confirm('Are you sure you want to release exam results to all students? They will now be able to view their scores and explanations.')) {
      return;
    }
    try {
      setReleasing(true);
      const res = await evaluationApi.releaseResults(exam._id);
      setReleaseSuccess(res.data.message || 'Results successfully released!');
      await loadAttempts();
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to release results.');
    } finally {
      setReleasing(false);
    }
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    }) : '—';

  return (
    <>
      <Modal isOpen={isOpen && !evaluatingAttempt} onClose={onClose} title={`Submissions: ${exam?.title}`}>
        <div className="space-y-5 max-w-4xl w-full">
          {/* Header action bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-50 p-4 rounded-2xl border border-surface-200">
            <div>
              <div className="text-sm font-semibold text-surface-900">
                Total Submissions: {attempts.length}
              </div>
              <div className="text-xs text-surface-500">
                Maximum Exam Marks: {exam?.maximumMarks}
              </div>
            </div>

            <Button
              id="release-results-btn"
              variant="primary"
              size="sm"
              disabled={releasing || attempts.length === 0}
              onClick={handleReleaseResults}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {releasing ? 'Releasing...' : 'Release Results to Students'}
            </Button>
          </div>

          {releaseSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{releaseSuccess}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submissions table */}
          {loading ? (
            <div className="py-12 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : attempts.length === 0 ? (
            <div className="p-8 text-center text-surface-500 bg-surface-50 rounded-2xl border border-surface-200 text-sm">
              No students have submitted attempts for this examination yet.
            </div>
          ) : (
            <div className="border border-surface-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-50 border-b border-surface-200 text-xs text-surface-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-5 py-3.5">Submitted</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Evaluation</th>
                      <th className="px-5 py-3.5">Score</th>
                      <th className="px-5 py-3.5">Flags</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {attempts.map(att => (
                      <tr key={att._id} className="hover:bg-surface-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-surface-900">{att.studentId?.name || 'Student'}</div>
                          <div className="text-xs text-surface-500">{att.studentId?.email}</div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-surface-600">
                          {fmtDate(att.submittedAt || att.startedAt)}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={att.status === 'EVALUATED' ? 'green' : 'blue'}>
                            {att.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-medium text-surface-600">
                          {att.evaluationStatus?.replace('_', ' ') || 'PENDING'}
                        </td>
                        <td className="px-5 py-3.5">
                          {att.score !== null ? (
                            <span className="font-bold text-surface-900">
                              {att.score} <span className="text-surface-400 font-normal">/ {att.maxScore || exam.maximumMarks}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-surface-400 italic">Ungraded</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {att.proctoringFlagCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                              <ShieldAlert className="w-3 h-3 text-red-500" />
                              {att.proctoringFlagCount}
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 font-medium">Clean</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenEvaluation(att)}
                            className="text-xs py-1 px-2.5"
                          >
                            <Edit3 className="w-3.5 h-3.5 mr-1" />
                            Grade
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-surface-200">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Manual Evaluation Child Modal ─────────────────────────────────── */}
      {evaluatingAttempt && (
        <Modal
          isOpen={true}
          onClose={() => setEvaluatingAttempt(null)}
          title={`Evaluating: ${evaluatingAttempt.studentId?.name || 'Student'}`}
        >
          <div className="space-y-6 max-w-3xl w-full">
            {evalLoading ? (
              <div className="py-12 flex justify-center">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
                {evalQuestions.map((q, idx) => {
                  const studentAns = evaluatingAttempt.answers?.find(
                    a => a.questionId.toString() === q._id.toString()
                  );
                  const currentEval = evalData[q._id] || { marksAwarded: 0, teacherFeedback: '' };

                  return (
                    <div
                      key={q._id}
                      className="bg-surface-50 border border-surface-200 rounded-2xl p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-surface-200">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-surface-200 text-surface-800 text-xs font-bold flex items-center justify-center">
                            Q{idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-surface-600">
                            {q.type.replace('_', ' ')}
                          </span>
                        </div>
                        <Badge variant="blue" className="text-xs">
                          Max: {q.marks} Marks
                        </Badge>
                      </div>

                      {/* Question Text */}
                      <div className="text-sm font-semibold text-surface-900 leading-relaxed">
                        {q.text}
                      </div>

                      {/* Student Response */}
                      <div className="bg-white p-3.5 rounded-xl border border-surface-200 text-xs space-y-1">
                        <span className="font-bold text-surface-500 uppercase tracking-wider text-[10px]">
                          Student Answer:
                        </span>
                        {['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE'].includes(q.type) ? (
                          <div className="text-surface-800 font-medium">
                            {q.options
                              ?.filter(opt => studentAns?.selectedOptionIds?.includes(opt._id.toString()))
                              .map(o => o.text)
                              .join(', ') || <span className="text-surface-400 italic">No answer provided</span>}
                          </div>
                        ) : (
                          <div className="text-surface-800 whitespace-pre-wrap font-sans">
                            {studentAns?.textAnswer || <span className="text-surface-400 italic">No answer provided</span>}
                          </div>
                        )}
                      </div>

                      {/* Model / Sample Answer Reference */}
                      {q.answerKey?.sampleAnswer && (
                        <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/60 text-xs text-emerald-900">
                          <span className="font-bold text-emerald-700 uppercase tracking-wider text-[10px] block mb-0.5">
                            Sample Answer:
                          </span>
                          {q.answerKey.sampleAnswer}
                        </div>
                      )}

                      {/* Scoring & Feedback Input */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                        <div className="sm:col-span-1">
                          <label className="block text-[11px] font-bold text-surface-700 uppercase mb-1">
                            Marks Awarded
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={q.marks}
                            step="0.5"
                            value={currentEval.marksAwarded}
                            onChange={(e) =>
                              setEvalData(prev => ({
                                ...prev,
                                [q._id]: {
                                  ...prev[q._id],
                                  marksAwarded: Math.min(q.marks, Math.max(0, Number(e.target.value))),
                                },
                              }))
                            }
                            className="w-full bg-white border border-surface-300 rounded-lg px-3 py-1.5 text-sm font-bold text-surface-900 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-bold text-surface-700 uppercase mb-1">
                            Teacher Feedback
                          </label>
                          <input
                            type="text"
                            placeholder="Optional feedback for student..."
                            value={currentEval.teacherFeedback}
                            onChange={(e) =>
                              setEvalData(prev => ({
                                ...prev,
                                [q._id]: {
                                  ...prev[q._id],
                                  teacherFeedback: e.target.value,
                                },
                              }))
                            }
                            className="w-full bg-white border border-surface-300 rounded-lg px-3 py-1.5 text-xs text-surface-900 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-surface-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEvaluatingAttempt(null)}
                disabled={savingEval}
              >
                Back to Submissions
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveEvaluation}
                disabled={savingEval || evalLoading}
                className="bg-primary-600 hover:bg-primary-500 text-white font-medium"
              >
                {savingEval ? 'Saving...' : 'Save Evaluation & Update Score'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
