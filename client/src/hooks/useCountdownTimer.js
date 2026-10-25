// client/src/hooks/useCountdownTimer.js
// Custom hook for the server-authoritative exam countdown.
// The server provides deadlineAt. This hook calculates remaining time
// by comparing deadlineAt against the current clock — no drift.
import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * @param {string|Date|null} deadlineAt - ISO string or Date from the server
 * @param {Function} onExpire - Callback when time reaches zero
 * @returns {{ secondsLeft: number, isExpired: boolean, formattedTime: string }}
 */
const useCountdownTimer = (deadlineAt, onExpire) => {
  const [secondsLeft, setSecondsLeft] = useState(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const calculateSeconds = useCallback(() => {
    if (!deadlineAt) return null;
    const diff = Math.max(0, Math.floor((new Date(deadlineAt) - Date.now()) / 1000));
    return diff;
  }, [deadlineAt]);

  useEffect(() => {
    if (!deadlineAt) return;

    // Set immediately on mount (no 1-second delay)
    setSecondsLeft(calculateSeconds());

    const interval = setInterval(() => {
      const remaining = calculateSeconds();
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpireRef.current?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadlineAt, calculateSeconds]);

  const isExpired = secondsLeft !== null && secondsLeft <= 0;

  // Format as HH:MM:SS or MM:SS
  const formattedTime = (() => {
    if (secondsLeft === null) return '--:--';
    if (secondsLeft <= 0) return '00:00';
    const h = Math.floor(secondsLeft / 3600);
    const m = Math.floor((secondsLeft % 3600) / 60);
    const s = secondsLeft % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${String(h).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
  })();

  return { secondsLeft, isExpired, formattedTime };
};

export default useCountdownTimer;
