import React, { useState, lazy, Suspense, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
// DebugPanel only in development
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
const DebugPanel = isDevelopment ? lazy(() => import('../components/DebugPanel')) : null;
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

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { students, teachers, admins, refreshData } = useData();
  const { assignments } = useBackendData();
  
  // Refresh data on mount to ensure latest permissions are loaded
  useEffect(() => {
    refreshData();
  }, [refreshData]);
  
  // Get current admin's permissions
  const currentAdmin = useMemo(() => {
    if (!user?.email) return null;
    const foundAdmin = admins.find(admin => admin.email === user.email);
    if (isDevelopment && foundAdmin) {
      console.log('🔍 AdminDashboard - Found admin:', {
        email: foundAdmin.email,
        fullName: foundAdmin.fullName,
        permissionsCount: foundAdmin.permissions ? Object.keys(foundAdmin.permissions).length : 0,
        enabledPermissions: foundAdmin.permissions ? Object.values(foundAdmin.permissions).filter(v => v === true).length : 0
      });
    }
    return foundAdmin;
  }, [user?.email, admins]);
  
  // Get admin permissions with defaults - ensure all keys are present
  const permissions: AdminPermissions = useMemo(() => {
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
  const [activeSection, setActiveSection] = useState('overview');
  
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

  // Overview Section
  const OverviewSection = () => (
    <div className="space-y-3 sm:space-y-4">
      <div className="rounded-xl border-2 border-gray-200 bg-white px-3 py-3 sm:px-4 sm:py-4 flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center md:justify-between shadow-md">
        <div className="space-y-1 sm:space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Admin Control</span>
          <h2 className="text-lg sm:text-xl font-bold text-primary">Dashboard Overview</h2>
          <p className="text-xs text-gray-600 max-w-xl">
            Monitor enrollment trends, teacher coverage, and revenue performance at a glance. Use the quick actions to jump directly into the sections that need your attention.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          {(permissions.canAccessAssignments || permissions.canManageAssignments) && (
            <Link
              to="/assignments"
              className="inline-flex items-center justify-center rounded-lg border-2 border-primary/30 px-3 py-1.5 sm:px-4 text-xs font-bold text-primary transition hover:bg-soft-primary hover:border-primary touch-target"
            >
              Manage Assignments
            </Link>
          )}
          {permissions.canManageStudents && (
            <button
              onClick={() => setActiveSection('students')}
              className="inline-flex items-center justify-center rounded-lg border-2 border-primary/30 px-3 py-1.5 sm:px-4 text-xs font-bold text-primary transition hover:bg-soft-primary hover:border-primary touch-target"
            >
              View Students
            </button>
          )}
          {permissions.canManageTeachers && (
            <button
              onClick={() => setActiveSection('teachers')}
              className="inline-flex items-center justify-center rounded-lg border-2 border-primary/30 px-3 py-1.5 sm:px-4 text-xs font-bold text-primary transition hover:bg-soft-primary hover:border-primary touch-target"
            >
              View Teachers
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {permissions.canManageStudents && (
          <StatCard title="Total Students" value={students.length} icon="ST" />
        )}
        {permissions.canManageTeachers && (
          <StatCard title="Total Teachers" value={teachers.length} icon="TC" />
        )}
        <StatCard title="Active Courses" value={45} icon="AC" />
        {permissions.canManageFinancials && (
          <StatCard title="Revenue" value={`$${students.reduce((sum, s) => sum + s.tuitionFee, 0).toLocaleString()}`} icon="REV" />
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:gap-3 lg:grid-cols-2">
        <Card title="Recent Enrollments">
          <div className="space-y-2">
            {students.slice(0, 5).map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-2 py-2 transition hover:bg-gray-50 hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-soft-primary text-xs font-semibold text-primary">
                    {student.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-primary text-xs">{student.fullName}</p>
                    <p className="text-[10px] text-gray-500">{student.program}</p>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-primary-soft">
                  {new Date(student.enrolledDate).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Performance Metrics">
          <div className="space-y-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-primary-soft">Student Attendance</span>
                <span className="font-semibold">94%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-soft-primary">
                <div className="h-1.5 rounded-full bg-[var(--color-primary)]" style={{ width: '94%' }}></div>
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-primary-soft">Teacher Satisfaction</span>
                <span className="font-semibold">88%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-soft-accent">
                <div className="h-1.5 rounded-full bg-[var(--color-accent)]" style={{ width: '88%' }}></div>
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-primary-soft">Course Completion</span>
                <span className="font-semibold">76%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-soft-primary">
                <div className="h-1.5 rounded-full bg-[rgba(var(--color-primary-rgb),0.6)]" style={{ width: '76%' }}></div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Completed Assignments/Homework */}
      {useMemo(() => {
        const completedAssignments = assignments.filter((assignment: any) => 
          assignment.status === 'completed' || 
          (assignment.homework?.enabled && 
           assignment.homework?.submission?.submitted && 
           assignment.homework?.submission?.status === 'graded')
        );
        return completedAssignments.length > 0 ? completedAssignments.slice(0, 5) : [];
      }, [assignments]).length > 0 && (
        <Card title="✅ Completed Assignments & Homework">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Completed</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Grade</th>
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
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900 text-xs">
                          {assignment.studentName || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-gray-600">
                          {isGraded ? 'Homework' : 'Assignment'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {isCompleted ? (
                          <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-green-100 text-green-800 border border-green-300">
                            Completed
                          </span>
                        ) : isGraded ? (
                          <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                            Graded
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {completedDate ? new Date(completedDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-3 py-2">
                        {grade !== null && grade !== undefined ? (
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800">
                            {grade}/100
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {useMemo(() => {
            return assignments.filter((assignment: any) => 
              assignment.status === 'completed' || 
              (assignment.homework?.enabled && 
               assignment.homework?.submission?.submitted && 
               assignment.homework?.submission?.status === 'graded')
            ).length;
          }, [assignments]) > 5 && (
            <div className="mt-3 text-center">
              <Link
                to="/assignments"
                className="text-xs font-semibold text-primary hover:text-accent transition-colors"
              >
                View All Completed →
              </Link>
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
        {/* Header with Stats */}
        <div className="bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.85)] rounded-lg p-3 sm:p-4 text-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-white">Student Management</h2>
              <p className="text-white/90 mt-0.5 text-xs sm:text-sm">Comprehensive student administration and tracking</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xl sm:text-2xl font-bold text-white">{students.length}</div>
              <div className="text-white/80 text-xs">Total Students</div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-white/20 rounded-lg p-2 sm:p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base sm:text-lg font-bold text-white">{activeStudents}</div>
                  <div className="text-[10px] sm:text-xs text-white/90">Active Students</div>
                </div>
              </div>
            </div>
            <div className="bg-white/20 rounded-lg p-2 sm:p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base sm:text-lg font-bold text-white">{inactiveStudents}</div>
                  <div className="text-[10px] sm:text-xs text-white/90">Inactive Students</div>
                </div>
              </div>
            </div>
            <div className="bg-white/20 rounded-lg p-2 sm:p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base sm:text-lg font-bold text-white">${totalRevenue.toLocaleString()}</div>
                  <div className="text-[10px] sm:text-xs text-white/90">Total Revenue</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {(permissions.canAccessEvaluations || permissions.canManageEvaluations) && (
            <button
              onClick={() => setShowEvaluationManagement(true)}
              className="flex h-full flex-col justify-between rounded-lg border-2 px-3 py-3 text-left shadow-sm transition border-primary/30 bg-white hover:bg-soft-primary hover:border-primary/50 touch-target"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs sm:text-sm font-bold text-primary">Teacher Evaluations</p>
                </div>
                <p className="mt-1 text-[10px] sm:text-xs text-primary/80">
                  Create and manage evaluation forms
                </p>
              </div>
            </button>
          )}
          {(permissions.canAccessEvaluations || permissions.canApproveEvaluations) && (
            <button
              onClick={() => setShowEvaluationResults(true)}
              className="flex h-full flex-col justify-between rounded-lg border-2 px-3 py-3 text-left shadow-sm transition border-primary/30 bg-white hover:bg-soft-primary hover:border-primary/50 touch-target"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs sm:text-sm font-bold text-primary">Evaluation Results</p>
                </div>
                <p className="mt-1 text-[10px] sm:text-xs text-primary/80">
                  View and analyze results
                </p>
              </div>
            </button>
          )}
          <button
            onClick={() => setShowEmailModule(true)}
            className="flex h-full flex-col justify-between rounded-lg border-2 px-3 py-3 text-left shadow-sm transition border-transparent bg-accent text-primary hover:bg-accent/90 touch-target"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs sm:text-sm font-bold text-primary">Email Module</p>
              </div>
              <p className="mt-1 text-[10px] sm:text-xs text-primary/80">
                Send emails from office@umaracademy.org
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide text-primary/70 mt-1">
              Open workflow
            </span>
          </button>
          <button
            onClick={() => setShowTestingModule(true)}
            className="flex h-full flex-col justify-between rounded-lg border-2 px-3 py-3 text-left shadow-sm transition border-transparent bg-primary text-white hover:bg-[rgba(var(--color-primary-rgb),0.9)] touch-target"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs sm:text-sm font-bold text-white">Student Testing</p>
              </div>
              <p className="mt-1 text-[10px] sm:text-xs text-white/90">
                Test students on Memory, Tajweed, and Fluency
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide text-white/70 mt-1">
              Open workflow
            </span>
          </button>
          <button
            onClick={() => setShowTestResults(true)}
            className="flex h-full flex-col justify-between rounded-lg border-2 px-3 py-3 text-left shadow-sm transition border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 touch-target"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs sm:text-sm font-bold text-primary">Test Results</p>
              </div>
              <p className="mt-1 text-[10px] sm:text-xs text-gray-600">
                View, edit, and manage student test results
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mt-1">
              Open workflow
            </span>
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


  // Courses Section
  const CoursesSection = () => (
    <div>
      <h2 className="text-lg font-bold text-primary mb-3">Courses Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {['Quran Recitation', 'Islamic Studies', 'Arabic Language', 'Tajweed', 'Hifz Program'].map((course, index) => (
          <Card key={index}>
            <h3 className="font-bold text-primary mb-2">{course}</h3>
            <p className="text-sm text-primary-soft mb-4">Active students: {Math.floor(Math.random() * 50) + 10}</p>
            <button className="w-full px-4 py-2 bg-primary text-white rounded-full font-semibold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors">
              View Details
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
        <h2 className="text-lg font-bold text-primary mb-3">Financial Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Card>
            <div className="text-center">
              <p className="text-xs text-primary-soft">Total Revenue</p>
              <p className="text-xl font-bold text-primary">${students.reduce((sum, s) => sum + s.tuitionFee, 0).toLocaleString()}</p>
              <p className="text-[10px] text-primary-soft mt-0.5">This month</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-xs text-primary-soft">Pending Payments</p>
              <p className="text-xl font-bold text-accent">$12,450</p>
              <p className="text-xs text-primary-soft mt-1">24 students</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-primary-soft">Teacher Salaries</p>
              <p className="text-3xl font-bold text-primary">
                ${teachers.reduce((sum, t) => sum + t.payroll.monthlySalary, 0).toLocaleString()}
              </p>
              <p className="text-xs text-primary-soft mt-1">Monthly total</p>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // Reports Section
  const ReportsSection = () => (
    <div>
      <h2 className="text-2xl font-bold text-primary mb-6">Reports & Analytics</h2>
      <Card title="Generate Reports">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="p-4 border-2 border-accent-soft rounded-lg hover:border-primary hover:bg-soft-primary transition text-left">
            <h3 className="font-semibold mb-1 text-primary">📊 Student Report</h3>
            <p className="text-sm text-primary-soft">Enrollment, attendance, and performance</p>
          </button>
          <button className="p-4 border-2 border-accent-soft rounded-lg hover:border-accent hover:bg-soft-accent transition text-left">
            <h3 className="font-semibold mb-1 text-primary">💰 Financial Report</h3>
            <p className="text-sm text-primary-soft">Revenue, expenses, and projections</p>
          </button>
          <button className="p-4 border-2 border-accent-soft rounded-lg hover:border-primary hover:bg-soft-primary transition text-left">
            <h3 className="font-semibold mb-1 text-primary">👨‍🏫 Teacher Report</h3>
            <p className="text-sm text-primary-soft">Performance and assignments</p>
          </button>
        </div>
      </Card>
    </div>
  );

  // Activities Section
  const ActivitiesSection = () => (
    <div>
      <h2 className="text-2xl font-bold text-primary mb-6">Recent Activities</h2>
      <Card title="Activity Feed">
        <div className="space-y-4">
          {[
            { type: 'student', action: 'New student enrolled', name: 'Ahmad Ali', time: '2 hours ago', icon: '👨‍🎓', borderColor: 'border-primary', bgColor: 'bg-soft-primary' },
            { type: 'payment', action: 'Payment received', name: '$500 from Fatima Hassan', time: '4 hours ago', icon: '💰', borderColor: 'border-accent', bgColor: 'bg-soft-accent' },
            { type: 'teacher', action: 'Teacher registered', name: 'Dr. Ibrahim Yusuf', time: '1 day ago', icon: '👨‍🏫', borderColor: 'border-primary', bgColor: 'bg-soft-primary' },
            { type: 'course', action: 'New course created', name: 'Advanced Tajweed', time: '2 days ago', icon: '📚', borderColor: 'border-accent', bgColor: 'bg-soft-accent' },
          ].map((activity, index) => (
            <div key={index} className={`flex items-start space-x-3 p-3 border-l-4 ${activity.borderColor} ${activity.bgColor} rounded`}>
              <span className="text-2xl">{activity.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-primary">{activity.action}</p>
                <p className="text-sm text-primary-soft">{activity.name}</p>
                <p className="text-xs text-primary-soft mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  // Settings Section
  const SettingsSection = () => (
    <div>
      <h2 className="text-2xl font-bold text-primary mb-6">Settings</h2>
      <div className="space-y-6">
        <Card title="General Settings">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Academy Name</label>
              <input type="text" defaultValue="Umar Academy" className="w-full px-4 py-2 border border-accent-soft rounded-lg text-primary focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Contact Email</label>
              <input type="email" defaultValue="admin@umaracademy.org" className="w-full px-4 py-2 border border-accent-soft rounded-lg text-primary focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
        </Card>
        
        <Card title="Notification Preferences">
          <div className="space-y-3">
            {['Email Notifications', 'SMS Alerts', 'Payment Reminders', 'Activity Updates'].map((pref, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-primary rounded focus:ring-primary" />
                <span className="text-sm text-primary">{pref}</span>
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

    </div>
  );
};

export default AdminDashboard;
