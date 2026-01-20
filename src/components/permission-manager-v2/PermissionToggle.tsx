import React, { useState, useEffect } from 'react';

interface PermissionToggleProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => Promise<void>;
  risk?: 'low' | 'medium' | 'high';
  isDefault?: boolean;
  disabled?: boolean;
}

export const PermissionToggle: React.FC<PermissionToggleProps> = React.memo(({
  label,
  description,
  value,
  onChange,
  risk,
  isDefault = false,
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticValue, setOptimisticValue] = useState(value);
  const [justChanged, setJustChanged] = useState(false);

  // Sync optimistic value with prop value when it changes externally
  useEffect(() => {
    setOptimisticValue(value);
  }, [value]);

  const handleToggle = async () => {
    if (disabled || isLoading) return;

    const newValue = !optimisticValue;
    
    // Optimistic update
    setOptimisticValue(newValue);
    setJustChanged(true);
    setIsLoading(true);
    setError(null);

    // Reset highlight after animation
    setTimeout(() => setJustChanged(false), 2000);

    try {
      await onChange(newValue);
    } catch (err) {
      // Rollback on error
      setOptimisticValue(!newValue);
      setError(err instanceof Error ? err.message : 'Failed to update permission');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`
        rounded-lg border p-4 transition-all duration-200
        ${optimisticValue 
          ? 'border-blue-200 bg-blue-50' 
          : 'border-gray-200 bg-white'
        }
        ${justChanged ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}
      `}
      onClick={handleToggle}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
            {risk === 'high' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                High Risk
              </span>
            )}
            {isDefault && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Default
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1">{description}</p>
          {error && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={optimisticValue}
            disabled={disabled || isLoading}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${optimisticValue ? 'bg-blue-600' : 'bg-gray-300'}
              ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${isLoading ? 'animate-pulse' : ''}
            `}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${optimisticValue ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

PermissionToggle.displayName = 'PermissionToggle';
