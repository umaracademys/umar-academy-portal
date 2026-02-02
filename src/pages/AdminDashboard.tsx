import React, { useState, lazy, Suspense, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AppLayout from '../components/layout/AppLayout';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
// DebugPanel only in development
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
const DebugPanel = isDevelopment ? lazy(() => import('../components/DebugPanel')) : null;
const PermissionManager = lazy(() => import('../components/PermissionManager'));
import StudentList from '../components/StudentList';
import StudentProfile from '../components/StudentProfile';
import StudentEnrollment from '../components/StudentEnrollment';
import StudentPayments from '../components/StudentPayments';
import StudentProgress from '../components/StudentProgress';
import StudentCommunication from '../components/StudentCommunication';
import TeacherList from '../components/TeacherList';
import TeacherProfile from '../components/TeacherProfile';
import EmailModule from '../components/EmailModule';
import StudentTestingModule from '../components/StudentTestingModule';
import TestResultsPage from '../components/TestResultsPage';
import TeacherEvaluationManagement from '../components/TeacherEvaluationManagement';
import EvaluationResultsPage from '../components/EvaluationResultsPage';
import TeacherPayroll from '../components/TeacherPayroll';
import TeacherPerformance from '../components/TeacherPerformance';
import TeacherAttendance from '../components/TeacherAttendance';
import TeacherCommunication from '../components/TeacherCommunication';
import TeacherRegistrationForm from '../components/TeacherRegistrationForm';
import { useData } from '../contexts/DataContext';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { AdminPermissions } from '../types';
import { usePermission } from '../hooks/usePermission';
import { RequirePermission } from '../components/RequirePermission';
import AdminNotificationCenter from '../components/AdminNotificationCenter';
const AdminTicketReview = lazy(() => import('../components/AdminTicketReview'));
const AdminRecitationReview = lazy(() => import('../components/AdminRecitationReview'));

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { students, teachers, admins, refreshData } = useData();
  const { assignments, refreshNotifications } = useBackendData();
  const { can, permissions: jwtPermissions } = usePermission(); // Phase 4: Use JWT permissions
  
  // Refresh data on mount to ensure latest permissions are loaded
  useEffect(() => {
    refreshData();
  }, [refreshData]);
  
  // Get current admin's permissions (fallback to JWT permissions)
  const currentAdmin = useMemo(() => {
    if (!user?.email) return null;
    const foundAdmin = admins.find(admin => admin.email === user.email);
    if (isDevelopment && foundAdmin) {
      console.log('🔍 AdminDashboard - Found admin:', {
        email: foundAdmin.email,
        fullName: foundAdmin.fullName,
        permissionsCount: foundAdmin.permissions ? Object.keys(foundAdmin.permissions).length : 0,
        enabledPermissions: foundAdmin.permissions ? Object.values(foundAdmin.permissions).filter(v => v === true).length : 0,
        jwtPermissions: jwtPermissions ? Object.keys(jwtPermissions).length : 0
      });
    }
    return foundAdmin;
  }, [user?.email, admins, jwtPermissions]);
  
  // Get admin permissions with defaults - ensure all keys are present
  // Phase 4: Prioritize JWT permissions over DB permissions (JWT is source of truth)
  const permissions: AdminPermissions = useMemo(() => {
    // Use JWT permissions as primary source (Phase 3/4)
    if (jwtPermissions && typeof jwtPermissions === 'object') {
      return jwtPermissions as AdminPermissions;
    }
    
    // Default permissions object with all keys set to false
    const defaultPermissions: AdminPermissions = {
      canManageTeachers: false,
      canManageStudents: false,
      canManageFinancials: false,
      canViewReports: false,
      canManagePermissions: false,
      canAccessMessages: false,
      canViewAllMessages: false,
      canModerateMessages: false,
      canAccessPdf: false,
      canManagePdfLibrary: false,
      canViewAllPdfAnnotations: false,
      canAccessHomework: false,
      canManageHomework: false,
      canViewAllHomework: false,
      canAccessEvaluations: false,
      canManageEvaluations: false,
      canApproveEvaluations: false,
      canAccessTickets: false,
      canCreateTickets: false,
      canReviewTickets: false,
      canApproveTickets: false,
      canFinalizeTickets: false,
      canManageTicketWorkflow: false,
      canAccessAttendance: false,
      canManageAttendance: false,
      canViewAttendanceReports: false,
      canAccessRecordings: false,
      canManageRecordings: false,
      canViewAllRecordings: false,
      canAccessMushaf: false,
      canManageMushaf: false,
      canViewAllMistakes: false,
      canAccessQaidah: false,
      canManageQaidah: false,
      canViewQaidahReports: false,
      canAccessAssignments: false,
      canManageAssignments: false,
      canBulkCreateAssignments: false,
      canManageStudentAssignments: false,
      canManageNotifications: false,
      canViewNotifications: false,
      canSendNotifications: false,
      canViewAnalytics: false,
      canExportReports: false,
      canViewSystemStats: false,
    };
    
    // If admin not found or no permissions, return defaults
    if (!currentAdmin?.permissions) {
      if (isDevelopment) {
        console.warn('⚠️ AdminDashboard - No permissions found for admin:', {
          email: user?.email,
          adminFound: !!currentAdmin,
          adminId: currentAdmin?.id
        });
      }
      return defaultPermissions;
    }
    
    // Merge admin permissions with defaults to ensure all keys are present
    // This handles cases where permissions object is incomplete
    const mergedPermissions = {
      ...defaultPermissions,
      ...currentAdmin.permissions,
    };
    
    if (isDevelopment) {
      const enabledCount = Object.values(mergedPermissions).filter(v => v === true).length;
      console.log('✅ AdminDashboard - Loaded permissions:', {
        total: Object.keys(mergedPermissions).length,
        enabled: enabledCount,
        disabled: Object.keys(mergedPermissions).length - enabledCount
      });
    }
    
    return mergedPermissions;
  }, [currentAdmin, user?.email]);
  const [showEmailModule, setShowEmailModule] = useState(false);
  const [showTestingModule, setShowTestingModule] = useState(false);
  const [showTestResults, setShowTestResults] = useState(false);
  const [showEvaluationManagement, setShowEvaluationManagement] = useState(false);
  const [showEvaluationResults, setShowEvaluationResults] = useState(false);
  const [showPermissionManager, setShowPermissionManager] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showTicketReview, setShowTicketReview] = useState(false);
  const [showRecitationReview, setShowRecitationReview] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    completedAssignments: false
  });
  
  // Student Management State
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentProfile, setShowStudentProfile] = useState(false);
  const [showStudentEnrollment, setShowStudentEnrollment] = useState(false);
  const [showStudentPayments, setShowStudentPayments] = useState(false);
  const [showStudentProgress, setShowStudentProgress] = useState(false);
  const [showStudentCommunication, setShowStudentCommunication] = useState(false);

  // Teacher Management State
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [showTeacherProfile, setShowTeacherProfile] = useState(false);
  const [showTeacherPayroll, setShowTeacherPayroll] = useState(false);
  const [showTeacherPerformance, setShowTeacherPerformance] = useState(false);
  const [showTeacherAttendance, setShowTeacherAttendance] = useState(false);
  const [showTeacherCommunication, setShowTeacherCommunication] = useState(false);
  const [showTeacherForm, setShowTeacherForm] = useState(false);

  // Overview Section — Phase 1: page heading, calm spacing, no stats wall
  const OverviewSection = () => (
    <div className="space-y-6">
      <div>
        <h1 className="heading-page text-gray-900">Dashboard</h1>
        <p className="caption mt-1">Welcome back. Here’s what’s going on.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {(permissions.canAccessAssignments || permissions.canManageAssignments) && (
          <Link
            to="/assignments"
            className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 text-sm font-medium text-primary border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Assignments
          </Link>
        )}
        {permissions.canManageStudents && (
          <Button onClick={() => setActiveSection('students')} variant="outline" size="md">
            Students
          </Button>
        )}
        {permissions.canManageTeachers && (
          <Button onClick={() => setActiveSection('teachers')} variant="outline" size="md">
            Teachers
          </Button>
        )}
        <RequirePermission permission="canViewNotifications" hideIfDenied>
          <Button onClick={() => setShowNotificationCenter(true)} variant="outline" size="md">
            Notifications
          </Button>
        </RequirePermission>
      </div>

      <p className="body-text text-gray-600">
        {permissions.canManageStudents && <span>{students.length} students</span>}
        {permissions.canManageStudents && permissions.canManageTeachers && <span> · </span>}
        {permissions.canManageTeachers && <span>{teachers.length} teachers</span>}
        {permissions.canManageFinancials && students.length > 0 && (
          <span> · ${students.reduce((sum: number, s: any) => sum + (s.tuitionFee || 0), 0).toLocaleString()} revenue</span>
        )}
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="heading-section">Recent enrollments</h2>
          </div>
          <div className="p-4 space-y-2">
          <div className="space-y-1">
            {students.slice(0, 5).map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between rounded border border-gray-200 bg-white px-1.5 py-1 transition hover:bg-gray-50"
              >
                <div className="flex items-center gap-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-soft-primary text-[10px] font-semibold text-primary">
                    {student.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-primary text-[10px]">{student.fullName}</p>
                    <p className="text-[9px] text-gray-500">{student.program}</p>
                  </div>
                </div>
                <span className="text-[9px] font-medium text-gray-600">
                  {new Date(student.enrolledDate).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="heading-section">Performance</h2>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <div className="mb-0.5 flex justify-between text-sm">
                <span className="text-gray-600 body-text">Attendance</span>
                <span className="font-semibold">94%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: '94%' }} />
              </div>
            </div>
            <div>
              <div className="mb-0.5 flex justify-between text-sm">
                <span className="text-gray-600 body-text">Satisfaction</span>
                <span className="font-semibold">88%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div className="h-1.5 rounded-full bg-accent" style={{ width: '88%' }} />
              </div>
            </div>
            <div>
              <div className="mb-0.5 flex justify-between text-sm">
                <span className="text-gray-600 body-text">Completion</span>
                <span className="font-semibold">76%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div className="h-1.5 rounded-full bg-primary/60" style={{ width: '76%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Completed Assignments/Homework - Wrapped */}
      {useMemo(() => {
        const completedAssignments = assignments.filter((assignment: any) => 
          assignment.status === 'completed' || 
          (assignment.homework?.enabled && 
           assignment.homework?.submission?.submitted && 
           assignment.homework?.submission?.status === 'graded')
        );
        return completedAssignments.length > 0 ? completedAssignments.slice(0, 5) : [];
      }, [assignments]).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <button
              type="button"
              onClick={() => setExpandedSections(prev => ({ ...prev, completedAssignments: !prev.completedAssignments }))}
              className="w-full flex items-center justify-between min-h-[44px] text-left"
            >
              <span className="heading-card">Completed Assignments</span>
              <span className="caption">
                {expandedSections.completedAssignments ? '▼' : '▶'}
              </span>
            </button>
          </div>
          {expandedSections.completedAssignments && (
          <div className="overflow-x-auto p-4 pt-0">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-1.5 py-1 text-left text-[9px] font-semibold text-gray-600 uppercase">Student</th>
                  <th className="px-1.5 py-1 text-left text-[9px] font-semibold text-gray-600 uppercase">Type</th>
                  <th className="px-1.5 py-1 text-left text-[9px] font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-1.5 py-1 text-left text-[9px] font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-1.5 py-1 text-left text-[9px] font-semibold text-gray-600 uppercase">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {useMemo(() => {
                  return assignments
                    .filter((assignment: any) => 
                      assignment.status === 'completed' || 
                      (assignment.homework?.enabled && 
                       assignment.homework?.submission?.submitted && 
                       assignment.homework?.submission?.status === 'graded')
                    )
                    .sort((a: any, b: any) => {
                      const dateA = a.completedAt || a.homework?.submission?.gradedAt || a.updatedAt || a.createdAt;
                      const dateB = b.completedAt || b.homework?.submission?.gradedAt || b.updatedAt || b.createdAt;
                      return new Date(dateB).getTime() - new Date(dateA).getTime();
                    })
                    .slice(0, 5);
                }, [assignments]).map((assignment: any) => {
                  const isCompleted = assignment.status === 'completed';
                  const isGraded = assignment.homework?.submission?.status === 'graded';
                  const completedDate = assignment.completedAt || 
                                       assignment.homework?.submission?.gradedAt || 
                                       assignment.updatedAt || 
                                       assignment.createdAt;
                  const grade = assignment.homework?.submission?.grade;
                  
                  return (
                    <tr key={assignment.id || assignment._id} className="hover:bg-gray-50">
                      <td className="px-1.5 py-1">
                        <div className="font-medium text-gray-900 text-[10px]">
                          {assignment.studentName || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-1.5 py-1">
                        <span className="text-[10px] text-gray-600">
                          {isGraded ? 'Homework' : 'Assignment'}
                        </span>
                      </td>
                      <td className="px-1.5 py-1">
                        {isCompleted ? (
                          <span className="px-1 py-0.5 text-[9px] font-semibold rounded bg-green-100 text-green-800">
                            Done
                          </span>
                        ) : isGraded ? (
                          <span className="px-1 py-0.5 text-[9px] font-semibold rounded bg-blue-100 text-blue-800">
                            Graded
                          </span>
                        ) : null}
                      </td>
                      <td className="px-1.5 py-1 text-[10px] text-gray-600">
                        {completedDate ? new Date(completedDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-1.5 py-1">
                        {grade !== null && grade !== undefined ? (
                          <span className="px-1 py-0.5 text-[10px] font-semibold rounded bg-purple-100 text-purple-800">
                            {grade}/100
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {useMemo(() => {
              return assignments.filter((assignment: any) => 
                assignment.status === 'completed' || 
                (assignment.homework?.enabled && 
                 assignment.homework?.submission?.submitted && 
                 assignment.homework?.submission?.status === 'graded')
              ).length;
            }, [assignments]) > 5 && (
              <div className="mt-1.5 text-center">
                <Link
                  to="/assignments"
                  className="text-[10px] font-semibold text-primary hover:text-accent transition-colors"
                >
                  View All →
                </Link>
              </div>
            )}
          </div>
          )}
        </div>
      )}
    </div>
  );

  // Students Section
  const StudentsSection = () => {
    const handleStudentSelect = (student: any) => {
      setSelectedStudent(student);
      setShowStudentProfile(true);
    };

    const handleEditStudent = (student: any) => {
      setSelectedStudent(student);
      setShowStudentProfile(true);
    };

    const handleDeleteStudent = (studentId: string) => {
      if (window.confirm('Are you sure you want to delete this student?')) {
        // In a real app, this would delete the student
        console.log('Deleting student:', studentId);
        alert('Student deleted successfully');
      }
    };

    const activeStudents = students.filter(s => s.status === 'active').length;
    const inactiveStudents = students.filter(s => s.status === 'inactive').length;
    const totalRevenue = students.reduce((sum, s) => sum + s.tuitionFee, 0);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="heading-section">Student Management</h2>
          <p className="caption mt-1">
            {students.length} students · {activeStudents} active · {inactiveStudents} inactive
            {permissions.canManageFinancials && ` · $${totalRevenue.toLocaleString()} revenue`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {(permissions.canAccessEvaluations || permissions.canManageEvaluations) && (
            <Button variant="outline" size="md" onClick={() => setShowEvaluationManagement(true)}>
              Evaluations
            </Button>
          )}
          {(permissions.canAccessEvaluations || permissions.canApproveEvaluations) && (
            <Button variant="outline" size="md" onClick={() => setShowEvaluationResults(true)}>
              Results
            </Button>
          )}
          <Button variant="outline" size="md" onClick={() => setShowEmailModule(true)}>
            Email
          </Button>
          <RequirePermission permission="canViewNotifications" hideIfDenied>
            <Button variant="outline" size="md" onClick={() => setShowNotificationCenter(true)}>
              Notifications
            </Button>
          </RequirePermission>
          <Button variant="primary" size="md" onClick={() => setShowTestingModule(true)} fullWidthMobile>
            Testing
          </Button>
          {permissions.canManagePermissions && (
            <Button variant="outline" size="md" onClick={() => setShowPermissionManager(true)}>
              Permissions
            </Button>
          )}
          <Button variant="outline" size="md" onClick={() => setShowTestResults(true)}>
            Test Results
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <StudentList
            onStudentSelect={handleStudentSelect}
            onEditStudent={handleEditStudent}
            onDeleteStudent={handleDeleteStudent}
          />
        </div>
      </div>
    );
  };

  // Teachers Section
  const TeachersSection = () => {
    const handleTeacherSelect = (teacher: any) => {
      setSelectedTeacher(teacher);
      setShowTeacherProfile(true);
    };

    const handleEditTeacher = (teacher: any) => {
      setSelectedTeacher(teacher);
      setShowTeacherProfile(true);
    };

    const handleDeleteTeacher = (teacherId: string) => {
      if (window.confirm('Are you sure you want to delete this teacher?')) {
        // In a real app, this would delete the teacher
        console.log('Deleting teacher:', teacherId);
        alert('Teacher deleted successfully');
      }
    };

    return (
      <TeacherList
        onTeacherSelect={handleTeacherSelect}
        onEditTeacher={handleEditTeacher}
        onDeleteTeacher={handleDeleteTeacher}
        onAddTeacher={() => setShowTeacherForm(true)}
      />
    );
  };


  // Courses Section
  const CoursesSection = () => (
    <div className="space-y-4">
      <div>
        <h2 className="heading-section">Courses</h2>
        <p className="caption mt-1">Programs and classes</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {['Quran Recitation', 'Islamic Studies', 'Arabic Language', 'Tajweed', 'Hifz Program'].map((course, index) => (
          <Card key={index} padding="md">
            <h3 className="heading-card">{course}</h3>
            <p className="caption mt-1">Active: {Math.floor(Math.random() * 50) + 10}</p>
            <Button variant="primary" size="md" className="w-full sm:w-auto mt-3" fullWidthMobile>
              View
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );

  // Financials Section
  const FinancialsSection = () => {
    if (!permissions.canManageFinancials) {
      return (
        <div className="p-8 text-center">
          <p className="body-text font-medium text-red-600">Access denied</p>
          <p className="caption mt-2">You don't have permission to view financial information.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <h2 className="heading-section">Financial</h2>
          <p className="caption mt-1">Revenue and payroll summary</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card padding="md">
            <p className="caption">Revenue</p>
            <p className="body-text font-semibold text-gray-900 mt-1">${students.reduce((sum, s) => sum + (s.tuitionFee || 0), 0).toLocaleString()}</p>
            <p className="caption mt-0.5">This month</p>
          </Card>
          <Card padding="md">
            <p className="caption">Pending</p>
            <p className="body-text font-semibold text-gray-900 mt-1">$12,450</p>
            <p className="caption mt-0.5">24 students</p>
          </Card>
          <Card padding="md">
            <p className="caption">Salaries</p>
            <p className="body-text font-semibold text-gray-900 mt-1">
              ${teachers.reduce((sum: number, t: any) => sum + (t.payroll?.monthlySalary || 0), 0).toLocaleString()}
            </p>
            <p className="caption mt-0.5">Monthly</p>
          </Card>
        </div>
      </div>
    );
  };

  // Reports Section
  const ReportsSection = () => (
    <div className="space-y-4">
      <div>
        <h2 className="heading-section">Reports</h2>
        <p className="caption mt-1">Generate and view reports</p>
      </div>
      <Card padding="md">
        <CardHeader>
          <h3 className="heading-card">Generate</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button type="button" className="min-h-[44px] p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition text-left body-text">
              <span className="font-medium text-gray-900">Student Report</span>
              <p className="caption mt-0.5">Enrollment & performance</p>
            </button>
            <button type="button" className="min-h-[44px] p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition text-left body-text">
              <span className="font-medium text-gray-900">Financial Report</span>
              <p className="caption mt-0.5">Revenue & expenses</p>
            </button>
            <button type="button" className="min-h-[44px] p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition text-left body-text">
              <span className="font-medium text-gray-900">Teacher Report</span>
              <p className="caption mt-0.5">Performance & assignments</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Activities Section
  const ActivitiesSection = () => (
    <div className="space-y-4">
      <div>
        <h2 className="heading-section">Activities</h2>
        <p className="caption mt-1">Recent activity</p>
      </div>
      <Card padding="md">
        <CardHeader>
          <h3 className="heading-card">Recent</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { action: 'New student enrolled', name: 'Ahmad Ali', time: '2 hours ago' },
              { action: 'Payment received', name: '$500 from Fatima Hassan', time: '4 hours ago' },
              { action: 'Teacher registered', name: 'Dr. Ibrahim Yusuf', time: '1 day ago' },
              { action: 'New course created', name: 'Advanced Tajweed', time: '2 days ago' },
            ].map((activity, index) => (
              <div key={index} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="body-text font-medium text-gray-900">{activity.action}</p>
                  <p className="caption">{activity.name} · {activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Settings Section
  const SettingsSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="heading-section">Settings</h2>
        <p className="caption mt-1">Academy and notification preferences</p>
      </div>
      <div className="space-y-4">
        <Card padding="md">
          <CardHeader>
            <h3 className="heading-card">General</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block body-text font-medium text-gray-700 mb-1">Academy Name</label>
                <input type="text" defaultValue="Umar Academy" className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text focus:border-primary focus:ring-1 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block body-text font-medium text-gray-700 mb-1">Contact Email</label>
                <input type="email" defaultValue="admin@umaracademy.org" className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text focus:border-primary focus:ring-1 focus:ring-primary/20" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card padding="md">
          <CardHeader>
            <h3 className="heading-card">Notifications</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Email Notifications', 'SMS Alerts', 'Payment Reminders', 'Activity Updates'].map((pref, index) => (
                <label key={index} className="flex items-center gap-3 min-h-[44px] cursor-pointer body-text">
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" />
                  <span>{pref}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Render active section
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderSection = () => {
    switch (activeSection) {
      case 'overview': return <OverviewSection />;
      case 'students': 
        if (!permissions.canManageStudents) {
          return (
            <div className="p-8 text-center">
              <p className="body-text font-medium text-red-600">Access denied</p>
              <p className="caption mt-2">You don't have permission to manage students.</p>
            </div>
          );
        }
        return <StudentsSection />;
      case 'teachers': 
        if (!permissions.canManageTeachers) {
          return (
            <div className="p-8 text-center">
              <p className="body-text font-medium text-red-600">Access denied</p>
              <p className="caption mt-2">You don't have permission to manage teachers.</p>
            </div>
          );
        }
        return <TeachersSection />;
      case 'courses': return <CoursesSection />;
      case 'financials': 
        if (!permissions.canManageFinancials) {
          return (
            <div className="p-8 text-center">
              <p className="body-text font-medium text-red-600">Access denied</p>
              <p className="caption mt-2">You don't have permission to view financials.</p>
            </div>
          );
        }
        return <FinancialsSection />;
      case 'reports': 
        if (!permissions.canViewReports && !permissions.canViewAnalytics) {
          return (
            <div className="p-8 text-center">
              <p className="body-text font-medium text-red-600">Access denied</p>
              <p className="caption mt-2">You don't have permission to view reports.</p>
            </div>
          );
        }
        return <ReportsSection />;
      case 'activities': return <ActivitiesSection />;
      case 'settings': return <SettingsSection />;
      default: return <OverviewSection />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
      <AppLayout
        sidebar={
          <Sidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            isMobileOpen={isSidebarOpen}
            onMobileToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            onMobileClose={() => setIsSidebarOpen(false)}
          />
        }
        sidebarOpen={isSidebarOpen}
        onOverlayClick={() => setIsSidebarOpen(false)}
        maxWidth="7xl"
      >
        {renderSection()}
      
      {showEvaluationManagement && (
        <TeacherEvaluationManagement
          onClose={() => setShowEvaluationManagement(false)}
        />
      )}

      {showEvaluationResults && (
        <EvaluationResultsPage
          onClose={() => setShowEvaluationResults(false)}
        />
      )}

      {isDevelopment && DebugPanel && (
        <Suspense fallback={null}>
          <DebugPanel />
        </Suspense>
      )}

      {/* Student Management Modals */}
        {showStudentProfile && selectedStudent && (
          <StudentProfile
            student={selectedStudent}
            onClose={() => {
              setShowStudentProfile(false);
              setSelectedStudent(null);
            }}
            onEdit={(student) => {
              setShowStudentProfile(false);
              setSelectedStudent(student);
              setShowStudentProfile(true);
            }}
            onEnrollment={() => {
              setShowStudentProfile(false);
              setShowStudentEnrollment(true);
            }}
            onPayments={() => {
              setShowStudentProfile(false);
              setShowStudentPayments(true);
            }}
            onProgress={() => {
              setShowStudentProfile(false);
              setShowStudentProgress(true);
            }}
            onCommunication={() => {
              setShowStudentProfile(false);
              setShowStudentCommunication(true);
            }}
          />
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


      {/* Teacher Registration Modal */}
      {showTeacherForm && (
        <TeacherRegistrationForm
          onClose={() => setShowTeacherForm(false)}
        />
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
            setShowTeacherProfile(true);
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

      {/* Email Module Modal */}
      {showEmailModule && (
        <EmailModule
          onClose={() => setShowEmailModule(false)}
        />
      )}

      {/* Student Testing Module Modal */}
      {showTestingModule && (
        <StudentTestingModule
          onClose={() => setShowTestingModule(false)}
        />
      )}

      {/* Test Results Page Modal */}
      {showTestResults && (
        <TestResultsPage
          onClose={() => setShowTestResults(false)}
        />
      )}

      {/* Permission Management Center Modal */}
      {showPermissionManager && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-white rounded-xl p-6">Loading Permission Manager...</div>
          </div>
        }>
          <PermissionManager onClose={() => setShowPermissionManager(false)} />
        </Suspense>
      )}

      {/* Ticket Review Modal */}
      {showTicketReview && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-white rounded-xl p-6">Loading Ticket Review...</div>
          </div>
        }>
          <AdminTicketReview
            onClose={() => setShowTicketReview(false)}
          />
        </Suspense>
      )}

      {/* Recitation Review Modal */}
      {showRecitationReview && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-white rounded-xl p-6">Loading Recitation Review...</div>
          </div>
        }>
          <AdminRecitationReview
            onClose={() => setShowRecitationReview(false)}
            onSuccess={() => {
              setShowRecitationReview(false);
              refreshNotifications();
            }}
          />
        </Suspense>
      )}

      {/* Notification Center Modal */}
      {showNotificationCenter && (
        <AdminNotificationCenter
          onClose={() => setShowNotificationCenter(false)}
          onOpenTicketReview={() => {
            setShowNotificationCenter(false);
            setShowTicketReview(true);
          }}
          onOpenRecitationReview={() => {
            setShowNotificationCenter(false);
            setShowRecitationReview(true);
          }}
        />
      )}

      </AppLayout>
    </div>
  );
};

export default AdminDashboard;
