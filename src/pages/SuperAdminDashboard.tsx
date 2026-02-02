import React, { useEffect, useRef, useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/ui/Button';
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
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showHelpAndSupport, setShowHelpAndSupport] = useState(false);

  // Debug: Log when showTicketReview changes (only log actual changes, not every render)
  const prevShowTicketReviewRef = useRef(showTicketReview);
  useEffect(() => {
    if (prevShowTicketReviewRef.current !== showTicketReview) {
      console.log('🔍 SuperAdminDashboard: showTicketReview changed from', prevShowTicketReviewRef.current, 'to', showTicketReview);
      prevShowTicketReviewRef.current = showTicketReview;
    }
  }, [showTicketReview]);
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

  const totalPendingItems = pendingReviewsCount + pendingTicketCount + pendingHomeworkCount;

  const OverviewSection = () => (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="heading-page">System Overview</h1>
        <p className="caption mt-1 text-gray-600">Monitor system health and take high-level actions.</p>
      </div>

      {/* Section 1 — Action Required */}
      <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-gray-200">
          <h2 className="heading-section">Action required</h2>
          <p className="caption mt-0.5 text-gray-600">Items that need super administrator attention</p>
        </div>
        <div className="divide-y divide-gray-200">
          {pendingTicketCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 min-h-[44px]">
              <p className="body-text text-gray-700">
                {pendingTicketCount} unresolved system ticket{pendingTicketCount !== 1 ? 's' : ''}
              </p>
              <Button variant="outline" size="sm" className="min-h-[44px] shrink-0 w-full sm:w-auto" onClick={() => setShowTicketReview(true)}>
                View tickets
              </Button>
            </div>
          )}
          {(pendingReviewsCount > 0 || pendingHomeworkCount > 0) && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 min-h-[44px]">
              <p className="body-text text-gray-700">
                {pendingReviewsCount + pendingHomeworkCount} item{(pendingReviewsCount + pendingHomeworkCount) !== 1 ? 's' : ''} awaiting review
              </p>
              <Button variant="outline" size="sm" className="min-h-[44px] shrink-0 w-full sm:w-auto" onClick={() => setShowNotificationCenter(true)}>
                Review
              </Button>
            </div>
          )}
          {pendingWeeklyEvaluationsCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 min-h-[44px]">
              <p className="body-text text-gray-700">
                {pendingWeeklyEvaluationsCount} evaluation{pendingWeeklyEvaluationsCount !== 1 ? 's' : ''} under review
              </p>
              <Button variant="outline" size="sm" className="min-h-[44px] shrink-0 w-full sm:w-auto" onClick={() => navigate('/weekly-evaluations')}>
                Open evaluations
              </Button>
            </div>
          )}
          {totalPendingItems === 0 && (
            <div className="px-4 sm:px-5 py-4 min-h-[44px]">
              <p className="body-text text-gray-600">Nothing requires action right now.</p>
            </div>
          )}
        </div>
      </section>

      {/* Section 2 — System Status */}
      <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-gray-200">
          <h2 className="heading-section">System status</h2>
          <p className="caption mt-0.5 text-gray-600">Current platform and operational state</p>
        </div>
        <ul className="divide-y divide-gray-200">
          <li className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 min-h-[44px]">
            <span className="caption text-gray-600">Backend</span>
            <span className="body-text text-gray-800">{loading ? '…' : 'Operational'}</span>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 min-h-[44px]">
            <span className="caption text-gray-600">Database</span>
            <span className="body-text text-gray-800">Connected</span>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 min-h-[44px]">
            <span className="caption text-gray-600">Message system</span>
            <span className="body-text text-gray-800">Active</span>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 min-h-[44px]">
            <span className="caption text-gray-600">Maintenance</span>
            <span className="body-text text-gray-800">{maintenanceMode.enabled ? 'On' : 'Off'}</span>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 min-h-[44px]">
            <span className="caption text-gray-600">Last deployment</span>
            <span className="body-text text-gray-800">Recent</span>
          </li>
        </ul>
      </section>

      {/* Section 3 — Academy Snapshot */}
      <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-gray-200">
          <h2 className="heading-section">Academy snapshot</h2>
          <p className="caption mt-0.5 text-gray-600">High-level academy overview</p>
        </div>
        <ul className="divide-y divide-gray-200">
          <li className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 min-h-[44px]">
            <span className="caption text-gray-600">Total students</span>
            <span className="body-text text-gray-800">{totalStudents}</span>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 min-h-[44px]">
            <span className="caption text-gray-600">Total teachers</span>
            <span className="body-text text-gray-800">{totalTeachers}</span>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 min-h-[44px]">
            <span className="caption text-gray-600">Active classes</span>
            <span className="body-text text-gray-800">—</span>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 min-h-[44px]">
            <span className="caption text-gray-600">Attendance coverage</span>
            <span className="body-text text-gray-800">—</span>
          </li>
        </ul>
      </section>

      {/* Section 4 — System Control */}
      <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-gray-200">
          <h2 className="heading-section">System control</h2>
          <p className="caption mt-0.5 text-gray-600">Administrative tools and governance</p>
        </div>
        <div className="p-4 sm:p-5 space-y-2">
          <Button variant="outline" size="md" className="w-full sm:w-auto min-h-[44px] justify-center sm:justify-center" onClick={() => setShowPermissionManager(true)}>
            Permissions
          </Button>
          <Button variant="outline" size="md" className="w-full sm:w-auto min-h-[44px] justify-center sm:justify-center" onClick={() => navigate('/permissions')}>
            User roles
          </Button>
          <Button variant="outline" size="md" className="w-full sm:w-auto min-h-[44px] justify-center sm:justify-center" onClick={handleToggleMaintenance} disabled={isTogglingMaintenance}>
            {isTogglingMaintenance ? 'Updating…' : 'System settings'}
          </Button>
          <Button variant="outline" size="md" className="w-full sm:w-auto min-h-[44px] justify-center sm:justify-center" onClick={() => setShowDataManager(true)}>
            Exports & backups
          </Button>
          <Button variant="outline" size="md" className="w-full sm:w-auto min-h-[44px] justify-center sm:justify-center" onClick={() => setShowActivityLog(true)}>
            Audit logs
          </Button>
        </div>
      </section>
    </div>
  );

  const SystemSection = () => (
    <div className="space-y-6">
      <div>
        <h1 className="heading-page">System tools</h1>
        <p className="caption mt-1 text-gray-600">Permissions, data, and refresh.</p>
      </div>
      <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-5 space-y-2">
          <Button variant="outline" size="md" className="w-full sm:w-auto min-h-[44px]" onClick={() => setShowPermissionManager(true)}>
            Permissions
          </Button>
          <Button variant="outline" size="md" className="w-full sm:w-auto min-h-[44px]" onClick={() => setShowDataManager(true)}>
            Exports & backups
          </Button>
          <Button variant="outline" size="md" className="w-full sm:w-auto min-h-[44px]" onClick={() => refreshNotifications()}>
            Refresh notifications
          </Button>
        </div>
      </section>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header onNotificationClick={() => setShowNotificationCenter(true)} />
        <AppLayout
          sidebar={
            <Sidebar
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              isMobileOpen={isSidebarOpen}
              onMobileToggle={() => setIsSidebarOpen(!isSidebarOpen)}
              onMobileClose={() => setIsSidebarOpen(false)}
              onHelpClick={() => setShowHelpAndSupport(true)}
              onTeacherStudentAssignmentClick={() => setShowTeacherStudentAssignment(true)}
            />
          }
          sidebarOpen={isSidebarOpen}
          onOverlayClick={() => setIsSidebarOpen(false)}
        >
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-primary mx-auto mb-4" />
              <p className="body-text text-gray-600">Loading…</p>
            </div>
          </div>
        </AppLayout>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header onNotificationClick={() => setShowNotificationCenter(true)} />
        <AppLayout
          sidebar={
            <Sidebar
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              isMobileOpen={isSidebarOpen}
              onMobileToggle={() => setIsSidebarOpen(!isSidebarOpen)}
              onMobileClose={() => setIsSidebarOpen(false)}
              onHelpClick={() => setShowHelpAndSupport(true)}
              onTeacherStudentAssignmentClick={() => setShowTeacherStudentAssignment(true)}
            />
          }
          sidebarOpen={isSidebarOpen}
          onOverlayClick={() => setIsSidebarOpen(false)}
        >
          <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-xl">
            <h2 className="heading-section">Error loading data</h2>
            <p className="body-text text-gray-700 mt-2">{error}</p>
            <Button variant="outline" size="md" className="mt-4 min-h-[44px]" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </AppLayout>
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        onNotificationClick={() => setShowNotificationCenter(true)}
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <AppLayout
        sidebar={
          <Sidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            isMobileOpen={isSidebarOpen}
            onMobileToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            onMobileClose={() => setIsSidebarOpen(false)}
            onHelpClick={() => setShowHelpAndSupport(true)}
            onTeacherStudentAssignmentClick={() => setShowTeacherStudentAssignment(true)}
          />
        }
        sidebarOpen={isSidebarOpen}
        onOverlayClick={() => setIsSidebarOpen(false)}
        maxWidth="7xl"
      >
        {renderSection()}
      </AppLayout>

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
            onOpenTicketReview={() => {
              console.log('🔔 SuperAdminDashboard: Opening ticket review from notification');
              setShowNotificationCenter(false);
              setShowTicketReview(true);
            }}
            onOpenRecitationReview={() => {
              console.log('🔔 SuperAdminDashboard: Opening recitation review from notification');
              setShowNotificationCenter(false);
              // TODO: Add recitation review modal if needed
            }}
          />
        </Suspense>
      )}

      {/* Ticket Review Modal */}
      {showTicketReview && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <AdminTicketReview
            onClose={() => {
              console.log('🔄 SuperAdminDashboard: Closing ticket review modal');
              setShowTicketReview(false);
            }}
          />
        </Suspense>
      )}

      {/* Activity Log (Audit logs) */}
      {showActivityLog && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <ActivityLog onClose={() => setShowActivityLog(false)} />
        </Suspense>
      )}

      {/* Help and Support */}
      {showHelpAndSupport && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <HelpAndSupport onClose={() => setShowHelpAndSupport(false)} />
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
