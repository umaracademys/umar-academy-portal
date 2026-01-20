import { TeacherPermissions, AdminPermissions } from '../../../types';
import { 
  ALL_TEACHER_PERMISSIONS, 
  ALL_ADMIN_PERMISSIONS,
  TeacherPermissionKey,
  AdminPermissionKey 
} from '../../../shared/permissions';

const TEACHER_PERMISSION_KEYS = ALL_TEACHER_PERMISSIONS.map(p => p.key as TeacherPermissionKey);
const ADMIN_PERMISSION_KEYS = ALL_ADMIN_PERMISSIONS.map(p => p.key as AdminPermissionKey);

export function buildTeacherPermissions(
  permissions?: Partial<TeacherPermissions>,
): TeacherPermissions {
  return TEACHER_PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = Boolean(permissions?.[key]);
    return acc;
  }, {} as TeacherPermissions);
}

export function buildAdminPermissions(
  permissions?: Partial<AdminPermissions>,
): AdminPermissions {
  return ADMIN_PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = Boolean(permissions?.[key]);
    return acc;
  }, {} as AdminPermissions);
}
