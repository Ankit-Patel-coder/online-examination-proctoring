// client/src/components/ui/Alert.jsx
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../utils/cn';

const variants = {
  info: {
    container: 'bg-info/10 border-info/30 text-info-dark',
    icon: Info,
    iconClass: 'text-info',
  },
  success: {
    container: 'bg-success/10 border-success/30 text-success-dark',
    icon: CheckCircle2,
    iconClass: 'text-success',
  },
  warning: {
    container: 'bg-warning/10 border-warning/30 text-warning-dark',
    icon: AlertTriangle,
    iconClass: 'text-warning',
  },
  error: {
    container: 'bg-danger/10 border-danger/30 text-danger-dark',
    icon: AlertCircle,
    iconClass: 'text-danger',
  },
};

/**
 * Alert / notification banner.
 * @param {'info'|'success'|'warning'|'error'} variant
 * @param {boolean} dismissible - Shows a close button
 */
const Alert = ({
  variant = 'info',
  title,
  children,
  dismissible = false,
  className,
  onDismiss,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const { container, icon: Icon, iconClass } = variants[variant];

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 p-4 rounded-lg border text-sm animate-fade-in',
        container,
        className
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconClass)} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div>{children}</div>
      </div>
      {dismissible && (
        <button
          onClick={handleDismiss}
          aria-label="Dismiss alert"
          className="flex-shrink-0 p-0.5 rounded hover:bg-black/10 transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default Alert;
