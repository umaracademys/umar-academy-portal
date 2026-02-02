/**
 * Notifications Context
 * 
 * Fast, real-time notification management using the unified Notification model.
 * 
 * Features:
 * - Fetches recent notifications (limit 20, max 50)
 * - Real-time Socket.IO integration (listens for "notification:new")
 * - Optimistic updates (new notifications appear instantly)
 * - Minimal network requests (no unnecessary refetching)
 * - Maintains unread count
 * - Provides markAsRead and markAllRead functions
 * 
 * @module contexts/NotificationsContext
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from '../hooks/useSocket';
import { normalizeList } from '../utils/normalizeList';

// API base URL
const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';

/**
 * Unified Notification interface (matches backend Notification model)
 */
export interface Notification {
  _id: string;
  id?: string; // Normalized ID (id or _id)
  recipientId: string;
  recipientRole: 'admin' | 'teacher' | 'student';
  type: string;
  entityType: 'ticket' | 'assignment' | 'student' | 'weekly_evaluation' | 'recitation_review' | 'conversation' | 'message';
  entityId: string;
  title: string;
  message: string;
  actionUrl?: string;
  read: boolean;
  readAt?: string | Date;
  priority: 'low' | 'normal' | 'high';
  createdBy?: string;
  source: 'api' | 'system' | 'manual';
  expiresAt?: string | Date;
  metadata?: Record<string, any>;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface NotificationsContextType {
  // State
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  
  // Actions
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  loadMore: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

/**
 * Hook to access notifications context
 */
export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

interface NotificationsProviderProps {
  children: ReactNode;
  limit?: number; // Default: 20
  maxLimit?: number; // Default: 50
}

/**
 * Notifications Provider
 * 
 * Manages notification state and real-time updates via Socket.IO
 */
export const NotificationsProvider: React.FC<NotificationsProviderProps> = ({ 
  children, 
  limit = 20,
  maxLimit = 50 
}) => {
  const { user, isAuthenticated } = useAuth();
  const socket = useSocket();
  
  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentLimit, setCurrentLimit] = useState(limit);
  
  // Refs to prevent unnecessary re-renders
  const notificationsRef = useRef<Notification[]>([]);
  const socketListenerRef = useRef<boolean>(false);
  const isInitialLoadRef = useRef<boolean>(false);
  
  /**
   * Normalize notification ID (handle both id and _id)
   */
  const normalizeNotification = useCallback((notification: any): Notification => {
    return {
      ...notification,
      id: notification.id || notification._id,
      _id: notification._id || notification.id
    };
  }, []);
  
  /**
   * Fetch notifications from API
   * 
   * @param limit - Number of notifications to fetch
   * @param append - If true, append to existing notifications; if false, replace
   */
  const fetchNotifications = useCallback(async (fetchLimit: number, append: boolean = false) => {
    if (!isAuthenticated || !user) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('umar_academy_token');
      if (!token) {
        throw new Error('No authentication token');
      }
      
      // Use existing role-specific endpoints directly (unified endpoint not yet implemented)
      const endpoint = user.role === 'teacher'
        ? `${API_BASE}/teacher-notifications?limit=${fetchLimit}`
        : `${API_BASE}/admin-notifications?limit=${fetchLimit}`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status}`);
      }
      
      const data = await response.json();
      const rawList = normalizeList(data);
      const normalized: Notification[] = rawList.map(normalizeNotification);
      
      if (append) {
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id || n._id));
          const newNotifications = normalized.filter((n: Notification) => !existingIds.has(n.id || n._id));
          return [...prev, ...newNotifications];
        });
      } else {
        setNotifications(normalized);
        notificationsRef.current = normalized;
      }
      
      setHasMore(normalized.length === fetchLimit && fetchLimit < maxLimit);
      
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, normalizeNotification, maxLimit]);
  
  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!isAuthenticated || !user) {
      return;
    }
    
    // Optimistic update
    setNotifications(prev => {
      const updated = prev.map(n => {
        const id = n.id || n._id;
        if (id === notificationId && !n.read) {
          return { ...n, read: true, readAt: new Date() };
        }
        return n;
      });
      notificationsRef.current = updated;
      return updated;
    });
    
    try {
      const token = localStorage.getItem('umar_academy_token');
      if (!token) {
        throw new Error('No authentication token');
      }
      
      // Use existing role-specific endpoints directly
      const endpoint = user.role === 'teacher'
        ? `${API_BASE}/teacher-notifications/${notificationId}/read`
        : `${API_BASE}/admin-notifications/${notificationId}/read`;
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      // Revert optimistic update on error
      setNotifications(notificationsRef.current);
    }
  }, [isAuthenticated, user]);
  
  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    if (!isAuthenticated || !user) {
      return;
    }
    
    // Optimistic update
    const now = new Date();
    setNotifications(prev => {
      const updated = prev.map(n => n.read ? n : { ...n, read: true, readAt: now });
      notificationsRef.current = updated;
      return updated;
    });
    
    try {
      const token = localStorage.getItem('umar_academy_token');
      if (!token) {
        throw new Error('No authentication token');
      }
      
      // Use existing role-specific endpoints directly
      const endpoint = user.role === 'teacher'
        ? `${API_BASE}/teacher-notifications/read-all`
        : `${API_BASE}/admin-notifications/read-all`;
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      // Revert optimistic update on error
      setNotifications(notificationsRef.current);
    }
  }, [isAuthenticated, user]);
  
  /**
   * Refresh notifications (replaces existing)
   */
  const refreshNotifications = useCallback(async () => {
    setCurrentLimit(limit);
    await fetchNotifications(limit, false);
  }, [fetchNotifications, limit]);
  
  /**
   * Load more notifications (appends to existing)
   */
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) {
      return;
    }
    
    const newLimit = Math.min(currentLimit + limit, maxLimit);
    setCurrentLimit(newLimit);
    await fetchNotifications(newLimit, true);
  }, [isLoading, hasMore, currentLimit, limit, maxLimit, fetchNotifications]);
  
  /**
   * Calculate unread count (memoized)
   */
  const unreadCount = notifications.filter(n => !n.read).length;
  
  /**
   * Initial load on mount
   */
  useEffect(() => {
    if (isAuthenticated && user && !isInitialLoadRef.current) {
      isInitialLoadRef.current = true;
      fetchNotifications(limit, false);
    }
  }, [isAuthenticated, user, fetchNotifications, limit]);
  
  /**
   * Socket.IO real-time updates
   * 
   * Listens for "notification:new" event and appends to notifications
   */
  useEffect(() => {
    if (!socket || !isAuthenticated || !user || socketListenerRef.current) {
      return;
    }
    
    socketListenerRef.current = true;
    
    /**
     * Handle new notification from Socket.IO
     * 
     * Event: "notification:new"
     * Payload: { notification: Notification }
     */
    const handleNewNotification = (data: { notification: Notification }) => {
      if (!data.notification) {
        return;
      }
      
      const newNotification = normalizeNotification(data.notification);
      const notificationId = newNotification.id || newNotification._id;
      
      // Check if notification is for current user
      const recipientRole = user.role === 'superadmin' ? 'admin' : user.role;
      if (newNotification.recipientRole !== recipientRole) {
        return;
      }
      
      // Check if notification already exists (prevent duplicates)
      const exists = notificationsRef.current.some(
        n => (n.id || n._id) === notificationId
      );
      
      if (!exists) {
        // Optimistically add to beginning of list
        setNotifications(prev => {
          const updated = [newNotification, ...prev];
          notificationsRef.current = updated;
          return updated;
        });
      }
    };
    
    /**
     * Handle notification updated (e.g., marked as read)
     * 
     * Event: "notification:updated"
     * Payload: { notification: Notification }
     */
    const handleNotificationUpdated = (data: { notification: Notification }) => {
      if (!data.notification) {
        return;
      }
      
      const updatedNotification = normalizeNotification(data.notification);
      const notificationId = updatedNotification.id || updatedNotification._id;
      
      // Update in local state
      setNotifications(prev => {
        const updated = prev.map(n => {
          const id = n.id || n._id;
          return id === notificationId ? updatedNotification : n;
        });
        notificationsRef.current = updated;
        return updated;
      });
    };
    
    // Register Socket.IO listeners
    socket.on('notification:new', handleNewNotification);
    socket.on('notification:updated', handleNotificationUpdated);
    
    // Cleanup
    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:updated', handleNotificationUpdated);
      socketListenerRef.current = false;
    };
  }, [socket, isAuthenticated, user, normalizeNotification]);
  
  /**
   * Reset on logout
   */
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      notificationsRef.current = [];
      setError(null);
      setHasMore(true);
      setCurrentLimit(limit);
      isInitialLoadRef.current = false;
      socketListenerRef.current = false;
    }
  }, [isAuthenticated, limit]);
  
  const value: NotificationsContextType = {
    notifications,
    unreadCount,
    isLoading,
    error,
    hasMore,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    loadMore
  };
  
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};
