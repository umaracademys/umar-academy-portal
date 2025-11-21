import React, { useState, useMemo, useEffect } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { Ticket } from '../types/ticket';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

interface StudentRecordingsProps {
  onClose: () => void;
}

const StudentRecordings: React.FC<StudentRecordingsProps> = ({ onClose }) => {
  const { recitationTickets, refreshData } = useBackendData();
  const { user } = useAuth();
  const { getStudentByEmail } = useData();
  const [selectedRecording, setSelectedRecording] = useState<Ticket | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const currentStudent = getStudentByEmail(user?.email || '');

  // Get student's tickets with recordings
  const studentRecordings = useMemo(() => {
    if (!currentStudent?.id) {
      console.log('⚠️ StudentRecordings: No currentStudent found');
      return [];
    }
    
    console.log('🔍 StudentRecordings: Filtering tickets for student:', currentStudent.id);
    console.log('🔍 Total tickets:', recitationTickets.length);
    console.log('🔍 Tickets with recordings:', recitationTickets.filter(t => t.recordingUrl).length);
    
    const filtered = recitationTickets.filter(ticket => {
      const ticketStudentId = ticket.studentId || (ticket as any)._id?.studentId || (ticket as any).studentId;
      const studentIdStr = String(currentStudent.id);
      const ticketIdStr = String(ticketStudentId || '');
      
      const matchesStudent = ticketIdStr === studentIdStr || 
                            ticketIdStr === currentStudent.id.toString() ||
                            ticket.studentName === currentStudent.fullName ||
                            ticket.studentName === (currentStudent as any).name;
      
      const hasRecording = !!ticket.recordingUrl;
      
      if (matchesStudent && hasRecording) {
        console.log('✅ Found matching recording:', {
          ticketId: ticket.id,
          studentId: ticketStudentId,
          recordingUrl: ticket.recordingUrl
        });
      }
      
      return matchesStudent && hasRecording;
    });
    
    console.log('✅ StudentRecordings: Found', filtered.length, 'recordings for student');
    return filtered;
  }, [recitationTickets, currentStudent]);

  // Filter recordings
  const filteredRecordings = useMemo(() => {
    let filtered = studentRecordings;

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(ticket => ticket.type === filterType);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ticket =>
        ticket.type.toLowerCase().includes(term) ||
        ticket.assignedTeacherName?.toLowerCase().includes(term) ||
        ticket.teacherComment?.toLowerCase().includes(term)
      );
    }

    // Sort by most recent first
    return filtered.sort((a, b) => {
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [studentRecordings, filterType, searchTerm]);

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
    console.log('🔄 StudentRecordings: Component mounted, refreshing data...');
    console.log('👤 Current user:', user?.email, 'Current student:', currentStudent?.fullName);
    refreshData();
  }, [refreshData, user, currentStudent]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-1">🎙️ My Recordings</h2>
              <p className="text-blue-100 text-sm">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search recordings..."
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                {studentRecordings.length === 0 
                  ? 'You don\'t have any recordings yet. Recordings will appear here after your recitation sessions are completed and submitted by your teacher.' 
                  : 'Try adjusting your filters.'}
              </p>
              {!currentStudent && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md mx-auto">
                  <p className="text-sm text-yellow-800">
                    <strong>Debug:</strong> Could not find your student profile. Email: {user?.email || 'Not logged in'}
                  </p>
                </div>
              )}
              {currentStudent && studentRecordings.length === 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
                  <p className="text-sm text-blue-800">
                    <strong>Info:</strong> Found {recitationTickets.filter(t => {
                      const ticketStudentId = t.studentId || (t as any)._id?.studentId;
                      const studentIdStr = String(currentStudent.id);
                      const ticketIdStr = String(ticketStudentId || '');
                      return ticketIdStr === studentIdStr || 
                             t.studentName === currentStudent.fullName ||
                             t.studentName === currentStudent.fullName;
                    }).length} tickets, but none have recordings yet.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecordings.map((ticket) => {
                const recordingUrl = getRecordingUrl(ticket);
                return (
                  <div
                    key={ticket.id}
                    className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-gray-900 text-xl">{ticket.type.toUpperCase()}</h3>
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                            {ticket.assignedTeacherName || 'Unknown Listener'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Submitted: {formatDate(ticket.submittedAt || ticket.createdAt)}
                        </p>
                      </div>
                      <div className="text-3xl">🎙️</div>
                    </div>

                    {/* Recording Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-gray-600">Duration</p>
                        <p className="font-semibold text-gray-900">{formatDuration(ticket.recordingDuration)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Format</p>
                        <p className="font-semibold text-gray-900">{ticket.recordingFormat?.toUpperCase() || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Mistakes</p>
                        <p className="font-semibold text-gray-900">{ticket.mistakes?.length || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Status</p>
                        <p className="font-semibold text-gray-900 capitalize">{ticket.status}</p>
                      </div>
                    </div>

                    {/* Audio Player */}
                    {recordingUrl && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
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

                    {/* Teacher Comment */}
                    {ticket.teacherComment && (
                      <div className="bg-blue-50 rounded-lg p-4 mb-4">
                        <p className="text-sm font-semibold text-blue-900 mb-1">Teacher Comment:</p>
                        <p className="text-sm text-blue-800">{ticket.teacherComment}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                      {recordingUrl && (
                        <a
                          href={recordingUrl}
                          download
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                        >
                          Download Recording
                        </a>
                      )}
                      <button
                        onClick={() => setSelectedRecording(ticket)}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-semibold"
                      >
                        View Details
                      </button>
                    </div>
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
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{selectedRecording.type.toUpperCase()}</h3>
                    <p className="text-blue-100 text-sm mt-1">Recording Details</p>
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
                      <p className="text-sm text-gray-600">Type</p>
                      <p className="font-semibold text-gray-900">{selectedRecording.type.toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Listener</p>
                      <p className="font-semibold text-gray-900">{selectedRecording.assignedTeacherName || 'N/A'}</p>
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
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-semibold text-gray-900 capitalize">{selectedRecording.status}</p>
                    </div>
                  </div>

                  {/* Teacher Comment */}
                  {selectedRecording.teacherComment && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Teacher Comment</p>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-gray-900">{selectedRecording.teacherComment}</p>
                      </div>
                    </div>
                  )}

                  {/* Mistakes */}
                  {selectedRecording.mistakes && selectedRecording.mistakes.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Mistakes Marked ({selectedRecording.mistakes.length})</p>
                      <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                        <div className="space-y-2">
                          {selectedRecording.mistakes.map((mistake, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                                {mistake.type || 'Mistake'}
                              </span>
                              <span className="text-gray-600">
                                Page {mistake.page}
                                {mistake.surah && mistake.ayah && ` • Surah ${mistake.surah}, Ayah ${mistake.ayah}`}
                              </span>
                              {mistake.note && (
                                <span className="text-gray-500 italic">- {mistake.note}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
                {getRecordingUrl(selectedRecording) && (
                  <a
                    href={getRecordingUrl(selectedRecording)!}
                    download
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
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

export default StudentRecordings;

