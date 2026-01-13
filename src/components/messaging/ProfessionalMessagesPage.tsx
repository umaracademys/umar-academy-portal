/**
 * Professional Messages Page
 * 
 * Institutional messaging interface with two-panel layout.
 * Mobile-first design with drawer navigation.
 * 
 * @module components/messaging/ProfessionalMessagesPage
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../Header';
import ConversationCard from './ConversationCard';
import ProfessionalConversationView from './ProfessionalConversationView';

interface Conversation {
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
}

const ProfessionalMessagesPage: React.FC = () => {
  const { user } = useAuth();
  // Handle API base URL - may or may not include /api
  const API_BASE_RAW = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001';
  const API_BASE = API_BASE_RAW.endsWith('/api') ? API_BASE_RAW : `${API_BASE_RAW}/api`;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'teacher_student' | 'pair_teacher'>('all');
  const [filterUnread, setFilterUnread] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

  useEffect(() => {
    loadConversations();
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
      
      const response = await fetch(`${API_BASE}/conversations?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load conversations');
      }
      
      const data = await response.json();
      const convs = (data.conversations || []).map((conv: any) => ({
        ...conv,
        lastMessage: conv.lastMessageId ? {
          body: conv.lastMessage?.body || '',
          senderName: conv.lastMessage?.senderName || '',
          priority: conv.lastMessage?.priority || 'normal'
        } : undefined
      }));
      setConversations(convs);
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
    
    if (filterUnread) {
      filtered = filtered.filter(conv => conv.unreadCount > 0);
    }
    
    return filtered.sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }, [conversations, searchQuery, filterUnread]);

  const handleConversationSelect = (conv: Conversation) => {
    setSelectedConversation(conv);
    setShowMobileDrawer(false); // Close drawer on mobile
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    setShowMobileDrawer(true); // Show drawer on mobile
    loadConversations(); // Refresh list
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Messages
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {user?.role === 'teacher' && 'Communicate with your students and paired teachers'}
            {user?.role === 'student' && 'Communicate with your teachers'}
            {(user?.role === 'admin' || user?.role === 'superadmin') && 'Monitor and manage all conversations'}
          </p>
        </div>

        {/* Filters Bar */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                aria-label="Search conversations"
              />
            </div>

            {/* Type Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filterType === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('teacher_student')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filterType === 'teacher_student'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Teacher-Student
              </button>
              <button
                onClick={() => setFilterType('pair_teacher')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filterType === 'pair_teacher'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pair Teachers
              </button>
            </div>

            {/* Unread Filter */}
            <button
              onClick={() => setFilterUnread(!filterUnread)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                filterUnread
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unread Only
            </button>
          </div>
        </div>

        {/* Two-Panel Layout (Desktop) / Single Panel (Mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Conversation List */}
          <div className={`
            lg:col-span-1
            ${selectedConversation ? 'hidden lg:block' : 'block'}
          `}>
            <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Conversations ({filteredConversations.length})
              </h2>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-2">No conversations found</p>
                  <p className="text-sm text-gray-500">
                    {searchQuery || filterUnread 
                      ? 'Try adjusting your filters' 
                      : 'Start a new conversation to begin messaging'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {filteredConversations.map((conv) => (
                    <ConversationCard
                      key={conv._id}
                      conversation={conv}
                      onClick={() => handleConversationSelect(conv)}
                      isSelected={selectedConversation?._id === conv._id}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Conversation View */}
          <div className={`
            lg:col-span-2
            ${selectedConversation ? 'block' : 'hidden lg:block'}
          `}>
            {selectedConversation ? (
              <ProfessionalConversationView
                conversation={selectedConversation}
                onBack={handleBackToList}
                onUpdate={loadConversations}
              />
            ) : (
              <div className="bg-white border-2 border-gray-200 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Select a conversation
                </h3>
                <p className="text-gray-600">
                  Choose a conversation from the list to view messages
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalMessagesPage;

