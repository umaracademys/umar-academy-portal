import React, { useEffect, useRef, useState, useMemo, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import { useData } from '../contexts/DataContext';
import { useBackendData } from '../contexts/BackendDataContext';
import { formatTimeAgo } from '../utils/formatters';

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
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
const DebugPanel = isDevelopment ? lazy(() => import('../components/DebugPanel')) : null;
const AdminRecitationReview = lazy(() => import('../components/AdminRecitationReview'));
const StudentReports = lazy(() => import('../components/StudentReports'));
const AdminTicketReview = lazy(() => import('../components/AdminTicketReview'));
const ActiveTicketsManagement = lazy(() => import('../components/ActiveTicketsManagement'));
const AdminNotificationCenter = lazy(() => import('../components/AdminNotificationCenter'));
const ActivityLog = lazy(() => import('../components/ActivityLog'));
const EmailModule = lazy(() => import('../components/EmailModule'));
const StudentTestingModule = lazy(() => import('../components/StudentTestingModule'));
const TestResultsPage = lazy(() => import('../components/TestResultsPage'));
const TeacherEvaluationManagement = lazy(() => import('../components/TeacherEvaluationManagement'));
const EvaluationResultsPage = lazy(() => import('../components/EvaluationResultsPage'));
const TeacherAttendanceForm = lazy(() => import('../components/TeacherAttendanceForm'));
const TeacherAttendanceReport = lazy(() => import('../components/TeacherAttendanceReport'));
const PairTeacherMessagesAdmin = lazy(() => import('../components/PairTeacherMessagesAdmin'));
const TeacherStudentMessage = lazy(() => import('../components/TeacherStudentMessage'));
const TeacherStudentMessagesAdmin = lazy(() => import('../components/TeacherStudentMessagesAdmin'));
const PdfManagement = lazy(() => import('../components/PdfManagement'));
const StudentPersonalMushaf = lazy(() => import('../components/StudentPersonalMushaf'));
const WeeklyEvaluationsAdmin = lazy(() => import('../components/WeeklyEvaluationsAdmin'));
const ApprovedEvaluationsAdmin = lazy(() => import('../components/ApprovedEvaluationsAdmin'));
const ApprovedTicketsAdmin = lazy(() => import('../components/ApprovedTicketsAdmin'));
const SuperAdminProfile = lazy(() => import('../components/SuperAdminProfile'));
const HelpAndSupport = lazy(() => import('../components/HelpAndSupport'));
const LockedAccountsManager = lazy(() => import('../components/LockedAccountsManager'));
const TeacherStudentAssignmentManager = lazy(() => import('../components/TeacherStudentAssignmentManager'));

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

  const { getPendingReviewTickets, recitationTickets, assignments, fixMissingAssignmentIds, loadingStep, deleteTicket, updateRecitationTicket } = useBackendData();

  // Track tickets with missing assignment IDs
  const [ticketsWithMissingIds, setTicketsWithMissingIds] = useState<number>(0);
  const [isFixingIds, setIsFixingIds] = useState(false);

  // Track tickets with missing assignment IDs (production-safe)
  useEffect(() => {
    if (isDevelopment) {
      console.log('🔍 SuperAdminDashboard - Pending review tickets:', getPendingReviewTickets().length);
    }
    
    // Check for tickets that were sent to assignment
    const sentTickets = recitationTickets.filter(t => t.status === 'sent_to_assignment');
    const missingIds = sentTickets.filter(t => !t.sentToAssignmentId || t.sentToAssignmentId === 'N/A');
    setTicketsWithMissingIds(missingIds.length);
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
  const [showStudentCredentials, setShowStudentCredentials] = useState(false);

  // Teacher Management State
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [showTeacherProfile, setShowTeacherProfile] = useState(false);
  const [showTeacherCredentials, setShowTeacherCredentials] = useState(false);
  const [showTeacherStudentAssignment, setShowTeacherStudentAssignment] = useState(false);
  const [showLockedAccounts, setShowLockedAccounts] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showTicketReview, setShowTicketReview] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState<{ enabled: boolean; message?: string }>({ enabled: false });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    systemManagement: false,
  });

  // Fetch maintenance mode status
  useEffect(() => {
    const fetchMaintenanceMode = async () => {
      try {
        const API_BASE_RAW = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001';
        const API_BASE = API_BASE_RAW.endsWith('/api') ? API_BASE_RAW : `${API_BASE_RAW}/api`;
        const response = await fetch(`${API_BASE}/maintenance`);
        if (response.ok) {
          const data = await response.json();
          setMaintenanceMode(data);
        }
      } catch (error) {
        console.error('Error fetching maintenance mode:', error);
      }
    };
    fetchMaintenanceMode();
  }, []);

  // Toggle maintenance mode
  const handleToggleMaintenance = async () => {
    if (isTogglingMaintenance) return;
    
    setIsTogglingMaintenance(true);
    try {
      const API_BASE_RAW = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001';
      const API_BASE = API_BASE_RAW.endsWith('/api') ? API_BASE_RAW : `${API_BASE_RAW}/api`;
      const token = localStorage.getItem('umar_academy_token');
      
      const response = await fetch(`${API_BASE}/maintenance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          enabled: !maintenanceMode.enabled,
          message: maintenanceMode.message || 'The system is currently under maintenance. Please check back soon.'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMaintenanceMode(data);
        alert(`Maintenance mode ${data.enabled ? 'enabled' : 'disabled'}`);
      } else {
        const error = await response.json();
        alert(`Failed to toggle maintenance mode: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      alert('Failed to toggle maintenance mode. Please try again.');
    } finally {
      setIsTogglingMaintenance(false);
    }
  };

  // Get pending recitation reviews count
  const pendingReviewsCount = recitationReviews.filter(r => r.status === 'pending_review').length;
  const pendingTicketCount = getPendingReviewTickets().length;
  
  // Calculate total unread notifications (backend + dynamic) - same logic as Header
  const unreadNotificationsCount = useMemo(() => {
    // Backend notifications
    const backendUnread = adminNotifications.filter(n => !n.read).length;
    
    // Dynamic notifications (homework, tickets, recitations)
    const pendingHomework = assignments.filter((assignment: any) => 
      assignment.homework?.enabled && 
      assignment.homework?.submission?.submitted && 
      assignment.homework?.submission?.status === 'submitted'
    ).length;
    
    const pendingTickets = recitationTickets.filter(t => t.status === 'submitted').length;
    const pendingRecitations = recitationReviews.filter(r => r.status === 'pending_review').length;
    
    return backendUnread + pendingHomework + pendingTickets + pendingRecitations;
  }, [adminNotifications, assignments, recitationTickets, recitationReviews]);
  
  // Calculate high priority unread notifications
  const highPriorityUnreadCount = useMemo(() => {
    const backendHigh = adminNotifications.filter(n => n.priority === 'high' && !n.read).length;
    
    // Dynamic high priority notifications
    const pendingHomework = assignments.filter((assignment: any) => 
      assignment.homework?.enabled && 
      assignment.homework?.submission?.submitted && 
      assignment.homework?.submission?.status === 'submitted'
    ).length;
    
    const pendingTickets = recitationTickets.filter(t => t.status === 'submitted').length;
    
    return backendHigh + pendingHomework + pendingTickets;
  }, [adminNotifications, assignments, recitationTickets]);
  
  // Get pending homework submissions count
  const pendingHomeworkCount = useMemo(() => {
    return assignments.filter((assignment: any) => 
      assignment.homework?.enabled && 
      assignment.homework?.submission?.submitted && 
      assignment.homework?.submission?.status === 'submitted'
    ).length;
  }, [assignments]);

  // Get completed assignments/homework count
  // Get pending weekly evaluations count
  const [pendingWeeklyEvaluationsCount, setPendingWeeklyEvaluationsCount] = useState(0);
  
  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
        const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/weekly-evaluations?status=under_review`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          setPendingWeeklyEvaluationsCount(data.length);
        }
      } catch (error) {
        console.error('Error loading pending weekly evaluations count:', error);
      }
    };
    loadPendingCount();
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalStudents = students.length;
  const activeStudentCount = students.filter((student) => student.status === 'active').length;
  const totalTeachers = teachers.length;
  const activeTeacherCount = teachers.filter((teacher) => teacher.status === 'active').length;
  const totalAdmins = admins.length;


  const managementActions = useMemo(() => [
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
      action: () => navigate('/teachers'),
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
      id: 'locked-accounts',
      badge: '🔒',
      title: 'Locked Accounts',
      description: 'View and unlock accounts locked due to failed login attempts.',
      action: () => setShowLockedAccounts(true),
      footer: 'Manage locks',
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
      id: 'review-tickets',
      badge: '🎫',
      title: 'Review Tickets',
      description: 'Review and approve submitted tickets from teachers.',
      action: () => {
        console.log('🖱️ SuperAdminDashboard: Review Tickets button clicked, opening modal');
        setShowTicketReview(true);
      },
      footer: `${pendingTicketCount} pending`,
    },
  ], [totalStudents, totalTeachers, totalAdmins, pendingTicketCount, navigate, setSelectedStudent, setShowStudentForm, setSelectedTeacher, setShowTeacherForm, setShowAdminForm, setShowPermissionManager, setShowDataManager, setShowLockedAccounts, setShowTicketReview]);

  // Calculate additional metrics
  const inactiveStudentCount = totalStudents - activeStudentCount;
  const inactiveTeacherCount = totalTeachers - activeTeacherCount;
  const totalPendingItems = pendingReviewsCount + pendingTicketCount + pendingHomeworkCount;

  const OverviewSection = () => (
    <div className="space-y-2">
      {/* Welcome Header - Compact */}
      <section className="rounded border border-gray-200 bg-white px-2 py-2">
        <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
                Super Admin
              </span>
              {totalPendingItems > 0 && (
                <span className="rounded bg-red-500 text-white px-1.5 py-0.5 text-[9px] font-bold">
                  {totalPendingItems} pending
                </span>
              )}
            </div>
            <h1 className="text-base font-bold text-primary">Dashboard</h1>
            <div className="flex flex-wrap items-center gap-1 text-[9px] font-semibold">
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary border border-primary/20">
                {activeStudentCount} students
              </span>
              <span className="rounded bg-accent/10 px-1.5 py-0.5 text-accent border border-accent/20">
                {activeTeacherCount} teachers
              </span>
              <span className="rounded bg-orange-100 px-1.5 py-0.5 text-orange-700 border border-orange-200">
                {pendingReviewsCount} reviews
              </span>
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700 border border-blue-200">
                {pendingTicketCount} tickets
              </span>
              {pendingWeeklyEvaluationsCount > 0 && (
                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-purple-700 border border-purple-200">
                  {pendingWeeklyEvaluationsCount} evaluations
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Stats Grid - Compact */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <div className="bg-white rounded border border-primary/20 p-2 hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">Students</p>
            <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
              <span className="text-xs">👥</span>
            </div>
          </div>
          <p className="text-xl font-bold text-primary mb-0.5">{totalStudents}</p>
          <div className="flex items-center gap-1 text-[9px]">
            <span className="text-green-600 font-semibold">+{activeStudentCount}</span>
            {inactiveStudentCount > 0 && (
              <span className="text-gray-400">• {inactiveStudentCount}</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded border border-accent/20 p-2 hover:border-accent/40 transition-all">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">Teachers</p>
            <div className="h-6 w-6 rounded bg-accent/10 flex items-center justify-center">
              <span className="text-xs">👨‍🏫</span>
            </div>
          </div>
          <p className="text-xl font-bold text-accent mb-0.5">{totalTeachers}</p>
          <div className="flex items-center gap-1 text-[9px]">
            <span className="text-green-600 font-semibold">+{activeTeacherCount}</span>
            {inactiveTeacherCount > 0 && (
              <span className="text-gray-400">• {inactiveTeacherCount}</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded border border-orange-200 p-2 hover:border-orange-300 transition-all">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">Pending</p>
            <div className="h-6 w-6 rounded bg-orange-50 flex items-center justify-center">
              <span className="text-xs">📋</span>
            </div>
          </div>
          <p className="text-xl font-bold text-orange-600 mb-0.5">{pendingReviewsCount + pendingTicketCount}</p>
          <div className="flex items-center gap-1 text-[9px]">
            <span className="text-orange-600 font-semibold">{pendingReviewsCount}</span>
            <span className="text-gray-400">• {pendingTicketCount}</span>
          </div>
        </div>

      </section>


      {/* System Management - Wrapped */}
      <section className="rounded border border-gray-200 bg-white px-2 py-2">
        <button
          onClick={() => setExpandedSections(prev => ({ ...prev, systemManagement: !prev.systemManagement }))}
          className="w-full flex items-center justify-between mb-1.5"
        >
          <h3 className="text-sm font-bold text-primary">System Management</h3>
          <span className="text-[9px] text-gray-600">
            {expandedSections.systemManagement ? '▼' : '▶'}
          </span>
        </button>
        {expandedSections.systemManagement && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
          {managementActions.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className="flex flex-col items-center gap-1 rounded border border-gray-200 bg-white px-2 py-2 text-center transition-all hover:bg-soft-primary hover:border-primary/40"
            >
              <div className="inline-flex h-8 w-8 items-center justify-center rounded bg-soft-primary text-xs font-bold text-primary">
                {item.badge}
              </div>
              <div className="flex-1">
                <h4 className="text-[10px] font-semibold text-primary leading-tight">{item.title}</h4>
                <p className="text-[9px] text-gray-500 mt-0.5">{item.footer}</p>
              </div>
            </button>
          ))}
        </div>
        )}
      </section>
    </div>
  );

  // System Management Section - Compact
  const SystemSection = () => (
    <div className="space-y-2">
      <h2 className="text-sm font-bold text-primary">System Tools</h2>
      <div className="grid grid-cols-1 gap-1.5 md:grid-cols-3">
        <button
          onClick={() => setShowPermissionManager(true)}
          className="flex h-full flex-col gap-1.5 rounded border border-gray-200 bg-white px-2 py-2 text-left transition hover:border-primary/30"
        >
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-soft-primary text-[10px] font-semibold text-primary">
            PM
          </div>
          <div className="flex-1">
            <h3 className="text-xs font-semibold text-primary">Permissions</h3>
            <p className="mt-0.5 text-[10px] text-gray-600">
              Adjust role access
            </p>
          </div>
        </button>

        <button
          onClick={() => setShowDataManager(true)}
          className="flex h-full flex-col gap-1.5 rounded border border-gray-200 bg-white px-2 py-2 text-left transition hover:border-primary/30"
        >
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-soft-primary text-[10px] font-semibold text-primary">
            DB
          </div>
          <div className="flex-1">
            <h3 className="text-xs font-semibold text-primary">Data Manager</h3>
            <p className="mt-0.5 text-[10px] text-gray-600">
              Export & backup
            </p>
          </div>
        </button>

        <button
          onClick={() => refreshNotifications()}
          className="flex h-full flex-col gap-1.5 rounded border border-gray-200 bg-white px-2 py-2 text-left transition hover:border-primary/30"
        >
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-soft-primary text-[10px] font-semibold text-primary">
            🔄
          </div>
          <div className="flex-1">
            <h3 className="text-xs font-semibold text-primary">Refresh</h3>
            <p className="mt-0.5 text-[10px] text-gray-600">
              Sync notifications
            </p>
          </div>
        </button>

      </div>

      <Card title="Live Signals">
        <div className="space-y-1.5 text-xs text-gray-600">
          <div className="flex items-center justify-between rounded border border-gray-200 bg-white px-2 py-1.5">
            <span className="font-semibold text-accent text-[10px]">Notifications</span>
            <div className="flex items-center gap-1.5">
              {highPriorityUnreadCount > 0 && (
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-700 border border-red-200">
                  {highPriorityUnreadCount} high
                </span>
              )}
              <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[9px] font-semibold text-accent">
                {unreadNotificationsCount} unread
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between rounded border border-gray-200 bg-white px-2 py-1.5">
            <span className="font-semibold text-primary text-[10px]">Reviews</span>
            <span className="text-[10px] font-semibold text-primary">{pendingReviewsCount}</span>
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
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection}
          onHelpClick={() => setShowHelpAndSupport(true)}
        />
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
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection}
          onHelpClick={() => setShowHelpAndSupport(true)}
        />
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

  // If Teacher-Student Assignment is active, show only that (full screen)
  if (showTeacherStudentAssignment) {
    return (
      <Suspense fallback={<ModalLoadingFallback />}>
        <TeacherStudentAssignmentManager
          onClose={() => setShowTeacherStudentAssignment(false)}
        />
      </Suspense>
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
        onTeacherStudentAssignmentClick={() => setShowTeacherStudentAssignment(true)}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header 
          onNotificationClick={() => setShowNotificationCenter(true)}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-2">
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
            setShowTeacherProfile(false);
            setSelectedTeacher(teacher);
            setShowTeacherForm(true);
          }}
        />
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

      {showStudentCredentials && selectedStudent && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <StudentCredentials
            student={selectedStudent}
            onClose={() => {
              setShowStudentCredentials(false);
              setSelectedStudent(null);
            }}
          />
        </Suspense>
      )}

      {/* Teacher Credentials Modal */}
      {showTeacherCredentials && selectedTeacher && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <TeacherCredentials
            teacher={selectedTeacher}
            onClose={() => {
              setShowTeacherCredentials(false);
              setSelectedTeacher(null);
            }}
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

      {/* Ticket Review Modal */}
      {showTicketReview && (
        <Suspense fallback={<ModalLoadingFallback />}>
          {console.log('🔄 SuperAdminDashboard: Rendering AdminTicketReview modal')}
          <AdminTicketReview
            onClose={() => {
              console.log('🔄 SuperAdminDashboard: Closing ticket review modal');
              setShowTicketReview(false);
            }}
          />
        </Suspense>
      )}

      {/* Debug Panel */}
      {isDevelopment && DebugPanel && (
        <Suspense fallback={null}>
          <DebugPanel />
        </Suspense>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
