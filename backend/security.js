// Security middleware and utilities

// Password validation
const validatePassword = (password) => {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common weak passwords
  const commonPasswords = ['password', 'password123', 'admin', 'admin123', '12345678', 'qwerty'];
  if (commonPasswords.some(weak => password.toLowerCase().includes(weak))) {
    errors.push('Password is too common or weak');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Input sanitization
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Remove potential script tags (basic XSS prevention)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  return sanitized;
};

// Sanitize object recursively
const sanitizeObject = (obj) => {
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
};

// Email validation
const validateEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Rate limit configuration for account lockout
const getAccountLockoutConfig = () => {
  return {
    maxAttempts: 5, // Maximum failed login attempts
    lockoutDuration: 30 * 60 * 1000, // 30 minutes in milliseconds
    windowMs: 15 * 60 * 1000 // 15 minutes window for tracking attempts
  };
};

module.exports = {
  validatePassword,
  sanitizeInput,
  sanitizeObject,
  validateEmail,
  getAccountLockoutConfig
};

