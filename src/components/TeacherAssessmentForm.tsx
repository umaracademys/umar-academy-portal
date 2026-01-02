import React, { useState, useEffect } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Student, Assessment } from '../types';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { MushafMistake } from '@umar-academy/mushaf';

interface TeacherAssessmentFormProps {
  student: Student;
  onClose: () => void;
  onSave: () => void;
}

const TeacherAssessmentForm: React.FC<TeacherAssessmentFormProps> = ({
  student,
  onClose,
  onSave
}) => {
  const { updateStudent, refreshData } = useData();
  const { addMistakeToPersonalMushaf, getStudentPersonalMushaf } = useBackendData();
  const { user } = useAuth();
  const { teachers } = useData();
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Assessment form state
  const [assessmentType, setAssessmentType] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [notes, setNotes] = useState('');
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Mushaf mistakes state
  const [currentPage, setCurrentPage] = useState(1);
  const [mistakes, setMistakes] = useState<MushafMistake[]>([]);
  const [showMushaf, setShowMushaf] = useState(false);
  const [existingMistakes, setExistingMistakes] = useState<MushafMistake[]>([]);

  // Get current teacher info
  const currentTeacher = teachers.find(t => t.id === user?.id || t.email === user?.email);

  // Load existing mistakes from student's personal mushaf
  useEffect(() => {
    const loadMistakes = async () => {
      if (!student?.id) return;
      
      try {
        const data = await getStudentPersonalMushaf(student.id);
        if (data && data.mistakes) {
          const convertedMistakes: MushafMistake[] = data.mistakes.map((m: any) => ({
            id: m.id,
            type: m.type,
            page: m.page,
            surah: m.surah,
            ayah: m.ayah,
            wordIndex: m.wordIndex,
            letterIndex: m.letterIndex,
            position: m.position,
            note: m.note,
            audioUrl: m.audioUrl,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            workflowStep: m.workflowStep
          } as MushafMistake & { workflowStep?: string }));
          
          setExistingMistakes(convertedMistakes);
        }
      } catch (err) {
        console.error('Error loading existing mistakes:', err);
      }
    };
    
    loadMistakes();
  }, [student?.id, getStudentPersonalMushaf]);

  // Handle mistake marking
  const handleMistakeMark = async (mistake: Omit<MushafMistake, 'id' | 'timestamp'>) => {
    if (!student?.id || !currentTeacher) {
      alert('Student ID or Teacher info not found');
      return;
    }

    try {
      const newMistake: MushafMistake = {
        ...mistake,
        id: `assessment-${Date.now()}-${Math.random()}`,
        timestamp: new Date()
      } as MushafMistake;

      // Add to local state immediately
      setMistakes(prev => [...prev, newMistake]);

      // Save to backend
      await addMistakeToPersonalMushaf(
        student.id,
        mistake,
        currentTeacher.id,
        currentTeacher.fullName || 'Teacher'
      );
    } catch (err) {
      console.error('Error saving mistake:', err);
      alert('Failed to save mistake. Please try again.');
      // Remove from local state if save failed
      setMistakes(prev => prev.slice(0, -1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!student || !user) {
      setError('Student or user information is missing');
      return;
    }

    if (!assessmentType.trim()) {
      setError('Assessment type is required');
      return;
    }

    if (!score.trim() || !maxScore.trim()) {
      setError('Score and max score are required');
      return;
    }

    const scoreNum = parseFloat(score);
    const maxScoreNum = parseFloat(maxScore);

    if (isNaN(scoreNum) || isNaN(maxScoreNum) || scoreNum < 0 || maxScoreNum <= 0 || scoreNum > maxScoreNum) {
      setError('Invalid score values');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const newAssessment: Assessment = {
        id: `assessment-${Date.now()}`,
        type: assessmentType.trim(),
        score: scoreNum,
        maxScore: maxScoreNum,
        notes: notes.trim(),
        date: assessmentDate // Assessment.date expects a string
      };

      // Get existing assessments
      const existingAssessments = Array.isArray(student.assessments) ? student.assessments : [];
      
      // Update student with new assessment
      await updateStudent(student.id, {
        ...student,
        assessments: [...existingAssessments, newAssessment]
      });

      // Mistakes are already saved to personal mushaf via handleMistakeMark
      // So we just need to refresh and close
      await refreshData();
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving assessment:', error);
      setError('Failed to save assessment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Add Assessment
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                {student?.fullName || 'Student'} • {new Date(assessmentDate).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3">
              <p className="text-sm font-bold text-red-800">{error}</p>
            </div>
          )}

          {/* Assessment Details Section */}
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Assessment Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assessment Type *
                </label>
                <input
                  type="text"
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value)}
                  placeholder="e.g., Quran Recitation, Memorization Test"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={assessmentDate}
                  onChange={(e) => setAssessmentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Score *
                </label>
                <input
                  type="number"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Score *
                </label>
                <input
                  type="number"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  placeholder="100"
                  min="1"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                placeholder="Add any additional notes or feedback..."
              />
            </div>
          </div>

          {/* Mushaf Mistakes Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Mushaf Mistakes for Today
              </h3>
              <button
                type="button"
                onClick={() => setShowMushaf(!showMushaf)}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                  showMushaf
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'border border-primary text-primary hover:bg-primary/10'
                }`}
              >
                {showMushaf ? 'Hide Mushaf' : 'Mark Mistakes'}
              </button>
            </div>

            {showMushaf && (
              <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">
                    Click on words in the Mushaf to mark mistakes. Mistakes will be saved to {student.fullName}'s Personal Mushaf.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Mistakes marked: <strong className="text-primary">{mistakes.length}</strong></span>
                  </div>
                </div>
                
                <div className="border border-gray-300 rounded-lg overflow-hidden bg-white" style={{ minHeight: '500px', maxHeight: '600px' }}>
                  <InteractiveMushaf
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    mistakes={mistakes.filter(m => m.page === currentPage)}
                    historicalMistakes={existingMistakes.filter(m => m.page === currentPage)}
                    onMistakeMark={handleMistakeMark}
                    readOnly={false}
                    mode="marking"
                    showHistorical={true}
                    showSurahIndexDefault={true}
                    studentName={student.fullName}
                  />
                </div>

                {mistakes.length > 0 && (
                  <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Mistakes Marked ({mistakes.length})
                    </h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {mistakes.map((mistake, index) => (
                        <div key={mistake.id || index} className="text-xs text-gray-600 flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-medium">
                            {mistake.type}
                          </span>
                          <span>Page {mistake.page}, Surah {mistake.surah}:{mistake.ayah}</span>
                          {mistake.note && (
                            <span className="text-gray-500 italic">- {mistake.note}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!showMushaf && mistakes.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-3 bg-blue-50">
                <p className="text-sm text-blue-700">
                  <strong>{mistakes.length}</strong> mistake(s) marked. Click "Mark Mistakes" to add more or review.
                </p>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherAssessmentForm;

