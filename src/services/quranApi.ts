// Quran Foundation API Service
// Note: API calls are proxied through our backend to avoid CORS issues
// Handle both cases: VITE_API_BASE_URL might include /api or not
const getApiBase = () => {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
  // If base already ends with /api, use it as-is; otherwise add /api
  return base.endsWith('/api') ? base : `${base}/api`;
};
const API_BASE = getApiBase();

/**
 * Fetch Quran page data via our backend proxy
 * Note: This endpoint may not be available in the Quran Foundation API
 * We primarily use fetchPageVerses instead
 */
export async function fetchQuranPage(pageNumber: number): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/quran/pages/${pageNumber}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // If page endpoint doesn't exist, that's okay - we'll use verses instead
      if (response.status === 404) {
        console.log(`⚠️ Page endpoint not available for page ${pageNumber}, using verses endpoint instead`);
        return null;
      }
      throw new Error(`Failed to fetch page ${pageNumber}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching page ${pageNumber}:`, error);
    // Return null instead of throwing - we'll use verses endpoint as fallback
    return null;
  }
}

/**
 * Fetch verses for a page (for clickable words)
 */
export async function fetchPageVerses(pageNumber: number): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE}/quran/pages/${pageNumber}/verses`, {
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

/**
 * Get Mushaf page image URL
 * Uses backend proxy to fetch page data, then extracts image URL
 */
export async function getMushafPageImage(pageNumber: number): Promise<string | null> {
  try {
    const pageData = await fetchQuranPage(pageNumber);
    
    // The API response structure may vary - adjust based on actual response
    // Common patterns: pageData.image_url, pageData.imageUrl, pageData.images?.mushaf
    const imageUrl = pageData.image_url || 
                     pageData.imageUrl || 
                     pageData.images?.mushaf || 
                     pageData.mushaf_url || 
                     pageData.image?.url ||
                     null;
    
    if (imageUrl) {
      console.log(`✅ Got image URL from API for page ${pageNumber}:`, imageUrl);
    } else {
      console.log(`⚠️ No image URL found in API response for page ${pageNumber}`, pageData);
    }
    
    return imageUrl;
  } catch (error) {
    console.error(`Error getting image URL for page ${pageNumber}:`, error);
    return null;
  }
}

/**
 * Fetch Quran chapters list
 */
export async function getQuranChapters(): Promise<Chapter[]> {
  try {
    const response = await fetch(`${API_BASE}/quran/chapters`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch chapters: ${response.statusText}`);
    }

    const data = await response.json();
    return data.chapters || [];
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return [];
  }
}

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
 * Fetch all pages for a surah (using the surah's page range)
 */
export async function fetchSurahPages(surahId: number, version: 'nastaleeq' | 'v4' = 'nastaleeq'): Promise<Map<number, any>> {
  try {
    // First get the surah info to know which pages it spans
    const chapters = await getQuranChapters();
    const surah = chapters.find(ch => ch.id === surahId);
    
    if (!surah) {
      throw new Error(`Surah ${surahId} not found`);
    }
    
    const pageMap = new Map<number, any>();
    const startPage = surah.pages[0];
    const endPage = surah.pages[1];
    
    // Fetch all pages in parallel
    const pagePromises: Promise<{ pageNum: number; result: any }>[] = [];
    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      pagePromises.push(
        fetchPageLines(pageNum, version)
          .then(result => ({ pageNum, result }))
          .catch(error => {
            console.error(`Error fetching page ${pageNum}:`, error);
            return { pageNum, result: null };
          })
      );
    }
    
    const results = await Promise.all(pagePromises);
    results.forEach(({ pageNum, result }) => {
      if (result && result.lines) {
        pageMap.set(pageNum, result);
      }
    });
    
    return pageMap;
  } catch (error) {
    console.error(`Error fetching surah pages for surah ${surahId}:`, error);
    throw error;
  }
}

/**
 * Fetch page lines in 15-line format
 */
export async function fetchPageLines(pageNumber: number, version: 'nastaleeq' | 'v4' = 'nastaleeq'): Promise<any> {
  try {
    const url = `${API_BASE}/quran/pages/${pageNumber}/lines?version=${version}`;
    console.log(`🌐 Fetching page lines from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);

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
    console.log(`✅ Received data for page ${pageNumber}:`, {
      pageNumber: data.pageNumber,
      surahId: data.surahId,
      version: data.version,
      linesCount: data.lines?.length || 0
    });
    
    return data;
  } catch (error) {
    console.error(`❌ Error fetching page lines for page ${pageNumber}:`, error);
    return null;
  }
}

/**
 * Fetch page lines in Imlaei script (from Quran.com API)
 */
export async function fetchPageLinesImlaei(pageNumber: number): Promise<any> {
  try {
    const url = `${API_BASE}/quran/pages/${pageNumber}/imlaei`;
    console.log(`🌐 Fetching Imlaei page lines from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`📡 Imlaei Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Imlaei API Error (${response.status}):`, errorText);
      
      if (response.status === 404) {
        console.warn(`⚠️ Imlaei page lines returned 404 for page ${pageNumber}`);
        return null;
      }
      throw new Error(`Failed to fetch Imlaei page lines for page ${pageNumber}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Received Imlaei data for page ${pageNumber}:`, {
      pageNumber: data.pageNumber,
      surahId: data.surahId,
      version: data.version,
      linesCount: data.lines?.length || 0
    });
    
    return data;
  } catch (error) {
    console.error(`❌ Error fetching Imlaei page lines for page ${pageNumber}:`, error);
    return null;
  }
}

/**
 * Fetch verses by chapter/surah
 */
export async function fetchVersesBySurah(surahId: number, version: 'nastaleeq' | 'v4' = 'nastaleeq'): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE}/quran/surahs/${surahId}/verses?version=${version}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`⚠️ Verses endpoint returned 404 for surah ${surahId}`);
        return [];
      }
      throw new Error(`Failed to fetch verses for surah ${surahId}: ${response.statusText}`);
    }

    const data = await response.json();
    const verses = data.verses || data || [];
    
    // Only log warning if we expected data (surah 1-114 are valid)
    // Some surahs may not have data available, which is expected
    if (verses.length === 0 && surahId >= 1 && surahId <= 114) {
      // Use debug level instead of warn - this is expected for some surahs
      if (import.meta.env?.DEV) {
        console.debug(`ℹ️ No verses returned for surah ${surahId} (data may not be available)`);
      }
    }
    
    return verses;
  } catch (error) {
    console.error(`Error fetching verses for surah ${surahId}:`, error);
    return [];
  }
}
