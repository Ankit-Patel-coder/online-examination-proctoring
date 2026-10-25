// client/src/pages/dashboards/StudentDashboard.jsx
// Phase 5: Complete Student Dashboard with Available Exams, Pre-flight System Check,
// Past Attempt History, and Live Examination Launch.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, LogOut, BookOpen, Clock, Award,
  ShieldAlert, Video, CheckCircle2, AlertCircle, Play,
  Calendar, RotateCcw, FileText, Check, ChevronRight,
  ShieldCheck, AlertTriangle, Eye, HelpCircle, X
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import examApi from '../../api/examApi';
import attemptApi from '../../api/attemptApi';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'history'
  const [exams, setExams] = useState([]);
  const [myAttempts, setMyAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pre-exam instruction & system check modal
  const [selectedExam, setSelectedExam] = useState(null);
  const [isPreflightOpen, setIsPreflightOpen] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Result review modal
  const [viewingResult, setViewingResult] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [resultLoading, setResultLoading] = useState(false);

  // ─── Fetch Data ───────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [examsRes, attemptsRes] = await Promise.all([
        examApi.list({ status: 'PUBLISHED' }),
        attemptApi.getMyAttempts(),
      ]);

      setExams(examsRes.data.data.exams || []);
      setMyAttempts(attemptsRes.data.data.attempts || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load examination portal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // ─── Pre-flight & Start Exam ──────────────────────────────────────────────
  const handleOpenPreflight = (exam) => {
    setSelectedExam(exam);
    setConsentChecked(false);
    setIsPreflightOpen(true);
  };

  const handleOpenResultReview = async (att) => {
    try {
      setViewingResult(att);
      setResultLoading(true);
      const res = await attemptApi.getResults(att._id);
      setResultData(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load exam results.');
      setViewingResult(null);
    } finally {
      setResultLoading(false);
    }
  };

  // ─── Formatting Helpers ───────────────────────────────────────────────────
  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }) : '—';

  const completedAttempts = myAttempts.filter(a => ['SUBMITTED', 'EVALUATED'].includes(a.status));
  const activeExamsCount = exams.filter(e => {
    const now = new Date();
    return (!e.startTime || now >= new Date(e.startTime)) && (!e.endTime || now <= new Date(e.endTime));
  }).length;

  return (
    <div className="min-h-screen bg-surface-50 font-sans">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-surface-200 px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-md shadow-primary-600/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-base font-bold text-surface-900 tracking-tight">ExamPortal</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                Student
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-surface-900">{user?.name}</div>
              <div className="text-xs text-surface-500">{user?.email}</div>
            </div>
            <Button
              id="student-logout-btn"
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-surface-300 text-surface-700 hover:bg-surface-100"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ──────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Banner & Stats */}
        <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-primary-950 rounded-3xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-widest text-primary-300 bg-primary-800/60 px-3 py-1 rounded-full">
              Student Dashboard
            </span>
            <h1 className="text-3xl font-extrabold mt-3 tracking-tight">
              Welcome back, {user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-primary-100 text-sm mt-2 leading-relaxed">
              Access your scheduled tests, monitor proctoring status, and review evaluated exam results.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="text-xs font-medium text-primary-200">Available Tests</div>
              <div className="text-2xl font-bold mt-1">{activeExamsCount}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="text-xs font-medium text-primary-200">Completed Attempts</div>
              <div className="text-2xl font-bold mt-1">{completedAttempts.length}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 col-span-2 sm:col-span-1">
              <div className="text-xs font-medium text-primary-200">Account Status</div>
              <div className="text-sm font-bold mt-2 flex items-center gap-1.5 text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                Active Student
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-3 border-b border-surface-200 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('available')}
            className={`pb-3 px-2 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'available'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Available Examinations
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-200 text-surface-700 font-bold">
              {exams.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-2 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            My Attempt History
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-200 text-surface-700 font-bold">
              {myAttempts.length}
            </span>
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* ─── Tab 1: Available Examinations ──────────────────────────────── */}
        {activeTab === 'available' && (
          <div>
            {loading ? (
              <div className="py-12 flex justify-center">
                <Spinner size="lg" />
              </div>
            ) : exams.length === 0 ? (
              <div className="bg-white rounded-2xl border border-surface-200 p-12 text-center max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-4 text-surface-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-surface-800 mb-1">No Published Exams</h3>
                <p className="text-sm text-surface-500">
                  There are currently no active exams assigned to you. Check back later or contact your instructor.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {exams.map(exam => {
                  const now = new Date();
                  const isStarted = !exam.startTime || now >= new Date(exam.startTime);
                  const isEnded = exam.endTime && now > new Date(exam.endTime);
                  const isActive = isStarted && !isEnded;

                  return (
                    <div
                      key={exam._id}
                      className="bg-white rounded-3xl border border-surface-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className="text-lg font-bold text-surface-900 leading-snug">
                            {exam.title}
                          </h3>
                          {isActive ? (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              Active Now
                            </span>
                          ) : isEnded ? (
                            <Badge variant="gray">Closed</Badge>
                          ) : (
                            <Badge variant="yellow">Upcoming</Badge>
                          )}
                        </div>

                        <p className="text-sm text-surface-600 line-clamp-2 mb-4 leading-relaxed">
                          {exam.description || 'No description provided by instructor.'}
                        </p>

                        {/* Meta Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-surface-600">
                          <div className="flex items-center gap-1 bg-surface-100 px-2.5 py-1 rounded-lg">
                            <Clock className="w-3.5 h-3.5 text-surface-500" />
                            <span>{exam.durationMinutes} Mins</span>
                          </div>
                          <div className="flex items-center gap-1 bg-surface-100 px-2.5 py-1 rounded-lg">
                            <Award className="w-3.5 h-3.5 text-surface-500" />
                            <span>{exam.maximumMarks || 0} Marks</span>
                          </div>
                          {exam.totalQuestions > 0 && (
                            <div className="flex items-center gap-1 bg-surface-100 px-2.5 py-1 rounded-lg">
                              <FileText className="w-3.5 h-3.5 text-surface-500" />
                              <span>{exam.totalQuestions} Questions</span>
                            </div>
                          )}
                        </div>

                        {/* Proctoring Tags */}
                        {exam.proctoring?.enabled && (
                          <div className="pt-3 border-t border-surface-100 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-surface-400">Proctoring:</span>
                            {exam.proctoring.webcamRequired && (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-200">
                                <Video className="w-3 h-3" />
                                Camera
                              </span>
                            )}
                            {exam.proctoring.fullscreenRequired && (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                <ShieldCheck className="w-3 h-3" />
                                Fullscreen
                              </span>
                            )}
                            {exam.proctoring.tabSwitchDetection && (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <ShieldAlert className="w-3 h-3" />
                                Tab Lock
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="mt-6 pt-4 border-t border-surface-100 flex items-center justify-between">
                        <span className="text-xs text-surface-500">
                          Ends: {fmtDate(exam.endTime)}
                        </span>
                        <Button
                          id="open-preflight-btn"
                          variant="primary"
                          size="sm"
                          disabled={!isActive}
                          onClick={() => handleOpenPreflight(exam)}
                          className="bg-primary-600 hover:bg-primary-500 text-white font-medium shadow-md shadow-primary-600/20"
                        >
                          <Play className="w-3.5 h-3.5 mr-1.5" />
                          Take Examination
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Tab 2: My Attempt History ──────────────────────────────────── */}
        {activeTab === 'history' && (
          <div>
            {loading ? (
              <div className="py-12 flex justify-center">
                <Spinner size="lg" />
              </div>
            ) : myAttempts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-surface-200 p-12 text-center max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-4 text-surface-400">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-surface-800 mb-1">No Exam History Yet</h3>
                <p className="text-sm text-surface-500">
                  You haven&apos;t taken any exams yet. When you complete an exam, your scores and records will appear here.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-surface-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-50 border-b border-surface-200 text-surface-500 font-semibold text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Examination</th>
                        <th className="px-6 py-4">Submitted At</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Evaluation</th>
                        <th className="px-6 py-4">Score</th>
                        <th className="px-6 py-4 text-right">Review</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {myAttempts.map(att => {
                        const isAutoGraded = att.evaluationStatus === 'AUTO_GRADED';
                        return (
                          <tr key={att._id} className="hover:bg-surface-50/60 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-surface-900">{att.examId?.title || 'Examination'}</div>
                              <div className="text-xs text-surface-400">Attempt #{att.attemptNumber}</div>
                            </td>
                            <td className="px-6 py-4 text-surface-600">
                              {fmtDate(att.submittedAt || att.startedAt)}
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                variant={
                                  att.status === 'SUBMITTED' ? 'blue' :
                                  att.status === 'EVALUATED' ? 'green' : 'red'
                                }
                              >
                                {att.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-medium text-surface-600">
                                {att.evaluationStatus?.replace('_', ' ') || 'PENDING'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {att.score !== null ? (
                                <span className="font-bold text-emerald-600 text-base">
                                  {att.score} / {att.maxScore || att.examId?.maximumMarks || 0}
                                </span>
                              ) : (
                                <span className="text-xs text-surface-400 italic">Pending Release</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button
                                id={`review-attempt-${att._id}`}
                                variant="secondary"
                                size="sm"
                                onClick={() => handleOpenResultReview(att)}
                                className="text-xs py-1 px-3"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                View Result
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── Pre-flight Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={isPreflightOpen}
        onClose={() => !isStarting && setIsPreflightOpen(false)}
        title="Examination Pre-Check & Instructions"
      >
        {selectedExam && (
          <div className="space-y-5">
            <div>
              <h4 className="text-lg font-bold text-surface-900">{selectedExam.title}</h4>
              <p className="text-xs text-surface-500 mt-0.5">
                Duration: {selectedExam.durationMinutes} Minutes • Maximum Marks: {selectedExam.maximumMarks}
              </p>
            </div>

            {/* General Instructions */}
            <div className="bg-surface-50 rounded-2xl p-4 border border-surface-200 text-xs text-surface-700 space-y-2">
              <div className="font-bold text-surface-900">Instructions from Instructor:</div>
              <p className="leading-relaxed">
                {selectedExam.instructions || 'No special instructions. Answer all questions within the allocated time limit.'}
              </p>
            </div>

            {/* Proctoring Rules Checklist */}
            {selectedExam.proctoring?.enabled && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-surface-900 uppercase tracking-wide">
                  Proctoring & Integrity Requirements:
                </div>
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-2 text-xs text-amber-900">
                  {selectedExam.proctoring.webcamRequired && (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Continuous webcam video feed is required during the test.</span>
                    </div>
                  )}
                  {selectedExam.proctoring.fullscreenRequired && (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Full-screen mode must be maintained. Exiting will trigger alerts.</span>
                    </div>
                  )}
                  {selectedExam.proctoring.tabSwitchDetection && (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Tab switches or minimizing the browser will be flagged.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Academic Integrity Consent */}
            <label
              htmlFor="consent-checkbox"
              className="flex items-start gap-3 p-3 bg-surface-100/60 rounded-xl cursor-pointer hover:bg-surface-100 transition-colors"
            >
              <input
                id="consent-checkbox"
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
              <span className="text-xs text-surface-700 leading-normal select-none">
                I hereby declare that I will complete this assessment independently without unauthorized aids, and I agree to automated proctoring.
              </span>
            </label>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-surface-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreflightOpen(false)}
                disabled={isStarting}
              >
                Cancel
              </Button>
              <Button
                id="start-exam-submit-btn"
                variant="primary"
                size="sm"
                disabled={!consentChecked || isStarting}
                onClick={handleStartExam}
                className="bg-primary-600 hover:bg-primary-500 text-white font-medium shadow-md shadow-primary-600/20"
              >
                {isStarting ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Launching Secure Exam...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    I Am Ready, Start Exam
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* ─── Detailed Exam Result Modal ──────────────────────────────────── */}
      {viewingResult && (
        <Modal
          isOpen={true}
          onClose={() => setViewingResult(null)}
          title={`Examination Result: ${viewingResult.examId?.title || 'Examination'}`}
        >
          <div className="space-y-6 max-w-3xl w-full">
            {resultLoading ? (
              <div className="py-16 flex justify-center">
                <Spinner size="lg" />
              </div>
            ) : !resultData?.isReleased ? (
              <div className="p-8 text-center bg-surface-50 rounded-2xl border border-surface-200 space-y-3">
                <Clock className="w-12 h-12 text-amber-500 mx-auto" />
                <h4 className="text-base font-bold text-surface-900">Results Pending Release</h4>
                <p className="text-xs text-surface-600 max-w-sm mx-auto leading-relaxed">
                  Your responses were securely recorded. The course instructor will release official score cards and answer keys once evaluation is complete.
                </p>
              </div>
            ) : (
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                {/* Score Banner */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                      Final Score Card
                    </span>
                    <div className="text-3xl font-extrabold mt-1">
                      {resultData.attempt?.score} <span className="text-lg font-normal text-emerald-200">/ {resultData.attempt?.maxScore}</span>
                    </div>
                    <div className="text-xs text-emerald-100 mt-1">
                      Submitted on {fmtDate(resultData.attempt?.submittedAt)}
                    </div>
                  </div>

                  <div className="bg-white/20 backdrop-blur-md rounded-2xl px-5 py-3 text-center border border-white/20">
                    <span className="text-xs font-semibold text-emerald-100 block">Percentage</span>
                    <span className="text-2xl font-bold">
                      {Math.round(((resultData.attempt?.score || 0) / (resultData.attempt?.maxScore || 1)) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Question-Wise Review */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-surface-900">Question-by-Question Review</h4>

                  {resultData.questions?.map((q, idx) => {
                    const studentAns = resultData.attempt?.answers?.find(
                      a => a.questionId.toString() === q._id.toString()
                    );
                    const qRes = resultData.attempt?.questionResults?.find(
                      r => r.questionId.toString() === q._id.toString()
                    );

                    const isCorrect = qRes?.isCorrect;
                    const marksAwarded = qRes?.marksAwarded ?? 0;

                    return (
                      <div
                        key={q._id}
                        className={`rounded-2xl p-5 border space-y-3 ${
                          isCorrect === true
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : isCorrect === false
                            ? 'bg-red-50/40 border-red-200'
                            : 'bg-surface-50 border-surface-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-surface-700">Question {idx + 1}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white border border-surface-200">
                            {marksAwarded} / {q.marks} Marks
                          </span>
                        </div>

                        <div className="text-sm font-medium text-surface-900 leading-snug">
                          {q.text}
                        </div>

                        {/* Student selection vs Correct option */}
                        {['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE'].includes(q.type) ? (
                          <div className="space-y-2 pt-1 text-xs">
                            <div className="bg-white p-3 rounded-xl border border-surface-200">
                              <span className="font-bold text-surface-500 block text-[10px] uppercase">
                                Your Selection:
                              </span>
                              <span className="font-medium text-surface-800">
                                {q.options
                                  ?.filter(opt => studentAns?.selectedOptionIds?.includes(opt._id.toString()))
                                  .map(o => o.text)
                                  .join(', ') || <span className="text-surface-400 italic">No answer provided</span>}
                              </span>
                            </div>

                            {q.answerKey?.sampleAnswer && (
                              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-900">
                                <span className="font-bold text-emerald-700 block text-[10px] uppercase">
                                  Correct Answer:
                                </span>
                                <span className="font-semibold">{q.answerKey.sampleAnswer}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2 text-xs">
                            <div className="bg-white p-3 rounded-xl border border-surface-200">
                              <span className="font-bold text-surface-500 block text-[10px] uppercase">
                                Your Answer:
                              </span>
                              <span className="text-surface-800 whitespace-pre-wrap">
                                {studentAns?.textAnswer || <span className="text-surface-400 italic">No answer provided</span>}
                              </span>
                            </div>

                            {qRes?.teacherFeedback && (
                              <div className="bg-primary-50 p-3 rounded-xl border border-primary-200 text-primary-900">
                                <span className="font-bold text-primary-700 block text-[10px] uppercase">
                                  Instructor Feedback:
                                </span>
                                {qRes.teacherFeedback}
                              </div>
                            )}
                          </div>
                        )}

                        {q.explanation && (
                          <div className="text-xs text-surface-500 bg-white/70 p-2.5 rounded-lg border border-surface-200 italic">
                            Explanation: {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-surface-200">
              <Button variant="outline" size="sm" onClick={() => setViewingResult(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
