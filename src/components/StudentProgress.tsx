import React, { useState } from 'react';
import Card from './Card';

interface StudentProgressProps {
  student: any;
  onClose: () => void;
}

const StudentProgress: React.FC<StudentProgressProps> = ({ student, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('3months');

  const progressData = {
    overall: {
      attendance: 95,
      performance: 88,
      participation: 92,
      homework: 85
    },
    courses: [
      {
        name: 'Quran Recitation',
        progress: 75,
        grade: 'A-',
        attendance: 98,
        lastAssessment: 'Oct 15, 2025',
        nextMilestone: 'Complete Surah Al-Mulk'
      },
      {
        name: 'Islamic Studies',
        progress: 60,
        grade: 'A+',
        attendance: 92,
        lastAssessment: 'Oct 18, 2025',
        nextMilestone: 'Chapter 5 - Prayer'
      }
    ],
    assessments: [
      {
        id: 'assess-1',
        date: '2025-10-20',
        type: 'Quran Recitation Test',
        score: 88,
        maxScore: 100,
        grade: 'A-',
        teacher: 'Dr. Ibrahim Yusuf',
        notes: 'Excellent recitation with minor Tajweed improvements needed'
      },
      {
        id: 'assess-2',
        date: '2025-10-15',
        type: 'Islamic Studies Quiz',
        score: 95,
        maxScore: 100,
        grade: 'A+',
        teacher: 'Mr. Hassan Ali',
        notes: 'Outstanding understanding of concepts'
      },
      {
        id: 'assess-3',
        date: '2025-10-10',
        type: 'Tajweed Practice',
        score: 82,
        maxScore: 100,
        grade: 'B+',
        teacher: 'Dr. Ibrahim Yusuf',
        notes: 'Good progress, focus on Makharij'
      }
    ],
    attendance: [
      { date: '2025-10-20', status: 'present', class: 'Quran Recitation' },
      { date: '2025-10-18', status: 'present', class: 'Islamic Studies' },
      { date: '2025-10-15', status: 'present', class: 'Quran Recitation' },
      { date: '2025-10-13', status: 'absent', class: 'Islamic Studies' },
      { date: '2025-10-11', status: 'present', class: 'Quran Recitation' },
      { date: '2025-10-08', status: 'present', class: 'Islamic Studies' }
    ],
    milestones: [
      {
        id: 'milestone-1',
        title: 'Complete Basic Tajweed Rules',
        status: 'completed',
        completedDate: '2025-09-15',
        description: 'Mastered all basic Tajweed rules'
      },
      {
        id: 'milestone-2',
        title: 'Memorize Surah Al-Fatiha',
        status: 'completed',
        completedDate: '2025-08-20',
        description: 'Perfect recitation with proper Tajweed'
      },
      {
        id: 'milestone-3',
        title: 'Complete Surah Al-Mulk',
        status: 'in-progress',
        progress: 75,
        description: 'Currently memorizing verses 1-15'
      },
      {
        id: 'milestone-4',
        title: 'Islamic Studies Chapter 5',
        status: 'pending',
        description: 'Understanding of Prayer fundamentals'
      }
    ]
  };

  const getGradeColor = (grade: string) => {
    const colors = {
      'A+': 'text-green-600',
      'A': 'text-green-600',
      'A-': 'text-green-500',
      'B+': 'text-blue-600',
      'B': 'text-blue-500',
      'B-': 'text-yellow-600',
      'C+': 'text-yellow-500',
      'C': 'text-orange-500',
      'D': 'text-red-500',
      'F': 'text-red-600'
    };
    return colors[grade as keyof typeof colors] || 'text-gray-600';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      present: 'bg-green-100 text-green-800 border-green-300',
      absent: 'bg-red-100 text-red-800 border-red-300',
      late: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      completed: 'bg-green-100 text-green-800 border-green-300',
      'in-progress': 'bg-blue-100 text-blue-800 border-blue-300',
      pending: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'assessments', label: 'Assessments', icon: '📝' },
    { id: 'attendance', label: 'Attendance', icon: '📅' },
    { id: 'milestones', label: 'Milestones', icon: '🎯' },
    { id: 'reports', label: 'Reports', icon: '📈' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Student Progress & Analytics</h2>
              <p className="text-primary-100">{student.fullName} - {student.id}</p>
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
                    <p className="text-sm text-gray-600 mb-1">Overall Attendance</p>
                    <p className="text-3xl font-bold text-green-600">{progressData.overall.attendance}%</p>
                    <p className="text-xs text-gray-500 mt-1">Excellent</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Academic Performance</p>
                    <p className="text-3xl font-bold text-primary-600">{progressData.overall.performance}%</p>
                    <p className="text-xs text-gray-500 mt-1">Very Good</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Class Participation</p>
                    <p className="text-3xl font-bold text-blue-600">{progressData.overall.participation}%</p>
                    <p className="text-xs text-gray-500 mt-1">Active</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Homework Completion</p>
                    <p className="text-3xl font-bold text-gold-600">{progressData.overall.homework}%</p>
                    <p className="text-xs text-gray-500 mt-1">Good</p>
                  </div>
                </Card>
              </div>

              {/* Course Progress */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {progressData.courses.map((course, index) => (
                  <Card key={index} title={course.name}>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Progress</span>
                        <span className="font-semibold text-primary-600">{course.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-primary-600 h-3 rounded-full transition-all duration-300" 
                          style={{ width: `${course.progress}%` }}
                        ></div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Current Grade</p>
                          <p className={`text-lg font-bold ${getGradeColor(course.grade)}`}>{course.grade}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Attendance</p>
                          <p className="text-lg font-bold text-green-600">{course.attendance}%</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600 mb-1">Last Assessment: {course.lastAssessment}</p>
                        <p className="text-sm text-gray-600">Next Milestone: {course.nextMilestone}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Performance Trends */}
              <Card title="Performance Trends">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Attendance Trend</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600">↗</span>
                      <span className="text-sm font-semibold text-green-600">+5%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Academic Performance</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-primary-600">↗</span>
                      <span className="text-sm font-semibold text-primary-600">+3%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary-500 h-2 rounded-full" style={{ width: '88%' }}></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Participation</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-600">↗</span>
                      <span className="text-sm font-semibold text-blue-600">+2%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'assessments' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Assessment History</h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                    + Add Assessment
                  </button>
                  <button className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition">
                    Export
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {progressData.assessments.map((assessment) => (
                  <Card key={assessment.id}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                            <span className="text-primary-600 font-bold">📝</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{assessment.type}</h4>
                            <p className="text-sm text-gray-600">By {assessment.teacher} • {new Date(assessment.date).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase">Score</label>
                            <p className="text-lg font-bold text-primary-600">{assessment.score}/{assessment.maxScore}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase">Grade</label>
                            <p className={`text-lg font-bold ${getGradeColor(assessment.grade)}`}>{assessment.grade}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase">Percentage</label>
                            <p className="text-lg font-bold text-gray-900">{Math.round((assessment.score / assessment.maxScore) * 100)}%</p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-700">{assessment.notes}</p>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                          View Details
                        </button>
                        <button className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition">
                          Edit
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
                    <p className="text-sm text-gray-600 mb-1">Absent</p>
                    <p className="text-2xl font-bold text-red-600">1</p>
                  </div>
                </Card>
              </div>

              <Card title="Recent Attendance">
                <div className="space-y-2">
                  {progressData.attendance.map((record, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{record.class}</p>
                        <p className="text-sm text-gray-600">{new Date(record.date).toLocaleDateString()}</p>
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

          {activeTab === 'milestones' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Learning Milestones</h3>
                <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                  + Add Milestone
                </button>
              </div>

              <div className="space-y-4">
                {progressData.milestones.map((milestone) => (
                  <Card key={milestone.id}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            milestone.status === 'completed' ? 'bg-green-100' :
                            milestone.status === 'in-progress' ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <span className={`font-bold ${
                              milestone.status === 'completed' ? 'text-green-600' :
                              milestone.status === 'in-progress' ? 'text-blue-600' : 'text-gray-600'
                            }`}>
                              {milestone.status === 'completed' ? '✅' :
                               milestone.status === 'in-progress' ? '🔄' : '⏳'}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{milestone.title}</h4>
                            <p className="text-sm text-gray-600">{milestone.description}</p>
                            {milestone.completedDate && (
                              <p className="text-xs text-gray-500">Completed: {new Date(milestone.completedDate).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>

                        {milestone.status === 'in-progress' && milestone.progress && (
                          <div className="mb-3">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-gray-600">Progress</span>
                              <span className="text-sm font-semibold text-blue-600">{milestone.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${milestone.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(milestone.status)}`}>
                            {milestone.status.replace('-', ' ')}
                          </span>
                          <div className="flex space-x-2">
                            <button className="text-primary-600 hover:text-primary-800 text-sm">View Details</button>
                            {milestone.status === 'in-progress' && (
                              <button className="text-blue-600 hover:text-blue-800 text-sm">Update Progress</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Progress Reports</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Generate Report">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                        <option value="">Select report type...</option>
                        <option value="progress">Progress Report</option>
                        <option value="attendance">Attendance Report</option>
                        <option value="assessment">Assessment Report</option>
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
                      <span className="text-sm text-gray-600">Average Grade</span>
                      <span className="font-semibold text-primary-600">A-</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Attendance Rate</span>
                      <span className="font-semibold text-green-600">95%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Completed Milestones</span>
                      <span className="font-semibold text-blue-600">2/4</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Last Assessment</span>
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
                    <p className="text-sm text-gray-600">Detailed progress data</p>
                  </button>
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center">
                    <div className="text-2xl mb-2">📄</div>
                    <p className="font-medium text-gray-900">PDF Report</p>
                    <p className="text-sm text-gray-600">Formatted progress report</p>
                  </button>
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center">
                    <div className="text-2xl mb-2">📧</div>
                    <p className="font-medium text-gray-900">Email Report</p>
                    <p className="text-sm text-gray-600">Send to parent</p>
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

export default StudentProgress;










