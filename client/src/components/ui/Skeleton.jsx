// client/src/components/ui/Skeleton.jsx
// Skeleton loading placeholders for common UI shapes.
import { cn } from '../../utils/cn';

/**
 * Base skeleton block.
 */
const Skeleton = ({ className }) => (
  <div className={cn('skeleton', className)} aria-hidden="true" />
);

/**
 * Skeleton for a table row with configurable column count.
 */
export const TableRowSkeleton = ({ columns = 5, rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="border-b border-surface-100">
        {Array.from({ length: columns }).map((_, j) => (
          <td key={j} className="px-4 py-3">
            <Skeleton className={cn('h-4 rounded', j === 0 ? 'w-32' : 'w-24')} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

/**
 * Skeleton for a card layout.
 */
export const CardSkeleton = ({ lines = 3 }) => (
  <div className="card p-6 space-y-3">
    <Skeleton className="h-5 w-48 rounded" />
    <Skeleton className="h-4 w-full rounded" />
    {Array.from({ length: lines - 1 }).map((_, i) => (
      <Skeleton key={i} className="h-4 w-3/4 rounded" />
    ))}
  </div>
);

/**
 * Skeleton for a stat card in a dashboard.
 */
export const StatCardSkeleton = () => (
  <div className="card p-5 space-y-3">
    <div className="flex justify-between items-start">
      <Skeleton className="h-4 w-24 rounded" />
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
    <Skeleton className="h-8 w-16 rounded" />
    <Skeleton className="h-3 w-32 rounded" />
  </div>
);

export default Skeleton;
