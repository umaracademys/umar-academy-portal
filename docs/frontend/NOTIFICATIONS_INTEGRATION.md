# Notifications Integration Guide

## Overview

This guide explains how to integrate the new fast, real-time Notifications UI into your application.

## Prerequisites

### Install Dependencies

```bash
npm install react-window
# or
pnpm add react-window
```

**Note:** `react-window` is required for virtualized list rendering. It's lightweight (~2KB) and essential for handling large notification lists efficiently.

## Step 1: Add NotificationsProvider to App

Wrap your app with `NotificationsProvider` at the top level:

```tsx
// src/App.tsx
import { NotificationsProvider } from './contexts/NotificationsContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationsProvider>
          {/* Your app content */}
        </NotificationsProvider>
      </AuthProvider>
    </Router>
  );
}
```

**Important:** `NotificationsProvider` must be inside `AuthProvider` because it uses `useAuth()`.

## Step 2: Update Header Component

Replace the existing notification bell in `Header.tsx`:

```tsx
// src/components/Header.tsx
import { useState } from 'react';
import { useNotifications } from '../contexts/NotificationsContext';
import NotificationsDropdown from './NotificationsDropdown';

const Header: React.FC = () => {
  const { unreadCount } = useNotifications();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  return (
    <header>
      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
          className="relative p-2 text-gray-600 hover:text-primary"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        
        {/* Notifications Dropdown */}
        <NotificationsDropdown
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
        />
      </div>
    </header>
  );
};
```

## Step 3: Backend API Endpoints

The frontend expects these endpoints (with fallback to old endpoints):

### New Unified Endpoint (Recommended)
- `GET /api/notifications?recipientRole=admin&limit=20` - Fetch notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read

### Fallback Endpoints (Current)
- `GET /api/admin-notifications?limit=20` - For admins
- `GET /api/teacher-notifications?limit=20` - For teachers
- `PUT /api/admin-notifications/:id/read` - Mark admin notification as read
- `PUT /api/teacher-notifications/:id/read` - Mark teacher notification as read

**Note:** The frontend automatically falls back to old endpoints if new unified endpoints don't exist.

## Step 4: Socket.IO Events

The frontend listens for these Socket.IO events:

### `notification:new`
Emitted when a new notification is created.

**Payload:**
```json
{
  "notification": {
    "_id": "notification_id",
    "recipientId": "user_id",
    "recipientRole": "admin",
    "type": "ticket_created",
    "entityType": "ticket",
    "entityId": "ticket_id",
    "title": "New Ticket",
    "message": "A new ticket has been created",
    "read": false,
    "priority": "high",
    "createdAt": "2025-01-19T10:00:00Z"
  }
}
```

### `notification:updated`
Emitted when a notification is updated (e.g., marked as read).

**Payload:**
```json
{
  "notification": {
    "_id": "notification_id",
    "read": true,
    "readAt": "2025-01-19T10:05:00Z",
    ...
  }
}
```

## Step 5: Backend Socket.IO Integration

In your backend, emit notifications when they're created:

```javascript
// backend/server.js
const Notification = require('./models/Notification');
const { notifyTicketCreated } = require('./utils/notificationHelpers');

// When creating a notification
app.post('/api/tickets', async (req, res) => {
  // ... create ticket ...
  
  // Create notification
  const notifications = await notifyTicketCreated(ticket);
  
  // Emit Socket.IO event for each notification
  notifications.forEach(notification => {
    const recipientId = notification.recipientId.toString();
    const recipientRole = notification.recipientRole;
    
    // Emit to specific user room
    if (recipientRole === 'admin') {
      io.to('admins').emit('notification:new', { notification });
    } else if (recipientRole === 'teacher') {
      io.to(`teacher:${recipientId}`).emit('notification:new', { notification });
    } else if (recipientRole === 'student') {
      io.to(`student:${recipientId}`).emit('notification:new', { notification });
    }
  });
  
  res.json(ticket);
});
```

## Performance Optimizations

### 1. Virtualized Rendering
- Uses `react-window` for efficient list rendering
- Only renders visible items (handles 1M+ notifications)
- Smooth scrolling even with thousands of items

### 2. Optimistic Updates
- Mark as read instantly (no waiting for API)
- New notifications appear immediately via Socket.IO
- Reverts on error

### 3. Minimal Network Requests
- Fetches only 20 notifications initially
- Loads more on scroll (lazy loading)
- No unnecessary refetching
- Socket.IO for real-time updates (no polling)

### 4. Memoization
- Notification items memoized (prevents unnecessary re-renders)
- List data memoized
- Unread count calculated efficiently

## Usage Example

```tsx
import { useNotifications } from '../contexts/NotificationsContext';

function MyComponent() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refreshNotifications
  } = useNotifications();
  
  return (
    <div>
      <p>Unread: {unreadCount}</p>
      <button onClick={markAllAsRead}>Mark All Read</button>
      <ul>
        {notifications.map(notification => (
          <li key={notification.id || notification._id}>
            {notification.title}
            {!notification.read && (
              <button onClick={() => markAsRead(notification.id || notification._id)}>
                Mark as Read
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Troubleshooting

### Notifications not appearing
1. Check Socket.IO connection: `useSocket()` must be connected
2. Verify API endpoint: Check browser network tab
3. Check authentication: Token must be valid
4. Verify recipient role matches user role

### Performance issues
1. Ensure `react-window` is installed
2. Check notification count (should be limited to 20-50)
3. Verify virtualization is working (check React DevTools)

### Duplicate notifications
1. Check backend deduplication (unique index)
2. Verify Socket.IO events aren't duplicated
3. Check notification normalization logic

## Testing

```tsx
// Test notification creation
const { notifications, unreadCount } = useNotifications();
console.log('Notifications:', notifications);
console.log('Unread count:', unreadCount);

// Test mark as read
await markAsRead('notification_id');

// Test mark all as read
await markAllAsRead();

// Test refresh
await refreshNotifications();
```

## Migration Notes

- Old notification components (`AdminNotificationCenter`, `TeacherNotificationCenter`) can coexist
- Gradually migrate to new system
- Old endpoints still work (fallback)
- New unified endpoint recommended for future
