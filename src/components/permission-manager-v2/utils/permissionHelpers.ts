import { TeacherPermissions, AdminPermissions } from '../../../types';
import { 
  ALL_TEACHER_PERMISSIONS, 
  ALL_ADMIN_PERMISSIONS,
  TeacherPermissionKey,
  AdminPermissionKey 
} from '../../../shared/permissions';

/**
 * Group permissions by module/group
 */
export function groupPermissionsByModule(
  permissions: TeacherPermissions | AdminPermissions,
  isAdmin: boolean = false
) {
  const definitions = isAdmin ? ALL_ADMIN_PERMISSIONS : ALL_TEACHER_PERMISSIONS;
  
  const groups = definitions.reduce((acc, def) => {
    const module = def.module || 'other';
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push({
      key: def.key,
      label: def.label,
      description: def.description || '',
      risk: def.risk,
      value: permissions[def.key as keyof typeof permissions] || false,
    });
    return acc;
  }, {} as Record<string, Array<{
    key: string;
    label: string;
    description: string;
    risk?: 'low' | 'medium' | 'high';
    value: boolean;
  }>>);

  return groups;
}

/**
 * Count active permissions
 */
export function countActivePermissions(
  permissions: TeacherPermissions | AdminPermissions
): number {
  return Object.values(permissions).filter(Boolean).length;
}

/**
 * Count high-risk permissions
 */
export function countHighRiskPermissions(
  permissions: TeacherPermissions | AdminPermissions,
  isAdmin: boolean = false
): number {
  const definitions = isAdmin ? ALL_ADMIN_PERMISSIONS : ALL_TEACHER_PERMISSIONS;
  return definitions.filter(
    def => def.risk === 'high' && permissions[def.key as keyof typeof permissions]
  ).length;
}

/**
 * Get permission summary
 */
export function getPermissionSummary(
  permissions: TeacherPermissions | AdminPermissions,
  isAdmin: boolean = false
) {
  const total = isAdmin ? ALL_ADMIN_PERMISSIONS.length : ALL_TEACHER_PERMISSIONS.length;
  const active = countActivePermissions(permissions);
  const highRisk = countHighRiskPermissions(permissions, isAdmin);
  
  return {
    total,
    active,
    highRisk,
    percentage: Math.round((active / total) * 100),
  };
}
