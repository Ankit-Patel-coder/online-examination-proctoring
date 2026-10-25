// client/src/pages/exam/ExamTakingPage.jsx
// Phase 5: Complete Student Examination Interface with Live Proctoring,
// Auto-Saving, Question Palette, Fullscreen Enforcement & Timed Auto-Submit.
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock, ShieldAlert, Video, VideoOff, Maximize,
  CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight,
  Bookmark, Flag, Check, RotateCcw, AlertCircle, Send,
  HelpCircle, Eye, RefreshCw
} from 'lucide-react';

import attemptApi from '../../api/attemptApi';
import { getSocket, joinAttemptRoom } from '../../api/socket';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';

export default function ExamTakingPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  // ─── Data State ────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(null);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // ─── Answer & Review State ────────────────────────────────────────────────
  // Map of questionId -> { selectedOptionIds: [], textAnswer: '' }
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'error'

  // ─── Timer State ──────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(0);

  // ─── Proctoring State ─────────────────────────────────────────────────────
  const [violations, setViolations] = useState([]);
  const [warningCount, setWarningCount] = useState(0);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationMessage, setViolationMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  // ─── Modals State ─────────────────────────────────────────────────────────
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Refs
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const timerRef = useRef(null);
  const autoSaveDebounceRef = useRef(null);

  // ─── Load Attempt Data ────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function loadAttempt() {
      try {
        setLoading(true);
        const res = await attemptApi.get(attemptId);
        if (!isMounted) return;

        const data = res.data.data;
        setAttempt(data.attempt);
        setExam(data.exam);
        setQuestions(data.questions || []);
        setTimeLeft(data.timeRemainingSeconds || 0);

        // Prepopulate answers from attempt.answers
        const initialAnswers = {};
        if (data.attempt.answers) {
          data.attempt.answers.forEach(ans => {
            initialAnswers[ans.questionId] = {
              selectedOptionIds: (ans.selectedOptionIds || []).map(id => id.toString()),
              textAnswer: ans.textAnswer || '',
            };
          });
        }
        setAnswers(initialAnswers);

        if (data.attempt.status !== 'IN_PROGRESS') {
          // If already submitted/expired, redirect or show message
          setError('This examination attempt is already closed.');
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err.response?.data?.message || 'Failed to load examination.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAttempt();

    return () => {
      isMounted = false;
    };
  }, [attemptId]);

  // ─── Real-time Socket Proctor Warning Listener ────────────────────────────
  useEffect(() => {
    if (!attemptId) return;
    joinAttemptRoom(attemptId);
    const socket = getSocket();

    const handleTeacherWarning = (data) => {
      setViolationMessage(data.message || 'Official warning issued by proctor.');
      setShowViolationModal(true);
      setWarningCount(prev => prev + 1);
    };

    socket.on('student:warning', handleTeacherWarning);

    return () => {
      socket.off('student:warning', handleTeacherWarning);
    };
  }, [attemptId]);

  // ─── Webcam Stream Setup ──────────────────────────────────────────────────
  useEffect(() => {
    if (!exam?.proctoring?.webcamRequired) return;

    let active = true;

    async function initWebcam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 } },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      } catch (err) {
        console.warn('Webcam permission denied or camera unavailable:', err.message);
        setCameraActive(false);
      }
    }

    initWebcam();

    return () => {
      active = false;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [exam]);

  // ─── Countdown Timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !attempt || attempt.status !== 'IN_PROGRESS') return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, attempt]);

  // ─── Proctoring Listeners: Fullscreen & Tab Switch ─────────────────────────
  const reportViolation = useCallback(async (type, desc) => {
    try {
      setWarningCount(prev => prev + 1);
      setViolations(prev => [{ type, desc, time: new Date() }, ...prev]);
      setViolationMessage(desc);
      setShowViolationModal(true);

      await attemptApi.logEvent(attemptId, {
        eventType: type,
        description: desc,
      });
    } catch (err) {
      console.warn('Failed to report proctoring event:', err.message);
    }
  }, [attemptId]);

  useEffect(() => {
    if (loading || submissionResult || !exam?.proctoring?.enabled) return;

    // Fullscreen change handler
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && exam?.proctoring?.fullscreenRequired) {
        reportViolation('FULLSCREEN_EXIT', 'Fullscreen mode was exited. Please stay in fullscreen.');
      }
    };

    // Tab visibility handler
    const handleVisibilityChange = () => {
      if (document.hidden && exam?.proctoring?.tabSwitchDetection) {
        reportViolation('TAB_HIDDEN', 'Tab switch or window blur detected. Avoid switching windows.');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loading, submissionResult, exam, reportViolation]);

  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn('Fullscreen request rejected:', err.message);
    }
  };

  // ─── Auto-Saving Answers ──────────────────────────────────────────────────
  const scheduleSave = (qId, answerData) => {
    setSaveStatus('saving');
    if (autoSaveDebounceRef.current) {
      clearTimeout(autoSaveDebounceRef.current);
    }

    autoSaveDebounceRef.current = setTimeout(async () => {
      try {
        await attemptApi.save(attemptId, [
          {
            questionId: qId,
            selectedOptionIds: answerData.selectedOptionIds || [],
            textAnswer: answerData.textAnswer || '',
          },
        ]);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Auto-save error:', err.message);
        setSaveStatus('error');
      }
    }, 800);
  };

  const handleSelectOption = (questionId, optionId, type) => {
    setAnswers(prev => {
      const current = prev[questionId] || { selectedOptionIds: [], textAnswer: '' };
      let newSelected;

      if (type === 'MCQ_MULTIPLE') {
        const set = new Set(current.selectedOptionIds);
        if (set.has(optionId)) {
          set.delete(optionId);
        } else {
          set.add(optionId);
        }
        newSelected = Array.from(set);
      } else {
        // MCQ_SINGLE or TRUE_FALSE
        newSelected = [optionId];
      }

      const updated = { ...current, selectedOptionIds: newSelected };
      scheduleSave(questionId, updated);
      return { ...prev, [questionId]: updated };
    });
  };

  const handleTextChange = (questionId, text) => {
    setAnswers(prev => {
      const current = prev[questionId] || { selectedOptionIds: [], textAnswer: '' };
      const updated = { ...current, textAnswer: text };
      scheduleSave(questionId, updated);
      return { ...prev, [questionId]: updated };
    });
  };

  const handleClearAnswer = (questionId) => {
    setAnswers(prev => {
      const updated = { selectedOptionIds: [], textAnswer: '' };
      scheduleSave(questionId, updated);
      return { ...prev, [questionId]: updated };
    });
  };

  const toggleMarkForReview = (questionId) => {
    setMarkedForReview(prev => {
      const nextSet = new Set(prev);
      if (nextSet.has(questionId)) {
        nextSet.delete(questionId);
      } else {
        nextSet.add(questionId);
      }
      return nextSet;
    });
  };

  // ─── Submission ───────────────────────────────────────────────────────────
  const handleSubmitExam = async () => {
    setIsSubmitting(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
        questionId: qId,
        selectedOptionIds: ans.selectedOptionIds || [],
        textAnswer: ans.textAnswer || '',
      }));

      const res = await attemptApi.submit(attemptId, { answers: formattedAnswers });
      setSubmissionResult(res.data.data);
      setShowSubmitModal(false);

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmit = async () => {
    try {
      const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
        questionId: qId,
        selectedOptionIds: ans.selectedOptionIds || [],
        textAnswer: ans.textAnswer || '',
      }));
      const res = await attemptApi.submit(attemptId, { answers: formattedAnswers });
      setSubmissionResult(res.data.data);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (err) {
      console.error('Auto-submit failed:', err.message);
    }
  };

  // ─── Format Helpers ───────────────────────────────────────────────────────
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ─── Render States ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-900 text-white gap-4">
        <Spinner size="lg" />
        <p className="text-surface-400 font-medium tracking-wide">Initializing secure exam environment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 p-6">
        <div className="card max-w-md p-8 text-center bg-white shadow-xl rounded-2xl border border-surface-200">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-surface-900 mb-2">Notice</h2>
          <p className="text-surface-600 mb-6">{error}</p>
          <Button onClick={() => navigate('/student/dashboard')} className="w-full">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // ─── Post-Submission Screen ───────────────────────────────────────────────
  if (submissionResult) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6 text-white">
        <div className="max-w-md w-full bg-surface-800 border border-surface-700 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Examination Submitted!</h1>
          <p className="text-surface-400 text-sm mb-6">
            Your responses have been successfully recorded and encrypted in the system.
          </p>

          <div className="bg-surface-900/60 rounded-2xl p-5 border border-surface-700/60 text-left mb-6 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-surface-400">Exam Title:</span>
              <span className="font-semibold text-white truncate max-w-[200px]">{exam?.title}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-surface-400">Status:</span>
              <Badge variant="green">SUBMITTED</Badge>
            </div>
            {submissionResult.evaluationStatus === 'AUTO_GRADED' ? (
              <div className="flex justify-between items-center text-sm pt-2 border-t border-surface-700/50">
                <span className="text-surface-400">Calculated Score:</span>
                <span className="font-bold text-emerald-400 text-base">
                  {submissionResult.score} / {submissionResult.maxScore}
                </span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-sm pt-2 border-t border-surface-700/50">
                <span className="text-surface-400">Evaluation:</span>
                <span className="text-amber-400 font-medium">Pending Review</span>
              </div>
            )}
          </div>

          <Button
            onClick={() => navigate('/student/dashboard')}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-primary-600/30"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const totalQuestions = questions.length;
  const currentAnswer = answers[currentQ?._id] || { selectedOptionIds: [], textAnswer: '' };
  const isAnswered =
    currentAnswer.selectedOptionIds.length > 0 || !!currentAnswer.textAnswer.trim();
  const isMarked = markedForReview.has(currentQ?._id);

  // Stats for submission summary
  const answeredCount = questions.filter(
    q => answers[q._id]?.selectedOptionIds?.length > 0 || !!answers[q._id]?.textAnswer?.trim()
  ).length;
  const unansweredCount = totalQuestions - answeredCount;
  const markedCount = markedForReview.size;

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 flex flex-col font-sans select-none">
      {/* ─── Top Bar ────────────────────────────────────────────────────────── */}
      <header className="h-16 bg-surface-900 border-b border-surface-800 px-6 flex items-center justify-between shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400 font-bold text-sm">
            EP
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-semibold text-white tracking-wide truncate max-w-xs md:max-w-md">
              {exam?.title}
            </h1>
            <span className="text-xs text-surface-400">Question {currentIdx + 1} of {totalQuestions}</span>
          </div>
        </div>

        {/* Center: Live Timer */}
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-semibold tracking-wider transition-all duration-300 ${
          timeLeft <= 300
            ? 'bg-red-500/10 border-red-500/40 text-red-400 animate-pulse'
            : 'bg-surface-800/80 border-surface-700 text-surface-200'
        }`}>
          <Clock className={`w-4 h-4 ${timeLeft <= 300 ? 'text-red-400' : 'text-primary-400'}`} />
          <span>{formatTime(timeLeft)}</span>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Auto-save status */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-surface-400">
            {saveStatus === 'saving' && (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary-400" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400">Save failed</span>
              </>
            )}
          </div>

          {/* Fullscreen button */}
          {!isFullscreen && exam?.proctoring?.fullscreenRequired && (
            <Button
              variant="outline"
              size="sm"
              onClick={enterFullscreen}
              className="border-primary-500/40 text-primary-300 hover:bg-primary-500/10 text-xs py-1 px-2.5"
            >
              <Maximize className="w-3.5 h-3.5 mr-1" />
              Fullscreen
            </Button>
          )}

          {/* Submit button */}
          <Button
            id="exam-finish-submit-btn"
            variant="primary"
            size="sm"
            onClick={() => setShowSubmitModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs py-1.5 px-3.5 shadow-md shadow-emerald-600/20"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Finish & Submit
          </Button>
        </div>
      </header>

      {/* ─── Main Examination Workspace ─────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Question Presentation Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col justify-between">
          <div className="max-w-3xl mx-auto w-full">
            {/* Question Header Card */}
            <div className="bg-surface-900/90 border border-surface-800 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-surface-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center font-bold text-sm text-surface-200">
                    Q{currentIdx + 1}
                  </span>
                  <Badge variant="blue" className="text-xs">
                    {currentQ?.type?.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-surface-400">
                    {currentQ?.marks} {currentQ?.marks === 1 ? 'Mark' : 'Marks'}
                  </span>
                </div>

                {/* Mark for review toggle */}
                <button
                  type="button"
                  onClick={() => toggleMarkForReview(currentQ?._id)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                    isMarked
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-surface-800/60 border-surface-700 text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <Flag className={`w-3.5 h-3.5 ${isMarked ? 'fill-amber-400 text-amber-400' : ''}`} />
                  <span>{isMarked ? 'Marked for Review' : 'Mark for Review'}</span>
                </button>
              </div>

              {/* Question Text */}
              <div className="text-base md:text-lg text-surface-100 font-medium leading-relaxed mb-6">
                {currentQ?.text}
              </div>

              {/* Options Input */}
              {['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE'].includes(currentQ?.type) ? (
                <div className="space-y-3">
                  {currentQ?.options?.map((opt, oIdx) => {
                    const optId = opt._id.toString();
                    const isSelected = currentAnswer.selectedOptionIds.includes(optId);
                    const letter = String.fromCharCode(65 + oIdx);

                    return (
                      <div
                        key={optId}
                        onClick={() => handleSelectOption(currentQ._id, optId, currentQ.type)}
                        className={`group flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary-600/15 border-primary-500/60 text-white shadow-sm'
                            : 'bg-surface-950/40 border-surface-800/80 hover:border-surface-700 text-surface-300 hover:bg-surface-800/30'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-primary-600 text-white'
                              : 'bg-surface-800 text-surface-400 group-hover:bg-surface-700'
                          }`}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : letter}
                        </div>
                        <span className="text-sm md:text-base leading-snug pt-0.5">{opt.text}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* SHORT_ANSWER or DESCRIPTIVE */
                <div>
                  <textarea
                    rows={6}
                    value={currentAnswer.textAnswer || ''}
                    onChange={(e) => handleTextChange(currentQ._id, e.target.value)}
                    placeholder="Type your detailed answer here..."
                    className="w-full bg-surface-950/60 border border-surface-800 rounded-xl p-4 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm leading-relaxed resize-y"
                  />
                  <div className="flex justify-between items-center text-xs text-surface-500 mt-2">
                    <span>Markdown/plain text supported</span>
                    <span>{currentAnswer.textAnswer?.length || 0} characters</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Controls */}
          <div className="max-w-3xl mx-auto w-full pt-6 flex items-center justify-between border-t border-surface-800/60 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(prev => prev - 1)}
              className="border-surface-700 text-surface-300 hover:bg-surface-800/60"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              {isAnswered && (
                <button
                  type="button"
                  onClick={() => handleClearAnswer(currentQ._id)}
                  className="text-xs text-surface-400 hover:text-surface-200 px-3 py-1.5 rounded-lg border border-surface-800 hover:bg-surface-800/40 transition-colors"
                >
                  Clear response
                </button>
              )}

              {currentIdx < totalQuestions - 1 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCurrentIdx(prev => prev + 1)}
                  className="bg-primary-600 hover:bg-primary-500 text-white font-medium"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowSubmitModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-600/30"
                >
                  Review & Submit
                </Button>
              )}
            </div>
          </div>
        </main>

        {/* Right: Sidebar / Palette + Proctoring Feed */}
        <aside className="w-80 border-l border-surface-800 bg-surface-900/60 p-5 flex flex-col justify-between shrink-0 overflow-y-auto hidden lg:flex">
          <div className="space-y-6">
            {/* Live Webcam Proctoring Box */}
            {exam?.proctoring?.webcamRequired && (
              <div className="bg-surface-950/80 border border-surface-800 rounded-2xl p-3 shadow-inner">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-surface-300">
                    <Video className="w-3.5 h-3.5 text-primary-400" />
                    <span>Live Proctoring</span>
                  </div>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>

                <div className="relative aspect-video rounded-xl overflow-hidden bg-surface-900 border border-surface-800 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-900/90 text-surface-400 text-xs p-2 text-center">
                      <VideoOff className="w-6 h-6 text-surface-500 mb-1" />
                      <span>Camera preview connecting...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Question Navigator Palette */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-3 px-1">
                Question Navigator
              </h2>

              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const qAns = answers[q._id];
                  const hasAnswer =
                    qAns?.selectedOptionIds?.length > 0 || !!qAns?.textAnswer?.trim();
                  const isRev = markedForReview.has(q._id);
                  const isCurrent = idx === currentIdx;

                  let colorClasses = 'bg-surface-800/80 text-surface-400 border-surface-700/60';
                  if (isRev) {
                    colorClasses = 'bg-amber-500/20 text-amber-300 border-amber-500/50';
                  } else if (hasAnswer) {
                    colorClasses = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
                  }

                  if (isCurrent) {
                    colorClasses += ' ring-2 ring-primary-500 border-primary-500 font-bold';
                  }

                  return (
                    <button
                      key={q._id}
                      type="button"
                      onClick={() => setCurrentIdx(idx)}
                      className={`h-9 rounded-lg border text-xs font-medium flex items-center justify-center transition-all ${colorClasses}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Legend */}
            <div className="bg-surface-950/60 border border-surface-800/60 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-surface-300">
                <span className="w-3.5 h-3.5 rounded bg-emerald-500/20 border border-emerald-500/50"></span>
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2 text-surface-300">
                <span className="w-3.5 h-3.5 rounded bg-amber-500/20 border border-amber-500/50"></span>
                <span>Marked for Review ({markedCount})</span>
              </div>
              <div className="flex items-center gap-2 text-surface-300">
                <span className="w-3.5 h-3.5 rounded bg-surface-800/80 border border-surface-700/60"></span>
                <span>Not Answered ({unansweredCount})</span>
              </div>
            </div>
          </div>

          {/* Warning Counter */}
          {warningCount > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
              <span>Proctoring alerts logged: {warningCount}</span>
            </div>
          )}
        </aside>
      </div>

      {/* ─── Confirmation Submit Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Examination"
      >
        <div className="space-y-4">
          <p className="text-surface-600 text-sm">
            Are you sure you want to finish and submit your examination? Once submitted, you cannot modify your answers.
          </p>

          <div className="bg-surface-50 rounded-xl p-4 border border-surface-200 grid grid-cols-3 gap-2 text-center">
            <div className="p-2">
              <div className="text-xl font-bold text-emerald-600">{answeredCount}</div>
              <div className="text-xs text-surface-500">Answered</div>
            </div>
            <div className="p-2">
              <div className="text-xl font-bold text-amber-600">{markedCount}</div>
              <div className="text-xs text-surface-500">Marked Review</div>
            </div>
            <div className="p-2">
              <div className="text-xl font-bold text-red-600">{unansweredCount}</div>
              <div className="text-xs text-surface-500">Unanswered</div>
            </div>
          </div>

          {unansweredCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>You still have {unansweredCount} unanswered {unansweredCount === 1 ? 'question' : 'questions'}.</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-surface-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSubmitModal(false)}
              disabled={isSubmitting}
            >
              Back to Exam
            </Button>
            <Button
              id="confirm-submit-exam-btn"
              variant="primary"
              size="sm"
              onClick={handleSubmitExam}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Submitting...
                </>
              ) : (
                'Yes, Submit Final'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Proctoring Violation Alert Modal ───────────────────────────────── */}
      <Modal
        isOpen={showViolationModal}
        onClose={() => setShowViolationModal(false)}
        title="Proctoring Notice"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-surface-900">Security Warning #{warningCount}</h4>
              <p className="text-sm text-surface-600 mt-1">{violationMessage}</p>
            </div>
          </div>

          <p className="text-xs text-surface-500 bg-surface-50 p-3 rounded-lg border border-surface-200">
            This event has been logged to your proctoring audit trail and will be reviewed by your course instructor.
          </p>

          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowViolationModal(false);
                if (exam?.proctoring?.fullscreenRequired && !document.fullscreenElement) {
                  enterFullscreen();
                }
              }}
            >
              I Understand, Continue Exam
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
