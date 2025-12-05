import React, { useState, useEffect } from 'react';
import AiSuggestionsInput from './AiSuggestionsInput';
import { useAuth } from '../contexts/AuthContext';

interface EmailModuleProps {
  onClose: () => void;
}

const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';

const EmailModule: React.FC<EmailModuleProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isHtml, setIsHtml] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(false);

  // Check if email is configured
  useEffect(() => {
    const checkEmailConfig = async () => {
      try {
        const token = localStorage.getItem('umar_academy_token');
        const response = await fetch(`${API_BASE}/email/config`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const config = await response.json();
          setEmailConfigured(config.configured);
        }
      } catch (err) {
        console.error('Error checking email config:', err);
      }
    };

    checkEmailConfig();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('umar_academy_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !message.trim()) {
      setError('Please fill in all required fields (To, Subject, Message)');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(null);

    try {
      const emailData = {
        to: to.split(',').map(email => email.trim()).filter(Boolean),
        subject: subject.trim(),
        text: isHtml ? undefined : message.trim(),
        html: isHtml ? message.trim() : undefined,
        cc: cc.trim() ? cc.split(',').map(email => email.trim()).filter(Boolean) : undefined,
        bcc: bcc.trim() ? bcc.split(',').map(email => email.trim()).filter(Boolean) : undefined,
      };

      const response = await fetch(`${API_BASE}/email/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(emailData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setSuccess('Email sent successfully!');
      
      // Clear form after successful send
      setTimeout(() => {
        setTo('');
        setCc('');
        setBcc('');
        setSubject('');
        setMessage('');
        setError(null);
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setTo('');
    setCc('');
    setBcc('');
    setSubject('');
    setMessage('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-1">📧 Email Module</h2>
              <p className="text-blue-100 text-sm">
                Send emails from office@umaracademy.org
                {!emailConfigured && (
                  <span className="ml-2 px-2 py-1 bg-yellow-500 text-yellow-900 rounded text-xs font-semibold">
                    ⚠️ Email not configured - check backend environment variables
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition p-2 hover:bg-white/10 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Email Form */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-semibold">Error: {error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-semibold">✅ {success}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* To Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                To <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com (comma-separated for multiple)"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
            </div>

            {/* CC Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                CC (Optional)
              </label>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com (comma-separated for multiple)"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* BCC Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                BCC (Optional)
              </label>
              <input
                type="text"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="bcc@example.com (comma-separated for multiple)"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Subject Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Message Type Toggle */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHtml}
                  onChange={(e) => setIsHtml(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-700">HTML Format</span>
              </label>
            </div>

            {/* Message Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={isHtml ? "Enter HTML content..." : "Enter your message..."}
                rows={12}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                required
              />
              {isHtml && (
                <p className="text-xs text-gray-500 mt-1">
                  HTML format enabled. You can use HTML tags like &lt;br&gt;, &lt;strong&gt;, &lt;em&gt;, etc.
                </p>
              )}
            </div>

            {/* Email Preview */}
            {message && (
              <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Preview:</h3>
                <div className="bg-white p-4 rounded border border-gray-200">
                  <div className="text-xs text-gray-500 mb-2">
                    <strong>From:</strong> office@umaracademy.org<br />
                    <strong>To:</strong> {to || '(not set)'}<br />
                    {cc && <><strong>CC:</strong> {cc}<br /></>}
                    {bcc && <><strong>BCC:</strong> {bcc}<br /></>}
                    <strong>Subject:</strong> {subject || '(not set)'}
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    {isHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: message }} />
                    ) : (
                      <div className="whitespace-pre-wrap">{message}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition font-semibold"
            disabled={isSending}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !to.trim() || !subject.trim() || !message.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailModule;

