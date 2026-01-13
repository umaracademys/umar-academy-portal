import React, { useState, useMemo, useEffect } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { AdminNotification } from '../types';
import { useNavigate } from 'react-router-dom';
import RegistrationRequestModal from './RegistrationRequestModal';

interface AdminNotificationCenterProps {
  onClose: () => void;
  onOpenTicketReview?: () => void;
  onOpenRecitationReview?: () => void;
}

const AdminNotificationCenter: React.FC<AdminNotificationCenterProps> = ({ onClose, onOpenTicketReview, onOpenRecitationReview }) => {
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
  // High priority count includes both backend high priority and dynamic high priority (homework, tickets)
  const highPriorityCount = useMemo(() => {
    // Backend high priority notifications
    const backendHigh = adminNotifications.filter(n => n.priority === 'high' && !n.read).length;
    
    // Dynamic high priority notifications (homework and tickets are always high priority)
    const pendingHomework = assignments.filter((assignment: any) => 
      assignment.homework?.enabled && 
      assignment.homework?.submission?.submitted && 
      assignment.homework?.submission?.status === 'submitted'
    ).length;
    
    const pendingTickets = recitationTickets.filter(t => t.status === 'submitted').length;
    
    return backendHigh + pendingHomework + pendingTickets;
  }, [adminNotifications, assignments, recitationTickets]);

  const handleNotificationClick = async (notification: AdminNotification & { actionUrl?: string; actionLabel?: string }) => {
    // Mark as read
    if (!notification.read) {
      try {
        // Get the notification ID (handle both id and _id)
        const notificationId = notification.id || (notification as any)._id;
        
        // Only mark backend notifications as read (dynamic ones will be filtered out on refresh)
        // Check if this is a real backend notification (not a dynamic one)
        const backendNotification = adminNotifications.find(n => 
          n.id === notificationId || 
          (n as any)._id === notificationId ||
          n.id === notification.id ||
          (n as any)._id === (notification as any)._id
        );
        
        if (backendNotification && notificationId) {
          await markNotificationAsRead(notificationId);
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on notification type
    // Check for ticket notifications first (before actionUrl check)
    if (notification.type === 'recitation_review_pending' && notification.recitationReviewId) {
      // Check if it's a ticket notification:
      // 1. Dynamic notifications have ID starting with 'ticket-'
      // 2. Backend notifications: check if recitationReviewId exists in recitationTickets array
      const isTicketNotification = notification.id?.startsWith('ticket-') || 
        recitationTickets.some(t => 
          t.id === notification.recitationReviewId || 
          (t as any)._id?.toString() === notification.recitationReviewId ||
          t.id?.toString() === notification.recitationReviewId?.toString()
        );
      
      if (isTicketNotification && onOpenTicketReview) {
        onOpenTicketReview();
        onClose();
        return;
      } else if (onOpenRecitationReview) {
        // Open recitation review modal (for recitation reviews, not tickets)
        onOpenRecitationReview();
        onClose();
        return;
      }
    }
    
    // Handle other notification types
    if (notification.type === 'assignment_submitted' && notification.assignmentId) {
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
    } else if (notification.actionUrl) {
      // Fallback to actionUrl navigation
      navigate(notification.actionUrl);
      onClose();
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Compact Header */}
        <div className="px-3 py-2 bg-primary border-b border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Notifications</h2>
              {unreadCount > 0 && (
                <span className="bg-white/20 text-white text-xs font-semibold px-1.5 py-0.5 rounded">
                  {unreadCount} unread
                </span>
              )}
              {highPriorityCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded">
                  {highPriorityCount} high
                </span>
              )}
            </div>
            <div className="flex gap-1.5 items-center">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-2 py-1 bg-white/20 text-white rounded text-xs font-medium hover:bg-white/30 transition-colors"
                >
                  Mark All Read
                </button>
              )}
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center bg-white/20 text-white rounded transition-colors hover:bg-white/30 text-lg font-bold"
                title="Close"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Compact Filters */}
        <div className="px-2 py-1.5 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              All ({allNotifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                filter === 'unread'
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('high')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                filter === 'high'
                  ? 'bg-accent text-primary'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              High ({highPriorityCount})
            </button>
          </div>
        </div>

        {/* Compact Notifications List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">
                {filter === 'unread' 
                  ? 'All notifications have been read'
                  : filter === 'high'
                  ? 'No high priority notifications'
                  : 'No notifications'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left p-2.5 rounded border transition-colors hover:bg-gray-50 ${
                    notification.read
                      ? 'bg-gray-50 border-gray-200'
                      : notification.priority === 'high'
                      ? 'bg-red-50 border-red-200 border-l-2'
                      : notification.priority === 'medium'
                      ? 'bg-blue-50 border-blue-200 border-l-2'
                      : 'bg-gray-50 border-gray-200 border-l-2'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="text-lg flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`text-xs font-semibold ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0 mt-1"></span>
                        )}
                      </div>
                      <p className="text-xs text-gray-700 mb-1.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                          notification.priority === 'high' ? 'bg-red-100 text-red-800' :
                          notification.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {notification.priority.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(notification.createdAt)}
                        </span>
                        {(notification as any).actionLabel && (
                          <span className="text-xs text-primary font-medium">
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
            // Student is created directly in the modal
            // Just close the modal and refresh notifications
            setSelectedRegistrationNotification(null);
            refreshNotifications();
          }}
        />
      )}
    </div>
  );
};

export default AdminNotificationCenter;

