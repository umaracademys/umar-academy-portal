import React, { useState, useEffect } from 'react';
import { StructuredTajweedData, TajweedRule } from '../types/mistake';

interface TajweedMistakeFormProps {
  wordText: string;
  surah: number;
  ayah: number;
  onSave: (tajweedData: StructuredTajweedData, note: string, audioBlob?: Blob) => void;
  onClose: () => void;
  existingData?: StructuredTajweedData;
}

const TAJWEED_RULES: Array<{ value: TajweedRule; label: string; description: string }> = [
  { value: 'ikhfa', label: 'Ikhfa', description: 'Hidden pronunciation (noon/tanween + certain letters)' },
  { value: 'idgham', label: 'Idgham', description: 'Merging (noon/tanween + certain letters)' },
  { value: 'iqlab', label: 'Iqlab', description: 'Conversion (noon/tanween + ب)' },
  { value: 'qalqalah', label: 'Qalqalah', description: 'Echo sound (ق ط ب ج د)' },
  { value: 'heavy_letter', label: 'Heavy Letter', description: 'Tafkheem (heavy pronunciation)' },
  { value: 'makhraj', label: 'Makhraj', description: 'Point of articulation error' },
  { value: 'madd', label: 'Madd', description: 'Elongation (stretch count)' },
  { value: 'ghunna', label: 'Ghunna', description: 'Nasalization required' },
  { value: 'shaddah', label: 'Shaddah', description: 'Doubling required' },
];

const STRETCH_COUNTS: Array<{ value: 0 | 2 | 4 | 6; label: string }> = [
  { value: 0, label: 'No stretch' },
  { value: 2, label: '2 Harakat' },
  { value: 4, label: '4 Harakat' },
  { value: 6, label: '6 Harakat' },
];

const TajweedMistakeForm: React.FC<TajweedMistakeFormProps> = ({
  wordText,
  surah,
  ayah,
  onSave,
  onClose,
  existingData
}) => {
  const [tajweedRule, setTajweedRule] = useState<TajweedRule>(existingData?.tajweedRule || 'ikhfa');
  const [stretchCount, setStretchCount] = useState<0 | 2 | 4 | 6>(existingData?.stretchCount || 0);
  const [holdRequired, setHoldRequired] = useState(existingData?.holdRequired || false);
  const [focusLetters, setFocusLetters] = useState<string>(existingData?.focusLetters?.join(', ') || '');
  const [teacherNote, setTeacherNote] = useState(existingData?.teacherNote || '');
  const [audioBlob, setAudioBlob] = useState<Blob | undefined>(undefined);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const selectedRule = TAJWEED_RULES.find(r => r.value === tajweedRule);

  // Show stretch count only for madd
  const showStretchCount = tajweedRule === 'madd';
  
  // Show hold required for ghunna and shaddah
  const showHoldRequired = tajweedRule === 'ghunna' || tajweedRule === 'shaddah';

  const handleSave = () => {
    if (!teacherNote.trim()) {
      alert('Please provide a teacher note explaining the correction.');
      return;
    }

    if (teacherNote.length > 200) {
      alert('Teacher note must be 200 characters or less.');
      return;
    }

    const tajweedData: StructuredTajweedData = {
      stretchCount: showStretchCount ? stretchCount : 0,
      holdRequired: showHoldRequired ? holdRequired : false,
      focusLetters: focusLetters.split(',').map(l => l.trim()).filter(Boolean),
      tajweedRule,
      teacherNote: teacherNote.trim()
    };

    onSave(tajweedData, teacherNote, audioBlob);
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border-2 border-primary/20">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-primary to-primary/90 border-b border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Tajweed Mistake Details</h2>
              <p className="text-white/80 text-sm mt-1">
                Surah {surah}, Ayah {ayah} • Word: {wordText}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Tajweed Rule Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Tajweed Rule <span className="text-red-500">*</span>
            </label>
            <select
              value={tajweedRule}
              onChange={(e) => setTajweedRule(e.target.value as TajweedRule)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            >
              {TAJWEED_RULES.map(rule => (
                <option key={rule.value} value={rule.value}>
                  {rule.label} - {rule.description}
                </option>
              ))}
            </select>
            {selectedRule && (
              <p className="text-xs text-gray-500 mt-1">{selectedRule.description}</p>
            )}
          </div>

          {/* Stretch Count (for Madd) */}
          {showStretchCount && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Stretch Count (Harakat) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {STRETCH_COUNTS.map(count => (
                  <button
                    key={count.value}
                    type="button"
                    onClick={() => setStretchCount(count.value)}
                    className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all ${
                      stretchCount === count.value
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-primary/50'
                    }`}
                  >
                    {count.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hold Required (for Ghunna/Shaddah) */}
          {showHoldRequired && (
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={holdRequired}
                  onChange={(e) => setHoldRequired(e.target.checked)}
                  className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm font-bold text-gray-700">
                  {tajweedRule === 'ghunna' ? 'Ghunna (Nasalization) Required' : 'Shaddah (Doubling) Required'}
                </span>
              </label>
            </div>
          )}

          {/* Focus Letters */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Focus Letters (comma-separated)
            </label>
            <input
              type="text"
              value={focusLetters}
              onChange={(e) => setFocusLetters(e.target.value)}
              placeholder="e.g., ب, ت, ث"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter specific letters the student should focus on (Arabic or transliteration)
            </p>
          </div>

          {/* Teacher Note */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Teacher Note <span className="text-red-500">*</span>
              <span className="text-xs font-normal text-gray-500 ml-2">
                ({teacherNote.length}/200 characters)
              </span>
            </label>
            <textarea
              value={teacherNote}
              onChange={(e) => setTeacherNote(e.target.value)}
              rows={4}
              maxLength={200}
              placeholder="Explain how to read this correctly..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Audio Recording */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Audio Correction (Optional)
            </label>
            <div className="flex items-center gap-3">
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
              {audioBlob && !isRecording && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Audio recorded ({Math.round(audioBlob.size / 1024)} KB)
                  <button
                    type="button"
                    onClick={() => setAudioBlob(undefined)}
                    className="text-red-600 hover:text-red-700 text-xs underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-md"
          >
            Save Mistake
          </button>
        </div>
      </div>
    </div>
  );
};

export default TajweedMistakeForm;

