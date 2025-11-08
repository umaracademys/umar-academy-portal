import React, { useState } from 'react';
import StudentHeader from '../components/StudentHeader';
import StudentSidebar from '../components/StudentSidebar';
import StudentCard from '../components/StudentCard';

const StudentMainDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mock data - in real app, this would come from API
  const stats = {
    totalAssignments: 12,
    completedAssignments: 8,
    pendingAssignments: 4,
    averageGrade: 85,
    totalCourses: 3,
    activeCourses: 2,
    upcomingDeadlines: 2,
    messages: 5
  };

  const recentAssignments = [
    {
      id: 1,
      title: 'Surah Al-Fatiha Memorization',
      course: 'Quran Recitation',
      dueDate: '2024-02-15',
      status: 'pending',
      grade: null
    },
    {
      id: 2,
      title: 'Tajweed Rules Quiz',
      course: 'Tajweed Basics',
      dueDate: '2024-02-10',
      status: 'completed',
      grade: 92
    },
    {
      id: 3,
      title: 'Arabic Grammar Exercise',
      course: 'Arabic Language',
      dueDate: '2024-02-20',
      status: 'pending',
      grade: null
    }
  ];

  const upcomingEvents = [
    {
      title: 'Quran Recitation Class',
      time: '10:00 AM',
      date: 'Tomorrow',
      type: 'class'
    },
    {
      title: 'Assignment Due: Surah Al-Fatiha',
      time: '11:59 PM',
      date: 'Feb 15',
      type: 'assignment'
    },
    {
      title: 'Parent-Teacher Meeting',
      time: '2:00 PM',
      date: 'Feb 18',
      type: 'meeting'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentHeader />
      
      <div className="flex">
        <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 lg:ml-64">
          <div className="p-6">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back! 👋
              </h1>
              <p className="text-gray-600">
                Here's what's happening with your studies today.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StudentCard
                title="Total Assignments"
                value={stats.totalAssignments}
                icon="📝"
                color="blue"
                trend={{ value: 12, isPositive: true }}
              />
              <StudentCard
                title="Completed"
                value={stats.completedAssignments}
                icon="✅"
                color="green"
                trend={{ value: 8, isPositive: true }}
              />
              <StudentCard
                title="Average Grade"
                value={`${stats.averageGrade}%`}
                icon="📊"
                color="purple"
                trend={{ value: 5, isPositive: true }}
              />
              <StudentCard
                title="Active Courses"
                value={stats.activeCourses}
                icon="📚"
                color="yellow"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Assignments */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Assignments</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {recentAssignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{assignment.title}</h3>
                          <p className="text-sm text-gray-600">{assignment.course}</p>
                          <p className="text-xs text-gray-500">Due: {assignment.dueDate}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {assignment.status === 'completed' ? (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Completed
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                              Pending
                            </span>
                          )}
                          {assignment.grade && (
                            <span className="text-sm font-medium text-gray-900">
                              {assignment.grade}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      View all assignments →
                    </button>
                  </div>
                </div>
              </div>

              {/* Upcoming Events */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {upcomingEvents.map((event, index) => (
                      <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                        <div className={`p-2 rounded-full ${
                          event.type === 'class' ? 'bg-blue-100 text-blue-600' :
                          event.type === 'assignment' ? 'bg-red-100 text-red-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          {event.type === 'class' ? '🎓' : event.type === 'assignment' ? '📝' : '👥'}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{event.title}</h3>
                          <p className="text-sm text-gray-600">{event.time} • {event.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      View calendar →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-center rounded-lg bg-primary-50 p-4 text-primary-700">
                    <span className="mr-2">🎧</span>
                    In-class review handled by teacher
                  </div>
                  <button className="flex items-center justify-center p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                    <span className="mr-2">📚</span>
                    View Courses
                  </button>
                  <button className="flex items-center justify-center p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                    <span className="mr-2">💬</span>
                    Send Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentMainDashboard;








