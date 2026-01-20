// New Multi-Phase Assignment System Types

export interface ClassworkPhase {
  type: 'sabq' | 'sabqi' | 'manzil';
  assignmentRange: string; // e.g., "Surah Al-Fatiha, Ayah 1-7"
  details?: string; // Additional notes/details - stores teacher review comment
  fromPage?: number;
  toPage?: number;
  fromAyah?: number; // Start ayah number
  toAyah?: number; // End ayah number
  surahNumber?: number;
  surahName?: string;
  // Teacher Recitation Review fields
  juzNumber?: number; // Juz number
  startAyahText?: string; // Start ayah text
  endAyahText?: string; // End ayah text
  mistakesSummary?: string; // Summary of mistakes (count, severity, etc.)
  mistakeCount?: number | 'weak'; // Mistake count (separate field)
  atkees?: number; // Atkees value (1-20)
  mistakes?: Array<AssignmentMushafMistake & { wordText?: string }>; // Array of mistakes with word text
  tajweedIssues?: Array<{
    type: 'heavy_letters' | 'fatha_not_vertical' | 'kasrah_not_horizontal' | 'clarity_compromised' | 'lack_of_confidence' | 'incorrect_stops' | 'other';
    note?: string;
  }>;
  teacherReviewComment?: string; // Teacher's review comment
  adminComment?: string; // Admin comment (from Sabq entry)
  fromTicketId?: string; // Link to the ticket that created/updated this entry
  sabqEntryId?: string; // ID of the Sabq entry (if from Sabq ticket)
  createdAt?: Date | string; // When this classwork entry was added
}

export interface AssignmentClasswork {
  sabq: ClassworkPhase[];
  sabqi: ClassworkPhase[];
  manzil: ClassworkPhase[];
}

export interface HomeworkSubmission {
  submitted: boolean;
  submittedAt?: Date | string;
  submittedBy?: string; // Student ID
  submittedByName?: string; // Student name
  content?: string; // Student's submission content
  link?: string; // Optional submission link
  audioUrl?: string; // Audio recording of recitation
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  feedback?: string; // Teacher/Admin feedback
  gradedBy?: string; // User ID who graded
  gradedByName?: string; // User name who graded
  gradedAt?: Date | string;
  grade?: number; // Optional grade
  status?: 'submitted' | 'graded' | 'returned';
}

export interface HomeworkRange {
  mode: 'surah_ayah' | 'surah_surah' | 'juz_juz' | 'multiple_juz';
  from?: {
    surah: number;
    surahName: string;
    ayah?: number;
  };
  to?: {
    surah: number;
    surahName: string;
    ayah?: number;
  };
  juzList?: number[]; // For juz_juz and multiple_juz modes
}

export interface HomeworkItem {
  type: 'sabq' | 'sabqi' | 'manzil';
  range: HomeworkRange;
  source: {
    suggestedFrom: 'ticket' | 'manual';
    ticketIds: string[];
  };
  content?: string; // Optional text content for this homework item
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size?: number;
  }>; // Optional file attachments for this homework item
}

export interface AssignmentHomework {
  enabled: boolean;
  content: string; // Text content (legacy - kept for backward compatibility)
  link?: string; // Optional link (legacy)
  sabqiContent?: string; // Sabqi homework content
  manzilContent?: string; // Manzil homework content
  items?: HomeworkItem[]; // NEW: Structured homework items
  notes?: string; // General notes for all homework items
  submission?: HomeworkSubmission;
}

export interface AssignmentMushafMistake {
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
  audioUrl?: string;
  workflowStep?: 'sabq' | 'sabqi' | 'manzil';
  markedBy?: string;
  markedByName?: string;
  timestamp?: Date | string;
}

export interface Assignment {
  id: string;
  _id?: string;
  studentId: string;
  studentName: string;
  assignedBy: string; // User ID (admin, super admin, or teacher)
  assignedByName: string; // User name
  assignedByRole: 'admin' | 'super_admin' | 'teacher';
  // Classwork phases - can have multiple entries of each type
  classwork: AssignmentClasswork;
  // Homework
  homework: AssignmentHomework;
  // Comment
  comment?: string;
  // Mushaf mistakes associated with this assignment
  mushafMistakes?: AssignmentMushafMistake[];
  // Status tracking
  status?: 'active' | 'completed' | 'archived';
  completedAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// Legacy types (keeping for backward compatibility if needed)
export interface AssignmentPortion {
  surah?: number;
  surahName?: string;
  fromAyah?: number;
  toAyah?: number;
  fromPage?: number;
  toPage?: number;
  juz?: number;
}

export interface ClassworkSection {
  type: 'sabq' | 'sabqi' | 'manzil';
  assignmentRange: string;
  details?: string;
  assignmentPortion?: AssignmentPortion;
  summary?: string;
}
