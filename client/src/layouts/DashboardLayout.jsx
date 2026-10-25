// client/src/layouts/DashboardLayout.jsx
// Main authenticated layout with sidebar + topbar.
// Sidebar collapses to a mobile drawer on small screens.
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  GraduationCap, LayoutDashboard, Users, FileText, BookOpen,
  ClipboardList, BarChart2, Shield, Settings, LogOut,
  Menu, X, ChevronRight, Bell
} from 'lucide-react';
import { cn } from '../utils/cn';

// Navigation items per role
const navConfig = {
  ADMIN: [
    { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', to: '/admin/users', icon: Users },
    { label: 'Examinations', to: '/admin/exams', icon: FileText },
    { label: 'Audit Logs', to: '/admin/audit-logs', icon: Shield },
    { label: 'Settings', to: '/admin/settings', icon: Settings },
  ],
  TEACHER: [
    { label: 'Dashboard', to: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'My Exams', to: '/teacher/exams', icon: FileText },
    { label: 'Question Bank', to: '/teacher/questions', icon: BookOpen },
    { label: 'Results', to: '/teacher/results', icon: BarChart2 },
    { label: 'Proctoring', to: '/teacher/proctoring', icon: Shield },
    { label: 'Settings', to: '/teacher/settings', icon: Settings },
  ],
  STUDENT: [
    { label: 'Dashboard', to: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Exams', to: '/student/exams', icon: ClipboardList },
    { label: 'My Results', to: '/student/results', icon: BarChart2 },
    { label: 'Settings', to: '/student/settings', icon: Settings },
  ],
};

const NavItem = ({ item, onClick }) => (
  <NavLink
    to={item.to}
    onClick={onClick}
    className={({ isActive }) => cn(isActive ? 'nav-item-active' : 'nav-item')}
  >
    <item.icon className="w-4.5 h-4.5 flex-shrink-0" aria-hidden="true" />
    <span className="flex-1">{item.label}</span>
  </NavLink>
);

const DashboardLayout = ({ user, onLogout, children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const navItems = navConfig[user?.role] || [];

  const handleLogout = async () => {
    await onLogout?.();
    navigate('/login', { replace: true });
  };

  const roleLabel = user?.role === 'ADMIN' ? 'Admin Panel'
    : user?.role === 'TEACHER' ? 'Teacher Portal'
    : 'Student Portal';

  return (
    <div className="flex min-h-screen bg-surface-50">
      {/* ── Mobile overlay ─────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-surface-900/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        id="sidebar"
        className={cn(
          'fixed top-0 left-0 h-full w-64 z-50 bg-white border-r border-surface-200',
          'flex flex-col transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-surface-200 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm font-semibold text-surface-900 leading-tight">ExamPortal</div>
              <div className="text-2xs text-surface-500 leading-tight">{roleLabel}</div>
            </div>
          </div>
          <button
            className="lg:hidden btn-ghost p-1.5 rounded-lg"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map(item => (
            <NavItem
              key={item.to}
              item={item}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-surface-200">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-primary-700">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-900 truncate">{user?.name}</p>
              <p className="text-2xs text-surface-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="nav-item w-full mt-1 text-surface-500 hover:text-danger hover:bg-danger/5"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-surface-200 flex items-center gap-4 px-4 lg:px-6 flex-shrink-0 sticky top-0 z-30">
          <button
            className="lg:hidden btn-ghost p-2 rounded-lg"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="sidebar"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Breadcrumb / page title — injected via context in Phase 3+ */}
          <div className="flex-1" />

          {/* Actions */}
          <button className="btn-ghost btn-icon" aria-label="Notifications">
            <Bell className="w-5 h-5" aria-hidden="true" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="page-container animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
