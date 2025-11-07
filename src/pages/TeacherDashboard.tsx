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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your assigned students and track their progress.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowRecitationReview(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
            >
              📖 Submit Recitation Review
            </button>
            <button
              onClick={() => setShowTickets(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
            >
              🎫 My Tickets
            </button>
            <Link
              to="/assignments"
              className="px-6 py-3 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
              style={{ backgroundColor: '#E7AA39' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d99a2f'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E7AA39'}
            >
              Manage Assignments
            </Link>
            <Link
              to="/profile"
              className="px-6 py-3 text-white rounded-lg hover font-medium transition shadow-md hover:shadow-lg"
              style={{ backgroundColor: '#2E4D32' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#253d28'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2E4D32'}
            >
              View My Profile
            </Link>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Assigned Students" value={assignedStudents.length} icon="👨‍🎓" color="green" />
          <StatCard title="Total Assessments" value={assignedStudents.reduce((sum, s) => sum + s.assessments.length, 0)} icon="📝" color="blue" />
          <StatCard title="This Week" value={assignedStudents.filter(s => s.status === 'active').length} icon="📅" color="purple" />
          <StatCard title="Avg Performance" value="85%" icon="⭐" color="gold" />
        </div>

        {/* Assigned Students List */}
        <div className="mb-8">
          <Card title={`👥 My Assigned Students (${assignedStudents.length})`}>
            {assignedStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No students assigned yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignedStudents.map((student) => (
                  <div key={student.id} className="bg-gradient-to-r from-cream-100 to-cream-200 p-4 rounded-lg border border-gold-300">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-4">
                        <img
                          src={student.avatar}
                          alt={student.fullName}
                          className="h-12 w-12 rounded-full"
                        />
                        <div>
                          <h4 className="font-bold text-gray-900">{student.fullName}</h4>
                          <p className="text-sm text-gray-600">Parent: {student.parentName}</p>
                          <p className="text-sm text-gray-600">📧 {student.email} | 📞 {student.contact}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="bg-primary-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
                          {student.program}
                        </span>
                        <p className="text-xs text-gray-600 mt-1">ID: {student.id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div className="bg-white p-3 rounded">
                        <p className="text-xs text-gray-600">Schedule</p>
                        <p className="text-sm font-medium">{student.schedule.days.join(', ')}</p>
                        <p className="text-xs text-gray-600">{student.schedule.startTime} - {student.schedule.endTime}</p>
                      </div>
                      {permissions.canViewFinancials && (
                        <div className="bg-white p-3 rounded">
                          <p className="text-xs text-gray-600">Tuition</p>
                          <p className="text-sm font-medium">${student.tuitionFee}/month</p>
                          <p className="text-xs text-gray-600">Reg: ${student.registrationAmount}</p>
                        </div>
                      )}
                      <div className="bg-white p-3 rounded">
                        <p className="text-xs text-gray-600">Enrolled</p>
                        <p className="text-sm font-medium">{new Date(student.enrolledDate).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-600">Status: <span className="text-green-600 font-semibold">{student.status}</span></p>
                      </div>
                    </div>

                    {student.siblings.length > 0 && (
                      <div className="mb-3 bg-white p-3 rounded">
                        <p className="text-xs text-gray-600 mb-2">Siblings:</p>
                        <div className="flex flex-wrap gap-2">
                          {student.siblings.map((sibling) => (
                            <span key={sibling.id} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              {sibling.fullName} ({sibling.program})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assessments */}
                    {permissions.canViewAssessments && (
                      <div className="mb-3 bg-white p-3 rounded">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-semibold text-gray-900">Assessments ({student.assessments.length})</p>
                          {permissions.canEditAssessments && (
                            <button
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowAssessmentForm(true);
                              }}
                              className="text-xs bg-primary-600 text-white px-3 py-1 rounded hover:bg-primary-700"
                            >
                              + Add Assessment
                            </button>
                          )}
                        </div>
                        {student.assessments.length > 0 ? (
                          <div className="space-y-2">
                            {student.assessments.slice(-3).map((assessment) => (
                              <div key={assessment.id} className="bg-gray-50 p-2 rounded text-xs">
                                <div className="flex justify-between">
                                  <span className="font-medium">{assessment.type}</span>
                                  <span className="font-bold text-primary-600">{assessment.score}/{assessment.maxScore}</span>
                                </div>
                                <p className="text-gray-600">{assessment.notes}</p>
                                <p className="text-gray-500">{new Date(assessment.date).toLocaleDateString()}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">No assessments yet</p>
                        )}
                      </div>
                    )}

                    {/* Evaluations */}
                    {permissions.canViewEvaluations && (
                      <div className="bg-white p-3 rounded">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-semibold text-gray-900">Evaluations ({student.evaluations.length})</p>
                          {permissions.canEditEvaluations && (
                            <button
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowEvaluationForm(true);
                              }}
                              className="text-xs bg-gold-500 text-white px-3 py-1 rounded hover:bg-gold-600"
                            >
                              + Add Evaluation
                            </button>
                          )}
                        </div>
                        {student.evaluations.length > 0 ? (
                          <div className="space-y-2">
                            {student.evaluations.slice(-3).map((evaluation) => (
                              <div key={evaluation.id} className="bg-gray-50 p-2 rounded text-xs">
                                <div className="flex justify-between">
                                  <span className="font-medium">{evaluation.category}</span>
                                  <span className="font-bold text-gold-600">{'⭐'.repeat(evaluation.rating)}</span>
                                </div>
                                <p className="text-gray-600">{evaluation.comments}</p>
                                <p className="text-gray-500">{new Date(evaluation.date).toLocaleDateString()}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">No evaluations yet</p>
                        )}
                      </div>
                    )}

                    {/* Contact Parent Button */}
                    {permissions.canContactParents && (
                      <div className="mt-3">
                        <button className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 text-sm font-medium">
                          📧 Contact Parent
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
        <Card title="🔐 Your Permissions">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(permissions).map(([key, value]) => (
              <div key={key} className={`p-3 rounded-lg ${value ? 'bg-primary-50 border border-primary-200' : 'bg-red-50 border border-red-200'}`}>
                <p className="text-xs font-medium text-gray-900">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </p>
                <p className={`text-sm font-bold mt-1 ${value ? 'text-primary-600' : 'text-red-600'}`}>
                  {value ? '✓ Allowed' : '✗ Denied'}
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
                <p className="text-center text-3xl mt-2">{'⭐'.repeat(evaluationData.rating)}</p>
                <p className="text-center text-sm text-gray-600 mt-1">{evaluationData.rating} out of 5 stars</p>
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
