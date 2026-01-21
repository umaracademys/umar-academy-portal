import React from 'react';
import { ClassworkPhase } from '../types/assignment';

interface ClassworkEntryCardProps {
  phase: ClassworkPhase;
  type: 'sabq' | 'sabqi' | 'manzil';
  index?: number;
  showDate?: boolean;
  showRemove?: boolean;
  onRemove?: () => void;
  className?: string;
}

const ClassworkEntryCard: React.FC<ClassworkEntryCardProps> = ({
  phase,
  type,
  index,
  showDate = true,
  showRemove = false,
  onRemove,
  className = ''
}) => {
  // Get color scheme based on type
  const getTypeColors = () => {
    switch (type) {
      case 'sabq':
        return {
          border: 'border-purple-400',
          bg: 'bg-purple-50',
          text: 'text-purple-700'
        };
      case 'sabqi':
        return {
          border: 'border-blue-400',
          bg: 'bg-blue-50',
          text: 'text-blue-700'
        };
      case 'manzil':
        return {
          border: 'border-green-400',
          bg: 'bg-green-50',
          text: 'text-green-700'
        };
      default:
        return {
          border: 'border-gray-400',
          bg: 'bg-gray-50',
          text: 'text-gray-700'
        };
    }
  };

  const colors = getTypeColors();

  // Build ayah range string
  const getAyahRange = () => {
    if (phase.fromAyah && phase.toAyah) {
      return `${phase.fromAyah}-${phase.toAyah}`;
    }
    return null;
  };

  // Build mistakes summary
  const getMistakesSummary = () => {
    const parts: string[] = [];
    
    if (phase.mistakeCount !== undefined && phase.mistakeCount !== null) {
      parts.push(`Count: ${phase.mistakeCount === 'weak' ? 'Weak' : phase.mistakeCount}`);
    }
    
    if (phase.atkees !== undefined && phase.atkees !== null) {
      parts.push(`Atkees: ${phase.atkees}`);
    }
    
    if (phase.mistakes && phase.mistakes.length > 0) {
      parts.push(`Total Mistakes: ${phase.mistakes.length}`);
    }
    
    return parts.length > 0 ? parts.join(' | ') : null;
  };

  // Format tajweed issues
  const getTajweedIssues = () => {
    if (!phase.tajweedIssues || phase.tajweedIssues.length === 0) {
      return null;
    }
    return phase.tajweedIssues.map(issue => issue.type).join(', ');
  };

  // Get date
  const getDate = () => {
    if (!showDate) return null;
    if (phase.createdAt) {
      return new Date(phase.createdAt).toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      });
    }
    return null;
  };

  // Combine start and end ayah text for display
  const getCombinedAyahText = () => {
    if (!phase.startAyahText && !phase.endAyahText) return null;
    
    if (phase.startAyahText && phase.endAyahText) {
      // If they're the same, show once
      if (phase.startAyahText === phase.endAyahText) {
        return phase.startAyahText;
      }
      // Otherwise combine with space
      return `${phase.startAyahText} ${phase.endAyahText}`;
    }
    
    return phase.startAyahText || phase.endAyahText;
  };

  const ayahRange = getAyahRange();
  const mistakesSummary = getMistakesSummary();
  const tajweedIssues = getTajweedIssues();
  const date = getDate();
  const combinedAyahText = getCombinedAyahText();

  return (
    <div className={`bg-white rounded-lg border ${colors.border} p-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Section - Metadata */}
        <div className="space-y-2">
          {/* Surah Name(s) */}
          {phase.surahName && (
            <div>
              <span className="text-xs font-semibold text-gray-600">Surah:</span>
              <div className="mt-0.5 space-y-1">
                {/* Start Surah */}
                <div className="flex items-center gap-2">
                  {phase.endSurahName && phase.endSurahName !== phase.surahName && (
                    <span className="text-[10px] text-gray-500 font-medium">Start:</span>
                  )}
                  <p 
                    className="text-sm font-bold text-primary flex-1"
                    style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif', direction: 'rtl' }}
                    dir="rtl"
                  >
                    {phase.surahName}
                  </p>
                </div>
                {/* End Surah (if different) */}
                {phase.endSurahName && phase.endSurahName !== phase.surahName && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-medium">End:</span>
                    <p 
                      className="text-sm font-bold text-primary flex-1"
                      style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif', direction: 'rtl' }}
                      dir="rtl"
                    >
                      {phase.endSurahName}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ayah Range */}
          {ayahRange && (
            <div>
              <span className="text-xs font-semibold text-gray-600">Ayah Range:</span>
              <p className="text-sm text-gray-900 mt-0.5">
                {phase.endSurahName && phase.endSurahName !== phase.surahName ? (
                  <>
                    {phase.surahName} {phase.fromAyah} → {phase.endSurahName} {phase.toAyah}
                  </>
                ) : (
                  ayahRange
                )}
              </p>
            </div>
          )}

          {/* Mistakes Summary */}
          {mistakesSummary && (
            <div>
              <span className="text-xs font-semibold text-gray-600">Mistakes:</span>
              <p className="text-sm text-gray-900 mt-0.5">{mistakesSummary}</p>
            </div>
          )}

          {/* Tajweed Issues */}
          {tajweedIssues && (
            <div>
              <span className="text-xs font-semibold text-gray-600">Tajweed Issues:</span>
              <p className="text-sm text-gray-900 mt-0.5">{tajweedIssues}</p>
            </div>
          )}

          {/* Teacher Comment */}
          {(phase.teacherReviewComment || phase.details) && (
            <div>
              <span className="text-xs font-semibold text-gray-600">Teacher Comment:</span>
              <p className="text-sm text-gray-900 mt-0.5 italic">
                {phase.teacherReviewComment || phase.details}
              </p>
            </div>
          )}

          {/* Date */}
          {date && (
            <div>
              <span className="text-xs font-semibold text-gray-600">Date:</span>
              <p className="text-sm text-gray-900 mt-0.5">{date}</p>
            </div>
          )}
        </div>

        {/* Right Section - Arabic Text with Start/End Labels */}
        {combinedAyahText && (
          <div className="relative">
            <div 
              className="text-base leading-relaxed text-gray-900 pr-8"
              style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif', direction: 'rtl' }}
              dir="rtl"
            >
              {phase.startAyahText && phase.endAyahText && phase.startAyahText !== phase.endAyahText ? (
                <>
                  <span className="relative">
                    {phase.startAyahText}
                    <span className="absolute -top-3 right-0 text-[10px] text-gray-500 bg-white px-1 rounded">
                      Start
                    </span>
                  </span>
                  {' '}
                  <span className="relative">
                    {phase.endAyahText}
                    <span className="absolute -top-3 left-0 text-[10px] text-gray-500 bg-white px-1 rounded">
                      End
                    </span>
                  </span>
                </>
              ) : (
                <span className="relative">
                  {combinedAyahText}
                  {phase.startAyahText && (
                    <span className="absolute -top-3 right-0 text-[10px] text-gray-500 bg-white px-1 rounded">
                      Start
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Remove Button */}
      {showRemove && onRemove && (
        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onRemove}
            className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

export default ClassworkEntryCard;
