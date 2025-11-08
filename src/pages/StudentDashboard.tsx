import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import DebugPanel from '../components/DebugPanel';
import { Course, Assignment } from '../types';

const StudentDashboard: React.FC = () => {
  // Mock data
  const enrolledCourses: Course[] = [
    { id: '1', name: 'Advanced Mathematics', code: 'MATH-401', instructor: 'Dr. Ibrahim Yusuf', students: 32, schedule: 'Mon, Wed, Fri - 9:00 AM' },
    { id: '2', name: 'Islamic Studies', code: 'ISL-201', instructor: 'Mr. Hassan Ali', students: 45, schedule: 'Tue, Thu - 11:00 AM' },
    { id: '3', name: 'Physics', code: 'PHY-301', instructor: 'Ms. Zainab Ahmed', students: 28, schedule: 'Mon, Wed - 2:00 PM' },
    { id: '4', name: 'Arabic Language', code: 'ARB-101', instructor: 'Dr. Fatima Rahman', students: 38, schedule: 'Tue, Thu - 9:00 AM' },
  ];

  const assignments: Assignment[] = [
    { id: '1', title: 'Calculus Problem Set 5', course: 'MATH-401', dueDate: 'Oct 25, 2025', status: 'pending' },
    { id: '2', title: 'Quran Memorization - Surah Al-Mulk', course: 'ISL-201', dueDate: 'Oct 26, 2025', status: 'pending' },
    { id: '3', title: 'Physics Lab Report', course: 'PHY-301', dueDate: 'Oct 28, 2025', status: 'submitted' },
    { id: '4', title: 'Arabic Essay', course: 'ARB-101', dueDate: 'Oct 30, 2025', status: 'pending' },
    { id: '5', title: 'Math Quiz 3', course: 'MATH-401', dueDate: 'Oct 22, 2025', status: 'graded', grade: 92 },
  ];

  const upcomingClasses = [
    { id: '1', course: 'Advanced Mathematics', time: 'Today, 9:00 AM', room: 'Room 301', instructor: 'Dr. Ibrahim Yusuf' },
    { id: '2', course: 'Physics', time: 'Today, 2:00 PM', room: 'Room 405', instructor: 'Ms. Zainab Ahmed' },
    { id: '3', course: 'Islamic Studies', time: 'Tomorrow, 11:00 AM', room: 'Room 102', instructor: 'Mr. Hassan Ali' },
  ];

  const grades = [
    { course: 'MATH-401', grade: 'A-', percentage: 88 },
    { course: 'ISL-201', grade: 'A+', percentage: 96 },
    { course: 'PHY-301', grade: 'B+', percentage: 85 },
    { course: 'ARB-101', grade: 'A', percentage: 91 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gold-100 text-gold-800 border-gold-300';
      case 'submitted':
        return 'bg-cream-200 text-primary-800 border-gold-300';
      case 'graded':
        return 'bg-primary-100 text-primary-800 border-primary-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
            <p className="text-gray-600 mt-2">Track your courses, assignments, and academic progress.</p>
          </div>
          <Link
            to="/my-assignments"
            className="px-6 py-3 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
            style={{ backgroundColor: '#2E4D32' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#253d28'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2E4D32'}
          >
            View My Assignments
          </Link>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Enrolled Courses" value={4} icon="EC" />
          <StatCard title="Pending Assignments" value={3} icon="PA" />
          <StatCard title="Average Grade" value="90%" icon="AG" />
          <StatCard title="Attendance" value="95%" icon="AT" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Upcoming Classes */}
          <div className="lg:col-span-2">
            <Card title="Upcoming Classes">
              <div className="space-y-3">
                {upcomingClasses.map((cls) => (
                  <div key={cls.id} className="p-4 bg-gradient-to-r from-cream-100 to-cream-200 rounded-lg border border-gold-300">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{cls.course}</h4>
                        <p className="text-sm text-gray-600">👨‍🏫 {cls.instructor}</p>
                      </div>
                      <span className="bg-primary-600 text-white text-xs px-3 py-1 rounded-full">
                        {cls.room}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">🕐 {cls.time}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Current Grades */}
          <Card title="Current Grades">
            <div className="space-y-3">
              {grades.map((grade, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">{grade.course}</span>
                    <span className="text-lg font-bold text-primary-600">{grade.grade}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full" 
                      style={{ width: `${grade.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">{grade.percentage}%</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Courses */}
          <Card title="My Courses">
            <div className="space-y-3">
              {enrolledCourses.map((course) => (
                <div key={course.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{course.name}</h4>
                      <p className="text-sm text-gray-600">{course.code}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">👨‍🏫 {course.instructor}</p>
                  <p className="text-sm text-gray-600">📅 {course.schedule}</p>
                  <button className="mt-2 text-xs bg-primary-600 text-white px-3 py-1 rounded hover:bg-primary-700 shadow-sm">
                    View Materials
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Assignments */}
          <Card title="Assignments">
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div key={assignment.id} className={`p-3 rounded-lg border ${getStatusColor(assignment.status)}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{assignment.title}</p>
                      <p className="text-sm text-gray-600">{assignment.course}</p>
                    </div>
                    <span className="text-xs font-semibold uppercase px-2 py-1 rounded bg-white">
                      {assignment.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">Due: {assignment.dueDate}</p>
                    {assignment.status === 'graded' && assignment.grade && (
                      <span className="text-sm font-bold text-green-700">{assignment.grade}%</span>
                    )}
                  </div>
                  {assignment.status === 'pending' && (
                    <span className="mt-2 inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                      Awaiting in-class check
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      
      <DebugPanel />
    </div>
  );
};

export default StudentDashboard;
