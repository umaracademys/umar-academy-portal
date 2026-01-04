import React, { useState, useMemo, useEffect } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { TeacherNotification } from '../types';
import { useNavigate } from 'react-router-dom';

interface TeacherNotificationCenterProps {
  onClose: () => void;
  onOpenWeeklyEvaluation?: (evaluationId: string) => void;
  onOpenMessage?: (conversationId: string) => void;
}

const TeacherNotificationCenter: React.FC<TeacherNotificationCenterProps> = ({ 
  onClose, 
  onOpenWeeklyEvaluation,
  onOpenMessage 
}) => {
  const { 
    teacherNotifications, 
    markTeacherNotificationAsRead, 
    markAllTeacherNotificationsAsRead, 
    refreshTeacherNotifications 
  } = useBackendData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread' | 'high'>('all');

  // Refresh notifications when component opens
  useEffect(() => {
    refreshTeacherNotifications();
  }, [refreshTeacherNotifications]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = [...teacherNotifications];
    
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (filter === 'high') {
      filtered = filtered.filter(n => n.priority === 'high');
    }
    
    return filtered.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return dateB - dateA; // Newest first
    });
  }, [teacherNotifications, filter]);

  const unreadCount = useMemo(() => {
    return teacherNotifications.filter(n => !n.read).length;
  }, [teacherNotifications]);

  const handleNotificationClick = async (notification: TeacherNotification) => {
    // Mark as read
    if (!notification.read) {
      await markTeacherNotificationAsRead(notification.id || notification._id || '');
    }

    // Handle navigation based on type
    if (notification.type === 'weekly_evaluation_feedback' || notification.type === 'weekly_evaluation_approved') {
      if (onOpenWeeklyEvaluation && notification.weeklyEvaluationId) {
        onOpenWeeklyEvaluation(notification.weeklyEvaluationId);
      } else {
        navigate('/dashboard');
      }
    } else if (
      notification.type === 'message_received' || 
      notification.type === 'pair_message_received' || 
      notification.type === 'student_message_received'
    ) {
      if (onOpenMessage && notification.conversationId) {
        onOpenMessage(notification.conversationId);
      } else {
        navigate('/messages');
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'weekly_evaluation_feedback':
      case 'weekly_evaluation_approved':
        return '📝';
      case 'message_received':
      case 'pair_message_received':
      case 'student_message_received':
        return '💬';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'high') return 'border-l-red-500 bg-red-50';
    if (type.includes('evaluation')) return 'border-l-blue-500 bg-blue-50';
    if (type.includes('message')) return 'border-l-green-500 bg-green-50';
    return 'border-l-gray-500 bg-gray-50';
  };

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const notificationDate = date instanceof Date ? date : new Date(date);
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notificationDate.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.9)] text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-xl">🔔</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">Notifications</h2>
                {unreadCount > 0 && (
                  <p className="text-white/90 text-sm">{unreadCount} unread</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="border-b border-gray-200 flex">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({teacherNotifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              filter === 'high'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            High Priority
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔕</div>
              <p className="text-gray-500 text-lg">No notifications</p>
              <p className="text-gray-400 text-sm mt-2">
                {filter === 'unread' 
                  ? "You're all caught up!" 
                  : filter === 'high'
                  ? 'No high priority notifications'
                  : 'You have no notifications'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => {
                const notificationId = notification.id || notification._id || '';
                return (
                  <div
                    key={notificationId}
                    onClick={() => handleNotificationClick(notification)}
                    className={`border-l-4 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                      notification.read 
                        ? getNotificationColor(notification.type, notification.priority)
                        : `${getNotificationColor(notification.type, notification.priority)} font-semibold`
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className={`text-sm ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                              {notification.title}
                            </h3>
                            <p className={`text-sm mt-1 ${notification.read ? 'text-gray-600' : 'text-gray-800'}`}>
                              {notification.message}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(notification.createdAt)}
                              </span>
                              {notification.priority === 'high' && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                                  High Priority
                                </span>
                              )}
                            </div>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {filteredNotifications.length > 0 && (
          <div className="border-t border-gray-200 p-4 flex justify-between items-center">
            <button
              onClick={async () => {
                await markAllTeacherNotificationsAsRead();
              }}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Mark all as read
            </button>
            <button
              onClick={refreshTeacherNotifications}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherNotificationCenter;

