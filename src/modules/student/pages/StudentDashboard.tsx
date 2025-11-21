import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../../components/Header';
import StatCard from '../../../components/StatCard';
import Card from '../../../components/Card';
import DebugPanel from '../../../components/DebugPanel';
import StudentRecordings from '../../../components/StudentRecordings';
import StudentPersonalMushaf from '../../../components/StudentPersonalMushaf';
import { useData } from '../../../contexts/DataContext';
import { useBackendData } from '../../../contexts/BackendDataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Assignment } from '../../../types/index';

const StudentDashboard: React.FC = () => {
  console.log('🚀 StudentDashboard component is rendering!');
  
  // Test if the component renders at all
  console.log('🔍 StudentDashboard - Component is starting to render');
  
  const { students, getStudentByEmail, updateStudent } = useData();
  const { assignments: backendAssignments } = useBackendData();
  const { user } = useAuth();
  
  console.log('🔍 StudentDashboard - Hooks called successfully');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [showRecordings, setShowRecordings] = useState(false);
  const [showPersonalMushaf, setShowPersonalMushaf] = useState(false);

  // Debug logging
  console.log('StudentDashboard - user:', user);
  console.log('StudentDashboard - students:', students);
  console.log('StudentDashboard - user email:', user?.email);
  console.log('StudentDashboard - students length:', students.length);
  console.log('StudentDashboard - backendAssignments:', backendAssignments.length);

  // Get current student info
  const currentStudent = getStudentByEmail(user?.email || '') || students[0];
  
  console.log('StudentDashboard - currentStudent:', currentStudent);
  console.log('StudentDashboard - getStudentByEmail result:', getStudentByEmail(user?.email || ''));

  // Get student's assignments from backend (new multi-phase assignment system)
  const studentAssignments = useMemo(() => {
    if (!currentStudent?.id) return [];
    
    console.log('📋 Filtering assignments for student:', currentStudent.id);
    console.log('📋 Total assignments in backend:', backendAssignments.length);
    
    return backendAssignments
      .filter((assignment: any) => {
        // New assignment structure uses studentId directly
        const assignmentStudentId = assignment.studentId || assignment._id?.studentId;
        const matches = assignmentStudentId === currentStudent.id || 
                       assignmentStudentId === currentStudent.id.toString() ||
                       String(assignmentStudentId) === String(currentStudent.id);
        
        if (matches) {
          console.log('✅ Found assignment for student:', {
            assignmentId: assignment._id || assignment.id,
            studentId: assignment.studentId,
            status: assignment.status
          });
        }
        
        return matches;
      })
      .map((assignment: any) => {
        // Map new assignment structure to dashboard format
        const assignmentId = assignment._id || assignment.id;
        const createdAt = assignment.createdAt ? new Date(assignment.createdAt) : new Date();
        
        // Build title from classwork sections
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
          dueDate: createdAt.toISOString().split('T')[0], // Use created date as reference
          status: status === 'completed' ? 'completed' : status === 'archived' ? 'archived' : 'active',
          grade: null,
          maxPoints: 100,
          type: 'classwork',
          studentId: currentStudent.id,
          createdAt: createdAt,
          // Store full assignment data
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
        // Sort by creation date, newest first
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [backendAssignments, currentStudent]);

  const completedAssignments = studentAssignments.filter((a: any) => a.status === 'completed' || a.status === 'graded');
  const pendingAssignments = studentAssignments.filter((a: any) => a.status === 'pending' || a.status === 'submitted');
  const overdueAssignments = studentAssignments.filter((a: any) => a.status === 'overdue');

  // Calculate average grade
  const gradedAssignments = studentAssignments.filter((a: any) => a.grade !== null && a.grade !== undefined);
  const averageGrade = gradedAssignments.length > 0 
    ? Math.round(gradedAssignments.reduce((sum: number, a: any) => sum + (a.grade || 0), 0) / gradedAssignments.length)
    : 0;

  // Payment data - keeping minimal for now as it's not in backend yet
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

    // Debug: Check what we have
    console.log('🔍 Selected Assignment:', selectedAssignment);
    console.log('🔍 Assignment ID:', (selectedAssignment as any).id);
    console.log('🔍 Assignment _id:', (selectedAssignment as any)._id);

    try {
      // Format submission data for backend
      const submission = {
        studentId: currentStudent.id.toString(),
        content: submissionData.content,
        link: '', // No link field in current form
        attachments: submissionData.attachments.map((url: string) => ({
          type: 'link',
          content: url,
          title: 'Attachment'
        }))
      };

      // Get the assignment ID - use _id first (MongoDB format), then fallback to id
      const assignmentId = (selectedAssignment as any)._id || selectedAssignment.id;
      
      console.log('🔍 Final Assignment ID:', assignmentId);
      console.log('🔍 Selected Assignment Full Object:', selectedAssignment);
      
      if (!assignmentId || assignmentId === 'undefined' || assignmentId === undefined) {
        console.error('❌ Assignment ID is invalid!', {
          selectedAssignment,
          _id: (selectedAssignment as any)._id,
          id: selectedAssignment.id,
          allBackendAssignments: backendAssignments.map((a: any) => ({
            _id: a._id,
            id: a.id,
            title: a.title
          }))
        });
        throw new Error('Assignment ID is missing. Please refresh the page and try again.');
      }
      
      console.log('✅ Submitting assignment with ID:', assignmentId);
      
      // Submit homework using the API directly
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
      
      // Success - close form and reset
      setShowSubmissionForm(false);
      setSubmissionData({ content: '', attachments: [] });
      setSelectedAssignment(null);
      
      // Show success message
      alert('Assignment submitted successfully!');
      
      // Refresh the page to show updated assignment status
      window.location.reload();
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert(`Failed to submit assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Test if we can render at all
  console.log('🔍 StudentDashboard - About to check currentStudent');
  
  if (!currentStudent) {
    console.log('🔍 StudentDashboard - No currentStudent found, showing fallback');
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Student Profile Not Found</h1>
            <p className="text-gray-600 mb-4">We couldn't find your student profile.</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
              <h3 className="font-semibold text-yellow-800 mb-2">Debug Information:</h3>
              <p className="text-sm text-yellow-700">User: {user ? user.name : 'Not logged in'}</p>
              <p className="text-sm text-yellow-700">Email: {user?.email || 'No email'}</p>
              <p className="text-sm text-yellow-700">Students in system: {students.length}</p>
              <p className="text-sm text-yellow-700">Available students: {students.map(s => s.email).join(', ')}</p>
            </div>
            <div className="mt-4">
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  console.log('🔍 StudentDashboard - currentStudent found, rendering main dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
            <p className="text-gray-600 mt-2">Track your assignments, progress, and academic performance.</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/student/assignments"
              className="px-6 py-3 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
              style={{ backgroundColor: '#E7AA39' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d99a2f'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E7AA39'}
            >
              View All Assignments
            </Link>
            <button
              onClick={() => setShowRecordings(true)}
              className="px-6 py-3 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
              style={{ backgroundColor: '#9333EA' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7e22ce'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9333EA'}
            >
              🎙️ My Recordings
            </button>
            <button
              onClick={() => setShowPersonalMushaf(true)}
              className="px-6 py-3 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
              style={{ backgroundColor: '#2E4D32' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e3321'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2E4D32'}
            >
              📖 My Personal Mushaf
            </button>
            <Link
              to="/student/profile"
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
          <StatCard title="Total Assignments" value={studentAssignments.length} icon="TA" />
          <StatCard title="Completed" value={completedAssignments.length} icon="CP" />
          <StatCard title="Average Grade" value={`${averageGrade}%`} icon="AG" />
          <StatCard title="Pending" value={pendingAssignments.length} icon="PD" />
        </div>

        {/* Student Profile Information */}
        <div className="mb-8">
          <Card title={`👨‍🎓 My Profile Information`}>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-100 p-6 rounded-lg">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Photo and Basic Info */}
                <div className="lg:col-span-1">
                  <div className="text-center">
                    <img
                      src={currentStudent.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentStudent.fullName)}&background=random&color=fff`}
                      alt={currentStudent.fullName}
                      className="h-24 w-24 rounded-full border-4 border-white mx-auto mb-4 shadow-lg"
                    />
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{currentStudent.fullName}</h3>
                    <span className="bg-blue-600 text-white text-sm px-4 py-2 rounded-full font-semibold">
                      {currentStudent.status}
                    </span>
                  </div>
                </div>

                {/* Detailed Information */}
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                        📚 Academic Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Program:</span> {currentStudent.program}</p>
                        <p><span className="font-medium">Student ID:</span> {currentStudent.id}</p>
                        <p><span className="font-medium">Enrolled:</span> {currentStudent.enrolledDate || 'N/A'}</p>
                        <p><span className="font-medium">Teacher:</span> {currentStudent.assignedTeacher || 'Not assigned'}</p>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                        📞 Contact Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Email:</span> {currentStudent.email}</p>
                        <p><span className="font-medium">Phone:</span> {currentStudent.contact || 'Not provided'}</p>
                        <p><span className="font-medium">Address:</span> {(currentStudent as any).address || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  {currentStudent.siblings && currentStudent.siblings.length > 0 && (
                    <div className="mt-4 bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                        👨‍👩‍👧‍👦 Family Information
                      </h4>
                      <div className="text-sm">
                        <p><span className="font-medium">Siblings:</span> {currentStudent.siblings.length} sibling(s) in the academy</p>
                        <div className="mt-2">
                          {currentStudent.siblings.map((sibling, index) => (
                            <span key={index} className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-2 mb-1">
                              {sibling.fullName} ({sibling.program})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Schedule Information */}
                  {currentStudent.schedule && (
                    <div className="mt-4 bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                        📅 Schedule
                      </h4>
                      <div className="text-sm">
                        <p><span className="font-medium">Days:</span> {currentStudent.schedule?.days?.join(', ') || 'Not set'}</p>
                        <p><span className="font-medium">Time:</span> {currentStudent.schedule?.startTime || 'Not set'} - {currentStudent.schedule?.endTime || 'Not set'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Card title="🚀 Quick Actions">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/student/profile"
                className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg text-center hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg"
              >
                <div className="text-2xl mb-2">👤</div>
                <h3 className="font-semibold">View Full Profile</h3>
                <p className="text-sm opacity-90">Complete profile details</p>
              </Link>
              
              <Link
                to="/student/assignments"
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg text-center hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                <div className="text-2xl mb-2">📝</div>
                <h3 className="font-semibold">My Assignments</h3>
                <p className="text-sm opacity-90">View all assignments</p>
              </Link>
              
              <Link
                to="/student/courses"
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg text-center hover:from-purple-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                <div className="text-2xl mb-2">📚</div>
                <h3 className="font-semibold">My Courses</h3>
                <p className="text-sm opacity-90">Course information</p>
              </Link>
              
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg text-center">
                <div className="text-2xl mb-2">📊</div>
                <h3 className="font-semibold">Progress</h3>
                <p className="text-sm opacity-90">Coming Soon</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Assignments */}
        <div className="mb-8">
          <Card title={`📝 My Assignments (${studentAssignments.length})`}>
            {studentAssignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No assignments yet. Your teacher will assign work soon.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {studentAssignments.slice(0, 10).map((assignment: any) => {
                  const classwork = assignment.classwork || { sabq: [], sabqi: [], manzil: [] };
                  const hasClasswork = classwork.sabq.length > 0 || classwork.sabqi.length > 0 || classwork.manzil.length > 0;
                  const hasHomework = assignment.homework?.enabled;
                  
                  return (
                    <div key={assignment.id} className="bg-white rounded-2xl border-2 border-accent-soft p-4 sm:p-6 shadow-sm hover:shadow-md transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h4 className="text-lg sm:text-xl font-bold text-primary">{assignment.title}</h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                              assignment.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {assignment.status === 'active' ? 'Active' : assignment.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-primary-soft mb-2">
                            <span>👨‍🏫 Assigned by: {assignment.assignedByName || 'Teacher'}</span>
                            <span>📅 {assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString() : 'N/A'}</span>
                          </div>
                          {assignment.comment && (
                            <p className="text-sm text-primary-soft italic mt-2">"{assignment.comment}"</p>
                          )}
                        </div>
                      </div>

                      {/* Classwork Section */}
                      {hasClasswork && (
                        <div className="mb-4 p-3 sm:p-4 bg-soft-primary rounded-xl border border-primary-soft">
                          <h5 className="text-sm font-semibold text-primary mb-3">📚 Classwork</h5>
                          <div className="space-y-2">
                            {/* Sabq */}
                            {classwork.sabq.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-primary-soft">Sabq:</span>
                                <ul className="ml-4 mt-1 space-y-1">
                                  {classwork.sabq.map((phase: any, idx: number) => (
                                    <li key={idx} className="text-sm text-primary">
                                      • {phase.assignmentRange || phase.details || 'Sabq recitation'}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Sabqi */}
                            {classwork.sabqi.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-primary-soft">Sabqi:</span>
                                <ul className="ml-4 mt-1 space-y-1">
                                  {classwork.sabqi.map((phase: any, idx: number) => (
                                    <li key={idx} className="text-sm text-primary">
                                      • {phase.assignmentRange || phase.details || 'Sabqi recitation'}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Manzil */}
                            {classwork.manzil.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-primary-soft">Manzil:</span>
                                <ul className="ml-4 mt-1 space-y-1">
                                  {classwork.manzil.map((phase: any, idx: number) => (
                                    <li key={idx} className="text-sm text-primary">
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
                        <div className="mb-4 p-3 sm:p-4 bg-soft-accent rounded-xl border border-accent-soft">
                          <h5 className="text-sm font-semibold text-primary mb-2">📝 Homework</h5>
                          {assignment.homework.content && (
                            <p className="text-sm text-primary mb-2">{assignment.homework.content}</p>
                          )}
                          {assignment.homework.link && (
                            <a 
                              href={assignment.homework.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                            >
                              🔗 {assignment.homework.link}
                            </a>
                          )}
                        </div>
                      )}

                      {/* Mistakes Count */}
                      {assignment.mushafMistakes && assignment.mushafMistakes.length > 0 && (
                        <div className="mb-3 text-sm text-primary-soft">
                          <span className="font-medium">Mistakes marked:</span> {assignment.mushafMistakes.length}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Payment Information */}
        <div className="mb-8">
          <Card title="💳 Payment Information">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-cream-100 p-4 rounded-lg border border-gold-200">
                <p className="text-sm text-gray-600">Monthly Tuition</p>
                <p className="text-2xl font-bold text-primary-600">${currentStudent.tuitionFee}</p>
                <p className="text-xs text-gray-500">per month</p>
              </div>
              <div className="bg-cream-100 p-4 rounded-lg border border-gold-200">
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">${totalPaid}</p>
                <p className="text-xs text-gray-500">this semester</p>
              </div>
              <div className="bg-cream-100 p-4 rounded-lg border border-gold-200">
                <p className="text-sm text-gray-600">Payment Status</p>
                <p className="text-2xl font-bold text-green-600">
                  Current
                </p>
                <p className="text-xs text-gray-500">
                  No payments yet
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Academic Progress */}
        <Card title="📈 Academic Progress">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Assignment Progress</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="text-sm font-medium text-green-600">{completedAssignments.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="text-sm font-medium text-yellow-600">{pendingAssignments.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Overdue</span>
                  <span className="text-sm font-medium text-red-600">{overdueAssignments.length}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Performance</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Average Grade</span>
                  <span className="text-sm font-medium text-primary-600">{averageGrade}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Graded Assignments</span>
                  <span className="text-sm font-medium text-gray-900">{gradedAssignments.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Enrollment Date</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(currentStudent.enrolledDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Legacy submission modal intentionally removed until self-submissions are reintroduced */}
      
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
      
      <DebugPanel />
    </div>
  );
};

export default StudentDashboard;
