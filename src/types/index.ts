// Import Mushaf types - re-export from package for backward compatibility
export type { MushafMistake, MistakeType, MushafPage as MushafPageType, MushafSession } from '@umar-academy/mushaf';
import type { MushafMistake } from '@umar-academy/mushaf';
import type { AssignmentPortion } from './assignment';

export type UserRole = 'superadmin' | 'admin' | 'teacher' | 'student';
export type ProgramType = 'Full-Time HQ' | 'Part-Time HQ' | 'After School';
export type ScheduleDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Sibling {
  id: string;
  fullName: string;
  program: ProgramType;
  assignedTeacher?: string;
}

export interface Schedule {
  days: ScheduleDay[];
  startTime: string;
  endTime: string;
  workingDays?: ScheduleDay[]; // Alias for days (backend compatibility)
  workingHours?: {
    start: string;
    end: string;
  }; // Backend format
  dayGroupSchedules?: {
    monThu: { startTime: string; endTime: string };
    friday: { startTime: string; endTime: string };
    saturday: { startTime: string; endTime: string };
  }; // Per-day-group schedules (legacy)
  daySchedules?: Array<{
    day: ScheduleDay;
    startTime: string;
    endTime: string;
  }>; // Individual day schedules (new simple format)
}

export interface Assessment {
  id: string;
  date: string;
  type: string;
  score: number;
  maxScore: number;
  notes: string;
  conductedBy: string;
}

export interface Evaluation {
  id: string;
  date: string;
  category: string;
  rating: number;
  comments: string;
  evaluatedBy: string;
}

export type RecitationStep = 'sabq' | 'sabqi' | 'manzil';
export type RecitationUnitType = 'juz' | 'surah' | 'pages';

export interface RecitationUnit {
  unitType: RecitationUnitType;
  juzNumber?: number;
  surahNumber?: number;
  surahName?: string;
  fromAyah?: number;
  toAyah?: number;
  fromPage?: number;
  toPage?: number;
  pageCount?: number;
  notes?: string;
  updatedAt?: string;
}

export interface RecitationHistoryEntry extends RecitationUnit {
  workflowStep: RecitationStep;
  ticketId?: string;
  completedAt: string;
}

export interface StudentRecitationProfile {
  current: {
    sabq?: RecitationUnit;
    sabqi?: RecitationUnit;
    manzil?: RecitationUnit;
  };
  history: RecitationHistoryEntry[];
}

export type ListeningSessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface ListeningMistake {
  id?: string;
  type?: string;
  page?: number;
  surah?: number;
  ayah?: number;
  wordIndex?: number;
  note?: string;
  timestamp?: string | Date;
}

