/**
 * Permission Utility Functions
 * Helper functions to check permissions in frontend components
 */

import { TeacherPermissions, AdminPermissions } from '../types';

/**
 * Check if a teacher has a specific permission
 */
export function hasTeacherPermission(
  permissions: TeacherPermissions | undefined | null,
  permissionKey: keyof TeacherPermissions
): boolean {
  if (!permissions) {
    // Default permissions for backward compatibility
    const defaultTruePermissions: (keyof TeacherPermissions)[] = [
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
      return true; // Default to true for basic permissions
    }
    return false;
  }
  
  return permissions[permissionKey] === true;
}

/**
 * Check if an admin has a specific permission
 */
export function hasAdminPermission(
  permissions: AdminPermissions | undefined | null,
  permissionKey: keyof AdminPermissions
): boolean {
  if (!permissions) {
    return false; // Admins need explicit permissions
  }
  
  return permissions[permissionKey] === true;
}

/**
 * Check if user can access a module (teacher)
 */
export function canAccessModule(
  permissions: TeacherPermissions | undefined | null,
  module: 'messages' | 'pdf' | 'homework' | 'evaluations' | 'tickets' | 'attendance' | 'recordings' | 'mushaf' | 'qaidah' | 'assignments'
): boolean {
  if (!permissions) {
    // Default access for backward compatibility
    return true;
  }
  
  switch (module) {
    case 'messages':
      return hasTeacherPermission(permissions, 'canAccessMessages');
    case 'pdf':
      return hasTeacherPermission(permissions, 'canAccessPdf');
    case 'homework':
      return hasTeacherPermission(permissions, 'canAccessHomework');
    case 'evaluations':
      return hasTeacherPermission(permissions, 'canAccessEvaluations');
    case 'tickets':
      return hasTeacherPermission(permissions, 'canAccessTickets');
    case 'attendance':
      return hasTeacherPermission(permissions, 'canAccessAttendance');
    case 'recordings':
      return hasTeacherPermission(permissions, 'canAccessRecordings');
    case 'mushaf':
      return hasTeacherPermission(permissions, 'canAccessMushaf');
    case 'qaidah':
      return hasTeacherPermission(permissions, 'canAccessQaidah');
    case 'assignments':
      return hasTeacherPermission(permissions, 'canAccessAssignments');
    default:
      return false;
  }
}

/**
 * Check if admin can access a module
 */
export function canAdminAccessModule(
  permissions: AdminPermissions | undefined | null,
  module: 'messages' | 'pdf' | 'homework' | 'evaluations' | 'tickets' | 'attendance' | 'recordings' | 'mushaf' | 'qaidah' | 'assignments'
): boolean {
  if (!permissions) {
    return false; // Admins need explicit permissions
  }
  
  switch (module) {
    case 'messages':
      return hasAdminPermission(permissions, 'canAccessMessages');
    case 'pdf':
      return hasAdminPermission(permissions, 'canAccessPdf');
    case 'homework':
      return hasAdminPermission(permissions, 'canAccessHomework');
    case 'evaluations':
      return hasAdminPermission(permissions, 'canAccessEvaluations');
    case 'tickets':
      return hasAdminPermission(permissions, 'canAccessTickets');
    case 'attendance':
      return hasAdminPermission(permissions, 'canAccessAttendance');
    case 'recordings':
      return hasAdminPermission(permissions, 'canAccessRecordings');
    case 'mushaf':
      return hasAdminPermission(permissions, 'canAccessMushaf');
    case 'qaidah':
      return hasAdminPermission(permissions, 'canAccessQaidah');
    case 'assignments':
      return hasAdminPermission(permissions, 'canAccessAssignments');
    default:
      return false;
  }
}

