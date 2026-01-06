import React from 'react';
import { getTajweedExplanation } from '../utils/tajweedExplanations';

interface TajweedExplanationCardProps {
  mistakeType: string;
  onClose: () => void;
  position?: { x: number; y: number };
  isMobile?: boolean;
}

/**
 * Tajweed explanation card displayed on tap/click
 * Shows rule name and explanation
 */
export const TajweedExplanationCard: React.FC<TajweedExplanationCardProps> = ({
  mistakeType,
  onClose,
  position,
  isMobile = false,
}) => {
  const explanation = getTajweedExplanation(mistakeType);

  if (!explanation) {
    return null;
  }

  if (isMobile) {
    // Mobile: Inline card at bottom
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-blue-500 shadow-lg z-50 p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-base font-bold text-blue-900">{explanation.ruleName}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-700 mb-2">{explanation.explanation}</p>
        {explanation.example && (
          <p className="text-xs text-gray-600 italic border-l-2 border-blue-300 pl-2">
            Example: {explanation.example}
          </p>
        )}
      </div>
    );
  }

  // Desktop: Popover near click position
  const style = position
    ? {
        position: 'fixed' as const,
        left: `${position.x}px`,
        top: `${position.y - 10}px`,
        transform: 'translateY(-100%)',
      }
    : {};

  return (
    <div
      className="bg-white border-2 border-blue-500 rounded-lg shadow-xl p-4 z-50 min-w-[280px] max-w-[320px]"
      style={style}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-base font-bold text-blue-900">{explanation.ruleName}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 ml-2"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p className="text-sm text-gray-700 mb-2">{explanation.explanation}</p>
      {explanation.example && (
        <p className="text-xs text-gray-600 italic border-l-2 border-blue-300 pl-2">
          Example: {explanation.example}
        </p>
      )}
    </div>
  );
};


