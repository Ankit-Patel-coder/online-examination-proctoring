// client/src/routes/ProtectedRoute.jsx
// Redirects unauthenticated users to /login and unauthorized roles to /unauthorized.
// Shows a full-screen spinner while the auth state is still loading.
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

/**
 * @param {string|string[]} [roles] - One or more roles that may access this route.
 *   Omit to allow any authenticated user.
 */
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Still checking cookies — don't flash the login page
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-surface-50"
        aria-label="Loading"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  // Not logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but wrong role
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
