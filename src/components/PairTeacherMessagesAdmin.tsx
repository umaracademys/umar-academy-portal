import React, { useState, useEffect, useRef } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import Card from './Card';

interface PairTeacherMessagesAdminProps {
  onClose: () => void;
}

interface FileAttachment {
  name: string;
  url: string;
  type: string;
  size?: number;
}

const PairTeacherMessagesAdmin: React.FC<PairTeacherMessagesAdminProps> = ({ onClose }) => {
  const { getPairTeacherMessages, getTeacherPairs } = useBackendData();
  const [messages, setMessages] = useState<any[]>([]);
  const [pairs, setPairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPair, setSelectedPair] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPairs();
  }, []);

  useEffect(() => {
    loadMessages();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, [selectedPair, selectedStudent]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadPairs = async () => {
    try {
      const allPairs = await getTeacherPairs();
      setPairs(allPairs);
    } catch (error) {
      console.error('Error loading pairs:', error);
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const filters: any = {
        adminView: 'true' // Admin can see all messages
      };
      
      if (selectedPair !== 'all') {
        filters.pair = selectedPair;
      }
      
      if (selectedStudent !== 'all') {
        filters.student = selectedStudent;
      }

      const allMessages = await getPairTeacherMessages(filters);
      setMessages(allMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
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

  // Get unique students from messages
  const uniqueStudents = Array.from(
    new Map(
      messages
        .filter(m => m.student)
        .map(m => [m.student._id?.toString() || m.student.toString(), m.student])
    ).values()
  );

  // Group messages by pair
  const messagesByPair = messages.reduce((acc: any, msg: any) => {
    const pairId = msg.pair?._id?.toString() || msg.pair?.toString() || 'unknown';
    if (!acc[pairId]) {
      acc[pairId] = {
        pair: msg.pair,
        messages: []
      };
    }
    acc[pairId].messages.push(msg);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b-2 border-primary px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-primary">Pair Teacher Messages</h2>
            <p className="text-sm text-gray-600 mt-1">
              View all messages between teachers in pairs (Admin View)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b-2 border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-primary mb-1">Filter by Pair</label>
              <select
                value={selectedPair}
                onChange={(e) => setSelectedPair(e.target.value)}
                className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
              >
                <option value="all">All Pairs</option>
                {pairs.map((pair) => (
                  <option key={pair._id} value={pair._id}>
                    {pair.name} ({pair.program})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-primary mb-1">Filter by Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
              >
                <option value="all">All Students</option>
                {uniqueStudents.map((student: any) => (
                  <option key={student._id?.toString() || student.toString()} value={student._id?.toString() || student.toString()}>
                    {student.fullName || 'Student'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 bg-gray-50">
          {loading && messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg font-semibold mb-2">No messages found</p>
              <p className="text-sm">No messages match your current filters.</p>
            </div>
          ) : (
            Object.entries(messagesByPair).map(([pairId, pairData]: [string, any]) => (
              <div key={pairId} className="bg-white rounded-lg border-2 border-gray-200 p-4">
                <div className="mb-4 pb-3 border-b-2 border-gray-200">
                  <h3 className="font-bold text-lg text-primary">{pairData.pair?.name || 'Unknown Pair'}</h3>
                  <p className="text-sm text-gray-600">
                    {pairData.pair?.teacher1?.fullName || 'Teacher 1'} & {pairData.pair?.teacher2?.fullName || 'Teacher 2'}
                    {pairData.pair?.program && ` • ${pairData.pair.program}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {pairData.messages.length} message{pairData.messages.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="space-y-4">
                  {pairData.messages.map((msg: any) => (
                    <div
                      key={msg._id || msg.id}
                      className="rounded-lg p-4 bg-gray-50 border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-600">
                            {msg.fromTeacher?.fullName || 'Teacher'} → {msg.toTeacher?.fullName || 'Teacher'}
                          </span>
                          {!msg.read && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-bold">
                              Unread
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
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
                              className="flex items-center gap-2 p-2 rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition"
                            >
                              <span className="text-lg">{getFileIcon(file.type)}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold truncate">{file.name}</div>
                                {file.size && (
                                  <div className="text-xs text-gray-500">
                                    {formatFileSize(file.size)}
                                  </div>
                                )}
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                      {msg.student && (
                        <div className="mt-2 text-xs text-gray-500">
                          📚 About: {msg.student?.fullName || 'Student'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t-2 border-primary px-6 py-4 rounded-b-2xl">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Total: {messages.length} message{messages.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PairTeacherMessagesAdmin;

