/**
 * Request Validation Middleware
 * 
 * Enhanced with:
 * - ID validation (MongoDB ObjectIds, custom IDs)
 * - Email validation
 * - Max length enforcement
 * - Unknown field rejection
 * - Standardized error responses
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to validate request data and reject unknown fields
 * 
 * @param {Array} validations - Array of express-validator validation chains
 * @param {Array} allowedFields - Array of allowed field names (optional, for unknown field rejection)
 * @returns {Function} Express middleware function
 */
const validateRequest = (validations, allowedFields = null) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Check for errors
    const errors = validationResult(req);
    const errorArray = errors.array();
    
    // Reject unknown fields if allowedFields is provided
    if (allowedFields && Array.isArray(allowedFields) && req.method !== 'GET') {
      const bodyFields = Object.keys(req.body || {});
      const unknownFields = bodyFields.filter(field => !allowedFields.includes(field));
      
      if (unknownFields.length > 0) {
        unknownFields.forEach(field => {
          errorArray.push({
            type: 'field',
            value: req.body[field],
            msg: `Unknown field '${field}' is not allowed`,
            path: field,
            location: 'body'
          });
        });
      }
    }
    
    // Return standardized validation errors
    if (errorArray.length > 0) {
      console.error('❌ Validation errors:', {
        path: req.path,
        method: req.method,
        userId: req.user?.userId || 'anonymous',
        userRole: req.user?.role || 'unknown',
        errors: errorArray
      });
      
      // Standardized error response format
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input and try again',
        errors: errorArray.map(err => ({
          field: err.path || err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }
    
    next();
  };
};

/**
 * Common validation rules with enhanced features
 */
const commonRules = {
  // ID validation
  mongoId: (field = 'id', location = 'param') => {
    const validator = location === 'param' ? param(field) : body(field);
    return validator
      .isMongoId()
      .withMessage(`Invalid ${field} format - must be a valid MongoDB ObjectId`);
  },
  
  // Custom ID validation (for non-MongoDB IDs)
  customId: (field = 'id', location = 'param', pattern = /^[a-zA-Z0-9-_]+$/) => {
    const validator = location === 'param' ? param(field) : body(field);
    return validator
      .matches(pattern)
      .withMessage(`Invalid ${field} format`)
      .isLength({ min: 1, max: 100 })
      .withMessage(`${field} must be between 1 and 100 characters`);
  },
  
  // Email validation
  email: (field = 'email', required = true) => {
    const rule = body(field)
      .trim()
      .normalizeEmail()
      .isEmail()
      .withMessage(`Invalid ${field} format`)
      .isLength({ max: 255 })
      .withMessage(`${field} must not exceed 255 characters`);
    
    if (required) {
      return rule.notEmpty().withMessage(`${field} is required`);
    }
    return rule.optional();
  },
  
  // String validation with max length
  requiredString: (field, minLength = 1, maxLength = 1000) => 
    body(field)
      .trim()
      .notEmpty()
      .withMessage(`${field} is required`)
      .isLength({ min: minLength })
      .withMessage(`${field} must be at least ${minLength} character(s)`)
      .isLength({ max: maxLength })
      .withMessage(`${field} must not exceed ${maxLength} characters`),
  
  optionalString: (field, maxLength = 1000) => 
    body(field)
      .optional()
      .trim()
      .isLength({ max: maxLength })
      .withMessage(`${field} must not exceed ${maxLength} characters`),
  
  // Array validations
  arrayOfStrings: (field, maxLength = 100) => 
    body(field)
      .optional()
      .isArray()
      .withMessage(`${field} must be an array`)
      .custom((value) => {
        if (Array.isArray(value)) {
          return value.every(item => typeof item === 'string' && item.length <= maxLength);
        }
        return true;
      })
      .withMessage(`${field} must be an array of strings (max ${maxLength} chars each)`),
  
  arrayOfMongoIds: (field, maxItems = 100) => 
    body(field)
      .optional()
      .isArray()
      .withMessage(`${field} must be an array`)
      .isArray({ max: maxItems })
      .withMessage(`${field} must not exceed ${maxItems} items`)
      .custom((value) => {
        if (Array.isArray(value)) {
          return value.every(id => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id));
        }
        return true;
      })
      .withMessage(`${field} must be an array of valid MongoDB ObjectIds`),
  
  // Enum validation
  enum: (field, values) => 
    body(field)
      .isIn(values)
      .withMessage(`Invalid ${field} value. Must be one of: ${values.join(', ')}`),
  
  optionalEnum: (field, values) => 
    body(field)
      .optional()
      .isIn(values)
      .withMessage(`Invalid ${field} value. Must be one of: ${values.join(', ')}`),
  
  // Number validation
  number: (field, min = null, max = null) => {
    let rule = body(field).optional().isNumeric().withMessage(`${field} must be a number`);
    if (min !== null) {
      rule = rule.custom((value) => {
        if (value !== undefined && parseFloat(value) < min) {
          throw new Error(`${field} must be at least ${min}`);
        }
        return true;
      });
    }
    if (max !== null) {
      rule = rule.custom((value) => {
        if (value !== undefined && parseFloat(value) > max) {
          throw new Error(`${field} must not exceed ${max}`);
        }
        return true;
      });
    }
    return rule;
  },
  
  // Boolean validation
  boolean: (field) => 
    body(field)
      .optional()
      .isBoolean()
      .withMessage(`${field} must be a boolean`),
  
  // Date validation
  date: (field, required = false) => {
    const rule = body(field)
      .optional(!required)
      .isISO8601()
      .withMessage(`${field} must be a valid ISO 8601 date`);
    
    if (required) {
      return rule.notEmpty().withMessage(`${field} is required`);
    }
    return rule;
  },
  
  // URL validation
  url: (field, required = false) => {
    const rule = body(field)
      .optional(!required)
      .isURL()
      .withMessage(`${field} must be a valid URL`)
      .isLength({ max: 2048 })
      .withMessage(`${field} must not exceed 2048 characters`);
    
    if (required) {
      return rule.notEmpty().withMessage(`${field} is required`);
    }
    return rule;
  }
};

module.exports = {
  validateRequest,
  commonRules
};
