import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBackendData } from '../contexts/BackendDataContext';
import { useData } from '../contexts/DataContext';

interface HeaderProps {
  onNotificationClick?: () => void;
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNotificationClick, onMenuClick }) => {
  const { user, logout } = useAuth();
  const { adminNotifications, teacherNotifications, assignments, recitationTickets, recitationReviews, refreshDataLight, loading } = useBackendData();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  
  // Show notification bell for admins/super admins and teachers
  const showNotificationBell = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'teacher';
  
  // Calculate total unread notifications (backend + dynamic)
  const unreadCount = React.useMemo(() => {
    if (user?.role === 'teacher') {
      // For teachers, count teacher notifications
      return teacherNotifications.filter(n => !n.read).length;
    } else {
      // For admins/superadmins, count admin notifications + dynamic
      const backendUnread = adminNotifications.filter(n => !n.read).length;
      
      // Dynamic notifications (homework, tickets, recitations)
      const pendingHomework = assignments.filter((assignment: any) => 
        assignment.homework?.enabled && 
        assignment.homework?.submission?.submitted && 
        assignment.homework?.submission?.status === 'submitted'
      ).length;
      
      const pendingTickets = recitationTickets.filter(t => t.status === 'submitted').length;
      const pendingRecitations = recitationReviews.filter(r => r.status === 'pending_review').length;
      
      return backendUnread + pendingHomework + pendingTickets + pendingRecitations;
    }
  }, [adminNotifications, teacherNotifications, assignments, recitationTickets, recitationReviews, user?.role]);

  // Calculate high priority unread notifications (for admins/superadmins only)
  const highPriorityCount = React.useMemo(() => {
    if (user?.role === 'teacher') {
      return 0; // Teachers don't have high priority notifications
    }
    
    // Backend high priority notifications
    const backendHigh = adminNotifications.filter(n => n.priority === 'high' && !n.read).length;
    
    // Dynamic high priority notifications (homework and tickets are high priority)
    const pendingHomework = assignments.filter((assignment: any) => 
      assignment.homework?.enabled && 
      assignment.homework?.submission?.submitted && 
      assignment.homework?.submission?.status === 'submitted'
    ).length;
    
    const pendingTickets = recitationTickets.filter(t => t.status === 'submitted').length;
    
    return backendHigh + pendingHomework + pendingTickets;
  }, [adminNotifications, assignments, recitationTickets, user?.role]);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center min-h-[56px] sm:min-h-[60px]">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {onMenuClick && (
              <button
                type="button"
                onClick={onMenuClick}
                className="lg:hidden flex items-center justify-center min-w-[44px] min-h-[44px] -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                title="Menu"
                aria-label="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <h1 className="heading-page truncate text-gray-900">Umar Academy</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  await refreshDataLight();
                } finally {
                  setTimeout(() => setIsRefreshing(false), 500);
                }
              }}
              disabled={loading || isRefreshing}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh Data"
              aria-label="Refresh Data"
            >
              <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {showNotificationBell && onNotificationClick && (
              <button
                type="button"
                onClick={onNotificationClick}
                className="relative flex items-center justify-center min-w-[44px] min-h-[44px] text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                title="Notifications"
                aria-label="Notifications"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-semibold text-white bg-primary rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )}
            <div className="hidden xs:flex items-center gap-2 pl-2 sm:pl-3 border-l border-gray-200">
              {user?.avatar && (
                <img
                  src={user.avatar}
                  alt={user.name ?? ''}
                  className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex-shrink-0 object-cover ${user.role === 'superadmin' ? 'ring-2 ring-error' : 'ring-1 ring-gray-200'}`}
                />
              )}
              <div className="hidden sm:block min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize truncate">{user?.role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors touch-manipulation whitespace-nowrap"
            >
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
