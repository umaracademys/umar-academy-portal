import React, { useEffect, useState } from "react";
import { MushafMistake } from '../types/mushaf';
import { fetchPageLines, getQuranChapters, Chapter } from "../services/quranApi";
import { uploadMistakeAudio } from "../services/audioService";

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
  mistakes: MushafMistake[];
  onMistakeMark: (mistake: Omit<MushafMistake, 'id' | 'timestamp'>) => void;
  readOnly?: boolean;
  mode?: 'marking' | 'viewing';
  studentName?: string;
  onBack?: () => void;
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
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null);

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
      if (recordingTimer) {
        clearInterval(recordingTimer);
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
      const timer = setInterval(() => {
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
      if (recordingTimer) {
        clearInterval(recordingTimer);
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
      <div className="bg-white rounded-xl shadow-lg w-96 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-800">
          Mark Mistake – Surah {word.surah}, Ayah {word.ayah}
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Mistake Type:
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2"
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
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Optional Note:
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2"
            placeholder="Add comment..."
            rows={3}
          />
        </div>

        {/* Audio Recording Section */}
        <div className="border-t border-gray-200 pt-4">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Audio Recording (Optional):
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Record how to read this correctly for the student
          </p>
          
          {!audioUrl ? (
            <div className="flex items-center gap-2">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                  Record Audio
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
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
              <div className="flex gap-2">
                <button
                  onClick={deleteRecording}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                >
                  Delete Recording
                </button>
                <button
                  onClick={startRecording}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Record Again
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedType) {
                onSave(word, selectedType, note, audioBlob || undefined);
                onClose();
              }
            }}
            disabled={!selectedType}
            className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
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
  mistakes?: MushafMistake[];
  readOnly?: boolean;
  onMistakesWithWords?: (mistakesWithWords: Array<MushafMistake & { wordText?: string }>) => void;
}> = ({
  pageNumber,
  onWordClick,
  mistakes = [],
  readOnly = false,
  onMistakesWithWords,
}) => {
  const [layout, setLayout] = useState<LayoutPage | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [background, setBackground] = useState<string>("");
  const [chapters, setChapters] = useState<Chapter[]>([]);

  // Load chapters/surahs on mount
  useEffect(() => {
    const loadChapters = async () => {
      try {
        const loadedChapters = await getQuranChapters();
        if (loadedChapters.length > 0) {
          setChapters(loadedChapters);
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
        // Load words from public folder (works in both dev and production)
        const wordsRes = await fetch('/data/words/word_by_word.json');
        if (wordsRes.ok) {
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
        } else {
          console.error('Words data not available');
        }
      } catch (error) {
        console.error('Error loading words:', error);
      }
    };
    
    loadWords();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch page layout from backend API (uses local database)
        const pageData = await fetchPageLines(pageNumber, 'v4');
        
        if (!pageData || !pageData.lines) {
          console.error(`No layout data found for page ${pageNumber}`);
          return;
        }

        // Map backend response to LayoutPage format
        const layoutJson: LayoutPage = {
          page_number: pageData.pageNumber || pageNumber,
          lines: pageData.lines.map((line: any) => ({
            page_number: pageData.pageNumber || pageNumber,
            line_number: line.line_number,
            // Handle null/empty string for surah_name and basmallah lines
            first_word_id: (line.first_word_id && line.first_word_id !== '') ? parseInt(line.first_word_id) : null,
            last_word_id: (line.last_word_id && line.last_word_id !== '') ? parseInt(line.last_word_id) : null,
            is_centered: line.is_centered === true || line.is_centered === 1,
            line_type: line.line_type || 'ayah',
            surah_number: line.surah_number || pageData.surahId
          }))
        };

        setLayout(layoutJson);
        console.log(`✅ Loaded layout for page ${pageNumber} from backend API`);

        // Set background image (optional - can be removed if not needed)
        // Background images may not be available, so we'll skip for now
        setBackground("");
      } catch (err) {
        console.error("Error fetching layout:", err);
      }
    };

    if (words.length > 0) {
      fetchData();
    }
  }, [pageNumber, words.length]);

  // Collect mistakes with their word text for the parent component
  useEffect(() => {
    if (words.length > 0 && mistakes.length > 0 && onMistakesWithWords) {
      const mistakesWithWordText = mistakes
        .filter(m => m.page === pageNumber)
        .map(m => {
          // Find the word text for this mistake
          const word = words.find(
            w => w.surah === m.surah && 
                 w.ayah === m.ayah && 
                 (m.wordIndex === undefined || m.wordIndex === null || w.word_index === m.wordIndex)
          );
          return {
            ...m,
            wordText: word ? word.text : undefined
          };
        });
      onMistakesWithWords(mistakesWithWordText);
    }
  }, [words, mistakes, pageNumber, onMistakesWithWords]);

  // Function to get mistake for a word
  const getWordMistake = (word: Word): MushafMistake | undefined => {
    // First try to find exact match with wordIndex
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
      return exactMatch;
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
      return mistakes.find(
        (m) =>
          m.page === pageNumber &&
          m.surah === word.surah &&
          m.ayah === word.ayah &&
          (m.wordIndex === undefined || m.wordIndex === null)
      );
    }
    
    return undefined;
  };

  // Function to get CSS class for mistake highlighting (Mushaf-style colors)
  const getMistakeClass = (mistake: MushafMistake | undefined): string => {
    if (!mistake) {
      return "hover:bg-yellow-100 hover:shadow-sm";
    }

    // Different colors for different mistake types - visible on cream background
    switch (mistake.type) {
      case "memory":
        return "bg-yellow-200 hover:bg-yellow-300 border-b-2 border-yellow-600 shadow-sm";
      case "madd":
        return "bg-red-200 hover:bg-red-300 border-b-2 border-red-600 shadow-sm";
      case "ikhfa":
        return "bg-blue-200 hover:bg-blue-300 border-b-2 border-blue-600 shadow-sm";
      case "holding":
        return "bg-orange-200 hover:bg-orange-300 border-b-2 border-orange-600 shadow-sm";
      case "tech":
        return "bg-purple-200 hover:bg-purple-300 border-b-2 border-purple-600 shadow-sm";
      case "other":
        return "bg-gray-300 hover:bg-gray-400 border-b-2 border-gray-600 shadow-sm";
      default:
        return "bg-pink-200 hover:bg-pink-300 border-b-2 border-pink-600 shadow-sm";
    }
  };

  if (!layout || words.length === 0)
    return <div className="text-center p-6">Loading Mushaf Page...</div>;

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Optional background image */}
      {background && (
        <img
          src={background}
          alt={`Page ${pageNumber}`}
          className="max-w-full h-auto rounded-xl shadow-lg mb-4"
        />
      )}

      {/* Mushaf-style Arabic text container */}
      <div className="w-full max-w-5xl mx-auto">
        {/* Mushaf page container with traditional styling */}
        <div 
          className="mushaf-arabic-text rounded-lg shadow-xl border-2 border-amber-200 p-4 md:p-6"
          style={{
            backgroundColor: '#fef9e7',
            fontFamily: '"Amiri", "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif',
            minHeight: 'auto',
            direction: 'rtl',
            textAlign: 'right'
          }}
        >
          {/* Page number indicator */}
          <div className="text-center mb-2 text-gray-600 text-xs font-serif">
            Page {pageNumber}
          </div>

          {/* Arabic text content */}
          <div 
            className="mushaf-arabic-text space-y-2"
            style={{
              fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
              lineHeight: '2',
              letterSpacing: '0.03em',
              wordSpacing: '0.15em',
              direction: 'rtl',
              textAlign: 'right',
              fontFamily: 'inherit'
            }}
          >
            {layout.lines.map((line) => {
              if (line.line_type !== "ayah") {
                // Handle surah_name and basmallah lines
                if (line.line_type === "surah_name") {
                  const surah = chapters.find(c => c.id === line.surah_number);
                  return (
                    <div key={line.line_number} className="text-center font-bold text-xl my-4">
                      {surah ? surah.name_arabic : `Surah ${line.surah_number}`}
                    </div>
                  );
                } else if (line.line_type === "basmallah") {
                  return (
                    <div key={line.line_number} className="text-center text-2xl my-4">
                      ﷽
                    </div>
                  );
                }
                return null;
              }

              // Skip if no word IDs (shouldn't happen for ayah lines, but safety check)
              if (!line.first_word_id || !line.last_word_id) {
                return null;
              }

              // Get words for this line and sort by word_index to ensure correct order
              const lineWords = words
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

              // Track ayah numbers for display
              let currentAyah = 0;

              return (
                <div
                  key={line.line_number}
                  className={`mb-1`}
                  style={{
                    direction: 'rtl',
                    textAlign: line.is_centered ? 'center' : 'justify',
                    textAlignLast: line.is_centered ? 'center' : 'justify'
                  }}
                >
                  {lineWords.map((w, idx) => {
                    const mistake = getWordMistake(w);
                    const mistakeClass = getMistakeClass(mistake);
                    
                    // Show ayah number when it changes (at start of new ayah)
                    const showAyahNumber = w.ayah !== currentAyah;
                    if (showAyahNumber) {
                      currentAyah = w.ayah;
                    }
                    
                    // Use regular Arabic text from word data
                    const displayText = w.text;
                    
                    return (
                      <React.Fragment key={w.word_index}>
                        {/* Ayah number marker - show at start of each ayah */}
                        {showAyahNumber && w.ayah > 0 && (
                          <span 
                            className="inline-block mx-1 my-0.5 text-green-700 font-bold"
                            style={{
                              fontSize: '0.75em',
                              fontFamily: 'serif',
                              verticalAlign: 'middle',
                              direction: 'ltr',
                              display: 'inline-block'
                            }}
                            title={`Ayah ${w.ayah}`}
                            dir="ltr"
                          >
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-50 border border-green-600 text-green-800 text-xs">
                              {w.ayah}
                            </span>
                          </span>
                        )}
                        
                        <span
                          onClick={() => onWordClick?.(w)}
                          className={`cursor-pointer rounded transition-all duration-200 ${mistakeClass} relative group`}
                          style={{
                            padding: '2px 3px',
                            display: 'inline',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            lineHeight: 'inherit',
                            borderRadius: '3px',
                            direction: 'rtl',
                            unicodeBidi: 'embed'
                          }}
                          dir="rtl"
                          title={
                            mistake
                              ? `Surah ${w.surah}, Ayah ${w.ayah} - ${mistake.type} mistake${mistake.note ? `: ${mistake.note}` : ""}${mistake.audioUrl ? ' (Click to hear audio)' : ''}`
                              : `Surah ${w.surah}, Ayah ${w.ayah}`
                          }
                        >
                          {displayText}{'\u2009'}
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
                                <div className="font-semibold text-gray-900 mb-1">
                                  {mistake.type === 'memory' ? 'Memory Mistake' :
                                   mistake.type === 'madd' ? 'Mad (Elongation) Mistake' :
                                   mistake.type === 'holding' ? 'Holding/Fluency Mistake' :
                                   mistake.type === 'ikhfa' ? 'Ikhfa Mistake' :
                                   mistake.type === 'tech' ? 'Ghunna Mistake' : 'Other Mistake'}
                                </div>
                                {mistake.note && (
                                  <div className="text-gray-600 mb-2">{mistake.note}</div>
                                )}
                                {mistake.audioUrl && (
                                  <div className="mt-2">
                                    <div className="text-xs text-gray-500 mb-1">Audio correction:</div>
                                    <audio controls src={mistake.audioUrl} className="w-full h-8">
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

          {/* Page footer decoration */}
          <div className="mt-4 text-center text-gray-400 text-xs font-serif">
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          </div>
        </div>
      </div>
    </div>
  );
};

const InteractiveMushaf: React.FC<InteractiveMushafProps> = ({
  currentPage,
  onPageChange,
  mistakes,
  onMistakeMark,
  readOnly = false,
  mode = 'marking',
  studentName,
  onBack
}) => {
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [localMistakes, setLocalMistakes] = useState<Mistake[]>([]);
  const [showSurahIndex, setShowSurahIndex] = useState(true);
  const [isIndexMinimized, setIsIndexMinimized] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Load chapters/surahs on mount
  useEffect(() => {
    const loadChapters = async () => {
      try {
        const loadedChapters = await getQuranChapters();
        if (loadedChapters.length > 0) {
          setChapters(loadedChapters);
        }
      } catch (error) {
        console.error("Error loading chapters:", error);
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
      .map(m => ({
        word_index: m.wordIndex || 0,
        surah: m.surah,
        ayah: m.ayah,
        text: m.wordText || `Word ${m.wordIndex || 'N/A'}`,
        type: getMistakeTypeLabel(m.type),
        note: m.note
      }));
    setLocalMistakes(convertedMistakes);
  }, [mistakesWithWords, currentPage]);

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
    setLocalMistakes((prev) => [
      ...prev,
      { ...word, type, note },
    ]);
    
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
    <div className="min-h-screen bg-gray-100 relative">
      {/* Navigation Header */}
      <div className="w-full md:max-w-6xl md:mx-auto px-2 md:px-4 md:py-3 bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="flex items-center justify-between gap-1 md:gap-4 h-12 md:h-auto">
          {/* Back Button */}
          <div className="flex-shrink-0 w-[100px] md:w-[150px] lg:w-auto">
            {onBack ? (
              <button 
                onClick={onBack}
                className="p-1 lg:p-2 text-gray-600 hover:text-gray-900 transition-colors" 
                title="Back"
              >
                <svg className="w-5 h-5 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
              </button>
            ) : (
              <div></div>
            )}
          </div>

          {/* Page Navigation Center */}
          <div className="flex-1 flex items-center justify-center gap-3 lg:gap-6">
            <div className="flex items-center gap-2 lg:gap-3">
              {/* Previous Button - Mobile */}
              <button 
                className="lg:hidden p-0.5 text-gray-600 hover:text-gray-900 transition-colors" 
                title="Previous page"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
              
              {/* Previous Button - Desktop */}
              <button 
                className="hidden lg:flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium" 
                title="Previous page"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"></path>
                </svg>
                Previous
              </button>

              {/* Page Number */}
              <div className="text-center">
                <div className="text-xs lg:text-sm font-medium text-gray-700 whitespace-nowrap">
                  Page {currentPage}
                </div>
              </div>

              {/* Next Button - Mobile */}
              <button 
                className="lg:hidden p-0.5 text-gray-600 hover:text-gray-900 transition-colors" 
                title="Next page"
                onClick={() => onPageChange(currentPage + 1)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>

              {/* Next Button - Desktop */}
              <button 
                className="hidden lg:flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium" 
                title="Next page"
                onClick={() => onPageChange(currentPage + 1)}
              >
                Next
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 ml-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"></path>
                </svg>
              </button>
            </div>

            {/* Surah Index Toggle Button (for mobile/smaller screens to show/hide sidebar) */}
            <button
              onClick={() => setShowSurahIndex(!showSurahIndex)}
              className="px-2 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              📖 {showSurahIndex ? 'Hide' : 'Show'} Index
            </button>
          </div>

          {/* Student Info Right */}
          <div className="flex-shrink-0 w-[100px] md:w-[150px] lg:w-auto">
            <div className="text-right text-[10px] lg:text-xs leading-tight text-gray-600">
              {studentName && (
                <div className="font-medium truncate">{studentName}</div>
              )}
              <div className="hidden lg:block text-gray-500 mt-0.5">
                {currentJuz > 0 && (
                  <>
                    <span className="text-teal-600">Juz {currentJuz}</span>
                    {currentSurah && (
                      <>
                        <span className="mx-1">•</span>
                        <span>Surah {currentSurah.id}</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>



      <div className="p-2 md:p-4 relative pt-4 flex justify-center gap-4">
        {/* Surah Index Sidebar */}
        {showSurahIndex && (
          <div className={`bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden transition-all duration-300 ${
            isIndexMinimized ? 'w-12' : 'w-80'
          } max-h-[calc(100vh-200px)] ${
            // On large screens: sticky sidebar, on smaller screens: fixed overlay
            'lg:sticky lg:top-20 fixed left-0 top-20 z-50 lg:z-auto h-[calc(100vh-80px)] lg:h-auto'
          }`}>
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                {!isIndexMinimized && (
                  <h3 className="text-sm font-bold text-gray-800">Surah Index</h3>
                )}
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={() => setIsIndexMinimized(!isIndexMinimized)}
                    className="text-gray-500 hover:text-gray-700 text-lg leading-none p-1 hover:bg-gray-200 rounded"
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
                  {!isIndexMinimized && (
                    <button
                      onClick={() => setShowSurahIndex(false)}
                      className="text-gray-500 hover:text-gray-700 text-lg leading-none p-1 hover:bg-gray-200 rounded"
                      title="Close"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              {!isIndexMinimized && (
                <input
                  type="text"
                  placeholder="Search surah..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              )}
            </div>
            {!isIndexMinimized && (
              <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
                {filteredChapters.map((surah) => (
                  <button
                    key={surah.id}
                    onClick={() => navigateToSurah(surah)}
                    className={`w-full text-right p-2 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                      currentSurah?.id === surah.id
                        ? 'bg-green-50 border-l-4 border-l-green-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-600">
                            {surah.id}.
                          </span>
                          <span className="text-xs font-semibold text-gray-800">
                            {surah.name_simple}
                          </span>
                        </div>
                        {surah.translated_name?.name && (
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {surah.translated_name.name}
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 ml-2">
                        Pg {surah.pages[0]}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      <div className="max-w-5xl w-full mx-auto mt-4">

        <WordByWordPage 
          pageNumber={currentPage} 
          onWordClick={handleWordClick}
          mistakes={mistakes}
          readOnly={readOnly}
          onMistakesWithWords={setMistakesWithWords}
        />

        <MistakeModal
          word={selectedWord}
          onClose={() => setSelectedWord(null)}
          onSave={handleSaveMistake}
        />

        {localMistakes.length > 0 && (
          <div className="mt-3 bg-white p-3 rounded-lg shadow">
            <h2 className="text-base font-semibold mb-2">Mistake Report</h2>
            <ul className="space-y-0.5">
              {localMistakes.map((m, i) => (
                <li key={i} className="text-xs text-gray-700 border-b pb-0.5">
                  <b>{m.text}</b> — {m.type}{" "}
                  <span className="text-gray-500">
                    (Surah {m.surah}, Ayah {m.ayah})
                  </span>{" "}
                  {m.note && <em>"{m.note}"</em>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default InteractiveMushaf;
