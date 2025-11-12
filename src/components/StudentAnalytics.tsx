import React, { useState } from 'react';
import Card from './Card';

interface StudentAnalyticsProps {
  student: any;
  onClose: () => void;
}

const StudentAnalytics: React.FC<StudentAnalyticsProps> = ({ student, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('3months');

  const analyticsData = {
    overview: {
      totalSessions: 45,
      attendanceRate: 95.6,
      averageGrade: 88.2,
      assignmentsCompleted: 23,
      assignmentsPending: 2,
      hoursStudied: 180,
      lastActive: '2025-01-20'
    },
    performance: {
      subjects: [
        { name: 'Quran Recitation', grade: 92, progress: 85, trend: 'up' },
        { name: 'Islamic Studies', grade: 88, progress: 78, trend: 'up' },
        { name: 'Arabic Language', grade: 85, progress: 72, trend: 'down' },
        { name: 'Tajweed Rules', grade: 90, progress: 88, trend: 'up' }
      ],
      assessments: [
        { date: '2025-01-15', type: 'Quiz', subject: 'Quran Recitation', score: 95, maxScore: 100 },
        { date: '2025-01-10', type: 'Assignment', subject: 'Islamic Studies', score: 88, maxScore: 100 },
        { date: '2025-01-08', type: 'Test', subject: 'Arabic Language', score: 82, maxScore: 100 },
        { date: '2025-01-05', type: 'Quiz', subject: 'Tajweed Rules', score: 92, maxScore: 100 }
      ]
    },
    attendance: {
      totalDays: 30,
      presentDays: 28,
      absentDays: 2,
      lateDays: 3,
      attendanceRate: 93.3,
      monthlyTrend: [
        { month: 'Oct', rate: 95 },
        { month: 'Nov', rate: 92 },
        { month: 'Dec', rate: 98 },
        { month: 'Jan', rate: 93 }
      ]
    },
    engagement: {
      loginFrequency: 4.2, // times per week
      timeSpent: 2.5, // hours per session
      assignmentsSubmitted: 23,
      questionsAsked: 15,
      participationScore: 8.5
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'OV' },
    { id: 'performance', label: 'Performance', icon: 'PF' },
    { id: 'attendance', label: 'Attendance', icon: 'AT' },
    { id: 'engagement', label: 'Engagement', icon: 'EN' },
    { id: 'reports', label: 'Reports', icon: 'RP' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div className="flex items-center space-x-4">
            <img
              src={student.avatar || `https://ui-avatars.com/api/?name=${(student.fullName ?? student.name ?? 'Student').replace(' ', '+')}&background=2E4D32&color=fff`}
              alt={student.fullName ?? student.name ?? 'Student'}
              className="h-12 w-12 rounded-full border border-accent-soft"
            />
            <div>
              <h2 className="text-xl font-bold text-primary">Student Analytics</h2>
              <p className="text-sm text-primary-soft">
                Performance &amp; progress analysis for {student.fullName ?? student.name ?? 'this student'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-soft-primary text-xs font-semibold text-primary">
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary-600 mb-2">{analyticsData.overview.totalSessions}</div>
                    <div className="text-sm text-gray-600">Total Sessions</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">{analyticsData.overview.attendanceRate}%</div>
                    <div className="text-sm text-gray-600">Attendance Rate</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{analyticsData.overview.averageGrade}</div>
                    <div className="text-sm text-gray-600">Average Grade</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">{analyticsData.overview.hoursStudied}</div>
                    <div className="text-sm text-gray-600">Hours Studied</div>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Last Login:</span>
                      <span className="text-gray-900">{analyticsData.overview.lastActive}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Assignments Completed:</span>
                      <span className="text-green-600 font-semibold">{analyticsData.overview.assignmentsCompleted}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Assignments Pending:</span>
                      <span className="text-yellow-600 font-semibold">{analyticsData.overview.assignmentsPending}</span>
                    </div>
                  </div>
                </Card>

                <Card>
                  <h3 className="mb-4 text-lg font-semibold text-primary">Quick Actions</h3>
                  <div className="space-y-3">
                    <button className="w-full rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)]">
                      Generate progress report
                    </button>
                    <button className="w-full rounded-full border border-[rgba(var(--color-accent-rgb),0.45)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)] transition hover:bg-soft-accent">
                      Export analytics data
                    </button>
                    <button className="w-full rounded-full border border-[rgba(var(--color-primary-rgb),0.25)] px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft-primary">
                      Schedule parent meeting
                    </button>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Performance</h3>
                  <div className="space-y-4">
                    {analyticsData.performance.subjects.map((subject, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{subject.name}</span>
                          <span className="text-sm text-gray-600">Grade: {subject.grade}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full" 
                            style={{ width: `${subject.progress}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-600">Progress: {subject.progress}%</span>
                          <span className={`text-sm ${subject.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                            {subject.trend === 'up' ? '↗' : '↘'} {subject.trend === 'up' ? 'Improving' : 'Declining'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Assessments</h3>
                  <div className="space-y-3">
                    {analyticsData.performance.assessments.map((assessment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{assessment.subject}</div>
                          <div className="text-sm text-gray-600">{assessment.type} - {assessment.date}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{assessment.score}/{assessment.maxScore}</div>
                          <div className="text-sm text-gray-600">
                            {Math.round((assessment.score / assessment.maxScore) * 100)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Summary</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total Days:</span>
                      <span className="font-semibold text-gray-900">{analyticsData.attendance.totalDays}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Present Days:</span>
                      <span className="font-semibold text-green-600">{analyticsData.attendance.presentDays}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Absent Days:</span>
                      <span className="font-semibold text-red-600">{analyticsData.attendance.absentDays}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Late Days:</span>
                      <span className="font-semibold text-yellow-600">{analyticsData.attendance.lateDays}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Attendance Rate:</span>
                      <span className="font-semibold text-primary">{analyticsData.attendance.attendanceRate}%</span>
                    </div>
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trend</h3>
                  <div className="space-y-3">
                    {analyticsData.attendance.monthlyTrend.map((month, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-gray-600">{month.month}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary-600 h-2 rounded-full" 
                              style={{ width: `${month.rate}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{month.rate}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'engagement' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Metrics</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Login Frequency:</span>
                      <span className="font-semibold text-gray-900">{analyticsData.engagement.loginFrequency} times/week</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Time Spent per Session:</span>
                      <span className="font-semibold text-gray-900">{analyticsData.engagement.timeSpent} hours</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Assignments Submitted:</span>
                      <span className="font-semibold text-green-600">{analyticsData.engagement.assignmentsSubmitted}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Questions Asked:</span>
                      <span className="font-semibold text-blue-600">{analyticsData.engagement.questionsAsked}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Participation Score:</span>
                      <span className="font-semibold text-primary-600">{analyticsData.engagement.participationScore}/10</span>
                    </div>
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Actions</h3>
                  <div className="space-y-3">
                    <button className="w-full rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)]">
                      Send engagement report
                    </button>
                    <button className="w-full rounded-full border border-[rgba(var(--color-accent-rgb),0.45)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)] transition hover:bg-soft-accent">
                      Schedule check-in
                    </button>
                    <button className="w-full rounded-full border border-[rgba(var(--color-primary-rgb),0.25)] px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft-primary">
                      Review participation
                    </button>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Reports</h3>
                  <div className="space-y-3">
                    <button className="w-full rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)]">
                      Academic progress report
                    </button>
                    <button className="w-full rounded-full border border-[rgba(var(--color-accent-rgb),0.45)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)] transition hover:bg-soft-accent">
                      Attendance report
                    </button>
                    <button className="w-full rounded-full border border-[rgba(var(--color-primary-rgb),0.25)] px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft-primary">
                      Performance analysis
                    </button>
                    <button className="w-full rounded-full border border-[rgba(var(--color-primary-rgb),0.25)] px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft-primary">
                      Engagement report
                    </button>
                    <button className="w-full rounded-full border border-[rgba(var(--color-primary-rgb),0.25)] px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft-primary">
                      Comprehensive report
                    </button>
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
                  <div className="space-y-3">
                    <button className="w-full rounded-full border border-[rgba(var(--color-primary-rgb),0.25)] px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft-primary">
                      Export PDF report
                    </button>
                    <button className="w-full rounded-full border border-[rgba(var(--color-primary-rgb),0.25)] px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft-primary">
                      Export Excel spreadsheet
                    </button>
                    <button className="w-full rounded-full border border-[rgba(var(--color-primary-rgb),0.25)] px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft-primary">
                      Email summary
                    </button>
                    <button className="w-full rounded-full border border-[rgba(var(--color-primary-rgb),0.25)] px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft-primary">
                      Print report
                    </button>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAnalytics;














