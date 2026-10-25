// client/src/components/ui/Input.jsx
import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

/**
 * Accessible input with error state, label, and helper text.
 * Designed to be used with React Hook Form's `register` spread.
 */
const Input = forwardRef(
  (
    {
      label,
      error,
      helperText,
      id,
      className,
      required,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-surface-700"
          >
            {label}
            {required && (
              <span className="text-danger ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-describedby={
            [error ? errorId : null, helperText ? helperId : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          aria-invalid={!!error}
          className={cn(
            'input-base',
            error && 'input-error',
            className
          )}
          {...props}
        />

        {error && (
          <p id={errorId} className="text-xs text-danger" role="alert">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className="text-xs text-surface-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
