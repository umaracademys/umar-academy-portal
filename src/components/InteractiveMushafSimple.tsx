import React, { useState, useEffect } from "react";

// Try to import local JSON files (using dynamic imports for better error handling)
// Note: These files need to exist in src/data/layouts/ and src/data/words/

// ------------------------
// Type Definitions
// ------------------------
interface Word {
  word_index: number;
  surah: number;
  ayah: number;
  text: string;
}

interface Line {
  line_number: number;
  first_word_id: number;
  last_word_id: number;
  line_type: "ayah" | "basmallah" | "surah_name";
  is_centered: boolean;
  surah_number?: number;
}

interface LayoutPage {
  page_number: number;
  lines: Line[];
}

interface Mistake {
  word_index: number;
  surah: number;
  ayah: number;
  text: string;
  type: string;
  note?: string;
}

// ------------------------
// Mistake Modal Component
// ------------------------
const MistakeModal: React.FC<{
  word: Word | null;
  onClose: () => void;
  onSave: (word: Word, type: string, note?: string) => void;
}> = ({ word, onClose, onSave }) => {
  const [selectedType, setSelectedType] = useState("");
  const [note, setNote] = useState("");
  const mistakeTypes = [
    "Memory Mistake",
    "Tajweed Mistake",
    "Ghunna Mistake",
    "Mad Mistake",
    "Pronunciation Mistake",
    "Fluency Mistake",
  ];

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

// ------------------------
// Main Interactive Mushaf Component
// ------------------------
const InteractiveMushaf: React.FC = () => {
  const [page, setPage] = useState<LayoutPage | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(true);

  // Load layout and words data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Try to load layout from local file
        try {
          const layoutModule = await import('../data/layouts/qpc-v4-tajweed-15-lines/page_1.json');
          const layoutData = layoutModule.default || layoutModule;
          setPage(layoutData as LayoutPage);
          console.log('✅ Loaded layout from local file');
        } catch (e) {
          console.warn('Layout file not found, trying fallback');
          // Fallback: try public folder
          const layoutRes = await fetch('/data/layouts/page_1.json');
          if (layoutRes.ok) {
            const layoutData = await layoutRes.json();
            setPage(layoutData);
          } else {
            throw new Error('Layout not available');
          }
        }

        // Try to load words from local file
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
          } else {
            throw new Error('Words not available');
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Save mistake to in-memory state (can replace with SQLite later)
  const handleSaveMistake = (word: Word, type: string, note?: string) => {
    setMistakes((prev) => [
      ...prev,
      { ...word, type, note },
    ]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading Mushaf...</p>
        </div>
      </div>
    );
  }

  if (!page || words.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600">Error loading Mushaf data</p>
          <p className="text-sm text-gray-500 mt-2">
            {!page && "Layout file not found. Please ensure page_1.json exists in src/data/layouts/qpc-v4-tajweed-15-lines/"}
            {page && words.length === 0 && "Words data not found. Please ensure word_by_word.json exists in src/data/words/"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Interactive Mushaf – Page {page.page_number} (QPC v4 Tajweed 15 lines)
      </h1>

      {/* Mushaf Page */}
      <div className="text-right font-quran text-3xl leading-relaxed px-4 bg-white rounded-xl shadow-md w-full max-w-3xl p-6">
        {page.lines.map((line) => {
          const lineWords = words.filter(
            (w) =>
              w.word_index >= line.first_word_id &&
              w.word_index <= line.last_word_id
          );

          return (
            <div
              key={line.line_number}
              className={`my-2 ${
                line.is_centered ? "text-center" : "text-justify"
              }`}
            >
              {lineWords.map((w) => (
                <span
                  key={w.word_index}
                  onClick={() => setSelectedWord(w)}
                  className="cursor-pointer hover:bg-yellow-200 rounded px-1 transition"
                  title={`Surah ${w.surah}, Ayah ${w.ayah}`}
                >
                  {w.text}{" "}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      {/* Mistake Modal */}
      <MistakeModal
        word={selectedWord}
        onClose={() => setSelectedWord(null)}
        onSave={handleSaveMistake}
      />

      {/* Mistake Report */}
      {mistakes.length > 0 && (
        <div className="mt-8 bg-white p-4 rounded-xl shadow w-full max-w-3xl">
          <h2 className="text-lg font-semibold mb-3">Mistake Report</h2>
          <ul className="space-y-1">
            {mistakes.map((m, i) => (
              <li key={i} className="text-sm text-gray-700 border-b pb-1">
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
  );
};

export default InteractiveMushaf;

