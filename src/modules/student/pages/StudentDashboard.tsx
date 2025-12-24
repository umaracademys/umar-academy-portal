import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../../components/Header';
import StatCard from '../../../components/StatCard';
import Card from '../../../components/Card';
// DebugPanel only in development
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
const DebugPanel = isDevelopment ? lazy(() => import('../../../components/DebugPanel')) : null;
import StudentRecordings from '../../../components/StudentRecordings';
import StudentPersonalMushaf from '../../../components/StudentPersonalMushaf';
import StudentTestResults from '../../../components/StudentTestResults';
import TeacherStudentMessage from '../../../components/TeacherStudentMessage';
import { useData } from '../../../contexts/DataContext';
import { useBackendData } from '../../../contexts/BackendDataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Assignment } from '../../../types/index';
import { getStudentPdfHomework } from '../../../services/pdfApi';

const StudentDashboard: React.FC = () => {
  const { students, getStudentByEmail, updateStudent, teachers } = useData();
  const { assignments: backendAssignments, getPairStudents, getPairDailyReports } = useBackendData();
  const { user } = useAuth();
  
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [showRecordings, setShowRecordings] = useState(false);
  const [showPersonalMushaf, setShowPersonalMushaf] = useState(false);
  const [showTestResults, setShowTestResults] = useState(false);
  const [showTeacherStudentMessage, setShowTeacherStudentMessage] = useState(false);
  const [selectedTeacherForMessage, setSelectedTeacherForMessage] = useState<any>(null);
  const [pairInfo, setPairInfo] = useState<any>(null);
  const [pairDailyReports, setPairDailyReports] = useState<any[]>([]);
  const [pdfHomework, setPdfHomework] = useState<any[]>([]);
  const [loadingPdfHomework, setLoadingPdfHomework] = useState(false);
  const navigate = useNavigate();

  const currentStudent = getStudentByEmail(user?.email || '') || students[0];

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

  // Load PDF homework assignments
  useEffect(() => {
    const loadPdfHomework = async () => {
      if (!currentStudent?.id) return;
      try {
        setLoadingPdfHomework(true);
        const studentId = currentStudent.id || (currentStudent as any)?._id;
        if (studentId) {
          const homeworkList = await getStudentPdfHomework(studentId.toString());
          setPdfHomework(homeworkList || []);
        }
      } catch (error) {
        console.error('Error loading PDF homework:', error);
        setPdfHomework([]);
      } finally {
        setLoadingPdfHomework(false);
      }
    };
    
    loadPdfHomework();
  }, [currentStudent]);

  const studentAssignments = useMemo(() => {
    if (!currentStudent?.id) return [];
    
    return backendAssignments
      .filter((assignment: any) => {
        const assignmentStudentId = assignment.studentId || assignment._id?.studentId;
        const matches = assignmentStudentId === currentStudent.id || 
                       assignmentStudentId === currentStudent.id.toString() ||
                       String(assignmentStudentId) === String(currentStudent.id);
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
        
        // Check for Qaidah homework
        const isQaidahHomework = assignment.homework?.qaidahHomework;
        if (isQaidahHomework) {
          const bookName = isQaidahHomework.book === 'qaidah1' ? 'Qaidah 1' : 'Qaidah 2';
          title = `${bookName} - Page ${isQaidahHomework.page}`;
        } else if (classworkCount > 0) {
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
        
        if (assignment.homework?.enabled && !isQaidahHomework) {
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
          homework: assignment.homework || { enabled: false, content: '', link: '' },
          qaidahHomework: assignment.homework?.qaidahHomework || null,
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
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4">
        {/* Header Section */}
        <div className="mb-4 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50 px-3 py-4 shadow-lg">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Student Portal</span>
              <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
              <p className="text-xs text-gray-600 max-w-2xl">
                Track your assignments, monitor progress, and access your academic resources.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/student/assignments"
                className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[rgba(var(--color-accent-rgb),0.9)] shadow-md hover:shadow-lg"
              >
                View All Assignments
              </Link>
              <button
                onClick={() => setShowRecordings(true)}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[rgba(var(--color-primary-rgb),0.9)] shadow-md hover:shadow-lg"
              >
                My Recordings
              </button>
              <button
                onClick={() => setShowPersonalMushaf(true)}
                className="inline-flex items-center justify-center rounded-lg border-2 border-primary px-4 py-2 text-xs font-bold text-primary transition-all hover:bg-soft-primary shadow-sm"
              >
                Personal Mushaf
              </button>
              <button
                onClick={() => setShowTestResults(true)}
                className="inline-flex items-center justify-center rounded-lg border-2 border-primary px-4 py-2 text-xs font-bold text-primary transition-all hover:bg-soft-primary shadow-sm"
              >
                Test Results
              </button>
              <Link
                to="/student/profile"
                className="inline-flex items-center justify-center rounded-lg border-2 border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 transition-all hover:bg-gray-50 shadow-sm"
              >
                My Profile
              </Link>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard title="Total Assignments" value={studentAssignments.length} icon="TA" />
          <StatCard title="Completed" value={completedAssignments.length} icon="CP" />
          <StatCard title="Average Grade" value={`${averageGrade}%`} icon="AG" />
          <StatCard title="Pending" value={pendingAssignments.length} icon="PD" />
        </div>

        {/* Teacher Pair Information */}
        {pairInfo && pairInfo.pair && (
          <div className="mb-4">
            <Card title="My Teacher Pair">
              <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-primary mb-2">
                      {pairInfo.pair.name || 'Teacher Pair'}
                    </h3>
                    <p className="text-sm text-gray-700 mb-3">
                      Program: <span className="font-semibold">{pairInfo.pair.program || 'N/A'}</span>
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-600">Teachers:</span>
                        <span className="text-sm font-semibold text-primary">
                          {pairInfo.pair.teacher1?.fullName || 'Teacher 1'}
                          {pairInfo.pair.teacher2?.fullName && ` & ${pairInfo.pair.teacher2.fullName}`}
                        </span>
                      </div>
                      {pairInfo.schedule && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-600">Schedule:</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {pairInfo.schedule.startTime} - {pairInfo.schedule.endTime}
                          </span>
                        </div>
                      )}
                      {pairInfo.schedule?.days && pairInfo.schedule.days.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-600">Days:</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {pairInfo.schedule.days.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`px-4 py-2 rounded-lg text-sm font-bold ${
                      pairInfo.pair.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {pairInfo.pair.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Recent Daily Reports */}
              {pairDailyReports.length > 0 && (
                <div className="mt-6 border-t-2 border-gray-200 pt-4">
                  <h4 className="font-bold text-sm text-primary mb-3">Recent Daily Reports</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pairDailyReports.slice(0, 5).map((report: any) => (
                      <div key={report._id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-gray-600">
                            {new Date(report.date).toLocaleDateString()}
                          </span>
                          <span className="text-xs font-semibold text-primary">
                            {report.teacher?.fullName || 'Teacher'}
                          </span>
                        </div>
                        {(report.sabq || report.sabqi || report.manzil) && (
                          <div className="text-xs text-gray-700 space-y-1">
                            {report.sabq && <div><span className="font-semibold">Sabq:</span> {report.sabq.substring(0, 50)}...</div>}
                            {report.sabqi && <div><span className="font-semibold">Sabqi:</span> {report.sabqi.substring(0, 50)}...</div>}
                            {report.manzil && <div><span className="font-semibold">Manzil:</span> {report.manzil.substring(0, 50)}...</div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}


        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <Link
            to="/student/assignments"
            className="block rounded-xl border-2 border-primary/20 bg-gradient-to-br from-soft-primary to-white p-6 hover:border-primary hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary text-2xl">
                📝
              </div>
              <div>
                <h3 className="font-bold text-lg text-primary mb-1">My Assignments</h3>
                <p className="text-xs text-gray-600">View all your assignments and classwork</p>
              </div>
            </div>
          </Link>
          <button
            onClick={() => setShowPersonalMushaf(true)}
            className="block w-full text-left rounded-xl border-2 border-primary/20 bg-gradient-to-br from-soft-primary to-white p-6 hover:border-primary hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary text-2xl">
                📖
              </div>
              <div>
                <h3 className="font-bold text-lg text-primary mb-1">Personal Mushaf</h3>
                <p className="text-xs text-gray-600">View your personal mistake history</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => navigate('/student/pdf-homework')}
            className="block w-full text-left rounded-xl border-2 border-primary/20 bg-gradient-to-br from-soft-primary to-white p-6 hover:border-primary hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary text-2xl">
                📄
              </div>
              <div>
                <h3 className="font-bold text-lg text-primary mb-1">PDF Homework</h3>
                <p className="text-xs text-gray-600">
                  {loadingPdfHomework 
                    ? 'Loading...' 
                    : pdfHomework.length > 0 
                      ? `${pdfHomework.length} assignment${pdfHomework.length > 1 ? 's' : ''} assigned`
                      : 'View PDF homework assignments'}
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Profile Information - Takes 1 column */}
          <div className="lg:col-span-1">
            <Card title="Profile Information">
              <div className="text-center mb-4">
                <img
                  src={currentStudent.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentStudent.fullName)}&background=1F3224&color=fff`}
                  alt={currentStudent.fullName}
                  className="h-20 w-20 rounded-full border-4 border-gray-200 mx-auto mb-4 shadow-md"
                />
                <h3 className="text-sm font-bold text-primary mb-1">{currentStudent.fullName}</h3>
                <span className="inline-block px-2 py-1 rounded-lg bg-soft-primary text-primary text-[10px] font-bold">
                  {currentStudent.status}
                </span>
              </div>
              <div className="space-y-3 border-t-2 border-gray-200 pt-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Program</p>
                  <p className="text-sm font-semibold text-gray-900">{currentStudent.program}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Student ID</p>
                  <p className="text-sm font-semibold text-gray-900">{currentStudent.id}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Enrolled</p>
                  <p className="text-sm font-semibold text-gray-900">{currentStudent.enrolledDate || 'N/A'}</p>
                </div>
                {currentStudent.schedule && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Schedule</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {currentStudent.schedule?.days?.join(', ') || 'Not set'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {currentStudent.schedule?.startTime || 'N/A'} - {currentStudent.schedule?.endTime || 'N/A'}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Recent Assignments - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card title={`Recent Assignments (${studentAssignments.length}${pdfHomework.length > 0 ? ` + ${pdfHomework.length} PDF` : ''})`}>
              {studentAssignments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-400">AS</span>
                  </div>
                  <p className="text-sm font-semibold">No assignments yet</p>
                  <p className="text-xs mt-1">Your teacher will assign work soon.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {studentAssignments.slice(0, 5).map((assignment: any) => {
                    const classwork = assignment.classwork || { sabq: [], sabqi: [], manzil: [] };
                    const hasClasswork = classwork.sabq.length > 0 || classwork.sabqi.length > 0 || classwork.manzil.length > 0;
                    const hasHomework = assignment.homework?.enabled;
                    
                    return (
                      <div key={assignment.id} className="bg-white rounded-xl border-2 border-gray-200 p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h4 className="text-sm font-bold text-primary">{assignment.title}</h4>
                              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                assignment.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {assignment.status === 'active' ? 'Active' : assignment.status}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-2">
                              <span className="font-semibold">Assigned by:</span> {assignment.assignedByName || 'Teacher'}
                              <span className="text-gray-400">•</span>
                              <span>{assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            {assignment.comment && (
                              <p className="text-sm text-gray-600 italic mt-2">"{assignment.comment}"</p>
                            )}
                          </div>
                        </div>

                        {/* Classwork Section */}
                        {hasClasswork && (
                          <div className="mb-4 p-4 bg-soft-primary rounded-lg border border-gray-200">
                            <h5 className="text-sm font-bold text-primary mb-3 uppercase tracking-wide">Classwork</h5>
                            <div className="space-y-2">
                              {classwork.sabq.length > 0 && (
                                <div>
                                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Sabq:</span>
                                  <ul className="ml-4 mt-1 space-y-1">
                                    {classwork.sabq.map((phase: any, idx: number) => (
                                      <li key={idx} className="text-sm text-gray-700">
                                        • {phase.assignmentRange || phase.details || 'Sabq recitation'}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {classwork.sabqi.length > 0 && (
                                <div>
                                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Sabqi:</span>
                                  <ul className="ml-4 mt-1 space-y-1">
                                    {classwork.sabqi.map((phase: any, idx: number) => (
                                      <li key={idx} className="text-sm text-gray-700">
                                        • {phase.assignmentRange || phase.details || 'Sabqi recitation'}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {classwork.manzil.length > 0 && (
                                <div>
                                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Manzil:</span>
                                  <ul className="ml-4 mt-1 space-y-1">
                                    {classwork.manzil.map((phase: any, idx: number) => (
                                      <li key={idx} className="text-sm text-gray-700">
                                        • {phase.assignmentRange || phase.details || 'Manzil recitation'}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Qaidah Homework Section */}
                        {assignment.qaidahHomework && (
                          <div className="mb-4 p-4 bg-gradient-to-br from-accent/10 to-accent/5 rounded-lg border-2 border-accent/30">
                            <h5 className="text-sm font-bold text-primary mb-3 uppercase tracking-wide flex items-center gap-2">
                              <span>📚</span>
                              <span>Qaidah Homework</span>
                            </h5>
                            
                            {/* Page Preview */}
                            <div className="mb-4">
                              <div className="bg-white rounded-lg border border-gray-300 p-2 mb-2">
                                <img
                                  src={`/${assignment.qaidahHomework.book}/${assignment.qaidahHomework.page}.jpg`}
                                  alt={`Page ${assignment.qaidahHomework.page}`}
                                  className="w-full h-auto rounded shadow-sm"
                                  onError={(e) => {
                                    // Try PNG if JPG fails
                                    (e.target as HTMLImageElement).src = `/${assignment.qaidahHomework.book}/${assignment.qaidahHomework.page}.png`;
                                  }}
                                />
                              </div>
                              <p className="text-xs text-gray-600 text-center">
                                {assignment.qaidahHomework.book === 'qaidah1' ? 'Qaidah 1' : 'Qaidah 2'} - Page {assignment.qaidahHomework.page}
                                {assignment.qaidahHomework.teachingDate && (
                                  <span className="ml-2">
                                    • Taught on {new Date(assignment.qaidahHomework.teachingDate).toLocaleDateString()}
                                  </span>
                                )}
                              </p>
                            </div>

                            {/* Learning Objectives */}
                            {(assignment.qaidahHomework.letters?.length > 0 || 
                              assignment.qaidahHomework.rules?.length > 0 || 
                              assignment.qaidahHomework.learningObjectives) && (
                              <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                                <h6 className="text-xs font-bold text-primary mb-2 uppercase">Learning Objectives</h6>
                                
                                {assignment.qaidahHomework.letters?.length > 0 && (
                                  <div className="mb-2">
                                    <span className="text-xs font-semibold text-gray-600">Letters:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {assignment.qaidahHomework.letters.map((letter: string, idx: number) => (
                                        <span key={idx} className="px-2 py-0.5 bg-accent/20 text-primary-800 rounded-full text-sm font-medium">
                                          {letter}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {assignment.qaidahHomework.rules?.length > 0 && (
                                  <div className="mb-2">
                                    <span className="text-xs font-semibold text-gray-600">Rules:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {assignment.qaidahHomework.rules.map((rule: string, idx: number) => (
                                        <span key={idx} className="px-2 py-0.5 bg-primary/20 text-primary-800 rounded text-xs font-medium">
                                          {rule}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {assignment.qaidahHomework.learningObjectives && (
                                  <div className="mt-2">
                                    <p className="text-xs text-gray-700">{assignment.qaidahHomework.learningObjectives}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Links */}
                            {assignment.qaidahHomework.links?.length > 0 && (
                              <div className="mb-3">
                                <h6 className="text-xs font-bold text-primary mb-2 uppercase">Resources</h6>
                                <div className="space-y-1">
                                  {assignment.qaidahHomework.links.map((link: any, idx: number) => (
                                    <a
                                      key={idx}
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-primary/5 hover:border-primary transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm">🔗</span>
                                        <span className="text-xs text-primary hover:underline font-medium truncate">
                                          {link.url}
                                        </span>
                                      </div>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* View Full Page Button */}
                            <button
                              onClick={() => {
                                const book = assignment.qaidahHomework.book;
                                const page = assignment.qaidahHomework.page;
                                navigate(`/qaidah/${page}?book=${book}&student=${currentStudent.id}&assignment=${assignment.id}`);
                              }}
                              className="w-full px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all font-semibold text-sm shadow-md"
                            >
                              📄 View Full Page with Marks
                            </button>
                          </div>
                        )}

                        {/* Regular Homework Section */}
                        {hasHomework && !assignment.qaidahHomework && (
                          <div className="mb-4 p-4 bg-soft-accent rounded-lg border border-gray-200">
                            <h5 className="text-sm font-bold text-primary mb-2 uppercase tracking-wide">Homework</h5>
                            {assignment.homework.content && (
                              <p className="text-sm text-gray-700 mb-2">{assignment.homework.content}</p>
                            )}
                            {assignment.homework.link && (
                              <a 
                                href={assignment.homework.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline font-semibold"
                              >
                                {assignment.homework.link}
                              </a>
                            )}
                          </div>
                        )}

                        {/* Mistakes Count */}
                        {assignment.mushafMistakes && assignment.mushafMistakes.length > 0 && (
                          <div className="mb-3 text-sm text-gray-600">
                            <span className="font-bold">Mistakes marked:</span> {assignment.mushafMistakes.length}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* PDF Homework Section */}
              {pdfHomework.length > 0 && (
                <div className="mt-6 border-t-2 border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-sm text-primary">PDF Homework Assignments</h4>
                    <button
                      onClick={() => navigate('/student/pdf-homework')}
                      className="text-xs text-primary hover:underline font-semibold"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="space-y-3">
                    {pdfHomework.slice(0, 3).map((item: any) => (
                      <div
                        key={item.assignmentId}
                        onClick={() => navigate('/student/pdf-homework')}
                        className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm hover:shadow-md hover:border-primary transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">📄</span>
                              <h5 className="text-sm font-bold text-primary">{item.pdf?.title || 'PDF Assignment'}</h5>
                            </div>
                            <p className="text-xs text-gray-600 mb-1">
                              Assigned by {item.assignedByName || 'Teacher'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(item.assignedAt).toLocaleDateString()}
                            </p>
                            {item.annotations?.notes && (
                              <p className="text-xs text-gray-600 mt-2 italic line-clamp-2">
                                "{item.annotations.notes.substring(0, 80)}..."
                              </p>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            item.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {item.status || 'Active'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {pdfHomework.length > 3 && (
                      <button
                        onClick={() => navigate('/student/pdf-homework')}
                        className="w-full text-center py-2 text-sm text-primary hover:underline font-semibold"
                      >
                        View {pdfHomework.length - 3} more PDF assignment{pdfHomework.length - 3 > 1 ? 's' : ''} →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Bottom Section - Quick Actions and Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Quick Actions */}
          <Card title="Quick Actions">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className="p-4 rounded-xl border-2 border-primary bg-primary text-white hover:bg-primary/90 transition-all shadow-sm text-center"
                    >
                      <div className="font-bold mb-1">💬 Message Teacher</div>
                      <div className="text-xs opacity-90">{assignedTeacher.fullName}</div>
                    </button>
                  );
                }
                return null;
              })()}
              <Link
                to="/student/profile"
                className="p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-primary hover:bg-soft-primary transition-all shadow-sm text-center"
              >
                <div className="font-bold text-primary mb-1">View Full Profile</div>
                <div className="text-xs text-gray-600">Complete profile details</div>
              </Link>
              
              <Link
                to="/student/assignments"
                className="p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-primary hover:bg-soft-primary transition-all shadow-sm text-center"
              >
                <div className="font-bold text-primary mb-1">My Assignments</div>
                <div className="text-xs text-gray-600">View all assignments</div>
              </Link>
              
              <button
                onClick={() => navigate('/student/pdf-homework')}
                className="p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-primary hover:bg-soft-primary transition-all shadow-sm text-center"
              >
                <div className="font-bold text-primary mb-1">PDF Homework</div>
                <div className="text-xs text-gray-600">
                  {pdfHomework.length > 0 ? `${pdfHomework.length} assignment${pdfHomework.length > 1 ? 's' : ''}` : 'View PDF homework'}
                </div>
              </button>
              
              <Link
                to="/student/courses"
                className="p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-primary hover:bg-soft-primary transition-all shadow-sm text-center"
              >
                <div className="font-bold text-primary mb-1">My Courses</div>
                <div className="text-xs text-gray-600">Course information</div>
              </Link>
            </div>
          </Card>

          {/* Academic Progress */}
          <Card title="Academic Progress">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <h4 className="font-bold text-gray-900 mb-4 uppercase tracking-wide text-sm">Assignment Progress</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completed</span>
                    <span className="text-sm font-bold text-green-600">{completedAssignments.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending</span>
                    <span className="text-sm font-bold text-yellow-600">{pendingAssignments.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Overdue</span>
                    <span className="text-sm font-bold text-red-600">{overdueAssignments.length}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-4 uppercase tracking-wide text-sm">Performance</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Grade</span>
                    <span className="text-sm font-bold text-primary">{averageGrade}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Graded Assignments</span>
                    <span className="text-sm font-bold text-gray-900">{gradedAssignments.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Enrollment Date</span>
                    <span className="text-sm font-bold text-gray-900">
                      {new Date(currentStudent.enrolledDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card title="Quick Actions">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    className="p-4 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition flex items-center gap-2"
                  >
                    <span className="text-2xl">💬</span>
                    <div className="text-left">
                      <div className="text-sm font-semibold">Message Teacher</div>
                      <div className="text-xs opacity-90">{assignedTeacher.fullName}</div>
                    </div>
                  </button>
                );
              }
              return null;
            })()}
            <Link
              to="/student/assignments"
              className="p-4 bg-accent text-white rounded-lg font-bold hover:bg-accent/90 transition flex items-center gap-2"
            >
              <span className="text-2xl">📝</span>
              <div className="text-left">
                <div className="text-sm font-semibold">View Assignments</div>
                <div className="text-xs opacity-90">{studentAssignments.length} total</div>
              </div>
            </Link>
            <button
              onClick={() => setShowPersonalMushaf(true)}
              className="p-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition flex items-center gap-2"
            >
              <span className="text-2xl">📖</span>
              <div className="text-left">
                <div className="text-sm font-semibold">Personal Mushaf</div>
                <div className="text-xs opacity-90">View mistakes</div>
              </div>
            </button>
          </div>
        </Card>

        {/* Payment Information */}
        <Card title="Payment Information">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Monthly Tuition</p>
              <p className="text-lg font-bold text-primary">${currentStudent.tuitionFee}</p>
              <p className="text-xs text-gray-500 mt-1">per month</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Total Paid</p>
              <p className="text-lg font-bold text-green-600">${totalPaid}</p>
              <p className="text-xs text-gray-500 mt-1">this semester</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Payment Status</p>
              <p className="text-lg font-bold text-green-600">Current</p>
              <p className="text-xs text-gray-500 mt-1">No payments yet</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recordings Modal */}
      {showRecordings && (
        <StudentRecordings
          onClose={() => setShowRecordings(false)}
        />
      )}

      {/* Personal Mushaf Modal */}
      {showPersonalMushaf && currentStudent && (
        <StudentPersonalMushaf 
          studentId={currentStudent.id} 
          onClose={() => setShowPersonalMushaf(false)} 
        />
      )}

      {/* Test Results Modal */}
      {showTestResults && (
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
      
      {isDevelopment && DebugPanel && (
        <Suspense fallback={null}>
          <DebugPanel />
        </Suspense>
      )}
    </div>
  );
};

export default StudentDashboard;
