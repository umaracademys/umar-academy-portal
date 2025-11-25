// Quran API Service for Mushaf
// Note: API calls are proxied through backend to avoid CORS issues
// Handle both cases: API_BASE_URL might include /api or not
import { FALLBACK_CHAPTERS } from '../data/fallbackChapters';

const getApiBase = () => {
  // Allow configuration via environment variable or prop
  const base = (typeof window !== 'undefined' && (window as any).MUSHAF_API_BASE) || 
               import.meta.env?.VITE_API_BASE_URL || 
               'http://localhost:3001/api';
  // If base already ends with /api, use it as-is; otherwise add /api
  return base.endsWith('/api') ? base : `${base}/api`;
};

export const API_BASE = getApiBase();

export interface Chapter {
  id: number;
  name_simple: string;
  name_arabic: string;
  name_complex: string;
  translated_name: {
    name: string;
  };
  pages: [number, number];
  verses_count: number;
  revelation_place: string;
}

/**
 * Fetch Quran chapters list
 */
export async function getQuranChapters(): Promise<Chapter[]> {
  try {
    const apiBase = getApiBase();
    const response = await fetch(`${apiBase}/quran/chapters`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch chapters: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const chapters = data.chapters || [];

    if (!Array.isArray(chapters) || chapters.length === 0) {
      console.warn('Quran chapters API returned no data, using fallback dataset');
      return FALLBACK_CHAPTERS;
    }

    // Merge API response with fallback to ensure Arabic names are always available
    const mergedChapters = chapters.map((apiChapter: Chapter) => {
      const fallbackChapter = FALLBACK_CHAPTERS.find(fc => fc.id === apiChapter.id);
      if (fallbackChapter) {
        // Use API data but ensure Arabic name from fallback if missing
        return {
          ...apiChapter,
          name_arabic: apiChapter.name_arabic || fallbackChapter.name_arabic,
          name_complex: apiChapter.name_complex || fallbackChapter.name_complex,
        };
      }
      return apiChapter;
    });

    return mergedChapters as Chapter[];
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return FALLBACK_CHAPTERS;
  }
}

/**
 * Fetch page lines in 15-line format
 */
export async function fetchPageLines(pageNumber: number, version: 'nastaleeq' | 'v4' = 'nastaleeq'): Promise<any> {
  try {
    const apiBase = getApiBase();
    const url = `${apiBase}/quran/pages/${pageNumber}/lines?version=${version}`;
    console.log(`🌐 Fetching page lines from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (import.meta.env?.DEV) {
      console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error (${response.status}):`, errorText);
      
      if (response.status === 404) {
        console.warn(`⚠️ Page lines returned 404 for page ${pageNumber}`);
        return null;
      }
      throw new Error(`Failed to fetch page lines for page ${pageNumber}: ${response.statusText}`);
    }

    const data = await response.json();
    if (import.meta.env?.DEV) {
      console.log(`✅ Received data for page ${pageNumber}:`, {
        pageNumber: data.pageNumber,
        surahId: data.surahId,
        version: data.version,
        linesCount: data.lines?.length || 0
      });
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Error fetching page lines for page ${pageNumber}:`, error);
    return null;
  }
}

/**
 * Fetch verses for a page (for clickable words)
 */
export async function fetchPageVerses(pageNumber: number): Promise<any[]> {
  try {
    const apiBase = getApiBase();
    const response = await fetch(`${apiBase}/quran/pages/${pageNumber}/verses`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // If 404, the page might not have verses or endpoint doesn't exist
      if (response.status === 404) {
        console.warn(`⚠️ Verses endpoint returned 404 for page ${pageNumber} - page may not exist or have different structure`);
        return [];
      }
      throw new Error(`Failed to fetch verses for page ${pageNumber}: ${response.statusText}`);
    }

    const data = await response.json();
    const verses = data.verses || data || [];
    
    if (verses.length === 0) {
      console.warn(`⚠️ No verses returned for page ${pageNumber}`);
    }
    
    return verses;
  } catch (error) {
    console.error(`Error fetching verses for page ${pageNumber}:`, error);
    // Return empty array instead of throwing - allows UI to continue
    return [];
  }
}

