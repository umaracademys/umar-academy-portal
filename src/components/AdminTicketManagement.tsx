import React, { useEffect, useMemo, useState } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { AssignmentTicket, TicketStatus, WorkflowStep, Student, Teacher, MushafMistake } from '../types';
import { InteractiveMushaf } from '@umar-academy/mushaf';

const extractMistakePages = (markings: ReadonlyArray<MushafMistake>): number[] => {
  const pages = Array.from(
    new Set(
      markings
        .map((mark) => mark.page)
        .filter((page): page is number => typeof page === 'number')
    )
  );
  pages.sort((a, b) => a - b);
  return pages;
};

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
  const [studentFilterLetter, setStudentFilterLetter] = useState<'ALL' | string>('ALL');
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});

  const selectedTicketMarkings = selectedTicket?.mushafMarkings ?? ([] as MushafMistake[]);
  const mistakePages = extractMistakePages(selectedTicketMarkings);

  const ticketChain = useMemo(() => {
    if (!selectedTicket) return [] as AssignmentTicket[];
    const chain: AssignmentTicket[] = [];
    const seen = new Set<string>();
    let current: AssignmentTicket | null | undefined = selectedTicket;

    while (current) {
      const key = current.id || (current as any)._id;
      if (key) {
        if (seen.has(key)) break;
        seen.add(key);
      }
      chain.unshift(current);
      const prevId = current.previousTicketId;
      if (!prevId) break;
      current = tickets.find((t) => (t.id || (t as any)._id) === prevId);
      if (!current) break;
    }

    return chain;
  }, [selectedTicket, tickets]);

  useEffect(() => {
    if (action === 'finalize' && selectedTicket) {
      setFinalizeData((prev) => ({
        finalReport: selectedTicket.progressNotes || prev.finalReport || '',
        homework: prev.homework || '',
        homeworkLink: '',
      }));
      if (selectedTicketMarkings.length > 0) {
        setShowMushaf(true);
        const firstPage = selectedTicketMarkings[0]?.page;
        setCurrentPage(firstPage || 1);
      }
    }
  }, [action, selectedTicket, selectedTicketMarkings]);

  const normalizeTicket = (incoming: any, fallback?: AssignmentTicket): AssignmentTicket => {
    const merged = {
      ...fallback,
      ...incoming,
    };

    return {
      id: incoming?._id || incoming?.id || fallback?.id || '',
      studentId: merged.studentId || fallback?.studentId || '',
      studentName: merged.studentName || fallback?.studentName || '',
      workflowStep: merged.workflowStep || fallback?.workflowStep || 'sabq',
      assignedTeacherId: merged.assignedTeacherId || fallback?.assignedTeacherId || '',
      assignedTeacherName: merged.assignedTeacherName || fallback?.assignedTeacherName || '',
      status: merged.status || fallback?.status || 'pending_review',
      progressNotes: merged.progressNotes ?? fallback?.progressNotes,
      audioLink: merged.audioLink ?? fallback?.audioLink,
      previousTicketId: merged.previousTicketId ?? fallback?.previousTicketId,
      nextTicketId: merged.nextTicketId ?? fallback?.nextTicketId,
      reviewedBy: merged.reviewedBy || fallback?.reviewedBy,
      reviewedAt: merged.reviewedAt ? new Date(merged.reviewedAt) : fallback?.reviewedAt,
      completedBy: merged.completedBy || fallback?.completedBy,
      completedAt: merged.completedAt ? new Date(merged.completedAt) : fallback?.completedAt,
      revisionNotes: merged.revisionNotes ?? fallback?.revisionNotes,
      finalReport: merged.finalReport ?? fallback?.finalReport,
      homework: merged.homework ?? fallback?.homework,
      homeworkLink: merged.homeworkLink ?? fallback?.homeworkLink,
      assignmentId: merged.assignmentId ?? fallback?.assignmentId,
      mushafMarkings: merged.mushafMarkings ?? fallback?.mushafMarkings,
      program: merged.program || fallback?.program || '',
      createdAt: merged.createdAt ? new Date(merged.createdAt) : fallback?.createdAt || new Date(),
      updatedAt: merged.updatedAt ? new Date(merged.updatedAt) : fallback?.updatedAt || new Date(),
    };
  };

  // Filter out finalized/completed tickets - they should not appear in the list
  const activeTickets = tickets.filter(t => 
    t.status !== 'finalized' && t.status !== 'completed'
  );
  
  const pendingTickets = useMemo(
    () => activeTickets.filter(t => t.status === 'pending_review'),
    [activeTickets]
  );

  const allTickets = useMemo(
    () => [...activeTickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [activeTickets]
  );

  const handleApprove = async () => {
    if (!selectedTicket) return;
    
    try {
      const ticketId = selectedTicket.id || (selectedTicket as any)._id;
      const result = await approveTicket(ticketId, user?.id || '');
      alert('✅ Ticket approved successfully!');
      if (result?.ticket) {
        const normalizedTicket = normalizeTicket(result.ticket, selectedTicket);
        setSelectedTicket(normalizedTicket);
        setAction(normalizedTicket.workflowStep === 'finalize' ? 'finalize' : 'assign-next');
      }
      setRevisionNotes('');
      setShowMushaf(false);
      refreshData().catch((err) => console.error('Error refreshing data after approval:', err));
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
    
    if (!finalizeData.homework.trim()) {
      alert('Please enter homework instructions');
      return;
    }

    try {
      const ticketId = selectedTicket.id || (selectedTicket as any)._id;
      if (selectedTicketMarkings.length > 0) {
        await updateTicket(ticketId, { mushafMarkings: selectedTicketMarkings });
      }
      const finalReportValue = finalizeData.finalReport.trim()
        ? finalizeData.finalReport.trim()
        : (selectedTicket.progressNotes?.trim() || 'Finalized by admin');
      await finalizeTicket(ticketId, {
        finalReport: finalReportValue,
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

  const getTicketKey = (ticket: AssignmentTicket) =>
    ticket.id || (ticket as any)._id || `ticket-${ticket.studentId}-${ticket.workflowStep}-${ticket.status}`;

  const formatHistoryTimestamp = (ticket: AssignmentTicket) => {
    const rawDate = (ticket as any).updatedAt || (ticket as any).completedAt || (ticket as any).createdAt;
    if (!rawDate) return '—';
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const studentTicketHistoryMap = useMemo(() => {
    const grouped = new Map<string, AssignmentTicket[]>();
    tickets.forEach(ticket => {
      const list = grouped.get(ticket.studentId) ?? [];
      list.push(ticket);
      grouped.set(ticket.studentId, list);
    });
    return grouped;
  }, [tickets]);

  const currentTicketList = useMemo(() => (
    view === 'pending' ? pendingTickets : allTickets
  ), [view, pendingTickets, allTickets]);

  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    currentTicketList.forEach(ticket => {
      const name = getStudentName(ticket.studentId).trim();
      if (name.length > 0) {
        letters.add(name[0].toUpperCase());
      }
    });
    return Array.from(letters).sort();
  }, [currentTicketList, students]);

  const filteredTickets = useMemo(() => {
    if (studentFilterLetter === 'ALL') {
      return currentTicketList;
    }
    return currentTicketList.filter(ticket => {
      const name = getStudentName(ticket.studentId).trim().toUpperCase();
      return name.startsWith(studentFilterLetter);
    });
  }, [currentTicketList, studentFilterLetter, students]);

  const handleToggleHistory = (ticketKey: string) => {
    setExpandedHistoryIds(prev => ({
      ...prev,
      [ticketKey]: !prev[ticketKey]
    }));
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
            Pending Review ({pendingTickets.length})
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
            {selectedTicket.status === 'approved' && (
              <div className="grid gap-3 sm:grid-cols-2 mb-6">
                <button
                  onClick={() => setAction('assign-next')}
                  disabled={selectedTicket.workflowStep === 'finalize'}
                  className={`px-4 py-3 rounded-lg font-semibold border transition-colors flex items-center justify-center gap-2 ${
                    selectedTicket.workflowStep === 'finalize'
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : action === 'assign-next'
                        ? 'bg-blue-600 text-white border-blue-600 shadow'
                        : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Assign to Next Teacher
                </button>
                <button
                  onClick={() => setAction('finalize')}
                  disabled={selectedTicket.workflowStep !== 'finalize'}
                  className={`px-4 py-3 rounded-lg font-semibold border transition-colors flex items-center justify-center gap-2 ${
                    selectedTicket.workflowStep !== 'finalize'
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : action === 'finalize'
                        ? 'bg-purple-600 text-white border-purple-600 shadow'
                        : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v8m0 0l3-3m-3 3l-3-3m9-5V6a2 2 0 00-2-2H8a2 2 0 00-2 2v2" />
                  </svg>
                  Finalize & Publish
                </button>
              </div>
            )}
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
            {selectedTicketMarkings.length > 0 && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">Mushaf Mistake Markings:</h4>
                  <button
                    onClick={() => {
                      setShowMushaf(!showMushaf);
                      if (!showMushaf) {
                        // Set to first page with mistakes
                        const firstMistakePage = selectedTicketMarkings[0]?.page ?? 1;
                        setCurrentPage(firstMistakePage);
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                  >
                    {showMushaf ? 'Hide' : 'View'} Mushaf ({selectedTicketMarkings.length} mistakes)
                  </button>
                </div>
                {!showMushaf && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-800 mb-3">
                      Teacher marked <strong>{selectedTicketMarkings.length} mistake{selectedTicketMarkings.length !== 1 ? 's' : ''}</strong> in the Mushaf.
                      Click "View Mushaf" to see them highlighted on the Quran pages.
                    </p>
                    {/* Quick navigation to pages with mistakes */}
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs font-semibold text-purple-900">Jump to pages:</span>
                      {mistakePages.map((page) => {
                          const mistakesOnPage = selectedTicketMarkings.filter((m) => m.page === page).length;
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
            {showMushaf && selectedTicketMarkings.length > 0 && (
              <div className="mb-6 bg-white p-4 rounded-lg border-2 border-purple-200">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">📖 Mushaf with Teacher's Markings</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Page {currentPage} • {selectedTicketMarkings.filter((m) => m.page === currentPage).length} mistake{selectedTicketMarkings.filter((m) => m.page === currentPage).length !== 1 ? 's' : ''} on this page
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
                  {mistakePages.map((page) => {
                      const mistakesOnPage = selectedTicketMarkings.filter((m) => m.page === page).length;
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
                  mistakes={selectedTicketMarkings}
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
              <div className="space-y-6 mb-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Teacher Report</h4>
                    <p className="whitespace-pre-wrap text-sm text-gray-700">
                      {selectedTicket.progressNotes?.trim() || 'No progress notes were provided.'}
                    </p>
                    {selectedTicket.audioLink && (
                      <a
                        href={selectedTicket.audioLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                      >
                        🎧 Listen to teacher audio
                      </a>
                    )}
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Listeners & Steps</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {ticketChain.map((ticket) => (
                        <li key={ticket.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
                          <span className="font-medium text-gray-900">{getStepLabel(ticket.workflowStep)}</span>
                          <span className="text-xs uppercase tracking-wide text-gray-500">{ticket.assignedTeacherName || '—'}</span>
                        </li>
                      ))}
                      {ticketChain.length === 0 && (
                        <li className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">
                          Listener information unavailable.
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">Mushaf Mistake Review</h4>
                      <p className="text-xs text-gray-500">
                        {selectedTicketMarkings.length > 0
                          ? `${selectedTicketMarkings.length} mistake${selectedTicketMarkings.length !== 1 ? 's' : ''} highlighted by the teacher.`
                          : 'No mistakes were marked for this ticket.'}
                      </p>
                    </div>
                    {selectedTicketMarkings.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {mistakePages.map((page) => (
                          <button
                            key={`finalize-page-${page}`}
                            onClick={() => setCurrentPage(page)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            }`}
                          >
                            Page {page}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedTicketMarkings.length > 0 ? (
                    <InteractiveMushaf
                      currentPage={currentPage}
                      onPageChange={setCurrentPage}
                      mistakes={selectedTicketMarkings}
                      onMistakeMark={() => {}}
                      readOnly
                      mode="viewing"
                    />
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                      No Mushaf markings available for this ticket.
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-900">Homework for Student</label>
                  <textarea
                    value={finalizeData.homework}
                    onChange={(e) => setFinalizeData((prev) => ({ ...prev, homework: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    rows={4}
                    placeholder="Enter clear homework instructions for the student..."
                  />
                  <p className="text-xs text-gray-500">These instructions will appear on the student dashboard immediately after publishing.</p>
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
          {availableLetters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setStudentFilterLetter('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                  studentFilterLetter === 'ALL'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              {availableLetters.map(letter => (
                <button
                  key={letter}
                  onClick={() => setStudentFilterLetter(letter)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors ${
                    studentFilterLetter === letter
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>
          )}

          {filteredTickets.map(ticket => {
            const ticketKey = getTicketKey(ticket);
            const isHistoryExpanded = !!expandedHistoryIds[ticketKey];
            const rawHistory = (studentTicketHistoryMap.get(ticket.studentId) || []).filter(otherTicket => getTicketKey(otherTicket) !== ticketKey);
            const historyEntries = rawHistory
              .slice()
              .sort((a, b) => {
                const aTime = new Date((a as any).updatedAt || (a as any).completedAt || (a as any).createdAt || 0).getTime();
                const bTime = new Date((b as any).updatedAt || (b as any).completedAt || (b as any).createdAt || 0).getTime();
                return bTime - aTime;
              });

            const nextStepLabel = ticket.workflowStep === 'finalize'
              ? 'Finalize'
              : ticket.workflowStep === 'manzil'
                ? 'Finalize'
                : ticket.workflowStep === 'sabqi'
                  ? '📿 Manzil'
                  : '📚 Sabqi';

            const currentStepIcon = ticket.workflowStep === 'sabq'
              ? '📖'
              : ticket.workflowStep === 'sabqi'
                ? '📚'
                : ticket.workflowStep === 'manzil'
                  ? '📿'
                  : '✅';

            return (
              <div
                key={ticketKey}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                      <span className="text-xl">{currentStepIcon}</span>
                      {getStudentName(ticket.studentId)}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <span className="font-medium">{getStepLabel(ticket.workflowStep)}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium">{nextStepLabel}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {ticket.workflowStep === 'finalize'
                        ? 'Ready for final report and homework.'
                        : 'Student hasn\'t recited next portion yet.'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[12rem]">
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Review
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setAction('assign-next');
                      }}
                      disabled={ticket.workflowStep === 'finalize'}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        ticket.workflowStep === 'finalize'
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                      }`}
                    >
                      Assign to Next Teacher
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setAction('finalize');
                      }}
                      disabled={ticket.workflowStep !== 'finalize'}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        ticket.workflowStep !== 'finalize'
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                      }`}
                    >
                      Finalize & Publish
                    </button>
                    <button
                      onClick={() => handleToggleHistory(ticketKey)}
                      className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className={`w-4 h-4 transition-transform ${isHistoryExpanded ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                      {isHistoryExpanded ? 'Hide History' : 'Show History'}
                    </button>
                  </div>
                </div>
                {isHistoryExpanded && (
                  <div className="mt-3 space-y-2">
                    {historyEntries.length === 0 ? (
                      <div className="p-3 text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-lg italic">
                        No previous assignments recorded for this student.
                      </div>
                    ) : (
                      historyEntries.map(historyTicket => {
                        const historyKey = getTicketKey(historyTicket);
                        return (
                          <div key={historyKey} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between gap-3 mb-1">
                              <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <span>{getStepLabel(historyTicket.workflowStep)}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${getStatusColor(historyTicket.status)}`}>
                                {historyTicket.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500">Updated {formatHistoryTimestamp(historyTicket)}</div>
                            <div className="text-[11px] text-gray-500">Teacher: {historyTicket.assignedTeacherName || '—'}</div>
                            {historyTicket.progressNotes && (
                              <p className="mt-2 text-xs text-gray-600 line-clamp-3">
                                {historyTicket.progressNotes}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredTickets.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">
                {currentTicketList.length === 0
                  ? 'No tickets found.'
                  : 'No tickets match the selected filter.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminTicketManagement;

