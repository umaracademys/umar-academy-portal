import React, { useEffect, useRef, useState } from 'react';
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
import ListeningControlTower from '../components/ListeningControlTower';
import { useData } from '../contexts/DataContext';
import { useBackendData } from '../contexts/BackendDataContext';

const SuperAdminDashboard: React.FC = () => {
  const {
    students,
    teachers,
    admins,
    loading,
    error,
    adminNotifications,
    recitationReviews,
    refreshNotifications,
    deleteStudent,
    deleteTeacher,
  } = useData();
  const { tickets } = useBackendData();

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
  const [showControlTower, setShowControlTower] = useState(false);

  // Get pending recitation reviews count
  const pendingReviewsCount = recitationReviews.filter(r => r.status === 'pending_review').length;
  const unreadNotificationsCount = adminNotifications.filter(n => !n.read).length;

  const totalStudents = students.length;
  const activeStudentCount = students.filter((student) => student.status === 'active').length;
  const totalTeachers = teachers.length;
  const activeTeacherCount = teachers.filter((teacher) => teacher.status === 'active').length;
  const totalAdmins = admins.length;
  const pendingReviewTicketCount = tickets.filter((ticket) => ticket.status === 'pending_review').length;
  const assignedTicketCount = tickets.filter((ticket) => ticket.status === 'assigned').length;
  const finalizeReadyTicketCount = tickets.filter(
    (ticket) => ticket.status === 'approved' && ticket.workflowStep === 'finalize'
  ).length;
  const totalTicketCount = tickets.length;

  const overviewQuickActions = [
    {
      id: 'control-tower',
      label: 'Control Tower',
      description: 'Watch listening sessions live – timers, pages, mistake feed.',
      onClick: () => setShowControlTower(true),
      badge: pendingReviewTicketCount + finalizeReadyTicketCount,
      emphasis: 'primary',
    },
    {
      id: 'review-recitations',
      label: 'Review Recitations',
      description: 'Approve sabq, sabqi, and manzil submissions.',
      onClick: () => setShowRecitationReview(true),
      badge: pendingReviewsCount,
      emphasis: 'neutral',
    },
    {
      id: 'manage-tickets',
      label: 'Manage Tickets',
      description: 'Handle listening queue and finalize reports.',
      onClick: () => setShowTicketManagement(true),
      badge: pendingReviewTicketCount + finalizeReadyTicketCount,
      emphasis: 'neutral',
    },
    {
      id: 'assign-ticket',
      label: 'Assign Ticket',
      description: 'Create a sabq / sabqi / manzil ticket for a student.',
      onClick: () => setShowAssignTicket(true),
      badge: assignedTicketCount,
      emphasis: 'accent',
    },
    {
      id: 'view-assignments',
      label: 'View Assignments',
      description: 'See finalized homework and student-facing reports.',
      link: '/assignments',
      badge: unreadNotificationsCount,
      emphasis: 'accent-solid',
    },
  ];

  const managementActions = [
    {
      id: 'manage-students',
      badge: 'ST',
      title: 'Manage Students',
      description: 'Browse roster, open profiles, and update enrollment.',
      action: () => setActiveSection('students'),
      footer: `${totalStudents} students`,
    },
    {
      id: 'add-student',
      badge: '➕',
      title: 'Add Student',
      description: 'Register a new student and capture program details.',
      action: () => {
        setSelectedStudent(null);
        setShowStudentForm(true);
      },
      footer: 'Create profile',
    },
    {
      id: 'manage-teachers',
      badge: 'TC',
      title: 'Manage Teachers',
      description: 'Assign classes, review metrics, and update profiles.',
      action: () => setActiveSection('teachers'),
      footer: `${totalTeachers} teachers`,
    },
    {
      id: 'add-teacher',
      badge: '➕',
      title: 'Add Teacher',
      description: 'Onboard a new teacher with availability and payroll.',
      action: () => {
        setSelectedTeacher(null);
        setShowTeacherForm(true);
      },
      footer: 'Create profile',
    },
    {
      id: 'add-admin',
      badge: 'AD',
      title: 'Add Admin',
      description: 'Provision a new admin with the right permissions.',
      action: () => setShowAdminForm(true),
      footer: `${totalAdmins} admins`,
    },
    {
      id: 'permissions',
      badge: 'PM',
      title: 'Permission Manager',
      description: 'Adjust access across teacher, admin, and QA roles.',
      action: () => setShowPermissionManager(true),
      footer: 'Open manager',
    },
    {
      id: 'data-manager',
      badge: 'DB',
      title: 'Data Manager',
      description: 'Export records or trigger backups for compliance.',
      action: () => setShowDataManager(true),
      footer: 'Manage data',
    },
    {
      id: 'refresh-notifications',
      badge: '🔄',
      title: 'Refresh Alerts',
      description: 'Sync admin notifications and ticket updates.',
      action: () => refreshNotifications(),
      footer: 'Fetch latest',
    },
    {
      id: 'review-recitations',
      badge: 'RR',
      title: 'Review Recitations',
      description: 'Open the sabq / sabqi / manzil review queue.',
      action: () => setShowRecitationReview(true),
      footer: `${pendingReviewsCount} pending`,
    },
  ];

  const OverviewSection = () => (
    <div className="space-y-10">
      <section className="rounded-3xl border border-accent-soft bg-white px-6 py-6 shadow-sm sm:px-10 sm:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-primary-soft">
              Super Admin Control Center
            </span>
            <h1 className="text-3xl font-semibold text-primary">Stay ahead of every workflow</h1>
            <p className="max-w-3xl text-sm text-primary-soft">
              Review listening submissions, create new tickets, and keep student progress moving without leaving this
              page. Each card below opens a live workflow or modal.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-soft-primary px-3 py-1 text-primary">
                {activeStudentCount} active students
              </span>
              <span className="rounded-full bg-soft-accent px-3 py-1 text-[var(--color-accent)]">
                {pendingReviewTicketCount} tickets awaiting review
              </span>
              <span className="rounded-full border border-[rgba(var(--color-primary-rgb),0.25)] px-3 py-1 text-primary">
                {pendingReviewsCount} recitation reviews
              </span>
            </div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewQuickActions.map((action) => {
            const commonClasses =
              'flex h-full flex-col justify-between rounded-2xl border px-5 py-4 text-left shadow-sm transition';
            const activeButtonClasses = {
              primary: `${commonClasses} border-[rgba(var(--color-primary-rgb),0.35)] bg-white hover:bg-soft-primary`,
              neutral: `${commonClasses} border-[rgba(var(--color-primary-rgb),0.15)] bg-white hover:bg-gray-50`,
              accent: `${commonClasses} border-[rgba(var(--color-accent-rgb),0.35)] bg-white hover:bg-soft-accent`,
              'accent-solid': `${commonClasses} border-transparent bg-[var(--color-accent)] text-white hover:bg-[rgba(var(--color-accent-rgb),0.85)]`,
            };

            const badge =
              action.badge && action.badge > 0 ? (
                <span className="ml-auto rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                  {action.badge}
                </span>
              ) : null;

            if (action.link) {
              return (
                <Link key={action.id} to={action.link} className={activeButtonClasses[action.emphasis || 'neutral']}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold">
                        {action.label}
                        {badge}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-primary-soft">{action.description}</p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/80">
                    Go to assignments →
                  </span>
                </Link>
              );
            }

            return (
              <button
                key={action.id}
                onClick={action.onClick}
                className={activeButtonClasses[action.emphasis || 'neutral']}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-primary">
                      {action.label}
                      {badge}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-primary-soft">{action.description}</p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-primary-soft">
                  Open workflow
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Students"
          value={`${totalStudents} • ${activeStudentCount} active`}
          icon="ST"
        />
        <StatCard
          title="Teachers"
          value={`${totalTeachers} • ${activeTeacherCount} active`}
          icon="TC"
        />
        <StatCard
          title="Tickets In Review"
          value={`${pendingReviewTicketCount} pending • ${assignedTicketCount} assigned`}
          icon="TK"
        />
        <StatCard
          title="Finalize Queue"
          value={`${finalizeReadyTicketCount} waiting`}
          icon="FZ"
        />
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-primary">Manage Records & Settings</h3>
          <div className="h-px flex-1 bg-[rgba(var(--color-accent-rgb),0.3)]" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {managementActions.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className="flex h-full flex-col gap-4 rounded-2xl border border-accent-soft bg-white px-5 py-5 text-left shadow-sm transition hover:bg-soft-accent"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-soft-primary text-xs font-semibold text-primary">
                {item.badge}
              </div>
              <div className="flex-1">
                <h4 className="text-base font-semibold text-primary">{item.title}</h4>
                <p className="mt-1 text-sm text-primary-soft">{item.description}</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-primary-soft">{item.footer}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-accent-soft bg-white px-6 py-6 shadow-sm sm:px-10 sm:py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary">Ticket Insights</h3>
            <p className="text-sm text-primary-soft">
              There are {totalTicketCount} tickets in the system. {pendingReviewTicketCount} are pending review and{' '}
              {finalizeReadyTicketCount} are ready to finalize.
            </p>
          </div>
          <button
            onClick={() => setShowTicketManagement(true)}
            className="inline-flex items-center justify-center rounded-full border border-[rgba(var(--color-primary-rgb),0.35)] px-5 py-3 text-sm font-semibold text-primary transition hover:bg-soft-primary"
          >
            Open ticket management
          </button>
        </div>
      </section>
    </div>
  );

  // System Management Section
  const SystemSection = () => (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">🔧 System Tools</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <button
          onClick={() => setShowPermissionManager(true)}
          className="flex h-full flex-col gap-3 rounded-2xl border border-accent-soft bg-white px-5 py-5 text-left shadow-sm transition hover:bg-soft-primary"
        >
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-soft-primary text-xs font-semibold text-primary">
            PM
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-primary">Permission Manager</h3>
            <p className="mt-1 text-sm text-primary-soft">
              Adjust role access for teachers, admins, and QA reviewers.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-primary-soft">Open manager</span>
        </button>

        <button
          onClick={() => setShowDataManager(true)}
          className="flex h-full flex-col gap-3 rounded-2xl border border-accent-soft bg-white px-5 py-5 text-left shadow-sm transition hover:bg-soft-accent"
        >
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-soft-primary text-xs font-semibold text-primary">
            DB
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-primary">Data Manager</h3>
            <p className="mt-1 text-sm text-primary-soft">
              Export student or ticket data and trigger manual backups.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-primary-soft">Launch data tools</span>
        </button>

        <button
          onClick={() => refreshNotifications()}
          className="flex h-full flex-col gap-3 rounded-2xl border border-accent-soft bg-white px-5 py-5 text-left shadow-sm transition hover:bg-gray-50"
        >
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-soft-primary text-xs font-semibold text-primary">
            🔄
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-primary">Refresh Notifications</h3>
            <p className="mt-1 text-sm text-primary-soft">
              Pull the latest admin notifications and ticket alerts.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-primary-soft">Sync now</span>
        </button>
      </div>

      <Card title="Live Signals">
        <div className="space-y-3 text-sm text-primary-soft">
          <div className="flex items-center justify-between rounded-xl border border-accent-soft bg-soft-accent px-4 py-3">
            <span className="font-semibold text-[var(--color-accent)]">Unread admin notifications</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
              {unreadNotificationsCount}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-accent-soft bg-soft-primary px-4 py-3">
            <span className="font-semibold text-primary">Pending recitation reviews</span>
            <span className="text-sm font-semibold text-primary">{pendingReviewsCount}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-accent-soft bg-white px-4 py-3">
            <span className="font-semibold text-primary">Tickets ready to finalize</span>
            <span className="text-sm font-semibold text-primary">{finalizeReadyTicketCount}</span>
          </div>
        </div>
      </Card>
    </div>
  );


  // Students Management
  const StudentsSection = () => {
    const studentDirectoryRef = useRef<HTMLDivElement | null>(null);
    const [highlightDirectory, setHighlightDirectory] = useState(false);

    useEffect(() => {
      if (!highlightDirectory) {
        return;
      }

      const timer = window.setTimeout(() => setHighlightDirectory(false), 1200);
      return () => window.clearTimeout(timer);
    }, [highlightDirectory]);

    const handleStudentSelect = (student: any) => {
      console.log('🔍 handleStudentSelect called with student:', student);
      setSelectedStudent(student);
      setShowStudentProfile(true);
      console.log('🔍 Modal should now be visible - showStudentProfile:', true);
    };

    const handleEditStudent = (student: any) => {
      console.log('🔍 Edit student clicked:', student);
      setSelectedStudent(student);
      setShowStudentProfile(false);
      setShowStudentForm(true);
    };

    const handleDeleteStudent = async (studentId: string) => {
      if (!studentId) {
        return;
      }

      const confirmed = window.confirm('Are you sure you want to delete this student?');
      if (!confirmed) {
        return;
      }

      try {
        await deleteStudent(studentId);
        alert('Student deleted successfully.');
      } catch (err) {
        console.error('Failed to delete student:', err);
        alert('Failed to delete student. Please try again.');
      }
    };

    const focusStudentDirectory = () => {
      const scrollTarget = studentDirectoryRef.current;
      if (!scrollTarget) {
        return;
      }

      scrollTarget.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      setHighlightDirectory(true);
    };

    const studentsCount = students.length;
    const activeStudentsCount = students.filter((s) => s.status === 'active').length;

    return (
      <div>
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              id: 'student-analytics',
              badge: 'AN',
              title: 'Analytics',
              description: 'Review student performance trends and milestones.',
              footer: `${studentsCount} total • ${activeStudentsCount} active`,
              action: () => {
                if (!selectedStudent && students.length > 0) {
                  setSelectedStudent(students[0]);
                }
                setShowStudentAnalytics(true);
              },
              button: 'Open analytics',
              disabled: students.length === 0,
            },
            {
              id: 'student-credentials',
              badge: 'CR',
              title: 'Student Credentials',
              description: 'Manage login credentials and portal access.',
              footer: `${studentsCount} students`,
              action: () => {
                if (!selectedStudent && students.length > 0) {
                  setSelectedStudent(students[0]);
                }
                setShowStudentCredentials(true);
              },
              button: 'Manage access',
              disabled: students.length === 0,
            },
            {
              id: 'student-bulk',
              badge: 'BL',
              title: 'Student Bulk Operations',
              description: 'Manage multiple students at once.',
              footer: `${studentsCount} students`,
              action: () => setShowStudentBulkOperations(true),
              button: 'Run bulk action',
              disabled: false,
            },
            {
              id: 'student-directory',
              badge: 'SD',
              title: 'Student Directory',
              description: 'Browse and filter the complete student directory.',
              footer: `${studentsCount} students`,
              action: focusStudentDirectory,
              button: 'View directory',
              disabled: false,
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
                  {item.footer && (
                    <p className="mt-2 text-xs font-semibold text-primary-soft">{item.footer}</p>
                  )}
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

        {/* Student List */}
        <div
          ref={studentDirectoryRef}
          className={`rounded-3xl transition-all duration-500 ${
            highlightDirectory ? 'ring-2 ring-primary ring-offset-2 ring-offset-white shadow-lg shadow-primary/20' : ''
          }`}
        >
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

    const handleDeleteTeacher = async (teacherId: string) => {
      if (!teacherId) {
        return;
      }

      const confirmed = window.confirm('Are you sure you want to delete this teacher?');
      if (!confirmed) {
        return;
      }

      try {
        await deleteTeacher(teacherId);
        alert('Teacher deleted successfully.');
      } catch (err) {
        console.error('Failed to delete teacher:', err);
        alert('Failed to delete teacher. Please try again.');
      }
    };

    return (
      <div>
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              id: 'teach-analytics',
              badge: 'AN',
              title: 'Teacher Analytics',
              description: 'Monitor performance, coverage, and load balancing.',
              action: () => setShowTeacherAnalytics(true),
              button: 'Open analytics',
            },
            {
              id: 'teach-credentials',
              badge: 'CR',
              title: 'Teacher Credentials',
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
              title: 'Teacher Bulk Operations',
              description: 'Import, export, or batch update teacher rosters.',
              action: () => setShowTeacherBulkOperations(true),
              button: 'Run bulk action',
            },
            {
              id: 'teach-directory',
              badge: 'TD',
              title: 'Teacher Directory',
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
          teacher={
            selectedTeacher || {
              id: 'general',
              fullName: 'All Teachers',
              email: 'access@umaracademy.org',
            }
          }
          onClose={() => {
            setShowTeacherCredentials(false);
            setSelectedTeacher(null);
          }}
        />
      )}

      {showTeacherAnalytics && (
        <TeacherAnalytics
          teacher={
            selectedTeacher || {
              id: 'general',
              fullName: 'All Teachers',
              email: 'analytics@umaracademy.org',
            }
          }
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

      {/* Listening Control Tower */}
      {showControlTower && (
        <ListeningControlTower
          onClose={() => setShowControlTower(false)}
        />
      )}
      
      <DebugPanel />
    </div>
  );
};

export default SuperAdminDashboard;
