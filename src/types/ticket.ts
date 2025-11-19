// Ticket System Types

export type TicketType = 'sabq' | 'sabqi' | 'manzil';
export type TicketStatus = 'pending' | 'in_progress' | 'submitted' | 'approved' | 'reassigned' | 'sent_to_assignment';

export interface TicketMistake {
  id: string;
  type?: 'madd' | 'holding' | 'memory' | 'ikhfa' | 'tech' | 'other' | 'letter' | 'heavy_letter' | 'no_rounding_lips' | 'heavy_h' | 'light_l' | 'atkee';
  page: number;
  surah: number;
  ayah: number;
  wordIndex?: number;
  position?: {
    x: number;
    y: number;
  };
  note?: string;
  audioUrl?: string; // Optional recording for this mistake
  timestamp?: Date | string;
}

export interface Ticket {
  id: string;
  _id?: string;
  studentId: string;
  studentName: string;
  type: TicketType;
  status: TicketStatus;
  // Admin fields
  createdBy: string;
  createdByName: string;
  adminComment?: string;
  // Teacher assignment
  assignedTeacherId?: string;
  assignedTeacherName?: string;
  teacherNotes?: string; // Admin's notes to teacher
  // Teacher submission
  teacherComment?: string;
  mistakes?: TicketMistake[];
  // Reassignment tracking
  reassignedFromTeacherId?: string;
  reassignedFromTeacherName?: string;
  reassignedToTeacherId?: string;
  reassignedToTeacherName?: string;
  reassignmentReason?: string;
  previousTeacherComment?: string;
  previousMistakes?: TicketMistake[];
  // Assignment integration
  sentToAssignmentId?: string;
  sentAt?: Date | string;
  // Timestamps
  startedAt?: Date | string;
  submittedAt?: Date | string;
  approvedAt?: Date | string;
  reassignedAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

