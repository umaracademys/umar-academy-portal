import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../../components/Header';
import StatCard from '../../../components/StatCard';
import Card from '../../../components/Card';
import DebugPanel from '../../../components/DebugPanel';
import { useData } from '../../../contexts/DataContext';
import { useBackendData } from '../../../contexts/BackendDataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Assignment } from '../../../types/index';

const StudentDashboard: React.FC = () => {
  console.log('🚀 StudentDashboard component is rendering!');
  
  // Test if the component renders at all
  console.log('🔍 StudentDashboard - Component is starting to render');
  
  const { students, getStudentByEmail, updateStudent } = useData();
  const { assignments: backendAssignments, addAssignmentSubmission } = useBackendData();
  const { user } = useAuth();
  
  console.log('🔍 StudentDashboard - Hooks called successfully');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);

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

  // Get student's assignments from backend
  const studentAssignments = useMemo(() => {
    if (!currentStudent?.id) return [];
    
    return backendAssignments
      .filter((assignment: any) => {
        const assignedTo = Array.isArray(assignment.assignedTo) ? assignment.assignedTo : [assignment.assignedTo];
        return assignedTo.includes(currentStudent.id) || assignedTo.includes(currentStudent.id.toString());
      })
      .map((assignment: any) => {
        // Map backend assignment to dashboard format
        const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : new Date();
        const isOverdue = dueDate < new Date() && assignment.status !== 'completed';
        
        // Check if student has submitted
        const submission = assignment.submissions?.find((s: any) => 
          s.studentId === currentStudent.id || s.studentId === currentStudent.id.toString()
        );
        
        let status = assignment.status || 'pending';
        if (submission) {
          status = submission.status === 'graded' ? 'completed' : submission.status || 'submitted';
        } else if (isOverdue) {
          status = 'overdue';
        }

        // Ensure we always have _id - it's critical for API calls
        const assignmentId = assignment._id || assignment.id;
        
        return {
          id: assignmentId,
          _id: assignmentId, // Always preserve MongoDB _id for API calls
          title: assignment.title || `${assignment.classworkType || assignment.type} Assignment`,
          description: assignment.description || '',
          course: assignment.program || 'General',
          instructor: assignment.listenerName || assignment.assignedBy?.name || 'Teacher',
          dueDate: dueDate.toISOString().split('T')[0],
          status: status,
          grade: submission?.grade || null,
          maxPoints: 100,
          type: assignment.type === 'homework' ? 'homework' : assignment.classworkType || 'classwork',
          studentId: currentStudent.id,
          homeworkComments: assignment.homeworkComments,
          homeworkLink: assignment.homeworkLink,
          createdAt: assignment.createdAt,
          // Store reference to original for debugging
          originalAssignment: assignment
        };
      })
      .sort((a: any, b: any) => {
        // Sort by due date, with overdue first
        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);
        return dateA.getTime() - dateB.getTime();
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
      
      await addAssignmentSubmission(assignmentId, submission);
      
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
          <StatCard title="Total Assignments" value={studentAssignments.length} icon="📝" color="blue" />
          <StatCard title="Completed" value={completedAssignments.length} icon="✅" color="green" />
          <StatCard title="Average Grade" value={`${averageGrade}%`} icon="⭐" color="gold" />
          <StatCard title="Pending" value={pendingAssignments.length} icon="⏳" color="purple" />
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
          <Card title={`📝 Recent Assignments (${studentAssignments.length})`}>
            {studentAssignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No assignments yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {studentAssignments.slice(0, 5).map((assignment) => (
                  <div key={assignment.id} className="bg-gradient-to-r from-cream-100 to-cream-200 p-4 rounded-lg border border-gold-300">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900">{assignment.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{assignment.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>📅 Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                          <span>📚 {assignment.course}</span>
                          <span>👨‍🏫 {assignment.instructor}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                          assignment.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                          assignment.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {assignment.status}
                        </span>
                        {assignment.grade && (
                          <p className="text-sm font-bold text-primary-600 mt-1">
                            Grade: {assignment.grade}%
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div className="bg-white p-3 rounded">
                        <p className="text-xs text-gray-600">Max Points</p>
                        <p className="text-sm font-medium">{assignment.maxPoints}</p>
                      </div>
                      <div className="bg-white p-3 rounded">
                        <p className="text-xs text-gray-600">Type</p>
                        <p className="text-sm font-medium">{assignment.type}</p>
                      </div>
                      <div className="bg-white p-3 rounded">
                        <p className="text-xs text-gray-600">Status</p>
                        <p className="text-sm font-medium text-green-600 font-semibold">{assignment.status}</p>
                      </div>
                    </div>

                    {(assignment as any).attachments && (assignment as any).attachments.length > 0 && (
                      <div className="mb-3 bg-white p-3 rounded">
                        <p className="text-xs text-gray-600 mb-2">Attachments:</p>
                        <div className="flex flex-wrap gap-2">
                          {(assignment as any).attachments.map((file, index) => (
                            <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              📎 {file.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gold-200">
                      {assignment.status === 'pending' && (
                        <button
                          onClick={() => {
                            // Store the assignment with guaranteed _id
                            // The id field should already be the _id from backend
                            const assignmentWithId = {
                              ...assignment,
                              id: (assignment as any)._id || assignment.id,
                              _id: (assignment as any)._id || assignment.id
                            };
                            
                            console.log('🎯 Selecting assignment:', {
                              originalAssignment: assignment,
                              assignmentWithId,
                              id: assignmentWithId.id,
                              _id: assignmentWithId._id
                            });
                            
                            // Validate we have an ID before setting
                            if (!assignmentWithId.id && !assignmentWithId._id) {
                              console.error('❌ No ID found in assignment!', assignment);
                              alert('Error: Assignment ID not found. Please refresh the page.');
                              return;
                            }
                            
                            setSelectedAssignment(assignmentWithId as any);
                            setShowSubmissionForm(true);
                          }}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                        >
                          📤 Submit Assignment
                        </button>
                      )}
                      <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
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

      {/* Assignment Submission Form Modal */}
      {showSubmissionForm && selectedAssignment && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999 
          }}
          onClick={() => setShowSubmissionForm(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 pb-4 border-b-2" style={{ borderBottomColor: '#2E4D32' }}>
              <h3 className="text-2xl font-bold" style={{ color: '#2E4D32' }}>Submit Assignment</h3>
              <p className="text-sm text-gray-600 mt-1">{selectedAssignment.title}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Submission Content</label>
                <textarea
                  value={submissionData.content}
                  onChange={(e) => setSubmissionData({ ...submissionData, content: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 transition resize-none"
                  rows={6}
                  placeholder="Write your assignment submission here..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Attachments (Optional)</label>
                <input
                  type="file"
                  multiple
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 transition"
                />
                <p className="text-xs text-gray-500 mt-1">You can upload multiple files</p>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowSubmissionForm(false)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAssignment}
                  className="px-6 py-3 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                  style={{ backgroundColor: '#2E4D32' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#253d28'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2E4D32'}
                >
                  Submit Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <DebugPanel />
    </div>
  );
};

export default StudentDashboard;
