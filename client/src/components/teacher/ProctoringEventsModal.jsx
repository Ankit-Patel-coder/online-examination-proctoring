// client/src/components/teacher/ProctoringEventsModal.jsx
// Teacher proctoring incident review dashboard for reviewing flagged security events.
import { useState, useEffect } from 'react';
import {
  ShieldAlert, CheckCircle2, XCircle, Clock, Check,
  AlertTriangle, Filter, Eye, MessageSquare
} from 'lucide-react';

import evaluationApi from '../../api/evaluationApi';
import { getSocket, joinExamRoom, leaveExamRoom, sendTeacherWarning } from '../../api/socket';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';

export default function ProctoringEventsModal({ exam, isOpen, onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewingEvent, setReviewingEvent] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('REVIEWED');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [warningTarget, setWarningTarget] = useState(null);
  const [warningMessage, setWarningMessage] = useState('Warning: Maintain direct eye contact with the camera and stay in fullscreen mode.');

  useEffect(() => {
    if (isOpen && exam) {
      loadEvents();
      joinExamRoom(exam._id);
      setLiveConnected(true);

      const socket = getSocket();
      const handleLiveIncident = (newEvent) => {
        setEvents(prev => [
          {
            _id: newEvent.id || `live_${Date.now()}`,
            eventType: newEvent.eventType,
            description: newEvent.description,
            occurredAt: newEvent.occurredAt,
            reviewStatus: 'UNREVIEWED',
            attemptId: {
              _id: newEvent.attemptId,
              studentId: {
                name: newEvent.studentName,
                email: newEvent.studentEmail,
              },
            },
          },
          ...prev,
        ]);
      };

      socket.on('proctoring:incident', handleLiveIncident);

      return () => {
        socket.off('proctoring:incident', handleLiveIncident);
        leaveExamRoom(exam._id);
        setLiveConnected(false);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, exam]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await evaluationApi.listProctoringEvents(exam._id);
      setEvents(res.data.data.events || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load proctoring logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewingEvent) return;
    try {
      setUpdating(true);
      await evaluationApi.reviewProctoringEvent(reviewingEvent._id, {
        reviewStatus,
        reviewerNotes,
      });
      setReviewingEvent(null);
      await loadEvents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update review status.');
    } finally {
      setUpdating(false);
    }
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }) : '—';

  return (
    <>
      <Modal isOpen={isOpen && !reviewingEvent} onClose={onClose} title={`Proctoring Audit: ${exam?.title}`}>
        <div className="space-y-5 max-w-4xl w-full">
          <div className="flex items-center justify-between bg-surface-50 p-4 rounded-2xl border border-surface-200">
            <div>
              <div className="text-sm font-semibold text-surface-900">
                Total Flagged Events: {events.length}
              </div>
              <div className="text-xs text-surface-500">
                Review incidents to confirm academic integrity or dismiss false positives.
              </div>
            </div>
            <div className="flex items-center gap-2">
              {liveConnected && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Feed Active
                </span>
              )}
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                Automated Watchdog
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center bg-surface-50 rounded-2xl border border-surface-200 text-sm text-surface-500">
              No integrity violations recorded for this examination.
            </div>
          ) : (
            <div className="border border-surface-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-50 border-b border-surface-200 text-xs text-surface-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-5 py-3.5">Event Type</th>
                      <th className="px-5 py-3.5">Timestamp</th>
                      <th className="px-5 py-3.5">Duration</th>
                      <th className="px-5 py-3.5">Review Status</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {events.map(ev => {
                      const student = ev.attemptId?.studentId;
                      return (
                        <tr key={ev._id} className="hover:bg-surface-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-surface-900">{student?.name || 'Student'}</div>
                            <div className="text-xs text-surface-500">{student?.email}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                              <ShieldAlert className="w-3 h-3 text-red-500" />
                              {ev.eventType.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-surface-600">
                            {fmtDate(ev.occurredAt)}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-surface-600 font-mono">
                            {ev.durationMs ? `${(ev.durationMs / 1000).toFixed(1)}s` : 'Momentary'}
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge
                              variant={
                                ev.reviewStatus === 'REVIEWED'
                                  ? 'green'
                                  : ev.reviewStatus === 'DISMISSED'
                                  ? 'gray'
                                  : 'yellow'
                              }
                            >
                              {ev.reviewStatus}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setWarningTarget(ev)}
                                className="text-xs py-1 px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                                title="Send live warning alert to student"
                              >
                                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                                Warn
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setReviewingEvent(ev);
                                  setReviewStatus(ev.reviewStatus === 'UNREVIEWED' ? 'REVIEWED' : ev.reviewStatus);
                                  setReviewerNotes(ev.reviewerNotes || '');
                                }}
                                className="text-xs py-1 px-2.5"
                              >
                                Review
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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

      {/* ─── Incident Review Child Modal ─────────────────────────────────────── */}
      {reviewingEvent && (
        <Modal
          isOpen={true}
          onClose={() => setReviewingEvent(null)}
          title="Review Proctoring Incident"
        >
          <div className="space-y-4 max-w-md w-full">
            <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-surface-500">Student:</span>
                <span className="font-bold text-surface-900">
                  {reviewingEvent.attemptId?.studentId?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Incident:</span>
                <span className="font-bold text-red-600">
                  {reviewingEvent.eventType.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Logged Time:</span>
                <span className="text-surface-700">{fmtDate(reviewingEvent.occurredAt)}</span>
              </div>
              <div className="pt-2 border-t border-surface-200 text-surface-600 italic">
                {reviewingEvent.description}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-surface-700 uppercase mb-1">
                Incident Determination
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewStatus('REVIEWED')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    reviewStatus === 'REVIEWED'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                      : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Mark Reviewed
                </button>
                <button
                  type="button"
                  onClick={() => setReviewStatus('DISMISSED')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    reviewStatus === 'DISMISSED'
                      ? 'bg-surface-100 border-surface-400 text-surface-800 ring-2 ring-surface-400/20'
                      : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'
                  }`}
                >
                  <XCircle className="w-4 h-4 text-surface-500" />
                  Dismiss / False Alarm
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-surface-700 uppercase mb-1">
                Instructor Notes
              </label>
              <textarea
                rows={3}
                placeholder="Add audit notes regarding this security event..."
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                className="w-full bg-white border border-surface-300 rounded-xl p-3 text-xs text-surface-900 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-surface-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReviewingEvent(null)}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleReviewSubmit}
                disabled={updating}
                className="bg-primary-600 hover:bg-primary-500 text-white font-medium"
              >
                {updating ? 'Saving...' : 'Save Incident Status'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Proctor Live Warning Modal ────────────────────────────────────── */}
      {warningTarget && (
        <Modal
          isOpen={true}
          onClose={() => setWarningTarget(null)}
          title={`Send Live Warning: ${warningTarget.attemptId?.studentId?.name || 'Student'}`}
        >
          <div className="space-y-4 max-w-md w-full">
            <p className="text-xs text-surface-600">
              This warning will be delivered immediately to the student's examination screen in real-time via WebSocket.
            </p>
            <textarea
              rows={3}
              className="w-full border border-surface-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              value={warningMessage}
              onChange={(e) => setWarningMessage(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-3 border-t border-surface-200">
              <Button variant="outline" size="sm" onClick={() => setWarningTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const targetAttemptId = warningTarget.attemptId?._id || warningTarget.attemptId;
                  sendTeacherWarning(targetAttemptId, exam._id, warningMessage);
                  alert('Live warning sent to student screen.');
                  setWarningTarget(null);
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white font-medium"
              >
                Send Live Warning
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
