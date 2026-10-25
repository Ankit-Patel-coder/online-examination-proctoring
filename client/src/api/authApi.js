// client/src/api/authApi.js
// Auth-related API calls using the shared Axios client.
// Phase 2 will expand these with full request/response handling.
import axiosClient from './axiosClient';

const authApi = {
  /**
   * Register a new student account.
   * @param {{ name, email, password }} data
   */
  register: (data) => axiosClient.post('/auth/register', data),

  /**
   * Login with email and password.
   * Server sets httpOnly cookies on success.
   */
  login: (data) => axiosClient.post('/auth/login', data),

  /**
   * Logout — server clears cookies.
   */
  logout: () => axiosClient.post('/auth/logout'),

  /**
   * Get the currently authenticated user profile.
   * Returns 401 if not authenticated.
   */
  me: () => axiosClient.get('/auth/me'),

  /**
   * Change password for the current user.
   * @param {{ currentPassword, newPassword }} data
   */
  changePassword: (data) => axiosClient.post('/auth/change-password', data),
};

export default authApi;
