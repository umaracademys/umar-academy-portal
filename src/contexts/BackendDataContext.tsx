import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import {
  Student,
  Teacher,
  Admin,
  RecitationReview,
  AdminNotification,
  AssignmentTicket,
  RecitationStep,
  RecitationUnit,
  RecitationHistoryEntry,
  StudentRecitationProfile,
  ListeningSession,
  ListeningSessionStartPayload,
  ListeningSessionUpdatePayload,
  ListeningSessionEndPayload,
  TeacherPermissions
} from '../types';
import { ClassworkSection, Assignment } from '../types/assignment';
import { Ticket } from '../types/ticket';

interface BackendDataContextType {
  students: Student[];
  teachers: Teacher[];
  admins: Admin[];
  addStudent: (student: Student) => Promise<void>;
  addTeacher: (teacher: Teacher) => Promise<void>;
  addAdmin: (admin: Admin) => Promise<void>;
  updateStudent: (id: string, student: Partial<Student>) => Promise<void>;
  updateStudentRecitation: (
    id: string,
    payload: {
      current?: Partial<Record<RecitationStep, RecitationUnit>>;
      historyEntry?: RecitationHistoryEntry | RecitationHistoryEntry[];
    }
  ) => Promise<StudentRecitationProfile | null>;
  updateTeacher: (id: string, teacher: Partial<Teacher>) => Promise<void>;
  updateAdmin: (id: string, admin: Partial<Admin>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  deleteTeacher: (id: string) => Promise<void>;
  deleteAdmin: (id: string) => Promise<void>;
  getStudentsByTeacher: (teacherId: string) => Student[];
  getTeacherById: (id: string) => Teacher | undefined;
  getStudentByEmail: (email: string) => Student | undefined;
  loading: boolean;
  loadingStep: string;
  error: string | null;
  refreshData: () => Promise<void>;
  // Assignment management (new multi-phase system)
  assignments: Assignment[];
  addAssignment: (assignment: Assignment) => Promise<void>;
  updateAssignment: (id: string, assignment: Partial<Assignment>) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  getStudentAssignments: (studentId: string) => Assignment[];
  // New Ticket System (sabq/sabqi/manzil workflow)
  recitationTickets: Ticket[];
  createTicket: (ticket: Partial<Ticket>) => Promise<Ticket>;
  updateRecitationTicket: (id: string, ticket: Partial<Ticket>) => Promise<Ticket>;
  startTicket: (id: string) => Promise<Ticket>;
  submitTicket: (
    id: string, 
    data: { 
      teacherComment: string; 
      mistakes: any[];
      recordingUrl?: string;
      recordingFormat?: string;
      recordingDuration?: number;
      recordingStartedAt?: string;
      recordingStoppedAt?: string;
    }
  ) => Promise<Ticket>;
  approveAndSendTicket: (id: string, assignmentId: string) => Promise<Ticket>;
  reassignTicket: (id: string, teacherId: string, teacherName: string, reason?: string) => Promise<Ticket>;
  getTeacherTickets: (teacherId: string) => Ticket[];
  getPendingReviewTickets: () => Ticket[];
  getPreviousReports: (studentId: string, type: 'sabqi' | 'manzil') => Promise<Ticket[]>;
  // Recitation Review management
  recitationReviews: RecitationReview[];
  addRecitationReview: (review: RecitationReview) => Promise<void>;
  updateRecitationReview: (id: string, review: Partial<RecitationReview>) => Promise<void>;
  convertRecitationReviewToAssignment: (reviewId: string) => Promise<any>;
  // Admin Notifications
  adminNotifications: AdminNotification[];
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  // Ticket-based workflow
  tickets: AssignmentTicket[];
  addTicket: (ticket: AssignmentTicket) => Promise<void>;
  updateTicket: (id: string, ticket: Partial<AssignmentTicket>) => Promise<void>;
  assignTicketToNextTeacher: (
    ticketId: string,
    teacherId: string,
    teacherName: string,
    internalNote?: string
  ) => Promise<AssignmentTicket>;
  approveTicket: (ticketId: string, reviewedBy: string) => Promise<any>;
  assignTicketToNext: (
    ticketId: string,
    teacherId: string,
    teacherName: string,
    internalNote?: string
  ) => Promise<any>;
  approveAndAdvanceTicket: (ticketId: string, reviewedBy: string, nextTeacherId?: string, nextTeacherName?: string) => Promise<any>;
  finalizeTicket: (
    ticketId: string,
    data: {
      finalReport: string;
      homework: string;
      homeworkLink?: string;
      reviewedBy: string;
      classworkSections?: ClassworkSection[];
      classworkSummary?: string;
      homeworkSummary?: string;
      classworkType?: string;
    }
  ) => Promise<any>;
  skipTicketToFinalize: (ticketId: string, reviewedBy?: string) => Promise<any>;
  createFinalizeTicket: (ticketId: string, reviewedBy?: string) => Promise<any>;
  deleteTicket: (ticketId: string) => Promise<void>;
  deleteTickets: (ticketIds: string[]) => Promise<void>;
  fixMissingAssignmentIds: () => Promise<{ fixed: number; total: number }>;
  // Personal Mushaf
  getStudentPersonalMushaf: (studentId: string) => Promise<any>;
  getStudentPersonalMushafFiltered: (studentId: string, filters?: { page?: number; surah?: number; ayah?: number }) => Promise<any>;
  // Listening sessions
  createListeningSession: (payload: ListeningSessionStartPayload) => Promise<ListeningSession>;
  updateListeningSession: (sessionIdOrTicketId: string, payload: ListeningSessionUpdatePayload) => Promise<ListeningSession>;
  endListeningSession: (sessionIdOrTicketId: string, payload?: ListeningSessionEndPayload) => Promise<ListeningSession>;
}

const BackendDataContext = createContext<BackendDataContextType | undefined>(undefined);

export const useBackendData = () => {
  const context = useContext(BackendDataContext);
  if (!context) {
    throw new Error('useBackendData must be used within a BackendDataProvider');
  }
  return context;
};

// API base URL - uses environment variable in production, localhost in development
const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';

// Helper function to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('umar_academy_token');
};

