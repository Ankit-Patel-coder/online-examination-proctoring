// client/src/components/ui/Select.jsx
import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Accessible styled select with error state.
 * Spread register() from React Hook Form directly onto this component.
 */
const Select = forwardRef(
  ({ label, error, helperText, id, className, required, children, placeholder, ...props }, ref) => {
    const selectId = id || `select-${label?.toLowerCase().replace(/\s+/g, '-')}`;
    const errorId = `${selectId}-error`;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-surface-700">
            {label}
            {required && <span className="text-danger ml-1" aria-label="required">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={!!error}
            className={cn(
              'input-base appearance-none pr-9',
              error && 'input-error',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>{placeholder}</option>
            )}
            {children}
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none"
            aria-hidden="true"
          />
        </div>

        {error && (
          <p id={errorId} className="text-xs text-danger" role="alert">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-surface-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
