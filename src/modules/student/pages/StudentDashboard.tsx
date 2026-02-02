import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../../components/Header';
import Sidebar from '../../../components/Sidebar';
import AppLayout from '../../../components/layout/AppLayout';
import Card, { CardHeader, CardContent } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
// DebugPanel only in development
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
const DebugPanel = isDevelopment ? lazy(() => import('../../../components/DebugPanel')) : null;
// Lazy load heavy components for better performance
const StudentPersonalMushaf = lazy(() => import('../../../components/StudentPersonalMushaf'));
const StudentTestResults = lazy(() => import('../../../components/StudentTestResults'));
const TeacherStudentMessage = lazy(() => import('../../../components/TeacherStudentMessage'));
const StudentWeeklyEvaluationReview = lazy(() => import('../../../components/StudentWeeklyEvaluationReview'));
const StudentPasswordChangeModal = lazy(() => import('../../../components/StudentPasswordChangeModal'));
const HomeworkDisplay = lazy(() => import('../../../components/HomeworkDisplay'));
import { useData } from '../../../contexts/DataContext';
import { useBackendData } from '../../../contexts/BackendDataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Assignment } from '../../../types/index';

const StudentDashboard: React.FC = () => {
  const { students, getStudentByEmail, updateStudent, teachers } = useData();
  const { assignments: backendAssignments, getPairStudents, getPairDailyReports, getStudentByIdentity } = useBackendData();
  const { user } = useAuth();
  
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [showPersonalMushaf, setShowPersonalMushaf] = useState(false);
  const [showTestResults, setShowTestResults] = useState(false);
  const [showTeacherStudentMessage, setShowTeacherStudentMessage] = useState(false);
  const [selectedTeacherForMessage, setSelectedTeacherForMessage] = useState<any>(null);
  const [showWeeklyEvaluations, setShowWeeklyEvaluations] = useState(false);
  const [pairInfo, setPairInfo] = useState<any>(null);
  const [pairDailyReports, setPairDailyReports] = useState<any[]>([]);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, {
    classwork?: boolean;
    homework?: boolean;
  } | boolean>>({});
  
  // Type guard helper
  const isAssignmentSection = (value: any): value is { classwork?: boolean; homework?: boolean } => {
    return typeof value === 'object' && value !== null;
  };
  const navigate = useNavigate();

  // Unified Student Identity: Find student by email OR userId (ID-agnostic lookup)
  // This ensures we always find the correct student regardless of which ID format is used
  const currentStudent = useMemo(() => {
    if (!user) return undefined;
    
    // Try unified lookup (email OR userId)
    let student = getStudentByIdentity?.(user.email, user.id);
    
    // Fallback to email-only lookup (for backward compatibility)
    if (!student && user.email) {
      student = getStudentByEmail(user.email);
    }
    
    // Last resort: try to find by userId directly
    if (!student && user.id) {
      const normalizeId = (id: any): string => {
        if (!id) return '';
        if (id && typeof id === 'object' && id.toString && typeof id.toString === 'function') {
          const str = id.toString();
          if (/^[0-9a-fA-F]{24}$/.test(str)) return str;
          return str.trim();
        }
        return String(id).trim();
      };
      
      const normalizedUserId = normalizeId(user.id);
      student = students.find(s => {
        const sUserId = normalizeId((s as any).userId);
        return sUserId === normalizedUserId;
      });
    }
    
    return student || undefined; // Return undefined instead of students[0] to avoid wrong student
  }, [user, students, getStudentByIdentity, getStudentByEmail]);
  
  // Memoize program checks to avoid recalculation
  const programFlags = useMemo(() => ({
    isAfterSchool: currentStudent?.program === 'After School',
    isFullTimeHQ: currentStudent?.program === 'Full-Time HQ',
    isPartTimeHQ: currentStudent?.program === 'Part-Time HQ',
    shouldHideQaidah: currentStudent?.program === 'Full-Time HQ' || currentStudent?.program === 'Part-Time HQ'
  }), [currentStudent?.program]);
  
  const { isAfterSchool, isFullTimeHQ, isPartTimeHQ, shouldHideQaidah } = programFlags;
  
  // Show password change modal on login if passwordChangeRequired is true
  useEffect(() => {
    if (user?.passwordChangeRequired && !showPasswordChangeModal) {
      setShowPasswordChangeModal(true);
    }
  }, [user?.passwordChangeRequired, showPasswordChangeModal]);

  // Debug logging
  useEffect(() => {
    if (currentStudent) {
      console.log('🔍 Student Program Check:', {
        email: currentStudent.email || user?.email || 'N/A',
        studentId: currentStudent.id || currentStudent.studentRecordId || 'N/A',
        program: currentStudent.program || 'N/A',
        isFullTimeHQ,
        isPartTimeHQ,
        shouldHideQaidah
      });
    } else if (user) {
      console.log('🔍 Student Program Check: No student found for user:', {
        userEmail: user.email,
        studentsCount: students.length
      });
    }
  }, [currentStudent, user, students.length, isFullTimeHQ, isPartTimeHQ, shouldHideQaidah]);

  // Load pair information for student
  useEffect(() => {
    const loadPairInfo = async () => {
      if (!currentStudent?.id) return;
      try {
        const pairStudents = await getPairStudents({ student: currentStudent.id, status: 'active' });
        if (pairStudents.length > 0) {
          const pairStudent = pairStudents[0];
          setPairInfo({
            pair: pairStudent.pair,
            pairStudent: pairStudent,
            schedule: {
              startTime: pairStudent.startTime,
              endTime: pairStudent.endTime,
              days: pairStudent.days
            }
          });
          
          // Load daily reports for this student
          const reports = await getPairDailyReports({ student: currentStudent.id });
          setPairDailyReports(reports);
        }
      } catch (error) {
        console.error('Error loading pair info:', error);
      }
    };
    
    loadPairInfo();
  }, [currentStudent, getPairStudents, getPairDailyReports]);


  // Helper function to normalize IDs for consistent comparison - memoized to prevent re-creation
  const normalizeId = useCallback((id: any): string => {
    if (!id) return '';
    if (id && typeof id === 'object' && id.toString && typeof id.toString === 'function') {
      const str = id.toString();
      if (/^[0-9a-fA-F]{24}$/.test(str)) {
        return str;
      }
      return str.trim();
    }
    return String(id).trim();
  }, []);

  const studentAssignments = useMemo(() => {
    if (!currentStudent?.id) return [];
    
    const isAfterSchool = currentStudent?.program === 'After School';
    
    // Normalize student IDs for comparison
    const normalizedStudentId = normalizeId(currentStudent.id);
    const normalizedUserId = normalizeId((currentStudent as any).userId);
    
    return backendAssignments
      .filter((assignment: any) => {
        const normalizeIdLocal = (id: any): string => {
          if (!id) return '';
          if (id && typeof id === 'object' && id.toString && typeof id.toString === 'function') {
            const str = id.toString();
            if (/^[0-9a-fA-F]{24}$/.test(str)) return str;
            return str.trim();
          }
          return String(id).trim();
        };
        
        const assignmentStudentId = normalizeIdLocal(assignment.studentId || assignment._id?.studentId);
        
        // Check if assignment matches EITHER Student document _id OR User document _id
        const matchesStudentId = assignmentStudentId && (
          assignmentStudentId === normalizedStudentId ||
          assignmentStudentId === normalizeIdLocal(currentStudent.id?.toString()) ||
          String(assignmentStudentId) === String(normalizedStudentId)
        );
        
        const matchesUserId = normalizedUserId && assignmentStudentId && (
          assignmentStudentId === normalizedUserId ||
          assignmentStudentId === normalizeIdLocal((currentStudent as any).userId?.toString()) ||
          String(assignmentStudentId) === String(normalizedUserId)
        );
        
        const matches = matchesStudentId || matchesUserId;
        
        if (!matches) return false;
        
        // For After School students, only show assignments that are specifically for them
        // or assignments that don't have program restrictions
        if (isAfterSchool) {
          // Filter to show only After School specific assignments
          // You can add additional filtering logic here if needed
          return true;
        }
        
        // Show all assignments that match the student (same as assignments page)
        // Removed Qaidah homework filtering to match assignments page behavior
        return true;
      })
      .map((assignment: any) => {
        const assignmentId = assignment._id || assignment.id;
        const createdAt = assignment.createdAt ? new Date(assignment.createdAt) : new Date();
        
        const classworkCount = 
          (assignment.classwork?.sabq?.length || 0) +
          (assignment.classwork?.sabqi?.length || 0) +
          (assignment.classwork?.manzil?.length || 0);
        
        let title = 'Assignment';
        
        // Set title based on classwork
        if (classworkCount > 0) {
          const sections: string[] = [];
          if (assignment.classwork?.sabq?.length > 0) {
            sections.push(`${assignment.classwork.sabq.length} Sabq`);
          }
          if (assignment.classwork?.sabqi?.length > 0) {
            sections.push(`${assignment.classwork.sabqi.length} Sabqi`);
          }
          if (assignment.classwork?.manzil?.length > 0) {
            sections.push(`${assignment.classwork.manzil.length} Manzil`);
          }
          title = sections.join(', ');
        }
        
        if (assignment.homework?.enabled && !assignment.homework?.qaidahHomework) {
          title += (classworkCount > 0 ? ' + ' : '') + 'Homework';
        }
        
        const status = assignment.status || 'active';
        
        return {
          id: assignmentId,
          _id: assignmentId,
          title: title,
          description: assignment.comment || '',
          course: 'Quran Recitation',
          instructor: assignment.assignedByName || 'Teacher',
          dueDate: createdAt.toISOString().split('T')[0],
          status: status === 'completed' ? 'completed' : status === 'archived' ? 'archived' : 'active',
          grade: null,
          maxPoints: 100,
          type: 'classwork',
          studentId: currentStudent.id,
          createdAt: createdAt,
          classwork: assignment.classwork || { sabq: [], sabqi: [], manzil: [] },
          homework: (() => {
            const hw = assignment.homework || { enabled: false, content: '', link: '' };
            // Remove qaidahHomework from homework object
            if (hw.qaidahHomework) {
              const { qaidahHomework, ...rest } = hw;
              return rest;
            }
            return hw;
          })(),
          qaidahHomework: null,
          comment: assignment.comment || '',
          mushafMistakes: assignment.mushafMistakes || [],
          assignedByName: assignment.assignedByName,
          assignedByRole: assignment.assignedByRole,
          originalAssignment: assignment
        };
      })
      .sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [backendAssignments, currentStudent]);

  const completedAssignments = useMemo(() => 
    studentAssignments.filter((a: any) => a.status === 'completed' || a.status === 'graded'),
    [studentAssignments]
  );
  
  const pendingAssignments = useMemo(() => 
    studentAssignments.filter((a: any) => a.status === 'pending' || a.status === 'submitted'),
    [studentAssignments]
  );
  
  const overdueAssignments = useMemo(() => 
    studentAssignments.filter((a: any) => a.status === 'overdue'),
    [studentAssignments]
  );

  const gradedAssignments = useMemo(() => 
    studentAssignments.filter((a: any) => a.grade !== null && a.grade !== undefined),
    [studentAssignments]
  );
  
  const averageGrade = useMemo(() => 
    gradedAssignments.length > 0 
      ? Math.round(gradedAssignments.reduce((sum: number, a: any) => sum + (a.grade || 0), 0) / gradedAssignments.length)
      : 0,
    [gradedAssignments]
  );

  const studentPayments: any[] = [];
  const totalPaid = 0;
  const lastPayment = null;

  const [submissionData, setSubmissionData] = useState({
    content: '',
    attachments: [] as string[],
  });

  const handleSubmitAssignment = useCallback(async () => {
    if (!selectedAssignment || !currentStudent) {
      console.error('Missing assignment or student', { selectedAssignment, currentStudent });
      return;
    }

    if (!submissionData.content.trim()) {
      alert('Please enter submission content');
      return;
    }

    try {
      const submission = {
        studentId: currentStudent.id.toString(),
        content: submissionData.content,
        link: '',
        attachments: submissionData.attachments.map((url: string) => ({
          type: 'link',
          content: url,
          title: 'Attachment'
        }))
      };

      const assignmentId = (selectedAssignment as any)._id || selectedAssignment.id;
      
      if (!assignmentId || assignmentId === 'undefined' || assignmentId === undefined) {
        throw new Error('Assignment ID is missing. Please refresh the page and try again.');
      }
      
      // ✅ FIX: Added Authorization header (required by backend authenticateToken middleware)
      const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
      const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE}/assignments/${assignmentId}/submit-homework`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // ✅ FIX: Added auth header
        },
        body: JSON.stringify({
          content: submission.content,
          link: submission.link || '',
          attachments: submission.attachments,
          studentId: currentStudent.id,
          studentName: currentStudent.fullName
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit homework');
      }
      
      setShowSubmissionForm(false);
      setSubmissionData({ content: '', attachments: [] });
      setSelectedAssignment(null);
      
      alert('Assignment submitted successfully!');
      window.location.reload();
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert(`Failed to submit assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [selectedAssignment, currentStudent, submissionData]);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!currentStudent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onMenuClick={() => setSidebarOpen((o) => !o)} />
        <AppLayout
          sidebar={
            <Sidebar
              activeSection="overview"
              onSectionChange={() => {}}
              isMobileOpen={sidebarOpen}
              onMobileToggle={() => setSidebarOpen((o) => !o)}
              onMobileClose={() => setSidebarOpen(false)}
            />
          }
          sidebarOpen={sidebarOpen}
          onOverlayClick={() => setSidebarOpen(false)}
          maxWidth="7xl"
        >
          <div className="space-y-4">
            <h1 className="heading-page text-gray-900">Student profile not found</h1>
            <p className="body-text text-gray-600">We couldn't find your student profile.</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
              <p className="caption text-yellow-800">User: {user ? user.name : 'Not logged in'} · Email: {user?.email || 'No email'}</p>
            </div>
            <Button variant="primary" size="md" onClick={() => window.location.reload()} fullWidthMobile>Refresh page</Button>
          </div>
        </AppLayout>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuClick={() => setSidebarOpen((o) => !o)} />
      <AppLayout
        sidebar={
          <Sidebar
            activeSection="overview"
            onSectionChange={() => {}}
            isMobileOpen={sidebarOpen}
            onMobileToggle={() => setSidebarOpen((o) => !o)}
            onMobileClose={() => setSidebarOpen(false)}
          />
        }
        sidebarOpen={sidebarOpen}
        onOverlayClick={() => setSidebarOpen(false)}
        maxWidth="7xl"
      >
      <div className="space-y-4">
        <div>
          <h1 className="heading-page text-gray-900">Dashboard</h1>
          <p className="caption mt-1">
            {currentStudent?.fullName}
            {studentAssignments.length > 0 && ` · ${completedAssignments.length} of ${studentAssignments.length} completed · ${averageGrade}% average`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link to="/student/assignments">
            <Button variant="primary" size="md" fullWidthMobile>Assignments</Button>
          </Link>
          <Button variant="outline" size="md" onClick={() => setShowPersonalMushaf(true)} fullWidthMobile>Mushaf</Button>
          {!isAfterSchool && (
            <Button variant="outline" size="md" onClick={() => setShowTestResults(true)} fullWidthMobile>Tests</Button>
          )}
          <Button variant="outline" size="md" onClick={() => setShowWeeklyEvaluations(true)} fullWidthMobile>Evaluations</Button>
          <Link to="/student/profile">
            <Button variant="outline" size="md" fullWidthMobile>Profile</Button>
          </Link>
        </div>

        {pairInfo && pairInfo.pair && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedSections(prev => ({ ...prev, teacherPair: !prev.teacherPair }))}
              className="w-full flex items-center justify-between min-h-[44px] px-4 py-3 border-b border-gray-100 text-left"
            >
              <span className="heading-card">My Teacher Pair</span>
              <span className="caption">{expandedSections.teacherPair ? '▼' : '▶'}</span>
            </button>
            {expandedSections.teacherPair && (
              <div className="rounded border border-primary/20 bg-primary/5 p-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-primary mb-1">
                      {pairInfo.pair.name || 'Teacher Pair'}
                    </h3>
                    <p className="text-xs text-gray-700 mb-1">
                      Program: <span className="font-semibold">{pairInfo.pair.program || 'N/A'}</span>
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-gray-600">Teachers:</span>
                        <span className="text-xs font-semibold text-primary">
                          {pairInfo.pair.teacher1?.fullName || 'Teacher 1'}
                          {pairInfo.pair.teacher2?.fullName && ` & ${pairInfo.pair.teacher2.fullName}`}
                        </span>
                      </div>
                      {pairInfo.schedule && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-gray-600">Schedule:</span>
                          <span className="text-xs font-semibold text-gray-900">
                            {pairInfo.schedule.startTime} - {pairInfo.schedule.endTime}
                          </span>
                        </div>
                      )}
                      {pairInfo.schedule?.days && pairInfo.schedule.days.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-gray-600">Days:</span>
                          <span className="text-xs font-semibold text-gray-900">
                            {pairInfo.schedule.days.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      pairInfo.pair.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {pairInfo.pair.status || 'Active'}
                    </span>
                </div>
              </div>
              
                {/* Recent Daily Reports - Compact */}
              {pairDailyReports.length > 0 && (
                  <div className="mt-2 border-t border-gray-200 pt-2">
                    <h4 className="font-bold text-xs text-primary mb-1.5">Recent Reports</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {pairDailyReports.slice(0, 3).map((report: any) => (
                        <div key={report._id} className="p-1.5 bg-gray-50 rounded text-xs">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-semibold text-gray-600">
                            {new Date(report.date).toLocaleDateString()}
                          </span>
                            <span className="text-[10px] font-semibold text-primary">
                            {report.teacher?.fullName || 'Teacher'}
                          </span>
                        </div>
                        {(report.sabq || report.sabqi || report.manzil) && (
                            <div className="text-[10px] text-gray-700">
                              {report.sabq && <div><span className="font-semibold">Sabq:</span> {report.sabq.substring(0, 40)}...</div>}
                              {report.sabqi && <div><span className="font-semibold">Sabqi:</span> {report.sabqi.substring(0, 40)}...</div>}
                              {report.manzil && <div><span className="font-semibold">Manzil:</span> {report.manzil.substring(0, 40)}...</div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/student/assignments"
            className="block rounded border border-primary/20 bg-white p-2 hover:border-primary transition-all"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary text-sm">
                📝
              </div>
              <div>
                <h3 className="font-bold text-xs text-primary">Assignments</h3>
                <p className="text-[10px] text-gray-600">View all assignments</p>
              </div>
            </div>
          </Link>
          <button
            onClick={() => setShowPersonalMushaf(true)}
            className="block w-full text-left rounded border border-primary/20 bg-white p-2 hover:border-primary transition-all"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary text-sm">
                📖
              </div>
              <div>
                <h3 className="font-bold text-xs text-primary">Mushaf</h3>
                <p className="text-[10px] text-gray-600">Mistake history</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => setShowWeeklyEvaluations(true)}
            className="block w-full text-left rounded border border-primary/20 bg-white p-2 hover:border-primary transition-all"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary text-sm">
                📋
              </div>
              <div>
                <h3 className="font-bold text-xs text-primary">Evaluations</h3>
                <p className="text-[10px] text-gray-600">Weekly reviews</p>
              </div>
            </div>
          </button>
        </div>

        {/* Main Content Grid - Compact */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-2">
          {/* Profile Information - Compact */}
          <div className="lg:col-span-1">
            <Card padding="md">
              <CardHeader><h3 className="heading-card">Profile</h3></CardHeader>
              <CardContent>
              <div className="text-center mb-2">
                <img
                  src={currentStudent.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentStudent.fullName)}&background=1F3224&color=fff`}
                  alt={currentStudent.fullName}
                  className="h-12 w-12 rounded-full border-2 border-gray-200 mx-auto mb-1"
                />
                <h3 className="text-xs font-bold text-primary mb-0.5">{currentStudent.fullName}</h3>
                <span className="inline-block px-1.5 py-0.5 rounded bg-soft-primary text-primary text-[9px] font-semibold">
                  {currentStudent.status}
                </span>
              </div>
              <div className="space-y-1.5 border-t border-gray-200 pt-2">
                <div>
                  <p className="text-[9px] font-semibold text-gray-500 uppercase mb-0.5">Program</p>
                  <p className="text-xs font-semibold text-gray-900">{currentStudent.program}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-gray-500 uppercase mb-0.5">ID</p>
                  <p className="text-xs font-semibold text-gray-900">{currentStudent.id}</p>
                </div>
                {currentStudent.schedule && (
                  <div>
                    <p className="text-[9px] font-semibold text-gray-500 uppercase mb-0.5">Schedule</p>
                    <p className="text-xs font-semibold text-gray-900">
                      {currentStudent.schedule?.days?.join(', ') || 'Not set'}
                    </p>
                    <p className="text-[10px] text-gray-600">
                      {currentStudent.schedule?.startTime || 'N/A'} - {currentStudent.schedule?.endTime || 'N/A'}
                    </p>
                  </div>
                )}
                <div className="pt-1 border-t border-gray-200">
                  <button
                    onClick={() => setShowPasswordChangeModal(true)}
                    className="w-full px-2 py-1.5 bg-primary text-white rounded text-xs font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Change Password
                  </button>
                </div>
              </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card padding="md">
              <CardHeader><h3 className="heading-card">Assignments ({studentAssignments.length})</h3></CardHeader>
              <CardContent>
              {studentAssignments.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-xs font-semibold">No assignments yet</p>
                  <p className="text-[10px] mt-0.5">Your teacher will assign work soon.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {studentAssignments.slice(0, 5).map((assignment: any) => {
                    const classwork = assignment.classwork || { sabq: [], sabqi: [], manzil: [] };
                    const hasClasswork = classwork.sabq.length > 0 || classwork.sabqi.length > 0 || classwork.manzil.length > 0;
                    const hasHomework = assignment.homework?.enabled;
                    
                    return (
                      <div key={assignment.id} className="bg-white rounded border border-gray-200 p-2 hover:border-primary transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 mb-1.5">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <h4 className="text-xs font-bold text-primary">{assignment.title}</h4>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                assignment.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {assignment.status === 'active' ? 'Active' : assignment.status}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-600 mb-1">
                              <span className="font-semibold">By:</span> {assignment.assignedByName || 'Teacher'}
                              <span className="text-gray-400">•</span>
                              <span>{assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            {assignment.comment && (
                              <p className="text-[10px] text-gray-600 italic mt-1">"{assignment.comment.substring(0, 60)}..."</p>
                            )}
                          </div>
                        </div>

                        {/* Classwork Section - Wrapped */}
                        {hasClasswork && (
                          <div className="mb-1.5 p-1.5 bg-soft-primary rounded border border-gray-200">
                            <button
                              onClick={() => setExpandedSections(prev => {
                                const current = prev[assignment.id];
                                const currentObj = isAssignmentSection(current) ? current : {};
                                return {
                                  ...prev,
                                  [assignment.id]: {
                                    ...currentObj,
                                    classwork: !currentObj.classwork
                                  }
                                };
                              })}
                              className="w-full flex items-center justify-between mb-1"
                            >
                              <h5 className="text-[10px] font-semibold text-primary uppercase">Classwork</h5>
                              <span className="text-[9px] text-gray-600">
                                {(() => {
                                  const section = expandedSections[assignment.id];
                                  return (isAssignmentSection(section) && section.classwork) ? '▼' : '▶';
                                })()}
                              </span>
                            </button>
                            {(() => {
                              const section = expandedSections[assignment.id];
                              return isAssignmentSection(section) && section.classwork;
                            })() && (
                            <div className="space-y-1">
                              {classwork.sabq.length > 0 && (
                                <div>
                                  <span className="text-[9px] font-semibold text-gray-600">Sabq:</span>
                                  <ul className="ml-2 mt-0.5 space-y-0.5">
                                    {classwork.sabq.slice(0, 2).map((phase: any, idx: number) => (
                                      <li key={idx} className="text-[10px] text-gray-700">
                                        • {phase.assignmentRange || phase.details || 'Sabq'}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {classwork.sabqi.length > 0 && (
                                <div>
                                  <span className="text-[9px] font-semibold text-gray-600">Sabqi:</span>
                                  <ul className="ml-2 mt-0.5 space-y-0.5">
                                    {classwork.sabqi.slice(0, 2).map((phase: any, idx: number) => (
                                      <li key={idx} className="text-[10px] text-gray-700">
                                        • {phase.assignmentRange || phase.details || 'Sabqi'}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {classwork.manzil.length > 0 && (
                                <div>
                                  <span className="text-[9px] font-semibold text-gray-600">Manzil:</span>
                                  <ul className="ml-2 mt-0.5 space-y-0.5">
                                    {classwork.manzil.slice(0, 2).map((phase: any, idx: number) => (
                                      <li key={idx} className="text-[10px] text-gray-700">
                                        • {phase.assignmentRange || phase.details || 'Manzil'}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                            )}
                          </div>
                        )}

                        {/* Homework Section - Wrapped */}
                        {hasHomework && (
                          <div className="mb-1.5 p-1.5 bg-soft-accent rounded border border-gray-200">
                            <button
                              onClick={() => setExpandedSections(prev => {
                                const current = prev[assignment.id];
                                const currentObj = isAssignmentSection(current) ? current : {};
                                return {
                                  ...prev,
                                  [assignment.id]: {
                                    ...currentObj,
                                    homework: !currentObj.homework
                                  }
                                };
                              })}
                              className="w-full flex items-center justify-between mb-1"
                            >
                              <h5 className="text-[10px] font-semibold text-primary uppercase">Homework</h5>
                              <span className="text-[9px] text-gray-600">
                                {(() => {
                                  const section = expandedSections[assignment.id];
                                  return (isAssignmentSection(section) && section.homework) ? '▼' : '▶';
                                })()}
                              </span>
                            </button>
                            {(() => {
                              const section = expandedSections[assignment.id];
                              return isAssignmentSection(section) && section.homework;
                            })() && (
                            <div className="text-[10px] text-gray-700">
                              {assignment.homework.content ? assignment.homework.content.substring(0, 80) + '...' : 'Homework assigned'}
                            </div>
                            )}
                          </div>
                        )}

                        {/* Mistakes Count - Compact */}
                        {assignment.mushafMistakes && assignment.mushafMistakes.length > 0 && (
                          <div className="text-[10px] text-gray-600">
                            <span className="font-semibold">Mistakes:</span> {assignment.mushafMistakes.length}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card padding="md">
              <CardHeader><h3 className="heading-card">Quick Actions</h3></CardHeader>
              <CardContent>
            <div className="grid grid-cols-2 gap-1.5">
              {currentStudent?.assignedTeacher && (() => {
                const assignedTeacher = teachers.find(t => {
                  const tId = (t as any)._id || (t as any).teacherDocumentId || t.id;
                  const studentTeacherId = currentStudent.assignedTeacher;
                  return tId?.toString() === studentTeacherId?.toString();
                });
                
                if (assignedTeacher) {
                  return (
                    <button
                      onClick={() => {
                        setSelectedTeacherForMessage(assignedTeacher);
                        setShowTeacherStudentMessage(true);
                      }}
                      className="p-2 rounded border border-primary bg-primary text-white hover:bg-primary/90 transition text-center"
                    >
                      <div className="font-semibold text-xs mb-0.5">Message</div>
                      <div className="text-[9px] opacity-90">{assignedTeacher.fullName}</div>
                    </button>
                  );
                }
                return null;
              })()}
              <Link
                to="/student/assignments"
                className="p-2 rounded border border-gray-200 bg-white hover:border-primary hover:bg-soft-primary transition text-center"
              >
                <div className="font-semibold text-primary text-xs mb-0.5">Assignments</div>
                <div className="text-[9px] text-gray-600">View all</div>
              </Link>
              <Link
                to="/student/courses"
                className="p-2 rounded border border-gray-200 bg-white hover:border-primary hover:bg-soft-primary transition text-center"
              >
                <div className="font-semibold text-primary text-xs mb-0.5">Courses</div>
                <div className="text-[9px] text-gray-600">Info</div>
              </Link>
            </div>
              </CardContent>
          </Card>

          <Card padding="md">
              <CardHeader><h3 className="heading-card">Progress</h3></CardHeader>
              <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1.5 text-[10px] uppercase">Assignments</h4>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-600">Done</span>
                    <span className="text-[10px] font-bold text-green-600">{completedAssignments.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-600">Pending</span>
                    <span className="text-[10px] font-bold text-yellow-600">{pendingAssignments.length}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1.5 text-[10px] uppercase">Performance</h4>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-600">Grade</span>
                    <span className="text-[10px] font-bold text-primary">{averageGrade}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-600">Graded</span>
                    <span className="text-[10px] font-bold text-gray-900">{gradedAssignments.length}</span>
                  </div>
                </div>
              </div>
            </div>
              </CardContent>
          </Card>
        </div>
      </div>

      {showPersonalMushaf && currentStudent && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="text-white">Loading Mushaf...</div></div>}>
          <StudentPersonalMushaf 
            studentId={currentStudent.id} 
            onClose={() => setShowPersonalMushaf(false)} 
          />
        </Suspense>
      )}

      {/* Test Results Modal */}
      {showTestResults && !isAfterSchool && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="text-white">Loading Test Results...</div></div>}>
          <StudentTestResults
            onClose={() => setShowTestResults(false)}
          />
        </Suspense>
      )}

      {/* Teacher-Student Message Modal */}
      {showTeacherStudentMessage && currentStudent && selectedTeacherForMessage && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="text-white">Loading Messages...</div></div>}>
          <TeacherStudentMessage
            teacher={selectedTeacherForMessage}
            student={currentStudent}
            onClose={() => {
              setShowTeacherStudentMessage(false);
              setSelectedTeacherForMessage(null);
            }}
          />
        </Suspense>
      )}

      {/* Weekly Evaluations Modal */}
      {showWeeklyEvaluations && currentStudent && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="text-white">Loading Evaluations...</div></div>}>
          <StudentWeeklyEvaluationReview
            studentId={currentStudent.id}
            onClose={() => setShowWeeklyEvaluations(false)}
          />
        </Suspense>
      )}

      {/* Password Change Modal - Shows when passwordChangeRequired is true */}
      {showPasswordChangeModal && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="text-white">Loading...</div></div>}>
          <StudentPasswordChangeModal
            onClose={() => setShowPasswordChangeModal(false)}
            onPasswordChanged={() => {
              setShowPasswordChangeModal(false);
              // Update user in localStorage to clear the flag
              const savedUser = localStorage.getItem('umar_academy_user');
              if (savedUser) {
                const userData = JSON.parse(savedUser);
                userData.passwordChangeRequired = false;
                localStorage.setItem('umar_academy_user', JSON.stringify(userData));
              }
            }}
          />
        </Suspense>
      )}
      
      {isDevelopment && DebugPanel && (
        <Suspense fallback={null}>
          <DebugPanel />
        </Suspense>
      )}
      </AppLayout>
    </div>
  );
};

export default StudentDashboard;
