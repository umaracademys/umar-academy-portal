import React from 'react';
import { MushafMistake } from '@umar-academy/mushaf';

interface MistakeBadgeHighlightProps {
  mistake: MushafMistake;
  isNew?: boolean;
  showTimestamp?: boolean;
  onRemove?: (mistakeId: string) => void;
}

/**
 * Badge component to highlight mistakes, especially new ones
 * Shows visual distinction for newly added mistakes
 */
export const MistakeBadgeHighlight: React.FC<MistakeBadgeHighlightProps> = ({
  mistake,
  isNew = false,
  showTimestamp = false,
  onRemove,
}) => {
  const getMistakeTypeColor = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower === 'atkee') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (['madd', 'ikhfa', 'holding', 'tech', 'heavy_letter', 'no_rounding_lips', 'heavy_h', 'light_l'].includes(typeLower)) {
      return 'bg-gray-100 text-gray-800 border-gray-300';
    }
    return 'bg-red-100 text-red-800 border-red-300';
  };

  return (
    <div className={`group flex items-start justify-between gap-2 p-3 rounded-xl border transition-all ${
      isNew 
        ? 'bg-green-50 border-green-300 shadow-sm animate-pulse' 
        : 'bg-gray-50 border-gray-200 hover:border-primary/50'
    }`}>
      <div className="flex-1 min-w-0">
        {isNew && (
          <span className="inline-block px-2 py-0.5 mb-1.5 text-xs font-bold bg-green-500 text-white rounded-full">
            NEW
          </span>
        )}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${getMistakeTypeColor(mistake.type)}`}>
            {mistake.type}
          </span>
          <span className="text-xs text-primary/70 font-semibold">
            Page {mistake.page}
          </span>
          {mistake.surah && mistake.ayah && (
            <span className="text-xs text-primary/60">
              Surah {mistake.surah}:{mistake.ayah}
            </span>
          )}
        </div>
        {mistake.note && (
          <p className="text-xs text-primary/80 mt-1 italic">"{mistake.note}"</p>
        )}
        {showTimestamp && mistake.timestamp && (
          <p className="text-xs text-gray-500 mt-1">
            {new Date(mistake.timestamp).toLocaleTimeString()}
          </p>
        )}
      </div>
      {onRemove && (
        <button
          onClick={() => onRemove(mistake.id!)}
          className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0 font-bold"
          title="Remove mistake"
        >
          ✕
        </button>
      )}
    </div>
  );
};

