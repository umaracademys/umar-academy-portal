/**
 * Permission Checking Middleware
 * Ensures users can only access modules they have permissions for
 */

const mongoose = require('mongoose');

// Get Teacher model (assuming it's available globally or passed)
let Teacher, Admin;

// Initialize models (called from server.js)
function initializeModels(TeacherModel, AdminModel) {
  Teacher = TeacherModel;
  Admin = AdminModel;
}

/**
 * Check if a teacher has a specific permission
 */
async function checkTeacherPermission(userId, permissionKey) {
  try {
    const teacher = await Teacher.findOne({ userId: mongoose.Types.ObjectId.isValid(userId) ? userId : new mongoose.Types.ObjectId(userId) });
    if (!teacher || !teacher.permissions) {
      return false;
    }
    // Default to true for basic permissions if not explicitly set
    const defaultTruePermissions = [
      'canViewAssessments',
      'canEditAssessments',
      'canViewEvaluations',
      'canEditEvaluations',
      'canManageSchedule',
      'canContactParents',
      'canViewStudentEmail',
      'canViewStudentContact',
      'canViewStudentPersonalInfo',
      'canAccessMessages',
      'canSendMessages',
      'canAccessPdf',
      'canAnnotatePdf',
      'canViewPdfAnnotations',
      'canAccessHomework',
      'canCreateHomework',
      'canGradeHomework',
      'canViewHomeworkSubmissions',
      'canAccessEvaluations',
      'canCreateEvaluations',
      'canAccessTickets',
      'canCreateTickets',
      'canReviewTickets',
      'canAccessAttendance',
      'canRecordAttendance',
      'canViewAttendanceReports',
      'canAccessRecordings',
      'canUploadRecordings',
      'canAccessMushaf',
      'canMarkMistakes',
      'canViewMistakeHistory',
      'canAccessQaidah',
      'canAccessAssignments',
      'canCreateAssignments',
      'canEditAssignments',
      'canViewReports'
    ];
    
    if (defaultTruePermissions.includes(permissionKey)) {
      return teacher.permissions[permissionKey] !== false; // Default to true unless explicitly false
    }
    
    return teacher.permissions[permissionKey] === true;
  } catch (error) {
    console.error('Error checking teacher permission:', error);
    return false;
  }
}

/**
 * Check if an admin has a specific permission
 */
async function checkAdminPermission(userId, permissionKey) {
  try {
    if (!Admin) {
      console.error('Admin model not initialized');
      return false;
    }
    // Try to find admin by userId (ObjectId) or by email
    let admin = await Admin.findOne({ userId: mongoose.Types.ObjectId.isValid(userId) ? userId : new mongoose.Types.ObjectId(userId) });
    if (!admin) {
      // Try finding by email if userId doesn't work
      const User = require('mongoose').model('User');
      const user = await User.findById(userId);
      if (user && user.email) {
        admin = await Admin.findOne({ email: user.email });
      }
    }
    if (!admin || !admin.permissions) {
      return false;
    }
    return admin.permissions[permissionKey] === true;
  } catch (error) {
    console.error('Error checking admin permission:', error);
    return false;
  }
}

/**
 * Middleware to check teacher permission
 */
function requireTeacherPermission(permissionKey) {
  return async (req, res, next) => {
    try {
      if (req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Access denied. Teacher role required.' });
      }

      // Use userId or id from req.user
      const userId = req.user.userId || req.user.id || req.user._id;
      if (!userId) {
        return res.status(403).json({ error: 'User ID not found in request' });
      }

      const hasPermission = await checkTeacherPermission(userId, permissionKey);
      if (!hasPermission) {
        return res.status(403).json({ 
          error: `Access denied. You don't have permission to ${permissionKey}.` 
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Error checking permissions' });
    }
  };
}

/**
 * Middleware to check admin permission
 */
function requireAdminPermission(permissionKey) {
  return async (req, res, next) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Access denied. Admin role required.' });
      }

      // Super admin has all permissions
      if (req.user.role === 'superadmin') {
        return next();
      }

      // Use userId or id from req.user
      const userId = req.user.userId || req.user.id || req.user._id;
      if (!userId) {
        return res.status(403).json({ error: 'User ID not found in request' });
      }

      const hasPermission = await checkAdminPermission(userId, permissionKey);
      if (!hasPermission) {
        return res.status(403).json({ 
          error: `Access denied. You don't have permission to ${permissionKey}.` 
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Error checking permissions' });
    }
  };
}

/**
 * Get user permissions (for frontend)
 */
async function getUserPermissions(userId, role) {
  try {
    if (role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: mongoose.Types.ObjectId.isValid(userId) ? userId : new mongoose.Types.ObjectId(userId) });
      return teacher?.permissions || {};
    } else if (role === 'admin' || role === 'superadmin') {
      const admin = await Admin.findOne({ userId: mongoose.Types.ObjectId.isValid(userId) ? userId : new mongoose.Types.ObjectId(userId) });
      return admin?.permissions || {};
    }
    return {};
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return {};
  }
}

module.exports = {
  initializeModels,
  checkTeacherPermission,
  checkAdminPermission,
  requireTeacherPermission,
  requireAdminPermission,
  getUserPermissions
};

