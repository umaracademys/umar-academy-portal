import React, { useState } from 'react';
import { Assignment } from '../../types/assignment';

interface AssignmentTimelineProps {
  assignment: Assignment;
  colorCodes?: {
    sabq: string;
    sabqi: string;
    manzil: string;
  };
}

/**
 * Timeline component showing multiple merged tickets chronologically
 * Each entry shows type, teacher name, mistakes, and audio notes
 */
export const AssignmentTimeline: React.FC<AssignmentTimelineProps> = ({
  assignment,
  colorCodes = {
    sabq: 'purple',
    sabqi: 'blue',
    manzil: 'green',
  },
}) => {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const toggleEntry = (key: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getColorClasses = (type: 'sabq' | 'sabqi' | 'manzil') => {
    const colors = {
      sabq: 'bg-purple-100 text-purple-800 border-purple-300',
      sabqi: 'bg-blue-100 text-blue-800 border-blue-300',
      manzil: 'bg-green-100 text-green-800 border-green-300',
    };
    return colors[type];
  };

  const classwork = assignment.classwork || { sabq: [], sabqi: [], manzil: [] };
  const allEntries: Array<{
    type: 'sabq' | 'sabqi' | 'manzil';
    data: any;
    index: number;
    key: string;
    createdAt: Date | string;
  }> = [];

  // Collect all classwork entries
  classwork.sabq?.forEach((entry: any, idx: number) => {
    allEntries.push({
      type: 'sabq',
      data: entry,
      index: idx,
      key: `sabq-${idx}`,
      createdAt: entry.createdAt || assignment.createdAt,
    });
  });

  classwork.sabqi?.forEach((entry: any, idx: number) => {
    allEntries.push({
      type: 'sabqi',
      data: entry,
      index: idx,
      key: `sabqi-${idx}`,
      createdAt: entry.createdAt || assignment.createdAt,
    });
  });

  classwork.manzil?.forEach((entry: any, idx: number) => {
    allEntries.push({
      type: 'manzil',
      data: entry,
      index: idx,
      key: `manzil-${idx}`,
      createdAt: entry.createdAt || assignment.createdAt,
    });
  });

  // Sort by creation date
  allEntries.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA; // Most recent first
  });

  // Get mistakes for a specific entry
  const getMistakesForEntry = (type: 'sabq' | 'sabqi' | 'manzil', index: number) => {
    if (!assignment.mushafMistakes) return [];
    return assignment.mushafMistakes.filter((m: any) => 
      m.workflowStep === type
    );
  };

  // Check if entry is from today
  const isToday = (date: Date | string) => {
    const entryDate = new Date(date);
    const today = new Date();
    return entryDate.toDateString() === today.toDateString();
  };

  if (allEntries.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">No classwork entries yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allEntries.map((entry) => {
        const isExpanded = expandedEntries.has(entry.key);
        const mistakes = getMistakesForEntry(entry.type, entry.index);
        const entryIsToday = isToday(entry.createdAt);

        return (
          <div
            key={entry.key}
            className={`border rounded-xl overflow-hidden transition-all ${
              entryIsToday 
                ? 'border-green-400 bg-green-50/50 shadow-sm' 
                : 'border-gray-200 bg-white'
            }`}
          >
            <button
              onClick={() => toggleEntry(entry.key)}
              className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getColorClasses(entry.type)}`}>
                    {entry.type.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary truncate">
                      {entry.data.assignmentRange || entry.data.details || `${entry.type} recitation`}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                      {entry.data.markedByName && (
                        <span>👨‍🏫 {entry.data.markedByName}</span>
                      )}
                      <span>📅 {new Date(entry.createdAt).toLocaleDateString()}</span>
                      {mistakes.length > 0 && (
                        <span className="text-red-600 font-semibold">
                          {mistakes.length} mistake{mistakes.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {entryIsToday && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-green-500 text-white rounded-full">
                      NEW
                    </span>
                  )}
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-200 pt-4 space-y-3">
                {entry.data.details && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Details:</p>
                    <p className="text-sm text-primary">{entry.data.details}</p>
                  </div>
                )}

                {mistakes.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">
                      Mistakes ({mistakes.length}):
                    </p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {mistakes.map((mistake: any, idx: number) => (
                        <div
                          key={mistake.id || idx}
                          className="p-2 bg-gray-50 rounded-lg border border-gray-200 text-xs"
                        >
                          <span className="font-semibold text-primary">{mistake.type}</span>
                          {' '}
                          <span className="text-gray-600">
                            - Page {mistake.page}, Surah {mistake.surah}:{mistake.ayah}
                          </span>
                          {mistake.note && (
                            <p className="text-gray-600 italic mt-1">"{mistake.note}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {entry.data.audioUrl && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">Audio Note:</p>
                    <audio controls src={entry.data.audioUrl} className="w-full max-w-md">
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};


