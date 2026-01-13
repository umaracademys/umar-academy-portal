/**
 * Message Composer Component
 * 
 * Professional message input with attachment support.
 * Keyboard shortcuts: Ctrl/Cmd + Enter to send.
 * 
 * @module components/messaging/MessageComposer
 */

import React, { useState, useRef, useEffect } from 'react';

interface MessageComposerProps {
  conversationId: string;
  onMessageSent: () => void;
}

const MessageComposer: React.FC<MessageComposerProps> = ({
  conversationId,
  onMessageSent
}) => {
  // Handle API base URL - may or may not include /api
  const API_BASE_RAW = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001';
  const API_BASE = API_BASE_RAW.endsWith('/api') ? API_BASE_RAW : `${API_BASE_RAW}/api`;
  const [messageBody, setMessageBody] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const maxLength = 5000;
  const remainingChars = maxLength - messageBody.length;

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [messageBody]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<Array<{ filename: string; url: string; mimetype: string; size: number }>> => {
    if (attachedFiles.length === 0) return [];
    
    setUploadingFiles(true);
    const uploadedFiles: Array<{ filename: string; url: string; mimetype: string; size: number }> = [];
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('umar_academy_token');
      
      for (const file of attachedFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        
        const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages/upload`, {
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

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!messageBody.trim() && attachedFiles.length === 0) {
      return;
    }
    
    if (messageBody.length > maxLength) {
      alert(`Message exceeds ${maxLength} characters`);
      return;
    }
    
    setSending(true);
    try {
      // Upload files first
      const attachments = await uploadFiles();
      
      // Send message
      const token = localStorage.getItem('token') || localStorage.getItem('umar_academy_token');
      const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
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
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      // Notify parent
      onMessageSent();
    } catch (error) {
      console.error('Error sending message:', error);
      alert(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="border-t-2 border-gray-200 p-4 bg-white">
      {/* File Attachments Preview */}
      {attachedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachedFiles.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm"
            >
              <span>📎</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="text-red-600 hover:text-red-800 font-bold text-lg"
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSend} className="flex gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
          disabled={sending || uploadingFiles}
          aria-label="Attach file"
        >
          📎
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
          aria-label="File input"
        />
        
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Ctrl/Cmd + Enter to send)"
            rows={1}
            maxLength={maxLength}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none text-sm"
            disabled={sending || uploadingFiles}
            aria-label="Message input"
            aria-describedby="char-count"
          />
          <div
            id="char-count"
            className={`absolute bottom-1 right-2 text-xs ${
              remainingChars < 100 ? 'text-red-600' : 'text-gray-400'
            }`}
          >
            {remainingChars}
          </div>
        </div>
        
        <button
          type="submit"
          disabled={
            sending || 
            uploadingFiles || 
            (!messageBody.trim() && attachedFiles.length === 0) ||
            messageBody.length > maxLength
          }
          className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          aria-label="Send message"
        >
          {sending || uploadingFiles ? 'Sending...' : 'Send'}
        </button>
      </form>

      {/* Helper Text */}
      <p id="help-text" className="text-xs text-gray-500 mt-2">
        Messages cannot contain email addresses, phone numbers, or external contact information.
      </p>
    </div>
  );
};

export default MessageComposer;

