import React, { useState } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { AssignmentTicket, TicketStatus, WorkflowStep, Student, Teacher } from '../types';
import { InteractiveMushaf } from '@umar-academy/mushaf';

interface AdminTicketManagementProps {
  onClose?: () => void;
}

const AdminTicketManagement: React.FC<AdminTicketManagementProps> = ({ onClose }) => {
  const { tickets, students, teachers, updateTicket, approveTicket, assignTicketToNext, finalizeTicket, refreshData } = useBackendData();
  const { user } = useAuth();
  
  const [view, setView] = useState<'pending' | 'all'>('pending');
  const [selectedTicket, setSelectedTicket] = useState<AssignmentTicket | null>(null);
  const [action, setAction] = useState<'approve' | 'assign-next' | 'finalize' | 'reject'>('approve');
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

  const handleApprove = async () => {
    if (!selectedTicket) return;
    
    try {
      const ticketId = selectedTicket.id || (selectedTicket as any)._id;
      await approveTicket(ticketId, user?.id || '');
      alert('✅ Ticket approved successfully!');
      setSelectedTicket(null);
      setAction('approve');
      await refreshData();
    } catch (error) {
      console.error('Error approving ticket:', error);
      alert('Failed to approve ticket');
    }
  };

  const handleAssignToNext = async () => {
    if (!selectedTicket) return;
    
    if (!selectedNextTeacher) {
      alert('Please select a teacher for the next step');
      return;
    }
    
    const teacher = teachers.find(t => t.id === selectedNextTeacher);
    if (!teacher) {
      alert('Teacher not found');
      return;
    }
    
    try {
      const ticketId = selectedTicket.id || (selectedTicket as any)._id;
      await assignTicketToNext(ticketId, teacher.id, teacher.fullName);
      alert(`✅ Next step activated and assigned to ${teacher.fullName}`);
      setSelectedTicket(null);
      setSelectedNextTeacher('');
      setAction('approve');
      await refreshData();
    } catch (error) {
      console.error('Error assigning to next teacher:', error);
      alert('Failed to assign ticket');
    }
  };

  const handleReject = async () => {
    if (!selectedTicket) return;
    
    if (!revisionNotes.trim()) {
      alert('Please provide revision notes');
      return;
    }
    
    try {
      const ticketId = selectedTicket.id || (selectedTicket as any)._id;
      await updateTicket(ticketId, {
        status: 'needs_revision',
        revisionNotes: revisionNotes,
        reviewedBy: user?.id,
        reviewedAt: new Date()
      });
      alert('✅ Ticket sent back for revision');
      setSelectedTicket(null);
      setRevisionNotes('');
      setAction('assign-next');
      await refreshData();
    } catch (error) {
      console.error('Error rejecting ticket:', error);
      alert('Failed to reject ticket');
    }
  };


  const handleFinalize = async () => {
    if (!selectedTicket) return;
    
    if (!finalizeData.finalReport.trim() || !finalizeData.homework.trim()) {
      alert('Please fill in final report and homework');
      return;
    }

    try {
      const ticketId = selectedTicket.id || (selectedTicket as any)._id;
      await finalizeTicket(ticketId, {
        finalReport: finalizeData.finalReport,
        homework: finalizeData.homework,
        homeworkLink: finalizeData.homeworkLink,
        reviewedBy: user?.id || ''
      });
      alert('✅ Ticket finalized! Assignment created and visible to student.');
      setSelectedTicket(null);
      setFinalizeData({ finalReport: '', homework: '', homeworkLink: '' });
      setAction('assign-next');
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
                      {Array.from(new Set((selectedTicket.mushafMarkings || []).map((m: any) => m.page)))
                        .sort((a: number, b: number) => a - b)
                        .map((page: number) => {
                          const mistakesOnPage = (selectedTicket.mushafMarkings || []).filter((m: any) => m.page === page).length;
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
                  {Array.from(new Set((selectedTicket.mushafMarkings || []).map((m: any) => m.page)))
                    .sort((a: number, b: number) => a - b)
                    .map((page: number) => {
                      const mistakesOnPage = (selectedTicket.mushafMarkings || []).filter((m: any) => m.page === page).length;
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

            {/* Action Selection */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">What would you like to do?</h4>
              <div className="flex gap-3 mb-4 flex-wrap">
                {selectedTicket.status === 'pending_review' && (
                  <button
                    onClick={() => setAction('approve')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                      action === 'approve'
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    ✅ Approve
                  </button>
                )}
                {selectedTicket.status === 'approved' && selectedTicket.workflowStep !== 'finalize' && (
                  <button
                    onClick={() => {
                      setAction('assign-next');
                      setSelectedNextTeacher('');
                    }}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                      action === 'assign-next'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    ➡️ Assign to Next Teacher
                  </button>
                )}
                {selectedTicket.status === 'approved' && selectedTicket.workflowStep === 'finalize' && (
                  <button
                    onClick={() => {
                      setAction('finalize');
                      setFinalizeData({ finalReport: '', homework: '', homeworkLink: '' });
                    }}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                      action === 'finalize'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    ✅ Finalize & Add Homework
                  </button>
                )}
                <button
                  onClick={() => {
                    setAction('reject');
                    setRevisionNotes('');
                  }}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    action === 'reject'
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  ↩️ Request Revision
                </button>
              </div>
            </div>

            {/* Approve Action */}
            {action === 'approve' && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-gray-700 mb-4">
                  Approve this ticket. You can assign it to the next teacher later.
                </p>
                <button
                  onClick={handleApprove}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                >
                  ✅ Approve Ticket
                </button>
              </div>
            )}

            {/* Assign to Next Teacher Form */}
            {action === 'assign-next' && selectedTicket.workflowStep !== 'finalize' && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Teacher for Next Step
                </label>
                <select
                  value={selectedNextTeacher}
                  onChange={(e) => setSelectedNextTeacher(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3"
                >
                  <option value="">Choose a teacher...</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-600">
                  Next step: {
                    selectedTicket.workflowStep === 'sabq' ? '📚 Sabqi' :
                    selectedTicket.workflowStep === 'sabqi' ? '📿 Manzil' :
                    '✅ Finalize'
                  }
                </p>
                <button
                  onClick={handleAssignToNext}
                  disabled={!selectedNextTeacher}
                  className="mt-4 w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ➡️ Assign to Next Teacher
                </button>
              </div>
            )}

            {/* Finalize Form */}
            {action === 'finalize' && (
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

            {/* Revision Notes Form */}
            {action === 'reject' && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Revision Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3"
                  rows={4}
                  placeholder="Explain what needs to be revised..."
                />
                <button
                  onClick={handleReject}
                  disabled={!revisionNotes.trim()}
                  className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ↩️ Send for Revision
                </button>
              </div>
            )}

            {/* Finalize Form Submit Button */}
            {action === 'finalize' && (
              <div className="mb-6">
                <button
                  onClick={handleFinalize}
                  className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
                >
                  ✅ Finalize & Create Assignment
                </button>
              </div>
            )}

            {/* Back Button */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedTicket(null);
                  setAction('assign-next');
                  setRevisionNotes('');
                  setSelectedNextTeacher('');
                  setFinalizeData({ finalReport: '', homework: '', homeworkLink: '' });
                  setShowMushaf(false);
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
              >
                ← Back to Tickets
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

