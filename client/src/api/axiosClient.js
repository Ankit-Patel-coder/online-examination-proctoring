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

// ─── Request interceptor ──────────────────────────────────────────────────────
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor ─────────────────────────────────────────────────────
axiosClient.interceptors.response.use(
  response => response, // Pass successful responses through
  async error => {
    const originalRequest = error.config;

    // On 401 (authentication required) — redirect to login
    // Exclude the /auth/me, /auth/login, and /auth/refresh endpoints to avoid redirect loops
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/me') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;

      // Try the refresh endpoint first — passing the refresh token if stored
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const refreshRes = await axiosClient.post('/auth/refresh', { refreshToken });
        const data = refreshRes.data?.data;
        if (data?.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        }
        // Retry the original request
        return axiosClient(originalRequest);
      } catch {
        // Refresh also failed — user must log in again
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // Dispatch a custom event so AuthContext can clear state and redirect
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
