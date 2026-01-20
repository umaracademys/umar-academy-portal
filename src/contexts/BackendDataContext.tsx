import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import {
  Student,
  Teacher,
  Admin,
  RecitationReview,
  AdminNotification,
  TeacherNotification,
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
import { MushafMistake } from '@umar-academy/mushaf';
import { isDeveloperAccount, maskStudents, maskTeachers, maskUser } from '../utils/dataMasking';
import { dataCache, ASSIGNMENTS_CACHE_DURATION } from '../utils/dataCache';
import { useAuth } from './AuthContext';
import { useLocation } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

interface BackendDataContextType {
  students: Student[];
  teachers: Teacher[];
  admins: Admin[];
  addStudent: (student: Student) => Promise<void>;
  addTeacher: (teacher: Teacher) => Promise<Teacher>;
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
  getStudentByIdentity: (email?: string, userId?: string) => Student | undefined;
  loading: boolean;
  loadingStep: string;
  error: string | null;
  refreshData: () => Promise<void>;
  refreshDataLight: () => Promise<void>; // Lightweight refresh - only critical data
  refreshStudentsAndTeachers: () => Promise<void>; // Ultra-light refresh - only students and teachers
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
  // Teacher Notifications
  teacherNotifications: TeacherNotification[];
  markTeacherNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllTeacherNotificationsAsRead: () => Promise<void>;
  refreshTeacherNotifications: () => Promise<void>;
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
  addMistakeToPersonalMushaf: (studentId: string, mistake: Omit<MushafMistake, 'id' | 'timestamp'>, markedBy?: string, markedByName?: string) => Promise<any>;
  // Listening sessions
  createListeningSession: (payload: ListeningSessionStartPayload) => Promise<ListeningSession>;
  updateListeningSession: (sessionIdOrTicketId: string, payload: ListeningSessionUpdatePayload) => Promise<ListeningSession>;
  endListeningSession: (sessionIdOrTicketId: string, payload?: ListeningSessionEndPayload) => Promise<ListeningSession>;
  // Teacher Pair management
  getTeacherPairs: () => Promise<any[]>;
  getTeacherPair: (id: string) => Promise<any>;
  createTeacherPair: (pair: any) => Promise<any>;
  updateTeacherPair: (id: string, pair: any) => Promise<any>;
  deleteTeacherPair: (id: string) => Promise<void>;
  getPairStudents: (filters?: { pair?: string; student?: string; status?: string }) => Promise<any[]>;
  getPairStudent: (id: string) => Promise<any>;
  createPairStudent: (pairStudent: any) => Promise<any>;
  updatePairStudent: (id: string, pairStudent: any) => Promise<any>;
  deletePairStudent: (id: string) => Promise<void>;
  getPairDailyReports: (filters?: { pair?: string; student?: string; teacher?: string; date?: string }) => Promise<any[]>;
  getPairDailyReport: (id: string) => Promise<any>;
  createPairDailyReport: (report: any) => Promise<any>;
  updatePairDailyReport: (id: string, report: any) => Promise<any>;
  deletePairDailyReport: (id: string) => Promise<void>;
  // Pair Teacher Messages
  getPairTeacherMessages: (filters?: { pair?: string; teacherId?: string; student?: string; unreadOnly?: boolean; adminView?: string }) => Promise<any[]>;
  getPairTeacherMessage: (id: string) => Promise<any>;
  createPairTeacherMessage: (message: { pair: string; fromTeacher: string; toTeacher: string; student?: string; message: string; files?: Array<{ name: string; url: string; type: string; size?: number }> }) => Promise<any>;
  markPairTeacherMessageAsRead: (id: string) => Promise<any>;
  markPairTeacherMessagesAsRead: (messageIds: string[], teacherId: string) => Promise<any>;
  // Teacher-Student Messaging
  getTeacherStudentMessages: (filters?: { teacherId?: string; studentId?: string; unreadOnly?: boolean; adminView?: string }) => Promise<any[]>;
  getTeacherStudentMessage: (id: string) => Promise<any>;
  createTeacherStudentMessage: (message: { fromTeacher?: string; toStudent?: string; fromStudent?: string; toTeacher?: string; message: string; attachments?: Array<{ filename: string; url: string; mimetype: string; size: number }>; adminInitiated?: boolean; adminId?: string }) => Promise<any>;
  markTeacherStudentMessageAsRead: (id: string) => Promise<any>;
  markTeacherStudentMessagesAsRead: (messageIds: string[], teacherId?: string, studentId?: string) => Promise<any>;
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
const API_BASE_RAW = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001';
const API_BASE = API_BASE_RAW.endsWith('/api') ? API_BASE_RAW : `${API_BASE_RAW}/api`;

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

// Helper function to normalize IDs (handles ObjectId, strings, etc.)
const normalizeId = (id: any): string => {
  if (!id) return '';
  // Handle ObjectId objects (MongoDB) - they have a toString method
  if (id && typeof id === 'object' && id.toString && typeof id.toString === 'function') {
    const str = id.toString();
    // Check if it's an ObjectId string (24 hex characters)
    if (/^[0-9a-fA-F]{24}$/.test(str)) {
      return str;
    }
    // If toString() returns "[object Object]", it's not a valid ID - try to extract from common properties
    if (str === '[object Object]') {
      // Try to get the actual ID from common MongoDB ObjectId properties
      if (id._str) return String(id._str);
      if (id.id) return normalizeId(id.id);
      if (id.toString && id.toString !== Object.prototype.toString) {
        // Already tried toString, return empty to indicate invalid
        return '';
      }
      return '';
    }
    // If it's a valid-looking string (not "[object Object]"), return it trimmed
    return str.trim();
  }
  // Handle strings
  if (typeof id === 'string') {
    return id.trim();
  }
  // Fallback: convert to string, but filter out "[object Object]"
  const str = String(id);
  if (str === '[object Object]') {
    return '';
  }
  return str.trim();
};

export const BackendDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: currentUser, logout } = useAuth(); // Get current user and logout from AuthContext
  const location = useLocation();
  const socket = useSocket(); // Get socket connection
  
  // Route-based data requirements - only load what each page needs
  // This dramatically improves performance by skipping unnecessary API calls
  const getRequiredData = (pathname: string): {
    needsAssignments: boolean;
    needsTickets: boolean;
    needsNotifications: boolean;
    needsReviews: boolean;
    needsOnlyStudentsTeachers: boolean; // For teacher-student-assignment page
  } => {
    // Normalize pathname (remove trailing slash, query params, hash)
    const normalizedPath = pathname.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
    const isDashboard = normalizedPath === '/dashboard';
    const isTeacherStudentAssignment = normalizedPath === '/teacher-student-assignment';
    
    // OPTIMIZATION: teacher-student-assignment only needs students and teachers
    const needsOnlyStudentsTeachers = isTeacherStudentAssignment;
    
    // Pages that need assignments (assignment management, student assignments, dashboards)
    const needsAssignments = 
      !needsOnlyStudentsTeachers && (
        normalizedPath.includes('/assignments') ||
        normalizedPath.includes('/student/assignments') ||
        normalizedPath.includes('/student/dashboard') ||
        normalizedPath.includes('/student') ||
        isDashboard
      );
    
    // Pages that need tickets (dashboards only for now)
    const needsTickets = isDashboard && !needsOnlyStudentsTeachers;
    
    // Pages that need notifications (dashboards only)
    const needsNotifications = isDashboard && !needsOnlyStudentsTeachers;
    
    // Pages that need reviews (dashboards only)
    const needsReviews = isDashboard && !needsOnlyStudentsTeachers;
    
    return { needsAssignments, needsTickets, needsNotifications, needsReviews, needsOnlyStudentsTeachers };
  };
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [recitationReviews, setRecitationReviews] = useState<RecitationReview[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [teacherNotifications, setTeacherNotifications] = useState<TeacherNotification[]>([]);
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
      // Only log timeout warnings in development mode
      if (import.meta.env.DEV) {
        console.warn(`⏱️ Request timeout for ${url} after ${timeout}ms`);
      }
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
      
      // Phase 5: Check for authentication errors (401/403) and auto-logout
      if (!response.ok && (response.status === 401 || response.status === 403)) {
        try {
          const errorData = await response.clone().json();
          // Auto-logout on authentication failures
          if (errorData.code === 'PERMISSIONS_OUTDATED' || 
              errorData.error?.includes('token') || 
              errorData.error?.includes('Access token required') ||
              errorData.error?.includes('Invalid or expired token')) {
            console.log('🔄 Authentication failed - logging out user:', errorData.error);
            // Auto logout user
            logout();
            // Return error response so caller can handle it
            return response;
          }
        } catch (e) {
          // Not JSON or parse error - might still be auth error, try logout anyway
          if (response.status === 401) {
            console.log('🔄 401 Unauthorized - logging out user');
            logout();
          }
        }
      }
      
      return response;
    } catch (error: any) {
      clearTimeout(id);
      // Only log errors in development mode, and skip AbortError (timeout) messages
      if (import.meta.env.DEV && error.name !== 'AbortError') {
        console.error(`❌ Error fetching ${url}:`, error?.message || error);
      }
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        // Silently handle timeout - don't throw error, just return null or handle gracefully
        throw new Error(`Request timeout after ${timeout}ms for ${url}`);
      }
      throw error;
    }
  };

  // Load data from backend API - wrapped in useCallback to prevent recreation
  // OPTIMIZED: Progressive loading with caching for faster initial render
  const loadData = useCallback(async (useCache = true) => {
    // Don't load data if user is not logged in
    if (!currentUser) {
      if (import.meta.env.DEV) {
        console.log('⏸️ loadData skipped - no user logged in');
      }
      setLoading(false);
      isLoadingRef.current = false;
      return;
    }
    
    // Prevent concurrent calls
    if (isLoadingRef.current) {
      if (import.meta.env.DEV) {
        console.log('⏸️ Data load already in progress, skipping...');
      }
      return;
    }
    
    const startTime = Date.now();
    
    // Get current route to determine what data is needed
    const currentPath = location.pathname;
    const routeData = getRequiredData(currentPath);
    const { needsAssignments, needsTickets, needsNotifications, needsReviews, needsOnlyStudentsTeachers } = routeData;
    
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
      
      // PHASE 1: Load critical data first (users, teachers, students) - show UI immediately
      setLoadingStep('Loading essential data...');
      if (import.meta.env.DEV) {
        console.log('🚀 Phase 1: Loading critical data...', new Date().toISOString());
        if (routeData.needsOnlyStudentsTeachers) {
          console.log('⚡ OPTIMIZED: Loading only students and teachers for teacher-student-assignment page');
        }
      }

      // OPTIMIZED: For students, skip loading unnecessary data (teachers, all users)
      const isStudentUser = currentUser?.role === 'student';
      
      // OPTIMIZED: For teacher-student-assignment page, skip loading admins, assignments, tickets, etc.
      const isTeacherStudentAssignmentPage = routeData.needsOnlyStudentsTeachers;
      
      // Try to load from cache first for instant UI
      const cachedUsers = useCache ? dataCache.get<any[]>('users') : null;
      // 🔍 DIAGNOSTIC: Force fresh fetch to see what API actually returns
      // Only enabled in development for debugging (automatically disabled in production)
      const FORCE_FRESH_FETCH = import.meta.env.DEV && false; // Change to true only when debugging cache issues
      if (FORCE_FRESH_FETCH && import.meta.env.DEV) {
        console.log('🔍 DIAGNOSTIC - FORCING FRESH FETCH (cache bypassed)');
        dataCache.delete('students'); // Clear cache to force fresh fetch
        dataCache.delete('teachers'); // Also clear teachers cache
        console.log('🔍 DIAGNOSTIC - Cache cleared. Checking cache state:', {
          studentsInCache: dataCache.get<any[]>('students')?.length || 0,
          teachersInCache: dataCache.get<any[]>('teachers')?.length || 0
        });
      }
      const cachedStudents = (useCache && !FORCE_FRESH_FETCH) ? dataCache.get<any[]>('students') : null;
      const cachedTeachers = (useCache && !FORCE_FRESH_FETCH) ? dataCache.get<any[]>('teachers') : null;
      
      // 🔍 DIAGNOSTIC: Log cache state
      if (import.meta.env.DEV) {
        console.log('🔍 DIAGNOSTIC - Cache state check:', {
          useCache,
          FORCE_FRESH_FETCH,
          cachedStudents: cachedStudents ? cachedStudents.length : null,
          cachedTeachers: cachedTeachers ? cachedTeachers.length : null,
          willUseCache: !!(cachedTeachers && cachedStudents && !FORCE_FRESH_FETCH)
        });
      }

      let users: any[] = [];
      let teacherRecords: any[] = [];
      let studentRecords: any[] = [];

      // OPTIMIZED: For students, skip users/teachers loading (not needed)
      // OPTIMIZED: For teacher-student-assignment page, skip users/admins (only need students/teachers)
      if (!isStudentUser && !isTeacherStudentAssignmentPage) {
        // Load users and teachers in parallel - teachers needed for user processing
        setLoadingStep('Loading users and teachers...');
        
        // Check cache first
        const cachedTeachers = dataCache.get('teachers') as any[] | null;
        if (cachedUsers && cachedTeachers) {
          console.log('⚡ Using cached users and teachers');
          users = cachedUsers;
          teacherRecords = cachedTeachers;
        } else {
          // Load users and teachers in parallel
          const [usersResponse, teachersResponse] = await Promise.allSettled([
            fetchWithTimeout(`${API_BASE}/users`, {}, 3000, true), // ✅ Require auth
            fetchWithTimeout(`${API_BASE}/teachers`, {}, 3000, true) // ✅ Require auth
          ]);
          
          if (usersResponse.status === 'fulfilled' && usersResponse.value.ok) {
            users = await usersResponse.value.json();
          if (import.meta.env.DEV) {
              console.log('👥 Users loaded from backend:', users.length);
          }
            dataCache.set('users', users);
          } else {
            throw new Error(`Failed to fetch users: ${usersResponse.status}`);
          }
          
          if (teachersResponse.status === 'fulfilled' && teachersResponse.value.ok) {
            teacherRecords = await teachersResponse.value.json();
          if (import.meta.env.DEV) {
              console.log('👨‍🏫 Teacher records loaded:', teacherRecords.length);
            }
            dataCache.set('teachers', teacherRecords);
          } else {
            console.warn('⚠️ Failed to fetch teachers, continuing without them');
            teacherRecords = [];
          }
        }
        
        // 🔍 FIX: Load students for admin/teacher users (not just teacher-student-assignment page)
        setLoadingStep('Loading students...');
        if (FORCE_FRESH_FETCH || !cachedStudents) {
          if (FORCE_FRESH_FETCH && import.meta.env.DEV) {
            console.log('🔍 DIAGNOSTIC - Fetching students from API for admin/teacher user');
          }
          const studentsResponse = await fetchWithTimeout(`${API_BASE}/students`, {}, 3000, true);
          if (studentsResponse.ok) {
            try {
              studentRecords = await studentsResponse.json();
              if (import.meta.env.DEV) {
                console.log('👨‍🎓 Students loaded for admin/teacher:', studentRecords.length);
                // 🔍 DIAGNOSTIC: Log sample student data from API
                if (studentRecords.length > 0) {
                  const sampleStudent = studentRecords[0];
                  console.log('🔍 DIAGNOSTIC - Sample student from API (admin/teacher path):', {
                    _id: sampleStudent._id,
                    id: sampleStudent.id,
                    fullName: sampleStudent.fullName,
                    email: sampleStudent.email,
                    program: sampleStudent.program,
                    assignedTeacher: sampleStudent.assignedTeacher,
                    assignedTeacherId: sampleStudent.assignedTeacherId,
                    assignedTeacherIds: sampleStudent.assignedTeacherIds,
                    assignedTeachers: sampleStudent.assignedTeachers,
                    tuitionFee: sampleStudent.tuitionFee,
                    contact: sampleStudent.contact,
                    parentName: sampleStudent.parentName,
                    userId: sampleStudent.userId
                  });
                }
              }
              dataCache.set('students', studentRecords);
            } catch (err) {
              console.error('❌ Error processing students:', err);
              studentRecords = [];
            }
          } else {
            console.error('❌ Failed to fetch students:', studentsResponse.status, studentsResponse.statusText);
            studentRecords = [];
          }
        } else {
          console.log('⚡ Using cached students for admin/teacher');
          studentRecords = cachedStudents;
        }
      } else if (isTeacherStudentAssignmentPage) {
        // For teacher-student-assignment, we still need users to merge with teachers
        // But we can load them in parallel with teachers/students
        if (cachedUsers) {
          users = cachedUsers;
        } else {
          // If no cached users, try to load them (but don't block on it)
          // This ensures teachers can be mapped properly
          try {
            const usersResponse = await fetchWithTimeout(`${API_BASE}/users`, {}, 3000, true);
            if (usersResponse.ok) {
              users = await usersResponse.json();
              if (import.meta.env.DEV) {
                console.log('👥 Users loaded for teacher-student-assignment:', users.length);
              }
              dataCache.set('users', users);
            }
          } catch (err) {
            console.warn('⚠️ Could not load users for teacher-student-assignment (non-critical):', err);
            // Continue without users - teachers will still be created from teacherRecords
          }
        }

        // Load teachers and students in parallel for faster loading
        setLoadingStep('Loading teachers and students...');
        
        // Check cache for teachers and students
        // 🔍 DIAGNOSTIC: Force fresh fetch even if cache exists
        if (FORCE_FRESH_FETCH) {
          console.log('🔍 DIAGNOSTIC - Bypassing cache, forcing fresh API fetch');
        } else if (cachedTeachers && cachedStudents) {
          console.log('⚡ Using cached teachers and students');
          teacherRecords = cachedTeachers;
          studentRecords = cachedStudents;
          // 🔍 DIAGNOSTIC: Log sample student from CACHE
          if (studentRecords.length > 0 && import.meta.env.DEV) {
            const sampleCached = studentRecords[0];
            console.log('🔍 DIAGNOSTIC - Sample student from CACHE:', {
              _id: sampleCached._id,
              id: sampleCached.id,
              fullName: sampleCached.fullName,
              email: sampleCached.email,
              program: sampleCached.program,
              assignedTeacher: sampleCached.assignedTeacher,
              assignedTeacherId: sampleCached.assignedTeacherId,
              assignedTeacherIds: sampleCached.assignedTeacherIds,
              assignedTeachers: sampleCached.assignedTeachers,
              tuitionFee: sampleCached.tuitionFee,
              contact: sampleCached.contact,
              parentName: sampleCached.parentName,
              userId: sampleCached.userId
            });
          }
        }
        
        // 🔍 DIAGNOSTIC: Always fetch fresh if FORCE_FRESH_FETCH is true
        if (FORCE_FRESH_FETCH || !cachedTeachers || !cachedStudents) {
          if (FORCE_FRESH_FETCH) {
            console.log('🔍 DIAGNOSTIC - Fetching fresh data from API (cache bypassed)');
          }
          const [teachersResponse, studentsResponse] = await Promise.allSettled([
            fetchWithTimeout(`${API_BASE}/teachers`, {}, 3000),
            fetchWithTimeout(`${API_BASE}/students`, {}, 3000, true)
          ]);

          // Process teachers
          if (teachersResponse.status === 'fulfilled' && teachersResponse.value.ok) {
            try {
              teacherRecords = await teachersResponse.value.json();
              // Production-safe logging
              console.log('👨‍🏫 Teacher records loaded:', teacherRecords.length);
              if (teacherRecords.length > 0) {
                // Log sample teacher record to see structure
                const sampleTeacher = teacherRecords[0];
                console.log('🔍 Sample teacher record from API:', {
                  _id: sampleTeacher._id,
                  id: sampleTeacher.id,
                  userId: sampleTeacher.userId?._id || sampleTeacher.userId,
                  fullName: sampleTeacher.fullName,
                  email: sampleTeacher.email,
                  has_id: !!sampleTeacher._id,
                  has_id_field: '_id' in sampleTeacher
                });
                
                // Check if any teacher records are missing _id
                const missingIds = teacherRecords.filter((tr: any) => !tr._id);
                if (missingIds.length > 0) {
                  console.warn('⚠️ Some teacher records are missing _id:', {
                    count: missingIds.length,
                    sample: missingIds.slice(0, 3).map((tr: any) => ({
                      email: tr.email,
                      fullName: tr.fullName,
                      id: tr.id,
                      userId: tr.userId?._id || tr.userId
                    }))
                  });
                }
              }
              dataCache.set('teachers', teacherRecords);
              // Merge teacher data with user data
              teacherRecords.forEach((teacher: any) => {
                const user = users.find((u: any) => 
                  u._id === teacher.userId?._id || 
                  u._id === teacher.userId ||
                  (teacher.userId && typeof teacher.userId === 'object' && teacher.userId._id === u._id)
                );
                if (user) {
                  user.teacherProfile = teacher;
                  if (import.meta.env.DEV) {
                    console.log('✅ Matched teacher record to user:', {
                      userEmail: user.email,
                      teacherId: teacher._id,
                      userId: user._id
                    });
                  }
                } else if (import.meta.env.DEV) {
                  console.warn('⚠️ Could not find user for teacher:', {
                    teacherId: teacher._id,
                    teacherEmail: teacher.email,
                    teacherUserId: teacher.userId?._id || teacher.userId,
                    availableUserIds: users.map((u: any) => u._id)
                  });
                }
              });
            } catch (err) {
              console.error('❌ Error processing teachers:', err);
            }
          }

          // Process students
          if (studentsResponse.status === 'fulfilled' && studentsResponse.value.ok) {
            try {
              studentRecords = await studentsResponse.value.json();
              if (import.meta.env.DEV) {
                console.log('👨‍🎓 Students loaded:', studentRecords.length);
              }
              // 🔍 DIAGNOSTIC: Log sample student data from API
              if (studentRecords.length > 0) {
                const sampleStudent = studentRecords[0];
                console.log('🔍 DIAGNOSTIC - Sample student from API:', {
                  _id: sampleStudent._id,
                  id: sampleStudent.id,
                  fullName: sampleStudent.fullName,
                  email: sampleStudent.email,
                  program: sampleStudent.program,
                  assignedTeacher: sampleStudent.assignedTeacher,
                  assignedTeacherId: sampleStudent.assignedTeacherId,
                  assignedTeacherIds: sampleStudent.assignedTeacherIds,
                  assignedTeachers: sampleStudent.assignedTeachers,
                  tuitionFee: sampleStudent.tuitionFee,
                  contact: sampleStudent.contact,
                  parentName: sampleStudent.parentName,
                  userId: sampleStudent.userId
                });
              }
              dataCache.set('students', studentRecords);
            } catch (err) {
              console.error('❌ Error processing students:', err);
              studentRecords = [];
            }
          }
        }
      } else {
        // STUDENT PORTAL: Load all students so student can find their own record
        // We need all students (not just filtered) to properly match by email or userId
        setLoadingStep('Loading your data...');
        
        if (FORCE_FRESH_FETCH || !cachedStudents) {
          const studentsResponse = await fetchWithTimeout(`${API_BASE}/students`, {}, 3000, true);
          if (studentsResponse.ok) {
            try {
              studentRecords = await studentsResponse.json();
              if (import.meta.env.DEV) {
                console.log('🎓 Students loaded for student user:', studentRecords.length);
              }
              // Cache all students for next time
              dataCache.set('students', studentRecords);
            } catch (err) {
              console.error('❌ Error processing students for student user:', err);
              studentRecords = cachedStudents || [];
            }
          } else {
            console.error('❌ Failed to fetch students for student user:', studentsResponse.status);
            studentRecords = cachedStudents || [];
          }
        } else {
          console.log('⚡ Using cached students for student user');
          studentRecords = cachedStudents;
        }
        
        // Students don't need users or teachers - set empty arrays
        users = [];
        teacherRecords = [];
      }
      
      // PHASE 1 COMPLETE - Critical data loaded, can show UI now
      // Set data immediately so UI can render (will be updated with full data below)
      // This allows UI to show instantly while we continue loading in background
      
      // ROUTE-BASED SELECTIVE LOADING: Only load data needed for current page
      // This dramatically improves performance by skipping unnecessary API calls
      const { needsAssignments, needsTickets, needsNotifications, needsReviews } = getRequiredData(location.pathname);
      
      if (import.meta.env.DEV) {
        console.log('🎯 Route-based data loading:', {
          pathname: location.pathname,
          needsAssignments,
          needsTickets,
          needsNotifications,
          needsReviews
        });
      }
      
      // Continue loading additional data in background (non-blocking)
      setLoadingStep('Loading additional data...');
      
      // ✅ STALE-WHILE-REVALIDATE: Serve cache immediately, fetch fresh data in background
      // This ensures fast initial load while keeping data up-to-date
      const cachedAssignments = useCache ? dataCache.get<any[]>('assignments') : null;
      if (cachedAssignments && cachedAssignments.length > 0 && needsAssignments) {
        console.log('⚡ Using cached assignments:', cachedAssignments.length, '- serving immediately, fetching fresh in background');
        
        // For students, filter cached assignments to only their own
        let filteredAssignments = cachedAssignments;
        if (isStudentUser && currentUser?.email) {
          // Find student ID from cached students
          const cachedStudents = dataCache.get<any[]>('students') || [];
          const currentStudent = cachedStudents.find((s: any) => s.email === currentUser.email);
          if (currentStudent?.id || currentStudent?._id) {
            const studentId = String(currentStudent.id || currentStudent._id);
            filteredAssignments = cachedAssignments.filter((a: any) => {
              const assignmentStudentId = String(a.studentId || a._id?.studentId || '');
              return assignmentStudentId === studentId;
            });
            console.log(`🎓 Filtered cached assignments for student: ${filteredAssignments.length} assignments`);
          }
        }
        
        const mappedAssignments = filteredAssignments.map((assignment: any) => ({
          ...assignment,
          id: assignment._id || assignment.id,
          studentId: normalizeId(assignment.studentId),
          createdAt: assignment.createdAt ? new Date(assignment.createdAt) : new Date(),
          updatedAt: assignment.updatedAt ? new Date(assignment.updatedAt) : new Date(),
        }));
        setAssignments(mappedAssignments);
      }

      // Only fetch data that's needed for current route
      // Use Promise.allSettled with proper response objects for skipped calls
      // For students, use authenticated endpoint /api/assignments/me
      const assignmentsEndpoint = isStudentUser ? `${API_BASE}/assignments/me` : `${API_BASE}/assignments?limit=500`;
      // OPTIMIZED: Timeout based on environment and user type
      // Increased timeout for MongoDB Atlas (cloud database) which may have network latency
      // Production may need longer timeout due to network latency and cold starts
      const isProduction = API_BASE_RAW.includes('render.com') || API_BASE_RAW.includes('onrender.com') || !import.meta.env.DEV;
      const assignmentsTimeout = isStudentUser 
        ? 5000  // Students: 5s (faster endpoint, filtered by student)
        : (isProduction ? 30000 : 20000); // Admin/Teacher: 30s in production, 20s in dev (increased for 458 assignments)
      // FIXED: Always require auth for assignments endpoint (backend now requires authenticateToken)
      // ✅ STALE-WHILE-REVALIDATE: Always fetch fresh assignments in background (even if cache exists)
      // This ensures new assignments appear quickly for all users
      const assignmentsPromise = needsAssignments // Always fetch, even if cache exists
        ? fetchWithTimeout(assignmentsEndpoint, {}, assignmentsTimeout, true).catch((error) => {
            console.error('❌ Failed to fetch assignments:', error);
            return { ok: false, json: async () => [], status: 0, statusText: String(error) } as any;
          })
        : Promise.resolve({ ok: false, skipped: true } as any);
      
      const reviewsPromise = needsReviews
        ? fetchWithTimeout(`${API_BASE}/recitation-reviews`, {}, 5000).catch(() => ({ ok: false, json: async () => [] } as any))
        : Promise.resolve({ ok: false, skipped: true } as any);
      
      const notificationsPromise = needsNotifications
        ? fetchWithTimeout(`${API_BASE}/admin-notifications`, {}, 5000).catch(() => ({ ok: false, json: async () => [] } as any))
        : Promise.resolve({ ok: false, skipped: true } as any);
      
      const ticketsPromise = needsTickets
        ? fetchWithTimeout(`${API_BASE}/tickets`, {}, 10000).catch(() => ({ ok: false, json: async () => [] } as any))
        : Promise.resolve({ ok: false, skipped: true } as any);

      const [assignmentsResponse, reviewsResponse, notificationsResponse, ticketsResponse] = await Promise.allSettled([
        assignmentsPromise,
        reviewsPromise,
        notificationsPromise,
        ticketsPromise
      ]);

      // Process assignments - skip if not needed for this route or already cached
      if (assignmentsResponse.status === 'fulfilled' && assignmentsResponse.value.ok && !assignmentsResponse.value.skipped) {
        try {
          const assignmentsResponseData = await assignmentsResponse.value.json();
          // ✅ Handle paginated response format: { assignments: [...], pagination: {...} }
          // ✅ Also support backward-compatible array format
          const assignmentsData = Array.isArray(assignmentsResponseData) 
            ? assignmentsResponseData 
            : (assignmentsResponseData.assignments || []);
          
          console.log(`📝 Assignments loaded from backend (${isStudentUser ? 'student' : 'admin/teacher'} endpoint):`, assignmentsData.length);
          if (assignmentsData.length === 0) {
            console.warn('⚠️ No assignments found in database. Check if assignments exist.');
            if (isStudentUser && import.meta.env.DEV) {
              console.log('   Student endpoint used:', assignmentsEndpoint);
              console.log('   Current user:', { role: currentUser?.role, email: currentUser?.email, userId: currentUser?.id });
            }
          }
          const mappedAssignments = assignmentsData.map((assignment: any) => {
            const normalizedStudentId = normalizeId(assignment.studentId);
            if (!normalizedStudentId && import.meta.env.DEV) {
              console.warn('⚠️ Assignment missing studentId:', {
                assignmentId: assignment._id || assignment.id,
                rawStudentId: assignment.studentId,
                assignment: assignment
              });
            }
            return {
              ...assignment,
              id: assignment._id || assignment.id,
              studentId: normalizedStudentId, // Normalize studentId
              createdAt: assignment.createdAt ? new Date(assignment.createdAt) : new Date(),
              updatedAt: assignment.updatedAt ? new Date(assignment.updatedAt) : new Date(),
              completedAt: assignment.completedAt ? new Date(assignment.completedAt) : undefined
            };
          });
          setAssignments(mappedAssignments);
          // Cache assignments for next time (use shorter duration for fresh data)
          dataCache.set('assignments', mappedAssignments, ASSIGNMENTS_CACHE_DURATION);
          console.log('✅ Mapped assignments:', mappedAssignments.length, 'assignments set');
          if (mappedAssignments.length > 0) {
            console.log('📝 Sample mapped assignment:', {
              id: mappedAssignments[0].id,
              studentId: mappedAssignments[0].studentId,
              status: mappedAssignments[0].status,
              sabqiCount: mappedAssignments[0].classwork?.sabqi?.length || 0,
              fromTicketId: mappedAssignments[0].fromTicketId
            });
          }
        } catch (err) {
          console.error('❌ Error processing assignments:', err);
          setAssignments([]);
        }
      } else if (assignmentsResponse.status === 'fulfilled' && assignmentsResponse.value.skipped) {
        // Assignments skipped for this route - this is expected, not an error
        if (import.meta.env.DEV) {
          console.log('⏭️ Assignments skipped for route:', location.pathname);
        }
      } else {
        // Log why assignments failed to load (only if it was actually attempted)
        if (assignmentsResponse.status === 'rejected') {
          console.error('❌ Assignments API call rejected:', assignmentsResponse.reason);
          if (needsAssignments) {
            setAssignments([]);
          }
        } else if (assignmentsResponse.status === 'fulfilled' && !assignmentsResponse.value.skipped) {
          const response = assignmentsResponse.value;
          console.error('❌ Assignments API call failed:', {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            url: `${API_BASE}/assignments`
          });
          // Only set empty if assignments were actually attempted but failed
          if (needsAssignments) {
            setAssignments([]);
          }
        }
      }

      // Process recitation reviews - skip if not needed for this route
      if (reviewsResponse.status === 'fulfilled' && reviewsResponse.value.ok && !reviewsResponse.value.skipped) {
        try {
          const reviewsData = await reviewsResponse.value.json();
          if (import.meta.env.DEV) {
            console.log('📖 Recitation reviews loaded:', reviewsData.length);
          }
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
        } catch (err) {
          console.error('❌ Error processing reviews:', err);
          setRecitationReviews([]);
        }
      } else {
        setRecitationReviews([]);
      }

      // Process notifications - skip if not needed for this route
      if (notificationsResponse.status === 'fulfilled' && notificationsResponse.value.ok && !notificationsResponse.value.skipped) {
        try {
          const notificationsData = await notificationsResponse.value.json();
          if (import.meta.env.DEV) {
            console.log('🔔 Admin notifications loaded:', notificationsData.length);
          }
          setAdminNotifications(notificationsData);
        } catch (err) {
          console.error('❌ Error processing notifications:', err);
          setAdminNotifications([]);
        }
      } else {
        setAdminNotifications([]);
      }

      // Process tickets - skip if not needed for this route
      if (ticketsResponse.status === 'fulfilled' && ticketsResponse.value.ok && !ticketsResponse.value.skipped) {
        try {
          const rawTicketsData = await ticketsResponse.value.json();
          // Handle paginated response: { tickets: [...], pagination: {...} } or direct array
          const ticketsData = Array.isArray(rawTicketsData) ? rawTicketsData : (rawTicketsData.tickets || []);
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
        } catch (err) {
          console.error('❌ Error processing tickets:', err);
          setTickets([]);
          setRecitationTickets([]);
        }
      } else {
        setTickets([]);
        setRecitationTickets([]);
      }

      // Student records already loaded above in parallel - use them here

      // Separate users by role and map to expected format
      // Use studentRecords directly if available, otherwise fall back to users
      let studentsData: any[] = [];
      
      if (studentRecords && studentRecords.length > 0) {
        // 🔍 DIAGNOSTIC: Log what we're about to map
        if (import.meta.env.DEV) {
          console.log('🔍 DIAGNOSTIC - About to map studentRecords:', {
            count: studentRecords.length,
            sampleRaw: {
              _id: studentRecords[0]?._id,
              id: studentRecords[0]?.id,
              fullName: studentRecords[0]?.fullName,
              program: studentRecords[0]?.program,
              assignedTeacher: studentRecords[0]?.assignedTeacher,
              assignedTeacherId: studentRecords[0]?.assignedTeacherId,
              assignedTeacherIds: studentRecords[0]?.assignedTeacherIds,
              tuitionFee: studentRecords[0]?.tuitionFee,
              contact: studentRecords[0]?.contact,
              parentName: studentRecords[0]?.parentName,
              userId: studentRecords[0]?.userId
            }
          });
        }
        // Use student records directly - they have all the student data
        let firstMappedLogged = false; // 🔍 DIAGNOSTIC: Track if we've logged first student
        studentsData = studentRecords.map((studentRecord: any, index: number) => {
          const userId = studentRecord.userId?._id || studentRecord.userId || studentRecord.userId?._id?.toString();
          // Find matching user if available
          const user = users.find((u: any) => 
            u._id?.toString() === userId?.toString() ||
            u._id === userId ||
            (studentRecord.email && u.email === studentRecord.email)
          ) || {};
          
          const mappedStudent = {
            // id should ALWAYS be the Student document _id (not User _id) to match assignment.studentId
            id: studentRecord._id || studentRecord.id,
            studentRecordId: studentRecord._id || studentRecord.id,
            userId: userId || user._id || user.id, // Add userId field for StudentCredentials component
            fullName: studentRecord.fullName || studentRecord.name || user.name || user.fullName || 'Unknown',
            email: studentRecord.email || user.email || '',
            phone: studentRecord.contact || studentRecord.phone || user.phone || '',
            contact: studentRecord.contact || studentRecord.phone || user.phone || '', // Add contact field for StudentRegistrationForm
            address: studentRecord.address || user.address || '',
            dateOfBirth: studentRecord.dateOfBirth || user.dateOfBirth || new Date().toISOString(),
            enrollmentDate: studentRecord.enrolledDate || studentRecord.enrollmentDate || user.enrollmentDate || new Date().toISOString(),
            level: studentRecord.level || user.level || 'beginner',
            status: studentRecord.status || user.status || 'active',
            assignedTeacher: studentRecord.assignedTeacher || studentRecord.assignedTeacherId || (studentRecord.assignedTeacherIds && studentRecord.assignedTeacherIds.length > 0 ? studentRecord.assignedTeacherIds[0] : '') || (studentRecord.assignedTeachers && studentRecord.assignedTeachers.length > 0 ? studentRecord.assignedTeachers[0] : '') || user.assignedTeacher || '',
            assignedTeachers: studentRecord.assignedTeachers || studentRecord.assignedTeacherIds || [],
            assignedTeacherIds: studentRecord.assignedTeacherIds || studentRecord.assignedTeachers || [],
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
            program: studentRecord.program || user.program || 'Full-Time HQ', // Default to Full-Time HQ if missing
            parentName: studentRecord.parentName || user.parentName || '',
            tuitionFee: studentRecord.tuitionFee || user.tuitionFee || 0,
            registrationAmount: studentRecord.registrationAmount || user.registrationAmount || 0,
            schedule: studentRecord.schedule || user.schedule || {},
            siblings: studentRecord.siblings || user.siblings || []
          };
          
          // 🔍 DIAGNOSTIC: Log first mapped student to see what was extracted
          if (!firstMappedLogged && index === 0 && import.meta.env.DEV) {
            firstMappedLogged = true;
            console.log('🔍 DIAGNOSTIC - First mapped student:', {
              id: mappedStudent.id,
              fullName: mappedStudent.fullName,
              email: mappedStudent.email,
              program: mappedStudent.program,
              assignedTeacher: mappedStudent.assignedTeacher,
              tuitionFee: mappedStudent.tuitionFee,
              contact: mappedStudent.contact,
              parentName: mappedStudent.parentName,
              source: {
                studentRecord_program: studentRecord.program,
                studentRecord_tuitionFee: studentRecord.tuitionFee,
                studentRecord_assignedTeacher: studentRecord.assignedTeacher,
                user_program: user.program,
                user_tuitionFee: user.tuitionFee
              }
            });
          }
          
          return mappedStudent;
        });
      } else {
        // Fallback to users with role === 'student' if no student records
        // NOTE: These users don't have Student documents, so studentRecordId should be undefined
        // They cannot be updated via /api/students/:id endpoint
        if (import.meta.env.DEV) {
          console.log('🔍 DIAGNOSTIC - FALLBACK: Using users array instead of studentRecords (studentRecords is empty or missing)');
          console.log('🔍 DIAGNOSTIC - studentRecords:', studentRecords);
          console.log('🔍 DIAGNOSTIC - users count:', users.length);
        }
        studentsData = users
          .filter((user: any) => user.role === 'student')
          .map((user: any) => {
            return {
              id: user._id,
              studentRecordId: undefined, // No Student document exists - cannot update via /api/students/:id
              userId: user._id || user.id, // Add userId field (same as id for users with role='student')
              fullName: user.name || user.fullName || 'Unknown',
              email: user.email || '',
              phone: user.phone || '',
              contact: user.phone || user.contact || '', // Add contact field for StudentRegistrationForm
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

      // Create teachers from users OR teacherRecords (whichever is available)
      // For teacher-student-assignment page, teacherRecords might be available even if users aren't
      let teachersData: any[] = [];
      
      if (users && users.length > 0) {
        // Preferred: Create from users (has user data merged with teacher records)
        // CRITICAL FIX: Prioritize teacherRecords from /api/teachers over users
        // This ensures Teacher Document IDs are always preserved
        // First, build teachers from teacherRecords (which have Teacher Document IDs)
        const teacherMapByDocId = new Map<string, any>();
        const teacherMapByUserId = new Map<string, any>();
        
        // Build map from teacher records (these have Teacher Document IDs)
        teacherRecords.forEach((teacherRecord: any) => {
          const teacherDocId = teacherRecord._id?.toString() || teacherRecord._id;
          const userId = teacherRecord.userId?._id?.toString() || teacherRecord.userId?.toString() || teacherRecord.userId;
          
          if (teacherDocId) {
            teacherMapByDocId.set(teacherDocId, teacherRecord);
          }
          if (userId) {
            teacherMapByUserId.set(userId, teacherRecord);
          }
        });
        
        // Now build teachersData, prioritizing teacher records
        teachersData = users
          .filter((user: any) => user.role === 'teacher')
          .map((user: any) => {
            // Find matching teacher record - try multiple matching strategies
            // Strategy 1: Match by userId (most reliable)
            let teacherRecord = teacherRecords.find((tr: any) => {
              const trUserId = tr.userId?._id?.toString() || tr.userId?.toString() || tr.userId;
              const userUserId = user._id?.toString() || user._id;
              return trUserId === userUserId;
            });
            
            // Strategy 2: Match by email (case-insensitive)
            if (!teacherRecord && user.email) {
              teacherRecord = teacherRecords.find((tr: any) => {
                if (!tr.email) return false;
                return tr.email.toLowerCase() === user.email.toLowerCase();
              });
            }
            
            // Strategy 3: Match by _id (if user._id happens to be Teacher Document ID)
            if (!teacherRecord) {
              const userUserId = user._id?.toString() || user._id;
              teacherRecord = teacherRecords.find((tr: any) => {
                const trDocId = tr._id?.toString() || tr._id;
                return trDocId === userUserId;
              });
            }
            
            // Production-safe logging for debugging
            if (!teacherRecord) {
              console.warn('⚠️ No teacher record matched for user:', {
                userEmail: user.email,
                userId: user._id,
                teacherRecordsCount: teacherRecords.length,
                sampleTeacherRecords: teacherRecords.slice(0, 3).map((tr: any) => ({
                  _id: tr._id?.toString() || tr._id,
                  userId: tr.userId?._id?.toString() || tr.userId?.toString() || tr.userId,
                  email: tr.email
                }))
              });
            } else {
              console.log('✅ Teacher record matched:', {
                userEmail: user.email,
                teacherDocId: teacherRecord._id?.toString() || teacherRecord._id,
                teacherUserId: teacherRecord.userId?._id?.toString() || teacherRecord.userId
              });
            }
            
            const teacherProfile = user.teacherProfile || teacherRecord || {};
          
          // Ensure permissions are properly loaded with all fields
          const permissionsFromRecord = teacherRecord?.permissions || teacherProfile.permissions || {};
          const permissions: TeacherPermissions = {
            // Assessments & Evaluations
            canViewAssessments: permissionsFromRecord.canViewAssessments ?? true,
            canEditAssessments: permissionsFromRecord.canEditAssessments ?? true,
            canViewEvaluations: permissionsFromRecord.canViewEvaluations ?? true,
            canEditEvaluations: permissionsFromRecord.canEditEvaluations ?? true,
            
            // Financial & Billing
            canViewFinancials: permissionsFromRecord.canViewFinancials ?? false,
            
            // Scheduling & Logistics
            canManageSchedule: permissionsFromRecord.canManageSchedule ?? true,
            
            // Communication
            canContactParents: permissionsFromRecord.canContactParents ?? true,
            
            // Student Information
            canViewStudentEmail: permissionsFromRecord.canViewStudentEmail ?? true,
            canViewStudentContact: permissionsFromRecord.canViewStudentContact ?? true,
            canViewStudentPersonalInfo: permissionsFromRecord.canViewStudentPersonalInfo ?? true,
            
            // Module Permissions - Messages
            canAccessMessages: permissionsFromRecord.canAccessMessages ?? true,
            canSendMessages: permissionsFromRecord.canSendMessages ?? true,
            canViewAllMessages: permissionsFromRecord.canViewAllMessages ?? false,
            
            // Module Permissions - PDF
            canAccessPdf: permissionsFromRecord.canAccessPdf ?? true,
            canUploadPdf: permissionsFromRecord.canUploadPdf ?? false,
            canAnnotatePdf: permissionsFromRecord.canAnnotatePdf ?? true,
            canViewPdfAnnotations: permissionsFromRecord.canViewPdfAnnotations ?? true,
            
            // Module Permissions - Homework
            canAccessHomework: permissionsFromRecord.canAccessHomework ?? true,
            canCreateHomework: permissionsFromRecord.canCreateHomework ?? true,
            canGradeHomework: permissionsFromRecord.canGradeHomework ?? true,
            canViewHomeworkSubmissions: permissionsFromRecord.canViewHomeworkSubmissions ?? true,
            
            // Module Permissions - Evaluation
            canAccessEvaluations: permissionsFromRecord.canAccessEvaluations ?? true,
            canCreateEvaluations: permissionsFromRecord.canCreateEvaluations ?? false,
            canReviewEvaluations: permissionsFromRecord.canReviewEvaluations ?? false,
            canApproveEvaluations: permissionsFromRecord.canApproveEvaluations ?? false,
            
            // Module Permissions - Tickets
            canAccessTickets: permissionsFromRecord.canAccessTickets ?? true,
            canCreateTickets: permissionsFromRecord.canCreateTickets ?? false,
            canReviewTickets: permissionsFromRecord.canReviewTickets ?? true,
            canApproveTickets: permissionsFromRecord.canApproveTickets ?? false,
            canFinalizeTickets: permissionsFromRecord.canFinalizeTickets ?? false,
            
            // Module Permissions - Attendance
            canAccessAttendance: permissionsFromRecord.canAccessAttendance ?? true,
            canRecordAttendance: permissionsFromRecord.canRecordAttendance ?? true,
            canViewAttendanceReports: permissionsFromRecord.canViewAttendanceReports ?? true,
            
            // Module Permissions - Recordings
            canAccessRecordings: permissionsFromRecord.canAccessRecordings ?? true,
            canUploadRecordings: permissionsFromRecord.canUploadRecordings ?? true,
            canDeleteRecordings: permissionsFromRecord.canDeleteRecordings ?? false,
            canViewAllRecordings: permissionsFromRecord.canViewAllRecordings ?? false,
            
            // Module Permissions - Mushaf
            canAccessMushaf: permissionsFromRecord.canAccessMushaf ?? true,
            canMarkMistakes: permissionsFromRecord.canMarkMistakes ?? true,
            canViewMistakeHistory: permissionsFromRecord.canViewMistakeHistory ?? true,
            canManageMistakeLibrary: permissionsFromRecord.canManageMistakeLibrary ?? false,
            
            // Module Permissions - Qaidah
            canAccessQaidah: permissionsFromRecord.canAccessQaidah ?? true,
            canManageQaidah: permissionsFromRecord.canManageQaidah ?? false,
            canViewQaidahProgress: permissionsFromRecord.canViewQaidahProgress ?? true,
            
            // Module Permissions - Assignments
            canAccessAssignments: permissionsFromRecord.canAccessAssignments ?? true,
            canCreateAssignments: permissionsFromRecord.canCreateAssignments ?? true,
            canEditAssignments: permissionsFromRecord.canEditAssignments ?? false,
            canDeleteAssignments: permissionsFromRecord.canDeleteAssignments ?? false,
            
            // Teacher-Student Assignment
            canManageStudentAssignments: permissionsFromRecord.canManageStudentAssignments ?? false,
            
            // Module Permissions - Reports & Analytics
            canViewReports: permissionsFromRecord.canViewReports ?? true,
            canViewAnalytics: permissionsFromRecord.canViewAnalytics ?? true,
            canExportReports: permissionsFromRecord.canExportReports ?? false,
          };
          
          // CRITICAL: Preserve Teacher Document ID - never fall back to User ID for _id
          // If teacherRecord is not found, we should still try to preserve existing _id from cache
          const teacherDocId = teacherRecord?._id?.toString() || teacherRecord?._id;
          
          // Production-safe logging for debugging
          if (!teacherDocId) {
            console.warn('⚠️ Teacher record not found or missing _id for user:', {
              userEmail: user.email,
              userId: user._id,
              teacherRecordsCount: teacherRecords.length,
              teacherRecordFound: !!teacherRecord,
              teacherRecordId: teacherRecord?._id,
              availableTeacherIds: teacherRecords.slice(0, 5).map((tr: any) => ({
                _id: tr._id?.toString() || tr._id,
                userId: tr.userId?._id?.toString() || tr.userId?.toString() || tr.userId,
                email: tr.email
              }))
            });
          } else {
            // Log successful match (production-safe)
            console.log('✅ Teacher Document ID found:', {
              userEmail: user.email,
              teacherDocId: teacherDocId,
              userId: user._id
            });
          }
          
          return {
            id: user._id, // Keep user._id for compatibility (this is User._id)
            _id: teacherDocId || user._id, // Use Teacher Document ID, fallback to User ID if not found (better than undefined)
            teacherDocumentId: teacherDocId || undefined, // Store Teacher document ID separately
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
      } else if (teacherRecords && teacherRecords.length > 0) {
        // Fallback: Create teachers from teacherRecords if users are not available
        // This ensures teachers are available even if users haven't loaded yet
        if (import.meta.env.DEV) {
          console.log('⚠️ No users available, creating teachers from teacherRecords:', teacherRecords.length);
        }
        teachersData = teacherRecords.map((teacherRecord: any) => {
          const teacherProfile = teacherRecord || {};
          const permissionsFromRecord = teacherProfile.permissions || {};
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
            canAccessMessages: permissionsFromRecord.canAccessMessages ?? true,
            canSendMessages: permissionsFromRecord.canSendMessages ?? true,
            canViewAllMessages: permissionsFromRecord.canViewAllMessages ?? false,
            canAccessPdf: permissionsFromRecord.canAccessPdf ?? true,
            canUploadPdf: permissionsFromRecord.canUploadPdf ?? false,
            canAnnotatePdf: permissionsFromRecord.canAnnotatePdf ?? true,
            canViewPdfAnnotations: permissionsFromRecord.canViewPdfAnnotations ?? true,
            canAccessHomework: permissionsFromRecord.canAccessHomework ?? true,
            canCreateHomework: permissionsFromRecord.canCreateHomework ?? true,
            canGradeHomework: permissionsFromRecord.canGradeHomework ?? true,
            canViewHomeworkSubmissions: permissionsFromRecord.canViewHomeworkSubmissions ?? true,
            canAccessEvaluations: permissionsFromRecord.canAccessEvaluations ?? true,
            canCreateEvaluations: permissionsFromRecord.canCreateEvaluations ?? false,
            canReviewEvaluations: permissionsFromRecord.canReviewEvaluations ?? false,
            canApproveEvaluations: permissionsFromRecord.canApproveEvaluations ?? false,
            canAccessTickets: permissionsFromRecord.canAccessTickets ?? true,
            canCreateTickets: permissionsFromRecord.canCreateTickets ?? false,
            canReviewTickets: permissionsFromRecord.canReviewTickets ?? true,
            canApproveTickets: permissionsFromRecord.canApproveTickets ?? false,
            canFinalizeTickets: permissionsFromRecord.canFinalizeTickets ?? false,
            canAccessAttendance: permissionsFromRecord.canAccessAttendance ?? true,
            canRecordAttendance: permissionsFromRecord.canRecordAttendance ?? true,
            canViewAttendanceReports: permissionsFromRecord.canViewAttendanceReports ?? true,
            canAccessRecordings: permissionsFromRecord.canAccessRecordings ?? true,
            canUploadRecordings: permissionsFromRecord.canUploadRecordings ?? true,
            canDeleteRecordings: permissionsFromRecord.canDeleteRecordings ?? false,
            canViewAllRecordings: permissionsFromRecord.canViewAllRecordings ?? false,
            canAccessMushaf: permissionsFromRecord.canAccessMushaf ?? true,
            canMarkMistakes: permissionsFromRecord.canMarkMistakes ?? true,
            canViewMistakeHistory: permissionsFromRecord.canViewMistakeHistory ?? true,
            canManageMistakeLibrary: permissionsFromRecord.canManageMistakeLibrary ?? false,
            canAccessQaidah: permissionsFromRecord.canAccessQaidah ?? true,
            canManageQaidah: permissionsFromRecord.canManageQaidah ?? false,
            canViewQaidahProgress: permissionsFromRecord.canViewQaidahProgress ?? true,
            canAccessAssignments: permissionsFromRecord.canAccessAssignments ?? true,
            canCreateAssignments: permissionsFromRecord.canCreateAssignments ?? true,
            canEditAssignments: permissionsFromRecord.canEditAssignments ?? false,
            canDeleteAssignments: permissionsFromRecord.canDeleteAssignments ?? false,
            canManageStudentAssignments: permissionsFromRecord.canManageStudentAssignments ?? false,
            canViewReports: permissionsFromRecord.canViewReports ?? true,
            canViewAnalytics: permissionsFromRecord.canViewAnalytics ?? true,
            canExportReports: permissionsFromRecord.canExportReports ?? false,
          };
          
          // Ensure _id is always set (use id as fallback if _id is missing)
          const teacherDocId = teacherRecord._id?.toString() || teacherRecord._id || teacherRecord.id;
          const userId = teacherRecord.userId?._id?.toString() || teacherRecord.userId?.toString() || teacherRecord.userId || teacherRecord.id;
          
          return {
            id: userId, // User ID for compatibility
            _id: teacherDocId || userId, // Teacher Document ID (always set, fallback to userId if needed)
            teacherDocumentId: teacherDocId || undefined, // Explicit Teacher Document ID
            fullName: teacherRecord.fullName || 'Unknown',
            email: teacherRecord.email || '',
            phoneNumber: teacherRecord.phoneNumber || teacherRecord.contact || '',
            phone: teacherRecord.phone || '',
            contact: teacherRecord.contact || teacherRecord.phoneNumber || '',
            emergencyContact: teacherRecord.emergencyContact || '',
            address: teacherRecord.address || '',
            dateOfBirth: teacherRecord.dateOfBirth || new Date().toISOString(),
            hireDate: teacherRecord.hireDate || new Date().toISOString(),
            specialization: teacherRecord.specialization || [],
            department: teacherRecord.department || 'General',
            experience: teacherRecord.experience || { years: 0, previousInstitutions: [] },
            salary: teacherRecord.salary || 0,
            status: teacherRecord.status || 'active',
            avatar: teacherRecord.avatar || '',
            location: teacherRecord.location || 'Local',
            employmentType: teacherRecord.employmentType || 'Full Time',
            shiftType: teacherRecord.shiftType || 'Morning',
            shifts: teacherRecord.shifts || [],
            courses: teacherRecord.courses || [],
            students: teacherRecord.students || [],
            assignedStudents: teacherRecord.assignedStudents || [],
            permissions: permissions,
            schedule: teacherRecord.schedule || {
              days: [],
              startTime: '',
              endTime: ''
            },
            performance: teacherRecord.performance || { rating: 0, reviews: [] },
            attendance: teacherRecord.attendance || { present: 0, absent: 0, total: 0 },
            assignments: teacherRecord.assignments || [],
            payroll: teacherRecord.payroll || { 
              hourlyRate: 0,
              dailyHours: 0,
              daysWorking: 0,
              monthlyHours: 0,
              monthlySalary: 0,
              currency: 'USD'
            },
            idDocument: teacherRecord.idDocument || ''
          };
        });
      }

      // Load admins from Admin collection (has admin-specific data)
      setLoadingStep('اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ');
      let adminsData: Admin[] = [];
      
      // Use Promise.race to ensure we don't hang - fallback after 5 seconds
      const adminsPromise = (async () => {
        try {
          if (import.meta.env.DEV) {
            console.log('📡 Fetching admins from:', `${API_BASE}/admins`);
          }
          const adminsResponse = await fetchWithTimeout(`${API_BASE}/admins`, {}, 5000, true); // ✅ Require auth
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
                // People Operations
                canManageTeachers: false,
                canManageStudents: false,
                
                // Finance & Billing
                canManageFinancials: false,
                
                // Insights
                canViewReports: false,
                
                // Security & Governance
                canManagePermissions: false,
                
                // Module Permissions - Messages
                canAccessMessages: false,
                canViewAllMessages: false,
                canModerateMessages: false,
                
                // Module Permissions - PDF
                canAccessPdf: false,
                canManagePdfLibrary: false,
                canViewAllPdfAnnotations: false,
                
                // Module Permissions - Homework
                canAccessHomework: false,
                canManageHomework: false,
                canViewAllHomework: false,
                
                // Module Permissions - Evaluation
                canAccessEvaluations: false,
                canManageEvaluations: false,
                canApproveEvaluations: false,
                
                // Module Permissions - Tickets
                canAccessTickets: false,
                canCreateTickets: false,
                canReviewTickets: false,
                canApproveTickets: false,
                canFinalizeTickets: false,
                canManageTicketWorkflow: false,
                
                // Module Permissions - Attendance
                canAccessAttendance: false,
                canManageAttendance: false,
                canViewAttendanceReports: false,
                
                // Module Permissions - Recordings
                canAccessRecordings: false,
                canManageRecordings: false,
                canViewAllRecordings: false,
                
                // Module Permissions - Mushaf
                canAccessMushaf: false,
                canManageMushaf: false,
                canViewAllMistakes: false,
                
                // Module Permissions - Qaidah
                canAccessQaidah: false,
                canManageQaidah: false,
                canViewQaidahReports: false,
                
                // Module Permissions - Assignments
                canAccessAssignments: false,
                canManageAssignments: false,
                canBulkCreateAssignments: false,
                
                // Module Permissions - Reports & Analytics
                canViewAnalytics: false,
                canExportReports: false,
                canViewSystemStats: false
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
              // People Operations
              canManageTeachers: false,
              canManageStudents: false,
              
              // Finance & Billing
              canManageFinancials: false,
              
              // Insights
              canViewReports: false,
              
              // Security & Governance
              canManagePermissions: false,
              
              // Module Permissions - Messages
              canAccessMessages: false,
              canViewAllMessages: false,
              canModerateMessages: false,
              
              // Module Permissions - PDF
              canAccessPdf: false,
              canManagePdfLibrary: false,
              canViewAllPdfAnnotations: false,
              
              // Module Permissions - Homework
              canAccessHomework: false,
              canManageHomework: false,
              canViewAllHomework: false,
              
              // Module Permissions - Evaluation
              canAccessEvaluations: false,
              canManageEvaluations: false,
              canApproveEvaluations: false,
              
              // Module Permissions - Tickets
              canAccessTickets: false,
              canCreateTickets: false,
              canReviewTickets: false,
              canApproveTickets: false,
              canFinalizeTickets: false,
              canManageTicketWorkflow: false,
              
              // Module Permissions - Attendance
              canAccessAttendance: false,
              canManageAttendance: false,
              canViewAttendanceReports: false,
              
              // Module Permissions - Recordings
              canAccessRecordings: false,
              canManageRecordings: false,
              canViewAllRecordings: false,
              
              // Module Permissions - Mushaf
              canAccessMushaf: false,
              canManageMushaf: false,
              canViewAllMistakes: false,
              
              // Module Permissions - Qaidah
              canAccessQaidah: false,
              canManageQaidah: false,
              canViewQaidahReports: false,
              
              // Module Permissions - Assignments
              canAccessAssignments: false,
              canManageAssignments: false,
              canBulkCreateAssignments: false,
              
              // Module Permissions - Reports & Analytics
              canViewAnalytics: false,
              canExportReports: false,
              canViewSystemStats: false
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
        // 🔍 DIAGNOSTIC: Log sample of final mapped students before masking
        if (studentsData.length > 0) {
          const sampleMapped = studentsData[0];
          console.log('🔍 DIAGNOSTIC - Sample mapped student (before masking):', {
            id: sampleMapped.id,
            fullName: sampleMapped.fullName,
            email: sampleMapped.email,
            program: sampleMapped.program,
            assignedTeacher: sampleMapped.assignedTeacher,
            tuitionFee: sampleMapped.tuitionFee,
            contact: sampleMapped.contact,
            parentName: sampleMapped.parentName
          });
        }
      }

      // Apply data masking if current user is a developer account
      let finalStudentsData = studentsData;
      let finalTeachersData = teachersData;
      let finalAdminsData = adminsData;
      
      try {
        // Use currentUser from AuthContext, fallback to localStorage if needed
        const userToCheck = currentUser || (() => {
          try {
            const savedUser = localStorage.getItem('umar_academy_user');
            return savedUser ? JSON.parse(savedUser) : null;
          } catch {
            return null;
          }
        })();
        
        const isDeveloper = isDeveloperAccount(userToCheck);
        
        if (isDeveloper) {
          console.log('🔒 Developer account detected - applying data masking to protect user privacy');
          console.log('   User:', userToCheck?.email, 'isDeveloper:', userToCheck?.isDeveloper, 'isTestAccount:', userToCheck?.isTestAccount);
          finalStudentsData = maskStudents(studentsData);
          finalTeachersData = maskTeachers(teachersData);
          // Admins are typically not masked as they're staff, but we can mask their personal info too
          finalAdminsData = adminsData.map((admin, index) => maskUser(admin, index));
          console.log('✅ Data masking applied:', { 
            students: finalStudentsData.length, 
            teachers: finalTeachersData.length, 
            admins: finalAdminsData.length 
          });
          // 🔍 DIAGNOSTIC: Log sample after masking
          if (finalStudentsData.length > 0 && import.meta.env.DEV) {
            const sampleMasked = finalStudentsData[0];
            console.log('🔍 DIAGNOSTIC - Sample student AFTER masking:', {
              id: sampleMasked.id,
              fullName: sampleMasked.fullName,
              program: sampleMasked.program,
              assignedTeacher: sampleMasked.assignedTeacher,
              tuitionFee: sampleMasked.tuitionFee
            });
          }
        } else {
          // 🔍 DIAGNOSTIC: Log that masking was NOT applied
          if (import.meta.env.DEV && studentsData.length > 0) {
            console.log('🔍 DIAGNOSTIC - Data masking NOT applied (not developer account)');
          }
        }
        // Silently skip masking for non-developer accounts - no need to log
      } catch (error) {
        // If we can't read user, proceed without masking
        console.warn('⚠️ Could not check for developer account, proceeding without masking:', error);
      }

      // Merge with existing students to preserve data that might be missing from backend response
      setStudents(prev => {
        const studentMap = new Map<string, Student>();
        
        // First, add existing students (filter out any without valid IDs)
        prev.forEach(s => {
          if (s.id) {
            studentMap.set(s.id, s);
          }
        });
        
        // Then, add/update with new students (filter out any without valid IDs)
        finalStudentsData.forEach((newStudent: Student) => {
          if (!newStudent.id) {
            console.warn('⚠️ Skipping student without ID:', newStudent);
            return;
          }
          
          const existing = studentMap.get(newStudent.id);
          if (existing) {
            // Merge: keep existing data, update with new data, but preserve critical fields if missing
            studentMap.set(newStudent.id, {
              ...existing,
              ...newStudent,
              // Preserve critical fields if they're missing in the new data
              assignedTeacher: newStudent.assignedTeacher || existing.assignedTeacher || '',
              assignedTeachers: (newStudent.assignedTeachers && newStudent.assignedTeachers.length > 0) ? newStudent.assignedTeachers : ((existing.assignedTeachers && existing.assignedTeachers.length > 0) ? existing.assignedTeachers : []),
              assignedTeacherIds: (newStudent.assignedTeacherIds && newStudent.assignedTeacherIds.length > 0) ? newStudent.assignedTeacherIds : ((existing.assignedTeacherIds && existing.assignedTeacherIds.length > 0) ? existing.assignedTeacherIds : []),
              program: newStudent.program || existing.program || 'Full-Time HQ',
              contact: newStudent.contact || existing.contact || '',
              parentName: newStudent.parentName || existing.parentName || '',
              tuitionFee: newStudent.tuitionFee || existing.tuitionFee || 0,
            } as Student);
          } else {
            studentMap.set(newStudent.id, newStudent);
          }
        });
        
        const finalStudents = Array.from(studentMap.values());
        
        // Final deduplication check - ensure no duplicate IDs
        const seenIds = new Set<string>();
        const deduplicatedStudents = finalStudents.filter(s => {
          if (!s.id) return false;
          if (seenIds.has(s.id)) {
            console.warn('⚠️ Removing duplicate student:', s.id, s.fullName);
            return false;
          }
          seenIds.add(s.id);
          return true;
        });
        
        // 🔍 DIAGNOSTIC: Log final state after merge (only once, reduce spam)
        if (import.meta.env.DEV && deduplicatedStudents.length > 0 && deduplicatedStudents.length !== prev.length) {
          const sampleFinal = deduplicatedStudents[0];
          console.log('🔍 DIAGNOSTIC - Final student state (after merge, before setState):', {
            id: sampleFinal.id,
            fullName: sampleFinal.fullName,
            program: sampleFinal.program,
            assignedTeacher: sampleFinal.assignedTeacher,
            tuitionFee: sampleFinal.tuitionFee,
            totalStudents: deduplicatedStudents.length,
            prevCount: prev.length,
            newCount: finalStudentsData.length
          });
        }
        
        return deduplicatedStudents;
      });
      // Merge teachers to preserve Teacher Document IDs from existing data
      // This prevents losing Teacher Document IDs when fresh data doesn't have them
      setTeachers(prev => {
        if (finalTeachersData.length === 0 && prev.length > 0) {
          if (import.meta.env.DEV) {
            console.warn('⚠️ New teachers data is empty, preserving existing teachers');
          }
          return prev; // Preserve existing teachers if new data is empty
        }
        
        // ✅ FIX: Deduplicate teachers by email (normalized) and by _id before merging
        const seenEmails = new Set<string>();
        const seenIds = new Set<string>();
        const deduplicatedTeachers: any[] = [];
        const duplicates: any[] = [];
        
        for (const teacher of finalTeachersData) {
          const normalizedEmail = teacher.email?.toLowerCase().trim();
          const teacherId = teacher._id?.toString() || teacher.id?.toString() || '';
          
          // Check for duplicates by email or ID
          const isDuplicateByEmail = normalizedEmail && seenEmails.has(normalizedEmail);
          const isDuplicateById = teacherId && seenIds.has(teacherId);
          
          if (isDuplicateByEmail || isDuplicateById) {
            duplicates.push(teacher);
            if (import.meta.env.DEV) {
              console.warn('⚠️ Duplicate teacher detected:', {
                fullName: teacher.fullName,
                email: teacher.email,
                id: teacherId,
                duplicateBy: isDuplicateByEmail ? 'email' : 'id'
              });
            }
          } else {
            if (normalizedEmail) seenEmails.add(normalizedEmail);
            if (teacherId) seenIds.add(teacherId);
            deduplicatedTeachers.push(teacher);
          }
        }
        
        if (duplicates.length > 0) {
          console.warn(`⚠️ Removed ${duplicates.length} duplicate teacher(s) from display`);
        }
        
        // Merge: preserve Teacher Document IDs from existing teachers
        const teacherMap = new Map<string, any>(prev.map(t => [t.id || (t as any)._id || '', t]));
        deduplicatedTeachers.forEach((newTeacher: any) => {
          const existing = teacherMap.get(newTeacher.id);
          if (existing) {
            // Preserve Teacher Document ID from existing if new one doesn't have it
            const preservedDocId = (existing as any)._id || (existing as any).teacherDocumentId;
            const newDocId = (newTeacher as any)._id || (newTeacher as any).teacherDocumentId;
            
            if (preservedDocId && !newDocId && import.meta.env.DEV) {
              console.log('🔧 Preserving Teacher Document ID from existing teacher:', {
                teacherName: newTeacher.fullName,
                preservedDocId: preservedDocId,
                userId: newTeacher.id
              });
            }
            
            teacherMap.set(newTeacher.id, {
              ...existing,
              ...newTeacher,
              // Preserve Teacher Document ID if new data doesn't have it
              _id: newDocId || preservedDocId || undefined,
              teacherDocumentId: newDocId || preservedDocId || undefined
            });
          } else {
            teacherMap.set(newTeacher.id, newTeacher);
          }
        });
        
        return Array.from(teacherMap.values());
      });
      // Only update admins if we have data (prevent clearing existing data)
      if (finalAdminsData.length > 0 || admins.length === 0) {
        setAdmins(finalAdminsData);
      } else if (import.meta.env.DEV) {
        console.warn('⚠️ Skipping admins update - new data is empty but existing data exists');
      }
      
      // PHASE 1 COMPLETE - Critical data loaded! Show UI immediately
      // Set loading to false NOW so dashboard can render
      // Phase 2 data (assignments, tickets) will continue loading in background
      // OPTIMIZATION: Skip Phase 2 for teacher-student-assignment page
      if (isTeacherStudentAssignmentPage) {
        if (import.meta.env.DEV) {
          const phase1Time = Date.now() - startTime;
          console.log(`⚡ Phase 1 complete - UI rendering now! (${phase1Time}ms)`);
          console.log('✅ Teacher-student-assignment page: Only students and teachers loaded - skipping assignments/tickets');
        }
        setLoading(false);
        isLoadingRef.current = false;
        clearTimeout(maxTimeout);
        return; // Early return - no need to load assignments/tickets
      }
      
      setLoading(false);
      isLoadingRef.current = false; // Allow background loading to continue
      
      if (import.meta.env.DEV) {
        const phase1Time = Date.now() - startTime;
        console.log(`⚡ Phase 1 complete - UI rendering now! (${phase1Time}ms)`);
        if (isStudentUser) {
          console.log('🎓 Student portal: UI ready, loading assignments in background...');
        } else {
          console.log('🔄 Phase 2: Loading assignments, tickets, notifications in background...');
        }
      }
      
      setLoadingStep('اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ');
      
      // Cache assignments and tickets for faster subsequent loads
      if (assignments.length > 0) {
        dataCache.set('assignments', assignments);
      }
      if (tickets.length > 0) {
        dataCache.set('tickets', tickets);
      }
      
      if (import.meta.env.DEV) {
        const totalTime = Date.now() - startTime;
        console.log(`✅ All data loaded successfully in ${totalTime}ms`);
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
  }, [currentUser]); // Include currentUser since we check it in loadData

  // Load cache IMMEDIATELY on mount for instant display (before API calls)
  // WebSocket event listeners for real-time assignment updates
  useEffect(() => {
    if (!socket) return;

    const handleAssignmentCreated = (assignmentData: any) => {
      console.log('🔌 Received assignment:created event', assignmentData);
      
      // Normalize assignment data
      const normalizedAssignment = {
        ...assignmentData,
        id: assignmentData._id || assignmentData.id,
        studentId: normalizeId(assignmentData.studentId),
        createdAt: assignmentData.createdAt ? new Date(assignmentData.createdAt) : new Date(),
        updatedAt: assignmentData.updatedAt ? new Date(assignmentData.updatedAt) : new Date(),
      };

      // Check if this assignment is for the current user (if student)
      const isForCurrentUser = currentUser?.role === 'student' 
        ? (() => {
            const students = dataCache.get<any[]>('students') || [];
            const currentStudent = students.find((s: any) => s.email === currentUser.email);
            if (currentStudent) {
              const studentId = String(currentStudent.id || currentStudent._id);
              return normalizedAssignment.studentId === studentId;
            }
            return false;
          })()
        : true; // For teachers/admins, show all assignments

      if (isForCurrentUser) {
        // Add to assignments list
        setAssignments(prev => {
          // Check if assignment already exists
          const exists = prev.some(a => a.id === normalizedAssignment.id);
          if (exists) {
            return prev.map(a => 
              a.id === normalizedAssignment.id ? normalizedAssignment : a
            );
          }
          return [normalizedAssignment, ...prev];
        });

        // Update cache
        const cachedAssignments = dataCache.get<any[]>('assignments') || [];
        const updatedCache = cachedAssignments.some((a: any) => 
          (a._id || a.id) === normalizedAssignment.id
        )
          ? cachedAssignments.map((a: any) => 
              (a._id || a.id) === normalizedAssignment.id ? normalizedAssignment : a
            )
          : [normalizedAssignment, ...cachedAssignments];
        dataCache.set('assignments', updatedCache, ASSIGNMENTS_CACHE_DURATION);
      }
    };

    const handleAssignmentUpdated = (assignmentData: any) => {
      console.log('🔌 Received assignment:updated event', assignmentData);
      
      // Normalize assignment data
      const normalizedAssignment = {
        ...assignmentData,
        id: assignmentData._id || assignmentData.id,
        studentId: normalizeId(assignmentData.studentId),
        createdAt: assignmentData.createdAt ? new Date(assignmentData.createdAt) : new Date(),
        updatedAt: assignmentData.updatedAt ? new Date(assignmentData.updatedAt) : new Date(),
      };

      // Update assignments list
      setAssignments(prev => 
        prev.map(a => 
          a.id === normalizedAssignment.id ? normalizedAssignment : a
        )
      );

      // Update cache
      const cachedAssignments = dataCache.get<any[]>('assignments') || [];
      const updatedCache = cachedAssignments.map((a: any) => 
        (a._id || a.id) === normalizedAssignment.id ? normalizedAssignment : a
      );
      dataCache.set('assignments', updatedCache, ASSIGNMENTS_CACHE_DURATION);
    };

    const handleAssignmentDeleted = (data: { id: string; studentId: string }) => {
      console.log('🔌 Received assignment:deleted event', data);
      
      // Remove from assignments list
      setAssignments(prev => prev.filter(a => a.id !== data.id));

      // Update cache
      const cachedAssignments = dataCache.get<any[]>('assignments') || [];
      const updatedCache = cachedAssignments.filter((a: any) => 
        (a._id || a.id) !== data.id
      );
      dataCache.set('assignments', updatedCache, ASSIGNMENTS_CACHE_DURATION);
    };

    // Student event handlers
    const handleStudentCreated = (studentData: any) => {
      console.log('🔌 Received student:created event', studentData);
      const normalizedStudent = {
        ...studentData,
        id: studentData._id || studentData.id,
      };
      setStudents(prev => {
        const exists = prev.some(s => s.id === normalizedStudent.id);
        if (exists) {
          // Merge with existing data to preserve fields that might be missing from WebSocket event
          return prev.map(s => {
            if (s.id === normalizedStudent.id) {
              return {
                ...s, // Keep existing data
                ...normalizedStudent, // Override with new data
                // Preserve critical fields if they're missing in the event
                assignedTeacher: normalizedStudent.assignedTeacher || s.assignedTeacher || '',
                assignedTeachers: normalizedStudent.assignedTeachers || normalizedStudent.assignedTeacherIds || s.assignedTeachers || [],
                assignedTeacherIds: normalizedStudent.assignedTeacherIds || normalizedStudent.assignedTeachers || s.assignedTeacherIds || [],
                program: normalizedStudent.program || s.program || 'Full-Time HQ',
                contact: normalizedStudent.contact || normalizedStudent.phone || s.contact || '',
                parentName: normalizedStudent.parentName || s.parentName || '',
              } as Student;
            }
            return s;
          });
        }
        return [...prev, normalizedStudent as Student];
      });
      // Update cache
      const cachedStudents = dataCache.get<Student[]>('students') || [];
      dataCache.set('students', [...cachedStudents, normalizedStudent as Student]);
    };

    const handleStudentUpdated = (studentData: any) => {
      console.log('🔌 Received student:updated event', studentData);
      const normalizedStudent = {
        ...studentData,
        id: studentData._id || studentData.id,
      };
      setStudents(prev => 
        prev.map(s => {
          if (s.id === normalizedStudent.id) {
            // Merge with existing data to preserve fields that might be missing from WebSocket event
            return {
              ...s, // Keep existing data
              ...normalizedStudent, // Override with new data
              // Preserve critical fields if they're missing in the event
              assignedTeacher: normalizedStudent.assignedTeacher || s.assignedTeacher || '',
              assignedTeachers: normalizedStudent.assignedTeachers || normalizedStudent.assignedTeacherIds || s.assignedTeachers || [],
              assignedTeacherIds: normalizedStudent.assignedTeacherIds || normalizedStudent.assignedTeachers || s.assignedTeacherIds || [],
              program: normalizedStudent.program || s.program || 'Full-Time HQ',
              contact: normalizedStudent.contact || normalizedStudent.phone || s.contact || '',
              parentName: normalizedStudent.parentName || s.parentName || '',
            } as Student;
          }
          return s;
        })
      );
      // Update cache
      const cachedStudents = dataCache.get<Student[]>('students') || [];
      const updatedCache = cachedStudents.map((s: any) => {
        if ((s._id || s.id) === normalizedStudent.id) {
          return {
            ...s,
            ...normalizedStudent,
            assignedTeacher: normalizedStudent.assignedTeacher || s.assignedTeacher || '',
            assignedTeachers: normalizedStudent.assignedTeachers || normalizedStudent.assignedTeacherIds || s.assignedTeachers || [],
            assignedTeacherIds: normalizedStudent.assignedTeacherIds || normalizedStudent.assignedTeachers || s.assignedTeacherIds || [],
            program: normalizedStudent.program || s.program || 'Full-Time HQ',
            contact: normalizedStudent.contact || normalizedStudent.phone || s.contact || '',
            parentName: normalizedStudent.parentName || s.parentName || '',
          };
        }
        return s;
      });
      dataCache.set('students', updatedCache);
    };

    const handleStudentDeleted = (data: { id: string }) => {
      console.log('🔌 Received student:deleted event', data);
      setStudents(prev => prev.filter(s => s.id !== data.id));
      // Update cache
      const cachedStudents = dataCache.get<Student[]>('students') || [];
      dataCache.set('students', cachedStudents.filter((s: any) => (s._id || s.id) !== data.id));
    };

    // Teacher-student assignment event handlers
    const handleTeacherStudentsSynced = (data: { summary: any[] }) => {
      console.log('🔌 Received teacher:students:synced event', data);
      // Refresh students and teachers to get updated assignments
      // Trigger a data refresh (will be handled by loadData when needed)
      loadData(false); // Don't use cache, get fresh data
    };

    const handleTeacherStudentsUpdated = (data: { studentId: string; student: any }) => {
      console.log('🔌 Received teacher:students:updated event', data);
      // Update the specific student
      const normalizedStudent = {
        ...data.student,
        id: data.student._id || data.student.id,
      };
      setStudents(prev => 
        prev.map(s => s.id === normalizedStudent.id ? normalizedStudent as Student : s)
      );
      // Also refresh to get updated teacher assignments
      loadData(false); // Don't use cache, get fresh data
    };

    // Ticket event handlers
    const handleTicketCreated = (ticketData: any) => {
      console.log('🔌 Received ticket:created event', ticketData);
      const normalizedTicket = {
        ...ticketData,
        id: ticketData._id || ticketData.id,
        createdAt: ticketData.createdAt ? new Date(ticketData.createdAt) : new Date(),
        updatedAt: ticketData.updatedAt ? new Date(ticketData.updatedAt) : new Date(),
      };
      setRecitationTickets(prev => {
        const exists = prev.some(t => t.id === normalizedTicket.id);
        if (exists) {
          return prev.map(t => t.id === normalizedTicket.id ? normalizedTicket as Ticket : t);
        }
        return [normalizedTicket as Ticket, ...prev];
      });
    };

    const handleTicketUpdated = (ticketData: any) => {
      console.log('🔌 Received ticket:updated event', ticketData);
      const normalizedTicket = {
        ...ticketData,
        id: ticketData._id || ticketData.id,
        createdAt: ticketData.createdAt ? new Date(ticketData.createdAt) : new Date(),
        updatedAt: ticketData.updatedAt ? new Date(ticketData.updatedAt) : new Date(),
      };
      setRecitationTickets(prev => 
        prev.map(t => t.id === normalizedTicket.id ? normalizedTicket as Ticket : t)
      );
    };

    // Register event listeners
    socket.on('assignment:created', handleAssignmentCreated);
    socket.on('assignment:updated', handleAssignmentUpdated);
    socket.on('assignment:deleted', handleAssignmentDeleted);
    socket.on('student:created', handleStudentCreated);
    socket.on('student:updated', handleStudentUpdated);
    socket.on('student:deleted', handleStudentDeleted);
    socket.on('teacher:students:synced', handleTeacherStudentsSynced);
    socket.on('teacher:students:updated', handleTeacherStudentsUpdated);
    socket.on('ticket:created', handleTicketCreated);
    socket.on('ticket:updated', handleTicketUpdated);

    // Cleanup
    return () => {
      socket.off('assignment:created', handleAssignmentCreated);
      socket.off('assignment:updated', handleAssignmentUpdated);
      socket.off('assignment:deleted', handleAssignmentDeleted);
      socket.off('student:created', handleStudentCreated);
      socket.off('student:updated', handleStudentUpdated);
      socket.off('student:deleted', handleStudentDeleted);
      socket.off('teacher:students:synced', handleTeacherStudentsSynced);
      socket.off('teacher:students:updated', handleTeacherStudentsUpdated);
      socket.off('ticket:created', handleTicketCreated);
      socket.off('ticket:updated', handleTicketUpdated);
    };
  }, [socket, currentUser]);

  useEffect(() => {
    // Load cache and set state immediately for instant UI (critical for mobile)
    try {
      const cachedStudents = dataCache.get<Student[]>('students');
      const cachedTeachers = dataCache.get<Teacher[]>('teachers');
      const cachedAdmins = dataCache.get<Admin[]>('admins');
      const cachedAssignments = dataCache.get<Assignment[]>('assignments');
      
      if (cachedStudents && cachedStudents.length > 0) {
        setStudents(cachedStudents);
        if (import.meta.env.DEV) {
          console.log('⚡ Loaded', cachedStudents.length, 'students from cache (instant)');
        }
      }
      if (cachedTeachers && cachedTeachers.length > 0) {
        setTeachers(cachedTeachers);
        if (import.meta.env.DEV) {
          console.log('⚡ Loaded', cachedTeachers.length, 'teachers from cache (instant)');
        }
      }
      if (cachedAdmins && cachedAdmins.length > 0) {
        setAdmins(cachedAdmins);
        if (import.meta.env.DEV) {
          console.log('⚡ Loaded', cachedAdmins.length, 'admins from cache (instant)');
        }
      }
      if (cachedAssignments && cachedAssignments.length > 0) {
        setAssignments(cachedAssignments);
        if (import.meta.env.DEV) {
          console.log('⚡ Loaded', cachedAssignments.length, 'assignments from cache (instant)');
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ Failed to load cache:', error);
      }
    }
  }, []); // Run once on mount, before loadData()

  // Only load data once on mount, or when user logs in
  const hasLoadedRef = useRef(false);
  const previousUserRef = useRef<string | null>(null);
  const isInitialMountRef = useRef(true);
  
  useEffect(() => {
    // Don't load data if user is not logged in
    if (!currentUser) {
      if (import.meta.env.DEV) {
        console.log('⏸️ No user logged in, skipping data load');
      }
      setLoading(false);
      isLoadingRef.current = false;
      return;
    }
    
    // Load data on initial mount (only if user is logged in)
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
    // Mark initial mount as complete
    isInitialMountRef.current = false;
  }, [loadData, currentUser]);

  // Reload data when user logs in (currentUser changes from null to a user)
  // Skip on initial mount (user might already be logged in from localStorage)
  useEffect(() => {
    // Skip on initial mount - let the initial useEffect handle it
    if (isInitialMountRef.current) {
      const currentUserId = currentUser?._id || currentUser?.id || null;
      previousUserRef.current = currentUserId;
      return;
    }
    
    const currentUserId = currentUser?._id || currentUser?.id || null;
    const previousUserId = previousUserRef.current;
    
    // If user changed from null/undefined to a user (login), reload data
    if (!previousUserId && currentUserId) {
      if (import.meta.env.DEV) {
        console.log('🔑 User logged in - reloading data...');
      }
      // Reset hasLoadedRef to allow reload
      hasLoadedRef.current = false;
      loadData();
    }
    
    // Update previous user ref
    previousUserRef.current = currentUserId;
  }, [currentUser?._id || currentUser?.id, loadData]);

  // Lightweight refresh - only refresh assignments, tickets, and notifications (faster)
  // Defined here before useEffect hooks that use it
  const refreshDataLight = useCallback(async () => {
    if (isLoadingRef.current) {
      if (import.meta.env.DEV) {
        console.log('⏸️ Light refresh skipped - data load already in progress');
      }
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoadingStep('Refreshing...');
      
      // Refresh only critical data in parallel - increased timeout for Render cold starts
      const [assignmentsRes, ticketsRes, notificationsRes] = await Promise.all([
        fetchWithTimeout(`${API_BASE}/assignments`, {}, 60000, true).catch(() => null), // FIXED: Require auth
        fetchWithTimeout(`${API_BASE}/tickets`, {}, 60000, true).catch(() => null), // FIXED: Require auth
        fetchWithTimeout(`${API_BASE}/admin-notifications`, {}, 30000, true).catch(() => null) // FIXED: Require auth
      ]);

      if (assignmentsRes?.ok) {
        const assignmentsData = await assignmentsRes.json();
        const mappedAssignments = assignmentsData.map((assignment: any) => ({
          ...assignment,
          id: assignment._id || assignment.id,
          studentId: normalizeId(assignment.studentId), // Normalize studentId
          createdAt: assignment.createdAt ? new Date(assignment.createdAt) : new Date(),
          updatedAt: assignment.updatedAt ? new Date(assignment.updatedAt) : new Date(),
        }));
        console.log('🔄 Refreshed assignments:', {
          count: mappedAssignments.length,
          sample: mappedAssignments[0] ? {
            id: mappedAssignments[0].id,
            studentId: mappedAssignments[0].studentId,
            homeworkEnabled: mappedAssignments[0].homework?.enabled,
            homeworkItemsCount: mappedAssignments[0].homework?.items?.length || 0
          } : null
        });
        setAssignments(mappedAssignments);
      }

      if (ticketsRes?.ok) {
        const rawTicketsData = await ticketsRes.json();
        // Handle paginated response: { tickets: [...], pagination: {...} } or direct array
        const ticketsData = Array.isArray(rawTicketsData) ? rawTicketsData : (rawTicketsData.tickets || []);
        const mappedTickets = ticketsData.map((ticket: any) => ({
          ...ticket,
          id: ticket.id || ticket._id || ticket.id, // Prefer id if backend provides it
          createdAt: ticket.createdAt ? new Date(ticket.createdAt) : new Date(),
        }));
        setTickets(mappedTickets);
        
        const recitationTicketsData = ticketsData
          .filter((t: any) => t.type && ['sabq', 'sabqi', 'manzil'].includes(t.type))
          .map((ticket: any) => ({
            ...ticket,
            id: ticket.id || ticket._id || ticket.id, // Prefer id if backend provides it
            createdAt: ticket.createdAt ? new Date(ticket.createdAt) : new Date(),
          }));
        
        // Merge instead of replace to preserve newly created tickets
        setRecitationTickets(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const newTickets = recitationTicketsData.filter(t => !existingIds.has(t.id));
          const merged = [...prev, ...newTickets];
          // Update existing tickets with fresh data
          const updated = merged.map(t => {
            const fresh = recitationTicketsData.find(ft => (ft.id || ft._id) === t.id);
            return fresh ? { ...t, ...fresh, id: fresh.id || fresh._id || t.id } : t;
          });
          return updated;
        });
      }

      if (notificationsRes?.ok) {
        const notificationsData = await notificationsRes.json();
        setAdminNotifications(notificationsData);
      }

      if (import.meta.env.DEV) {
        console.log('✅ Light refresh completed');
      }
    } catch (error) {
      console.error('❌ Light refresh error:', error);
    } finally {
      isLoadingRef.current = false;
      setLoadingStep('');
    }
  }, []);

  // Ultra-lightweight refresh - ONLY students and teachers (fastest option)
  // Use this after student/teacher assignment updates instead of full refreshData()
  // Performance: 10x faster (3-5s → 300-500ms) - only 2 API calls instead of 5+
  const refreshStudentsAndTeachers = useCallback(async () => {
    try {
      // Fetch ONLY students and teachers in parallel (no assignments, tickets, notifications)
      const [studentsResponse, teachersResponse] = await Promise.all([
        fetchWithTimeout(`${API_BASE}/students`, {}, 8000, true).catch(() => null), // Phase 7: Requires auth for PII filtering
        fetchWithTimeout(`${API_BASE}/teachers`, {}, 8000).catch(() => null)
      ]);

      // Load users for mapping (needed for student/teacher data)
      const usersResponse = await fetchWithTimeout(`${API_BASE}/users`, {}, 5000, false).catch(() => null);
      const users = usersResponse?.ok ? await usersResponse.json() : [];

      // Process students
      if (studentsResponse?.ok) {
        const studentRecords = await studentsResponse.json();
        const studentsData = studentRecords.map((studentRecord: any) => {
          const userId = studentRecord.userId?._id || studentRecord.userId || studentRecord.userId?._id?.toString();
          const user = users.find((u: any) => 
            u._id?.toString() === userId?.toString() ||
            u._id === userId ||
            (studentRecord.email && u.email === studentRecord.email)
          ) || {};
          
          return {
            // id should ALWAYS be the Student document _id (not User _id) to match assignment.studentId
            id: studentRecord._id || studentRecord.id,
            studentRecordId: studentRecord._id || studentRecord.id,
            userId: userId || user._id || user.id,
            fullName: studentRecord.fullName || studentRecord.name || user.name || user.fullName || 'Unknown',
            email: studentRecord.email || user.email || '',
            phone: studentRecord.contact || studentRecord.phone || user.phone || '',
            contact: studentRecord.contact || studentRecord.phone || user.phone || '',
            address: studentRecord.address || user.address || '',
            dateOfBirth: studentRecord.dateOfBirth || user.dateOfBirth || new Date().toISOString(),
            enrollmentDate: studentRecord.enrolledDate || studentRecord.enrollmentDate || user.enrollmentDate || new Date().toISOString(),
            level: studentRecord.level || user.level || 'beginner',
            status: studentRecord.status || user.status || 'active',
            assignedTeacher: studentRecord.assignedTeacher || studentRecord.assignedTeacherId || (studentRecord.assignedTeacherIds && studentRecord.assignedTeacherIds.length > 0 ? studentRecord.assignedTeacherIds[0] : '') || (studentRecord.assignedTeachers && studentRecord.assignedTeachers.length > 0 ? studentRecord.assignedTeachers[0] : '') || user.assignedTeacher || '',
            assignedTeacherIds: studentRecord.assignedTeacherIds || studentRecord.assignedTeachers || [],
            assignedTeachers: studentRecord.assignedTeachers || studentRecord.assignedTeacherIds || [],
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
            program: studentRecord.program || user.program || 'Full-Time HQ', // Default to Full-Time HQ if missing
            parentName: studentRecord.parentName || user.parentName || '',
            tuitionFee: studentRecord.tuitionFee || user.tuitionFee || 0,
            registrationAmount: studentRecord.registrationAmount || user.registrationAmount || 0,
            schedule: studentRecord.schedule || user.schedule || {},
            siblings: studentRecord.siblings || user.siblings || []
          };
        });
        setStudents(studentsData);
        // Cache students
        dataCache.set('students', studentRecords);
      }

      // Process teachers
      if (teachersResponse?.ok) {
        const teacherRecords = await teachersResponse.json();
        const teachersData = users
          .filter((user: any) => user.role === 'teacher')
          .map((user: any) => {
            const teacherRecord = teacherRecords.find((tr: any) => 
              tr.userId?._id === user._id || 
              tr.userId?._id?.toString() === user._id?.toString() ||
              (tr.userId && typeof tr.userId === 'object' && tr.userId._id === user._id) ||
              tr._id === user._id ||
              tr._id?.toString() === user._id?.toString()
            );
            
            const teacherProfile = user.teacherProfile || teacherRecord || {};
            const permissionsFromRecord = teacherRecord?.permissions || teacherProfile.permissions || {};
            
            return {
              id: user._id,
              teacherDocumentId: teacherRecord?._id || teacherRecord?.id,
              userId: user._id,
              fullName: user.name || user.fullName || teacherRecord?.fullName || 'Unknown',
              email: user.email || teacherRecord?.email || '',
              phone: user.phone || teacherRecord?.contact || '',
              contact: user.phone || user.contact || teacherRecord?.contact || '',
              address: user.address || teacherRecord?.address || '',
              assignedStudents: teacherRecord?.assignedStudents || teacherProfile.assignedStudents || [],
              permissions: permissionsFromRecord,
              avatar: user.avatar || teacherRecord?.avatar || '',
              courses: teacherRecord?.courses || user.courses || [],
              schedule: teacherRecord?.schedule || user.schedule || {},
              bio: teacherRecord?.bio || user.bio || '',
              specialization: teacherRecord?.specialization || user.specialization || '',
              experience: teacherRecord?.experience || user.experience || 0,
              qualifications: teacherRecord?.qualifications || user.qualifications || []
            };
          });
        setTeachers(teachersData);
        // Cache teachers
        dataCache.set('teachers', teacherRecords);
      }

      if (import.meta.env.DEV) {
        console.log('✅ Students and teachers refreshed (fast)');
      }
    } catch (error) {
      console.error('❌ Students/Teachers refresh error:', error);
    }
  }, []);

  // Auto-refresh when window becomes visible (user switches back to tab)
  // DISABLED: Too aggressive and erases user work. Use manual refresh instead.
  // useEffect(() => {
  //   const handleVisibilityChange = () => {
  //     if (document.visibilityState === 'visible' && hasLoadedRef.current) {
  //       // Use lightweight refresh when tab becomes visible (faster)
  //       const lastRefresh = sessionStorage.getItem('lastDataRefresh');
  //       const now = Date.now();
  //       if (!lastRefresh || (now - parseInt(lastRefresh)) > 30000) {
  //         if (import.meta.env.DEV) {
  //           console.log('👁️ Tab became visible - refreshing data');
  //         }
  //         refreshDataLight(); // Use lightweight refresh for better UX
  //         sessionStorage.setItem('lastDataRefresh', now.toString());
  //       }
  //     }
  //   };

  //   document.addEventListener('visibilitychange', handleVisibilityChange);
  //   return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  // }, [refreshDataLight]);

  // Periodic auto-refresh (every 2 minutes when tab is active) - lightweight
  // DISABLED: Too aggressive and erases user work. Use manual refresh instead.
  // useEffect(() => {
  //   if (!hasLoadedRef.current) return;

  //   const interval = setInterval(() => {
  //     if (document.visibilityState === 'visible' && !isLoadingRef.current) {
  //       if (import.meta.env.DEV) {
  //         console.log('🔄 Periodic auto-refresh triggered');
  //       }
  //       refreshDataLight(); // Use lightweight refresh for periodic updates
  //     }
  //   }, 120000); // 2 minutes

  //   return () => clearInterval(interval);
  // }, [refreshDataLight]);

  // Re-apply masking when user changes (e.g., after login)
  useEffect(() => {
    if (currentUser && isDeveloperAccount(currentUser) && students.length > 0) {
      console.log('🔄 User changed to developer account - re-applying data masking');
      // Re-apply masking to existing data
      const maskedStudents = maskStudents(students);
      const maskedTeachers = maskTeachers(teachers);
      const maskedAdmins = admins.map((admin, index) => maskUser(admin, index));
      setStudents(maskedStudents);
      setTeachers(maskedTeachers);
      setAdmins(maskedAdmins);
    }
  }, [currentUser?.email, currentUser?.isDeveloper, currentUser?.isTestAccount]);

  // Refresh teacher notifications when user is a teacher
  useEffect(() => {
    if (currentUser?.role === 'teacher') {
      refreshTeacherNotifications();
    } else {
      setTeacherNotifications([]);
    }
  }, [currentUser?.role, currentUser?.email]);

  // Student operations
  const addStudent = async (student: Student) => {
    try {
      // Create user first (requires authentication)
      // Password is optional - student can set it later via password reset
      let newUser;
      const userResponse = await fetchWithTimeout(
        `${API_BASE}/users`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: student.fullName,
            email: student.email,
            role: 'student',
            // No password - student will set it later via password reset or initial login flow
            avatar: student.avatar
          }),
        },
        10000,
        true // requireAuth = true
      );

      if (!userResponse.ok) {
        // Check if user already exists (409 Conflict)
        if (userResponse.status === 409) {
          // User already exists - fetch the existing user by email
          // This is expected behavior, not an error
          try {
            const usersResponse = await fetchWithTimeout(
              `${API_BASE}/users`,
              {
                method: 'GET',
              },
              10000,
              true // requireAuth = true
            );
            
            if (usersResponse.ok) {
              const users = await usersResponse.json();
              const existingUser = users.find((u: any) => u.email === student.email);
              if (existingUser) {
                newUser = existingUser;
                if (import.meta.env.DEV) {
                  console.log(`✅ Found existing user for email ${student.email}, using existing user ID`);
                }
              } else {
                throw new Error('User with that email already exists, but could not find the user record.');
              }
            } else {
              throw new Error('Failed to fetch existing user');
            }
          } catch (error) {
            throw new Error(`User with email ${student.email} already exists, but could not retrieve the user record: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        } else {
          // Other error - throw it
          let message = 'Failed to create user';
          try {
            const errorPayload = await userResponse.json();
            message = errorPayload?.error || message;
          } catch {
            // ignore JSON parse errors
          }
          throw new Error(message);
        }
      } else {
        // User created successfully
        newUser = await userResponse.json();
      }

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

      setStudents(prev => {
        const updated = [...prev, enhancedStudent];
        // ✅ FIX: Invalidate and update cache
        dataCache.delete('students');
        dataCache.set('students', updated);
        // Also invalidate users cache (student creates user)
        dataCache.delete('users');
        return updated;
      });
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
      // INPUT VALIDATION - Prevent unnecessary API calls
      // Why: Fails fast with clear error message
      if (!id || id.trim() === '') {
        throw new Error('Student ID is required');
      }

      // Update via /api/students/:id (requires Student Document ID, not User ID)
      const response = await fetch(`${API_BASE}/students/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(), // Add authentication headers
        },
        body: JSON.stringify(student),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to update student';
        let errorData: any = {};
        
        try {
          errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        // Provide helpful error messages based on status code
        // Why: Better user experience and debugging
        if (response.status === 404) {
          console.error(`❌ Student not found with ID: ${id}`);
          errorMessage = `Student not found. ID: ${id}. Make sure you're using the Student Document ID (studentRecordId).`;
        } else if (response.status === 400) {
          errorMessage = `Invalid request: ${errorMessage}`;
        } else if (response.status === 500) {
          errorMessage = `Server error: ${errorMessage}. Check backend logs for details.`;
        }
        
        throw new Error(errorMessage);
      }

      const updatedStudent = await response.json();
      
      // Map MongoDB _id to id for consistency
      const mappedStudent = {
        ...updatedStudent,
        id: updatedStudent._id || updatedStudent.id || id,
      };

      // OPTIMISTIC STATE UPDATE - Update local state immediately
      // Why: Immediate UI feedback without waiting for refresh
      // Performance: 20-50x faster (3-5s → 100-200ms) - removed expensive refreshData() call
      // Reliability: If refresh fails, student still updated locally
      setStudents(prev => {
        const updated = prev.map(s => {
          const sId = s.id || (s as any)._id;
          const studentRecordId = (s as any).studentRecordId;
          
          // Match by studentRecordId (preferred) or id/_id
          if (studentRecordId === id || sId === id || sId === mappedStudent.id || sId === mappedStudent._id) {
            return { 
              ...s, 
              ...mappedStudent, 
              ...student,
              studentRecordId: mappedStudent._id || mappedStudent.id || studentRecordId
            };
          }
          return s;
        });
        
        // ✅ FIX: Invalidate and update cache
        dataCache.delete('students');
        dataCache.set('students', updated);
        
        return updated;
      });
      
      // Log success (dev only)
      if (import.meta.env.DEV) {
        console.log('✅ Student updated successfully:', mappedStudent.fullName || mappedStudent.name || 'Student');
      }

      return mappedStudent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update student';
      console.error(`❌ Error updating student ${id}:`, err);
      throw err; // Re-throw to let caller handle it
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
      let response = await fetchWithTimeout(
        `${API_BASE}/students/${id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        },
        15000,
        true // requireAuth
      );

      // If that fails, try /api/users/:id as fallback
      if (!response.ok) {
        console.log(`⚠️ DELETE /api/students/${id} failed (${response.status}), trying /api/users/${id}...`);
        response = await fetchWithTimeout(
          `${API_BASE}/users/${id}`,
          {
            method: 'DELETE',
            headers: getAuthHeaders(),
          },
          15000,
          true // requireAuth
        );
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
      setStudents(prev => {
        const updated = prev.filter(s => {
          const sId = s.id || (s as any)._id;
          return sId !== id && sId !== (studentToDelete?.id) && sId !== (studentToDelete as any)?._id;
        });
        
        // ✅ FIX: Invalidate and update cache
        dataCache.delete('students');
        dataCache.set('students', updated);
        // Also invalidate users cache (student deletion affects users)
        dataCache.delete('users');
        
        return updated;
      });

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
    const requestId = `FRONTEND-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      console.log(`\n📝 [${requestId}] ========== FRONTEND: TEACHER CREATION START ==========`);
      console.log(`[${requestId}] Timestamp: ${new Date().toISOString()}`);
      console.log(`[${requestId}] Teacher data received:`, {
        fullName: teacher.fullName,
        email: teacher.email,
        employmentType: teacher.employmentType,
        department: teacher.department,
        hasPermissions: !!teacher.permissions,
        hasSchedule: !!teacher.schedule,
        hasPayroll: !!teacher.payroll
      });
      
      // Create user first - use fetchWithTimeout with authentication
      // Password is optional - teacher can set it later via password reset
      console.log(`[${requestId}] Step 1: Creating user account...`);
      const userPayload = {
        name: teacher.fullName,
        email: teacher.email,
        role: 'teacher',
        avatar: teacher.avatar
      };
      console.log(`[${requestId}] User payload:`, userPayload);
      
      const userResponse = await fetchWithTimeout(
        `${API_BASE}/users`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: teacher.fullName,
            email: teacher.email,
            role: 'teacher',
            // No password - teacher will set it later via password reset or initial login flow
            avatar: teacher.avatar
          }),
        },
        10000,
        true // requireAuth = true - includes Authorization header
      );

      console.log(`[${requestId}] User creation response status:`, userResponse.status, userResponse.statusText);

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        let errorMessage = 'Failed to create user';
        let errorDetails = {};
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        console.error(`[${requestId}] ❌ User creation failed:`, {
          status: userResponse.status,
          statusText: userResponse.statusText,
          error: errorMessage,
          details: errorDetails
        });
        throw new Error(errorMessage);
      }

      const newUser = await userResponse.json();
      console.log(`[${requestId}] ✅ User created successfully:`, {
        userId: newUser._id || newUser.id,
        email: newUser.email,
        role: newUser.role
      });

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

      console.log(`[${requestId}] Step 2: Creating teacher profile...`);
      console.log(`[${requestId}] Teacher payload:`, JSON.stringify(teacherPayload, null, 2));
      console.log(`[${requestId}] Request URL: ${API_BASE}/teachers`);
      console.log(`[${requestId}] Request method: POST`);

      const teacherResponse = await fetchWithTimeout(
        `${API_BASE}/teachers`,
        {
          method: 'POST',
          body: JSON.stringify(teacherPayload),
        },
        10000,
        true // Phase 7: Teachers endpoint now requires auth and canManageTeachers permission
      );

      console.log(`[${requestId}] Teacher creation response status:`, teacherResponse.status, teacherResponse.statusText);

      if (!teacherResponse.ok) {
        const errorText = await teacherResponse.text();
        let errorMessage = 'Failed to create teacher profile';
        let errorDetails = {};
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData;
          console.error(`[${requestId}] ❌ Teacher creation failed:`, {
            status: teacherResponse.status,
            statusText: teacherResponse.statusText,
            error: errorMessage,
            details: errorDetails,
            requestId: errorData.requestId || 'unknown'
          });
        } catch {
          errorMessage = errorText || errorMessage;
          console.error(`[${requestId}] ❌ Teacher creation failed (non-JSON response):`, {
            status: teacherResponse.status,
            statusText: teacherResponse.statusText,
            error: errorMessage
          });
        }
        throw new Error(errorMessage);
      }

      const newTeacher = await teacherResponse.json();
      console.log(`[${requestId}] ✅ Teacher created successfully:`, {
        teacherId: newTeacher._id || newTeacher.id,
        email: newTeacher.email,
        fullName: newTeacher.fullName
      });
      
      // Map MongoDB _id to id for consistency
      const mappedTeacher = {
        ...teacher,
        id: newTeacher._id || newTeacher.id || newUser._id || newUser.id,
        _id: newTeacher._id,
      };

      // Update local state
      setTeachers(prev => {
        const updated = [...prev, mappedTeacher];
        // ✅ FIX: Invalidate and update cache
        dataCache.delete('teachers');
        dataCache.set('teachers', updated);
        // Also invalidate users cache (teacher creates user)
        dataCache.delete('users');
        return updated;
      });

      // Step 3: Verify teacher was saved
      console.log(`[${requestId}] Step 3: Verifying teacher in database...`);
      try {
        const verifyResponse = await fetchWithTimeout(
          `${API_BASE}/teachers/${newTeacher._id || newTeacher.id}`,
          { method: 'GET' },
          5000,
          true
        );
        
        if (verifyResponse.ok) {
          const verifiedTeacher = await verifyResponse.json();
          console.log(`[${requestId}] ✅ Teacher verified in database`);
        } else {
          console.warn(`[${requestId}] ⚠️ Could not verify teacher (non-critical):`, verifyResponse.status);
        }
      } catch (verifyError) {
        console.warn(`[${requestId}] ⚠️ Verification failed (non-critical):`, verifyError);
      }

      const totalTime = Date.now() - startTime;
      console.log(`[${requestId}] ========== FRONTEND: TEACHER CREATION SUCCESS (${totalTime}ms) ==========\n`);

      if (import.meta.env.DEV) {
        console.log('✅ Teacher created successfully:', mappedTeacher.fullName);
      }
      
      return mappedTeacher;
    } catch (err) {
      const totalTime = Date.now() - startTime;
      console.error(`\n[${requestId}] ========== FRONTEND: TEACHER CREATION FAILED (${totalTime}ms) ==========`);
      console.error(`[${requestId}] Error:`, err);
      console.error(`[${requestId}] Error message:`, err instanceof Error ? err.message : 'Unknown error');
      console.error(`[${requestId}] Error stack:`, err instanceof Error ? err.stack : 'No stack trace');
      console.error(`[${requestId}] ========== END FRONTEND ERROR LOG ==========\n`);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to add teacher';
      setError(errorMessage);
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

      // Log permissions update for debugging
      if (updatePayload.permissions) {
        console.log('🔐 Updating teacher permissions:', {
          teacherId: id,
          permissionCount: Object.keys(updatePayload.permissions).length,
          enabledCount: Object.values(updatePayload.permissions).filter(v => v === true).length,
          disabledCount: Object.values(updatePayload.permissions).filter(v => v === false).length
        });
      }

      // Try updating via /api/teachers/:id first
      let response = await fetchWithTimeout(
        `${API_BASE}/teachers/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(updatePayload),
        },
        10000,
        true // Require authentication token
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
          true // Require authentication token
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
        // Use permissions from backend response, fallback to what we sent, then defaults
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

      // Update local state - merge to preserve all fields, prioritize backend response permissions
      setTeachers(prev => {
        const updated = prev.map(t => {
          const tId = t.id || (t as any)._id;
          if (tId === id || tId === mappedTeacher.id || tId === mappedTeacher._id) {
            return {
              ...t,
              ...mappedTeacher,
              // Use permissions from backend response if available, otherwise use what we sent
              permissions: updatedTeacher.permissions || teacher.permissions || t.permissions
            };
          }
          return t;
        });
        
        // ✅ FIX: Invalidate and update cache
        dataCache.delete('teachers');
        dataCache.set('teachers', updated);
        
        return updated;
      });

      if (import.meta.env.DEV) {
        console.log('✅ Teacher updated successfully:', mappedTeacher.fullName || mappedTeacher.name || 'Teacher');
        console.log('✅ Updated permissions:', mappedTeacher.permissions);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update teacher';
      setError(errorMessage);
      console.error('❌ Error updating teacher:', err);
      throw err;
    }
  };

  const deleteTeacher = async (id: string) => {
    try {
      // Use /api/teachers/:id endpoint which deletes both Teacher and User documents
      const response = await fetchWithTimeout(
        `${API_BASE}/teachers/${id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        },
        15000,
        true // requireAuth
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete teacher' }));
        throw new Error(errorData.error || 'Failed to delete teacher');
      }

      setTeachers(prev => {
        // Remove teacher by matching id, _id, or teacherDocumentId
        const updated = prev.filter(t => {
          const tId = t.id || (t as any)._id || (t as any).teacherDocumentId;
          return tId !== id && String(tId) !== String(id);
        });
        // ✅ FIX: Invalidate and update cache
        dataCache.delete('teachers');
        dataCache.set('teachers', updated);
        // Also invalidate users cache (teacher deletion affects users)
        dataCache.delete('users');
        return updated;
      });
      if (import.meta.env.DEV) {
        console.log('✅ Teacher deleted successfully from MongoDB (both Teacher and User documents)');
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
      // Password is optional - admin can set it later via password reset
      const userResponse = await fetchWithTimeout(
        `${API_BASE}/users`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: admin.fullName,
            email: admin.email,
            role: 'admin',
            // No password - admin will set it later via password reset or initial login flow
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
      
      setAdmins(prev => {
        const updated = [...prev, adminWithId];
        // ✅ FIX: Invalidate users cache (admins stored in users collection)
        dataCache.delete('users');
        return updated;
      });
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
      // Admins can be stored in either Admin collection or User collection
      // Try Admin endpoint first, then fallback to User endpoint
      let response = await fetchWithTimeout(
        `${API_BASE}/admins/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(admin),
        },
        10000,
        true // requireAuth = true - includes Authorization header
      );

      // If Admin endpoint returns 404, try User endpoint (admin might only exist in User collection)
      if (!response.ok && response.status === 404) {
        if (import.meta.env.DEV) {
          console.log('⚠️ Admin not found in Admin collection, trying User collection...');
        }
        response = await fetchWithTimeout(
          `${API_BASE}/users/${id}`,
          {
            method: 'PUT',
            body: JSON.stringify(admin),
          },
          10000,
          true // requireAuth = true - includes Authorization header
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to update admin';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const updatedAdmin = await response.json();
      
      // Update local state with the response from server
      setAdmins(prev => {
        const updated = prev.map(a => {
          const aId = a.id || (a as any)._id;
          const updatedId = updatedAdmin._id || updatedAdmin.id || id;
          return (aId === id || aId === updatedId) ? { ...a, ...admin, ...updatedAdmin } : a;
        });
        
        // ✅ FIX: Invalidate users cache (admins stored in users collection)
        dataCache.delete('users');
        
        return updated;
      });
      
      if (import.meta.env.DEV) {
        console.log('✅ Admin updated successfully in MongoDB');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update admin in MongoDB';
      setError(errorMessage);
      console.error('Error updating admin:', err);
      throw err; // Re-throw to let caller handle the error
    }
  };

  const deleteAdmin = async (id: string) => {
    try {
      // Use fetchWithTimeout with authentication
      const response = await fetchWithTimeout(
        `${API_BASE}/users/${id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        },
        10000,
        true // requireAuth = true - includes Authorization header
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to delete admin';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      setAdmins(prev => {
        const updated = prev.filter(a => {
          const aId = a.id || (a as any)._id;
          return aId !== id;
        });
        
        // ✅ FIX: Invalidate users cache (admins stored in users collection)
        dataCache.delete('users');
        
        return updated;
      });
      
      if (import.meta.env.DEV) {
        console.log('✅ Admin deleted successfully from MongoDB');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete admin from MongoDB';
      setError(errorMessage);
      console.error('Error deleting admin:', err);
      throw err; // Re-throw to let caller handle the error
    }
  };

  // Helper functions
  const getStudentsByTeacher = useCallback((teacherId: string) => {
    // Teachers can now see all students (no restriction)
    // Return all students regardless of assignment
    // Note: Removed debug logging to reduce console spam
    return students;
  }, [students]);

  const getTeacherById = (id: string) => {
    return teachers.find(teacher => teacher.id === id);
  };

  const getStudentByEmail = (email: string) => {
    if (!email) return undefined;
    
    // Normalize email for case-insensitive comparison
    const normalizedEmail = email.trim().toLowerCase();
    
    // Try exact match first (case-insensitive)
    let student = students.find(s => {
      const studentEmail = (s.email || '').trim().toLowerCase();
      return studentEmail === normalizedEmail;
    });
    
    return student;
  };

  // Unified student lookup - finds student by email OR userId
  const getStudentByIdentity = (email?: string, userId?: string) => {
    // Try email first
    if (email) {
      const student = getStudentByEmail(email);
      if (student) return student;
    }
    
    // Fallback to userId if email lookup failed
    if (userId) {
      const normalizedUserId = normalizeId(userId);
      const student = students.find(s => {
        const sUserId = normalizeId((s as any).userId);
        return sUserId === normalizedUserId;
      });
      if (student) return student;
    }
    
    return undefined;
  };

  // Memoized refreshData to prevent unnecessary re-renders and concurrent calls
  const refreshData = useCallback(async () => {
    if (isLoadingRef.current) {
      if (import.meta.env.DEV) {
        console.log('⏸️ Refresh skipped - data load already in progress');
      }
      return;
    }
    // Reset the hasLoadedRef to allow refresh
    hasLoadedRef.current = false;
    await loadData();
  }, [loadData]); // Include loadData in deps

  // Assignment management functions
  const addAssignment = async (assignment: Assignment) => {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE}/assignments`,
        {
          method: 'POST',
          body: JSON.stringify(assignment)
        },
        10000,
        true // requireAuth = true - includes Authorization header
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to create assignment';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const newAssignment = await response.json();
      // Map _id to id for consistency
      const mappedAssignment = {
        ...newAssignment,
        id: newAssignment._id || newAssignment.id,
        studentId: normalizeId(newAssignment.studentId),
        createdAt: newAssignment.createdAt ? new Date(newAssignment.createdAt) : new Date(),
        updatedAt: newAssignment.updatedAt ? new Date(newAssignment.updatedAt) : new Date(),
      };
      
      // Update React state
      setAssignments(prev => [...prev, mappedAssignment]);
      
      // ✅ FIX: Invalidate cache to ensure students see new assignment immediately
      dataCache.delete('assignments');
      
      // ✅ FIX: Update cache with new assignment for immediate visibility
      const currentAssignments = assignments;
      const updatedAssignments = [...currentAssignments, mappedAssignment];
      dataCache.set('assignments', updatedAssignments);
      
      if (import.meta.env.DEV) {
        console.log('✅ Assignment created, cache invalidated and updated:', {
          assignmentId: mappedAssignment.id,
          studentId: mappedAssignment.studentId
        });
      }
    } catch (error) {
      console.error('Error adding assignment:', error);
      throw error;
    }
  };

  const updateAssignment = async (id: string, assignment: Partial<Assignment>) => {
    try {
      if (import.meta.env.DEV) {
        console.log('📤 Updating assignment:', {
          id,
          homework: assignment.homework,
          homeworkItems: assignment.homework?.items?.length || 0
        });
      }
      
      const response = await fetchWithTimeout(
        `${API_BASE}/assignments/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(assignment)
        },
        10000,
        true // requireAuth = true - includes Authorization header
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to update assignment';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        console.error('❌ Update failed:', errorMessage);
        throw new Error(errorMessage);
      }
      
      const updatedAssignment = await response.json();
      
      // Normalize the assignment ID
      const normalizedId = updatedAssignment._id || updatedAssignment.id;
      const normalizedUpdatedAssignment = {
        ...updatedAssignment,
        id: normalizedId,
        _id: normalizedId
      };
      
      if (import.meta.env.DEV) {
        console.log('✅ Assignment updated:', {
          id: normalizedId,
          homeworkEnabled: normalizedUpdatedAssignment.homework?.enabled,
          homeworkItemsCount: normalizedUpdatedAssignment.homework?.items?.length || 0,
          homeworkItems: normalizedUpdatedAssignment.homework?.items
        });
      }
      
      // Update assignments list with the full updated assignment
      setAssignments(prev => {
        const updated = prev.map(a => {
          const aId = a._id || a.id;
          if (String(aId) === String(normalizedId)) {
            // Deep merge to ensure homework items are properly updated
            const merged = {
              ...a,
              ...normalizedUpdatedAssignment,
              id: normalizedId,
              _id: normalizedId,
              homework: {
                enabled: normalizedUpdatedAssignment.homework?.enabled !== undefined 
                  ? normalizedUpdatedAssignment.homework.enabled
                  : (normalizedUpdatedAssignment.homework?.items?.length > 0 || a.homework?.enabled),
                items: normalizedUpdatedAssignment.homework?.items || a.homework?.items || [],
                notes: normalizedUpdatedAssignment.homework?.notes || a.homework?.notes || '',
                content: normalizedUpdatedAssignment.homework?.content || a.homework?.content || '',
                link: normalizedUpdatedAssignment.homework?.link || a.homework?.link || ''
              }
            };
            
            if (import.meta.env.DEV) {
              console.log('🔄 Updated assignment in state:', {
                id: merged.id,
                homeworkEnabled: merged.homework.enabled,
                homeworkItemsCount: merged.homework.items.length,
                homeworkItems: merged.homework.items
              });
            }
            
            return merged;
          }
          return a;
        });
        
        // If assignment wasn't found, add it (shouldn't happen but safety check)
        const found = updated.find(a => {
          const aId = a._id || a.id;
          return String(aId) === String(normalizedId);
        });
        
        if (!found && normalizedUpdatedAssignment.studentId) {
          console.warn('⚠️ Assignment not found in list, adding it:', normalizedId);
          updated.push(normalizedUpdatedAssignment as Assignment);
        }
        
        // ✅ FIX: Invalidate and update cache with updated assignments
        dataCache.delete('assignments');
        dataCache.set('assignments', updated);
        
        if (import.meta.env.DEV) {
          console.log('✅ Assignment updated, cache invalidated and updated:', {
            assignmentId: normalizedId
          });
        }
        
        return updated;
      });
    } catch (error) {
      console.error('Error updating assignment:', error);
      throw error;
    }
  };

  const deleteAssignment = async (id: string) => {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE}/assignments/${id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        },
        15000,
        true // requireAuth
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete assignment' }));
        throw new Error(errorData.error || 'Failed to delete assignment');
      }
      
      // Update local state immediately for instant UI feedback
      setAssignments(prev => {
        const updated = prev.filter(a => {
          const aId = a._id || a.id;
          return aId !== id;
        });
        
        // ✅ FIX: Invalidate and update cache
        dataCache.delete('assignments');
        dataCache.set('assignments', updated);
        
        return updated;
      });
      
      console.log('✅ Assignment deleted successfully. Local state updated.');
    } catch (error) {
      console.error('Error deleting assignment:', error);
      throw error;
    }
  };

  const getStudentAssignments = (studentId: string): Assignment[] => {
    if (!studentId) return [];
    
    const normalizedStudentId = normalizeId(studentId);
    
    // Find the student to get all possible ID formats
    // Try to find by studentRecordId first (most reliable), then by id, then by userId
    const student = students.find(s => {
      const sId = normalizeId(s.id || (s as any)._id);
      const sRecordId = normalizeId((s as any).studentRecordId);
      const sUserId = normalizeId((s as any).userId);
      return sId === normalizedStudentId || 
             sRecordId === normalizedStudentId || 
             sUserId === normalizedStudentId;
    });
    
    // Collect all possible student IDs to match against
    // This includes both User IDs and Student document IDs
    const possibleStudentIds = new Set<string>();
    possibleStudentIds.add(normalizedStudentId);
    
    if (student) {
      // Add student.id (could be User _id or Student _id)
      if (student.id) possibleStudentIds.add(normalizeId(student.id));
      // Add studentRecordId (Student document _id) - THIS IS WHAT ASSIGNMENTS USE
      if ((student as any).studentRecordId) {
        const recordId = normalizeId((student as any).studentRecordId);
        possibleStudentIds.add(recordId);
      }
      // Add _id (Student document _id)
      if ((student as any)._id) possibleStudentIds.add(normalizeId((student as any)._id));
      // Add userId (User document _id)
      if ((student as any).userId) possibleStudentIds.add(normalizeId((student as any).userId));
    } else {
      // If student not found, try to find by checking if the ID matches any studentRecordId
      // This handles the case where we're passed a User ID but need to find the Student ID
      const studentByRecordId = students.find(s => {
        const sRecordId = normalizeId((s as any).studentRecordId);
        return sRecordId === normalizedStudentId;
      });
      if (studentByRecordId && (studentByRecordId as any).studentRecordId) {
        possibleStudentIds.add(normalizeId((studentByRecordId as any).studentRecordId));
      }
      
      // Also try to find by userId - if the passed ID is a User ID, find the student
      const studentByUserId = students.find(s => {
        const sUserId = normalizeId((s as any).userId);
        return sUserId === normalizedStudentId;
      });
      if (studentByUserId) {
        // If found by userId, add the studentRecordId (which is what assignments use)
        if ((studentByUserId as any).studentRecordId) {
          possibleStudentIds.add(normalizeId((studentByUserId as any).studentRecordId));
        }
        // Also add the userId in case some assignments use it
        if ((studentByUserId as any).userId) {
          possibleStudentIds.add(normalizeId((studentByUserId as any).userId));
        }
      }
    }
    
    const filtered = assignments.filter(a => {
      // Extract studentId from multiple possible locations and formats
      let assignmentStudentId = '';
      
      // Try direct studentId property first (should be normalized from mapping)
      if (a.studentId) {
        assignmentStudentId = normalizeId(a.studentId);
      }
      // Fallback to _id.studentId if direct property doesn't exist
      else if ((a as any)._id?.studentId) {
        assignmentStudentId = normalizeId((a as any)._id.studentId);
      }
      // Fallback to raw assignment data
      else if ((a as any).studentId) {
        assignmentStudentId = normalizeId((a as any).studentId);
      }
      
      // Compare normalized IDs against all possible student IDs
      const matches = assignmentStudentId && possibleStudentIds.has(assignmentStudentId);
      
      // Only log matches in dev mode and only for first few matches to reduce console noise
      if (matches && import.meta.env.DEV) {
        // Use a static counter to limit logging
        const logCount = (window as any).__assignmentMatchLogCount || 0;
        if (logCount < 3) {
          (window as any).__assignmentMatchLogCount = logCount + 1;
          console.log('✅ Assignment matched for student:', {
            studentId: normalizedStudentId,
            assignmentId: a.id,
            assignmentStatus: a.status,
          });
        }
      }
      
      return matches;
    });
    
    // Enhanced debugging - show sample of unmatched assignments for this student
    const unmatchedSample = assignments
      .filter(a => {
        const assignmentStudentId = normalizeId(a.studentId || (a as any)._id?.studentId);
        return assignmentStudentId && assignmentStudentId !== normalizedStudentId;
      })
      .slice(0, 3)
      .map(a => ({
        id: a.id,
        studentId: normalizeId(a.studentId || (a as any)._id?.studentId),
        rawStudentId: a.studentId
      }));
    
    // Only log if there are assignments found (reduce console noise)
    if (filtered.length > 0) {
      console.log('🔍 getStudentAssignments:', {
        studentId: normalizedStudentId,
        totalAssignments: assignments.length,
        filteredCount: filtered.length,
        assignmentIds: filtered.map(a => a.id),
        homeworkDetails: filtered.map(a => ({
          id: a.id,
          enabled: a.homework?.enabled,
          itemsCount: a.homework?.items?.length || 0,
          items: a.homework?.items
        })),
        uniqueStudentIds: [...new Set(assignments.map(a => normalizeId(a.studentId || (a as any)._id?.studentId)))].slice(0, 10),
        unmatchedSample: unmatchedSample
      });
    }
    
    return filtered;
  };

  // New Ticket System Functions (sabq/sabqi/manzil workflow)
  const createTicket = async (ticket: Partial<Ticket>): Promise<Ticket> => {
    try {
      console.log('📤 [createTicket] Creating ticket:', ticket);
      const response = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: getAuthHeaders(), // Use getAuthHeaders() to include authentication token
        body: JSON.stringify(ticket)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create ticket' }));
        throw new Error(errorData.error || 'Failed to create ticket');
      }
      const newTicket = await response.json();
      console.log('✅ [createTicket] Ticket created, response:', {
        _id: newTicket._id,
        id: newTicket.id,
        type: newTicket.type,
        status: newTicket.status
      });
      
      // Backend now provides both _id and id, prefer id
      const mappedTicket = {
        ...newTicket,
        id: newTicket.id || newTicket._id || newTicket.id, // Prefer id if backend provides it
        createdAt: newTicket.createdAt ? new Date(newTicket.createdAt) : new Date(),
        updatedAt: newTicket.updatedAt ? new Date(newTicket.updatedAt) : new Date()
      };
      
      console.log('✅ [createTicket] Mapped ticket:', {
        id: mappedTicket.id,
        _id: mappedTicket._id,
        type: mappedTicket.type
      });
      
      setRecitationTickets(prev => {
        // Check if ticket already exists (avoid duplicates)
        const exists = prev.some(t => t.id === mappedTicket.id);
        if (exists) {
          console.log('⚠️ [createTicket] Ticket already in state, updating:', mappedTicket.id);
          return prev.map(t => t.id === mappedTicket.id ? mappedTicket : t);
        }
        console.log('✅ [createTicket] Adding new ticket to state:', mappedTicket.id);
        const updated = [...prev, mappedTicket];
        // ✅ FIX: Invalidate and update cache
        dataCache.delete('tickets');
        dataCache.set('tickets', updated);
        return updated;
      });
      return mappedTicket;
    } catch (error) {
      console.error('❌ [createTicket] Error creating ticket:', error);
      throw error;
    }
  };

  const updateRecitationTicket = async (id: string, ticket: Partial<Ticket>): Promise<Ticket> => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(), // Use getAuthHeaders() to include authentication token (already includes Content-Type)
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
      setRecitationTickets(prev => {
        const updated = prev.map(t => t.id === id ? mappedTicket : t);
        // ✅ FIX: Invalidate and update cache
        dataCache.delete('tickets');
        dataCache.set('tickets', updated);
        return updated;
      });
      return mappedTicket;
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  };

  const startTicket = async (id: string): Promise<Ticket> => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${id}/start`, {
        method: 'POST',
        headers: getAuthHeaders() // Use getAuthHeaders() to include authentication token
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to start ticket' }));
        throw new Error(errorData.error || 'Failed to start ticket');
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
      recitationRange?: any;
      mistakeCount?: number | 'weak';
      mistakeSeverity?: number | 'weak';
      tajweedIssues?: any[];
      reviewNotes?: string;
    }
  ): Promise<Ticket> => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${id}/submit`, {
        method: 'POST',
        headers: getAuthHeaders(), // Use getAuthHeaders() to include authentication token
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to submit ticket' }));
        throw new Error(errorData.error || 'Failed to submit ticket');
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
        headers: getAuthHeaders(), // Use getAuthHeaders() to include authentication token
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
      const assignment = result.assignment;
      
      console.log('✅ Ticket from response:', {
        id: ticket._id || ticket.id,
        sentToAssignmentId: ticket.sentToAssignmentId,
        status: ticket.status,
        studentId: ticket.studentId
      });
      
      // If assignment is returned, add it to local state immediately for instant UI update
      if (assignment && assignment.id) {
        console.log('✅ Adding assignment to local state immediately:', {
          assignmentId: assignment.id,
          studentId: assignment.studentId,
          status: assignment.status,
          sabqiCount: assignment.classwork?.sabqi?.length || 0,
          manzilCount: assignment.classwork?.manzil?.length || 0
        });
        setAssignments(prev => {
          // Check if assignment already exists
          const exists = prev.some(a => (a.id || a._id) === assignment.id);
          let updated;
          if (exists) {
            // Update existing assignment
            updated = prev.map(a => (a.id || a._id) === assignment.id ? {
              ...assignment,
              id: assignment.id || assignment._id,
              studentId: normalizeId(assignment.studentId),
              createdAt: assignment.createdAt ? new Date(assignment.createdAt) : new Date(),
              updatedAt: assignment.updatedAt ? new Date(assignment.updatedAt) : new Date()
            } : a);
          } else {
            // Add new assignment
            updated = [...prev, {
              ...assignment,
              id: assignment.id || assignment._id,
              studentId: normalizeId(assignment.studentId),
              createdAt: assignment.createdAt ? new Date(assignment.createdAt) : new Date(),
              updatedAt: assignment.updatedAt ? new Date(assignment.updatedAt) : new Date()
            }];
          }
          
          // ✅ FIX: Invalidate and update assignments cache
          dataCache.delete('assignments');
          dataCache.set('assignments', updated);
          
          return updated;
        });
      }
      
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
        
        // ✅ FIX: Invalidate and update tickets cache
        dataCache.delete('tickets');
        dataCache.set('tickets', updated);
        
        return updated;
      });
      
      // Double-check: Verify assignment was created and is in the assignments array
      if (import.meta.env.DEV && result.assignment) {
        const assignmentId = result.assignment._id || result.assignment.id;
        const studentId = result.assignment.studentId || ticket.studentId;
        console.log('🔍 Verifying assignment after refresh:', {
          assignmentId,
          studentId,
          assignmentInState: assignments.find(a => (a.id || a._id) === assignmentId) ? 'YES' : 'NO',
          totalAssignments: assignments.length
        });
      }
      
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
        headers: getAuthHeaders(), // Use getAuthHeaders() to include authentication token
        body: JSON.stringify({ teacherId, teacherName, reason })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to reassign ticket' }));
        throw new Error(errorData.error || 'Failed to reassign ticket');
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
    // Teachers can now see all tickets (no restriction by assignment)
    // Return all tickets with valid status for teachers
    const validStatus = ['pending', 'in_progress', 'reassigned'];
    return recitationTickets.filter(t => validStatus.includes(t.status));
  };

  const getPendingReviewTickets = (): Ticket[] => {
    return recitationTickets.filter(t => t.status === 'submitted');
  };

  const getPreviousReports = useCallback(async (studentId: string, type: 'sabqi' | 'manzil'): Promise<Ticket[]> => {
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
  }, []);

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
        // Normalize notifications to have both id and _id
        const normalizedNotifications = notifications.map((n: any) => ({
          ...n,
          id: n.id || n._id,
          _id: n._id || n.id
        }));
        setAdminNotifications(normalizedNotifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    if (!notificationId || notificationId === 'undefined') {
      console.error('Cannot mark notification as read: invalid notification ID', notificationId);
      throw new Error('Invalid notification ID');
    }
    
    try {
      const response = await fetch(`${API_BASE}/admin-notifications/${notificationId}/read`, {
        method: 'PUT'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to mark notification as read:', errorText);
        throw new Error('Failed to mark notification as read');
      }
      
      const updatedNotification = await response.json();
      // Normalize the updated notification
      const normalizedNotification = {
        ...updatedNotification,
        id: updatedNotification.id || updatedNotification._id,
        _id: updatedNotification._id || updatedNotification.id
      };
      
      setAdminNotifications(prev => prev.map(n => {
        const nId = n.id || (n as any)._id;
        const updatedId = normalizedNotification.id || normalizedNotification._id;
        return (nId === notificationId || nId === updatedId) ? normalizedNotification : n;
      }));
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

  // Teacher Notification Functions
  const refreshTeacherNotifications = async () => {
    try {
      // Only fetch if user is a teacher
      if (currentUser?.role !== 'teacher') {
        setTeacherNotifications([]);
        return;
      }

      const response = await fetch(`${API_BASE}/teacher-notifications`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const notifications = await response.json();
        // Ensure notifications are properly formatted
        const formattedNotifications = notifications.map((n: any) => ({
          ...n,
          id: n.id || n._id?.toString() || '',
          createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
          read: n.read || false,
          priority: n.priority || 'low'
        }));
        setTeacherNotifications(formattedNotifications);
        console.log(`✅ Loaded ${formattedNotifications.length} teacher notifications`);
      } else {
        console.warn(`⚠️ Failed to fetch teacher notifications: ${response.status}`);
        if (response.status === 404) {
          // Teacher not found - set empty array instead of error
          setTeacherNotifications([]);
        }
      }
    } catch (error) {
      console.error('❌ Error loading teacher notifications:', error);
      // Don't set error state - just log it
    }
  };

  const markTeacherNotificationAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`${API_BASE}/teacher-notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      const updatedNotification = await response.json();
      // Update local state immediately
      setTeacherNotifications(prev => prev.map(n => {
        const nId = n.id || n._id?.toString() || '';
        const updatedId = updatedNotification.id || updatedNotification._id?.toString() || '';
        if (nId === notificationId || nId === updatedId) {
          return {
            ...updatedNotification,
            id: updatedNotification.id || updatedNotification._id?.toString() || '',
            createdAt: updatedNotification.createdAt ? new Date(updatedNotification.createdAt) : new Date(),
            read: true
          };
        }
        return n;
      }));
      
      // Refresh to ensure consistency
      setTimeout(() => refreshTeacherNotifications(), 500);
    } catch (error) {
      console.error('❌ Error marking teacher notification as read:', error);
      throw error;
    }
  };

  const markAllTeacherNotificationsAsRead = async () => {
    try {
      const response = await fetch(`${API_BASE}/teacher-notifications/read-all`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      
      // Update local state immediately
      setTeacherNotifications(prev => prev.map(n => ({ ...n, read: true })));
      
      // Refresh to ensure consistency
      await refreshTeacherNotifications();
    } catch (error) {
      console.error('❌ Error marking all teacher notifications as read:', error);
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
      const response = await fetchWithTimeout(
        `${API_BASE}/tickets/${id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        },
        15000,
        true // requireAuth
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete ticket' }));
        throw new Error(errorData.error || 'Failed to delete ticket');
      }

      setRecitationTickets(prev => {
        const updated = prev.filter(ticket => {
          const ticketId = ticket._id || ticket.id;
          return ticketId !== id;
        });
        
        // ✅ FIX: Invalidate and update cache
        dataCache.delete('tickets');
        dataCache.set('tickets', updated);
        
        return updated;
      });
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
            const rawTicketsData = await ticketsResponse.json();
            // Handle paginated response: { tickets: [...], pagination: {...} } or direct array
            const ticketsData = Array.isArray(rawTicketsData) ? rawTicketsData : (rawTicketsData.tickets || []);
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
      const response = await fetchWithTimeout(
        `${API_BASE}/tickets/bulk-delete`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ ticketIds: ids }),
        },
        15000,
        true // requireAuth
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to delete tickets');
      }

      // Update both tickets and recitationTickets
      setTickets(prev => prev.filter(ticket => {
        const ticketId = ticket._id || ticket.id;
        return !ids.includes(ticketId);
      }));
      
      setRecitationTickets(prev => prev.filter(ticket => {
        const ticketId = ticket._id || ticket.id;
        return !ids.includes(ticketId);
      }));
      
      // Invalidate cache
      dataCache.delete('tickets');
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
      const response = await fetch(`${API_BASE}/students/${studentId}/personal-mushaf`, {
        headers: getAuthHeaders()
      });
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
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch filtered personal Mushaf');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching filtered personal Mushaf:', error);
      return { mistakes: [] };
    }
  };

  // Add mistake to student's personal Mushaf
  const addMistakeToPersonalMushaf = async (studentId: string, mistake: Omit<MushafMistake, 'id' | 'timestamp'>, markedBy?: string, markedByName?: string) => {
    try {
      const response = await fetch(`${API_BASE}/students/${studentId}/personal-mushaf/mistakes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          mistake,
          markedBy,
          markedByName
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to add mistake' }));
        throw new Error(errorData.error || 'Failed to add mistake to personal Mushaf');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error adding mistake to personal Mushaf:', error);
      throw error;
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

  // Teacher Pair management functions
  const getTeacherPairs = async (): Promise<any[]> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/teacher-pairs`, { method: 'GET' });
      if (!response.ok) throw new Error('Failed to fetch teacher pairs');
      return await response.json();
    } catch (error) {
      console.error('Error fetching teacher pairs:', error);
      return [];
    }
  };

  const getTeacherPair = async (id: string): Promise<any> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/teacher-pairs/${id}`, { method: 'GET' });
      if (!response.ok) throw new Error('Failed to fetch teacher pair');
      return await response.json();
    } catch (error) {
      console.error('Error fetching teacher pair:', error);
      throw error;
    }
  };

  const createTeacherPair = async (pair: any): Promise<any> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/teacher-pairs`, {
        method: 'POST',
        body: JSON.stringify(pair)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create teacher pair' }));
        throw new Error(errorData.error || 'Failed to create teacher pair');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating teacher pair:', error);
      throw error;
    }
  };

  const updateTeacherPair = async (id: string, pair: any): Promise<any> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/teacher-pairs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(pair)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update teacher pair' }));
        throw new Error(errorData.error || 'Failed to update teacher pair');
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating teacher pair:', error);
      throw error;
    }
  };

  const deleteTeacherPair = async (id: string): Promise<void> => {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE}/teacher-pairs/${id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        },
        15000,
        true // requireAuth
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete teacher pair' }));
        throw new Error(errorData.error || 'Failed to delete teacher pair');
      }
    } catch (error) {
      console.error('Error deleting teacher pair:', error);
      throw error;
    }
  };

  const getPairStudents = async (filters?: { pair?: string; student?: string; status?: string }): Promise<any[]> => {
    try {
      const params = new URLSearchParams();
      if (filters?.pair) params.append('pair', filters.pair);
      if (filters?.student) params.append('student', filters.student);
      if (filters?.status) params.append('status', filters.status);
      
      const url = `${API_BASE}/pair-students${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetchWithTimeout(url, { method: 'GET' });
      if (!response.ok) throw new Error('Failed to fetch pair students');
      return await response.json();
    } catch (error) {
      console.error('Error fetching pair students:', error);
      return [];
    }
  };

  const getPairStudent = async (id: string): Promise<any> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/pair-students/${id}`, { method: 'GET' });
      if (!response.ok) throw new Error('Failed to fetch pair student');
      return await response.json();
    } catch (error) {
      console.error('Error fetching pair student:', error);
      throw error;
    }
  };

  const createPairStudent = async (pairStudent: any): Promise<any> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/pair-students`, {
        method: 'POST',
        body: JSON.stringify(pairStudent)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create pair student' }));
        throw new Error(errorData.error || 'Failed to create pair student');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating pair student:', error);
      throw error;
    }
  };

  const updatePairStudent = async (id: string, pairStudent: any): Promise<any> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/pair-students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(pairStudent)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update pair student' }));
        throw new Error(errorData.error || 'Failed to update pair student');
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating pair student:', error);
      throw error;
    }
  };

  const deletePairStudent = async (id: string): Promise<void> => {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE}/pair-students/${id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        },
        15000,
        true // requireAuth
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete pair student' }));
        throw new Error(errorData.error || 'Failed to delete pair student');
      }
    } catch (error) {
      console.error('Error deleting pair student:', error);
      throw error;
    }
  };

  const getPairDailyReports = async (filters?: { pair?: string; student?: string; teacher?: string; date?: string }): Promise<any[]> => {
    try {
      const params = new URLSearchParams();
      if (filters?.pair) params.append('pair', filters.pair);
      if (filters?.student) params.append('student', filters.student);
      if (filters?.teacher) params.append('teacher', filters.teacher);
      if (filters?.date) params.append('date', filters.date);
      
      const url = `${API_BASE}/pair-daily-reports${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetchWithTimeout(url, { method: 'GET' });
      if (!response.ok) throw new Error('Failed to fetch daily reports');
      return await response.json();
    } catch (error) {
      console.error('Error fetching daily reports:', error);
      return [];
    }
  };

  const getPairDailyReport = async (id: string): Promise<any> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/pair-daily-reports/${id}`, { method: 'GET' });
      if (!response.ok) throw new Error('Failed to fetch daily report');
      return await response.json();
    } catch (error) {
      console.error('Error fetching daily report:', error);
      throw error;
    }
  };

  const createPairDailyReport = async (report: any): Promise<any> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/pair-daily-reports`, {
        method: 'POST',
        body: JSON.stringify(report)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create daily report' }));
        throw new Error(errorData.error || 'Failed to create daily report');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating daily report:', error);
      throw error;
    }
  };

  const updatePairDailyReport = async (id: string, report: any): Promise<any> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/pair-daily-reports/${id}`, {
        method: 'PUT',
        body: JSON.stringify(report)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update daily report' }));
        throw new Error(errorData.error || 'Failed to update daily report');
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating daily report:', error);
      throw error;
    }
  };

  const deletePairDailyReport = async (id: string): Promise<void> => {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE}/pair-daily-reports/${id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        },
        15000,
        true // requireAuth
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete daily report' }));
        throw new Error(errorData.error || 'Failed to delete daily report');
      }
    } catch (error) {
      console.error('Error deleting daily report:', error);
      throw error;
    }
  };

  // Pair Teacher Messages
  const getPairTeacherMessages = async (filters?: { pair?: string; teacherId?: string; student?: string; unreadOnly?: boolean; adminView?: string }): Promise<any[]> => {
    try {
      const params = new URLSearchParams();
      if (filters?.pair) params.append('pair', filters.pair);
      if (filters?.teacherId) params.append('teacherId', filters.teacherId);
      if (filters?.student) params.append('student', filters.student);
      if (filters?.unreadOnly) params.append('unreadOnly', 'true');
      if (filters?.adminView) params.append('adminView', filters.adminView);
      
      const url = `${API_BASE}/pair-teacher-messages${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetchWithTimeout(url, { method: 'GET' });
      if (!response.ok) throw new Error('Failed to fetch pair teacher messages');
      return await response.json();
    } catch (error) {
      console.error('Error fetching pair teacher messages:', error);
      return [];
    }
  };

  const getPairTeacherMessage = async (id: string): Promise<any> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/pair-teacher-messages/${id}`, { method: 'GET' });
      if (!response.ok) throw new Error('Failed to fetch pair teacher message');
      return await response.json();
    } catch (error) {
      console.error('Error fetching pair teacher message:', error);
      throw error;
    }
  };

  const createPairTeacherMessage = async (message: { pair: string; fromTeacher: string; toTeacher: string; student?: string; message: string; files?: Array<{ name: string; url: string; type: string; size?: number }> }): Promise<any> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/pair-teacher-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create pair teacher message');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating pair teacher message:', error);
      throw error;
    }
  };

  const markPairTeacherMessageAsRead = async (id: string): Promise<any> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/pair-teacher-messages/${id}/read`, { method: 'PUT' });
      if (!response.ok) throw new Error('Failed to mark message as read');
      return await response.json();
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  };

  const markPairTeacherMessagesAsRead = async (messageIds: string[], teacherId: string): Promise<any> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/pair-teacher-messages/mark-read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds, teacherId })
      });
      if (!response.ok) throw new Error('Failed to mark messages as read');
      return await response.json();
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  };

  // Teacher-Student Messaging
  const getTeacherStudentMessages = async (filters?: { teacherId?: string; studentId?: string; unreadOnly?: boolean; adminView?: string }): Promise<any[]> => {
    try {
      const params = new URLSearchParams();
      if (filters?.teacherId) params.append('teacherId', filters.teacherId);
      if (filters?.studentId) params.append('studentId', filters.studentId);
      if (filters?.unreadOnly) params.append('unreadOnly', 'true');
      if (filters?.adminView) params.append('adminView', filters.adminView);
      
      const url = `${API_BASE}/teacher-student-messages${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetchWithTimeout(url, { method: 'GET' });
      if (!response.ok) throw new Error('Failed to fetch teacher-student messages');
      return await response.json();
    } catch (error) {
      console.error('Error fetching teacher-student messages:', error);
      return [];
    }
  };

  const getTeacherStudentMessage = async (id: string): Promise<any> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/teacher-student-messages/${id}`, { method: 'GET' });
      if (!response.ok) throw new Error('Failed to fetch teacher-student message');
      return await response.json();
    } catch (error) {
      console.error('Error fetching teacher-student message:', error);
      throw error;
    }
  };

  const createTeacherStudentMessage = async (message: { fromTeacher?: string; toStudent?: string; fromStudent?: string; toTeacher?: string; message: string; attachments?: Array<{ filename: string; url: string; mimetype: string; size: number }>; adminInitiated?: boolean; adminId?: string }): Promise<any> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/teacher-student-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create teacher-student message');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating teacher-student message:', error);
      throw error;
    }
  };

  const markTeacherStudentMessageAsRead = async (id: string): Promise<any> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/teacher-student-messages/${id}/read`, { method: 'PUT' });
      if (!response.ok) throw new Error('Failed to mark message as read');
      return await response.json();
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  };

  const markTeacherStudentMessagesAsRead = async (messageIds: string[], teacherId?: string, studentId?: string): Promise<any> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/teacher-student-messages/mark-read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds, teacherId, studentId })
      });
      if (!response.ok) throw new Error('Failed to mark messages as read');
      return await response.json();
    } catch (error) {
      console.error('Error marking messages as read:', error);
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
    getStudentByIdentity,
    loading,
    loadingStep,
    error,
    refreshData,
    refreshDataLight,
    refreshStudentsAndTeachers,
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
    teacherNotifications,
    markTeacherNotificationAsRead,
    markAllTeacherNotificationsAsRead,
    refreshTeacherNotifications,
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
    addMistakeToPersonalMushaf,
    createListeningSession,
    updateListeningSession,
    endListeningSession,
    // Teacher Pair management
    getTeacherPairs,
    getTeacherPair,
    createTeacherPair,
    updateTeacherPair,
    deleteTeacherPair,
    getPairStudents,
    getPairStudent,
    createPairStudent,
    updatePairStudent,
    deletePairStudent,
    getPairDailyReports,
    getPairDailyReport,
    createPairDailyReport,
    updatePairDailyReport,
    deletePairDailyReport,
    getPairTeacherMessages,
    getPairTeacherMessage,
    createPairTeacherMessage,
    markPairTeacherMessageAsRead,
    markPairTeacherMessagesAsRead,
    getTeacherStudentMessages,
    getTeacherStudentMessage,
    createTeacherStudentMessage,
    markTeacherStudentMessageAsRead,
    markTeacherStudentMessagesAsRead
  };

  return (
    <BackendDataContext.Provider value={value}>
      {children}
    </BackendDataContext.Provider>
  );
};
