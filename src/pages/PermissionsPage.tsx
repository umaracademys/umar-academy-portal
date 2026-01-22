import React, { useState, useEffect, Suspense, lazy } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useBackendData } from '../contexts/BackendDataContext';
import { useToast } from '../hooks/useToast';

// Lazy load PermissionManager for better performance
const PermissionManager = lazy(() => import('../components/PermissionManager'));

const PermissionsPage: React.FC = () => {
  const { user } = useAuth();
  const { teachers, admins, refreshData } = useData();
  const { refreshDataLight } = useBackendData();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState('permissions');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Ensure user is superadmin
  useEffect(() => {
    if (user && user.role !== 'superadmin') {
      showToast('Access denied. Super admin only.', 'error');
      // Redirect to dashboard
      window.location.href = '/dashboard';
    }
  }, [user, showToast]);

  // Refresh data on mount to ensure latest permissions
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsRefreshing(true);
        await refreshData();
        await refreshDataLight();
      } catch (error) {
        console.error('Error loading data:', error);
        showToast('Failed to load data. Please refresh the page.', 'error');
      } finally {
        setIsRefreshing(false);
      }
    };

    if (user?.role === 'superadmin') {
      loadData();
    }
  }, [user, refreshData, refreshDataLight, showToast]);

  // Handle permission update success
  const handlePermissionUpdate = () => {
    // Refresh data after permission update
    refreshData().catch((error) => {
      console.error('Error refreshing data after permission update:', error);
      showToast('Permissions updated, but failed to refresh data.', 'warning');
    });
  };

  if (!user || user.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">This page is only accessible to super administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          isMobileOpen={isMobileOpen}
          onMobileToggle={() => setIsMobileOpen(!isMobileOpen)}
        />
        
        <main className="flex-1 lg:ml-0">
          <div className="p-4 md:p-6 lg:p-8">
            {/* Page Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Permission Management
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Control access and permissions for teachers and admins
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setIsRefreshing(true);
                    try {
                      await refreshData();
                      await refreshDataLight();
                      showToast('Data refreshed successfully', 'success');
                    } catch (error) {
                      console.error('Error refreshing:', error);
                      showToast('Failed to refresh data', 'error');
                    } finally {
                      setIsRefreshing(false);
                    }
                  }}
                  disabled={isRefreshing}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isRefreshing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <span>🔄</span>
                      Refresh
                    </>
                  )}
                </button>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Teachers</p>
                      <p className="text-2xl font-bold text-gray-900">{teachers.length}</p>
                    </div>
                    <div className="text-3xl">👨‍🏫</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Admins</p>
                      <p className="text-2xl font-bold text-gray-900">{admins.length}</p>
                    </div>
                    <div className="text-3xl">👨‍💼</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{teachers.length + admins.length}</p>
                    </div>
                    <div className="text-3xl">👥</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Permission Manager */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <Suspense
                fallback={
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading Permission Manager...</p>
                  </div>
                }
              >
                <PermissionManager
                  isFullPage={true}
                  onUpdate={handlePermissionUpdate}
                />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PermissionsPage;
