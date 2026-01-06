import React from 'react';

interface WorkflowBannerProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  visible: boolean;
  onDismiss?: () => void;
  icon?: string;
}

/**
 * Contextual workflow banner that guides user actions
 * Displays at the top of review screens with actionable guidance
 */
export const WorkflowBanner: React.FC<WorkflowBannerProps> = ({
  message,
  type = 'info',
  visible,
  onDismiss,
  icon = '💡',
}) => {
  if (!visible) return null;

  const typeStyles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div className={`px-4 py-3 border-l-4 ${typeStyles[type]} rounded-r-lg shadow-sm mb-4 flex items-start justify-between gap-3`}>
      <div className="flex items-start gap-2 flex-1">
        <span className="text-lg flex-shrink-0">{icon}</span>
        <p className="text-sm font-medium flex-1">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          aria-label="Dismiss banner"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};


