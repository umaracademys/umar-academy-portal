import React, { useState, useEffect, useRef } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';

interface TeacherStudentMessageProps {
  teacher?: any;
  student?: any;
  onClose: () => void;
  adminView?: boolean;
  adminCanInitiate?: boolean;
}

interface FileAttachment {
  name: string;
  url: string;
  type: string;
  size?: number;
}

const TeacherStudentMessage: React.FC<TeacherStudentMessageProps> = ({
  teacher,
  student,
  onClose,
  adminView = false,
  adminCanInitiate = false
}) => {
  const { getTeacherStudentMessages, createTeacherStudentMessage, markTeacherStudentMessagesAsRead } = useBackendData();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const teacherId = teacher?._id || teacher?.teacherDocumentId || teacher?.id;
  const studentId = student?._id || student?.id;
  const adminId = adminView && user ? (user as any)._id || (user as any).id : null;
  const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001';

  useEffect(() => {
    loadMessages();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, [teacherId, studentId, adminView]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if ((!teacherId && !adminView) || !studentId) return;
    
    setLoading(true);
    try {
      const filters: any = {};
      
      if (adminView) {
        filters.adminView = 'true';
        if (teacherId) filters.teacherId = teacherId;
        if (studentId) filters.studentId = studentId;
      } else {
        if (teacherId) filters.teacherId = teacherId;
        if (studentId) filters.studentId = studentId;
        filters.unreadOnly = false; // Show all messages in conversation
      }

      const allMessages = await getTeacherStudentMessages(filters);
      setMessages(allMessages);
      
      // Mark unread messages as read (if not admin view)
      if (!adminView) {
        const unreadMessages = allMessages.filter((m: any) => {
          if (teacherId) {
            return !m.read && m.toTeacher?._id?.toString() === teacherId?.toString();
          }
          if (studentId) {
            return !m.read && m.toStudent?._id?.toString() === studentId?.toString();
          }
          return false;
        });
        
        if (unreadMessages.length > 0) {
          const unreadIds = unreadMessages.map((m: any) => m._id || m.id);
          const recipientId = teacherId || studentId;
          await markTeacherStudentMessagesAsRead(unreadIds, teacherId, studentId);
        }
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
        
        const response = await fetch(`${apiUrl}/api/teacher-student-messages/upload`, {
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
    if (!message.trim() && attachedFiles.length === 0) {
      alert('Please type a message or attach a file.');
      return;
    }

    // Determine sender and recipient
    let fromTeacher: string | undefined = undefined;
    let toStudent: string | undefined = undefined;
    let fromStudent: string | undefined = undefined;
    let toTeacher: string | undefined = undefined;
    let adminInitiated = false;

    if (adminView && adminCanInitiate) {
      // Admin initiating message
      if (teacherId && studentId) {
        // Admin sending as teacher to student
        fromTeacher = teacherId;
        toStudent = studentId;
        adminInitiated = true;
      }
    } else if (teacherId && studentId) {
      // Teacher sending to student
      fromTeacher = teacherId;
      toStudent = studentId;
    } else if (studentId && teacherId) {
      // Student sending to teacher
      fromStudent = studentId;
      toTeacher = teacherId;
    } else {
      alert('Missing essential information to send message.');
      return;
    }

    setSending(true);
    try {
      const attachments = attachedFiles.map(file => ({
        filename: file.name,
        url: file.url,
        mimetype: file.type === 'image' ? 'image/jpeg' : file.type === 'video' ? 'video/mp4' : 'application/octet-stream',
        size: file.size || 0
      }));

      await createTeacherStudentMessage({
        fromTeacher,
        toStudent,
        fromStudent,
        toTeacher,
        message: message.trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
        adminInitiated,
        adminId: adminInitiated ? adminId : undefined
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

  // Determine if current user is sender
  const isFromCurrentUser = (msg: any) => {
    if (adminView) return false; // Admins don't send as themselves
    if (teacherId) {
      return msg.fromTeacher?._id?.toString() === teacherId?.toString() ||
             msg.fromTeacher?.toString() === teacherId?.toString();
    }
    if (studentId) {
      return msg.fromStudent?._id?.toString() === studentId?.toString() ||
             msg.fromStudent?.toString() === studentId?.toString();
    }
    return false;
  };

  const getSenderName = (msg: any) => {
    if (msg.adminInitiated && msg.adminId) {
      return `Admin (${msg.adminId.fullName || 'Admin'})`;
    }
    if (msg.fromTeacher) {
      return msg.fromTeacher.fullName || 'Teacher';
    }
    if (msg.fromStudent) {
      return msg.fromStudent.fullName || 'Student';
    }
    return 'Unknown';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b-2 border-primary px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-primary">
              {adminView ? 'Message Log (Admin View)' : 'Message'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {teacher && `${teacher.fullName || 'Teacher'}`}
              {teacher && student && ' • '}
              {student && `${student.fullName || 'Student'}`}
              {adminView && ' • Admin Oversight'}
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
              <p className="text-sm">Start the conversation</p>
            </div>
          ) : (
            messages.map((msg: any) => {
              const isFromCurrent = isFromCurrentUser(msg);
              const isUnread = !msg.read && !isFromCurrent && !adminView;

              return (
                <div
                  key={msg._id || msg.id}
                  className={`flex ${isFromCurrent ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-4 shadow-md ${
                      isFromCurrent
                        ? 'bg-primary text-white'
                        : 'bg-white border-2 border-gray-200'
                    } ${isUnread ? 'ring-2 ring-accent' : ''} ${msg.adminInitiated ? 'border-l-4 border-l-blue-500' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold ${
                        isFromCurrent ? 'text-white/80' : 'text-gray-600'
                      }`}>
                        {isFromCurrent ? 'You' : getSenderName(msg)}
                        {msg.adminInitiated && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            Admin
                          </span>
                        )}
                      </span>
                      <span className={`text-xs ${
                        isFromCurrent ? 'text-white/70' : 'text-gray-500'
                      }`}>
                        {formatDate(msg.createdAt)}
                      </span>
                    </div>
                    <div className={`text-sm whitespace-pre-wrap mb-2 ${
                      isFromCurrent ? 'text-white/90' : 'text-gray-700'
                    }`}>
                      {msg.message}
                    </div>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.attachments.map((file: FileAttachment, idx: number) => (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 p-2 rounded border ${
                              isFromCurrent
                                ? 'bg-white/20 border-white/30 text-white hover:bg-white/30'
                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                            } transition`}
                          >
                            <span className="text-lg">{getFileIcon(file.type)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold truncate">{file.name}</div>
                              {file.size && (
                                <div className={`text-xs ${
                                  isFromCurrent ? 'text-white/70' : 'text-gray-500'
                                }`}>
                                  {formatFileSize(file.size)}
                                </div>
                              )}
                            </div>
                          </a>
                        ))}
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

        {/* Message Form (hidden for admin view unless adminCanInitiate) */}
        {(!adminView || adminCanInitiate) && (
          <div className="sticky bottom-0 bg-white border-t-2 border-primary px-6 py-4 rounded-b-2xl">
            <form onSubmit={handleSendMessage} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-primary mb-1">Message *</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white min-h-[100px]"
                />
              </div>

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

              {adminView && adminCanInitiate && (
                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                  ⚠️ You are sending this message as an admin. The recipient will see it as coming from the teacher.
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={sending || (!message.trim() && attachedFiles.length === 0) || uploadingFiles}
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
        )}
      </div>
    </div>
  );
};

export default TeacherStudentMessage;

