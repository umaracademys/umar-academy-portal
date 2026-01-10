/**
 * SINGLE SOURCE OF TRUTH FOR PERMISSIONS
 * 
 * This file defines ALL permissions used across the application.
 * All permission keys MUST be defined here - no hardcoded strings elsewhere.
 * 
 * Phase 1: Single Source of Truth
 * - All permissions defined once
 * - Type-safe permission keys
 * - Metadata for each permission (label, module, risk, defaults)
 */

export type PermissionRisk = 'low' | 'medium' | 'high';
export type PermissionModule = 
  | 'assessments'
  | 'evaluations'
  | 'financial'
  | 'scheduling'
  | 'communication'
  | 'student-info'
  | 'messages'
  | 'pdf'
  | 'homework'
  | 'tickets'
  | 'attendance'
  | 'recordings'
  | 'mushaf'
  | 'qaidah'
  | 'assignments'
  | 'student-assignment'
  | 'notifications'
  | 'reports'
  | 'people'
  | 'security';

export interface PermissionDefinition {
  key: string;
  label: string;
  module: PermissionModule;
  risk: PermissionRisk;
  defaultTeacher: boolean;
  defaultAdmin: boolean;
  description?: string;
}

/**
 * ALL TEACHER PERMISSIONS
 * Complete list of permissions available to teachers
 */
