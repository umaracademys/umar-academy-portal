import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from './Card';

interface TeacherAssignmentsProps {
  teacher: any;
  onClose: () => void;
}

const TeacherAssignments: React.FC<TeacherAssignmentsProps> = ({ teacher, onClose }) => {
  const { students, updateTeacher } = useData();
  const [activeTab, setActiveTab] = useState('current');
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const availableCourses = [
    { id: 'quran-basic', name: 'Quran Recitation - Basic', level: 'Beginner', maxStudents: 15 },
    { id: 'quran-intermediate', name: 'Quran Recitation - Intermediate', level: 'Intermediate', maxStudents: 12 },
    { id: 'quran-advanced', name: 'Quran Recitation - Advanced', level: 'Advanced', maxStudents: 10 },
    { id: 'islamic-studies', name: 'Islamic Studies', level: 'All Levels', maxStudents: 20 },
    { id: 'arabic-basic', name: 'Arabic Language - Basic', level: 'Beginner', maxStudents: 15 },
    { id: 'tajweed', name: 'Tajweed Rules', level: 'Intermediate', maxStudents: 12 },
    { id: 'hifz', name: 'Hifz Program', level: 'All Levels', maxStudents: 8 },
  ];

  const currentAssignments = [
    {
      id: 'assign-1',
      course: availableCourses[0],
      students: students.slice(0, 8),
      startDate: '2025-01-15',
      endDate: '2025-07-15',
      schedule: 'Mon, Wed, Fri - 9:00 AM - 10:00 AM',
      status: 'active'
    },
    {
      id: 'assign-2',
      course: availableCourses[3],
      students: students.slice(0, 5),
      startDate: '2025-02-01',
      endDate: '2026-02-01',
      schedule: 'Tue, Thu - 11:00 AM - 12:00 PM',
      status: 'active'
    }
  ];

  const pastAssignments = [
    {
      id: 'assign-past-1',
      course: availableCourses[4],
      students: students.slice(0, 3),
      startDate: '2024-06-01',
      endDate: '2024-12-01',
      schedule: 'Mon, Wed - 2:00 PM - 3:00 PM',
      status: 'completed',
      completionRate: 100
    }
  ];

  const handleAssignCourse = () => {
    if (selectedCourse && selectedStudents.length > 0) {
      const course = availableCourses.find(c => c.id === selectedCourse);
      
      if (course) {
        const newAssignment = {
          id: `assign-${Date.now()}`,
          course,
          students: students.filter(s => selectedStudents.includes(s.id)),
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(new Date().getTime() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          schedule: 'TBD',
          status: 'active'
        };

        alert(`Teacher assigned to ${course.name} with ${selectedStudents.length} students`);
        setShowAssignForm(false);
        setSelectedCourse('');
        setSelectedStudents([]);
      }
    }
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
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
    { id: 'current', label: 'Current Assignments', count: currentAssignments.length },
    { id: 'past', label: 'Past Assignments', count: pastAssignments.length },
    { id: 'schedule', label: 'Schedule', count: 0 }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Course Assignments</h2>
              <p className="text-primary-100">{teacher.fullName} - {teacher.id}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAssignForm(true)}
                className="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition"
              >
                + Assign Course
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
                <h3 className="text-lg font-semibold text-gray-900">Current Assignments</h3>
                <span className="text-sm text-gray-600">{currentAssignments.length} active courses</span>
              </div>

              {currentAssignments.map((assignment) => (
                <Card key={assignment.id}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                          <span className="text-primary-600 font-bold">📚</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{assignment.course.name}</h4>
                          <p className="text-sm text-gray-600">Level: {assignment.course.level} • Max Students: {assignment.course.maxStudents}</p>
                          <p className="text-sm text-gray-600">Schedule: {assignment.schedule}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">Start Date</label>
                          <p className="text-sm text-gray-900">{new Date(assignment.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">End Date</label>
                          <p className="text-sm text-gray-900">{new Date(assignment.endDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(assignment.status)}`}>
                            {assignment.status}
                          </span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-700">Assigned Students ({assignment.students.length})</label>
                          <span className="text-sm text-gray-600">Capacity: {assignment.students.length}/{assignment.course.maxStudents}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {assignment.students.map((student) => (
                            <div key={student.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                              <img src={student.avatar} alt={student.fullName} className="h-6 w-6 rounded-full" />
                              <span className="text-xs text-gray-700 truncate">{student.fullName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                        View Details
                      </button>
                      <button className="px-3 py-1 bg-gold-500 text-white text-sm rounded hover:bg-gold-600 transition">
                        Manage Students
                      </button>
                      <button className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition">
                        Remove
                      </button>
                    </div>
                  </div>
                </Card>
              ))}

              {currentAssignments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No current assignments</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'past' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Past Assignments</h3>
                <span className="text-sm text-gray-600">{pastAssignments.length} completed courses</span>
              </div>

              {pastAssignments.map((assignment) => (
                <Card key={assignment.id}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-gray-600 font-bold">✅</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{assignment.course.name}</h4>
                          <p className="text-sm text-gray-600">Level: {assignment.course.level} • Max Students: {assignment.course.maxStudents}</p>
                          <p className="text-sm text-gray-600">Schedule: {assignment.schedule}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">Start Date</label>
                          <p className="text-sm text-gray-900">{new Date(assignment.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">End Date</label>
                          <p className="text-sm text-gray-900">{new Date(assignment.endDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">Completion Rate</label>
                          <p className="text-lg font-bold text-green-600">{assignment.completionRate}%</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(assignment.status)}`}>
                          {assignment.status}
                        </span>
                        <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                          View Report
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {pastAssignments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No past assignments</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Teaching Schedule</h3>
              
              <Card title="Weekly Schedule">
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-2 text-center">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <div key={day} className="font-semibold text-gray-700 p-2 bg-gray-100 rounded">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-2">
                    {['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'].map((time) => (
                      <div key={time} className="space-y-1">
                        <div className="text-xs text-gray-500 text-center">{time}</div>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                          <div key={`${day}-${time}`} className="h-8 border border-gray-200 rounded text-xs flex items-center justify-center text-gray-500">
                            {day === 'Mon' && time === '9:00 AM' && 'Quran Basic'}
                            {day === 'Wed' && time === '9:00 AM' && 'Quran Basic'}
                            {day === 'Fri' && time === '9:00 AM' && 'Quran Basic'}
                            {day === 'Tue' && time === '11:00 AM' && 'Islamic Studies'}
                            {day === 'Thu' && time === '11:00 AM' && 'Islamic Studies'}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Assignment Form Modal */}
      {showAssignForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Assign Course to Teacher</h3>
            
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
                      {course.name} ({course.level}) - Max {course.maxStudents} students
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Students</label>
                <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3">
                  <div className="space-y-2">
                    {students.map((student) => (
                      <label key={student.id} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => handleStudentToggle(student.id)}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
                        />
                        <img src={student.avatar} alt={student.fullName} className="h-8 w-8 rounded-full" />
                        <div>
                          <p className="font-medium text-gray-900">{student.fullName}</p>
                          <p className="text-sm text-gray-600">{student.program}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Selected: {selectedStudents.length} students
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAssignForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignCourse}
                  disabled={!selectedCourse || selectedStudents.length === 0}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign Course
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAssignments;














