import React, { useState, useEffect, useMemo } from 'react';
import { Ticket } from '../types/ticket';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import Card from './Card';

interface AdminTicketReviewProps {
  onClose: () => void;
}

const AdminTicketReview: React.FC<AdminTicketReviewProps> = ({ onClose }) => {
  const { recitationTickets, approveAndSendTicket, reassignTicket, teachers, refreshData, updateRecitationTicket } = useBackendData();
  const { user } = useAuth();
  
  // Simple state management
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mushafPage, setMushafPage] = useState(1);

  // Get pending tickets
  const pendingTickets = useMemo(() => {
    return recitationTickets.filter(t => t.status === 'submitted');
  }, [recitationTickets]);

  // Get selected ticket
  const selectedTicket = useMemo(() => {
    if (!selectedTicketId) return null;
    return pendingTickets.find(t => t.id === selectedTicketId) || null;
  }, [selectedTicketId, pendingTickets]);

  // Initialize mushaf page when ticket is selected
  useEffect(() => {
    if (selectedTicket?.mistakes && selectedTicket.mistakes.length > 0) {
      const firstMistake = selectedTicket.mistakes[0];
      if (firstMistake?.page) {
        setMushafPage(firstMistake.page);
      }
    }
  }, [selectedTicket]);

  const handleTicketClick = (ticketId: string) => {
    console.log('🎫 Clicking ticket:', ticketId);
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
    try {
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
        `- Manzil: ${Array.isArray(assignment?.classwork?.manzil) ? assignment.classwork.manzil.length : 0}`;
      
      alert(message);
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

  // Delete ticket
  const handleDeleteTicket = async (ticketId: string) => {
    const ticket = pendingTickets.find(t => t.id === ticketId);
    if (!ticket) return;

    // Check for duplicates
    const duplicates = findDuplicateTickets(ticket);
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
        throw new Error('Failed to delete ticket');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-accent-soft bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.85)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-white">
                {selectedTicket ? `Review: ${selectedTicket.studentName}` : 'Review Submitted Tickets'}
              </h2>
              <p className="text-white/80 text-xs sm:text-sm mt-1">
                {selectedTicket 
                  ? `${selectedTicket.type.toUpperCase()} - ${selectedTicket.mistakes?.length || 0} mistake(s)`
                  : `${pendingTickets.length} ticket(s) pending review`
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors text-lg font-bold"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {!selectedTicket ? (
            // Ticket List View
            <div className="space-y-4">
              {pendingTickets.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-lg text-primary-soft">No tickets pending review</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm font-semibold text-blue-800">
                      Found {pendingTickets.length} ticket(s) ready for review
                    </p>
                  </div>
                  {pendingTickets.map((ticket) => {
                    const duplicates = findDuplicateTickets(ticket);
                    const hasDuplicates = duplicates.length > 0;

                    return (
                      <div
                        key={ticket.id}
                        className="w-full p-4 sm:p-6 bg-white rounded-2xl border-2 border-accent-soft hover:border-primary transition-all"
                      >
                        {hasDuplicates && (
                          <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                            <p className="text-xs font-semibold text-orange-800">
                              ⚠️ {duplicates.length} duplicate ticket(s) found for this student
                            </p>
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <button
                            onClick={() => handleTicketClick(ticket.id)}
                            className="flex-1 text-left"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                ticket.type === 'sabqi' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : ticket.type === 'manzil'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {ticket.type.toUpperCase()}
                              </span>
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                Submitted
                              </span>
                            </div>
                            <h4 className="text-lg font-semibold text-primary mb-1">
                              {ticket.studentName}
                            </h4>
                            <p className="text-sm text-primary-soft mb-2">
                              Teacher: {ticket.assignedTeacherName || 'N/A'}
                            </p>
                            {ticket.teacherComment && (
                              <p className="text-sm text-primary-soft italic line-clamp-2">
                                "{ticket.teacherComment}"
                              </p>
                            )}
                            {ticket.mistakes && ticket.mistakes.length > 0 && (
                              <p className="text-xs text-primary-soft mt-2">
                                {ticket.mistakes.length} mistake(s) marked
                              </p>
                            )}
                            <p className="text-xs text-primary-soft mt-2">
                              Submitted: {ticket.submittedAt ? new Date(ticket.submittedAt).toLocaleString() : 'N/A'}
                            </p>
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTicketClick(ticket.id)}
                              className="px-5 py-2.5 bg-primary text-white rounded-full text-sm font-bold whitespace-nowrap hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors shadow-md"
                            >
                              Review
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTicket(ticket.id);
                              }}
                              className="px-5 py-2.5 bg-red-600 text-white rounded-full text-sm font-bold whitespace-nowrap hover:bg-red-700 transition-colors shadow-md"
                              title="Delete ticket"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          ) : (
            // Ticket Detail View
            <div className="space-y-6">
              {/* Ticket Details */}
              <Card title={`Review: ${selectedTicket.studentName} - ${selectedTicket.type.toUpperCase()}`}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-primary mb-1">Student:</p>
                      <p className="text-sm text-primary-soft">{selectedTicket.studentName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary mb-1">Type:</p>
                      <p className="text-sm text-primary-soft">{selectedTicket.type.toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary mb-1">Teacher:</p>
                      <p className="text-sm text-primary-soft">{selectedTicket.assignedTeacherName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary mb-1">Submitted:</p>
                      <p className="text-sm text-primary-soft">
                        {selectedTicket.submittedAt ? new Date(selectedTicket.submittedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {selectedTicket.teacherNotes && (
                    <div>
                      <p className="text-sm font-semibold text-primary mb-1">Admin Notes to Teacher:</p>
                      <p className="text-sm text-primary-soft bg-blue-50 p-3 rounded-xl">{selectedTicket.teacherNotes}</p>
                    </div>
                  )}

                  {selectedTicket.teacherComment && (
                    <div>
                      <p className="text-sm font-semibold text-primary mb-1">Teacher Comment:</p>
                      <p className="text-sm text-primary-soft bg-green-50 p-3 rounded-xl">{selectedTicket.teacherComment}</p>
                    </div>
                  )}

                  {selectedTicket.mistakes && selectedTicket.mistakes.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-primary mb-2">
                        Mistakes Marked: {selectedTicket.mistakes.length}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Mushaf View */}
              {selectedTicket.mistakes && selectedTicket.mistakes.length > 0 && (
                <Card title="Mushaf View with Mistakes">
                  <div className="flex justify-center">
                    <InteractiveMushaf
                      currentPage={mushafPage}
                      onPageChange={setMushafPage}
                      mistakes={getMushafMistakes(selectedTicket)}
                      readOnly={true}
                      mode="viewing"
                      studentName={selectedTicket.studentName}
                    />
                  </div>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-accent-soft">
                <button
                  onClick={handleBackToList}
                  className="px-6 py-3 border-2 border-accent-soft text-primary rounded-full font-bold hover:bg-soft-accent transition-colors shadow-md"
                >
                  Back to List
                </button>
                <button
                  onClick={() => setShowReassignModal(true)}
                  className="px-6 py-3 bg-orange-600 text-white rounded-full font-bold hover:bg-orange-700 transition-colors shadow-lg"
                >
                  Reassign
                </button>
                <button
                  onClick={handleApproveAndSend}
                  disabled={isProcessing}
                  className="px-8 py-3 bg-green-600 text-white rounded-full font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {isProcessing ? 'Processing...' : '✓ Approve & Send to Assignment'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Reassign Modal */}
        {showReassignModal && selectedTicket && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 relative">
              <button
                onClick={() => {
                  setShowReassignModal(false);
                  setSelectedTeacherId('');
                  setReassignReason('');
                }}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors text-lg font-bold"
                title="Close"
              >
                ×
              </button>
              <h3 className="text-lg font-semibold text-primary mb-4 pr-10">Reassign Ticket</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Select Teacher:
                  </label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full px-3 py-2 border border-accent-soft rounded-2xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition"
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
                  <label className="block text-sm font-medium text-primary mb-2">
                    Reason (Optional):
                  </label>
                  <textarea
                    value={reassignReason}
                    onChange={(e) => setReassignReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-accent-soft rounded-2xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="Why are you reassigning this ticket?"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowReassignModal(false);
                      setSelectedTeacherId('');
                      setReassignReason('');
                    }}
                    className="px-6 py-3 border-2 border-accent-soft text-primary rounded-full font-bold hover:bg-soft-accent transition-colors shadow-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReassign}
                    disabled={isProcessing || !selectedTeacherId}
                    className="px-8 py-3 bg-primary text-white rounded-full font-bold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {isProcessing ? 'Reassigning...' : 'Reassign'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTicketReview;
