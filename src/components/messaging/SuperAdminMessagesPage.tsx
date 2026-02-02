/**
 * Super Admin Messages Page
 * 
 * Comprehensive admin dashboard for monitoring all conversations.
 * Includes dashboard widgets, admin actions, and conversation management.
 * 
 * @module components/messaging/SuperAdminMessagesPage
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getConversations, getConversationStats, lockConversation, type ConversationListItem } from '../../services/api';
import Header from '../Header';
import ConversationCard from './ConversationCard';
import ProfessionalConversationView from './ProfessionalConversationView';
import AdminDashboardWidgets from './AdminDashboardWidgets';
import NewMessageModal from './NewMessageModal';

type Conversation = ConversationListItem;

const SuperAdminMessagesPage: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [activeTab, setActiveTab] = useState<'teacher_student' | 'pair_teacher' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'urgent'>('all');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [stats, setStats] = useState({
    totalConversations: 0,
    activeConversations: 0,
    unreadMessages: 0,
    highPriorityThreads: 0,
    waitingOver24h: 0
  });

  useEffect(() => {
    loadConversations();
    loadStats();
    const interval = setInterval(() => {
      loadConversations();
      loadStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const convs = await getConversations(activeTab === 'all' ? undefined : { type: activeTab });
      setConversations(convs);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getConversationStats();
      setStats(prev => ({
        ...prev,
        totalConversations: data.totalConversations,
        activeConversations: data.activeConversations,
        unreadMessages: data.unreadMessages,
      }));
    } catch (error) {
      console.error('Error loading stats:', error);
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
    
    if (filterPriority !== 'all') {
      filtered = filtered.filter(conv => 
        conv.lastMessage?.priority === filterPriority
      );
    }
    
    // Calculate waiting over 24h
    const now = Date.now();
    const waitingOver24h = filtered.filter(conv => {
      const lastMessageTime = new Date(conv.lastMessageAt).getTime();
      return (now - lastMessageTime) > 24 * 60 * 60 * 1000;
    });
    
    setStats(prev => ({
      ...prev,
      waitingOver24h: waitingOver24h.length,
      highPriorityThreads: filtered.filter(c => 
        c.lastMessage?.priority === 'high' || c.lastMessage?.priority === 'urgent'
      ).length
    }));
    
    return filtered.sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }, [conversations, searchQuery, filterUnread, filterPriority]);

  const handleConversationSelect = (conv: Conversation) => {
    setSelectedConversation(conv);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    loadConversations();
    loadStats();
  };

  const handleLockConversation = async (conversationId: string, lock: boolean) => {
    try {
      await lockConversation(conversationId, lock);
      loadConversations();
      if (selectedConversation?._id === conversationId) {
        setSelectedConversation({ ...selectedConversation, locked: lock });
      }
    } catch (error) {
      console.error('Error locking conversation:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Messages Administration
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Monitor and manage all conversations across the platform
              </p>
            </div>
            <button
              onClick={() => setShowNewMessageModal(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              + Initiate New Message
            </button>
          </div>
        </div>

        {/* Dashboard Widgets */}
        <AdminDashboardWidgets stats={stats} />

        {/* Tabs */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Conversations
            </button>
            <button
              onClick={() => setActiveTab('teacher_student')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'teacher_student'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Teacher ↔ Student
            </button>
            <button
              onClick={() => setActiveTab('pair_teacher')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'pair_teacher'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Teacher ↔ Teacher
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              />
            </div>
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
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Two-Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Conversation List */}
          <div className={`lg:col-span-1 ${selectedConversation ? 'hidden lg:block' : 'block'}`}>
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
                </div>
              ) : (
                <div className="space-y-3 max-h-[calc(100vh-500px)] overflow-y-auto">
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
          <div className={`lg:col-span-2 ${selectedConversation ? 'block' : 'hidden lg:block'}`}>
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
                  Choose a conversation from the list to view messages and manage settings
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Message Modal */}
      {showNewMessageModal && (
        <NewMessageModal
          onClose={() => setShowNewMessageModal(false)}
          onSuccess={() => {
            setShowNewMessageModal(false);
            loadConversations();
            loadStats();
          }}
        />
      )}
    </div>
  );
};

export default SuperAdminMessagesPage;

