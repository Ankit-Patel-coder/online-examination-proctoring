// client/src/api/evaluationApi.js
// Teacher manual grading, analytics, results release, and proctoring review API calls.
import axiosClient from './axiosClient';

const evaluationApi = {
  listAttempts: (examId) => axiosClient.get(`/exams/${examId}/attempts`),
  getEvaluation: (attemptId) => axiosClient.get(`/attempts/${attemptId}/evaluation`),
  submitEvaluation: (attemptId, evaluations) =>
    axiosClient.put(`/attempts/${attemptId}/evaluate`, { evaluations }),
  releaseResults: (examId) => axiosClient.patch(`/exams/${examId}/release-results`),
  getAnalytics: (examId) => axiosClient.get(`/exams/${examId}/analytics`),
  listProctoringEvents: (examId) => axiosClient.get(`/exams/${examId}/proctoring-events`),
  reviewProctoringEvent: (eventId, data) =>
    axiosClient.patch(`/attempts/events/${eventId}/review`, data),
};

export default evaluationApi;
