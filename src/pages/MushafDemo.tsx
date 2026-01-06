import React, { useState } from 'react';
// @ts-ignore - Demo page, mushaf package may not be available in all environments
import { InteractiveMushaf } from '@umar-academy/mushaf';
// @ts-ignore - Demo page, mushaf package may not be available in all environments
import { MushafMistake } from '@umar-academy/mushaf';

const MushafDemo: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [mistakes, setMistakes] = useState<MushafMistake[]>([]);
  const [historicalMistakes] = useState<MushafMistake[]>([]);

  const handleMistakeMark = (mistake: Omit<MushafMistake, 'id' | 'timestamp'>) => {
    const newMistake: MushafMistake = {
      ...mistake,
      id: `mistake-${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    };
    setMistakes(prev => [...prev, newMistake]);
    console.log('✅ Mistake marked:', newMistake);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mushaf Component Demo - Letter-Level Mistake Marking
          </h1>
          <p className="text-gray-600 mb-4">
            Click on any <strong>letter</strong> in a word to mark a letter-level mistake, or click on a <strong>word</strong> to mark a word-level mistake.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h3 className="font-semibold text-blue-900 mb-2">How to test letter-level mistakes:</h3>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
              <li>Click on any <strong>individual letter</strong> in a word</li>
              <li>Select a letter-level mistake type (Letter Mistake, Heavy Letter, etc.)</li>
              <li>Choose the specific letter from the letter buttons</li>
              <li>Save - only that letter will be highlighted!</li>
            </ol>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <strong>Current Mistakes:</strong> {mistakes.length}
            </div>
            <button
              onClick={() => setMistakes([])}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Clear All Mistakes
            </button>
          </div>
        </div>

        {/* Mushaf Component */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <InteractiveMushaf
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            mistakes={mistakes}
            historicalMistakes={historicalMistakes}
            onMistakeMark={handleMistakeMark}
            readOnly={false}
            mode="marking"
            showHistorical={false}
          />
        </div>

        {/* Mistakes List */}
        {mistakes.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Marked Mistakes ({mistakes.length})
            </h2>
            <div className="space-y-3">
              {mistakes.map((mistake) => (
                <div
                  key={mistake.id}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                          {mistake.type}
                        </span>
                        {mistake.letterIndex !== undefined && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                            Letter #{mistake.letterIndex + 1}
                          </span>
                        )}
                        {mistake.wordIndex !== undefined && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            Word #{mistake.wordIndex}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">
                        <strong>Page:</strong> {mistake.page} |{' '}
                        <strong>Surah:</strong> {mistake.surah} |{' '}
                        <strong>Ayah:</strong> {mistake.ayah}
                      </p>
                      {mistake.note && (
                        <p className="text-sm text-gray-600 mt-1 italic">
                          Note: {mistake.note}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setMistakes(prev => prev.filter(m => m.id !== mistake.id))}
                      className="ml-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MushafDemo;

