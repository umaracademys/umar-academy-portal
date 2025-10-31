import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import StudentRegistrationForm from '../components/StudentRegistrationForm';
import TeacherRegistrationForm from '../components/TeacherRegistrationForm';
import AdminRegistrationForm from '../components/AdminRegistrationForm';
import PermissionManager from '../components/PermissionManager';
import DataManager from '../components/DataManager';
import StudentList from '../components/StudentList';
import StudentProfile from '../components/StudentProfile';
import StudentEnrollment from '../components/StudentEnrollment';
import StudentPayments from '../components/StudentPayments';
import StudentProgress from '../components/StudentProgress';
import StudentCommunication from '../components/StudentCommunication';
import StudentCredentials from '../components/StudentCredentials';
import StudentAnalytics from '../components/StudentAnalytics';
import StudentBulkOperations from '../components/StudentBulkOperations';
import TeacherList from '../components/TeacherList';
import TeacherProfile from '../components/TeacherProfile';
import TeacherAssignments from '../components/TeacherAssignments';
import TeacherPayroll from '../components/TeacherPayroll';
import TeacherPerformance from '../components/TeacherPerformance';
import TeacherAttendance from '../components/TeacherAttendance';
import TeacherCommunication from '../components/TeacherCommunication';
import TeacherCredentials from '../components/TeacherCredentials';
import TeacherAnalytics from '../components/TeacherAnalytics';
import TeacherBulkOperations from '../components/TeacherBulkOperations';
import DebugPanel from '../components/DebugPanel';
import AdminRecitationReview from '../components/AdminRecitationReview';
import { useData } from '../contexts/DataContext';

