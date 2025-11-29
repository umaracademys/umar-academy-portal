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
import TeacherEvaluationAssignments from '../components/TeacherEvaluationAssignments';

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
  const [showEvaluationAssignments, setShowEvaluationAssignments] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const currentTeacher = user ? (teachers.find(t => t.email === user.email) || teachers[0]) : null;
  const assignedStudents = currentTeacher?.id ? getStudentsByTeacher(currentTeacher.id) : [];

  const teacherTickets = useMemo(() => {
    if (!currentTeacher?.id) {
      return [];
    }
    return getTeacherTickets(currentTeacher.id);
  }, [currentTeacher?.id, getTeacherTickets, recitationTickets]);

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
      await refreshData();
      
      setSaveSuccess('Assessment added successfully!');
      setShowAssessmentForm(false);
      setAssessmentData({ type: '', score: 0, maxScore: 100, notes: '' });
      
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add assessment';
      setSaveError(errorMessage);
      console.error('Error adding assessment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: string | Date | undefined | null): string => {
    if (!date) return 'Not set';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
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
      await refreshData();
      
      setSaveSuccess('Evaluation added successfully!');
      setShowEvaluationForm(false);
      setEvaluationData({ category: '', rating: 5, comments: '' });
      
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add evaluation';
      setSaveError(errorMessage);
      console.error('Error adding evaluation:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const buildActivityHistory = (student: Student) => {
    const activities: Array<{
      id: string;
      type: 'assignment' | 'ticket' | 'recitation_review';
      date: Date;
      title: string;
      description: string;
      status?: string;
      color: string;
      data: any;
    }> = [];

    return activities.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const activityHistory = useMemo(() => {
    if (!historyStudent) return [];
    return buildActivityHistory(historyStudent);
  }, [historyStudent, recitationReviews, refreshKey]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Array<{
      id: string;
      type: 'assignment' | 'ticket' | 'recitation_review';
      date: Date;
      title: string;
      description: string;
      status?: string;
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
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8 rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50 px-6 py-8 shadow-lg">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Teacher Workspace</span>
              <h1 className="text-4xl font-bold text-primary">Dashboard</h1>
              <p className="text-base text-gray-600 max-w-2xl">
                Manage assignments, review student work, and track progress all in one place.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/assignments"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[rgba(var(--color-primary-rgb),0.9)] shadow-md hover:shadow-lg"
              >
                Manage Assignments
              </Link>
              <button
                onClick={() => setShowRecitationReview(true)}
                className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[rgba(var(--color-accent-rgb),0.9)] shadow-md hover:shadow-lg"
              >
                Submit Review
              </button>
              <button
                onClick={() => setShowStudentReports(true)}
                className="inline-flex items-center justify-center rounded-xl border-2 border-primary px-6 py-3 text-sm font-bold text-primary transition-all hover:bg-soft-primary shadow-sm"
              >
                Student Reports
              </button>
              <Link
                to="/profile"
                className="inline-flex items-center justify-center rounded-xl border-2 border-gray-300 px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 shadow-sm"
              >
                My Profile
              </Link>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {saveSuccess && (
          <div className="mb-6 rounded-xl border-2 border-green-500 bg-green-50 px-6 py-4 shadow-sm">
            <p className="text-sm font-bold text-green-800">{saveSuccess}</p>
          </div>
        )}
        {saveError && (
          <div className="mb-6 rounded-xl border-2 border-red-500 bg-red-50 px-6 py-4 shadow-sm">
            <p className="text-sm font-bold text-red-800">{saveError}</p>
            <button
              onClick={() => setSaveError(null)}
              className="mt-2 text-xs text-red-600 underline font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard title="Assigned Students" value={currentTeacher ? assignedStudents.length : 0} icon="AS" />
          <StatCard title="Total Assessments" value={currentTeacher ? assignedStudents.reduce((sum, s) => sum + (Array.isArray(s.assessments) ? s.assessments.length : 0), 0) : 0} icon="TA" />
          <StatCard title="Active Students" value={currentTeacher ? assignedStudents.filter(s => s.status === 'active').length : 0} icon="WK" />
          <StatCard title="Pending Tickets" value={teacherTickets.length} icon="PT" />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Pending Tickets - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card title={`Pending Tickets (${teacherTickets.length})`}>
              {teacherTickets.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-400">PT</span>
                  </div>
                  <p className="text-lg font-semibold">No pending tickets</p>
                  <p className="text-sm mt-2">All tickets have been reviewed.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teacherTickets.map((ticket) => {
                    const handleTicketClick = async () => {
                      try {
                        if (ticket.status === 'pending' || ticket.status === 'reassigned') {
                          const updatedTicket = await startTicket(ticket.id);
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
                        className="w-full text-left rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-primary transition-all cursor-pointer"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide ${
                                ticket.type === 'sabqi' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : ticket.type === 'manzil'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {ticket.type}
                              </span>
                              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                ticket.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : ticket.status === 'in_progress'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {ticket.status === 'in_progress' ? 'In Progress' : ticket.status === 'reassigned' ? 'Reassigned' : 'Pending'}
                              </span>
                            </div>
                            <h4 className="text-xl font-bold text-primary mb-2">
                              {ticket.studentName}
                            </h4>
                            {ticket.teacherNotes && (
                              <p className="text-sm text-gray-600 mb-2">
                                <span className="font-semibold">Admin Notes:</span> {ticket.teacherNotes}
                              </p>
                            )}
                            {ticket.status === 'reassigned' && ticket.previousTeacherComment && (
                              <div className="mt-3 p-3 bg-orange-50 border-l-4 border-orange-500 rounded-lg">
                                <p className="text-xs font-bold text-orange-800 mb-1 uppercase tracking-wide">Previous Review</p>
                                <p className="text-sm text-orange-900">{ticket.previousTeacherComment}</p>
                                {ticket.reassignmentReason && (
                                  <p className="text-xs text-orange-700 mt-1">Reason: {ticket.reassignmentReason}</p>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-3">
                              Created: {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'N/A'} at {ticket.createdAt ? new Date(ticket.createdAt).toLocaleTimeString() : 'N/A'}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <div className="px-6 py-3 bg-primary hover:bg-[rgba(var(--color-primary-rgb),0.9)] text-white rounded-xl text-sm font-bold transition-all shadow-md whitespace-nowrap">
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

          {/* Quick Actions - Takes 1 column */}
          <div className="lg:col-span-1">
            <Card title="Quick Actions">
              <div className="space-y-3">
                <button
                  onClick={() => setShowEvaluationAssignments(true)}
                  className="w-full text-left px-4 py-4 rounded-xl border-2 border-gray-200 bg-white hover:border-primary hover:bg-soft-primary transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary text-lg font-bold">
                      📝
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary">My Evaluations</p>
                      <p className="text-xs text-gray-600">Complete assigned evaluations</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setShowRecitationReview(true)}
                  className="w-full text-left px-4 py-4 rounded-xl border-2 border-gray-200 bg-white hover:border-primary hover:bg-soft-primary transition-all shadow-sm"
                >
                  <div className="font-bold text-primary mb-1">Submit Recitation Review</div>
                  <div className="text-xs text-gray-600">Record student recitation feedback</div>
                </button>
                <button
                  onClick={() => setShowStudentReports(true)}
                  className="w-full text-left px-4 py-4 rounded-xl border-2 border-gray-200 bg-white hover:border-primary hover:bg-soft-primary transition-all shadow-sm"
                >
                  <div className="font-bold text-primary mb-1">View Student Reports</div>
                  <div className="text-xs text-gray-600">Access comprehensive reports</div>
                </button>
                <Link
                  to="/assignments"
                  className="block w-full text-left px-4 py-4 rounded-xl border-2 border-gray-200 bg-white hover:border-primary hover:bg-soft-primary transition-all shadow-sm"
                >
                  <div className="font-bold text-primary mb-1">Manage Assignments</div>
                  <div className="text-xs text-gray-600">Create and manage assignments</div>
                </Link>
              </div>
            </Card>
          </div>
        </div>

        {/* Assigned Students List */}
        <div className="mb-8">
          <Card title={`Assigned Students (${assignedStudents.length})`}>
            {assignedStudents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-400">AS</span>
                </div>
                <p className="text-lg font-semibold">No students assigned</p>
                <p className="text-sm mt-2">Students will appear here once assigned to you.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignedStudents.map((student) => (
                  <div key={student.id} className="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-4">
                        <img
                          src={student.avatar}
                          alt={student.fullName}
                          className="h-14 w-14 rounded-full border-2 border-gray-200"
                        />
                        <div>
                          <h4 className="font-bold text-lg text-primary">{student.fullName}</h4>
                          {permissions.canViewStudentPersonalInfo && (
                            <p className="text-sm text-gray-600">Parent: {student.parentName}</p>
                          )}
                          <p className="text-sm text-gray-500">
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
                        <span className="rounded-lg bg-soft-primary px-3 py-1.5 text-xs font-bold text-primary">
                          {student.program}
                        </span>
                        <p className="mt-2 text-xs text-gray-500">ID: {student.id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Schedule</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {Array.isArray(student.schedule?.days) && student.schedule.days.length > 0
                            ? student.schedule.days.join(', ')
                            : 'Not scheduled'}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {student.schedule?.startTime && student.schedule?.endTime
                            ? `${student.schedule.startTime} - ${student.schedule.endTime}`
                            : '—'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Enrolled</p>
                        <p className="text-sm font-semibold text-gray-900">{formatDate(getEnrollmentDate(student))}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Status: <span className="font-semibold text-primary">
                            {student.status || 'active'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {Array.isArray(student.siblings) && student.siblings.length > 0 && (
                      <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                        <p className="mb-2 text-xs font-bold text-gray-500 uppercase tracking-wide">Siblings</p>
                        <div className="flex flex-wrap gap-2">
                          {student.siblings.map((sibling) => (
                            <span key={sibling.id} className="rounded-lg bg-white border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700">
                              {sibling.fullName} ({sibling.program})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assessments */}
                    {permissions.canViewAssessments && (
                      <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-bold text-primary">Assessments ({Array.isArray(student.assessments) ? student.assessments.length : 0})</p>
                          {permissions.canEditAssessments && (
                            <button
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowAssessmentForm(true);
                                setSaveError(null);
                                setSaveSuccess(null);
                              }}
                              className="rounded-lg border-2 border-primary px-3 py-1 text-xs font-bold text-primary transition hover:bg-soft-primary"
                            >
                              Add Assessment
                            </button>
                          )}
                        </div>
                        {Array.isArray(student.assessments) && student.assessments.length > 0 ? (
                          <div className="space-y-2">
                            {student.assessments.slice(-3).map((assessment) => (
                              <div key={assessment.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs">
                                <div className="flex justify-between text-primary">
                                  <span className="font-semibold">{assessment.type}</span>
                                  <span className="font-bold text-primary">{assessment.score}/{assessment.maxScore}</span>
                                </div>
                                <p className="text-gray-600">{assessment.notes}</p>
                                <p className="text-[10px] text-gray-500 mt-1">{new Date(assessment.date).toLocaleDateString()}</p>
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
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-bold text-primary">Evaluations ({Array.isArray(student.evaluations) ? student.evaluations.length : 0})</p>
                          {permissions.canEditEvaluations && (
                            <button
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowEvaluationForm(true);
                                setSaveError(null);
                                setSaveSuccess(null);
                              }}
                              className="rounded-lg border-2 border-accent px-3 py-1 text-xs font-bold text-accent transition hover:bg-soft-accent"
                            >
                              Add Evaluation
                            </button>
                          )}
                        </div>
                        {Array.isArray(student.evaluations) && student.evaluations.length > 0 ? (
                          <div className="space-y-2">
                            {student.evaluations.slice(-3).map((evaluation) => (
                              <div key={evaluation.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs">
                                <div className="flex justify-between text-primary">
                                  <span className="font-semibold">{evaluation.category}</span>
                                  <span className="font-bold text-accent">Rating: {evaluation.rating}/5</span>
                                </div>
                                <p className="text-gray-600">{evaluation.comments}</p>
                                <p className="text-[10px] text-gray-500 mt-1">{new Date(evaluation.date).toLocaleDateString()}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">No evaluations yet</p>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-4 flex gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setHistoryStudent(student);
                          setShowStudentHistory(true);
                        }}
                        className="rounded-lg border-2 border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 shadow-sm"
                      >
                        View Activity History
                      </button>
                      {permissions.canContactParents && (
                        <button
                          disabled
                          className="rounded-lg border-2 border-gray-300 bg-gray-100 px-3 py-2 text-xs font-bold text-gray-400 cursor-not-allowed"
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
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowAssessmentForm(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 pb-4 border-b-2 border-primary">
              <h3 className="text-2xl font-bold text-primary">Add Assessment</h3>
              <p className="text-sm text-gray-600 mt-1">For {selectedStudent.fullName}</p>
            </div>
            
            {saveError && (
              <div className="mb-4 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3">
                <p className="text-xs font-bold text-red-800">{saveError}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Assessment Type</label>
                <input
                  type="text"
                  value={assessmentData.type}
                  onChange={(e) => setAssessmentData({ ...assessmentData, type: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                  placeholder="e.g., Quran Recitation, Math Quiz"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Score</label>
                  <input
                    type="number"
                    value={assessmentData.score}
                    onChange={(e) => setAssessmentData({ ...assessmentData, score: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Max Score</label>
                  <input
                    type="number"
                    value={assessmentData.maxScore}
                    onChange={(e) => setAssessmentData({ ...assessmentData, maxScore: parseInt(e.target.value) || 100 })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="100"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Notes</label>
                <textarea
                  value={assessmentData.notes}
                  onChange={(e) => setAssessmentData({ ...assessmentData, notes: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition resize-none"
                  rows={4}
                  placeholder="Add notes about this assessment..."
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowAssessmentForm(false)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAssessment}
                  disabled={isSaving}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
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
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowEvaluationForm(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 pb-4 border-b-2 border-accent">
              <h3 className="text-2xl font-bold text-accent">Add Evaluation</h3>
              <p className="text-sm text-gray-600 mt-1">For {selectedStudent.fullName}</p>
            </div>
            
            {saveError && (
              <div className="mb-4 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3">
                <p className="text-xs font-bold text-red-800">{saveError}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                <input
                  type="text"
                  value={evaluationData.category}
                  onChange={(e) => setEvaluationData({ ...evaluationData, category: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition"
                  placeholder="e.g., Behavior, Participation, Homework"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Rating (1-5 stars)</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={evaluationData.rating}
                  onChange={(e) => setEvaluationData({ ...evaluationData, rating: parseInt(e.target.value) })}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ 
                    background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${(evaluationData.rating - 1) * 25}%, #e5e7eb ${(evaluationData.rating - 1) * 25}%, #e5e7eb 100%)`
                  }}
                />
                <p className="text-center text-sm text-gray-600 mt-2 font-semibold">Rating: {evaluationData.rating} / 5</p>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Comments</label>
                <textarea
                  value={evaluationData.comments}
                  onChange={(e) => setEvaluationData({ ...evaluationData, comments: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition resize-none"
                  rows={4}
                  placeholder="Add your evaluation comments..."
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowEvaluationForm(false)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEvaluation}
                  disabled={isSaving}
                  className="px-6 py-3 bg-accent text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
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
            <header className="bg-gradient-to-br from-primary via-primary to-accent text-white px-6 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Activity History</h2>
                  <p className="text-white/90 mt-1">{historyStudent.fullName}</p>
                </div>
                <button
                  onClick={() => setShowStudentHistory(false)}
                  className="rounded-xl bg-white/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/30"
                >
                  Close
                </button>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto px-6 py-6">
              {activityHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg font-semibold">No activity history found for this student yet.</p>
                </div>
              ) : (
                <>
                  {/* Summary Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-right w-full">
                          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Total Activities</p>
                          <p className="mt-1 text-lg font-bold text-gray-900">{activityHistory.length}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-right w-full">
                          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Assignments</p>
                          <p className="mt-1 text-lg font-bold text-gray-900">{activityHistory.filter(a => a.type === 'assignment').length}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-right w-full">
                          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Tickets</p>
                          <p className="mt-1 text-lg font-bold text-gray-900">{activityHistory.filter(a => a.type === 'ticket').length}</p>
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
                          color: string;
                          data: any;
                        }>;
                        return (
                        <div key={dateKey} className="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm">
                          <div className="mb-4 pb-3 border-b-2 border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900">{dateKey}</h3>
                            <p className="text-xs text-gray-500 mt-1 font-semibold">
                              {activities.length} activit{activities.length !== 1 ? 'ies' : 'y'} on this day
                            </p>
                          </div>
                          
                          <div className="space-y-4">
                            {activities.map((activity) => {
                              const mushafMarkings = activity.type === 'assignment' && activity.data.mushafMarkings 
                                ? (Array.isArray(activity.data.mushafMarkings) ? activity.data.mushafMarkings : [])
                                : [];
                              
                              return (
                                <div key={activity.id} className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                      <div>
                                        <h4 className="font-bold text-gray-900">{activity.title}</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                          {activity.date.toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                    {activity.status && (
                                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${activity.color}`}>
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
                                    <div className="mt-3 rounded-lg border-2 border-orange-300 bg-orange-50 p-3">
                                      <h5 className="text-xs font-bold text-orange-900 mb-2 uppercase tracking-wide">
                                        Mushaf Mistakes ({mushafMarkings.length})
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
                                              className={`px-2 py-1 rounded-lg text-xs font-bold ${
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
                                        className="text-primary hover:underline font-semibold"
                                      >
                                        Listen to Audio
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

      {showEvaluationAssignments && (
        <TeacherEvaluationAssignments
          onClose={() => setShowEvaluationAssignments(false)}
        />
      )}
      
      <DebugPanel />
    </div>
  );
};

export default TeacherDashboard;
