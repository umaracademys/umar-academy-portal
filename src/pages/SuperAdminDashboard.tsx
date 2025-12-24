import React, { useEffect, useRef, useState, useMemo, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import { useData } from '../contexts/DataContext';
import { useBackendData } from '../contexts/BackendDataContext';

// Lazy load heavy components for better performance
const StudentRegistrationForm = lazy(() => import('../components/StudentRegistrationForm'));
const TeacherRegistrationForm = lazy(() => import('../components/TeacherRegistrationForm'));
const AdminRegistrationForm = lazy(() => import('../components/AdminRegistrationForm'));
const PermissionManager = lazy(() => import('../components/PermissionManager'));
const DataManager = lazy(() => import('../components/DataManager'));
const StudentList = lazy(() => import('../components/StudentList'));
const StudentProfile = lazy(() => import('../components/StudentProfile'));
const StudentEnrollment = lazy(() => import('../components/StudentEnrollment'));
const StudentPayments = lazy(() => import('../components/StudentPayments'));
const StudentProgress = lazy(() => import('../components/StudentProgress'));
const StudentCommunication = lazy(() => import('../components/StudentCommunication'));
const StudentCredentials = lazy(() => import('../components/StudentCredentials'));
const StudentAnalytics = lazy(() => import('../components/StudentAnalytics'));
const StudentBulkOperations = lazy(() => import('../components/StudentBulkOperations'));
const TeacherList = lazy(() => import('../components/TeacherList'));
const TeacherProfile = lazy(() => import('../components/TeacherProfile'));
const TeacherPayroll = lazy(() => import('../components/TeacherPayroll'));
const TeacherPerformance = lazy(() => import('../components/TeacherPerformance'));
const TeacherAttendance = lazy(() => import('../components/TeacherAttendance'));
const TeacherCommunication = lazy(() => import('../components/TeacherCommunication'));
const TeacherCredentials = lazy(() => import('../components/TeacherCredentials'));
const TeacherAnalytics = lazy(() => import('../components/TeacherAnalytics'));
const TeacherBulkOperations = lazy(() => import('../components/TeacherBulkOperations'));
// DebugPanel removed - only show in development
const DebugPanel = process.env.NODE_ENV === 'development' ? lazy(() => import('../components/DebugPanel')) : null;
const AdminRecitationReview = lazy(() => import('../components/AdminRecitationReview'));
const StudentReports = lazy(() => import('../components/StudentReports'));
const AdminTicketReview = lazy(() => import('../components/AdminTicketReview'));
const AdminNotificationCenter = lazy(() => import('../components/AdminNotificationCenter'));
const ActivityLog = lazy(() => import('../components/ActivityLog'));
const EmailModule = lazy(() => import('../components/EmailModule'));
const StudentTestingModule = lazy(() => import('../components/StudentTestingModule'));
const TestResultsPage = lazy(() => import('../components/TestResultsPage'));
const TeacherEvaluationManagement = lazy(() => import('../components/TeacherEvaluationManagement'));
const EvaluationResultsPage = lazy(() => import('../components/EvaluationResultsPage'));
const TeacherAttendanceForm = lazy(() => import('../components/TeacherAttendanceForm'));
const TeacherAttendanceReport = lazy(() => import('../components/TeacherAttendanceReport'));
const TeacherPairManagement = lazy(() => import('../components/TeacherPairManagement'));
const PairTeacherMessagesAdmin = lazy(() => import('../components/PairTeacherMessagesAdmin'));
const TeacherStudentMessage = lazy(() => import('../components/TeacherStudentMessage'));
const TeacherStudentMessagesAdmin = lazy(() => import('../components/TeacherStudentMessagesAdmin'));
const PdfManagement = lazy(() => import('../components/PdfManagement'));

// Loading fallback for lazy components
const ModalLoadingFallback: React.FC = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-primary font-semibold">Loading...</p>
    </div>
  </div>
);

