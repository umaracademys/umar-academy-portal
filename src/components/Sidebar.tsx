import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isMobileOpen?: boolean;
  onMobileToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange, isMobileOpen: externalIsMobileOpen, onMobileToggle }) => {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isMobileOpen = externalIsMobileOpen !== undefined ? externalIsMobileOpen : internalMobileOpen;
  const setIsMobileOpen = onMobileToggle || setInternalMobileOpen;

  interface MenuItem {
    id: string;
    icon: string;
    label: string;
    badge: string | null;
    isLink: boolean;
    href?: string;
  }

  const baseMenuItems: MenuItem[] = [
    { id: 'overview', icon: 'OV', label: 'Overview', badge: null, isLink: false },
    { id: 'students', icon: 'ST', label: 'Students', badge: null, isLink: true, href: '/students' },
    { id: 'teachers', icon: 'TC', label: 'Teachers', badge: null, isLink: true, href: '/teachers' },
    { id: 'assignments', icon: 'AS', label: 'Assignments', badge: null, isLink: true, href: '/assignments' },
    { id: 'messages', icon: 'MS', label: 'Messages', badge: null, isLink: true, href: '/messages' },
  ];


  // Add AI Library based on role
  const aiLibraryItem: MenuItem | null = 
    user?.role === 'superadmin' 
      ? { id: 'ai-library', icon: 'AI', label: 'AI Library', badge: null, isLink: true, href: '/super-admin/ai-library' }
      : user?.role === 'admin'
      ? { id: 'ai-library', icon: 'AI', label: 'AI Library', badge: null, isLink: true, href: '/admin/ai-library' }
      : null;

  // Add Qaidah Submissions for teachers/admins/superadmins
  const qaidahItem: MenuItem | null = 
    (user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'superadmin')
      ? { id: 'qaidah', icon: 'QA', label: 'Qaidah', badge: null, isLink: true, href: '/qaidah-submissions' }
      : null;

  const menuItems: MenuItem[] = (() => {
    const items = [...baseMenuItems];
    
    // Add Qaidah if available
    if (qaidahItem) {
      items.push(qaidahItem);
    }
    
    // Add AI Library if available
    if (aiLibraryItem) {
      items.push(aiLibraryItem);
    }
    
    // Add remaining items
    items.push(
      { id: 'courses', icon: 'CR', label: 'Courses', badge: '45', isLink: false },
      { id: 'financials', icon: 'FN', label: 'Financials', badge: null, isLink: false },
      { id: 'reports', icon: 'RP', label: 'Reports', badge: null, isLink: false },
      { id: 'activities', icon: 'AC', label: 'Activities', badge: '12', isLink: false },
      { id: 'settings', icon: 'SE', label: 'Settings', badge: null, isLink: false }
    );
    
    return items;
  })();

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`text-white transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      } min-h-screen flex flex-col fixed lg:relative z-50 lg:z-auto ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`} style={{ background: 'linear-gradient(to bottom, #141f15, #1d2e1f)' }}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="text-xl font-bold">Umar Academy</h2>
              <p className="text-xs text-gray-400 mt-1">Admin Portal</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-700 rounded-lg transition text-sm font-semibold"
            >
              ×
            </button>
            {/* Desktop Collapse Button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block p-2 hover:bg-gray-700 rounded-lg transition text-sm font-semibold"
            >
              {isCollapsed ? '>' : '<'}
            </button>
          </div>
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
              {item.isLink && item.href ? (
                <Link
                  to={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className="w-full flex items-center justify-between p-3 rounded-lg transition-all font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.08)] text-xs font-semibold uppercase">
                      {item.icon}
                    </span>
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
                  onClick={() => {
                    onSectionChange(item.id);
                    setIsMobileOpen(false);
                  }}
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
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.08)] text-xs font-semibold uppercase">
                      {item.icon}
                    </span>
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
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.08)] text-xs font-semibold uppercase">
                HP
              </span>
              <span className="text-sm">Help & Support</span>
            </button>
            <button className="w-full flex items-center space-x-3 p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.08)] text-xs font-semibold uppercase">
                LO
              </span>
              <span className="text-sm">Logout</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button className="w-full p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition text-xs font-semibold uppercase">
              HP
            </button>
            <button className="w-full p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition text-xs font-semibold uppercase">
              LO
            </button>
          </div>
        )}
      </div>
      </div>
    </>
  );
};

export default Sidebar;
