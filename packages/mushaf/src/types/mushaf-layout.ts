// Mushaf Layout Types - Based on qul.tarteel.ai structure
// https://qul.tarteel.ai/resources/mushaf-layout

/**
 * Mushaf Metadata
 * Represents the metadata for a mushaf edition
 */
export interface MushafMetadata {
  id: number;
  mushaf_name: string;
  code: string; // e.g., "qpc_v1", "qpc_v4"
  pages_count: number;
  lines_per_page: number;
  font_name: string;
}

/**
 * Page Line Mapping
 * Maps each line on each page with word IDs
 */
export interface PageLine {
  mushaf_id?: number; // Optional: if database supports multiple mushafs
  page_number: number;
  line_number: number;
  line_type: "surah_name" | "basmallah" | "ayah";
  is_centered: boolean;
  surah_number?: number; // Present for surah_name lines and sometimes ayah lines
  first_word_id: number | null; // Points to word ID (e.g., word "بِسْمِ")
  last_word_id: number | null; // Points to word ID (e.g., word "ٱلرَّحِيمِ")
}

/**
 * Complete Page Layout
 * Represents a single page with all its lines
 */
export interface LayoutPage {
  page_number: number;
  mushaf_id?: number;
  lines: PageLine[];
  metadata?: MushafMetadata;
}

/**
 * Structural Divisions (for future use)
 */

// Juz (30 divisions)
export interface Juz {
  id: number;
  first_verse_key: string; // e.g., "1:1"
  last_verse_key: string; // e.g., "2:141"
  verses_count: number;
}

// Hizb (60 divisions - 2 per Juz)
export interface Hizb {
  id: number;
  juz_id: number;
  first_verse_key: string;
  last_verse_key: string;
}

// Rub (240 divisions - 4 per Hizb, quarters of Juz)
export interface Rub {
  id: number;
  hizb_id: number;
  first_verse_key: string;
  last_verse_key: string;
}

// Manzil (7 divisions for weekly completion)
export interface Manzil {
  id: number;
  first_verse_key: string;
  last_verse_key: string;
}

// Ruku (558 thematic sections)
export interface Ruku {
  id: number;
  surah: number;
  first_verse_key: string;
  last_verse_key: string;
}

// Sajdah (15 prostration verses)
export interface Sajdah {
  id: number;
  surah: number;
  ayah: number;
  verse_key: string;
}

