import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import PermissionModulePanel from '../components/PermissionModulePanel';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { useAuth } from '../contexts/AuthContext';
import { useBackendData } from '../contexts/BackendDataContext';
import { usePermissions } from '../hooks/usePermissions';
import type { RoleId } from '../hooks/usePermissions';

export interface UserRoleRow {
  id: string;
  name: string;
  email: string;
  teacher: boolean;
  admin: boolean;
  student: boolean;
}

function buildUserRolesList(
  teachers: { id: string; fullName: string; email?: string }[] | undefined,
  admins: { id: string; fullName: string; email?: string; contact?: string }[] | undefined,
  students: { id: string; fullName: string; email?: string }[] | undefined
): UserRoleRow[] {
  const rows: UserRoleRow[] = [];
  (teachers || []).forEach((t) => {
    rows.push({
      id: `teacher-${t.id}`,
      name: t.fullName || '',
      email: t.email || '',
      teacher: true,
      admin: false,
      student: false,
    });
  });
  (admins || []).forEach((a) => {
    rows.push({
      id: `admin-${a.id}`,
      name: a.fullName || '',
      email: a.email || (a as { contact?: string }).contact || '',
      teacher: false,
      admin: true,
      student: false,
    });
  });
  (students || []).forEach((s) => {
    rows.push({
      id: `student-${s.id}`,
      name: s.fullName || '',
      email: s.email || '',
      teacher: false,
      admin: false,
      student: true,
    });
  });
  return rows;
}

function getRoleLabel(row: UserRoleRow, overrides?: Record<string, { teacher: boolean; admin: boolean; student: boolean }>): string {
  const over = overrides?.[row.id];
  const t = over?.teacher ?? row.teacher;
  const a = over?.admin ?? row.admin;
  const s = over?.student ?? row.student;
  const parts: string[] = [];
  if (t) parts.push('Teacher');
  if (a) parts.push('Admin');
  if (s) parts.push('Student');
  return parts.length ? parts.join(', ') : '—';
}

function countEnabled(perms: Record<string, boolean>): number {
  return Object.values(perms).filter(Boolean).length;
}

