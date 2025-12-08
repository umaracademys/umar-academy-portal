import React, { useState, useEffect, useRef } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import Card from './Card';
import AiSuggestionsInput from './AiSuggestionsInput';

interface PairTeacherMessageProps {
  pair: any;
  student?: any;
  currentTeacher: any;
  pairPartner: any;
  onClose: () => void;
}

const PairTeacherMessage: React.FC<PairTeacherMessageProps> = ({
  pair,
  student,
  currentTeacher,
  pairPartner,
  onClose
}) => {
  const { getPairTeacherMessages, createPairTeacherMessage, markPairTeacherMessageAsRead, markPairTeacherMessagesAsRead } = useBackendData();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentTeacherId = (currentTeacher as any)?._id || (currentTeacher as any)?.teacherDocumentId || currentTeacher?.id;
  const pairPartnerId = (pairPartner as any)?._id || (pairPartner as any)?.teacherDocumentId || pairPartner?.id;

  useEffect(() => {
    loadMessages();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, [pair?._id, currentTeacherId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!pair?._id || !currentTeacherId) return;
    
    setLoading(true);
    try {
      const allMessages = await getPairTeacherMessages({
        pair: pair._id,
        teacherId: currentTeacherId,
        student: student?._id || student?.id
      });
      setMessages(allMessages);
      
      // Mark unread messages as read
      const unreadMessages = allMessages.filter((m: any) => 
        !m.read && m.toTeacher?._id?.toString() === currentTeacherId?.toString()
      );
      if (unreadMessages.length > 0) {
        const unreadIds = unreadMessages.map((m: any) => m._id || m.id);
        await markPairTeacherMessagesAsRead(unreadIds, currentTeacherId);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || !pair?._id || !currentTeacherId || !pairPartnerId) {
      alert('Please fill in both subject and message');
      return;
    }

    setSending(true);
    try {
      await createPairTeacherMessage({
        pair: pair._id,
        fromTeacher: currentTeacherId,
        toTeacher: pairPartnerId,
        student: student?._id || student?.id || undefined,
        subject: subject.trim(),
        message: message.trim()
      });
      
      setSubject('');
      setMessage('');
      await loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      alert(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b-2 border-primary px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-primary">Message Pair Teacher</h2>
            <p className="text-sm text-gray-600 mt-1">
              {pair?.name} • {pairPartner?.fullName}
              {student && ` • ${student.fullName}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
          {loading && messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg font-semibold mb-2">No messages yet</p>
              <p className="text-sm">Start the conversation with your pair teacher</p>
            </div>
          ) : (
            messages.map((msg: any) => {
              const isFromCurrentTeacher = msg.fromTeacher?._id?.toString() === currentTeacherId?.toString() ||
                                         msg.fromTeacher?.toString() === currentTeacherId?.toString();
              const isUnread = !msg.read && !isFromCurrentTeacher;

              return (
                <div
                  key={msg._id || msg.id}
                  className={`flex ${isFromCurrentTeacher ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-4 shadow-md ${
                      isFromCurrentTeacher
                        ? 'bg-primary text-white'
                        : 'bg-white border-2 border-gray-200'
                    } ${isUnread ? 'ring-2 ring-accent' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold ${
                        isFromCurrentTeacher ? 'text-white/80' : 'text-gray-600'
                      }`}>
                        {isFromCurrentTeacher ? 'You' : msg.fromTeacher?.fullName || 'Teacher'}
                      </span>
                      <span className={`text-xs ${
                        isFromCurrentTeacher ? 'text-white/70' : 'text-gray-500'
                      }`}>
                        {formatDate(msg.createdAt)}
                      </span>
                    </div>
                    <div className={`font-semibold mb-2 ${
                      isFromCurrentTeacher ? 'text-white' : 'text-primary'
                    }`}>
                      {msg.subject}
                    </div>
                    <div className={`text-sm whitespace-pre-wrap ${
                      isFromCurrentTeacher ? 'text-white/90' : 'text-gray-700'
                    }`}>
                      {msg.message}
                    </div>
                    {msg.student && (
                      <div className={`mt-2 text-xs ${
                        isFromCurrentTeacher ? 'text-white/70' : 'text-gray-500'
                      }`}>
                        📚 About: {msg.student?.fullName || 'Student'}
                      </div>
                    )}
                    {isUnread && (
                      <div className="mt-2 text-xs text-accent font-bold">● New</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Form */}
        <div className="sticky bottom-0 bg-white border-t-2 border-primary px-6 py-4 rounded-b-2xl">
          <form onSubmit={handleSendMessage} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-primary mb-1">Subject *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter message subject"
                className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-primary mb-1">Message *</label>
              <AiSuggestionsInput
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                category="general"
                className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white min-h-[100px]"
                required
              />
            </div>
            {student && (
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                💡 This message will be linked to <strong>{student.fullName}</strong>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={sending || !subject.trim() || !message.trim()}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PairTeacherMessage;

