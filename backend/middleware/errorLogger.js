/**
 * Structured error logging middleware
 * 
 * Phase 1: Production Stabilization
 * Provides structured error logging with sanitization for production debugging
 */

/**
 * Sanitize request data for logging (remove sensitive fields)
 */
function sanitizeRequestData(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = ['password', 'token', 'secret', 'authorization'];
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Structured error logging middleware
 * Must be used before the global error handler
 */
function errorLogger(err, req, res, next) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    userId: req.user?.userId || 'anonymous',
    userRole: req.user?.role || 'unknown',
    userEmail: req.user?.email || 'unknown',
    error: {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    },
    request: {
      body: sanitizeRequestData(req.body),
      query: req.query,
      params: req.params
    }
  };
  
  // Always log errors (even in production)
  console.error('❌ ERROR:', JSON.stringify(errorLog, null, 2));
  
  // Log to activity log if available (logActivity function from server.js)
  // Note: logActivity is passed via req.app.locals or we can access it from module
  // For now, we'll log to console and let server.js handle activity logging if needed
  // The structured log above provides all necessary information
  
  // Pass error to next middleware (global error handler)
  next(err);
}

module.exports = { errorLogger, sanitizeRequestData };
