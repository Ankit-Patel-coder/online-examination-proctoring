// client/src/test/components.test.jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Alert from '../components/ui/Alert';
import ErrorBoundary from '../components/ui/ErrorBoundary';

describe('UI Component Unit Tests', () => {
  describe('Button Component', () => {
    it('renders button label and handles clicks', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Submit Exam</Button>);

      const btn = screen.getByRole('button', { name: /Submit Exam/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('disables button and shows spinner when loading', () => {
      const handleClick = vi.fn();
      render(<Button loading onClick={handleClick}>Saving...</Button>);

      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('aria-busy', 'true');
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('applies primary and danger variant classes', () => {
      const { rerender } = render(<Button variant="primary">Primary</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn-primary');

      rerender(<Button variant="danger">Danger</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn-danger');
    });
  });

  describe('Badge Component', () => {
    it('renders text and maps status correctly', () => {
      render(<Badge status="PUBLISHED">Published</Badge>);
      const badge = screen.getByText('Published');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('badge-blue');
    });

    it('renders dot indicator when dot prop is passed', () => {
      const { container } = render(<Badge status="ACTIVE" dot>Active</Badge>);
      const dot = container.querySelector('.rounded-full');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('Alert Component', () => {
    it('renders message and can be dismissed', () => {
      const handleDismiss = vi.fn();
      render(
        <Alert variant="warning" title="Warning Note" dismissible onDismiss={handleDismiss}>
          Please do not switch tabs.
        </Alert>
      );

      expect(screen.getByText('Warning Note')).toBeInTheDocument();
      expect(screen.getByText('Please do not switch tabs.')).toBeInTheDocument();

      const dismissBtn = screen.getByRole('button', { name: /dismiss alert/i });
      fireEvent.click(dismissBtn);

      expect(handleDismiss).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Warning Note')).not.toBeInTheDocument();
    });
  });

  describe('ErrorBoundary Component', () => {
    // Component that deliberately throws
    const ProblemChild = ({ shouldThrow }) => {
      if (shouldThrow) {
        throw new Error('Simulated testing crash');
      }
      return <div>Healthy Component Content</div>;
    };

    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ProblemChild shouldThrow={false} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Healthy Component Content')).toBeInTheDocument();
    });

    it('catches render errors and displays fallback UI', () => {
      // Suppress console.error during expected test error
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ProblemChild shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/Reload Page/i)).toBeInTheDocument();
      expect(screen.getByText(/Go to Home/i)).toBeInTheDocument();

      spy.mockRestore();
    });
  });
});
