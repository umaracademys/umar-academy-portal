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
}

interface MistakeModalProps {
  word: Word | null;
  onClose: () => void;
  onSave: (word: Word, type: string, note?: string, audioBlob?: Blob) => void;
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
  "Other Mistake",
];

// Function to get mistake type label (used by multiple components)
const getMistakeTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    "memory": "Memory Mistake",
    "madd": "Mad (Elongation) Mistake",
    "ikhfa": "Ikhfa Mistake",
    "holding": "Holding/Fluency Mistake",
    "tech": "Ghunna Mistake",
    "other": "Other Mistake",
  };
  return typeMap[type] || type;
};

export const MistakeModal: React.FC<MistakeModalProps> = ({
  word,
  onClose,
  onSave,
}) => {
  const [selectedType, setSelectedType] = useState("");
  const [note, setNote] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState<number | null>(null);

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
      <div className="bg-white rounded-xl shadow-lg w-96 p-6 space-y-4 max-h-[90vh] overflow-y-auto" dir="rtl">
        <h2 className="text-lg font-semibold text-gray-800 text-right" dir="rtl">
          Mark Mistake – Surah {word.surah}, Ayah {word.ayah}
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1 text-right" dir="rtl">
            Mistake Type:
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2"
            dir="rtl"
          >
            <option value="">Choose...</option>
            {mistakeTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1 text-right" dir="rtl">
            Optional Note:
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 text-right"
            placeholder="Add comment..."
            rows={3}
            dir="rtl"
          />
        </div>

        {/* Audio Recording Section */}
        <div className="border-t border-gray-200 pt-4" dir="rtl">
          <label className="block text-sm font-medium text-gray-600 mb-2 text-right" dir="rtl">
            Audio Recording (Optional):
          </label>
          <p className="text-xs text-gray-500 mb-3 text-right" dir="rtl">
            Record how to read this correctly for the student
          </p>
          
          {!audioUrl ? (
            <div className="flex items-center gap-2" dir="rtl">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  dir="rtl"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                  Record Audio
                </button>
              ) : (
                <div className="flex items-center gap-3" dir="rtl">
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                    dir="rtl"
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
              <div className="flex gap-2" dir="rtl">
                <button
                  onClick={deleteRecording}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                  dir="rtl"
                >
                  Delete Recording
                </button>
                <button
                  onClick={startRecording}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  dir="rtl"
                >
                  Record Again
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200" dir="rtl">
          <button
            onClick={() => {
              if (selectedType) {
                onSave(word, selectedType, note, audioBlob || undefined);
                onClose();
              }
            }}
            disabled={!selectedType}
            className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-right"
            dir="rtl"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 text-right"
            dir="rtl"
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
  mistakes?: MushafMistake[]; // Current mistakes
  historicalMistakes?: MushafMistake[]; // Historical mistakes from student's personal Mushaf
  showHistorical?: boolean; // Toggle to show/hide historical mistakes
  readOnly?: boolean;
  onMistakesWithWords?: (mistakesWithWords: Array<MushafMistake & { wordText?: string }>) => void;
  onPageChange?: (page: number) => void; // For page navigation
}> = ({
  pageNumber,
  onWordClick,
  mistakes: mistakesProp = [],
  historicalMistakes: historicalMistakesProp = [],
  showHistorical = true,
  readOnly = false,
  onMistakesWithWords,
  onPageChange,
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
        console.log(`🔄 [PAGE ${pageNumber}] Attempting to load from MongoDB API...`);
        const pageData = await fetchPageLines(pageNumber, 'v4');

        if (pageData && pageData.lines && pageData.lines.length > 0) {
          console.log(`✅ [PAGE ${pageNumber}] Successfully loaded ${pageData.lines.length} lines from MongoDB`);

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
            console.log(`✅ Extracted ${apiWords.length} words from MongoDB response`);
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
            console.log(`✅ Loaded layout for page ${pageNumber} from MongoDB`);
            return;
          }
        }
      } catch (mongoError) {
        console.warn(`⚠️ MongoDB API failed for page ${pageNumber}:`, mongoError);
      }
      
      // FALLBACK 2: Try JSON file (local file)
      try {
        console.log(`🔄 [PAGE ${pageNumber}] Trying JSON file from local files...`);
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

  // Function to get mistake for a word (prioritize current mistakes over historical)
  const getWordMistake = (word: Word): { mistake: MushafMistake | undefined; isHistorical: boolean } => {
    // First try to find exact match with wordIndex in current mistakes
    const exactMatch = mistakes.find(
      (m) =>
        m.page === pageNumber &&
        m.surah === word.surah &&
        m.ayah === word.ayah &&
        m.wordIndex === word.word_index &&
        m.wordIndex !== undefined &&
        m.wordIndex !== null
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
        {/* Mushaf page container with traditional styling - Centered, reduced padding */}
        <div 
          className="mushaf-arabic-text rounded-xl shadow-lg border border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50"
          dir="rtl"
          style={{
            backgroundColor: '#fef9e7',
            fontFamily,
            minHeight: 'auto',
            direction: 'rtl',
            textAlign: 'right',
            maxWidth: '600px',
            width: 'auto',
            boxSizing: 'border-box',
            overflow: 'hidden',
            fontFeatureSettings: '"liga" 1, "kern" 1',
            margin: '0 auto',
            display: 'block',
            padding: '1.5rem 1rem',
            paddingLeft: '0.75rem',
            paddingRight: '0.75rem'
          }}
        >
          {/* Page number indicator */}
          <div className="text-center mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-amber-200">
            <span className="inline-block px-2 sm:px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
              Page {pageNumber}
            </span>
          </div>

          {/* Arabic text content - Matching original 15-line layout - Centered */}
          <div 
            className="mushaf-arabic-text"
            style={{
              fontSize: 'clamp(1.2rem, 2vw + 0.5rem, 2.2rem)',
              lineHeight: '1.8',
              letterSpacing: '0',
              wordSpacing: '0.15em',
              direction: 'rtl',
              textAlign: 'right',
              fontFamily: fontFamily,
              maxWidth: '100%',
              fontFeatureSettings: '"liga" 1, "kern" 1',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4em',
              margin: '0 auto'
            }}
          >
            {layout.lines.map((line) => {
              if (line.line_type !== "ayah") {
                // Handle surah_name and basmallah lines - Matching original layout, centered
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
                        textAlign: 'right',
                        fontFamily: fontFamily,
                        fontSize: '1.5em',
                        fontWeight: 'bold',
                        marginBottom: '0.5em',
                        marginTop: '0.3em',
                        minHeight: '1.5em',
                        lineHeight: '1.8',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        width: '100%',
                        direction: 'rtl'
                      }}
                    >
                      <span style={{ textAlign: 'right', display: 'block', width: '100%' }}>
                        {arabicName}
                      </span>
                    </div>
                  );
                } else if (line.line_type === "basmallah") {
                  return (
                    <div 
                      key={line.line_number} 
                      className="mushaf-line mushaf-basmallah"
                      style={{
                        textAlign: 'center',
                        fontFamily: fontFamily,
                        fontSize: '1.5em',
                        marginBottom: '0.5em',
                        marginTop: '0.3em',
                        minHeight: '1.5em',
                        lineHeight: '1.8',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%'
                      }}
                    >
                      <span style={{ 
                        textAlign: 'center', 
                        display: 'inline-block',
                        fontSize: '1.2em',
                        letterSpacing: '0.1em'
                      }}>
                        ﷽
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
                    marginBottom: '0.5em',
                    minHeight: '1.5em',
                    lineHeight: '1.8',
                    display: 'block',
                    width: '100%'
                  }}
                >
                  {lineWords.map((w, idx) => {
                    const { mistake, isHistorical } = getWordMistake(w);
                    const mistakeClass = getMistakeClass(mistake, isHistorical);
                    
                    // Use regular Arabic text from word data
                    // Note: Individual glyphs (single characters) are expected for proper mushaf rendering
                    const displayText = w.text || '';
                    
                  return (
                    <React.Fragment key={w.word_index}>
                        <span
                          onClick={() => onWordClick?.(w)}
                          className={`cursor-pointer rounded transition-all duration-200 ${mistakeClass} relative group inline-block`}
                          dir="rtl"
                          style={{
                            padding: '1px 2px',
                            direction: 'rtl',
                            display: 'inline-block',
                            unicodeBidi: 'embed',
                            fontFamily: fontFamily,
                            fontSize: 'inherit',
                            lineHeight: 'inherit',
                            borderRadius: '2px',
                            whiteSpace: 'nowrap'
                          }}
                          title={
                            mistake
                              ? `${isHistorical ? '📜 Historical ' : ''}Surah ${w.surah}, Ayah ${w.ayah} - ${mistake.type} mistake${mistake.note ? `: ${mistake.note}` : ""}${mistake.audioUrl ? ' (Click to hear audio)' : ''}`
                              : `Surah ${w.surah}, Ayah ${w.ayah}`
                          }
                        >
                          {displayText}
                          {mistake && mistake.audioUrl && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                              </svg>
                            </span>
                          )}
                          {/* Mistake Details Popup */}
                          {mistake && readOnly && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-white border border-gray-300 rounded-lg shadow-xl p-3 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                              <div className="text-xs">
                                {isHistorical && (
                                  <div className="text-blue-600 font-semibold mb-1 text-[10px]">
                                    📜 Historical Mistake
                                  </div>
                                )}
                                <div className="font-semibold text-gray-900 mb-1">
                                  {getMistakeTypeLabel(mistake.type)}
                                </div>
                                {mistake.note && (
                                  <div className="text-gray-600 mb-2">{mistake.note}</div>
                                )}
                                {mistake.audioUrl && (
                                  <div className="mt-2">
                                    <div className="text-xs text-gray-500 mb-1">Audio correction:</div>
                                    <audio 
                                      controls 
                                      src={
                                        mistake.audioUrl.startsWith('http') 
                                          ? mistake.audioUrl 
                                          : `${typeof window !== 'undefined' && (window as any).MUSHAF_API_BASE 
                                              ? (window as any).MUSHAF_API_BASE.replace('/api', '') 
                                              : import.meta.env?.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001'}${mistake.audioUrl}`
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

          {/* Page footer decoration - Responsive */}
          <div className="mt-3 sm:mt-4 text-center text-gray-400 text-xs font-serif overflow-x-hidden">
            <div className="whitespace-nowrap overflow-x-auto">
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            </div>
          </div>

          {/* Page Navigation Buttons - Centered */}
          {onPageChange && (
            <div className="mt-4 sm:mt-6 flex justify-center items-center gap-4">
              <button
                onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
                disabled={pageNumber <= 1}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-primary text-white rounded-full font-semibold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  minWidth: '120px'
                }}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Previous</span>
              </button>
              
              <span className="px-3 sm:px-4 py-2 text-sm sm:text-base font-semibold text-primary">
                Page {pageNumber} / 604
              </span>
              
              <button
                onClick={() => onPageChange(Math.min(604, pageNumber + 1))}
                disabled={pageNumber >= 604}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-primary text-white rounded-full font-semibold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  minWidth: '120px'
                }}
              >
                <span>Next</span>
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
  showHistorical: showHistoricalProp = true
}) => {
  const historicalMistakes = React.useMemo(() => historicalMistakesProp as MushafMistake[], [historicalMistakesProp]);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
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
      setSelectedWord(word);
    }
  };

  const handleSaveMistake = async (word: Word, type: string, note?: string, audioBlob?: Blob) => {
    // Map the mistake type string to the MistakeType enum
    const typeMap: Record<string, 'madd' | 'holding' | 'memory' | 'ikhfa' | 'tech' | 'other'> = {
      "Memory Mistake": "memory",
      "Mad (Elongation) Mistake": "madd",
      "Ikhfa Mistake": "ikhfa",
      "Ghunna Mistake": "tech",
      "Holding/Fluency Mistake": "holding",
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
      const exists = prev.some(m => 
        m.surah === word.surah && 
        m.ayah === word.ayah && 
        m.word_index === word.word_index
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
      // Only close on mobile, keep open on desktop for quick navigation
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setShowSurahIndex(false);
      }
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
                        <div className="flex items-center justify-between">
                          <div className="flex-1 text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-xs font-semibold text-gray-600">
                                {surah.id}.
                              </span>
                              <span className={`text-sm sm:text-base font-semibold ${currentSurah?.id === surah.id ? 'text-green-900' : 'text-gray-800'}`} style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif', direction: 'rtl' }}>
                                {surah.name_arabic || FALLBACK_CHAPTERS.find(fc => fc.id === surah.id)?.name_arabic || surah.name_simple}
                              </span>
                            </div>
                            {surah.name_simple && surah.name_simple !== surah.name_arabic && (
                              <div className="text-[10px] text-gray-500 mt-0.5 text-right" style={{ direction: 'ltr' }}>
                                {surah.name_simple}
                              </div>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 ml-2">
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
            mistakes={mistakes}
            historicalMistakes={historicalMistakes}
            showHistorical={showHistorical}
            readOnly={readOnly}
            onMistakesWithWords={setMistakesWithWords}
            onPageChange={onPageChange}
          />

        <MistakeModal
          word={selectedWord}
          onClose={() => setSelectedWord(null)}
          onSave={handleSaveMistake}
        />

        {localMistakes.length > 0 && (
          <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Mistake Report ({localMistakes.length})
            </h3>
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
        )}
        </div>
      </div>
    </div>
  );
};

export default InteractiveMushaf;
