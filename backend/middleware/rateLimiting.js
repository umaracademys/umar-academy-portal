/**
 * Advanced Rate Limiting Middleware
 * 
 * Provides per-user and per-IP rate limiting with:
 * - Different limits for different endpoint types
 * - Admin exemption
 * - Safe defaults
 * - Per-user and per-IP tracking
 */

const rateLimit = require('express-rate-limit');
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Get client identifier (user ID if authenticated, otherwise IP)
 */
const getClientIdentifier = (req) => {
  // If user is authenticated, use user ID
  if (req.user && req.user.userId) {
    return `user:${req.user.userId}`;
  }
  // Otherwise use IP address
  return `ip:${req.ip || req.connection?.remoteAddress || 'unknown'}`;
};

/**
 * Check if user is admin (exempt from rate limiting)
 */
const isAdmin = (req) => {
  if (!req.user) return false;
  const role = req.user.role;
  return role === 'admin' || role === 'superadmin';
};

/**
 * Create rate limiter with per-user and per-IP tracking
 */
const createRateLimiter = (options) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes default
    max = 100, // Default max requests
    message = 'Too many requests, please try again later.',
    keyGenerator = getClientIdentifier,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    name = 'rate-limiter'
  } = options;

  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skipSuccessfulRequests,
    skipFailedRequests,
    // Skip rate limiting for admins
    skip: (req) => {
      // Skip in development for localhost
      if (isDevelopment) {
        const ip = req.ip || req.connection?.remoteAddress || '';
        if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.startsWith('127.') || ip === 'unknown') {
          return true;
        }
      }
      // Skip for admins
      return isAdmin(req);
    },
    handler: async (req, res) => {
      const identifier = keyGenerator(req);
      console.warn(`⚠️ Rate limit exceeded for ${identifier} on ${req.path}`);
      
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000), // seconds
        limit: max,
        window: Math.ceil(windowMs / 1000 / 60) // minutes
      });
    }
  });
};

/**
 * Rate limiter for authentication routes
 * Stricter limits to prevent brute force attacks
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 5 : 20, // 5 attempts in production, 20 in development
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  name: 'auth-limiter'
});

/**
 * Rate limiter for ticket creation
 * Prevents spam ticket creation
 */
const ticketCreationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isProduction ? 10 : 50, // 10 tickets per hour in production, 50 in development
  message: 'Too many tickets created. Please try again after 1 hour.',
  name: 'ticket-creation-limiter'
});

/**
 * Rate limiter for assignment submission
 * Prevents spam submissions
 */
const assignmentSubmissionLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isProduction ? 20 : 100, // 20 submissions per hour in production, 100 in development
  message: 'Too many assignment submissions. Please try again after 1 hour.',
  name: 'assignment-submission-limiter'
});

/**
 * Rate limiter for list endpoints
 * Prevents excessive data fetching
 */
const listEndpointLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isProduction ? 30 : 100, // 30 requests per minute in production, 100 in development
  message: 'Too many list requests. Please try again after 1 minute.',
  name: 'list-endpoint-limiter'
});

/**
 * Combined rate limiter (per-user AND per-IP)
 * Tracks both user ID and IP address separately
 */
const createCombinedLimiter = (options) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests, please try again later.',
    name = 'combined-limiter'
  } = options;

  // Create two separate limiters: one for user, one for IP
  const userLimiter = createRateLimiter({
    windowMs,
    max,
    message: `${message} (per-user limit)`,
    keyGenerator: (req) => {
      if (req.user && req.user.userId) {
        return `user:${req.user.userId}`;
      }
      return null; // Will be skipped if no user
    },
    name: `${name}-user`
  });

  const ipLimiter = createRateLimiter({
    windowMs,
    max,
    message: `${message} (per-IP limit)`,
    keyGenerator: (req) => `ip:${req.ip || req.connection?.remoteAddress || 'unknown'}`,
    name: `${name}-ip`
  });

  // Return middleware that applies both limiters
  return async (req, res, next) => {
    // Skip for admins
    if (isAdmin(req)) {
      return next();
    }

    // Apply user limiter if user is authenticated
    if (req.user && req.user.userId) {
      await new Promise((resolve, reject) => {
        userLimiter(req, res, (err) => {
          if (err) return reject(err);
          // If rate limited, response was already sent
          if (res.headersSent) return;
          resolve();
        });
      }).catch(() => {
        // Rate limit exceeded, response already sent
        return;
      });
      
      // If response was sent (rate limited), don't continue
      if (res.headersSent) return;
    }

    // Apply IP limiter
    await new Promise((resolve, reject) => {
      ipLimiter(req, res, (err) => {
        if (err) return reject(err);
        // If rate limited, response was already sent
        if (res.headersSent) return;
        resolve();
      });
    }).catch(() => {
      // Rate limit exceeded, response already sent
      return;
    });
    
    // If response was sent (rate limited), don't continue
    if (res.headersSent) return;

    next();
  };
};

/**
 * Combined limiters for specific endpoint types
 */
const combinedAuthLimiter = createCombinedLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 5 : 20,
  message: 'Too many authentication attempts',
  name: 'combined-auth'
});

const combinedTicketCreationLimiter = createCombinedLimiter({
  windowMs: 60 * 60 * 1000,
  max: isProduction ? 10 : 50,
  message: 'Too many tickets created',
  name: 'combined-ticket-creation'
});

const combinedAssignmentSubmissionLimiter = createCombinedLimiter({
  windowMs: 60 * 60 * 1000,
  max: isProduction ? 20 : 100,
  message: 'Too many assignment submissions',
  name: 'combined-assignment-submission'
});

const combinedListEndpointLimiter = createCombinedLimiter({
  windowMs: 1 * 60 * 1000,
  max: isProduction ? 30 : 100,
  message: 'Too many list requests',
  name: 'combined-list-endpoint'
});

module.exports = {
  // Individual limiters (per-user OR per-IP)
  authLimiter,
  ticketCreationLimiter,
  assignmentSubmissionLimiter,
  listEndpointLimiter,
  
  // Combined limiters (per-user AND per-IP)
  combinedAuthLimiter,
  combinedTicketCreationLimiter,
  combinedAssignmentSubmissionLimiter,
  combinedListEndpointLimiter,
  
  // Utility functions
  createRateLimiter,
  createCombinedLimiter,
  isAdmin,
  getClientIdentifier
};
