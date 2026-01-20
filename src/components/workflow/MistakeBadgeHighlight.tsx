import React, { useState, useEffect } from 'react';
// @ts-ignore - Demo component, mushaf package may not be available in all environments
import { MushafMistake } from '@umar-academy/mushaf';

interface MistakeBadgeHighlightProps {
  mistake: MushafMistake;
  isNew?: boolean;
  showTimestamp?: boolean;
  onRemove?: (mistakeId: string) => void;
  wordText?: string; // Optional: word text passed from parent (from onMistakesWithWords)
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
  wordText: propWordText,
}) => {
  const [fetchedWordText, setFetchedWordText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Use propWordText if available, otherwise use fetchedWordText
  const wordText = propWordText && propWordText.trim().length > 0 ? propWordText : fetchedWordText;
  
  // Fetch Arabic word text ONLY if not provided via prop
  useEffect(() => {
    // Skip entirely if word text already provided via prop
    if (propWordText && propWordText.trim().length > 0) {
      setFetchedWordText(''); // Clear any previously fetched text
      return; // Exit early - don't fetch
    }
    
    // Use the same data source as Interactive Mushaf (QPC V1 database or JSON file)
    const fetchWordText = async () => {
      if (mistake.surah && mistake.ayah && mistake.wordIndex !== undefined) {
        setIsLoading(true);
        try {
          // Strategy 1: Try to load from QPC V1 database (same as Interactive Mushaf)
          try {
            // Import the function from mushaf package (same source as Interactive Mushaf)
            const { getAllQpcV1Words } = await import('@umar-academy/mushaf');
            const allWords = await getAllQpcV1Words();
            
            if (Array.isArray(allWords) && allWords.length > 0) {
              // Find word by word_id (word_index) - this is the primary lookup for large wordIndex values
              let word = allWords.find((w) => w.word_index === mistake.wordIndex);
              
              // If not found by word_id, try to find by surah, ayah, and word position
              if (!word) {
                const ayahWords = allWords.filter((w) => w.surah === mistake.surah && w.ayah === mistake.ayah);
                
                // Try word position match
                word = ayahWords.find((w) => {
                  // Check if wordIndex matches word position (1-based or 0-based)
                  const wordPos = (w as any).word;
                  return wordPos === mistake.wordIndex || wordPos === mistake.wordIndex + 1;
                });
                
                // If still not found, try array index within ayah words
                if (!word && mistake.wordIndex >= 0 && mistake.wordIndex < ayahWords.length) {
                  word = ayahWords[mistake.wordIndex];
                }
              }
              
              if (word && word.text && word.text.trim().length > 1) {
                setFetchedWordText(word.text.trim());
                setIsLoading(false);
                return;
              }
            }
          } catch (qpcError) {
            // QPC V1 database not available, fall through to JSON file
          }
          
          // Strategy 2: Fallback to JSON file (same as Interactive Mushaf)
          try {
            const wordsRes = await fetch('/data/words/word_by_word.json');
            if (wordsRes.ok) {
              const contentType = wordsRes.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                const wordsData = await wordsRes.json();
                let wordsArray: Array<{ word_index: number; surah: number; ayah: number; text: string }> = [];
                
                if (Array.isArray(wordsData)) {
                  wordsArray = wordsData;
                } else {
                  // Convert object format to array
                  wordsArray = Object.values(wordsData).map((entry: any) => ({
                    word_index: entry.id || entry.word_index,
                    surah: parseInt(entry.surah),
                    ayah: parseInt(entry.ayah),
                    text: entry.text
                  }));
                }
                
                // Find word by word_id (word_index)
                let word = wordsArray.find((w) => w.word_index === mistake.wordIndex);
                
                // If not found by word_id, try to find by surah, ayah, and word position
                if (!word) {
                  const ayahWords = wordsArray.filter((w) => w.surah === mistake.surah && w.ayah === mistake.ayah);
                  
                  // Try array index within ayah words
                  if (mistake.wordIndex >= 0 && mistake.wordIndex < ayahWords.length) {
                    word = ayahWords[mistake.wordIndex];
                  }
                }
                
                if (word && word.text && word.text.trim().length > 1) {
                  setFetchedWordText(word.text.trim());
                  setIsLoading(false);
                  return;
                }
              }
            }
          } catch (jsonError) {
            // JSON file not available, word text will remain empty
          }
        } catch (error) {
          // Silently handle errors - word text will remain empty
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    // Always try to fetch if prop is not available or empty
    // This ensures we get word text even if it wasn't saved with the mistake
    if (!propWordText || propWordText.trim().length === 0) {
      fetchWordText();
    } else {
      // If propWordText is available, we don't need to fetch
      setIsLoading(false);
    }
  }, [mistake.surah, mistake.ayah, mistake.wordIndex, propWordText]);

  const getMistakeTypeColor = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower === 'atkee') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (['madd', 'ikhfa', 'holding', 'tech', 'heavy_letter', 'no_rounding_lips', 'heavy_h', 'light_l'].includes(typeLower)) {
      return 'bg-gray-100 text-gray-800 border-gray-300';
    }
    return 'bg-red-100 text-red-800 border-red-300';
  };

  // Determine display label
  const getDisplayLabel = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower === 'atkee') return 'Atkee';
    if (['madd', 'ikhfa', 'holding', 'tech', 'heavy_letter', 'no_rounding_lips', 'heavy_h', 'light_l'].includes(typeLower)) {
      return 'Tajweed Error';
    }
    if (typeLower === 'other') return 'Mistake';
    return 'Mistake';
  };

  return (
    <div className={`group flex items-start gap-2 px-2 py-1.5 rounded-lg border transition-all ${
      isNew 
        ? 'bg-green-50 border-green-300 shadow-sm' 
        : 'bg-gray-50 border-gray-200 hover:border-primary/50'
    }`}>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isNew && (
            <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded-full">
              NEW
            </span>
          )}
          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${getMistakeTypeColor(mistake.type)}`}>
            {getDisplayLabel(mistake.type)}
          </span>
          <span className="text-[10px] text-primary/70 font-semibold">
            Page {mistake.page}
          </span>
        </div>
        {wordText && wordText.trim().length > 0 ? (
          <div 
            className="text-sm text-primary font-bold leading-relaxed"
            style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif', direction: 'rtl' }}
            dir="rtl"
          >
            {wordText}
          </div>
        ) : (
          // Show loading indicator only while actively fetching
          isLoading && mistake.surah && mistake.ayah && mistake.wordIndex !== undefined && (
            <span className="text-[10px] text-gray-400 italic">Loading word...</span>
          )
        )}
        {mistake.note && (
          <div className="text-[10px] text-gray-600 italic mt-0.5">"{mistake.note}"</div>
        )}
      </div>
      {onRemove && (
        <button
          onClick={() => onRemove(mistake.id!)}
          className="text-red-600 hover:text-red-800 text-[10px] px-1 py-0.5 rounded hover:bg-red-50 transition-colors flex-shrink-0 font-bold mt-0.5"
          title="Remove mistake"
        >
          ✕
        </button>
      )}
    </div>
  );
};

