// client/src/pages/RegisterPage.jsx
// Student self-registration page — name, email, password, confirmPassword.
// On success the user is automatically logged in and redirected to the student dashboard.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, UserPlus } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import AuthLayout from '../layouts/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';

// ─── Client-side schema ───────────────────────────────────────────────────────
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/[0-9]/, 'Must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Must contain a special character');

const registerSchema = z
  .object({
    name: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be 100 characters or less'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please enter a valid email address'),
    password: passwordSchema,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }).min(1),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const password = watch('password', '');

  // Password strength helpers
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const strength = Object.values(checks).filter(Boolean).length;

  const onSubmit = async (data) => {
    setApiError('');
    try {
      // Send only the fields the server expects
      await registerUser({ name: data.name, email: data.email, password: data.password });
      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        'Registration failed. Please try again.';
      setApiError(msg);
    }
  };

  return (
    <AuthLayout>
      <div className="card p-8 shadow-lg">
        {/* Heading */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-surface-900 mb-1">Create your account</h1>
          <p className="text-sm text-surface-500">
            Join ExamPortal as a student — free and instant
          </p>
        </div>

        {/* Server error */}
        {apiError && (
          <Alert variant="error" className="mb-6" dismissible onDismiss={() => setApiError('')}>
            {apiError}
          </Alert>
        )}

        <form id="register-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <Input
            id="register-name"
            label="Full name"
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            required
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            id="register-email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            error={errors.email?.message}
            {...register('email')}
          />

          {/* Password with toggle + strength meter */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="register-password" className="text-sm font-medium text-surface-700">
              Password <span className="text-danger ml-1" aria-label="required">*</span>
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'register-password-error' : 'register-password-strength'}
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

            {/* Strength bar */}
            {password.length > 0 && (
              <div id="register-password-strength" aria-label={`Password strength: ${strength}/5`}>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= strength
                          ? strength <= 2 ? 'bg-danger' : strength <= 3 ? 'bg-warning' : 'bg-success'
                          : 'bg-surface-200'
                      }`}
                    />
                  ))}
                </div>
                <ul className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
                  {[
                    [checks.length, '8+ characters'],
                    [checks.upper, 'Uppercase letter'],
                    [checks.lower, 'Lowercase letter'],
                    [checks.number, 'Number'],
                    [checks.special, 'Special character'],
                  ].map(([ok, label]) => (
                    <li key={label} className={`text-xs ${ok ? 'text-success' : 'text-surface-400'}`}>
                      {ok ? '✓' : '○'} {label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {errors.password && (
              <p id="register-password-error" className="text-xs text-danger" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="register-confirm-password" className="text-sm font-medium text-surface-700">
              Confirm password <span className="text-danger ml-1" aria-label="required">*</span>
            </label>
            <div className="relative">
              <input
                id="register-confirm-password"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? 'register-confirm-error' : undefined}
                className={`input-base w-full pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p id="register-confirm-error" className="text-xs text-danger" role="alert">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button
            id="register-submit"
            type="submit"
            variant="primary"
            loading={isSubmitting}
            className="w-full"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            Create account
          </Button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-surface-500">
          Already have an account?{' '}
          <Link
            to="/login"
            id="register-login-link"
            className="text-primary-600 font-medium hover:text-primary-700 hover:underline transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
