/**
 * Notifications Dropdown Component
 * 
 * Fast, virtualized notification list with real-time updates.
 * 
 * Features:
 * - Virtualized list rendering (react-window) for smooth performance
 * - Real-time Socket.IO integration
 * - Optimistic updates (mark as read instantly)
 * - Unread badge count
 * - Mark all as read
 * - Click to mark as read
 * - Lightweight and fast rendering
 * 
 * @module components/NotificationsDropdown
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useNotifications, Notification } from '../contexts/NotificationsContext';
import { useNavigate } from 'react-router-dom';

interface NotificationsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Notification Item Component (for virtualization)
 * 
 * Renders a single notification item.
 * Optimized for minimal re-renders.
 */
const NotificationItem: React.FC<{
  index: number;
  style: React.CSSProperties;
  data: {
    notifications: Notification[];
    onMarkAsRead: (id: string) => void;
    onNotificationClick: (notification: Notification) => void;
  };
}> = React.memo(({ index, style, data }) => {
  const notification = data.notifications[index];
  
  if (!notification) {
    return null;
  }
  
  const notificationId = notification.id || notification._id;
  const isUnread = !notification.read;
  
  /**
   * Format timestamp (relative time)
   */
  const formatTime = (date: string | Date): string => {
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
    return d.toLocaleDateString();
  };
  
  /**
   * Get priority color
   */
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'normal':
        return 'border-l-blue-500';
      case 'low':
        return 'border-l-gray-400';
      default:
        return 'border-l-gray-400';
    }
  };
  
  /**
   * Get notification icon
   */
  const getIcon = (type: string): string => {
    if (type.includes('ticket')) return '📖';
    if (type.includes('assignment')) return '📝';
    if (type.includes('student')) return '👤';
    if (type.includes('evaluation')) return '📊';
    if (type.includes('message')) return '💬';
    return '🔔';
  };
  
  return (
    <div
      style={style}
      className={`px-3 py-2 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
        isUnread ? 'bg-blue-50' : 'bg-white'
      }`}
      onClick={() => {
        if (isUnread) {
          data.onMarkAsRead(notificationId);
        }
        data.onNotificationClick(notification);
      }}
    >
      <div className="flex items-start gap-2">
        {/* Icon */}
        <div className="text-lg flex-shrink-0 mt-0.5">
          {getIcon(notification.type)}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title and unread indicator */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={`text-sm font-semibold ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
              {notification.title}
            </h4>
            {isUnread && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
            )}
          </div>
          
          {/* Message */}
          <p className={`text-xs mb-1.5 line-clamp-2 ${isUnread ? 'text-gray-800' : 'text-gray-600'}`}>
            {notification.message}
          </p>
          
          {/* Footer: Priority, Time */}
          <div className="flex items-center gap-2 flex-wrap">
            {notification.priority === 'high' && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-800 rounded">
                High
              </span>
            )}
            <span className="text-[10px] text-gray-500">
              {formatTime(notification.createdAt)}
            </span>
          </div>
        </div>
        
        {/* Priority indicator (left border) */}
        <div className={`w-1 h-full ${getPriorityColor(notification.priority)} flex-shrink-0`} />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memoization
  const prevNotification = prevProps.data.notifications[prevProps.index];
  const nextNotification = nextProps.data.notifications[nextProps.index];
  
  if (!prevNotification || !nextNotification) {
    return false;
  }
  
  const prevId = prevNotification.id || prevNotification._id;
  const nextId = nextNotification.id || nextNotification._id;
  
  // Re-render if notification changed
  if (prevId !== nextId) {
    return false;
  }
  
  // Re-render if read status changed
  if (prevNotification.read !== nextNotification.read) {
    return false;
  }
  
  // Re-render if content changed
  if (
    prevNotification.title !== nextNotification.title ||
    prevNotification.message !== nextNotification.message
  ) {
    return false;
  }
  
  return true; // Skip re-render
});

NotificationItem.displayName = 'NotificationItem';

/**
 * Notifications Dropdown Component
 */
const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({ isOpen, onClose }) => {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    hasMore,
    markAsRead,
    markAllAsRead,
    loadMore
  } = useNotifications();
  
  const navigate = useNavigate();
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Virtualization settings
  const ITEM_HEIGHT = 80; // Height of each notification item in pixels
  const MAX_HEIGHT = 400; // Maximum height of dropdown
  const VISIBLE_ITEMS = Math.min(notifications.length, Math.floor(MAX_HEIGHT / ITEM_HEIGHT));
  const LIST_HEIGHT = Math.min(VISIBLE_ITEMS * ITEM_HEIGHT, MAX_HEIGHT);
  
  /**
   * Handle notification click
   */
  const handleNotificationClick = useCallback((notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      markAsRead(notification.id || notification._id);
    }
    
    // Navigate to action URL if available
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      onClose();
    }
  }, [markAsRead, navigate, onClose]);
  
  /**
   * Handle mark all as read
   */
  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
  }, [markAllAsRead]);
  
  /**
   * Memoized list data (prevents unnecessary re-renders)
   */
  const listData = useMemo(() => ({
    notifications,
    onMarkAsRead: markAsRead,
    onNotificationClick: handleNotificationClick
  }), [notifications, markAsRead, handleNotificationClick]);
  
  /**
   * Handle scroll to bottom (load more)
   */
  const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }: any) => {
    if (scrollUpdateWasRequested) {
      return;
    }
    
    // Load more when scrolled near bottom
    const scrollBottom = scrollOffset + LIST_HEIGHT;
    const totalHeight = notifications.length * ITEM_HEIGHT;
    const threshold = totalHeight - LIST_HEIGHT - 100; // 100px before bottom
    
    if (scrollBottom >= threshold && hasMore && !isLoading) {
      loadMore();
    }
  }, [LIST_HEIGHT, notifications.length, hasMore, isLoading, loadMore]);
  
  /**
   * Close on outside click
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) {
    return null;
  }
  
  return (
    <div
      ref={containerRef}
      className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 flex flex-col"
      style={{ maxHeight: MAX_HEIGHT + 60 }} // +60 for header and footer
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-500 text-white rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {error && (
          <div className="px-4 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">
            {error}
          </div>
        )}
        
        {isLoading && notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No notifications
          </div>
        ) : (
          <List
            ref={listRef}
            height={LIST_HEIGHT}
            itemCount={notifications.length}
            itemSize={ITEM_HEIGHT}
            itemData={listData}
            onScroll={handleScroll}
            width="100%"
          >
            {NotificationItem}
          </List>
        )}
        
        {/* Load more indicator */}
        {isLoading && notifications.length > 0 && (
          <div className="px-4 py-2 text-center text-xs text-gray-500 border-t border-gray-100">
            Loading more...
          </div>
        )}
        
        {!hasMore && notifications.length > 0 && (
          <div className="px-4 py-2 text-center text-xs text-gray-400 border-t border-gray-100">
            No more notifications
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsDropdown;
