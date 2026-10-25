// client/src/pages/LoginPage.jsx
// Login page — email + password form with React Hook Form + Zod validation.
// On success, redirects to the page the user was trying to reach (or role dashboard).
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LogIn } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import AuthLayout from '../layouts/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';

// ─── Client-side schema (mirrors server schema, no bcrypt cost) ───────────────
const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

// ─── Role → dashboard path map ────────────────────────────────────────────────
const roleDashboard = {
  ADMIN: '/admin/dashboard',
  TEACHER: '/teacher/dashboard',
  STUDENT: '/student/dashboard',
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data) => {
    setApiError('');
    try {
      const user = await login(data);
      // Go back to the page the user tried to visit, or their role dashboard
      const from = location.state?.from?.pathname || roleDashboard[user.role] || '/';
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        'Login failed. Please check your credentials and try again.';
      setApiError(msg);
    }
  };

  return (
    <AuthLayout>
      <div className="card p-8 shadow-lg">
        {/* Heading */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-surface-900 mb-1">Welcome back</h1>
          <p className="text-sm text-surface-500">Sign in to your ExamPortal account</p>
        </div>

        {/* Server-level error */}
        {apiError && (
          <Alert variant="error" className="mb-6" dismissible onDismiss={() => setApiError('')}>
            {apiError}
          </Alert>
        )}

        {/* Form */}
        <form id="login-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <Input
            id="login-email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            error={errors.email?.message}
            {...register('email')}
          />

          {/* Password with toggle */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="login-password"
              className="text-sm font-medium text-surface-700"
            >
              Password <span className="text-danger ml-1" aria-label="required">*</span>
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'login-password-error' : undefined}
                className={`input-base w-full pr-10 ${errors.password ? 'input-error' : ''}`}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p id="login-password-error" className="text-xs text-danger" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            id="login-submit"
            type="submit"
            variant="primary"
            loading={isSubmitting}
            className="w-full"
          >
            <LogIn className="w-4 h-4" aria-hidden="true" />
            Sign in
          </Button>
        </form>

        {/* Footer links */}
        <p className="mt-6 text-center text-sm text-surface-500">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            id="login-register-link"
            className="text-primary-600 font-medium hover:text-primary-700 hover:underline transition-colors"
          >
            Create one
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
