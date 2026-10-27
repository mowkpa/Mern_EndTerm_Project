import React from 'react';

export const Input = React.forwardRef(
  ({ label, helperText, error, id, className = '', containerClassName = '', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={`space-y-1.5 ${containerClassName}`}>
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-text-2 tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full h-10 px-3 text-sm text-ink bg-surface border rounded-control transition-colors duration-150 placeholder:text-text-2/50 focus:outline-hidden focus:border-mine focus:ring-1 focus:ring-mine disabled:bg-paper disabled:text-text-2/60 ${
            error ? 'border-danger focus:border-danger focus:ring-danger' : 'border-line'
          } ${className}`}
          {...props}
        />
        {helperText && !error && <p className="text-xs text-text-2">{helperText}</p>}
        {error && <p className="text-xs text-danger font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export const Select = React.forwardRef(
  ({ label, helperText, error, id, options = [], children, className = '', containerClassName = '', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={`space-y-1.5 ${containerClassName}`}>
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-text-2 tracking-wide">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={`w-full h-10 px-3 text-sm text-ink bg-surface border rounded-control transition-colors duration-150 focus:outline-hidden focus:border-mine focus:ring-1 focus:ring-mine disabled:bg-paper disabled:text-text-2/60 ${
            error ? 'border-danger focus:border-danger focus:ring-danger' : 'border-line'
          } ${className}`}
          {...props}
        >
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {helperText && !error && <p className="text-xs text-text-2">{helperText}</p>}
        {error && <p className="text-xs text-danger font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export const Textarea = React.forwardRef(
  ({ label, helperText, error, id, rows = 3, className = '', containerClassName = '', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={`space-y-1.5 ${containerClassName}`}>
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-text-2 tracking-wide">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={`w-full p-3 text-sm text-ink bg-surface border rounded-control transition-colors duration-150 placeholder:text-text-2/50 focus:outline-hidden focus:border-mine focus:ring-1 focus:ring-mine disabled:bg-paper disabled:text-text-2/60 ${
            error ? 'border-danger focus:border-danger focus:ring-danger' : 'border-line'
          } ${className}`}
          {...props}
        />
        {helperText && !error && <p className="text-xs text-text-2">{helperText}</p>}
        {error && <p className="text-xs text-danger font-medium">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default { Input, Select, Textarea };
