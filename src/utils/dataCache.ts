/**
 * Data caching utility for faster initial loads
 * Uses localStorage with timestamps to cache API responses
 * 
 * This module provides caching functionality to speed up data loading
 * by storing API responses locally and serving cached data immediately
 * while fresh data loads in the background.
 */

const CACHE_PREFIX = 'umar_academy_cache_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
// Shorter cache for assignments to ensure fresh data (collaborative data needs to be more up-to-date)
export const ASSIGNMENTS_CACHE_DURATION = 1 * 60 * 1000; // 1 minute for assignments

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Export interface for type checking
export interface DataCache {
  get<T>(key: string): T | null;
  set<T>(key: string, data: T, duration?: number): void;
  delete(key: string): void;
  clear(): void;
  clearExpired(): void;
}

export const dataCache: DataCache = {
  /**
   * Get cached data if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const parsed: CachedData<T> = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid
      if (now < parsed.expiresAt) {
        return parsed.data;
      }

      // Cache expired, remove it
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    } catch (error) {
      console.warn(`Failed to read cache for ${key}:`, error);
      return null;
    }
  },

  /**
   * Set data in cache with expiration
   */
  set<T>(key: string, data: T, duration: number = CACHE_DURATION): void {
    try {
      const cached: CachedData<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + duration,
      };
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cached));
    } catch (error) {
      console.warn(`Failed to cache ${key}:`, error);
      // If storage is full, try to clear old caches
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        dataCache.clear();
      }
    }
  },

  /**
   * Delete a specific cache entry
   */
  delete(key: string): void {
    try {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (error) {
      console.warn(`Failed to delete cache for ${key}:`, error);
    }
  },

  /**
   * Clear all cached data
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  },

  /**
   * Clear expired cache entries
   */
  clearExpired(): void {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const parsed: CachedData<any> = JSON.parse(cached);
              if (now >= parsed.expiresAt) {
                localStorage.removeItem(key);
              }
            }
          } catch {
            // Invalid cache entry, remove it
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.warn('Failed to clear expired cache:', error);
    }
  },
};

// Clear expired cache on load
if (typeof window !== 'undefined') {
  dataCache.clearExpired();
}

