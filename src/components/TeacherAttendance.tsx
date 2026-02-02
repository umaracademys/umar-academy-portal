import React, { useState } from 'react';
import Button from './ui/Button';

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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg border border-gray-200 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="heading-page">Attendance & schedule</h2>
              <p className="caption mt-1 text-gray-600">{teacher.fullName}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => setShowMarkAttendance(true)}>
                Mark present
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
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
                <span className="mr-2" aria-hidden>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="heading-section">Weekly schedule</h3>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm">+ Add class</Button>
                  <Button variant="outline" size="sm">Export</Button>
                </div>
              </div>
              <div className="space-y-4">
                {scheduleData.weekly.map((day, index) => (
                  <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                      <h4 className="heading-card">{day.day}</h4>
                    </div>
                    <div className="p-4 space-y-3">
                      {day.classes.length > 0 ? (
                        day.classes.map((classItem, classIndex) => (
                          <div key={classIndex} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 min-h-[44px]">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                                <span className="text-primary font-semibold" aria-hidden>📚</span>
                              </div>
                              <div className="min-w-0">
                                <h4 className="body-text font-medium text-gray-900">{classItem.course}</h4>
                                <p className="caption text-gray-600">{classItem.time} · {classItem.room}</p>
                                <p className="caption text-gray-500">{classItem.students} students</p>
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button variant="primary" size="sm">Edit</Button>
                              <Button variant="outline" size="sm">Cancel</Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6">
                          <p className="body-text text-gray-600">No classes scheduled</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="heading-section">Attendance</h3>
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <Button variant="primary" size="sm">Filter</Button>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h4 className="heading-card">Recent attendance</h4>
                </div>
                <div className="divide-y divide-gray-200">
                  {scheduleData.attendance.map((record, index) => (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 min-h-[44px]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-primary font-semibold" aria-hidden>📅</span>
                        </div>
                        <div className="min-w-0">
                          <p className="body-text font-medium text-gray-900">{new Date(record.date).toLocaleDateString()}</p>
                          <p className="caption text-gray-600">{record.checkIn} – {record.checkOut} · {record.classes} classes</p>
                          {record.notes && <p className="caption text-gray-500 mt-0.5">{record.notes}</p>}
                        </div>
                      </div>
                      <span className={`inline-flex px-2.5 py-1 text-sm font-medium rounded-full border shrink-0 ${getStatusColor(record.status)}`}>
                        {record.status === 'late' ? 'Late' : record.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leaves' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="heading-section">Leave</h3>
                <Button variant="primary" size="sm">+ Request leave</Button>
              </div>
              <div className="space-y-4">
                {scheduleData.leaves.map((leave) => (
                  <div key={leave.id} className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0 text-lg" aria-hidden>
                          {getLeaveTypeIcon(leave.type)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="heading-card">{leave.type}</h4>
                          <p className="body-text text-gray-600 mt-0.5">
                            {new Date(leave.startDate).toLocaleDateString()} – {new Date(leave.endDate).toLocaleDateString()}
                          </p>
                          <p className="caption text-gray-500 mt-0.5">{leave.reason}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2.5 py-1 text-sm font-medium rounded-full border ${getLeaveStatusColor(leave.status)}`}>
                          {leave.status}
                        </span>
                        <Button variant="ghost" size="sm">View</Button>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className="space-y-6">
              <h3 className="heading-section">Summary</h3>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h4 className="heading-card">This period</h4>
                </div>
                <div className="p-4 sm:p-5 space-y-4">
                  <div className="flex justify-between items-center body-text text-gray-700">
                    <span>Working days</span>
                    <span className="font-medium text-gray-900">{scheduleData.statistics.totalDays}</span>
                  </div>
                  <div className="flex justify-between items-center body-text text-gray-700">
                    <span>Present</span>
                    <span className="font-medium text-gray-900">{scheduleData.statistics.presentDays}</span>
                  </div>
                  <div className="flex justify-between items-center body-text text-gray-700">
                    <span>Late</span>
                    <span className="font-medium text-gray-900">{scheduleData.statistics.lateDays}</span>
                  </div>
                  <div className="flex justify-between items-center body-text text-gray-700">
                    <span>Absent</span>
                    <span className="font-medium text-gray-900">{scheduleData.statistics.absentDays}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="body-text text-gray-700">Attendance rate</span>
                    <span className="body-text font-medium text-gray-900">{scheduleData.statistics.attendanceRate}%</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h4 className="heading-card">Export</h4>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button variant="outline" size="md" className="flex flex-col items-center gap-1 py-4 min-h-[72px]">
                    <span aria-hidden>📊</span>
                    <span>Excel</span>
                  </Button>
                  <Button variant="outline" size="md" className="flex flex-col items-center gap-1 py-4 min-h-[72px]">
                    <span aria-hidden>📄</span>
                    <span>PDF</span>
                  </Button>
                  <Button variant="outline" size="md" className="flex flex-col items-center gap-1 py-4 min-h-[72px]">
                    <span aria-hidden>📧</span>
                    <span>Email</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mark Attendance Modal */}
      {showMarkAttendance && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg border border-gray-200 max-w-md w-full p-6">
            <h3 className="heading-card mb-2">Mark present</h3>
            <p className="caption text-gray-600 mb-4">Record attendance for this date</p>
            <div className="space-y-4">
              <div>
                <label className="block body-text font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block body-text font-medium text-gray-700 mb-2">Status</label>
                <select className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary">
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent today</option>
                  <option value="half-day">Half day</option>
                </select>
              </div>
              <div>
                <label className="block body-text font-medium text-gray-700 mb-2">Check-in time</label>
                <input
                  type="time"
                  className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block body-text font-medium text-gray-700 mb-2">Check-out time</label>
                <input
                  type="time"
                  className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block body-text font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg body-text focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none min-h-[80px]"
                  placeholder="Any notes..."
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <Button variant="outline" size="md" onClick={() => setShowMarkAttendance(false)} className="sm:ml-auto">
                  Cancel
                </Button>
                <Button variant="primary" size="md">
                  Mark present
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAttendance;