export const ALL_TEACHER_PERMISSIONS: PermissionDefinition[] = [
  // Assessments & Evaluations
  {
    key: 'canViewAssessments',
    label: 'View Assessments',
    module: 'assessments',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'View student assessment records'
  },
  {
    key: 'canEditAssessments',
    label: 'Edit Assessments',
    module: 'assessments',
    risk: 'medium',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Create and modify student assessments'
  },
  {
    key: 'canViewEvaluations',
    label: 'View Evaluations',
    module: 'evaluations',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'View student evaluation records'
  },
  {
    key: 'canEditEvaluations',
    label: 'Edit Evaluations',
    module: 'evaluations',
    risk: 'medium',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Create and modify student evaluations'
  },
  
  // Financial & Billing
  {
    key: 'canViewFinancials',
    label: 'View Financials',
    module: 'financial',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'View financial information and billing data'
  },
  
  // Scheduling & Logistics
  {
    key: 'canManageSchedule',
    label: 'Manage Schedule',
    module: 'scheduling',
    risk: 'medium',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Manage own schedule and working hours'
  },
  
  // Communication
  {
    key: 'canContactParents',
    label: 'Contact Parents',
    module: 'communication',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Contact student parents'
  },
  
  // Student Information
  {
    key: 'canViewStudentEmail',
    label: 'View Student Email',
    module: 'student-info',
    risk: 'medium',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'View student email addresses'
  },
  {
    key: 'canViewStudentContact',
    label: 'View Student Contact',
    module: 'student-info',
    risk: 'medium',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'View student contact information'
  },
  {
    key: 'canViewStudentPersonalInfo',
    label: 'View Student Personal Info',
    module: 'student-info',
    risk: 'medium',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'View student personal information'
  },
  
  // Messages Module
  {
    key: 'canAccessMessages',
    label: 'Access Messages',
    module: 'messages',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Access messaging module'
  },
  {
    key: 'canSendMessages',
    label: 'Send Messages',
    module: 'messages',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Send messages to students and parents'
  },
  {
    key: 'canViewAllMessages',
    label: 'View All Messages',
    module: 'messages',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'View all messages across the system'
  },
  
  // PDF Module
  {
    key: 'canAccessPdf',
    label: 'Access PDF Module',
    module: 'pdf',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Access PDF library and viewer'
  },
  {
    key: 'canUploadPdf',
    label: 'Upload PDFs',
    module: 'pdf',
    risk: 'medium',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Upload PDF documents to library'
  },
  {
    key: 'canAnnotatePdf',
    label: 'Annotate PDFs',
    module: 'pdf',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Add annotations to PDF documents'
  },
  {
    key: 'canViewPdfAnnotations',
    label: 'View PDF Annotations',
    module: 'pdf',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'View annotations on PDF documents'
  },
  
  // Homework Module
  {
    key: 'canAccessHomework',
    label: 'Access Homework',
    module: 'homework',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Access homework module'
  },
  {
    key: 'canCreateHomework',
    label: 'Create Homework',
    module: 'homework',
    risk: 'medium',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Create homework assignments'
  },
  {
    key: 'canGradeHomework',
    label: 'Grade Homework',
    module: 'homework',
    risk: 'medium',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Grade student homework submissions'
  },
  {
    key: 'canViewHomeworkSubmissions',
    label: 'View Homework Submissions',
    module: 'homework',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'View student homework submissions'
  },
  
  // Evaluation Module
  {
    key: 'canAccessEvaluations',
    label: 'Access Evaluations',
    module: 'evaluations',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Access evaluation module'
  },
  {
    key: 'canCreateEvaluations',
    label: 'Create Evaluations',
    module: 'evaluations',
    risk: 'medium',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Create new evaluations'
  },
  {
    key: 'canReviewEvaluations',
    label: 'Review Evaluations',
    module: 'evaluations',
    risk: 'medium',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Review submitted evaluations'
  },
  {
    key: 'canApproveEvaluations',
    label: 'Approve Evaluations',
    module: 'evaluations',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Approve evaluations for finalization'
  },
  
  // Tickets Module
  {
    key: 'canAccessTickets',
    label: 'Access Tickets',
    module: 'tickets',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Access ticket system'
  },
  {
    key: 'canCreateTickets',
    label: 'Create Tickets',
    module: 'tickets',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Create new tickets'
  },
  {
    key: 'canReviewTickets',
    label: 'Review Tickets',
    module: 'tickets',
    risk: 'medium',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Review ticket submissions'
  },
  {
    key: 'canApproveTickets',
    label: 'Approve Tickets',
    module: 'tickets',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Approve tickets for assignment'
  },
  {
    key: 'canFinalizeTickets',
    label: 'Finalize Tickets',
    module: 'tickets',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Finalize completed tickets'
  },
  
  // Attendance Module
  {
    key: 'canAccessAttendance',
    label: 'Access Attendance',
    module: 'attendance',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Access attendance module'
  },
  {
    key: 'canRecordAttendance',
    label: 'Record Attendance',
    module: 'attendance',
    risk: 'medium',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Record student attendance'
  },
  {
    key: 'canViewAttendanceReports',
    label: 'View Attendance Reports',
    module: 'attendance',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'View attendance reports and statistics'
  },
  
  // Recordings Module
  {
    key: 'canAccessRecordings',
    label: 'Access Recordings',
    module: 'recordings',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Access recordings module'
  },
  {
    key: 'canUploadRecordings',
    label: 'Upload Recordings',
    module: 'recordings',
    risk: 'medium',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Upload audio/video recordings'
  },
  {
    key: 'canDeleteRecordings',
    label: 'Delete Recordings',
    module: 'recordings',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Delete recordings from system'
  },
  {
    key: 'canViewAllRecordings',
    label: 'View All Recordings',
    module: 'recordings',
    risk: 'medium',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'View all recordings across system'
  },
  
  // Mushaf Module
  {
    key: 'canAccessMushaf',
    label: 'Access Mushaf',
    module: 'mushaf',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Access Mushaf module'
  },
  {
    key: 'canMarkMistakes',
    label: 'Mark Mistakes',
    module: 'mushaf',
    risk: 'medium',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Mark mistakes in student recitation'
  },
  {
    key: 'canViewMistakeHistory',
    label: 'View Mistake History',
    module: 'mushaf',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'View mistake history and patterns'
  },
  {
    key: 'canManageMistakeLibrary',
    label: 'Manage Mistake Library',
    module: 'mushaf',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Manage global mistake library'
  },
  
  // Qaidah Module
  {
    key: 'canAccessQaidah',
    label: 'Access Qaidah',
    module: 'qaidah',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Access Qaidah module'
  },
  {
    key: 'canManageQaidah',
    label: 'Manage Qaidah',
    module: 'qaidah',
    risk: 'medium',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Manage Qaidah content and progress'
  },
  {
    key: 'canViewQaidahProgress',
    label: 'View Qaidah Progress',
    module: 'qaidah',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'View student Qaidah progress'
  },
  
  // Assignments Module
  {
    key: 'canAccessAssignments',
    label: 'Access Assignments',
    module: 'assignments',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Access assignments module'
  },
  {
    key: 'canCreateAssignments',
    label: 'Create Assignments',
    module: 'assignments',
    risk: 'medium',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'Create new assignments'
  },
  {
    key: 'canEditAssignments',
    label: 'Edit Assignments',
    module: 'assignments',
    risk: 'medium',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Edit existing assignments'
  },
  {
    key: 'canDeleteAssignments',
    label: 'Delete Assignments',
    module: 'assignments',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Delete assignments'
  },
  
  // Teacher-Student Assignment
  {
    key: 'canManageStudentAssignments',
    label: 'Manage Student Assignments',
    module: 'student-assignment',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Assign students to teachers'
  },
  
  // Reports & Analytics
  {
    key: 'canViewReports',
    label: 'View Reports',
    module: 'reports',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'View reports and analytics'
  },
  {
    key: 'canViewAnalytics',
    label: 'View Analytics',
    module: 'reports',
    risk: 'low',
    defaultTeacher: true,
    defaultAdmin: false,
    description: 'View analytics and statistics'
  },
  {
    key: 'canExportReports',
    label: 'Export Reports',
    module: 'reports',
    risk: 'medium',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Export reports to files'
  },
];

