// client/src/App.jsx
// Root component — sets up React Router, global providers, and all Phase 2 routes.
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

// Public pages
import DesignShowcase from './pages/DesignShowcase';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Dashboard & Examination pages
import StudentDashboard from './pages/dashboards/StudentDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import TeacherDashboard from './pages/dashboards/TeacherDashboard';
import ExamTakingPage from './pages/exam/ExamTakingPage';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Design system (dev only) ── */}
            <Route path="/showcase" element={<DesignShowcase />} />

            {/* ── Public auth routes ── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* ── Protected: Student ── */}
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute roles={['STUDENT']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/exam/:attemptId"
              element={
                <ProtectedRoute roles={['STUDENT']}>
                  <ExamTakingPage />
                </ProtectedRoute>
              }
            />

            {/* ── Protected: Teacher ── */}
            <Route
              path="/teacher/dashboard"
              element={
                <ProtectedRoute roles={['TEACHER']}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />

            {/* ── Protected: Admin ── */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* ── Root: redirect to login (ProtectedRoute handles unauthenticated) ── */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* ── 404 ── */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
