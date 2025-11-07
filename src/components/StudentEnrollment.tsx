import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from './Card';

interface StudentEnrollmentProps {
  student: any;
  onClose: () => void;
}

const StudentEnrollment: React.FC<StudentEnrollmentProps> = ({ student, onClose }) => {
  const { teachers, updateStudent } = useData();
  const [activeTab, setActiveTab] = useState('current');
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState(new Date().toISOString().split('T')[0]);

  const availableCourses = [
    { id: 'quran-basic', name: 'Quran Recitation - Basic', level: 'Beginner', duration: '6 months' },
    { id: 'quran-intermediate', name: 'Quran Recitation - Intermediate', level: 'Intermediate', duration: '8 months' },
    { id: 'quran-advanced', name: 'Quran Recitation - Advanced', level: 'Advanced', duration: '12 months' },
    { id: 'islamic-studies', name: 'Islamic Studies', level: 'All Levels', duration: '12 months' },
    { id: 'arabic-basic', name: 'Arabic Language - Basic', level: 'Beginner', duration: '6 months' },
    { id: 'tajweed', name: 'Tajweed Rules', level: 'Intermediate', duration: '4 months' },
    { id: 'hifz', name: 'Hifz Program', level: 'All Levels', duration: '24 months' },
  ];

  const currentEnrollments = [
    {
      id: 'enroll-1',
      course: availableCourses[0],
      teacher: teachers[0]?.fullName || 'Dr. Ibrahim Yusuf',
      startDate: '2025-01-15',
      endDate: '2025-07-15',
      progress: 75,
      status: 'active'
    },
    {
      id: 'enroll-2',
      course: availableCourses[3],
      teacher: teachers[1]?.fullName || 'Mr. Hassan Ali',
      startDate: '2025-02-01',
      endDate: '2026-02-01',
      progress: 45,
      status: 'active'
    }
  ];

  const pastEnrollments = [
    {
      id: 'enroll-past-1',
      course: availableCourses[4],
      teacher: 'Dr. Fatima Rahman',
      startDate: '2024-06-01',
      endDate: '2024-12-01',
      progress: 100,
      status: 'completed',
      grade: 'A+'
    }
  ];

  const pendingRequests = [
    {
      id: 'request-1',
      course: availableCourses[1],
      requestedDate: '2025-10-20',
      reason: 'Student ready for next level',
      status: 'pending'
    }
  ];

  const handleEnrollStudent = () => {
    if (selectedCourse && selectedTeacher) {
      const course = availableCourses.find(c => c.id === selectedCourse);
      const teacher = teachers.find(t => t.id === selectedTeacher);
      
      if (course && teacher) {
        const newEnrollment = {
          id: `enroll-${Date.now()}`,
          course,
          teacher: teacher.fullName,
          startDate: enrollmentDate,
          endDate: new Date(new Date(enrollmentDate).getTime() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months later
          progress: 0,
          status: 'active'
        };

        // In a real app, this would update the student's enrollments
        alert(`Student enrolled in ${course.name} with ${teacher.fullName}`);
        setShowEnrollForm(false);
        setSelectedCourse('');
        setSelectedTeacher('');
      }
    }
  };

  const handleApproveRequest = (requestId: string) => {
    // In a real app, this would approve the enrollment request
    alert('Enrollment request approved');
  };

  const handleDenyRequest = (requestId: string) => {
    // In a real app, this would deny the enrollment request
    alert('Enrollment request denied');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800 border-green-300',
      completed: 'bg-blue-100 text-blue-800 border-blue-300',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const tabs = [
    { id: 'current', label: 'Current Enrollments', count: currentEnrollments.length },
    { id: 'past', label: 'Past Enrollments', count: pastEnrollments.length },
    { id: 'requests', label: 'Pending Requests', count: pendingRequests.length }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Course Enrollment Management</h2>
              <p className="text-primary-100">{student.fullName} - {student.id}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowEnrollForm(true)}
                className="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition"
              >
                + Enroll in Course
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
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
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'current' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Current Enrollments</h3>
                <span className="text-sm text-gray-600">{currentEnrollments.length} active courses</span>
              </div>

              {currentEnrollments.map((enrollment) => (
                <Card key={enrollment.id}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                          <span className="text-primary-600 font-bold">📚</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{enrollment.course.name}</h4>
                          <p className="text-sm text-gray-600">Level: {enrollment.course.level} • Duration: {enrollment.course.duration}</p>
                          <p className="text-sm text-gray-600">Teacher: {enrollment.teacher}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">Start Date</label>
                          <p className="text-sm text-gray-900">{new Date(enrollment.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">End Date</label>
                          <p className="text-sm text-gray-900">{new Date(enrollment.endDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(enrollment.status)}`}>
                            {enrollment.status}
                          </span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-700">Progress</label>
                          <span className="text-sm font-semibold text-primary-600">{enrollment.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${enrollment.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                        View Details
                      </button>
                      <button className="px-3 py-1 bg-gold-500 text-white text-sm rounded hover:bg-gold-600 transition">
                        Update Progress
                      </button>
                      <button className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition">
                        Remove
                      </button>
                    </div>
                  </div>
                </Card>
              ))}

              {currentEnrollments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No current enrollments</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'past' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Past Enrollments</h3>
                <span className="text-sm text-gray-600">{pastEnrollments.length} completed courses</span>
              </div>

              {pastEnrollments.map((enrollment) => (
                <Card key={enrollment.id}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-gray-600 font-bold">✅</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{enrollment.course.name}</h4>
                          <p className="text-sm text-gray-600">Level: {enrollment.course.level} • Duration: {enrollment.course.duration}</p>
                          <p className="text-sm text-gray-600">Teacher: {enrollment.teacher}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">Start Date</label>
                          <p className="text-sm text-gray-900">{new Date(enrollment.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">End Date</label>
                          <p className="text-sm text-gray-900">{new Date(enrollment.endDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">Final Grade</label>
                          <span className="text-lg font-bold text-green-600">{enrollment.grade}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(enrollment.status)}`}>
                          {enrollment.status}
                        </span>
                        <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                          View Certificate
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {pastEnrollments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No past enrollments</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Pending Enrollment Requests</h3>
                <span className="text-sm text-gray-600">{pendingRequests.length} requests pending</span>
              </div>

              {pendingRequests.map((request) => (
                <Card key={request.id}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <span className="text-yellow-600 font-bold">⏳</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{request.course.name}</h4>
                          <p className="text-sm text-gray-600">Level: {request.course.level} • Duration: {request.course.duration}</p>
                          <p className="text-sm text-gray-600">Requested: {new Date(request.requestedDate).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="text-xs font-medium text-gray-500 uppercase">Reason for Request</label>
                        <p className="text-sm text-gray-700 mt-1">{request.reason}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApproveRequest(request.id)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleDenyRequest(request.id)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                          >
                            Deny
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {pendingRequests.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No pending enrollment requests</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enrollment Form Modal */}
      {showEnrollForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Enroll Student in Course</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Choose a course...</option>
                  {availableCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name} ({course.level}) - {course.duration}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign Teacher</label>
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Choose a teacher...</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName} ({teacher.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Enrollment Date</label>
                <input
                  type="date"
                  value={enrollmentDate}
                  onChange={(e) => setEnrollmentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowEnrollForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnrollStudent}
                  disabled={!selectedCourse || !selectedTeacher}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enroll Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentEnrollment;














