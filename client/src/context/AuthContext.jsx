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
        // Not authenticated — clear state
        dispatch({ type: 'SET_USER', payload: null });
      }
    };
    restoreSession();
  }, []);

  /**
   * Login and store the returned user in context.
   * @param {{ email, password }} credentials
   */
  const login = useCallback(async (credentials) => {
    const res = await authApi.login(credentials);
    dispatch({ type: 'SET_USER', payload: res.data.data });
    return res.data.data;
  }, []);

  /**
   * Register a new student account and automatically log them in.
   * @param {{ name, email, password }} data
   */
  const register = useCallback(async (data) => {
    const res = await authApi.register(data);
    dispatch({ type: 'SET_USER', payload: res.data.data });
    return res.data.data;
  }, []);

  /**
   * Logout the current user and clear the context.
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
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
