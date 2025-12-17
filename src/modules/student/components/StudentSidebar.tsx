import React from 'react';
import { NavLink } from 'react-router-dom';

interface StudentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const StudentSidebar: React.FC<StudentSidebarProps> = ({ isOpen, onClose }) => {
  const navigation = [
    { name: 'Dashboard', href: '/student/dashboard', icon: 'DB' },
    { name: 'My Assignments', href: '/student/assignments', icon: 'AS' },
    { name: 'PDF Homework', href: '/student/pdf-homework', icon: '📄' },
    { name: 'My Courses', href: '/student/courses', icon: 'CR' },
    { name: 'My Progress', href: '/student/progress', icon: 'PR' },
    { name: 'My Payments', href: '/student/payments', icon: 'PY' },
    { name: 'My Profile', href: '/student/profile', icon: 'PF' },
    { name: 'Messages', href: '/student/messages', icon: 'MS' },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Student Portal</h2>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              X
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <span className="mr-3 inline-flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-xs font-semibold text-gray-600 uppercase">
                  {item.icon}
                </span>
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              Umar Academy Portal v1.0
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentSidebar;








