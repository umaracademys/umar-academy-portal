import React, { useState, useEffect, useCallback, useRef } from 'react';
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

interface StructuredMistake {
  mistakeType: 'letter' | 'tajweed_rule' | 'memory' | 'pronunciation' | 'joining' | 'other';
  description: string;
  location: string;
  frequency: number;
  howCorrected: string;
  improvementObserved: boolean;
  mistakeLibraryId?: string;
}

interface MediaFile {
  url: string;
  filename: string;
  duration?: number;
  uploadedAt: Date;
  description?: string;
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [surahs, setSurahs] = useState<Chapter[]>([]);
  const [activeSection, setActiveSection] = useState('overview');
  const [startTime] = useState(Date.now());
  const autoSaveTimerRef = useRef<number | null>(null);
  const formDataRef = useRef<any>(null);

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
    
    // Enhanced Ratings
    ratings: {
      fluency: existingEvaluation?.ratings?.fluency || 3,
      tajweed: existingEvaluation?.ratings?.tajweed || 3,
      accuracy: existingEvaluation?.ratings?.accuracy || 3,
      memorization: existingEvaluation?.ratings?.memorization || undefined,
      engagement: existingEvaluation?.ratings?.engagement || 3,
      behavior: existingEvaluation?.ratings?.behavior || 3
    },
    
    // Core fields
    strengths: existingEvaluation?.strengths || '',
    weaknesses: existingEvaluation?.weaknesses || '',
    commonMistakes: existingEvaluation?.commonMistakes || '',
    etiquetteNotes: existingEvaluation?.etiquetteNotes || existingEvaluation?.fixingEtiquette || '',
    teacherNotes: existingEvaluation?.teacherNotes || existingEvaluation?.generalNotes || '',
    
    // Level-specific data
    levelSpecificData: existingEvaluation?.levelSpecificData || {},
    
    // Structured mistakes
    structuredMistakes: (existingEvaluation?.structuredMistakes || []) as StructuredMistake[],
    
    // Progress tracking
    progressTracking: existingEvaluation?.progressTracking || {
      previousWeekGoals: [],
      thisWeekGoals: [],
      goalsAchieved: [],
      goalsNotAchieved: [],
      nextWeekGoals: []
    },
    
    // Media
    media: existingEvaluation?.media || {
      audioRecordings: [],
      videoRecordings: [],
      images: [],
      documents: []
    },
    
