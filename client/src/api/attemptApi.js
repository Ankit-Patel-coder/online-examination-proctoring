// client/src/api/attemptApi.js
// Student exam taking and attempt API calls.
import axiosClient from './axiosClient';

const attemptApi = {
  start: (examId) => axiosClient.post('/attempts/start', { examId }),
  get: (attemptId) => axiosClient.get(`/attempts/${attemptId}`),
  save: (attemptId, answers) => axiosClient.put(`/attempts/${attemptId}/save`, { answers }),
  submit: (attemptId, data = {}) => axiosClient.post(`/attempts/${attemptId}/submit`, data),
  logEvent: (attemptId, eventData) => axiosClient.post(`/attempts/${attemptId}/events`, eventData),
  getMyAttempts: () => axiosClient.get('/attempts/my'),
  getResults: (attemptId) => axiosClient.get(`/attempts/${attemptId}/results`),
};

export default attemptApi;
