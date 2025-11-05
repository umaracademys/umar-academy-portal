// Mushaf (Quran) mistake marking types
export type MistakeType = 'madd' | 'holding' | 'memory' | 'ikhfa' | 'tech' | 'other';

export interface MushafMistake {
  id: string;
  type: MistakeType;
  page: number;
  surah: number;
  ayah: number;
  wordIndex?: number; // Index of word in ayah if applicable
  position?: {
    x: number; // Relative position on page
    y: number;
  };
  note?: string; // Additional notes about the mistake
  timestamp: Date;
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

