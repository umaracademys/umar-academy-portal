import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { AdminPermissions } from '../types';
import { usePermission } from '../hooks/usePermission';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isMobileOpen?: boolean;
  onMobileToggle?: () => void;
  /** Called when drawer should close (e.g. link click, close button). If not set, onMobileToggle is used. */
  onMobileClose?: () => void;
  onHelpClick?: () => void;
  onTeacherStudentAssignmentClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange, isMobileOpen: externalIsMobileOpen, onMobileToggle, onMobileClose, onHelpClick, onTeacherStudentAssignmentClick }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { admins } = useData();
  const { can, permissions: jwtPermissions } = usePermission();
  const adminPermissions: AdminPermissions | null = useMemo(() => {
    if (jwtPermissions && typeof jwtPermissions === 'object' && user?.role === 'admin') {
      return jwtPermissions as AdminPermissions;
    }
    if (user?.role !== 'admin' || !user?.email) return null;
    const currentAdmin = admins.find(admin => admin.email === user.email);
    return currentAdmin?.permissions || null;
  }, [user?.role, user?.email, admins, jwtPermissions]);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const isMobileOpen = externalIsMobileOpen !== undefined ? externalIsMobileOpen : internalMobileOpen;
  const closeDrawer = () => {
    if (onMobileClose) onMobileClose();
    else if (onMobileToggle) onMobileToggle();
    else setInternalMobileOpen(false);
  };

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

    // Students: admin with canManageStudents; teacher with any student-view permission
    const showStudents =
      (user?.role === 'admin' && adminPermissions?.canManageStudents) ||
      (user?.role === 'superadmin') ||
      (user?.role === 'teacher' && (can('canViewStudentEmail') || can('canViewStudentPersonalInfo') || can('canAccessAssignments')));
    if (showStudents) {
      items.push({ id: 'students', icon: 'ST', label: 'Students', badge: null, isLink: true, href: '/students' });
    }

    // Teachers: admin/superadmin with canManageTeachers only (teachers do not see this link)
    if ((user?.role === 'admin' && adminPermissions?.canManageTeachers) || user?.role === 'superadmin') {
      items.push({ id: 'teachers', icon: 'TC', label: 'Teachers', badge: null, isLink: true, href: '/teachers' });
    }

    // Teacher-Student Assignment: super admin and admins with permission
    if (user?.role === 'superadmin' || (user?.role === 'admin' && adminPermissions?.canManageStudentAssignments)) {
      items.push({ id: 'teacher-student-assignment', icon: '👥', label: 'Teacher-Student Assignment', badge: null, isLink: true, href: '/teacher-student-assignment' });
    }

    // Permissions: super admin or admin with canManagePermissions
    if (user?.role === 'superadmin' || (user?.role === 'admin' && adminPermissions?.canManagePermissions)) {
      items.push({ id: 'permissions', icon: '🔐', label: 'Permissions', badge: null, isLink: true, href: '/permissions' });
    }

    // Teacher Attendance Management: admins/superadmins with permission
    if (user?.role === 'superadmin' || (user?.role === 'admin' && adminPermissions?.canManageAttendance)) {
      items.push({ id: 'teacher-attendance', icon: '📅', label: 'Teacher Attendance', badge: null, isLink: true, href: '/teacher-attendance' });
    }

    // My Attendance: teachers with canAccessAttendance
    if (user?.role === 'teacher' && can('canAccessAttendance')) {
      items.push({ id: 'my-attendance', icon: '📅', label: 'My Attendance', badge: null, isLink: true, href: '/my-attendance' });
    }

    // Assignments: admin with access/manage; teacher with canAccessAssignments
    const showAssignments =
      (user?.role === 'admin' && (adminPermissions?.canAccessAssignments || adminPermissions?.canManageAssignments)) ||
      user?.role === 'superadmin' ||
      (user?.role === 'teacher' && can('canAccessAssignments'));
    if (showAssignments) {
      items.push({ id: 'assignments', icon: 'AS', label: 'Assignments', badge: null, isLink: true, href: '/assignments' });
    }

    // Messages (Chat): admin with canAccessMessages; teacher with canAccessMessages
    const showMessages =
      (user?.role === 'admin' && adminPermissions?.canAccessMessages) ||
      user?.role === 'superadmin' ||
      (user?.role === 'teacher' && can('canAccessMessages'));
    if (showMessages) {
      items.push({ id: 'messages', icon: 'MS', label: 'Messages', badge: null, isLink: true, href: '/messages' });
    }

    return items;
  }, [user?.role, adminPermissions, can]);


  // Add Qaidah: teacher/admin/superadmin with canAccessQaidah
  const qaidahItem: MenuItem | null = useMemo(() => {
    if (user?.role === 'superadmin') {
      return { id: 'qaidah', icon: 'QA', label: 'Qaidah', badge: null, isLink: true, href: '/qaidah-submissions' };
    }
    if (user?.role === 'teacher' && can('canAccessQaidah')) {
      return { id: 'qaidah', icon: 'QA', label: 'Qaidah', badge: null, isLink: true, href: '/qaidah-submissions' };
    }
    if (user?.role === 'admin' && adminPermissions?.canAccessQaidah) {
      return { id: 'qaidah', icon: 'QA', label: 'Qaidah', badge: null, isLink: true, href: '/qaidah-submissions' };
    }
    return null;
  }, [user?.role, adminPermissions, can]);

  // Add PDF Management for super admin (to upload/manage PDFs)
  const pdfManagementItem: MenuItem | null = 
    user?.role === 'superadmin'
      ? { id: 'pdf-management', icon: '📄', label: 'PDF Documents', badge: null, isLink: false }
      : null;

  // Add PDF Teaching Materials for teachers with canAccessPdf
  const pdfTeachingItem: MenuItem | null = useMemo(() => {
    if (user?.role === 'teacher' && can('canAccessPdf')) {
      return { id: 'pdf-teaching', icon: '📚', label: 'PDF Teaching', badge: null, isLink: true, href: '/pdf-teaching' };
    }
    return null;
  }, [user?.role, can]);

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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between py-3 sm:py-2 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-500 hidden sm:block">Menu</span>
        <button
          type="button"
          onClick={closeDrawer}
          className="lg:hidden flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto mobile-scroll py-2" aria-label="Main">
        <ul className="space-y-0.5">
          {menuItems.map((item) => (
            <li key={item.id}>
              {item.isLink && item.href ? (
                <Link
                  to={item.href}
                  onClick={closeDrawer}
                  className={`flex items-center gap-3 w-full min-h-[44px] px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors touch-manipulation ${
                    location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-xs font-semibold ${
                    location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200/80 text-gray-600'
                  }`}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                  {(item as any).badge && (
                    <span className="ml-auto text-xs font-medium opacity-80">{(item as any).badge}</span>
                  )}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (item.id === 'teacher-student-assignment' && onTeacherStudentAssignmentClick) {
                      onTeacherStudentAssignmentClick();
                      closeDrawer();
                    } else {
                      onSectionChange(item.id);
                      closeDrawer();
                    }
                  }}
                  className={`flex items-center gap-3 w-full min-h-[44px] px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors touch-manipulation ${
                    activeSection === item.id
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-xs font-semibold ${
                    activeSection === item.id ? 'bg-white/20 text-white' : 'bg-gray-200/80 text-gray-600'
                  }`}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                  {(item as any).badge && (
                    <span className="ml-auto text-xs font-medium opacity-80">{(item as any).badge}</span>
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>
      {onHelpClick && (
        <div className="pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onHelpClick}
            className="flex items-center gap-3 w-full min-h-[44px] px-3 py-2.5 rounded-lg text-left text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors touch-manipulation"
          >
            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-gray-200/80 text-xs font-semibold text-gray-500">
              ?
            </span>
            <span>Help & Support</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
