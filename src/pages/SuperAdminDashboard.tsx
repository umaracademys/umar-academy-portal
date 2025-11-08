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
import AdminTicketManagement from '../components/AdminTicketManagement';
import AssignTicketForm from '../components/AssignTicketForm';
import { useData } from '../contexts/DataContext';
import { useBackendData } from '../contexts/BackendDataContext';

const SuperAdminDashboard: React.FC = () => {
  const { students, teachers, admins, loading, error, adminNotifications, recitationReviews, refreshNotifications } = useData();
  
  // Debug logging (commented out - uncomment for debugging)
  // console.log('🔍 SuperAdminDashboard - Data state:', { 
  //   students: students.length, 
  //   teachers: teachers.length, 
  //   admins: admins.length, 
  //   loading, 
  //   error 
  // });
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
  const [showTicketManagement, setShowTicketManagement] = useState(false);
  const [showAssignTicket, setShowAssignTicket] = useState(false);

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

  // Overview Section - refreshed layout
  const OverviewSection = () => (
    <div className="space-y-10">
      <div className="rounded-3xl border border-accent-soft bg-white px-6 py-6 shadow-sm sm:px-10 sm:py-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-primary-soft">Super Admin Control Center</span>
            <h1 className="text-3xl font-semibold text-primary">Full Visibility Across Umar Academy</h1>
            <p className="max-w-3xl text-sm text-primary-soft">
              Monitor academy-wide metrics, handle escalations, and coordinate cross-team workflows from one mission control.
              Use the core actions to review recitations, manage tickets, or assign follow-up work instantly.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-soft-primary px-3 py-1 text-xs font-semibold text-primary">System Health {systemStats.systemHealth}%</span>
              <span className="rounded-full bg-soft-accent px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">Uptime {systemStats.systemUptime}%</span>
              <span className="rounded-full border border-[rgba(var(--color-primary-rgb),0.25)] px-3 py-1 text-xs font-semibold text-primary">Pending Approvals {systemStats.pendingApprovals}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              onClick={() => setShowRecitationReview(true)}
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)]"
            >
              Review Recitations
              {pendingReviewsCount > 0 && (
                <span className="ml-2 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-primary">
                  {pendingReviewsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowTicketManagement(true)}
              className="inline-flex items-center justify-center rounded-full border border-[rgba(var(--color-primary-rgb),0.35)] px-5 py-3 text-sm font-semibold text-primary transition hover:bg-soft-primary"
            >
              Manage Tickets
            </button>
            <button
              onClick={() => setShowAssignTicket(true)}
              className="inline-flex items-center justify-center rounded-full border border-[rgba(var(--color-accent-rgb),0.45)] px-5 py-3 text-sm font-semibold text-[var(--color-accent)] transition hover:bg-soft-accent"
            >
              Assign Ticket
            </button>
            <Link
              to="/assignments"
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-accent-rgb),0.85)]"
            >
              View Assignments
              {unreadNotificationsCount > 0 && (
                <span className="ml-2 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-[var(--color-accent)]">
                  {unreadNotificationsCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={systemStats.totalUsers} icon="US" />
        <StatCard title="Total Students" value={systemStats.totalStudents} icon="ST" />
        <StatCard title="Total Teachers" value={systemStats.totalTeachers} icon="TC" />
        <StatCard title="Total Revenue" value={`$${systemStats.totalRevenue.toLocaleString()}`} icon="REV" />
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-primary">Quick Actions</h3>
          <div className="h-px flex-1 bg-[rgba(var(--color-accent-rgb),0.3)]"></div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
          <button
            onClick={() => setShowStudentForm(true)}
            className="rounded-2xl border border-accent-soft bg-white px-5 py-5 text-left shadow-sm transition hover:bg-soft-accent"
          >
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-soft-primary text-sm font-semibold text-primary">
              ST
            </div>
            <h4 className="text-base font-semibold text-primary">Register Student</h4>
            <p className="mt-1 text-sm text-primary-soft">
              Create a new student profile with enrollment and program details.
            </p>
          </button>

          <button
            onClick={() => setShowTeacherForm(true)}
            className="rounded-2xl border border-accent-soft bg-white px-5 py-5 text-left shadow-sm transition hover:bg-soft-accent"
          >
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-soft-primary text-sm font-semibold text-primary">
              TC
            </div>
            <h4 className="text-base font-semibold text-primary">Register Teacher</h4>
            <p className="mt-1 text-sm text-primary-soft">
              Capture payroll settings, availability, and permission levels.
            </p>
          </button>

          <button
            onClick={() => setShowAdminForm(true)}
            className="rounded-2xl border border-accent-soft bg-white px-5 py-5 text-left shadow-sm transition hover:bg-soft-accent"
          >
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-soft-primary text-sm font-semibold text-primary">
              AD
            </div>
            <h4 className="text-base font-semibold text-primary">Register Admin</h4>
            <p className="mt-1 text-sm text-primary-soft">
              Provision admin access and connect them to the correct workflows.
            </p>
          </button>

          <button
            onClick={() => setShowPermissionManager(true)}
            className="rounded-2xl border border-accent-soft bg-white px-5 py-5 text-left shadow-sm transition hover:bg-soft-accent"
          >
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-soft-primary text-sm font-semibold text-primary">
              PM
            </div>
            <h4 className="text-base font-semibold text-primary">Manage Permissions</h4>
            <p className="mt-1 text-sm text-primary-soft">
              Adjust team access for sensitive features and system areas.
            </p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card title="Financial Snapshot">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-primary-soft">
              <span>Monthly Revenue</span>
              <span className="text-lg font-semibold text-primary">${systemStats.monthlyRevenue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-primary-soft">
              <span>Annual Projection</span>
              <span className="text-lg font-semibold text-primary">${systemStats.annualRevenue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-primary-soft">
              <span>Active Students</span>
              <span className="text-lg font-semibold text-primary">{systemStats.totalStudents}</span>
            </div>
            <button
              onClick={() => setActiveSection('financials')}
              className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-[rgba(var(--color-primary-rgb),0.35)] px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft-primary"
            >
              Open financial reporting
            </button>
          </div>
        </Card>

        <Card title="Security & Reliability">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-primary-soft">
              <span>Security Status</span>
              <span className="text-lg font-semibold text-primary">{systemStats.securityStatus}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-primary-soft">
              <span>Data Backup</span>
              <span className="text-lg font-semibold text-primary">{systemStats.dataBackup}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-primary-soft">
              <span>System Uptime</span>
              <span className="text-lg font-semibold text-primary">{systemStats.systemUptime}%</span>
            </div>
            <button
              onClick={() => setActiveSection('reports')}
              className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-[rgba(var(--color-accent-rgb),0.45)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)] transition hover:bg-soft-accent"
            >
              Run security audit
            </button>
          </div>
        </Card>

        <Card title="Usage & Alerts">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-primary-soft">
              <span>Total Users</span>
              <span className="text-lg font-semibold text-primary">{systemStats.totalUsers}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-primary-soft">
              <span>Active Users</span>
              <span className="text-lg font-semibold text-primary">{systemStats.activeUsers}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-primary-soft">
              <span>System Alerts</span>
              <span className="text-lg font-semibold text-primary">{systemStats.systemAlerts}</span>
            </div>
            <button
              onClick={() => setActiveSection('activities')}
              className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-[rgba(var(--color-primary-rgb),0.35)] px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft-primary"
            >
              View recent activity
            </button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card title="System Controls">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'System Restart', action: () => {}, description: 'Schedule a rolling restart with notifications.' },
              { label: 'Backup Data', action: () => setShowDataManager(true), description: 'Trigger manual backup or download snapshots.' },
              { label: 'Security Scan', action: () => setActiveSection('reports'), description: 'Run integrity checks across services.' },
              { label: 'Generate Reports', action: () => setActiveSection('reports'), description: 'Export KPI reports for stakeholders.' },
            ].map((control) => (
              <button
                key={control.label}
                onClick={control.action}
                className="rounded-2xl border border-accent-soft bg-white px-4 py-3 text-left text-sm transition hover:bg-soft-primary"
              >
                <p className="font-semibold text-primary">{control.label}</p>
                <p className="mt-1 text-xs text-primary-soft">{control.description}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card title="System Alerts & Status">
          <div className="space-y-3 text-sm text-primary-soft">
            <div className="flex items-center justify-between rounded-xl border border-accent-soft bg-soft-accent px-4 py-3">
              <span className="font-semibold text-[var(--color-accent)]">Pending approvals</span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
                {systemStats.pendingApprovals}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-accent-soft bg-soft-primary px-4 py-3">
              <span className="font-semibold text-primary">System status</span>
              <span className="text-sm font-semibold text-primary">All services operational</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-accent-soft bg-white px-4 py-3">
              <span className="font-semibold text-primary">Latest backup</span>
              <span className="text-sm font-semibold text-primary">{systemStats.dataBackup}</span>
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
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              id: 'student-analytics',
              badge: 'AN',
              title: 'Analytics',
              description: 'Review student performance trends and milestones.',
              action: () => setShowStudentAnalytics(true),
              button: 'Open analytics',
            },
            {
              id: 'student-credentials',
              badge: 'CR',
              title: 'Credentials',
              description: 'Manage login credentials and portal access.',
              action: () => setShowStudentCredentials(true),
              button: 'Manage access',
            },
            {
              id: 'student-bulk',
              badge: 'BL',
              title: 'Bulk Operations',
              description: 'Import, export, or batch update student records.',
              action: () => setShowStudentBulkOperations(true),
              button: 'Run bulk action',
            },
            {
              id: 'student-directory',
              badge: 'SD',
              title: 'All Students',
              description: 'Browse and filter the complete student directory.',
              action: () => setActiveSection('students'),
              button: 'View directory',
            },
          ].map((item) => (
            <Card key={item.id}>
              <div className="flex h-full flex-col gap-4 rounded-2xl border border-accent-soft bg-white px-4 py-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-soft-primary text-xs font-semibold text-primary">
                  {item.badge}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-primary">{item.title}</h3>
                  <p className="mt-1 text-sm text-primary-soft">{item.description}</p>
                </div>
                <button
                  onClick={item.action}
                  className="inline-flex items-center justify-center rounded-full border border-[rgba(var(--color-primary-rgb),0.35)] px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft-primary"
                >
                  {item.button}
                </button>
              </div>
            </Card>
          ))}
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
      console.log('🔍 Edit teacher clicked:', teacher);
      setSelectedTeacher(teacher);
      setShowTeacherProfile(false);
      setShowTeacherForm(true);
    };

    const handleDeleteTeacher = (_teacherId: string) => {
      if (window.confirm('Are you sure you want to delete this teacher?')) {
        // In a real app, this would delete the teacher
        alert('Teacher deleted successfully');
      }
    };

    return (
      <div>
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              id: 'teach-analytics',
              badge: 'AN',
              title: 'Analytics',
              description: 'Monitor performance, coverage, and load balancing.',
              action: () => setShowTeacherAnalytics(true),
              button: 'Open analytics',
            },
            {
              id: 'teach-credentials',
              badge: 'CR',
              title: 'Credentials',
              description: 'Manage onboarding documents and access credentials.',
              action: () => {
                if (!selectedTeacher && teachers.length > 0) {
                  setSelectedTeacher(teachers[0]);
                }
                setShowTeacherCredentials(true);
              },
              button: 'Manage access',
              disabled: !selectedTeacher && teachers.length === 0,
            },
            {
              id: 'teach-bulk',
              badge: 'BL',
              title: 'Bulk Operations',
              description: 'Import, export, or batch update teacher rosters.',
              action: () => setShowTeacherBulkOperations(true),
              button: 'Run bulk action',
            },
            {
              id: 'teach-directory',
              badge: 'TD',
              title: 'All Teachers',
              description: 'View and filter the complete teacher directory.',
              action: () => setActiveSection('teachers'),
              button: 'View directory',
            },
          ].map((item) => (
            <Card key={item.id}>
              <div className="flex h-full flex-col gap-4 rounded-2xl border border-accent-soft bg-white px-4 py-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-soft-primary text-xs font-semibold text-primary">
                  {item.badge}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-primary">{item.title}</h3>
                  <p className="mt-1 text-sm text-primary-soft">{item.description}</p>
                </div>
                <button
                  onClick={item.action}
                  disabled={item.disabled}
                  className="inline-flex items-center justify-center rounded-full border border-[rgba(var(--color-primary-rgb),0.35)] px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {item.button}
                </button>
              </div>
            </Card>
          ))}
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
      {showTeacherForm && (
        <TeacherRegistrationForm 
          onClose={() => {
            setShowTeacherForm(false);
            setSelectedTeacher(null);
          }}
          teacher={selectedTeacher}
          isEdit={!!selectedTeacher}
        />
      )}
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
            console.log('🔍 Edit Profile button clicked for teacher:', teacher);
            setShowTeacherProfile(false);
            setSelectedTeacher(teacher);
            setShowTeacherForm(true);
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

      {/* Ticket Management Modal */}
      {showTicketManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <AdminTicketManagement
            onClose={() => setShowTicketManagement(false)}
          />
        </div>
      )}

      {/* Assign Ticket Modal */}
      {showAssignTicket && (
        <AssignTicketForm
          onClose={() => setShowAssignTicket(false)}
          onSuccess={() => {
            setShowAssignTicket(false);
            refreshNotifications();
          }}
        />
      )}
      
      <DebugPanel />
    </div>
  );
};

export default SuperAdminDashboard;
