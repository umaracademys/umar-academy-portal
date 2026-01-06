import React, { useState } from 'react';
import { MistakeCounts } from '../hooks/useMistakeCounts';

interface MistakeCountersProps {
  counts: MistakeCounts;
  focusMode?: boolean;
  className?: string;
}

/**
 * Separate mistake category counters display
 * Shows: 🔴 Mistakes, 🟡 Atkees, ⚪ Tajweed Errors
 */
export const MistakeCounters: React.FC<MistakeCountersProps> = ({
  counts,
  focusMode = false,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(false);

  // Hidden in Focus Mode
  if (focusMode) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 ${className}`}
      style={{ direction: 'ltr' }}
    >
      {expanded ? (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Mistake Breakdown</h3>
            <button
              onClick={() => setExpanded(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Collapse"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">🔴 Mistakes</span>
              <span className="text-sm font-semibold text-red-600">{counts.mistakes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">🟡 Atkees</span>
              <span className="text-sm font-semibold text-yellow-600">{counts.atkees}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">⚪ Tajweed Errors</span>
              <span className="text-sm font-semibold text-gray-600">{counts.tajweed}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Total</span>
                <span className="text-sm font-bold text-gray-900">{counts.total}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-2 flex items-center gap-2 hover:shadow-xl transition-shadow"
          aria-label="View mistake counts"
        >
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-red-600">{counts.mistakes}</span>
            <span className="text-xs font-semibold text-yellow-600">{counts.atkees}</span>
            <span className="text-xs font-semibold text-gray-600">{counts.tajweed}</span>
          </div>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
};