const RolesPermissionsPage: React.FC = () => {
  const { user } = useAuth();
  const { teachers, admins, students } = useBackendData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'teacher' | 'admin' | 'student'>('all');
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const {
    values,
    loading,
    error,
    unsavedChanges,
    modules,
    setPermission,
    setAllForAction,
    apply,
    reset,
    refresh,
    changedKeys,
  } = usePermissions();

  const userRolesList = useMemo(
    () => buildUserRolesList(teachers, admins, students),
    [teachers, admins, students]
  );

  const [roleOverrides, setRoleOverrides] = useState<Record<string, { teacher: boolean; admin: boolean; student: boolean }>>({});
  const initialRolesRef = useMemo(() => {
    const m: Record<string, { teacher: boolean; admin: boolean; student: boolean }> = {};
    userRolesList.forEach((u) => {
      m[u.id] = { teacher: u.teacher, admin: u.admin, student: u.student };
    });
    return m;
  }, [userRolesList]);

  const filteredUserList = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const roleFilter = userRoleFilter;
    return userRolesList.filter((row) => {
      const roles = roleOverrides[row.id] ?? { teacher: row.teacher, admin: row.admin, student: row.student };
      const matchSearch = !q || row.name.toLowerCase().includes(q) || (row.email || '').toLowerCase().includes(q) || getRoleLabel(row, roleOverrides).toLowerCase().includes(q);
      const matchRole = roleFilter === 'all' || (roleFilter === 'teacher' && roles.teacher) || (roleFilter === 'admin' && roles.admin) || (roleFilter === 'student' && roles.student);
      return matchSearch && matchRole;
    });
  }, [userRolesList, userSearch, userRoleFilter, roleOverrides]);

  const getRoleForUser = useCallback(
    (row: UserRoleRow) => {
      const over = roleOverrides[row.id];
      if (over) return over;
      return { teacher: row.teacher, admin: row.admin, student: row.student };
    },
    [roleOverrides]
  );

  const setUserRole = useCallback((userId: string, role: 'teacher' | 'admin' | 'student', value: boolean) => {
    setRoleOverrides((prev) => {
      const current = prev[userId] ?? initialRolesRef[userId] ?? { teacher: false, admin: false, student: false };
      const next = { ...current, [role]: value };
      if (
        next.teacher === initialRolesRef[userId]?.teacher &&
        next.admin === initialRolesRef[userId]?.admin &&
        next.student === initialRolesRef[userId]?.student
      ) {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      }
      return { ...prev, [userId]: next };
    });
  }, [initialRolesRef]);

  const setUserRoleFromDropdown = useCallback((userId: string, role: 'teacher' | 'admin' | 'student') => {
    setRoleOverrides((prev) => {
      const next = { teacher: role === 'teacher', admin: role === 'admin', student: role === 'student' };
      const initial = initialRolesRef[userId];
      if (initial && next.teacher === initial.teacher && next.admin === initial.admin && next.student === initial.student) {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      }
      return { ...prev, [userId]: next };
    });
  }, [initialRolesRef]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectUser = useCallback((id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      filteredUserList.forEach((r) => next.add(r.id));
      return next;
    });
  }, [filteredUserList]);

  const clearSelection = useCallback(() => setSelectedUserIds(new Set()), []);

  const bulkSetRole = useCallback((role: RoleId) => {
    selectedUserIds.forEach((id) => setUserRoleFromDropdown(id, role));
  }, [selectedUserIds, setUserRoleFromDropdown]);

  const hasRoleChanges = useMemo(() => Object.keys(roleOverrides).length > 0, [roleOverrides]);
  const hasAnyChanges = unsavedChanges || hasRoleChanges;

  const resetAll = useCallback(() => {
    setShowResetConfirm(false);
    reset();
    setRoleOverrides({});
  }, [reset]);

  useEffect(() => {
    if (user?.role === 'superadmin') {
      refresh();
    }
  }, [user?.role, refresh]);

  const handleApply = async () => {
    setShowApplyConfirm(false);
    const ok = await apply();
    if (ok) {
      await refresh();
    }
  };

  const permissionsSummaryForRow = useCallback(
    (row: UserRoleRow) => {
      const roles = getRoleForUser(row);
      if (roles.teacher) return `Teacher · ${countEnabled(values.teacher)} enabled`;
      if (roles.admin) return `Admin · ${countEnabled(values.admin)} enabled`;
      if (roles.student) return 'Student';
      return '—';
    },
    [getRoleForUser, values.teacher, values.admin]
  );

  if (!user || user.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="heading-page mb-2">Access denied</h1>
          <p className="body-text text-gray-600">This page is only for super administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuClick={() => setSidebarOpen((o) => !o)} />
      <AppLayout
        sidebar={
          <Sidebar
            activeSection="permissions"
            onSectionChange={() => {}}
            isMobileOpen={sidebarOpen}
            onMobileToggle={() => setSidebarOpen((o) => !o)}
            onMobileClose={() => setSidebarOpen(false)}
          />
        }
        sidebarOpen={sidebarOpen}
        onOverlayClick={() => setSidebarOpen(false)}
        maxWidth="7xl"
      >
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="heading-page">Roles & Permissions</h1>
              <p className="caption mt-1 text-gray-600">
                Manage user roles and module permissions
              </p>
            </div>
            <Button
              variant="outline"
              size="md"
              onClick={refresh}
              isLoading={loading}
              className="min-h-[44px]"
              fullWidthMobile
            >
              Refresh
            </Button>
          </div>

          {error && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <EmptyState
                title="Could not load data"
                message={error}
                action={
                  <Button variant="primary" size="md" onClick={refresh} className="min-h-[44px]">
                    Retry
                  </Button>
                }
              />
            </div>
          )}

          {!error && (
            <>
              {loading && (
                <div className="flex flex-col items-center justify-center py-12" role="status">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mb-3" />
                  <p className="body-text text-gray-600">Loading…</p>
                </div>
              )}

              {!loading && (
                <>
                  {/* User Roles section */}
                  <section className="bg-white rounded-lg border border-gray-200 overflow-hidden p-4 sm:p-6">
                    <div className="mb-4 space-y-3">
                      <h2 className="heading-section">User roles</h2>
                      <p className="caption mt-0.5 text-gray-600">
                        View and manage who is a teacher, admin, or student
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <input
                          type="search"
                          placeholder="Search by name, email, or role…"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                          aria-label="Search users"
                        />
                        <select
                          value={userRoleFilter}
                          onChange={(e) => setUserRoleFilter(e.target.value as typeof userRoleFilter)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                          aria-label="Filter by role"
                        >
                          <option value="all">All roles</option>
                          <option value="teacher">Teacher</option>
                          <option value="admin">Admin</option>
                          <option value="student">Student</option>
                        </select>
                        {filteredUserList.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={selectAllFiltered}>
                              Select all
                            </Button>
                            {selectedUserIds.size > 0 && (
                              <>
                                <Button variant="ghost" size="sm" onClick={clearSelection}>
                                  Clear ({selectedUserIds.size})
                                </Button>
                                <span className="text-gray-500 text-sm">Bulk:</span>
                                <select
                                  aria-label="Set role for selected users"
                                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (v) {
                                      bulkSetRole(v as RoleId);
                                      e.target.value = '';
                                    }
                                  }}
                                >
                                  <option value="">Set role…</option>
                                  <option value="teacher">Teacher</option>
                                  <option value="admin">Admin</option>
                                  <option value="student">Student</option>
                                </select>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                      {filteredUserList.length === 0 ? (
                        <EmptyState
                          title="No users found"
                          message={userRolesList.length === 0 ? 'Teachers, admins, and students will appear here.' : 'Try a different search or filter.'}
                        />
                      ) : (
                        <table className="w-full min-w-[320px] border-collapse" role="grid">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              <th className="sticky left-0 z-[2] top-0 bg-gray-50 px-2 sm:px-3 py-3 text-left caption font-medium text-gray-700 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] w-10 sm:w-12">
                                <span className="sr-only">Expand</span>
                              </th>
                              <th className="sticky left-10 sm:sticky left-12 z-[2] top-0 bg-gray-50 px-3 sm:px-4 py-3 text-left caption font-medium text-gray-700 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] min-w-[120px] sm:min-w-[160px]">
                                Name
                              </th>
                              <th className="sticky top-0 z-[2] bg-gray-50 px-3 sm:px-4 py-3 text-left caption font-medium text-gray-700 min-w-[140px]">
                                Email
                              </th>
                              <th className="sticky top-0 z-[2] bg-gray-50 px-3 sm:px-4 py-3 text-left caption font-medium text-gray-700 min-w-[140px]">
                                Role
                              </th>
                              <th className="sticky top-0 z-[2] bg-gray-50 px-3 sm:px-4 py-3 text-left caption font-medium text-gray-700 min-w-[160px] hidden md:table-cell">
                                Permissions summary
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUserList.map((row) => {
                              const roles = getRoleForUser(row);
                              const isChanged = !!roleOverrides[row.id];
                              const isExpanded = expandedUserIds.has(row.id);
                              const isSelected = selectedUserIds.has(row.id);
                              const primaryRole: RoleId = roles.teacher ? 'teacher' : roles.admin ? 'admin' : 'student';
                              return (
                                <React.Fragment key={row.id}>
                                  <tr
                                    className={`group border-b border-gray-200 last:border-b-0 bg-white hover:bg-gray-50/50 ${isChanged ? 'bg-amber-50/50' : ''}`}
                                  >
                                    <td className="sticky left-0 z-[1] bg-white group-hover:bg-gray-50/50 border-r border-gray-200 px-2 sm:px-3 py-2 align-middle w-10 sm:w-12">
                                      <button
                                        type="button"
                                        onClick={() => toggleExpanded(row.id)}
                                        aria-expanded={isExpanded}
                                        className="p-1 rounded hover:bg-gray-200 text-gray-600"
                                        aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                                      >
                                        {isExpanded ? '▼' : '▶'}
                                      </button>
                                    </td>
                                    <td
                                      className={`sticky left-10 sm:left-12 z-[1] px-3 sm:px-4 py-3 align-middle border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] min-w-[120px] sm:min-w-[160px] ${isChanged ? 'bg-amber-50/50' : 'bg-white group-hover:bg-gray-50/50'}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelectUser(row.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                                            aria-label={`Select ${row.name}`}
                                          />
                                          <span className="body-text text-gray-800 font-medium">{row.name}</span>
                                        </label>
                                      </div>
                                    </td>
                                    <td className="px-3 sm:px-4 py-3 align-middle">
                                      <span className="body-text text-gray-600">{row.email || '—'}</span>
                                    </td>
                                    <td className="px-3 sm:px-4 py-2 align-middle">
                                      <select
                                        value={primaryRole}
                                        onChange={(e) => setUserRoleFromDropdown(row.id, e.target.value as RoleId)}
                                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary min-h-[44px] bg-white"
                                        aria-label={`Change role for ${row.name}`}
                                      >
                                        <option value="teacher">Teacher</option>
                                        <option value="admin">Admin</option>
                                        <option value="student">Student</option>
                                      </select>
                                    </td>
                                    <td className="px-3 sm:px-4 py-3 align-middle hidden md:table-cell">
                                      <span className="body-text text-gray-600">{permissionsSummaryForRow(row)}</span>
                                    </td>
                                  </tr>
                                  {isExpanded && (row.teacher || row.admin) && (
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                      <td colSpan={5} className="px-4 py-4">
                                        <div className="text-sm font-medium text-gray-700 mb-2">
                                          Permission template for {primaryRole === 'teacher' ? 'Teacher' : 'Admin'} (edits apply to all {primaryRole}s)
                                        </div>
                                        <div className="flex flex-wrap gap-4">
                                          {modules.slice(0, 4).map((mod) => (
                                            <div key={mod.id} className="bg-white rounded border border-gray-200 p-3 min-w-[200px]">
                                              <div className="font-medium text-gray-800 mb-2">{mod.name}</div>
                                              <ul className="space-y-1.5">
                                                {mod.actions.slice(0, 5).map((a) => {
                                                  const isChanged = changedKeys.has(a.key);
                                                  return (
                                                    <li
                                                      key={a.key}
                                                      className={`flex items-center justify-between gap-2 rounded px-2 py-1 ${isChanged ? 'bg-amber-50' : ''}`}
                                                    >
                                                      <span className="text-gray-700 truncate" title={a.description || a.label}>{a.label}</span>
                                                      <label className="flex-shrink-0 cursor-pointer">
                                                        <input
                                                          type="checkbox"
                                                          checked={!!values[primaryRole]?.[a.key]}
                                                          onChange={(e) => setPermission(primaryRole, a.key, e.target.checked)}
                                                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                                                          aria-label={a.label}
                                                        />
                                                      </label>
                                                    </li>
                                                  );
                                                })}
                                                {mod.actions.length > 5 && (
                                                  <li className="text-gray-500 text-xs">+{mod.actions.length - 5} more in Permissions below</li>
                                                )}
                                              </ul>
                                            </div>
                                          ))}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </section>

                  {/* Permission Management Center */}
                  <section>
                    <div className="mb-4 space-y-3">
                      <h2 className="heading-section">Permission Management Center</h2>
                      <p className="caption mt-0.5 text-gray-600">
                        Manage what each role can do per module. Changes are highlighted before saving.
                      </p>
                      <input
                        type="search"
                        placeholder="Search permissions by name…"
                        value={permissionSearch}
                        onChange={(e) => setPermissionSearch(e.target.value)}
                        className="w-full sm:max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                        aria-label="Search permissions"
                      />
                    </div>
                    <div className="space-y-6">
                      {modules.map((mod) => (
                        <PermissionModulePanel
                          key={mod.id}
                          moduleId={mod.id}
                          moduleName={mod.name}
                          actions={mod.actions}
                          values={values}
                          filterSearch={permissionSearch}
                          defaultCollapsedOnMobile={true}
                          onChange={(role: RoleId, key: string, value: boolean) =>
                            setPermission(role, key, value)
                          }
                          onSelectAllForAction={(role: RoleId, key: string, value: boolean) =>
                            setAllForAction(role, key, value)
                          }
                          changedKeys={changedKeys}
                        />
                      ))}
                    </div>
                  </section>

                  {/* Sticky bottom bar */}
                  <div className="sticky bottom-0 left-0 right-0 bg-gray-50/95 border-t border-gray-200 p-4 flex flex-col sm:flex-row gap-3 sm:justify-end sm:gap-4 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 -mb-8 sm:-mb-8 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.08)]">
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => setShowResetConfirm(true)}
                      disabled={!hasAnyChanges}
                      className="min-h-[44px] order-2 sm:order-1"
                      fullWidthMobile
                    >
                      Reset
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => setShowApplyConfirm(true)}
                      disabled={!unsavedChanges}
                      className="min-h-[44px] order-1 sm:order-2"
                      fullWidthMobile
                    >
                      Save changes
                    </Button>
                  </div>

                  <ConfirmationModal
                    isOpen={showApplyConfirm}
                    title="Apply permission and role changes?"
                    description="This will update permissions for all teachers and admins, and any role changes you made. This action cannot be undone easily."
                    confirmText="Apply"
                    cancelText="Cancel"
                    onConfirm={handleApply}
                    onCancel={() => setShowApplyConfirm(false)}
                  />
                  <ConfirmationModal
                    isOpen={showResetConfirm}
                    title="Reset all changes?"
                    description="All unsaved permission and role changes will be discarded and reverted to the last saved state."
                    confirmText="Reset"
                    cancelText="Cancel"
                    danger
                    onConfirm={resetAll}
                    onCancel={() => setShowResetConfirm(false)}
                  />
                </>
              )}
            </>
          )}
        </div>
      </AppLayout>
    </div>
  );
};

export default RolesPermissionsPage;
