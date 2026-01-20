/**
 * Simple in-memory cache with TTL
 * Used for static metadata that changes infrequently
 * 
 * NOTE: This is an in-memory cache for single-instance deployments.
 * For horizontal scaling (multiple server instances), consider Redis
 * to share cache across instances. Each instance maintains its own
 * cache, so cache invalidation only affects the current instance.
 */

const cache = new Map();

/**
 * Get cached value
 * @param {string} key - Cache key
 * @param {number} ttlMs - Time-to-live in milliseconds (default: 5 minutes)
 * @returns {any|null} - Cached value or null if expired/missing
 */
function getCached(key, ttlMs = 5 * 60 * 1000) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttlMs) {
    return cached.data;
  }
  // Remove expired entry
  if (cached) {
    cache.delete(key);
  }
  return null;
}

/**
 * Set cached value
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
function setCached(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Clear cache entry
 * @param {string} key - Cache key
 */
function clearCache(key) {
  cache.delete(key);
}

/**
 * Clear all cache
 */
function clearAllCache() {
  cache.clear();
}

/**
 * Get cache stats (for monitoring)
 * @returns {Object} - Cache statistics
 */
function getCacheStats() {
  const stats = {
    size: cache.size,
    entries: []
  };
  
  for (const [key, value] of cache.entries()) {
    const age = Date.now() - value.timestamp;
    const dataSize = JSON.stringify(value.data).length;
    stats.entries.push({
      key,
      ageSeconds: Math.floor(age / 1000),
      sizeBytes: dataSize
    });
  }
  
  return stats;
}

module.exports = {
  getCached,
  setCached,
  clearCache,
  clearAllCache,
  getCacheStats
};
