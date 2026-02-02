/**
 * Label + input/select/textarea wrapper with optional error.
 * Mobile-first: full-width on small screens; use with react-hook-form when needed.
 */
import React from 'react';

export interface FormFieldProps {
  label: string;
  name?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  error,
  required,
  hint,
  children,
  className = '',
}) => (
  <div className={`w-full ${className}`}>
    <label
      htmlFor={name}
      className="block text-sm font-medium text-gray-700 mb-1"
    >
      {label}
      {required && <span className="text-error ml-0.5" aria-hidden="true">*</span>}
    </label>
    <div className="min-h-[44px]">{children}</div>
    {hint && !error && (
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    )}
    {error && (
      <p className="mt-1 text-sm text-error" role="alert">{error}</p>
    )}
  </div>
);

export default FormField;
