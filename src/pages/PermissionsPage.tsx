import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import PermissionModulePanel from '../components/PermissionModulePanel';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import type { RoleId } from '../hooks/usePermissions';

const PermissionsPage: React.FC = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  useEffect(() => {
    if (user?.role === 'superadmin') {
      refresh();
    }
  }, [user?.role, refresh]);

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

  const handleApply = async () => {
    const ok = await apply();
    if (ok) {
      await refresh();
    }
  };

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
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="heading-page">Permissions</h1>
              <p className="caption mt-1 text-gray-600">
                Manage who can do what — teachers, admins, students
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
                  {modules.map((mod) => (
                    <PermissionModulePanel
                      key={mod.id}
                      moduleName={mod.name}
                      actions={mod.actions}
                      values={values}
                      onChange={(role: RoleId, key: string, value: boolean) => setPermission(role, key, value)}
                      onSelectAllForAction={(role: RoleId, key: string, value: boolean) =>
                        setAllForAction(role, key, value)
                      }
                      changedKeys={changedKeys}
                    />
                  ))}

                  <div className="sticky bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-200 p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 z-10">
                    <Button
                      variant="outline"
                      size="md"
                      onClick={reset}
                      disabled={!unsavedChanges}
                      className="min-h-[44px] order-2 sm:order-1"
                      fullWidthMobile
                    >
                      Reset
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleApply}
                      disabled={!unsavedChanges}
                      className="min-h-[44px] order-1 sm:order-2"
                      fullWidthMobile
                    >
                      Apply changes
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </AppLayout>
    </div>
  );
};

export default PermissionsPage;
