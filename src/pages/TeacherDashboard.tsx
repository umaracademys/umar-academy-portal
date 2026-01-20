import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
// DebugPanel only in development
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
const DebugPanel = isDevelopment ? lazy(() => import('../components/DebugPanel')) : null;
const PermissionManager = lazy(() => import('../components/PermissionManager'));
import StudentReports from '../components/StudentReports';
import TeacherTicketReview from '../components/TeacherTicketReview';
import { useData } from '../contexts/DataContext';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { Student, Assessment, Evaluation, TeacherPermissions } from '../types';
import { Ticket } from '../types/ticket';
import { usePermission } from '../hooks/usePermission';
import { RequirePermission } from '../components/RequirePermission';
import { TeacherPermissionKey } from '../shared/permissions';
import TeacherEvaluationAssignments from '../components/TeacherEvaluationAssignments';
import TeacherAttendanceView from '../components/TeacherAttendanceView';
import EnhancedWeeklyEvaluationForm from '../components/EnhancedWeeklyEvaluationForm';
import TeacherWeeklyEvaluationReview from '../components/TeacherWeeklyEvaluationReview';
import PairDailyReportForm from '../components/PairDailyReportForm';
import PairTeacherMessage from '../components/PairTeacherMessage';
import TeacherStudentMessage from '../components/TeacherStudentMessage';
import TeacherPersonalMushaf from '../components/TeacherPersonalMushaf';
import TeacherAssessmentForm from '../components/TeacherAssessmentForm';
import TeacherNotificationCenter from '../components/TeacherNotificationCenter';
import TicketCreationForm from '../components/TicketCreationForm';
import HomeworkAssignmentForm from '../components/HomeworkAssignmentForm';

