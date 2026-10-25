// client/src/pages/DesignShowcase.jsx
// Demonstrates all reusable UI components from the design system.
// This page exists ONLY in Phase 1 and is removed in Phase 2.
import { useState } from 'react';
import { BookOpen, Users, LayoutDashboard, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import Modal, { ConfirmDialog } from '../components/ui/Modal';
import Spinner, { PageSpinner } from '../components/ui/Spinner';
import Skeleton, { CardSkeleton, StatCardSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import { useToast } from '../components/ui/Toast';
import AuthLayout from '../layouts/AuthLayout';

const Section = ({ title, children }) => (
  <div className="mb-10">
    <h2 className="text-lg font-semibold text-surface-800 mb-4 pb-2 border-b border-surface-200">
      {title}
    </h2>
    {children}
  </div>
);

const DesignShowcase = () => {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [page, setPage] = useState(3);

  const handleConfirm = async () => {
    setConfirmLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setConfirmLoading(false);
    setConfirmOpen(false);
    toast.success('Action completed!', { title: 'Success' });
  };

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <div className="bg-white border-b border-surface-200 sticky top-0 z-10">
        <div className="max-w-content mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-surface-900">Design System</h1>
            <p className="text-sm text-surface-500">ExamPortal — Phase 1 Component Showcase</p>
          </div>
          <Badge status="PUBLISHED" dot>Phase 1 Complete</Badge>
        </div>
      </div>

      <div className="max-w-content mx-auto px-6 py-8 space-y-0">

        {/* Buttons */}
        <Section title="Buttons">
          <div className="flex flex-wrap gap-3 items-center">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="lg">Large</Button>
            <Button variant="primary" loading>Loading</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </Section>

        {/* Badges */}
        <Section title="Badges">
          <div className="flex flex-wrap gap-2 items-center">
            {['DRAFT','SCHEDULED','PUBLISHED','COMPLETED','CANCELLED'].map(s => (
              <Badge key={s} status={s} dot>{s}</Badge>
            ))}
            {['ADMIN','TEACHER','STUDENT'].map(r => (
              <Badge key={r} status={r}>{r}</Badge>
            ))}
            {['ACTIVE','INACTIVE','PENDING'].map(s => (
              <Badge key={s} status={s} dot>{s}</Badge>
            ))}
          </div>
        </Section>

        {/* Alerts */}
        <Section title="Alerts">
          <div className="space-y-3 max-w-lg">
            <Alert variant="info" title="Information">This is an informational alert with a title.</Alert>
            <Alert variant="success" title="Success">Your exam has been published successfully.</Alert>
            <Alert variant="warning" dismissible>Your exam ends in 5 minutes. Save your answers.</Alert>
            <Alert variant="error" title="Error">Failed to save answers. Check your connection.</Alert>
          </div>
        </Section>

        {/* Cards */}
        <Section title="Cards">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <Card.Header title="Exam Statistics" description="Current period" />
              <Card.Body>
                <div className="grid grid-cols-2 gap-4">
                  {[['Total Students','248'],['Published Exams','12'],['Attempts Today','34'],['Avg Score','73%']].map(([l,v]) => (
                    <div key={l} className="p-3 bg-surface-50 rounded-lg">
                      <div className="text-xs text-surface-500 mb-1">{l}</div>
                      <div className="text-xl font-bold text-surface-900">{v}</div>
                    </div>
                  ))}
                </div>
              </Card.Body>
              <Card.Footer>
                <Button variant="secondary" size="sm">View all stats</Button>
              </Card.Footer>
            </Card>

            <Card hover>
              <Card.Header
                title="Mathematics Final Exam"
                description="Scheduled · 2 hours · 100 marks"
                action={<Badge status="SCHEDULED" dot>Scheduled</Badge>}
              />
              <Card.Body>
                <p className="text-sm text-surface-600">
                  Comprehensive final examination covering calculus, algebra, and statistics.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="primary" size="sm">View Details</Button>
                  <Button variant="secondary" size="sm">Edit</Button>
                </div>
              </Card.Body>
            </Card>
          </div>
        </Section>

        {/* Skeletons */}
        <Section title="Skeleton Loaders">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <CardSkeleton lines={3} />
        </Section>

        {/* Spinners */}
        <Section title="Spinners">
          <div className="flex gap-6 items-center">
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
            <Spinner size="xl" />
          </div>
        </Section>

        {/* Empty State */}
        <Section title="Empty States">
          <div className="card max-w-md">
            <EmptyState
              icon={BookOpen}
              title="No exams found"
              description="You haven't created any examinations yet. Start by creating your first exam."
              action={<Button variant="primary" size="sm">Create Exam</Button>}
            />
          </div>
        </Section>

        {/* Pagination */}
        <Section title="Pagination">
          <Pagination
            currentPage={page}
            totalPages={12}
            onPageChange={setPage}
          />
          <p className="text-xs text-surface-500 mt-2">Current page: {page}</p>
        </Section>

        {/* Modals */}
        <Section title="Modals">
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Open Modal
            </Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Confirm Dialog
            </Button>
            <Button
              variant="primary"
              onClick={() => toast.success('Exam published!', { title: 'Published' })}
            >
              Toast Success
            </Button>
            <Button
              variant="ghost"
              onClick={() => toast.error('Save failed. Check connection.', { title: 'Error' })}
            >
              Toast Error
            </Button>
          </div>
        </Section>

        {/* Auth Layout preview */}
        <Section title="Auth Layout Preview">
          <div className="border border-surface-200 rounded-xl overflow-hidden" style={{ transform: 'scale(0.75)', transformOrigin: 'top left', height: '300px', pointerEvents: 'none' }}>
            <AuthLayout>
              <Card>
                <Card.Body>
                  <h2 className="text-xl font-semibold text-surface-900 mb-4">Sign in to ExamPortal</h2>
                  <div className="space-y-3">
                    <div className="input-base text-surface-400">Email address</div>
                    <div className="input-base text-surface-400">Password</div>
                    <Button variant="primary" className="w-full">Sign In</Button>
                  </div>
                </Card.Body>
              </Card>
            </AuthLayout>
          </div>
        </Section>
      </div>

      {/* Modals */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Exam Configuration"
        size="md"
      >
        <p className="text-sm text-surface-600 mb-4">
          This is a modal dialog. It traps focus, closes on Escape, and locks body scroll.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => setModalOpen(false)}>Save Changes</Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        loading={confirmLoading}
        title="Delete Examination?"
        message="This action cannot be undone. All questions and student attempts will be permanently deleted."
        confirmLabel="Delete Exam"
      />
    </div>
  );
};

export default DesignShowcase;
