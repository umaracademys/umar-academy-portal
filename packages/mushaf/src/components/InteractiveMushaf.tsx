import React, { useEffect, useState } from "react";
import { MushafMistake } from '../types/mushaf';
import { fetchPageLines, getQuranChapters, Chapter } from "../services/quranApi";
import { uploadMistakeAudio } from "../services/audioService";
import { FALLBACK_CHAPTERS } from "../data/fallbackChapters";
import { ensureQpcV1Font, getAllQpcV1Words, getQpcV1Layout } from "../services/qpcV1Assets";

export interface AyahPosition {
  surah: number;
  ayah: number;
  x: number;
  y: number;
}

export interface Word {
  word_index: number;
  surah: number;
  ayah: number;
  text: string;
}

export interface Line {
  page_number: number;
  line_number: number;
  first_word_id: number | null;
  last_word_id: number | null;
  is_centered: boolean;
  line_type: "ayah" | "surah_name" | "basmallah";
  surah_number?: number;
  mushaf_id?: number; // Optional: for multi-mushaf support
}

export interface LayoutPage {
  page_number: number;
  lines: Line[];
  mushaf_id?: number; // Optional: for multi-mushaf support
  metadata?: {
    mushaf_name?: string;
    code?: string;
    pages_count?: number;
    lines_per_page?: number;
    font_name?: string;
  };
}

interface MushafLayout {
  page_number: number;
  ayah_positions: AyahPosition[];
}

interface InteractiveMushafProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  mistakes: MushafMistake[]; // Current mistakes (from current ticket/recitation)
  historicalMistakes?: MushafMistake[]; // Historical mistakes from student's personal Mushaf
  onMistakeMark: (mistake: Omit<MushafMistake, 'id' | 'timestamp'>) => void;
  readOnly?: boolean;
  mode?: 'marking' | 'viewing';
  studentName?: string;
  onBack?: () => void;
  showHistorical?: boolean; // Toggle to show/hide historical mistakes
  onVerseSelect?: (surah: number, ayah: number, page: number) => void; // Callback when a verse is clicked for question selection
  selectedVerses?: Array<{ surah: number; ayah: number }>; // Array of verses that are selected as questions
}

interface MistakeModalProps {
  word: Word | null;
  letterIndex?: number; // Index of clicked letter within the word
  onClose: () => void;
  onSave: (word: Word, type: string, note?: string, audioBlob?: Blob, letterIndex?: number) => void;
}

interface Mistake {
  word_index: number;
  surah: number;
  ayah: number;
  text: string;
  type: string;
  note?: string;
}

const mistakeTypes = [
  "Memory Mistake",
  "Mad (Elongation) Mistake",
  "Ikhfa Mistake",
  "Ghunna Mistake",
  "Holding/Fluency Mistake",
  "Letter Mistake",
  "Heavy Letter",
  "No Rounding Lips",
  "Heavy H",
  "Light L",
  "Atkee",
  "Other Mistake",
];

// Letter-level mistake types that require letter selection
const letterMistakeTypes = [
  "Letter Mistake",
  "Heavy Letter",
  "No Rounding Lips",
  "Heavy H",
  "Light L",
  "Atkee",
];

// Function to split Arabic text into letters properly (handles diacritics and combining characters)
// This function should be used consistently throughout the component
// Handles both cases: text already split into glyphs, or full words
const splitArabicText = (text: string): string[] => {
  if (!text || text.trim().length === 0) return [];
  
  // For Mushaf data, words are often already stored as individual glyphs/characters
  // Check if text appears to be individual characters (common case)
  const chars = Array.from(text);
  
  // If most characters are single Arabic letters (not combined with diacritics),
  // treat each character as a separate letter
  // This handles the common case where Mushaf data stores words as individual glyphs
  let singleCharCount = 0;
  for (const char of chars) {
    const code = char.charCodeAt(0);
    const isArabic = (code >= 0x0600 && code <= 0x06FF) || 
                     (code >= 0x0750 && code <= 0x077F) || 
                     (code >= 0x08A0 && code <= 0x08FF) || 
                     (code >= 0xFB50 && code <= 0xFDFF) || 
                     (code >= 0xFE70 && code <= 0xFEFF);
    if (isArabic && char.length === 1) {
      singleCharCount++;
    }
  }
  
  // If 80%+ of characters are single Arabic letters, treat as individual glyphs
  if (singleCharCount >= chars.length * 0.8 && chars.length > 0) {
    // Return all characters, filtering out only pure whitespace
    return chars.filter(char => char.trim().length > 0 || char.charCodeAt(0) > 0x20);
  }
  
  // Otherwise, try using Intl.Segmenter for proper grapheme cluster segmentation
  try {
    const IntlSegmenter = (Intl as any).Segmenter;
    if (IntlSegmenter) {
      const segmenter = new IntlSegmenter('ar', { granularity: 'grapheme' });
      const segments = Array.from(segmenter.segment(text)) as Array<{ segment: string }>;
      const result = segments.map(seg => seg.segment).filter(seg => seg.trim().length > 0);
      if (result.length > 0) {
        return result;
      }
    }
  } catch (e) {
    // Intl.Segmenter not available, will use fallback
    console.debug('Intl.Segmenter not available, using fallback');
  }
  
  // Fallback: Split by Arabic grapheme clusters manually
  const result: string[] = [];
  let currentLetter = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    
    const isArabicBase = (code >= 0x0600 && code <= 0x06FF) || 
                         (code >= 0x0750 && code <= 0x077F) || 
                         (code >= 0x08A0 && code <= 0x08FF) || 
                         (code >= 0xFB50 && code <= 0xFDFF) || 
                         (code >= 0xFE70 && code <= 0xFEFF);
    
    const isCombiningMark = (code >= 0x064B && code <= 0x065F) || 
                            (code === 0x0651); // Shadda
    
    if (isArabicBase) {
      if (currentLetter.trim().length > 0) {
        result.push(currentLetter);
      }
      currentLetter = char;
    } else if (isCombiningMark && currentLetter.length > 0) {
      currentLetter += char;
    } else if (currentLetter.trim().length > 0) {
      result.push(currentLetter);
      currentLetter = '';
      if (char.trim().length > 0 && !isCombiningMark) {
        result.push(char);
      }
    } else if (char.trim().length > 0 && !isCombiningMark) {
      result.push(char);
    }
  }
  
  if (currentLetter.trim().length > 0) {
    result.push(currentLetter);
  }
  
  const filtered = result.filter(letter => letter.trim().length > 0);
  return filtered.length > 0 ? filtered : chars.filter(char => char.trim().length > 0);
};

// Function to get mistake type label (used by multiple components)
const getMistakeTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    "memory": "Memory Mistake",
    "madd": "Mad (Elongation) Mistake",
    "ikhfa": "Ikhfa Mistake",
    "holding": "Holding/Fluency Mistake",
    "tech": "Ghunna Mistake",
    "letter": "Letter Mistake",
    "heavy_letter": "Heavy Letter",
    "no_rounding_lips": "No Rounding Lips",
    "heavy_h": "Heavy H",
    "light_l": "Light L",
    "atkee": "Atkee",
    "other": "Other Mistake",
  };
  return typeMap[type] || type;
};