const TeacherDashboard: React.FC = () => {
  const { teachers, getStudentsByTeacher, updateStudent, refreshData, students: allStudents } = useData();
  const { recitationReviews, recitationTickets, getTeacherTickets, startTicket, submitTicket, getTeacherPairs, getPairStudents, refreshTeacherNotifications, assignments, updateAssignment, deleteTicket, deleteTickets } = useBackendData();
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showWeeklyEvaluationForm, setShowWeeklyEvaluationForm] = useState(false);
  const [showWeeklyEvaluationReview, setShowWeeklyEvaluationReview] = useState(false);
  const [showStudentHistory, setShowStudentHistory] = useState(false);
  const [showStudentReports, setShowStudentReports] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showTicketReview, setShowTicketReview] = useState(false);
  const [showEvaluationAssignments, setShowEvaluationAssignments] = useState(false);
  const [showMyAttendance, setShowMyAttendance] = useState(false);
  const [showPairDailyReport, setShowPairDailyReport] = useState(false);
  const [showPairMessage, setShowPairMessage] = useState(false);
  const [selectedPairForMessage, setSelectedPairForMessage] = useState<any>(null);
  const [selectedStudentForMessage, setSelectedStudentForMessage] = useState<any>(null);
  const [showTeacherStudentMessage, setShowTeacherStudentMessage] = useState(false);
  const [selectedStudentForTSMessage, setSelectedStudentForTSMessage] = useState<any>(null);
  const [showPersonalMushaf, setShowPersonalMushaf] = useState(false);
  const [selectedStudentForMushaf, setSelectedStudentForMushaf] = useState<Student | null>(null);
  const [teacherPairs, setTeacherPairs] = useState<any[]>([]);
  const [pairStudentsMap, setPairStudentsMap] = useState<Record<string, any[]>>({});
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [studentWeeklyEvaluations, setStudentWeeklyEvaluations] = useState<Record<string, any[]>>({});
  const [loadingEvaluations, setLoadingEvaluations] = useState<Record<string, boolean>>({});
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [selectedStudentForTicket, setSelectedStudentForTicket] = useState<string | null>(null);
  const [showHomeworkForm, setShowHomeworkForm] = useState(false);
  const [selectedTicketForHomework, setSelectedTicketForHomework] = useState<Ticket | null>(null);
  const [selectedAssignmentForHomework, setSelectedAssignmentForHomework] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'actions'>('overview');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pendingTickets: true,
    approvedTickets: true,
    quickActions: false
  });
  const [showAllPendingTickets, setShowAllPendingTickets] = useState(false);
  const [showAllApprovedTickets, setShowAllApprovedTickets] = useState(false);
  // Filter and sort states
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'a-z' | 'z-a'>('a-z');
  // Bulk selection states
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Find teacher by email OR userId (more reliable matching)
  const currentTeacher = useMemo(() => {
    if (!user || !teachers || teachers.length === 0) {
      console.log('⚠️ No user or teachers available');
      return null;
    }
    
    // Try to find by email first
    let teacher = teachers.find(t => t.email?.toLowerCase() === user.email?.toLowerCase());
    
    // If not found by email, try to find by userId (teacher.userId should match user.id)
    if (!teacher && user.id) {
      teacher = teachers.find(t => {
        const teacherUserId = (t as any).userId?._id?.toString() || (t as any).userId?.toString() || (t as any).userId;
        const userUserId = user.id?.toString() || (user as any)._id?.toString();
        return teacherUserId && userUserId && teacherUserId === userUserId;
      });
    }
    
    // If still not found, try to find by user's _id
    if (!teacher && (user as any)._id) {
      teacher = teachers.find(t => {
        const teacherUserId = (t as any).userId?._id?.toString() || (t as any).userId?.toString() || (t as any).userId;
        const userUserId = (user as any)._id?.toString();
        return teacherUserId && userUserId && teacherUserId === userUserId;
      });
    }
    
    if (!teacher) {
      console.warn('⚠️ Teacher not found for user:', { email: user.email, userId: user.id, teachersCount: teachers.length });
      // Don't use fallback - return null so we can debug the issue
      return null;
    }
    
    console.log('✅ Teacher found:', teacher.fullName, '- Email:', teacher.email, '- ID:', teacher.id);
    return teacher;
  }, [user, teachers]);
  
  const assignedStudents = useMemo(() => {
    if (!currentTeacher) {
      console.log('⚠️ No current teacher found, returning empty assigned students');
      return [];
    }
    // Use Teacher Document ID (_id or teacherDocumentId) instead of User ID (id)
    // Students are assigned using Teacher Document IDs in assignedTeacherIds array
    const teacherDocId = (currentTeacher as any)._id || (currentTeacher as any).teacherDocumentId || currentTeacher.id;
    
    // Debug: Log all available IDs to understand the structure
    console.log('🔍 Teacher ID Debug:', {
      teacherName: currentTeacher.fullName,
      teacherId: currentTeacher.id,
      teacherDocId: teacherDocId,
      _id: (currentTeacher as any)._id,
      teacherDocumentId: (currentTeacher as any).teacherDocumentId,
      userId: (currentTeacher as any).userId?._id || (currentTeacher as any).userId,
      allKeys: Object.keys(currentTeacher)
    });
    
    const students = getStudentsByTeacher(teacherDocId);
    console.log('✅ Assigned students for teacher:', currentTeacher.fullName, '- Count:', students.length, '- Teacher Doc ID:', teacherDocId);
    
    // If no students found, try with User ID as fallback (for debugging)
    if (students.length === 0 && teacherDocId !== currentTeacher.id) {
      console.log('⚠️ No students found with Teacher Doc ID, trying User ID as fallback...');
      const studentsByUserId = getStudentsByTeacher(currentTeacher.id);
      console.log('🔍 Students found with User ID:', studentsByUserId.length);
      if (studentsByUserId.length > 0) {
        console.log('⚠️ WARNING: Students are assigned using User ID instead of Teacher Document ID!');
        return studentsByUserId;
      }
    }
    
    return students;
  }, [currentTeacher, getStudentsByTeacher]);

  // Get available programs from students
  const availablePrograms = useMemo(() => {
    const programs = new Set<string>();
    assignedStudents.forEach(student => {
      if (student.program) {
        programs.add(student.program);
      }
    });
    return Array.from(programs).sort();
  }, [assignedStudents]);

  // Get teacher tickets first (needed for filteredAndSortedTickets)
  const teacherTickets = useMemo(() => {
    if (!currentTeacher?.id) {
      return [];
    }
    // Use the same robust ID matching as approvedTicketsNeedingHomework
    const teacherDocId = (currentTeacher as any)._id || (currentTeacher as any).teacherDocumentId || currentTeacher.id;
    const teacherIdStr = teacherDocId.toString();
    
    // Try both teacher.id and teacherDocId to ensure we catch all tickets
    const ticketsById = getTeacherTickets(currentTeacher.id);
    const ticketsByDocId = getTeacherTickets(teacherIdStr);
    
    // Combine and deduplicate
    const allTickets = [...ticketsById, ...ticketsByDocId];
    const uniqueTickets = allTickets.filter((ticket, index, self) => 
      index === self.findIndex(t => t.id === ticket.id)
    );
    
    return uniqueTickets;
  }, [currentTeacher?.id, currentTeacher, getTeacherTickets, recitationTickets]);

  // Filter and sort students
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = assignedStudents;

    // Filter by program
    if (selectedProgram !== 'all') {
      filtered = filtered.filter(student => student.program === selectedProgram);
    }

    // Sort A-Z or Z-A
    filtered = [...filtered].sort((a, b) => {
      const nameA = (a.fullName || '').toLowerCase();
      const nameB = (b.fullName || '').toLowerCase();
      const comparison = nameA.localeCompare(nameB);
      return sortOrder === 'a-z' ? comparison : -comparison;
    });

    return filtered;
  }, [assignedStudents, selectedProgram, sortOrder]);

  // Filter and sort tickets
  const filteredAndSortedTickets = useMemo(() => {
    let filtered = teacherTickets;

    // Filter by program (get student program from ticket)
    if (selectedProgram !== 'all') {
      filtered = filtered.filter(ticket => {
        const student = assignedStudents.find(s => s.id === ticket.studentId || (s as any).studentRecordId === ticket.studentId);
        return student?.program === selectedProgram;
      });
    }

    // Sort A-Z by student name
    filtered = [...filtered].sort((a, b) => {
      const nameA = (a.studentName || '').toLowerCase();
      const nameB = (b.studentName || '').toLowerCase();
      const comparison = nameA.localeCompare(nameB);
      return sortOrder === 'a-z' ? comparison : -comparison;
    });

    return filtered;
  }, [teacherTickets, selectedProgram, sortOrder, assignedStudents]);
  
  // Get pair partner teacher
  const pairPartner = useMemo(() => {
    if (!currentTeacher || teacherPairs.length === 0) return null;
    
    const teacherDocId = (currentTeacher as any)._id || (currentTeacher as any).teacherDocumentId || currentTeacher.id;
    const teacherIdStr = teacherDocId.toString();
    
    // Find the first active pair and get the partner
    for (const pair of teacherPairs) {
      if (pair.status === 'active') {
        const pairTeacher1Id = pair.teacher1?._id?.toString() || pair.teacher1?.toString();
        const pairTeacher2Id = pair.teacher2?._id?.toString() || pair.teacher2?.toString();
        
        if (pairTeacher1Id === teacherIdStr && pair.teacher2) {
          // Current teacher is teacher1, return teacher2
          const partnerId = pair.teacher2._id || pair.teacher2;
          return teachers.find(t => {
            const tId = (t as any)._id || (t as any).teacherDocumentId || t.id;
            return tId.toString() === partnerId.toString();
          }) || null;
        } else if (pairTeacher2Id === teacherIdStr && pair.teacher1) {
          // Current teacher is teacher2, return teacher1
          const partnerId = pair.teacher1._id || pair.teacher1;
          return teachers.find(t => {
            const tId = (t as any)._id || (t as any).teacherDocumentId || t.id;
            return tId.toString() === partnerId.toString();
          }) || null;
        }
      }
    }
    return null;
  }, [currentTeacher, teacherPairs, teachers]);
  
  // Get all students from pairs (combine with directly assigned)
  const allPairStudents = useMemo(() => {
    const students: Student[] = [];
    const studentIds = new Set<string>();
    
    // Add directly assigned students ONLY
    assignedStudents.forEach(s => {
      const id = s.id || (s as any)._id?.toString();
      if (id && !studentIds.has(id)) {
        students.push(s);
        studentIds.add(id);
      }
    });
    
    // Add pair students - get from all students list
    // Only add students that are actually in active pairs for this teacher
    (Object.values(pairStudentsMap) as any[][]).forEach((pairStudentList: any[]) => {
      pairStudentList.forEach((ps: any) => {
        const studentRef = ps.student;
        if (studentRef) {
          const studentId = studentRef._id?.toString() || studentRef.toString();
          if (studentId && !studentIds.has(studentId)) {
            // Find student in all students list by matching IDs
            const fullStudent = allStudents.find(s => {
              const sId = s.id?.toString() || (s as any)._id?.toString();
              return sId === studentId;
            });
            if (fullStudent) {
              students.push(fullStudent);
              studentIds.add(studentId);
            }
          }
        }
      });
    });
    
    console.log('✅ allPairStudents calculated:', {
      assignedCount: assignedStudents.length,
      pairCount: students.length - assignedStudents.length,
      total: students.length,
      studentNames: students.map(s => s.fullName || (s as any).fullName)
    });
    
    return students;
  }, [assignedStudents, pairStudentsMap, allStudents]);

  // Load teacher pairs
  useEffect(() => {
    const loadTeacherPairs = async () => {
      if (!currentTeacher) return;
      try {
        const pairs = await getTeacherPairs();
        // Use Teacher document ID for filtering
        const teacherDocId = (currentTeacher as any)._id || (currentTeacher as any).teacherDocumentId || currentTeacher.id;
        const teacherIdStr = teacherDocId.toString();
        
        const filteredPairs = pairs.filter((pair: any) => {
          const pairTeacher1Id = pair.teacher1?._id?.toString() || pair.teacher1?.toString();
          const pairTeacher2Id = pair.teacher2?._id?.toString() || pair.teacher2?.toString();
          return pairTeacher1Id === teacherIdStr || pairTeacher2Id === teacherIdStr;
        });
        
        setTeacherPairs(filteredPairs);
        
        // Load pair students for each pair
        const studentsMap: Record<string, any[]> = {};
        for (const pair of filteredPairs) {
          try {
            const students = await getPairStudents({ pair: pair._id, status: 'active' });
            studentsMap[pair._id] = students;
          } catch (error) {
            console.error(`Error loading students for pair ${pair._id}:`, error);
            studentsMap[pair._id] = [];
          }
        }
        setPairStudentsMap(studentsMap);
      } catch (error) {
        console.error('Error loading teacher pairs:', error);
      }
    };
    
    loadTeacherPairs();
  }, [currentTeacher, getTeacherPairs, getPairStudents]);

  // Load weekly evaluations for all students (fetch all at once, then filter)
  useEffect(() => {
    const loadWeeklyEvaluations = async () => {
      if (!currentTeacher || allPairStudents.length === 0) return;
      
      const teacherDocId = (currentTeacher as any)._id || (currentTeacher as any).teacherDocumentId || currentTeacher.id;
      const teacherIdStr = teacherDocId.toString();
      
      const loadingMap: Record<string, boolean> = {};
      
      // Set loading state for all students
      allPairStudents.forEach(student => {
        loadingMap[student.id] = true;
      });
      setLoadingEvaluations(loadingMap);
      
      try {
        // Fetch all evaluations for this teacher at once (more efficient)
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
        const apiUrl = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;
        const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
        
        // Use the general endpoint - it will auto-filter by logged-in teacher
        const response = await fetch(`${apiUrl}/weekly-evaluations`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        let allEvaluations: any[] = [];
        
        if (response.ok) {
          allEvaluations = await response.json();
          if (import.meta.env.DEV) {
            console.log('✅ Weekly evaluations loaded:', allEvaluations.length);
          }
          
          // Group evaluations by studentId
          const evaluationsMap: Record<string, any[]> = {};
          allPairStudents.forEach(student => {
            evaluationsMap[student.id] = allEvaluations.filter((e: any) => e.studentId === student.id) || [];
            loadingMap[student.id] = false;
          });
          
          setStudentWeeklyEvaluations(evaluationsMap);
          setLoadingEvaluations(loadingMap);
        } else if (response.status === 404) {
          // Handle 404 - endpoint might not exist or teacher not found
          console.warn('⚠️ Weekly evaluations endpoint not found (404)');
          // Set empty evaluations for all students
          const emptyMap: Record<string, any[]> = {};
          allPairStudents.forEach(student => {
            emptyMap[student.id] = [];
          });
          setStudentWeeklyEvaluations(emptyMap);
          setLoadingEvaluations({});
          return;
        } else {
          // If fetch fails, set empty arrays for all students
          const evaluationsMap: Record<string, any[]> = {};
          allPairStudents.forEach(student => {
            evaluationsMap[student.id] = [];
            loadingMap[student.id] = false;
          });
          setStudentWeeklyEvaluations(evaluationsMap);
          setLoadingEvaluations(loadingMap);
        }
      } catch (error) {
        console.error('Error loading weekly evaluations:', error);
        // Set empty arrays for all students on error
        const evaluationsMap: Record<string, any[]> = {};
        allPairStudents.forEach(student => {
          evaluationsMap[student.id] = [];
          loadingMap[student.id] = false;
        });
        setStudentWeeklyEvaluations(evaluationsMap);
        setLoadingEvaluations(loadingMap);
      }
    };
    
    // Add a small delay to prevent rapid re-fetches
    const timeoutId = setTimeout(() => {
      loadWeeklyEvaluations();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [currentTeacher, allPairStudents]);

  // Get approved tickets that need homework assignment (all tickets, not just assigned)
  const approvedTicketsNeedingHomework = useMemo(() => {
    // Teachers can now see all tickets
    return recitationTickets.filter(ticket => {
      // Check if ticket is approved (sent_to_assignment)
      if (ticket.status !== 'sent_to_assignment') {
        return false;
      }
      
      // Check if homework has already been assigned
      if (ticket.sentToAssignmentId) {
        const assignment = assignments.find(a => {
          const aId = (a as any)._id || a.id;
          return String(aId) === String(ticket.sentToAssignmentId);
        });
        
        // If assignment exists and has homework enabled with items, exclude this ticket
        if (assignment?.homework?.enabled && 
            ((assignment.homework.items && assignment.homework.items.length > 0) || assignment.homework.content?.trim())) {
          return false;
        }
      }
      
      return true;
    });
  }, [recitationTickets, assignments]);

  // Get all approved tickets (sent_to_assignment) - teachers can see all tickets
  const allApprovedTickets = useMemo(() => {
    // Teachers can now see all approved tickets
    return recitationTickets.filter(ticket => {
      return ticket.status === 'sent_to_assignment';
    }).sort((a, b) => {
      const dateA = a.sentAt ? new Date(a.sentAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const dateB = b.sentAt ? new Date(b.sentAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return dateB - dateA; // Most recent first
    });
  }, [recitationTickets]);

  // Phase 4: Use new permission hook (type-safe, reads from JWT token)
  const { can } = usePermission();

  const [showPermissionManager, setShowPermissionManager] = useState(false);

  const formatDate = (date: string | Date | undefined | null): string => {
    if (!date) return 'Not set';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      if (isNaN(dateObj.getTime())) {
        return 'Not set';
      }
      
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Not set';
    }
  };

  const getEnrollmentDate = (student: Student): string | Date | undefined => {
    return student.enrolledDate || 
           (student as any).enrollmentDate || 
           (student as any).createdAt || 
           undefined;
  };

  const buildActivityHistory = (student: Student) => {
    const activities: Array<{
      id: string;
      type: 'assignment' | 'ticket' | 'recitation_review';
      date: Date;
      title: string;
      description: string;
      status?: string;
      color: string;
      data: any;
    }> = [];

    return activities.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const activityHistory = useMemo(() => {
    if (!historyStudent) return [];
    return buildActivityHistory(historyStudent);
  }, [historyStudent, recitationReviews, refreshKey]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Array<{
      id: string;
      type: 'assignment' | 'ticket' | 'recitation_review';
      date: Date;
      title: string;
      description: string;
      status?: string;
      color: string;
      data: any;
    }>> = {};
    activityHistory.forEach(activity => {
      const dateKey = activity.date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });
    return groups;
  }, [activityHistory]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header onNotificationClick={() => setShowNotificationCenter(true)} />

      <div className="mx-auto max-w-7xl px-2 py-2 sm:px-3 lg:px-4">
        {/* Ultra-Compact Header */}
        <div className="mb-2 bg-white rounded-lg border border-gray-200 px-2 py-1.5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
            <div>
              <h1 className="text-base font-bold text-gray-900">Teacher Dashboard</h1>
              <p className="text-[10px] text-gray-600 mt-0.5">
                {currentTeacher?.fullName || 'Teacher'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <RequirePermission permission="canAccessAssignments">
              <Link
                to="/assignments"
                className="px-2.5 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                Assignments
              </Link>
              </RequirePermission>
              <RequirePermission permission="canViewReports">
              <button
                onClick={() => setShowStudentReports(true)}
                className="px-2.5 py-1.5 border border-primary text-primary rounded text-xs font-medium hover:bg-primary/10 transition-colors"
              >
                Reports
              </button>
              </RequirePermission>
              <Link
                to="/profile"
                className="px-2.5 py-1.5 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
              >
                Profile
              </Link>
            </div>
          </div>
        </div>

        {/* Compact Success/Error Messages */}
        {saveSuccess && (
          <div className="mb-3 bg-green-50 border border-green-200 rounded px-3 py-2">
            <p className="text-xs font-medium text-green-800">{saveSuccess}</p>
          </div>
        )}
        {saveError && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded px-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-red-800">{saveError}</p>
              <button
                onClick={() => setSaveError(null)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Compact Pair Teacher Info */}
        {pairPartner && (
          <div className="mb-3 bg-white rounded-lg border border-gray-200 px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">Paired with:</span>
                <span className="text-xs font-semibold text-primary">{pairPartner.fullName}</span>
              </div>
              <span className="text-xs text-gray-600">{allPairStudents.length} students</span>
            </div>
          </div>
        )}

        {/* Ultra-Compact Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
          <StatCard 
            title="Pair Students" 
            value={currentTeacher ? allPairStudents.length : 0} 
            icon="AS"
            onClick={() => setActiveTab('overview')}
          />
          <StatCard 
            title="Total Assessments" 
            value={currentTeacher ? allPairStudents.reduce((sum, s) => sum + (Array.isArray(s.assessments) ? s.assessments.length : 0), 0) : 0} 
            icon="TA"
            onClick={() => setActiveTab('actions')}
          />
          <StatCard 
            title="Active Students" 
            value={currentTeacher ? allPairStudents.filter(s => s.status === 'active').length : 0} 
            icon="WK"
            onClick={() => setActiveTab('overview')}
          />
          <StatCard 
            title="Pending Tickets" 
            value={filteredAndSortedTickets.length} 
            icon="PT"
            onClick={() => setActiveTab('tickets')}
          />
        </div>

        {/* Ultra-Compact Tab Navigation */}
        <div className="mb-2 flex items-center gap-0.5 border-b border-gray-200 bg-white rounded-t-lg px-1.5 pt-0.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-2 py-1 text-[11px] font-medium transition-all relative rounded-t whitespace-nowrap ${
              activeTab === 'overview'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-gray-600 hover:text-primary hover:bg-gray-50'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-2 py-1 text-[11px] font-medium transition-all relative rounded-t whitespace-nowrap ${
              activeTab === 'tickets'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-gray-600 hover:text-primary hover:bg-gray-50'
            }`}
          >
            Tickets
            {filteredAndSortedTickets.length > 0 && (
              <span className="ml-1 px-1 py-0.5 text-[9px] font-bold bg-primary text-white rounded-full">
                {filteredAndSortedTickets.length}
              </span>
            )}
          </button>
          {approvedTicketsNeedingHomework.length > 0 && (
            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors relative rounded-t whitespace-nowrap ${
                activeTab === 'tickets'
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-gray-600 hover:text-accent'
              }`}
            >
              Approved
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-accent text-primary rounded-full">
                {approvedTicketsNeedingHomework.length}
              </span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-2.5 py-1.5 text-xs font-medium transition-colors relative rounded-t whitespace-nowrap ${
              activeTab === 'actions'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-primary'
            }`}
          >
            Actions
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-2">
            {/* Quick Stats Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              <Card title="Quick Actions" className="lg:col-span-1">
                <div className="space-y-1.5">
                  <RequirePermission 
                    permission="canCreateTickets" 
                    tooltipMessage="Permission required: Create Tickets - Contact admin to request access"
                  >
                  <button
                    onClick={() => setShowCreateTicket(true)}
                    className="w-full text-left px-2.5 py-2 rounded-lg border border-primary/50 bg-primary/10 hover:border-primary hover:bg-primary/20 transition-all shadow-sm hover:shadow-md group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary border border-primary/50 shadow-sm flex-shrink-0">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-bold text-primary group-hover:text-primary transition-colors truncate">Create Ticket</p>
                        <p className="text-[10px] sm:text-xs text-gray-600 truncate">Start new review</p>
                      </div>
                    </div>
                  </button>
                  </RequirePermission>
                  <button
                    onClick={() => setShowEvaluationAssignments(true)}
                    className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/15 transition-all shadow-md hover:shadow-lg group"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/20 border-2 border-primary/40 group-hover:bg-primary/30 transition-colors flex-shrink-0">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-bold text-primary group-hover:text-primary transition-colors truncate">My Evaluations</p>
                        <p className="text-[10px] sm:text-xs text-gray-600 truncate">Complete evaluations</p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowStudentReports(true)}
                    className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 border-accent/30 bg-accent/5 hover:border-accent hover:bg-accent/15 transition-all shadow-md hover:shadow-lg group"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-accent/20 border-2 border-accent/40 group-hover:bg-accent/30 transition-colors flex-shrink-0">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-bold text-accent group-hover:text-accent transition-colors truncate">Student Reports</p>
                        <p className="text-[10px] sm:text-xs text-gray-600 truncate">View reports</p>
                      </div>
                    </div>
                  </button>
                </div>
              </Card>
              
              {/* Recent Activity Preview - Compact */}
              <Card title="Recent Activity" className="lg:col-span-2">
                <div className="space-y-1.5">
                  {filteredAndSortedTickets.slice(0, 3).map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-2 rounded-lg border border-primary/20 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 transition-all cursor-pointer"
                      onClick={async () => {
                        setActiveTab('tickets');
                        if (ticket.status === 'pending' || ticket.status === 'reassigned') {
                          // Show alert before starting review
                          const reminderMessage = `Before starting the review, please ensure:\n\n` +
                            `✓ Make sure the student is sitting properly\n` +
                            `✓ You can see their hands all the time\n` +
                            `✓ Make them ready for fluency\n` +
                            `✓ Make sure they have pencil to mark\n\n` +
                            `Once you click OK, the review will start.`;
                          
                          const confirmed = window.confirm(reminderMessage);
                          if (!confirmed) {
                            return; // User cancelled, don't start the review
                          }
                          
                          startTicket(ticket.id).then(updatedTicket => {
                            setSelectedTicket(updatedTicket);
                            setShowTicketReview(true);
                          });
                        } else {
                          setSelectedTicket(ticket);
                          setShowTicketReview(true);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            ticket.type === 'sabqi' ? 'bg-primary' : ticket.type === 'manzil' ? 'bg-accent' : 'bg-primary'
                          }`}></div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{ticket.studentName}</p>
                            <p className="text-xs text-gray-600">{ticket.type} • {ticket.status}</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {filteredAndSortedTickets.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
                  )}
                  {filteredAndSortedTickets.length > 3 && (
                    <button
                      onClick={() => setActiveTab('tickets')}
                      className="w-full py-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      View All Tickets ({filteredAndSortedTickets.length})
                    </button>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="space-y-2">
            {/* Filter Controls */}
            <Card>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Filter by Program</label>
                  <select
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="all">All Programs</option>
                    {availablePrograms.map(program => (
                      <option key={program} value={program}>{program}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Sort Order</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'a-z' | 'z-a')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="a-z">A to Z</option>
                    <option value="z-a">Z to A</option>
                  </select>
                </div>
              </div>
            </Card>
            {/* Pending Tickets - Compact */}
            <Card title={`Pending Tickets (${filteredAndSortedTickets.length})`}>
              {filteredAndSortedTickets.length > 0 && (
                <div className="mb-3 flex items-center justify-between gap-2 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedTicketIds.size === filteredAndSortedTickets.length && filteredAndSortedTickets.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTicketIds(new Set(filteredAndSortedTickets.map(t => t.id)));
                        } else {
                          setSelectedTicketIds(new Set());
                        }
                      }}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">
                      {selectedTicketIds.size > 0 
                        ? `${selectedTicketIds.size} selected` 
                        : 'Select all'}
                    </span>
                  </div>
                  {selectedTicketIds.size > 0 && (
                    <button
                      onClick={async () => {
                        if (confirm(`Delete ${selectedTicketIds.size} ticket(s)? This action cannot be undone.`)) {
                          setIsDeleting(true);
                          try {
                            await deleteTickets(Array.from(selectedTicketIds));
                            setSelectedTicketIds(new Set());
                            setRefreshKey(prev => prev + 1);
                            refreshData();
                          } catch (error) {
                            console.error('Error deleting tickets:', error);
                            alert('Failed to delete tickets: ' + (error instanceof Error ? error.message : 'Unknown error'));
                          } finally {
                            setIsDeleting(false);
                          }
                        }
                      }}
                      disabled={isDeleting}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      {isDeleting ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Selected ({selectedTicketIds.size})
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
              {filteredAndSortedTickets.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-gray-800">No pending tickets</p>
                  <p className="text-xs mt-1 text-gray-600">All tickets have been reviewed.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {(showAllPendingTickets ? filteredAndSortedTickets : filteredAndSortedTickets.slice(0, 5)).map((ticket) => {
                    const handleTicketClick = async () => {
                      try {
                        if (ticket.status === 'pending' || ticket.status === 'reassigned') {
                          // Show alert before starting review
                          const reminderMessage = `Before starting the review, please ensure:\n\n` +
                            `✓ Make sure the student is sitting properly\n` +
                            `✓ You can see their hands all the time\n` +
                            `✓ Make them ready for fluency\n` +
                            `✓ Make sure they have pencil to mark\n\n` +
                            `Once you click OK, the review will start.`;
                          
                          const confirmed = window.confirm(reminderMessage);
                          if (!confirmed) {
                            return; // User cancelled, don't start the review
                          }
                          
                          const updatedTicket = await startTicket(ticket.id);
                          setSelectedTicket(updatedTicket);
                          setShowTicketReview(true);
                          setRefreshKey(prev => prev + 1);
                        } else if (ticket.status === 'in_progress') {
                          setSelectedTicket(ticket);
                          setShowTicketReview(true);
                        }
                      } catch (error) {
                        console.error('Error starting ticket:', error);
                        setSaveError('Failed to start ticket');
                      }
                    };

                    return (
                      <div
                        key={ticket.id}
                        className="w-full bg-white border border-gray-200 rounded-lg p-2 hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={selectedTicketIds.has(ticket.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              const newSelected = new Set(selectedTicketIds);
                              if (e.target.checked) {
                                newSelected.add(ticket.id);
                              } else {
                                newSelected.delete(ticket.id);
                              }
                              setSelectedTicketIds(newSelected);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary flex-shrink-0"
                          />
                          <div className="flex-1 flex items-start justify-between gap-2">
                            <button
                              onClick={handleTicketClick}
                              className="flex-1 text-left min-w-0"
                            >
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                                  ticket.type === 'sabqi' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : ticket.type === 'manzil'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {ticket.type?.toUpperCase()}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                                  ticket.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : ticket.status === 'in_progress'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {ticket.status === 'in_progress' ? 'In Progress' : ticket.status === 'reassigned' ? 'Reassigned' : 'Pending'}
                                </span>
                              </div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                {ticket.studentName}
                              </h4>
                              {ticket.teacherNotes && (
                                <p className="text-xs text-gray-600 mb-1 line-clamp-2">{ticket.teacherNotes}</p>
                              )}
                              {ticket.status === 'reassigned' && ticket.previousTeacherComment && (
                                <p className="text-xs text-orange-700 mb-1 line-clamp-1">Previous: {ticket.previousTeacherComment}</p>
                              )}
                              <p className="text-xs text-gray-500">
                                {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                              </p>
                            </button>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (confirm(`Delete ticket for ${ticket.studentName}?`)) {
                                    try {
                                      await deleteTicket(ticket.id);
                                      setRefreshKey(prev => prev + 1);
                                      refreshData();
                                    } catch (error) {
                                      console.error('Error deleting ticket:', error);
                                      alert('Failed to delete ticket: ' + (error instanceof Error ? error.message : 'Unknown error'));
                                    }
                                  }
                                }}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                                title="Delete"
                              >
                                ×
                              </button>
                              <div className="px-3 py-1.5 bg-primary text-white rounded text-xs font-medium">
                                {ticket.status === 'pending' || ticket.status === 'reassigned' 
                                  ? 'Start' 
                                  : 'Continue'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredAndSortedTickets.length > 5 && (
                    <button
                      onClick={() => setShowAllPendingTickets(!showAllPendingTickets)}
                      className="w-full py-3 text-sm font-bold text-primary hover:text-primary/80 transition-colors border border-slate-700/50 rounded-lg hover:border-primary/30 bg-slate-800/30"
                    >
                      {showAllPendingTickets ? 'Show Less' : `Show All (${filteredAndSortedTickets.length})`}
                    </button>
                  )}
                </div>
              )}
            </Card>

            {/* All Approved Tickets - Compact */}
            {allApprovedTickets.length > 0 && (
              <Card title={`Approved Tickets (${allApprovedTickets.length})`}>
                <div className="space-y-1.5">
                  {(showAllApprovedTickets ? allApprovedTickets : allApprovedTickets.slice(0, 5)).map((ticket) => {
                    const assignment = ticket.sentToAssignmentId ? assignments.find(a => {
                      const aId = (a as any)._id || a.id;
                      return String(aId) === String(ticket.sentToAssignmentId);
                    }) : null;
                    const hasHomework = assignment?.homework?.enabled && (
                      (assignment.homework.items && assignment.homework.items.length > 0) ||
                      assignment.homework.content?.trim()
                    );

                    return (
                      <div
                        key={ticket.id}
                        className="bg-white border border-gray-200 rounded-lg p-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                                ticket.type === 'sabqi' ? 'bg-blue-100 text-blue-800' :
                                ticket.type === 'manzil' ? 'bg-green-100 text-green-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {ticket.type?.toUpperCase()}
                              </span>
                              {hasHomework && (
                                <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                                  ✓ Homework
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-0.5">{ticket.studentName}</h4>
                            {ticket.teacherComment && (
                              <p className="text-xs text-gray-600 mb-1 line-clamp-1">{ticket.teacherComment}</p>
                            )}
                            <p className="text-xs text-gray-500">
                              {ticket.sentAt ? new Date(ticket.sentAt).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          {!hasHomework && ticket.sentToAssignmentId && (
                            <button
                              onClick={async () => {
                                setSelectedTicketForHomework(ticket);
                                setSelectedAssignmentForHomework(ticket.sentToAssignmentId!);
                                setShowHomeworkForm(true);
                              }}
                              className="px-2.5 py-1.5 bg-accent hover:bg-accent/90 text-white rounded text-xs font-medium transition-colors whitespace-nowrap"
                            >
                              Assign HW
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {allApprovedTickets.length > 5 && (
                    <button
                      onClick={() => setShowAllApprovedTickets(!showAllApprovedTickets)}
                      className="w-full py-3 text-sm font-bold text-accent hover:text-accent/80 transition-colors border border-slate-700/50 rounded-lg hover:border-accent/30 bg-slate-800/30"
                    >
                      {showAllApprovedTickets ? 'Show Less' : `Show All (${allApprovedTickets.length})`}
                    </button>
                  )}
                </div>
              </Card>
            )}

            {/* Approved Tickets Needing Homework */}
            {approvedTicketsNeedingHomework.length > 0 && (
              <Card title={`Approved Tickets - Assign Homework (${approvedTicketsNeedingHomework.length})`}>
                <div className="space-y-3">
                  {(showAllApprovedTickets ? approvedTicketsNeedingHomework : approvedTicketsNeedingHomework.slice(0, 3)).map((ticket) => {
                    const handleAssignHomework = async () => {
                      // Find the assignment linked to this ticket
                      const assignmentId = ticket.sentToAssignmentId;
                      if (assignmentId) {
                        setSelectedTicketForHomework(ticket);
                        setSelectedAssignmentForHomework(assignmentId);
                        setShowHomeworkForm(true);
                      } else {
                        alert('Assignment not found for this ticket. Please contact admin.');
                      }
                    };

                    const mistakeCount = ticket.mistakes?.length || 0;
                    const mistakeBreakdown = ticket.mistakes?.reduce((acc: any, m: any) => {
                      const type = m.type?.toLowerCase() || 'other';
                      if (type.includes('atkee')) acc.atkee++;
                      else if (type.includes('tajweed') || type.includes('tech') || type.includes('light') || type.includes('heavy')) acc.tajweed++;
                      else acc.mistakes++;
                      return acc;
                    }, { mistakes: 0, atkee: 0, tajweed: 0 }) || { mistakes: 0, atkee: 0, tajweed: 0 };

                    return (
                      <div
                        key={ticket.id}
                        className="group relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 via-slate-800/50 to-slate-900/50 backdrop-blur-sm p-5 shadow-lg hover:shadow-xl hover:border-emerald-500/50 transition-all"
                      >
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/0 via-emerald-600/5 to-emerald-600/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        {/* Left accent bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-500"></div>
                        
                        <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border ${
                                ticket.type === 'sabqi' 
                                  ? 'bg-soft-primary text-primary border-primary/30' 
                                  : ticket.type === 'manzil'
                                  ? 'bg-soft-accent text-accent border-accent/30'
                                  : 'bg-soft-primary text-primary border-primary/30'
                              }`}>
                                {ticket.type}
                              </span>
                              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-soft-accent text-accent border border-accent/30">
                                Approved
                              </span>
                            </div>
                            <h4 className="text-lg font-bold text-slate-100 mb-2 group-hover:text-accent transition-colors">
                              {ticket.studentName}
                            </h4>
                            {ticket.teacherComment && (
                              <div className="mb-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Your Review</p>
                                <p className="text-sm text-slate-300">{ticket.teacherComment}</p>
                              </div>
                            )}
                            {mistakeCount > 0 && (
                              <div className="mb-3 flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Markings:</span>
                                <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold border border-red-500/30">
                                  Mistakes: {mistakeBreakdown.mistakes}
                                </span>
                                <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold border border-amber-500/30">
                                  Atkees: {mistakeBreakdown.atkee}
                                </span>
                                <span className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded-lg text-xs font-bold border border-slate-600">
                                  Tajweed: {mistakeBreakdown.tajweed}
                                </span>
                              </div>
                            )}
                            <p className="text-xs text-slate-500">
                              Approved: {ticket.sentAt ? new Date(ticket.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                            </p>
                          </div>
                          <div className="flex items-center flex-shrink-0">
                            <button
                              onClick={handleAssignHomework}
                              className="px-6 py-3 bg-accent hover:bg-accent/90 text-primary rounded-lg text-sm font-bold transition-all shadow-lg hover:shadow-xl whitespace-nowrap group-hover:scale-105"
                            >
                              Assign Homework
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {approvedTicketsNeedingHomework.length > 3 && (
                    <button
                      onClick={() => setShowAllApprovedTickets(!showAllApprovedTickets)}
                      className="w-full py-3 text-sm font-bold text-accent hover:text-accent/80 transition-colors border border-slate-700/50 rounded-lg hover:border-accent/30 bg-slate-800/30"
                    >
                      {showAllApprovedTickets ? 'Show Less' : `Show All (${approvedTicketsNeedingHomework.length})`}
                    </button>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card title="Quick Actions">
              <div className="space-y-2">
                <button
                  onClick={() => setShowEvaluationAssignments(true)}
                  className="group w-full text-left px-4 py-3 rounded-lg border border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50 hover:border-primary/50 hover:bg-primary/10 transition-all shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft-primary border border-primary/30 group-hover:bg-primary/20 transition-colors">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200 group-hover:text-primary transition-colors">My Evaluations</p>
                      <p className="text-xs text-slate-400">Complete assigned evaluations</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setShowWeeklyEvaluationReview(true)}
                  className="group w-full text-left px-4 py-3 rounded-lg border border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50 hover:border-accent/50 hover:bg-accent/10 transition-all shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft-accent border border-accent/30 group-hover:bg-accent/20 transition-colors">
                      <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200 group-hover:text-accent transition-colors">Weekly Evaluations</p>
                      <p className="text-xs text-slate-400">Review your weekly evaluations</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setShowStudentReports(true)}
                  className="group w-full text-left px-4 py-3 rounded-lg border border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50 hover:border-accent/50 hover:bg-accent/10 transition-all shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft-accent border border-accent/30 group-hover:bg-accent/20 transition-colors">
                      <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200 group-hover:text-accent transition-colors">Student Reports</p>
                      <p className="text-xs text-slate-400">View comprehensive reports</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setShowMyAttendance(true)}
                  className="group w-full text-left px-4 py-3 rounded-lg border border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50 hover:border-accent/50 hover:bg-accent/10 transition-all shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft-accent border border-accent/30 group-hover:bg-accent/20 transition-colors">
                      <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200 group-hover:text-accent transition-colors">My Attendance</p>
                      <p className="text-xs text-slate-400">View attendance history</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setShowCreateTicket(true)}
                  className="group w-full text-left px-4 py-3 rounded-lg border-2 border-primary/50 bg-primary/10 hover:border-primary hover:bg-primary/20 transition-all shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary border border-primary/50 shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary group-hover:text-primary transition-colors">Create Ticket</p>
                      <p className="text-xs text-slate-400">Start new recitation review</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setShowPairDailyReport(true)}
                  className="group w-full text-left px-4 py-3 rounded-lg border border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50 hover:border-primary/50 hover:bg-primary/10 transition-all shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft-primary border border-primary/30 group-hover:bg-primary/20 transition-colors">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200 group-hover:text-primary transition-colors">Daily Report</p>
                      <p className="text-xs text-slate-400">Submit daily reports</p>
                    </div>
                  </div>
                </button>
                <Link
                  to="/assignments"
                  className="block w-full text-left px-4 py-3 rounded-lg border border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50 hover:border-primary/50 hover:bg-primary/10 transition-all shadow-lg hover:shadow-xl group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft-primary border border-primary/30 group-hover:bg-primary/20 transition-colors">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200 group-hover:text-primary transition-colors">Manage Assignments</p>
                      <p className="text-xs text-slate-400">Create and manage assignments</p>
                    </div>
                  </div>
                </Link>
              </div>
            </Card>
          </div>
        )}

        {/* Teacher Pairs Section - Compact */}
        {teacherPairs.length > 0 && (
          <div className="mb-4">
            <Card title={`My Teacher Pairs (${teacherPairs.length})`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {teacherPairs.map((pair) => {
                  const pairStudents = pairStudentsMap[pair._id] || [];
                  const otherTeacher = pair.teacher1?._id?.toString() === ((currentTeacher as any)?._id || (currentTeacher as any)?.teacherDocumentId || currentTeacher?.id)?.toString()
                    ? pair.teacher2
                    : pair.teacher1;
                  
                  return (
                    <div key={pair._id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-lg text-primary">{pair.name}</h4>
                          <p className="text-sm text-gray-600">{pair.program}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Partner: {otherTeacher?.fullName || 'Unknown'}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          pair.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {pair.status}
                        </span>
                      </div>
                      
                      {pair.notes && (
                        <p className="text-sm text-gray-600 mb-4">{pair.notes}</p>
                      )}
                      
                      <div className="border-t-2 border-gray-200 pt-4">
                        <h5 className="font-bold text-sm text-primary mb-2">
                          Students in Pair ({pairStudents.length})
                        </h5>
                        {pairStudents.length === 0 ? (
                          <p className="text-sm text-gray-500">No students assigned</p>
                        ) : (
                          <div className="space-y-2">
                            {pairStudents.map((ps: any) => (
                              <div key={ps._id} className="p-3 bg-gray-50 rounded-lg">
                                <div className="font-semibold text-sm">{ps.student?.fullName || 'Unknown'}</div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {ps.startTime} - {ps.endTime} • {ps.days.join(', ')}
                                </div>
                                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                                  ps.status === 'active' ? 'bg-green-100 text-green-800' :
                                  ps.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {ps.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* Assigned Students List - Ultra Compact */}
        <div className="mb-4">
          <Card title={`Assigned Students (${allPairStudents.length})`}>
            {allPairStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-400">AS</span>
                </div>
                <p className="text-sm font-semibold">No students assigned</p>
                <p className="text-xs mt-1">Students will appear here once assigned to you.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allPairStudents.map((student) => {
                  // Check if student is in a pair
                  const studentPairInfo = (Object.entries(pairStudentsMap) as [string, any[]][]).find(([_, students]) => 
                    students.some((ps: any) => (ps.student?._id?.toString() || ps.student?.toString()) === (student.id || (student as any)._id?.toString()))
                  );
                  const isPairStudent = !!studentPairInfo;
                  
                  // Get pair details if student is in a pair
                  const pairDetails = studentPairInfo ? (() => {
                    const [pairId, pairStudents] = studentPairInfo;
                    const pair = teacherPairs.find(p => p._id === pairId);
                    const pairStudent = (pairStudents as any[]).find((ps: any) => 
                      (ps.student?._id?.toString() || ps.student?.toString()) === (student.id || (student as any)._id?.toString())
                    );
                    return { pair, pairStudent };
                  })() : null;
                  
                  return (
                    <div key={student.id} className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm hover:shadow-md hover:border-primary/50 transition-all">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <img
                          src={student.avatar}
                          alt={student.fullName}
                          className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-gray-200 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                            <h4 className="font-bold text-xs sm:text-sm text-primary truncate">{student.fullName}</h4>
                            {isPairStudent && pairPartner && (
                              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] sm:text-xs font-bold">
                                Pair
                              </span>
                            )}
                            {!isPairStudent && student.assignedTeacher && (
                              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] sm:text-xs font-bold">
                                Individual
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] sm:text-xs font-bold">
                              {student.program}
                            </span>
                          </div>
                          <div className="space-y-0.5 text-xs text-gray-600">
                            {isPairStudent && pairDetails?.pair && (
                              <p className="truncate">
                                Pair: <span className="font-semibold">{pairDetails.pair.name}</span>
                              </p>
                            )}
                            {!isPairStudent && student.assignedTeacher && (() => {
                              const teacher = teachers.find(t => t.id === student.assignedTeacher);
                              return teacher ? (
                                <p className="truncate">Teacher: <span className="font-semibold">{teacher.fullName}</span></p>
                              ) : null;
                            })()}
                            {can('canViewStudentPersonalInfo') && (
                              <p className="truncate">Parent: {student.parentName}</p>
                            )}
                            <p className="truncate text-gray-500">
                              {can('canViewStudentEmail') && student.email}
                              {can('canViewStudentEmail') && can('canViewStudentContact') && ' · '}
                              {can('canViewStudentContact') && student.contact}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 flex-shrink-0">
                        <span className="text-[10px] sm:text-xs text-gray-500 font-mono">ID: {String(student.id).slice(-8)}</span>
                        <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded font-semibold ${
                          student.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {student.status || 'active'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs">
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">Schedule</p>
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {Array.isArray(student.schedule?.days) && student.schedule.days.length > 0
                            ? student.schedule.days.slice(0, 2).join(', ')
                            : 'Not scheduled'}
                        </p>
                        {student.schedule?.startTime && student.schedule?.endTime && (
                          <p className="text-[10px] text-gray-600 mt-0.5">
                            {student.schedule.startTime}-{student.schedule.endTime}
                          </p>
                        )}
                      </div>
                      <div className="text-xs">
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">Enrolled</p>
                        <p className="text-xs font-semibold text-gray-900">{formatDate(getEnrollmentDate(student))}</p>
                      </div>
                    </div>

                    {/* Ultra-Compact Stats Row */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5 pt-1.5 border-t border-gray-100">
                      {can('canViewAssessments') && (
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowAssessmentForm(true);
                            setSaveError(null);
                            setSaveSuccess(null);
                          }}
                          className="text-[10px] sm:text-xs px-2 py-1 rounded border border-primary/30 bg-primary/5 text-primary font-semibold hover:bg-primary/10 transition"
                        >
                          Assessments ({Array.isArray(student.assessments) ? student.assessments.length : 0})
                        </button>
                      )}
                      {can('canViewEvaluations') && (
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowWeeklyEvaluationForm(true);
                          }}
                          className="text-[10px] sm:text-xs px-2 py-1 rounded border border-accent/30 bg-accent/5 text-accent font-semibold hover:bg-accent/10 transition"
                        >
                          Evaluations ({
                            (Array.isArray(student.evaluations) ? student.evaluations.length : 0) + 
                            (studentWeeklyEvaluations[student.id]?.length || 0)
                          })
                        </button>
                      )}
                      {Array.isArray(student.siblings) && student.siblings.length > 0 && (
                        <span className="text-[10px] sm:text-xs px-2 py-1 rounded border border-gray-200 bg-gray-50 text-gray-600 font-semibold">
                          Siblings ({student.siblings.length})
                        </span>
                      )}
                    </div>

                    {/* Action Buttons - Compact */}
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      <button
                        onClick={() => {
                          setSelectedStudentForMushaf(student);
                          setShowPersonalMushaf(true);
                        }}
                        className="rounded-lg border-2 border-green-500 bg-green-50 px-4 py-2 text-xs font-bold text-green-700 transition hover:bg-green-100 shadow-sm flex items-center gap-1"
                        title="View and mark mistakes in student's Personal Mushaf"
                      >
                        <span>📖</span> Personal Mushaf
                      </button>
                      <button
                        onClick={() => {
                          setHistoryStudent(student);
                          setShowStudentHistory(true);
                        }}
                        className="rounded-lg border-2 border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 shadow-sm"
                      >
                        View Activity History
                      </button>
                      {isPairStudent && pairPartner && pairDetails?.pair && (
                        <button
                          onClick={() => {
                            setSelectedPairForMessage(pairDetails.pair);
                            setSelectedStudentForMessage(student);
                            setShowPairMessage(true);
                          }}
                          className="rounded-lg border-2 border-accent px-4 py-2 text-xs font-bold text-accent transition hover:bg-soft-accent flex items-center gap-1"
                          title={`Communicate with ${pairPartner.fullName} about this student`}
                        >
                          <span>💬</span> Message Pair Teacher
                        </button>
                      )}
                      {can('canSendMessages') && (
                        <button
                          onClick={() => {
                            setSelectedStudentForTSMessage(student);
                            setShowTeacherStudentMessage(true);
                          }}
                          className="rounded-lg border-2 border-primary px-4 py-2 text-xs font-bold text-primary transition hover:bg-soft-primary flex items-center gap-1"
                          title="Message this student"
                        >
                          <span>📧</span> Message Student
                        </button>
                      )}
                      {isPairStudent && pairDetails?.pair && (
                        <span className="rounded-lg bg-primary/10 px-4 py-2 text-xs font-bold text-primary flex items-center gap-1">
                          <span>👥</span> Both teachers can assess & evaluate
                        </span>
                      )}
                      {can('canContactParents') && (
                        <button
                          disabled
                          className="rounded-lg border-2 border-gray-300 bg-gray-100 px-3 py-2 text-xs font-bold text-gray-400 cursor-not-allowed"
                        >
                          Contact Parent - Coming Soon
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* Assessment Form Modal */}
      {showAssessmentForm && selectedStudent && (
        <TeacherAssessmentForm
          student={selectedStudent}
          onClose={() => {
            setShowAssessmentForm(false);
            setSelectedStudent(null);
            setSaveError(null);
            setSaveSuccess(null);
          }}
          onSave={() => {
            setShowAssessmentForm(false);
            setSelectedStudent(null);
            setSaveError(null);
            setSaveSuccess('Assessment added successfully!');
            refreshData();
            setTimeout(() => setSaveSuccess(null), 3000);
          }}
        />
      )}


      {/* Weekly Evaluation Form Modal */}
      {showWeeklyEvaluationForm && selectedStudent && (
        <EnhancedWeeklyEvaluationForm
          studentId={selectedStudent.id}
          studentName={selectedStudent.fullName}
          onClose={() => {
            setShowWeeklyEvaluationForm(false);
            setSelectedStudent(null);
          }}
          onSuccess={() => {
            if (refreshData) refreshData();
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {/* Weekly Evaluation Review Modal */}
      {showWeeklyEvaluationReview && currentTeacher && (
        <TeacherWeeklyEvaluationReview
          teacherId={(currentTeacher as any)?._id || (currentTeacher as any)?.teacherDocumentId || currentTeacher?.id || user?.id || ''}
          onClose={() => {
            setShowWeeklyEvaluationReview(false);
            setSelectedEvaluationId(null);
          }}
          initialEvaluationId={selectedEvaluationId || undefined}
        />
      )}

      {/* Student Reports Modal */}
      {showStudentReports && (
        <StudentReports
          onClose={() => setShowStudentReports(false)}
          teacherView={true}
        />
      )}

      {/* Ticket Review Modal */}
      {showTicketReview && selectedTicket && (
        <TeacherTicketReview
          ticket={selectedTicket}
          onClose={() => {
            setShowTicketReview(false);
            setSelectedTicket(null);
            setRefreshKey(prev => prev + 1);
          }}
          onSubmit={async (ticketId, data) => {
            await submitTicket(ticketId, data);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {/* Student Activity History Modal */}
      {showStudentHistory && historyStudent && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4 py-6"
          onClick={() => setShowStudentHistory(false)}
        >
          <div 
            className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="bg-gradient-to-br from-primary via-primary to-accent text-white px-6 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Activity History</h2>
                  <p className="text-white/90 mt-1">{historyStudent.fullName}</p>
                </div>
                <button
                  onClick={() => setShowStudentHistory(false)}
                  className="rounded-xl bg-white/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/30"
                >
                  Close
                </button>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto px-6 py-6">
              {activityHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg font-semibold">No activity history found for this student yet.</p>
                </div>
              ) : (
                <>
                  {/* Summary Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-right w-full">
                          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Total Activities</p>
                          <p className="mt-1 text-lg font-bold text-gray-900">{activityHistory.length}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-right w-full">
                          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Assignments</p>
                          <p className="mt-1 text-lg font-bold text-gray-900">{activityHistory.filter(a => a.type === 'assignment').length}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-right w-full">
                          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Tickets</p>
                          <p className="mt-1 text-lg font-bold text-gray-900">{activityHistory.filter(a => a.type === 'ticket').length}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Grouped by Date */}
                  <div className="space-y-6">
                    {Object.entries(groupedByDate)
                      .sort(([dateA], [dateB]) => {
                        const a = new Date(dateA);
                        const b = new Date(dateB);
                        return b.getTime() - a.getTime();
                      })
                      .map(([dateKey, dayActivities]) => {
                        const activities = dayActivities as Array<{
                          id: string;
                          type: 'assignment' | 'ticket' | 'recitation_review';
                          date: Date;
                          title: string;
                          description: string;
                          status?: string;
                          color: string;
                          data: any;
                        }>;
                        return (
                        <div key={dateKey} className="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm">
                          <div className="mb-4 pb-3 border-b-2 border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900">{dateKey}</h3>
                            <p className="text-xs text-gray-500 mt-1 font-semibold">
                              {activities.length} activit{activities.length !== 1 ? 'ies' : 'y'} on this day
                            </p>
                          </div>
                          
                          <div className="space-y-4">
                            {activities.map((activity) => {
                              const mushafMarkings = activity.type === 'assignment' && activity.data.mushafMarkings 
                                ? (Array.isArray(activity.data.mushafMarkings) ? activity.data.mushafMarkings : [])
                                : [];
                              
                              return (
                                <div key={activity.id} className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                      <div>
                                        <h4 className="font-bold text-gray-900">{activity.title}</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                          {activity.date.toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                    {activity.status && (
                                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${activity.color}`}>
                                        {activity.status.replace('_', ' ').toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {activity.description && activity.description !== 'No description' && (
                                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                                      {activity.description}
                                    </p>
                                  )}
                                  
                                  {/* Mushaf Mistakes */}
                                  {mushafMarkings.length > 0 && (
                                    <div className="mt-3 rounded-lg border-2 border-orange-300 bg-orange-50 p-3">
                                      <h5 className="text-xs font-bold text-orange-900 mb-2 uppercase tracking-wide">
                                        Mushaf Mistakes ({mushafMarkings.length})
                                      </h5>
                                      <div className="flex flex-wrap gap-2">
                                        {mushafMarkings.map((mistake: any, idx: number) => {
                                          const typeLabel = mistake.type === 'memory' ? 'Memory' :
                                                           mistake.type === 'madd' ? 'Madd' :
                                                           mistake.type === 'ikhfa' ? 'Ikhfa' :
                                                           mistake.type === 'holding' ? 'Holding' :
                                                           mistake.type === 'tech' ? 'Tech' :
                                                           mistake.type === 'other' ? 'Other' : mistake.type;
                                          return (
                                            <span
                                              key={idx}
                                              className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                                mistake.type === 'memory' 
                                                  ? 'bg-red-100 text-red-800' 
                                                  : 'bg-yellow-100 text-yellow-800'
                                              }`}
                                            >
                                              {typeLabel} • Page {mistake.page}
                                              {mistake.surah && mistake.ayah && ` • ${mistake.surah}:${mistake.ayah}`}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Additional info based on type */}
                                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                                    {activity.type === 'assignment' && activity.data.assignedBy && (
                                      <span>Assigned by: {activity.data.listenerName || activity.data.assignedTeacherName || 'Admin'}</span>
                                    )}
                                    {activity.type === 'ticket' && activity.data.assignedTeacherName && (
                                      <span>Teacher: {activity.data.assignedTeacherName}</span>
                                    )}
                                    {activity.type === 'recitation_review' && activity.data.audioLink && (
                                      <a 
                                        href={activity.data.audioLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline font-semibold"
                                      >
                                        Listen to Audio
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        );
                      })}
                  </div>
                </>
              )}
            </main>
          </div>
        </div>
      )}

      {showEvaluationAssignments && (
        <TeacherEvaluationAssignments
          onClose={() => setShowEvaluationAssignments(false)}
        />
      )}

      {/* My Attendance Modal */}
      {showMyAttendance && currentTeacher && (
        <TeacherAttendanceView
          teacherId={currentTeacher.id}
          onClose={() => setShowMyAttendance(false)}
        />
      )}

      {/* Pair Daily Report Modal */}
      {showPairDailyReport && (
        <PairDailyReportForm
          onClose={() => setShowPairDailyReport(false)}
          onSuccess={() => {
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {/* Pair Teacher Message Modal */}
      {showPairMessage && selectedPairForMessage && currentTeacher && pairPartner && (
        <PairTeacherMessage
          pair={selectedPairForMessage}
          student={selectedStudentForMessage}
          currentTeacher={currentTeacher}
          pairPartner={pairPartner}
          onClose={() => {
            setShowPairMessage(false);
            setSelectedPairForMessage(null);
            setSelectedStudentForMessage(null);
          }}
        />
      )}

      {/* Teacher-Student Message Modal */}
      {showTeacherStudentMessage && currentTeacher && selectedStudentForTSMessage && (
        <TeacherStudentMessage
          teacher={currentTeacher}
          student={selectedStudentForTSMessage}
          onClose={() => {
            setShowTeacherStudentMessage(false);
            setSelectedStudentForTSMessage(null);
          }}
        />
      )}

      {/* Personal Mushaf Modal */}
      {showPersonalMushaf && selectedStudentForMushaf && (
        <TeacherPersonalMushaf
          studentId={selectedStudentForMushaf.id}
          studentName={selectedStudentForMushaf.fullName}
          onClose={() => {
            setShowPersonalMushaf(false);
            setSelectedStudentForMushaf(null);
          }}
          onSessionComplete={(newMistakes) => {
            console.log(`Session completed with ${newMistakes.length} new mistakes`);
            // Refresh data if needed
            refreshData();
          }}
        />
      )}
      
      {/* Teacher Notification Center */}
      {showNotificationCenter && (
        <TeacherNotificationCenter
          onClose={() => {
            setShowNotificationCenter(false);
            setSelectedEvaluationId(null);
            setSelectedConversationId(null);
          }}
          onOpenWeeklyEvaluation={async (evaluationId) => {
            setSelectedEvaluationId(evaluationId);
            setShowNotificationCenter(false);
            // Small delay to ensure notification center closes before opening review
            setTimeout(() => {
              setShowWeeklyEvaluationReview(true);
            }, 100);
          }}
          onOpenMessage={(conversationId) => {
            setSelectedConversationId(conversationId);
            // Navigate to messages or open message modal
            setShowNotificationCenter(false);
          }}
        />
      )}

      {isDevelopment && DebugPanel && (
        <Suspense fallback={null}>
          <DebugPanel />
        </Suspense>
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

      {/* Create Ticket Modal */}
      {showCreateTicket && (
        <TicketCreationForm
          studentId={selectedStudentForTicket || ''}
          onClose={() => {
            setShowCreateTicket(false);
            setSelectedStudentForTicket(null);
          }}
          onSuccess={(ticket, openSabqReview) => {
            setShowCreateTicket(false);
            setSelectedStudentForTicket(null);
            setRefreshKey(prev => prev + 1);
            // Optionally show success message
            // Note: Teachers don't create Sabq tickets, so openSabqReview will be false
          }}
        />
      )}

      {/* Homework Assignment Modal */}
      {showHomeworkForm && selectedTicketForHomework && selectedAssignmentForHomework && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 md:p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col border border-gray-200">
            <div className="relative px-6 py-5 bg-gradient-to-r from-green-500 via-green-500/95 to-green-500/90 border-b border-green-200">
              <div className="relative flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-0.5">
                    Assign Homework
                  </h2>
                  <p className="text-white/80 text-sm font-medium">
                    {selectedTicketForHomework.studentName} - {selectedTicketForHomework.type.toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowHomeworkForm(false);
                    setSelectedTicketForHomework(null);
                    setSelectedAssignmentForHomework(null);
                  }}
                  className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg transition-all hover:scale-110 text-xl font-semibold border border-white/20"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <HomeworkAssignmentForm
                studentId={selectedTicketForHomework.studentId}
                studentName={selectedTicketForHomework.studentName}
                assignmentId={selectedAssignmentForHomework}
                ticketMistakes={selectedTicketForHomework.mistakes || []}
                ticketType={selectedTicketForHomework.type}
                onClose={() => {
                  setShowHomeworkForm(false);
                  setSelectedTicketForHomework(null);
                  setSelectedAssignmentForHomework(null);
                }}
                onSave={async (homeworkItems, notes) => {
                  try {
                    // Update assignment with homework
                    await updateAssignment(selectedAssignmentForHomework, {
                      homework: {
                        enabled: true,
                        items: homeworkItems,
                        notes: notes,
                        content: '', // Legacy field required by type
                        link: '' // Legacy field required by type
                      }
                    });
                    setShowHomeworkForm(false);
                    setSelectedTicketForHomework(null);
                    setSelectedAssignmentForHomework(null);
                    setRefreshKey(prev => prev + 1);
                    setSaveSuccess('Homework assigned successfully!');
                    setTimeout(() => setSaveSuccess(null), 3000);
                  } catch (error) {
                    console.error('Error assigning homework:', error);
                    setSaveError('Failed to assign homework. Please try again.');
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeacherDashboard;
