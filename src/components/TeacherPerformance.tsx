import React, { useState } from 'react';
import Card from './Card';

interface TeacherPerformanceProps {
  teacher: any;
  onClose: () => void;
}

const TeacherPerformance: React.FC<TeacherPerformanceProps> = ({ teacher, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('3months');

  const performanceData = {
    overall: {
      rating: 4.8,
      attendance: 98,
      punctuality: 95,
      studentSatisfaction: 92,
      courseCompletion: 88
    },
    metrics: [
      {
        name: 'Student Feedback',
        value: 4.8,
        max: 5,
        trend: '+0.2',
        color: 'green'
      },
      {
        name: 'Attendance Rate',
        value: 98,
        max: 100,
        trend: '+2%',
        color: 'blue'
      },
      {
        name: 'Punctuality',
        value: 95,
        max: 100,
        trend: '+1%',
        color: 'purple'
      },
      {
        name: 'Course Completion',
        value: 88,
        max: 100,
        trend: '+5%',
        color: 'gold'
      }
    ],
    studentFeedback: [
      {
        id: 'feedback-1',
        student: 'Ahmad Ali',
        rating: 5,
        comment: 'Excellent teaching method, very patient and clear explanations. My child has improved significantly.',
        date: '2025-10-20',
        course: 'Quran Recitation'
      },
      {
        id: 'feedback-2',
        student: 'Fatima Hassan',
        rating: 5,
        comment: 'Great teacher, very knowledgeable and helpful. Highly recommend!',
        date: '2025-10-18',
        course: 'Islamic Studies'
      },
      {
        id: 'feedback-3',
        student: 'Omar Khan',
        rating: 4,
        comment: 'Good teacher, sometimes rushes through material but overall very good.',
        date: '2025-10-15',
        course: 'Quran Recitation'
      },
      {
        id: 'feedback-4',
        student: 'Aisha Ahmed',
        rating: 5,
        comment: 'Amazing teacher! Very patient and makes learning fun.',
        date: '2025-10-12',
        course: 'Islamic Studies'
      }
    ],
    attendance: [
      { date: '2025-10-20', status: 'present', class: 'Quran Recitation', time: '9:00 AM' },
      { date: '2025-10-18', status: 'present', class: 'Islamic Studies', time: '11:00 AM' },
      { date: '2025-10-15', status: 'present', class: 'Quran Recitation', time: '9:00 AM' },
      { date: '2025-10-13', status: 'late', class: 'Islamic Studies', time: '11:15 AM' },
      { date: '2025-10-11', status: 'present', class: 'Quran Recitation', time: '9:00 AM' },
      { date: '2025-10-08', status: 'present', class: 'Islamic Studies', time: '11:00 AM' }
    ],
    achievements: [
      {
        id: 'achieve-1',
        title: 'Top Performer',
        description: 'Highest student satisfaction rating this month',
        date: '2025-10-01',
        type: 'award'
      },
      {
        id: 'achieve-2',
        title: 'Perfect Attendance',
        description: '100% attendance for 3 consecutive months',
        date: '2025-09-01',
        type: 'milestone'
      },
      {
        id: 'achieve-3',
        title: 'Student Retention',
        description: '95% student retention rate',
        date: '2025-08-01',
        type: 'achievement'
      }
    ]
  };

  const getTrendColor = (trend: string) => {
    return trend.startsWith('+') ? 'text-green-600' : 'text-red-600';
  };

  const getMetricColor = (color: string) => {
    const colors = {
      green: 'bg-green-500',
      blue: 'bg-blue-500',
      purple: 'bg-purple-500',
      gold: 'bg-yellow-500',
      red: 'bg-red-500'
    };
    return colors[color as keyof typeof colors] || 'bg-gray-500';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      present: 'bg-green-100 text-green-800 border-green-300',
      late: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      absent: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status as keyof typeof colors] || colors.present;
  };

  const getAchievementIcon = (type: string) => {
    const icons = {
      award: '🏆',
      milestone: '🎯',
      achievement: '⭐'
    };
    return icons[type as keyof typeof icons] || '⭐';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'feedback', label: 'Student Feedback', icon: '💬' },
    { id: 'attendance', label: 'Attendance', icon: '📅' },
    { id: 'achievements', label: 'Achievements', icon: '🏆' },
    { id: 'reports', label: 'Reports', icon: '📈' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Performance Analytics</h2>
              <p className="text-primary-100">{teacher.fullName} - {teacher.id}</p>
            </div>
            <div className="flex space-x-2">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 bg-white bg-opacity-20 text-white rounded-lg border border-white border-opacity-30 focus:ring-2 focus:ring-white focus:border-transparent"
              >
                <option value="1month">Last Month</option>
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
                <option value="all">All Time</option>
              </select>
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
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Overall Performance */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Overall Rating</p>
                    <p className="text-3xl font-bold text-gold-600">{performanceData.overall.rating}/5</p>
                    <p className="text-xs text-gray-500 mt-1">Based on 24 reviews</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Attendance Rate</p>
                    <p className="text-3xl font-bold text-green-600">{performanceData.overall.attendance}%</p>
                    <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Student Satisfaction</p>
                    <p className="text-3xl font-bold text-blue-600">{performanceData.overall.studentSatisfaction}%</p>
                    <p className="text-xs text-gray-500 mt-1">This semester</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Course Completion</p>
                    <p className="text-3xl font-bold text-purple-600">{performanceData.overall.courseCompletion}%</p>
                    <p className="text-xs text-gray-500 mt-1">Average</p>
                  </div>
                </Card>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Performance Metrics">
                  <div className="space-y-4">
                    {performanceData.metrics.map((metric, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{metric.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900">{metric.value}{metric.max === 5 ? '/5' : '%'}</span>
                            <span className={`text-sm font-semibold ${getTrendColor(metric.trend)}`}>
                              {metric.trend}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${getMetricColor(metric.color)}`}
                            style={{ width: `${(metric.value / metric.max) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Performance Trends">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Student Feedback Trend</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600">↗</span>
                        <span className="text-sm font-semibold text-green-600">+0.2</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '96%' }}></div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Attendance Trend</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-600">↗</span>
                        <span className="text-sm font-semibold text-blue-600">+2%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '98%' }}></div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Course Completion Trend</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-purple-600">↗</span>
                        <span className="text-sm font-semibold text-purple-600">+5%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '88%' }}></div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Student Feedback</h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                    + Request Feedback
                  </button>
                  <button className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition">
                    Export
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {performanceData.studentFeedback.map((feedback) => (
                  <Card key={feedback.id}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                            <span className="text-primary-600 font-bold">👨‍🎓</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{feedback.student}</h4>
                            <p className="text-sm text-gray-600">{feedback.course} • {new Date(feedback.date).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 mb-3">
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={`text-lg ${i < feedback.rating ? 'text-gold-500' : 'text-gray-300'}`}>⭐</span>
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{feedback.rating}/5</span>
                        </div>

                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-700">{feedback.comment}</p>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                          View Details
                        </button>
                        <button className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition">
                          Respond
                        </button>
                      </div>
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
                  <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                    Mark Attendance
                  </button>
                  <button className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition">
                    Export
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Total Classes</p>
                    <p className="text-2xl font-bold text-primary-600">24</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Present</p>
                    <p className="text-2xl font-bold text-green-600">23</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Late</p>
                    <p className="text-2xl font-bold text-yellow-600">1</p>
                  </div>
                </Card>
              </div>

              <Card title="Recent Attendance">
                <div className="space-y-2">
                  {performanceData.attendance.map((record, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{record.class}</p>
                        <p className="text-sm text-gray-600">{new Date(record.date).toLocaleDateString()} at {record.time}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Achievements & Awards</h3>
                <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                  + Add Achievement
                </button>
              </div>

              <div className="space-y-4">
                {performanceData.achievements.map((achievement) => (
                  <Card key={achievement.id}>
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gold-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">{getAchievementIcon(achievement.type)}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{achievement.title}</h4>
                        <p className="text-sm text-gray-600">{achievement.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(achievement.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-gold-600 uppercase">{achievement.type}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Performance Reports</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Generate Report">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                        <option value="">Select report type...</option>
                        <option value="performance">Performance Report</option>
                        <option value="feedback">Feedback Summary</option>
                        <option value="attendance">Attendance Report</option>
                        <option value="comprehensive">Comprehensive Report</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                        <option value="">Select period...</option>
                        <option value="1month">Last Month</option>
                        <option value="3months">Last 3 Months</option>
                        <option value="6months">Last 6 Months</option>
                        <option value="1year">Last Year</option>
                      </select>
                    </div>
                    
                    <button className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                      Generate Report
                    </button>
                  </div>
                </Card>

                <Card title="Quick Stats">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average Rating</span>
                      <span className="font-semibold text-gold-600">4.8/5</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Attendance Rate</span>
                      <span className="font-semibold text-green-600">98%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Student Retention</span>
                      <span className="font-semibold text-blue-600">95%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Last Review</span>
                      <span className="font-semibold text-gray-900">Oct 20, 2025</span>
                    </div>
                  </div>
                </Card>
              </div>

              <Card title="Export Options">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center">
                    <div className="text-2xl mb-2">📊</div>
                    <p className="font-medium text-gray-900">Excel Report</p>
                    <p className="text-sm text-gray-600">Detailed performance data</p>
                  </button>
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center">
                    <div className="text-2xl mb-2">📄</div>
                    <p className="font-medium text-gray-900">PDF Report</p>
                    <p className="text-sm text-gray-600">Formatted performance report</p>
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
    </div>
  );
};

export default TeacherPerformance;












