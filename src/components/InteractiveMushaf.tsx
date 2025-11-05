import React, { useEffect, useState } from "react";
import { MushafMistake } from '../types/mushaf';
import { fetchPageLines, getQuranChapters, Chapter } from "../services/quranApi";

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
  first_word_id: number;
  last_word_id: number;
  is_centered: boolean;
  line_type: "ayah" | "surah_name" | "basmallah";
  surah_number?: number;
}

export interface LayoutPage {
  page_number: number;
  lines: Line[];
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
  onSave: (word: Word, type: string, note?: string) => void;
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
  "Tajweed Mistake",
  "Ghunna Mistake",
  "Mad Mistake",
  "Pronunciation Mistake",
  "Fluency Mistake",
];

export const MistakeModal: React.FC<MistakeModalProps> = ({
  word,
  onClose,
  onSave,
}) => {
  const [selectedType, setSelectedType] = useState("");
  const [note, setNote] = useState("");

  if (!word) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-96 p-6 space-y-4">
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
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedType) onSave(word, selectedType, note);
              onClose();
            }}
            className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
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
}> = ({
  pageNumber,
  onWordClick,
  mistakes = [],
}) => {
  const [layout, setLayout] = useState<LayoutPage | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [background, setBackground] = useState<string>("");

  // Load words data on mount
  useEffect(() => {
    const loadWords = async () => {
      try {
        // Try to load words from local file (dynamic import)
        try {
          const wordsModule = await import('../data/words/word_by_word.json');
          const wordsData = wordsModule.default || wordsModule;
          
          // Convert to array format if needed
          if (Array.isArray(wordsData)) {
            setWords(wordsData as Word[]);
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
          console.log('✅ Loaded words from local file');
        } catch (e) {
          console.warn('Words file not found, trying fallback');
          // Fallback: try public folder
          const wordsRes = await fetch('/data/words/word_by_word.json');
          if (wordsRes.ok) {
            const wordsData = await wordsRes.json();
            if (Array.isArray(wordsData)) {
              setWords(wordsData);
            } else {
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
            first_word_id: line.first_word_id || 0,
            last_word_id: line.last_word_id || 0,
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

  // Function to get mistake for a word
  const getWordMistake = (word: Word): MushafMistake | undefined => {
    return mistakes.find(
      (m) =>
        m.page === pageNumber &&
        m.surah === word.surah &&
        m.ayah === word.ayah &&
        (m.wordIndex === word.word_index || !m.wordIndex)
    );
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
              if (line.line_type !== "ayah") return null;

              // Get words for this line and sort by word_index to ensure correct order
              const lineWords = words
                .filter(
                  (w) =>
                    w.word_index >= line.first_word_id &&
                    w.word_index <= line.last_word_id
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
                          className={`cursor-pointer rounded transition-all duration-200 ${mistakeClass}`}
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
                              ? `Surah ${w.surah}, Ayah ${w.ayah} - ${mistake.type} mistake${mistake.note ? `: ${mistake.note}` : ""}`
                              : `Surah ${w.surah}, Ayah ${w.ayah}`
                          }
                        >
                          {displayText}{'\u2009'}
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
  useEffect(() => {
    // Note: We'll need to fetch word text from the WordByWordPage component
    // For now, we'll use a placeholder
    const convertedMistakes: Mistake[] = mistakes
      .filter(m => m.page === currentPage)
      .map(m => ({
        word_index: m.wordIndex || 0,
        surah: m.surah,
        ayah: m.ayah,
        text: `Word ${m.wordIndex || 'N/A'}`,
        type: getMistakeTypeLabel(m.type),
        note: m.note
      }));
    setLocalMistakes(convertedMistakes);
  }, [mistakes, currentPage]);

  const getMistakeTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      "memory": "Memory Mistake",
      "madd": "Tajweed Mistake",
      "ikhfa": "Pronunciation Mistake",
      "holding": "Fluency Mistake",
      "tech": "Ghunna Mistake",
      "other": "Mad Mistake",
    };
    return typeMap[type] || type;
  };

  const handleWordClick = (word: Word) => {
    if (!readOnly && mode === 'marking') {
      setSelectedWord(word);
    }
  };

  const handleSaveMistake = (word: Word, type: string, note?: string) => {
    // Map the mistake type string to the MistakeType enum
    const typeMap: Record<string, 'madd' | 'holding' | 'memory' | 'ikhfa' | 'tech' | 'other'> = {
      "Memory Mistake": "memory",
      "Tajweed Mistake": "madd",
      "Ghunna Mistake": "ikhfa",
      "Mad Mistake": "madd",
      "Pronunciation Mistake": "ikhfa",
      "Fluency Mistake": "holding",
    };

    const mistakeType = typeMap[type] || 'other';

    const newMistake: Omit<MushafMistake, 'id' | 'timestamp'> = {
      type: mistakeType,
      page: currentPage,
      surah: word.surah,
      ayah: word.ayah,
      wordIndex: word.word_index,
      position: { x: 50, y: 50 }, // Default position for word-based mistakes
      note: note || ''
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
