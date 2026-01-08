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
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Timeline
          </h4>
          <div className="space-y-3">
            {mistake.timeline.firstMarkedAt && (
              <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
                <span className="text-sm font-semibold text-gray-700">First Marked:</span>
                <span className="text-sm text-gray-600 font-medium">{formatDate(mistake.timeline.firstMarkedAt)}</span>
              </div>
            )}
            {mistake.timeline.lastMarkedAt && (
              <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
                <span className="text-sm font-semibold text-gray-700">Last Marked:</span>
                <span className="text-sm text-gray-600 font-medium">{formatDate(mistake.timeline.lastMarkedAt)}</span>
              </div>
            )}
            {mistake.timeline.repeatCount !== undefined && (
              <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
                <span className="text-sm font-semibold text-gray-700">Repetition Count:</span>
                <span className={`text-sm font-bold px-2 py-1 rounded ${
                  mistake.timeline.repeatCount > 3 ? 'bg-red-100 text-red-700' :
                  mistake.timeline.repeatCount > 1 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {mistake.timeline.repeatCount} {mistake.timeline.repeatCount === 1 ? 'time' : 'times'}
                </span>
              </div>
            )}
            {mistake.timeline.resolved && (
              <div className="flex items-center justify-between bg-green-50 p-2 rounded-lg border border-green-200">
                <span className="text-sm font-semibold text-green-700">Status:</span>
                <span className="text-sm font-bold text-green-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Resolved
                </span>
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
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            Note
          </h4>
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-700 italic leading-relaxed">"{mistake.note}"</p>
          </div>
        </div>
      )}

      {/* Audio */}
      {mistake.audioUrl && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Audio Correction</h4>
              <p className="text-xs text-gray-600">Listen to the correct pronunciation</p>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm border border-blue-200">
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

