// client/src/context/AuthContext.jsx
// Global auth state — provides the current user, loading state, and auth actions.
// Wrap the app in <AuthProvider> to give all children access via useAuth().
import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import authApi from '../api/authApi';

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // true on mount while we check /me
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: !!action.payload, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGOUT':
      return { user: null, isAuthenticated: false, isLoading: false };
    default:
      return state;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  /**
   * On mount, call /me to restore the session from httpOnly cookies.
   * If the cookies are absent or expired, the server returns 401 — that's fine.
   */
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await authApi.me();
        dispatch({ type: 'SET_USER', payload: res.data.data });
      } catch {
        // Not authenticated with cookies/current token — try refresh token from localStorage
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const refreshRes = await authApi.refresh({ refreshToken });
            const data = refreshRes.data.data;
            if (data?.accessToken) localStorage.setItem('accessToken', data.accessToken);
            if (data?.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
            dispatch({ type: 'SET_USER', payload: data });
            return;
          } catch {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          }
        }
        dispatch({ type: 'SET_USER', payload: null });
      }
    };
    restoreSession();

    const handleSessionExpired = () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      dispatch({ type: 'LOGOUT' });
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  /**
   * Login and store the returned user and tokens in context/storage.
   * @param {{ email, password }} credentials
   */
  const login = useCallback(async (credentials) => {
    const res = await authApi.login(credentials);
    const data = res.data.data;
    if (data?.accessToken) localStorage.setItem('accessToken', data.accessToken);
    if (data?.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    dispatch({ type: 'SET_USER', payload: data });
    return data;
  }, []);

  /**
   * Register a new student account and automatically log them in.
   * @param {{ name, email, password }} data
   */
  const register = useCallback(async (data) => {
    const res = await authApi.register(data);
    const resData = res.data.data;
    if (resData?.accessToken) localStorage.setItem('accessToken', resData.accessToken);
    if (resData?.refreshToken) localStorage.setItem('refreshToken', resData.refreshToken);
    dispatch({ type: 'SET_USER', payload: resData });
    return resData;
  }, []);

  /**
   * Logout the current user and clear the context and storage.
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  /**
   * Change the current user's password.
   * @param {{ currentPassword, newPassword, confirmPassword }} data
   */
  const changePassword = useCallback(async (data) => {
    const res = await authApi.changePassword(data);
    dispatch({ type: 'SET_USER', payload: res.data.data });
    return res.data.data;
  }, []);

  const value = {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    login,
    register,
    logout,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useAuth — access the auth context from any component inside AuthProvider.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;