/**
 * ALL ADMIN PERMISSIONS
 * Complete list of permissions available to admins
 */
export const ALL_ADMIN_PERMISSIONS: PermissionDefinition[] = [
  // People Operations
  {
    key: 'canManageTeachers',
    label: 'Manage Teachers',
    module: 'people',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Create, edit, and delete teacher accounts'
  },
  {
    key: 'canManageStudents',
    label: 'Manage Students',
    module: 'people',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Create, edit, and delete student accounts'
  },
  
  // Finance & Billing
  {
    key: 'canManageFinancials',
    label: 'Manage Financials',
    module: 'financial',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Manage financial records and billing'
  },
  
  // Insights
  {
    key: 'canViewReports',
    label: 'View Reports',
    module: 'reports',
    risk: 'low',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'View system reports'
  },
  
  // Security & Governance
  {
    key: 'canManagePermissions',
    label: 'Manage Permissions',
    module: 'security',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Manage user permissions and access control'
  },
  
  // Messages Module
  {
    key: 'canAccessMessages',
    label: 'Access Messages',
    module: 'messages',
    risk: 'low',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Access messaging module'
  },
  {
    key: 'canViewAllMessages',
    label: 'View All Messages',
    module: 'messages',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'View all messages across the system'
  },
  {
    key: 'canModerateMessages',
    label: 'Moderate Messages',
    module: 'messages',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Moderate and manage messages'
  },
  
  // PDF Module
  {
    key: 'canAccessPdf',
    label: 'Access PDF Module',
    module: 'pdf',
    risk: 'low',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Access PDF library and viewer'
  },
  {
    key: 'canManagePdfLibrary',
    label: 'Manage PDF Library',
    module: 'pdf',
    risk: 'medium',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Manage PDF library and documents'
  },
  {
    key: 'canViewAllPdfAnnotations',
    label: 'View All PDF Annotations',
    module: 'pdf',
    risk: 'medium',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'View all PDF annotations across system'
  },
  
  // Homework Module
  {
    key: 'canAccessHomework',
    label: 'Access Homework',
    module: 'homework',
    risk: 'low',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Access homework module'
  },
  {
    key: 'canManageHomework',
    label: 'Manage Homework',
    module: 'homework',
    risk: 'medium',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Manage homework assignments'
  },
  {
    key: 'canViewAllHomework',
    label: 'View All Homework',
    module: 'homework',
    risk: 'low',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'View all homework across system'
  },
  
  // Evaluation Module
  {
    key: 'canAccessEvaluations',
    label: 'Access Evaluations',
    module: 'evaluations',
    risk: 'low',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Access evaluation module'
  },
  {
    key: 'canManageEvaluations',
    label: 'Manage Evaluations',
    module: 'evaluations',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Manage evaluations system-wide'
  },
  {
    key: 'canApproveEvaluations',
    label: 'Approve Evaluations',
    module: 'evaluations',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Approve evaluations for finalization'
  },
  
  // Tickets Module
  {
    key: 'canAccessTickets',
    label: 'Access Tickets',
    module: 'tickets',
    risk: 'low',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Access ticket system'
  },
  {
    key: 'canCreateTickets',
    label: 'Create Tickets',
    module: 'tickets',
    risk: 'low',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Create new tickets'
  },
  {
    key: 'canReviewTickets',
    label: 'Review Tickets',
    module: 'tickets',
    risk: 'medium',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Review ticket submissions'
  },
  {
    key: 'canApproveTickets',
    label: 'Approve Tickets',
    module: 'tickets',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Approve tickets for assignment'
  },
  {
    key: 'canFinalizeTickets',
    label: 'Finalize Tickets',
    module: 'tickets',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Finalize completed tickets'
  },
  {
    key: 'canManageTicketWorkflow',
    label: 'Manage Ticket Workflow',
    module: 'tickets',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Manage ticket workflow and processes'
  },
  
  // Attendance Module
  {
    key: 'canAccessAttendance',
    label: 'Access Attendance',
    module: 'attendance',
    risk: 'low',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Access attendance module'
  },
  {
    key: 'canManageAttendance',
    label: 'Manage Attendance',
    module: 'attendance',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Manage attendance records system-wide'
  },
  {
    key: 'canViewAttendanceReports',
    label: 'View Attendance Reports',
    module: 'attendance',
    risk: 'low',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'View attendance reports and statistics'
  },
  
  // Recordings Module
  {
    key: 'canAccessRecordings',
    label: 'Access Recordings',
    module: 'recordings',
    risk: 'low',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Access recordings module'
  },
  {
    key: 'canManageRecordings',
    label: 'Manage Recordings',
    module: 'recordings',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Manage recordings system-wide'
  },
  {
    key: 'canViewAllRecordings',
    label: 'View All Recordings',
    module: 'recordings',
    risk: 'medium',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'View all recordings across system'
  },
  
  // Mushaf Module
  {
    key: 'canAccessMushaf',
    label: 'Access Mushaf',
    module: 'mushaf',
    risk: 'low',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Access Mushaf module'
  },
  {
    key: 'canManageMushaf',
    label: 'Manage Mushaf',
    module: 'mushaf',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Manage Mushaf system and settings'
  },
  {
    key: 'canViewAllMistakes',
    label: 'View All Mistakes',
    module: 'mushaf',
    risk: 'medium',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'View all mistakes across system'
  },
  
  // Qaidah Module
  {
    key: 'canAccessQaidah',
    label: 'Access Qaidah',
    module: 'qaidah',
    risk: 'low',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Access Qaidah module'
  },
  {
    key: 'canManageQaidah',
    label: 'Manage Qaidah',
    module: 'qaidah',
    risk: 'medium',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Manage Qaidah content and progress'
  },
  {
    key: 'canViewQaidahReports',
    label: 'View Qaidah Reports',
    module: 'qaidah',
    risk: 'low',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'View Qaidah reports and statistics'
  },
  
  // Assignments Module
  {
    key: 'canAccessAssignments',
    label: 'Access Assignments',
    module: 'assignments',
    risk: 'low',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Access assignments module'
  },
  {
    key: 'canManageAssignments',
    label: 'Manage Assignments',
    module: 'assignments',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Manage assignments system-wide'
  },
  {
    key: 'canBulkCreateAssignments',
    label: 'Bulk Create Assignments',
    module: 'assignments',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Create multiple assignments at once'
  },
  
  // Teacher-Student Assignment
  {
    key: 'canManageStudentAssignments',
    label: 'Manage Student Assignments',
    module: 'student-assignment',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Assign students to teachers'
  },
  
  // Notifications Module
  {
    key: 'canManageNotifications',
    label: 'Manage Notifications',
    module: 'notifications',
    risk: 'high',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Manage notification system'
  },
  {
    key: 'canViewNotifications',
    label: 'View Notifications',
    module: 'notifications',
    risk: 'low',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'View notifications'
  },
  {
    key: 'canSendNotifications',
    label: 'Send Notifications',
    module: 'notifications',
    risk: 'medium',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Send notifications to users'
  },
  
  // Reports & Analytics
  {
    key: 'canViewAnalytics',
    label: 'View Analytics',
    module: 'reports',
    risk: 'low',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'View analytics and statistics'
  },
  {
    key: 'canExportReports',
    label: 'Export Reports',
    module: 'reports',
    risk: 'medium',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'Export reports to files'
  },
  {
    key: 'canViewSystemStats',
    label: 'View System Stats',
    module: 'reports',
    risk: 'low',
    defaultTeacher: false,
    defaultAdmin: false,
    description: 'View system statistics and metrics'
  },
];