export const MistakeModal: React.FC<MistakeModalProps> = ({
  word,
  letterIndex: initialLetterIndex,
  onClose,
  onSave,
}) => {
  const [selectedType, setSelectedType] = useState("");
  const [selectedLetterIndex, setSelectedLetterIndex] = useState<number | undefined>(initialLetterIndex);
  const [note, setNote] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState<number | null>(null);

  // Reset letter selection when word changes or initialLetterIndex changes
  useEffect(() => {
    if (initialLetterIndex !== undefined) {
      setSelectedLetterIndex(initialLetterIndex);
    } else {
      // If no letter index provided, reset to undefined
      setSelectedLetterIndex(undefined);
    }
  }, [initialLetterIndex, word]);

  // Split word into letters for letter selection using the same function as rendering
  const wordLetters = React.useMemo(() => {
    if (!word || !word.text) return [];
    const letters = splitArabicText(word.text);
    // Filter out empty strings and whitespace-only letters
    const filtered = letters.filter(letter => letter.trim().length > 0);
    // Only log in development mode and for debugging purposes
    // Check if we're in development mode (Vite sets import.meta.env.DEV)
    if (import.meta.env?.DEV && filtered.length === 0 && word.text.trim().length > 0) {
      console.warn(`Modal: Word "${word.text}" could not be split into letters`);
    }
    return filtered;
  }, [word]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimer !== null) {
        window.clearInterval(recordingTimer);
      }
    };
  }, [recordingTimer]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      const timer = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setRecordingTimer(timer);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingTimer !== null) {
        window.clearInterval(recordingTimer);
        setRecordingTimer(null);
      }
    }
  };

  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!word) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-96 p-6 space-y-4 max-h-[90vh] overflow-y-auto" dir="ltr">
        <h2 className="text-lg font-semibold text-gray-800 text-left" dir="ltr">
          Mark Mistake – Surah {word.surah}, Ayah {word.ayah}
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1 text-left" dir="ltr">
            Mistake Type:
          </label>
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              // Reset letter selection if switching away from letter mistake types
              if (!letterMistakeTypes.includes(e.target.value)) {
                setSelectedLetterIndex(undefined);
              } else if (selectedLetterIndex === undefined && wordLetters.length > 0) {
                // Auto-select first letter if none selected and letter mistake type chosen
                setSelectedLetterIndex(initialLetterIndex ?? 0);
              }
            }}
            className="w-full border border-gray-300 rounded-md p-2"
            dir="ltr"
          >
            <option value="">Choose...</option>
            {mistakeTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Letter Selection - Only show for letter-level mistake types */}
        {letterMistakeTypes.includes(selectedType) && word && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2 text-left" dir="ltr">
              Select Letter:
              {wordLetters.length === 0 && (
                <span className="text-red-500 text-xs ml-2">(No letters detected in word: "{word.text}")</span>
              )}
            </label>
            {wordLetters.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-md border border-gray-200" dir="rtl" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {wordLetters.map((letter, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedLetterIndex(idx)}
                      className={`px-3 py-2 text-lg rounded-md border-2 transition-all ${
                        selectedLetterIndex === idx
                          ? 'bg-blue-500 text-white border-blue-600 shadow-md scale-105'
                          : 'bg-white text-gray-800 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                      style={{
                        fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif',
                        direction: 'rtl',
                        minWidth: '2.5rem',
                        minHeight: '2.5rem',
                        fontSize: '1.5rem',
                        lineHeight: '1.5'
                      }}
                      title={`Letter ${idx + 1}: ${letter} (Unicode: ${letter.charCodeAt(0).toString(16)})`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
                {selectedLetterIndex !== undefined && selectedLetterIndex < wordLetters.length && (
                  <p className="text-xs text-gray-500 mt-2 text-left" dir="ltr">
                    Selected: Letter {selectedLetterIndex + 1} of {wordLetters.length} ({wordLetters[selectedLetterIndex]})
                  </p>
                )}
              </>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                <p>Could not split word into letters. Word text: "{word.text}"</p>
                <p className="text-xs mt-1">Length: {word.text?.length || 0} characters</p>
                <p className="text-xs">Try clicking directly on a letter in the Mushaf instead.</p>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1 text-left" dir="ltr">
            Optional Note:
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 text-left"
            placeholder="Add comment..."
            rows={3}
            dir="ltr"
          />
        </div>

        {/* Audio Recording Section */}
        <div className="border-t border-gray-200 pt-4" dir="ltr">
          <label className="block text-sm font-medium text-gray-600 mb-2 text-left" dir="ltr">
            Audio Recording (Optional):
          </label>
          <p className="text-xs text-gray-500 mb-3 text-left" dir="ltr">
            Record how to read this correctly for the student
          </p>
          
          {!audioUrl ? (
            <div className="flex items-center gap-2" dir="ltr">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  dir="ltr"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                  Record Audio
                </button>
              ) : (
                <div className="flex items-center gap-3" dir="ltr">
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                    dir="ltr"
                  >
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    Stop ({formatTime(recordingTime)})
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <audio controls src={audioUrl} className="w-full">
                Your browser does not support the audio element.
              </audio>
              <div className="flex gap-2" dir="ltr">
                <button
                  onClick={deleteRecording}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                  dir="ltr"
                >
                  Delete Recording
                </button>
                <button
                  onClick={startRecording}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  dir="ltr"
                >
                  Record Again
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200" dir="ltr">
          <button
            onClick={() => {
              if (selectedType) {
                // For letter mistake types, require letter selection
                if (letterMistakeTypes.includes(selectedType) && selectedLetterIndex === undefined) {
                  alert('Please select a letter for this mistake type.');
                  return;
                }
                onSave(word, selectedType, note, audioBlob || undefined, selectedLetterIndex);
                onClose();
              }
            }}
            disabled={!selectedType || (letterMistakeTypes.includes(selectedType) && selectedLetterIndex === undefined)}
            className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-left"
            dir="ltr"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 text-left"
            dir="ltr"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export const MushafPage: React.FC<{
  pageNumber: number;
  onAyahClick?: (ayah: AyahPosition) => void;
}> = ({
  pageNumber,
  onAyahClick,
}) => {
  const [layout, setLayout] = useState<MushafLayout | null>(null);
  const [background, setBackground] = useState<string>("");

  useEffect(() => {
    const fetchLayout = async () => {
      try {
        const res = await fetch(
          `https://qul.tarteel.ai/layouts/mushaf-uthmani/page_${pageNumber}.json`
        );
        if (!res.ok) throw new Error("Layout not found");
        const data = await res.json();
        setLayout(data);
      } catch (err) {
        console.error("Error fetching layout:", err);
      }
    };

    fetchLayout();

    // You can use any page background image or generated mushaf image here
    setBackground(`https://qul.tarteel.ai/mushaf-uthmani/images/${pageNumber}.jpg`);
  }, [pageNumber]);

  if (!layout)
    return <div className="text-center p-4">Loading Mushaf Page...</div>;

  return (
    <div className="relative w-full flex justify-center">
      {/* Background Mushaf Page */}
      <img
        src={background}
        alt={`Mushaf page ${pageNumber}`}
        className="max-w-full h-auto shadow-lg rounded-xl"
      />

      {/* Clickable ayahs overlay */}
      <div className="absolute top-0 left-0 w-full h-full">
        {layout.ayah_positions.map((ayah, index) => (
          <button
            key={index}
            className="absolute bg-transparent hover:bg-green-200/30 rounded-full transition-all"
            style={{
              left: `${ayah.x * 100}%`,
              top: `${ayah.y * 100}%`,
              width: "2%",
              height: "2%",
            }}
            onClick={() => onAyahClick?.(ayah)}
            title={`Surah ${ayah.surah}, Ayah ${ayah.ayah}`}
          />
        ))}
      </div>
    </div>
  );
};

