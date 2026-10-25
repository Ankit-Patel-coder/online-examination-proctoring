// client/src/pages/UnauthorizedPage.jsx
// Shown when a logged-in user tries to access a route their role cannot access.
import { ShieldOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleDashboard = {
  ADMIN: '/admin/dashboard',
  TEACHER: '/teacher/dashboard',
  STUDENT: '/student/dashboard',
};

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const dashboardPath = user ? roleDashboard[user.role] || '/' : '/login';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="w-8 h-8 text-danger" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-surface-900 mb-2">Access Denied</h1>
        <p className="text-surface-500 mb-8">
          You don&apos;t have permission to view this page.
          {user && ` Your role is ${user.role.toLowerCase()}.`}
        </p>
        <Link
          to={dashboardPath}
          id="unauthorized-back-link"
          className="btn btn-primary"
        >
          Go to my dashboard
        </Link>
      </div>
    </div>
  );
}