/**
 * PERMISSION MAP
 * Maps permission keys to their definitions for quick lookup
 */
export const PERMISSION_MAP: Record<string, PermissionDefinition> = {};

// Build permission map from all permissions
[...ALL_TEACHER_PERMISSIONS, ...ALL_ADMIN_PERMISSIONS].forEach(perm => {
  PERMISSION_MAP[perm.key] = perm;
});

/**
 * TYPE-SAFE PERMISSION KEYS
 * These types ensure only valid permission keys can be used
 */
export type TeacherPermissionKey = typeof ALL_TEACHER_PERMISSIONS[number]['key'];
export type AdminPermissionKey = typeof ALL_ADMIN_PERMISSIONS[number]['key'];
export type PermissionKey = TeacherPermissionKey | AdminPermissionKey;

/**
 * Get permission definition by key
 */
export function getPermission(key: string): PermissionDefinition | undefined {
  return PERMISSION_MAP[key];
}

/**
 * Get all permissions for a module
 */
export function getPermissionsByModule(module: PermissionModule): PermissionDefinition[] {
  return [...ALL_TEACHER_PERMISSIONS, ...ALL_ADMIN_PERMISSIONS].filter(
    perm => perm.module === module
  );
}

/**
 * Get all permissions by risk level
 */
export function getPermissionsByRisk(risk: PermissionRisk): PermissionDefinition[] {
  return [...ALL_TEACHER_PERMISSIONS, ...ALL_ADMIN_PERMISSIONS].filter(
    perm => perm.risk === risk
  );
}

/**
 * Get default permissions for a role
 */
export function getDefaultPermissions(role: 'teacher' | 'admin'): Record<string, boolean> {
  const permissions: Record<string, boolean> = {};
  const source = role === 'teacher' ? ALL_TEACHER_PERMISSIONS : ALL_ADMIN_PERMISSIONS;
  
  source.forEach(perm => {
    permissions[perm.key] = role === 'teacher' ? perm.defaultTeacher : perm.defaultAdmin;
  });
  
  return permissions;
}

/**
 * Validate permission key exists
 */
export function isValidPermissionKey(key: string): key is PermissionKey {
  return key in PERMISSION_MAP;
}


