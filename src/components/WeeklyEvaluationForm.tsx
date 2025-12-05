import React, { useState, useEffect } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';

interface WeeklyEvaluationFormProps {
  studentId: string;
  studentName: string;
  onClose: () => void;
  onSuccess?: () => void;
  existingEvaluation?: any; // For editing
}

interface MistakeEntry {
  type: string;
  description: string;
  location: string;
  frequency: number;
}

const WeeklyEvaluationForm: React.FC<WeeklyEvaluationFormProps> = ({
  studentId,
  studentName,
  onClose,
  onSuccess,
  existingEvaluation
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get current week dates
  const getWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
    const monday = new Date(today.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: monday, end: sunday };
  };

  const weekDates = getWeekDates();

  const [formData, setFormData] = useState({
    weekStartDate: existingEvaluation 
      ? new Date(existingEvaluation.weekStartDate).toISOString().split('T')[0]
      : weekDates.start.toISOString().split('T')[0],
    weekEndDate: existingEvaluation
      ? new Date(existingEvaluation.weekEndDate).toISOString().split('T')[0]
      : weekDates.end.toISOString().split('T')[0],
    tajweedEvaluation: {
      overallRating: existingEvaluation?.tajweedEvaluation?.overallRating || 5,
      strengths: existingEvaluation?.tajweedEvaluation?.strengths || '',
      areasForImprovement: existingEvaluation?.tajweedEvaluation?.areasForImprovement || '',
      specificNotes: existingEvaluation?.tajweedEvaluation?.specificNotes || ''
    },
    memoryEvaluation: {
      overallRating: existingEvaluation?.memoryEvaluation?.overallRating || 5,
      memorizedPages: existingEvaluation?.memoryEvaluation?.memorizedPages || '',
      retentionQuality: existingEvaluation?.memoryEvaluation?.retentionQuality || '',
      specificNotes: existingEvaluation?.memoryEvaluation?.specificNotes || ''
    },
    mistakes: {
      mistakesMade: existingEvaluation?.mistakes?.mistakesMade || [] as MistakeEntry[],
      howFixed: existingEvaluation?.mistakes?.howFixed || '',
      improvement: existingEvaluation?.mistakes?.improvement || ''
    },
    generalNotes: existingEvaluation?.generalNotes || ''
  });

  const [newMistake, setNewMistake] = useState<MistakeEntry>({
    type: '',
    description: '',
    location: '',
    frequency: 1
  });

  const addMistake = () => {
    if (!newMistake.type || !newMistake.description) {
      alert('Please fill in mistake type and description');
      return;
    }
    setFormData({
      ...formData,
      mistakes: {
        ...formData.mistakes,
        mistakesMade: [...formData.mistakes.mistakesMade, { ...newMistake }]
      }
    });
    setNewMistake({ type: '', description: '', location: '', frequency: 1 });
  };

  const removeMistake = (index: number) => {
    setFormData({
      ...formData,
      mistakes: {
        ...formData.mistakes,
        mistakesMade: formData.mistakes.mistakesMade.filter((_, i) => i !== index)
      }
    });
  };

  const handleSubmit = async (status: 'draft' | 'submitted') => {
    if (status === 'submitted') {
      if (!formData.tajweedEvaluation.overallRating || !formData.memoryEvaluation.overallRating) {
        setError('Please provide ratings for both Tajweed and Memory');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/weekly-evaluations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          id: existingEvaluation?.id,
          studentId,
          studentName,
          teacherId: user?.id || '',
          teacherName: user?.name || user?.email || 'Teacher',
          weekStartDate: formData.weekStartDate,
          weekEndDate: formData.weekEndDate,
          tajweedEvaluation: formData.tajweedEvaluation,
          memoryEvaluation: formData.memoryEvaluation,
          mistakes: formData.mistakes,
          generalNotes: formData.generalNotes,
          status
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save evaluation' }));
        throw new Error(errorData.error || 'Failed to save evaluation');
      }

      setSuccess(status === 'submitted' ? 'Evaluation submitted for review!' : 'Evaluation saved as draft');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save evaluation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.85)] px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Weekly Evaluation</h2>
              <p className="text-white/80 text-sm mt-1">For {studentName}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Week Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Week Start Date</label>
              <input
                type="date"
                value={formData.weekStartDate}
                onChange={(e) => setFormData({ ...formData, weekStartDate: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Week End Date</label>
              <input
                type="date"
                value={formData.weekEndDate}
                onChange={(e) => setFormData({ ...formData, weekEndDate: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3">
              <p className="text-sm font-bold text-red-800">{error}</p>
            </div>
          )}
          {success && (
            <div className="rounded-lg border-2 border-green-500 bg-green-50 px-4 py-3">
              <p className="text-sm font-bold text-green-800">{success}</p>
            </div>
          )}

          {/* Tajweed Evaluation */}
          <div className="border-2 border-primary rounded-xl p-4">
            <h3 className="text-lg font-bold text-primary mb-4">Tajweed Evaluation</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Overall Rating (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.tajweedEvaluation.overallRating}
                  onChange={(e) => setFormData({
                    ...formData,
                    tajweedEvaluation: {
                      ...formData.tajweedEvaluation,
                      overallRating: parseInt(e.target.value) || 5
                    }
                  })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Strengths</label>
                <textarea
                  value={formData.tajweedEvaluation.strengths}
                  onChange={(e) => setFormData({
                    ...formData,
                    tajweedEvaluation: {
                      ...formData.tajweedEvaluation,
                      strengths: e.target.value
                    }
                  })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                  placeholder="What the student did well in tajweed..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Areas for Improvement</label>
                <textarea
                  value={formData.tajweedEvaluation.areasForImprovement}
                  onChange={(e) => setFormData({
                    ...formData,
                    tajweedEvaluation: {
                      ...formData.tajweedEvaluation,
                      areasForImprovement: e.target.value
                    }
                  })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                  placeholder="Areas that need work..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Specific Notes</label>
                <textarea
                  value={formData.tajweedEvaluation.specificNotes}
                  onChange={(e) => setFormData({
                    ...formData,
                    tajweedEvaluation: {
                      ...formData.tajweedEvaluation,
                      specificNotes: e.target.value
                    }
                  })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                  placeholder="Detailed tajweed notes..."
                />
              </div>
            </div>
          </div>

          {/* Memory Evaluation */}
          <div className="border-2 border-accent rounded-xl p-4">
            <h3 className="text-lg font-bold text-accent mb-4">Memory Evaluation</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Overall Rating (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.memoryEvaluation.overallRating}
                  onChange={(e) => setFormData({
                    ...formData,
                    memoryEvaluation: {
                      ...formData.memoryEvaluation,
                      overallRating: parseInt(e.target.value) || 5
                    }
                  })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Memorized Pages</label>
                <textarea
                  value={formData.memoryEvaluation.memorizedPages}
                  onChange={(e) => setFormData({
                    ...formData,
                    memoryEvaluation: {
                      ...formData.memoryEvaluation,
                      memorizedPages: e.target.value
                    }
                  })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={2}
                  placeholder="What was memorized this week..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Retention Quality</label>
                <textarea
                  value={formData.memoryEvaluation.retentionQuality}
                  onChange={(e) => setFormData({
                    ...formData,
                    memoryEvaluation: {
                      ...formData.memoryEvaluation,
                      retentionQuality: e.target.value
                    }
                  })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={2}
                  placeholder="How well they retained previous memorization..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Specific Notes</label>
                <textarea
                  value={formData.memoryEvaluation.specificNotes}
                  onChange={(e) => setFormData({
                    ...formData,
                    memoryEvaluation: {
                      ...formData.memoryEvaluation,
                      specificNotes: e.target.value
                    }
                  })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                  placeholder="Detailed memory notes..."
                />
              </div>
            </div>
          </div>

          {/* Mistakes Section */}
          <div className="border-2 border-orange-500 rounded-xl p-4">
            <h3 className="text-lg font-bold text-orange-600 mb-4">Mistakes</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mistakes Made</label>
                <div className="space-y-2 mb-3">
                  {formData.mistakes.mistakesMade.map((mistake, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{mistake.type}</p>
                        <p className="text-xs text-gray-600">{mistake.description}</p>
                        <p className="text-xs text-gray-500">Location: {mistake.location} | Frequency: {mistake.frequency}</p>
                      </div>
                      <button
                        onClick={() => removeMistake(index)}
                        className="text-red-600 hover:text-red-800 text-sm font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    value={newMistake.type}
                    onChange={(e) => setNewMistake({ ...newMistake, type: e.target.value })}
                    placeholder="Mistake type (e.g., madd, memory)"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={newMistake.location}
                    onChange={(e) => setNewMistake({ ...newMistake, location: e.target.value })}
                    placeholder="Location (surah, ayah, page)"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <textarea
                    value={newMistake.description}
                    onChange={(e) => setNewMistake({ ...newMistake, description: e.target.value })}
                    placeholder="Description of the mistake"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                    rows={2}
                  />
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Frequency</label>
                    <input
                      type="number"
                      min="1"
                      value={newMistake.frequency}
                      onChange={(e) => setNewMistake({ ...newMistake, frequency: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={addMistake}
                  className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-bold text-sm"
                >
                  + Add Mistake
                </button>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">How Mistakes Were Fixed</label>
                <textarea
                  value={formData.mistakes.howFixed}
                  onChange={(e) => setFormData({
                    ...formData,
                    mistakes: {
                      ...formData.mistakes,
                      howFixed: e.target.value
                    }
                  })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                  placeholder="How you helped the student fix these mistakes..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Improvement</label>
                <textarea
                  value={formData.mistakes.improvement}
                  onChange={(e) => setFormData({
                    ...formData,
                    mistakes: {
                      ...formData.mistakes,
                      improvement: e.target.value
                    }
                  })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                  placeholder="Progress made in fixing mistakes..."
                />
              </div>
            </div>
          </div>

          {/* General Notes */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">General Notes</label>
            <textarea
              value={formData.generalNotes}
              onChange={(e) => setFormData({ ...formData, generalNotes: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={4}
              placeholder="Additional notes about the student's progress this week..."
            />
          </div>

          {/* Admin Feedback (if exists) */}
          {existingEvaluation?.adminFeedback && (
            <div className="border-2 border-blue-500 rounded-xl p-4 bg-blue-50">
              <h3 className="text-lg font-bold text-blue-600 mb-2">Admin Feedback</h3>
              <p className="text-sm text-gray-700">{existingEvaluation.adminFeedback}</p>
              {existingEvaluation.reviewedByName && (
                <p className="text-xs text-gray-500 mt-2">
                  - {existingEvaluation.reviewedByName} ({new Date(existingEvaluation.reviewedAt).toLocaleDateString()})
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-bold transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit('draft')}
              disabled={loading}
              className="px-6 py-3 bg-gray-500 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-60"
            >
              {loading ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={() => handleSubmit('submitted')}
              disabled={loading}
              className="px-6 py-3 bg-primary text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-60"
            >
              {loading ? 'Submitting...' : 'Submit for Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyEvaluationForm;

