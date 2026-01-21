import React from 'react';
import { AssignmentHomework, HomeworkItem, HomeworkRange } from '../types/assignment';

interface HomeworkDisplayProps {
  homework: AssignmentHomework;
  showSubmission?: boolean;
  className?: string;
}

// Utility function to format homework range (same as in HomeworkAssignmentForm)
function formatRange(range: HomeworkRange): string {
  if (range.mode === 'surah_ayah') {
    const from = range.from;
    const to = range.to;
    if (!from) return 'Invalid range';
    // Prioritize Arabic name
    const surahName = from.surahName || `سورة ${from.surah}`;
    if (from.ayah && to?.ayah) {
      return from.ayah === to.ayah
        ? `${surahName}, آية ${from.ayah}`
        : `${surahName}, آية ${from.ayah}-${to.ayah}`;
    }
    return surahName;
  } else if (range.mode === 'juz_juz') {
    return `جزء ${range.juzList?.[0] || 'N/A'}`;
  } else if (range.mode === 'multiple_juz') {
    return `أجزاء ${range.juzList?.join(', ') || 'N/A'}`;
  } else if (range.mode === 'surah_surah') {
    const fromName = range.from?.surahName || `سورة ${range.from?.surah}`;
    const toName = range.to?.surahName || `سورة ${range.to?.surah}`;
    return `${fromName} إلى ${toName}`;
  }
  return 'Unknown range';
}

const HomeworkDisplay: React.FC<HomeworkDisplayProps> = ({ 
  homework, 
  showSubmission = false,
  className = '' 
}) => {
  // Show homework if enabled OR if items exist
  const hasStructuredItems = homework?.items && homework.items.length > 0;
  // ✅ LEGACY: sabqiContent/manzilContent may exist in old data but are not sent in new requests
  const hasLegacyContent = homework?.content || homework?.link || homework?.sabqiContent || homework?.manzilContent;
  const shouldShow = homework?.enabled || hasStructuredItems || hasLegacyContent;
  
  if (!shouldShow) {
    console.log('🚫 HomeworkDisplay: Not showing because:', {
      enabled: homework?.enabled,
      itemsCount: homework?.items?.length || 0,
      hasLegacyContent
    });
    return null;
  }

  const hasNotes = homework?.notes && homework.notes.trim();

  // Type colors for badges
  const typeColors = {
    sabq: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
    sabqi: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    manzil: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' }
  };

  const typeLabels = {
    sabq: '📖 Sabq',
    sabqi: '📚 Sabqi',
    manzil: '📿 Manzil'
  };

  return (
    <div className={className}>
      {/* Structured Homework Items */}
      {hasStructuredItems && (
        <div className="space-y-3 mb-3">
          {homework.items!.map((item: HomeworkItem, index: number) => {
            const colors = typeColors[item.type];
            return (
              <div
                key={index}
                className={`${colors.bg} ${colors.border} border rounded-lg p-3`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className={`text-sm font-semibold ${colors.text} mr-2`}>
                        {typeLabels[item.type]}
                      </span>
                      <span className="text-sm text-gray-700">
                        {formatRange(item.range)}
                      </span>
                      {item.source.suggestedFrom === 'ticket' && (
                        <span className="text-xs text-gray-500 ml-2">(from tickets)</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Item Content */}
                  {item.content && item.content.trim() && (
                    <div className="mt-2 pt-2 border-t border-gray-300">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Instructions:</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </div>
                  )}
                  
                  {/* Item Attachments */}
                  {item.attachments && item.attachments.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-300">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Attached Files:</p>
                      <div className="flex flex-wrap gap-2">
                        {item.attachments.map((file, fileIndex) => (
                          <a
                            key={fileIndex}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 px-2 py-1 bg-white rounded border border-gray-300"
                          >
                            📎 {file.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ✅ LEGACY: Sabqi & Manzil Homework Content (may exist in old data, but not sent in new requests) */}
      {(homework?.sabqiContent || homework?.manzilContent) && (
        <div className="mb-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
          <h5 className="text-xs font-semibold text-gray-900 mb-2">Sabqi & Manzil Homework</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {homework.sabqiContent && (
              <div>
                <span className="text-xs font-semibold text-indigo-700">Sabqi:</span>
                <p className="text-sm text-indigo-800 mt-1 whitespace-pre-wrap">
                  {homework.sabqiContent}
                </p>
              </div>
            )}
            {homework.manzilContent && (
              <div>
                <span className="text-xs font-semibold text-purple-700">Manzil:</span>
                <p className="text-sm text-purple-800 mt-1 whitespace-pre-wrap">
                  {homework.manzilContent}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legacy Content (backward compatibility) */}
      {!hasStructuredItems && hasLegacyContent && (
        <div className="mb-3">
          {homework.content && (
            <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
              {homework.content}
            </p>
          )}
          {homework.link && (
            <a
              href={homework.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              🔗 {homework.link}
            </a>
          )}
        </div>
      )}

      {/* Notes */}
      {hasNotes && (
        <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded">
          <p className="text-xs font-semibold text-gray-700 mb-1">Notes:</p>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{homework.notes}</p>
        </div>
      )}

      {/* Submission Status */}
      {showSubmission && homework.submission?.submitted && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-semibold text-gray-700">Your Submission:</h5>
            {homework.submission.status && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                homework.submission.status === 'graded' 
                  ? 'bg-green-100 text-green-800'
                  : homework.submission.status === 'returned'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {homework.submission.status === 'graded' 
                  ? '✓ Graded' 
                  : homework.submission.status === 'returned'
                  ? 'Returned'
                  : 'Submitted'}
              </span>
            )}
          </div>
          {homework.submission.submittedAt && (
            <p className="text-xs text-gray-600 mb-2">
              Submitted: {new Date(homework.submission.submittedAt).toLocaleDateString()}
            </p>
          )}
          {homework.submission.content && (
            <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
              {homework.submission.content}
            </p>
          )}
          {homework.submission.link && (
            <a
              href={homework.submission.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-2"
            >
              🔗 {homework.submission.link}
            </a>
          )}
          {homework.submission.audioUrl && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-gray-600 mb-1">Audio Recording:</p>
              <audio
                controls
                src={homework.submission.audioUrl}
                className="w-full max-w-md"
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
          {homework.submission.attachments && homework.submission.attachments.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-gray-600 mb-1">Attachments:</p>
              <div className="flex flex-wrap gap-2">
                {homework.submission.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    📎 {att.name}
                  </a>
                ))}
              </div>
            </div>
          )}
          {homework.submission.feedback && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs font-semibold text-blue-900 mb-1">Feedback:</p>
              <p className="text-sm text-blue-800 whitespace-pre-wrap">
                {homework.submission.feedback}
              </p>
            </div>
          )}
          {homework.submission.grade !== undefined && homework.submission.grade !== null && (
            <div className="mt-2">
              <span className="text-sm font-semibold text-gray-700">Grade: </span>
              <span className="text-sm text-gray-900">{homework.submission.grade}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HomeworkDisplay;

