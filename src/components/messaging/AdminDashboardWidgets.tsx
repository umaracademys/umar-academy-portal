/**
 * Admin Dashboard Widgets
 * 
 * Statistics and metrics for admin message monitoring.
 * 
 * @module components/messaging/AdminDashboardWidgets
 */

import React from 'react';

interface AdminDashboardWidgetsProps {
  stats: {
    totalConversations: number;
    activeConversations: number;
    unreadMessages: number;
    highPriorityThreads: number;
    waitingOver24h: number;
  };
}

const AdminDashboardWidgets: React.FC<AdminDashboardWidgetsProps> = ({ stats }) => {
  const widgets = [
    {
      title: 'Total Conversations',
      value: stats.totalConversations,
      icon: '💬',
      color: 'bg-blue-50 border-blue-200 text-blue-900'
    },
    {
      title: 'Active Conversations',
      value: stats.activeConversations,
      icon: '✅',
      color: 'bg-green-50 border-green-200 text-green-900'
    },
    {
      title: 'Unread Messages',
      value: stats.unreadMessages,
      icon: '📬',
      color: 'bg-yellow-50 border-yellow-200 text-yellow-900',
      highlight: stats.unreadMessages > 0
    },
    {
      title: 'High Priority Threads',
      value: stats.highPriorityThreads,
      icon: '⚠️',
      color: 'bg-amber-50 border-amber-200 text-amber-900',
      highlight: stats.highPriorityThreads > 0
    },
    {
      title: 'Waiting > 24h',
      value: stats.waitingOver24h,
      icon: '⏰',
      color: 'bg-red-50 border-red-200 text-red-900',
      highlight: stats.waitingOver24h > 0
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {widgets.map((widget, idx) => (
        <div
          key={idx}
          className={`
            border-2 rounded-lg p-4
            ${widget.color}
            ${widget.highlight ? 'ring-2 ring-offset-2 ring-red-300' : ''}
          `}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl" aria-hidden="true">{widget.icon}</span>
            {widget.highlight && (
              <span className="text-xs font-bold text-red-600">!</span>
            )}
          </div>
          <div className="text-2xl font-bold mb-1">{widget.value}</div>
          <div className="text-xs font-medium opacity-75">{widget.title}</div>
        </div>
      ))}
    </div>
  );
};

export default AdminDashboardWidgets;

