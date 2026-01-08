import React, { useState, useEffect } from 'react';

interface CommonMistake {
  type: string;
  example: string;
  correction: string;
}

interface BroadcastMessage {
  _id: string;
  senderId: string;
  senderName: string;
  category: 'mistakes' | 'announcements' | 'alerts';
  priority: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  commonMistakes?: CommonMistake[];
  recipients: string[];
  recipientType: 'all' | 'selected' | 'active';
  readBy: Array<{ teacherId: string; readAt: Date }>;
  isRead: boolean;
  readAt: Date | null;
  createdAt: string;
  updatedAt: string;
}

interface TeacherBroadcastMessagesProps {
  onClose: () => void;
}

const TeacherBroadcastMessages: React.FC<TeacherBroadcastMessagesProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'mistakes' | 'announcements' | 'alerts' | 'unread'>('all');

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/broadcast-messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setMessages(data);
    } catch (err) {
      console.error('❌ Error fetching broadcast messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/broadcast-messages/${messageId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Update local state
        setMessages(prev => prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, isRead: true, readAt: new Date() }
            : msg
        ));
      }
    } catch (err) {
      console.error('❌ Error marking message as read:', err);
    }
  };

  const handleMessageClick = (message: BroadcastMessage) => {
    if (!message.isRead) {
      markAsRead(message._id);
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (filter === 'unread') return !msg.isRead;
    if (filter === 'all') return true;
    return msg.category === filter;
  });

  const unreadCount = messages.filter(msg => !msg.isRead).length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'mistakes': return 'bg-purple-100 text-purple-800';
      case 'announcements': return 'bg-blue-100 text-blue-800';
      case 'alerts': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Broadcast Messages</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {(['all', 'unread', 'mistakes', 'announcements', 'alerts'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'unread' && unreadCount > 0 && (
                  <span className="ml-2 bg-white text-primary rounded-full px-2 py-0.5 text-xs">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No messages found</p>
              <p className="text-sm mt-2">
                {filter === 'unread' 
                  ? 'All messages have been read'
                  : 'No messages match your filter'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMessages.map((message) => (
                <div
                  key={message._id}
                  onClick={() => handleMessageClick(message)}
                  className={`border-2 rounded-lg p-5 cursor-pointer transition-all hover:shadow-md ${
                    message.isRead
                      ? 'border-gray-200 bg-white'
                      : 'border-primary bg-primary/5'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getCategoryColor(message.category)}`}>
                        {message.category}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(message.priority)}`}>
                        {message.priority}
                      </span>
                      {!message.isRead && (
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(message.createdAt).toLocaleDateString()} {new Date(message.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{message.title}</h3>
                  <p className="text-gray-700 mb-3">{message.message}</p>

                  {/* Common Mistakes */}
                  {message.commonMistakes && message.commonMistakes.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-semibold text-gray-700">Common Mistakes to Watch For:</h4>
                      {message.commonMistakes.map((mistake, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">{mistake.type}</p>
                              {mistake.example && (
                                <p className="text-xs text-gray-600 mt-1">Example: {mistake.example}</p>
                              )}
                              {mistake.correction && (
                                <p className="text-xs text-primary mt-1">Correction: {mistake.correction}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 text-xs text-gray-500">
                    From: {message.senderName}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherBroadcastMessages;

