export interface Assignment {
  id: string;
  title: string;
  description: string;
  type: 'classwork' | 'homework';
  classworkType?: 'sabq' | 'sabqi' | 'manzil';
  program: string;
  assignedBy: string; // User ID of who assigned it
  assignedTo: string[]; // Array of student IDs
  dueDate: Date;
  createdAt: Date;
  status: 'draft' | 'published' | 'completed';
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


