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
  const { teachers, getStudentsByTeacher, updateStudent } = useData();
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [showRecitationReview, setShowRecitationReview] = useState(false);
  const [showTickets, setShowTickets] = useState(false);

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

  const handleAddAssessment = () => {
    if (selectedStudent && permissions.canEditAssessments) {
      const newAssessment: Assessment = {
        id: `ASS${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        type: assessmentData.type,
        score: assessmentData.score,
        maxScore: assessmentData.maxScore,
        notes: assessmentData.notes,
        conductedBy: currentTeacher?.id || '',
      };

      const updatedAssessments = [...selectedStudent.assessments, newAssessment];
      updateStudent(selectedStudent.id, { assessments: updatedAssessments });
      setShowAssessmentForm(false);
      setAssessmentData({ type: '', score: 0, maxScore: 100, notes: '' });
    }
  };

  const handleAddEvaluation = () => {
    if (selectedStudent && permissions.canEditEvaluations) {
      const newEvaluation: Evaluation = {
        id: `EVA${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        category: evaluationData.category,
        rating: evaluationData.rating,
        comments: evaluationData.comments,
        evaluatedBy: currentTeacher?.id || '',
      };

      const updatedEvaluations = [...selectedStudent.evaluations, newEvaluation];
      updateStudent(selectedStudent.id, { evaluations: updatedEvaluations });
      setShowEvaluationForm(false);
      setEvaluationData({ category: '', rating: 5, comments: '' });
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

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Assigned Students" value={assignedStudents.length} icon="AS" />
          <StatCard title="Total Assessments" value={assignedStudents.reduce((sum, s) => sum + s.assessments.length, 0)} icon="TA" />
          <StatCard title="Active Students" value={assignedStudents.filter(s => s.status === 'active').length} icon="WK" />
          <StatCard title="Avg Performance" value="85%" icon="AVG" />
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
                          <p className="text-sm text-primary-soft">Parent: {student.parentName}</p>
                          <p className="text-sm text-primary-soft">Email: {student.email} · Phone: {student.contact}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="rounded-full bg-soft-primary px-3 py-1 text-xs font-semibold text-primary">
                          {student.program}
                        </span>
                        <p className="mt-1 text-xs text-primary-soft">ID: {student.id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
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
                      {permissions.canViewFinancials && (
                        <div className="rounded-xl border border-accent-soft bg-white px-3 py-3">
                          <p className="text-xs text-primary-soft">Tuition</p>
                          <p className="text-sm font-medium">${student.tuitionFee}/month</p>
                          <p className="text-xs text-primary-soft">Reg: ${student.registrationAmount}</p>
                        </div>
                      )}
                      <div className="rounded-xl border border-accent-soft bg-white px-3 py-3">
                        <p className="text-xs text-primary-soft">Enrolled</p>
                        <p className="text-sm font-medium">{new Date(student.enrolledDate).toLocaleDateString()}</p>
                        <p className="text-xs text-primary-soft">
                          Status:{' '}
                          <span className="font-semibold text-primary">
                            {student.status}
                          </span>
                        </p>
                      </div>
                    </div>

                    {student.siblings.length > 0 && (
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
                          <p className="text-sm font-semibold text-primary">Assessments ({student.assessments.length})</p>
                          {permissions.canEditAssessments && (
                            <button
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowAssessmentForm(true);
                              }}
                              className="rounded-full border border-[rgba(var(--color-primary-rgb),0.35)] px-3 py-1 text-xs font-semibold text-primary transition hover:bg-soft-primary"
                            >
                              + Add Assessment
                            </button>
                          )}
                        </div>
                        {student.assessments.length > 0 ? (
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
                          <p className="text-sm font-semibold text-primary">Evaluations ({student.evaluations.length})</p>
                          {permissions.canEditEvaluations && (
                            <button
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowEvaluationForm(true);
                              }}
                              className="rounded-full border border-[rgba(var(--color-accent-rgb),0.45)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)] transition hover:bg-soft-accent"
                            >
                              + Add Evaluation
                            </button>
                          )}
                        </div>
                        {student.evaluations.length > 0 ? (
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
                          onClick={() => alert(`Contacting ${student.parentName} at ${student.contact}`)}
                          className="rounded-full border border-[rgba(var(--color-accent-rgb),0.45)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)] transition hover:bg-soft-accent"
                        >
                          Contact Parent
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Teacher Permissions Summary */}
        <Card title="Your Permissions">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Object.entries(permissions).map(([key, value]) => (
              <div
                key={key}
                className={`rounded-xl border px-3 py-3 ${
                  value
                    ? 'border-accent-soft bg-soft-primary'
                    : 'border-[rgba(var(--color-accent-rgb),0.35)] bg-white'
                }`}
              >
                <p className="text-xs font-medium text-primary">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </p>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    value ? 'text-primary' : 'text-[var(--color-accent)]'
                  }`}
                >
                  {value ? 'Allowed' : 'Not allowed'}
                </p>
              </div>
            ))}
          </div>
        </Card>
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
                  className="px-6 py-3 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                  style={{ backgroundColor: '#2E4D32' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#253d28'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2E4D32'}
                >
                  Add Assessment
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
                  className="px-6 py-3 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                  style={{ backgroundColor: '#E7AA39' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d99a2f'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E7AA39'}
                >
                  Add Evaluation
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
