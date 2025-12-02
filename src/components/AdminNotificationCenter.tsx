import React, { useState, useMemo, useEffect } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { AdminNotification } from '../types';
import { useNavigate } from 'react-router-dom';
import RegistrationRequestModal from './RegistrationRequestModal';

interface AdminNotificationCenterProps {
  onClose: () => void;
}

const AdminNotificationCenter: React.FC<AdminNotificationCenterProps> = ({ onClose }) => {
  const { adminNotifications, markNotificationAsRead, markAllNotificationsAsRead, refreshNotifications, assignments, recitationTickets, recitationReviews } = useBackendData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread' | 'high'>('all');
  const [selectedRegistrationNotification, setSelectedRegistrationNotification] = useState<AdminNotification | null>(null);

  // Refresh notifications when component opens
  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Generate dynamic notifications from current data
  const dynamicNotifications = useMemo(() => {
    const notifications: Array<AdminNotification & { actionUrl?: string; actionLabel?: string }> = [];

    // Pending homework submissions
    const pendingHomework = assignments.filter((assignment: any) => 
      assignment.homework?.enabled && 
      assignment.homework?.submission?.submitted && 
      assignment.homework?.submission?.status === 'submitted'
    );

    pendingHomework.forEach((assignment: any) => {
      notifications.push({
        id: `homework-${assignment.id}`,
        type: 'assignment_submitted' as any,
        title: 'Homework Submission Pending Review',
        message: `${assignment.studentName} submitted homework for assignment. Click to review and grade.`,
        assignmentId: assignment.id,
        studentId: assignment.studentId,
        read: false,
        createdAt: assignment.homework.submission.submittedAt ? new Date(assignment.homework.submission.submittedAt) : new Date(),
        priority: 'high',
        actionUrl: '/assignments',
        actionLabel: 'Review Homework'
      });
    });

    // Pending ticket reviews
    const pendingTickets = recitationTickets.filter(t => t.status === 'submitted');
    pendingTickets.forEach(ticket => {
      notifications.push({
        id: `ticket-${ticket.id}`,
        type: 'recitation_review_pending' as any,
        title: 'Ticket Pending Review',
        message: `${ticket.studentName} - ${ticket.type.toUpperCase()} ticket submitted by ${ticket.assignedTeacherName || 'Teacher'}. Click to review.`,
        recitationReviewId: ticket.id,
        studentId: ticket.studentId,
        read: false,
        createdAt: ticket.submittedAt ? new Date(ticket.submittedAt) : new Date(),
        priority: 'high',
        actionUrl: '/dashboard',
        actionLabel: 'Review Ticket'
      });
    });

    // Pending recitation reviews
    const pendingRecitations = recitationReviews.filter(r => r.status === 'pending_review');
    pendingRecitations.forEach(review => {
      notifications.push({
        id: `recitation-${review.id}`,
        type: 'recitation_review_pending',
        title: 'Recitation Review Pending',
        message: `${review.studentName} - ${review.recitationType.toUpperCase()} recitation submitted by ${review.teacherName}. Click to review.`,
        recitationReviewId: review.id,
        studentId: review.studentId,
        read: false,
        createdAt: review.createdAt,
        priority: 'medium',
        actionUrl: '/dashboard',
        actionLabel: 'Review Recitation'
      });
    });

    return notifications;
  }, [assignments, recitationTickets, recitationReviews]);

  // Combine backend notifications with dynamic ones
  const allNotifications = useMemo(() => {
    const combined = [...adminNotifications, ...dynamicNotifications];
    // Remove duplicates based on ID
    const unique = combined.filter((n, index, self) => 
      index === self.findIndex((t) => t.id === n.id)
    );
    return unique.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [adminNotifications, dynamicNotifications]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return allNotifications.filter(n => !n.read);
    }
    if (filter === 'high') {
      return allNotifications.filter(n => n.priority === 'high');
    }
    return allNotifications;
  }, [allNotifications, filter]);

  const unreadCount = allNotifications.filter(n => !n.read).length;
  const highPriorityCount = allNotifications.filter(n => n.priority === 'high' && !n.read).length;

  const handleNotificationClick = async (notification: AdminNotification & { actionUrl?: string; actionLabel?: string }) => {
    // Mark as read
    if (!notification.read) {
      try {
        // Only mark backend notifications as read (dynamic ones will be filtered out on refresh)
        if (adminNotifications.find(n => n.id === notification.id)) {
          await markNotificationAsRead(notification.id);
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on notification type
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      onClose();
    } else if (notification.type === 'recitation_review_pending' && notification.recitationReviewId) {
      // Navigate to recitation review - this will be handled by the parent component
      onClose();
    } else if (notification.type === 'assignment_submitted' && notification.assignmentId) {
      navigate('/assignments');
      onClose();
    } else if (notification.type === 'profile_update_request' && notification.teacherId) {
      // Navigate to teacher management
      navigate('/dashboard?section=teachers');
      onClose();
    } else if (notification.type === 'student_registration_request') {
      // Show registration request modal
      setSelectedRegistrationNotification(notification);
      // Don't close the notification center, just show the modal
    } else {
      onClose();
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      await refreshNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'recitation_review_pending':
        return '📖';
      case 'assignment_submitted':
        return '📝';
      case 'student_enrolled':
        return '👤';
      case 'payment_received':
        return '💰';
      case 'profile_update_request':
        return '✏️';
      case 'student_registration_request':
        return '📋';
      default:
        return '🔔';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-accent text-primary border-accent font-bold';
      case 'medium':
        return 'bg-primary text-white border-primary font-bold';
      case 'low':
        return 'bg-primary/70 text-white border-primary font-bold';
      default:
        return 'bg-gray-500 text-primary border-gray-600 font-bold';
    }
  };

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col border-4 border-primary">
        {/* Header */}
        <div className="px-6 sm:px-8 py-8 border-b-4 border-accent bg-gradient-to-r from-[#0f1a12] via-primary to-[#0f1a12] shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div className="text-5xl">🔔</div>
                <div>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-lg">
                    Notifications
                  </h2>
                  {unreadCount > 0 && (
                    <div className="mt-2">
                      <span className="px-4 py-2 bg-accent text-primary rounded-full text-base font-extrabold animate-pulse shadow-xl border-2 border-white/30">
                        {unreadCount} NEW
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="px-4 py-2 bg-black/40 backdrop-blur-sm text-white rounded-full text-sm font-bold border-2 border-white/40 shadow-lg">
                  {unreadCount} unread
                </span>
                <span className="px-4 py-2 bg-accent/50 backdrop-blur-sm text-white rounded-full text-sm font-bold border-2 border-accent/60 shadow-lg">
                  {highPriorityCount} high priority
                </span>
                <span className="px-4 py-2 bg-black/40 backdrop-blur-sm text-white rounded-full text-sm font-bold border-2 border-white/40 shadow-lg">
                  {allNotifications.length} total
                </span>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-6 py-3 bg-accent text-primary rounded-full text-base font-bold transition-all shadow-xl hover:scale-110 hover:bg-accent/90 border-2 border-accent/50 whitespace-nowrap"
                >
                  ✓ Mark All Read
                </button>
              )}
              <button
                onClick={onClose}
                className="w-12 h-12 flex items-center justify-center bg-accent text-primary rounded-full transition-all text-2xl font-bold shadow-xl hover:scale-110 hover:bg-accent/90 border-2 border-accent/50"
                title="Close"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 sm:px-8 py-5 border-b-2 border-accent-soft bg-gradient-to-r from-soft-primary to-soft-accent">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-7 py-3 text-base font-bold rounded-full transition-all shadow-lg border-2 ${
                filter === 'all'
                  ? 'bg-[#0f1a12] text-white scale-110 border-primary shadow-xl'
                  : 'bg-white text-primary hover:bg-[#0f1a12] hover:text-white hover:scale-110 border-primary/30'
              }`}
            >
              All ({allNotifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-7 py-3 text-base font-bold rounded-full transition-all shadow-lg border-2 ${
                filter === 'unread'
                  ? 'bg-[#0f1a12] text-white scale-110 border-primary shadow-xl'
                  : 'bg-white text-primary hover:bg-[#0f1a12] hover:text-white hover:scale-110 border-primary/30'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('high')}
              className={`px-7 py-3 text-base font-bold rounded-full transition-all shadow-lg border-2 ${
                filter === 'high'
                  ? 'bg-accent text-primary scale-110 border-accent shadow-xl'
                  : 'bg-white text-accent hover:bg-accent hover:text-primary hover:scale-110 border-accent/30'
              }`}
            >
              High Priority ({highPriorityCount})
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-gradient-to-b from-white to-gray-50">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-8xl mb-6">🔔</div>
              <p className="text-primary text-2xl font-bold mb-3">No notifications</p>
              <p className="text-primary-soft text-base">
                {filter === 'unread' 
                  ? 'All notifications have been read'
                  : filter === 'high'
                  ? 'No high priority notifications'
                  : 'You\'re all caught up!'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left p-5 sm:p-6 rounded-2xl border-4 transition-all transform hover:scale-[1.02] ${
                    notification.read
                      ? 'bg-gray-100 border-gray-300 hover:border-gray-400 shadow-sm'
                      : notification.priority === 'high'
                      ? 'bg-soft-accent border-accent shadow-lg hover:shadow-xl ring-2 ring-accent/30'
                      : notification.priority === 'medium'
                      ? 'bg-soft-primary border-primary shadow-lg hover:shadow-xl ring-2 ring-primary/30'
                      : 'bg-soft-primary border-primary/70 shadow-lg hover:shadow-xl ring-2 ring-primary/20'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="text-4xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className={`text-base sm:text-lg font-bold ${notification.read ? 'text-gray-600' : 'text-primary'}`}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="w-4 h-4 bg-accent rounded-full flex-shrink-0 mt-1 animate-pulse shadow-lg"></span>
                        )}
                      </div>
                      <p className="text-sm text-primary-soft mb-3 line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 ${getPriorityColor(notification.priority)} shadow-md`}>
                          {notification.priority.toUpperCase()}
                        </span>
                        <span className="text-xs text-primary-soft font-medium">
                          {formatDate(notification.createdAt)}
                        </span>
                        {(notification as any).actionLabel && (
                          <span className="text-xs text-primary font-bold bg-primary/10 px-3 py-1 rounded-full">
                            → {(notification as any).actionLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Registration Request Modal */}
      {selectedRegistrationNotification && (
        <RegistrationRequestModal
          notification={selectedRegistrationNotification}
          onClose={() => setSelectedRegistrationNotification(null)}
          onApprove={(notificationId, registrationData) => {
            // Navigate to students page with registration data to create student
            navigate('/students', { state: { registrationData, notificationId } });
            setSelectedRegistrationNotification(null);
            onClose();
          }}
        />
      )}
    </div>
  );
};

export default AdminNotificationCenter;

