/**
 * Data caching utility for faster initial loads
 * Uses localStorage with timestamps to cache API responses
 */

const CACHE_PREFIX = 'umar_academy_cache_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export const dataCache = {
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

