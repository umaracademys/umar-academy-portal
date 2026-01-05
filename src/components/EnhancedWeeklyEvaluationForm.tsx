import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getQuranChapters } from '@umar-academy/mushaf';
import type { Chapter } from '@umar-academy/mushaf';

interface EnhancedWeeklyEvaluationFormProps {
  studentId: string;
  studentName: string;
  onClose: () => void;
  onSuccess?: () => void;
  existingEvaluation?: any;
}

const EnhancedWeeklyEvaluationForm: React.FC<EnhancedWeeklyEvaluationFormProps> = ({
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
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
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
    etiquetteNotes: existingEvaluation?.etiquetteNotes || existingEvaluation?.fixingEtiquette || '',
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

  // Handle form submission
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
      if (!formData.commonMistakes || !formData.etiquetteNotes) {
        setError('Please fill in all required fields: Common Mistakes and Fixing Etiquette');
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
      
      const evaluationId = existingEvaluation?.id || `WE${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch(`${apiUrl}/weekly-evaluations${existingEvaluation ? `/${existingEvaluation.id}` : ''}`, {
        method: existingEvaluation ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: evaluationId,
          studentId,
          studentName,
          teacherId: user?.id || '',
          teacherName: user?.name || user?.email || 'Teacher',
          weekStartDate: formData.weekStartDate,
          weekEndDate: formData.weekEndDate,
          level: formData.level,
          selectedSurah: formData.selectedSurah,
          commonMistakes: formData.commonMistakes,
          etiquetteNotes: formData.etiquetteNotes,
          // Set empty defaults for fields not used by teacher
          strengths: '',
          weaknesses: '',
          teacherNotes: '',
          ratings: {
            fluency: 3,
            tajweed: 3,
            accuracy: 3,
            memorization: undefined,
            engagement: 3,
            behavior: 3
          },
          structuredMistakes: [],
          levelSpecificData: {},
          progressTracking: {},
          media: {},
          completion: {
            progress: 0,
            sectionsCompleted: [],
            timeSpent: 0,
            autoSaveEnabled: false,
            lastSavedAt: new Date()
          },
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary to-primary/90 px-6 py-5 flex justify-between items-center rounded-t-xl">
          <div>
            <h2 className="text-2xl font-bold text-white">Weekly Evaluation</h2>
            <p className="text-white/90 text-sm mt-1">For {studentName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3">
              <p className="text-sm font-bold text-red-800">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-lg border-2 border-green-500 bg-green-50 px-4 py-3">
              <p className="text-sm font-bold text-green-800">{success}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Student Name */}
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <label className="block text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">
                Student Name
              </label>
              <p className="text-lg font-bold text-gray-900">{studentName}</p>
            </div>

            {/* Week Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Week Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.weekStartDate}
                  onChange={(e) => setFormData({ ...formData, weekStartDate: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Week End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.weekEndDate}
                  onChange={(e) => setFormData({ ...formData, weekEndDate: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Level */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Level <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  level: e.target.value, 
                  selectedSurah: e.target.value === 'Reading' ? formData.selectedSurah : '' 
                })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Level</option>
                <option value="Qaidah 1">Qaidah 1</option>
                <option value="Qaidah 2">Qaidah 2</option>
                <option value="Reading">Reading</option>
              </select>
            </div>

            {/* Surah (only for Reading level) */}
            {formData.level === 'Reading' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Surah Name <span className="text-red-500">*</span>
                </label>
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

            {/* Common Mistakes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Common Mistakes <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.commonMistakes}
                onChange={(e) => setFormData({ ...formData, commonMistakes: e.target.value })}
                placeholder="List common mistakes observed during this week..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.commonMistakes.length} characters</p>
            </div>

            {/* Fixing Etiquette */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fixing Etiquette <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.etiquetteNotes}
                onChange={(e) => setFormData({ ...formData, etiquetteNotes: e.target.value })}
                placeholder="Describe how mistakes were corrected and the approach used..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.etiquetteNotes.length} characters</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {existingEvaluation && (
                <span>Editing existing evaluation</span>
              )}
            </div>
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

export default EnhancedWeeklyEvaluationForm;
