import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../../components/Header';
import StatCard from '../../../components/StatCard';
import Card from '../../../components/Card';
import DebugPanel from '../../../components/DebugPanel';
import StudentRecordings from '../../../components/StudentRecordings';
import StudentPersonalMushaf from '../../../components/StudentPersonalMushaf';
import StudentTestResults from '../../../components/StudentTestResults';
import { useData } from '../../../contexts/DataContext';
import { useBackendData } from '../../../contexts/BackendDataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Assignment } from '../../../types/index';

const StudentDashboard: React.FC = () => {
  const { students, getStudentByEmail, updateStudent } = useData();
  const { assignments: backendAssignments } = useBackendData();
  const { user } = useAuth();
  
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [showRecordings, setShowRecordings] = useState(false);
  const [showPersonalMushaf, setShowPersonalMushaf] = useState(false);
  const [showTestResults, setShowTestResults] = useState(false);

  const currentStudent = getStudentByEmail(user?.email || '') || students[0];

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
        
        if (assignment.homework?.enabled) {
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
            <Card title={`Recent Assignments (${studentAssignments.length})`}>
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

                        {/* Homework Section */}
                        {hasHomework && (
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
            </Card>
          </div>
        </div>

        {/* Bottom Section - Quick Actions and Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Quick Actions */}
          <Card title="Quick Actions">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              
              <Link
                to="/student/courses"
                className="p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-primary hover:bg-soft-primary transition-all shadow-sm text-center"
              >
                <div className="font-bold text-primary mb-1">My Courses</div>
                <div className="text-xs text-gray-600">Course information</div>
              </Link>
              
              <div className="p-4 rounded-xl border-2 border-gray-200 bg-gray-50 text-center">
                <div className="font-bold text-gray-400 mb-1">Progress</div>
                <div className="text-xs text-gray-500">Coming Soon</div>
              </div>
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
      
      <DebugPanel />
    </div>
  );
};

export default StudentDashboard;
