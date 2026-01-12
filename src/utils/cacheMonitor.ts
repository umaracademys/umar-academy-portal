/**
 * Cache Monitor - Dev-Only Stale Cache Detection
 * 
 * This utility helps detect stale cache issues during development.
 * It logs warnings when mutations occur after cache writes, indicating
 * potential cache invalidation bugs.
 * 
 * IMPORTANT: Only active in development mode
 */

if (import.meta.env.DEV) {
  const mutationTimestamps: Map<string, number> = new Map();
  const cacheTimestamps: Map<string, number> = new Map();

  /**
   * Track when a mutation occurs
   */
  export function trackMutation(key: string): void {
    mutationTimestamps.set(key, Date.now());
  }

  /**
   * Track when cache is written
   */
  export function trackCacheWrite(key: string): void {
    cacheTimestamps.set(key, Date.now());
  }

  /**
   * Check if cache might be stale
   */
  export function checkStaleCache(key: string): void {
    const mutationTime = mutationTimestamps.get(key);
    const cacheTime = cacheTimestamps.get(key);

    if (mutationTime && cacheTime && mutationTime > cacheTime) {
      console.warn(
        `⚠️ STALE CACHE WARNING: Mutation occurred after cache write for key: "${key}"\n` +
        `   Mutation timestamp: ${new Date(mutationTime).toISOString()}\n` +
        `   Cache timestamp: ${new Date(cacheTime).toISOString()}\n` +
        `   This may indicate missing cache invalidation.`
      );
    }
  }

  /**
   * Monitor cache operations (wraps dataCache methods)
   */
  export function monitorCacheOperations() {
    // This would be called during initialization to wrap cache operations
    // For now, it's a placeholder for future enhancement
  }
} else {
  // No-op in production
  export function trackMutation(_key: string): void {}
  export function trackCacheWrite(_key: string): void {}
  export function checkStaleCache(_key: string): void {}
  export function monitorCacheOperations(): void {}
}
