// client/src/components/ui/EmptyState.jsx
import { cn } from '../../utils/cn';

/**
 * Empty state placeholder shown when a list has no items.
 * 
 * @param {React.ElementType} icon  - Lucide icon component
 * @param {string} title
 * @param {string} description
 * @param {React.ReactNode} action  - Optional CTA button
 */
const EmptyState = ({ icon: Icon, title, description, action, className }) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center text-center py-16 px-6',
      className
    )}
  >
    {Icon && (
      <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-surface-400" aria-hidden="true" />
      </div>
    )}
    <h3 className="text-sm font-semibold text-surface-800 mb-1">{title}</h3>
    {description && (
      <p className="text-sm text-surface-500 max-w-xs mb-6">{description}</p>
    )}
    {action}
  </div>
);

export default EmptyState;
