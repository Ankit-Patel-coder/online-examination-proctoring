// client/src/layouts/AuthLayout.jsx
// Clean centered layout for login, register, and password reset pages.
import { GraduationCap } from 'lucide-react';

const AuthLayout = ({ children }) => (
  <div className="min-h-screen bg-surface-50 flex flex-col">
    {/* Header */}
    <header className="w-full px-6 py-5 border-b border-surface-200 bg-white">
      <div className="max-w-content mx-auto flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <span className="text-base font-semibold text-surface-900">ExamPortal</span>
      </div>
    </header>

    {/* Main content — centered card */}
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {children}
      </div>
    </main>

    {/* Footer */}
    <footer className="py-5 text-center text-xs text-surface-400 border-t border-surface-200 bg-white">
      © {new Date().getFullYear()} ExamPortal — Online Examination & Proctoring System
    </footer>
  </div>
);

export default AuthLayout;
