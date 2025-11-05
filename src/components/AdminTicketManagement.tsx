import React, { useState } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { AssignmentTicket, TicketStatus, WorkflowStep, Student, Teacher } from '../types';
import InteractiveMushaf from './InteractiveMushaf';

interface AdminTicketManagementProps {
  onClose?: () => void;
}

const AdminTicketManagement: React.FC<AdminTicketManagementProps> = ({ onClose }) => {
  const { tickets, students, teachers, updateTicket, assignTicketToNextTeacher, finalizeTicket, refreshData } = useBackendData();
  const { user } = useAuth();
  
  const [view, setView] = useState<'pending' | 'all' | 'create'>('pending');
  const [selectedTicket, setSelectedTicket] = useState<AssignmentTicket | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'assign-next' | 'finalize'>('approve');
  const [finalizeData, setFinalizeData] = useState({
    finalReport: '',
    homework: '',
    homeworkLink: ''
  });
  const [selectedNextTeacher, setSelectedNextTeacher] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showMushaf, setShowMushaf] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter out finalized/completed tickets - they should not appear in the list
  const activeTickets = tickets.filter(t => 
    t.status !== 'finalized' && t.status !== 'completed'
  );
  
  const pendingTickets = activeTickets.filter(t => t.status === 'pending_review');
  const allTickets = activeTickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleReview = async (ticket: AssignmentTicket, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        const ticketId = ticket.id || (ticket as any)._id;
        await updateTicket(ticketId, {
          status: 'approved',
          reviewedBy: user?.id,
          reviewedAt: new Date()
        });
        
        // Show reminder to assign to next teacher if not finalize step
        if (ticket.workflowStep !== 'finalize') {
          const nextStep = ticket.workflowStep === 'sabq' ? 'Sabqi' : ticket.workflowStep === 'sabqi' ? 'Manzil' : 'Finalize';
          const shouldAssign = window.confirm(
            `✅ Ticket approved successfully!\n\n` +
            `📋 Next Step: ${nextStep}\n\n` +
            `Would you like to assign this to the next teacher now?`
          );
          
          if (shouldAssign) {
            setReviewAction('assign-next');
            setSelectedTicket(ticket);
            return; // Don't close, show assign next form
          }
        } else {
          // If it's finalize step, remind to write homework and finalize
          const shouldFinalize = window.confirm(
            `✅ Ticket approved successfully!\n\n` +
            `📝 This is the finalize step.\n\n` +
            `Please:\n` +
            `1. Listen to the sabq recitation\n` +
            `2. Write the final report\n` +
            `3. Add homework instructions\n` +
            `4. Submit to create assignment for student\n\n` +
            `Would you like to write the homework and finalize now?`
          );
          
          if (shouldFinalize) {
            setReviewAction('finalize');
            setSelectedTicket(ticket);
            return; // Don't close, show finalize form
          } else {
            alert('✅ Ticket approved! Remember to finalize it with homework when ready.');
          }
        }
      } else {
        if (!revisionNotes.trim()) {
          alert('Please provide revision notes');
          return;
        }
        await updateTicket(ticket.id, {
          status: 'needs_revision',
          revisionNotes: revisionNotes,
          reviewedBy: user?.id,
          reviewedAt: new Date()
        });
        alert('Ticket sent back for revision');
      }
      setSelectedTicket(null);
      setRevisionNotes('');
      await refreshData();
    } catch (error) {
      console.error('Error reviewing ticket:', error);
      alert('Failed to update ticket');
    }
  };

  const handleAssignNext = async (ticket: AssignmentTicket) => {
    if (!selectedNextTeacher) {
      alert('Please select a teacher');
      return;
    }

    const teacher = teachers.find(t => t.id === selectedNextTeacher);
    if (!teacher) {
      alert('Teacher not found');
      return;
    }

    try {
      // Determine what the next step will be
      const nextStep = ticket.workflowStep === 'sabq' ? 'sabqi' : 
                       ticket.workflowStep === 'sabqi' ? 'manzil' : 
                       ticket.workflowStep === 'manzil' ? 'finalize' : null;
      
      const newTicket = await assignTicketToNextTeacher(ticket.id, teacher.id, teacher.fullName);
      
      // Refresh tickets to get the updated list
      await refreshData();
      
      // If next step is finalize, automatically open finalize page without asking
      if (nextStep === 'finalize') {
        // The backend returns the newly created ticket
        if (newTicket) {
          // Map the ticket format
          const mappedTicket = {
            ...newTicket,
            id: (newTicket as any)._id || newTicket.id,
            createdAt: (newTicket as any).createdAt ? new Date((newTicket as any).createdAt) : new Date(),
            updatedAt: (newTicket as any).updatedAt ? new Date((newTicket as any).updatedAt) : new Date()
          } as AssignmentTicket;
          
          setSelectedTicket(mappedTicket);
          setReviewAction('finalize');
          setSelectedNextTeacher('');
          // Automatically open finalize form - no alert needed
        } else {
          alert('Ticket assigned to next teacher successfully!');
          setSelectedTicket(null);
          setSelectedNextTeacher('');
        }
      } else {
        alert('Ticket assigned to next teacher successfully!');
        setSelectedTicket(null);
        setSelectedNextTeacher('');
      }
    } catch (error) {
      console.error('Error assigning ticket:', error);
      alert('Failed to assign ticket');
    }
  };

  const handleFinalize = async (ticket: AssignmentTicket) => {
    if (!finalizeData.finalReport.trim() || !finalizeData.homework.trim()) {
      alert('Please fill in final report and homework');
      return;
    }

    try {
      await finalizeTicket(ticket.id, {
        finalReport: finalizeData.finalReport,
        homework: finalizeData.homework,
        homeworkLink: finalizeData.homeworkLink,
        reviewedBy: user?.id || ''
      });
      alert('Ticket finalized! Assignment created and visible to student.');
      setSelectedTicket(null);
      setFinalizeData({ finalReport: '', homework: '', homeworkLink: '' });
      await refreshData();
    } catch (error) {
      console.error('Error finalizing ticket:', error);
      alert('Failed to finalize ticket');
    }
  };

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student?.fullName || studentId;
  };

  const getStepLabel = (step: WorkflowStep) => {
    switch (step) {
      case 'sabq': return '📖 Sabq';
      case 'sabqi': return '📚 Sabqi';
      case 'manzil': return '📿 Manzil';
      case 'finalize': return '✅ Finalize';
      default: return step;
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'pending_review': return 'bg-purple-100 text-purple-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'needs_revision': return 'bg-red-100 text-red-700';
      case 'finalized': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const canAssignNext = (ticket: AssignmentTicket) => {
    return ticket.status === 'approved' && ticket.workflowStep !== 'finalize';
  };

  const canFinalize = (ticket: AssignmentTicket) => {
    return ticket.status === 'approved' && ticket.workflowStep === 'finalize';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-7xl mx-auto max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🎫 Ticket Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setView('pending')}
            className={`px-4 py-2 rounded-lg font-medium ${
              view === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Pending ({pendingTickets.length})
          </button>
          <button
            onClick={() => setView('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              view === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            All Tickets
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 px-4 py-2"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {selectedTicket ? (
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">Ticket Review</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="font-medium">Student:</span> {getStudentName(selectedTicket.studentId)}
              </div>
              <div>
                <span className="font-medium">Step:</span> {getStepLabel(selectedTicket.workflowStep)}
              </div>
              <div>
                <span className="font-medium">Teacher:</span> {selectedTicket.assignedTeacherName}
              </div>
              <div>
                <span className="font-medium">Program:</span> {selectedTicket.program}
              </div>
            </div>

            {selectedTicket.progressNotes && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Progress Notes:</h4>
                <div className="bg-white p-4 rounded border border-gray-200">
                  <p className="whitespace-pre-wrap">{selectedTicket.progressNotes}</p>
                </div>
              </div>
            )}

            {selectedTicket.audioLink && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Audio Link:</h4>
                <a
                  href={selectedTicket.audioLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {selectedTicket.audioLink}
                </a>
              </div>
            )}

            {/* Mushaf Markings Display */}
            {selectedTicket.mushafMarkings && selectedTicket.mushafMarkings.length > 0 && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">Mushaf Mistake Markings:</h4>
                  <button
                    onClick={() => {
                      setShowMushaf(!showMushaf);
                      if (!showMushaf) {
                        // Set to first page with mistakes
                        const firstMistakePage = selectedTicket.mushafMarkings?.[0]?.page || 1;
                        setCurrentPage(firstMistakePage);
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                  >
                    {showMushaf ? 'Hide' : 'View'} Mushaf ({selectedTicket.mushafMarkings.length} mistakes)
                  </button>
                </div>
                {!showMushaf && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-800 mb-3">
                      Teacher marked <strong>{selectedTicket.mushafMarkings.length} mistake{selectedTicket.mushafMarkings.length !== 1 ? 's' : ''}</strong> in the Mushaf.
                      Click "View Mushaf" to see them highlighted on the Quran pages.
                    </p>
                    {/* Quick navigation to pages with mistakes */}
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs font-semibold text-purple-900">Jump to pages:</span>
                      {Array.from(new Set(selectedTicket.mushafMarkings.map((m: any) => m.page)))
                        .sort((a: number, b: number) => a - b)
                        .map((page: number) => {
                          const mistakesOnPage = selectedTicket.mushafMarkings.filter((m: any) => m.page === page).length;
                          return (
                            <button
                              key={page}
                              onClick={() => {
                                setCurrentPage(page);
                                setShowMushaf(true);
                              }}
                              className="px-3 py-1 bg-purple-200 text-purple-800 rounded-md hover:bg-purple-300 text-xs font-medium"
                            >
                              Page {page} ({mistakesOnPage})
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mushaf View for Admin */}
            {showMushaf && selectedTicket.mushafMarkings && selectedTicket.mushafMarkings.length > 0 && (
              <div className="mb-6 bg-white p-4 rounded-lg border-2 border-purple-200">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">📖 Mushaf with Teacher's Markings</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Page {currentPage} • {selectedTicket.mushafMarkings.filter((m: any) => m.page === currentPage).length} mistake{selectedTicket.mushafMarkings.filter((m: any) => m.page === currentPage).length !== 1 ? 's' : ''} on this page
                    </p>
                  </div>
                  <button
                    onClick={() => setShowMushaf(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    Close
                  </button>
                </div>
                
                {/* Quick navigation buttons */}
                <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-200">
                  <span className="text-xs font-semibold text-gray-700 self-center">Navigate to pages with mistakes:</span>
                  {Array.from(new Set(selectedTicket.mushafMarkings.map((m: any) => m.page)))
                    .sort((a: number, b: number) => a - b)
                    .map((page: number) => {
                      const mistakesOnPage = selectedTicket.mushafMarkings.filter((m: any) => m.page === page).length;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-purple-600 text-white'
                              : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                          }`}
                        >
                          Page {page} ({mistakesOnPage})
                        </button>
                      );
                    })}
                </div>
                
                <InteractiveMushaf
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  mistakes={selectedTicket.mushafMarkings || []}
                  onMistakeMark={() => {}} // Read-only for admin
                  readOnly={true}
                  mode="viewing"
                />
              </div>
            )}

            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setReviewAction('approve')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  reviewAction === 'approve' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                Approve
              </button>
              <button
                onClick={() => setReviewAction('reject')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  reviewAction === 'reject' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                Request Revision
              </button>
              {canAssignNext(selectedTicket) && (
                <button
                  onClick={() => setReviewAction('assign-next')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    reviewAction === 'assign-next' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Assign to Next Teacher
                </button>
              )}
              {canFinalize(selectedTicket) && (
                <button
                  onClick={() => setReviewAction('finalize')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    reviewAction === 'finalize' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Finalize
                </button>
              )}
            </div>

            {reviewAction === 'reject' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Revision Notes
                </label>
                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={4}
                  placeholder="Explain what needs to be revised..."
                />
              </div>
            )}

            {reviewAction === 'assign-next' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Next Teacher
                </label>
                <select
                  value={selectedNextTeacher}
                  onChange={(e) => setSelectedNextTeacher(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select teacher...</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-2">
                  Next step: {
                    selectedTicket.workflowStep === 'sabq' ? 'Sabqi' :
                    selectedTicket.workflowStep === 'sabqi' ? 'Manzil' :
                    'Finalize'
                  }
                </p>
              </div>
            )}

            {reviewAction === 'finalize' && (
              <div className="space-y-4 mb-4">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                  <h4 className="font-semibold text-blue-900 mb-2">📋 Finalization Steps:</h4>
                  <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                    <li>Listen to the sabq recitation (audio link above if provided)</li>
                    <li>Write the final report below</li>
                    <li>Add homework instructions</li>
                    <li>Submit to create assignment visible to student</li>
                  </ol>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Final Report <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 ml-2">(Write report after listening to sabq)</span>
                  </label>
                  <textarea
                    value={finalizeData.finalReport}
                    onChange={(e) => setFinalizeData(prev => ({ ...prev, finalReport: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={6}
                    placeholder="Write the final report after listening to sabq... Include observations, corrections needed, praise, etc."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Homework Instructions <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 ml-2">(This will be visible to student)</span>
                  </label>
                  <textarea
                    value={finalizeData.homework}
                    onChange={(e) => setFinalizeData(prev => ({ ...prev, homework: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={4}
                    placeholder="Enter homework instructions for the student... e.g., 'Memorize verses 1-5. Practice Tajweed rules for Qalqalah.'"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Homework Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={finalizeData.homeworkLink}
                    onChange={(e) => setFinalizeData(prev => ({ ...prev, homeworkLink: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {reviewAction === 'approve' && (
                <button
                  onClick={() => handleReview(selectedTicket, 'approve')}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                >
                  Approve Ticket
                </button>
              )}
              {reviewAction === 'reject' && (
                <button
                  onClick={() => handleReview(selectedTicket, 'reject')}
                  disabled={!revisionNotes.trim()}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  Request Revision
                </button>
              )}
              {reviewAction === 'assign-next' && (
                <button
                  onClick={() => handleAssignNext(selectedTicket)}
                  disabled={!selectedNextTeacher}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  Assign to Next Teacher
                </button>
              )}
              {reviewAction === 'finalize' && (
                <button
                  onClick={() => handleFinalize(selectedTicket)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
                >
                  Finalize & Create Assignment
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedTicket(null);
                  setReviewAction('approve');
                  setRevisionNotes('');
                  setSelectedNextTeacher('');
                  setFinalizeData({ finalReport: '', homework: '', homeworkLink: '' });
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {(view === 'pending' ? pendingTickets : allTickets).map(ticket => (
            <div
              key={ticket.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedTicket(ticket)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg">{getStepLabel(ticket.workflowStep)}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900">{getStudentName(ticket.studentId)}</p>
                  <p className="text-sm text-gray-600">Teacher: {ticket.assignedTeacherName}</p>
                  {ticket.progressNotes && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{ticket.progressNotes}</p>
                  )}
                  {ticket.revisionNotes && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                      <p className="text-xs font-medium text-red-800">Revision Needed:</p>
                      <p className="text-xs text-red-700">{ticket.revisionNotes}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTicket(ticket);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Review
                </button>
              </div>
            </div>
          ))}
          
          {(view === 'pending' ? pendingTickets : allTickets).length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No tickets found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminTicketManagement;

