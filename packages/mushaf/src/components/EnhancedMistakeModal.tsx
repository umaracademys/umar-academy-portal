import React, { useState, useEffect } from 'react';
import { Word } from './InteractiveMushaf';

interface StructuredTajweedData {
  stretchCount?: 0 | 2 | 4 | 6;
  holdRequired?: boolean;
  focusLetters?: string[];
  tajweedRule?: 'ikhfa' | 'idgham' | 'iqlab' | 'qalqalah' | 'heavy_letter' | 'makhraj' | 'madd' | 'ghunna' | 'shaddah';
  teacherNote?: string;
}

interface EnhancedMistakeModalProps {
  word: Word | null;
  letterIndex?: number;
  onClose: () => void;
  onSave: (word: Word, type: string, note?: string, audioBlob?: Blob, letterIndex?: number, tajweedData?: StructuredTajweedData) => void;
  isMobile?: boolean;
}

const TAJWEED_RULES: Array<{ value: StructuredTajweedData['tajweedRule']; label: string }> = [
  { value: 'ikhfa', label: 'Ikhfa (Hidden)' },
  { value: 'idgham', label: 'Idgham (Merging)' },
  { value: 'iqlab', label: 'Iqlab (Conversion)' },
  { value: 'qalqalah', label: 'Qalqalah (Echo)' },
  { value: 'heavy_letter', label: 'Heavy Letter' },
  { value: 'makhraj', label: 'Makhraj (Articulation)' },
  { value: 'madd', label: 'Madd (Elongation)' },
  { value: 'ghunna', label: 'Ghunna (Nasalization)' },
  { value: 'shaddah', label: 'Shaddah (Doubling)' },
];

const STRETCH_COUNTS: Array<{ value: 0 | 2 | 4 | 6; label: string }> = [
  { value: 0, label: 'No stretch' },
  { value: 2, label: '2 Harakat' },
  { value: 4, label: '4 Harakat' },
  { value: 6, label: '6 Harakat' },
];

const MISTAKE_TYPES = [
  "Mistake",
  "Atkee",
  "Tajweed Error",
];

const TAJWEED_SUB_TYPES = [
  "Holding",
  "Stretching",
  "Heavy Letter",
  "Light Letter",
];

// Arabic letters from Alif to Yaa
const ARABIC_LETTERS = [
  { value: 'ا', label: 'ا (Alif)' },
  { value: 'ب', label: 'ب (Ba)' },
  { value: 'ت', label: 'ت (Ta)' },
  { value: 'ث', label: 'ث (Tha)' },
  { value: 'ج', label: 'ج (Jeem)' },
  { value: 'ح', label: 'ح (Ha)' },
  { value: 'خ', label: 'خ (Kha)' },
  { value: 'د', label: 'د (Dal)' },
  { value: 'ذ', label: 'ذ (Dhal)' },
  { value: 'ر', label: 'ر (Ra)' },
  { value: 'ز', label: 'ز (Zay)' },
  { value: 'س', label: 'س (Seen)' },
  { value: 'ش', label: 'ش (Sheen)' },
  { value: 'ص', label: 'ص (Sad)' },
  { value: 'ض', label: 'ض (Dad)' },
  { value: 'ط', label: 'ط (Ta)' },
  { value: 'ظ', label: 'ظ (Za)' },
  { value: 'ع', label: 'ع (Ayn)' },
  { value: 'غ', label: 'غ (Ghayn)' },
  { value: 'ف', label: 'ف (Fa)' },
  { value: 'ق', label: 'ق (Qaf)' },
  { value: 'ك', label: 'ك (Kaf)' },
  { value: 'ل', label: 'ل (Lam)' },
  { value: 'م', label: 'م (Meem)' },
  { value: 'ن', label: 'ن (Noon)' },
  { value: 'ه', label: 'ه (Ha)' },
  { value: 'و', label: 'و (Waw)' },
  { value: 'ي', label: 'ي (Yaa)' },
];

