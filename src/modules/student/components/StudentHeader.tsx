import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';

const StudentHeader: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-primary-600">
                Umar Academy
              </h1>
            </div>
            <div className="ml-4">
              <span className="text-sm text-gray-500">Student Portal</span>
            </div>
          </div>

          {/* User Info and Actions */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500">Student</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <img
                src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=2E4D32&color=fff`}
                alt="Profile"
                className="h-8 w-8 rounded-full"
              />
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-md hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default StudentHeader;








