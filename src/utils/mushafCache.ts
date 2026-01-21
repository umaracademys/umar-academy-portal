/**
 * Production-Ready IndexedDB Cache for Interactive Mushaf Data
 * 
 * Caches static Mushaf data (page lines, page info, page layout) for instant loading.
 * Uses native IndexedDB API with safe fallbacks.
 * 
 * Cache Keys:
 * - page:{pageNumber}:lines
 * - page:{pageNumber}:info
 * - page:{pageNumber}:layout
 * 
 * Database: mushaf-cache-v1
 * Version: 1 (no TTL - static data)
 */

const DB_NAME = 'mushaf-cache-v1';
const DB_VERSION = 1;

// Object store names
const STORE_LINES = 'pageLines';
const STORE_INFO = 'pageInfo';
const STORE_LAYOUT = 'pageLayout';

// Type definitions
export interface PageLinesData {
  lines: any[];
  pageNumber: number;
  version?: string;
  cachedAt: number;
}

export interface PageInfoData {
  info: any;
  pageNumber: number;
  cachedAt: number;
}

export interface PageLayoutData {
  layout: any;
  pageNumber: number;
  cachedAt: number;
}

// Database instance (lazy initialization)
let dbInstance: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null;
let isIndexedDBAvailable = false;

/**
 * Check if IndexedDB is available in the browser
 */
function checkIndexedDBAvailability(): boolean {
  try {
    if (typeof window === 'undefined') {
      return false; // Server-side rendering
    }
    
    if (!('indexedDB' in window)) {
      console.warn('⚠️ IndexedDB is not available in this browser');
      return false;
    }
    
    // Test if we can create a request (some browsers block in private mode)
    const testDB = indexedDB.open('__test__');
    testDB.onerror = () => {
      testDB.result?.close();
      indexedDB.deleteDatabase('__test__');
    };
    testDB.onsuccess = () => {
      testDB.result?.close();
      indexedDB.deleteDatabase('__test__');
    };
    
    isIndexedDBAvailable = true;
    return true;
  } catch (error) {
    console.warn('⚠️ IndexedDB check failed:', error);
    return false;
  }
}

/**
 * Initialize IndexedDB database
 * Returns a promise that resolves to the database instance
 */
async function initDatabase(): Promise<IDBDatabase> {
  // Return existing instance if already initialized
  if (dbInstance) {
    return dbInstance;
  }
  
  // Return existing promise if initialization is in progress
  if (initPromise) {
    return initPromise;
  }
  
  // Check availability
  if (!checkIndexedDBAvailability()) {
    throw new Error('IndexedDB is not available');
  }
  
  // Create initialization promise
  initPromise = new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        const error = request.error || new Error('Failed to open IndexedDB');
        console.error('❌ IndexedDB open error:', error);
        initPromise = null;
        reject(error);
      };
      
      request.onsuccess = () => {
        dbInstance = request.result;
        
        // Handle database close events
        dbInstance.onclose = () => {
          console.warn('⚠️ IndexedDB connection closed');
          dbInstance = null;
          initPromise = null;
        };
        
        // Handle database errors
        dbInstance.onerror = (event) => {
          console.error('❌ IndexedDB error:', event);
        };
        
        console.log('✅ IndexedDB initialized:', DB_NAME);
        resolve(dbInstance);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORE_LINES)) {
          db.createObjectStore(STORE_LINES, { keyPath: 'pageNumber' });
        }
        if (!db.objectStoreNames.contains(STORE_INFO)) {
          db.createObjectStore(STORE_INFO, { keyPath: 'pageNumber' });
        }
        if (!db.objectStoreNames.contains(STORE_LAYOUT)) {
          db.createObjectStore(STORE_LAYOUT, { keyPath: 'pageNumber' });
        }
        
        console.log('✅ IndexedDB stores created');
      };
    } catch (error) {
      console.error('❌ IndexedDB initialization error:', error);
      initPromise = null;
      reject(error);
    }
  });
  
  return initPromise;
}

/**
 * Get database instance (with initialization if needed)
 */
async function getDatabase(): Promise<IDBDatabase | null> {
  try {
    if (!isIndexedDBAvailable) {
      return null;
    }
    
    if (!dbInstance) {
      await initDatabase();
    }
    
    return dbInstance;
  } catch (error) {
    console.warn('⚠️ Failed to get IndexedDB instance:', error);
    return null;
  }
}

/**
 * Generic get operation
 */