export interface ListeningSession {
  id: string;
  ticketId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  workflowStep: RecitationStep | 'finalize';
  status: ListeningSessionStatus;
  startedAt: string;
  endedAt?: string;
  lastHeartbeatAt: string;
  totalListeningSeconds: number;
  currentPage?: number;
  currentSurah?: number;
  currentAyah?: number;
  currentSection?: string;
  mistakeCount: number;
  mistakes: ListeningMistake[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ListeningSessionStartPayload {
  ticketId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  workflowStep: RecitationStep | 'finalize';
  startedAt?: string;
  currentPage?: number;
  currentSurah?: number;
  currentAyah?: number;
  currentSection?: string;
}

export interface ListeningSessionUpdatePayload {
  currentPage?: number;
  currentSurah?: number;
  currentAyah?: number;
  currentSection?: string;
  status?: ListeningSessionStatus;
  mistake?: Omit<ListeningMistake, 'id' | 'timestamp'> & { id?: string; timestamp?: string };
}

export interface ListeningSessionEndPayload {
  status?: ListeningSessionStatus;
  endedAt?: string;
}

export interface Student {
  id: string;
  studentRecordId?: string;
  fullName: string;
  parentName: string;
  email: string;
  contact: string;
  program: ProgramType;
  siblings: Sibling[];
  tuitionFee: number;
  registrationAmount: number;
  assignedTeacher: string;
  schedule: Schedule;
  assessments: Assessment[];
  evaluations: Evaluation[];
  enrolledDate: string;
  status: 'active' | 'inactive' | 'pending';
  avatar?: string;
  recitationProfile?: StudentRecitationProfile;
}

export type EmploymentType = 'Full Time' | 'Part Time';
export type ShiftType = 'Morning' | 'Evening' | 'Both';
export type TeacherLocation = 'Local' | 'Overseas Pakistan';
export type Currency = 'USD' | 'PKR';

export interface Shift {
  name: string;
  startTime: string;
  endTime: string;
}

export interface Payroll {
  hourlyRate: number;
  currency: Currency;
  dailyHours: number;
  daysWorking: number;
  monthlyHours: number; // auto-calculated
  monthlySalary: number; // auto-calculated
  paymentType?: string; // monthly, weekly, hourly, per-student
  bankAccount?: string;
}

export interface TeacherPermissions {
  // Assessments & Evaluations
  canViewAssessments: boolean;
  canEditAssessments: boolean;
  canViewEvaluations: boolean;
  canEditEvaluations: boolean;
  
  // Financial & Billing
  canViewFinancials: boolean;
  
  // Scheduling & Logistics
  canManageSchedule: boolean;
  
  // Communication
  canContactParents: boolean;
  
  // Student Information
  canViewStudentEmail: boolean;
  canViewStudentContact: boolean;
  canViewStudentPersonalInfo: boolean;
  
  // Module Permissions
  // Messages Module
  canAccessMessages: boolean;
  canSendMessages: boolean;
  canViewAllMessages: boolean;
  
  // PDF Module
  canAccessPdf: boolean;
  canUploadPdf: boolean;
  canAnnotatePdf: boolean;
  canViewPdfAnnotations: boolean;
  
  // Homework Module
  canAccessHomework: boolean;
  canCreateHomework: boolean;
  canGradeHomework: boolean;
  canViewHomeworkSubmissions: boolean;
  
  // Evaluation Module
  canAccessEvaluations: boolean;
  canCreateEvaluations: boolean;
  canReviewEvaluations: boolean;
  canApproveEvaluations: boolean;
  
  // Tickets Module
  canAccessTickets: boolean;
  canCreateTickets: boolean;
  canReviewTickets: boolean;
  canApproveTickets: boolean;
  canFinalizeTickets: boolean;
  
  // Attendance Module
  canAccessAttendance: boolean;
  canRecordAttendance: boolean;
  canViewAttendanceReports: boolean;
  
  // Recordings Module
  canAccessRecordings: boolean;
  canUploadRecordings: boolean;
  canDeleteRecordings: boolean;
  canViewAllRecordings: boolean;
  
  // Mushaf Module
  canAccessMushaf: boolean;
  canMarkMistakes: boolean;
  canViewMistakeHistory: boolean;
  canManageMistakeLibrary: boolean;
  
  // Qaidah Module
  canAccessQaidah: boolean;
  canManageQaidah: boolean;
  canViewQaidahProgress: boolean;
  
  // Assignments Module
  canAccessAssignments: boolean;
  canCreateAssignments: boolean;
  canEditAssignments: boolean;
  canDeleteAssignments: boolean;
  
  // Reports & Analytics
  canViewReports: boolean;
  canViewAnalytics: boolean;
  canExportReports: boolean;
}

export interface Teacher {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  contact?: string; // Alias for phoneNumber (for backend compatibility)
  emergencyContact: string;
  department: string;
  location: TeacherLocation;
  employmentType: EmploymentType;
  shiftType: ShiftType;
  shifts: Shift[];
  idDocument?: string; // URL or base64 of uploaded ID
  assignedStudents: string[];
  permissions: TeacherPermissions;
  schedule: Schedule;
  payroll: Payroll;
  hireDate: string;
  status: 'active' | 'inactive';
  avatar?: string;
}

export interface AdminPermissions {
  // People Operations
  canManageTeachers: boolean;
  canManageStudents: boolean;
  
  // Finance & Billing
  canManageFinancials: boolean;
  
  // Insights
  canViewReports: boolean;
  
  // Security & Governance
  canManagePermissions: boolean;
  
  // Module Permissions
  // Messages Module
  canAccessMessages: boolean;
  canViewAllMessages: boolean;
  canModerateMessages: boolean;
  
  // PDF Module
  canAccessPdf: boolean;
  canManagePdfLibrary: boolean;
  canViewAllPdfAnnotations: boolean;
  
  // Homework Module
  canAccessHomework: boolean;
  canManageHomework: boolean;
  canViewAllHomework: boolean;
  
  // Evaluation Module
  canAccessEvaluations: boolean;
  canManageEvaluations: boolean;
  canApproveEvaluations: boolean;
  
  // Tickets Module
  canAccessTickets: boolean;
  canCreateTickets: boolean;
  canReviewTickets: boolean;
  canApproveTickets: boolean;
  canFinalizeTickets: boolean;
  canManageTicketWorkflow: boolean;
  
  // Attendance Module
  canAccessAttendance: boolean;
  canManageAttendance: boolean;
  canViewAttendanceReports: boolean;
  
  // Recordings Module
  canAccessRecordings: boolean;
  canManageRecordings: boolean;
  canViewAllRecordings: boolean;
  
  // Mushaf Module
  canAccessMushaf: boolean;
  canManageMushaf: boolean;
  canViewAllMistakes: boolean;
  
  // Qaidah Module
  canAccessQaidah: boolean;
  canManageQaidah: boolean;
  canViewQaidahReports: boolean;
  
  // Assignments Module
  canAccessAssignments: boolean;
  canManageAssignments: boolean;
  canBulkCreateAssignments: boolean;
  
  // Reports & Analytics
  canViewAnalytics: boolean;
  canExportReports: boolean;
  canViewSystemStats: boolean;
}

export interface Admin {
  id: string;
  fullName: string;
  email: string;
  contact: string;
  permissions: AdminPermissions;
  assignedDepartments: string[];
  hireDate: string;
  status: 'active' | 'inactive';
  avatar?: string;
}

// Teacher Attendance Types
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half-day';

export interface ShiftAttendance {
  status: AttendanceStatus;
  checkIn?: string; // HH:mm format
  checkOut?: string; // HH:mm format
  notes?: string;
}

export interface TeacherAttendance {
  id?: string;
  _id?: string;
  teacherId: string;
  teacherName: string;
  date: string; // YYYY-MM-DD format
  employmentType: 'Full Time' | 'Part Time';
  
  // For Full Time teachers (2 shifts)
  morningShift?: ShiftAttendance;
  eveningShift?: ShiftAttendance;
  
  // For Part Time teachers (1 shift)
  shift?: {
    name: string;
    status: AttendanceStatus;
    checkIn?: string;
    checkOut?: string;
    notes?: string;
  };
  
  // Paid days tracking
  paidDays: number;
  isPaid: boolean;
  
  // Metadata
  recordedBy: string;
  recordedByName: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface TeacherAttendanceStats {
  teacherId: string;
  teacherName: string;
  employmentType: 'Full Time' | 'Part Time';
  period: string;
  totalRecords: number;
  totalShifts: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalHalfDay: number;
  totalPaidDays: number;
  presentRate: number;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  students: number;
  schedule: string;
}

export interface Assignment {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  grade?: number;
}

// Enhanced Assignment System Types
export interface AssignmentSubmission {
  id: string;
  studentId: string;
  assignmentId: string;
  submittedAt: Date;
  content: string;
  attachments?: {
    type: 'file' | 'link';
    content: string;
    title?: string;
  }[];
  grade?: number;
  feedback?: string;
  status: 'submitted' | 'graded' | 'returned';
}

export interface AssignmentNotification {
  id: string;
  assignmentId: string;
  studentId: string;
  type: 'assignment_created' | 'assignment_due' | 'assignment_submitted' | 'assignment_graded';
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface Program {
  id: string;
  name: string;
  description: string;
  students: string[]; // Array of student IDs
  createdAt: Date;
  status: 'active' | 'inactive';
}

export interface AssignmentReport {
  programId: string;
  programName: string;
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
  studentStats: {
    studentId: string;
    studentName: string;
    totalAssignments: number;
    submittedAssignments: number;
    averageGrade: number;
    assignments: AssignmentSubmission[];
  }[];
}

// Recitation Review System Types
export type RecitationType = RecitationStep;
export type TicketStatus = 'assigned' | 'in_progress' | 'pending_review' | 'approved' | 'needs_revision' | 'finalized' | 'completed' | 'pending' | 'skipped';
export type WorkflowStep = 'sabq' | 'sabqi' | 'manzil' | 'finalize';

export interface RecitationReview {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  recitationType: RecitationType;
  program: string;
  notes: string;
  audioLink?: string; // Link to WhatsApp audio if available
  status: 'pending_review' | 'approved' | 'rejected' | 'converted_to_assignment';
  reviewedBy?: string; // Admin/Super Admin ID who reviewed
  reviewedAt?: Date;
  convertedToAssignmentId?: string; // Assignment ID if converted
  createdAt: Date;
  updatedAt: Date;
}

// Ticket-Based Workflow System
export interface AssignmentTicket {
  id: string;
  _id?: string;
  studentId: string;
  studentName: string;
  workflowStep: WorkflowStep; // Current step in chain
  assignedTeacherId: string;
  assignedTeacherName: string;
  status: TicketStatus;
  notes?: string; // Admin notes when creating ticket (for teacher)
  progressNotes?: string; // Teacher's progress notes
  audioLink?: string; // Audio link from teacher
  previousTicketId?: string; // Links to previous step
  nextTicketId?: string; // Links to next step
  reviewedBy?: string; // Admin ID who reviewed
  reviewedAt?: Date;
  completedBy?: string; // Teacher ID who completed
  completedAt?: Date;
  revisionNotes?: string; // If needs revision
  finalReport?: string; // Admin's final report
  homework?: string; // Homework instructions
  homeworkLink?: string; // Homework link
  assignmentId?: string; // Final assignment ID
  mushafMarkings?: MushafMistake[]; // Mushaf mistake markings from teacher
  program: string;
  assignmentRange?: string;
  assignmentPortion?: AssignmentPortion | string;
  createdAt: Date;
  updatedAt: Date;
}


export interface AdminNotification {
  id: string;
  type: 'recitation_review_pending' | 'assignment_submitted' | 'student_enrolled' | 'payment_received' | 'profile_update_request' | 'student_registration_request' | 'weekly_evaluation_submitted' | 'weekly_evaluation_feedback' | 'weekly_evaluation_approved';
  title: string;
  message: string;
  recitationReviewId?: string; // If type is recitation_review_pending
  assignmentId?: string;
  studentId?: string;
  teacherId?: string; // If type is profile_update_request
  weeklyEvaluationId?: string; // If type is weekly_evaluation_feedback or weekly_evaluation_approved
  read: boolean;
  createdAt: Date;
  priority: 'low' | 'medium' | 'high';
  registrationData?: any; // Full registration form data for student_registration_request
}

export interface TeacherNotification {
  id: string;
  _id?: string;
  teacherId: string;
  type: 'weekly_evaluation_feedback' | 'weekly_evaluation_approved' | 'message_received' | 'pair_message_received' | 'student_message_received';
  title: string;
  message: string;
  weeklyEvaluationId?: string;
  conversationId?: string;
  messageId?: string;
  studentId?: string;
  read: boolean;
  createdAt: Date;
  priority: 'low' | 'medium' | 'high';
  metadata?: any;
}

// ============================================
// TEACHER EVALUATION SYSTEM TYPES
// ============================================

export type QuestionType = 'text' | 'audio' | 'video'; // text = text question with exactly 4 MCQ choices
export type EvaluationStatus = 'draft' | 'active' | 'archived';
export type AssignmentStatus = 'assigned' | 'in_progress' | 'completed' | 'overdue';

export interface EvaluationQuestion {
  id: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[]; // For text questions - always exactly 4 choices (MCQ format)
  correctAnswer?: string; // For text questions - must match one of the 4 options exactly
  isRequired: boolean;
  order: number;
  mediaUrl?: string; // For audio/video questions
  instructions?: string;
  points: number;
}

export interface EvaluationPeriod {
  startDate?: string | Date;
  endDate?: string | Date;
}

export interface TeacherEvaluation {
  id: string;
  title: string;
  description?: string;
  questions: EvaluationQuestion[];
  createdBy: string;
  createdByName: string;
  status: EvaluationStatus;
  evaluationPeriod?: EvaluationPeriod;
  autoSave: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface EvaluationAssignment {
  id: string;
  evaluationId: string;
  teacherId: string;
  teacherName: string;
  assignedBy: string;
  assignedByName: string;
  status: AssignmentStatus;
  dueDate?: string | Date;
  startedAt?: string | Date;
  completedAt?: string | Date;
  progress: number; // 0-100
  currentQuestionIndex: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface EvaluationAnswer {
  id: string;
  assignmentId: string;
  questionId: string;
  answerText?: string;
  selectedOption?: string; // For MCQ
  isCorrect?: boolean; // For MCQ validation
  mediaUrl?: string; // For audio/video/file uploads
  answeredAt: string | Date;
  autoSaved: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface EvaluationUpload {
  id: string;
  assignmentId: string;
  questionId: string;
  answerId?: string;
  fileType: 'audio' | 'video' | 'image' | 'document';
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy: string;
  uploadedAt: string | Date;
}

export interface EvaluationResult {
  assignment: EvaluationAssignment;
  evaluation: {
    id: string;
    title: string;
    description?: string;
    questions?: EvaluationQuestion[];
  } | null;
  answers: EvaluationAnswer[];
  totalQuestions: number;
  answeredQuestions: number;
}