    // Completion tracking
    completion: {
      progress: existingEvaluation?.completion?.progress || 0,
      sectionsCompleted: existingEvaluation?.completion?.sectionsCompleted || [],
      timeSpent: existingEvaluation?.completion?.timeSpent || 0,
      autoSaveEnabled: existingEvaluation?.completion?.autoSaveEnabled !== undefined 
        ? existingEvaluation?.completion?.autoSaveEnabled 
        : true,
      lastSavedAt: existingEvaluation?.completion?.lastSavedAt || null
    }
  });

  // Update ref when formData changes
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

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

  // Calculate completion progress
  const calculateProgress = useCallback(() => {
    const sections = ['overview', 'ratings', 'observations', 'mistakes', 'progress'];
    let completed = 0;
    
    if (formData.level) completed++;
    if (formData.level === 'Reading' ? formData.selectedSurah : true) completed++;
    if (formData.ratings.fluency && formData.ratings.tajweed && formData.ratings.accuracy) completed++;
    if (formData.strengths && formData.weaknesses) completed++;
    if (formData.commonMistakes && formData.etiquetteNotes) completed++;
    
    return Math.round((completed / sections.length) * 100);
  }, [formData]);

  // Update progress when form data changes
  useEffect(() => {
    const progress = calculateProgress();
    setFormData(prev => ({
      ...prev,
      completion: {
        ...prev.completion,
        progress,
        timeSpent: Math.round((Date.now() - startTime) / 60000) // minutes
      }
    }));
  }, [formData.level, formData.selectedSurah, formData.ratings, formData.strengths, formData.weaknesses, formData.commonMistakes, formData.etiquetteNotes, calculateProgress, startTime]);

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!formData.completion.autoSaveEnabled || loading || saving) return;
    
    setSaving(true);
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
          weekStartDate: formDataRef.current.weekStartDate,
          weekEndDate: formDataRef.current.weekEndDate,
          level: formDataRef.current.level,
          selectedSurah: formDataRef.current.selectedSurah,
          strengths: formDataRef.current.strengths || 'To be filled',
          weaknesses: formDataRef.current.weaknesses || 'To be filled',
          commonMistakes: formDataRef.current.commonMistakes || '',
          etiquetteNotes: formDataRef.current.etiquetteNotes || '',
          teacherNotes: formDataRef.current.teacherNotes || '',
          ratings: formDataRef.current.ratings,
          structuredMistakes: formDataRef.current.structuredMistakes,
          levelSpecificData: formDataRef.current.levelSpecificData,
          progressTracking: formDataRef.current.progressTracking,
          media: formDataRef.current.media,
          completion: {
            ...formDataRef.current.completion,
            lastSavedAt: new Date()
          },
          status: 'draft'
        })
      });

      if (response.ok) {
        console.log('✅ Auto-saved');
      }
    } catch (err) {
      console.error('Auto-save error:', err);
    } finally {
      setSaving(false);
    }
  }, [existingEvaluation, studentId, studentName, user, loading, saving]);

  // Set up auto-save timer
  useEffect(() => {
    if (formData.completion.autoSaveEnabled && !existingEvaluation) {
      const timerId = window.setInterval(() => {
        autoSave();
      }, 30000); // Auto-save every 30 seconds
      autoSaveTimerRef.current = timerId;
      
      return () => {
        if (autoSaveTimerRef.current !== null) {
          window.clearInterval(autoSaveTimerRef.current);
          autoSaveTimerRef.current = null;
        }
      };
    }
  }, [formData.completion.autoSaveEnabled, existingEvaluation, autoSave]);

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
      if (!formData.strengths || !formData.weaknesses || !formData.commonMistakes || !formData.etiquetteNotes) {
        setError('Please fill in all required fields: Strengths, Weaknesses, Common Mistakes, and Etiquette Notes');
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
          strengths: formData.strengths,
          weaknesses: formData.weaknesses,
          commonMistakes: formData.commonMistakes,
          etiquetteNotes: formData.etiquetteNotes,
          teacherNotes: formData.teacherNotes,
          ratings: formData.ratings,
          structuredMistakes: formData.structuredMistakes,
          levelSpecificData: formData.levelSpecificData,
          progressTracking: formData.progressTracking,
          media: formData.media,
          completion: {
            ...formData.completion,
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

  // Add structured mistake
  const addStructuredMistake = () => {
    setFormData(prev => ({
      ...prev,
      structuredMistakes: [
        ...prev.structuredMistakes,
        {
          mistakeType: 'other',
          description: '',
          location: '',
          frequency: 1,
          howCorrected: '',
          improvementObserved: false
        }
      ]
    }));
  };

  // Remove structured mistake
  const removeStructuredMistake = (index: number) => {
    setFormData(prev => ({
      ...prev,
      structuredMistakes: prev.structuredMistakes.filter((_, i) => i !== index)
    }));
  };

  // Update structured mistake
  const updateStructuredMistake = (index: number, field: keyof StructuredMistake, value: any) => {
    setFormData(prev => ({
      ...prev,
      structuredMistakes: prev.structuredMistakes.map((mistake, i) => 
        i === index ? { ...mistake, [field]: value } : mistake
      )
    }));
  };

  // Rating component
  const RatingInput = ({ label, value, onChange, required = false }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    required?: boolean;
  }) => (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="1"
          max="5"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="flex-1"
        />
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onChange(num)}
              className={`w-10 h-10 rounded-lg font-bold transition-all ${
                value >= num
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
        <span className="text-lg font-bold text-gray-700 w-8 text-center">{value}</span>
      </div>
    </div>
  );

  const sections = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'ratings', label: 'Ratings', icon: '⭐' },
    { id: 'observations', label: 'Observations', icon: '👁️' },
    { id: 'mistakes', label: 'Mistakes', icon: '❌' },
    { id: 'progress', label: 'Progress', icon: '📈' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-6xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.85)] px-6 py-4 border-b border-gray-200 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Weekly Evaluation</h2>
              <p className="text-white/80 text-sm mt-1">For {studentName}</p>
            </div>
            <div className="flex items-center gap-4">
              {saving && (
                <span className="text-white/80 text-sm">💾 Auto-saving...</span>
              )}
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors text-xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-white/80 text-sm mb-2">
              <span>Completion: {formData.completion.progress}%</span>
              <span>{formData.completion.sectionsCompleted.length} of {sections.length} sections</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-300"
                style={{ width: `${formData.completion.progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    activeSection === section.id
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{section.icon}</span>
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
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

            {/* Overview Section */}
            {activeSection === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-800">Overview</h3>
                
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
              </div>
            )}

            {/* Ratings Section */}
            {activeSection === 'ratings' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-800">Performance Ratings</h3>
                
                <RatingInput
                  label="Fluency"
                  value={formData.ratings.fluency}
                  onChange={(value) => setFormData(prev => ({
                    ...prev,
                    ratings: { ...prev.ratings, fluency: value }
                  }))}
                  required
                />
                
                <RatingInput
                  label="Tajweed"
                  value={formData.ratings.tajweed}
                  onChange={(value) => setFormData(prev => ({
                    ...prev,
                    ratings: { ...prev.ratings, tajweed: value }
                  }))}
                  required
                />
                
                <RatingInput
                  label="Accuracy"
                  value={formData.ratings.accuracy}
                  onChange={(value) => setFormData(prev => ({
                    ...prev,
                    ratings: { ...prev.ratings, accuracy: value }
                  }))}
                  required
                />
                
                {formData.level === 'Reading' && (
                  <RatingInput
                    label="Memorization"
                    value={formData.ratings.memorization || 3}
                    onChange={(value) => setFormData(prev => ({
                      ...prev,
                      ratings: { ...prev.ratings, memorization: value }
                    }))}
                  />
                )}
                
                <RatingInput
                  label="Engagement"
                  value={formData.ratings.engagement}
                  onChange={(value) => setFormData(prev => ({
                    ...prev,
                    ratings: { ...prev.ratings, engagement: value }
                  }))}
                />
                
                <RatingInput
                  label="Behavior/Etiquette"
                  value={formData.ratings.behavior}
                  onChange={(value) => setFormData(prev => ({
                    ...prev,
                    ratings: { ...prev.ratings, behavior: value }
                  }))}
                />
              </div>
            )}

            {/* Observations Section */}
            {activeSection === 'observations' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-800">Observations</h3>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Strengths <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.strengths}
                    onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                    placeholder="List the student's strengths..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={5}
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.strengths.length} characters</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Weaknesses <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.weaknesses}
                    onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
                    placeholder="List areas for improvement..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={5}
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.weaknesses.length} characters</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Common Mistakes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.commonMistakes}
                    onChange={(e) => setFormData({ ...formData, commonMistakes: e.target.value })}
                    placeholder="List common mistakes observed..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={5}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Etiquette Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.etiquetteNotes}
                    onChange={(e) => setFormData({ ...formData, etiquetteNotes: e.target.value })}
                    placeholder="Describe how mistakes were corrected and the approach used..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={5}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Additional Teacher Notes
                  </label>
                  <textarea
                    value={formData.teacherNotes}
                    onChange={(e) => setFormData({ ...formData, teacherNotes: e.target.value })}
                    placeholder="Any additional notes or observations..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* Mistakes Section */}
            {activeSection === 'mistakes' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-800">Structured Mistakes</h3>
                  <button
                    onClick={addStructuredMistake}
                    className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                  >
                    + Add Mistake
                  </button>
                </div>

                {formData.structuredMistakes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No structured mistakes added yet. Click "Add Mistake" to start.</p>
                ) : (
                  <div className="space-y-4">
                    {formData.structuredMistakes.map((mistake, index) => (
                      <div key={index} className="border-2 border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-700">Mistake #{index + 1}</h4>
                          <button
                            onClick={() => removeStructuredMistake(index)}
                            className="text-red-500 hover:text-red-700 font-bold"
                          >
                            ×
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                            <select
                              value={mistake.mistakeType}
                              onChange={(e) => updateStructuredMistake(index, 'mistakeType', e.target.value)}
                              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
                            >
                              <option value="letter">Letter</option>
                              <option value="tajweed_rule">Tajweed Rule</option>
                              <option value="memory">Memory</option>
                              <option value="pronunciation">Pronunciation</option>
                              <option value="joining">Joining</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Frequency</label>
                            <input
                              type="number"
                              min="1"
                              value={mistake.frequency}
                              onChange={(e) => updateStructuredMistake(index, 'frequency', parseInt(e.target.value) || 1)}
                              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
                            />
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                          <textarea
                            value={mistake.description}
                            onChange={(e) => updateStructuredMistake(index, 'description', e.target.value)}
                            placeholder="Describe the mistake..."
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg resize-none"
                            rows={2}
                          />
                        </div>
                        
                        <div className="mt-4">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                          <input
                            type="text"
                            value={mistake.location}
                            onChange={(e) => updateStructuredMistake(index, 'location', e.target.value)}
                            placeholder="e.g., Surah:Ayah or Page:Line"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
                          />
                        </div>
                        
                        <div className="mt-4">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">How Corrected</label>
                          <textarea
                            value={mistake.howCorrected}
                            onChange={(e) => updateStructuredMistake(index, 'howCorrected', e.target.value)}
                            placeholder="How was this mistake corrected?"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg resize-none"
                            rows={2}
                          />
                        </div>
                        
                        <div className="mt-4 flex items-center">
                          <input
                            type="checkbox"
                            checked={mistake.improvementObserved}
                            onChange={(e) => updateStructuredMistake(index, 'improvementObserved', e.target.checked)}
                            className="w-5 h-5 mr-2"
                          />
                          <label className="text-sm font-semibold text-gray-700">Improvement Observed</label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Progress Section */}
            {activeSection === 'progress' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-800">Progress Tracking</h3>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">This Week's Goals</label>
                  <div className="space-y-2">
                    {formData.progressTracking.thisWeekGoals.map((goal, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={goal}
                          onChange={(e) => {
                            const newGoals = [...formData.progressTracking.thisWeekGoals];
                            newGoals[index] = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              progressTracking: { ...prev.progressTracking, thisWeekGoals: newGoals }
                            }));
                          }}
                          className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg"
                          placeholder="Enter goal..."
                        />
                        <button
                          onClick={() => {
                            const newGoals = formData.progressTracking.thisWeekGoals.filter((_, i) => i !== index);
                            setFormData(prev => ({
                              ...prev,
                              progressTracking: { ...prev.progressTracking, thisWeekGoals: newGoals }
                            }));
                          }}
                          className="text-red-500 hover:text-red-700 font-bold px-3"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          progressTracking: {
                            ...prev.progressTracking,
                            thisWeekGoals: [...prev.progressTracking.thisWeekGoals, '']
                          }
                        }));
                      }}
                      className="text-primary hover:text-primary/80 font-semibold"
                    >
                      + Add Goal
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {formData.completion.lastSavedAt && (
                <span>Last saved: {new Date(formData.completion.lastSavedAt).toLocaleTimeString()}</span>
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

