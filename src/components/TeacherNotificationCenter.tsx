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

  // Refresh notifications when component opens and periodically (faster refresh)
  useEffect(() => {
    // Load immediately from cache, then refresh in background
    refreshTeacherNotifications();
    
    // Auto-refresh every 15 seconds (faster updates)
    const interval = setInterval(() => {
      refreshTeacherNotifications();
    }, 15000);
    
    return () => clearInterval(interval);
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

  const newCount = useMemo(() => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return teacherNotifications.filter(n => {
      const createdAt = n.createdAt instanceof Date ? n.createdAt : new Date(n.createdAt);
      return createdAt >= oneDayAgo;
    }).length;
  }, [teacherNotifications]);

  const highPriorityCount = useMemo(() => {
    return teacherNotifications.filter(n => n.priority === 'high').length;
  }, [teacherNotifications]);

  const unreadHighPriorityCount = useMemo(() => {
    return teacherNotifications.filter(n => !n.read && n.priority === 'high').length;
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
    if (type.includes('evaluation')) return 'border-l-primary bg-primary/10';
    if (type.includes('message')) return 'border-l-accent bg-accent/10';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Compact Header */}
        <div className="bg-primary text-white px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold">Notifications</h2>
              {unreadCount > 0 && (
                <span className="bg-white/20 text-white text-xs font-semibold px-1.5 py-0.5 rounded">
                  {unreadCount} unread
                </span>
              )}
              {unreadHighPriorityCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded">
                  {unreadHighPriorityCount} high
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors text-lg"
            >
              ×
            </button>
          </div>
        </div>

        {/* Compact Filter Tabs */}
        <div className="border-b border-gray-200 flex">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
              filter === 'all'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({teacherNotifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
              filter === 'unread'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
              filter === 'high'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            High ({highPriorityCount})
          </button>
        </div>

        {/* Compact Notifications List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">
                {filter === 'unread' 
                  ? "You're all caught up!" 
                  : filter === 'high'
                  ? 'No high priority notifications'
                  : 'No notifications'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => {
                const notificationId = notification.id || notification._id || '';
                return (
                  <div
                    key={notificationId}
                    onClick={() => handleNotificationClick(notification)}
                    className={`border-l-2 rounded p-2 cursor-pointer transition-colors hover:bg-gray-50 ${
                      notification.read 
                        ? getNotificationColor(notification.type, notification.priority)
                        : `${getNotificationColor(notification.type, notification.priority)} font-semibold`
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="text-base flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-xs font-medium ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                          {notification.title}
                        </h3>
                        <p className={`text-xs mt-0.5 line-clamp-2 ${notification.read ? 'text-gray-600' : 'text-gray-800'}`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          {notification.priority === 'high' && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                              High
                            </span>
                          )}
                          {!notification.read && (
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
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

        {/* Compact Footer Actions */}
        {filteredNotifications.length > 0 && (
          <div className="border-t border-gray-200 px-2 py-1.5 flex justify-between items-center">
            <button
              onClick={async () => {
                await markAllTeacherNotificationsAsRead();
              }}
              className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
            >
              Mark all read
            </button>
            <button
              onClick={refreshTeacherNotifications}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
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

