export type AssignmentPortion = 'quarter' | 'half' | 'three_quarters' | 'full' | 'custom' | 'pages' | 'surah' | 'multi';

export interface ClassworkJuzSelection {
  id: string;
  juzNumber: number;
  portion: AssignmentPortion;
  segmentIndex?: number;
  approxRange?: {
    startAyah?: number;
    endAyah?: number;
  };
  customRange?: {
    startSurah?: string;
    startAyah?: number;
    endSurah?: string;
    endAyah?: number;
  };
  label?: string;
  notes?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  type: 'classwork' | 'homework';
  classworkType?: 'sabq' | 'sabqi' | 'manzil';
  classworkSections?: ClassworkSection[];
  program: string;
  assignedBy: string; // User ID of who assigned it
  assignedTo: string[]; // Array of student IDs
  dueDate: Date;
  createdAt: Date;
  updatedAt?: Date;
  status: 'draft' | 'published' | 'completed' | 'pending_homework';
  fromRecitationReviewId?: string; // Link to recitation review if converted from review
  fromTicketId?: string; // Link to ticket if created from ticket workflow
  listenerName?: string; // Teacher/listener name who reviewed the recitation
  listenerId?: string; // Teacher/listener ID
  homeworkComments?: string; // Homework instructions
  homeworkLink?: string; // Homework link
  mushafMarkings?: any[]; // Mushaf mistake markings from ticket workflow
  classworkSummary?: string;
  homeworkSummary?: string;
  attachments?: {
    type: 'text' | 'link';
    content: string;
    title?: string;
  }[];
  submissions: AssignmentSubmission[];
  notifications: AssignmentNotification[];
}

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

export interface ClassworkSection {
  step: 'sabq' | 'sabqi' | 'manzil' | string;
  title?: string;
  details?: string;
  teacherName?: string;
  order?: number;
  assignmentRange?: string;
  assignmentPortion?: AssignmentPortion | string;
  label?: string;
  summary?: string;
  juzSelections?: ClassworkJuzSelection[];
  nextHomework?: string;
  metadata?: Record<string, unknown>;
}


