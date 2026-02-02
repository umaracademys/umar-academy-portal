/**
 * Route-to-permission mapping for permission-based navigation and route protection.
 * Single source of truth: used by Sidebar (hide links) and PermissionProtectedRoute (redirect).
 */

import type { TeacherPermissionKey, AdminPermissionKey } from '../shared/permissions';

export type PermissionKey = TeacherPermissionKey | AdminPermissionKey;

/**
 * Route path -> one or more permission keys (user needs ANY of these to access).
 * Empty array = role-only (e.g. student); no permission check.
 * undefined = use default ProtectedRoute (auth only).
 */
export const ROUTE_PERMISSIONS: Record<string, PermissionKey[] | undefined> = {
  '/assignments': ['canAccessAssignments', 'canManageAssignments'],
  '/students': ['canManageStudents', 'canViewStudentEmail', 'canViewStudentPersonalInfo'],
  '/teachers': ['canManageTeachers'],
  '/teacher-student-assignment': ['canManageStudentAssignments'],
  '/permissions': ['canManagePermissions'],
  '/messages': ['canAccessMessages'],
  '/teacher-attendance': ['canManageAttendance'],
  '/my-attendance': ['canAccessAttendance'],
  '/pdf-teaching': ['canAccessPdf'],
  '/tickets': ['canAccessMushaf', 'canReviewTickets'],
  '/mushaf/review': ['canAccessMushaf', 'canReviewTickets'],
};

/**
 * Get required permission(s) for a path (user needs ANY of these).
 * Returns undefined if path is not permission-gated (auth only).
 */
export function getPermissionsForPath(pathname: string): PermissionKey[] | undefined {
  const normalized = pathname.replace(/\/$/, '') || '/';
  for (const [path, perms] of Object.entries(ROUTE_PERMISSIONS)) {
    if (normalized === path || normalized.startsWith(path + '/')) {
      return perms;
    }
  }
  return undefined;
}
