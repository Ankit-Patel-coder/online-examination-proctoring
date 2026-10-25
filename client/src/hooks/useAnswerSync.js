// client/src/hooks/useAnswerSync.js
// Auto-saves exam answers to the backend on a configurable interval
// and immediately on demand (navigation between questions).
// Handles network failures gracefully — saved answers survive page refresh.
import { useCallback, useEffect, useRef, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { ANSWER_SYNC_INTERVAL_MS } from '../utils/constants';

/**
 * @param {string|null} attemptId - The current exam attempt ID
 * @param {Array} answers         - Current answers array from component state
 * @param {boolean} enabled       - False when exam is submitted/expired
 */
const useAnswerSync = (attemptId, answers, enabled = true) => {
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const pendingRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const save = useCallback(async (force = false) => {
    if (!attemptId || !enabled || (!force && pendingRef.current)) return;

    pendingRef.current = true;
    setSyncStatus('saving');

    try {
      await axiosClient.put(`/attempts/${attemptId}/answers`, {
        answers: answersRef.current,
      });
      setSyncStatus('saved');
    } catch (err) {
      setSyncStatus('error');
      console.warn('[useAnswerSync] Save failed:', err.message);
    } finally {
      pendingRef.current = false;
    }
  }, [attemptId, enabled]);

  // Auto-save on interval
  useEffect(() => {
    if (!enabled || !attemptId) return;

    const interval = setInterval(() => save(), ANSWER_SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [save, enabled, attemptId]);

  // Save immediately when the page is about to unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!enabled || !attemptId) return;
      // sendBeacon is more reliable than fetch on unload
      const blob = new Blob(
        [JSON.stringify({ answers: answersRef.current })],
        { type: 'application/json' }
      );
      navigator.sendBeacon?.(`/api/attempts/${attemptId}/answers`, blob);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [attemptId, enabled]);

  return {
    syncStatus,       // Show "Saving..." / "Saved" / "Save failed" in the UI
    saveNow: save,    // Call this on question navigation (force = true)
  };
};

export default useAnswerSync;
