import React, { useState } from 'react';
import Card from './Card';

interface TeacherAttendanceProps {
  teacher: any;
  onClose: () => void;
}

const TeacherAttendance: React.FC<TeacherAttendanceProps> = ({ teacher, onClose }) => {
  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showMarkAttendance, setShowMarkAttendance] = useState(false);

  const scheduleData = {
    weekly: [
      { day: 'Monday', classes: [
        { time: '9:00 AM - 10:00 AM', course: 'Quran Recitation - Basic', students: 8, room: 'Room 101' },
        { time: '11:00 AM - 12:00 PM', course: 'Islamic Studies', students: 5, room: 'Room 102' }
      ]},
      { day: 'Tuesday', classes: [
        { time: '11:00 AM - 12:00 PM', course: 'Islamic Studies', students: 5, room: 'Room 102' }
      ]},
      { day: 'Wednesday', classes: [
        { time: '9:00 AM - 10:00 AM', course: 'Quran Recitation - Basic', students: 8, room: 'Room 101' }
      ]},
      { day: 'Thursday', classes: [
        { time: '11:00 AM - 12:00 PM', course: 'Islamic Studies', students: 5, room: 'Room 102' }
      ]},
      { day: 'Friday', classes: [
        { time: '9:00 AM - 10:00 AM', course: 'Quran Recitation - Basic', students: 8, room: 'Room 101' }
      ]},
      { day: 'Saturday', classes: []},
      { day: 'Sunday', classes: []}
    ],
    attendance: [
      { date: '2025-10-20', status: 'present', checkIn: '8:55 AM', checkOut: '12:05 PM', classes: 2, notes: 'On time' },
      { date: '2025-10-18', status: 'present', checkIn: '10:55 AM', checkOut: '12:00 PM', classes: 1, notes: 'On time' },
      { date: '2025-10-15', status: 'present', checkIn: '8:50 AM', checkOut: '12:10 PM', classes: 2, notes: 'On time' },
      { date: '2025-10-13', status: 'late', checkIn: '11:15 AM', checkOut: '12:00 PM', classes: 1, notes: '15 minutes late due to traffic' },
      { date: '2025-10-11', status: 'present', checkIn: '8:45 AM', checkOut: '12:15 PM', classes: 2, notes: 'Early arrival' },
      { date: '2025-10-08', status: 'present', checkIn: '10:50 AM', checkOut: '12:00 PM', classes: 1, notes: 'On time' }
    ],
    leaves: [
      { id: 'leave-1', type: 'Sick Leave', startDate: '2025-09-15', endDate: '2025-09-16', status: 'approved', reason: 'Flu symptoms' },
      { id: 'leave-2', type: 'Personal Leave', startDate: '2025-08-20', endDate: '2025-08-22', status: 'approved', reason: 'Family emergency' },
      { id: 'leave-3', type: 'Vacation', startDate: '2025-07-10', endDate: '2025-07-15', status: 'approved', reason: 'Summer vacation' }
    ],
    statistics: {
      totalDays: 30,
      presentDays: 28,
      lateDays: 2,
      absentDays: 0,
      attendanceRate: 93.3,
      punctualityRate: 85.7
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      present: 'bg-green-100 text-green-800 border-green-300',
      late: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      absent: 'bg-red-100 text-red-800 border-red-300',
      'half-day': 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[status as keyof typeof colors] || colors.present;
  };

  const getLeaveStatusColor = (status: string) => {
    const colors = {
      approved: 'bg-green-100 text-green-800 border-green-300',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      rejected: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getLeaveTypeIcon = (type: string) => {
    const icons = {
      'Sick Leave': '🤒',
      'Personal Leave': '👤',
      'Vacation': '🏖️',
      'Emergency': '🚨',
      'Other': '📝'
    };
    return icons[type as keyof typeof icons] || '📝';
  };

  const tabs = [
    { id: 'schedule', label: 'Schedule', icon: '📅' },
    { id: 'attendance', label: 'Attendance', icon: '✅' },
    { id: 'leaves', label: 'Leaves', icon: '🏖️' },
    { id: 'statistics', label: 'Statistics', icon: '📊' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Attendance & Schedule</h2>
              <p className="text-primary-100">{teacher.fullName} - {teacher.id}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowMarkAttendance(true)}
                className="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition"
              >
                Mark Attendance
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
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Weekly Schedule</h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                    + Add Class
                  </button>
                  <button className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition">
                    Export Schedule
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {scheduleData.weekly.map((day, index) => (
                  <Card key={index} title={day.day}>
                    <div className="space-y-3">
                      {day.classes.length > 0 ? (
                        day.classes.map((classItem, classIndex) => (
                          <div key={classIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                                <span className="text-primary-600 font-bold">📚</span>
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{classItem.course}</h4>
                                <p className="text-sm text-gray-600">{classItem.time} • {classItem.room}</p>
                                <p className="text-xs text-gray-500">{classItem.students} students</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                                Edit
                              </button>
                              <button className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          <p>No classes scheduled</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Attendance Records</h3>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  />
                  <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                    Filter
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Total Days</p>
                    <p className="text-2xl font-bold text-primary-600">{scheduleData.statistics.totalDays}</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Present</p>
                    <p className="text-2xl font-bold text-green-600">{scheduleData.statistics.presentDays}</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Late</p>
                    <p className="text-2xl font-bold text-yellow-600">{scheduleData.statistics.lateDays}</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Absent</p>
                    <p className="text-2xl font-bold text-red-600">{scheduleData.statistics.absentDays}</p>
                  </div>
                </Card>
              </div>

              <Card title="Recent Attendance">
                <div className="space-y-2">
                  {scheduleData.attendance.map((record, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <span className="text-primary-600 font-bold">📅</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{new Date(record.date).toLocaleDateString()}</p>
                          <p className="text-sm text-gray-600">{record.checkIn} - {record.checkOut} • {record.classes} classes</p>
                          <p className="text-xs text-gray-500">{record.notes}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'leaves' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Leave Management</h3>
                <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                  + Request Leave
                </button>
              </div>

              <div className="space-y-4">
                {scheduleData.leaves.map((leave) => (
                  <Card key={leave.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gold-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">{getLeaveTypeIcon(leave.type)}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{leave.type}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">{leave.reason}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getLeaveStatusColor(leave.status)}`}>
                          {leave.status}
                        </span>
                        <div className="mt-2 flex space-x-2">
                          <button className="text-primary-600 hover:text-primary-800 text-sm">View</button>
                          <button className="text-gray-600 hover:text-gray-800 text-sm">Edit</button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Attendance Statistics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Attendance Overview">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Overall Attendance Rate</span>
                      <span className="font-semibold text-green-600">{scheduleData.statistics.attendanceRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-green-500 h-3 rounded-full transition-all duration-300" 
                        style={{ width: `${scheduleData.statistics.attendanceRate}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Punctuality Rate</span>
                      <span className="font-semibold text-blue-600">{scheduleData.statistics.punctualityRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-500 h-3 rounded-full transition-all duration-300" 
                        style={{ width: `${scheduleData.statistics.punctualityRate}%` }}
                      ></div>
                    </div>
                  </div>
                </Card>

                <Card title="Monthly Summary">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Working Days</span>
                      <span className="font-semibold text-gray-900">{scheduleData.statistics.totalDays}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Present Days</span>
                      <span className="font-semibold text-green-600">{scheduleData.statistics.presentDays}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Late Days</span>
                      <span className="font-semibold text-yellow-600">{scheduleData.statistics.lateDays}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Absent Days</span>
                      <span className="font-semibold text-red-600">{scheduleData.statistics.absentDays}</span>
                    </div>
                  </div>
                </Card>
              </div>

              <Card title="Export Options">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center">
                    <div className="text-2xl mb-2">📊</div>
                    <p className="font-medium text-gray-900">Excel Report</p>
                    <p className="text-sm text-gray-600">Detailed attendance data</p>
                  </button>
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center">
                    <div className="text-2xl mb-2">📄</div>
                    <p className="font-medium text-gray-900">PDF Report</p>
                    <p className="text-sm text-gray-600">Formatted attendance report</p>
                  </button>
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center">
                    <div className="text-2xl mb-2">📧</div>
                    <p className="font-medium text-gray-900">Email Report</p>
                    <p className="text-sm text-gray-600">Send to teacher</p>
                  </button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Mark Attendance Modal */}
      {showMarkAttendance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Mark Attendance</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="half-day">Half Day</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-in Time</label>
                <input
                  type="time"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-out Time</label>
                <input
                  type="time"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  placeholder="Any additional notes..."
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowMarkAttendance(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                  Mark Attendance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAttendance;












