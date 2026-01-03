/**
 * Message Item Component
 * 
 * Professional card-based message display.
 * No chat bubbles - institutional design.
 * 
 * @module components/messaging/MessageItem
 */

import React from 'react';

interface MessageItemProps {
  message: {
    _id: string;
    senderRole: 'teacher' | 'student' | 'admin';
    senderName: string;
    body: string;
    redacted: boolean;
    attachments?: Array<{
      filename: string;
      url: string;
      mimetype: string;
      size: number;
    }>;
    readBy: Array<{
      role: string;
      userId: string;
      readAt: string;
    }>;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    system: boolean;
    createdAt: string;
  };
  isOwnMessage: boolean;
  apiBase: string;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isOwnMessage,
  apiBase
}) => {
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getRoleColor = () => {
    switch (message.senderRole) {
      case 'teacher':
        return 'border-l-blue-500';
      case 'student':
        return 'border-l-green-500';
      case 'admin':
        return 'border-l-purple-500';
      default:
        return 'border-l-gray-400';
    }
  };

  const getRoleBadge = () => {
    switch (message.senderRole) {
      case 'teacher':
        return { text: 'Teacher', bg: 'bg-blue-100', textColor: 'text-blue-800' };
      case 'student':
        return { text: 'Student', bg: 'bg-green-100', textColor: 'text-green-800' };
      case 'admin':
        return { text: 'Admin', bg: 'bg-purple-100', textColor: 'text-purple-800' };
      default:
        return { text: 'User', bg: 'bg-gray-100', textColor: 'text-gray-800' };
    }
  };

  const roleBadge = getRoleBadge();
  const priorityColors = {
    low: 'text-gray-600',
    normal: 'text-gray-800',
    high: 'text-amber-700',
    urgent: 'text-red-700'
  };

  // System message styling
  if (message.system) {
    return (
      <div className="my-3">
        <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-600">🔒</span>
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              System Message
            </span>
          </div>
          <p className="text-sm text-gray-800 font-medium">{message.body}</p>
          <p className="text-xs text-gray-500 mt-2">{formatDate(message.createdAt)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`my-3 ${isOwnMessage ? 'ml-auto max-w-[85%]' : 'mr-auto max-w-[85%]'}`}>
      <div className={`
        bg-white border-2 rounded-lg p-4 shadow-sm
        ${getRoleColor()} border-l-4
        ${message.priority === 'urgent' ? 'bg-red-50' : ''}
        ${message.priority === 'high' ? 'bg-amber-50' : ''}
      `}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 text-xs font-semibold rounded ${roleBadge.bg} ${roleBadge.textColor}`}>
              {roleBadge.text}
            </span>
            <span className="font-semibold text-sm text-gray-900">
              {message.senderName}
            </span>
            {message.priority !== 'normal' && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                message.priority === 'urgent' 
                  ? 'bg-red-200 text-red-800' 
                  : 'bg-amber-200 text-amber-800'
              }`}>
                {message.priority.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Message Body */}
        <div className="mb-2">
          {message.redacted ? (
            <p className="text-sm text-gray-500 italic">
              [Message redacted by administration]
            </p>
          ) : (
            <p className={`text-sm whitespace-pre-wrap break-words ${
              priorityColors[message.priority] || priorityColors.normal
            }`}>
              {message.body}
            </p>
          )}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.attachments.map((att, idx) => (
              <a
                key={idx}
                href={`${apiBase}${att.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
              >
                <span className="text-lg">📎</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {att.filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(att.size)}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{formatDate(message.createdAt)}</span>
            {message.readBy.length > 0 && (
              <span className="text-gray-400">
                • Read by {message.readBy.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;

