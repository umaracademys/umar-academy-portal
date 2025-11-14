import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import DebugPanel from '../components/DebugPanel';
import TeacherRecitationReview from '../components/TeacherRecitationReview';
import TeacherTickets from '../components/TeacherTickets';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Student, Assessment, Evaluation } from '../types';

const TeacherDashboard: React.FC = () => {
  const { teachers, getStudentsByTeacher, updateStudent, refreshData } = useData();
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [showRecitationReview, setShowRecitationReview] = useState(false);
  const [showTickets, setShowTickets] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Get current teacher info
  const currentTeacher = teachers.find(t => t.email === user?.email) || teachers[0];
  // Debug logs (commented out - uncomment for debugging)
  // console.log('🔍 TeacherDashboard - currentTeacher:', currentTeacher);
  // console.log('🔍 TeacherDashboard - user email:', user?.email);
  // console.log('🔍 TeacherDashboard - all teachers:', teachers);
  const assignedStudents = getStudentsByTeacher(currentTeacher?.id || '');
  // console.log('🔍 TeacherDashboard - assignedStudents:', assignedStudents);

  // Get teacher permissions
  const permissions = currentTeacher?.permissions || {
    canViewAssessments: true,
    canEditAssessments: true,
    canViewEvaluations: true,
    canEditEvaluations: true,
    canViewFinancials: false,
    canManageSchedule: true,
    canContactParents: true,
    canViewStudentEmail: true,
    canViewStudentContact: true,
    canViewStudentPersonalInfo: true,
  };

  const [assessmentData, setAssessmentData] = useState({
    type: '',
    score: 0,
    maxScore: 100,
    notes: '',
  });

  const [evaluationData, setEvaluationData] = useState({
    category: '',
    rating: 5,
    comments: '',
  });

  const handleAddAssessment = async () => {
    if (!selectedStudent || !permissions.canEditAssessments) return;
    
    if (!assessmentData.type.trim()) {
      setSaveError('Please enter an assessment type');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const newAssessment: Assessment = {
        id: `ASS${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        type: assessmentData.type,
        score: assessmentData.score,
        maxScore: assessmentData.maxScore,
        notes: assessmentData.notes,
        conductedBy: currentTeacher?.id || '',
      };

      const updatedAssessments = [...(Array.isArray(selectedStudent.assessments) ? selectedStudent.assessments : []), newAssessment];
      
      await updateStudent(selectedStudent.id, { assessments: updatedAssessments });
      
      // Refresh data to get updated student list
      await refreshData();
      
      setSaveSuccess('Assessment added successfully!');
      setShowAssessmentForm(false);
      setAssessmentData({ type: '', score: 0, maxScore: 100, notes: '' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add assessment';
      setSaveError(errorMessage);
      console.error('Error adding assessment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to safely format date
  const formatDate = (date: string | Date | undefined | null): string => {
    if (!date) return 'Not set';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Not set';
      }
      
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Not set';
    }
  };

  // Helper function to get enrollment date with fallbacks
  const getEnrollmentDate = (student: Student): string | Date | undefined => {
    return student.enrolledDate || 
           (student as any).enrollmentDate || 
           (student as any).createdAt || 
           undefined;
  };

  const handleAddEvaluation = async () => {
    if (!selectedStudent || !permissions.canEditEvaluations) return;
    
    if (!evaluationData.category.trim()) {
      setSaveError('Please enter an evaluation category');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const newEvaluation: Evaluation = {
        id: `EVA${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        category: evaluationData.category,
        rating: evaluationData.rating,
        comments: evaluationData.comments,
        evaluatedBy: currentTeacher?.id || '',
      };

      const updatedEvaluations = [...(Array.isArray(selectedStudent.evaluations) ? selectedStudent.evaluations : []), newEvaluation];
      
      await updateStudent(selectedStudent.id, { evaluations: updatedEvaluations });
      
      // Refresh data to get updated student list
      await refreshData();
      
      setSaveSuccess('Evaluation added successfully!');
      setShowEvaluationForm(false);
      setEvaluationData({ category: '', rating: 5, comments: '' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add evaluation';
      setSaveError(errorMessage);
      console.error('Error adding evaluation:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-3xl border border-accent-soft bg-white px-6 py-6 shadow-sm sm:px-10 sm:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-primary-soft">Teacher Workspace</span>
              <h1 className="text-3xl font-semibold text-primary">Teacher Dashboard</h1>
              <p className="text-sm text-primary-soft max-w-2xl">
                Review assignments, log recitation feedback, and stay on top of student progress in one place.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowRecitationReview(true)}
                className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)]"
              >
                Submit Recitation Review
              </button>
              <button
                onClick={() => setShowTickets(true)}
                className="inline-flex items-center justify-center rounded-full border border-[rgba(var(--color-primary-rgb),0.35)] px-5 py-3 text-sm font-semibold text-primary transition hover:bg-soft-primary"
              >
                My Tickets
              </button>
              <Link
                to="/assignments"
                className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-accent-rgb),0.85)]"
              >
                Manage Assignments
              </Link>
              <Link
                to="/profile"
                className="inline-flex items-center justify-center rounded-full border border-[rgba(var(--color-primary-rgb),0.35)] px-5 py-3 text-sm font-semibold text-primary transition hover:bg-soft-primary"
              >
                View My Profile
              </Link>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {saveSuccess && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-6 py-4">
            <p className="text-sm font-semibold text-green-700">✅ {saveSuccess}</p>
          </div>
        )}
        {saveError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-4">
            <p className="text-sm font-semibold text-red-700">❌ {saveError}</p>
            <button
              onClick={() => setSaveError(null)}
              className="mt-2 text-xs text-red-600 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard title="Assigned Students" value={assignedStudents.length} icon="AS" />
          <StatCard title="Total Assessments" value={assignedStudents.reduce((sum, s) => sum + (Array.isArray(s.assessments) ? s.assessments.length : 0), 0)} icon="TA" />
          <StatCard title="Active Students" value={assignedStudents.filter(s => s.status === 'active').length} icon="WK" />
        </div>

        {/* Assigned Students List */}
        <div className="mb-8">
          <Card title={`My Assigned Students (${assignedStudents.length})`}>
            {assignedStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No students assigned yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignedStudents.map((student) => (
                  <div key={student.id} className="rounded-2xl border border-accent-soft bg-white p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-4">
                        <img
                          src={student.avatar}
                          alt={student.fullName}
                          className="h-12 w-12 rounded-full"
                        />
                        <div>
                          <h4 className="font-bold text-primary">{student.fullName}</h4>
                          {permissions.canViewStudentPersonalInfo && (
                            <p className="text-sm text-primary-soft">Parent: {student.parentName}</p>
                          )}
                          <p className="text-sm text-primary-soft">
                            {permissions.canViewStudentEmail ? `Email: ${student.email}` : 'Email: [Hidden]'}
                            {permissions.canViewStudentContact ? ` · Phone: ${student.contact}` : ' · Phone: [Hidden]'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="rounded-full bg-soft-primary px-3 py-1 text-xs font-semibold text-primary">
                          {student.program}
                        </span>
                        <p className="mt-1 text-xs text-primary-soft">ID: {student.id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div className="rounded-xl border border-accent-soft bg-white px-3 py-3">
                        <p className="text-xs text-primary-soft">Schedule</p>
                        <p className="text-sm font-medium">
                          {Array.isArray(student.schedule?.days) && student.schedule.days.length > 0
                            ? student.schedule.days.join(', ')
                            : 'Not scheduled'}
                        </p>
                        <p className="text-xs text-primary-soft">
                          {student.schedule?.startTime && student.schedule?.endTime
                            ? `${student.schedule.startTime} - ${student.schedule.endTime}`
                            : '—'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-accent-soft bg-white px-3 py-3">
                        <p className="text-xs text-primary-soft">Enrolled</p>
                        <p className="text-sm font-medium">{formatDate(getEnrollmentDate(student))}</p>
                        <p className="text-xs text-primary-soft">
                          Status:{' '}
                          <span className="font-semibold text-primary">
                            {student.status || 'active'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {Array.isArray(student.siblings) && student.siblings.length > 0 && (
                      <div className="mb-3 rounded-xl border border-accent-soft bg-white px-3 py-3">
                        <p className="mb-2 text-xs text-primary-soft">Siblings:</p>
                        <div className="flex flex-wrap gap-2">
                          {student.siblings.map((sibling) => (
                            <span key={sibling.id} className="rounded-full bg-soft-primary px-2 py-1 text-xs font-semibold text-primary">
                              {sibling.fullName} ({sibling.program})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assessments */}
                    {permissions.canViewAssessments && (
                      <div className="mb-3 rounded-xl border border-accent-soft bg-white px-3 py-3">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-semibold text-primary">Assessments ({Array.isArray(student.assessments) ? student.assessments.length : 0})</p>
                          {permissions.canEditAssessments && (
                            <button
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowAssessmentForm(true);
                                setSaveError(null);
                                setSaveSuccess(null);
                              }}
                              className="rounded-full border border-[rgba(var(--color-primary-rgb),0.35)] px-3 py-1 text-xs font-semibold text-primary transition hover:bg-soft-primary"
                            >
                              + Add Assessment
                            </button>
                          )}
                        </div>
                        {Array.isArray(student.assessments) && student.assessments.length > 0 ? (
                          <div className="space-y-2">
                            {student.assessments.slice(-3).map((assessment) => (
                              <div key={assessment.id} className="rounded-lg border border-gray-100 bg-soft-primary px-3 py-2 text-xs">
                                <div className="flex justify-between text-primary">
                                  <span className="font-medium">{assessment.type}</span>
                                  <span className="font-semibold text-primary">{assessment.score}/{assessment.maxScore}</span>
                                </div>
                                <p className="text-primary-soft">{assessment.notes}</p>
                                <p className="text-[10px] text-primary-faint">{new Date(assessment.date).toLocaleDateString()}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-primary-soft">No assessments yet</p>
                        )}
                      </div>
                    )}

                    {/* Evaluations */}
                    {permissions.canViewEvaluations && (
                      <div className="rounded-xl border border-accent-soft bg-white px-3 py-3">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-semibold text-primary">Evaluations ({Array.isArray(student.evaluations) ? student.evaluations.length : 0})</p>
                          {permissions.canEditEvaluations && (
                            <button
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowEvaluationForm(true);
                                setSaveError(null);
                                setSaveSuccess(null);
                              }}
                              className="rounded-full border border-[rgba(var(--color-accent-rgb),0.45)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)] transition hover:bg-soft-accent"
                            >
                              + Add Evaluation
                            </button>
                          )}
                        </div>
                        {Array.isArray(student.evaluations) && student.evaluations.length > 0 ? (
                          <div className="space-y-2">
                            {student.evaluations.slice(-3).map((evaluation) => (
                              <div key={evaluation.id} className="rounded-lg border border-gray-100 bg-soft-accent px-3 py-2 text-xs">
                                <div className="flex justify-between text-primary">
                                  <span className="font-medium">{evaluation.category}</span>
                                  <span className="font-semibold text-[var(--color-accent)]">Rating: {evaluation.rating}/5</span>
                                </div>
                                <p className="text-primary-soft">{evaluation.comments}</p>
                                <p className="text-[10px] text-primary-faint">{new Date(evaluation.date).toLocaleDateString()}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-primary-soft">No evaluations yet</p>
                        )}
                      </div>
                    )}

                    {/* Contact Parent Button */}
                    {permissions.canContactParents && (
                      <div className="mt-3">
                        <button
                          disabled
                          className="rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-400 cursor-not-allowed"
                        >
                          Contact Parent - Coming Soon
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* Assessment Form Modal */}
      {showAssessmentForm && selectedStudent && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999 
          }}
          onClick={() => setShowAssessmentForm(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 pb-4 border-b-2" style={{ borderBottomColor: '#2E4D32' }}>
              <h3 className="text-2xl font-bold" style={{ color: '#2E4D32' }}>Add Assessment</h3>
              <p className="text-sm text-gray-600 mt-1">For {selectedStudent.fullName}</p>
            </div>
            
            {saveError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-xs font-semibold text-red-700">{saveError}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Assessment Type</label>
                <input
                  type="text"
                  value={assessmentData.type}
                  onChange={(e) => setAssessmentData({ ...assessmentData, type: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 transition"
                  placeholder="e.g., Quran Recitation, Math Quiz"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Score</label>
                  <input
                    type="number"
                    value={assessmentData.score}
                    onChange={(e) => setAssessmentData({ ...assessmentData, score: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 transition"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Max Score</label>
                  <input
                    type="number"
                    value={assessmentData.maxScore}
                    onChange={(e) => setAssessmentData({ ...assessmentData, maxScore: parseInt(e.target.value) || 100 })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 transition"
                    placeholder="100"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <textarea
                  value={assessmentData.notes}
                  onChange={(e) => setAssessmentData({ ...assessmentData, notes: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 transition resize-none"
                  rows={4}
                  placeholder="Add notes about this assessment..."
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowAssessmentForm(false)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAssessment}
                  disabled={isSaving}
                  className="px-6 py-3 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#2E4D32' }}
                  onMouseEnter={(e) => !isSaving && (e.currentTarget.style.backgroundColor = '#253d28')}
                  onMouseLeave={(e) => !isSaving && (e.currentTarget.style.backgroundColor = '#2E4D32')}
                >
                  {isSaving ? 'Saving...' : 'Add Assessment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Form Modal */}
      {showEvaluationForm && selectedStudent && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999 
          }}
          onClick={() => setShowEvaluationForm(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 pb-4 border-b-2" style={{ borderBottomColor: '#E7AA39' }}>
              <h3 className="text-2xl font-bold" style={{ color: '#E7AA39' }}>Add Evaluation</h3>
              <p className="text-sm text-gray-600 mt-1">For {selectedStudent.fullName}</p>
            </div>
            
            {saveError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-xs font-semibold text-red-700">{saveError}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <input
                  type="text"
                  value={evaluationData.category}
                  onChange={(e) => setEvaluationData({ ...evaluationData, category: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 transition"
                  placeholder="e.g., Behavior, Participation, Homework"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rating (1-5 stars)</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={evaluationData.rating}
                  onChange={(e) => setEvaluationData({ ...evaluationData, rating: parseInt(e.target.value) })}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ 
                    background: `linear-gradient(to right, #E7AA39 0%, #E7AA39 ${(evaluationData.rating - 1) * 25}%, #e5e7eb ${(evaluationData.rating - 1) * 25}%, #e5e7eb 100%)`
                  }}
                />
                <p className="text-center text-sm text-primary-soft mt-2">Rating: {evaluationData.rating} / 5</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Comments</label>
                <textarea
                  value={evaluationData.comments}
                  onChange={(e) => setEvaluationData({ ...evaluationData, comments: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 transition resize-none"
                  rows={4}
                  placeholder="Add your evaluation comments..."
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowEvaluationForm(false)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEvaluation}
                  disabled={isSaving}
                  className="px-6 py-3 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#E7AA39' }}
                  onMouseEnter={(e) => !isSaving && (e.currentTarget.style.backgroundColor = '#d99a2f')}
                  onMouseLeave={(e) => !isSaving && (e.currentTarget.style.backgroundColor = '#E7AA39')}
                >
                  {isSaving ? 'Saving...' : 'Add Evaluation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recitation Review Modal */}
      {showRecitationReview && (
        <TeacherRecitationReview
          onClose={() => setShowRecitationReview(false)}
          onSuccess={() => {
            setShowRecitationReview(false);
          }}
        />
      )}

      {showTickets && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="w-full max-w-6xl mt-8 sm:mt-12">
            <TeacherTickets
              onClose={() => setShowTickets(false)}
            />
          </div>
        </div>
      )}
      
      <DebugPanel />
    </div>
  );
};

export default TeacherDashboard;
