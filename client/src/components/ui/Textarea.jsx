// client/src/components/ui/Textarea.jsx
import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Textarea = forwardRef(
  ({ label, error, helperText, id, className, required, rows = 4, ...props }, ref) => {
    const textareaId = id || `textarea-${label?.toLowerCase().replace(/\s+/g, '-')}`;
    const errorId = `${textareaId}-error`;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-surface-700">
            {label}
            {required && <span className="text-danger ml-1" aria-label="required">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error}
          className={cn(
            'input-base resize-y min-h-[80px]',
            error && 'input-error',
            className
          )}
          {...props}
        />

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

Textarea.displayName = 'Textarea';
export default Textarea;
