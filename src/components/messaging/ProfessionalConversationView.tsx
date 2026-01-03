/**
 * Professional Conversation View
 * 
 * Card-based message display with admin monitoring banner.
 * Institutional design - no chat bubbles.
 * 
 * @module components/messaging/ProfessionalConversationView
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import MessageItem from './MessageItem';
import MessageComposer from './MessageComposer';

interface Conversation {
  _id: string;
  type: 'teacher_student' | 'pair_teacher';
  participants: Array<{
    role: 'teacher' | 'student' | 'admin';
    userId: string;
    name: string;
  }>;
  locked: boolean;
}

interface Message {
  _id: string;
  senderRole: 'teacher' | 'student' | 'admin';
  senderId: string;
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
}

interface ProfessionalConversationViewProps {
  conversation: Conversation;
  onBack: () => void;
  onUpdate: () => void;
}

const ProfessionalConversationView: React.FC<ProfessionalConversationViewProps> = ({
  conversation,
  onBack,
  onUpdate
}) => {
  const { user } = useAuth();
  const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001';
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, [conversation._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('umar_academy_token');
      const response = await fetch(`${API_BASE}/api/conversations/${conversation._id}/messages?page=1&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }
      
      const data = await response.json();
      // Reverse to show oldest first (API returns newest first)
      const reversedMessages = (data.messages || []).reverse();
      setMessages(reversedMessages);
      setHasMore((data.messages || []).length === 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageSent = () => {
    loadMessages();
    onUpdate();
  };

  const getParticipantNames = () => {
    const nonAdmin = conversation.participants.filter(p => p.role !== 'admin');
    if (conversation.type === 'teacher_student') {
      const teacher = nonAdmin.find(p => p.role === 'teacher');
      const student = nonAdmin.find(p => p.role === 'student');
      return `${teacher?.name || 'Teacher'} ↔ ${student?.name || 'Student'}`;
    } else {
      const teachers = nonAdmin.filter(p => p.role === 'teacher');
      return teachers.map(t => t.name).join(' ↔ ') || 'Pair Teachers';
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups: Record<string, Message[]>, message: Message) => {
    const date = new Date(message.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg flex flex-col h-[calc(100vh-250px)] min-h-[600px]">
      {/* Header */}
      <div className="border-b-2 border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="lg:hidden p-2 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label="Back to conversations"
            >
              ←
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {getParticipantNames()}
              </h2>
              <div className="flex items-center gap-2 mt-1">
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
                  <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                    Pair Teachers
                  </span>
                )}
                {conversation.locked && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded flex items-center gap-1">
                    🔒 Locked
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Monitoring Banner - Non-dismissible */}
      <div className="bg-yellow-50 border-b-2 border-yellow-300 px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="text-yellow-700 text-xl flex-shrink-0" aria-hidden="true">
            👁️
          </span>
          <div>
            <p className="text-sm font-semibold text-yellow-900">
              This conversation is monitored by administration
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              All messages are logged and auditable. Do not share personal contact information.
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-50"
        role="log"
        aria-label="Conversation messages"
      >
        {loading && messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-2">No messages yet</p>
            <p className="text-sm text-gray-500">Start the conversation by sending a message</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => {
              const messagesForDate = dateMessages as Message[];
              return (
                <div key={date}>
                  {/* Date Separator */}
                  <div className="flex items-center gap-4 my-4">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {date}
                    </span>
                    <div className="flex-1 border-t border-gray-300"></div>
                  </div>

                  {/* Messages for this date */}
                  <div className="space-y-3">
                    {messagesForDate.map((message: Message) => (
                      <MessageItem
                        key={message._id}
                        message={message}
                        isOwnMessage={message.senderId.toString() === (user?._id || user?.id)?.toString()}
                        apiBase={API_BASE}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      {!conversation.locked && (
        <MessageComposer
          conversationId={conversation._id}
          onMessageSent={handleMessageSent}
        />
      )}
    </div>
  );
};

export default ProfessionalConversationView;

