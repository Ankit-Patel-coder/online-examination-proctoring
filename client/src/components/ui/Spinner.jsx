// client/src/components/ui/Spinner.jsx
import { cn } from '../../utils/cn';

/**
 * Accessible loading spinner.
 * @param {'sm'|'md'|'lg'|'xl'} size
 */
const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
  xl: 'w-12 h-12 border-4',
};

const Spinner = ({ size = 'md', className, label = 'Loading...' }) => (
  <div role="status" aria-label={label} className={cn('flex items-center justify-center', className)}>
    <div
      className={cn(
        'rounded-full border-surface-200 border-t-primary-500 animate-spin',
        sizeMap[size]
      )}
      aria-hidden="true"
    />
    <span className="sr-only">{label}</span>
  </div>
);

/**
 * Full-page loading state.
 */
export const PageSpinner = ({ label = 'Loading page...' }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4">
    <Spinner size="xl" label={label} />
    <p className="text-sm text-surface-500 animate-pulse">{label}</p>
  </div>
);

export default Spinner;
