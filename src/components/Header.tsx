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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="lg:hidden p-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                title="Menu"
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
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-bold text-primary">
                📚 Umar Academy
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            {showNotificationBell && onNotificationClick && (
              <button
                onClick={onNotificationClick}
                className="relative p-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                title="Notifications"
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
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-error rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )}
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
              {user?.avatar && (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className={`h-10 w-10 rounded-full border-2 ${
                    user.role === 'superadmin' ? 'border-error' : 'border-gray-200'
                  }`}
                />
              )}
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                <div className="flex items-center space-x-2">
                  {user?.role === 'superadmin' ? (
                    <span className="text-xs font-bold text-white bg-error px-2 py-0.5 rounded">
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
              className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
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
