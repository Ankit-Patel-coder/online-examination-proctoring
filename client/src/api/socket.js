// client/src/api/socket.js
// Singleton Socket.IO client connection for real-time proctoring and alerts.
import { io } from 'socket.io-client';

let socket = null;

/**
 * Get or initialize the Socket.IO connection.
 */
export const getSocket = () => {
  if (!socket) {
    const serverUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    socket = io(serverUrl, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('🔌 Socket.IO connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket.IO connection error:', err.message);
    });
  }

  return socket;
};

/**
 * Join an exam room for real-time monitoring.
 */
export const joinExamRoom = (examId) => {
  const s = getSocket();
  if (s && examId) {
    s.emit('join:exam', examId);
  }
};

/**
 * Leave an exam room.
 */
export const leaveExamRoom = (examId) => {
  const s = getSocket();
  if (s && examId) {
    s.emit('leave:exam', examId);
  }
};

/**
 * Join an attempt room (for student or direct proctor).
 */
export const joinAttemptRoom = (attemptId) => {
  const s = getSocket();
  if (s && attemptId) {
    s.emit('join:attempt', attemptId);
  }
};

/**
 * Send teacher warning to student attempt.
 */
export const sendTeacherWarning = (attemptId, examId, message, level = 'WARNING') => {
  const s = getSocket();
  if (s) {
    s.emit('teacher:warning', { attemptId, examId, message, level });
  }
};
