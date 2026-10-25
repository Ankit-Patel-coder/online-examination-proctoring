// client/src/api/examApi.js
// Exam and question API calls.
import axiosClient from './axiosClient';

const examApi = {
  // ── Exams ──
  create: (data) => axiosClient.post('/exams', data),
  list: (params = {}) => axiosClient.get('/exams', { params }),
  get: (id) => axiosClient.get(`/exams/${id}`),
  update: (id, data) => axiosClient.put(`/exams/${id}`, data),
  delete: (id) => axiosClient.delete(`/exams/${id}`),
  publish: (id) => axiosClient.patch(`/exams/${id}/publish`),
  cancel: (id, reason) => axiosClient.patch(`/exams/${id}/cancel`, { reason }),

  // ── Questions ──
  addQuestion: (examId, data) => axiosClient.post(`/exams/${examId}/questions`, data),
  updateQuestion: (examId, questionId, data) =>
    axiosClient.put(`/exams/${examId}/questions/${questionId}`, data),
  deleteQuestion: (examId, questionId) =>
    axiosClient.delete(`/exams/${examId}/questions/${questionId}`),
  reorderQuestions: (examId, order) =>
    axiosClient.patch(`/exams/${examId}/questions/reorder`, { order }),
};

export default examApi;
