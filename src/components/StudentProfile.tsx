import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';

interface StudentProfileProps {
  student: any;
  onClose: () => void;
  onEdit: (student: any) => void;
  onEnrollment?: () => void;
  onPayments?: () => void;
  onProgress?: () => void;
  onCommunication?: () => void;
}

const StudentProfile: React.FC<StudentProfileProps> = ({ 
  student, 
  onClose, 
  onEdit, 
  onEnrollment, 
  onPayments, 
  onProgress, 
  onCommunication 
}) => {
  const { teachers, updateStudent } = useData();
  const [activeTab, setActiveTab] = useState('overview');

  const assignedTeacher = teachers.find(t => t.id === student.assignedTeacher);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'courses', label: 'Courses', icon: '📚' },
    { id: 'schedule', label: 'Schedule', icon: '📅' },
    { id: 'attendance', label: 'Attendance', icon: '✅' },
    { id: 'progress', label: 'Progress', icon: '📈' },
    { id: 'assignments', label: 'Assignments', icon: '📝' },
    { id: 'payments', label: 'Payments', icon: '💰' },
    { id: 'notes', label: 'Notes', icon: '📄' },
    { id: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' }
  ];

  // Mock data for comprehensive display
  const mockSchedule = [
    { day: 'Monday', time: '9:00 AM - 11:00 AM', subject: 'Quran Recitation', teacher: 'Ustadh Ahmad', room: 'Room 101' },
    { day: 'Tuesday', time: '9:00 AM - 11:00 AM', subject: 'Tajweed', teacher: 'Ustadh Fatima', room: 'Room 102' },
    { day: 'Wednesday', time: '9:00 AM - 11:00 AM', subject: 'Islamic Studies', teacher: 'Ustadh Ibrahim', room: 'Room 103' },
    { day: 'Thursday', time: '9:00 AM - 11:00 AM', subject: 'Arabic Language', teacher: 'Ustadh Ahmad', room: 'Room 101' },
    { day: 'Friday', time: '9:00 AM - 11:00 AM', subject: 'Memorization', teacher: 'Ustadh Fatima', room: 'Room 102' }
  ];

  const mockAttendance = [
    { date: '2024-01-15', status: 'Present', time: '9:05 AM', notes: 'On time' },
    { date: '2024-01-16', status: 'Present', time: '9:02 AM', notes: 'On time' },
    { date: '2024-01-17', status: 'Late', time: '9:15 AM', notes: 'Traffic delay' },
    { date: '2024-01-18', status: 'Present', time: '9:00 AM', notes: 'On time' },
    { date: '2024-01-19', status: 'Absent', time: '-', notes: 'Sick leave' }
  ];

  const mockAssignments = [
    { id: 1, title: 'Surah Al-Fatiha Memorization', subject: 'Quran Recitation', dueDate: '2024-02-15', status: 'Completed', grade: 95 },
    { id: 2, title: 'Tajweed Rules Quiz', subject: 'Tajweed', dueDate: '2024-02-10', status: 'Completed', grade: 88 },
    { id: 3, title: 'Islamic History Essay', subject: 'Islamic Studies', dueDate: '2024-02-20', status: 'Pending', grade: null },
    { id: 4, title: 'Arabic Vocabulary Test', subject: 'Arabic Language', dueDate: '2024-02-12', status: 'Completed', grade: 92 }
  ];

  const mockPayments = [
    { id: 1, amount: 150, date: '2024-01-15', status: 'Paid', method: 'Bank Transfer', reference: 'TXN001' },
    { id: 2, amount: 150, date: '2024-02-15', status: 'Paid', method: 'Cash', reference: 'CASH001' },
    { id: 3, amount: 150, date: '2024-03-15', status: 'Pending', method: 'Bank Transfer', reference: 'TXN002' },
    { id: 4, amount: 150, date: '2024-04-15', status: 'Overdue', method: 'Bank Transfer', reference: 'TXN003' }
  ];

  const mockNotes = [
    { id: 1, date: '2024-01-20', author: 'Ustadh Ahmad', content: 'Excellent progress in Quran recitation. Keep up the good work!', type: 'Positive' },
    { id: 2, date: '2024-01-25', author: 'Ustadh Fatima', content: 'Needs to focus more on Tajweed rules. Practice daily.', type: 'Improvement' },
    { id: 3, date: '2024-02-01', author: 'Ustadh Ibrahim', content: 'Great improvement in Islamic Studies. Very attentive in class.', type: 'Positive' }
  ];

  const mockProgress = {
    overall: 85,
    subjects: [
      { name: 'Quran Recitation', progress: 90, grade: 'A+' },
      { name: 'Tajweed', progress: 85, grade: 'A' },
      { name: 'Islamic Studies', progress: 88, grade: 'A' },
      { name: 'Arabic Language', progress: 82, grade: 'B+' },
      { name: 'Memorization', progress: 90, grade: 'A+' }
    ]
  };

  console.log('🔍 StudentProfile component rendering with student:', student);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Modern Header */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <img 
                    src={student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fullName)}&background=random&color=fff`} 
                    alt={student.fullName}
                    className="h-24 w-24 rounded-full border-4 border-white shadow-lg"
                  />
                  <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white ${
                    student.status === 'active' ? 'bg-green-500' : 
                    student.status === 'inactive' ? 'bg-gray-500' : 'bg-yellow-500'
                  }`}></div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">{student.fullName}</h1>
                  <p className="text-blue-100 text-lg mb-1">{student.email}</p>
                  <p className="text-blue-200 text-sm">Student ID: {student.id}</p>
                  <div className="flex items-center space-x-4 mt-3">
                    <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium">
                      {student.program || 'No Program Assigned'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      student.status === 'active' ? 'bg-green-500 bg-opacity-20 text-green-100' :
                      student.status === 'inactive' ? 'bg-gray-500 bg-opacity-20 text-gray-100' :
                      'bg-yellow-500 bg-opacity-20 text-yellow-100'
                    }`}>
                      {student.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    console.log('🔍 Edit button clicked for student:', student);
                    onEdit(student);
                  }}
                  className="px-6 py-3 bg-white bg-opacity-20 backdrop-blur-sm text-white rounded-xl hover:bg-opacity-30 transition-all duration-200 border border-white border-opacity-30"
                >
                  ✏️ Edit Profile
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-red-500 bg-opacity-90 text-white rounded-xl hover:bg-opacity-100 transition-all duration-200"
                >
                  ✕ Close
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Navigation Tabs */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div className="flex space-x-2 px-8 py-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-white hover:shadow-md'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                    <div className="flex items-center">
                      <div className="p-3 bg-blue-500 rounded-lg">
                        <span className="text-white text-xl">📚</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600">Courses</p>
                        <p className="text-2xl font-bold text-blue-900">{student.courses?.length || 5}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                    <div className="flex items-center">
                      <div className="p-3 bg-green-500 rounded-lg">
                        <span className="text-white text-xl">📈</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-green-600">Progress</p>
                        <p className="text-2xl font-bold text-green-900">{mockProgress.overall}%</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
                    <div className="flex items-center">
                      <div className="p-3 bg-purple-500 rounded-lg">
                        <span className="text-white text-xl">💰</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-purple-600">Payments</p>
                        <p className="text-2xl font-bold text-purple-900">$600</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
                    <div className="flex items-center">
                      <div className="p-3 bg-orange-500 rounded-lg">
                        <span className="text-white text-xl">⭐</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-orange-600">Grade</p>
                        <p className="text-2xl font-bold text-orange-900">A+</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <span className="mr-3">👤</span>
                      Personal Information
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Full Name</label>
                          <p className="text-gray-900 font-semibold">{student.fullName}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          <p className="text-gray-900">{student.email}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Phone</label>
                          <p className="text-gray-900">{student.contact || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Address</label>
                          <p className="text-gray-900">{student.address || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <span className="mr-3">🎓</span>
                      Academic Information
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Program</label>
                          <p className="text-gray-900 font-semibold">{student.program || 'Not assigned'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Level</label>
                          <p className="text-gray-900">{student.level || 'Not set'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Assigned Teacher</label>
                          <p className="text-gray-900">{assignedTeacher?.fullName || 'Not assigned'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Enrollment Date</label>
                          <p className="text-gray-900">{student.enrolledDate ? new Date(student.enrolledDate).toLocaleDateString() : 'Not set'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Courses Tab */}
            {activeTab === 'courses' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">Courses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mockProgress.subjects.map((subject, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-bold text-gray-900">{subject.name}</h4>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          {subject.grade}
                        </span>
                      </div>
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Progress</span>
                          <span>{subject.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${subject.progress}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Instructor: {assignedTeacher?.fullName || 'Not assigned'}</p>
                        <p>Status: Active</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">Weekly Schedule</h3>
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Day</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Time</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Subject</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Teacher</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Room</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {mockSchedule.map((schedule, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{schedule.day}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{schedule.time}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{schedule.subject}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{schedule.teacher}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{schedule.room}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Attendance Tab */}
            {activeTab === 'attendance' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold text-gray-900">Attendance Record</h3>
                  <div className="flex space-x-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">80%</p>
                      <p className="text-sm text-gray-600">Attendance Rate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">4</p>
                      <p className="text-sm text-gray-600">Present</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">1</p>
                      <p className="text-sm text-gray-600">Absent</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Date</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Status</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Time</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {mockAttendance.map((record, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {new Date(record.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                record.status === 'Present' ? 'bg-green-100 text-green-800' :
                                record.status === 'Late' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{record.time}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{record.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Tab */}
            {activeTab === 'progress' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">Academic Progress</h3>
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-lg font-medium text-gray-900">Overall Progress</span>
                      <span className="text-2xl font-bold text-blue-600">{mockProgress.overall}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className="bg-blue-600 h-4 rounded-full transition-all duration-300" 
                        style={{ width: `${mockProgress.overall}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {mockProgress.subjects.map((subject, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-900">{subject.name}</span>
                          <span className="text-sm font-medium text-gray-600">{subject.grade}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${subject.progress}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 mt-1">
                          <span>Progress</span>
                          <span>{subject.progress}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Assignments Tab */}
            {activeTab === 'assignments' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">Assignments</h3>
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Title</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Subject</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Due Date</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Status</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {mockAssignments.map((assignment) => (
                          <tr key={assignment.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{assignment.title}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{assignment.subject}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {new Date(assignment.dueDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                assignment.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                assignment.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {assignment.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {assignment.grade ? `${assignment.grade}%` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold text-gray-900">Payment History</h3>
                  <div className="flex space-x-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">$300</p>
                      <p className="text-sm text-gray-600">Paid</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">$150</p>
                      <p className="text-sm text-gray-600">Pending</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">$150</p>
                      <p className="text-sm text-gray-600">Overdue</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Date</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Amount</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Status</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Method</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {mockPayments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {new Date(payment.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">${payment.amount}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                payment.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                payment.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {payment.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{payment.method}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{payment.reference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">Notes & Comments</h3>
                <div className="space-y-4">
                  {mockNotes.map((note) => (
                    <div key={note.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-semibold text-gray-900">{note.author}</h4>
                          <p className="text-sm text-gray-600">{new Date(note.date).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          note.type === 'Positive' ? 'bg-green-100 text-green-800' :
                          note.type === 'Improvement' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {note.type}
                        </span>
                      </div>
                      <p className="text-gray-700">{note.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Family Tab */}
            {activeTab === 'family' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">Family Information</h3>
                {student.siblings && student.siblings.length > 0 ? (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Siblings in Academy ({student.siblings.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {student.siblings.map((sibling: any, index: number) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center space-x-3">
                            <img 
                              src={sibling.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(sibling.fullName)}&background=random&color=fff`}
                              alt={sibling.fullName}
                              className="h-12 w-12 rounded-full"
                            />
                            <div>
                              <p className="font-semibold text-gray-900">{sibling.fullName}</p>
                              <p className="text-sm text-gray-600">{sibling.program}</p>
                              <p className="text-sm text-gray-500">ID: {sibling.id}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                    <div className="text-center py-12">
                      <p className="text-gray-500 text-lg">No family members in the academy.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;