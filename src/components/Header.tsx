import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="text-primary-600 text-2xl font-bold">
              📚 Umar Academy
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {user?.avatar && (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className={`h-10 w-10 rounded-full ${
                    user.role === 'superadmin' ? 'ring-2 ring-red-500' : ''
                  }`}
                />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <div className="flex items-center space-x-2">
                  {user?.role === 'superadmin' ? (
                    <span className="text-xs font-bold text-white bg-red-600 px-2 py-0.5 rounded">
                      👑 SUPER ADMIN
                    </span>
                  ) : (
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                user?.role === 'superadmin'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
