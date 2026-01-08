import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import Card from './Card';

interface TeacherProfileProps {
  teacher: any;
  onClose: () => void;
  onEdit: (teacher: any) => void;
  onAssignments?: () => void;
  onPayroll?: () => void;
  onPerformance?: () => void;
  onAttendance?: () => void;
  onCommunication?: () => void;
}

const TeacherProfile: React.FC<TeacherProfileProps> = ({ 
  teacher, 
  onClose, 
  onEdit, 
  onAssignments, 
  onPayroll, 
  onPerformance, 
  onAttendance, 
  onCommunication 
}) => {
  const { students, updateTeacher, getStudentsByTeacher } = useData();
  const [activeTab, setActiveTab] = useState('overview');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Get teacher ID to display (prefer teacherId, then _id, then id)
  const displayTeacherId = (teacher as any).teacherId || (teacher as any)._id || teacher.id;
  
  // Get the correct teacher ID for querying students (try multiple ID formats)
  const teacherIdForQuery = React.useMemo(() => {
    // Priority 1: Teacher document _id (MongoDB Teacher document ID) - this is what's stored in assignedStudents
    if ((teacher as any)._id) return (teacher as any)._id.toString();
    // Priority 2: teacherDocumentId (same as _id)
    if ((teacher as any).teacherDocumentId) return (teacher as any).teacherDocumentId.toString();
    // Priority 3: teacherId field (not the same as _id, but might be used)
    if ((teacher as any).teacherId) return (teacher as any).teacherId.toString();
    // Priority 4: id (User ID - fallback, but getStudentsByTeacher will try to match by userId)
    if (teacher.id) return teacher.id.toString();
    return null;
  }, [teacher]);

  // Get assigned students using the proper function that handles multi-teacher assignment
  const assignedStudents = React.useMemo(() => {
    if (!teacherIdForQuery) {
      if (import.meta.env.DEV) {
        console.log('⚠️ TeacherProfile: No teacher ID found for query', teacher);
      }
      return [];
    }
    
    const result = getStudentsByTeacher(teacherIdForQuery);
    
    if (import.meta.env.DEV) {
      console.log('🔍 TeacherProfile: Getting students for teacher', {
        teacherIdForQuery,
        teacherName: teacher.fullName,
        teacherIds: {
          teacherId: (teacher as any).teacherId,
          _id: (teacher as any)._id,
          id: teacher.id
        },
        foundStudents: result.length,
        students: result.map(s => ({ id: s.id, name: s.fullName }))
      });
    }
    
    return result;
  }, [teacherIdForQuery, students, getStudentsByTeacher, teacher]);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
  };

  const resetPassword = () => {
    if (newPassword) {
      alert(`Password reset to: ${newPassword}`);
      setShowPasswordReset(false);
      setNewPassword('');
    }
  };

  const deactivateAccount = () => {
    if (window.confirm('Are you sure you want to deactivate this teacher account?')) {
      updateTeacher(teacher.id, { status: 'inactive' });
      onClose();
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800 border-green-300',
      inactive: 'bg-gray-100 text-gray-800 border-gray-300',
      'on-leave': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      probation: 'bg-soft-primary text-primary border-primary/30',
      suspended: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status as keyof typeof colors] || colors.inactive;
  };

  const getLocationFlag = (location: string) => {
    const flags = {
      'Local': '🇺🇸',
      'Overseas Pakistan': '🇵🇰',
      'UK': '🇬🇧',
      'Canada': '🇨🇦',
      'Australia': '🇦🇺'
    };
    return flags[location as keyof typeof flags] || '🌍';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'courses', label: 'Courses', icon: '📚' },
    { id: 'students', label: 'Students', icon: '👨‍🎓' },
    { id: 'performance', label: 'Performance', icon: '📈' },
    { id: 'payroll', label: 'Payroll', icon: '💰' },
    { id: 'documents', label: 'Documents', icon: '📄' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-2">
              <img 
                src={teacher.avatar} 
                alt={teacher.fullName} 
                className="h-10 w-10 rounded-full border-2 border-white" 
              />
              <div>
                <h2 className="text-lg font-bold">{teacher.fullName || 'Unknown Teacher'}</h2>
                <p className="text-primary-100 text-xs">Teacher ID: {displayTeacherId}</p>
                {teacher.email && (
                  <p className="text-primary-100 text-xs">Email: {teacher.email}</p>
                )}
                {teacher.department && (
                  <p className="text-primary-100 text-xs">Department: {teacher.department}</p>
                )}
                <div className="flex items-center space-x-2 mt-1 flex-wrap gap-1">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(teacher.status || 'active')}`}>
                    {teacher.status || 'active'}
                  </span>
                  <span className="text-xs text-primary-100">
                    {getLocationFlag(teacher.location || 'Local')} {teacher.location || 'Local'}
                  </span>
                  <span className="text-xs text-primary-100 font-semibold">
                    {assignedStudents.length} {assignedStudents.length === 1 ? 'student' : 'students'}
                  </span>
                  {teacher.employmentType && (
                    <span className="text-xs text-primary-100">
                      • {teacher.employmentType}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-1.5">
              <button
                onClick={() => onEdit(teacher)}
                className="px-3 py-1.5 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition text-xs font-semibold"
              >
                Edit Profile
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="flex space-x-1 px-3">
            <button
              onClick={() => onAssignments && onAssignments()}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-primary-600 hover:bg-white rounded-t-lg transition"
            >
              📚 Assignments
            </button>
            <button
              onClick={() => onPayroll && onPayroll()}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-primary-600 hover:bg-white rounded-t-lg transition"
            >
              💰 Payroll
            </button>
            <button
              onClick={() => onPerformance && onPerformance()}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-primary-600 hover:bg-white rounded-t-lg transition"
            >
              📈 Performance
            </button>
            <button
              onClick={() => onAttendance && onAttendance()}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-white rounded-t-lg transition"
            >
              🕒 Attendance
            </button>
            <button
              onClick={() => onCommunication && onCommunication()}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-white rounded-t-lg transition"
            >
              💬 Communication
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-3 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Personal Information */}
              <Card title="Personal Information">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-gray-500">Full Name</label>
                      <p className="text-gray-900 font-semibold text-xs">{teacher.fullName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-gray-900">{teacher.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-gray-900">{teacher.contact}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Department</label>
                      <p className="text-gray-900">{teacher.department}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Location</label>
                      <p className="text-gray-900">{getLocationFlag(teacher.location)} {teacher.location}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Employment Type</label>
                      <p className="text-gray-900">{teacher.employmentType}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Teaching Information */}
              <Card title="Teaching Information">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-gray-500">Assigned Students</label>
                      <p className="text-lg font-bold text-primary-600">{assignedStudents.length}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Performance Rating</label>
                      <p className="text-lg font-bold text-gold-600">4.8/5</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Classes This Week</label>
                      <p className="text-lg font-bold text-primary">12</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Attendance Rate</label>
                      <p className="text-lg font-bold text-primary">98%</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-1 text-sm">Teaching Schedule</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Monday - Friday</span>
                        <span className="font-medium">9:00 AM - 5:00 PM</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Saturday</span>
                        <span className="font-medium">9:00 AM - 1:00 PM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Financial Information */}
              <Card title="Financial Information">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Monthly Salary</label>
                      <p className="text-2xl font-bold text-primary-600">
                        {teacher.payroll?.currency === 'USD' ? '$' : 'Rs'}{(teacher.payroll?.monthlySalary || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Payment Status</label>
                      <p className="text-sm text-green-600 font-semibold">Current</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Payment History</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">October 2025</span>
                        <span className="font-medium text-primary">Paid</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">September 2025</span>
                        <span className="font-medium text-primary">Paid</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Quick Actions */}
              <Card title="Quick Actions">
                <div className="space-y-3">
                  <button
                    onClick={() => setShowPasswordReset(true)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">🔑</span>
                      <div>
                        <p className="font-medium text-gray-900">Reset Password</p>
                        <p className="text-sm text-gray-600">Generate new login credentials</p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={deactivateAccount}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-red-50 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">🚫</span>
                      <div>
                        <p className="font-medium text-gray-900">Deactivate Account</p>
                        <p className="text-sm text-gray-600">Temporarily disable teacher access</p>
                      </div>
                    </div>
                  </button>
                  
                  <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">📧</span>
                      <div>
                        <p className="font-medium text-gray-900">Send Message</p>
                        <p className="text-sm text-gray-600">Contact teacher directly</p>
                      </div>
                    </div>
                  </button>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'courses' && (
            <div className="space-y-6">
              <Card title="Assigned Courses">
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-cream-100 to-cream-200 p-4 rounded-lg border border-gold-300">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-gray-900">{teacher.department}</h4>
                        <p className="text-sm text-gray-600">Primary Subject</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-600">Students</span>
                        <div className="text-2xl font-bold text-primary-600">{assignedStudents.length}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h5 className="font-semibold text-gray-900 mb-2">Quran Recitation</h5>
                      <p className="text-sm text-gray-600 mb-2">Basic to Advanced levels</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Students: 8</span>
                        <button className="text-xs bg-primary text-white px-2 py-1 rounded">View Details</button>
                      </div>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h5 className="font-semibold text-gray-900 mb-2">Islamic Studies</h5>
                      <p className="text-sm text-gray-600 mb-2">Fundamentals and Advanced</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Students: 5</span>
                        <button className="text-xs bg-primary text-white px-2 py-1 rounded">View Details</button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-6">
              <Card title={`Assigned Students (${assignedStudents.length})`}>
                <div className="space-y-3">
                  {assignedStudents.length > 0 ? (
                    assignedStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={student.avatar} 
                            alt={student.fullName} 
                            className="h-10 w-10 rounded-full" 
                          />
                          <div>
                            <p className="font-medium text-gray-900">{student.fullName}</p>
                            <p className="text-sm text-gray-600">{student.program}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-gray-600">Progress</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                            <div className="bg-primary h-2 rounded-full" style={{ width: '75%' }}></div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No students assigned yet</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Overall Rating</p>
                    <p className="text-3xl font-bold text-gold-600">4.8/5</p>
                    <p className="text-xs text-gray-500 mt-1">Based on 24 reviews</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Attendance Rate</p>
                    <p className="text-3xl font-bold text-primary">98%</p>
                    <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Student Retention</p>
                    <p className="text-3xl font-bold text-primary">92%</p>
                    <p className="text-xs text-gray-500 mt-1">This semester</p>
                  </div>
                </Card>
              </div>

              <Card title="Recent Feedback">
                <div className="space-y-4">
                  {[
                    { student: 'Ahmad Ali', rating: 5, comment: 'Excellent teaching method, very patient and clear explanations.', date: 'Oct 20, 2025' },
                    { student: 'Fatima Hassan', rating: 5, comment: 'Great teacher, my child has improved significantly.', date: 'Oct 18, 2025' },
                    { student: 'Omar Khan', rating: 4, comment: 'Good teacher, sometimes rushes through material.', date: 'Oct 15, 2025' },
                  ].map((feedback, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900">{feedback.student}</span>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={`text-sm ${i < feedback.rating ? 'text-gold-500' : 'text-gray-300'}`}>⭐</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{feedback.comment}</p>
                      <p className="text-xs text-gray-500">{feedback.date}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'payroll' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Monthly Salary</p>
                    <p className="text-2xl font-bold text-primary-600">
                      {teacher.payroll?.currency === 'USD' ? '$' : 'Rs'}{(teacher.payroll?.monthlySalary || 0).toLocaleString()}
                    </p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                    <p className="text-2xl font-bold text-primary">Current</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Next Payment</p>
                    <p className="text-2xl font-bold text-primary">Nov 15</p>
                  </div>
                </Card>
              </div>

              <Card title="Payment History">
                <div className="space-y-2">
                  {[
                    { month: 'October 2025', amount: teacher.payroll?.monthlySalary || 0, status: 'Paid', date: 'Oct 15, 2025' },
                    { month: 'September 2025', amount: teacher.payroll?.monthlySalary || 0, status: 'Paid', date: 'Sep 15, 2025' },
                    { month: 'August 2025', amount: teacher.payroll?.monthlySalary || 0, status: 'Paid', date: 'Aug 15, 2025' },
                  ].map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{payment.month}</p>
                        <p className="text-sm text-gray-600">{payment.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {teacher.payroll?.currency === 'USD' ? '$' : 'Rs'}{payment.amount.toLocaleString()}
                        </p>
                        <span className="text-xs text-primary font-semibold">{payment.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <Card title="Uploaded Documents">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl">📄</span>
                        <div>
                          <h5 className="font-semibold text-gray-900">CV/Resume</h5>
                          <p className="text-sm text-gray-600">teacher_cv.pdf</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-xs bg-primary-600 text-white px-2 py-1 rounded">View</button>
                        <button className="text-xs border border-gray-300 text-gray-700 px-2 py-1 rounded">Download</button>
                      </div>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl">🎓</span>
                        <div>
                          <h5 className="font-semibold text-gray-900">Degree Certificate</h5>
                          <p className="text-sm text-gray-600">degree_certificate.pdf</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-xs bg-primary-600 text-white px-2 py-1 rounded">View</button>
                        <button className="text-xs border border-gray-300 text-gray-700 px-2 py-1 rounded">Download</button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition">
                      + Upload Document
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Password Reset Modal */}
      {showPasswordReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reset Password</h3>
            <p className="text-gray-600 mb-4">Generate a new password for {teacher.fullName}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Click Generate to create password"
                  />
                  <button
                    onClick={generatePassword}
                    className="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition"
                  >
                    Generate
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPasswordReset(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={resetPassword}
                  disabled={!newPassword}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherProfile;
