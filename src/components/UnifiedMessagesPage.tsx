/**
 * Unified Messages Page
 * 
 * Role-based messaging interface with admin monitoring.
 * All conversations are visible to administrators.
 * 
 * @module components/UnifiedMessagesPage
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBackendData } from '../contexts/BackendDataContext';
import Header from './Header';
import Card from './Card';
import UnifiedChatView from './UnifiedChatView';

interface Conversation {
  _id: string;
  type: 'teacher_student' | 'pair_teacher';
  participants: Array<{
    role: 'teacher' | 'student' | 'admin';
    userId: string;
    name: string;
    email?: string;
  }>;
  context?: {
    studentId?: string;
    pairId?: string;
    teacherId?: string;
  };
  locked: boolean;
  lastMessageAt: string;
  messageCount: number;
  unreadCount: number;
}

const UnifiedMessagesPage: React.FC = () => {
  const { user } = useAuth();
  const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001';
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'teacher_student' | 'pair_teacher'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadConversations();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, [user, filterType]);

  const loadConversations = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('umar_academy_token');
      const params = new URLSearchParams();
      if (filterType !== 'all') {
        params.append('type', filterType);
      }
      
      const response = await fetch(`${API_BASE}/api/conversations?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load conversations');
      }
      
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = useMemo(() => {
    let filtered = conversations;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => {
        const participantNames = conv.participants
          .map(p => p.name)
          .join(' ')
          .toLowerCase();
        return participantNames.includes(query);
      });
    }
    
    return filtered.sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }, [conversations, searchQuery]);

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
    return d.toLocaleDateString();
  };

  const getConversationTitle = (conv: Conversation) => {
    if (conv.type === 'teacher_student') {
      const teacher = conv.participants.find(p => p.role === 'teacher');
      const student = conv.participants.find(p => p.role === 'student');
      return `${teacher?.name || 'Teacher'} ↔ ${student?.name || 'Student'}`;
    } else {
      const teachers = conv.participants.filter(p => p.role === 'teacher');
      return teachers.map(t => t.name).join(' ↔ ') || 'Pair Teachers';
    }
  };

  const canCreateConversation = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'teacher';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
                Messages
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                {user?.role === 'teacher' && 'Communicate with your students and paired teachers'}
                {user?.role === 'student' && 'Communicate with your teachers'}
                {(user?.role === 'admin' || user?.role === 'superadmin') && 'Monitor and manage all conversations'}
              </p>
            </div>
            
            {canCreateConversation && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                + New Conversation
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  filterType === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('teacher_student')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  filterType === 'teacher_student'
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Teacher-Student
              </button>
              <button
                onClick={() => setFilterType('pair_teacher')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  filterType === 'pair_teacher'
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Pair Teachers
              </button>
            </div>
          </div>
        </div>

        {/* Conversations List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-lg font-semibold text-gray-700 mb-2">No conversations found</p>
              <p className="text-sm text-gray-500">
                {canCreateConversation && 'Start a new conversation to begin messaging'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConversations.map((conv) => (
              <Card key={conv._id}>
                <div
                  onClick={() => setSelectedConversation(conv)}
                  className="cursor-pointer hover:bg-gray-50 transition p-4 rounded-lg border-2 border-transparent hover:border-primary"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-primary truncate">
                        {getConversationTitle(conv)}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          conv.type === 'teacher_student'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {conv.type === 'teacher_student' ? 'Teacher-Student' : 'Pair Teachers'}
                        </span>
                        {conv.locked && (
                          <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800 font-semibold">
                            🔒 Locked
                          </span>
                        )}
                      </div>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{conv.messageCount} message{conv.messageCount !== 1 ? 's' : ''}</span>
                    <span>{formatDate(conv.lastMessageAt)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Chat View Modal */}
      {selectedConversation && (
        <UnifiedChatView
          conversation={selectedConversation}
          onClose={() => {
            setSelectedConversation(null);
            loadConversations(); // Refresh after closing
          }}
        />
      )}
    </div>
  );
};

export default UnifiedMessagesPage;

