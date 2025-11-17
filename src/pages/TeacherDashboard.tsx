import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import DebugPanel from '../components/DebugPanel';
import TeacherRecitationReview from '../components/TeacherRecitationReview';
import StudentReports from '../components/StudentReports';
import TeacherTicketReview from '../components/TeacherTicketReview';
import { useData } from '../contexts/DataContext';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { Student, Assessment, Evaluation } from '../types';
import { Ticket } from '../types/ticket';

const TeacherDashboard: React.FC = () => {
  const { teachers, getStudentsByTeacher, updateStudent, refreshData } = useData();
  const { recitationReviews, recitationTickets, getTeacherTickets, startTicket, submitTicket } = useBackendData();
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [showRecitationReview, setShowRecitationReview] = useState(false);
  const [showStudentHistory, setShowStudentHistory] = useState(false);
  const [showStudentReports, setShowStudentReports] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showTicketReview, setShowTicketReview] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Get current teacher info - only when user is loaded
  const currentTeacher = user ? (teachers.find(t => t.email === user.email) || teachers[0]) : null;
  // Debug logs (commented out - uncomment for debugging)
  // console.log('🔍 TeacherDashboard - currentTeacher:', currentTeacher);
  // console.log('🔍 TeacherDashboard - user email:', user?.email);
  // console.log('🔍 TeacherDashboard - all teachers:', teachers);
  // Only call getStudentsByTeacher when we have a valid teacher ID
  const assignedStudents = currentTeacher?.id ? getStudentsByTeacher(currentTeacher.id) : [];
  // console.log('🔍 TeacherDashboard - assignedStudents:', assignedStudents);

  // Get tickets assigned to this teacher
  const teacherTickets = useMemo(() => {
    if (!currentTeacher?.id) {
      console.log('🔍 No currentTeacher ID:', currentTeacher);
      return [];
    }
    const tickets = getTeacherTickets(currentTeacher.id);
    console.log('🎫 Teacher tickets found:', {
      teacherId: currentTeacher.id,
      teacherEmail: currentTeacher.email,
      ticketsCount: tickets.length,
      allTicketsCount: recitationTickets.length,
      allTickets: recitationTickets.map(t => ({
        id: t.id,
        assignedTeacherId: t.assignedTeacherId,
        status: t.status,
        type: t.type,
        studentName: t.studentName
      }))
    });
    return tickets;
  }, [currentTeacher?.id, getTeacherTickets, recitationTickets]);

  // Get teacher permissions - only when currentTeacher is available
  const permissions = (currentTeacher?.permissions) || {
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

  // Build comprehensive activity history timeline for a student
  const buildActivityHistory = (student: Student) => {
    const activities: Array<{
      id: string;
      type: 'assignment' | 'ticket' | 'recitation_review';
      date: Date;
      title: string;
      description: string;
      status?: string;
      icon: string;
      color: string;
      data: any;
    }> = [];

    // Only recitation reviews are shown now (assignments and tickets removed)

    // Sort by date (most recent first)
    return activities.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const activityHistory = useMemo(() => {
    if (!historyStudent) return [];
    return buildActivityHistory(historyStudent);
  }, [historyStudent, recitationReviews, refreshKey]);

  // Group activities by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Array<{
      id: string;
      type: 'assignment' | 'ticket' | 'recitation_review';
      date: Date;
      title: string;
      description: string;
      status?: string;
      icon: string;
      color: string;
      data: any;
    }>> = {};
    activityHistory.forEach(activity => {
      const dateKey = activity.date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });
    return groups;
  }, [activityHistory]);

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
              <Link
                to="/assignments"
                className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)]"
              >
                Manage Assignments
              </Link>
              <button
                onClick={() => setShowRecitationReview(true)}
                className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)]"
              >
                Submit Recitation Review
              </button>
              <button
                onClick={() => setShowStudentReports(true)}
                className="inline-flex items-center justify-center rounded-full border border-[rgba(var(--color-primary-rgb),0.35)] px-5 py-3 text-sm font-semibold text-primary transition hover:bg-soft-primary"
              >
                📊 Student Reports
              </button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Assigned Students" value={currentTeacher ? assignedStudents.length : 0} icon="AS" />
          <StatCard title="Total Assessments" value={currentTeacher ? assignedStudents.reduce((sum, s) => sum + (Array.isArray(s.assessments) ? s.assessments.length : 0), 0) : 0} icon="TA" />
          <StatCard title="Active Students" value={currentTeacher ? assignedStudents.filter(s => s.status === 'active').length : 0} icon="WK" />
          <StatCard title="Pending Tickets" value={teacherTickets.length} icon="PT" />
        </div>

        {/* Pending Tickets Section */}
        <div className="mb-8">
          <Card title={`Pending Tickets (${teacherTickets.length})`}>
            {/* Debug Info - Remove after testing */}
            {import.meta.env.MODE === 'development' && (
              <div className="mb-4 p-3 bg-gray-100 rounded-lg text-xs">
                <p><strong>Debug Info:</strong></p>
                <p>Teacher ID: {currentTeacher?.id || 'N/A'}</p>
                <p>Teacher Email: {currentTeacher?.email || 'N/A'}</p>
                <p>All Tickets: {recitationTickets.length}</p>
                <p>Filtered Tickets: {teacherTickets.length}</p>
                {recitationTickets.length > 0 && (
                  <div className="mt-2">
                    <p><strong>All Tickets:</strong></p>
                    {recitationTickets.map(t => (
                      <div key={t.id} className="ml-2">
                        - {t.studentName} ({t.type}) - Teacher: {t.assignedTeacherId || 'N/A'} - Status: {t.status}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {teacherTickets.length === 0 ? (
              <div className="text-center py-8 text-primary-soft">
                <p>No pending tickets assigned to you.</p>
                {recitationTickets.length > 0 && (
                  <p className="text-xs mt-2">Note: {recitationTickets.length} ticket(s) exist but may be assigned to other teachers.</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {teacherTickets.map((ticket) => {
                  const handleTicketClick = async () => {
                    try {
                      if (ticket.status === 'pending' || ticket.status === 'reassigned') {
                        console.log('🎫 Starting ticket:', ticket.id);
                        const updatedTicket = await startTicket(ticket.id);
                        console.log('✅ Ticket started:', updatedTicket);
                        setSelectedTicket(updatedTicket);
                        setShowTicketReview(true);
                        setRefreshKey(prev => prev + 1);
                      } else if (ticket.status === 'in_progress') {
                        setSelectedTicket(ticket);
                        setShowTicketReview(true);
                      }
                    } catch (error) {
                      console.error('Error starting ticket:', error);
                      setSaveError('Failed to start ticket');
                    }
                  };

                  return (
                    <button
                      key={ticket.id}
                      onClick={handleTicketClick}
                      className="w-full text-left rounded-2xl border-2 border-accent-soft bg-white p-5 shadow-sm hover:shadow-md hover:border-primary transition-all cursor-pointer"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              ticket.type === 'sabqi' 
                                ? 'bg-blue-100 text-blue-800' 
                                : ticket.type === 'manzil'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {ticket.type.toUpperCase()}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              ticket.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : ticket.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {ticket.status === 'in_progress' ? 'In Progress' : ticket.status === 'reassigned' ? 'Reassigned' : 'Pending'}
                            </span>
                          </div>
                          <h4 className="text-lg font-semibold text-primary mb-1">
                            {ticket.studentName}
                          </h4>
                          {ticket.teacherNotes && (
                            <p className="text-sm text-primary-soft mb-2">
                              <span className="font-medium">Admin Notes:</span> {ticket.teacherNotes}
                            </p>
                          )}
                          {ticket.status === 'reassigned' && ticket.previousTeacherComment && (
                            <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                              <p className="text-xs font-semibold text-orange-800 mb-1">Previous Review:</p>
                              <p className="text-sm text-orange-700">{ticket.previousTeacherComment}</p>
                              {ticket.reassignmentReason && (
                                <p className="text-xs text-orange-600 mt-1">Reason: {ticket.reassignmentReason}</p>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-primary-soft mt-2">
                            Created: {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'N/A'} at {ticket.createdAt ? new Date(ticket.createdAt).toLocaleTimeString() : 'N/A'}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <div className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full text-sm font-semibold transition-colors whitespace-nowrap">
                            {ticket.status === 'pending' || ticket.status === 'reassigned' 
                              ? 'Start Review' 
                              : 'Continue Review'}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
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
                            {permissions.canViewStudentEmail && `Email: ${student.email}`}
                            {permissions.canViewStudentEmail && permissions.canViewStudentContact && ' · '}
                            {permissions.canViewStudentContact && `Phone: ${student.contact}`}
                            {!permissions.canViewStudentEmail && !permissions.canViewStudentContact && (
                              <span className="text-gray-400">No contact information available</span>
                            )}
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

                    {/* Action Buttons */}
                    <div className="mt-3 flex gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setHistoryStudent(student);
                          setShowStudentHistory(true);
                        }}
                        className="rounded-full border border-[rgba(var(--color-primary-rgb),0.35)] bg-soft-primary px-4 py-2 text-xs font-semibold text-primary transition hover:bg-[rgba(var(--color-primary-rgb),0.15)]"
                      >
                        📜 View Activity History
                      </button>
                      {permissions.canContactParents && (
                        <button
                          disabled
                          className="rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-400 cursor-not-allowed"
                        >
                          Contact Parent - Coming Soon
                        </button>
                      )}
                    </div>
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


      {/* Student Reports Modal */}
      {showStudentReports && (
        <StudentReports
          onClose={() => setShowStudentReports(false)}
        />
      )}

      {/* Ticket Review Modal */}
      {showTicketReview && selectedTicket && (
        <TeacherTicketReview
          ticket={selectedTicket}
          onClose={() => {
            setShowTicketReview(false);
            setSelectedTicket(null);
            setRefreshKey(prev => prev + 1);
          }}
          onSubmit={async (ticketId, data) => {
            await submitTicket(ticketId, data);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {/* Student Activity History Modal */}
      {showStudentHistory && historyStudent && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4 py-6"
          onClick={() => setShowStudentHistory(false)}
        >
          <div 
            className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary)] to-[var(--color-accent)] text-white px-6 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Activity History</h2>
                  <p className="text-white/90 mt-1">{historyStudent.fullName}</p>
                </div>
                <button
                  onClick={() => setShowStudentHistory(false)}
                  className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30"
                >
                  ✕ Close
                </button>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto px-6 py-6">
              {activityHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No activity history found for this student yet.</p>
                </div>
              ) : (
                <>
                  {/* Summary Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">📊</span>
                        <div className="text-right">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Activities</p>
                          <p className="mt-1 text-lg font-semibold text-gray-900">{activityHistory.length}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">📝</span>
                        <div className="text-right">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Assignments</p>
                          <p className="mt-1 text-lg font-semibold text-gray-900">{activityHistory.filter(a => a.type === 'assignment').length}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">🎫</span>
                        <div className="text-right">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tickets</p>
                          <p className="mt-1 text-lg font-semibold text-gray-900">{activityHistory.filter(a => a.type === 'ticket').length}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Grouped by Date */}
                  <div className="space-y-6">
                    {Object.entries(groupedByDate)
                      .sort(([dateA], [dateB]) => {
                        const a = new Date(dateA);
                        const b = new Date(dateB);
                        return b.getTime() - a.getTime();
                      })
                      .map(([dateKey, dayActivities]) => {
                        const activities = dayActivities as Array<{
                          id: string;
                          type: 'assignment' | 'ticket' | 'recitation_review';
                          date: Date;
                          title: string;
                          description: string;
                          status?: string;
                          icon: string;
                          color: string;
                          data: any;
                        }>;
                        return (
                        <div key={dateKey} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                          <div className="mb-4 pb-3 border-b border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900">{dateKey}</h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {activities.length} activit{activities.length !== 1 ? 'ies' : 'y'} on this day
                            </p>
                          </div>
                          
                          <div className="space-y-4">
                            {activities.map((activity) => {
                              const mushafMarkings = activity.type === 'assignment' && activity.data.mushafMarkings 
                                ? (Array.isArray(activity.data.mushafMarkings) ? activity.data.mushafMarkings : [])
                                : [];
                              
                              return (
                                <div key={activity.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xl">{activity.icon}</span>
                                      <div>
                                        <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                          {activity.date.toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                    {activity.status && (
                                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${activity.color}`}>
                                        {activity.status.replace('_', ' ').toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {activity.description && activity.description !== 'No description' && (
                                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                                      {activity.description}
                                    </p>
                                  )}
                                  
                                  {/* Mushaf Mistakes */}
                                  {mushafMarkings.length > 0 && (
                                    <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
                                      <h5 className="text-xs font-semibold text-orange-900 mb-2">
                                        📖 Mushaf Mistakes ({mushafMarkings.length})
                                      </h5>
                                      <div className="flex flex-wrap gap-2">
                                        {mushafMarkings.map((mistake: any, idx: number) => {
                                          const typeLabel = mistake.type === 'memory' ? 'Memory' :
                                                           mistake.type === 'madd' ? 'Madd' :
                                                           mistake.type === 'ikhfa' ? 'Ikhfa' :
                                                           mistake.type === 'holding' ? 'Holding' :
                                                           mistake.type === 'tech' ? 'Tech' :
                                                           mistake.type === 'other' ? 'Other' : mistake.type;
                                          return (
                                            <span
                                              key={idx}
                                              className={`px-2 py-1 rounded text-xs font-medium ${
                                                mistake.type === 'memory' 
                                                  ? 'bg-red-100 text-red-800' 
                                                  : 'bg-yellow-100 text-yellow-800'
                                              }`}
                                            >
                                              {typeLabel} • Page {mistake.page}
                                              {mistake.surah && mistake.ayah && ` • ${mistake.surah}:${mistake.ayah}`}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Additional info based on type */}
                                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                                    {activity.type === 'assignment' && activity.data.assignedBy && (
                                      <span>Assigned by: {activity.data.listenerName || activity.data.assignedTeacherName || 'Admin'}</span>
                                    )}
                                    {activity.type === 'ticket' && activity.data.assignedTeacherName && (
                                      <span>Teacher: {activity.data.assignedTeacherName}</span>
                                    )}
                                    {activity.type === 'recitation_review' && activity.data.audioLink && (
                                      <a 
                                        href={activity.data.audioLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                      >
                                        🔊 Listen to Audio
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        );
                      })}
                  </div>
                </>
              )}
            </main>
          </div>
        </div>
      )}
      
      <DebugPanel />
    </div>
  );
};

export default TeacherDashboard;