// Helper function to create headers with auth token
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const toIsoString = (value?: string | Date | null) => {
  if (!value) {
    return undefined;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const normalizeRecitationUnit = (unit?: RecitationUnit | null): RecitationUnit | undefined => {
  if (!unit) {
    return undefined;
  }
  const normalized: RecitationUnit = {
    unitType: unit.unitType,
    juzNumber: unit.juzNumber,
    surahNumber: unit.surahNumber,
    surahName: unit.surahName,
    fromAyah: unit.fromAyah,
    toAyah: unit.toAyah,
    fromPage: unit.fromPage,
    toPage: unit.toPage,
    pageCount: unit.pageCount,
    notes: unit.notes,
    updatedAt: toIsoString(unit.updatedAt)
  };
  return normalized;
};

const normalizeRecitationProfile = (profile?: StudentRecitationProfile | null): StudentRecitationProfile => {
  return {
    current: {
      sabq: normalizeRecitationUnit(profile?.current?.sabq),
      sabqi: normalizeRecitationUnit(profile?.current?.sabqi),
      manzil: normalizeRecitationUnit(profile?.current?.manzil)
    },
    history: Array.isArray(profile?.history)
      ? profile!.history.map((entry) => ({
          ...entry,
          completedAt: toIsoString(entry.completedAt) || new Date().toISOString()
        }))
      : []
  };
};

const serializeRecitationUnit = (unit?: RecitationUnit) => {
  if (!unit) {
    return undefined;
  }
  const payload: Record<string, unknown> = {
    unitType: unit.unitType
  };
  if (unit.juzNumber !== undefined) payload.juzNumber = unit.juzNumber;
  if (unit.surahNumber !== undefined) payload.surahNumber = unit.surahNumber;
  if (unit.surahName) payload.surahName = unit.surahName;
  if (unit.fromAyah !== undefined) payload.fromAyah = unit.fromAyah;
  if (unit.toAyah !== undefined) payload.toAyah = unit.toAyah;
  if (unit.fromPage !== undefined) payload.fromPage = unit.fromPage;
  if (unit.toPage !== undefined) payload.toPage = unit.toPage;
  if (unit.pageCount !== undefined) payload.pageCount = unit.pageCount;
  if (unit.notes) payload.notes = unit.notes;
  if (unit.updatedAt) payload.updatedAt = unit.updatedAt;
  return payload;
};

const serializeRecitationHistoryEntry = (entry: RecitationHistoryEntry) => ({
  ...entry,
  completedAt: entry.completedAt || new Date().toISOString()
});

export const BackendDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [recitationReviews, setRecitationReviews] = useState<RecitationReview[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [tickets, setTickets] = useState<AssignmentTicket[]>([]);
  const [recitationTickets, setRecitationTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState<string>('اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ');
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false); // Track if data is currently loading to prevent concurrent calls

  // Helper function to fetch with timeout and auth headers
  const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000, requireAuth = true) => {
    const controller = new AbortController();
    const id = setTimeout(() => {
      console.warn(`⏱️ Request timeout for ${url} after ${timeout}ms`);
      controller.abort();
    }, timeout);
    
    // Add auth headers if required
    const headers = new Headers(options.headers as HeadersInit);
    if (requireAuth) {
      const authHeaders = getAuthHeaders();
      Object.entries(authHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
    } else {
      headers.set('Content-Type', 'application/json');
    }
    
    try {
      if (import.meta.env.DEV) {
        console.log(`📡 Fetching: ${url} (timeout: ${timeout}ms)`);
      }
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(id);
      if (import.meta.env.DEV) {
        console.log(`✅ Response received for ${url}:`, response.status);
      }
      return response;
    } catch (error: any) {
      clearTimeout(id);
      console.error(`❌ Error fetching ${url}:`, error?.message || error);
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        throw new Error(`Request timeout after ${timeout}ms for ${url}`);
      }
      throw error;
    }
  };

  // Load data from backend API - wrapped in useCallback to prevent recreation
  const loadData = useCallback(async () => {
    // Prevent concurrent calls
    if (isLoadingRef.current) {
      if (import.meta.env.DEV) {
        console.log('⏸️ Data load already in progress, skipping...');
      }
      return;
    }
    
    // Set a maximum timeout for the entire data loading process (30 seconds)
    const maxTimeout = setTimeout(() => {
      if (isLoadingRef.current) {
        console.warn('⚠️ Data loading timed out after 30 seconds, setting loading to false');
        setLoading(false);
        isLoadingRef.current = false;
        setError('Data loading timed out. Please refresh the page.');
      }
    }, 30000);
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);
      setLoadingStep('اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ');
      if (import.meta.env.DEV) {
        console.log('🔄 Loading data from backend...', new Date().toISOString());
      }

      // Load users from backend with timeout (no auth required for backward compatibility)
      setLoadingStep('اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ');
      const usersResponse = await fetchWithTimeout(`${API_BASE}/users`, {}, 10000, false);
      if (import.meta.env.DEV) {
        console.log('📡 Backend response status:', usersResponse.status);
      }
      
      if (!usersResponse.ok) {
        throw new Error(`Failed to fetch users: ${usersResponse.status}`);
      }
      const users = await usersResponse.json();
      if (import.meta.env.DEV) {
        console.log('👥 Users loaded from backend:', users.length);
      }

      // Load actual teacher records from /api/teachers endpoint (with sync to ensure assignedStudents arrays are up to date)
      setLoadingStep('اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ');
      let teacherRecords: any[] = [];
      try {
      const teachersResponse = await fetchWithTimeout(`${API_BASE}/teachers?sync=true`, {}, 10000);
      if (teachersResponse.ok) {
          teacherRecords = await teachersResponse.json();
          if (import.meta.env.DEV) {
            console.log('👨‍🏫 Teacher records loaded from /api/teachers:', teacherRecords.length);
            
            // Log assignedStudents arrays for debugging
            teacherRecords.forEach((teacher: any) => {
              const assignedCount = Array.isArray(teacher.assignedStudents) ? teacher.assignedStudents.length : 0;
              console.log(`  - ${teacher.fullName || 'Unknown'}: assignedStudents=[${(teacher.assignedStudents || []).join(', ')}] (${assignedCount} students)`);
            });
          }
        
        // Merge teacher data with user data
          teacherRecords.forEach((teacher: any) => {
            const user = users.find((u: any) => 
              u._id === teacher.userId?._id || 
              u._id === teacher.userId ||
              (teacher.userId && typeof teacher.userId === 'object' && teacher.userId._id === u._id)
            );
          if (user) {
            user.teacherProfile = teacher;
          }
        });
        }
      } catch (err) {
        console.warn('⚠️ Could not load teacher records:', err);
      }

      // Load assignments from backend
      setLoadingStep('اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ');
      try {
        if (import.meta.env.DEV) {
          console.log('📡 Fetching assignments from:', `${API_BASE}/assignments`);
        }
        const assignmentsResponse = await fetchWithTimeout(`${API_BASE}/assignments`, {}, 8000); // Reduced timeout
        if (import.meta.env.DEV) {
          console.log('📡 Assignments response status:', assignmentsResponse.status, assignmentsResponse.ok);
        }
        if (assignmentsResponse.ok) {
          const assignmentsData = await assignmentsResponse.json();
          if (import.meta.env.DEV) {
            console.log('📝 Assignments loaded from backend:', assignmentsData.length);
            if (assignmentsData.length > 0) {
              console.log('📝 Sample assignment:', {
                id: assignmentsData[0]._id || assignmentsData[0].id,
                studentId: assignmentsData[0].studentId,
                studentName: assignmentsData[0].studentName,
                sabqCount: assignmentsData[0].classwork?.sabq?.length || 0,
                sabqiCount: assignmentsData[0].classwork?.sabqi?.length || 0,
                manzilCount: assignmentsData[0].classwork?.manzil?.length || 0,
                status: assignmentsData[0].status
              });
              // Log first 5 assignments only to avoid console spam
              assignmentsData.slice(0, 5).forEach((a: any, idx: number) => {
                console.log(`📝 Assignment ${idx + 1}:`, {
                  id: a._id || a.id,
                  studentId: a.studentId,
                  studentName: a.studentName,
                  sabq: a.classwork?.sabq?.length || 0,
                  sabqi: a.classwork?.sabqi?.length || 0,
                  manzil: a.classwork?.manzil?.length || 0
                });
              });
            }
          } else {
            console.warn('⚠️ No assignments found in database. This could mean:');
            console.warn('  1. No assignments have been created yet');
            console.warn('  2. Assignments exist but query is not finding them');
            console.warn('  3. Check backend logs when approving tickets to see if assignments are being created');
          }
          // Map MongoDB _id to id for frontend compatibility
          const mappedAssignments = assignmentsData.map((assignment: any) => ({
            ...assignment,
            id: assignment._id || assignment.id,
            createdAt: assignment.createdAt ? new Date(assignment.createdAt) : new Date(),
            updatedAt: assignment.updatedAt ? new Date(assignment.updatedAt) : new Date(),
            completedAt: assignment.completedAt ? new Date(assignment.completedAt) : undefined
          }));
          setAssignments(mappedAssignments);
        } else {
          const errorText = await assignmentsResponse.text().catch(() => 'Unknown error');
          console.error('❌ Failed to load assignments:', assignmentsResponse.status, errorText);
          setAssignments([]); // Set empty array on error
        }
      } catch (assignmentsError: any) {
        console.error('❌ Error loading assignments:', assignmentsError?.message || assignmentsError);
        setAssignments([]); // Set empty array on error to prevent hanging
      }

      // Load recitation reviews
      setLoadingStep('اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ');
      try {
        const reviewsResponse = await fetchWithTimeout(`${API_BASE}/recitation-reviews`, {}, 8000);
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          if (import.meta.env.DEV) {
            console.log('📖 Recitation reviews loaded:', reviewsData.length);
          }
          // Normalize recitation reviews to map _id to id
          const normalizedReviews = Array.isArray(reviewsData) ? reviewsData.map((review: any) => ({
            ...review,
            id: review._id || review.id,
            studentId: review.studentId || review.student?._id || review.student?.id || '',
            studentName: review.studentName || review.student?.fullName || review.student?.name || 'Unknown',
            teacherId: review.teacherId || review.teacher?._id || review.teacher?.id || '',
            teacherName: review.teacherName || review.teacher?.fullName || review.teacher?.name || 'Unknown',
            createdAt: review.createdAt ? new Date(review.createdAt) : new Date(),
            updatedAt: review.updatedAt ? new Date(review.updatedAt) : new Date(),
            reviewedAt: review.reviewedAt ? new Date(review.reviewedAt) : undefined,
          })) : [];
          setRecitationReviews(normalizedReviews);
        } else {
          console.warn('⚠️ Failed to load recitation reviews:', reviewsResponse.status);
          setRecitationReviews([]);
        }
      } catch (reviewsError: any) {
        console.error('❌ Error loading recitation reviews:', reviewsError?.message || reviewsError);
        setRecitationReviews([]);
      }

      // Load admin notifications
      setLoadingStep('اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ');
      try {
        const notificationsResponse = await fetchWithTimeout(`${API_BASE}/admin-notifications`, {}, 8000);
        if (notificationsResponse.ok) {
          const notificationsData = await notificationsResponse.json();
          if (import.meta.env.DEV) {
            console.log('🔔 Admin notifications loaded:', notificationsData.length);
          }
          setAdminNotifications(notificationsData);
        } else {
          console.warn('⚠️ Failed to load notifications:', notificationsResponse.status);
          setAdminNotifications([]);
        }
      } catch (notificationsError: any) {
        console.error('❌ Error loading notifications:', notificationsError?.message || notificationsError);
        setAdminNotifications([]);
      }

      // Load tickets (old system)
      setLoadingStep('اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ');
      try {
        const ticketsResponse = await fetchWithTimeout(`${API_BASE}/tickets`, {}, 8000);
        if (ticketsResponse.ok) {
          const ticketsData = await ticketsResponse.json();
          if (import.meta.env.DEV) {
            console.log('🎫 Tickets loaded:', ticketsData.length);
          }
          // Map MongoDB _id to id for frontend compatibility
          const mappedTickets = ticketsData.map((ticket: any) => ({
            ...ticket,
            id: ticket._id || ticket.id,
            createdAt: ticket.createdAt ? new Date(ticket.createdAt) : new Date(),
            updatedAt: ticket.updatedAt ? new Date(ticket.updatedAt) : new Date(),
            reviewedAt: ticket.reviewedAt ? new Date(ticket.reviewedAt) : undefined,
            completedAt: ticket.completedAt ? new Date(ticket.completedAt) : undefined
          }));
          setTickets(mappedTickets);
          
          // Also load into recitationTickets (new system) - filter for sabq/sabqi/manzil types
          const recitationTicketsData = ticketsData
            .filter((t: any) => t.type && ['sabq', 'sabqi', 'manzil'].includes(t.type))
            .map((ticket: any) => ({
              ...ticket,
              id: ticket._id || ticket.id,
              createdAt: ticket.createdAt ? new Date(ticket.createdAt) : new Date(),
              updatedAt: ticket.updatedAt ? new Date(ticket.updatedAt) : new Date(),
              startedAt: ticket.startedAt ? new Date(ticket.startedAt) : undefined,
              submittedAt: ticket.submittedAt ? new Date(ticket.submittedAt) : undefined,
              approvedAt: ticket.approvedAt ? new Date(ticket.approvedAt) : undefined,
              reassignedAt: ticket.reassignedAt ? new Date(ticket.reassignedAt) : undefined,
              sentAt: ticket.sentAt ? new Date(ticket.sentAt) : undefined,
              recordingUrl: ticket.recordingUrl || null,
              recordingFormat: ticket.recordingFormat || null,
              recordingDuration: ticket.recordingDuration || null,
              recordingStartedAt: ticket.recordingStartedAt ? new Date(ticket.recordingStartedAt) : undefined,
              recordingStoppedAt: ticket.recordingStoppedAt ? new Date(ticket.recordingStoppedAt) : undefined
            }));
          setRecitationTickets(recitationTicketsData);
          if (import.meta.env.DEV) {
            console.log('🎫 Recitation tickets loaded:', recitationTicketsData.length);
          }
          const ticketsWithRecordings = recitationTicketsData.filter((t: any) => t.recordingUrl);
          console.log('🎙️ Tickets with recordings:', ticketsWithRecordings.length);
          if (ticketsWithRecordings.length > 0) {
            console.log('📋 Sample tickets with recordings:');
            ticketsWithRecordings.slice(0, 3).forEach((t: any) => {
              console.log('  -', {
                id: t.id,
                studentName: t.studentName,
                type: t.type,
                recordingUrl: t.recordingUrl,
                recordingFormat: t.recordingFormat,
                recordingDuration: t.recordingDuration
              });
            });
          }
        } else {
          console.warn('⚠️ Failed to load tickets:', ticketsResponse.status);
          setTickets([]);
          setRecitationTickets([]);
        }
      } catch (ticketsError: any) {
        console.error('❌ Error loading tickets:', ticketsError?.message || ticketsError);
        setTickets([]);
        setRecitationTickets([]);
      }

      // Load actual student records from /api/students endpoint
      setLoadingStep('اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ');
      let studentRecords: any[] = [];
      try {
        const studentsResponse = await fetchWithTimeout(`${API_BASE}/students`, {}, 10000);
        if (studentsResponse.ok) {
          studentRecords = await studentsResponse.json();
          if (import.meta.env.DEV) {
            console.log('📚 Student records loaded from /api/students:', studentRecords.length);
          }
        }
      } catch (err) {
        console.warn('⚠️ Could not load student records:', err);
      }

      // Separate users by role and map to expected format
      // Use studentRecords directly if available, otherwise fall back to users
      let studentsData: any[] = [];
      
      if (studentRecords && studentRecords.length > 0) {
        // Use student records directly - they have all the student data
        studentsData = studentRecords.map((studentRecord: any) => {
          const userId = studentRecord.userId?._id || studentRecord.userId || studentRecord.userId?._id?.toString();
          // Find matching user if available
          const user = users.find((u: any) => 
            u._id?.toString() === userId?.toString() ||
            u._id === userId ||
            (studentRecord.email && u.email === studentRecord.email)
          ) || {};
          
          return {
            id: studentRecord._id || studentRecord.id || userId,
            studentRecordId: studentRecord._id || studentRecord.id,
            fullName: studentRecord.fullName || studentRecord.name || user.name || user.fullName || 'Unknown',
            email: studentRecord.email || user.email || '',
            phone: studentRecord.contact || studentRecord.phone || user.phone || '',
            address: studentRecord.address || user.address || '',
            dateOfBirth: studentRecord.dateOfBirth || user.dateOfBirth || new Date().toISOString(),
            enrollmentDate: studentRecord.enrolledDate || studentRecord.enrollmentDate || user.enrollmentDate || new Date().toISOString(),
            level: studentRecord.level || user.level || 'beginner',
            status: studentRecord.status || user.status || 'active',
            assignedTeacher: studentRecord.assignedTeacher || studentRecord.assignedTeacherId || user.assignedTeacher || '',
            paymentStatus: studentRecord.paymentStatus || user.paymentStatus || 'pending',
            avatar: studentRecord.avatar || user.avatar || '',
            courses: studentRecord.courses || user.courses || [],
            assignments: studentRecord.assignments || user.assignments || [],
            payments: studentRecord.payments || user.payments || [],
            progress: studentRecord.progress || user.progress || { completed: 0, total: 0, percentage: 0 },
            attendance: studentRecord.attendance || user.attendance || { present: 0, absent: 0, total: 0 },
            grades: studentRecord.grades || user.grades || [],
            notes: studentRecord.notes || user.notes || [],
            recitationProfile: normalizeRecitationProfile(studentRecord?.recitationProfile),
            program: studentRecord.program || user.program || '',
            parentName: studentRecord.parentName || user.parentName || '',
            tuitionFee: studentRecord.tuitionFee || user.tuitionFee || 0,
            registrationAmount: studentRecord.registrationAmount || user.registrationAmount || 0,
            schedule: studentRecord.schedule || user.schedule || {},
            siblings: studentRecord.siblings || user.siblings || []
          };
        });
      } else {
        // Fallback to users with role === 'student' if no student records
        studentsData = users
          .filter((user: any) => user.role === 'student')
          .map((user: any) => {
            return {
              id: user._id,
              studentRecordId: user._id,
              fullName: user.name || user.fullName || 'Unknown',
              email: user.email || '',
              phone: user.phone || '',
              address: user.address || '',
              dateOfBirth: user.dateOfBirth || new Date().toISOString(),
              enrollmentDate: user.enrollmentDate || new Date().toISOString(),
              level: user.level || 'beginner',
              status: user.status || 'active',
              assignedTeacher: user.assignedTeacher || '',
              paymentStatus: user.paymentStatus || 'pending',
              avatar: user.avatar || '',
              courses: user.courses || [],
              assignments: user.assignments || [],
              payments: user.payments || [],
              progress: user.progress || { completed: 0, total: 0, percentage: 0 },
              attendance: user.attendance || { present: 0, absent: 0, total: 0 },
              grades: user.grades || [],
              notes: user.notes || [],
              recitationProfile: normalizeRecitationProfile(user?.recitationProfile)
            };
          });
      }

      const teachersData = users
        .filter((user: any) => user.role === 'teacher')
        .map((user: any) => {
          // Find matching teacher record to get actual data
          const teacherRecord = teacherRecords.find((tr: any) => 
            tr.userId?._id === user._id || 
            tr.userId?._id?.toString() === user._id?.toString() ||
            (tr.userId && typeof tr.userId === 'object' && tr.userId._id === user._id) ||
            tr._id === user._id ||
            tr._id?.toString() === user._id?.toString()
          );
          
          const teacherProfile = user.teacherProfile || teacherRecord || {};
          
          // Ensure permissions are properly loaded with all fields
          const permissionsFromRecord = teacherRecord?.permissions || teacherProfile.permissions || {};
          const permissions: TeacherPermissions = {
            canViewAssessments: permissionsFromRecord.canViewAssessments ?? true,
            canEditAssessments: permissionsFromRecord.canEditAssessments ?? true,
            canViewEvaluations: permissionsFromRecord.canViewEvaluations ?? true,
            canEditEvaluations: permissionsFromRecord.canEditEvaluations ?? true,
            canViewFinancials: permissionsFromRecord.canViewFinancials ?? false,
            canManageSchedule: permissionsFromRecord.canManageSchedule ?? true,
            canContactParents: permissionsFromRecord.canContactParents ?? true,
            canViewStudentEmail: permissionsFromRecord.canViewStudentEmail ?? true,
            canViewStudentContact: permissionsFromRecord.canViewStudentContact ?? true,
            canViewStudentPersonalInfo: permissionsFromRecord.canViewStudentPersonalInfo ?? true,
          };
          
          return {
            id: user._id,
            fullName: user.name || user.fullName || teacherProfile.fullName || teacherRecord?.fullName || 'Unknown',
            email: user.email,
            phoneNumber: teacherProfile.phoneNumber || teacherProfile.contact || user.phone || '',
            phone: user.phone || teacherProfile.contact || '',
            contact: user.contact || user.phone || teacherProfile.contact || teacherProfile.phoneNumber || '',
            emergencyContact: teacherProfile.emergencyContact || user.emergencyContact || '',
            address: user.address || '',
            dateOfBirth: user.dateOfBirth || new Date().toISOString(),
            hireDate: teacherRecord?.hireDate || teacherProfile.hireDate || user.hireDate || new Date().toISOString(),
            specialization: teacherProfile.specialization || user.specialization || [],
            department: user.department || teacherProfile.department || 'General',
            experience: teacherProfile.experience || user.experience || { years: 0, previousInstitutions: [] },
            salary: teacherProfile.salary || user.salary || 0,
            status: user.status || teacherProfile.status || 'active',
            avatar: user.avatar || teacherProfile.avatar || '',
            location: teacherProfile.location || user.location || 'Local',
            employmentType: teacherRecord?.employmentType || teacherProfile.employmentType || 'Full Time',
            shiftType: teacherRecord?.shiftType || teacherProfile.shiftType || 'Morning',
            shifts: teacherRecord?.shifts || teacherProfile.shifts || [],
            courses: user.courses || teacherProfile.courses || [],
            students: user.students || [],
            assignedStudents: teacherRecord?.assignedStudents || teacherProfile.assignedStudents || user.assignedStudents || [],
            permissions: permissions,
            schedule: teacherRecord?.schedule || teacherProfile.schedule || {
              days: [],
              startTime: '',
              endTime: ''
            },
            performance: user.performance || teacherProfile.performance || { rating: 0, reviews: [] },
            attendance: user.attendance || { present: 0, absent: 0, total: 0 },
            assignments: user.assignments || [],
            payroll: teacherRecord?.payroll || teacherProfile.payroll || user.payroll || { 
              hourlyRate: 0,
              dailyHours: 0,
              daysWorking: 0,
              monthlyHours: 0,
              monthlySalary: 0,
              currency: 'USD'
            },
            idDocument: teacherRecord?.idDocument || teacherProfile.idDocument || ''
          };
        });

      // Load admins from Admin collection (has admin-specific data)
      setLoadingStep('اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ');
      let adminsData: Admin[] = [];
      
      // Use Promise.race to ensure we don't hang - fallback after 5 seconds
      const adminsPromise = (async () => {
        try {
          if (import.meta.env.DEV) {
            console.log('📡 Fetching admins from:', `${API_BASE}/admins`);
          }
          const adminsResponse = await fetchWithTimeout(`${API_BASE}/admins`, {}, 5000, false); // Reduced timeout to 5 seconds
          if (import.meta.env.DEV) {
            console.log('📡 Admins response status:', adminsResponse.status);
          }
          
          if (adminsResponse.ok) {
            const adminRecords = await adminsResponse.json();
            if (import.meta.env.DEV) {
              console.log('👨‍💼 Admin records loaded:', adminRecords.length);
            }
            return adminRecords.map((adminRecord: any) => ({
              id: adminRecord._id || adminRecord.id,
              userId: adminRecord.userId?._id || adminRecord.userId || adminRecord.userId?._id,
              fullName: adminRecord.fullName || 'Unknown',
              email: adminRecord.email || '',
              contact: adminRecord.contact || '',
              permissions: adminRecord.permissions || {
                canManageTeachers: false,
                canManageStudents: false,
                canManageFinancials: false,
                canViewReports: false,
                canManagePermissions: false
              },
              assignedDepartments: adminRecord.assignedDepartments || [],
              hireDate: adminRecord.hireDate ? new Date(adminRecord.hireDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              status: adminRecord.status || 'active',
              avatar: adminRecord.avatar || ''
            }));
          } else {
            console.warn('⚠️ Admins endpoint returned non-OK status:', adminsResponse.status);
            throw new Error(`Admins endpoint returned ${adminsResponse.status}`);
          }
        } catch (error: any) {
          console.warn('⚠️ Failed to load admins from /api/admins:', error?.message || error);
          throw error;
        }
      })();
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Admins loading timeout')), 5000);
      });
      
      try {
        adminsData = await Promise.race([adminsPromise, timeoutPromise]);
        if (import.meta.env.DEV) {
          console.log('✅ Admins processed:', adminsData.length);
        }
      } catch (adminError: any) {
        console.warn('⚠️ Admins loading failed or timed out, falling back to users:', adminError?.message || adminError);
        // Fallback to users collection if Admin collection doesn't exist yet or request times out
        adminsData = users
          .filter((user: any) => user.role === 'admin' || user.role === 'superadmin')
          .map((user: any) => ({
            id: user._id,
            fullName: user.name || user.fullName || 'Unknown',
            email: user.email,
            contact: user.phone || user.contact || '',
            permissions: user.permissions || {
              canManageTeachers: false,
              canManageStudents: false,
              canManageFinancials: false,
              canViewReports: false,
              canManagePermissions: false
            },
            assignedDepartments: user.assignedDepartments || [],
            hireDate: user.hireDate || new Date().toISOString().split('T')[0],
            status: user.status || 'active',
            avatar: user.avatar || ''
          }));
        if (import.meta.env.DEV) {
          console.log('✅ Fallback admins from users:', adminsData.length);
        }
      }

      setLoadingStep('اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ');
      if (import.meta.env.DEV) {
        console.log('📊 Data separated and mapped:', { students: studentsData.length, teachers: teachersData.length, admins: adminsData.length });
      }

      setStudents(studentsData);
      setTeachers(teachersData);
      setAdmins(adminsData);
      
      setLoadingStep('اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ');
      if (import.meta.env.DEV) {
        console.log('✅ All data loaded successfully');
      }

    } catch (err) {
      setError('Failed to load data from backend. Please check your connection and try again.');
      console.error('❌ Error loading data from MongoDB:', err);
      
      // No localStorage fallback - all data must come from MongoDB
      setStudents([]);
      setTeachers([]);
      setAdmins([]);
      setAssignments([]);
      setRecitationReviews([]);
      setAdminNotifications([]);
      setTickets([]);
      setRecitationTickets([]);
    } finally {
      clearTimeout(maxTimeout);
      if (import.meta.env.DEV) {
        console.log('🔄 Setting loading to false...');
        console.log('✅ Data loading completed - loading state:', false);
      }
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []); // Empty deps - loadData should only be created once

  // Only load data once on mount
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      if (import.meta.env.DEV) {
        console.log('🚀 Initial data load triggered');
      }
      loadData();
    } else {
      if (import.meta.env.DEV) {
        console.log('⏸️ Data already loaded, skipping initial load');
      }
    }
  }, [loadData]);

  // Student operations
  const addStudent = async (student: Student) => {
    try {
      // Create user first (requires authentication)
      const userResponse = await fetchWithTimeout(
        `${API_BASE}/users`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: student.fullName,
            email: student.email,
            role: 'student',
            password: 'password123', // Default password for students
            avatar: student.avatar
          }),
        },
        10000,
        true // requireAuth = true
      );

      if (!userResponse.ok) {
        let message = 'Failed to create user';
        try {
          const errorPayload = await userResponse.json();
          message = errorPayload?.error || message;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }

      const newUser = await userResponse.json();

      // Create student profile with all data (may or may not require auth, but include it for consistency)
      // Build schedule object - backend may have room field but TypeScript type doesn't
      const schedulePayload = student.schedule && typeof student.schedule === 'object' ? {
        days: Array.isArray(student.schedule.days) ? student.schedule.days : [],
        startTime: student.schedule.startTime || '09:00',
        endTime: student.schedule.endTime || '12:00',
        ...((student.schedule as any).room ? { room: (student.schedule as any).room } : {})
      } : {
        days: [],
        startTime: '09:00',
        endTime: '12:00'
      };

      const studentResponse = await fetchWithTimeout(
        `${API_BASE}/students`,
        {
          method: 'POST',
          body: JSON.stringify({
          studentId: student.id,
          userId: newUser._id,
          level: 'beginner', // Default level
          paymentStatus: 'pending', // Default payment status
          enrollmentDate: student.enrolledDate ? new Date(student.enrolledDate) : new Date(),
          // Include all student profile data
          fullName: student.fullName,
          email: student.email,
          contact: student.contact || (student as any).phoneNumber || (student as any).contactNumber || '', // Ensure contact is included (handle backend variations)
          parentName: student.parentName || '',
          program: student.program || '',
          tuitionFee: student.tuitionFee || 0,
          registrationAmount: student.registrationAmount || 0,
          assignedTeacher: student.assignedTeacher || '',
          assignedTeacherId: student.assignedTeacher || '',
          schedule: schedulePayload,
          siblings: student.siblings || [],
          status: student.status || 'active',
          avatar: student.avatar || '',
          assessments: student.assessments || [],
          evaluations: student.evaluations || [],
          recitationProfile: normalizeRecitationProfile(student.recitationProfile)
        }),
      },
      10000,
      true // requireAuth = true
    );

      if (!studentResponse.ok) {
        let message = 'Failed to create student profile';
        try {
          const errorPayload = await studentResponse.json();
          message = errorPayload?.error || message;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }

      const savedStudent = await studentResponse.json();
      const normalizedProfile = normalizeRecitationProfile(savedStudent?.recitationProfile || student.recitationProfile);

      const enhancedStudent: Student = {
        ...student,
        id: newUser._id,
        studentRecordId: savedStudent?._id || savedStudent?.id,
        recitationProfile: normalizedProfile
      };

      setStudents(prev => [...prev, enhancedStudent]);
      if (import.meta.env.DEV) {
        console.log('✅ Student added successfully to MongoDB:', enhancedStudent.fullName);
      }

    } catch (err) {
      setError('Failed to add student to MongoDB');
      console.error('Error adding student:', err);
      throw err; // Re-throw to let caller handle the error
    }
  };

  const updateStudent = async (id: string, student: Partial<Student>) => {
    try {
      // First try updating via /api/students/:id (preferred endpoint)
      let response = await fetch(`${API_BASE}/students/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(student),
      });

      // If that fails, try /api/users/:id as fallback
      if (!response.ok) {
        response = await fetch(`${API_BASE}/users/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(student),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to update student';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const updatedStudent = await response.json();
      
      // Map MongoDB _id to id for consistency
      const mappedStudent = {
        ...updatedStudent,
        id: updatedStudent._id || updatedStudent.id || id,
      };

      // Update local state with the complete updated student data from backend
      setStudents(prev => prev.map(s => {
        const sId = s.id || (s as any)._id;
        return (sId === id || sId === mappedStudent.id || sId === mappedStudent._id) 
          ? { ...s, ...mappedStudent, ...student } 
          : s;
      }));
      
      // Refresh data to ensure consistency
      await refreshData();

      if (import.meta.env.DEV) {
        console.log('✅ Student updated successfully:', mappedStudent.fullName || mappedStudent.name || 'Student');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update student';
      setError(errorMessage);
      console.error('Error updating student:', err);
      throw err; // Re-throw to let the form handle it
    }
  };

  const updateStudentRecitation = async (
    id: string,
    payload: {
      current?: Partial<Record<RecitationStep, RecitationUnit>>;
      historyEntry?: RecitationHistoryEntry | RecitationHistoryEntry[];
    }
  ): Promise<StudentRecitationProfile | null> => {
    try {
      const bodyPayload: Record<string, unknown> = {};

      if (payload.current) {
        const currentPayload: Record<string, unknown> = {};
        (Object.entries(payload.current) as [RecitationStep, RecitationUnit | undefined][]).forEach(
          ([step, unit]) => {
            if (unit) {
              currentPayload[step] = serializeRecitationUnit(unit);
            }
          }
        );
        if (Object.keys(currentPayload).length > 0) {
          bodyPayload.current = currentPayload;
        }
      }

      if (payload.historyEntry) {
        const entries = Array.isArray(payload.historyEntry)
          ? payload.historyEntry
          : [payload.historyEntry];
        if (entries.length > 0) {
          bodyPayload.historyEntry = entries.map(serializeRecitationHistoryEntry);
        }
      }

      if (Object.keys(bodyPayload).length === 0) {
        console.warn('⚠️ updateStudentRecitation called without payload for student:', id);
        return null;
      }

      const response = await fetch(`${API_BASE}/students/${id}/recitation`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyPayload)
      });

      if (!response.ok) {
        throw new Error('Failed to update recitation profile');
      }

      const updatedStudent = await response.json();
      const normalizedProfile = normalizeRecitationProfile(updatedStudent.recitationProfile);

      setStudents(prev =>
        prev.map(s =>
          s.id === id
            ? {
                ...s,
                recitationProfile: normalizedProfile
              }
            : s
        )
      );

      return normalizedProfile;
    } catch (err) {
      console.error('Error updating student recitation:', err);
      setError('Failed to update student recitation');
      return null;
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      console.log(`🗑️ Attempting to delete student with ID: ${id}`);
      
      // Find the student to get all possible IDs
      const studentToDelete = students.find(s => s.id === id || (s as any)._id === id);
      if (!studentToDelete) {
        console.warn(`⚠️ Student not found in local state with ID: ${id}`);
      }
      
      // Try deleting via /api/students/:id first (preferred endpoint)
      let response = await fetch(`${API_BASE}/students/${id}`, {
        method: 'DELETE',
      });

      // If that fails, try /api/users/:id as fallback
      if (!response.ok) {
        console.log(`⚠️ DELETE /api/students/${id} failed (${response.status}), trying /api/users/${id}...`);
        response = await fetch(`${API_BASE}/users/${id}`, {
          method: 'DELETE',
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to delete student';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        console.error(`❌ Delete failed: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      // Remove from local state (handle both id and _id matching)
      setStudents(prev => prev.filter(s => {
        const sId = s.id || (s as any)._id;
        return sId !== id && sId !== (studentToDelete?.id) && sId !== (studentToDelete as any)?._id;
      }));
      
      // Refresh data from backend to ensure consistency
      await refreshData();

      if (import.meta.env.DEV) {
        console.log('✅ Student deleted successfully');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete student';
      setError(errorMessage);
      console.error('❌ Error deleting student:', err);
      throw err; // Re-throw to let the handler show the error
    }
  };

  // Teacher operations
  const addTeacher = async (teacher: Teacher) => {
    try {
      // Create user first - use fetchWithTimeout with authentication
      const userResponse = await fetchWithTimeout(
        `${API_BASE}/users`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: teacher.fullName,
            email: teacher.email,
            role: 'teacher',
            password: 'password123', // Default password for teachers
            avatar: teacher.avatar
          }),
        },
        10000,
        true // requireAuth = true - includes Authorization header
      );

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        let errorMessage = 'Failed to create user';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const newUser = await userResponse.json();

      // Create teacher profile with all data from the form
      const teacherPayload = {
        teacherId: teacher.id || `TCH${Date.now()}`,
        userId: newUser._id || newUser.id,
        fullName: teacher.fullName,
        email: teacher.email,
        phoneNumber: teacher.phoneNumber,
        contact: teacher.phoneNumber || teacher.contact,
        emergencyContact: teacher.emergencyContact,
        department: teacher.department,
        location: teacher.location,
        employmentType: teacher.employmentType,
        shiftType: teacher.shiftType,
        shifts: teacher.shifts || [],
        status: teacher.status || 'active',
        assignedStudents: teacher.assignedStudents || [],
        idDocument: teacher.idDocument,
        permissions: teacher.permissions || {
          canViewAssessments: true,
          canEditAssessments: true,
          canViewEvaluations: true,
          canEditEvaluations: true,
          canViewFinancials: false,
          canManageSchedule: true,
          canContactParents: true,
        },
        payroll: teacher.payroll || {
          hourlyRate: 0,
          dailyHours: 0,
          daysWorking: 0,
          monthlyHours: 0,
          monthlySalary: 0,
          currency: 'USD',
          paymentType: 'monthly',
        },
        schedule: teacher.schedule || {
          days: [],
          workingDays: [],
          startTime: '',
          endTime: '',
          workingHours: { start: '', end: '' },
        },
        hireDate: teacher.hireDate || new Date().toISOString(),
        avatar: teacher.avatar,
        specialization: [],
      };

      const teacherResponse = await fetchWithTimeout(
        `${API_BASE}/teachers`,
        {
          method: 'POST',
          body: JSON.stringify(teacherPayload),
        },
        10000,
        false // Teachers endpoint doesn't require auth
      );

      if (!teacherResponse.ok) {
        const errorText = await teacherResponse.text();
        let errorMessage = 'Failed to create teacher profile';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        console.error('Teacher creation failed:', errorText);
        throw new Error(errorMessage);
      }

      const newTeacher = await teacherResponse.json();
      
      // Map MongoDB _id to id for consistency
      const mappedTeacher = {
        ...teacher,
        id: newTeacher._id || newTeacher.id || newUser._id || newUser.id,
        _id: newTeacher._id,
      };

      // Update local state
      setTeachers(prev => [...prev, mappedTeacher]);
      await refreshData();

      if (import.meta.env.DEV) {
        console.log('✅ Teacher created successfully:', mappedTeacher.fullName);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add teacher';
      setError(errorMessage);
      console.error('Error adding teacher:', err);
      throw err;
    }
  };

  const updateTeacher = async (id: string, teacher: Partial<Teacher>) => {
    try {
      // Prepare update payload with proper field mapping
      const updatePayload = {
        ...teacher,
        // Map phoneNumber to contact if needed
        contact: teacher.phoneNumber || teacher.contact || undefined,
        phoneNumber: teacher.phoneNumber || teacher.contact,
      };

      // Try updating via /api/teachers/:id first
      let response = await fetchWithTimeout(
        `${API_BASE}/teachers/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(updatePayload),
        },
        10000,
        false // Backend endpoint doesn't require auth currently
      );

      // If that fails, try /api/users/:id as fallback
      if (!response.ok) {
        response = await fetchWithTimeout(
          `${API_BASE}/users/${id}`,
          {
            method: 'PUT',
            body: JSON.stringify(updatePayload),
          },
          10000,
          false // Backend endpoint doesn't require auth currently
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to update teacher';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const updatedTeacher = await response.json();
      
      // Map MongoDB _id to id for consistency
      const mappedTeacher = {
        ...updatedTeacher,
        id: updatedTeacher._id || updatedTeacher.id || id,
        fullName: updatedTeacher.fullName || updatedTeacher.name || 'Unknown Teacher',
        // Ensure permissions are preserved from update payload if backend didn't return them
        permissions: updatedTeacher.permissions || teacher.permissions || {
          canViewAssessments: true,
          canEditAssessments: true,
          canViewEvaluations: true,
          canEditEvaluations: true,
          canViewFinancials: false,
          canManageSchedule: true,
          canContactParents: true,
          canViewStudentEmail: true,
          canViewStudentContact: true,
          canViewStudentPersonalInfo: true,
        }
      };

      // Update local state - merge to preserve all fields
      setTeachers(prev => prev.map(t => {
        const tId = t.id || (t as any)._id;
        if (tId === id || tId === mappedTeacher.id || tId === mappedTeacher._id) {
          return {
            ...t,
            ...mappedTeacher,
            permissions: mappedTeacher.permissions || t.permissions
          };
        }
        return t;
      }));
      
      await refreshData();

      if (import.meta.env.DEV) {
        console.log('✅ Teacher updated successfully:', mappedTeacher.fullName || mappedTeacher.name || 'Teacher');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update teacher';
      setError(errorMessage);
      console.error('Error updating teacher:', err);
      throw err;
    }
  };

  const deleteTeacher = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete teacher');
      }

      setTeachers(prev => prev.filter(t => t.id !== id));
      if (import.meta.env.DEV) {
        console.log('✅ Teacher deleted successfully from MongoDB');
      }

    } catch (err) {
      setError('Failed to delete teacher from MongoDB');
      console.error('Error deleting teacher:', err);
      throw err; // Re-throw to let caller handle the error
    }
  };

  // Admin operations
  const addAdmin = async (admin: Admin) => {
    try {
      // Step 1: Create User account first
      const userResponse = await fetchWithTimeout(
        `${API_BASE}/users`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: admin.fullName,
            email: admin.email,
            role: 'admin',
            password: 'password123', // Default password for admins
            avatar: admin.avatar,
            contact: admin.contact
          }),
        },
        15000,
        true // requireAuth
      );

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({ error: 'Failed to create user account' }));
        throw new Error(errorData.error || 'Failed to create user account');
      }

      const newUser = await userResponse.json();

      // Step 2: Create Admin profile with all admin-specific data
      const adminResponse = await fetchWithTimeout(
        `${API_BASE}/admins`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            userId: newUser._id || newUser.id,
            fullName: admin.fullName,
            email: admin.email,
            contact: admin.contact,
            permissions: admin.permissions,
            assignedDepartments: admin.assignedDepartments,
            hireDate: admin.hireDate,
            status: admin.status || 'active',
            avatar: admin.avatar
          }),
        },
        15000,
        true // requireAuth
      );

      if (!adminResponse.ok) {
        const errorData = await adminResponse.json().catch(() => ({ error: 'Failed to create admin profile' }));
        throw new Error(errorData.error || 'Failed to create admin profile');
      }

      const newAdminProfile = await adminResponse.json();
      const adminWithId = { 
        ...admin, 
        id: newAdminProfile._id || newAdminProfile.id,
        userId: newUser._id || newUser.id
      };
      
      setAdmins(prev => [...prev, adminWithId]);
      if (import.meta.env.DEV) {
        console.log('✅ Admin created successfully in MongoDB:', admin.fullName);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add admin';
      setError(errorMessage);
      console.error('Error adding admin:', err);
      throw err; // Re-throw so the form can handle it
    }
  };

  const updateAdmin = async (id: string, admin: Partial<Admin>) => {
    try {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(admin),
      });

      if (!response.ok) {
        throw new Error('Failed to update admin');
      }

      setAdmins(prev => prev.map(a => a.id === id ? { ...a, ...admin } : a));
      if (import.meta.env.DEV) {
        console.log('✅ Admin updated successfully in MongoDB');
      }

    } catch (err) {
      setError('Failed to update admin in MongoDB');
      console.error('Error updating admin:', err);
      throw err; // Re-throw to let caller handle the error
    }
  };

  const deleteAdmin = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete admin');
      }

      setAdmins(prev => prev.filter(a => a.id !== id));
      if (import.meta.env.DEV) {
        console.log('✅ Admin deleted successfully from MongoDB');
      }

    } catch (err) {
      setError('Failed to delete admin from MongoDB');
      console.error('Error deleting admin:', err);
      throw err; // Re-throw to let caller handle the error
    }
  };

  // Helper functions
  const getStudentsByTeacher = (teacherId: string) => {
    console.log('🔍 getStudentsByTeacher called with teacherId:', teacherId);
    
    // Normalize teacherId to string for comparison
    const normalizedTeacherId = teacherId?.toString().trim();
    if (!normalizedTeacherId) {
      console.log('🔍 Invalid teacherId');
      return [];
    }
    
    // Find the teacher to get their assignedStudents array
    const teacher = teachers.find(t => {
      const tId = (t.id || (t as any)._id)?.toString().trim();
      return tId === normalizedTeacherId;
    });
    
    if (!teacher) {
      console.log('🔍 Teacher not found for ID:', normalizedTeacherId);
      console.log('🔍 Available teachers:', teachers.map(t => ({ id: t.id || (t as any)._id, name: t.fullName })));
      return [];
    }
    
    const teacherName = teacher.fullName?.trim() || '';
    const teacherIdFromTeacher = (teacher.id || (teacher as any)._id)?.toString().trim();
    const assignedStudentIds = (teacher as any).assignedStudents || [];
    
    console.log('🔍 Teacher found:', teacherName, 
      '- teacherId:', teacherIdFromTeacher,
      '- assignedStudents array:', assignedStudentIds,
      '- total students in system:', students.length);
    
    // Log all students and their assignedTeacher values for debugging
    console.log('🔍 All students and their assignedTeacher values:');
    students.forEach(student => {
      const assignedTeacher = (student.assignedTeacher || (student as any).assignedTeacher || '').trim();
      console.log(`  - ${student.fullName || (student as any).fullName}: assignedTeacher="${assignedTeacher}"`);
    });
    
    // Filter students by checking multiple criteria
    const filteredStudents = students.filter(student => {
      const studentId = (student.id || (student as any)._id)?.toString().trim();
      const userId = (student as any).userId?._id?.toString().trim() || (student as any).userId?.toString().trim();
      const assignedTeacher = (student.assignedTeacher || (student as any).assignedTeacher || '').trim();
      
      // Check 1: If student ID or user ID is in teacher's assignedStudents array
      const isAssignedById = assignedStudentIds.some((assignedId: string) => {
        const assignedIdStr = assignedId?.toString().trim();
        return assignedIdStr === studentId || 
               assignedIdStr === userId ||
               assignedIdStr === (student as any)._id?.toString().trim();
      });
      
      // Check 2: If student's assignedTeacher field matches teacher's ID (normalized)
      const hasAssignedTeacherId = assignedTeacher === normalizedTeacherId ||
                                   assignedTeacher === teacherIdFromTeacher ||
                                   (student as any).assignedTeacherId?.toString().trim() === normalizedTeacherId;
      
      // Check 3: If student's assignedTeacher field matches teacher's name (case-insensitive)
      const hasAssignedTeacherName = teacherName && assignedTeacher && (
        assignedTeacher === teacherName ||
        assignedTeacher === teacher.fullName?.trim() ||
        assignedTeacher.toLowerCase() === teacherName.toLowerCase() ||
        assignedTeacher.toLowerCase() === teacher.fullName?.trim().toLowerCase()
      );
      
      const matches = isAssignedById || hasAssignedTeacherId || hasAssignedTeacherName;
      
      if (matches) {
        if (import.meta.env.DEV) {
          console.log('✅ Student matched:', student.fullName || (student as any).fullName, 
          '- assignedTeacher:', assignedTeacher,
          '- studentId:', studentId,
          '- teacherId (normalized):', normalizedTeacherId,
          '- teacherName:', teacherName,
          '- isAssignedById:', isAssignedById,
          '- hasAssignedTeacherId:', hasAssignedTeacherId,
          '- hasAssignedTeacherName:', hasAssignedTeacherName);
        }
      }
      
      return matches;
    });
    
    if (import.meta.env.DEV) {
      console.log('🔍 Filtered students for teacher:', filteredStudents.length, filteredStudents.map(s => s.fullName || (s as any).fullName));
    }
    return filteredStudents;
  };

  const getTeacherById = (id: string) => {
    return teachers.find(teacher => teacher.id === id);
  };

  const getStudentByEmail = (email: string) => {
    return students.find(student => student.email === email);
  };

  // Memoized refreshData to prevent unnecessary re-renders and concurrent calls
  const refreshData = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('⏸️ Refresh skipped - data load already in progress');
      return;
    }
    await loadData();
  }, []); // Empty deps array since loadData doesn't change

  // Assignment management functions
  const addAssignment = async (assignment: Assignment) => {
    try {
      const response = await fetch(`${API_BASE}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignment)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create assignment');
      }
      
      const newAssignment = await response.json();
      // Map _id to id for consistency
      const mappedAssignment = {
        ...newAssignment,
        id: newAssignment._id || newAssignment.id
      };
      setAssignments(prev => [...prev, mappedAssignment]);
    } catch (error) {
      console.error('Error adding assignment:', error);
      throw error;
    }
  };

  const updateAssignment = async (id: string, assignment: Partial<Assignment>) => {
    try {
      const response = await fetch(`${API_BASE}/assignments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignment)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update assignment');
      }
      
      setAssignments(prev => prev.map(a => {
        const aId = a._id || a.id;
        return aId === id ? { ...a, ...assignment } : a;
      }));
    } catch (error) {
      console.error('Error updating assignment:', error);
      throw error;
    }
  };

  const deleteAssignment = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/assignments/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete assignment');
      }
      
      // Update local state immediately for instant UI feedback
      setAssignments(prev => prev.filter(a => {
        const aId = a._id || a.id;
        return aId !== id;
      }));
      
      console.log('✅ Assignment deleted successfully. Local state updated.');
    } catch (error) {
      console.error('Error deleting assignment:', error);
      throw error;
    }
  };

  const getStudentAssignments = (studentId: string): Assignment[] => {
    if (!studentId) return [];
    
    // Normalize studentId to string for comparison
    const normalizedStudentId = String(studentId);
    
    return assignments.filter(a => {
      // Check both studentId formats (string and _id)
      const assignmentStudentId = a.studentId || (a as any)._id?.studentId;
      return String(assignmentStudentId) === normalizedStudentId ||
             String(assignmentStudentId) === String(studentId) ||
             assignmentStudentId === studentId ||
             assignmentStudentId === normalizedStudentId;
    });
  };

  // New Ticket System Functions (sabq/sabqi/manzil workflow)
  const createTicket = async (ticket: Partial<Ticket>): Promise<Ticket> => {
    try {
      const response = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket)
      });
      if (!response.ok) {
        throw new Error('Failed to create ticket');
      }
      const newTicket = await response.json();
      const mappedTicket = {
        ...newTicket,
        id: newTicket._id || newTicket.id,
        createdAt: newTicket.createdAt ? new Date(newTicket.createdAt) : new Date(),
        updatedAt: newTicket.updatedAt ? new Date(newTicket.updatedAt) : new Date()
      };
      setRecitationTickets(prev => [...prev, mappedTicket]);
      await refreshData();
      return mappedTicket;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  };

  const updateRecitationTicket = async (id: string, ticket: Partial<Ticket>): Promise<Ticket> => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket)
      });
      if (!response.ok) {
        throw new Error('Failed to update ticket');
      }
      const updatedTicket = await response.json();
      const mappedTicket = {
        ...updatedTicket,
        id: updatedTicket._id || updatedTicket.id,
        createdAt: updatedTicket.createdAt ? new Date(updatedTicket.createdAt) : new Date(),
        updatedAt: updatedTicket.updatedAt ? new Date(updatedTicket.updatedAt) : new Date()
      };
      setRecitationTickets(prev => prev.map(t => t.id === id ? mappedTicket : t));
      await refreshData();
      return mappedTicket;
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  };

  const startTicket = async (id: string): Promise<Ticket> => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${id}/start`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Failed to start ticket');
      }
      const ticket = await response.json();
      const mappedTicket = {
        ...ticket,
        id: ticket._id || ticket.id,
        startedAt: ticket.startedAt ? new Date(ticket.startedAt) : undefined
      };
      setRecitationTickets(prev => prev.map(t => t.id === id ? mappedTicket : t));
      return mappedTicket;
    } catch (error) {
      console.error('Error starting ticket:', error);
      throw error;
    }
  };

  const submitTicket = async (
    id: string, 
    data: { 
      teacherComment: string; 
      mistakes: any[];
      recordingUrl?: string;
      recordingFormat?: string;
      recordingDuration?: number;
      recordingStartedAt?: string;
      recordingStoppedAt?: string;
    }
  ): Promise<Ticket> => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error('Failed to submit ticket');
      }
      const ticket = await response.json();
      const mappedTicket = {
        ...ticket,
        id: ticket._id || ticket.id,
        submittedAt: ticket.submittedAt ? new Date(ticket.submittedAt) : undefined
      };
      setRecitationTickets(prev => prev.map(t => t.id === id ? mappedTicket : t));
      await refreshData();
      return mappedTicket;
    } catch (error) {
      console.error('Error submitting ticket:', error);
      throw error;
    }
  };

  const approveAndSendTicket = async (
    id: string, 
    assignmentId: string,
    recordingData?: {
      recordingUrl?: string;
      recordingFormat?: string;
      recordingDuration?: number;
      recordingStartedAt?: string;
      recordingStoppedAt?: string;
    }
  ): Promise<any> => {
    try {
      console.log('📤 Sending approve request for ticket:', id, 'with recording:', !!recordingData);
      const response = await fetch(`${API_BASE}/tickets/${id}/approve-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assignmentId,
          ...(recordingData && {
            recordingUrl: recordingData.recordingUrl,
            recordingFormat: recordingData.recordingFormat,
            recordingDuration: recordingData.recordingDuration,
            recordingStartedAt: recordingData.recordingStartedAt,
            recordingStoppedAt: recordingData.recordingStoppedAt
          })
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        throw new Error(`Failed to approve and send ticket: ${errorText}`);
      }
      const result = await response.json();
      console.log('✅ Approval response:', result);
      console.log('✅ Response ticket:', result.ticket);
      console.log('✅ Response assignment:', result.assignment);
      
      const ticket = result.ticket || result;
      console.log('✅ Ticket from response:', {
        id: ticket._id || ticket.id,
        sentToAssignmentId: ticket.sentToAssignmentId,
        status: ticket.status
      });
      
      const mappedTicket = {
        ...ticket,
        id: ticket._id || ticket.id,
        approvedAt: ticket.approvedAt ? new Date(ticket.approvedAt) : undefined,
        sentAt: ticket.sentAt ? new Date(ticket.sentAt) : undefined,
        sentToAssignmentId: ticket.sentToAssignmentId // Ensure this is included
      };
      
      console.log('✅ Mapped ticket before update:', {
        id: mappedTicket.id,
        sentToAssignmentId: mappedTicket.sentToAssignmentId,
        status: mappedTicket.status
      });
      
      setRecitationTickets(prev => {
        const updated = prev.map(t => t.id === id ? mappedTicket : t);
        console.log('✅ Updated tickets array. Ticket with ID', id, 'now has:', 
          updated.find(t => t.id === id)?.sentToAssignmentId || 'N/A');
        return updated;
      });
      await refreshData();
      
      // Return both ticket and assignment info
      return {
        ...mappedTicket,
        assignment: result.assignment
      };
    } catch (error) {
      console.error('Error approving ticket:', error);
      throw error;
    }
  };

  const reassignTicket = async (id: string, teacherId: string, teacherName: string, reason?: string): Promise<Ticket> => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${id}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, teacherName, reason })
      });
      if (!response.ok) {
        throw new Error('Failed to reassign ticket');
      }
      const ticket = await response.json();
      const mappedTicket = {
        ...ticket,
        id: ticket._id || ticket.id,
        reassignedAt: ticket.reassignedAt ? new Date(ticket.reassignedAt) : undefined
      };
      setRecitationTickets(prev => prev.map(t => t.id === id ? mappedTicket : t));
      await refreshData();
      return mappedTicket;
    } catch (error) {
      console.error('Error reassigning ticket:', error);
      throw error;
    }
  };

  const getTeacherTickets = (teacherId: string): Ticket[] => {
    // Match by assignedTeacherId or reassignedToTeacherId (for reassigned tickets)
    return recitationTickets.filter(t => {
      const matchesTeacher = 
        t.assignedTeacherId === teacherId || 
        t.reassignedToTeacherId === teacherId;
      const validStatus = ['pending', 'in_progress', 'reassigned'].includes(t.status);
      return matchesTeacher && validStatus;
    });
  };

  const getPendingReviewTickets = (): Ticket[] => {
    return recitationTickets.filter(t => t.status === 'submitted');
  };

  const getPreviousReports = async (studentId: string, type: 'sabqi' | 'manzil'): Promise<Ticket[]> => {
    try {
      const response = await fetch(`${API_BASE}/tickets/previous-reports/${studentId}/${type}`);
      if (!response.ok) {
        throw new Error('Failed to get previous reports');
      }
      const reports = await response.json();
      return reports.map((r: any) => ({
        ...r,
        id: r._id || r.id,
        sentAt: r.sentAt ? new Date(r.sentAt) : undefined
      }));
    } catch (error) {
      console.error('Error getting previous reports:', error);
      return [];
    }
  };

  // Recitation Review Functions
  const addRecitationReview = async (review: RecitationReview) => {
    try {
      const response = await fetch(`${API_BASE}/recitation-reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review)
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit recitation review');
      }
      
      const newReview = await response.json();
      setRecitationReviews(prev => [...prev, newReview]);
      
      // Refresh notifications after new review
      const notificationsResponse = await fetch(`${API_BASE}/admin-notifications`);
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setAdminNotifications(notificationsData);
      }
      
      await refreshData(); // Refresh all data
    } catch (error) {
      console.error('Error submitting recitation review:', error);
      throw error;
    }
  };

  const updateRecitationReview = async (id: string, review: Partial<RecitationReview>) => {
    try {
      const response = await fetch(`${API_BASE}/recitation-reviews/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update recitation review');
      }
      
      const updatedReview = await response.json();
      setRecitationReviews(prev => prev.map(r => (r.id === id || r.id === updatedReview._id) ? updatedReview : r));
    } catch (error) {
      console.error('Error updating recitation review:', error);
      throw error;
    }
  };

  const convertRecitationReviewToAssignment = async (reviewId: string) => {
    try {
      const response = await fetch(`${API_BASE}/recitation-reviews/${reviewId}/convert-to-assignment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to convert recitation review to assignment');
      }
      
      const assignment = await response.json();
      setAssignments(prev => [...prev, assignment]);
      
      // Update review status
      await updateRecitationReview(reviewId, { 
        status: 'converted_to_assignment',
        convertedToAssignmentId: assignment._id || assignment.id
      });
      
      // Refresh notifications and data
      const notificationsResponse = await fetch(`${API_BASE}/admin-notifications`);
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setAdminNotifications(notificationsData);
      }
      
      await refreshData();
      
      return assignment;
    } catch (error) {
      console.error('Error converting recitation review:', error);
      throw error;
    }
  };

  // Notification Functions
  const refreshNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin-notifications`);
      if (response.ok) {
        const notifications = await response.json();
        setAdminNotifications(notifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin-notifications/${notificationId}/read`, {
        method: 'PUT'
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      const updatedNotification = await response.json();
      setAdminNotifications(prev => prev.map(n => 
        (n.id === notificationId || n.id === updatedNotification._id) ? updatedNotification : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin-notifications/read-all`, {
        method: 'PUT'
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      
      await refreshNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  };

  // Ticket Functions
  const addTicket = async (ticket: AssignmentTicket) => {
    try {
      const response = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create ticket');
      }
      
      const newTicket = await response.json();
      // Map MongoDB _id to id for consistency
      const mappedTicket = {
        ...newTicket,
        id: newTicket._id || newTicket.id,
        createdAt: newTicket.createdAt ? new Date(newTicket.createdAt) : new Date(),
        updatedAt: newTicket.updatedAt ? new Date(newTicket.updatedAt) : new Date()
      };
      setTickets(prev => [...prev, mappedTicket]);
      await refreshData();
      return mappedTicket;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  };

  const updateTicket = async (id: string, ticket: Partial<AssignmentTicket>) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update ticket');
      }
      
      const updatedTicket = await response.json();
      // Map MongoDB _id to id for consistency
      const mappedTicket = {
        ...updatedTicket,
        id: updatedTicket._id || updatedTicket.id,
        createdAt: updatedTicket.createdAt ? new Date(updatedTicket.createdAt) : new Date(),
        updatedAt: updatedTicket.updatedAt ? new Date(updatedTicket.updatedAt) : new Date(),
        reviewedAt: updatedTicket.reviewedAt ? new Date(updatedTicket.reviewedAt) : undefined,
        completedAt: updatedTicket.completedAt ? new Date(updatedTicket.completedAt) : undefined
      };
      setTickets(prev => prev.map(t => 
        (t.id === id || t.id === updatedTicket._id || (t as any)._id === updatedTicket._id) ? mappedTicket : t
      ));
      
      await refreshNotifications();
      await refreshData();
      
      return mappedTicket;
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  };

  const deleteTicket = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to delete ticket');
      }

      setRecitationTickets(prev => prev.filter(ticket => {
        const ticketId = ticket._id || ticket.id;
        return ticketId !== id;
      }));
      await refreshData();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      throw error;
    }
  };

  const fixMissingAssignmentIds = async (): Promise<{ fixed: number; total: number }> => {
    try {
      const response = await fetch(`${API_BASE}/tickets/fix-missing-assignment-ids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to fix missing assignment IDs');
      }

      const result = await response.json();
      // Don't call refreshData() here to avoid infinite loops
      // Instead, manually update the tickets that were fixed
      if (result.fixed > 0) {
        // Reload tickets only, not all data
        try {
          const ticketsResponse = await fetch(`${API_BASE}/tickets`);
          if (ticketsResponse.ok) {
            const ticketsData = await ticketsResponse.json();
            const mappedTickets = ticketsData
              .filter((t: any) => ['sabq', 'sabqi', 'manzil'].includes(t.type))
              .map((t: any) => ({
                ...t,
                id: t._id || t.id,
                createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
                updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date()
              }));
            setRecitationTickets(mappedTickets);
          }
        } catch (err) {
          console.error('Error reloading tickets after fix:', err);
        }
      }
      return result;
    } catch (error) {
      console.error('Error fixing missing assignment IDs:', error);
      throw error;
    }
  };

  const deleteTickets = async (ids: string[]) => {
    if (!Array.isArray(ids) || ids.length === 0) return;

    try {
      const response = await fetch(`${API_BASE}/tickets/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketIds: ids }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to delete tickets');
      }

      setTickets(prev => prev.filter(ticket => {
        const ticketId = ticket._id || ticket.id;
        return !ids.includes(ticketId);
      }));
    } catch (error) {
      console.error('Error deleting tickets:', error);
      throw error;
    }
  };

  const assignTicketToNextTeacher = async (
    ticketId: string,
    teacherId: string,
    teacherName: string,
    internalNote?: string
  ) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticketId}/assign-next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedTeacherId: teacherId,
          assignedTeacherName: teacherName,
          internalNote,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to assign ticket to next teacher');
      }
      
      const newTicket = await response.json();
      // Map MongoDB _id to id for consistency
      const mappedTicket = {
        ...newTicket,
        id: newTicket._id || newTicket.id,
        createdAt: newTicket.createdAt ? new Date(newTicket.createdAt) : new Date(),
        updatedAt: newTicket.updatedAt ? new Date(newTicket.updatedAt) : new Date()
      };
      setTickets(prev => [...prev, mappedTicket]);
      await refreshData();
      return mappedTicket;
    } catch (error) {
      console.error('Error assigning ticket to next teacher:', error);
      throw error;
    }
  };

  const approveTicket = async (ticketId: string, reviewedBy: string) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticketId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewedBy })
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve ticket');
      }
      
      const result = await response.json();
      await refreshData();
      return result;
    } catch (error) {
      console.error('Error approving ticket:', error);
      throw error;
    }
  };

  const assignTicketToNext = async (
    ticketId: string,
    teacherId: string,
    teacherName: string,
    internalNote?: string
  ) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticketId}/assign-next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assignedTeacherId: teacherId,
          assignedTeacherName: teacherName,
          internalNote,
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to assign ticket to next teacher');
      }
      
      const result = await response.json();
      await refreshData();
      return result;
    } catch (error) {
      console.error('Error assigning ticket to next teacher:', error);
      throw error;
    }
  };

  const approveAndAdvanceTicket = async (ticketId: string, reviewedBy: string, nextTeacherId?: string, nextTeacherName?: string) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticketId}/approve-and-advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reviewedBy,
          nextTeacherId,
          nextTeacherName
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve and advance ticket');
      }
      
      const result = await response.json();
      await refreshData();
      return result;
    } catch (error) {
      console.error('Error approving and advancing ticket:', error);
      throw error;
    }
  };

  const createFinalizeTicket = async (ticketId: string, reviewedBy?: string) => {
    try {
      const response = await fetchWithTimeout(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/tickets/${ticketId}/create-finalize`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewedBy: reviewedBy || '' })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create finalize ticket' }));
        throw new Error(errorData.error || 'Failed to create finalize ticket');
      }

      const data = await response.json();
      await loadData(); // Refresh all data
      return data;
    } catch (error: any) {
      console.error('Error creating finalize ticket:', error);
      throw error;
    }
  };

  const skipTicketToFinalize = async (ticketId: string, reviewedBy?: string) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticketId}/skip-to-finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewedBy })
      });

      if (!response.ok) {
        throw new Error('Failed to fast-forward ticket to finalize');
      }

      const result = await response.json();
      await refreshData();
      return result;
    } catch (error) {
      console.error('Error skipping ticket to finalize:', error);
      throw error;
    }
  };

  const finalizeTicket = async (
    ticketId: string,
    data: {
      finalReport: string;
      homework: string;
      homeworkLink?: string;
      reviewedBy: string;
      classworkSections?: ClassworkSection[];
      classworkSummary?: string;
      homeworkSummary?: string;
      classworkType?: string;
    }
  ) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticketId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to finalize ticket');
      }
      
      const result = await response.json();
      const enhancedTicket = {
        ...result.ticket,
        classworkSections: data.classworkSections ?? result.ticket?.classworkSections,
        classworkSummary: data.classworkSummary ?? result.ticket?.classworkSummary,
        homeworkSummary: data.homeworkSummary ?? result.ticket?.homeworkSummary,
      };
      const enhancedAssignment = {
        ...result.assignment,
        classworkSections: data.classworkSections ?? result.assignment?.classworkSections ?? [],
        classworkSummary: data.classworkSummary ?? result.assignment?.classworkSummary,
        homeworkSummary: data.homeworkSummary ?? result.assignment?.homeworkSummary,
        classworkType: data.classworkType ?? result.assignment?.classworkType,
      };
      
      // Update ticket and add assignment
      setTickets(prev => prev.map(t => 
        t.id === ticketId || t.id === result.ticket._id ? enhancedTicket : t
      ));
      setAssignments(prev => [...prev, enhancedAssignment]);
      
      await refreshData();
      return {
        ...result,
        ticket: enhancedTicket,
        assignment: enhancedAssignment,
      };
    } catch (error) {
      console.error('Error finalizing ticket:', error);
      throw error;
    }
  };

  // Get student's personal Mushaf (all historical mistakes)
  const getStudentPersonalMushaf = async (studentId: string) => {
    try {
      const response = await fetch(`${API_BASE}/students/${studentId}/personal-mushaf`);
      if (!response.ok) {
        throw new Error('Failed to fetch personal Mushaf');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching personal Mushaf:', error);
      return { studentId, studentName: '', mistakes: [] };
    }
  };

  // Get student's personal Mushaf mistakes filtered by page/surah/ayah
  const getStudentPersonalMushafFiltered = async (studentId: string, filters?: { page?: number; surah?: number; ayah?: number }) => {
    try {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.surah) params.append('surah', filters.surah.toString());
      if (filters?.ayah) params.append('ayah', filters.ayah.toString());
      
      const url = `${API_BASE}/students/${studentId}/personal-mushaf/filter${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch filtered personal Mushaf');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching filtered personal Mushaf:', error);
      return { mistakes: [] };
    }
  };

  const createListeningSession = async (payload: ListeningSessionStartPayload): Promise<ListeningSession> => {
    try {
      const response = await fetch(`${API_BASE}/listening-sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to start listening session');
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting listening session:', error);
      throw error;
    }
  };

  const updateListeningSession = async (
    sessionIdOrTicketId: string,
    payload: ListeningSessionUpdatePayload
  ): Promise<ListeningSession> => {
    try {
      const response = await fetch(
        `${API_BASE}/listening-sessions/${encodeURIComponent(sessionIdOrTicketId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload || {})
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update listening session');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating listening session:', error);
      throw error;
    }
  };

  const endListeningSession = async (
    sessionIdOrTicketId: string,
    payload?: ListeningSessionEndPayload
  ): Promise<ListeningSession> => {
    try {
      const response = await fetch(
        `${API_BASE}/listening-sessions/${encodeURIComponent(sessionIdOrTicketId)}/end`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload || {})
        }
      );

      if (!response.ok) {
        throw new Error('Failed to end listening session');
      }

      return await response.json();
    } catch (error) {
      console.error('Error ending listening session:', error);
      throw error;
    }
  };

  const value: BackendDataContextType = {
    students,
    teachers,
    admins,
    addStudent,
    addTeacher,
    addAdmin,
    updateStudent,
  updateStudentRecitation,
    updateTeacher,
    updateAdmin,
    deleteStudent,
    deleteTeacher,
    deleteAdmin,
    getStudentsByTeacher,
    getTeacherById,
    getStudentByEmail,
    loading,
    loadingStep,
    error,
    refreshData,
    assignments,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    getStudentAssignments,
    recitationTickets,
    createTicket,
    updateRecitationTicket,
    startTicket,
    submitTicket,
    approveAndSendTicket,
    reassignTicket,
    getTeacherTickets,
    getPendingReviewTickets,
    getPreviousReports,
    recitationReviews,
    addRecitationReview,
    updateRecitationReview,
    convertRecitationReviewToAssignment,
    adminNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    refreshNotifications,
    tickets,
    addTicket,
    updateTicket,
    assignTicketToNextTeacher,
    approveTicket,
    assignTicketToNext,
    approveAndAdvanceTicket,
    skipTicketToFinalize,
    createFinalizeTicket,
    finalizeTicket,
    deleteTicket,
    deleteTickets,
    fixMissingAssignmentIds,
    getStudentPersonalMushaf,
    getStudentPersonalMushafFiltered,
    createListeningSession,
    updateListeningSession,
    endListeningSession
  };

  return (
    <BackendDataContext.Provider value={value}>
      {children}
    </BackendDataContext.Provider>
  );
};