const SuperAdminDashboard: React.FC = () => {
  const { students, teachers, admins, loading, error, adminNotifications, recitationReviews, refreshNotifications } = useData();
  
  // Debug logging
  console.log('🔍 SuperAdminDashboard - Data state:', { 
    students: students.length, 
    teachers: teachers.length, 
    admins: admins.length, 
    loading, 
    error 
  });
  const [activeSection, setActiveSection] = useState('overview');
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [showPermissionManager, setShowPermissionManager] = useState(false);
  const [showDataManager, setShowDataManager] = useState(false);

  // Student Management State
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentProfile, setShowStudentProfile] = useState(false);
  const [showStudentEnrollment, setShowStudentEnrollment] = useState(false);
  const [showStudentPayments, setShowStudentPayments] = useState(false);
  const [showStudentProgress, setShowStudentProgress] = useState(false);
  const [showStudentCommunication, setShowStudentCommunication] = useState(false);
  const [showStudentCredentials, setShowStudentCredentials] = useState(false);
  const [showStudentAnalytics, setShowStudentAnalytics] = useState(false);
  const [showStudentBulkOperations, setShowStudentBulkOperations] = useState(false);

  // Teacher Management State
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [showTeacherProfile, setShowTeacherProfile] = useState(false);
  const [showTeacherAssignments, setShowTeacherAssignments] = useState(false);
  const [showTeacherPayroll, setShowTeacherPayroll] = useState(false);
  const [showTeacherPerformance, setShowTeacherPerformance] = useState(false);
  const [showTeacherAttendance, setShowTeacherAttendance] = useState(false);
  const [showTeacherCommunication, setShowTeacherCommunication] = useState(false);
  const [showTeacherCredentials, setShowTeacherCredentials] = useState(false);
  const [showTeacherAnalytics, setShowTeacherAnalytics] = useState(false);
  const [showTeacherBulkOperations, setShowTeacherBulkOperations] = useState(false);
  const [showRecitationReview, setShowRecitationReview] = useState(false);

  // Get pending recitation reviews count
  const pendingReviewsCount = recitationReviews.filter(r => r.status === 'pending_review').length;
  const unreadNotificationsCount = adminNotifications.filter(n => !n.read).length;

  const systemStats = {
    totalUsers: students.length + teachers.length + admins.length,
    totalStudents: students.length,
    totalTeachers: teachers.length,
    totalAdmins: admins.length,
    activeCourses: 45,
    totalRevenue: students.reduce((sum, s) => sum + s.tuitionFee, 0),
    systemHealth: 98.5,
    monthlyRevenue: students.reduce((sum, s) => sum + s.tuitionFee, 0),
    annualRevenue: students.reduce((sum, s) => sum + s.tuitionFee, 0) * 12,
    activeUsers: students.filter(s => s.status === 'active').length + teachers.filter(t => t.status === 'active').length,
    systemUptime: 99.9,
    dataBackup: 'Last backup: 2 hours ago',
    securityStatus: 'All systems secure',
    pendingApprovals: 3,
    systemAlerts: 1
  };

  // Overview Section - Boss Dashboard
  const OverviewSection = () => (
    <div>
      {/* Boss Header */}
      <div className="mb-8 bg-gradient-to-r from-red-600 to-red-800 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">👑 SUPER ADMIN CONTROL CENTER</h1>
            <p className="text-red-100 mt-2 text-lg">Ultimate system authority - Complete control over Umar Academy</p>
            <div className="mt-3 flex items-center space-x-4">
              <span className="bg-red-500 px-3 py-1 rounded-full text-sm font-bold">BOSS MODE</span>
              <span className="bg-yellow-500 px-3 py-1 rounded-full text-sm font-bold">FULL ACCESS</span>
              <span className="bg-green-500 px-3 py-1 rounded-full text-sm font-bold">SYSTEM OWNER</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowRecitationReview(true)}
              className="px-6 py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-all shadow-md relative"
            >
              📖 Review Recitations
              {pendingReviewsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {pendingReviewsCount}
                </span>
              )}
            </button>
            <Link
              to="/assignments"
              className="px-6 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-all shadow-md relative"
            >
              Assignments
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </Link>
            <div className="text-right">
              <p className="text-sm text-red-100">System Health</p>
              <p className="text-3xl font-bold">{systemStats.systemHealth}%</p>
              <p className="text-red-100 text-xs">Uptime: {systemStats.systemUptime}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Users" value={systemStats.totalUsers} icon="👥" color="green" />
        <StatCard title="Total Students" value={systemStats.totalStudents} icon="👨‍🎓" color="blue" />
        <StatCard title="Total Teachers" value={systemStats.totalTeachers} icon="👨‍🏫" color="purple" />
        <StatCard title="Total Revenue" value={`$${systemStats.totalRevenue.toLocaleString()}`} icon="💰" color="gold" />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
          <div className="ml-3 h-px flex-1 bg-gray-200"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Register Student */}
          <button 
            onClick={() => setShowStudentForm(true)}
            className="group relative overflow-hidden bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-transparent transition-all duration-300 hover:shadow-xl"
            style={{ 
              backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2E4D32';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#2E4D32' }}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-green-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Register Student</h4>
            <p className="text-sm text-gray-600">Add new student with complete profile and enrollment details</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Student Portal</span>
            </div>
          </button>

          {/* Register Teacher */}
          <button 
            onClick={() => setShowTeacherForm(true)}
            className="group relative overflow-hidden bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-transparent transition-all duration-300 hover:shadow-xl"
            style={{ 
              backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#E7AA39';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E7AA39' }}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-yellow-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Register Teacher</h4>
            <p className="text-sm text-gray-600">Add new teacher with payroll and permission settings</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Teacher Portal</span>
            </div>
          </button>

          {/* Register Admin */}
          <button 
            onClick={() => setShowAdminForm(true)}
            className="group relative overflow-hidden bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-transparent transition-all duration-300 hover:shadow-xl"
            style={{ 
              backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2E4D32';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#2E4D32' }}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-green-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Register Admin</h4>
            <p className="text-sm text-gray-600">Add new administrator with system access rights</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin Portal</span>
            </div>
          </button>
        </div>
      </div>
      {/* Boss Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card title="💰 Financial Control">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Monthly Revenue</span>
              <span className="text-2xl font-bold text-green-600">${systemStats.monthlyRevenue}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Annual Projection</span>
              <span className="text-xl font-bold text-blue-600">${systemStats.annualRevenue}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Students</span>
              <span className="text-lg font-bold text-purple-600">{systemStats.totalStudents}</span>
            </div>
            <button className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              📊 Generate Financial Report
            </button>
          </div>
        </Card>

        <Card title="🔒 Security Command">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Security Status</span>
              <span className="text-green-600 font-bold">✅ {systemStats.securityStatus}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Data Backup</span>
              <span className="text-blue-600 font-bold">📁 {systemStats.dataBackup}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">System Uptime</span>
              <span className="text-green-600 font-bold">⚡ {systemStats.systemUptime}%</span>
            </div>
            <button className="w-full mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
              🔒 Security Audit
            </button>
          </div>
        </Card>

        <Card title="📊 System Analytics">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Users</span>
              <span className="text-lg font-bold text-blue-600">{systemStats.totalUsers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Users</span>
              <span className="text-lg font-bold text-green-600">{systemStats.activeUsers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">System Alerts</span>
              <span className="text-lg font-bold text-red-600">{systemStats.systemAlerts}</span>
            </div>
            <button className="w-full mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
              📈 View Analytics
            </button>
          </div>
        </Card>
      </div>

      {/* Boss System Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card title="🎛️ System Control Panel">
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition text-center">
              <div className="text-2xl mb-2">🔄</div>
              <div className="font-bold text-red-700">System Restart</div>
            </button>
            <button className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-center">
              <div className="text-2xl mb-2">💾</div>
              <div className="font-bold text-blue-700">Backup Data</div>
            </button>
            <button className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition text-center">
              <div className="text-2xl mb-2">🔒</div>
              <div className="font-bold text-green-700">Security Scan</div>
            </button>
            <button className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition text-center">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-bold text-purple-700">Generate Reports</div>
            </button>
          </div>
        </Card>

        <Card title="🚨 System Alerts & Status">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-600">⚠️</span>
                <span className="text-sm font-medium">Pending Approvals</span>
              </div>
              <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">
                {systemStats.pendingApprovals}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span className="text-sm font-medium">System Status</span>
              </div>
              <span className="text-green-600 font-bold">All Good</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-blue-600">📊</span>
                <span className="text-sm font-medium">Data Backup</span>
              </div>
              <span className="text-blue-600 font-bold">Recent</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  // System Management Section
  const SystemSection = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">🔧 System Management</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button 
          onClick={() => setShowPermissionManager(true)}
          className="p-6 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-lg text-center"
        >
          <div className="text-sm font-medium">Manage Permissions</div>
        </button>
        <button 
          onClick={() => setShowDataManager(true)}
          className="p-6 text-white rounded-lg transition shadow-lg text-center"
          style={{ backgroundColor: '#2E4D32' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#253d28'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2E4D32'}
        >
          <div className="text-sm font-medium">Data Management</div>
        </button>
        <button className="p-6 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition text-center">
          <div className="text-sm font-medium">Financial Reports</div>
        </button>
        <button className="p-6 bg-primary-800 text-white rounded-lg hover:bg-primary-900 transition text-center">
          <div className="text-sm font-medium">System Settings</div>
        </button>
      </div>

      {/* System Alerts */}
      <div className="mt-6">
        <Card title="🚨 System Alerts">
          <div className="space-y-3">
            <div className="p-4 rounded-lg border-l-4 border-gold-500 bg-gold-50">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-semibold text-gray-900">Server CPU Usage High</h4>
                <span className="text-xs text-gray-500">30 mins ago</span>
              </div>
              <p className="text-sm text-gray-700">CPU usage at 78%</p>
            </div>
            <div className="p-4 rounded-lg border-l-4 border-primary-500 bg-primary-50">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-semibold text-gray-900">Backup Successful</h4>
                <span className="text-xs text-gray-500">10 mins ago</span>
              </div>
              <p className="text-sm text-gray-700">Daily backup completed</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );


  // Students Management
  const StudentsSection = () => {
    const handleStudentSelect = (student: any) => {
      console.log('🔍 handleStudentSelect called with student:', student);
      setSelectedStudent(student);
      setShowStudentProfile(true);
      console.log('🔍 Modal should now be visible - showStudentProfile:', true);
    };

    const handleEditStudent = (student: any) => {
      setSelectedStudent(student);
      setShowStudentProfile(true);
    };

    const handleDeleteStudent = (_studentId: string) => {
      if (window.confirm('Are you sure you want to delete this student?')) {
        // In a real app, this would delete the student
        alert('Student deleted successfully');
      }
    };

    return (
      <div>
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <div className="text-center p-4">
              <div className="text-4xl mb-2">📊</div>
              <h3 className="font-bold text-gray-900 mb-2">Analytics</h3>
              <p className="text-sm text-gray-600 mb-3">Student performance insights</p>
              <button 
                onClick={() => setShowStudentAnalytics(true)}
                className="w-full px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition"
              >
                View Analytics
              </button>
            </div>
          </Card>
          
          <Card>
            <div className="text-center p-4">
              <div className="text-4xl mb-2">🔐</div>
              <h3 className="font-bold text-gray-900 mb-2">Credentials</h3>
              <p className="text-sm text-gray-600 mb-3">Manage student access</p>
              <button 
                onClick={() => setShowStudentCredentials(true)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Manage Access
              </button>
            </div>
          </Card>
          
          <Card>
            <div className="text-center p-4">
              <div className="text-4xl mb-2">⚡</div>
              <h3 className="font-bold text-gray-900 mb-2">Bulk Operations</h3>
              <p className="text-sm text-gray-600 mb-3">Import/export students</p>
              <button 
                onClick={() => setShowStudentBulkOperations(true)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Bulk Actions
              </button>
            </div>
          </Card>
          
          <Card>
            <div className="text-center p-4">
              <div className="text-4xl mb-2">👥</div>
              <h3 className="font-bold text-gray-900 mb-2">All Students</h3>
              <p className="text-sm text-gray-600 mb-3">View complete student directory</p>
              <button className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                View Directory
              </button>
            </div>
          </Card>
        </div>

        {/* Student List */}
        <StudentList
          onStudentSelect={handleStudentSelect}
          onEditStudent={handleEditStudent}
          onDeleteStudent={handleDeleteStudent}
          onAddStudent={() => setShowStudentForm(true)}
          onCredentials={(student) => {
            setSelectedStudent(student);
            setShowStudentCredentials(true);
          }}
          onAnalytics={(student) => {
            setSelectedStudent(student);
            setShowStudentAnalytics(true);
          }}
          onBulkOperations={() => setShowStudentBulkOperations(true)}
        />
      </div>
    );
  };

  // Teachers Management
  const TeachersSection = () => {
    const handleTeacherSelect = (teacher: any) => {
      setSelectedTeacher(teacher);
      setShowTeacherProfile(true);
    };

    const handleEditTeacher = (teacher: any) => {
      setSelectedTeacher(teacher);
      setShowTeacherProfile(true);
    };

    const handleDeleteTeacher = (_teacherId: string) => {
      if (window.confirm('Are you sure you want to delete this teacher?')) {
        // In a real app, this would delete the teacher
        alert('Teacher deleted successfully');
      }
    };

    return (
      <div>
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <div className="text-center p-4">
              <div className="text-4xl mb-2">📊</div>
              <h3 className="font-bold text-gray-900 mb-2">Analytics</h3>
              <p className="text-sm text-gray-600 mb-3">Teacher performance insights</p>
              <button 
                onClick={() => setShowTeacherAnalytics(true)}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
              >
                View Analytics
              </button>
            </div>
          </Card>
          
          <Card>
            <div className="text-center p-4">
              <div className="text-4xl mb-2">🔐</div>
              <h3 className="font-bold text-gray-900 mb-2">Credentials</h3>
              <p className="text-sm text-gray-600 mb-3">Manage teacher access</p>
              <button 
                onClick={() => setShowTeacherCredentials(true)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Manage Access
              </button>
            </div>
          </Card>
          
          <Card>
            <div className="text-center p-4">
              <div className="text-4xl mb-2">⚡</div>
              <h3 className="font-bold text-gray-900 mb-2">Bulk Operations</h3>
              <p className="text-sm text-gray-600 mb-3">Import/export teachers</p>
              <button 
                onClick={() => setShowTeacherBulkOperations(true)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Bulk Actions
              </button>
            </div>
          </Card>
          
          <Card>
            <div className="text-center p-4">
              <div className="text-4xl mb-2">👥</div>
              <h3 className="font-bold text-gray-900 mb-2">All Teachers</h3>
              <p className="text-sm text-gray-600 mb-3">View complete teacher directory</p>
              <button className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                View Directory
              </button>
            </div>
          </Card>
        </div>

        {/* Teacher List */}
        <TeacherList
          onTeacherSelect={handleTeacherSelect}
          onEditTeacher={handleEditTeacher}
          onDeleteTeacher={handleDeleteTeacher}
          onAddTeacher={() => setShowTeacherForm(true)}
          onCredentials={(teacher) => {
            setSelectedTeacher(teacher);
            setShowTeacherCredentials(true);
          }}
          onAnalytics={(teacher) => {
            setSelectedTeacher(teacher);
            setShowTeacherAnalytics(true);
          }}
          onBulkOperations={() => setShowTeacherBulkOperations(true)}
        />
      </div>
    );
  };

  // Render active section
  const renderSection = () => {
    switch (activeSection) {
      case 'overview': return <OverviewSection />;
      case 'students': return <StudentsSection />;
      case 'teachers': return <TeachersSection />;
      case 'settings': return <SystemSection />;
      default: return <OverviewSection />;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading data from backend...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={() => window.location.reload()}
                        className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {renderSection()}
          </div>
        </main>
      </div>

      {/* Registration Modals */}
      {showStudentForm && (
        <StudentRegistrationForm 
          onClose={() => setShowStudentForm(false)} 
          student={selectedStudent}
          isEdit={!!selectedStudent}
        />
      )}
      {showTeacherForm && <TeacherRegistrationForm onClose={() => setShowTeacherForm(false)} />}
      {showAdminForm && <AdminRegistrationForm onClose={() => setShowAdminForm(false)} />}
      {showPermissionManager && <PermissionManager onClose={() => setShowPermissionManager(false)} />}
      {showDataManager && <DataManager onClose={() => setShowDataManager(false)} />}

      {/* Teacher Management Modals */}
      {showTeacherProfile && selectedTeacher && (
        <TeacherProfile
          teacher={selectedTeacher}
          onClose={() => {
            setShowTeacherProfile(false);
            setSelectedTeacher(null);
          }}
          onEdit={(teacher) => {
            setShowTeacherProfile(false);
            setSelectedTeacher(teacher);
            setShowTeacherProfile(true);
          }}
          onAssignments={() => {
            setShowTeacherProfile(false);
            setShowTeacherAssignments(true);
          }}
          onPayroll={() => {
            setShowTeacherProfile(false);
            setShowTeacherPayroll(true);
          }}
          onPerformance={() => {
            setShowTeacherProfile(false);
            setShowTeacherPerformance(true);
          }}
          onAttendance={() => {
            setShowTeacherProfile(false);
            setShowTeacherAttendance(true);
          }}
          onCommunication={() => {
            setShowTeacherProfile(false);
            setShowTeacherCommunication(true);
          }}
        />
      )}

      {showTeacherAssignments && selectedTeacher && (
        <TeacherAssignments
          teacher={selectedTeacher}
          onClose={() => {
            setShowTeacherAssignments(false);
            setSelectedTeacher(null);
          }}
        />
      )}

      {showTeacherPayroll && selectedTeacher && (
        <TeacherPayroll
          teacher={selectedTeacher}
          onClose={() => {
            setShowTeacherPayroll(false);
            setSelectedTeacher(null);
          }}
        />
      )}

      {showTeacherPerformance && selectedTeacher && (
        <TeacherPerformance
          teacher={selectedTeacher}
          onClose={() => {
            setShowTeacherPerformance(false);
            setSelectedTeacher(null);
          }}
        />
      )}

      {showTeacherAttendance && selectedTeacher && (
        <TeacherAttendance
          teacher={selectedTeacher}
          onClose={() => {
            setShowTeacherAttendance(false);
            setSelectedTeacher(null);
          }}
        />
      )}

      {showTeacherCommunication && selectedTeacher && (
        <TeacherCommunication
          teacher={selectedTeacher}
          onClose={() => {
            setShowTeacherCommunication(false);
            setSelectedTeacher(null);
          }}
        />
      )}

      {/* Student Management Modals */}
      {showStudentProfile && selectedStudent && (
        <>
          {console.log('🔍 Rendering StudentProfile modal with student:', selectedStudent)}
          <StudentProfile
            student={selectedStudent}
            onClose={() => {
              console.log('🔍 Closing StudentProfile modal');
              setShowStudentProfile(false);
              setSelectedStudent(null);
            }}
            onEdit={(student) => {
              console.log('🔍 Edit button clicked, opening edit form for:', student);
              setSelectedStudent(student);
              setShowStudentProfile(false);
              setShowStudentForm(true);
            }}
          />
        </>
      )}

      {showStudentEnrollment && selectedStudent && (
        <StudentEnrollment
          student={selectedStudent}
          onClose={() => {
            setShowStudentEnrollment(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {showStudentPayments && selectedStudent && (
        <StudentPayments
          student={selectedStudent}
          onClose={() => {
            setShowStudentPayments(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {showStudentProgress && selectedStudent && (
        <StudentProgress
          student={selectedStudent}
          onClose={() => {
            setShowStudentProgress(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {showStudentCommunication && selectedStudent && (
        <StudentCommunication
          student={selectedStudent}
          onClose={() => {
            setShowStudentCommunication(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {showStudentCredentials && (
        <StudentCredentials
          student={selectedStudent || { id: 'general', name: 'System Access Management' }}
          onClose={() => {
            setShowStudentCredentials(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {showStudentAnalytics && (
        <StudentAnalytics
          student={selectedStudent || { id: 'general', name: 'System Analytics' }}
          onClose={() => {
            setShowStudentAnalytics(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {showStudentBulkOperations && (
        <StudentBulkOperations
          onClose={() => setShowStudentBulkOperations(false)}
        />
      )}

      {/* Teacher Advanced Features Modals */}
      {showTeacherCredentials && (
        <TeacherCredentials
          teacher={selectedTeacher || { id: 'general', name: 'System Access Management' }}
          onClose={() => {
            setShowTeacherCredentials(false);
            setSelectedTeacher(null);
          }}
        />
      )}

      {showTeacherAnalytics && (
        <TeacherAnalytics
          teacher={selectedTeacher || { id: 'general', name: 'System Analytics' }}
          onClose={() => {
            setShowTeacherAnalytics(false);
            setSelectedTeacher(null);
          }}
        />
      )}

      {showTeacherBulkOperations && (
        <TeacherBulkOperations
          onClose={() => setShowTeacherBulkOperations(false)}
        />
      )}

      {/* Recitation Review Modal */}
      {showRecitationReview && (
        <AdminRecitationReview
          onClose={() => setShowRecitationReview(false)}
          onSuccess={() => {
            setShowRecitationReview(false);
            refreshNotifications();
          }}
        />
      )}
      
      <DebugPanel />
    </div>
  );
};

export default SuperAdminDashboard;