export const WordByWordPage: React.FC<{
  pageNumber: number;
  onWordClick?: (word: Word) => void;
  onLetterClick?: (word: Word, letterIndex: number) => void; // New: handle letter clicks
  mistakes?: MushafMistake[]; // Current mistakes
  historicalMistakes?: MushafMistake[]; // Historical mistakes from student's personal Mushaf
  showHistorical?: boolean; // Toggle to show/hide historical mistakes
  readOnly?: boolean;
  onMistakesWithWords?: (mistakesWithWords: Array<MushafMistake & { wordText?: string }>) => void;
  onPageChange?: (page: number) => void; // For page navigation
  selectedVerses?: Array<{ surah: number; ayah: number }>; // Verses selected as questions
}> = ({
  pageNumber,
  onWordClick,
  onLetterClick,
  mistakes: mistakesProp = [],
  historicalMistakes: historicalMistakesProp = [],
  showHistorical = true,
  readOnly = false,
  onMistakesWithWords,
  onPageChange,
  selectedVerses = [] as Array<{ surah: number; ayah: number }> as Array<{ surah: number; ayah: number }>
}) => {
  const mistakes = React.useMemo(() => mistakesProp as MushafMistake[], [mistakesProp]);
  const historicalMistakes = React.useMemo(() => historicalMistakesProp as MushafMistake[], [historicalMistakesProp]);
  const [layout, setLayout] = useState<LayoutPage | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [wordsFromApi, setWordsFromApi] = useState<Word[]>([]); // Words from API response as fallback
  const [background, setBackground] = useState<string>("");
  const [chapters, setChapters] = useState<Chapter[]>(FALLBACK_CHAPTERS);
  const defaultFontStack = 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif';
  const [fontFamily, setFontFamily] = useState<string>(defaultFontStack);

  // Load chapters/surahs on mount
  useEffect(() => {
    const loadChapters = async () => {
      if (typeof window === "undefined") return;
      try {
        const loadedChapters = await getQuranChapters();
        if (loadedChapters.length > 0) {
          setChapters(loadedChapters);
        } else {
          setChapters(FALLBACK_CHAPTERS);
        }
      } catch (error) {
        console.error("Error loading chapters:", error);
      }
    };
    loadChapters();
  }, []);

  // Load words data on mount
  useEffect(() => {
    const loadWords = async () => {
      try {
        // Try loading words from QPC V1 glyph database first
        try {
          const qpcWords = await getAllQpcV1Words();
          if (Array.isArray(qpcWords) && qpcWords.length > 0) {
            setWords(qpcWords);
            console.log('✅ Loaded words from QPC V1 glyph database');
            return;
          }
        } catch (dbError) {
          console.warn('⚠️ Unable to load words from QPC V1 database, falling back to JSON words:', dbError);
        }

        // Fallback: Load words from public JSON file (works in both dev and production)
        const wordsRes = await fetch('/data/words/word_by_word.json');
        if (wordsRes.ok) {
          // Check if response is actually JSON (not HTML error page)
          const contentType = wordsRes.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            try {
              const wordsData = await wordsRes.json();
              if (Array.isArray(wordsData)) {
                setWords(wordsData);
              } else {
                // Convert object format to array
                const wordsArray: Word[] = Object.values(wordsData).map((entry: any) => ({
                  word_index: entry.id || entry.word_index,
                  surah: parseInt(entry.surah),
                  ayah: parseInt(entry.ayah),
                  text: entry.text
                }));
                setWords(wordsArray);
              }
              console.log('✅ Loaded words from public folder');
            } catch (jsonError) {
              // If JSON parsing fails, try to get text to see what we got
              const text = await wordsRes.clone().text();
              console.warn('⚠️ Failed to parse JSON response. Response preview:', text.substring(0, 200));
              console.error('JSON parse error:', jsonError);
            }
          } else {
            // Not JSON, get text to see what we got
            const text = await wordsRes.text();
            console.warn('⚠️ Response is not JSON, likely HTML error page. Content-Type:', contentType);
            console.warn('Response preview:', text.substring(0, 200));
          }
        } else {
          console.warn(`⚠️ Words data not available (status: ${wordsRes.status})`);
        }
      } catch (error) {
        console.error('Error loading words:', error);
        // Don't throw - allow component to continue without words data
      }
    };
    
    loadWords();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLayout(null);
    setWordsFromApi([]);
    setBackground("");
    setFontFamily(defaultFontStack);

    const loadLayout = async () => {
      console.log(`🔄 [PAGE ${pageNumber}] Starting layout load from local data files...`);
      
      // PRIMARY: Try SQLite database with local font (user's preference)
      try {
        console.log(`🔄 [PAGE ${pageNumber}] Attempting to load from local SQLite database and font...`);
        const qpcLayout = await getQpcV1Layout(pageNumber);
        if (!cancelled && qpcLayout && qpcLayout.lines.length > 0) {
          console.log(`✅ Successfully loaded QPC V1 layout with ${qpcLayout.lines.length} lines from SQLite`);
          setLayout(qpcLayout);
          try {
            const family = await ensureQpcV1Font(pageNumber);
            if (!cancelled && family) {
              setFontFamily(`${family}, ${defaultFontStack}`);
              console.log(`✅ Loaded QPC V1 font for page ${pageNumber}: ${family}`);
            }
          } catch (fontError) {
            console.warn(`⚠️ Unable to load QPC V1 font for page ${pageNumber}:`, fontError);
            setFontFamily(defaultFontStack);
          }
          return;
        }
      } catch (sqliteError) {
        console.warn(`⚠️ SQLite database failed for page ${pageNumber}, trying MongoDB:`, sqliteError);
      }
      
      // FALLBACK 1: Try MongoDB API (if local files not available)
      try {
        if (import.meta.env?.DEV) {
          console.log(`🔄 [PAGE ${pageNumber}] Attempting to load from MongoDB API...`);
        }
        const pageData = await fetchPageLines(pageNumber, 'v4');

        if (pageData && pageData.lines && pageData.lines.length > 0) {
          if (import.meta.env?.DEV) {
            console.log(`✅ [PAGE ${pageNumber}] Successfully loaded ${pageData.lines.length} lines from MongoDB`);
          }

          // Extract words from API response
          const apiWords: Word[] = [];
          pageData.lines.forEach((line: any) => {
            if (line.words && Array.isArray(line.words)) {
              line.words.forEach((wordData: any) => {
                apiWords.push({
                  word_index: wordData.id || wordData.word_index || wordData.word_id || 0,
                  surah: parseInt(wordData.surah) || 0,
                  ayah: parseInt(wordData.ayah) || 0,
                  text: wordData.text || ''
                });
              });
            }
          });

          if (!cancelled && apiWords.length > 0) {
            setWordsFromApi(apiWords);
            if (import.meta.env?.DEV) {
              console.log(`✅ Extracted ${apiWords.length} words from MongoDB response`);
            }
          }

          // Convert MongoDB response to LayoutPage format
          const layoutJson: LayoutPage = {
            page_number: pageData.pageNumber || pageNumber,
            lines: pageData.lines.map((line: any) => ({
              page_number: pageData.pageNumber || pageNumber,
              line_number: line.line_number,
              first_word_id: (line.first_word_id && line.first_word_id !== '') ? parseInt(line.first_word_id) : null,
              last_word_id: (line.last_word_id && line.last_word_id !== '') ? parseInt(line.last_word_id) : null,
              is_centered: line.is_centered === true || line.is_centered === 1,
              line_type: line.line_type || 'ayah',
              surah_number: line.surah_number || pageData.surahId
            }))
          };

          if (!cancelled) {
            setLayout(layoutJson);
            // Try to load QPC V1 font even when using MongoDB data
            try {
              const family = await ensureQpcV1Font(pageNumber);
              if (!cancelled && family) {
                setFontFamily(`${family}, ${defaultFontStack}`);
                console.log(`✅ Loaded QPC V1 font for page ${pageNumber} from local files`);
              } else {
                setFontFamily(defaultFontStack);
              }
            } catch (fontError) {
              console.warn(`⚠️ Unable to load QPC V1 font for page ${pageNumber}:`, fontError);
              setFontFamily(defaultFontStack);
            }
            if (import.meta.env?.DEV) {
              console.log(`✅ Loaded layout for page ${pageNumber} from MongoDB`);
            }
            return;
          }
        }
      } catch (mongoError) {
        console.warn(`⚠️ MongoDB API failed for page ${pageNumber}:`, mongoError);
      }
      
      // FALLBACK 2: Try JSON file (local file)
      try {
        if (import.meta.env?.DEV) {
          console.log(`🔄 [PAGE ${pageNumber}] Trying JSON file from local files...`);
        }
        const jsonLayoutRes = await fetch(`/data/layouts/page_${pageNumber}.json`);
        if (jsonLayoutRes.ok) {
          const contentType = jsonLayoutRes.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const layoutJson = await jsonLayoutRes.json();
            if (!cancelled && layoutJson && layoutJson.lines && layoutJson.lines.length > 0) {
              setLayout(layoutJson);
              setFontFamily(defaultFontStack);
              console.log(`✅ Loaded layout for page ${pageNumber} from JSON file`);
              return;
            }
          }
        }
      } catch (jsonError) {
        console.warn(`⚠️ JSON layout file not found for page ${pageNumber}:`, jsonError);
      }
      
      // All methods failed
      if (!cancelled) {
        console.error("❌ All layout loading methods failed for page", pageNumber);
        console.error("💡 Make sure you have:");
        console.error("   1. MongoDB database populated with Quran page data (PRIMARY - if using MongoDB)");
        console.error("   2. QPC V1 SQLite database at /data/layouts/qpc-v1-15-lines.db (FALLBACK)");
        console.error("   3. JSON layout file at /data/layouts/page_" + pageNumber + ".json (FALLBACK)");
        setLayout(null);
      }
    };

    loadLayout();

    return () => {
      cancelled = true;
    };
  }, [pageNumber, defaultFontStack]);

  // Collect mistakes with their word text for the parent component
  useEffect(() => {
    const availableWords = words.length > 0 ? words : wordsFromApi;
    if (availableWords.length > 0 && mistakes.length > 0 && onMistakesWithWords) {
      // Try to load word-by-word JSON file which has complete words (not glyphs)
      const loadWordByWordFile = async () => {
        try {
          const response = await fetch('/data/words/word_by_word.json');
          if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const wordByWordData = await response.json();
              // word_by_word.json should have complete words with word_index, surah, ayah, text
              // Use this for mistake reports instead of reconstructing from glyphs
              if (Array.isArray(wordByWordData) && wordByWordData.length > 0) {
                console.log(`✅ Loaded ${wordByWordData.length} complete words from word_by_word.json`);
                return wordByWordData as Word[];
              } else if (typeof wordByWordData === 'object') {
                // Convert object format to array
                const wordsArray: Word[] = Object.values(wordByWordData).map((entry: any) => ({
                  word_index: entry.id || entry.word_index || 0,
                  surah: parseInt(entry.surah) || 0,
                  ayah: parseInt(entry.ayah) || 0,
                  text: entry.text || ''
                }));
                console.log(`✅ Loaded ${wordsArray.length} complete words from word_by_word.json (converted from object)`);
                return wordsArray;
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ Could not load word_by_word.json, using glyph-based reconstruction:', error);
        }
        return null;
      };
      
      loadWordByWordFile().then(wordByWordWords => {
        // Use word-by-word file if available, otherwise fall back to glyph-based approach
        const wordsToUse = wordByWordWords || availableWords;
        
        // Create a simple map for quick lookup: surah:ayah:word_index -> word text
        const wordTextMap = new Map<string, string>();
        wordsToUse.forEach(w => {
          const key = `${w.surah}:${w.ayah}:${w.word_index}`;
          wordTextMap.set(key, w.text);
        });
        
        console.log(`📊 Built wordTextMap with ${wordTextMap.size} words for mistake lookup`);
      
        const mistakesWithWordText = mistakes
          .filter(m => m.page === pageNumber)
          .map(m => {
            // Find the word text for this mistake
            let wordText: string | undefined = undefined;
            
            if (m.wordIndex !== undefined && m.wordIndex !== null) {
              // Try direct lookup in word-by-word file first
              const directKey = `${m.surah}:${m.ayah}:${m.wordIndex}`;
              wordText = wordTextMap.get(directKey);
              
              if (wordText) {
                console.log(`✅ Found word from word_by_word.json:`, {
                  surah: m.surah,
                  ayah: m.ayah,
                  wordIndex: m.wordIndex,
                  wordText
                });
              } else {
                // If not found, try to find the closest word in the ayah
                const ayahWords = wordsToUse.filter(
                  w => w.surah === m.surah && w.ayah === m.ayah
                ).sort((a, b) => a.word_index - b.word_index);
                
                if (ayahWords.length > 0) {
                  // Find the word whose word_index is closest to m.wordIndex
                  const closestWord = ayahWords.reduce((prev, curr) => {
                    const prevDiff = Math.abs(prev.word_index - m.wordIndex!);
                    const currDiff = Math.abs(curr.word_index - m.wordIndex!);
                    return currDiff < prevDiff ? curr : prev;
                  });
                  
                  wordText = closestWord.text;
                  console.log(`📝 Using closest word from word_by_word.json:`, {
                    surah: m.surah,
                    ayah: m.ayah,
                    mistakeWordIndex: m.wordIndex,
                    foundWordIndex: closestWord.word_index,
                    wordText
                  });
                }
              }
            }
            
            return {
              ...m,
              wordText: wordText
            };
          });
        onMistakesWithWords(mistakesWithWordText);
      });
    }
  }, [words, wordsFromApi, mistakes, pageNumber, onMistakesWithWords, layout]);

  // Function to get mistake for a specific letter in a word
  const getLetterMistake = (word: Word, letterIndex: number): { mistake: MushafMistake | undefined; isHistorical: boolean } => {
    // First try to find exact letter-level match in current mistakes
    const letterMatch = mistakes.find(
      (m) =>
        m.page === pageNumber &&
        m.surah === word.surah &&
        m.ayah === word.ayah &&
        m.wordIndex === word.word_index &&
        m.letterIndex === letterIndex &&
        m.wordIndex !== undefined &&
        m.letterIndex !== undefined
    );
    
    if (letterMatch) {
      return { mistake: letterMatch, isHistorical: false };
    }
    
    // Check historical mistakes
    if (showHistorical && historicalMistakes.length > 0) {
      const historicalLetterMatch = historicalMistakes.find(
        (m) =>
          m.page === pageNumber &&
          m.surah === word.surah &&
          m.ayah === word.ayah &&
          m.wordIndex === word.word_index &&
          m.letterIndex === letterIndex &&
          m.wordIndex !== undefined &&
          m.letterIndex !== undefined
      );
      
      if (historicalLetterMatch) {
        return { mistake: historicalLetterMatch, isHistorical: true };
      }
    }
    
    return { mistake: undefined, isHistorical: false };
  };

  // Function to get mistake for a word (prioritize current mistakes over historical)
  const getWordMistake = (word: Word): { mistake: MushafMistake | undefined; isHistorical: boolean } => {
    // First try to find exact match with wordIndex in current mistakes (non-letter-level)
    const exactMatch = mistakes.find(
      (m) =>
        m.page === pageNumber &&
        m.surah === word.surah &&
        m.ayah === word.ayah &&
        m.wordIndex === word.word_index &&
        m.wordIndex !== undefined &&
        m.wordIndex !== null &&
        (m.letterIndex === undefined || m.letterIndex === null) // Only word-level mistakes
    );
    
    if (exactMatch) {
      return { mistake: exactMatch, isHistorical: false };
    }
    
    // If no exact match, check for mistakes without wordIndex (whole ayah mistakes)
    // Only return if there's no wordIndex mistake for this ayah
    const hasWordIndexMistake = mistakes.some(
      (m) =>
        m.page === pageNumber &&
        m.surah === word.surah &&
        m.ayah === word.ayah &&
        m.wordIndex !== undefined &&
        m.wordIndex !== null
    );
    
    if (!hasWordIndexMistake) {
      const ayahMatch = mistakes.find(
        (m) =>
          m.page === pageNumber &&
          m.surah === word.surah &&
          m.ayah === word.ayah &&
          (m.wordIndex === undefined || m.wordIndex === null)
      );
      if (ayahMatch) {
        return { mistake: ayahMatch, isHistorical: false };
      }
    }
    
    // If no current mistake and showHistorical is true, check historical mistakes
    if (showHistorical && historicalMistakes.length > 0) {
      const historicalExactMatch = historicalMistakes.find(
        (m) =>
          m.page === pageNumber &&
          m.surah === word.surah &&
          m.ayah === word.ayah &&
          m.wordIndex === word.word_index &&
          m.wordIndex !== undefined &&
          m.wordIndex !== null
      );
      
      if (historicalExactMatch) {
        return { mistake: historicalExactMatch, isHistorical: true };
      }
      
      // Check for historical ayah-level mistakes
      const hasHistoricalWordIndex = historicalMistakes.some(
        (m) =>
          m.page === pageNumber &&
          m.surah === word.surah &&
          m.ayah === word.ayah &&
          m.wordIndex !== undefined &&
          m.wordIndex !== null
      );
      
      if (!hasHistoricalWordIndex) {
        const historicalAyahMatch = historicalMistakes.find(
          (m) =>
            m.page === pageNumber &&
            m.surah === word.surah &&
            m.ayah === word.ayah &&
            (m.wordIndex === undefined || m.wordIndex === null)
        );
        if (historicalAyahMatch) {
          return { mistake: historicalAyahMatch, isHistorical: true };
        }
      }
    }
    
    return { mistake: undefined, isHistorical: false };
  };

  // Function to get CSS class for mistake highlighting (Mushaf-style colors)
  const getMistakeClass = (mistake: MushafMistake | undefined, isHistorical: boolean = false): string => {
    if (!mistake) {
      return "hover:bg-yellow-100 hover:shadow-sm";
    }

    const isTajweed = ["madd", "ikhfa", "holding", "tech"].includes(mistake.type);

    if (isHistorical) {
      if (mistake.type === "memory") {
        return "bg-red-100/60 hover:bg-red-200/60 border border-dashed border-red-400 text-red-800 shadow-sm";
      }
      if (isTajweed) {
        return "bg-yellow-100/60 hover:bg-yellow-200/60 border border-dashed border-yellow-400 text-yellow-800 shadow-sm";
      }
      return "bg-gray-200/60 hover:bg-gray-300/60 border border-dashed border-gray-400 text-gray-700 shadow-sm";
    }

    if (mistake.type === "memory") {
      return "bg-red-200 hover:bg-red-300 border border-red-500 text-red-900 font-semibold shadow-sm";
    }
    if (isTajweed) {
      return "bg-yellow-200 hover:bg-yellow-300 border border-yellow-500 text-yellow-900 font-semibold shadow-sm";
    }
    return "bg-gray-200 hover:bg-gray-300 border border-gray-500 text-gray-800 shadow-sm";
  };
  
  // Function to get remark text for mistake types
  const getMistakeRemark = (mistake: MushafMistake | undefined): string => {
    // No remarks for default mistake types
    return "";
  };

  // Show loading state only if layout is not loaded yet
  if (!layout) {
    return (
      <div className="text-center p-6">
        <div className="animate-pulse">
          <div className="text-lg text-gray-600 mb-2">Loading Mushaf Page {pageNumber}...</div>
          <div className="text-sm text-gray-500">Fetching page layout from server</div>
        </div>
      </div>
    );
  }

  // Use words from API as fallback if word file not loaded
  const availableWords = words.length > 0 ? words : wordsFromApi;
  
  // Show warning if neither words file nor API words are available
  if (words.length === 0 && wordsFromApi.length === 0) {
    console.warn('⚠️ Words data not loaded yet - page may not display correctly');
  }

  return (
    <div className="relative w-full flex flex-col items-center justify-center overflow-hidden" dir="rtl">
      {/* Optional background image */}
      {background && (
        <img
          src={background}
          alt={`Page ${pageNumber}`}
          className="max-w-full h-auto rounded-xl shadow-lg mb-4 mx-auto"
        />
      )}

      {/* Mushaf-style Arabic text container - Centered */}
      <div className="w-full flex justify-center items-center">
        {/* Mushaf page container with traditional styling - Clean white background, thin yellow border */}
        <div 
          className="mushaf-arabic-text"
          dir="rtl"
          style={{
            backgroundColor: '#ffffff',
            fontFamily,
            minHeight: 'auto',
            direction: 'rtl',
            textAlign: 'right',
            maxWidth: '100%',
            width: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden',
            fontFeatureSettings: '"liga" 1, "kern" 1',
            margin: '0 auto',
            display: 'block',
            paddingTop: '0.75rem',
            paddingBottom: '0.75rem',
            paddingRight: '0.5rem',
            paddingLeft: '1.25rem',
            border: '1px solid #fef3c7',
            borderTop: '2px solid #fef3c7',
            borderLeft: '2px solid #fef3c7'
          }}
        >

          {/* Arabic text content - Traditional Quranic layout */}
          <div 
            className="mushaf-arabic-text"
            style={{
              fontSize: 'clamp(1rem, 1.8vw + 0.3rem, 1.6rem)',
              lineHeight: '1.5',
              letterSpacing: '0',
              wordSpacing: '0.15em',
              direction: 'rtl',
              textAlign: 'right',
              fontFamily: fontFamily,
              maxWidth: '100%',
              fontFeatureSettings: '"liga" 1, "kern" 1',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.15em',
              margin: '0 auto',
              color: '#000000'
            }}
          >
            {layout.lines.map((line) => {
              if (line.line_type !== "ayah") {
                // Handle surah_name and basmallah lines - Traditional Quranic decorative layout
                if (line.line_type === "surah_name") {
                  const surah = chapters.find(c => c.id === line.surah_number);
                  // Get Arabic name from surah, or fallback to FALLBACK_CHAPTERS if not found
                  const arabicName = surah?.name_arabic || 
                    (FALLBACK_CHAPTERS.find(fc => fc.id === line.surah_number)?.name_arabic) ||
                    `Surah ${line.surah_number}`;
                  return (
                    <div 
                      key={line.line_number} 
                      className="mushaf-line mushaf-surah-name"
                      style={{
                        textAlign: 'center',
                        marginBottom: '0.4em',
                        marginTop: '0.3em',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        position: 'relative'
                      }}
                    >
                      {/* Decorative panel with ornate patterns */}
                      <div style={{
                        width: '100%',
                        maxWidth: '100%',
                        height: '2.8em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        background: 'transparent',
                        padding: '0 0.5em'
                      }}>
                        {/* Left decorative pattern - ornate floral design */}
                        <div style={{
                          position: 'absolute',
                          left: '0',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '20%',
                          height: '1.2em',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-start'
                        }}>
                          {/* Decorative line with pattern */}
                          <div style={{
                            width: '100%',
                            height: '1px',
                            background: '#000000',
                            opacity: 0.25,
                            position: 'relative'
                          }}>
                            {/* Small decorative circles */}
                            <div style={{
                              position: 'absolute',
                              left: '10%',
                              top: '-4px',
                              width: '8px',
                              height: '8px',
                              border: '1px solid #000000',
                              borderRadius: '50%',
                              opacity: 0.3,
                              background: 'transparent'
                            }} />
                            <div style={{
                              position: 'absolute',
                              left: '30%',
                              top: '-4px',
                              width: '6px',
                              height: '6px',
                              border: '1px solid #000000',
                              borderRadius: '50%',
                              opacity: 0.25,
                              background: 'transparent'
                            }} />
                            <div style={{
                              position: 'absolute',
                              left: '50%',
                              top: '-4px',
                              width: '4px',
                              height: '4px',
                              border: '1px solid #000000',
                              borderRadius: '50%',
                              opacity: 0.2,
                              background: 'transparent'
                            }} />
                          </div>
                        </div>
                        
                        {/* Central frame for surah name */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.35em 1.4em',
                          border: '1px solid #000000',
                          borderRadius: '1px',
                          background: '#ffffff',
                          position: 'relative',
                          zIndex: 1,
                          minWidth: 'fit-content'
                        }}>
                          <span style={{
                            fontFamily: "'QPC V2 Font', 'Surah Names', Amiri, 'Arabic Typesetting', 'Traditional Arabic', serif",
                            fontSize: 'clamp(1rem, 1.8vw + 0.3rem, 1.6rem)',
                            fontWeight: 'normal',
                            color: '#000000',
                            letterSpacing: '0.05em',
                            lineHeight: '1.6',
                            display: 'block',
                            textAlign: 'center',
                            whiteSpace: 'nowrap'
                          }}>
                            {arabicName}
                          </span>
                        </div>
                        
                        {/* Right decorative pattern - ornate floral design */}
                        <div style={{
                          position: 'absolute',
                          right: '0',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '20%',
                          height: '1.2em',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end'
                        }}>
                          {/* Decorative line with pattern */}
                          <div style={{
                            width: '100%',
                            height: '1px',
                            background: '#000000',
                            opacity: 0.25,
                            position: 'relative'
                          }}>
                            {/* Small decorative circles */}
                            <div style={{
                              position: 'absolute',
                              right: '10%',
                              top: '-4px',
                              width: '8px',
                              height: '8px',
                              border: '1px solid #000000',
                              borderRadius: '50%',
                              opacity: 0.3,
                              background: 'transparent'
                            }} />
                            <div style={{
                              position: 'absolute',
                              right: '30%',
                              top: '-4px',
                              width: '6px',
                              height: '6px',
                              border: '1px solid #000000',
                              borderRadius: '50%',
                              opacity: 0.25,
                              background: 'transparent'
                            }} />
                            <div style={{
                              position: 'absolute',
                              right: '50%',
                              top: '-4px',
                              width: '4px',
                              height: '4px',
                              border: '1px solid #000000',
                              borderRadius: '50%',
                              opacity: 0.2,
                              background: 'transparent'
                            }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else if (line.line_type === "basmallah") {
                  return (
                    <div 
                      key={line.line_number} 
                      className="mushaf-line mushaf-basmallah"
                      style={{
                        textAlign: 'center',
                        marginBottom: '0.4em',
                        marginTop: '0.3em',
                        minHeight: '1.5em',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%'
                      }}
                    >
                      <span style={{ 
                        textAlign: 'center', 
                        display: 'inline-block',
                        fontFamily: "'Scheherazade New', Amiri, 'Arabic Typesetting', 'Traditional Arabic', serif",
                        fontSize: 'clamp(1rem, 1.8vw + 0.3rem, 1.6rem)',
                        fontWeight: 'normal',
                        letterSpacing: '0.12em',
                        lineHeight: '1.6',
                        color: '#000000',
                        fontFeatureSettings: '"liga" 1, "kern" 1',
                        fontVariantLigatures: 'common-ligatures'
                      }}>
                        بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
                      </span>
                    </div>
                  );
                }
                return null;
              }

              // Skip if no word IDs (shouldn't happen for ayah lines, but safety check)
              if (!line.first_word_id || !line.last_word_id) {
                return null;
              }

              // Get words for this line - use words from file if available, otherwise use API words
              const availableWords = words.length > 0 ? words : wordsFromApi;
              const lineWords = availableWords
                .filter(
                  (w) =>
                    w.word_index >= line.first_word_id! &&
                    w.word_index <= line.last_word_id!
                )
                .sort((a, b) => a.word_index - b.word_index);

              // Group words by ayah to use glyph text
              const wordsByAyah = new Map<string, Word[]>();
              lineWords.forEach((w) => {
                const ayahKey = `${w.surah}:${w.ayah}`;
                if (!wordsByAyah.has(ayahKey)) {
                  wordsByAyah.set(ayahKey, []);
                }
                wordsByAyah.get(ayahKey)!.push(w);
              });

              return (
                <div
                  key={line.line_number}
                  className="mushaf-line"
                  style={{
                    direction: 'rtl',
                    textAlign: line.is_centered ? 'center' : 'justify',
                    textAlignLast: line.is_centered ? 'center' : 'justify',
                    fontFamily: fontFamily,
                    wordSpacing: '0.15em',
                    letterSpacing: '0',
                    marginBottom: '0.15em',
                    minHeight: '1.2em',
                    lineHeight: '1.5',
                    display: 'block',
                    width: '100%',
                    color: '#000000'
                  }}
                >
                  {lineWords.map((w, idx) => {
                    const { mistake: wordMistake, isHistorical: isWordHistorical } = getWordMistake(w);
                    const wordMistakeClass = getMistakeClass(wordMistake, isWordHistorical);
                    // Check if this verse is selected as a question
                    const isVerseSelected = selectedVerses.some(v => v.surah === w.surah && v.ayah === w.ayah);
                    const verseSelectedClass = isVerseSelected ? 'ring-2 ring-blue-400 ring-offset-1 bg-blue-50/50' : '';
                    
                    // Use regular Arabic text from word data
                    // Note: Individual glyphs (single characters) are expected for proper mushaf rendering
                    const displayText = w.text || '';
                    const letters = splitArabicText(displayText);
                    
                    // Debug: Only log in development mode for troubleshooting unusual cases
                    if (import.meta.env?.DEV && letters.length === 0 && displayText.trim().length > 0) {
                      console.warn(`Word "${displayText}" could not be split into letters`);
                    }
                    
                    // Check if this word has any letter-level mistakes
                    const hasLetterMistakes = mistakes.some(m => 
                      m.page === pageNumber &&
                      m.surah === w.surah &&
                      m.ayah === w.ayah &&
                      m.wordIndex === w.word_index &&
                      m.letterIndex !== undefined
                    ) || (showHistorical && historicalMistakes.some(m => 
                      m.page === pageNumber &&
                      m.surah === w.surah &&
                      m.ayah === w.ayah &&
                      m.wordIndex === w.word_index &&
                      m.letterIndex !== undefined
                    ));
                    
                  return (
                    <React.Fragment key={w.word_index}>
                        <span
                          onClick={(e) => {
                            // Detect which letter was clicked based on click position
                            if (!readOnly && onLetterClick && letters.length > 0) {
                              const wordSpan = e.currentTarget;
                              const rect = wordSpan.getBoundingClientRect();
                              const clickX = e.clientX - rect.left;
                              
                              // For RTL text, calculate which letter was clicked
                              // Get all letter spans
                              const letterSpans = wordSpan.querySelectorAll('span[data-letter-index]');
                              let clickedLetterIndex: number | undefined = undefined;
                              
                              // Find which letter span contains the click
                              letterSpans.forEach((span) => {
                                const spanRect = span.getBoundingClientRect();
                                const spanLeft = spanRect.left - rect.left;
                                const spanRight = spanRect.right - rect.left;
                                
                                // Check if click is within this letter's bounds
                                if (clickX >= spanLeft && clickX <= spanRight) {
                                  const idx = parseInt(span.getAttribute('data-letter-index') || '-1');
                                  if (idx >= 0) {
                                    clickedLetterIndex = idx;
                                  }
                                }
                              });
                              
                              // If we found a letter, use letter click handler, otherwise use word click
                              if (clickedLetterIndex !== undefined) {
                                onLetterClick(w, clickedLetterIndex);
                              } else {
                                // Fallback: calculate approximate letter index based on position
                                // For RTL, rightmost is index 0
                                const relativeX = rect.width - clickX;
                                const approximateIndex = Math.floor((relativeX / rect.width) * letters.length);
                                const safeIndex = Math.max(0, Math.min(letters.length - 1, approximateIndex));
                                onLetterClick(w, safeIndex);
                              }
                            } else {
                              onWordClick?.(w);
                            }
                          }}
                          className={`cursor-pointer transition-all duration-200 ${wordMistakeClass} ${verseSelectedClass} relative group inline-block`}
                          dir="rtl"
                          title={
                            isVerseSelected 
                              ? `Selected as Question - Surah ${w.surah}, Ayah ${w.ayah}`
                              : wordMistake
                                ? `${isWordHistorical ? '📜 Historical ' : ''}Surah ${w.surah}, Ayah ${w.ayah} - ${wordMistake.type} mistake${wordMistake.note ? `: ${wordMistake.note}` : ""}${wordMistake.audioUrl ? ' (Click to hear audio)' : ''}`
                                : `Surah ${w.surah}, Ayah ${w.ayah}${hasLetterMistakes ? ' (Click letters to mark letter mistakes)' : ''}`
                          }
                          style={{
                            padding: '1px 2px',
                            direction: 'rtl',
                            display: 'inline-block',
                            unicodeBidi: 'embed',
                            fontFamily: fontFamily,
                            fontSize: 'inherit',
                            lineHeight: 'inherit',
                            borderRadius: '0',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {/* Render word as individual letters for letter-level interaction */}
                          {letters.map((letter, letterIdx) => {
                            const { mistake: letterMistake, isHistorical: isLetterHistorical } = getLetterMistake(w, letterIdx);
                            const letterMistakeClass = letterMistake ? getMistakeClass(letterMistake, isLetterHistorical) : '';
                            
                            return (
                              <span
                                key={letterIdx}
                                data-letter-index={letterIdx}
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent word click
                                  if (!readOnly && onLetterClick) {
                                    onLetterClick(w, letterIdx);
                                  } else {
                                    onWordClick?.(w);
                                  }
                                }}
                                className={`${letterMistake ? letterMistakeClass : ''} ${!readOnly && onLetterClick ? 'cursor-pointer hover:bg-yellow-100' : ''} transition-all duration-200 inline-block`}
                                style={{
                                  padding: letterMistake ? '2px 1px' : '0',
                                  borderRadius: '0',
                                  display: 'inline-block',
                                  fontFamily: fontFamily,
                                  fontSize: 'inherit',
                                  lineHeight: 'inherit',
                                }}
                                title={
                                  letterMistake
                                    ? `${isLetterHistorical ? '📜 Historical ' : ''}Letter ${letterIdx + 1} - ${letterMistake.type} mistake${letterMistake.note ? `: ${letterMistake.note}` : ""}`
                                    : `Letter ${letterIdx + 1}: ${letter}`
                                }
                              >
                                {letter}
                              </span>
                            );
                          })}
                          {wordMistake && wordMistake.audioUrl && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                              </svg>
                            </span>
                          )}
                          {/* Mistake Details Popup */}
                          {wordMistake && readOnly && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-white border border-gray-300 rounded-lg shadow-xl p-3 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                              <div className="text-xs">
                                {isWordHistorical && (
                                  <div className="text-blue-600 font-semibold mb-1 text-[10px]">
                                    📜 Historical Mistake
                                  </div>
                                )}
                                <div className="font-semibold text-gray-900 mb-1">
                                  {getMistakeTypeLabel(wordMistake.type)}
                                </div>
                                {wordMistake.note && (
                                  <div className="text-gray-600 mb-2">{wordMistake.note}</div>
                                )}
                                {wordMistake.audioUrl && (
                                  <div className="mt-2">
                                    <div className="text-xs text-gray-500 mb-1">Audio correction:</div>
                                    <audio 
                                      controls 
                                      preload="metadata"
                                      onError={(e) => {
                                        console.error('Audio load error:', wordMistake.audioUrl, e);
                                        const target = e.target as HTMLAudioElement;
                                        if (target) {
                                          target.style.opacity = '0.5';
                                          target.title = 'Audio file not found or cannot be loaded';
                                        }
                                      }}
                                      onLoadedMetadata={() => {
                                        console.log('Audio loaded successfully:', wordMistake.audioUrl);
                                      }}
                                      src={
                                        (() => {
                                          let url = wordMistake.audioUrl || '';
                                          // If already a full URL, check if it has /api and remove it
                                          if (url.startsWith('http://') || url.startsWith('https://')) {
                                            // Fix URLs that incorrectly include /api/uploads
                                            url = url.replace('/api/uploads/', '/uploads/');
                                            return url;
                                          }
                                          // Get base URL
                                          let baseUrl = 'http://localhost:3001';
                                          if (typeof window !== 'undefined' && (window as any).MUSHAF_API_BASE) {
                                            baseUrl = (window as any).MUSHAF_API_BASE;
                                          } else if (import.meta.env?.VITE_API_BASE_URL) {
                                            baseUrl = import.meta.env.VITE_API_BASE_URL;
                                          }
                                          // Remove /api from base URL if present (uploads are served from root, not /api)
                                          if (baseUrl.endsWith('/api')) {
                                            baseUrl = baseUrl.replace('/api', '');
                                          }
                                          // Ensure base URL doesn't end with /
                                          baseUrl = baseUrl.replace(/\/$/, '');
                                          // Ensure audio URL starts with /
                                          const audioPath = url.startsWith('/') ? url : `/${url}`;
                                          return `${baseUrl}${audioPath}`;
                                        })()
                                      } 
                                      className="w-full h-8"
                                    >
                                      Your browser does not support the audio element.
                                    </audio>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </span>
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })}
          </div>


          {/* Page Navigation Buttons - Centered, RTL */}
          {onPageChange && (
            <div className="mt-4 sm:mt-6 flex justify-center items-center gap-4" dir="rtl">
              <button
                onClick={() => onPageChange(Math.min(604, pageNumber + 1))}
                disabled={pageNumber >= 604}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-primary text-white rounded-full font-semibold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  minWidth: '120px'
                }}
                dir="rtl"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>التالي</span>
              </button>
              
              <span className="px-3 sm:px-4 py-2 text-sm sm:text-base font-semibold text-primary" dir="ltr">
                Page {pageNumber} / 604
              </span>
              
              <button
                onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
                disabled={pageNumber <= 1}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-primary text-white rounded-full font-semibold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  minWidth: '120px'
                }}
                dir="rtl"
              >
                <span>السابق</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InteractiveMushaf: React.FC<InteractiveMushafProps> = ({
  currentPage,
  onPageChange,
  mistakes,
  historicalMistakes: historicalMistakesProp = [],
  onMistakeMark,
  readOnly = false,
  mode = 'marking',
  studentName,
  onBack,
  showHistorical: showHistoricalProp = true,
  onVerseSelect,
  selectedVerses = [] as Array<{ surah: number; ayah: number }>
}) => {
  const historicalMistakes = React.useMemo(() => historicalMistakesProp as MushafMistake[], [historicalMistakesProp]);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [selectedLetterIndex, setSelectedLetterIndex] = useState<number | undefined>(undefined);
  const [localMistakes, setLocalMistakes] = useState<Mistake[]>([]);
  const [showSurahIndex, setShowSurahIndex] = useState(false); // Hidden by default, user can toggle
  const [chapters, setChapters] = useState<Chapter[]>(FALLBACK_CHAPTERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [showHistorical, setShowHistorical] = useState(showHistoricalProp);
  const [isIndexMinimized, setIsIndexMinimized] = useState(false);

  // Load chapters/surahs on mount
  useEffect(() => {
    const loadChapters = async () => {
      if (typeof window === "undefined") return;
      try {
        const loadedChapters = await getQuranChapters();
        if (loadedChapters.length > 0) {
          setChapters(loadedChapters);
        } else {
          setChapters(FALLBACK_CHAPTERS);
        }
      } catch (error) {
        console.error("Error loading chapters:", error);
        setChapters(FALLBACK_CHAPTERS);
      }
    };
    loadChapters();
  }, []);

  // Convert existing mistakes to local format for display
  // This will be updated when WordByWordPage provides mistakes with word text
  const [mistakesWithWords, setMistakesWithWords] = useState<Array<MushafMistake & { wordText?: string }>>([]);
  
  useEffect(() => {
    // Update localMistakes from mistakesWithWords (which has word text)
    const convertedMistakes: Mistake[] = mistakesWithWords
      .filter(m => m.page === currentPage)
      .map(m => {
        // Ensure wordText is valid - if it's a single character or corrupted, try to get it from words array
        let wordText = m.wordText;
        if (!wordText || wordText.length <= 1 || /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]$/.test(wordText)) {
          // Word text is missing or appears to be a single character - try to find the word
          // This will be handled by the WordByWordPage component providing wordText
          wordText = m.wordText || `Word ${m.wordIndex || 'N/A'}`;
        }
        return {
          word_index: m.wordIndex || 0,
          surah: m.surah,
          ayah: m.ayah,
          text: wordText,
          type: getMistakeTypeLabel(m.type),
          note: m.note
        };
      });
    setLocalMistakes(convertedMistakes);
  }, [mistakesWithWords, currentPage]);

  const handleWordClick = (word: Word) => {
    if (!readOnly && mode === 'marking') {
      // If onVerseSelect is provided, call it for verse selection (testing mode)
      if (onVerseSelect) {
        onVerseSelect(word.surah, word.ayah, currentPage);
        return; // Don't open mistake modal in verse selection mode
      }
      // Otherwise, handle as mistake marking
      setSelectedWord(word);
      setSelectedLetterIndex(undefined); // Reset letter selection for word-level mistakes
    }
  };

  const handleLetterClick = (word: Word, letterIndex: number) => {
    if (!readOnly && mode === 'marking') {
      setSelectedWord(word);
      setSelectedLetterIndex(letterIndex);
    }
  };

  const handleSaveMistake = async (word: Word, type: string, note?: string, audioBlob?: Blob, letterIndex?: number) => {
    // Map the mistake type string to the MistakeType enum
    const typeMap: Record<string, 'madd' | 'holding' | 'memory' | 'ikhfa' | 'tech' | 'other' | 'letter' | 'heavy_letter' | 'no_rounding_lips' | 'heavy_h' | 'light_l' | 'atkee'> = {
      "Memory Mistake": "memory",
      "Mad (Elongation) Mistake": "madd",
      "Ikhfa Mistake": "ikhfa",
      "Ghunna Mistake": "tech",
      "Holding/Fluency Mistake": "holding",
      "Letter Mistake": "letter",
      "Heavy Letter": "heavy_letter",
      "No Rounding Lips": "no_rounding_lips",
      "Heavy H": "heavy_h",
      "Light L": "light_l",
      "Atkee": "atkee",
      "Other Mistake": "other",
    };

    const mistakeType = typeMap[type] || 'other';

    let audioUrl: string | undefined;
    
    // Upload audio if provided
    if (audioBlob) {
      try {
        audioUrl = await uploadMistakeAudio(audioBlob);
        console.log('✅ Audio uploaded successfully:', audioUrl);
      } catch (error) {
        console.error('❌ Failed to upload audio:', error);
        alert('Failed to upload audio recording. The mistake will be saved without audio.');
      }
    }

    const newMistake: Omit<MushafMistake, 'id' | 'timestamp'> = {
      type: mistakeType,
      page: currentPage,
      surah: word.surah,
      ayah: word.ayah,
      wordIndex: word.word_index,
      letterIndex: letterIndex !== undefined ? letterIndex : undefined, // Include letterIndex for letter-level mistakes
      position: { x: 50, y: 50 }, // Default position for word-based mistakes
      note: note || '',
      audioUrl: audioUrl
    };
    
    onMistakeMark(newMistake);
    
    // Add to local mistakes for display with word text
    // Note: This will be replaced by mistakesWithWords when available
    // But we add it here for immediate display
    // Try to reconstruct the full word from glyphs
    const wordText = word.text || `Word ${word.word_index}`;
    
    setLocalMistakes((prev) => {
      // Check if this mistake already exists (avoid duplicates)
      // For letter mistakes, also check letterIndex
      const exists = prev.some(m => 
        m.surah === word.surah && 
        m.ayah === word.ayah && 
        m.word_index === word.word_index &&
        (letterIndex === undefined || m.type === type) // Simple check for now
      );
      if (exists) return prev;
      
      return [
        ...prev,
        { 
          word_index: word.word_index,
          surah: word.surah,
          ayah: word.ayah,
          text: wordText, // Will be replaced by mistakesWithWords with full word
          type, 
          note 
        },
      ];
    });
    
    setSelectedWord(null);
    setSelectedLetterIndex(undefined);
  };

  // Get current surah from page number
  const getCurrentSurah = (page: number): Chapter | null => {
    return chapters.find(ch => 
      page >= ch.pages[0] && page <= ch.pages[1]
    ) || null;
  };

  // Navigate to surah's first page
  const navigateToSurah = (surah: Chapter) => {
    if (surah.pages && surah.pages[0]) {
      onPageChange(surah.pages[0]);
      // Always close index when selecting a surah
      setShowSurahIndex(false);
      setSearchTerm("");
    }
  };

  // Filter chapters based on search term
  const filteredChapters = chapters.filter(ch => {
    const searchLower = searchTerm.toLowerCase();
    return (
      ch.name_simple.toLowerCase().includes(searchLower) ||
      ch.name_arabic.includes(searchTerm) ||
      ch.translated_name?.name?.toLowerCase().includes(searchLower) ||
      ch.id.toString().includes(searchTerm)
    );
  });

  const currentSurah = getCurrentSurah(currentPage);

  // Calculate Juz from page number (approximate)
  // Each juz is roughly 20 pages (604 total pages / 30 juz = ~20 pages per juz)
  const getJuzFromPage = (page: number): number => {
    if (page <= 22) return 1;
    if (page <= 42) return 2;
    if (page <= 62) return 3;
    if (page <= 82) return 4;
    if (page <= 102) return 5;
    if (page <= 122) return 6;
    if (page <= 142) return 7;
    if (page <= 162) return 8;
    if (page <= 182) return 9;
    if (page <= 202) return 10;
    if (page <= 222) return 11;
    if (page <= 242) return 12;
    if (page <= 262) return 13;
    if (page <= 282) return 14;
    if (page <= 302) return 15;
    if (page <= 322) return 16;
    if (page <= 342) return 17;
    if (page <= 362) return 18;
    if (page <= 382) return 19;
    if (page <= 402) return 20;
    if (page <= 422) return 21;
    if (page <= 442) return 22;
    if (page <= 462) return 23;
    if (page <= 482) return 24;
    if (page <= 502) return 25;
    if (page <= 522) return 26;
    if (page <= 542) return 27;
    if (page <= 562) return 28;
    if (page <= 582) return 29;
    return 30;
  };

  const currentJuz = getJuzFromPage(currentPage);

  return (
    <div className="relative w-full overflow-x-hidden" dir="rtl">
      {/* Compact Controls Bar - Only show controls, no duplicate navigation - Mobile responsive */}
      <div className="mb-2 sm:mb-4 flex items-center justify-between gap-2 sm:gap-3 flex-wrap" dir="ltr">
        <div className="flex items-center gap-2">
          {/* Historical Mistakes Toggle */}
          {historicalMistakes.length > 0 && (
            <button
              onClick={() => setShowHistorical(!showHistorical)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                showHistorical 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title={showHistorical ? 'Hide historical mistakes' : 'Show historical mistakes'}
            >
              <span className="hidden sm:inline">Historical </span>
              ({historicalMistakes.length})
            </button>
          )}
          {/* Surah Index Toggle Button - Always visible */}
          <button
            onClick={() => setShowSurahIndex(!showSurahIndex)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shadow-sm ${
              showSurahIndex 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={showSurahIndex ? 'Hide surah index' : 'Show surah index'}
            dir="rtl"
          >
            <span className="hidden sm:inline">Surah </span>Index
            {showSurahIndex && chapters.length > 0 && (
              <span className="mr-1 text-[10px] opacity-75" dir="ltr">
                ({chapters.length})
              </span>
            )}
          </button>
        </div>
        
        {/* Back button if provided */}
        {onBack && (
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" 
            title="Back"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back
          </button>
        )}
      </div>



      <div className="relative flex flex-col lg:flex-row gap-2 sm:gap-4 w-full" dir="rtl">
        {/* Surah Index Sidebar - Modal on mobile, sidebar on desktop */}
        {showSurahIndex && (
          <>
            {/* Mobile Overlay */}
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setShowSurahIndex(false)}
            />
            {/* Index Container */}
            <div className={`bg-white border border-gray-200 rounded-lg shadow-lg transition-all duration-300 flex flex-col ${
              isIndexMinimized ? 'w-12' : 'w-[calc(100%-2.5rem)] sm:w-56 lg:w-64'
            } flex-shrink-0 ${
              'fixed lg:relative left-4 right-4 sm:left-auto sm:right-auto top-16 sm:top-20 lg:inset-x-0 lg:top-0 z-50 lg:z-auto lg:sticky lg:top-4 max-h-[70vh] lg:max-h-[calc(100vh-8rem)]'
            }`}>
              <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  {!isIndexMinimized && (
                    <h3 className="text-sm font-bold text-gray-900" dir="rtl">Surah Index</h3>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    {/* Minimize button - desktop only */}
                    <button
                      onClick={() => setIsIndexMinimized(!isIndexMinimized)}
                      className="hidden lg:block text-gray-600 hover:text-gray-900 p-1.5 hover:bg-white/50 rounded transition-colors"
                      title={isIndexMinimized ? "Expand" : "Minimize"}
                    >
                      {isIndexMinimized ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      )}
                    </button>
                    {/* Close button */}
                    <button
                      onClick={() => setShowSurahIndex(false)}
                      className="text-gray-600 hover:text-gray-900 p-1.5 hover:bg-white/50 rounded transition-colors"
                      title="Close"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                {!isIndexMinimized && (
                  <input
                    type="text"
                    placeholder="Search surah..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                    dir="rtl"
                  />
                )}
              </div>
              {!isIndexMinimized && (
                <div className="overflow-y-auto pr-1 flex-1">
                  {filteredChapters.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500" dir="rtl">
                      No surahs found
                    </div>
                  ) : (
                    filteredChapters.map((surah) => (
                      <button
                        key={surah.id}
                        onClick={() => navigateToSurah(surah)}
                        className={`w-full text-right p-2 sm:p-2.5 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                          currentSurah?.id === surah.id
                            ? 'bg-green-50 border-l-4 border-l-green-600'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between" dir="rtl">
                          <div className="flex-1 text-right" dir="rtl">
                            <div className="flex items-center gap-2 justify-start" dir="rtl">
                              <span className="text-xs font-semibold text-gray-600">
                                {surah.id}.
                              </span>
                              <span className={`text-sm sm:text-base font-semibold text-right ${currentSurah?.id === surah.id ? 'text-green-900' : 'text-gray-800'}`} style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif', direction: 'rtl' }}>
                                {surah.name_arabic || FALLBACK_CHAPTERS.find(fc => fc.id === surah.id)?.name_arabic || surah.name_simple}
                              </span>
                            </div>
                            {surah.name_simple && surah.name_simple !== surah.name_arabic && (
                              <div className="text-[10px] text-gray-500 mt-0.5 text-right" style={{ direction: 'ltr' }}>
                                {surah.name_simple}
                              </div>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 mr-2" dir="ltr">
                            Pg {surah.pages?.[0]}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Mushaf Content */}
        <div className="flex-1 min-w-0 w-full overflow-hidden">

          <WordByWordPage
            pageNumber={currentPage}
            onWordClick={handleWordClick}
            onLetterClick={handleLetterClick}
            mistakes={mistakes}
            historicalMistakes={historicalMistakes}
            showHistorical={showHistorical}
            readOnly={readOnly || !!onVerseSelect} // Read-only if verse selection mode
            onMistakesWithWords={setMistakesWithWords}
            onPageChange={onPageChange}
            selectedVerses={selectedVerses}
          />

        <MistakeModal
          word={selectedWord}
          letterIndex={selectedLetterIndex}
          onClose={() => {
            setSelectedWord(null);
            setSelectedLetterIndex(undefined);
          }}
          onSave={handleSaveMistake}
        />

        {localMistakes.length > 0 && (() => {
          // Categorize mistakes - check both codes and labels
          const regularMistakes = localMistakes.filter(m => {
            const type = m.type.toLowerCase();
            const isAtkee = type === 'atkee' || type.includes('atkee');
            const isTajweed = ['madd', 'ikhfa', 'holding', 'tech', 'mad (elongation) mistake', 'ikhfa mistake', 'ghunna mistake', 'holding/fluency mistake'].some(t => type.includes(t));
            return !isAtkee && !isTajweed;
          });
          const atkeeMistakes = localMistakes.filter(m => {
            const type = m.type.toLowerCase();
            return type === 'atkee' || type.includes('atkee');
          });
          const tajweedMistakes = localMistakes.filter(m => {
            const type = m.type.toLowerCase();
            return ['madd', 'ikhfa', 'holding', 'tech', 'mad (elongation) mistake', 'ikhfa mistake', 'ghunna mistake', 'holding/fluency mistake'].some(t => type.includes(t));
          });

          return (
            <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Mistake Report
                </h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  {regularMistakes.length > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded font-semibold">
                      Mistakes: {regularMistakes.length}
                    </span>
                  )}
                  {atkeeMistakes.length > 0 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold">
                      Atkee: {atkeeMistakes.length}
                    </span>
                  )}
                  {tajweedMistakes.length > 0 && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-semibold">
                      Tajweed: {tajweedMistakes.length}
                    </span>
                  )}
                </div>
              </div>
            <div className="space-y-2">
              {localMistakes.map((m, i) => (
                <div key={i} className="text-xs text-gray-700 p-2 bg-gray-50 rounded border border-gray-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span 
                        className="font-semibold text-gray-900"
                        style={{
                          fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif',
                          direction: 'rtl',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                          letterSpacing: '0',
                          wordSpacing: '0.15em',
                          fontFeatureSettings: '"liga" 1, "kern" 1'
                        }}
                      >
                        {m.text}
                      </span>
                      <span className="text-gray-600"> — {m.type}</span>
                      <span className="text-gray-500 text-[10px] ml-2">
                        (Surah {m.surah}, Ayah {m.ayah})
                      </span>
                    </div>
                  </div>
                  {m.note && (
                    <p className="text-gray-600 mt-1 text-[10px] italic">"{m.note}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          );
        })()}
        </div>
      </div>
    </div>
  );
};

export default InteractiveMushaf;
