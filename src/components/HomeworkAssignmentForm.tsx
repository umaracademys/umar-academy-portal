import React, { useState, useEffect } from 'react';
import { HomeworkItem, HomeworkRange } from '../types/assignment';

interface HomeworkSuggestion {
  suggested: boolean;
  range?: HomeworkRange;
  ticketIds?: string[];
  lastApprovedAt?: string;
}

interface HomeworkSuggestions {
  sabq: HomeworkSuggestion;
  sabqi: HomeworkSuggestion;
  manzil: HomeworkSuggestion;
}

interface HomeworkAssignmentFormProps {
  studentId: string;
  assignmentId?: string;
  onSave: (homeworkItems: HomeworkItem[], notes: string) => Promise<void>;
  onClose: () => void;
}

// Surah names mapping (simplified - you may want to import from a proper source)
const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Ali \'Imran', 4: 'An-Nisa', 5: 'Al-Ma\'idah',
  6: 'Al-An\'am', 7: 'Al-A\'raf', 8: 'Al-Anfal', 9: 'At-Tawbah', 10: 'Yunus',
  11: 'Hud', 12: 'Yusuf', 13: 'Ar-Ra\'d', 14: 'Ibrahim', 15: 'Al-Hijr',
  16: 'An-Nahl', 17: 'Al-Isra', 18: 'Al-Kahf', 19: 'Maryam', 20: 'Ta-Ha',
  // Add more as needed
};

