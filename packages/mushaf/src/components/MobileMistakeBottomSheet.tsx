import React, { useState } from 'react';
import { Word } from './InteractiveMushaf';

interface MobileMistakeBottomSheetProps {
  word: Word | null;
  letterIndex?: number;
  onClose: () => void;
  onSave: (word: Word, type: string, note?: string, audioBlob?: Blob, letterIndex?: number) => void;
}

/**
 * Mobile bottom sheet for mistake marking
 * Replaces modal on mobile devices
 */
export const MobileMistakeBottomSheet: React.FC<MobileMistakeBottomSheetProps> = ({
  word,
  letterIndex,
  onClose,
  onSave,
}) => {
  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'mistake' | 'atkee' | 'tajweed' | null>(null);
  const [note, setNote] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  if (!word) return null;

  const mistakeTypes = {
    mistake: ['Memory Mistake', 'Holding/Fluency Mistake', 'Letter Mistake', 'Other Mistake'],
    atkee: ['Atkee'],
    tajweed: ['Mad (Elongation) Error', 'Ikhfa Error', 'Ghunna Error', 'Heavy Letter', 'No Rounding Lips', 'Heavy H', 'Light L'],
  };

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

  const handleSave = () => {
    if (selectedType) {
      onSave(word, selectedType, note, audioBlob || undefined, letterIndex);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-2xl z-50 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ direction: 'ltr' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Mark Mistake – Surah {word.surah}, Ayah {word.ayah}
          </h2>
          {letterIndex !== undefined && (
            <p className="text-sm text-gray-600 mt-1">Letter {letterIndex + 1}</p>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Category Selection */}
          {!selectedCategory ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Category:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSelectedCategory('mistake')}
                  className="px-4 py-3 bg-red-50 border-2 border-red-200 text-red-700 rounded-lg font-medium hover:bg-red-100 transition"
                >
                  🔴 Mistake
                </button>
                <button
                  onClick={() => setSelectedCategory('atkee')}
                  className="px-4 py-3 bg-yellow-50 border-2 border-yellow-200 text-yellow-700 rounded-lg font-medium hover:bg-yellow-100 transition"
                >
                  🟡 Atkee
                </button>
                <button
                  onClick={() => setSelectedCategory('tajweed')}
                  className="px-4 py-3 bg-blue-50 border-2 border-blue-200 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition"
                >
                  🔵 Tajweed
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Type Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Mistake Type:
                  </label>
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedType('');
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Change Category
                  </button>
                </div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-base"
                >
                  <option value="">Choose...</option>
                  {mistakeTypes[selectedCategory].map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Optional Note:
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-base"
                  placeholder="Add comment..."
                  rows={3}
                />
              </div>

              {/* Audio Recording */}
              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Audio Recording (Optional):
                </label>
                {!audioUrl ? (
                  <div className="flex items-center gap-2">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                        Record Audio
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                      >
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                        Stop ({formatTime(recordingTime)})
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <audio controls src={audioUrl} className="w-full" />
                    <div className="flex gap-2">
                      <button
                        onClick={deleteRecording}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                      >
                        Delete
                      </button>
                      <button
                        onClick={startRecording}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                      >
                        Record Again
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-gray-200 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedType}
            className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
};

