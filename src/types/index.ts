// Import Mushaf types - re-export from package for backward compatibility
export type { MushafMistake, MistakeType, MushafPage as MushafPageType, MushafSession } from '@umar-academy/mushaf';
import type { MushafMistake } from '@umar-academy/mushaf';

export type UserRole = 'superadmin' | 'admin' | 'teacher' | 'student';
export type ProgramType = 'Full Time HQ' | 'Part Time HQ' | 'After School Reading';
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

export interface Student {
  id: string;
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
}

export interface TeacherPermissions {
  canViewAssessments: boolean;
  canEditAssessments: boolean;
  canViewEvaluations: boolean;
  canEditEvaluations: boolean;
  canViewFinancials: boolean;
  canManageSchedule: boolean;
  canContactParents: boolean;
}

export interface Teacher {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
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
  canManageTeachers: boolean;
  canManageStudents: boolean;
  canManageFinancials: boolean;
  canViewReports: boolean;
  canManagePermissions: boolean;
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
export type RecitationType = 'sabq' | 'sabqi' | 'manzil';
export type TicketStatus = 'assigned' | 'in_progress' | 'pending_review' | 'approved' | 'needs_revision' | 'finalized' | 'completed' | 'pending';
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
  studentId: string;
  studentName: string;
  workflowStep: WorkflowStep; // Current step in chain
  assignedTeacherId: string;
  assignedTeacherName: string;
  status: TicketStatus;
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
  createdAt: Date;
  updatedAt: Date;
}


export interface AdminNotification {
  id: string;
  type: 'recitation_review_pending' | 'assignment_submitted' | 'student_enrolled' | 'payment_received';
  title: string;
  message: string;
  recitationReviewId?: string; // If type is recitation_review_pending
  assignmentId?: string;
  studentId?: string;
  read: boolean;
  createdAt: Date;
  priority: 'low' | 'medium' | 'high';
}
