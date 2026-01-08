// Mushaf (Quran) mistake marking types
export type MistakeType = 'madd' | 'holding' | 'memory' | 'ikhfa' | 'tech' | 'other' | 'letter' | 'heavy_letter' | 'no_rounding_lips' | 'heavy_h' | 'light_l' | 'atkee';

export interface StructuredTajweedData {
  stretchCount?: 0 | 2 | 4 | 6; // For madd rules
  holdRequired?: boolean; // For ghunna/shaddah
  focusLetters?: string[]; // Specific letters involved
  tajweedRule?: 'ikhfa' | 'idgham' | 'iqlab' | 'qalqalah' | 'heavy_letter' | 'makhraj' | 'madd' | 'ghunna' | 'shaddah'; // Specific rule
  teacherNote?: string; // Short explanation (max 200 chars)
}

export interface MistakeTimeline {
  firstMarkedAt?: Date | string;
  lastMarkedAt?: Date | string;
  repeatCount?: number;
  resolved?: boolean;
}

export interface MushafMistake {
  id: string;
  type: MistakeType;
  page: number;
  surah: number;
  ayah: number;
  wordIndex?: number; // Index of word in ayah if applicable
  letterIndex?: number; // Index of letter within the word (0-based) for letter-level mistakes
  position?: {
    x: number; // Relative position on page
    y: number;
  };
  note?: string; // Additional notes about the mistake
  audioUrl?: string; // URL to audio recording explaining how to read correctly
  timestamp: Date;
  // Enhanced fields
  category?: 'recitation' | 'tajweed' | 'memory' | 'other' | 'letter' | 'stop';
  tajweedData?: StructuredTajweedData;
  timeline?: MistakeTimeline;
}

export interface MushafPage {
  pageNumber: number;
  surah: number;
  startAyah: number;
  endAyah: number;
  mistakes: MushafMistake[];
}

export interface MushafSession {
  ticketId: string;
  studentId: string;
  studentName: string;
  workflowStep: 'sabq' | 'sabqi' | 'manzil';
  currentPage: number;
  pages: MushafPage[];
  startedAt: Date;
  completedAt?: Date;
}

