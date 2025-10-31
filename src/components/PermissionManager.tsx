import React, { useState } from 'react';
import { Teacher, Admin } from '../types';
import { useData } from '../contexts/DataContext';

interface PermissionManagerProps {
  onClose: () => void;
}

const PermissionManager: React.FC<PermissionManagerProps> = ({ onClose }) => {
  const { teachers, admins, updateTeacher, updateAdmin } = useData();
  const [selectedType, setSelectedType] = useState<'teacher' | 'admin'>('teacher');
  const [selectedUser, setSelectedUser] = useState<string>('');

  const selectedTeacher = teachers.find(t => t.id === selectedUser);
  const selectedAdmin = admins.find(a => a.id === selectedUser);

  const handleTeacherPermissionChange = (permission: any, value: boolean) => {
    if (selectedTeacher) {
      updateTeacher(selectedTeacher.id, {
        permissions: {
          ...selectedTeacher.permissions,
          [permission]: value,
        },
      });
    }
  };

  const handleAdminPermissionChange = (permission: any, value: boolean) => {
    if (selectedAdmin) {
      updateAdmin(selectedAdmin.id, {
        permissions: {
          ...selectedAdmin.permissions,
          [permission]: value,
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-red-600 to-red-800 text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold">🔐 Permission Management Center</h2>
          <p className="text-red-100 text-sm mt-1">Micro-manage user access and permissions</p>
        </div>

        <div className="p-6">
          {/* User Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select User Type</label>
            <div className="flex space-x-4">
              <button
                onClick={() => { setSelectedType('teacher'); setSelectedUser(''); }}
                className={`flex-1 py-3 rounded-lg font-medium transition ${
                  selectedType === 'teacher'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                👨‍🏫 Teachers
              </button>
              <button
                onClick={() => { setSelectedType('admin'); setSelectedUser(''); }}
                className={`flex-1 py-3 rounded-lg font-medium transition ${
                  selectedType === 'admin'
                    ? 'bg-gold-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🛡️ Admins
              </button>
            </div>
          </div>

          {/* User Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select {selectedType === 'teacher' ? 'Teacher' : 'Admin'}
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="">-- Select User --</option>
              {selectedType === 'teacher' 
                ? teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.fullName} ({t.email})</option>
                  ))
                : admins.map(a => (
                    <option key={a.id} value={a.id}>{a.fullName} ({a.email})</option>
                  ))
              }
            </select>
          </div>

          {/* Teacher Permissions */}
          {selectedType === 'teacher' && selectedTeacher! && (
            <div className="bg-cream-100 p-6 rounded-lg border border-gold-300">
              <div className="flex items-center space-x-3 mb-4">
                <img
                  src={selectedTeacher!.avatar}
                  alt={selectedTeacher!.fullName}
                  className="h-12 w-12 rounded-full"
                />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedTeacher!.fullName}</h3>
                  <p className="text-sm text-gray-600">{selectedTeacher!.department} • {selectedTeacher!.email}</p>
                  <p className="text-xs text-gray-500">Assigned Students: {selectedTeacher!.assignedStudents.length}</p>
                </div>
              </div>

              <h4 className="font-semibold text-gray-900 mb-3">Manage Teacher Permissions</h4>
              <div className="space-y-3">
                {Object.entries((selectedTeacher?.permissions || {})).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </p>
                      <p className="text-xs text-gray-600">
                        {key === 'canViewAssessments' && 'View student assessments and test scores'}
                        {key === 'canEditAssessments' && 'Add and modify student assessments'}
                        {key === 'canViewEvaluations' && 'View student behavior and progress evaluations'}
                        {key === 'canEditEvaluations' && 'Create and edit student evaluations'}
                        {key === 'canViewFinancials' && 'Access student financial information (tuition, payments)'}
                        {key === 'canManageSchedule' && 'Modify student schedules and class times'}
                        {key === 'canContactParents' && 'Send messages and contact student parents'}
                      </p>
                    </div>
                    <div className="ml-4">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => handleTeacherPermissionChange(key as any, e.target.checked)}
                        className="w-5 h-5 text-primary-600 focus:ring-primary-500 rounded"
                      />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Admin Permissions */}
          {selectedType === 'admin' && selectedAdmin! && (
            <div className="bg-gold-50 p-6 rounded-lg border border-gold-300">
              <div className="flex items-center space-x-3 mb-4">
                <img
                  src={selectedAdmin!.avatar}
                  alt={selectedAdmin!.fullName}
                  className="h-12 w-12 rounded-full"
                />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedAdmin!.fullName}</h3>
                  <p className="text-sm text-gray-600">{selectedAdmin!.email}</p>
                  <p className="text-xs text-gray-500">Departments: {selectedAdmin!.assignedDepartments.join(', ')}</p>
                </div>
              </div>

              <h4 className="font-semibold text-gray-900 mb-3">Manage Admin Permissions</h4>
              <div className="space-y-3">
                {Object.entries((selectedAdmin?.permissions || {})).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </p>
                      <p className="text-xs text-gray-600">
                        {key === 'canManageTeachers' && 'Add, edit, remove teachers and manage their assignments'}
                        {key === 'canManageStudents' && 'Add, edit, remove students and manage enrollments'}
                        {key === 'canManageFinancials' && 'View and manage all financial records, tuition, and payments'}
                        {key === 'canViewReports' && 'Access system reports, analytics, and performance data'}
                        {key === 'canManagePermissions' && 'Modify permissions for teachers and other admins'}
                      </p>
                    </div>
                    <div className="ml-4">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => handleAdminPermissionChange(key as any, e.target.checked)}
                        className="w-5 h-5 text-gold-600 focus:ring-gold-500 rounded"
                      />
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-4 p-3 bg-gold-50 border border-gold-300 rounded-lg">
                <p className="text-xs text-gold-900">
                  ⚠️ <strong>Warning:</strong> Only Super Admin has full access to all permissions. Be cautious when granting permission management rights.
                </p>
              </div>
            </div>
          )}

          {!selectedUser && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">👆 Select a user to manage their permissions</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionManager;
