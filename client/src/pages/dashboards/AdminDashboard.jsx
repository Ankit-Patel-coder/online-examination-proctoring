// client/src/pages/dashboards/AdminDashboard.jsx
// Full Phase 3 Admin Dashboard:
//   - Stats cards (total users by role/status)
//   - Paginated + searchable + filterable user table
//   - Create Teacher modal
//   - Activate / Deactivate user toggle with confirm dialog
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, LogOut, Users, UserCheck, UserX, ShieldCheck,
  BookOpen, Search, PlusCircle, RefreshCw, ChevronDown,
  ShieldAlert, Activity, FileText, CheckCircle2
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useAuth } from '../../context/AuthContext';
import adminApi from '../../api/adminApi';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import Modal, { ConfirmDialog } from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import Pagination from '../../components/ui/Pagination';
import Skeleton from '../../components/ui/Skeleton';
import { TableRowSkeleton } from '../../components/ui/Skeleton';

// ─── Create Teacher Schema ────────────────────────────────────────────────────
const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'Needs uppercase')
  .regex(/[a-z]/, 'Needs lowercase')
  .regex(/[0-9]/, 'Needs a number')
  .regex(/[^A-Za-z0-9]/, 'Needs a special character');

const createTeacherSchema = z.object({
  name: z.string().trim().min(2, 'Min 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: passwordSchema,
});

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, loading }) => (
  <Card className="p-6">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm text-surface-500 font-medium">{label}</p>
        {loading
          ? <Skeleton className="h-7 w-16 mt-1" />
          : <p className="text-2xl font-bold text-surface-900">{value ?? '—'}</p>
        }
      </div>
    </div>
  </Card>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');

  // User list
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Create Teacher modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'audit'

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [auditPage, setAuditPage] = useState(1);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');

  // Status toggle confirm
  const [confirmTarget, setConfirmTarget] = useState(null); // { user, newStatus }
  const [statusLoading, setStatusLoading] = useState(false);

  // ── Load stats ──
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      setStatsError('');
      const res = await adminApi.getDashboard();
      setStats(res.data.data);
    } catch (err) {
      setStatsError(err?.response?.data?.message || 'Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Load users ──
  const loadUsers = useCallback(async () => {
    try {
      setListLoading(true);
      setListError('');
      const res = await adminApi.getUsers({
        page,
        limit: 10,
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(search.trim() && { search: search.trim() }),
      });
      setUsers(res.data.data.users);
      setPagination(res.data.data.pagination);
    } catch (err) {
      setListError(err?.response?.data?.message || 'Failed to load users');
    } finally {
      setListLoading(false);
    }
  }, [page, roleFilter, statusFilter, search]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ── Load audit logs ──
  const loadAuditLogs = useCallback(async () => {
    try {
      setAuditLoading(true);
      setAuditError('');
      const res = await adminApi.getAuditLogs({
        page: auditPage,
        limit: 10,
        ...(auditActionFilter && { action: auditActionFilter }),
      });
      setAuditLogs(res.data.data.logs || []);
      setAuditPagination(res.data.data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setAuditError(err?.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setAuditLoading(false);
    }
  }, [auditPage, auditActionFilter]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab, loadAuditLogs]);

  useEffect(() => {
    setAuditPage(1);
  }, [auditActionFilter]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter]);

  // ── Logout ──
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // ── Create teacher form ──
  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(createTeacherSchema) });

  const handleCreateTeacher = async (data) => {
    setCreateError('');
    try {
      await adminApi.createTeacher(data);
      setShowCreateModal(false);
      resetForm();
      loadUsers();
      loadStats();
    } catch (err) {
      setCreateError(err?.response?.data?.message || 'Failed to create teacher');
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    resetForm();
    setCreateError('');
  };

  // ── Status toggle ──
  const handleStatusClick = (targetUser) => {
    const newStatus = targetUser.accountStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setConfirmTarget({ user: targetUser, newStatus });
  };

  const handleConfirmStatus = async () => {
    if (!confirmTarget) return;
    setStatusLoading(true);
    try {
      await adminApi.updateUserStatus(confirmTarget.user._id, confirmTarget.newStatus);
      setConfirmTarget(null);
      loadUsers();
      loadStats();
    } catch (err) {
      // Error shown in console; toast can be added later
      console.error('Status update failed:', err?.response?.data?.message);
      setConfirmTarget(null);
    } finally {
      setStatusLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-surface-50">

      {/* ── Top nav ── */}
      <header className="bg-white border-b border-surface-200 sticky top-0 z-10">
        <div className="max-w-content mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <span className="text-base font-semibold text-surface-900">ExamPortal</span>
              <span className="ml-2 text-xs text-surface-400">Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-surface-800">{user?.name}</p>
              <p className="text-xs text-surface-400">{user?.email}</p>
            </div>
            <Badge status="ADMIN" dot>Admin</Badge>
            <Button
              id="admin-logout-btn"
              variant="ghost"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="max-w-content mx-auto px-6 py-8 space-y-8">

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Admin Dashboard</h1>
          <p className="text-sm text-surface-500 mt-1">Platform overview and user management</p>
        </div>

        {/* ── Stats grid ── */}
        {statsError && (
          <Alert variant="error" dismissible onDismiss={() => setStatsError('')}>
            {statsError}
          </Alert>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Users"
            value={stats?.users.total}
            color="bg-primary-600"
            loading={statsLoading}
          />
          <StatCard
            icon={ShieldCheck}
            label="Admins"
            value={stats?.users.byRole.ADMIN}
            color="bg-danger"
            loading={statsLoading}
          />
          <StatCard
            icon={BookOpen}
            label="Teachers"
            value={stats?.users.byRole.TEACHER}
            color="bg-info"
            loading={statsLoading}
          />
          <StatCard
            icon={GraduationCap}
            label="Students"
            value={stats?.users.byRole.STUDENT}
            color="bg-success"
            loading={statsLoading}
          />
          <StatCard
            icon={UserCheck}
            label="Active Accounts"
            value={stats?.users.byStatus.ACTIVE}
            color="bg-success"
            loading={statsLoading}
          />
          <StatCard
            icon={UserX}
            label="Inactive Accounts"
            value={stats?.users.byStatus.INACTIVE}
            color="bg-surface-400"
            loading={statsLoading}
          />
          <StatCard
            icon={Users}
            label="Pending Approval"
            value={stats?.users.byStatus.PENDING}
            color="bg-warning"
            loading={statsLoading}
          />
          <StatCard
            icon={BookOpen}
            label="Total Exams"
            value={stats?.exams.total}
            color="bg-primary-400"
            loading={statsLoading}
          />
        </div>

        {/* ── Tab Switcher ── */}
        <div className="flex items-center gap-3 border-b border-surface-200">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'users'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
          >
            <Users className="w-4 h-4" />
            User Management
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            Security Audit Trail
          </button>
        </div>

        {/* ── Tab 1: User Management card ── */}
        {activeTab === 'users' && (
        <Card>
          <Card.Header
            title="User Management"
            description="View, filter, and manage all platform accounts"
            action={
              <Button
                id="admin-create-teacher-btn"
                variant="primary"
                size="sm"
                onClick={() => setShowCreateModal(true)}
              >
                <PlusCircle className="w-4 h-4" aria-hidden="true" />
                Add Teacher
              </Button>
            }
          />

          {/* Filters bar */}
          <div className="px-6 pt-4 pb-3 flex flex-wrap gap-3 border-b border-surface-100">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400"
                aria-hidden="true"
              />
              <input
                id="admin-user-search"
                type="search"
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-base pl-9 w-full"
                aria-label="Search users"
              />
            </div>

            {/* Role filter */}
            <div className="relative">
              <select
                id="admin-role-filter"
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="input-base pr-8 appearance-none cursor-pointer"
                aria-label="Filter by role"
              >
                <option value="">All roles</option>
                <option value="ADMIN">Admin</option>
                <option value="TEACHER">Teacher</option>
                <option value="STUDENT">Student</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Status filter */}
            <div className="relative">
              <select
                id="admin-status-filter"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="input-base pr-8 appearance-none cursor-pointer"
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="PENDING">Pending</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Refresh */}
            <Button
              id="admin-refresh-btn"
              variant="ghost"
              size="sm"
              onClick={loadUsers}
              aria-label="Refresh user list"
            >
              <RefreshCw className={`w-4 h-4 ${listLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            </Button>
          </div>

          {/* Error */}
          {listError && (
            <div className="px-6 pt-4">
              <Alert variant="error" dismissible onDismiss={() => setListError('')}>
                {listError}
              </Alert>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Users table">
              <thead>
                <tr className="bg-surface-50 text-left text-xs font-semibold text-surface-500 uppercase tracking-wide">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Joined</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {listLoading
                  ? <TableRowSkeleton columns={6} rows={5} />
                  : users.length === 0
                  ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-surface-400 text-sm">
                          No users found matching your filters.
                        </td>
                      </tr>
                    )
                  : users.map(u => (
                      <tr
                        key={u._id}
                        className="hover:bg-surface-50 transition-colors"
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-primary-700">
                                {u.name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-surface-900">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-sm text-surface-600">{u.email}</td>
                        <td className="px-6 py-3">
                          <Badge status={u.role} dot>{u.role}</Badge>
                        </td>
                        <td className="px-6 py-3">
                          <Badge status={u.accountStatus} dot>{u.accountStatus}</Badge>
                        </td>
                        <td className="px-6 py-3 text-sm text-surface-500">
                          {new Date(u.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {/* Can't deactivate yourself */}
                          {u._id !== user?._id ? (
                            <Button
                              id={`admin-toggle-status-${u._id}`}
                              variant={u.accountStatus === 'ACTIVE' ? 'danger' : 'secondary'}
                              size="sm"
                              onClick={() => handleStatusClick(u)}
                            >
                              {u.accountStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </Button>
                          ) : (
                            <span className="text-xs text-surface-400 italic">You</span>
                          )}
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!listLoading && pagination.totalPages > 1 && (
            <Card.Footer>
              <div className="flex items-center justify-between text-sm text-surface-500">
                <span>
                  Showing {((page - 1) * 10) + 1}–{Math.min(page * 10, pagination.total)} of {pagination.total} users
                </span>
                <Pagination
                  currentPage={page}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                />
              </div>
            </Card.Footer>
          )}
        </Card>
        )}

        {/* ── Tab 2: Security Audit Trail card ── */}
        {activeTab === 'audit' && (
          <Card>
            <Card.Header
              title="Security & System Audit Trail"
              description="Immutable tamper-evident log of all privileged and examination actions"
              action={
                <div className="flex items-center gap-2">
                  <select
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value)}
                    className="input-base text-xs py-1.5 px-3 rounded-lg border-surface-300"
                  >
                    <option value="">All Actions</option>
                    <option value="USER_REGISTERED">USER_REGISTERED</option>
                    <option value="USER_ACTIVATED">USER_ACTIVATED</option>
                    <option value="USER_DEACTIVATED">USER_DEACTIVATED</option>
                    <option value="EXAM_CREATED">EXAM_CREATED</option>
                    <option value="EXAM_PUBLISHED">EXAM_PUBLISHED</option>
                    <option value="EXAM_ATTEMPT_STARTED">EXAM_ATTEMPT_STARTED</option>
                    <option value="EXAM_ATTEMPT_SUBMITTED">EXAM_ATTEMPT_SUBMITTED</option>
                    <option value="EXAM_EVALUATED">EXAM_EVALUATED</option>
                    <option value="RESULTS_RELEASED">RESULTS_RELEASED</option>
                  </select>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={loadAuditLogs}
                    loading={auditLoading}
                    className="text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Refresh
                  </Button>
                </div>
              }
            />

            {auditError && (
              <div className="p-4 mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                {auditError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-50 border-b border-surface-200 text-xs text-surface-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Action</th>
                    <th className="px-6 py-3.5">Actor</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Target</th>
                    <th className="px-6 py-3.5">Details</th>
                    <th className="px-6 py-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {auditLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRowSkeleton key={i} cols={6} />
                    ))
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-surface-500 text-sm">
                        No audit records match the current filter.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map(log => {
                      const actionBadgeColor =
                        log.action.includes('ACTIVATED') || log.action.includes('PUBLISHED') || log.action.includes('RELEASED')
                          ? 'green'
                          : log.action.includes('DEACTIVATED') || log.action.includes('CANCELLED')
                          ? 'red'
                          : log.action.includes('SUBMITTED') || log.action.includes('EVALUATED')
                          ? 'blue'
                          : 'yellow';

                      return (
                        <tr key={log._id} className="hover:bg-surface-50/50 transition-colors">
                          <td className="px-6 py-3.5 font-mono text-xs font-bold">
                            <Badge variant={actionBadgeColor}>{log.action}</Badge>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="font-semibold text-surface-900 text-xs">
                              {log.actorId?.name || 'System / User'}
                            </div>
                            <div className="text-[11px] text-surface-400 font-mono">
                              {log.actorId?.email || log.ipAddress || '—'}
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-xs font-semibold text-surface-600">
                            {log.actorRole}
                          </td>
                          <td className="px-6 py-3.5 text-xs text-surface-700">
                            <span className="font-medium">{log.targetType || '—'}</span>
                            {log.targetId && (
                              <span className="text-[10px] text-surface-400 block font-mono">
                                {log.targetId.slice(-6)}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-xs text-surface-600 max-w-xs truncate">
                            {log.safeMetadata ? JSON.stringify(log.safeMetadata) : '—'}
                          </td>
                          <td className="px-6 py-3.5 text-xs text-surface-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString('en-IN', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
                            })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!auditLoading && auditPagination.totalPages > 1 && (
              <Card.Footer>
                <div className="flex items-center justify-between text-sm text-surface-500">
                  <span>
                    Showing {((auditPage - 1) * 10) + 1}–
                    {Math.min(auditPage * 10, auditPagination.total)} of {auditPagination.total}
                  </span>
                  <Pagination
                    currentPage={auditPage}
                    totalPages={auditPagination.totalPages}
                    onPageChange={setAuditPage}
                  />
                </div>
              </Card.Footer>
            )}
          </Card>
        )}
      </main>

      {/* ── Create Teacher Modal ── */}
      <Modal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        title="Add Teacher Account"
        size="sm"
      >
        {createError && (
          <Alert variant="error" className="mb-4" dismissible onDismiss={() => setCreateError('')}>
            {createError}
          </Alert>
        )}
        <form
          id="admin-create-teacher-form"
          onSubmit={handleSubmit(handleCreateTeacher)}
          noValidate
          className="space-y-4"
        >
          <Input
            id="create-teacher-name"
            label="Full name"
            placeholder="Jane Smith"
            required
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            id="create-teacher-email"
            label="Email address"
            type="email"
            placeholder="teacher@school.edu"
            required
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            id="create-teacher-password"
            label="Temporary password"
            type="password"
            placeholder="••••••••"
            required
            helperText="Teacher will be prompted to change on first login (Phase 4+)"
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              id="create-teacher-cancel"
              type="button"
              variant="secondary"
              onClick={handleCloseModal}
            >
              Cancel
            </Button>
            <Button
              id="create-teacher-submit"
              type="submit"
              variant="primary"
              loading={isSubmitting}
            >
              Create Teacher
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Status Confirm Dialog ── */}
      <ConfirmDialog
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirmStatus}
        loading={statusLoading}
        title={confirmTarget?.newStatus === 'INACTIVE' ? 'Deactivate Account' : 'Activate Account'}
        message={
          confirmTarget?.newStatus === 'INACTIVE'
            ? `Are you sure you want to deactivate ${confirmTarget?.user.name}'s account? They will not be able to log in.`
            : `Activate ${confirmTarget?.user.name}'s account? They will regain full access.`
        }
        confirmLabel={confirmTarget?.newStatus === 'INACTIVE' ? 'Deactivate' : 'Activate'}
        variant={confirmTarget?.newStatus === 'INACTIVE' ? 'danger' : 'primary'}
      />
    </div>
  );
}
