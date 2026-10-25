// client/src/api/axiosClient.js
// Central Axios instance used by all API modules.
// Automatically includes credentials (cookies), handles 401 redirects, and shows network errors.
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const axiosClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true, // Send httpOnly cookies with every request
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // CSRF header check on server
  },
  timeout: 30000, // 30-second timeout
});

// ─── Response interceptor ─────────────────────────────────────────────────────
axiosClient.interceptors.response.use(
  response => response, // Pass successful responses through
  async error => {
    const originalRequest = error.config;

    // On 401 (authentication required) — redirect to login
    // Exclude the /auth/me and /auth/login endpoints to avoid redirect loops
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/me')
    ) {
      originalRequest._retry = true;

      // Try the refresh endpoint first — the server will issue new cookies
      try {
        await axiosClient.post('/auth/refresh');
        // Retry the original request with the new cookies
        return axiosClient(originalRequest);
      } catch {
        // Refresh also failed — user must log in again
        // Dispatch a custom event so AuthContext can clear state and redirect
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
