/**
 * SINGLE SOURCE OF TRUTH FOR PERMISSIONS (Backend JavaScript Version)
 * 
 * This file mirrors src/shared/permissions.ts for backend use.
 * All permission keys MUST match the frontend definitions.
 * 
 * Phase 1: Single Source of Truth
 */

/**
 * ALL TEACHER PERMISSION KEYS
 * These keys must match src/shared/permissions.ts exactly
 */
const ALL_TEACHER_PERMISSION_KEYS = [
  'canViewAssessments',
  'canEditAssessments',
  'canViewEvaluations',
  'canEditEvaluations',
  'canViewFinancials',
  'canManageSchedule',
  'canContactParents',
  'canViewStudentEmail',
  'canViewStudentContact',
  'canViewStudentPersonalInfo',
  'canAccessMessages',
  'canSendMessages',
  'canViewAllMessages',
  'canAccessPdf',
  'canUploadPdf',
  'canAnnotatePdf',
  'canViewPdfAnnotations',
  'canAccessHomework',
  'canCreateHomework',
  'canGradeHomework',
  'canViewHomeworkSubmissions',
  'canAccessEvaluations',
  'canCreateEvaluations',
  'canReviewEvaluations',
  'canApproveEvaluations',
  'canAccessTickets',
  'canCreateTickets',
  'canReviewTickets',
  'canApproveTickets',
  'canFinalizeTickets',
  'canAccessAttendance',
  'canRecordAttendance',
  'canViewAttendanceReports',
  'canAccessRecordings',
  'canUploadRecordings',
  'canDeleteRecordings',
  'canViewAllRecordings',
  'canAccessMushaf',
  'canMarkMistakes',
  'canViewMistakeHistory',
  'canManageMistakeLibrary',
  'canAccessQaidah',
  'canManageQaidah',
  'canViewQaidahProgress',
  'canAccessAssignments',
  'canCreateAssignments',
  'canEditAssignments',
  'canDeleteAssignments',
  'canManageStudentAssignments',
  'canViewReports',
  'canViewAnalytics',
  'canExportReports',
];

/**
 * ALL ADMIN PERMISSION KEYS
 * These keys must match src/shared/permissions.ts exactly
 */
const ALL_ADMIN_PERMISSION_KEYS = [
  'canManageTeachers',
  'canManageStudents',
  'canManageFinancials',
  'canViewReports',
  'canManagePermissions',
  'canAccessMessages',
  'canViewAllMessages',
  'canModerateMessages',
  'canAccessPdf',
  'canManagePdfLibrary',
  'canViewAllPdfAnnotations',
  'canAccessHomework',
  'canManageHomework',
  'canViewAllHomework',
  'canAccessEvaluations',
  'canManageEvaluations',
  'canApproveEvaluations',
  'canAccessTickets',
  'canCreateTickets',
  'canReviewTickets',
  'canApproveTickets',
  'canFinalizeTickets',
  'canManageTicketWorkflow',
  'canAccessAttendance',
  'canManageAttendance',
  'canViewAttendanceReports',
  'canAccessRecordings',
  'canManageRecordings',
  'canViewAllRecordings',
  'canAccessMushaf',
  'canManageMushaf',
  'canViewAllMistakes',
  'canAccessQaidah',
  'canManageQaidah',
  'canViewQaidahReports',
  'canAccessAssignments',
  'canManageAssignments',
  'canBulkCreateAssignments',
  'canManageStudentAssignments',
  'canManageNotifications',
  'canViewNotifications',
  'canSendNotifications',
  'canViewAnalytics',
  'canExportReports',
  'canViewSystemStats',
];

/**
 * DEFAULT TEACHER PERMISSIONS (defaults to true)
 * These match the defaultTeacher: true values in src/shared/permissions.ts
 */
const DEFAULT_TRUE_TEACHER_PERMISSIONS = [
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
  'canViewQaidahProgress',
  'canAccessAssignments',
  'canCreateAssignments',
  'canViewReports',
  'canViewAnalytics',
];

/**
 * Validate permission key exists
 */
function isValidTeacherPermissionKey(key) {
  return ALL_TEACHER_PERMISSION_KEYS.includes(key);
}

function isValidAdminPermissionKey(key) {
  return ALL_ADMIN_PERMISSION_KEYS.includes(key);
}

function isValidPermissionKey(key) {
  return isValidTeacherPermissionKey(key) || isValidAdminPermissionKey(key);
}

/**
 * Check if permission defaults to true for teachers
 */
function isDefaultTrueTeacherPermission(key) {
  return DEFAULT_TRUE_TEACHER_PERMISSIONS.includes(key);
}

module.exports = {
  ALL_TEACHER_PERMISSION_KEYS,
  ALL_ADMIN_PERMISSION_KEYS,
  DEFAULT_TRUE_TEACHER_PERMISSIONS,
  isValidTeacherPermissionKey,
  isValidAdminPermissionKey,
  isValidPermissionKey,
  isDefaultTrueTeacherPermission,
};


