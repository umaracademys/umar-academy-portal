import React, { useState } from 'react';
import Card from './Card';

interface TeacherAnalyticsProps {
  teacher: any;
  onClose: () => void;
}

const TeacherAnalytics: React.FC<TeacherAnalyticsProps> = ({ teacher, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('3months');

  const analyticsData = {
    overview: {
      totalStudents: 45,
      classesTaught: 12,
      averageRating: 4.8,
      assignmentsCreated: 23,
      assignmentsGraded: 156,
      hoursTeaching: 180,
      lastActive: '2025-01-20'
    },
    performance: {
      subjects: [
        { name: 'Quran Recitation', students: 25, rating: 4.9, trend: 'up' },
        { name: 'Islamic Studies', students: 20, rating: 4.7, trend: 'up' },
        { name: 'Arabic Language', students: 15, rating: 4.6, trend: 'down' },
        { name: 'Tajweed Rules', students: 18, rating: 4.8, trend: 'up' }
      ],
      assessments: [
        { name: 'Midterm Exam', average: 85.2, completion: 95, trend: 'up' },
        { name: 'Final Project', average: 88.7, completion: 90, trend: 'up' },
        { name: 'Weekly Quiz', average: 82.1, completion: 98, trend: 'down' },
        { name: 'Assignment 1', average: 87.3, completion: 100, trend: 'up' }
      ]
    },
    engagement: {
      communication: {
        messagesSent: 45,
        emailsSent: 23,
        announcementsPosted: 8,
        parentMeetings: 12
      },
      teaching: {
        classesConducted: 45,
        attendanceRate: 94.2,
        punctualityRate: 98.5,
        preparationTime: 15.5
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Teacher Analytics Dashboard</h2>
                <p className="text-purple-100">
                  {teacher?.fullName ?? teacher?.name ?? teacher?.email ?? 'this teacher'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'performance', label: 'Performance', icon: '📈' },
              { id: 'engagement', label: 'Engagement', icon: '💬' },
              { id: 'reports', label: 'Reports', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
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
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <div className="text-center p-4">
                    <div className="text-3xl mb-2">👨‍🎓</div>
                    <div className="text-2xl font-bold text-blue-600">{analyticsData.overview.totalStudents}</div>
                    <div className="text-sm text-gray-600">Total Students</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center p-4">
                    <div className="text-3xl mb-2">⭐</div>
                    <div className="text-2xl font-bold text-yellow-600">{analyticsData.overview.averageRating}</div>
                    <div className="text-sm text-gray-600">Average Rating</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center p-4">
                    <div className="text-3xl mb-2">📝</div>
                    <div className="text-2xl font-bold text-green-600">{analyticsData.overview.assignmentsCreated}</div>
                    <div className="text-sm text-gray-600">Assignments Created</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center p-4">
                    <div className="text-3xl mb-2">⏰</div>
                    <div className="text-2xl font-bold text-purple-600">{analyticsData.overview.hoursTeaching}</div>
                    <div className="text-sm text-gray-600">Teaching Hours</div>
                  </div>
                </Card>
              </div>

              {/* Teaching Performance Chart */}
              <Card title="Teaching Performance">
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📊</div>
                    <p className="text-gray-600">Performance chart would be displayed here</p>
                    <p className="text-sm text-gray-500">Integration with charting library needed</p>
                  </div>
                </div>
              </Card>

              {/* Recent Activity */}
              <Card title="Recent Teaching Activity">
                <div className="space-y-3">
                  {[
                    { action: 'Graded 15 assignments', time: '2 hours ago', type: 'grading' },
                    { action: 'Created new lesson plan', time: '4 hours ago', type: 'planning' },
                    { action: 'Conducted Quran class', time: '6 hours ago', type: 'teaching' },
                    { action: 'Sent progress report', time: '1 day ago', type: 'communication' },
                    { action: 'Updated course materials', time: '2 days ago', type: 'content' }
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">
                          {activity.type === 'grading' && '📊'}
                          {activity.type === 'planning' && '📝'}
                          {activity.type === 'teaching' && '👨‍🏫'}
                          {activity.type === 'communication' && '💬'}
                          {activity.type === 'content' && '📚'}
                        </span>
                        <span className="font-medium">{activity.action}</span>
                      </div>
                      <span className="text-sm text-gray-500">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Subject Performance */}
              <Card title="Subject Performance">
                <div className="space-y-4">
                  {analyticsData.performance.subjects.map((subject, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{subject.name}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{subject.students} students</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            subject.trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {subject.trend === 'up' ? '↗' : '↘'} {subject.rating}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${subject.rating * 20}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Assessment Performance */}
              <Card title="Assessment Performance">
                <div className="space-y-4">
                  {analyticsData.performance.assessments.map((assessment, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{assessment.name}</h4>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-600">Avg: {assessment.average}%</span>
                          <span className="text-sm text-gray-600">Completion: {assessment.completion}%</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            assessment.trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {assessment.trend === 'up' ? '↗' : '↘'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Average Score</div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${assessment.average}%` }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Completion Rate</div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${assessment.completion}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'engagement' && (
            <div className="space-y-6">
              {/* Communication Metrics */}
              <Card title="Communication Engagement">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl mb-2">💬</div>
                    <div className="text-xl font-bold text-blue-600">{analyticsData.engagement.communication.messagesSent}</div>
                    <div className="text-sm text-gray-600">Messages Sent</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl mb-2">📧</div>
                    <div className="text-xl font-bold text-green-600">{analyticsData.engagement.communication.emailsSent}</div>
                    <div className="text-sm text-gray-600">Emails Sent</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl mb-2">📢</div>
                    <div className="text-xl font-bold text-purple-600">{analyticsData.engagement.communication.announcementsPosted}</div>
                    <div className="text-sm text-gray-600">Announcements</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl mb-2">👥</div>
                    <div className="text-xl font-bold text-yellow-600">{analyticsData.engagement.communication.parentMeetings}</div>
                    <div className="text-sm text-gray-600">Parent Meetings</div>
                  </div>
                </div>
              </Card>

              {/* Teaching Metrics */}
              <Card title="Teaching Engagement">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-4">Class Statistics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Classes Conducted:</span>
                        <span className="font-semibold">{analyticsData.engagement.teaching.classesConducted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Attendance Rate:</span>
                        <span className="font-semibold text-green-600">{analyticsData.engagement.teaching.attendanceRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Punctuality Rate:</span>
                        <span className="font-semibold text-blue-600">{analyticsData.engagement.teaching.punctualityRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Prep Time:</span>
                        <span className="font-semibold text-purple-600">{analyticsData.engagement.teaching.preparationTime} hrs</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-4">Engagement Trends</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Student Participation</span>
                        <span className="text-green-600 font-semibold">↗ +12%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Assignment Completion</span>
                        <span className="text-green-600 font-semibold">↗ +8%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Parent Satisfaction</span>
                        <span className="text-green-600 font-semibold">↗ +15%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Class Engagement</span>
                        <span className="text-blue-600 font-semibold">↗ +5%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <Card title="Generate Reports">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left">
                    <h3 className="font-semibold mb-1">📊 Performance Report</h3>
                    <p className="text-sm text-gray-600">Detailed teaching performance analysis</p>
                  </button>
                  <button className="p-4 border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left">
                    <h3 className="font-semibold mb-1">📈 Student Progress Report</h3>
                    <p className="text-sm text-gray-600">Student achievement and progress</p>
                  </button>
                  <button className="p-4 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-left">
                    <h3 className="font-semibold mb-1">💬 Communication Report</h3>
                    <p className="text-sm text-gray-600">Teacher-student communication summary</p>
                  </button>
                  <button className="p-4 border-2 border-yellow-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition text-left">
                    <h3 className="font-semibold mb-1">📋 Attendance Report</h3>
                    <p className="text-sm text-gray-600">Class attendance and punctuality</p>
                  </button>
                </div>
              </Card>

              <Card title="Export Options">
                <div className="space-y-3">
                  <button className="w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-left">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">📄 PDF Report</h4>
                        <p className="text-sm text-gray-600">Generate comprehensive PDF report</p>
                      </div>
                      <span className="text-blue-600">Export</span>
                    </div>
                  </button>
                  <button className="w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-left">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">📊 Excel Spreadsheet</h4>
                        <p className="text-sm text-gray-600">Export data for further analysis</p>
                      </div>
                      <span className="text-green-600">Export</span>
                    </div>
                  </button>
                  <button className="w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-left">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">📈 CSV Data</h4>
                        <p className="text-sm text-gray-600">Raw data for custom analysis</p>
                      </div>
                      <span className="text-purple-600">Export</span>
                    </div>
                  </button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherAnalytics;








