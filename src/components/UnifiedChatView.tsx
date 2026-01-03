/**
 * Unified Chat View Component
 * 
 * Displays messages in a conversation with admin monitoring banner.
 * All messages are immutable and auditable.
 * 
 * @module components/UnifiedChatView
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBackendData } from '../contexts/BackendDataContext';

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
  attachments: Array<{
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

interface UnifiedChatViewProps {
  conversation: Conversation;
  onClose: () => void;
}

const UnifiedChatView: React.FC<UnifiedChatViewProps> = ({ conversation, onClose }) => {
  const { user } = useAuth();
  const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001';
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    // Auto-refresh every 30 seconds
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
      const response = await fetch(`${API_BASE}/api/conversations/${conversation._id}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }
      
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<any[]> => {
    if (attachedFiles.length === 0) return [];
    
    setUploadingFiles(true);
    const uploadedFiles = [];
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('umar_academy_token');
      
      for (const file of attachedFiles) {
        // Read file as array buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        
        const response = await fetch(`${API_BASE}/api/conversations/${conversation._id}/messages/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': file.type || 'application/octet-stream'
          },
          body: buffer
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(errorData.error || `Failed to upload ${file.name}`);
        }
        
        const data = await response.json();
        uploadedFiles.push({
          filename: data.filename,
          url: data.url,
          mimetype: data.mimetype || file.type,
          size: data.size || file.size
        });
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    } finally {
      setUploadingFiles(false);
    }
    
    return uploadedFiles;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageBody.trim() && attachedFiles.length === 0) {
      alert('Please enter a message or attach a file');
      return;
    }
    
    if (conversation.locked) {
      alert('This conversation is locked by administration');
      return;
    }
    
    setSending(true);
    try {
      // Upload files first
      const attachments = await uploadFiles();
      
      // Send message
      const token = localStorage.getItem('token') || localStorage.getItem('umar_academy_token');
      const response = await fetch(`${API_BASE}/api/conversations/${conversation._id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          body: messageBody.trim(),
          attachments
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
      
      // Clear form
      setMessageBody('');
      setAttachedFiles([]);
      
      // Reload messages
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
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isOwnMessage = (message: Message) => {
    return message.senderId.toString() === (user?._id || user?.id)?.toString();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border-4 border-primary/30">
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 sm:py-6 border-b-4 border-primary/50 bg-gradient-to-br from-primary to-primary/90">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white truncate">
                {conversation.type === 'teacher_student' ? 'Teacher-Student Conversation' : 'Pair Teacher Conversation'}
              </h2>
              <p className="text-white/90 text-sm mt-1">
                {conversation.participants.filter(p => p.role !== 'admin').map(p => p.name).join(' ↔ ')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full transition-all hover:scale-110 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Admin Monitoring Banner */}
        <div className="px-6 py-3 bg-yellow-50 border-b-2 border-yellow-200">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 text-lg">👁️</span>
            <p className="text-sm font-semibold text-yellow-800">
              This conversation is monitored by administration. All messages are logged and auditable.
            </p>
          </div>
        </div>

        {/* Locked Banner */}
        {conversation.locked && (
          <div className="px-6 py-3 bg-red-50 border-b-2 border-red-200">
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-lg">🔒</span>
              <p className="text-sm font-semibold text-red-800">
              This conversation is locked. No new messages can be sent.
            </p>
          </div>
        </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl p-4 shadow-md ${
                    message.system
                      ? 'bg-yellow-100 border-2 border-yellow-300'
                      : isOwnMessage(message)
                      ? 'bg-primary text-white'
                      : 'bg-white border-2 border-gray-200'
                  }`}>
                    {message.system && (
                      <div className="text-xs font-bold text-yellow-800 mb-1">
                        ⚙️ System Message
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className={`text-xs font-semibold ${
                        message.system ? 'text-yellow-800' : isOwnMessage(message) ? 'text-white/90' : 'text-gray-600'
                      }`}>
                        {message.senderName}
                      </span>
                      {message.priority !== 'normal' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          message.priority === 'urgent'
                            ? 'bg-red-500 text-white'
                            : message.priority === 'high'
                            ? 'bg-orange-500 text-white'
                            : 'bg-blue-500 text-white'
                        }`}>
                          {message.priority.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className={`text-sm ${
                      message.system ? 'text-yellow-900' : isOwnMessage(message) ? 'text-white' : 'text-gray-800'
                    }`}>
                      {message.redacted ? (
                        <span className="italic text-gray-500">[Message redacted by administration]</span>
                      ) : (
                        <div className="whitespace-pre-wrap break-words">{message.body}</div>
                      )}
                    </div>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((att, idx) => (
                          <a
                            key={idx}
                            href={`${API_BASE}${att.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs underline flex items-center gap-1 ${
                              isOwnMessage(message) ? 'text-white/90' : 'text-primary'
                            }`}
                          >
                            📎 {att.filename} ({formatFileSize(att.size)})
                          </a>
                        ))}
                      </div>
                    )}
                    <div className={`text-xs mt-2 ${
                      message.system ? 'text-yellow-700' : isOwnMessage(message) ? 'text-white/70' : 'text-gray-500'
                    }`}>
                      {formatDate(message.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        {!conversation.locked && (
          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t-2 border-gray-200">
            {/* File Attachments Preview */}
            {attachedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm"
                  >
                    <span>📎 {file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-red-600 hover:text-red-800 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={uploadingFiles}
              >
                📎
              </button>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Type your message..."
                rows={2}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                disabled={sending || uploadingFiles}
              />
              <button
                type="submit"
                disabled={sending || uploadingFiles || (!messageBody.trim() && attachedFiles.length === 0)}
                className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending || uploadingFiles ? 'Sending...' : 'Send'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Messages cannot contain email addresses, phone numbers, or external contact information.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default UnifiedChatView;