const HomeworkAssignmentForm: React.FC<HomeworkAssignmentFormProps> = ({
  studentId,
  assignmentId,
  onSave,
  onClose
}) => {
  const [selectedType, setSelectedType] = useState<'sabq' | 'sabqi' | 'manzil' | null>(null);
  const [homeworkItems, setHomeworkItems] = useState<HomeworkItem[]>([]);
  const [notes, setNotes] = useState('');
  const [suggestions, setSuggestions] = useState<HomeworkSuggestions | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for current homework item
  const [currentItem, setCurrentItem] = useState<Partial<HomeworkItem>>({
    type: null,
    range: {
      mode: 'surah_ayah',
      from: { surah: 1, surahName: '', ayah: 1 },
      to: { surah: 1, surahName: '', ayah: 1 }
    },
    source: { suggestedFrom: 'manual', ticketIds: [] }
  });

  // Fetch suggestions on mount
  useEffect(() => {
    fetchSuggestions();
  }, [studentId]);

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE}/students/${studentId}/homework-suggestions`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleUseSuggestion = (type: 'sabq' | 'sabqi' | 'manzil') => {
    const suggestion = suggestions?.[type];
    if (suggestion?.suggested && suggestion.range) {
      const newItem: HomeworkItem = {
        type,
        range: suggestion.range,
        source: {
          suggestedFrom: 'ticket',
          ticketIds: suggestion.ticketIds || []
        }
      };
      setHomeworkItems(prev => [...prev, newItem]);
      setSelectedType(null);
    }
  };

  const handleModifySuggestion = (type: 'sabq' | 'sabqi' | 'manzil') => {
    const suggestion = suggestions?.[type];
    if (suggestion?.suggested && suggestion.range) {
      setCurrentItem({
        type,
        range: { ...suggestion.range },
        source: {
          suggestedFrom: 'ticket',
          ticketIds: suggestion.ticketIds || []
        }
      });
      setSelectedType(type);
    }
  };

  const handleIgnoreSuggestion = (type: 'sabq' | 'sabqi' | 'manzil') => {
    setSelectedType(type);
    setCurrentItem({
      type,
      range: {
        mode: type === 'sabq' ? 'surah_ayah' : type === 'sabqi' ? 'juz_juz' : 'multiple_juz',
        from: { surah: 1, surahName: '', ayah: 1 },
        to: { surah: 1, surahName: '', ayah: 1 }
      },
      source: { suggestedFrom: 'manual', ticketIds: [] }
    });
  };

  const handleAddItem = () => {
    if (!currentItem.type || !currentItem.range) return;

    // Validate range based on mode
    if (currentItem.range.mode === 'surah_ayah') {
      if (!currentItem.range.from?.surah || !currentItem.range.from?.ayah || !currentItem.range.to?.ayah) {
        alert('Please fill in all required fields for Surah-Ayah range');
        return;
      }
      if (currentItem.range.from.ayah > currentItem.range.to.ayah) {
        alert('From Ayah must be less than or equal to To Ayah');
        return;
      }
    } else if (currentItem.range.mode === 'juz_juz' || currentItem.range.mode === 'multiple_juz') {
      if (!currentItem.range.juzList || currentItem.range.juzList.length === 0) {
        alert('Please select at least one Juz');
        return;
      }
      if (currentItem.range.juzList.some(juz => juz < 1 || juz > 30)) {
        alert('Juz values must be between 1 and 30');
        return;
      }
    }

    const newItem: HomeworkItem = {
      type: currentItem.type,
      range: currentItem.range,
      source: currentItem.source || { suggestedFrom: 'manual', ticketIds: [] }
    };

    setHomeworkItems(prev => [...prev, newItem]);
    setSelectedType(null);
    setCurrentItem({
      type: null,
      range: {
        mode: 'surah_ayah',
        from: { surah: 1, surahName: '', ayah: 1 },
        to: { surah: 1, surahName: '', ayah: 1 }
      },
      source: { suggestedFrom: 'manual', ticketIds: [] }
    });
  };

  const handleRemoveItem = (index: number) => {
    setHomeworkItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (homeworkItems.length === 0) {
      alert('Please add at least one homework item');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(homeworkItems, notes);
      onClose();
    } catch (error) {
      console.error('Error saving homework:', error);
      alert('Failed to save homework. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderSuggestionCard = (type: 'sabq' | 'sabqi' | 'manzil', label: string) => {
    const suggestion = suggestions?.[type];
    if (!suggestion?.suggested) return null;

    const formatRange = (range: HomeworkRange) => {
      if (range.mode === 'surah_ayah') {
        return `${range.from?.surahName || `Surah ${range.from?.surah}`}${range.from?.ayah ? `, Ayah ${range.from?.ayah}` : ''}${range.to?.ayah && range.to.ayah !== range.from?.ayah ? `-${range.to.ayah}` : ''}`;
      } else if (range.mode === 'juz_juz') {
        return `Juz ${range.juzList?.[0]}`;
      } else if (range.mode === 'multiple_juz') {
        return `Juz ${range.juzList?.join(', ')}`;
      } else if (range.mode === 'surah_surah') {
        return `${range.from?.surahName || `Surah ${range.from?.surah}`} to ${range.to?.surahName || `Surah ${range.to?.surah}`}`;
      }
      return 'Unknown range';
    };

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900 mb-1">
              💡 Suggested from recent tickets
            </p>
            <p className="text-sm text-blue-700 mb-2">
              {label}: {formatRange(suggestion.range!)}
            </p>
            {suggestion.lastApprovedAt && (
              <p className="text-xs text-blue-600">
                Last approved: {new Date(suggestion.lastApprovedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex gap-2 ml-4">
            <button
              type="button"
              onClick={() => handleUseSuggestion(type)}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition"
            >
              Use
            </button>
            <button
              type="button"
              onClick={() => handleModifySuggestion(type)}
              className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition"
            >
              Modify
            </button>
            <button
              type="button"
              onClick={() => handleIgnoreSuggestion(type)}
              className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition"
            >
              Ignore
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFormFields = () => {
    if (!selectedType) return null;

    const mode = currentItem.range?.mode || (selectedType === 'sabq' ? 'surah_ayah' : selectedType === 'sabqi' ? 'juz_juz' : 'multiple_juz');

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Add {selectedType === 'sabq' ? 'Sabq' : selectedType === 'sabqi' ? 'Sabqi' : 'Manzil'} Homework
        </h3>

        {/* Sabq: Surah-Ayah mode */}
        {selectedType === 'sabq' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Surah
              </label>
              <select
                value={currentItem.range?.from?.surah || 1}
                onChange={(e) => {
                  const surah = parseInt(e.target.value);
                  setCurrentItem(prev => ({
                    ...prev,
                    range: {
                      ...prev.range!,
                      mode: 'surah_ayah',
                      from: {
                        surah,
                        surahName: SURAH_NAMES[surah] || `Surah ${surah}`,
                        ayah: prev.range?.from?.ayah || 1
                      },
                      to: {
                        surah,
                        surahName: SURAH_NAMES[surah] || `Surah ${surah}`,
                        ayah: prev.range?.to?.ayah || 1
                      }
                    }
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary"
              >
                {Object.entries(SURAH_NAMES).map(([num, name]) => (
                  <option key={num} value={num}>{num}. {name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Ayah
                </label>
                <input
                  type="number"
                  min="1"
                  value={currentItem.range?.from?.ayah || 1}
                  onChange={(e) => {
                    const ayah = parseInt(e.target.value);
                    setCurrentItem(prev => ({
                      ...prev,
                      range: {
                        ...prev.range!,
                        from: { ...prev.range!.from!, ayah }
                      }
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Ayah
                </label>
                <input
                  type="number"
                  min="1"
                  value={currentItem.range?.to?.ayah || 1}
                  onChange={(e) => {
                    const ayah = parseInt(e.target.value);
                    setCurrentItem(prev => ({
                      ...prev,
                      range: {
                        ...prev.range!,
                        to: { ...prev.range!.to!, ayah }
                      }
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Sabqi: Toggle between Surah-Surah and Juz-Juz */}
        {selectedType === 'sabqi' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Range Mode
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="sabqi-mode"
                    checked={mode === 'surah_surah'}
                    onChange={() => setCurrentItem(prev => ({
                      ...prev,
                      range: {
                        mode: 'surah_surah',
                        from: { surah: 1, surahName: '', ayah: undefined },
                        to: { surah: 1, surahName: '', ayah: undefined }
                      }
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Surah → Surah</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="sabqi-mode"
                    checked={mode === 'juz_juz'}
                    onChange={() => setCurrentItem(prev => ({
                      ...prev,
                      range: {
                        mode: 'juz_juz',
                        juzList: [1]
                      }
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Juz → Juz</span>
                </label>
              </div>
            </div>

            {mode === 'surah_surah' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Surah
                  </label>
                  <select
                    value={currentItem.range?.from?.surah || 1}
                    onChange={(e) => {
                      const surah = parseInt(e.target.value);
                      setCurrentItem(prev => ({
                        ...prev,
                        range: {
                          ...prev.range!,
                          from: {
                            surah,
                            surahName: SURAH_NAMES[surah] || `Surah ${surah}`,
                            ayah: undefined
                          }
                        }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  >
                    {Object.entries(SURAH_NAMES).map(([num, name]) => (
                      <option key={num} value={num}>{num}. {name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Surah
                  </label>
                  <select
                    value={currentItem.range?.to?.surah || 1}
                    onChange={(e) => {
                      const surah = parseInt(e.target.value);
                      setCurrentItem(prev => ({
                        ...prev,
                        range: {
                          ...prev.range!,
                          to: {
                            surah,
                            surahName: SURAH_NAMES[surah] || `Surah ${surah}`,
                            ayah: undefined
                          }
                        }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  >
                    {Object.entries(SURAH_NAMES).map(([num, name]) => (
                      <option key={num} value={num}>{num}. {name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Juz
                </label>
                <select
                  value={currentItem.range?.juzList?.[0] || 1}
                  onChange={(e) => {
                    const juz = parseInt(e.target.value);
                    setCurrentItem(prev => ({
                      ...prev,
                      range: {
                        ...prev.range!,
                        mode: 'juz_juz',
                        juzList: [juz]
                      }
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(juz => (
                    <option key={juz} value={juz}>Juz {juz}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Manzil: Multiple Juz */}
        {selectedType === 'manzil' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Juz (multiple)
            </label>
            <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto border border-gray-300 rounded p-2">
              {Array.from({ length: 30 }, (_, i) => i + 1).map(juz => (
                <label key={juz} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={currentItem.range?.juzList?.includes(juz) || false}
                    onChange={(e) => {
                      const currentList = currentItem.range?.juzList || [];
                      const newList = e.target.checked
                        ? [...currentList, juz].sort((a, b) => a - b)
                        : currentList.filter(j => j !== juz);
                      setCurrentItem(prev => ({
                        ...prev,
                        range: {
                          ...prev.range!,
                          mode: 'multiple_juz',
                          juzList: newList
                        }
                      }));
                    }}
                    className="mr-1"
                  />
                  <span className="text-xs">Juz {juz}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleAddItem}
            className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 transition"
          >
            Add Item
          </button>
          <button
            type="button"
            onClick={() => setSelectedType(null)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Assign Homework</h2>
          <p className="text-sm text-gray-600 mt-1">Create structured homework assignments</p>
        </div>

        <div className="p-6">
          {/* Suggestions Section */}
          {loadingSuggestions ? (
            <div className="text-center py-4 text-gray-500">Loading suggestions...</div>
          ) : (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Suggestions from Recent Tickets</h3>
              {renderSuggestionCard('sabq', 'Sabq')}
              {renderSuggestionCard('sabqi', 'Sabqi')}
              {renderSuggestionCard('manzil', 'Manzil')}
              {(!suggestions?.sabq?.suggested && !suggestions?.sabqi?.suggested && !suggestions?.manzil?.suggested) && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No suggestions available. Create homework manually below.
                </p>
              )}
            </div>
          )}

          {/* Type Selection */}
          {!selectedType && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Homework Type</h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('sabq');
                    setCurrentItem({
                      type: 'sabq',
                      range: {
                        mode: 'surah_ayah',
                        from: { surah: 1, surahName: 'Al-Fatihah', ayah: 1 },
                        to: { surah: 1, surahName: 'Al-Fatihah', ayah: 1 }
                      },
                      source: { suggestedFrom: 'manual', ticketIds: [] }
                    });
                  }}
                  className="px-4 py-3 border-2 border-purple-200 bg-purple-50 text-purple-700 rounded-lg font-medium hover:bg-purple-100 transition"
                >
                  📖 Sabq
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('sabqi');
                    setCurrentItem({
                      type: 'sabqi',
                      range: {
                        mode: 'juz_juz',
                        juzList: [1]
                      },
                      source: { suggestedFrom: 'manual', ticketIds: [] }
                    });
                  }}
                  className="px-4 py-3 border-2 border-blue-200 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition"
                >
                  📚 Sabqi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('manzil');
                    setCurrentItem({
                      type: 'manzil',
                      range: {
                        mode: 'multiple_juz',
                        juzList: []
                      },
                      source: { suggestedFrom: 'manual', ticketIds: [] }
                    });
                  }}
                  className="px-4 py-3 border-2 border-green-200 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100 transition"
                >
                  📿 Manzil
                </button>
              </div>
            </div>
          )}

          {/* Form Fields */}
          {renderFormFields()}

          {/* Added Items List */}
          {homeworkItems.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Added Homework Items</h3>
              <div className="space-y-2">
                {homeworkItems.map((item, index) => {
                  const formatRange = (range: HomeworkRange) => {
                    if (range.mode === 'surah_ayah') {
                      return `${range.from?.surahName || `Surah ${range.from?.surah}`}${range.from?.ayah ? `, Ayah ${range.from?.ayah}` : ''}${range.to?.ayah && range.to.ayah !== range.from?.ayah ? `-${range.to.ayah}` : ''}`;
                    } else if (range.mode === 'juz_juz') {
                      return `Juz ${range.juzList?.[0]}`;
                    } else if (range.mode === 'multiple_juz') {
                      return `Juz ${range.juzList?.join(', ')}`;
                    } else if (range.mode === 'surah_surah') {
                      return `${range.from?.surahName || `Surah ${range.from?.surah}`} to ${range.to?.surahName || `Surah ${range.to?.surah}`}`;
                    }
                    return 'Unknown range';
                  };

                  return (
                    <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded p-3">
                      <div>
                        <span className="text-sm font-medium text-gray-900 capitalize">{item.type}:</span>
                        <span className="text-sm text-gray-700 ml-2">{formatRange(item.range)}</span>
                        {item.source.suggestedFrom === 'ticket' && (
                          <span className="text-xs text-blue-600 ml-2">(from tickets)</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              General Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary resize-none"
              placeholder="Add any additional notes or instructions..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving || homeworkItems.length === 0}
            >
              {isSaving ? 'Saving...' : 'Save Homework'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeworkAssignmentForm;

