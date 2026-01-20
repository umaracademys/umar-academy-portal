import React, { useState, useMemo, useCallback } from 'react';
import { Teacher, Admin, TeacherPermissions, AdminPermissions } from '../../types';
import { useBackendData } from '../../contexts/BackendDataContext';
import { UserList } from './UserList';
import { PermissionEditor } from './PermissionEditor';
import { 
  buildTeacherPermissions, 
  buildAdminPermissions 
} from './utils/buildPermissions';

interface PermissionManagerV2Props {
  onClose: () => void;
}

type TabType = 'users' | 'roles' | 'permissions';

export const PermissionManagerV2: React.FC<PermissionManagerV2Props> = ({ onClose }) => {
  const { teachers, admins, updateTeacher, updateAdmin, refreshData } = useBackendData();
  
  // State
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [userType, setUserType] = useState<'teacher' | 'admin'>('teacher');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Bulk operations
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Get current user
  const currentUser = useMemo(() => {
    if (!selectedUserId) return null;
    const users = userType === 'teacher' ? teachers : admins;
    return users.find(u => u.id === selectedUserId) || null;
  }, [selectedUserId, userType, teachers, admins]);

  // Get current permissions
  const currentPermissions = useMemo(() => {
    if (!currentUser) return null;
    
    if (userType === 'teacher') {
      return buildTeacherPermissions((currentUser as Teacher).permissions);
    } else {
      return buildAdminPermissions((currentUser as Admin).permissions);
    }
  }, [currentUser, userType]);

  // Handle permission change
  const handlePermissionChange = useCallback(async (key: string, value: boolean) => {
    if (!currentUser || isSaving) return;

    setIsSaving(true);
    try {
      const updatedPermissions = {
        ...currentPermissions!,
        [key]: value,
      };

      if (userType === 'teacher') {
        const teacher = currentUser as Teacher;
        // Use teacher document ID if available
        const teacherDocId = (teacher as any).teacherDocumentId?.toString() || 
                            (teacher as any)._id?.toString() || 
                            teacher.id;
        
        await updateTeacher(teacherDocId, { 
          permissions: updatedPermissions as TeacherPermissions 
        });
      } else {
        await updateAdmin(currentUser.id, { 
          permissions: updatedPermissions as AdminPermissions 
        });
      }

      await refreshData();
      
      setFeedback({
        type: 'success',
        message: `Permission updated successfully`,
      });
      
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update permission',
      });
      setTimeout(() => setFeedback(null), 5000);
      throw error; // Re-throw for optimistic update rollback
    } finally {
      setIsSaving(false);
    }
  }, [currentUser, currentPermissions, userType, updateTeacher, updateAdmin, refreshData, isSaving]);

  // Handle user selection
  const handleUserSelect = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setBulkMode(false);
    setSelectedUserIds(new Set());
  }, []);

  // Handle bulk toggle
  const handleToggleUser = useCallback((userId: string, checked: boolean) => {
    const newSelection = new Set(selectedUserIds);
    if (checked) {
      newSelection.add(userId);
    } else {
      newSelection.delete(userId);
    }
    setSelectedUserIds(newSelection);
  }, [selectedUserIds]);

  // Sorted users
  const sortedUsers = useMemo(() => {
    const users = userType === 'teacher' ? teachers : admins;
    return [...users].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [userType, teachers, admins]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex flex-col h-full w-full max-w-7xl bg-white rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Permission Management Center</h1>
              <p className="text-blue-100 text-sm mt-1">
                Manage user access, roles, and permissions
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition p-2"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-t-lg font-medium transition ${
                activeTab === 'users'
                  ? 'bg-white text-blue-800'
                  : 'bg-blue-700/50 text-blue-100 hover:bg-blue-700'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-4 py-2 rounded-t-lg font-medium transition ${
                activeTab === 'roles'
                  ? 'bg-white text-blue-800'
                  : 'bg-blue-700/50 text-blue-100 hover:bg-blue-700'
              }`}
            >
              Roles
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-4 py-2 rounded-t-lg font-medium transition ${
                activeTab === 'permissions'
                  ? 'bg-white text-blue-800'
                  : 'bg-blue-700/50 text-blue-100 hover:bg-blue-700'
              }`}
            >
              Permissions
            </button>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`px-6 py-3 ${
              feedback.type === 'success'
                ? 'bg-green-50 text-green-800 border-b border-green-200'
                : 'bg-red-50 text-red-800 border-b border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span className="text-sm font-medium">{feedback.message}</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - User List */}
          <div className="w-80 flex-shrink-0 border-r border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">User Directory</h2>
                <button
                  onClick={() => setBulkMode(!bulkMode)}
                  className={`text-xs px-2 py-1 rounded font-medium transition ${
                    bulkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {bulkMode ? 'Bulk Mode' : 'Single'}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setUserType('teacher');
                    setSelectedUserId(null);
                  }}
                  className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
                    userType === 'teacher'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Teachers ({teachers.length})
                </button>
                <button
                  onClick={() => {
                    setUserType('admin');
                    setSelectedUserId(null);
                  }}
                  className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
                    userType === 'admin'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Admins ({admins.length})
                </button>
              </div>
            </div>

            <UserList
              users={sortedUsers}
              selectedUserId={selectedUserId}
              onSelectUser={handleUserSelect}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              showCheckboxes={bulkMode}
              selectedUserIds={selectedUserIds}
              onToggleUser={handleToggleUser}
              type={userType}
            />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden">
            {!currentUser || !currentPermissions ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                <svg className="w-16 h-16 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-lg font-medium">Select a user to manage permissions</p>
                <p className="text-sm mt-2">Choose a {userType} from the directory on the left</p>
              </div>
            ) : (
              <div className="h-full">
                {/* User Header */}
                <div className="p-6 border-b border-gray-200 bg-white">
                  <div className="flex items-center gap-4">
                    <img
                      src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.fullName)}&background=6366F1&color=fff`}
                      alt={currentUser.fullName}
                      className="w-12 h-12 rounded-full border-2 border-gray-200"
                    />
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{currentUser.fullName}</h2>
                      <p className="text-sm text-gray-600">{currentUser.email}</p>
                    </div>
                    <div className="ml-auto">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        currentUser.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {currentUser.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Permission Editor */}
                <PermissionEditor
                  permissions={currentPermissions}
                  isAdmin={userType === 'admin'}
                  onPermissionChange={handlePermissionChange}
                  disabled={isSaving}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedUserId ? `Managing: ${currentUser?.fullName}` : 'No user selected'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionManagerV2;
