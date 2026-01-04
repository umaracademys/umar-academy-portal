import React, { useState, useEffect } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { getQuranChapters } from '@umar-academy/mushaf';
import type { Chapter } from '@umar-academy/mushaf';

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
  const [surahs, setSurahs] = useState<Chapter[]>([]);

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
    level: existingEvaluation?.level || '',
    selectedSurah: existingEvaluation?.selectedSurah || '',
    commonMistakes: existingEvaluation?.commonMistakes || '',
    fixingEtiquette: existingEvaluation?.fixingEtiquette || ''
  });

  // Load surahs
  useEffect(() => {
    const loadSurahs = async () => {
      try {
        const chapters = await getQuranChapters();
        setSurahs(chapters);
      } catch (err) {
        console.error('Error loading surahs:', err);
      }
    };
    loadSurahs();
  }, []);


  const handleSubmit = async (status: 'draft' | 'submitted') => {
    if (status === 'submitted') {
      if (!formData.level) {
        setError('Please select a level');
        return;
      }
      if (formData.level === 'Reading' && !formData.selectedSurah) {
        setError('Please select a Surah when level is Reading');
        return;
      }
      if (!formData.commonMistakes || !formData.fixingEtiquette) {
        setError('Please fill in Common Mistakes and Fixing Etiquette');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const apiUrl = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`;
      const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/weekly-evaluations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: existingEvaluation?.id,
          studentId,
          studentName,
          teacherId: user?.id || '',
          teacherName: user?.name || user?.email || 'Teacher',
          weekStartDate: formData.weekStartDate,
          weekEndDate: formData.weekEndDate,
          level: formData.level,
          selectedSurah: formData.selectedSurah,
          commonMistakes: formData.commonMistakes,
          fixingEtiquette: formData.fixingEtiquette,
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
          {/* Student Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Student Name</label>
            <input
              type="text"
              value={studentName}
              disabled
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700"
            />
          </div>

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

          {/* Level Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Level</label>
            <select
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value, selectedSurah: e.target.value === 'Reading' ? formData.selectedSurah : '' })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Level</option>
              <option value="Qaidah 1">Qaidah 1</option>
              <option value="Qaidah 2">Qaidah 2</option>
              <option value="Reading">Reading</option>
            </select>
          </div>

          {/* Surah Selection (only if Reading is selected) */}
          {formData.level === 'Reading' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Surah Name</label>
              <select
                value={formData.selectedSurah}
                onChange={(e) => setFormData({ ...formData, selectedSurah: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Surah</option>
                {surahs.map((surah) => (
                  <option key={surah.id} value={surah.name_simple}>
                    {surah.id}. {surah.name_simple} ({surah.name_arabic})
                  </option>
                ))}
              </select>
            </div>
          )}

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

          {/* Common Mistakes */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Common Mistakes</label>
            <textarea
              value={formData.commonMistakes}
              onChange={(e) => setFormData({ ...formData, commonMistakes: e.target.value })}
              placeholder="List common mistakes observed..."
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={4}
            />
          </div>

          {/* Fixing Etiquette */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Fixing Etiquette</label>
            <textarea
              value={formData.fixingEtiquette}
              onChange={(e) => setFormData({ ...formData, fixingEtiquette: e.target.value })}
              placeholder="Describe how mistakes were corrected and the approach used..."
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={4}
            />
          </div>


          {/* Action Buttons */}
          <div className="flex justify-end items-center pt-4 border-t border-gray-200">
            <div className="flex gap-3">
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

    </div>
  );
};

export default WeeklyEvaluationForm;

