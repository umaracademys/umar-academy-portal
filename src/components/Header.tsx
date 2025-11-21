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
  const { adminNotifications, assignments, recitationTickets, recitationReviews } = useBackendData();
  
  // Only show notification bell for admins/super admins
  const showNotificationBell = user?.role === 'admin' || user?.role === 'superadmin';
  
  // Calculate total unread notifications (backend + dynamic)
  const unreadCount = React.useMemo(() => {
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
  }, [adminNotifications, assignments, recitationTickets, recitationReviews]);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16 min-h-[56px]">
          <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
            {/* Mobile Menu Button */}
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                title="Menu"
                aria-label="Menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            )}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-primary truncate">
                Umar Academy
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-shrink-0">
            {/* Notification Bell */}
            {showNotificationBell && onNotificationClick && (
              <button
                onClick={onNotificationClick}
                className="relative p-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                title="Notifications"
                aria-label="Notifications"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-error rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )}
            <div className="hidden xs:flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-4 border-l border-gray-200">
              {user?.avatar && (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 flex-shrink-0 ${
                    user.role === 'superadmin' ? 'border-error' : 'border-gray-200'
                  }`}
                />
              )}
              <div className="hidden sm:block">
                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate max-w-[120px]">{user?.name}</p>
                <div className="flex items-center space-x-2">
                  {user?.role === 'superadmin' ? (
                    <span className="text-[10px] sm:text-xs font-bold text-white bg-error px-1.5 sm:px-2 py-0.5 rounded">
                      SUPER ADMIN
                    </span>
                  ) : (
                    <p className="text-[10px] sm:text-xs text-gray-500 capitalize truncate">{user?.role}</p>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation whitespace-nowrap"
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
