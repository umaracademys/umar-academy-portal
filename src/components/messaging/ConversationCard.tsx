/**
 * Conversation Card Component
 * 
 * Professional card-based conversation preview.
 * Institutional design - no chat bubbles.
 * 
 * @module components/messaging/ConversationCard
 */

import React from 'react';

interface ConversationCardProps {
  conversation: {
    _id: string;
    type: 'teacher_student' | 'pair_teacher';
    participants: Array<{
      role: 'teacher' | 'student' | 'admin';
      userId: string;
      name: string;
    }>;
    locked: boolean;
    lastMessageAt: string;
    messageCount: number;
    unreadCount: number;
    lastMessage?: {
      body: string;
      senderName: string;
      priority: 'low' | 'normal' | 'high' | 'urgent';
    };
  };
  onClick: () => void;
  isSelected?: boolean;
}

const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  onClick,
  isSelected = false
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
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getParticipantNames = () => {
    const nonAdmin = conversation.participants.filter(p => p.role !== 'admin');
    if (conversation.type === 'teacher_student') {
      const teacher = nonAdmin.find(p => p.role === 'teacher');
      const student = nonAdmin.find(p => p.role === 'student');
      return {
        primary: teacher?.name || 'Teacher',
        secondary: student?.name || 'Student',
        display: `${teacher?.name || 'Teacher'} ↔ ${student?.name || 'Student'}`
      };
    } else {
      const teachers = nonAdmin.filter(p => p.role === 'teacher');
      return {
        primary: teachers[0]?.name || 'Teacher 1',
        secondary: teachers[1]?.name || 'Teacher 2',
        display: teachers.map(t => t.name).join(' ↔ ') || 'Pair Teachers'
      };
    }
  };

  const participants = getParticipantNames();
  const priorityColors = {
    low: 'text-gray-500',
    normal: 'text-gray-700',
    high: 'text-amber-700',
    urgent: 'text-red-700'
  };

  const priorityBg = {
    low: 'bg-gray-50',
    normal: 'bg-white',
    high: 'bg-amber-50',
    urgent: 'bg-red-50'
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Conversation with ${participants.display}`}
      className={`
        w-full p-4 border-2 rounded-lg cursor-pointer transition-all
        ${isSelected 
          ? 'border-primary bg-primary/5 shadow-md' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
        ${conversation.unreadCount > 0 ? 'border-l-4 border-l-primary' : ''}
        ${conversation.locked ? 'opacity-75' : ''}
      `}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-semibold text-base truncate ${
              conversation.unreadCount > 0 ? 'font-bold text-gray-900' : 'text-gray-800'
            }`}>
              {participants.display}
            </h3>
            {conversation.locked && (
              <span className="text-red-600 text-sm" aria-label="Conversation locked">
                🔒
              </span>
            )}
          </div>
          
          {/* Role Badges */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {conversation.type === 'teacher_student' ? (
              <>
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  Teacher
                </span>
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                  Student
                </span>
              </>
            ) : (
              <>
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                  Pair Teachers
                </span>
              </>
            )}
          </div>
        </div>

        {/* Unread Badge */}
        {conversation.unreadCount > 0 && (
          <div className="ml-2 flex-shrink-0">
            <span 
              className="px-2.5 py-1 bg-primary text-white text-xs font-bold rounded-full"
              aria-label={`${conversation.unreadCount} unread messages`}
            >
              {conversation.unreadCount}
            </span>
          </div>
        )}
      </div>

      {/* Last Message Preview */}
      {conversation.lastMessage && (
        <div className={`mb-2 p-2 rounded ${
          priorityBg[conversation.lastMessage.priority] || priorityBg.normal
        }`}>
          <p className={`text-sm line-clamp-2 ${
            conversation.unreadCount > 0 ? 'font-medium' : 'font-normal'
          } ${priorityColors[conversation.lastMessage.priority] || priorityColors.normal}`}>
            <span className="font-semibold">{conversation.lastMessage.senderName}:</span>{' '}
            {conversation.lastMessage.body}
          </p>
          {conversation.lastMessage.priority !== 'normal' && (
            <span className={`text-xs font-semibold mt-1 inline-block ${
              priorityColors[conversation.lastMessage.priority]
            }`}>
              {conversation.lastMessage.priority.toUpperCase()}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
        <span>{conversation.messageCount} message{conversation.messageCount !== 1 ? 's' : ''}</span>
        <span>{formatDate(conversation.lastMessageAt)}</span>
      </div>
    </div>
  );
};

export default ConversationCard;

