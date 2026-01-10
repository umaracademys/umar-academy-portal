/**
 * RequirePermission Component
 * 
 * Phase 4: Frontend Permission Visibility (Type-Safe)
 * 
 * Conditionally renders children based on user permissions.
 * Disables UI elements instead of hiding them (better UX).
 * 
 * Usage:
 *   <RequirePermission permission="canCreateAssignments">
 *     <button>Create Assignment</button>
 *   </RequirePermission>
 * 
 *   <RequirePermission 
 *     permission="canEditAssignments"
 *     fallback={<span>No permission</span>}
 *     showTooltip
 *   >
 *     <button>Edit</button>
 *   </RequirePermission>
 */

import React, { ReactNode } from 'react';
import { usePermission } from '../hooks/usePermission';
import { TeacherPermissionKey, AdminPermissionKey, PERMISSION_MAP } from '../shared/permissions';

interface RequirePermissionProps {
  /**
   * Permission key to check (type-safe)
   */
  permission: TeacherPermissionKey | AdminPermissionKey;
  
  /**
   * Children to render if permission is granted
   */
  children: ReactNode;
  
  /**
   * Fallback content to render if permission is denied
   * If not provided, children are disabled instead of hidden
   */
  fallback?: ReactNode;
  
  /**
   * Show tooltip explaining why action is disabled
   * Default: true
   */
  showTooltip?: boolean;
  
  /**
   * Tooltip message (auto-generated if not provided)
   */
  tooltipMessage?: string;
  
  /**
   * If true, hide children instead of disabling them
   * Use only for navigation items (sidebar)
   */
  hideIfDenied?: boolean;
  
  /**
   * Additional className for disabled state
   */
  disabledClassName?: string;
}

/**
 * Get human-readable permission label
 */
function getPermissionLabel(permissionKey: string): string {
  const permission = PERMISSION_MAP[permissionKey];
  return permission?.label || permissionKey;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({
  permission,
  children,
  fallback,
  showTooltip = true,
  tooltipMessage,
  hideIfDenied = false,
  disabledClassName = 'opacity-50 cursor-not-allowed',
}) => {
  const { can, isSuperadmin } = usePermission();
  const hasPermission = can(permission);
  
  // If permission denied and hideIfDenied is true, return null
  if (!hasPermission && hideIfDenied) {
    return fallback ? <>{fallback}</> : null;
  }
  
  // If permission denied and fallback provided, render fallback
  if (!hasPermission && fallback) {
    return <>{fallback}</>;
  }
  
  // If permission denied, disable children instead of hiding
  if (!hasPermission) {
    const permissionLabel = getPermissionLabel(permission);
    const defaultTooltip = `You don't have permission to ${permissionLabel.toLowerCase()}`;
    const tooltip = tooltipMessage || defaultTooltip;
    
    return (
      <div
        className={disabledClassName}
        title={showTooltip ? tooltip : undefined}
        style={{ pointerEvents: 'none' }}
      >
        {children}
      </div>
    );
  }
  
  // Permission granted - render children normally
  return <>{children}</>;
};

/**
 * Higher-order component version for class components
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: TeacherPermissionKey | AdminPermissionKey,
  fallback?: ReactNode
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <RequirePermission permission={permission} fallback={fallback}>
        <Component {...props} />
      </RequirePermission>
    );
  };
}

