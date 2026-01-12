import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AssignmentNotification } from '../types';

interface NotificationCenterProps {
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AssignmentNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock notifications - in real app, this would come from API
  useEffect(() => {
    const mockNotifications: AssignmentNotification[] = [
      {
        id: '1',
        assignmentId: '1',
        studentId: user?.id || '',
        type: 'assignment_created',
        message: 'New assignment: Quran Memorization - Surah Al-Fatiha',
        read: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        id: '2',
        assignmentId: '2',
        studentId: user?.id || '',
        type: 'assignment_due',
        message: 'Assignment due tomorrow: Arabic Grammar Exercise',
        read: false,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      },
      {
        id: '3',
        assignmentId: '3',
        studentId: user?.id || '',
        type: 'assignment_graded',
        message: 'Your assignment has been graded: Islamic Studies Quiz - Grade: 85%',
        read: true,
        createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      }
    ];
    
    setNotifications(mockNotifications);
    setLoading(false);
  }, [user?.id]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assignment_created':
        return '📝';
      case 'assignment_due':
        return '⏰';
      case 'assignment_submitted':
        return '✅';
      case 'assignment_graded':
        return '📊';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'assignment_created':
        return 'bg-blue-50 border-blue-200';
      case 'assignment_due':
        return 'bg-yellow-50 border-yellow-200';
      case 'assignment_submitted':
        return 'bg-green-50 border-green-200';
      case 'assignment_graded':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-3 w-full max-w-xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Mark All Read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-lg"
            >
              ×
            </button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500 text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`p-2.5 rounded border transition ${
                  notification.read 
                    ? 'bg-gray-50 border-gray-200' 
                    : `${getNotificationColor(notification.type)} border-l-2`
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="text-lg flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${
                        notification.read ? 'text-gray-600' : 'text-gray-900'
                      }`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-200"
                      >
                        Read
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="text-gray-400 hover:text-red-500 text-sm"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;


