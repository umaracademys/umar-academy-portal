/**
 * Permission Version Check Middleware
 * 
 * Phase 5: Permission Versioning
 * 
 * Lightweight middleware to check if JWT token permissions are still valid.
 * Compares token's permissionsVersion with database version.
 * 
 * This is a lightweight check - only queries the version field, not full permissions.
 * 
 * Usage:
 *   app.use(authenticateToken);
 *   app.use(checkPermissionVersion);
 */

const mongoose = require('mongoose');

// Models will be initialized from server.js
let Teacher, Admin;

/**
 * Initialize models (called from server.js)
 */
function initializeVersionModels(TeacherModel, AdminModel) {
  Teacher = TeacherModel;
  Admin = AdminModel;
}

/**
 * Check permission version middleware
 * 
 * Compares token's permissionsVersion with database version.
 * If mismatch, returns 401 with PERMISSIONS_OUTDATED code.
 * 
 * This is lightweight - only queries the version field, not full permissions.
 */
async function checkPermissionVersion(req, res, next) {
  try {
    // Skip check if user is not authenticated
    if (!req.user || !req.user.userId) {
      return next(); // Let authenticateToken handle this
    }

    // Superadmin bypass - no versioning needed
    if (req.user.role === 'superadmin' || (req.user.permissions && req.user.permissions['*'] === true)) {
      return next();
    }

    // Skip check if token doesn't have permissionsVersion (old token - backward compatibility)
    // Old tokens will still work but won't benefit from version invalidation
    if (req.user.permissionsVersion === undefined || req.user.permissionsVersion === null) {
      return next();
    }

    const userId = req.user.userId;
    const tokenVersion = req.user.permissionsVersion;

    // Get current version from database (lightweight query - only version field)
    let dbVersion = null;

    if (req.user.role === 'teacher') {
      if (!Teacher) {
        // Model not initialized - skip check (shouldn't happen in production)
        return next();
      }
      
      const teacher = await Teacher.findOne(
        { userId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId },
        { permissionsVersion: 1 } // Only fetch version field (lightweight)
      );
      
      if (teacher) {
        dbVersion = teacher.permissionsVersion || 1;
      }
    } else if (req.user.role === 'admin') {
      if (!Admin) {
        // Model not initialized - skip check (shouldn't happen in production)
        return next();
      }
      
      const admin = await Admin.findOne(
        { userId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId },
        { permissionsVersion: 1 } // Only fetch version field (lightweight)
      );
      
      if (admin) {
        dbVersion = admin.permissionsVersion || 1;
      }
    }

    // If no record found, allow request (backward compatibility)
    if (dbVersion === null) {
      return next();
    }

    // Compare versions
    if (tokenVersion !== dbVersion) {
      // Permissions have changed - token is stale
      return res.status(401).json({
        error: 'Your permissions have been updated. Please log in again.',
        code: 'PERMISSIONS_OUTDATED',
        permissionsVersion: dbVersion,
        tokenVersion: tokenVersion
      });
    }

    // Versions match - token is still valid
    next();
  } catch (error) {
    console.error('Permission version check error:', error);
    // On error, allow request (fail open for backward compatibility)
    // In production, you might want to fail closed
    next();
  }
}

module.exports = {
  checkPermissionVersion,
  initializeVersionModels,
};

