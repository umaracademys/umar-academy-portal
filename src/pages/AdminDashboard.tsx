import React, { useState, lazy, Suspense, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
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

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { students, teachers, admins, refreshData } = useData();
  const { assignments } = useBackendData();
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

  // Overview Section - Compact
  const OverviewSection = () => (
    <div className="space-y-2">
      <div className="rounded border border-gray-200 bg-white px-2 py-2 flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-0.5">
          <span className="text-[9px] font-bold uppercase tracking-wide text-gray-500">Admin Control</span>
          <h2 className="text-base font-bold text-primary">Dashboard Overview</h2>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {(permissions.canAccessAssignments || permissions.canManageAssignments) && (
            <Link
              to="/assignments"
              className="inline-flex items-center justify-center rounded border border-primary/30 px-2 py-1 text-xs font-semibold text-primary transition hover:bg-soft-primary hover:border-primary"
            >
              Assignments
            </Link>
          )}
          {permissions.canManageStudents && (
            <button
              onClick={() => setActiveSection('students')}
              className="inline-flex items-center justify-center rounded border border-primary/30 px-2 py-1 text-xs font-semibold text-primary transition hover:bg-soft-primary hover:border-primary"
            >
              Students
            </button>
          )}
          {permissions.canManageTeachers && (
            <button
              onClick={() => setActiveSection('teachers')}
              className="inline-flex items-center justify-center rounded border border-primary/30 px-2 py-1 text-xs font-semibold text-primary transition hover:bg-soft-primary hover:border-primary"
            >
              Teachers
            </button>
          )}
          <RequirePermission permission="canViewNotifications" hideIfDenied>
            <button
              onClick={() => setShowNotificationCenter(true)}
              className="inline-flex items-center justify-center rounded border border-primary/30 px-2 py-1 text-xs font-semibold text-primary transition hover:bg-soft-primary hover:border-primary"
            >
              Notifications
            </button>
          </RequirePermission>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {permissions.canManageStudents && (
          <StatCard title="Students" value={students.length} icon="ST" />
        )}
        {permissions.canManageTeachers && (
          <StatCard title="Teachers" value={teachers.length} icon="TC" />
        )}
        <StatCard title="Courses" value={45} icon="AC" />
        {permissions.canManageFinancials && (
          <StatCard title="Revenue" value={`$${students.reduce((sum, s) => sum + s.tuitionFee, 0).toLocaleString()}`} icon="REV" />
        )}
      </div>

      <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
        <Card title="Recent Enrollments">
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
        </Card>

        <Card title="Performance">
          <div className="space-y-1.5">
            <div>
              <div className="mb-0.5 flex justify-between text-[10px]">
                <span className="text-gray-600">Attendance</span>
                <span className="font-semibold">94%</span>
              </div>
              <div className="h-1 w-full rounded-full bg-soft-primary">
                <div className="h-1 rounded-full bg-primary" style={{ width: '94%' }}></div>
              </div>
            </div>
            <div>
              <div className="mb-0.5 flex justify-between text-[10px]">
                <span className="text-gray-600">Satisfaction</span>
                <span className="font-semibold">88%</span>
              </div>
              <div className="h-1 w-full rounded-full bg-soft-accent">
                <div className="h-1 rounded-full bg-accent" style={{ width: '88%' }}></div>
              </div>
            </div>
            <div>
              <div className="mb-0.5 flex justify-between text-[10px]">
                <span className="text-gray-600">Completion</span>
                <span className="font-semibold">76%</span>
              </div>
              <div className="h-1 w-full rounded-full bg-soft-primary">
                <div className="h-1 rounded-full bg-primary/60" style={{ width: '76%' }}></div>
              </div>
            </div>
          </div>
        </Card>
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
        <Card title="">
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <button
              onClick={() => setExpandedSections(prev => ({ ...prev, completedAssignments: !prev.completedAssignments }))}
              className="w-full flex items-center justify-between"
            >
              <span className="text-sm font-bold text-primary">Completed Assignments</span>
              <span className="text-[9px] text-gray-600">
                {expandedSections.completedAssignments ? '▼' : '▶'}
              </span>
            </button>
          </div>
          {expandedSections.completedAssignments && (
          <div className="overflow-x-auto">
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
        </Card>
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
      <div className="space-y-3">
        {/* Header with Stats - Compact */}
        <div className="bg-primary rounded p-2 text-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 mb-1.5">
            <div className="flex-1">
              <h2 className="text-sm font-bold text-white">Student Management</h2>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-lg font-bold text-white">{students.length}</div>
              <div className="text-[9px] text-white/80">Total</div>
            </div>
          </div>
          
          {/* Quick Stats - Compact */}
          <div className="grid grid-cols-3 gap-1">
            <div className="bg-white/20 rounded p-1">
              <div className="text-sm font-bold text-white">{activeStudents}</div>
              <div className="text-[9px] text-white/90">Active</div>
            </div>
            <div className="bg-white/20 rounded p-1">
              <div className="text-sm font-bold text-white">{inactiveStudents}</div>
              <div className="text-[9px] text-white/90">Inactive</div>
            </div>
            <div className="bg-white/20 rounded p-1">
              <div className="text-sm font-bold text-white">${totalRevenue.toLocaleString()}</div>
              <div className="text-[9px] text-white/90">Revenue</div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Compact */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {(permissions.canAccessEvaluations || permissions.canManageEvaluations) && (
            <button
              onClick={() => setShowEvaluationManagement(true)}
              className="flex h-full flex-col justify-between rounded border px-2 py-2 text-left transition border-primary/30 bg-white hover:bg-soft-primary hover:border-primary/50"
            >
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold text-primary">Evaluations</p>
                </div>
                <p className="mt-0.5 text-[9px] text-gray-600">
                  Manage forms
                </p>
              </div>
            </button>
          )}
          {(permissions.canAccessEvaluations || permissions.canApproveEvaluations) && (
            <button
              onClick={() => setShowEvaluationResults(true)}
              className="flex h-full flex-col justify-between rounded border px-2 py-2 text-left transition border-primary/30 bg-white hover:bg-soft-primary hover:border-primary/50"
            >
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold text-primary">Results</p>
                </div>
                <p className="mt-0.5 text-[9px] text-gray-600">
                  View results
                </p>
              </div>
            </button>
          )}
          <button
            onClick={() => setShowEmailModule(true)}
            className="flex h-full flex-col justify-between rounded border px-2 py-2 text-left transition border-transparent bg-accent text-primary hover:bg-accent/90"
          >
            <div>
              <div className="flex items-center gap-1">
                <p className="text-xs font-semibold text-primary">Email</p>
              </div>
              <p className="mt-0.5 text-[9px] text-primary/80">
                Send emails
              </p>
            </div>
          </button>
          <RequirePermission permission="canViewNotifications" hideIfDenied>
            <button
              onClick={() => setShowNotificationCenter(true)}
              className="flex h-full flex-col justify-between rounded border px-2 py-2 text-left transition border-primary/30 bg-white hover:bg-soft-primary hover:border-primary/50"
            >
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold text-primary">Notifications</p>
                </div>
                <p className="mt-0.5 text-[9px] text-gray-600">
                  View notifications
                </p>
              </div>
            </button>
          </RequirePermission>
          <button
            onClick={() => setShowTestingModule(true)}
            className="flex h-full flex-col justify-between rounded border px-2 py-2 text-left transition border-transparent bg-primary text-white hover:bg-primary/90"
          >
            <div>
              <div className="flex items-center gap-1">
                <p className="text-xs font-semibold text-white">Testing</p>
              </div>
              <p className="mt-0.5 text-[9px] text-white/90">
                Test students
              </p>
            </div>
          </button>
          {permissions.canManagePermissions && (
            <button
              onClick={() => setShowPermissionManager(true)}
              className="flex h-full flex-col justify-between rounded border px-2 py-2 text-left transition border-red-500/50 bg-red-50 hover:bg-red-100 hover:border-red-600"
            >
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold text-red-700">Permissions</p>
                </div>
                <p className="mt-0.5 text-[9px] text-red-600">
                  Manage access
                </p>
              </div>
            </button>
          )}
          <button
            onClick={() => setShowTestResults(true)}
            className="flex h-full flex-col justify-between rounded border px-2 py-2 text-left transition border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300"
          >
            <div>
              <div className="flex items-center gap-1">
                <p className="text-xs font-semibold text-primary">Test Results</p>
              </div>
              <p className="mt-0.5 text-[9px] text-gray-600">
                View results
              </p>
            </div>
          </button>
        </div>

        {/* Student List */}
        <StudentList
          onStudentSelect={handleStudentSelect}
          onEditStudent={handleEditStudent}
          onDeleteStudent={handleDeleteStudent}
        />
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


  // Courses Section - Compact
  const CoursesSection = () => (
    <div>
      <h2 className="text-sm font-bold text-primary mb-2">Courses</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
        {['Quran Recitation', 'Islamic Studies', 'Arabic Language', 'Tajweed', 'Hifz Program'].map((course, index) => (
          <Card key={index}>
            <h3 className="font-semibold text-primary mb-1 text-xs">{course}</h3>
            <p className="text-[10px] text-gray-600 mb-1.5">Active: {Math.floor(Math.random() * 50) + 10}</p>
            <button className="w-full px-2 py-1 bg-primary text-white rounded text-xs font-semibold hover:bg-primary/90 transition-colors">
              View
            </button>
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
          <p className="text-red-600 font-semibold">Access Denied</p>
          <p className="text-gray-600 mt-2">You don't have permission to view financial information.</p>
        </div>
      );
    }
    
    return (
      <div>
        <h2 className="text-sm font-bold text-primary mb-2">Financial</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 mb-2">
          <Card>
            <div className="text-center">
              <p className="text-[9px] text-gray-600">Revenue</p>
              <p className="text-base font-bold text-primary">${students.reduce((sum, s) => sum + s.tuitionFee, 0).toLocaleString()}</p>
              <p className="text-[9px] text-gray-500 mt-0.5">This month</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-[9px] text-gray-600">Pending</p>
              <p className="text-base font-bold text-accent">$12,450</p>
              <p className="text-[9px] text-gray-500 mt-0.5">24 students</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-[9px] text-gray-600">Salaries</p>
              <p className="text-base font-bold text-primary">
                ${teachers.reduce((sum, t) => sum + t.payroll.monthlySalary, 0).toLocaleString()}
              </p>
              <p className="text-[9px] text-gray-500 mt-0.5">Monthly</p>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // Reports Section - Compact
  const ReportsSection = () => (
    <div>
      <h2 className="text-sm font-bold text-primary mb-2">Reports</h2>
      <Card title="Generate">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          <button className="p-2 border border-gray-200 rounded hover:border-primary hover:bg-soft-primary transition text-left">
            <h3 className="font-semibold mb-0.5 text-primary text-xs">Student Report</h3>
            <p className="text-[10px] text-gray-600">Enrollment & performance</p>
          </button>
          <button className="p-2 border border-gray-200 rounded hover:border-accent hover:bg-soft-accent transition text-left">
            <h3 className="font-semibold mb-0.5 text-primary text-xs">Financial Report</h3>
            <p className="text-[10px] text-gray-600">Revenue & expenses</p>
          </button>
          <button className="p-2 border border-gray-200 rounded hover:border-primary hover:bg-soft-primary transition text-left">
            <h3 className="font-semibold mb-0.5 text-primary text-xs">Teacher Report</h3>
            <p className="text-[10px] text-gray-600">Performance & assignments</p>
          </button>
        </div>
      </Card>
    </div>
  );

  // Activities Section - Compact
  const ActivitiesSection = () => (
    <div>
      <h2 className="text-sm font-bold text-primary mb-2">Activities</h2>
      <Card title="Recent">
        <div className="space-y-1.5">
          {[
            { type: 'student', action: 'New student enrolled', name: 'Ahmad Ali', time: '2 hours ago', icon: '👨‍🎓', borderColor: 'border-primary', bgColor: 'bg-soft-primary' },
            { type: 'payment', action: 'Payment received', name: '$500 from Fatima Hassan', time: '4 hours ago', icon: '💰', borderColor: 'border-accent', bgColor: 'bg-soft-accent' },
            { type: 'teacher', action: 'Teacher registered', name: 'Dr. Ibrahim Yusuf', time: '1 day ago', icon: '👨‍🏫', borderColor: 'border-primary', bgColor: 'bg-soft-primary' },
            { type: 'course', action: 'New course created', name: 'Advanced Tajweed', time: '2 days ago', icon: '📚', borderColor: 'border-accent', bgColor: 'bg-soft-accent' },
          ].map((activity, index) => (
            <div key={index} className={`flex items-start gap-1.5 p-1.5 border-l-2 ${activity.borderColor} ${activity.bgColor} rounded`}>
              <span className="text-sm">{activity.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-primary text-xs">{activity.action}</p>
                <p className="text-[10px] text-gray-600">{activity.name}</p>
                <p className="text-[9px] text-gray-500 mt-0.5">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  // Settings Section - Compact
  const SettingsSection = () => (
    <div>
      <h2 className="text-sm font-bold text-primary mb-2">Settings</h2>
      <div className="space-y-2">
        <Card title="General">
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-primary mb-1">Academy Name</label>
              <input type="text" defaultValue="Umar Academy" className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-primary focus:border-primary focus:ring-1 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-primary mb-1">Contact Email</label>
              <input type="email" defaultValue="admin@umaracademy.org" className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-primary focus:border-primary focus:ring-1 focus:ring-primary/20" />
            </div>
          </div>
        </Card>
        
        <Card title="Notifications">
          <div className="space-y-1.5">
            {['Email Notifications', 'SMS Alerts', 'Payment Reminders', 'Activity Updates'].map((pref, index) => (
              <label key={index} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-3 h-3 text-primary rounded focus:ring-primary" />
                <span className="text-xs text-primary">{pref}</span>
              </label>
            ))}
          </div>
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
              <p className="text-red-600 font-semibold">Access Denied</p>
              <p className="text-gray-600 mt-2">You don't have permission to manage students.</p>
            </div>
          );
        }
        return <StudentsSection />;
      case 'teachers': 
        if (!permissions.canManageTeachers) {
          return (
            <div className="p-8 text-center">
              <p className="text-red-600 font-semibold">Access Denied</p>
              <p className="text-gray-600 mt-2">You don't have permission to manage teachers.</p>
            </div>
          );
        }
        return <TeachersSection />;
      case 'courses': return <CoursesSection />;
      case 'financials': 
        if (!permissions.canManageFinancials) {
          return (
            <div className="p-8 text-center">
              <p className="text-red-600 font-semibold">Access Denied</p>
              <p className="text-gray-600 mt-2">You don't have permission to view financials.</p>
            </div>
          );
        }
        return <FinancialsSection />;
      case 'reports': 
        if (!permissions.canViewReports && !permissions.canViewAnalytics) {
          return (
            <div className="p-8 text-center">
              <p className="text-red-600 font-semibold">Access Denied</p>
              <p className="text-gray-600 mt-2">You don't have permission to view reports.</p>
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
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
        isMobileOpen={isSidebarOpen}
        onMobileToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-2">
            {renderSection()}
          </div>
        </main>
      </div>
      
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

      {/* Notification Center Modal */}
      {showNotificationCenter && (
        <AdminNotificationCenter onClose={() => setShowNotificationCenter(false)} />
      )}

    </div>
  );
};

export default AdminDashboard;
