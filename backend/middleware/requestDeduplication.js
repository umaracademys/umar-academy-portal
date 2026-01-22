/**
 * Request Deduplication Middleware
 * 
 * Prevents duplicate requests from being processed simultaneously.
 * Uses in-memory cache with request fingerprinting to detect and block duplicates.
 * 
 * Features:
 * - Detects duplicate requests within a time window
 * - Prevents race conditions from double-clicks or retries
 * - Automatically cleans up old entries
 * - Configurable time window and cleanup interval
 */

const crypto = require('crypto');

// In-memory cache for request fingerprints
// Format: { fingerprint: { timestamp: Date, count: number } }
const requestCache = new Map();

// Cleanup interval: remove entries older than 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const DEDUPE_WINDOW = 2 * 1000; // 2 seconds - requests within this window are considered duplicates

// Start cleanup interval
setInterval(() => {
  const now = Date.now();
  for (const [fingerprint, data] of requestCache.entries()) {
    if (now - data.timestamp > CLEANUP_INTERVAL) {
      requestCache.delete(fingerprint);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Generate a unique fingerprint for a request
 * Combines: method + path + user ID (if authenticated) + request body hash
 */
function generateFingerprint(req) {
  const parts = [
    req.method,
    req.path,
    req.user?.userId || req.ip || 'anonymous'
  ];

  // Add request body hash if present (for POST/PUT/PATCH)
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyString = JSON.stringify(req.body);
    const bodyHash = crypto.createHash('md5').update(bodyString).digest('hex');
    parts.push(bodyHash);
  }

  // Add query parameters if present
  if (req.query && Object.keys(req.query).length > 0) {
    const queryString = JSON.stringify(req.query);
    const queryHash = crypto.createHash('md5').update(queryString).digest('hex');
    parts.push(queryHash);
  }

  return crypto.createHash('md5').update(parts.join('|')).digest('hex');
}

/**
 * Request deduplication middleware
 * 
 * Options:
 * - windowMs: Time window in milliseconds (default: 2000ms)
 * - skipGet: Skip GET requests (default: true)
 * - skipOptions: Skip OPTIONS requests (default: true)
 * - skipHead: Skip HEAD requests (default: true)
 */
function requestDeduplication(options = {}) {
  const {
    windowMs = DEDUPE_WINDOW,
    skipGet = true,
    skipOptions = true,
    skipHead = true,
    enabled = true
  } = options;

  return async (req, res, next) => {
    // Skip if disabled
    if (!enabled) {
      return next();
    }

    // Skip GET, OPTIONS, HEAD requests by default
    if (skipGet && req.method === 'GET') {
      return next();
    }
    if (skipOptions && req.method === 'OPTIONS') {
      return next();
    }
    if (skipHead && req.method === 'HEAD') {
      return next();
    }

    // Generate fingerprint
    const fingerprint = generateFingerprint(req);
    const now = Date.now();

    // Check if this request was recently processed
    const cached = requestCache.get(fingerprint);
    if (cached && (now - cached.timestamp) < windowMs) {
      // Duplicate request detected
      console.warn(`⚠️ Duplicate request detected: ${req.method} ${req.path} (fingerprint: ${fingerprint.substring(0, 8)}...)`);
      
      // Return the cached response if available, or return 409 Conflict
      return res.status(409).json({
        error: 'Duplicate request detected. Please wait a moment and try again.',
        retryAfter: Math.ceil((windowMs - (now - cached.timestamp)) / 1000), // seconds
        fingerprint: fingerprint.substring(0, 8) // First 8 chars for debugging
      });
    }

    // Store fingerprint with timestamp
    requestCache.set(fingerprint, {
      timestamp: now,
      count: (cached?.count || 0) + 1
    });

    // Store original end function to clear cache after response
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      // Clear cache after response is sent (with a small delay to catch duplicates)
      setTimeout(() => {
        requestCache.delete(fingerprint);
      }, windowMs);

      // Call original end
      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

module.exports = {
  requestDeduplication,
  generateFingerprint,
  DEDUPE_WINDOW
};
