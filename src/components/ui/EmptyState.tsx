/**
 * Shared empty state — use for "no data" or loading-finished-empty across dashboards and lists.
 */
import React from 'react';

export interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data',
  message,
  icon,
  action,
  className = '',
}) => (
  <div
    className={`flex flex-col items-center justify-center py-12 px-4 text-center text-gray-500 ${className}`}
    role="status"
    aria-label={title}
  >
    {icon && <div className="mb-3 text-gray-400">{icon}</div>}
    <h3 className="text-lg font-medium text-gray-700">{title}</h3>
    {message && <p className="mt-1 text-sm max-w-sm">{message}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