async function getFromStore<T>(
  storeName: string,
  pageNumber: number
): Promise<T | null> {
  try {
    const db = await getDatabase();
    if (!db) {
      return null;
    }
    
    return new Promise<T | null>((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(pageNumber);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve(result as T);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error(`❌ Error reading from ${storeName}:`, request.error);
        resolve(null); // Graceful fallback - return null on error
      };
    });
  } catch (error) {
    console.warn(`⚠️ Error accessing ${storeName}:`, error);
    return null;
  }
}

/**
 * Generic set operation
 */
async function setInStore<T extends { pageNumber: number; cachedAt: number }>(
  storeName: string,
  data: T
): Promise<boolean> {
  try {
    const db = await getDatabase();
    if (!db) {
      return false;
    }
    
    return new Promise<boolean>((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Add cachedAt timestamp if not present
      const dataWithTimestamp = {
        ...data,
        cachedAt: data.cachedAt || Date.now()
      };
      
      const request = store.put(dataWithTimestamp);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = () => {
        console.error(`❌ Error writing to ${storeName}:`, request.error);
        resolve(false); // Graceful fallback - return false on error
      };
    });
  } catch (error) {
    console.warn(`⚠️ Error writing to ${storeName}:`, error);
    return false;
  }
}

// ============================================
// Public API: Page Lines
// ============================================

/**
 * Get cached page lines
 * @param pageNumber - Page number (1-604)
 * @returns Cached page lines data or null if not cached
 */
export async function getCachedPageLines(
  pageNumber: number
): Promise<PageLinesData | null> {
  if (pageNumber < 1 || pageNumber > 604) {
    console.warn(`⚠️ Invalid page number: ${pageNumber}`);
    return null;
  }
  
  return getFromStore<PageLinesData>(STORE_LINES, pageNumber);
}

/**
 * Cache page lines
 * @param pageNumber - Page number (1-604)
 * @param data - Page lines data to cache
 * @returns true if cached successfully, false otherwise
 */
export async function setCachedPageLines(
  pageNumber: number,
  data: { lines: any[]; version?: string }
): Promise<boolean> {
  if (pageNumber < 1 || pageNumber > 604) {
    console.warn(`⚠️ Invalid page number: ${pageNumber}`);
    return false;
  }
  
  const cacheData: PageLinesData = {
    pageNumber,
    lines: data.lines,
    version: data.version,
    cachedAt: Date.now()
  };
  
  return setInStore<PageLinesData>(STORE_LINES, cacheData);
}

// ============================================
// Public API: Page Info
// ============================================

/**
 * Get cached page info
 * @param pageNumber - Page number (1-604)
 * @returns Cached page info data or null if not cached
 */
export async function getCachedPageInfo(
  pageNumber: number
): Promise<PageInfoData | null> {
  if (pageNumber < 1 || pageNumber > 604) {
    console.warn(`⚠️ Invalid page number: ${pageNumber}`);
    return null;
  }
  
  return getFromStore<PageInfoData>(STORE_INFO, pageNumber);
}

/**
 * Cache page info
 * @param pageNumber - Page number (1-604)
 * @param data - Page info data to cache
 * @returns true if cached successfully, false otherwise
 */
export async function setCachedPageInfo(
  pageNumber: number,
  data: { info: any }
): Promise<boolean> {
  if (pageNumber < 1 || pageNumber > 604) {
    console.warn(`⚠️ Invalid page number: ${pageNumber}`);
    return false;
  }
  
  const cacheData: PageInfoData = {
    pageNumber,
    info: data.info,
    cachedAt: Date.now()
  };
  
  return setInStore<PageInfoData>(STORE_INFO, cacheData);
}

// ============================================
// Public API: Page Layout
// ============================================

/**
 * Get cached page layout
 * @param pageNumber - Page number (1-604)
 * @returns Cached page layout data or null if not cached
 */
export async function getCachedPageLayout(
  pageNumber: number
): Promise<PageLayoutData | null> {
  if (pageNumber < 1 || pageNumber > 604) {
    console.warn(`⚠️ Invalid page number: ${pageNumber}`);
    return null;
  }
  
  return getFromStore<PageLayoutData>(STORE_LAYOUT, pageNumber);
}

/**
 * Cache page layout
 * @param pageNumber - Page number (1-604)
 * @param data - Page layout data to cache
 * @returns true if cached successfully, false otherwise
 */
