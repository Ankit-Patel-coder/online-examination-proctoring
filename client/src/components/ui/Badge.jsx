// client/src/components/ui/Badge.jsx
import { cn } from '../../utils/cn';

const variantClasses = {
  blue:   'badge-blue',
  green:  'badge-green',
  yellow: 'badge-yellow',
  red:    'badge-red',
  gray:   'badge-gray',
};

// Map common status strings to colours automatically
const statusColorMap = {
  DRAFT:       'gray',
  SCHEDULED:   'yellow',
  PUBLISHED:   'blue',
  COMPLETED:   'green',
  CANCELLED:   'red',
  ACTIVE:      'green',
  INACTIVE:    'red',
  PENDING:     'yellow',
  IN_PROGRESS: 'blue',
  SUBMITTED:   'yellow',
  EVALUATED:   'green',
  EXPIRED:     'red',
  UNREVIEWED:  'yellow',
  REVIEWED:    'green',
  DISMISSED:   'gray',
  ADMIN:       'red',
  TEACHER:     'blue',
  STUDENT:     'green',
};

/**
 * @param {'blue'|'green'|'yellow'|'red'|'gray'} variant  - Explicit colour
 * @param {string} status - Auto-maps common status strings to colours
 */
const Badge = ({ children, variant, status, className, dot = false }) => {
  const colour = variant || (status && statusColorMap[status]) || 'gray';

  return (
    <span className={cn('badge', variantClasses[colour], className)}>
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            colour === 'green'  && 'bg-success',
            colour === 'red'    && 'bg-danger',
            colour === 'yellow' && 'bg-warning',
            colour === 'blue'   && 'bg-primary-500',
            colour === 'gray'   && 'bg-surface-400'
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
