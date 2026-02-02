/**
 * PermissionProtectedRoute
 *
 * Protects routes by requiring authentication and optionally one or more permissions.
 * Redirects to /unauthorized if the user lacks the required permission(s).
 * Superadmin bypasses permission checks.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermission } from '../hooks/usePermission';
import type { TeacherPermissionKey, AdminPermissionKey } from '../shared/permissions';
import { getPermissionsForPath } from '../utils/routePermissions';

type PermissionKey = TeacherPermissionKey | AdminPermissionKey;

interface PermissionProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Required permission(s). User needs ANY of these to access.
   * If not provided, permission is derived from current path via ROUTE_PERMISSIONS.
   */
  permission?: PermissionKey | PermissionKey[];
}

const PermissionProtectedRoute: React.FC<PermissionProtectedRouteProps> = ({
  children,
  permission: permissionProp,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { can, hasAny, isSuperadmin } = usePermission();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-primary font-semibold">Loading...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Student routes: no permission key check (students don't have teacher/admin permissions)
  if (user?.role === 'student') {
    if (location.pathname.startsWith('/student')) {
      return <>{children}</>;
    }
    // Student hitting non-student protected route
    return <Navigate to="/student/dashboard" replace />;
  }

  // Resolve required permissions: prop > path-based
  let required: PermissionKey[] | undefined;
  if (permissionProp !== undefined) {
    required = Array.isArray(permissionProp) ? permissionProp : [permissionProp];
  } else {
    required = getPermissionsForPath(location.pathname);
  }

  // No permission required for this path (auth-only)
  if (!required || required.length === 0) {
    return <>{children}</>;
  }

  if (isSuperadmin) {
    return <>{children}</>;
  }

  const allowed = hasAny(required);
  if (!allowed) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default PermissionProtectedRoute;
