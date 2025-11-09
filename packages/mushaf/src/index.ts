// Main exports for @umar-academy/mushaf package

// Components
export { default as InteractiveMushaf } from './components/InteractiveMushaf';
export { default as InteractiveMushafSimple } from './components/InteractiveMushafSimple';
export { MistakeModal } from './components/InteractiveMushaf';
export { MushafPage, WordByWordPage } from './components/InteractiveMushaf';

// Types
export type { MushafMistake, MushafPage as MushafPageType, MushafSession, MistakeType } from './types/mushaf';
export type { 
  MushafMetadata, 
  PageLine, 
  LayoutPage, 
  Juz, 
  Hizb, 
  Rub, 
  Manzil, 
  Ruku, 
  Sajdah 
} from './types/mushaf-layout';

// Export types from InteractiveMushaf
export type { 
  AyahPosition, 
  Word, 
  Line 
} from './components/InteractiveMushaf';

// Services
export { fetchPageLines, getQuranChapters, fetchPageVerses, API_BASE } from './services/quranApi';
export type { Chapter } from './services/quranApi';
export { uploadMistakeAudio } from './services/audioService';

// Data
export { FALLBACK_CHAPTERS } from './data/fallbackChapters';

