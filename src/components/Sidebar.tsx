import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { AdminPermissions } from '../types';
import { usePermission } from '../hooks/usePermission';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isMobileOpen?: boolean;
  onMobileToggle?: () => void;
  onHelpClick?: () => void;
  onTeacherStudentAssignmentClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange, isMobileOpen: externalIsMobileOpen, onMobileToggle, onHelpClick, onTeacherStudentAssignmentClick }) => {
  const { user } = useAuth();
  const { admins } = useData();
  const { can, permissions: jwtPermissions } = usePermission(); // Phase 4: Use JWT permissions
  
  // Get current admin's permissions if user is admin (fallback to JWT permissions)
  const adminPermissions: AdminPermissions | null = useMemo(() => {
    // Phase 4: Prioritize JWT permissions over DB permissions
    if (jwtPermissions && typeof jwtPermissions === 'object' && user?.role === 'admin') {
      return jwtPermissions as AdminPermissions;
    }
    
    if (user?.role !== 'admin' || !user?.email) return null;
    const currentAdmin = admins.find(admin => admin.email === user.email);
    return currentAdmin?.permissions || null;
  }, [user?.role, user?.email, admins, jwtPermissions]);
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

  const baseMenuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [
      { id: 'overview', icon: 'OV', label: 'Overview', badge: null, isLink: false },
    ];
    
    // Add Students if admin has permission
    if (user?.role !== 'admin' || adminPermissions?.canManageStudents) {
      items.push({ id: 'students', icon: 'ST', label: 'Students', badge: null, isLink: true, href: '/students' });
    }
    
    // Add Teachers if admin has permission
    if (user?.role !== 'admin' || adminPermissions?.canManageTeachers) {
      items.push({ id: 'teachers', icon: 'TC', label: 'Teachers', badge: null, isLink: true, href: '/teachers' });
    }
    
    // Add Teacher-Student Assignment for super admin and admins with permission
    if (user?.role === 'superadmin' || (user?.role === 'admin' && adminPermissions?.canManageStudentAssignments)) {
      items.push({ id: 'teacher-student-assignment', icon: '👥', label: 'Teacher-Student Assignment', badge: null, isLink: true, href: '/teacher-student-assignment' });
    }
    
    // Add Permissions for super admin only
    if (user?.role === 'superadmin') {
      items.push({ id: 'permissions', icon: '🔐', label: 'Permissions', badge: null, isLink: true, href: '/permissions' });
    }
    
    // Add Assignments if admin has permission
    if (user?.role !== 'admin' || adminPermissions?.canAccessAssignments || adminPermissions?.canManageAssignments) {
      items.push({ id: 'assignments', icon: 'AS', label: 'Assignments', badge: null, isLink: true, href: '/assignments' });
    }
    
    // Add Messages if admin has permission
    if (user?.role !== 'admin' || adminPermissions?.canAccessMessages) {
      items.push({ id: 'messages', icon: 'MS', label: 'Messages', badge: null, isLink: true, href: '/messages' });
    }
    
    return items;
  }, [user?.role, adminPermissions]);


  // Add Qaidah Submissions for teachers/admins/superadmins
  const qaidahItem: MenuItem | null = useMemo(() => {
    if (user?.role === 'teacher' || user?.role === 'superadmin') {
      return { id: 'qaidah', icon: 'QA', label: 'Qaidah', badge: null, isLink: true, href: '/qaidah-submissions' };
    }
    if (user?.role === 'admin' && adminPermissions?.canAccessQaidah) {
      return { id: 'qaidah', icon: 'QA', label: 'Qaidah', badge: null, isLink: true, href: '/qaidah-submissions' };
    }
    return null;
  }, [user?.role, adminPermissions]);

  // Add PDF Management for super admin (to upload/manage PDFs)
  const pdfManagementItem: MenuItem | null = 
    user?.role === 'superadmin'
      ? { id: 'pdf-management', icon: '📄', label: 'PDF Documents', badge: null, isLink: false }
      : null;

  // Add PDF Teaching Materials for teachers
  const pdfTeachingItem: MenuItem | null = 
    user?.role === 'teacher'
      ? { id: 'pdf-teaching', icon: '📚', label: 'PDF Teaching', badge: null, isLink: true, href: '/pdf-teaching' }
      : null;

  const menuItems: MenuItem[] = (() => {
    const items = [...baseMenuItems];
    
    // Add Qaidah if available
    if (qaidahItem) {
      items.push(qaidahItem);
    }
    
    // Add PDF Management for super admin
    if (pdfManagementItem) {
      items.push(pdfManagementItem);
    }
    
    // Add PDF Teaching for teachers
    if (pdfTeachingItem) {
      items.push(pdfTeachingItem);
    }
    
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
                    if (item.id === 'teacher-student-assignment' && onTeacherStudentAssignmentClick) {
                      onTeacherStudentAssignmentClick();
                      setIsMobileOpen(false);
                    } else {
                      onSectionChange(item.id);
                      setIsMobileOpen(false);
                    }
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
            <button 
              onClick={onHelpClick}
              className="w-full flex items-center space-x-3 p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition"
            >
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
            <button 
              onClick={onHelpClick}
              className="w-full p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition text-xs font-semibold uppercase"
              title="Help & Support"
            >
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
