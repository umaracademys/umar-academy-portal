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
  const { tickets, students, teachers, updateTicket, approveTicket, assignTicketToNext, finalizeTicket, skipTicketToFinalize, refreshData } = useBackendData();
  const { user } = useAuth();
  
  const [view, setView] = useState<'pending' | 'all'>('pending');
  const [selectedTicket, setSelectedTicket] = useState<AssignmentTicket | null>(null);
  const [finalizeData, setFinalizeData] = useState({
    finalReport: '',
    homework: '',
    homeworkLink: ''
  });
  const [selectedNextTeacher, setSelectedNextTeacher] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [showMushaf, setShowMushaf] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [studentFilterLetter, setStudentFilterLetter] = useState<'ALL' | string>('ALL');
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});

  const selectedTicketMarkings = selectedTicket?.mushafMarkings ?? ([] as MushafMistake[]);

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

  const aggregatedMarkings = useMemo(() => {
    if (!selectedTicket) return [] as MushafMistake[];
    const combined: MushafMistake[] = [];
    ticketChain.forEach((ticket) => {
      if (Array.isArray(ticket.mushafMarkings)) {
        combined.push(...ticket.mushafMarkings);
      }
    });
    return combined;
  }, [selectedTicket, ticketChain]);

  useEffect(() => {
    if (selectedTicket && selectedTicket.status === 'approved' && selectedTicket.workflowStep !== 'finalize') {
      setSelectedNextTeacher(selectedTicket.assignedTeacherId || '');
    } else if (!selectedTicket) {
      setSelectedNextTeacher('');
    }
  }, [selectedTicket]);

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
      assignmentRange: merged.assignmentRange ?? fallback?.assignmentRange,
      assignmentPortion: merged.assignmentPortion ?? fallback?.assignmentPortion,
      createdAt: merged.createdAt ? new Date(merged.createdAt) : fallback?.createdAt || new Date(),
      updatedAt: merged.updatedAt ? new Date(merged.updatedAt) : fallback?.updatedAt || new Date(),
    };
  };

  // Filter out finalized/completed tickets - they should not appear in the list
  const activeTickets = tickets.filter(t => 
    t.status !== 'finalized' && t.status !== 'completed' && t.status !== 'skipped'
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
      alert('Ticket approved successfully!');
      if (result?.ticket) {
        const normalizedTicket = normalizeTicket(result.ticket, selectedTicket);
        setSelectedTicket(normalizedTicket);
      }
      setRevisionNotes('');
      setShowMushaf(false);
      refreshData().catch((err) => console.error('Error refreshing data after approval:', err));
    } catch (error) {
      console.error('Error approving ticket:', error);
      alert('Failed to approve ticket');
    }
    setShowRevisionForm(false);
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
      alert(`Next step activated and assigned to ${teacher.fullName}`);
      handleBackToList();
      await refreshData();
    } catch (error) {
      console.error('Error assigning to next teacher:', error);
      alert('Failed to assign ticket');
    }
  };

  const handleSkipToFinalize = async () => {
    if (!selectedTicket) return;

    try {
      const ticketId = selectedTicket.id || (selectedTicket as any)._id;
      const result = await skipTicketToFinalize(ticketId, user?.id || '');
      if (result?.ticket) {
        const normalizedTicket = normalizeTicket(result.ticket, selectedTicket);
        setSelectedTicket(normalizedTicket);
        setShowRevisionForm(false);
        setSelectedNextTeacher('');
        setShowMushaf(true);
        alert('Advanced directly to finalize step.');
      }
    } catch (error) {
      console.error('Error fast-forwarding ticket:', error);
      alert('Failed to fast-forward to finalization');
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
      alert('Ticket sent back for revision');
      setSelectedTicket(null);
      setRevisionNotes('');
      setShowRevisionForm(false);
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
      alert('Ticket finalized! Assignment created and visible to student.');
      handleBackToList();
      await refreshData();
    } catch (error) {
      console.error('Error finalizing ticket:', error);
      alert('Failed to finalize ticket');
    }
  };

  const handleBackToList = () => {
    setSelectedTicket(null);
    setRevisionNotes('');
    setSelectedNextTeacher('');
    setFinalizeData({ finalReport: '', homework: '', homeworkLink: '' });
    setShowMushaf(false);
    setShowRevisionForm(false);
  };

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student?.fullName || studentId;
  };

  const getStepLabel = (step: WorkflowStep) => {
    switch (step) {
      case 'sabq': return 'Sabq';
      case 'sabqi': return 'Sabqi';
      case 'manzil': return 'Manzil';
      case 'finalize': return 'Finalize';
      default: return step;
    }
  };

  const formatAssignmentPortion = (portion?: string) => {
    if (!portion) return '';
    switch (portion.toLowerCase()) {
      case 'quarter':
        return '¼ Juz';
      case 'half':
        return '½ Juz';
      case 'three_quarters':
        return '¾ Juz';
      case 'full':
        return 'Full Juz';
      default:
        return portion;
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'pending_review': return 'bg-soft-accent text-[var(--color-accent)]';
      case 'approved': return 'bg-soft-primary text-[var(--color-primary)]';
      case 'needs_revision': return 'bg-white border border-[rgba(var(--color-accent-rgb),0.45)] text-[var(--color-accent)]';
      case 'finalized': return 'bg-[var(--color-primary)] text-white';
      case 'skipped': return 'bg-gray-100 text-gray-500';
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

  const isPendingReview = selectedTicket?.status === 'pending_review';
  const isApproved = selectedTicket?.status === 'approved';
  const needsAssignment = isApproved && selectedTicket?.workflowStep !== 'finalize';
  const readyForFinalize = isApproved && selectedTicket?.workflowStep === 'finalize';
  const displayedMarkings = readyForFinalize ? aggregatedMarkings : selectedTicketMarkings;
  const mistakePages = useMemo(() => extractMistakePages(displayedMarkings), [displayedMarkings]);

  useEffect(() => {
    if (
      selectedTicket &&
      selectedTicket.status === 'approved' &&
      selectedTicket.workflowStep === 'finalize'
    ) {
      setFinalizeData((prev) => ({
        finalReport: selectedTicket.progressNotes || prev.finalReport || '',
        homework: prev.homework || '',
        homeworkLink: '',
      }));
      if (displayedMarkings.length > 0) {
        setShowMushaf(true);
        const firstPage = displayedMarkings[0]?.page;
        setCurrentPage(firstPage || 1);
      }
    } else {
      setShowMushaf(false);
    }
  }, [selectedTicket, displayedMarkings]);

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
        <h2 className="text-2xl font-bold text-gray-900">Ticket Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setView('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'pending' ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-200 text-[rgba(var(--color-primary-rgb),0.7)] hover:bg-soft-primary'
            }`}
          >
            Pending Review ({pendingTickets.length})
          </button>
          <button
            onClick={() => setView('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'all' ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-200 text-[rgba(var(--color-primary-rgb),0.7)] hover:bg-soft-primary'
            }`}
          >
            All Tickets
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 px-4 py-2"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {selectedTicket ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleBackToList}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              <span>←</span>
              Back to tickets
            </button>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusColor(selectedTicket.status)}`}
            >
              {selectedTicket.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
                <header className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Current step • {getStepLabel(selectedTicket.workflowStep)}
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">{getStudentName(selectedTicket.studentId)}</h3>
                </header>
                <dl className="grid gap-4 sm:grid-cols-2 text-sm text-gray-600">
                  <div>
                    <dt className="font-semibold text-gray-700">Assigned teacher</dt>
                    <dd>{selectedTicket.assignedTeacherName || '—'}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-gray-700">Program</dt>
                    <dd>{selectedTicket.program || '—'}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-gray-700">Range / Focus</dt>
                    <dd>{selectedTicket.assignmentRange || 'Not specified'}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-gray-700">Portion size</dt>
                    <dd>
                      {selectedTicket.assignmentPortion
                        ? formatAssignmentPortion(selectedTicket.assignmentPortion)
                        : 'Not specified'}
                    </dd>
                  </div>
                </dl>
                {selectedTicket.progressNotes && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Teacher notes
                    </h4>
                    <p className="whitespace-pre-wrap text-sm text-gray-700">
                      {selectedTicket.progressNotes}
                    </p>
                  </div>
                )}
                {selectedTicket.audioLink && (
                  <a
                    href={selectedTicket.audioLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:text-[rgba(var(--color-primary-rgb),0.85)]"
                  >
                    🎧 Listen to teacher audio
                  </a>
                )}
              </section>

              {isPendingReview && (
                <section className="space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-5">
                  <header>
                    <h4 className="text-base font-semibold text-blue-900">Review ticket</h4>
                    <p className="text-xs text-blue-700">
                      Approve if the recitation is good, or request a revision with clear guidance.
                    </p>
                  </header>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => {
                        setShowRevisionForm(false);
                        handleApprove();
                      }}
                      className="rounded-lg bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)]"
                    >
                      ✅ Approve and continue
                    </button>
                    <button
                      onClick={() => setShowRevisionForm((prev) => !prev)}
                      className="rounded-lg border border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-800 hover:bg-blue-100"
                    >
                      ↺ Request revision
                    </button>
                  </div>
                  {showRevisionForm && (
                    <div className="rounded-lg border border-dashed border-blue-200 bg-white p-4">
                      <label className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                        Revision notes
                      </label>
                      <textarea
                        value={revisionNotes}
                        onChange={(e) => setRevisionNotes(e.target.value)}
                        rows={3}
                        className="mt-2 w-full rounded-lg border border-blue-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Explain what needs to be redone..."
                      />
                      <button
                        onClick={() => {
                          handleReject();
                          setShowRevisionForm(false);
                        }}
                        disabled={!revisionNotes.trim()}
                        className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-accent-rgb),0.85)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Send back for revision
                      </button>
                    </div>
                  )}
                </section>
              )}

              {needsAssignment && (
                <section className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                  <header>
                    <h4 className="text-base font-semibold text-emerald-900">Assign the next listener</h4>
                    <p className="text-xs text-emerald-700">
                      Choose who should hear the next portion
                      ({selectedTicket.workflowStep === 'sabq' ? 'Sabqi' : selectedTicket.workflowStep === 'sabqi' ? 'Manzil' : 'Finalize'} step).
                    </p>
                  </header>
                  <select
                    value={selectedNextTeacher}
                    onChange={(e) => setSelectedNextTeacher(e.target.value)}
                    className="w-full rounded-lg border border-emerald-200 px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  >
                    <option value="">Select listening teacher…</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.fullName}
                      </option>
                    ))}
                  </select>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={handleAssignToNext}
                      disabled={!selectedNextTeacher}
                      className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Send to next teacher
                    </button>
                    <button
                      type="button"
                      onClick={handleSkipToFinalize}
                      className="rounded-lg border border-emerald-300 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      Finalize without next step
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    If the student will not recite the next portion today, jump straight to finalization and publish homework.
                  </p>
                </section>
              )}

              {readyForFinalize && (
                <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
                  <header className="space-y-1">
                    <h4 className="text-base font-semibold text-gray-900">Finalize & publish</h4>
                    <p className="text-xs text-gray-500">
                      Summarize today’s session and assign homework. The student will see this immediately.
                    </p>
                  </header>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                      <div className="font-semibold text-gray-900 mb-2">Teacher report</div>
                      <p className="whitespace-pre-wrap">
                        {selectedTicket.progressNotes?.trim() || 'No notes were provided by the teacher.'}
                      </p>
                      {selectedTicket.audioLink && (
                        <a
                          href={selectedTicket.audioLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:text-[rgba(var(--color-primary-rgb),0.85)]"
                        >
                          🎧 Listen to teacher audio
                        </a>
                      )}
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="font-semibold text-gray-900 mb-2 text-sm">Workflow progress</div>
                      <ul className="space-y-2 text-xs text-gray-700">
                        {ticketChain.map((ticket) => (
                          <li
                            key={ticket.id}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-gray-900">
                                {getStepLabel(ticket.workflowStep)}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${getStatusColor(ticket.status)}`}>
                                {ticket.status.replace('_', ' ')}
                              </span>
                            </div>
                            {ticket.assignmentRange && (
                              <p className="mt-1 text-[11px] text-gray-500">{ticket.assignmentRange}</p>
                            )}
                            {ticket.assignmentPortion && (
                              <p className="text-[11px] text-gray-400">
                                Portion: {ticket.assignmentPortion}
                              </p>
                            )}
                            {ticket.progressNotes && (
                              <p className="mt-1 whitespace-pre-wrap text-[11px] text-gray-600">
                                {ticket.progressNotes}
                              </p>
                            )}
                            <p className="mt-1 text-[11px] text-gray-500">
                              Listener: {ticket.assignedTeacherName || '—'}
                            </p>
                          </li>
                        ))}
                        {ticketChain.length === 0 && (
                          <li className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-gray-500">
                            Step history unavailable.
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Final report
                      </label>
                      <textarea
                        value={finalizeData.finalReport}
                        onChange={(e) => setFinalizeData((prev) => ({ ...prev, finalReport: e.target.value }))}
                        rows={4}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-accent-rgb),0.35)]"
                        placeholder="Summarize today’s recitation and general feedback…"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Homework for next session
                      </label>
                      <textarea
                        value={finalizeData.homework}
                        onChange={(e) => setFinalizeData((prev) => ({ ...prev, homework: e.target.value }))}
                        rows={4}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-accent-rgb),0.35)]"
                        placeholder="Clearly outline tomorrow’s assignment…"
                      />
                      <p className="text-[11px] text-gray-500">
                        Homework appears at the top of the student dashboard once you publish.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Optional resource link
                    </label>
                    <input
                      type="url"
                      value={finalizeData.homeworkLink}
                      onChange={(e) => setFinalizeData((prev) => ({ ...prev, homeworkLink: e.target.value }))}
                      className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-accent-rgb),0.35)]"
                      placeholder="https://example.com"
                    />
                  </div>
                  <button
                    onClick={handleFinalize}
                    className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-accent-rgb),0.85)]"
                  >
                    Finalize & publish to student
                  </button>
                </section>
              )}
            </div>

            <aside className="space-y-5">
              <section className="rounded-xl border border-gray-200 bg-white p-4">
                <header className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Mistakes marked</h4>
                  {displayedMarkings.length > 0 && (
                    <button
                      onClick={() => {
                        if (!showMushaf) {
                          const firstMistakePage = displayedMarkings[0]?.page ?? 1;
                          setCurrentPage(firstMistakePage);
                        }
                        setShowMushaf((prev) => !prev);
                      }}
                      className="text-xs font-semibold text-[var(--color-accent)] hover:text-[rgba(var(--color-accent-rgb),0.8)]"
                    >
                      {showMushaf ? 'Hide' : 'Open'} Mushaf
                    </button>
                  )}
                </header>
                {displayedMarkings.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">No mistakes were marked for this ticket.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-xs text-gray-600">
                    {mistakePages.map((page) => (
                      <li
                        key={`mistake-page-${page}`}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                      >
                        <span>Page {page}</span>
                        <span className="text-gray-400">
                          {displayedMarkings.filter((m) => m.page === page).length} issues
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {showMushaf && displayedMarkings.length > 0 && (
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900">Interactive Mushaf</h4>
                    <button
                      onClick={() => setShowMushaf(false)}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                    >
                      Close
                    </button>
                  </div>
                  <InteractiveMushaf
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    mistakes={displayedMarkings}
                    onMistakeMark={() => {}}
                    readOnly
                    mode="viewing"
                  />
                </section>
              )}
            </aside>
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
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                    : 'bg-white text-[rgba(var(--color-primary-rgb),0.7)] border-gray-300 hover:bg-soft-primary'
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
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                      : 'bg-white text-[rgba(var(--color-primary-rgb),0.7)] border-gray-300 hover:bg-soft-primary'
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
                  ? 'Manzil'
                  : 'Sabqi';

            return (
              <div
                key={ticketKey}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-soft-accent text-sm font-semibold text-[var(--color-accent)]">
                        {getStepLabel(ticket.workflowStep).slice(0, 1).toUpperCase()}
                      </span>
                      <span>{getStudentName(ticket.studentId)}</span>
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
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setShowRevisionForm(false);
                        setSelectedNextTeacher('');
                        setFinalizeData({ finalReport: '', homework: '', homeworkLink: '' });
                      }}
                      className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)]"
                    >
                      Review
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setShowRevisionForm(false);
                        setSelectedNextTeacher('');
                      }}
                      disabled={ticket.workflowStep === 'finalize'}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        ticket.workflowStep === 'finalize'
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'border border-[rgba(var(--color-primary-rgb),0.35)] bg-soft-primary text-[var(--color-primary)] hover:bg-soft-primary'
                      }`}
                    >
                      Assign Next
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setShowRevisionForm(false);
                        setFinalizeData({ finalReport: '', homework: '', homeworkLink: '' });
                      }}
                      disabled={ticket.workflowStep !== 'finalize'}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        ticket.workflowStep !== 'finalize'
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'border border-[rgba(var(--color-accent-rgb),0.35)] bg-soft-accent text-[var(--color-accent)] hover:bg-[rgba(var(--color-accent-rgb),0.25)]'
                      }`}
                    >
                      Finalize
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

