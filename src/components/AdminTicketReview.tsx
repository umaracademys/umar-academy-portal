import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Ticket } from '../types/ticket';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import Card from './Card';
import { useAutoRecording } from '../hooks/useAutoRecording';
import TicketCreationForm from './TicketCreationForm';

interface AdminTicketReviewProps {
  onClose: () => void;
}

const AdminTicketReview: React.FC<AdminTicketReviewProps> = ({ onClose }) => {
  const { recitationTickets, approveAndSendTicket, reassignTicket, teachers, refreshData, updateRecitationTicket, loading } = useBackendData();
  const { user } = useAuth();
  
  // Refresh data when component mounts to ensure tickets are loaded
  useEffect(() => {
    // Only refresh if we don't have tickets yet
    if (recitationTickets.length === 0) {
      console.log('🔄 AdminTicketReview: No tickets found, refreshing data...');
      refreshData();
    } else {
      console.log('✅ AdminTicketReview: Tickets already loaded, skipping refresh');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount
  
  // Simple state management
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mushafPage, setMushafPage] = useState(1);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  
  // Recording state
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const recordingStartedAtRef = useRef<Date | null>(null);
  
  const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
  
  const {
    isRecording,
    recordingTime,
    audioBlob,
    error: recordingError,
    hasPermission,
    startRecording,
    stopRecording
  } = useAutoRecording({
    autoStart: false,
    onRecordingComplete: async (blob, duration) => {
      console.log(`✅ Admin recording completed: ${duration} seconds, ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
      setRecordingBlob(blob);
      setRecordingDuration(duration);
    },
    onError: (err) => {
      console.error('❌ Admin recording error:', err);
    }
  });

  // Get pending tickets (submitted by teachers)
  const pendingTickets = useMemo(() => {
    const filtered = recitationTickets.filter(t => t.status === 'submitted');
    console.log('📋 AdminTicketReview: Total tickets:', recitationTickets.length);
    console.log('📋 AdminTicketReview: Pending tickets (submitted):', filtered.length);
    console.log('📋 AdminTicketReview: All ticket statuses:', recitationTickets.map(t => ({ id: t.id, status: t.status, student: t.studentName })));
    return filtered;
  }, [recitationTickets]);

  // Get sent tickets (sent by admin, excluding reassigned and approved ones)
  const sentTickets = useMemo(() => {
    if (!user?.id) return [];
    return recitationTickets.filter(t => {
      // Show tickets that are pending (not yet approved)
      // Exclude tickets that have been reassigned (status === 'reassigned')
      // Exclude tickets that have been approved (have sentToAssignmentId)
      // Only show tickets created by current admin
      return (
        t.status === 'pending' &&
        !t.sentToAssignmentId && // Exclude approved tickets
        t.createdBy === user.id
      );
    });
  }, [recitationTickets, user?.id]);

  // Get selected ticket - search in all tickets, not just pending
  const selectedTicket = useMemo(() => {
    if (!selectedTicketId) return null;
    const ticket = recitationTickets.find(t => t.id === selectedTicketId);
    console.log('🔍 Looking for ticket:', selectedTicketId);
    console.log('🔍 Found ticket:', ticket ? { id: ticket.id, status: ticket.status, student: ticket.studentName } : 'NOT FOUND');
    return ticket || null;
  }, [selectedTicketId, recitationTickets]);

  // Initialize mushaf page when ticket is selected
  useEffect(() => {
    if (selectedTicket?.mistakes && selectedTicket.mistakes.length > 0) {
      const firstMistake = selectedTicket.mistakes[0];
      if (firstMistake?.page) {
        setMushafPage(firstMistake.page);
      }
    }
  }, [selectedTicket]);
  
  // Start recording when ticket is selected (Mushaf view is shown)
  useEffect(() => {
    if (selectedTicket && !isRecording && !recordingBlob) {
      console.log('🎙️ Starting admin recording for ticket:', selectedTicket.id);
      recordingStartedAtRef.current = new Date();
      startRecording();
    }
  }, [selectedTicket, isRecording, recordingBlob, startRecording]);
  
  // Upload recording helper
  const uploadRecording = async (blob: Blob): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('recording', blob, `recording-${Date.now()}.${blob.type.includes('webm') ? 'webm' : 'mp4'}`);
      
      const response = await fetch(`${API_BASE}/recordings/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload recording');
      }
      
      const data = await response.json();
      return data.url || null;
    } catch (error) {
      console.error('Error uploading recording:', error);
      return null;
    }
  };

  const handleTicketClick = (ticketId: string) => {
    console.log('🎫 Clicking ticket:', ticketId);
    console.log('🎫 Available tickets:', recitationTickets.map(t => ({ id: t.id, status: t.status, student: t.studentName })));
    console.log('🎫 Pending tickets:', pendingTickets.map(t => ({ id: t.id, status: t.status, student: t.studentName })));
    
    // Find ticket in all tickets, not just pending
    const ticket = recitationTickets.find(t => t.id === ticketId);
    if (!ticket) {
      console.error('❌ Ticket not found:', ticketId);
      alert('Ticket not found. Please refresh and try again.');
      return;
    }
    
    console.log('✅ Found ticket:', ticket);
    setSelectedTicketId(ticketId);
  };

  const handleBackToList = () => {
    setSelectedTicketId(null);
    setShowReassignModal(false);
  };

  const handleApproveAndSend = async () => {
    if (!selectedTicket || !user?.id) {
      alert('You must be logged in to approve tickets');
      return;
    }

    setIsProcessing(true);
    
    // Stop recording if still recording
    let recordingUrl: string | null = null;
    let recordingFormat: string | null = null;
    let recordingDurationFinal: number | null = null;
    let recordingStartedAtFinal: Date | null = null;
    let recordingStoppedAtFinal: Date | null = null;
    
    try {
      if (isRecording) {
        console.log('🎙️ Stopping admin recording before approval...');
        stopRecording();
        // Give a small delay for the onRecordingComplete callback to fire
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Upload recording if available
      const blobToUpload = recordingBlob || audioBlob;
      if (blobToUpload) {
        recordingStartedAtFinal = recordingStartedAtRef.current;
        recordingStoppedAtFinal = new Date();
        recordingDurationFinal = recordingDuration || Math.floor((recordingStoppedAtFinal.getTime() - (recordingStartedAtFinal?.getTime() || Date.now())) / 1000);
        
        console.log('📤 Uploading admin recording with metadata:', {
          duration: recordingDurationFinal,
          startedAt: recordingStartedAtFinal?.toISOString(),
          stoppedAt: recordingStoppedAtFinal.toISOString(),
          blobSize: blobToUpload.size
        });
        
        recordingUrl = await uploadRecording(blobToUpload);
        recordingFormat = blobToUpload.type.includes('webm') ? 'webm' : 'mp4';
        
        if (recordingUrl) {
          console.log('✅ Admin recording uploaded successfully:', recordingUrl);
        } else {
          console.warn('⚠️ Recording upload failed, but continuing with approval without recording URL.');
        }
      }
      
      console.log('✅ Approving ticket:', selectedTicket.id, 'Type:', selectedTicket.type);
      const result = await approveAndSendTicket(selectedTicket.id, '');
      console.log('✅ Approval result:', result);
      
      // Show success message with details
      const assignment = (result as any).assignment;
      const message = `Ticket approved and sent to assignment!\n\n` +
        `Assignment ID: ${assignment?.id || 'N/A'}\n` +
        `Classwork entries added:\n` +
        `- Sabq: ${Array.isArray(assignment?.classwork?.sabq) ? assignment.classwork.sabq.length : 0}\n` +
        `- Sabqi: ${Array.isArray(assignment?.classwork?.sabqi) ? assignment.classwork.sabqi.length : 0}\n` +
        `- Manzil: ${Array.isArray(assignment?.classwork?.manzil) ? assignment.classwork.manzil.length : 0}` +
        (recordingUrl ? `\n\n🎙️ Recording saved to library` : '');
      
      alert(message);
      
      // Reset recording state
      setRecordingBlob(null);
      setRecordingDuration(0);
      recordingStartedAtRef.current = null;
      
      await refreshData();
      setSelectedTicketId(null);
    } catch (error) {
      console.error('Error approving ticket:', error);
      alert('Failed to approve ticket: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedTicket || !selectedTeacherId) {
      alert('Please select a teacher to reassign to');
      return;
    }

    const teacher = teachers.find(t => t.id === selectedTeacherId);
    if (!teacher) {
      alert('Selected teacher not found');
      return;
    }

    setIsProcessing(true);
    try {
      const teacherName = teacher.fullName || teacher.email || 'Unknown Teacher';
      await reassignTicket(selectedTicket.id, selectedTeacherId, teacherName, reassignReason);
      alert('Ticket reassigned successfully!');
      setShowReassignModal(false);
      setSelectedTeacherId('');
      setReassignReason('');
      await refreshData();
    } catch (error) {
      console.error('Error reassigning ticket:', error);
      alert('Failed to reassign ticket');
    } finally {
      setIsProcessing(false);
    }
  };

  const getMushafMistakes = (ticket: Ticket) => {
    return (ticket.mistakes || []).map(m => ({
      id: m.id || `mistake-${Date.now()}-${Math.random()}`,
      type: m.type,
      page: m.page,
      surah: m.surah,
      ayah: m.ayah,
      wordIndex: m.wordIndex,
      position: m.position,
      note: m.note,
      audioUrl: m.audioUrl,
      timestamp: m.timestamp || new Date()
    }));
  };

  // Check for duplicate tickets
  const findDuplicateTickets = (ticket: Ticket) => {
    return pendingTickets.filter(t => 
      t.id !== ticket.id && 
      t.studentId === ticket.studentId && 
      t.type === ticket.type && 
      t.status === 'submitted'
    );
  };

  // Delete ticket - search in all tickets, not just pending
  const handleDeleteTicket = async (ticketId: string) => {
    const ticket = recitationTickets.find(t => t.id === ticketId);
    if (!ticket) {
      console.error('❌ Ticket not found for deletion:', ticketId);
      alert('Ticket not found. Please refresh and try again.');
      return;
    }

    // Check for duplicates (only in pending tickets)
    const duplicates = pendingTickets.filter(t => 
      t.id !== ticket.id && 
      t.studentId === ticket.studentId && 
      t.type === ticket.type && 
      t.status === 'submitted'
    );
    const hasDuplicates = duplicates.length > 0;

    let confirmMessage = `Are you sure you want to delete this ${ticket.type.toUpperCase()} ticket for ${ticket.studentName}?`;
    if (hasDuplicates) {
      confirmMessage += `\n\n⚠️ Warning: There ${duplicates.length === 1 ? 'is' : 'are'} ${duplicates.length} duplicate ticket(s) for this student.`;
    }
    confirmMessage += '\n\nThis action cannot be undone.';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // Delete via API
      const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE}/tickets/${ticketId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete ticket: ${response.status} ${errorText}`);
      }

      alert('Ticket deleted successfully!');
      await refreshData();
      
      // If this was the selected ticket, go back to list
      if (selectedTicketId === ticketId) {
        setSelectedTicketId(null);
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Failed to delete ticket: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col border-4 border-accent/30">
        {/* Modern Header with Gradient */}
        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-br from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.95)] border-b-4 border-accent/50 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-sm font-bold text-white">TK</span>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-white drop-shadow-lg">
                    {selectedTicket ? `Review Ticket` : 'Ticket Review Queue'}
                  </h2>
                  <p className="text-white/90 text-[10px] sm:text-xs mt-0.5 font-medium">
                    {selectedTicket 
                      ? `${selectedTicket.studentName} • ${selectedTicket.type.toUpperCase()} • ${selectedTicket.mistakes?.length || 0} mistake(s)`
                      : `${pendingTickets.length} ticket${pendingTickets.length !== 1 ? 's' : ''} awaiting your review${sentTickets.length > 0 ? ` • ${sentTickets.length} sent ticket${sentTickets.length !== 1 ? 's' : ''}` : ''}`
                    }
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full transition-all hover:scale-110 text-base sm:text-lg font-bold shadow-lg border-2 border-white/30 touch-target"
              title="Close"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gradient-to-b from-gray-50 to-white">
          {!selectedTicket ? (
            // Modern Ticket List View
            <div className="space-y-3">
              {/* Sent Tickets Section - Always show */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-extrabold text-primary">Sent Tickets</h3>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-lg text-[10px] font-bold">
                    {sentTickets.length} ticket{sentTickets.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {sentTickets.length === 0 ? (
                  <div className="bg-white rounded-xl border-2 border-gray-200 p-3 text-center">
                    <p className="text-xs text-primary/70">No tickets sent yet. Create a ticket to see it here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {sentTickets.map((ticket) => {
                      const typeColors = {
                        sabq: { bg: 'bg-green-500', text: 'text-green-50', border: 'border-green-400' },
                        sabqi: { bg: 'bg-blue-500', text: 'text-blue-50', border: 'border-blue-400' },
                        manzil: { bg: 'bg-purple-500', text: 'text-purple-50', border: 'border-purple-400' }
                      };
                      const colors = typeColors[ticket.type as keyof typeof typeColors] || typeColors.sabq;

                      return (
                        <div
                          key={ticket.id}
                          className="group relative bg-white rounded-2xl border-2 border-gray-200 hover:border-primary/50 transition-all duration-300 shadow-md hover:shadow-xl overflow-hidden"
                        >
                          {/* Gradient Accent Bar */}
                          <div className={`h-1 ${colors.bg} w-full`}></div>
                          
                          <div className="p-3 sm:p-4">
                            {/* Header with Badges */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${colors.bg} ${colors.text} shadow-md`}>
                                    {ticket.type.toUpperCase()}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                                    ticket.status === 'sent_to_assignment' 
                                      ? 'bg-green-500 text-green-50' 
                                      : 'bg-yellow-500 text-yellow-50'
                                  } shadow-md`}>
                                    {ticket.status === 'sent_to_assignment' ? 'SENT' : 'PENDING'}
                                  </span>
                                </div>
                                <h4 className="text-sm font-extrabold text-primary mb-0.5 group-hover:text-primary/80 transition-colors">
                                  {ticket.studentName}
                                </h4>
                                {ticket.assignedTeacherName && (
                                  <p className="text-xs text-primary/70 font-medium">
                                    Teacher: {ticket.assignedTeacherName}
                                  </p>
                                )}
                                {ticket.adminComment && (
                                  <p className="text-[10px] text-primary/60 mt-1 line-clamp-2">
                                    {ticket.adminComment}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Stats Row */}
                            <div className="flex items-center justify-between mb-2 pt-2 border-t border-gray-200">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-primary/60">
                                    Created: {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 pt-2 border-t border-gray-200">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTicket(ticket);
                                }}
                                className="flex-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition-all shadow-md hover:shadow-lg"
                                title="Edit ticket"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTicket(ticket.id);
                                }}
                                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-all shadow-md hover:shadow-lg"
                                title="Delete ticket"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pending Tickets Section */}
              {pendingTickets.length === 0 ? (
                sentTickets.length === 0 ? (
                  <div className="text-center py-12 sm:py-16">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <span className="text-2xl sm:text-3xl font-bold text-primary">✓</span>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-primary mb-2">All Caught Up!</p>
                    <p className="text-sm sm:text-base text-primary/70">No tickets pending review</p>
                  </div>
                ) : null
              ) : (
                <>
                  {/* Summary Banner */}
                  <div className="mb-3 p-3 bg-gradient-to-r from-primary to-primary/90 rounded-xl shadow-lg border-2 border-primary/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <span className="text-sm font-bold text-white">TK</span>
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-white">
                            {pendingTickets.length} Ticket{pendingTickets.length !== 1 ? 's' : ''} Ready for Review
                          </p>
                          <p className="text-xs text-white/90">Click on any ticket to start reviewing</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modern Ticket Cards Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {pendingTickets.map((ticket) => {
                      const duplicates = findDuplicateTickets(ticket);
                      const hasDuplicates = duplicates.length > 0;
                      const typeColors = {
                        sabq: { bg: 'bg-green-500', text: 'text-green-50', border: 'border-green-400' },
                        sabqi: { bg: 'bg-blue-500', text: 'text-blue-50', border: 'border-blue-400' },
                        manzil: { bg: 'bg-purple-500', text: 'text-purple-50', border: 'border-purple-400' }
                      };
                      const colors = typeColors[ticket.type as keyof typeof typeColors] || typeColors.sabq;

                      return (
                        <div
                          key={ticket.id}
                          className="group relative bg-white rounded-2xl border-2 border-gray-200 hover:border-primary/50 transition-all duration-300 shadow-md hover:shadow-xl overflow-hidden"
                        >
                          {/* Gradient Accent Bar */}
                          <div className={`h-1 ${colors.bg} w-full`}></div>
                          
                          {hasDuplicates && (
                            <div className="mx-3 mt-3 p-1.5 bg-orange-50 border-l-4 border-orange-400 rounded-lg">
                              <p className="text-[10px] font-bold text-orange-800">
                                ⚠️ {duplicates.length} duplicate ticket{duplicates.length !== 1 ? 's' : ''} found
                              </p>
                            </div>
                          )}

                          <div className="p-3 sm:p-4">
                            {/* Header with Badges */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${colors.bg} ${colors.text} shadow-md`}>
                                    {ticket.type.toUpperCase()}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-yellow-500 text-yellow-50 shadow-md">
                                    SUBMITTED
                                  </span>
                                </div>
                                <h4 className="text-sm font-extrabold text-primary mb-0.5 group-hover:text-primary/80 transition-colors">
                                  {ticket.studentName}
                                </h4>
                                <p className="text-xs text-primary/70 font-medium">
                                  👨‍🏫 {ticket.assignedTeacherName || 'Unassigned'}
                                </p>
                              </div>
                            </div>

                            {/* Teacher Comment Preview */}
                            {ticket.teacherComment && (
                              <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-[10px] font-semibold text-primary/60 mb-0.5">Teacher Comment:</p>
                                <p className="text-xs text-primary/80 italic line-clamp-2">
                                  "{ticket.teacherComment}"
                                </p>
                              </div>
                            )}

                            {/* Stats Row */}
                            <div className="flex items-center justify-between mb-2 pt-2 border-t border-gray-200">
                              <div className="flex items-center gap-2">
                                {ticket.mistakes && ticket.mistakes.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm">🔴</span>
                                    <span className="text-xs font-bold text-primary">
                                      {ticket.mistakes.length} mistake{ticket.mistakes.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <span className="text-xs">🕐</span>
                                  <span className="text-[10px] text-primary/60">
                                    {ticket.submittedAt ? new Date(ticket.submittedAt).toLocaleDateString() : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 pt-2 border-t border-gray-200">
                              <button
                                onClick={() => handleTicketClick(ticket.id)}
                                className="flex-1 px-3 py-1.5 bg-gradient-to-r from-primary to-primary/90 text-white rounded-lg text-xs font-extrabold hover:from-primary/90 hover:to-primary/80 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                              >
                                Review Ticket
                              </button>
                              {/* Edit button - only show for editable statuses */}
                              {(ticket.status === 'pending' || ticket.status === 'in_progress' || ticket.status === 'submitted') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTicket(ticket);
                                  }}
                                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition-all shadow-md hover:shadow-lg"
                                  title="Edit ticket"
                                >
                                  Edit
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTicket(ticket.id);
                                }}
                                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-all shadow-md hover:shadow-lg"
                                title="Delete ticket"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : selectedTicket ? (
            // Modern Ticket Detail View
            <div className="space-y-3">
              {/* Back Button */}
              <button
                onClick={handleBackToList}
                className="flex items-center gap-1.5 text-primary hover:text-primary/80 font-bold transition-colors group text-sm"
              >
                <span className="text-base group-hover:-translate-x-1 transition-transform">←</span>
                <span>Back to Ticket List</span>
              </button>

              {/* Ticket Info Card */}
              <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
                <div className={`h-1 ${
                  selectedTicket.type === 'sabq' ? 'bg-green-500' :
                  selectedTicket.type === 'sabqi' ? 'bg-blue-500' :
                  'bg-purple-500'
                }`}></div>
                <div className="p-3">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-extrabold text-white shadow-md ${
                          selectedTicket.type === 'sabq' ? 'bg-green-500' :
                          selectedTicket.type === 'sabqi' ? 'bg-blue-500' :
                          'bg-purple-500'
                        }`}>
                          {selectedTicket.type.toUpperCase()}
                        </span>
                        <span className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-yellow-500 text-white shadow-md">
                          SUBMITTED
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-primary mb-1">{selectedTicket.studentName}</h3>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-[10px] font-bold text-primary/60 mb-0.5 uppercase tracking-wide">Student</p>
                      <p className="text-xs font-bold text-primary">{selectedTicket.studentName}</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-[10px] font-bold text-primary/60 mb-0.5 uppercase tracking-wide">Teacher</p>
                      <p className="text-xs font-bold text-primary">{selectedTicket.assignedTeacherName || 'Unassigned'}</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-[10px] font-bold text-primary/60 mb-0.5 uppercase tracking-wide">Submitted</p>
                      <p className="text-xs font-bold text-primary">
                        {selectedTicket.submittedAt ? new Date(selectedTicket.submittedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-[10px] font-bold text-primary/60 mb-0.5 uppercase tracking-wide">Mistakes</p>
                      <p className="text-xs font-bold text-primary">
                        {selectedTicket.mistakes?.length || 0} mistake{(selectedTicket.mistakes?.length || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Admin Notes */}
                  {selectedTicket.teacherNotes && (
                    <div className="mb-2 p-2 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
                      <p className="text-[10px] font-bold text-blue-800 mb-1 uppercase tracking-wide">📝 Admin Notes to Teacher</p>
                      <p className="text-xs text-blue-900">{selectedTicket.teacherNotes}</p>
                    </div>
                  )}

                  {/* Teacher Comment */}
                  {selectedTicket.teacherComment && (
                    <div className="p-2 bg-green-50 border-l-4 border-green-500 rounded-lg">
                      <p className="text-[10px] font-bold text-green-800 mb-1 uppercase tracking-wide">💬 Teacher Comment</p>
                      <p className="text-xs text-green-900 italic">"{selectedTicket.teacherComment}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Mushaf View */}
              {selectedTicket.mistakes && selectedTicket.mistakes.length > 0 && (
                <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
                  <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-primary flex items-center gap-1.5">
                        <span>📖</span> Mushaf View with Mistakes
                      </h3>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 rounded-lg">
                        <span className="text-xs font-bold text-primary">
                          {selectedTicket.mistakes.length} mistake{selectedTicket.mistakes.length !== 1 ? 's' : ''} marked
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Recording Status */}
                  <div className="px-3 pt-2">
                    <div className={`p-2 rounded-lg border-2 ${
                      isRecording ? 'bg-red-50 border-red-300' :
                      recordingBlob ? 'bg-green-50 border-green-300' :
                      'bg-gray-50 border-gray-300'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isRecording ? (
                            <>
                              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg"></div>
                              <div>
                                <span className="text-xs font-extrabold text-red-800 block">
                                  🎙️ Recording in Progress
                                </span>
                                <span className="text-[10px] text-red-600">
                                  {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                                </span>
                              </div>
                            </>
                          ) : recordingBlob ? (
                            <>
                              <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg"></div>
                              <div>
                                <span className="text-xs font-extrabold text-green-800 block">
                                  ✓ Recording Complete
                                </span>
                                <span className="text-[10px] text-green-600">
                                  Duration: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                              <span className="text-xs font-semibold text-gray-700">
                                Recording will start automatically when viewing Mushaf
                              </span>
                            </>
                          )}
                        </div>
                        {recordingError && (
                          <span className="text-[10px] text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded">⚠️ {recordingError}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 flex justify-center bg-gradient-to-b from-gray-50 to-white">
                    {selectedTicket ? (
                      <InteractiveMushaf
                        currentPage={mushafPage}
                        onPageChange={setMushafPage}
                        mistakes={getMushafMistakes(selectedTicket) || []}
                        readOnly={true}
                        mode="viewing"
                        studentName={selectedTicket.studentName}
                      />
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-primary font-bold">Loading Mushaf...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modern Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t-2 border-gray-200">
                <button
                  onClick={() => setShowReassignModal(true)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-xs font-extrabold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-1.5"
                >
                  <span>🔄</span>
                  <span>Reassign Ticket</span>
                </button>
                <button
                  onClick={handleApproveAndSend}
                  disabled={isProcessing}
                  className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-xs font-extrabold hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-1.5"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>Approve & Send to Assignment</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            // Loading or error state
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-lg font-bold text-primary mb-2">Loading ticket...</p>
                <p className="text-sm text-primary/70">Please wait</p>
                <button
                  onClick={handleBackToList}
                  className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-all"
                >
                  Back to List
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modern Reassign Modal */}
        {showReassignModal && selectedTicket && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border-4 border-accent/30 overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-5 bg-gradient-to-r from-orange-500 to-orange-600 border-b-2 border-orange-400">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-xl">🔄</span>
                    </div>
                    <h3 className="text-xl font-extrabold text-white">Reassign Ticket</h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowReassignModal(false);
                      setSelectedTeacherId('');
                      setReassignReason('');
                    }}
                    className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full transition-all hover:scale-110 text-2xl font-bold"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-5">
                <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-xl">
                  <p className="text-sm font-bold text-blue-800 mb-1">Current Assignment</p>
                  <p className="text-base text-blue-900">
                    {selectedTicket.assignedTeacherName || 'Unassigned'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-extrabold text-primary mb-2 uppercase tracking-wide">
                    Select New Teacher
                  </label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition font-medium shadow-sm"
                  >
                    <option value="">Choose a teacher...</option>
                    {teachers.map(teacher => {
                      const isCurrentTeacher = teacher.id === selectedTicket.assignedTeacherId;
                      return (
                        <option 
                          key={teacher.id} 
                          value={teacher.id}
                          disabled={isCurrentTeacher}
                        >
                          {teacher.fullName || teacher.email || 'Unknown Teacher'}
                          {isCurrentTeacher ? ' (Current)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-extrabold text-primary mb-2 uppercase tracking-wide">
                    Reason (Optional)
                  </label>
                  <textarea
                    value={reassignReason}
                    onChange={(e) => setReassignReason(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition font-medium shadow-sm resize-none"
                    placeholder="Why are you reassigning this ticket?"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowReassignModal(false);
                      setSelectedTeacherId('');
                      setReassignReason('');
                    }}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-primary rounded-xl font-extrabold hover:bg-gray-50 transition-all shadow-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReassign}
                    disabled={isProcessing || !selectedTeacherId}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-extrabold hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Reassigning...
                      </span>
                    ) : (
                      'Reassign Ticket'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Ticket Modal */}
      {editingTicket && (
        <TicketCreationForm
          studentId={editingTicket.studentId}
          ticket={editingTicket}
          onClose={() => {
            setEditingTicket(null);
            refreshData();
          }}
          onSuccess={(updatedTicket) => {
            setEditingTicket(null);
            refreshData();
            // If we were viewing this ticket, refresh the view
            if (selectedTicketId === updatedTicket.id) {
              setSelectedTicketId(null);
              setTimeout(() => setSelectedTicketId(updatedTicket.id), 100);
            }
          }}
        />
      )}
    </div>
  );
};

export default AdminTicketReview;
