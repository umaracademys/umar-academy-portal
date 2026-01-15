/**
 * Request Validation Middleware
 * 
 * Phase 3: Production Stabilization
 * Provides request/response validation using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to validate request data
 * 
 * @param {Array} validations - Array of express-validator validation chains
 * @returns {Function} Express middleware function
 */
const validateRequest = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Check for errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Validation errors:', {
        path: req.path,
        method: req.method,
        userId: req.user?.userId || 'anonymous',
        userRole: req.user?.role || 'unknown',
        errors: errors.array()
      });
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    next();
  };
};

/**
 * Common validation rules
 */
const commonRules = {
  mongoId: (field = 'id') => param(field).isMongoId().withMessage(`Invalid ${field} format - must be valid MongoDB ObjectId`),
  email: (field = 'email') => body(field).isEmail().withMessage(`Invalid ${field} format`),
  requiredString: (field, minLength = 1) => 
    body(field).trim().isLength({ min: minLength }).withMessage(`${field} is required and must be at least ${minLength} character(s)`),
  optionalString: (field) => body(field).optional().trim(),
  arrayOfStrings: (field) => body(field).optional().isArray().withMessage(`${field} must be an array`),
  arrayOfMongoIds: (field) => 
    body(field).optional().isArray().withMessage(`${field} must be an array`)
      .custom((value) => {
        if (Array.isArray(value)) {
          return value.every(id => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id));
        }
        return true;
      }).withMessage(`${field} must be an array of valid MongoDB ObjectIds`),
  enum: (field, values) => body(field).isIn(values).withMessage(`Invalid ${field} value. Must be one of: ${values.join(', ')}`),
  optionalEnum: (field, values) => body(field).optional().isIn(values).withMessage(`Invalid ${field} value. Must be one of: ${values.join(', ')}`),
  number: (field) => body(field).optional().isNumeric().withMessage(`${field} must be a number`),
  boolean: (field) => body(field).optional().isBoolean().withMessage(`${field} must be a boolean`),
};

module.exports = {
  validateRequest,
  commonRules
};
