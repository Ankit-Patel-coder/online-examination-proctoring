// client/src/api/adminApi.js
// Admin-related API calls — all require ADMIN role cookie session.
import axiosClient from './axiosClient';

const adminApi = {
  /** Get platform-wide stats for the dashboard */
  getDashboard: () => axiosClient.get('/admin/dashboard'),

  /**
   * Get paginated, filterable user list.
   * @param {{ page?, limit?, role?, status?, search? }} params
   */
  getUsers: (params = {}) => axiosClient.get('/admin/users', { params }),

  /** Get a single user by ID */
  getUser: (id) => axiosClient.get(`/admin/users/${id}`),

  /**
   * Create a teacher account.
   * @param {{ name, email, password }} data
   */
  createTeacher: (data) => axiosClient.post('/admin/users/teacher', data),

  /**
   * Activate or deactivate a user account.
   * @param {string} id
   * @param {'ACTIVE'|'INACTIVE'|'PENDING'} status
   */
  updateUserStatus: (id, status) =>
    axiosClient.patch(`/admin/users/${id}/status`, { status }),

  /** Get paginated audit logs */
  getAuditLogs: (params = {}) => axiosClient.get('/admin/audit-logs', { params }),
};

export default adminApi;
