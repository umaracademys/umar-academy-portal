import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Button from './ui/Button';

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

  const tabs = [
    { id: 'current', label: 'Current' },
    { id: 'past', label: 'Past' },
    { id: 'schedule', label: 'Schedule' }
  ];

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg border border-gray-200 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="heading-page">Course assignments</h2>
              <p className="caption mt-1 text-gray-600">Assignments you&apos;ve given to your students</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" className="min-h-[44px]" onClick={() => setShowAssignForm(true)}>
                + Assign course
              </Button>
              <Button variant="outline" size="sm" className="min-h-[44px]" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-4 sm:px-6">
          <nav className="flex gap-4" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition body-text min-h-[44px] ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          {activeTab === 'current' && (
            <div className="space-y-6">
              <h3 className="heading-section">Current assignments</h3>

              {currentAssignments.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="body-text text-gray-700">No current assignments</p>
                  <p className="caption mt-1 text-gray-600">Assign a course above to get started</p>
                </div>
              ) : (
                currentAssignments.map((assignment) => (
                  <div key={assignment.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="heading-card">{assignment.course.name}</h4>
                          <p className="body-text text-gray-600 mt-1">Level: {assignment.course.level} · Max {assignment.course.maxStudents} students</p>
                          <p className="caption mt-1 text-gray-500">Schedule: {assignment.schedule}</p>
                          <div className="mt-4 flex flex-wrap gap-4 body-text text-gray-700">
                            <span>Start: {new Date(assignment.startDate).toLocaleDateString()}</span>
                            <span>End: {new Date(assignment.endDate).toLocaleDateString()}</span>
                            <span className="px-2 py-0.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              {assignment.status}
                            </span>
                          </div>
                          <div className="mt-4">
                            <p className="caption font-medium text-gray-700 mb-2">Assigned students ({assignment.students.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {assignment.students.map((student) => (
                                <div key={student.id} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                                  {student.avatar && <img src={student.avatar} alt="" className="h-6 w-6 rounded-full" />}
                                  <span className="body-text text-gray-800 truncate max-w-[120px]">{student.fullName}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:shrink-0">
                          <Button variant="primary" size="sm" className="min-h-[44px]">View details</Button>
                          <Button variant="outline" size="sm" className="min-h-[44px]">Edit</Button>
                          <Button variant="outline" size="sm" className="min-h-[44px]">Remove</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'past' && (
            <div className="space-y-6">
              <h3 className="heading-section">Past assignments</h3>

              {pastAssignments.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="body-text text-gray-700">No past assignments</p>
                  <p className="caption mt-1 text-gray-600">Completed courses will appear here</p>
                </div>
              ) : (
                pastAssignments.map((assignment) => (
                  <div key={assignment.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="heading-card">{assignment.course.name}</h4>
                          <p className="body-text text-gray-600 mt-1">Level: {assignment.course.level} · Schedule: {assignment.schedule}</p>
                          <div className="mt-3 flex flex-wrap gap-3 body-text text-gray-700">
                            <span>Ended: {new Date(assignment.endDate).toLocaleDateString()}</span>
                            <span className="px-2 py-0.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              {assignment.status}
                            </span>
                            {assignment.completionRate != null && (
                              <span className="text-gray-600">Completion: {assignment.completionRate}%</span>
                            )}
                          </div>
                        </div>
                        <Button variant="primary" size="sm" className="min-h-[44px]">View details</Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <h3 className="heading-section">Teaching schedule</h3>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h4 className="heading-card">Weekly schedule</h4>
                </div>
                <div className="p-4 sm:p-5 space-y-4">
                  <div className="grid grid-cols-7 gap-2 text-center">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <div key={day} className="body-text font-medium text-gray-700 p-2 bg-gray-50 rounded-lg border border-gray-200">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'].map((time) => (
                      <div key={time} className="space-y-1">
                        <div className="caption text-gray-500 text-center">{time}</div>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                          <div key={`${day}-${time}`} className="min-h-[44px] border border-gray-200 rounded-lg caption flex items-center justify-center text-gray-500 bg-white">
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
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assignment Form Modal */}
      {showAssignForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg border border-gray-200 max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="heading-card mb-4">Assign course to teacher</h3>
            <p className="caption text-gray-600 mb-4">Choose a course and students for this teacher</p>
            <div className="space-y-4">
              <div>
                <label className="block body-text font-medium text-gray-700 mb-2">Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="">Choose a course...</option>
                  {availableCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name} ({course.level}) — max {course.maxStudents} students
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block body-text font-medium text-gray-700 mb-2">Students</label>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                  {students.map((student) => (
                    <label
                      key={student.id}
                      className="flex items-center gap-3 cursor-pointer min-h-[44px] p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => handleStudentToggle(student.id)}
                        className="rounded border-gray-300 w-5 h-5 min-w-[20px] min-h-[20px]"
                        aria-label={`Select ${student.fullName}`}
                      />
                      {student.avatar && <img src={student.avatar} alt="" className="h-8 w-8 rounded-full" />}
                      <div>
                        <p className="body-text font-medium text-gray-900">{student.fullName}</p>
                        {student.program && <p className="caption text-gray-600">{student.program}</p>}
                      </div>
                    </label>
                  ))}
                </div>
                <p className="caption text-gray-500 mt-2">Selected: {selectedStudents.length} students</p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <Button variant="outline" size="md" onClick={() => setShowAssignForm(false)} className="sm:ml-auto">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleAssignCourse}
                  disabled={!selectedCourse || selectedStudents.length === 0}
                >
                  Assign course
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAssignments;














