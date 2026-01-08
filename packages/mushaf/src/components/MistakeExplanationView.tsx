import React from 'react';
import { MushafMistake, StructuredTajweedData } from '../types/mushaf';
import { Word } from './InteractiveMushaf';

interface MistakeTimeline {
  firstMarkedAt?: Date | string;
  lastMarkedAt?: Date | string;
  repeatCount?: number;
  resolved?: boolean;
}

interface EnhancedMistake extends MushafMistake {
  timeline?: MistakeTimeline;
  tajweedData?: StructuredTajweedData;
  category?: 'tajweed' | 'letter' | 'stop' | 'memory' | 'other' | 'recitation';
}

interface MistakeExplanationViewProps {
  mistake: EnhancedMistake;
  word: Word;
  isHistorical: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

const MistakeExplanationView: React.FC<MistakeExplanationViewProps> = ({
  mistake,
  word,
  isHistorical,
  onClose,
  isMobile = false
}) => {
  const getRecencyCategory = (): 'today' | 'recent' | 'old' => {
    if (!mistake.timeline?.lastMarkedAt) return 'old';
    const now = new Date();
    const lastMarked = new Date(mistake.timeline.lastMarkedAt);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    if (lastMarked >= today) return 'today';
    if (lastMarked >= sevenDaysAgo) return 'recent';
    return 'old';
  };

  const recency = getRecencyCategory();
  const isToday = recency === 'today';
  const isRecent = recency === 'recent';
  const isTajweed = mistake.category === 'tajweed' || mistake.tajweedData;

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const mistakeDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    
    if (mistakeDate.getTime() === today.getTime()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (mistakeDate.getTime() === yesterday.getTime()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getMistakeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'madd': 'Madd (Elongation)',
      'ikhfa': 'Ikhfa (Hidden)',
      'idgham': 'Idgham (Merging)',
      'iqlab': 'Iqlab (Conversion)',
      'qalqalah': 'Qalqalah (Echo)',
      'heavy_letter': 'Heavy Letter',
      'makhraj': 'Makhraj (Articulation)',
      'ghunna': 'Ghunna (Nasalization)',
      'shaddah': 'Shaddah (Doubling)',
      'memory': 'Memory Mistake',
      'letter': 'Letter Mistake',
      'holding': 'Holding/Fluency',
      'other': 'Other Mistake',
    };
    return labels[type] || type;
  };

  const Content = () => (
    <>
      {/* Header */}
      <div className={`px-6 py-4 border-b-2 ${
        isToday ? 'bg-red-50 border-red-300' :
        isRecent ? 'bg-orange-50 border-orange-300' :
        'bg-gray-50 border-gray-300'
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                isToday ? 'bg-red-500 text-white' :
                isRecent ? 'bg-orange-500 text-white' :
                'bg-gray-500 text-white'
              }`}>
                {isToday ? '🆕 Today' : isRecent ? '📅 Recent' : '📜 Old'}
              </span>
              {isHistorical && (
                <span className="px-3 py-1 rounded-full bg-blue-500 text-white text-xs font-bold">
                  Historical
                </span>
              )}
              <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-bold">
                {getMistakeTypeLabel(mistake.type)}
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {word.text || `Surah ${mistake.surah}, Ayah ${mistake.ayah}`}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Page {mistake.page} • Word {mistake.wordIndex !== undefined ? mistake.wordIndex + 1 : 'N/A'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white text-gray-600 rounded-lg transition-all text-xl font-bold"
          >
            ×
          </button>
        </div>
      </div>

      {/* Timeline Info */}
      {mistake.timeline && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="space-y-2">
            {mistake.timeline.firstMarkedAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">First Marked:</span>
                <span className="text-sm text-gray-600">{formatDate(mistake.timeline.firstMarkedAt)}</span>
              </div>
            )}
            {mistake.timeline.lastMarkedAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Last Marked:</span>
                <span className="text-sm text-gray-600">{formatDate(mistake.timeline.lastMarkedAt)}</span>
              </div>
            )}
            {mistake.timeline.repeatCount !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Repetition Count:</span>
                <span className={`text-sm font-bold ${
                  mistake.timeline.repeatCount > 3 ? 'text-red-600' :
                  mistake.timeline.repeatCount > 1 ? 'text-orange-600' :
                  'text-gray-600'
                }`}>
                  {mistake.timeline.repeatCount} {mistake.timeline.repeatCount === 1 ? 'time' : 'times'}
                </span>
              </div>
            )}
            {mistake.timeline.resolved && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-green-700">Status:</span>
                <span className="text-sm font-bold text-green-600">✓ Resolved</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tajweed Details */}
      {isTajweed && mistake.tajweedData && (
        <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
          <h4 className="text-sm font-bold text-blue-900 mb-3">How to Read Correctly:</h4>
          <div className="space-y-3">
            {mistake.tajweedData.tajweedRule && (
              <div>
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Rule:</span>
                <p className="text-sm text-blue-900 font-semibold mt-1">
                  {mistake.tajweedData.tajweedRule.toUpperCase()}
                </p>
              </div>
            )}
            
            {mistake.tajweedData.stretchCount !== undefined && mistake.tajweedData.stretchCount > 0 && (
              <div>
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Stretch:</span>
                <p className="text-sm text-blue-900 font-semibold mt-1">
                  Hold for {mistake.tajweedData.stretchCount} harakat
                </p>
              </div>
            )}
            
            {mistake.tajweedData.holdRequired && (
              <div>
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Hold Required:</span>
                <p className="text-sm text-blue-900 font-semibold mt-1">
                  {mistake.tajweedData.tajweedRule === 'ghunna' ? 'Apply Ghunna (nasalization)' : 'Apply Shaddah (doubling)'}
                </p>
              </div>
            )}
            
            {mistake.tajweedData.focusLetters && mistake.tajweedData.focusLetters.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Focus Letters:</span>
                <p className="text-sm text-blue-900 font-semibold mt-1">
                  {mistake.tajweedData.focusLetters.join(', ')}
                </p>
              </div>
            )}
            
            {mistake.tajweedData.teacherNote && (
              <div>
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Teacher Note:</span>
                <p className="text-sm text-blue-900 mt-1 italic">
                  "{mistake.tajweedData.teacherNote}"
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* General Note */}
      {mistake.note && !isTajweed && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-sm font-bold text-gray-900 mb-2">Note:</h4>
          <p className="text-sm text-gray-700 italic">"{mistake.note}"</p>
        </div>
      )}

      {/* Audio */}
      {mistake.audioUrl && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-sm font-bold text-gray-900 mb-2">Audio Correction:</h4>
          <audio 
            controls 
            preload="metadata"
            crossOrigin="anonymous"
            className="w-full h-10"
            onError={(e) => {
              const target = e.target as HTMLAudioElement;
              console.error('Audio load error:', target.src, {
                error: target.error,
                code: target.error?.code,
                message: target.error?.message
              });
            }}
            onLoadedMetadata={() => {
              console.log('✅ Audio loaded successfully:', mistake.audioUrl);
            }}
            src={
              (() => {
                let url = mistake.audioUrl || '';
                // Handle full URLs
                if (url.startsWith('http://') || url.startsWith('https://')) {
                  // Fix URLs that incorrectly include /api/uploads
                  url = url.replace('/api/uploads/', '/uploads/');
                  return url;
                }
                // Handle relative paths - construct full URL
                let baseUrl = 'http://localhost:3001';
                if (typeof window !== 'undefined') {
                  if ((window as any).MUSHAF_API_BASE) {
                    baseUrl = (window as any).MUSHAF_API_BASE;
                  } else if (import.meta.env?.VITE_API_BASE_URL) {
                    baseUrl = import.meta.env.VITE_API_BASE_URL;
                  }
                }
                // Remove /api suffix if present (uploads are served from root, not /api)
                if (baseUrl.endsWith('/api')) {
                  baseUrl = baseUrl.replace('/api', '');
                }
                baseUrl = baseUrl.replace(/\/$/, '');
                // Ensure URL starts with /
                const audioPath = url.startsWith('/') ? url : `/${url}`;
                const fullUrl = `${baseUrl}${audioPath}`;
                console.log('🔊 Constructed audio URL:', fullUrl, 'from:', mistake.audioUrl);
                return fullUrl;
              })()
            }
          >
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[80vh] overflow-hidden flex flex-col border-t-4 border-primary">
        <div className="px-4 py-2 flex items-center justify-center">
          <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Content />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto border-l-4 border-primary">
      <Content />
    </div>
  );
};

export default MistakeExplanationView;

