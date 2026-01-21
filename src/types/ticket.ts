// Ticket System Types

export type TicketType = 'sabq' | 'sabqi' | 'manzil';
export type TicketStatus = 'pending' | 'in_progress' | 'submitted' | 'approved' | 'reassigned' | 'sent_to_assignment';

// Proper mistake type names (no generic "other")
export type MistakeType = 
  | 'madd' 
  | 'holding' 
  | 'memory' 
  | 'ikhfa' 
  | 'tech' 
  | 'letter' 
  | 'heavy_letter' 
  | 'no_rounding_lips' 
  | 'heavy_h' 
  | 'light_l'
  | 'ghunnah'
  | 'qalqalah'
  | 'idgham'
  | 'iqlab'
  | 'ikhfa_shafawi'
  | 'madd_muttasil'
  | 'madd_munfasil'
  | 'madd_laazim'
  | 'madd_arid'
  | 'madd_lin'
  | 'hamzat_wasl'
  | 'hamzat_qat'
  | 'tashdeed'
  | 'tanween'
  | 'sukoon'
  | 'fatha'
  | 'kasrah'
  | 'dammah'
  | 'atkee'; // Atkees is a separate category

export interface TicketMistake {
  id: string;
  type?: MistakeType;
  page: number;
  surah: number;
  surahName?: string; // Arabic surah name
  ayah: number;
  wordIndex?: number;
  wordText?: string; // Arabic word text where mistake occurred
  position?: {
    x: number;
    y: number;
  };
  note?: string;
  audioUrl?: string; // Optional recording for this mistake
  timestamp?: Date | string;
}

// Tajweed issue types (explicit labels, no generic "other")
export type TajweedIssueType = 
  | 'heavy_letters'
  | 'fatha_not_vertical'
  | 'kasrah_not_horizontal'
  | 'clarity_compromised'
  | 'lack_of_confidence'
  | 'incorrect_stops'
  | 'ghunnah_error'
  | 'qalqalah_error'
  | 'idgham_error'
  | 'madd_error'
  | 'tajweed_rule_violation';

export interface TajweedIssue {
  type: TajweedIssueType;
  surahName?: string; // Arabic surah name
  wordText?: string; // Arabic word text where error occurred
  note?: string;
}

// Mistake count (1-20 or 'weak')
export type MistakeCount = number | 'weak';
// Atkees (numeric only, 1-20, no 'weak')
export type Atkees = number; // 1-20 only

export interface RecitationRange {
  surahNumber: number; // Start surah number
  surahName?: string; // Start surah Arabic name (required for display)
  endSurahNumber?: number; // End surah number (if different from start)
  endSurahName?: string; // End surah Arabic name (if different from start)
  juzNumber?: number;
  startAyahNumber: number; // Internal use only, not displayed
  startAyahText?: string; // Arabic text (required for display)
  endAyahNumber: number; // Internal use only, not displayed
  endAyahText?: string; // Arabic text (required for display)
}

export interface SabqEntry {
  id: string;
  recitationRange: RecitationRange;
  mistakes?: TicketMistake[];
  mistakeCount?: MistakeCount;
  atkees?: Atkees; // Replaced mistakeSeverity
  tajweedIssues?: TajweedIssue[];
  adminComment?: string;
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
  // Recitation range (new fields)
  recitationRange?: RecitationRange;
  // Mistake count (new field)
  mistakeCount?: MistakeCount;
  // Atkees (replaces mistakeSeverity)
  atkees?: Atkees; // Numeric 1-20 only
  // Tajweed issues (new fields)
  tajweedIssues?: TajweedIssue[];
  // Optional notes
  reviewNotes?: string;
  // Sabq-specific fields (multiple entries)
  sabqEntries?: SabqEntry[];
  homeworkRange?: RecitationRange; // Homework range for next day (separate from in-class Sabq)
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
  // Recording fields
  recordingUrl?: string;
  recordingFormat?: string;
  recordingDuration?: number;
  recordingStartedAt?: Date | string;
  recordingStoppedAt?: Date | string;
  // Timestamps
  startedAt?: Date | string;
  submittedAt?: Date | string;
  approvedAt?: Date | string;
  reassignedAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

