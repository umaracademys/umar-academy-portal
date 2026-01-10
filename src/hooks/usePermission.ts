/**
 * usePermission Hook
 * 
 * Phase 4: Frontend Permission Visibility (Type-Safe)
 * 
 * Provides type-safe permission checking for React components.
 * Reads permissions from auth context (JWT token) and falls back to
 * BackendDataContext (Teacher/Admin records) for backward compatibility.
 * 
 * Usage:
 *   const { can, hasAll, hasAny } = usePermission();
 *   if (can('canCreateAssignments')) { ... }
 */

import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBackendData } from '../contexts/BackendDataContext';
import { TeacherPermissionKey, AdminPermissionKey, ALL_TEACHER_PERMISSIONS, ALL_ADMIN_PERMISSIONS } from '../shared/permissions';
import { hasTeacherPermission, hasAdminPermission } from '../utils/permissions';
import { TeacherPermissions, AdminPermissions } from '../types';

interface UsePermissionReturn {
  /**
   * Check if user has a specific permission
   * Type-safe: automatically uses TeacherPermissionKey or AdminPermissionKey based on role
   */
  can: (permissionKey: TeacherPermissionKey | AdminPermissionKey) => boolean;
  
  /**
   * Check if user has ALL of the specified permissions
   */
  hasAll: (permissionKeys: (TeacherPermissionKey | AdminPermissionKey)[]) => boolean;
  
  /**
   * Check if user has ANY of the specified permissions
   */
  hasAny: (permissionKeys: (TeacherPermissionKey | AdminPermissionKey)[]) => boolean;
  
  /**
   * Get all permissions object (for advanced use cases)
   */
  permissions: TeacherPermissions | AdminPermissions | null;
  
  /**
   * Check if user is superadmin (has all permissions)
   */
  isSuperadmin: boolean;
}

/**
 * Extract permissions from JWT token (decoded)
 * Backend Phase 3 embeds permissions in JWT token
 */
function extractPermissionsFromToken(): TeacherPermissions | AdminPermissions | null {
  try {
    const token = localStorage.getItem('umar_academy_token');
    if (!token) return null;
    
    // Decode JWT token (without verification - backend already verified it)
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const decoded = JSON.parse(jsonPayload);
    
    // Check for superadmin marker
    if (decoded.permissions && decoded.permissions['*'] === true) {
      // Superadmin - return all permissions as true
      // We'll handle this in the hook logic
      return decoded.permissions;
    }
    
    return decoded.permissions || null;
  } catch (error) {
    console.warn('Failed to extract permissions from token:', error);
    return null;
  }
}

/**
 * Get permissions from BackendDataContext (Teacher/Admin records)
 * Fallback for backward compatibility
 */
function getPermissionsFromContext(
  user: { email: string; role: string } | null,
  teachers: any[],
  admins: any[]
): TeacherPermissions | AdminPermissions | null {
  if (!user) return null;
  
  if (user.role === 'teacher') {
    const teacher = teachers.find(t => t.email === user.email);
    return teacher?.permissions || null;
  } else if (user.role === 'admin') {
    const admin = admins.find(a => a.email === user.email);
    return admin?.permissions || null;
  }
  
  return null;
}

export function usePermission(): UsePermissionReturn {
  const { user } = useAuth();
  const { teachers, admins } = useBackendData();
  
  // Priority 1: Get permissions from JWT token (fast path)
  // Priority 2: Fallback to BackendDataContext (for backward compatibility)
  const permissions = useMemo(() => {
    // Try JWT token first
    const tokenPermissions = extractPermissionsFromToken();
    if (tokenPermissions) {
      return tokenPermissions;
    }
    
    // Fallback to context
    return getPermissionsFromContext(user, teachers, admins);
  }, [user, teachers, admins]);
  
  // Check if superadmin (from token or role)
  const isSuperadmin = useMemo(() => {
    if (user?.role === 'superadmin') return true;
    if (permissions && (permissions as any)['*'] === true) return true;
    return false;
  }, [user, permissions]);
  
  /**
   * Check if user has a specific permission
   */
  const can = (permissionKey: TeacherPermissionKey | AdminPermissionKey): boolean => {
    // Superadmin bypass
    if (isSuperadmin) return true;
    
    if (!permissions) return false;
    
    // Check based on role
    if (user?.role === 'teacher') {
      return hasTeacherPermission(permissions as TeacherPermissions, permissionKey as TeacherPermissionKey);
    } else if (user?.role === 'admin') {
      // Type assertion: permissionKey could be teacher or admin key, but we know it's admin here
      const adminPerms = permissions as AdminPermissions;
      // Check if it's a valid admin permission key
      const isValidAdminKey = ALL_ADMIN_PERMISSIONS.some(perm => perm.key === permissionKey);
      if (!isValidAdminKey) {
        return false;
      }
      return hasAdminPermission(adminPerms, permissionKey as keyof AdminPermissions);
    }
    
    return false;
  };
  
  /**
   * Check if user has ALL of the specified permissions
   */
  const hasAll = (permissionKeys: (TeacherPermissionKey | AdminPermissionKey)[]): boolean => {
    if (isSuperadmin) return true;
    return permissionKeys.every(key => can(key));
  };
  
  /**
   * Check if user has ANY of the specified permissions
   */
  const hasAny = (permissionKeys: (TeacherPermissionKey | AdminPermissionKey)[]): boolean => {
    if (isSuperadmin) return true;
    return permissionKeys.some(key => can(key));
  };
  
  return {
    can,
    hasAll,
    hasAny,
    permissions: permissions as TeacherPermissions | AdminPermissions | null,
    isSuperadmin,
  };
}