export async function setCachedPageLayout(
  pageNumber: number,
  data: { layout: any }
): Promise<boolean> {
  if (pageNumber < 1 || pageNumber > 604) {
    console.warn(`⚠️ Invalid page number: ${pageNumber}`);
    return false;
  }
  
  const cacheData: PageLayoutData = {
    pageNumber,
    layout: data.layout,
    cachedAt: Date.now()
  };
  
  return setInStore<PageLayoutData>(STORE_LAYOUT, cacheData);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Clear all Mushaf cache data
 * @returns true if cleared successfully, false otherwise
 */
export async function clearMushafCache(): Promise<boolean> {
  try {
    const db = await getDatabase();
    if (!db) {
      return false;
    }
    
    return new Promise<boolean>((resolve) => {
      const transaction = db.transaction(
        [STORE_LINES, STORE_INFO, STORE_LAYOUT],
        'readwrite'
      );
      
      let completed = 0;
      let hasError = false;
      
      const checkComplete = () => {
        completed++;
        if (completed === 3) {
          resolve(!hasError);
        }
      };
      
      // Clear page lines
      const linesStore = transaction.objectStore(STORE_LINES);
      const linesRequest = linesStore.clear();
      linesRequest.onsuccess = () => checkComplete();
      linesRequest.onerror = () => {
        hasError = true;
        console.error('❌ Error clearing page lines:', linesRequest.error);
        checkComplete();
      };
      
      // Clear page info
      const infoStore = transaction.objectStore(STORE_INFO);
      const infoRequest = infoStore.clear();
      infoRequest.onsuccess = () => checkComplete();
      infoRequest.onerror = () => {
        hasError = true;
        console.error('❌ Error clearing page info:', infoRequest.error);
        checkComplete();
      };
      
      // Clear page layout
      const layoutStore = transaction.objectStore(STORE_LAYOUT);
      const layoutRequest = layoutStore.clear();
      layoutRequest.onsuccess = () => checkComplete();
      layoutRequest.onerror = () => {
        hasError = true;
        console.error('❌ Error clearing page layout:', layoutRequest.error);
        checkComplete();
      };
    });
  } catch (error) {
    console.warn('⚠️ Error clearing Mushaf cache:', error);
    return false;
  }
}

/**
 * Get cache statistics (for debugging/monitoring)
 * @returns Cache statistics or null if unavailable
 */
export async function getCacheStats(): Promise<{
  linesCount: number;
  infoCount: number;
  layoutCount: number;
  totalSize: number;
} | null> {
  try {
    const db = await getDatabase();
    if (!db) {
      return null;
    }
    
    return new Promise((resolve) => {
      const transaction = db.transaction(
        [STORE_LINES, STORE_INFO, STORE_LAYOUT],
        'readonly'
      );
      
      let completed = 0;
      const stats = {
        linesCount: 0,
        infoCount: 0,
        layoutCount: 0,
        totalSize: 0
      };
      
      const checkComplete = () => {
        completed++;
        if (completed === 3) {
          resolve(stats);
        }
      };
      
      // Count page lines
      const linesStore = transaction.objectStore(STORE_LINES);
      const linesRequest = linesStore.count();
      linesRequest.onsuccess = () => {
        stats.linesCount = linesRequest.result;
        checkComplete();
      };
      linesRequest.onerror = () => checkComplete();
      
      // Count page info
      const infoStore = transaction.objectStore(STORE_INFO);
      const infoRequest = infoStore.count();
      infoRequest.onsuccess = () => {
        stats.infoCount = infoRequest.result;
        checkComplete();
      };
      infoRequest.onerror = () => checkComplete();
      
      // Count page layout
      const layoutStore = transaction.objectStore(STORE_LAYOUT);
      const layoutRequest = layoutStore.count();
      layoutRequest.onsuccess = () => {
        stats.layoutCount = layoutRequest.result;
        checkComplete();
      };
      layoutRequest.onerror = () => checkComplete();
    });
  } catch (error) {
    console.warn('⚠️ Error getting cache stats:', error);
    return null;
  }
}

/**
 * Check if IndexedDB is available
 * @returns true if IndexedDB is available, false otherwise
 */
export function isCacheAvailable(): boolean {
  return isIndexedDBAvailable && checkIndexedDBAvailability();
}

/**
 * Pre-initialize the cache (call this early in app lifecycle)
 * This is optional but recommended for better performance
 */
export async function initMushafCache(): Promise<boolean> {
  try {
    await initDatabase();
    return true;
  } catch (error) {
    console.warn('⚠️ Failed to initialize Mushaf cache:', error);
    return false;
  }
}
