import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange }) => {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'overview', icon: '📊', label: 'Overview', badge: null },
    { id: 'students', icon: '👨‍🎓', label: 'Students', badge: null },
    { id: 'teachers', icon: '👨‍🏫', label: 'Teachers', badge: null },
    { id: 'assignments', icon: '📝', label: 'Assignments', badge: null, isLink: true, href: '/assignments' },
    { id: 'courses', icon: '📚', label: 'Courses', badge: '45' },
    { id: 'financials', icon: '💰', label: 'Financials', badge: null },
    { id: 'reports', icon: '📈', label: 'Reports', badge: null },
    { id: 'activities', icon: '🔔', label: 'Activities', badge: '12' },
    { id: 'settings', icon: '⚙️', label: 'Settings', badge: null },
  ];

  return (
    <div className={`text-white transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
    } min-h-screen flex flex-col`} style={{ background: 'linear-gradient(to bottom, #141f15, #1d2e1f)' }}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="text-xl font-bold">Umar Academy</h2>
              <p className="text-xs text-gray-400 mt-1">Admin Portal</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>
      </div>

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <img
              src={user?.avatar || 'https://ui-avatars.com/api/?name=Admin&background=2E4D32&color=fff'}
              alt={user?.name}
              className="h-10 w-10 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.id}>
              {item.isLink ? (
                <Link
                  to={item.href || '/'}
                  className="w-full flex items-center justify-between p-3 rounded-lg transition-all font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{item.icon}</span>
                    {!isCollapsed && <span className="font-semibold">{item.label}</span>}
                  </div>
                  {!isCollapsed && (item as any).badge && (
                    <span className="text-white text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#E7AA39' }}>
                      {(item as any).badge}
                    </span>
                  )}
                </Link>
              ) : (
                <button
                  onClick={() => onSectionChange(item.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all font-medium ${
                    activeSection === item.id
                      ? 'text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                  style={activeSection === item.id ? { 
                    backgroundColor: '#2E4D32',
                    borderLeft: '4px solid #E7AA39'
                  } : {}}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{item.icon}</span>
                    {!isCollapsed && <span className="font-semibold">{item.label}</span>}
                  </div>
                  {!isCollapsed && (item as any).badge && (
                    <span className="text-white text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#E7AA39' }}>
                      {(item as any).badge}
                    </span>
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        {!isCollapsed ? (
          <div className="space-y-2">
            <button className="w-full flex items-center space-x-3 p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition">
              <span className="text-xl">❓</span>
              <span className="text-sm">Help & Support</span>
            </button>
            <button className="w-full flex items-center space-x-3 p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition">
              <span className="text-xl">🚪</span>
              <span className="text-sm">Logout</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button className="w-full p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition text-xl">
              ❓
            </button>
            <button className="w-full p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition text-xl">
              🚪
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
