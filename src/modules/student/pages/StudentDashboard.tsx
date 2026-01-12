import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../../components/Header';
import StatCard from '../../../components/StatCard';
import Card from '../../../components/Card';
// DebugPanel only in development
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
const DebugPanel = isDevelopment ? lazy(() => import('../../../components/DebugPanel')) : null;
import StudentPersonalMushaf from '../../../components/StudentPersonalMushaf';
import StudentTestResults from '../../../components/StudentTestResults';
import TeacherStudentMessage from '../../../components/TeacherStudentMessage';
import StudentWeeklyEvaluationReview from '../../../components/StudentWeeklyEvaluationReview';
import StudentPasswordChangeModal from '../../../components/StudentPasswordChangeModal';
import HomeworkDisplay from '../../../components/HomeworkDisplay';
import { useData } from '../../../contexts/DataContext';
import { useBackendData } from '../../../contexts/BackendDataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Assignment } from '../../../types/index';

const StudentDashboard: React.FC = () => {
  const { students, getStudentByEmail, updateStudent, teachers } = useData();
  const { assignments: backendAssignments, getPairStudents, getPairDailyReports } = useBackendData();
  const { user } = useAuth();
  
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [showPersonalMushaf, setShowPersonalMushaf] = useState(false);
  const [showTestResults, setShowTestResults] = useState(false);
  const [showTeacherStudentMessage, setShowTeacherStudentMessage] = useState(false);
  const [selectedTeacherForMessage, setSelectedTeacherForMessage] = useState<any>(null);
  const [showWeeklyEvaluations, setShowWeeklyEvaluations] = useState(false);
  const [pairInfo, setPairInfo] = useState<any>(null);
  const [pairDailyReports, setPairDailyReports] = useState<any[]>([]);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, {
    classwork?: boolean;
    homework?: boolean;
  } | boolean>>({});
  
  // Type guard helper
  const isAssignmentSection = (value: any): value is { classwork?: boolean; homework?: boolean } => {
    return typeof value === 'object' && value !== null;
  };
  const navigate = useNavigate();

  const currentStudent = getStudentByEmail(user?.email || '') || students[0];
  const isAfterSchool = currentStudent?.program === 'After School';
  const isFullTimeHQ = currentStudent?.program === 'Full-Time HQ';
  const isPartTimeHQ = currentStudent?.program === 'Part-Time HQ';
  const shouldHideQaidah = isFullTimeHQ || isPartTimeHQ;
  
  // Show password change modal on login if passwordChangeRequired is true
  useEffect(() => {
    if (user?.passwordChangeRequired && !showPasswordChangeModal) {
      setShowPasswordChangeModal(true);
    }
  }, [user?.passwordChangeRequired, showPasswordChangeModal]);

  // Debug logging
  useEffect(() => {
    if (currentStudent) {
      console.log('🔍 Student Program Check:', {
        email: currentStudent.email,
        program: currentStudent.program,
        isFullTimeHQ,
        isPartTimeHQ,
        shouldHideQaidah
      });
    }
  }, [currentStudent, isFullTimeHQ, isPartTimeHQ, shouldHideQaidah]);

  // Load pair information for student
  useEffect(() => {
    const loadPairInfo = async () => {
      if (!currentStudent?.id) return;
      try {
        const pairStudents = await getPairStudents({ student: currentStudent.id, status: 'active' });
        if (pairStudents.length > 0) {
          const pairStudent = pairStudents[0];
          setPairInfo({
            pair: pairStudent.pair,
            pairStudent: pairStudent,
            schedule: {
              startTime: pairStudent.startTime,
              endTime: pairStudent.endTime,
              days: pairStudent.days
            }
          });
          
          // Load daily reports for this student
          const reports = await getPairDailyReports({ student: currentStudent.id });
          setPairDailyReports(reports);
        }
      } catch (error) {
        console.error('Error loading pair info:', error);
      }
    };
    
    loadPairInfo();
  }, [currentStudent, getPairStudents, getPairDailyReports]);


  const studentAssignments = useMemo(() => {
    if (!currentStudent?.id) return [];
    
    const isAfterSchool = currentStudent?.program === 'After School';
    
    return backendAssignments
      .filter((assignment: any) => {
        const assignmentStudentId = assignment.studentId || assignment._id?.studentId;
        const matches = assignmentStudentId === currentStudent.id || 
                       assignmentStudentId === currentStudent.id.toString() ||
                       String(assignmentStudentId) === String(currentStudent.id);
        
        // For After School students, only show assignments that are specifically for them
        // or assignments that don't have program restrictions
        if (isAfterSchool) {
          // Filter to show only After School specific assignments
          // You can add additional filtering logic here if needed
          return matches;
        }
        
        // Filter out assignments that ONLY have Qaidah homework
        const hasQaidahHomework = assignment.homework?.qaidahHomework;
        const hasClasswork = (assignment.classwork?.sabq?.length || 0) +
                            (assignment.classwork?.sabqi?.length || 0) +
                            (assignment.classwork?.manzil?.length || 0) > 0;
        const hasRegularHomework = assignment.homework?.enabled && !hasQaidahHomework;
        
        // If assignment only has Qaidah homework and nothing else, hide it
        if (hasQaidahHomework && !hasClasswork && !hasRegularHomework) {
          return false;
        }
        
        return matches;
      })
      .map((assignment: any) => {
        const assignmentId = assignment._id || assignment.id;
        const createdAt = assignment.createdAt ? new Date(assignment.createdAt) : new Date();
        
        const classworkCount = 
          (assignment.classwork?.sabq?.length || 0) +
          (assignment.classwork?.sabqi?.length || 0) +
          (assignment.classwork?.manzil?.length || 0);
        
        let title = 'Assignment';
        
        // Set title based on classwork
        if (classworkCount > 0) {
          const sections: string[] = [];
          if (assignment.classwork?.sabq?.length > 0) {
            sections.push(`${assignment.classwork.sabq.length} Sabq`);
          }
          if (assignment.classwork?.sabqi?.length > 0) {
            sections.push(`${assignment.classwork.sabqi.length} Sabqi`);
          }
          if (assignment.classwork?.manzil?.length > 0) {
            sections.push(`${assignment.classwork.manzil.length} Manzil`);
          }
          title = sections.join(', ');
        }
        
        if (assignment.homework?.enabled && !assignment.homework?.qaidahHomework) {
          title += (classworkCount > 0 ? ' + ' : '') + 'Homework';
        }
        
        const status = assignment.status || 'active';
        
        return {
          id: assignmentId,
          _id: assignmentId,
          title: title,
          description: assignment.comment || '',
          course: 'Quran Recitation',
          instructor: assignment.assignedByName || 'Teacher',
          dueDate: createdAt.toISOString().split('T')[0],
          status: status === 'completed' ? 'completed' : status === 'archived' ? 'archived' : 'active',
          grade: null,
          maxPoints: 100,
          type: 'classwork',
          studentId: currentStudent.id,
          createdAt: createdAt,
          classwork: assignment.classwork || { sabq: [], sabqi: [], manzil: [] },
          homework: (() => {
            const hw = assignment.homework || { enabled: false, content: '', link: '' };
            // Remove qaidahHomework from homework object
            if (hw.qaidahHomework) {
              const { qaidahHomework, ...rest } = hw;
              return rest;
            }
            return hw;
          })(),
          qaidahHomework: null,
          comment: assignment.comment || '',
          mushafMistakes: assignment.mushafMistakes || [],
          assignedByName: assignment.assignedByName,
          assignedByRole: assignment.assignedByRole,
          originalAssignment: assignment
        };
      })
      .sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [backendAssignments, currentStudent]);

  const completedAssignments = studentAssignments.filter((a: any) => a.status === 'completed' || a.status === 'graded');
  const pendingAssignments = studentAssignments.filter((a: any) => a.status === 'pending' || a.status === 'submitted');
  const overdueAssignments = studentAssignments.filter((a: any) => a.status === 'overdue');

  const gradedAssignments = studentAssignments.filter((a: any) => a.grade !== null && a.grade !== undefined);
  const averageGrade = gradedAssignments.length > 0 
    ? Math.round(gradedAssignments.reduce((sum: number, a: any) => sum + (a.grade || 0), 0) / gradedAssignments.length)
    : 0;

  const studentPayments: any[] = [];
  const totalPaid = 0;
  const lastPayment = null;

  const [submissionData, setSubmissionData] = useState({
    content: '',
    attachments: [] as string[],
  });

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || !currentStudent) {
      console.error('Missing assignment or student', { selectedAssignment, currentStudent });
      return;
    }

    if (!submissionData.content.trim()) {
      alert('Please enter submission content');
      return;
    }

    try {
      const submission = {
        studentId: currentStudent.id.toString(),
        content: submissionData.content,
        link: '',
        attachments: submissionData.attachments.map((url: string) => ({
          type: 'link',
          content: url,
          title: 'Attachment'
        }))
      };

      const assignmentId = (selectedAssignment as any)._id || selectedAssignment.id;
      
      if (!assignmentId || assignmentId === 'undefined' || assignmentId === undefined) {
        throw new Error('Assignment ID is missing. Please refresh the page and try again.');
      }
      
      const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE}/assignments/${assignmentId}/submit-homework`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: submission.content,
          link: submission.link || '',
          attachments: submission.attachments,
          studentId: currentStudent.id,
          studentName: currentStudent.fullName
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit homework');
      }
      
      setShowSubmissionForm(false);
      setSubmissionData({ content: '', attachments: [] });
      setSelectedAssignment(null);
      
      alert('Assignment submitted successfully!');
      window.location.reload();
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert(`Failed to submit assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!currentStudent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Student Profile Not Found</h1>
            <p className="text-gray-600 mb-4">We couldn't find your student profile.</p>
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 max-w-md mx-auto">
              <h3 className="font-bold text-yellow-800 mb-2">Debug Information:</h3>
              <p className="text-sm text-yellow-700">User: {user ? user.name : 'Not logged in'}</p>
              <p className="text-sm text-yellow-700">Email: {user?.email || 'No email'}</p>
              <p className="text-sm text-yellow-700">Students in system: {students.length}</p>
            </div>
            <div className="mt-4">
              <button 
                onClick={() => window.location.reload()} 
                className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition-all shadow-md"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-2">
        {/* Header Section - Compact */}
        <div className="mb-2 rounded-lg border border-gray-200 bg-white px-2 py-2">
          <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Student Portal</span>
              <h1 className="text-lg font-bold text-primary">Dashboard</h1>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                to="/student/assignments"
                className="inline-flex items-center justify-center rounded bg-accent px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-accent/90"
              >
                Assignments
              </Link>
              <button
                onClick={() => setShowPersonalMushaf(true)}
                className="inline-flex items-center justify-center rounded border border-primary px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-soft-primary"
              >
                Mushaf
              </button>
              {!isAfterSchool && (
                <button
                  onClick={() => setShowTestResults(true)}
                  className="inline-flex items-center justify-center rounded border border-primary px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-soft-primary"
                >
                  Tests
                </button>
              )}
              <button
                onClick={() => setShowWeeklyEvaluations(true)}
                className="inline-flex items-center justify-center rounded border border-primary px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-soft-primary"
              >
                Evaluations
              </button>
              <Link
                to="/student/profile"
                className="inline-flex items-center justify-center rounded border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Profile
              </Link>
            </div>
          </div>
        </div>

        {/* Statistics Grid - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <StatCard title="Total" value={studentAssignments.length} icon="TA" />
          <StatCard title="Completed" value={completedAssignments.length} icon="CP" />
          <StatCard title="Grade" value={`${averageGrade}%`} icon="AG" />
          <StatCard title="Pending" value={pendingAssignments.length} icon="PD" />
        </div>

        {/* Teacher Pair Information - Wrapped */}
        {pairInfo && pairInfo.pair && (
          <div className="mb-2">
            <Card title="">
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, teacherPair: !prev.teacherPair }))}
                className="w-full flex items-center justify-between mb-1.5 pb-1.5 border-b border-gray-200"
              >
                <span className="text-sm font-bold text-primary">My Teacher Pair</span>
                <span className="text-[9px] text-gray-600">
                  {expandedSections.teacherPair ? '▼' : '▶'}
                </span>
              </button>
              {expandedSections.teacherPair && (
              <div className="rounded border border-primary/20 bg-primary/5 p-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-primary mb-1">
                      {pairInfo.pair.name || 'Teacher Pair'}
                    </h3>
                    <p className="text-xs text-gray-700 mb-1">
                      Program: <span className="font-semibold">{pairInfo.pair.program || 'N/A'}</span>
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-gray-600">Teachers:</span>
                        <span className="text-xs font-semibold text-primary">
                          {pairInfo.pair.teacher1?.fullName || 'Teacher 1'}
                          {pairInfo.pair.teacher2?.fullName && ` & ${pairInfo.pair.teacher2.fullName}`}
                        </span>
                      </div>
                      {pairInfo.schedule && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-gray-600">Schedule:</span>
                          <span className="text-xs font-semibold text-gray-900">
                            {pairInfo.schedule.startTime} - {pairInfo.schedule.endTime}
                          </span>
                        </div>
                      )}
                      {pairInfo.schedule?.days && pairInfo.schedule.days.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-gray-600">Days:</span>
                          <span className="text-xs font-semibold text-gray-900">
                            {pairInfo.schedule.days.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      pairInfo.pair.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {pairInfo.pair.status || 'Active'}
                    </span>
                  </div>
                </div>
                
                {/* Recent Daily Reports - Compact */}
                {pairDailyReports.length > 0 && (
                  <div className="mt-2 border-t border-gray-200 pt-2">
                    <h4 className="font-bold text-xs text-primary mb-1.5">Recent Reports</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {pairDailyReports.slice(0, 3).map((report: any) => (
                        <div key={report._id} className="p-1.5 bg-gray-50 rounded text-xs">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-semibold text-gray-600">
                              {new Date(report.date).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] font-semibold text-primary">
                              {report.teacher?.fullName || 'Teacher'}
                            </span>
                          </div>
                          {(report.sabq || report.sabqi || report.manzil) && (
                            <div className="text-[10px] text-gray-700">
                              {report.sabq && <div><span className="font-semibold">Sabq:</span> {report.sabq.substring(0, 40)}...</div>}
                              {report.sabqi && <div><span className="font-semibold">Sabqi:</span> {report.sabqi.substring(0, 40)}...</div>}
                              {report.manzil && <div><span className="font-semibold">Manzil:</span> {report.manzil.substring(0, 40)}...</div>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              )}
            </Card>
          </div>
        )}


        {/* Quick Access Cards - Compact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
          <Link
            to="/student/assignments"
            className="block rounded border border-primary/20 bg-white p-2 hover:border-primary transition-all"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary text-sm">
                📝
              </div>
              <div>
                <h3 className="font-bold text-xs text-primary">Assignments</h3>
                <p className="text-[10px] text-gray-600">View all assignments</p>
              </div>
            </div>
          </Link>
          <button
            onClick={() => setShowPersonalMushaf(true)}
            className="block w-full text-left rounded border border-primary/20 bg-white p-2 hover:border-primary transition-all"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary text-sm">
                📖
              </div>
              <div>
                <h3 className="font-bold text-xs text-primary">Mushaf</h3>
                <p className="text-[10px] text-gray-600">Mistake history</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => setShowWeeklyEvaluations(true)}
            className="block w-full text-left rounded border border-primary/20 bg-white p-2 hover:border-primary transition-all"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary text-sm">
                📋
              </div>
              <div>
                <h3 className="font-bold text-xs text-primary">Evaluations</h3>
                <p className="text-[10px] text-gray-600">Weekly reviews</p>
              </div>
            </div>
          </button>
        </div>

        {/* Main Content Grid - Compact */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-2">
          {/* Profile Information - Compact */}
          <div className="lg:col-span-1">
            <Card title="Profile">
              <div className="text-center mb-2">
                <img
                  src={currentStudent.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentStudent.fullName)}&background=1F3224&color=fff`}
                  alt={currentStudent.fullName}
                  className="h-12 w-12 rounded-full border-2 border-gray-200 mx-auto mb-1"
                />
                <h3 className="text-xs font-bold text-primary mb-0.5">{currentStudent.fullName}</h3>
                <span className="inline-block px-1.5 py-0.5 rounded bg-soft-primary text-primary text-[9px] font-semibold">
                  {currentStudent.status}
                </span>
              </div>
              <div className="space-y-1.5 border-t border-gray-200 pt-2">
                <div>
                  <p className="text-[9px] font-semibold text-gray-500 uppercase mb-0.5">Program</p>
                  <p className="text-xs font-semibold text-gray-900">{currentStudent.program}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-gray-500 uppercase mb-0.5">ID</p>
                  <p className="text-xs font-semibold text-gray-900">{currentStudent.id}</p>
                </div>
                {currentStudent.schedule && (
                  <div>
                    <p className="text-[9px] font-semibold text-gray-500 uppercase mb-0.5">Schedule</p>
                    <p className="text-xs font-semibold text-gray-900">
                      {currentStudent.schedule?.days?.join(', ') || 'Not set'}
                    </p>
                    <p className="text-[10px] text-gray-600">
                      {currentStudent.schedule?.startTime || 'N/A'} - {currentStudent.schedule?.endTime || 'N/A'}
                    </p>
                  </div>
                )}
                <div className="pt-1 border-t border-gray-200">
                  <button
                    onClick={() => setShowPasswordChangeModal(true)}
                    className="w-full px-2 py-1.5 bg-primary text-white rounded text-xs font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Assignments - Compact */}
          <div className="lg:col-span-2">
            <Card title={`Assignments (${studentAssignments.length})`}>
              {studentAssignments.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-xs font-semibold">No assignments yet</p>
                  <p className="text-[10px] mt-0.5">Your teacher will assign work soon.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {studentAssignments.slice(0, 5).map((assignment: any) => {
                    const classwork = assignment.classwork || { sabq: [], sabqi: [], manzil: [] };
                    const hasClasswork = classwork.sabq.length > 0 || classwork.sabqi.length > 0 || classwork.manzil.length > 0;
                    const hasHomework = assignment.homework?.enabled;
                    
                    return (
                      <div key={assignment.id} className="bg-white rounded border border-gray-200 p-2 hover:border-primary transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 mb-1.5">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <h4 className="text-xs font-bold text-primary">{assignment.title}</h4>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                assignment.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {assignment.status === 'active' ? 'Active' : assignment.status}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-600 mb-1">
                              <span className="font-semibold">By:</span> {assignment.assignedByName || 'Teacher'}
                              <span className="text-gray-400">•</span>
                              <span>{assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            {assignment.comment && (
                              <p className="text-[10px] text-gray-600 italic mt-1">"{assignment.comment.substring(0, 60)}..."</p>
                            )}
                          </div>
                        </div>

                        {/* Classwork Section - Wrapped */}
                        {hasClasswork && (
                          <div className="mb-1.5 p-1.5 bg-soft-primary rounded border border-gray-200">
                            <button
                              onClick={() => setExpandedSections(prev => {
                                const current = prev[assignment.id];
                                const currentObj = isAssignmentSection(current) ? current : {};
                                return {
                                  ...prev,
                                  [assignment.id]: {
                                    ...currentObj,
                                    classwork: !currentObj.classwork
                                  }
                                };
                              })}
                              className="w-full flex items-center justify-between mb-1"
                            >
                              <h5 className="text-[10px] font-semibold text-primary uppercase">Classwork</h5>
                              <span className="text-[9px] text-gray-600">
                                {(() => {
                                  const section = expandedSections[assignment.id];
                                  return (isAssignmentSection(section) && section.classwork) ? '▼' : '▶';
                                })()}
                              </span>
                            </button>
                            {(() => {
                              const section = expandedSections[assignment.id];
                              return isAssignmentSection(section) && section.classwork;
                            })() && (
                            <div className="space-y-1">
                              {classwork.sabq.length > 0 && (
                                <div>
                                  <span className="text-[9px] font-semibold text-gray-600">Sabq:</span>
                                  <ul className="ml-2 mt-0.5 space-y-0.5">
                                    {classwork.sabq.slice(0, 2).map((phase: any, idx: number) => (
                                      <li key={idx} className="text-[10px] text-gray-700">
                                        • {phase.assignmentRange || phase.details || 'Sabq'}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {classwork.sabqi.length > 0 && (
                                <div>
                                  <span className="text-[9px] font-semibold text-gray-600">Sabqi:</span>
                                  <ul className="ml-2 mt-0.5 space-y-0.5">
                                    {classwork.sabqi.slice(0, 2).map((phase: any, idx: number) => (
                                      <li key={idx} className="text-[10px] text-gray-700">
                                        • {phase.assignmentRange || phase.details || 'Sabqi'}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {classwork.manzil.length > 0 && (
                                <div>
                                  <span className="text-[9px] font-semibold text-gray-600">Manzil:</span>
                                  <ul className="ml-2 mt-0.5 space-y-0.5">
                                    {classwork.manzil.slice(0, 2).map((phase: any, idx: number) => (
                                      <li key={idx} className="text-[10px] text-gray-700">
                                        • {phase.assignmentRange || phase.details || 'Manzil'}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                            )}
                          </div>
                        )}

                        {/* Homework Section - Wrapped */}
                        {hasHomework && (
                          <div className="mb-1.5 p-1.5 bg-soft-accent rounded border border-gray-200">
                            <button
                              onClick={() => setExpandedSections(prev => {
                                const current = prev[assignment.id];
                                const currentObj = isAssignmentSection(current) ? current : {};
                                return {
                                  ...prev,
                                  [assignment.id]: {
                                    ...currentObj,
                                    homework: !currentObj.homework
                                  }
                                };
                              })}
                              className="w-full flex items-center justify-between mb-1"
                            >
                              <h5 className="text-[10px] font-semibold text-primary uppercase">Homework</h5>
                              <span className="text-[9px] text-gray-600">
                                {(() => {
                                  const section = expandedSections[assignment.id];
                                  return (isAssignmentSection(section) && section.homework) ? '▼' : '▶';
                                })()}
                              </span>
                            </button>
                            {(() => {
                              const section = expandedSections[assignment.id];
                              return isAssignmentSection(section) && section.homework;
                            })() && (
                            <div className="text-[10px] text-gray-700">
                              {assignment.homework.content ? assignment.homework.content.substring(0, 80) + '...' : 'Homework assigned'}
                            </div>
                            )}
                          </div>
                        )}

                        {/* Mistakes Count - Compact */}
                        {assignment.mushafMistakes && assignment.mushafMistakes.length > 0 && (
                          <div className="text-[10px] text-gray-600">
                            <span className="font-semibold">Mistakes:</span> {assignment.mushafMistakes.length}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
            </Card>
          </div>
        </div>

        {/* Bottom Section - Quick Actions and Progress - Compact */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-2">
          {/* Quick Actions - Compact */}
          <Card title="Quick Actions">
            <div className="grid grid-cols-2 gap-1.5">
              {currentStudent?.assignedTeacher && (() => {
                const assignedTeacher = teachers.find(t => {
                  const tId = (t as any)._id || (t as any).teacherDocumentId || t.id;
                  const studentTeacherId = currentStudent.assignedTeacher;
                  return tId?.toString() === studentTeacherId?.toString();
                });
                
                if (assignedTeacher) {
                  return (
                    <button
                      onClick={() => {
                        setSelectedTeacherForMessage(assignedTeacher);
                        setShowTeacherStudentMessage(true);
                      }}
                      className="p-2 rounded border border-primary bg-primary text-white hover:bg-primary/90 transition text-center"
                    >
                      <div className="font-semibold text-xs mb-0.5">Message</div>
                      <div className="text-[9px] opacity-90">{assignedTeacher.fullName}</div>
                    </button>
                  );
                }
                return null;
              })()}
              <Link
                to="/student/assignments"
                className="p-2 rounded border border-gray-200 bg-white hover:border-primary hover:bg-soft-primary transition text-center"
              >
                <div className="font-semibold text-primary text-xs mb-0.5">Assignments</div>
                <div className="text-[9px] text-gray-600">View all</div>
              </Link>
              <Link
                to="/student/courses"
                className="p-2 rounded border border-gray-200 bg-white hover:border-primary hover:bg-soft-primary transition text-center"
              >
                <div className="font-semibold text-primary text-xs mb-0.5">Courses</div>
                <div className="text-[9px] text-gray-600">Info</div>
              </Link>
            </div>
          </Card>

          {/* Academic Progress - Compact */}
          <Card title="Progress">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1.5 text-[10px] uppercase">Assignments</h4>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-600">Done</span>
                    <span className="text-[10px] font-bold text-green-600">{completedAssignments.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-600">Pending</span>
                    <span className="text-[10px] font-bold text-yellow-600">{pendingAssignments.length}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1.5 text-[10px] uppercase">Performance</h4>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-600">Grade</span>
                    <span className="text-[10px] font-bold text-primary">{averageGrade}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-600">Graded</span>
                    <span className="text-[10px] font-bold text-gray-900">{gradedAssignments.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Personal Mushaf Modal */}
      {showPersonalMushaf && currentStudent && (
        <StudentPersonalMushaf 
          studentId={currentStudent.id} 
          onClose={() => setShowPersonalMushaf(false)} 
        />
      )}

      {/* Test Results Modal */}
      {showTestResults && !isAfterSchool && (
        <StudentTestResults
          onClose={() => setShowTestResults(false)}
        />
      )}

      {/* Teacher-Student Message Modal */}
      {showTeacherStudentMessage && currentStudent && selectedTeacherForMessage && (
        <TeacherStudentMessage
          teacher={selectedTeacherForMessage}
          student={currentStudent}
          onClose={() => {
            setShowTeacherStudentMessage(false);
            setSelectedTeacherForMessage(null);
          }}
        />
      )}

      {/* Weekly Evaluations Modal */}
      {showWeeklyEvaluations && currentStudent && (
        <StudentWeeklyEvaluationReview
          studentId={currentStudent.id}
          onClose={() => setShowWeeklyEvaluations(false)}
        />
      )}

      {/* Password Change Modal - Shows when passwordChangeRequired is true */}
      {showPasswordChangeModal && (
        <StudentPasswordChangeModal
          onClose={() => setShowPasswordChangeModal(false)}
          onPasswordChanged={() => {
            setShowPasswordChangeModal(false);
            // Update user in localStorage to clear the flag
            const savedUser = localStorage.getItem('umar_academy_user');
            if (savedUser) {
              const userData = JSON.parse(savedUser);
              userData.passwordChangeRequired = false;
              localStorage.setItem('umar_academy_user', JSON.stringify(userData));
            }
          }}
        />
      )}
      
      {isDevelopment && DebugPanel && (
        <Suspense fallback={null}>
          <DebugPanel />
        </Suspense>
      )}
    </div>
  );
};

export default StudentDashboard;
