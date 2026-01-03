import React, { useState, useEffect, useRef } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import Card from './Card';

interface PairTeacherMessageProps {
  pair: any;
  student?: any;
  currentTeacher: any;
  pairPartner: any;
  onClose: () => void;
}

interface FileAttachment {
  name: string;
  url: string;
  type: string;
  size?: number;
}

const PairTeacherMessage: React.FC<PairTeacherMessageProps> = ({
  pair,
  student,
  currentTeacher,
  pairPartner,
  onClose
}) => {
  const { getPairTeacherMessages, createPairTeacherMessage, markPairTeacherMessageAsRead, markPairTeacherMessagesAsRead, getPairStudents } = useBackendData();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(student || null);
  const [pairStudents, setPairStudents] = useState<any[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentTeacherId = (currentTeacher as any)?._id || (currentTeacher as any)?.teacherDocumentId || currentTeacher?.id;
  const pairPartnerId = (pairPartner as any)?._id || (pairPartner as any)?.teacherDocumentId || pairPartner?.id;
  const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001';

  useEffect(() => {
    loadMessages();
    loadPairStudents();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, [pair?._id, currentTeacherId]);

  const loadPairStudents = async () => {
    if (!pair?._id) return;
    try {
      const students = await getPairStudents({ pair: pair._id, status: 'active' });
      setPairStudents(students);
      // If student prop is provided, find it in the list
      if (student) {
        const found = students.find((s: any) => 
          (s.student?._id?.toString() || s.student?.toString()) === (student._id?.toString() || student.id?.toString())
        );
        if (found) {
          setSelectedStudent(found.student || found);
        }
      }
    } catch (error) {
      console.error('Error loading pair students:', error);
    }
  };

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
        student: selectedStudent?._id || selectedStudent?.id
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    try {
      const fileArray: File[] = Array.from(files);
      const uploadPromises = fileArray.map(async (file: File) => {
        const arrayBuffer = await file.arrayBuffer();
        const apiUrl = API_BASE.endsWith('/api') ? API_BASE.replace('/api', '') : API_BASE;
        
        const response = await fetch(`${apiUrl}/api/pair-teacher-messages/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'X-Filename': file.name
          },
          body: arrayBuffer
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const data = await response.json();
        return {
          name: data.originalName || file.name,
          url: data.url.startsWith('http') ? data.url : `${apiUrl}${data.url}`,
          type: data.type || 'document',
          size: data.size || file.size
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setAttachedFiles(prev => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload files');
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !pair?._id || !currentTeacherId || !pairPartnerId) {
      alert('Please enter a message');
      return;
    }

    setSending(true);
    try {
      await createPairTeacherMessage({
        pair: pair._id,
        fromTeacher: currentTeacherId,
        toTeacher: pairPartnerId,
        student: selectedStudent?._id || selectedStudent?.id || undefined,
        message: message.trim(),
        files: attachedFiles
      });
      
      setMessage('');
      setAttachedFiles([]);
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type === 'image') return '🖼️';
    if (type === 'video') return '🎥';
    if (type === 'audio') return '🎵';
    return '📎';
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
              {selectedStudent && ` • ${selectedStudent.fullName}`}
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
                    <div className={`text-sm whitespace-pre-wrap mb-2 ${
                      isFromCurrentTeacher ? 'text-white/90' : 'text-gray-700'
                    }`}>
                      {msg.message}
                    </div>
                    {msg.files && msg.files.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.files.map((file: FileAttachment, idx: number) => (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 p-2 rounded border ${
                              isFromCurrentTeacher
                                ? 'bg-white/20 border-white/30 text-white hover:bg-white/30'
                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                            } transition`}
                          >
                            <span className="text-lg">{getFileIcon(file.type)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold truncate">{file.name}</div>
                              {file.size && (
                                <div className={`text-xs ${
                                  isFromCurrentTeacher ? 'text-white/70' : 'text-gray-500'
                                }`}>
                                  {formatFileSize(file.size)}
                                </div>
                              )}
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
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
            {/* Optional Student Selection */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                Link to Student (Optional)
              </label>
              <select
                value={selectedStudent?._id || selectedStudent?.id || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const found = pairStudents.find((ps: any) => 
                      (ps.student?._id?.toString() || ps.student?.toString()) === e.target.value
                    );
                    setSelectedStudent(found?.student || found || null);
                  } else {
                    setSelectedStudent(null);
                  }
                }}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
              >
                <option value="">No student (General message)</option>
                {pairStudents.map((ps: any) => {
                  const s = ps.student || ps;
                  const studentId = s._id?.toString() || s.id?.toString();
                  return (
                    <option key={studentId} value={studentId}>
                      {s.fullName}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Message Input */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1">Message *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white min-h-[100px]"
              />
            </div>

            {/* File Attachments */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1">Attach Files (Optional)</label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <div className="flex items-center gap-2">
                <label
                  htmlFor="file-upload"
                  className="px-4 py-2 border-2 border-primary text-primary rounded-lg font-bold hover:bg-soft-primary transition cursor-pointer"
                >
                  📎 Choose Files
                </label>
                {uploadingFiles && (
                  <span className="text-xs text-gray-500">Uploading...</span>
                )}
              </div>
              {attachedFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {attachedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span>{getFileIcon(file.type)}</span>
                        <span className="text-xs font-semibold truncate">{file.name}</span>
                        {file.size && (
                          <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-red-500 hover:text-red-700 text-xs font-bold ml-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={sending || !message.trim() || uploadingFiles}
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