export const EnhancedMistakeModal: React.FC<EnhancedMistakeModalProps> = ({
  word,
  letterIndex: initialLetterIndex,
  onClose,
  onSave,
  isMobile = false
}) => {
  const [selectedType, setSelectedType] = useState("");
  const [selectedTajweedSubType, setSelectedTajweedSubType] = useState("");
  const [selectedArabicLetter, setSelectedArabicLetter] = useState("");
  const [selectedLetterIndex, setSelectedLetterIndex] = useState<number | undefined>(initialLetterIndex);
  const [note, setNote] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  // Tajweed-specific fields
  const [showTajweedForm, setShowTajweedForm] = useState(false);
  const [tajweedRule, setTajweedRule] = useState<StructuredTajweedData['tajweedRule']>('ikhfa');
  const [stretchCount, setStretchCount] = useState<0 | 2 | 4 | 6>(0);
  const [holdRequired, setHoldRequired] = useState(false);
  const [focusLetters, setFocusLetters] = useState("");

  const isTajweedType = selectedType === "Tajweed Error";
  const showArabicLetterSelector = isTajweedType && (selectedTajweedSubType === "Heavy Letter" || selectedTajweedSubType === "Light Letter");
  const showStretchCount = isTajweedType && selectedTajweedSubType === "Stretching";
  const showHoldRequired = isTajweedType && selectedTajweedSubType === "Holding";

  useEffect(() => {
    if (isTajweedType) {
      setShowTajweedForm(true);
      // Reset sub-type when switching to tajweed
      if (!selectedTajweedSubType) {
        setSelectedTajweedSubType("");
      }
    } else {
      setShowTajweedForm(false);
      setSelectedTajweedSubType("");
      setSelectedArabicLetter("");
    }
  }, [selectedType, isTajweedType, selectedTajweedSubType]);

  // Map tajweed sub-type to rule
  useEffect(() => {
    if (selectedTajweedSubType === "Holding") {
      setTajweedRule('ghunna');
      setHoldRequired(true);
    } else if (selectedTajweedSubType === "Stretching") {
      setTajweedRule('madd');
    } else if (selectedTajweedSubType === "Heavy Letter") {
      setTajweedRule('heavy_letter');
    } else if (selectedTajweedSubType === "Light Letter") {
      setTajweedRule('makhraj');
    }
  }, [selectedTajweedSubType]);

  const handleSave = () => {
    if (!selectedType || !word) return;

    // Validate tajweed sub-type selection
    if (isTajweedType && !selectedTajweedSubType) {
      alert('Please select a Tajweed sub-type.');
      return;
    }

    // Validate Arabic letter selection for Heavy/Light Letter
    if (showArabicLetterSelector && !selectedArabicLetter) {
      alert('Please select an Arabic letter.');
      return;
    }

    // Map selected type to internal mistake type
    let internalType = selectedType;
    if (isTajweedType) {
      if (selectedTajweedSubType === "Holding") internalType = "Ghunna Error";
      else if (selectedTajweedSubType === "Stretching") internalType = "Mad (Elongation) Error";
      else if (selectedTajweedSubType === "Heavy Letter") internalType = "Heavy Letter";
      else if (selectedTajweedSubType === "Light Letter") internalType = "Light L";
    }

    let tajweedData: StructuredTajweedData | undefined;
    if (isTajweedType && showTajweedForm && selectedTajweedSubType) {
      const focusLettersArray = selectedArabicLetter 
        ? [selectedArabicLetter] 
        : focusLetters.split(',').map(l => l.trim()).filter(Boolean);
      
      tajweedData = {
        stretchCount: showStretchCount ? stretchCount : undefined,
        holdRequired: showHoldRequired ? holdRequired : undefined,
        focusLetters: focusLettersArray.length > 0 ? focusLettersArray : undefined,
        tajweedRule: tajweedRule || undefined,
        teacherNote: note.trim() || undefined
      };
    }

    onSave(word, internalType, note, audioBlob || undefined, selectedLetterIndex, tajweedData);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
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
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  if (!word) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="ltr">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${isMobile ? 'max-w-full' : 'max-w-2xl'} max-h-[90vh] overflow-hidden flex flex-col border-2 border-primary/20`} dir="ltr">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-primary to-primary/90 border-b border-primary/20" dir="ltr">
          <div className="flex items-center justify-between" dir="ltr">
            <div dir="ltr" className="text-left">
              <h2 className="text-xl font-bold text-white text-left" dir="ltr">Mark Mistake</h2>
              <p className="text-white/80 text-sm mt-1 text-left" dir="ltr">
                Surah {word.surah}, Ayah {word.ayah}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all text-xl font-bold"
              dir="ltr"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4" dir="ltr">
          {/* Mistake Type Selection */}
          <div dir="ltr" className="text-left">
            <label className="block text-sm font-bold text-gray-700 mb-2 text-left" dir="ltr">
              Mistake Type <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setSelectedTajweedSubType("");
                setSelectedArabicLetter("");
              }}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-left"
              dir="ltr"
            >
              <option value="">Choose...</option>
              {MISTAKE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Tajweed Sub-Type Selection - Show when Tajweed Error is selected */}
          {isTajweedType && (
            <div dir="ltr" className="text-left">
              <label className="block text-sm font-bold text-gray-700 mb-2 text-left" dir="ltr">
                Tajweed Sub-Type <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedTajweedSubType}
                onChange={(e) => {
                  setSelectedTajweedSubType(e.target.value);
                  setSelectedArabicLetter("");
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-left"
                dir="ltr"
              >
                <option value="">Choose...</option>
                {TAJWEED_SUB_TYPES.map(subType => (
                  <option key={subType} value={subType}>{subType}</option>
                ))}
              </select>
            </div>
          )}

          {/* Arabic Letter Selection - Show for Heavy Letter and Light Letter */}
          {showArabicLetterSelector && (
            <div dir="ltr" className="text-left">
              <label className="block text-sm font-bold text-gray-700 mb-2 text-left" dir="ltr">
                Select Arabic Letter <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedArabicLetter}
                onChange={(e) => setSelectedArabicLetter(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-left"
                dir="ltr"
              >
                <option value="">Choose...</option>
                {ARABIC_LETTERS.map(letter => (
                  <option key={letter.value} value={letter.value} dir="ltr">
                    {letter.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Stretch Count - Show for Stretching */}
          {showStretchCount && (
            <div dir="ltr" className="text-left">
              <label className="block text-sm font-bold text-gray-700 mb-2 text-left" dir="ltr">
                Stretch Count (Harakat) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2" dir="ltr">
                {STRETCH_COUNTS.map(count => (
                  <button
                    key={count.value}
                    type="button"
                    onClick={() => setStretchCount(count.value)}
                    className={`px-3 py-2 rounded-lg border-2 font-semibold transition-all text-left ${
                      stretchCount === count.value
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-primary/50'
                    }`}
                    dir="ltr"
                  >
                    {count.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hold Required - Show for Holding */}
          {showHoldRequired && (
            <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4" dir="ltr">
              <label className="flex items-center gap-3 cursor-pointer" dir="ltr">
                <input
                  type="checkbox"
                  checked={holdRequired}
                  onChange={(e) => setHoldRequired(e.target.checked)}
                  className="w-5 h-5 text-primary"
                  disabled
                />
                <span className="text-sm font-bold text-blue-900 text-left" dir="ltr">
                  Ghunna (Nasalization) Required
                </span>
              </label>
            </div>
          )}

          {/* Note - Available for all mistake types */}
          <div dir="ltr" className="text-left">
            <label className="block text-sm font-bold text-gray-700 mb-2 text-left" dir="ltr">
              Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Write anything you want to add..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg resize-none text-left"
              dir="ltr"
            />
          </div>

          {/* Audio Recording */}
          <div dir="ltr" className="text-left">
            <label className="block text-sm font-bold text-gray-700 mb-2 text-left" dir="ltr">
              Audio Correction (Optional)
            </label>
            <div className="flex items-center gap-3" dir="ltr">
              {!isRecording && !audioBlob && (
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                  Record Audio
                </button>
              )}
              {isRecording && (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2 animate-pulse"
                >
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                  Stop Recording
                </button>
              )}
              {audioBlob && audioUrl && !isRecording && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Audio recorded
                    <button
                      type="button"
                      onClick={() => {
                        setAudioBlob(null);
                        if (audioUrl) {
                          URL.revokeObjectURL(audioUrl);
                          setAudioUrl(null);
                        }
                      }}
                      className="text-red-600 hover:text-red-700 text-xs underline"
                    >
                      Remove
                    </button>
                  </div>
                  <audio controls src={audioUrl} className="w-full h-10">
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3" dir="ltr">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all text-left"
            dir="ltr"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedType || (isTajweedType && !selectedTajweedSubType) || (showArabicLetterSelector && !selectedArabicLetter)}
            className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
            dir="ltr"
          >
            Save Mistake
          </button>
        </div>
      </div>
    </div>
  );
};

