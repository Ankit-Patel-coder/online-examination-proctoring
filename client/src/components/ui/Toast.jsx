// client/src/components/ui/Toast.jsx
// Toast notification system.
// Usage: wrap your app in <ToastProvider>, then call useToast() anywhere.
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../../utils/cn';

const ToastContext = createContext(null);

const icons = {
  success: { Icon: CheckCircle2, class: 'text-success' },
  error:   { Icon: AlertCircle,  class: 'text-danger' },
  warning: { Icon: AlertTriangle,class: 'text-warning' },
  info:    { Icon: Info,         class: 'text-info' },
};

const ToastItem = ({ toast, onRemove }) => {
  const { Icon, class: iconClass } = icons[toast.type] || icons.info;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 w-80 p-4 bg-white rounded-xl shadow-modal',
        'border border-surface-200 animate-slide-in'
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconClass)} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold text-surface-900 mb-0.5">{toast.title}</p>
        )}
        <p className="text-sm text-surface-600">{toast.message}</p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss notification"
        className="flex-shrink-0 p-0.5 rounded hover:bg-surface-100 transition-colors"
      >
        <X className="w-4 h-4 text-surface-400" aria-hidden="true" />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const remove = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback(
    (message, { type = 'info', title, duration = 4000 } = {}) => {
      const id = ++counterRef.current;
      setToasts(prev => [...prev, { id, message, type, title }]);
      if (duration > 0) {
        setTimeout(() => remove(id), duration);
      }
      return id;
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ add, remove }}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 items-end"
      >
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

/**
 * Hook to trigger toast notifications from any component.
 * Returns { toast } with methods: toast.success(), toast.error(), toast.info(), toast.warning()
 */
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');

  return {
    toast: {
      success: (message, opts) => ctx.add(message, { ...opts, type: 'success' }),
      error:   (message, opts) => ctx.add(message, { ...opts, type: 'error' }),
      info:    (message, opts) => ctx.add(message, { ...opts, type: 'info' }),
      warning: (message, opts) => ctx.add(message, { ...opts, type: 'warning' }),
    },
  };
};
