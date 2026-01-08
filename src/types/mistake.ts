// Enhanced Mistake Types for Personal Mushaf System

export type TajweedRule = 'ikhfa' | 'idgham' | 'iqlab' | 'qalqalah' | 'heavy_letter' | 'makhraj' | 'madd' | 'ghunna' | 'shaddah';
export type MistakeCategory = 'tajweed' | 'letter' | 'stop' | 'memory' | 'other';

export interface StructuredTajweedData {
  stretchCount: 0 | 2 | 4 | 6; // Harakat count for madd
  holdRequired: boolean; // Ghunna / Shaddah requirement
  focusLetters: string[]; // Specific letters to focus on
  tajweedRule: TajweedRule; // The tajweed rule being violated
  teacherNote: string; // Short explanation (max 200 chars)
}

export interface MistakeTimeline {
  firstMarkedAt: Date | string;
  lastMarkedAt: Date | string;
  repeatCount: number; // How many times this mistake has been marked
  resolved: boolean; // Whether student has corrected this mistake
  resolvedAt?: Date | string;
}

export interface EnhancedMistake {
  id: string;
  type: string;
  category: MistakeCategory; // tajweed | letter | stop | memory | other
  page: number;
  surah: number;
  ayah: number;
  wordIndex?: number;
  letterIndex?: number;
  position?: {
    x: number;
    y: number;
  };
  
  // Structured Tajweed Data (only for tajweed mistakes)
  tajweedData?: StructuredTajweedData;
  
  // Timeline Metadata
  timeline: MistakeTimeline;
  
  // Legacy fields (for backward compatibility)
  note?: string;
  audioUrl?: string;
  timestamp?: Date | string;
  
  // Additional metadata
  workflowStep?: 'sabq' | 'sabqi' | 'manzil' | 'direct';
  markedBy?: string;
  markedByName?: string;
  ticketId?: string;
}

// Helper function to determine if mistake is tajweed type
export function isTajweedMistake(type: string): boolean {
  const tajweedTypes = ['madd', 'ikhfa', 'idgham', 'iqlab', 'qalqalah', 'heavy_letter', 'makhraj', 'ghunna', 'shaddah', 'tech', 'heavy_h', 'light_l', 'no_rounding_lips'];
  return tajweedTypes.includes(type.toLowerCase());
}

// Helper function to categorize mistake
export function categorizeMistake(type: string): MistakeCategory {
  if (isTajweedMistake(type)) return 'tajweed';
  if (type === 'letter' || type === 'heavy_letter') return 'letter';
  if (type === 'holding' || type === 'stop') return 'stop';
  if (type === 'memory') return 'memory';
  return 'other';
}

// Helper function to get recency category
export function getRecencyCategory(timeline: MistakeTimeline): 'today' | 'recent' | 'old' {
  const now = new Date();
  const lastMarked = new Date(timeline.lastMarkedAt);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  if (lastMarked >= today) return 'today';
  if (lastMarked >= sevenDaysAgo) return 'recent';
  return 'old';
}