const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
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

  const { getPendingReviewTickets, recitationTickets, assignments, fixMissingAssignmentIds, loadingStep } = useBackendData();

  // Track tickets with missing assignment IDs
  const [ticketsWithMissingIds, setTicketsWithMissingIds] = useState<number>(0);
  const [isFixingIds, setIsFixingIds] = useState(false);

  // Debug: Log ticket statuses
  useEffect(() => {
    console.log('🔍 SuperAdminDashboard - All tickets:', recitationTickets.map(t => ({
      id: t.id,
      status: t.status,
      type: t.type,
      studentName: t.studentName,
      submittedAt: t.submittedAt,
      sentToAssignmentId: t.sentToAssignmentId,
      sentAt: t.sentAt
    })));
    console.log('🔍 SuperAdminDashboard - Pending review tickets:', getPendingReviewTickets().length);
    
    // Check for tickets that were sent to assignment
    const sentTickets = recitationTickets.filter(t => t.status === 'sent_to_assignment');
    if (sentTickets.length > 0) {
      console.log('📋 Tickets sent to assignment:', sentTickets.length);
      const missingIds = sentTickets.filter(t => !t.sentToAssignmentId || t.sentToAssignmentId === 'N/A');
      setTicketsWithMissingIds(missingIds.length);
      
      sentTickets.forEach(t => {
        console.log('  -', t.type, 'for', t.studentName, '-> Assignment ID:', t.sentToAssignmentId || 'N/A');
      });
      
      // Log if there are tickets with missing IDs
      if (missingIds.length > 0) {
        console.log(`⚠️ Found ${missingIds.length} tickets with missing assignment IDs. Use the "Fix Missing Assignment IDs" button to fix them.`);
      }
    } else {
      setTicketsWithMissingIds(0);
    }
  }, [recitationTickets, getPendingReviewTickets]);

  // Handle fixing missing assignment IDs
  const handleFixMissingIds = async () => {
    setIsFixingIds(true);
    try {
      const result = await fixMissingAssignmentIds();
      console.log(`✅ Fixed ${result.fixed} out of ${result.total} tickets`);
      alert(`Successfully fixed ${result.fixed} out of ${result.total} tickets with missing assignment IDs.`);
      setTicketsWithMissingIds(0); // Reset count after fixing
    } catch (error) {
      console.error('❌ Error fixing missing assignment IDs:', error);
      alert('Failed to fix missing assignment IDs: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsFixingIds(false);
    }
  };

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
  const [showTeacherPayroll, setShowTeacherPayroll] = useState(false);
  const [showTeacherPerformance, setShowTeacherPerformance] = useState(false);
  const [showTeacherAttendance, setShowTeacherAttendance] = useState(false);
  const [showTeacherCommunication, setShowTeacherCommunication] = useState(false);
  const [showTeacherCredentials, setShowTeacherCredentials] = useState(false);
  const [showTeacherAnalytics, setShowTeacherAnalytics] = useState(false);
  const [showTeacherBulkOperations, setShowTeacherBulkOperations] = useState(false);
  const [showRecitationReview, setShowRecitationReview] = useState(false);
  const [showStudentReports, setShowStudentReports] = useState(false);
  const [showTicketReview, setShowTicketReview] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showEmailModule, setShowEmailModule] = useState(false);
  const [showTestingModule, setShowTestingModule] = useState(false);
  const [showTestResults, setShowTestResults] = useState(false);
  const [showEvaluationManagement, setShowEvaluationManagement] = useState(false);
  const [showEvaluationResults, setShowEvaluationResults] = useState(false);
  const [showTeacherAttendanceForm, setShowTeacherAttendanceForm] = useState(false);
  const [showTeacherAttendanceReport, setShowTeacherAttendanceReport] = useState(false);
  const [showTeacherPairManagement, setShowTeacherPairManagement] = useState(false);
  const [showPairMessagesAdmin, setShowPairMessagesAdmin] = useState(false);
  const [showTeacherStudentMessagesAdmin, setShowTeacherStudentMessagesAdmin] = useState(false);
  const [showTeacherStudentMessage, setShowTeacherStudentMessage] = useState(false);
  const [selectedTeacherForMessage, setSelectedTeacherForMessage] = useState<any>(null);
  const [selectedStudentForMessage, setSelectedStudentForMessage] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Get pending recitation reviews count
  const pendingReviewsCount = recitationReviews.filter(r => r.status === 'pending_review').length;
  const unreadNotificationsCount = adminNotifications.filter(n => !n.read).length;
  const pendingTicketCount = getPendingReviewTickets().length;
  
  // Get pending homework submissions count
  const pendingHomeworkCount = useMemo(() => {
    return assignments.filter((assignment: any) => 
      assignment.homework?.enabled && 
      assignment.homework?.submission?.submitted && 
      assignment.homework?.submission?.status === 'submitted'
    ).length;
  }, [assignments]);

  const totalStudents = students.length;
  const activeStudentCount = students.filter((student) => student.status === 'active').length;
  const totalTeachers = teachers.length;
  const activeTeacherCount = teachers.filter((teacher) => teacher.status === 'active').length;
  const totalAdmins = admins.length;

  const overviewQuickActions = [
    {
      id: 'manage-assignments',
      label: 'Manage Assignments',
      description: 'Create and manage assignments with multi-phase classwork.',
      onClick: () => navigate('/assignments'),
      badge: null,
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
      id: 'review-tickets',
      label: 'Review Tickets',
      description: 'Review and approve submitted tickets from teachers.',
      onClick: () => setShowTicketReview(true),
      badge: pendingTicketCount,
      emphasis: 'primary',
    },
    {
      id: 'review-homework',
      label: 'Review Homework',
      description: 'Review and grade submitted homework assignments.',
      onClick: () => navigate('/assignments'),
      badge: pendingHomeworkCount,
      emphasis: 'primary',
    },
    {
      id: 'student-reports',
      label: 'Student Reports',
      description: 'View and manage student assignment history by program.',
      onClick: () => setShowStudentReports(true),
      badge: null,
      emphasis: 'neutral',
    },
    {
      id: 'teacher-attendance',
      label: 'Take Teacher Attendance',
      description: 'Record attendance for teachers (Full Time & Part Time).',
      onClick: () => setShowTeacherAttendanceForm(true),
      badge: null,
      emphasis: 'primary',
    },
    {
      id: 'teacher-attendance-report',
      label: 'Teacher Attendance Report',
      description: 'View attendance history, statistics, and paid days.',
      onClick: () => setShowTeacherAttendanceReport(true),
      badge: null,
      emphasis: 'neutral',
    },
    {
      id: 'activity-log',
      label: 'Activity Log',
      description: 'Monitor security events, login attempts, and user activities.',
      onClick: () => setShowActivityLog(true),
      badge: null,
      emphasis: 'accent-solid',
    },
    {
      id: 'fix-assignment-ids',
      label: 'Fix Missing Assignment IDs',
      description: 'Fix tickets that are missing their assignment ID references.',
      onClick: handleFixMissingIds,
      badge: ticketsWithMissingIds > 0 ? ticketsWithMissingIds : null,
      emphasis: ticketsWithMissingIds > 0 ? 'accent-solid' : 'neutral',
      disabled: ticketsWithMissingIds === 0 || isFixingIds,
    },
    {
      id: 'student-testing',
      label: 'Student Testing',
      description: 'Test students on Memory, Tajweed, and Fluency with Mushaf integration.',
      onClick: () => setShowTestingModule(true),
      badge: null,
      emphasis: 'primary',
    },
    {
      id: 'test-results',
      label: 'Test Results',
      description: 'View, edit, and manage student test results.',
      onClick: () => setShowTestResults(true),
      badge: null,
      emphasis: 'neutral',
    },
    {
      id: 'teacher-evaluations',
      label: 'Teacher Evaluations',
      description: 'Create and manage teacher evaluation forms.',
      onClick: () => setShowEvaluationManagement(true),
      badge: null,
      emphasis: 'primary',
    },
    {
      id: 'evaluation-results',
      label: 'Evaluation Results',
      description: 'View and analyze teacher evaluation results.',
      onClick: () => setShowEvaluationResults(true),
      badge: null,
      emphasis: 'neutral',
    },
    {
      id: 'ai-library',
      label: 'AI Phrase Library',
      description: 'Manage AI phrase suggestions across the application.',
      onClick: () => navigate('/super-admin/ai-library'),
      badge: null,
      emphasis: 'primary',
    },
    {
      id: 'teacher-pairs',
      label: 'Manage Teacher Pairs',
      description: 'Create and manage teacher pairs for collaborative teaching.',
      onClick: () => setShowTeacherPairManagement(true),
      badge: null,
      emphasis: 'primary',
    },
    {
      id: 'pair-messages',
      label: 'Pair Teacher Messages',
      description: 'View all messages between teachers in pairs (Admin oversight).',
      onClick: () => setShowPairMessagesAdmin(true),
      badge: null,
      emphasis: 'accent',
    },
    {
      id: 'teacher-student-messages',
      label: 'Teacher-Student Messages',
      description: 'View and manage all messages between teachers and students (Admin oversight).',
      onClick: () => setShowTeacherStudentMessagesAdmin(true),
      badge: null,
      emphasis: 'primary',
    },
  ];

  const managementActions = [
    {
      id: 'manage-students',
      badge: 'ST',
      title: 'Manage Students',
      description: 'Browse roster, open profiles, and update enrollment.',
      action: () => navigate('/students'),
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
      id: 'ai-library',
      badge: 'AI',
      title: 'AI Phrase Library',
      description: 'Manage AI phrase suggestions across the application.',
      action: () => navigate('/super-admin/ai-library'),
      footer: 'Manage phrases',
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

  // Helper function to get time ago
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  // Calculate additional metrics
  const inactiveStudentCount = totalStudents - activeStudentCount;
  const inactiveTeacherCount = totalTeachers - activeTeacherCount;
  const totalPendingItems = pendingReviewsCount + pendingTicketCount + pendingHomeworkCount;
  const recentActivityCount = useMemo(() => {
    // Count recent activities (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    let count = 0;
    // Count recent recitation reviews
    count += recitationReviews.filter((r: any) => {
      const reviewDate = r.createdAt ? new Date(r.createdAt) : new Date(r.submittedAt || Date.now());
      return reviewDate >= sevenDaysAgo;
    }).length;
    
    // Count recent tickets
    count += recitationTickets.filter((t: any) => {
      const ticketDate = t.createdAt ? new Date(t.createdAt) : new Date(t.submittedAt || Date.now());
      return ticketDate >= sevenDaysAgo;
    }).length;
    
    return count;
  }, [recitationReviews, recitationTickets]);

  const OverviewSection = () => (
    <div className="space-y-6">
      {/* Welcome Header */}
      <section className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-soft-primary/20 to-white px-6 py-6 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary/70 bg-primary/10 px-3 py-1 rounded-full">
                Super Admin Control Center
              </span>
              {totalPendingItems > 0 && (
                <span className="rounded-full bg-red-500 text-white px-2.5 py-1 text-xs font-bold animate-pulse">
                  {totalPendingItems} pending
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">Dashboard Overview</h1>
            <p className="max-w-3xl text-sm text-gray-600 leading-relaxed">
              Monitor system activity, manage workflows, and stay on top of pending reviews and submissions. 
              Everything you need is just a click away.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-primary/10 px-3 py-1.5 text-primary border border-primary/20">
                {activeStudentCount} active students
              </span>
              <span className="rounded-full bg-accent/10 px-3 py-1.5 text-accent border border-accent/20">
                {activeTeacherCount} active teachers
              </span>
              <span className="rounded-full bg-orange-100 px-3 py-1.5 text-orange-700 border border-orange-200">
                {pendingReviewsCount} recitation reviews
              </span>
              <span className="rounded-full bg-blue-100 px-3 py-1.5 text-blue-700 border border-blue-200">
                {pendingTicketCount} pending tickets
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Stats Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-xl border-2 border-primary/20 p-6 shadow-md hover:shadow-lg transition-all duration-200 hover:border-primary/40">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Students</p>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <span className="text-lg">👥</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-primary mb-1">{totalStudents}</p>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-600 font-semibold">+{activeStudentCount} active</span>
            {inactiveStudentCount > 0 && (
              <span className="text-gray-400">• {inactiveStudentCount} inactive</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border-2 border-accent/20 p-6 shadow-md hover:shadow-lg transition-all duration-200 hover:border-accent/40">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Teachers</p>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center">
              <span className="text-lg">👨‍🏫</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-accent mb-1">{totalTeachers}</p>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-600 font-semibold">+{activeTeacherCount} active</span>
            {inactiveTeacherCount > 0 && (
              <span className="text-gray-400">• {inactiveTeacherCount} inactive</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border-2 border-orange-200 p-6 shadow-md hover:shadow-lg transition-all duration-200 hover:border-orange-300">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pending Reviews</p>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
              <span className="text-lg">📋</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-orange-600 mb-1">{pendingReviewsCount + pendingTicketCount}</p>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-orange-600 font-semibold">{pendingReviewsCount} recitations</span>
            <span className="text-gray-400">• {pendingTicketCount} tickets</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border-2 border-blue-200 p-6 shadow-md hover:shadow-lg transition-all duration-200 hover:border-blue-300">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recent Activity</p>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
              <span className="text-lg">⚡</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-600 mb-1">{recentActivityCount}</p>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-blue-600 font-semibold">Last 7 days</span>
          </div>
        </div>
      </section>

      {/* Quick Actions - Better Organized */}
      <section className="rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-md">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-primary mb-2">Quick Actions</h2>
          <p className="text-sm text-gray-600">Access frequently used workflows and management tools</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {overviewQuickActions.map((action) => {
            const commonClasses =
              'flex h-full flex-col justify-between rounded-xl border-2 px-4 py-3.5 text-left shadow-sm transition-all duration-200 group';
            const activeButtonClasses = {
              primary: `${commonClasses} border-primary/30 bg-white hover:bg-gradient-to-br hover:from-soft-primary hover:to-white hover:border-primary/50 hover:shadow-md`,
              neutral: `${commonClasses} border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 hover:shadow-md`,
              accent: `${commonClasses} border-accent/30 bg-white hover:bg-gradient-to-br hover:from-soft-accent hover:to-white hover:border-accent/50 hover:shadow-md`,
              'accent-solid': `${commonClasses} border-transparent bg-gradient-to-br from-accent to-accent/90 text-white hover:from-accent/90 hover:to-accent shadow-md hover:shadow-lg`,
            };

            const badge =
              action.badge !== null && action.badge !== undefined && action.badge > 0 ? (
                <span className="ml-auto rounded-full bg-red-500 text-white px-2.5 py-1 text-xs font-bold shadow-sm animate-pulse">
                  {action.badge}
                </span>
              ) : null;

            const isDisabled = (action as any).disabled;
            const isFixing = action.id === 'fix-assignment-ids' && isFixingIds;
            
            return (
              <button
                key={action.id}
                onClick={action.onClick}
                disabled={isDisabled}
                className={`${activeButtonClasses[action.emphasis || 'neutral']} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className={`text-sm font-bold leading-tight ${action.emphasis === 'accent-solid' ? 'text-white' : 'text-primary'}`}>
                      {isFixing ? 'Fixing...' : action.label}
                    </p>
                    {badge}
                  </div>
                  <p className={`text-xs leading-relaxed ${action.emphasis === 'accent-solid' ? 'text-white/90' : 'text-gray-600'}`}>
                    {action.description}
                  </p>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider mt-2 ${action.emphasis === 'accent-solid' ? 'text-white/80' : 'text-gray-500'}`}>
                  {isFixing ? 'Processing...' : '→ Open'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Management Actions - Enhanced */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-primary">System Management</h3>
          <div className="h-px flex-1 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {managementActions.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className="flex h-full flex-col gap-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-4 text-left shadow-sm transition-all duration-200 hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-soft-primary to-primary/10 text-sm font-bold text-primary shadow-sm">
                {item.badge}
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-primary mb-1">{item.title}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{item.footer}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Recent Activity Feed */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white px-6 py-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-primary mb-1">Recent Activity</h3>
            <p className="text-sm text-gray-600">Latest system events and user actions</p>
          </div>
          <button
            onClick={() => setShowActivityLog(true)}
            className="text-xs font-semibold text-primary hover:text-accent transition-colors"
          >
            View All →
          </button>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {useMemo(() => {
            const activities: Array<{
              id: string;
              type: string;
              title: string;
              description: string;
              time: string;
              icon: string;
              color: string;
              onClick?: () => void;
            }> = [];

            // Add recent recitation reviews
            recitationReviews
              .filter((r: any) => r.status === 'pending_review')
              .slice(0, 5)
              .forEach((review: any) => {
                const date = review.submittedAt ? new Date(review.submittedAt) : new Date();
                const timeAgo = getTimeAgo(date);
                activities.push({
                  id: `review-${review.id}`,
                  type: 'recitation',
                  title: `${review.type || 'Recitation'} Review Pending`,
                  description: `Student: ${review.studentName || 'Unknown'}`,
                  time: timeAgo,
                  icon: '📖',
                  color: 'border-orange-400 bg-orange-50',
                  onClick: () => setShowRecitationReview(true),
                });
              });

            // Add recent tickets
            recitationTickets
              .filter((t: any) => t.status === 'pending_review')
              .slice(0, 5)
              .forEach((ticket: any) => {
                const date = ticket.submittedAt ? new Date(ticket.submittedAt) : new Date();
                const timeAgo = getTimeAgo(date);
                activities.push({
                  id: `ticket-${ticket.id}`,
                  type: 'ticket',
                  title: `${ticket.type || 'Ticket'} Pending Review`,
                  description: `Student: ${ticket.studentName || 'Unknown'}`,
                  time: timeAgo,
                  icon: '🎫',
                  color: 'border-blue-400 bg-blue-50',
                  onClick: () => setShowTicketReview(true),
                });
              });

            // Add recent notifications
            adminNotifications
              .filter((n: any) => !n.read)
              .slice(0, 3)
              .forEach((notification: any) => {
                const date = notification.createdAt ? new Date(notification.createdAt) : new Date();
                const timeAgo = getTimeAgo(date);
                activities.push({
                  id: `notif-${notification.id}`,
                  type: 'notification',
                  title: notification.title || 'New Notification',
                  description: notification.message || '',
                  time: timeAgo,
                  icon: '🔔',
                  color: 'border-purple-400 bg-purple-50',
                  onClick: () => setShowNotificationCenter(true),
                });
              });

            // Sort by time (most recent first)
            activities.sort((a, b) => {
              const timeA = a.time.includes('minute') ? 0 : a.time.includes('hour') ? 1 : 2;
              const timeB = b.time.includes('minute') ? 0 : b.time.includes('hour') ? 1 : 2;
              return timeA - timeB;
            });

            return activities.length > 0 ? activities.slice(0, 8) : [{
              id: 'no-activity',
              type: 'empty',
              title: 'No recent activity',
              description: 'All caught up! No pending items.',
              time: 'Just now',
              icon: '✅',
              color: 'border-gray-300 bg-gray-50',
            }];
          }, [recitationReviews, recitationTickets, adminNotifications]).map((activity) => (
            <div
              key={activity.id}
              onClick={activity.onClick}
              className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${activity.color} cursor-pointer hover:shadow-md transition-all duration-200 ${
                activity.onClick ? 'hover:scale-[1.01]' : ''
              }`}
            >
              <span className="text-2xl flex-shrink-0">{activity.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-primary text-sm mb-0.5">{activity.title}</p>
                <p className="text-xs text-gray-600 truncate">{activity.description}</p>
                <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* System Status */}
      <section className="rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50 px-6 py-5 shadow-md">
        <h3 className="text-lg font-bold text-primary mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
              <span className="font-semibold text-primary">System Operational</span>
            </div>
            <span className="text-xs font-semibold text-green-600">All systems normal</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              <span className="font-semibold text-primary">Unread Notifications</span>
            </div>
            <span className="rounded-full bg-blue-500 text-white px-2.5 py-1 text-xs font-bold">
              {unreadNotificationsCount}
            </span>
          </div>
        </div>
      </section>

    </div>
  );

  // System Management Section
  const SystemSection = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-primary">🔧 System Tools</h2>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <button
          onClick={() => setShowPermissionManager(true)}
          className="flex h-full flex-col gap-3 rounded-xl border border-gray-200 bg-white px-5 py-5 text-left shadow-sm transition hover:shadow-md hover:border-primary/30"
        >
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-soft-primary text-xs font-semibold text-primary">
            PM
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-primary">Permission Manager</h3>
            <p className="mt-1 text-sm text-gray-600">
              Adjust role access for teachers, admins, and QA reviewers.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Open manager</span>
        </button>

        <button
          onClick={() => setShowDataManager(true)}
          className="flex h-full flex-col gap-3 rounded-xl border border-gray-200 bg-white px-5 py-5 text-left shadow-sm transition hover:shadow-md hover:border-primary/30"
        >
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-soft-primary text-xs font-semibold text-primary">
            DB
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-primary">Data Manager</h3>
            <p className="mt-1 text-sm text-gray-600">
              Export student or ticket data and trigger manual backups.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Launch data tools</span>
        </button>

        <button
          onClick={() => refreshNotifications()}
          className="flex h-full flex-col gap-3 rounded-xl border border-gray-200 bg-white px-5 py-5 text-left shadow-sm transition hover:shadow-md hover:border-primary/30"
        >
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-soft-primary text-xs font-semibold text-primary">
            🔄
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-primary">Refresh Notifications</h3>
            <p className="mt-1 text-sm text-gray-600">
              Pull the latest admin notifications and ticket alerts.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sync now</span>
        </button>
      </div>

      <Card title="Live Signals">
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <span className="font-semibold text-[var(--color-accent)]">Unread admin notifications</span>
            <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
              {unreadNotificationsCount}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <span className="font-semibold text-primary">Pending recitation reviews</span>
            <span className="text-sm font-semibold text-primary">{pendingReviewsCount}</span>
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
        console.error('❌ No student ID provided for deletion');
        return;
      }

      const confirmed = window.confirm('Are you sure you want to delete this student? This action cannot be undone.');
      if (!confirmed) {
        return;
      }

      try {
        console.log(`🗑️ Deleting student with ID: ${studentId}`);
        await deleteStudent(studentId);
        alert('✅ Student deleted successfully.');
        // Refresh will happen automatically via refreshData in deleteStudent
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete student';
        console.error('❌ Failed to delete student:', err);
        alert(`❌ Failed to delete student: ${errorMessage}`);
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
              <div className="flex h-full flex-col gap-4 rounded-xl border border-gray-200 bg-white px-4 py-5 shadow-sm hover:shadow-md transition">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-soft-primary text-xs font-semibold text-primary">
                  {item.badge}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-primary">{item.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                  {item.footer && (
                    <p className="mt-2 text-xs font-semibold text-gray-500">{item.footer}</p>
                  )}
                </div>
                <button
                  onClick={item.action}
                  disabled={item.disabled}
                  className="inline-flex items-center justify-center rounded-lg border border-primary/30 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft-primary hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {item.button}
                </button>
              </div>
            </Card>
          ))}
        </div>

        {/* Student List - Lazy loaded */}
        <div
          ref={studentDirectoryRef}
          className={`rounded-3xl transition-all duration-500 ${
            highlightDirectory ? 'ring-2 ring-primary ring-offset-2 ring-offset-white shadow-lg shadow-primary/20' : ''
          }`}
        >
          <Suspense fallback={<div className="text-center py-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div></div>}>
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
          </Suspense>
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
              <div className="flex h-full flex-col gap-4 rounded-xl border border-gray-200 bg-white px-4 py-5 shadow-sm hover:shadow-md transition">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-soft-primary text-xs font-semibold text-primary">
                  {item.badge}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-primary">{item.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                </div>
                <button
                  onClick={item.action}
                  disabled={item.disabled}
                  className="inline-flex items-center justify-center rounded-lg border border-primary/30 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft-primary hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {item.button}
                </button>
              </div>
            </Card>
          ))}
        </div>

        {/* Teacher List - Lazy loaded */}
        <Suspense fallback={<div className="text-center py-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div></div>}>
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
        </Suspense>
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
      case 'pdf-management': return (
        <Suspense fallback={<ModalLoadingFallback />}>
          <PdfManagement />
        </Suspense>
      );
      default: return <OverviewSection />;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onNotificationClick={() => setShowNotificationCenter(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-lg w-full">
                  {/* Decorative Top Element */}
                  <div className="relative mb-8">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 blur-2xl animate-pulse"></div>
                    </div>
                    <div className="relative">
                      {/* Spinning Circle with Islamic Pattern */}
                      <div className="relative mx-auto w-24 h-24 mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-accent animate-spin"></div>
                        <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-primary border-l-accent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Arabic Text - Beautiful Typography */}
                  <div className="mb-8 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent blur-xl"></div>
                    <p 
                      className="relative text-primary font-bold text-5xl sm:text-6xl md:text-7xl leading-relaxed" 
                      dir="rtl" 
                      style={{ 
                        fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif',
                        textShadow: '0 2px 10px rgba(46, 77, 50, 0.2)',
                        letterSpacing: '0.05em'
                      }}
                    >
                      اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ
                    </p>
                    {/* Decorative Underline */}
                    <div className="mx-auto w-40 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full mt-4"></div>
                  </div>

                  {/* Progress Bar - Elegant Design */}
                  <div className="mb-6">
                    <div className="relative w-full max-w-md mx-auto h-2 bg-gray-200/50 rounded-full overflow-hidden backdrop-blur-sm">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 animate-pulse"></div>
                      <div 
                        className="relative h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full animate-pulse shadow-lg"
                        style={{ 
                          width: '60%',
                          boxShadow: '0 0 20px rgba(46, 77, 50, 0.4)'
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Subtitle */}
                  <p className="text-gray-600 text-sm font-medium mb-2">Please wait while we fetch your data</p>
                  
                  {/* Decorative Bottom Element */}
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                      <p className="text-red-600 text-sm font-semibold">Error: {error}</p>
                    </div>
                  )}
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
      <div className="flex h-screen bg-background">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onNotificationClick={() => setShowNotificationCenter(true)} />
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
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
        isMobileOpen={isSidebarOpen}
        onMobileToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header 
          onNotificationClick={() => setShowNotificationCenter(true)}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {renderSection()}
          </div>
        </main>
      </div>

      {/* Registration Modals - Lazy loaded */}
      {showStudentForm && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <StudentRegistrationForm 
            onClose={() => setShowStudentForm(false)} 
            student={selectedStudent}
            isEdit={!!selectedStudent}
          />
        </Suspense>
      )}
      {showTeacherForm && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <TeacherRegistrationForm 
            onClose={() => {
              setShowTeacherForm(false);
              setSelectedTeacher(null);
            }}
            teacher={selectedTeacher}
            isEdit={!!selectedTeacher}
          />
        </Suspense>
      )}
      {showAdminForm && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <AdminRegistrationForm onClose={() => setShowAdminForm(false)} />
        </Suspense>
      )}
      {showPermissionManager && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <PermissionManager onClose={() => setShowPermissionManager(false)} />
        </Suspense>
      )}
      {showDataManager && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <DataManager onClose={() => setShowDataManager(false)} />
        </Suspense>
      )}

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


      {showTeacherPayroll && selectedTeacher && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <TeacherPayroll
            teacher={selectedTeacher}
            onClose={() => {
              setShowTeacherPayroll(false);
              setSelectedTeacher(null);
            }}
          />
        </Suspense>
      )}

      {showTeacherPerformance && selectedTeacher && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <TeacherPerformance
            teacher={selectedTeacher}
            onClose={() => {
              setShowTeacherPerformance(false);
              setSelectedTeacher(null);
            }}
          />
        </Suspense>
      )}

      {showTeacherAttendance && selectedTeacher && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <TeacherAttendance
            teacher={selectedTeacher}
            onClose={() => {
              setShowTeacherAttendance(false);
              setSelectedTeacher(null);
            }}
          />
        </Suspense>
      )}

      {showTeacherCommunication && selectedTeacher && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <TeacherCommunication
            teacher={selectedTeacher}
            onClose={() => {
              setShowTeacherCommunication(false);
              setSelectedTeacher(null);
            }}
          />
        </Suspense>
      )}

      {/* Student Management Modals - Lazy loaded */}
      {showStudentProfile && selectedStudent && (
        <Suspense fallback={<ModalLoadingFallback />}>
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
        </Suspense>
      )}

      {showStudentEnrollment && selectedStudent && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <StudentEnrollment
            student={selectedStudent}
            onClose={() => {
              setShowStudentEnrollment(false);
              setSelectedStudent(null);
            }}
          />
        </Suspense>
      )}

      {showStudentPayments && selectedStudent && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <StudentPayments
            student={selectedStudent}
            onClose={() => {
              setShowStudentPayments(false);
              setSelectedStudent(null);
            }}
          />
        </Suspense>
      )}

      {showStudentProgress && selectedStudent && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <StudentProgress
            student={selectedStudent}
            onClose={() => {
              setShowStudentProgress(false);
              setSelectedStudent(null);
            }}
          />
        </Suspense>
      )}

      {showStudentCommunication && selectedStudent && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <StudentCommunication
            student={selectedStudent}
            onClose={() => {
              setShowStudentCommunication(false);
              setSelectedStudent(null);
            }}
          />
        </Suspense>
      )}

      {showStudentCredentials && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <StudentCredentials
            student={selectedStudent || { id: 'general', name: 'System Access Management' }}
            onClose={() => {
              setShowStudentCredentials(false);
              setSelectedStudent(null);
            }}
          />
        </Suspense>
      )}

      {showStudentAnalytics && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <StudentAnalytics
            student={selectedStudent || { id: 'general', name: 'System Analytics' }}
            onClose={() => {
              setShowStudentAnalytics(false);
              setSelectedStudent(null);
            }}
          />
        </Suspense>
      )}

      {showStudentBulkOperations && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <StudentBulkOperations
            onClose={() => setShowStudentBulkOperations(false)}
          />
        </Suspense>
      )}

      {/* Teacher Advanced Features Modals - Lazy loaded */}
      {showTeacherCredentials && (
        <Suspense fallback={<ModalLoadingFallback />}>
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
        </Suspense>
      )}

      {showTeacherAnalytics && (
        <Suspense fallback={<ModalLoadingFallback />}>
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
        </Suspense>
      )}

      {showTeacherBulkOperations && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <TeacherBulkOperations
            onClose={() => setShowTeacherBulkOperations(false)}
          />
        </Suspense>
      )}

      {/* Recitation Review Modal */}
      {showRecitationReview && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <AdminRecitationReview
            onClose={() => setShowRecitationReview(false)}
            onSuccess={() => {
              setShowRecitationReview(false);
              refreshNotifications();
            }}
          />
        </Suspense>
      )}

      {/* Ticket Review Modal */}
      {showTicketReview && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <AdminTicketReview
            onClose={() => setShowTicketReview(false)}
          />
        </Suspense>
      )}

      {/* Student Reports Modal */}
      {showStudentReports && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <StudentReports
            onClose={() => setShowStudentReports(false)}
          />
        </Suspense>
      )}

      {/* Notification Center Modal */}
      {showNotificationCenter && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <AdminNotificationCenter
            onClose={() => setShowNotificationCenter(false)}
          />
        </Suspense>
      )}

      {/* Activity Log Modal */}
      {showActivityLog && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <ActivityLog
            onClose={() => setShowActivityLog(false)}
          />
        </Suspense>
      )}

      {/* Email Module Modal */}
      {showEmailModule && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <EmailModule
            onClose={() => setShowEmailModule(false)}
          />
        </Suspense>
      )}

      {/* Student Testing Module Modal */}
      {showTestingModule && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <StudentTestingModule
            onClose={() => setShowTestingModule(false)}
          />
        </Suspense>
      )}

      {/* Test Results Page Modal */}
      {showTestResults && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <TestResultsPage
            onClose={() => setShowTestResults(false)}
          />
        </Suspense>
      )}

      {showEvaluationManagement && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <TeacherEvaluationManagement
            onClose={() => setShowEvaluationManagement(false)}
          />
        </Suspense>
      )}

      {showEvaluationResults && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <EvaluationResultsPage
            onClose={() => setShowEvaluationResults(false)}
          />
        </Suspense>
      )}

      {/* Teacher Attendance Form Modal */}
      {showTeacherAttendanceForm && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <TeacherAttendanceForm
            onClose={() => setShowTeacherAttendanceForm(false)}
          />
        </Suspense>
      )}

      {/* Teacher Attendance Report Modal */}
      {showTeacherAttendanceReport && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <TeacherAttendanceReport
            onClose={() => setShowTeacherAttendanceReport(false)}
          />
        </Suspense>
      )}

      {/* Teacher Pair Management Modal */}
      {showTeacherPairManagement && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <TeacherPairManagement
            onClose={() => setShowTeacherPairManagement(false)}
            onViewMessages={(pair: any) => {
              // Open admin view of pair messages
              setShowTeacherPairManagement(false);
              setShowPairMessagesAdmin(true);
            }}
          />
        </Suspense>
      )}

      {/* Pair Teacher Messages Admin Modal */}
      {showPairMessagesAdmin && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <PairTeacherMessagesAdmin
            onClose={() => setShowPairMessagesAdmin(false)}
          />
        </Suspense>
      )}

      {/* Teacher-Student Messages Admin Modal */}
      {showTeacherStudentMessagesAdmin && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <TeacherStudentMessagesAdmin
            onClose={() => setShowTeacherStudentMessagesAdmin(false)}
            onInitiateMessage={(teacher: any, student: any) => {
              setShowTeacherStudentMessagesAdmin(false);
              setSelectedTeacherForMessage(teacher);
              setSelectedStudentForMessage(student);
              setShowTeacherStudentMessage(true);
            }}
          />
        </Suspense>
      )}

      {/* Teacher-Student Message Modal (Admin Initiated) */}
      {showTeacherStudentMessage && selectedTeacherForMessage && selectedStudentForMessage && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <TeacherStudentMessage
            teacher={selectedTeacherForMessage}
            student={selectedStudentForMessage}
            onClose={() => {
              setShowTeacherStudentMessage(false);
              setSelectedTeacherForMessage(null);
              setSelectedStudentForMessage(null);
              setShowTeacherStudentMessagesAdmin(true);
            }}
            adminView={true}
            adminCanInitiate={true}
          />
        </Suspense>
      )}

      {process.env.NODE_ENV === 'development' && DebugPanel && (
        <Suspense fallback={null}>
          <DebugPanel />
        </Suspense>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
