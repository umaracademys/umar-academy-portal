/**
 * Generic Permission Middleware
 * 
 * Phase 2: Backend Enforcement
 * 
 * This middleware enforces permissions on backend routes using the single source of truth.
 * It validates permission keys and checks user permissions from Teacher/Admin records.
 * 
 * Usage:
 *   app.post('/api/assignments', authenticateToken, requirePermission('canCreateAssignments'), handler);
 */

const mongoose = require('mongoose');
const { isValidPermissionKey } = require('../shared/permissions');

// Models will be initialized from server.js
let Teacher, Admin;

/**
 * Initialize models (called from server.js)
 */
function initializePermissionModels(TeacherModel, AdminModel) {
  Teacher = TeacherModel;
  Admin = AdminModel;
}

/**
 * Generic permission middleware factory
 * 
 * @param {string} permissionKey - Permission key from shared/permissions.js
 * @returns {Function} Express middleware function
 * 
 * @throws {Error} If permissionKey is invalid (not in shared permissions)
 */
function requirePermission(permissionKey) {
  // Validate permission key exists in shared permissions
  if (!isValidPermissionKey(permissionKey)) {
    throw new Error(
      `Invalid permission key: "${permissionKey}". ` +
      `Permission key must be defined in backend/shared/permissions.js`
    );
  }

  return async (req, res, next) => {
    try {
      // Ensure user is authenticated (should be done by authenticateToken middleware)
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          permission: permissionKey 
        });
      }

      const userRole = req.user.role;
      const userId = req.user.userId || req.user.id || req.user._id;

      if (!userId) {
        return res.status(403).json({ 
          error: 'User ID not found in request',
          permission: permissionKey 
        });
      }

      // Super admin bypass - has all permissions
      // Check for superadmin marker in token permissions or role
      if (userRole === 'superadmin' || (req.user.permissions && req.user.permissions['*'] === true)) {
        return next();
      }

      // Phase 3: Permission resolution priority
      // 1. Try token permissions first (fast path - no DB query)
      // 2. Fallback to DB lookup (for old tokens or missing permissions)
      let userPermissions = null;
      let permissionsSource = 'unknown';
      
      // Priority 1: Use permissions from JWT token (fast path)
      if (req.user.permissions && typeof req.user.permissions === 'object') {
        // Validate permission object structure
        // Only accept plain objects, ignore unknown keys
        const tokenPerms = req.user.permissions;
        
        // Security: Validate permission keys using shared permissions
        // Only include valid permission keys (ignore malicious/manipulated keys)
        const { isValidPermissionKey } = require('../shared/permissions');
        const validatedPermissions = {};
        
        for (const key in tokenPerms) {
          // Superadmin marker is allowed
          if (key === '*') {
            validatedPermissions[key] = tokenPerms[key];
          } else if (isValidPermissionKey(key)) {
            // Only include valid permission keys
            validatedPermissions[key] = tokenPerms[key] === true;
          }
          // Ignore invalid/unknown keys (security hardening)
        }
        
        userPermissions = validatedPermissions;
        permissionsSource = 'token';
      }
      
      // Priority 2: Fallback to DB lookup (for old tokens or missing permissions)
      if (!userPermissions || Object.keys(userPermissions).length === 0) {
        if (userRole === 'teacher') {
          if (!Teacher) {
            return res.status(500).json({ 
              error: 'Teacher model not initialized',
              permission: permissionKey 
            });
          }
          
          const teacher = await Teacher.findOne({ 
            userId: mongoose.Types.ObjectId.isValid(userId) 
              ? new mongoose.Types.ObjectId(userId) 
              : userId 
          });
          
          if (!teacher || !teacher.permissions) {
            return res.status(403).json({ 
              error: 'Teacher record not found or has no permissions',
              permission: permissionKey 
            });
          }
          
          userPermissions = teacher.permissions;
          permissionsSource = 'database';
          
          // Log fallback usage for debugging
          if (process.env.NODE_ENV !== 'production') {
            console.log(`⚠️ Permission check fallback to DB for teacher ${userId} (old token or missing permissions)`);
          }
        } else if (userRole === 'admin') {
          if (!Admin) {
            return res.status(500).json({ 
              error: 'Admin model not initialized',
              permission: permissionKey 
            });
          }
          
          const admin = await Admin.findOne({ 
            userId: mongoose.Types.ObjectId.isValid(userId) 
              ? new mongoose.Types.ObjectId(userId) 
              : userId 
          });
          
          if (!admin || !admin.permissions) {
            return res.status(403).json({ 
              error: 'Admin record not found or has no permissions',
              permission: permissionKey 
            });
          }
          
          userPermissions = admin.permissions;
          permissionsSource = 'database';
          
          // Log fallback usage for debugging
          if (process.env.NODE_ENV !== 'production') {
            console.log(`⚠️ Permission check fallback to DB for admin ${userId} (old token or missing permissions)`);
          }
        } else {
          return res.status(403).json({ 
            error: `Access denied. Invalid role: ${userRole}`,
            permission: permissionKey 
          });
        }
      }

      // Check if user has the required permission
      // Handle superadmin marker from token
      let hasPermission = false;
      
      if (userPermissions['*'] === true) {
        // Superadmin marker - grant all permissions
        hasPermission = true;
      } else {
        // Check specific permission
        hasPermission = userPermissions[permissionKey] === true;
        
        // For admins: if checking a teacher-specific assignment permission,
        // also check canManageAssignments as a fallback (admin can manage all assignments)
        if (!hasPermission && userRole === 'admin') {
          if (permissionKey === 'canCreateAssignments' || 
              permissionKey === 'canEditAssignments' || 
              permissionKey === 'canDeleteAssignments') {
            hasPermission = userPermissions['canManageAssignments'] === true;
          }
          // For homework grading, admins can use canManageHomework
          if (permissionKey === 'canGradeHomework') {
            hasPermission = userPermissions['canManageHomework'] === true;
          }
        }
      }

      if (!hasPermission) {
        return res.status(403).json({ 
          error: `Access denied. You don't have permission: ${permissionKey}`,
          permission: permissionKey 
        });
      }

      // Permission granted - proceed to next middleware/route handler
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ 
        error: 'Error checking permissions',
        permission: permissionKey 
      });
    }
  };
}

module.exports = {
  requirePermission,
  initializePermissionModels,
};

