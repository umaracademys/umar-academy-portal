import React, { useState, useMemo, useEffect } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { Ticket } from '../types/ticket';

interface AdminRecordingsProps {
  onClose: () => void;
}

const AdminRecordings: React.FC<AdminRecordingsProps> = ({ onClose }) => {
  const { recitationTickets, refreshData } = useBackendData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [selectedListener, setSelectedListener] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedTicketType, setSelectedTicketType] = useState<string>('all');
  const [selectedRecording, setSelectedRecording] = useState<Ticket | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  // Get all tickets with recordings
  const ticketsWithRecordings = useMemo(() => {
    const filtered = recitationTickets.filter(ticket => ticket.recordingUrl);
    console.log('🔍 AdminRecordings: Total tickets:', recitationTickets.length);
    console.log('🔍 AdminRecordings: Tickets with recordings:', filtered.length);
    filtered.forEach(t => {
      console.log('  -', t.studentName, t.type, 'recording:', t.recordingUrl);
    });
    return filtered;
  }, [recitationTickets]);

  // Get unique students and listeners
  const uniqueStudents = useMemo(() => {
    return Array.from(new Set(ticketsWithRecordings.map(t => t.studentName))).sort();
  }, [ticketsWithRecordings]);

  const uniqueListeners = useMemo(() => {
    return Array.from(new Set(
      ticketsWithRecordings
        .map(t => t.assignedTeacherName)
        .filter(Boolean)
    )).sort();
  }, [ticketsWithRecordings]);

  // Filter recordings
  const filteredRecordings = useMemo(() => {
    let filtered = ticketsWithRecordings;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ticket =>
        ticket.studentName.toLowerCase().includes(term) ||
        ticket.assignedTeacherName?.toLowerCase().includes(term) ||
        ticket.type.toLowerCase().includes(term)
      );
    }

    // Student filter
    if (selectedStudent !== 'all') {
      filtered = filtered.filter(ticket => ticket.studentName === selectedStudent);
    }

    // Listener filter
    if (selectedListener !== 'all') {
      filtered = filtered.filter(ticket => ticket.assignedTeacherName === selectedListener);
    }

    // Ticket type filter
    if (selectedTicketType !== 'all') {
      filtered = filtered.filter(ticket => ticket.type === selectedTicketType);
    }

    // Date range filter
    if (selectedDateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (selectedDateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(ticket => {
        const ticketDate = ticket.submittedAt 
          ? new Date(ticket.submittedAt) 
          : ticket.createdAt 
          ? new Date(ticket.createdAt)
          : null;
        return ticketDate && ticketDate >= filterDate;
      });
    }

    // Sort by most recent first
    return filtered.sort((a, b) => {
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [ticketsWithRecordings, searchTerm, selectedStudent, selectedListener, selectedDateRange, selectedTicketType]);

  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRecordingUrl = (ticket: Ticket) => {
    if (!ticket.recordingUrl) return null;
    const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
    // If it's already a full URL, return as is, otherwise prepend API base
    if (ticket.recordingUrl.startsWith('http')) {
      return ticket.recordingUrl;
    }
    return `${API_BASE.replace('/api', '')}${ticket.recordingUrl}`;
  };

  useEffect(() => {
    console.log('🔄 AdminRecordings: Component mounted');
    console.log('📊 Current state:', {
      totalTickets: recitationTickets.length,
      ticketsWithRecordings: ticketsWithRecordings.length,
      sampleTickets: recitationTickets.slice(0, 3).map(t => ({
        id: t.id,
        studentName: t.studentName,
        recordingUrl: t.recordingUrl,
        type: t.type
      }))
    });
  }, [recitationTickets.length]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-1">🎙️ Recordings Library</h2>
              <p className="text-purple-100 text-sm">
                {filteredRecordings.length} recording{filteredRecordings.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition p-2 hover:bg-white/10 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by student, listener, or type..."
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* Student Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Students</option>
                {uniqueStudents.map(student => (
                  <option key={student} value={student}>{student}</option>
                ))}
              </select>
            </div>

            {/* Listener Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Listener</label>
              <select
                value={selectedListener}
                onChange={(e) => setSelectedListener(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Listeners</option>
                {uniqueListeners.map(listener => (
                  <option key={listener} value={listener}>{listener}</option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date Range</label>
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value as any)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>
            </div>
          </div>

          {/* Additional Filters */}
          <div className="mt-4 flex gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Ticket Type</label>
              <select
                value={selectedTicketType}
                onChange={(e) => setSelectedTicketType(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Types</option>
                <option value="sabq">Sabq</option>
                <option value="sabqi">Sabqi</option>
                <option value="manzil">Manzil</option>
              </select>
            </div>
          </div>
        </div>

        {/* Recordings List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredRecordings.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎙️</div>
              <p className="text-gray-600 text-lg">No recordings found</p>
              <p className="text-gray-500 text-sm mt-2">
                {ticketsWithRecordings.length === 0 
                  ? 'No recordings have been submitted yet. Recordings will appear here automatically when teachers submit tickets with recordings.' 
                  : 'Try adjusting your filters.'}
              </p>
              {ticketsWithRecordings.length === 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
                  <p className="text-sm text-blue-800">
                    <strong>Info:</strong> Found {recitationTickets.length} total tickets, but none have recordings yet.
                    <br />
                    Recordings are created automatically when teachers open and submit tickets.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecordings.map((ticket) => {
                const recordingUrl = getRecordingUrl(ticket);
                return (
                  <div
                    key={ticket.id}
                    className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => setSelectedRecording(ticket)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg mb-1">{ticket.studentName}</h3>
                        <p className="text-sm text-gray-600">
                          {ticket.type.toUpperCase()} • {ticket.assignedTeacherName || 'Unknown Listener'}
                        </p>
                      </div>
                      <div className="text-2xl">🎙️</div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Duration:</span>
                        <span>{formatDuration(ticket.recordingDuration)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Submitted:</span>
                        <span>{formatDate(ticket.submittedAt || ticket.createdAt)}</span>
                      </div>
                      {ticket.recordingFormat && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Format:</span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{ticket.recordingFormat.toUpperCase()}</span>
                        </div>
                      )}
                    </div>

                    {recordingUrl && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <audio
                          controls
                          className="w-full"
                          src={recordingUrl}
                          onPlay={() => setPlayingUrl(recordingUrl)}
                          onPause={() => setPlayingUrl(null)}
                        >
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (recordingUrl) {
                          window.open(recordingUrl, '_blank');
                        }
                      }}
                      className="mt-3 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-semibold"
                    >
                      View Details
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recording Detail Modal */}
        {selectedRecording && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{selectedRecording.studentName}</h3>
                    <p className="text-purple-100 text-sm mt-1">
                      {selectedRecording.type.toUpperCase()} Recording
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedRecording(null)}
                    className="text-white/80 hover:text-white transition p-2 hover:bg-white/10 rounded-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {/* Recording Player */}
                  {getRecordingUrl(selectedRecording) && (
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h4 className="font-semibold text-gray-900 mb-4">Audio Recording</h4>
                      <audio
                        controls
                        className="w-full"
                        src={getRecordingUrl(selectedRecording)!}
                        autoPlay={false}
                      >
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}

                  {/* Recording Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Student</p>
                      <p className="font-semibold text-gray-900">{selectedRecording.studentName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Listener</p>
                      <p className="font-semibold text-gray-900">{selectedRecording.assignedTeacherName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Type</p>
                      <p className="font-semibold text-gray-900">{selectedRecording.type.toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-semibold text-gray-900">{formatDuration(selectedRecording.recordingDuration)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Submitted</p>
                      <p className="font-semibold text-gray-900">{formatDate(selectedRecording.submittedAt || selectedRecording.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Format</p>
                      <p className="font-semibold text-gray-900">{selectedRecording.recordingFormat?.toUpperCase() || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Teacher Comment */}
                  {selectedRecording.teacherComment && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Teacher Comment</p>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-900">{selectedRecording.teacherComment}</p>
                      </div>
                    </div>
                  )}

                  {/* Mistakes Count */}
                  {selectedRecording.mistakes && selectedRecording.mistakes.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Mistakes Marked</p>
                      <p className="font-semibold text-gray-900">{selectedRecording.mistakes.length} mistake(s)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
                {getRecordingUrl(selectedRecording) && (
                  <a
                    href={getRecordingUrl(selectedRecording)!}
                    download
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                  >
                    Download Recording
                  </a>
                )}
                <button
                  onClick={() => setSelectedRecording(null)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRecordings;

