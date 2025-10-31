import React, { useState } from 'react';
import { Admin, AdminPermissions } from '../types';
import { useData } from '../contexts/DataContext';

interface AdminRegistrationFormProps {
  onClose: () => void;
}

const AdminRegistrationForm: React.FC<AdminRegistrationFormProps> = ({ onClose }) => {
  const { addAdmin } = useData();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    contact: '',
    assignedDepartments: [] as string[],
  });

  const [permissions, setPermissions] = useState<AdminPermissions>({
    canManageTeachers: true,
    canManageStudents: true,
    canManageFinancials: false,
    canViewReports: true,
    canManagePermissions: false,
  });

  const departments = ['Islamic Studies', 'Mathematics', 'Science', 'Language Arts', 'General'];
  const [newDepartment, setNewDepartment] = useState('');

  const handleDepartmentToggle = (dept: string) => {
    setFormData(prev => ({
      ...prev,
      assignedDepartments: prev.assignedDepartments.includes(dept)
        ? prev.assignedDepartments.filter(d => d !== dept)
        : [...prev.assignedDepartments, dept]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newAdmin: Admin = {
      id: `ADM${Date.now()}`,
      fullName: formData.fullName,
      email: formData.email,
      contact: formData.contact,
      permissions: permissions,
      assignedDepartments: formData.assignedDepartments,
      hireDate: new Date().toISOString().split('T')[0],
      status: 'active',
      avatar: `https://ui-avatars.com/api/?name=${formData.fullName.replace(' ', '+')}&background=8b5cf6&color=fff`,
    };

    addAdmin(newAdmin);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold">🛡️ Register New Admin</h2>
          <p className="text-purple-100 text-sm mt-1">Add a new administrator with custom permissions</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Basic Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="+1-555-0000"
                />
              </div>
            </div>
          </div>

          {/* Department Assignment */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Assignment</h3>
            <div className="flex flex-wrap gap-2">
              {departments.map(dept => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => handleDepartmentToggle(dept)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    formData.assignedDepartments.includes(dept)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissions & Access Control</h3>
            <div className="bg-purple-50 p-4 rounded-lg space-y-3">
              {Object.entries(permissions).map(([key, value]) => (
                <label key={key} className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                    <p className="text-xs text-gray-600">
                      {key === 'canManageTeachers' && 'Add, edit, and remove teachers'}
                      {key === 'canManageStudents' && 'Add, edit, and remove students'}
                      {key === 'canManageFinancials' && 'View and manage financial records'}
                      {key === 'canViewReports' && 'Access system reports and analytics'}
                      {key === 'canManagePermissions' && 'Modify permissions for other admins'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setPermissions({ ...permissions, [key]: e.target.checked })}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
                  />
                </label>
              ))}
            </div>
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                ⚠️ <strong>Note:</strong> Only Super Admin can manage all permissions. Regular admins have limited access.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              Register Admin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminRegistrationForm;
