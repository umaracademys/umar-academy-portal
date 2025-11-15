import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { AssignmentTicket, TicketStatus, WorkflowStep, Student, Teacher, MushafMistake } from '../types';
import type { ClassworkSection } from '../types/assignment';
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
  const {
    tickets,
    students,
    teachers,
    updateTicket,
    approveTicket,
    assignTicketToNext,
    approveAndAdvanceTicket,
    finalizeTicket,
    skipTicketToFinalize,
    deleteTicket,
    deleteTickets,
    refreshData
  } = useBackendData();
  const { user } = useAuth();
  
  const [view, setView] = useState<'pending' | 'all' | 'sabq' | 'finalize'>('pending');
  const [selectedTicket, setSelectedTicket] = useState<AssignmentTicket | null>(null);
  const [finalizeData, setFinalizeData] = useState({
    finalReport: '',
    homework: '',
    homeworkLink: ''
  });
  // State for finalize view - keyed by ticket ID
  const [finalizeForms, setFinalizeForms] = useState<Record<string, {
    homework: string;
    homeworkLink: string;
    finalReport: string;
    isFinalizing: boolean;
  }>>({});
  const [selectedNextTeacher, setSelectedNextTeacher] = useState('');
  const [selectedNextTeacherNote, setSelectedNextTeacherNote] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [showMushaf, setShowMushaf] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [studentFilterLetter, setStudentFilterLetter] = useState<'ALL' | string>('ALL');
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});
  const [editingTicket, setEditingTicket] = useState<AssignmentTicket | null>(null);
  const [editForm, setEditForm] = useState({
    assignedTeacherId: '',
    progressNotes: '',
    assignmentRange: '',
    assignmentPortion: '',
    audioLink: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [ticketDeletingId, setTicketDeletingId] = useState<string | null>(null);
  const [approvingTicketId, setApprovingTicketId] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedTicketsMap, setSelectedTicketsMap] = useState<Record<string, boolean>>({});
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [quickAssignTicket, setQuickAssignTicket] = useState<AssignmentTicket | null>(null);
  const [quickAssignTeacherId, setQuickAssignTeacherId] = useState('');
  const [quickAssignFinalReport, setQuickAssignFinalReport] = useState('');
  const [quickAssignHomework, setQuickAssignHomework] = useState('');
  const [quickAssignHomeworkLink, setQuickAssignHomeworkLink] = useState('');
  const [quickAssignTeacherNote, setQuickAssignTeacherNote] = useState('');
  const [quickAssignLoading, setQuickAssignLoading] = useState({ approve: false, assign: false, finalize: false });
  const [quickAssignError, setQuickAssignError] = useState<string | null>(null);
  // New state for post-approval workflow
  const [showNextStepModal, setShowNextStepModal] = useState(false);
  const [approvedTicketForNextStep, setApprovedTicketForNextStep] = useState<AssignmentTicket | null>(null);
  const [nextStepData, setNextStepData] = useState({
    assignTo: 'teacher' as 'admin' | 'teacher',
    teacherId: '',
    sabqFeedback: ''
  });

  const selectedTicketMarkings = selectedTicket?.mushafMarkings ?? ([] as MushafMistake[]);

  const resolveNextActiveTicket = useCallback(
    (ticket?: AssignmentTicket | null) => {
      if (!ticket) return null;
      const visited = new Set<string>();
      let currentNextId = ticket.nextTicketId;

      while (currentNextId) {
        if (visited.has(currentNextId)) break;
        visited.add(currentNextId);

        const nextTicket = tickets.find(
          (candidate) =>
            (candidate.id || (candidate as any)._id) === currentNextId
        );

        if (!nextTicket) {
          break;
        }

        if (['approved', 'completed', 'skipped', 'finalized'].includes(nextTicket.status)) {
          currentNextId = nextTicket.nextTicketId || '';
          continue;
        }

        return nextTicket;
      }

      return null;
    },
    [tickets]
  );

  const TICKET_PORTION_OPTIONS: Array<{ value: string; label: string }> = useMemo(
    () => [
      { value: '', label: 'Unspecified' },
      { value: 'quarter', label: 'Quarter Juz' },
      { value: 'half', label: 'Half Juz' },
      { value: 'three_quarters', label: '¾ Juz' },
      { value: 'full', label: 'Full Juz' },
      { value: 'custom', label: 'Custom' },
      { value: 'pages', label: 'Pages' },
      { value: 'surah', label: 'Surah' },
    ],
    []
  );

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

  const nextActiveTicket = useMemo(
    () => resolveNextActiveTicket(selectedTicket),
    [resolveNextActiveTicket, selectedTicket]
  );

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

  const sabqTicketInChain = useMemo(() => {
    const reversed = [...ticketChain].reverse();
    return reversed.find((ticket) => ticket.workflowStep === 'sabq') || null;
  }, [ticketChain]);

  const sabqiTicketInChain = useMemo(() => {
    const reversed = [...ticketChain].reverse();
    return reversed.find((ticket) => ticket.workflowStep === 'sabqi') || null;
  }, [ticketChain]);

  const manzilTicketInChain = useMemo(() => {
    const reversed = [...ticketChain].reverse();
    return reversed.find((ticket) => ticket.workflowStep === 'manzil') || null;
  }, [ticketChain]);

  const finalizeHistoryEntries = useMemo(
    () => [
      {
        label: 'Sabqi',
        ticket: sabqiTicketInChain,
        notes: sabqiTicketInChain?.progressNotes?.trim() || '',
        range: sabqiTicketInChain?.assignmentRange || '',
        portion: sabqiTicketInChain?.assignmentPortion || '',
        teacher: sabqiTicketInChain?.assignedTeacherName || '',
      },
      {
        label: 'Manzil',
        ticket: manzilTicketInChain,
        notes: manzilTicketInChain?.progressNotes?.trim() || '',
        range: manzilTicketInChain?.assignmentRange || '',
        portion: manzilTicketInChain?.assignmentPortion || '',
        teacher: manzilTicketInChain?.assignedTeacherName || '',
      },
    ],
    [sabqiTicketInChain, manzilTicketInChain]
  );

  useEffect(() => {
    if (selectedTicket && selectedTicket.status === 'approved' && selectedTicket.workflowStep !== 'finalize') {
      setSelectedNextTeacher(selectedTicket.assignedTeacherId || '');
    } else if (!selectedTicket) {
      setSelectedNextTeacher('');
    }
  }, [selectedTicket]);

  const selectedTicketIds = useMemo(
    () => Object.entries(selectedTicketsMap).filter(([, isSelected]) => isSelected).map(([key]) => key),
    [selectedTicketsMap]
  );
  const selectedCount = selectedTicketIds.length;

  const removeTicketFromSelection = (ticketId: string) => {
    if (!ticketId) return;
    setSelectedTicketsMap(prev => {
      if (!prev[ticketId]) return prev;
      const next = { ...prev };
      delete next[ticketId];
      return next;
    });
  };

  const getStepLabel = (step: WorkflowStep) => {
    switch (step) {
      case 'sabq':
        return 'Sabq';
      case 'sabqi':
        return 'Sabqi';
      case 'manzil':
        return 'Manzil';
      case 'finalize':
        return 'Finalize';
      default:
        return step;
    }
  };

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

  const getTicketId = (ticket?: AssignmentTicket | null) =>
    ticket ? (ticket.id || (ticket as any)._id || '') : '';

  const findTicketById = useCallback((id?: string | null) => {
    if (!id) return null;
    return tickets.find((t) => (t.id || (t as any)._id) === id) || null;
  }, [tickets]);

  const quickAssignContext = useMemo(() => {
    if (!quickAssignTicket) return null;

    let base = quickAssignTicket;
    let next: AssignmentTicket | null = null;
    let guard = 0;

    while (guard < 10) {
      const nextId = base.nextTicketId;
      if (!nextId) {
        next = null;
        break;
      }

      const resolvedNext = findTicketById(nextId);
      if (!resolvedNext) {
        next = null;
        break;
      }

      if (resolvedNext.status === 'approved' || resolvedNext.status === 'completed') {
        base = resolvedNext;
        guard += 1;
        continue;
      }

      next = resolvedNext;
      break;
    }

    return { baseTicket: base, nextTicket: next };
  }, [quickAssignTicket, findTicketById]);

  const openQuickAssign = useCallback((ticket: AssignmentTicket) => {
    setQuickAssignTicket(ticket);
    setQuickAssignTeacherId('');
    setQuickAssignFinalReport(ticket.progressNotes || '');
    setQuickAssignHomework('');
    setQuickAssignHomeworkLink('');
    setQuickAssignTeacherNote(ticket.revisionNotes || '');
    setQuickAssignError(null);
    setQuickAssignLoading({ approve: false, assign: false, finalize: false });
  }, []);

  const closeQuickAssign = useCallback(() => {
    setQuickAssignTicket(null);
    setQuickAssignTeacherId('');
    setQuickAssignFinalReport('');
    setQuickAssignHomework('');
    setQuickAssignHomeworkLink('');
    setQuickAssignTeacherNote('');
    setQuickAssignError(null);
    setQuickAssignLoading({ approve: false, assign: false, finalize: false });
  }, []);

  useEffect(() => {
    if (!quickAssignContext || !quickAssignTicket) return;

    const { baseTicket, nextTicket } = quickAssignContext;

    if (nextTicket?.workflowStep === 'finalize') {
      if (!quickAssignFinalReport.trim()) {
        const fallbackReport = baseTicket.progressNotes || quickAssignTicket.progressNotes || '';
        setQuickAssignFinalReport(fallbackReport);
      }
    } else if (nextTicket) {
      const defaultTeacherId = nextTicket.assignedTeacherId || baseTicket.assignedTeacherId || '';
      if (!quickAssignTeacherId && defaultTeacherId) {
        setQuickAssignTeacherId(defaultTeacherId);
      }
    }
    if (nextTicket?.workflowStep === 'finalize') {
      if (!quickAssignFinalReport.trim()) {
        const fallbackReport = baseTicket.progressNotes || quickAssignTicket.progressNotes || '';
        setQuickAssignFinalReport(fallbackReport);
      }
      if (!quickAssignTeacherNote.trim() && baseTicket.revisionNotes) {
        setQuickAssignTeacherNote(baseTicket.revisionNotes);
      }
    } else if (nextTicket) {
      const defaultTeacherId = nextTicket.assignedTeacherId || baseTicket.assignedTeacherId || '';
      if (!quickAssignTeacherId && defaultTeacherId) {
        setQuickAssignTeacherId(defaultTeacherId);
      }
      if (!quickAssignTeacherNote.trim()) {
        setQuickAssignTeacherNote(nextTicket.revisionNotes || baseTicket.revisionNotes || '');
      }
    } else if (!quickAssignTeacherNote.trim()) {
      setQuickAssignTeacherNote(baseTicket.revisionNotes || '');
    }
  }, [quickAssignContext, quickAssignFinalReport, quickAssignTeacherId, quickAssignTeacherNote, quickAssignTicket]);

  const handleQuickApprove = useCallback(async () => {
    if (!quickAssignTicket) return;

    try {
      setQuickAssignLoading((prev) => ({ ...prev, approve: true }));
      const ticketId = getTicketId(quickAssignTicket);
      const result = await approveTicket(ticketId, user?.id || '');
      if (result?.ticket) {
        const normalizedTicket = normalizeTicket(result.ticket, quickAssignTicket);
        setQuickAssignTicket(normalizedTicket);
      }
      setQuickAssignError(null);
      await refreshData();
    } catch (error) {
      console.error('Error approving ticket in quick assign:', error);
      setQuickAssignError('Failed to approve this ticket. Please try again.');
    } finally {
      setQuickAssignLoading((prev) => ({ ...prev, approve: false }));
    }
  }, [approveTicket, quickAssignTicket, refreshData, user]);

  const handleQuickAssignNext = useCallback(async () => {
    if (!quickAssignContext?.baseTicket || !quickAssignContext.nextTicket) return;

    if (!quickAssignTeacherId) {
      setQuickAssignError('Select a teacher for the next step.');
      return;
    }

    const teacher = teachers.find((t) => t.id === quickAssignTeacherId);
    if (!teacher) {
      setQuickAssignError('Unable to find the selected teacher.');
      return;
    }

    try {
      setQuickAssignLoading((prev) => ({ ...prev, assign: true }));
      const baseTicketId = getTicketId(quickAssignContext.baseTicket);
      await assignTicketToNext(
        baseTicketId,
        teacher.id,
        teacher.fullName,
        quickAssignTeacherNote.trim() || undefined
      );
      alert(`Assigned ${quickAssignContext.nextTicket.workflowStep} to ${teacher.fullName}`);
      setQuickAssignError(null);
      closeQuickAssign();
      await refreshData();
    } catch (error) {
      console.error('Error assigning next step:', error);
      setQuickAssignError('Failed to assign the next step.');
    } finally {
      setQuickAssignLoading((prev) => ({ ...prev, assign: false }));
    }
  }, [assignTicketToNext, closeQuickAssign, quickAssignContext, quickAssignTeacherId, quickAssignTeacherNote, refreshData, teachers]);

  const handleQuickFinalize = useCallback(async () => {
    if (!quickAssignContext?.nextTicket) return;

    if (!quickAssignHomework.trim()) {
      setQuickAssignError('Homework instructions are required to finalize.');
      return;
    }

    try {
      setQuickAssignLoading((prev) => ({ ...prev, finalize: true }));
      const ticketId = getTicketId(quickAssignContext.nextTicket);
      const finalReportValue = quickAssignFinalReport.trim()
        ? quickAssignFinalReport.trim()
        : quickAssignContext.baseTicket.progressNotes || 'Finalized by admin';
      await finalizeTicket(ticketId, {
        finalReport: finalReportValue,
        homework: quickAssignHomework.trim(),
        homeworkLink: quickAssignHomeworkLink.trim(),
        reviewedBy: user?.id || ''
      });
      alert('Homework published and ticket finalized.');
      setQuickAssignError(null);
      closeQuickAssign();
      await refreshData();
    } catch (error) {
      console.error('Error finalizing ticket:', error);
      setQuickAssignError('Failed to finalize this ticket.');
    } finally {
      setQuickAssignLoading((prev) => ({ ...prev, finalize: false }));
    }
  }, [closeQuickAssign, finalizeTicket, quickAssignContext, quickAssignFinalReport, quickAssignHomework, quickAssignHomeworkLink, refreshData, user]);

  const quickAssignIsApproved = quickAssignTicket?.status === 'approved';
  const quickAssignNextTicket = quickAssignContext?.nextTicket || null;
  const quickAssignNextStepLabel = quickAssignNextTicket ? getStepLabel(quickAssignNextTicket.workflowStep) : '';
  const quickAssignCurrentLabel = quickAssignTicket ? getStepLabel(quickAssignTicket.workflowStep) : '';
 
  // Filter out finalized/completed tickets - they should not appear in the list
  // BUT keep approved tickets visible so admin can see next step options
  const activeTickets = tickets.filter(t => 
    t.status !== 'finalized' &&
    t.status !== 'completed' &&
    t.status !== 'skipped' &&
    !(t.workflowStep === 'finalize' && Boolean((t as any).assignmentId))
  );
  
  // Include pending_review, in_progress, AND approved tickets in pending view
  // Approved tickets stay visible so admin can assign next steps (e.g., Sabq after Sabqi approval)
  const pendingTickets = useMemo(
    () => activeTickets.filter(t => 
      t.status === 'pending_review' || 
      t.status === 'in_progress' || 
      t.status === 'approved'
    ),
    [activeTickets]
  );

  // Filter all Sabq tickets (all statuses)
  const sabqTickets = useMemo(
    () => activeTickets.filter(t => t.workflowStep === 'sabq')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [activeTickets]
  );

  // Filter tickets ready for finalization (finalize step, approved, no assignment yet)
  const finalizeTickets = useMemo(
    () => activeTickets.filter(t => 
      t.workflowStep === 'finalize' && 
      t.status === 'approved' &&
      !(t as any).assignmentId
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [activeTickets]
  );

  const allTickets = useMemo(
    () => [...activeTickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [activeTickets]
  );

  const handleApprove = async (ticketOverride?: AssignmentTicket) => {
    const targetTicket = ticketOverride ?? selectedTicket;
    if (!targetTicket) return;

    const ticketId = getTicketIdString(targetTicket);
    if (!ticketId) return;

    const isFinalStep = targetTicket.workflowStep === 'finalize';

    try {
      setApprovingTicketId(ticketId);
      setActionBanner(null);

      let bannerMessage = '';
      let normalizedTicket = targetTicket;

      if (isFinalStep) {
        const result = await approveTicket(ticketId, user?.id || '');
        if (result?.ticket) {
          normalizedTicket = normalizeTicket(result.ticket, targetTicket);
        }

        bannerMessage =
          result?.message ||
          `${targetTicket.studentName}'s ${getStepLabel(targetTicket.workflowStep)} ticket is approved. Add homework and finalize next.`;

        setSelectedTicket(normalizedTicket);
        setShowRevisionForm(false);
      } else {
        // Approve the ticket but DON'T close it - show next step options instead
        const result = await approveTicket(ticketId, user?.id || '');
        
        if (result?.ticket) {
          normalizedTicket = normalizeTicket(result.ticket, targetTicket);
        }

        // Determine next step based on workflow
        const workflowFlow: Record<Exclude<WorkflowStep, 'finalize'>, WorkflowStep> = {
          sabq: 'sabqi',
          sabqi: 'manzil',
          manzil: 'finalize',
        };
        const nextStep = workflowFlow[targetTicket.workflowStep as Exclude<WorkflowStep, 'finalize'>];
        
        // Check if this is a Sabq ticket that was approved after Sabqi
        // If so, check if Sabqi is already approved and show combined review
        if (targetTicket.workflowStep === 'sabq' && targetTicket.previousTicketId) {
          // Find the previous ticket (should be Sabqi)
          const previousTicketId = targetTicket.previousTicketId;
          const previousTicket = tickets.find(t => {
            const tId = t.id || (t as any)._id;
            return tId === previousTicketId || tId?.toString() === previousTicketId?.toString();
          });
          
          if (previousTicket && previousTicket.workflowStep === 'sabqi' && previousTicket.status === 'approved') {
            // Sabqi is approved, Sabq is now approved → Show Combined Review View
            setSelectedTicket(normalizedTicket); // Keep ticket open
            setShowRevisionForm(false);
            // We'll show combined review in the UI (to be implemented)
            bannerMessage = `${targetTicket.studentName}'s Sabq ticket approved. Review combined reports (Sabqi + Sabq) and finalize.`;
          } else {
            // Just Sabq approved, no combined review yet
            setSelectedTicket(normalizedTicket); // Keep ticket open
            setShowRevisionForm(false);
            bannerMessage = `${targetTicket.studentName}'s ${getStepLabel(targetTicket.workflowStep)} ticket is approved.`;
          }
        } 
        // If next step is Sabq (after Sabqi approval), show "Assign for Sabq" modal
        else if (nextStep === 'sabq') {
          setApprovedTicketForNextStep(normalizedTicket);
          setNextStepData({
            assignTo: 'teacher',
            teacherId: '',
            sabqFeedback: ''
          });
          setShowNextStepModal(true);
          setSelectedTicket(normalizedTicket); // Keep ticket open
          setShowRevisionForm(false);
          bannerMessage = `${targetTicket.studentName}'s ${getStepLabel(targetTicket.workflowStep)} ticket is approved. Assign for Sabq next.`;
        } else if (nextStep === 'finalize') {
          // If next step is finalize (after Manzil approval), show combined review
          setSelectedTicket(normalizedTicket);
          setShowRevisionForm(false);
          bannerMessage = `${targetTicket.studentName}'s ${getStepLabel(targetTicket.workflowStep)} ticket is approved. Review all reports and finalize.`;
        } else {
          // For other steps, just approve and keep ticket open
          setSelectedTicket(normalizedTicket); // Keep ticket open
          setShowRevisionForm(false);
          bannerMessage = `${targetTicket.studentName}'s ${getStepLabel(targetTicket.workflowStep)} ticket is approved.`;
        }
      }

      setRevisionNotes('');
      setShowMushaf(false);

      await refreshData();
      setActionBanner({ type: 'success', message: bannerMessage });
    } catch (error) {
      console.error('Error approving ticket:', error);
      setActionBanner({ type: 'error', message: 'Failed to approve ticket. Please try again.' });
    } finally {
      setApprovingTicketId(null);
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
      const trimmedNote = selectedNextTeacherNote.trim();
      await assignTicketToNext(
        ticketId,
        teacher.id,
        teacher.fullName,
                        trimmedNote || undefined
      );
      alert(`Next step activated and assigned to ${teacher.fullName}`);
      handleBackToList();
      await refreshData();
    } catch (error) {
      console.error('Error assigning to next teacher:', error);
      alert('Failed to assign ticket');
    }
  };

  // Handler for saving Sabq feedback after Sabqi approval
  const handleSaveSabqFeedback = async () => {
    if (!approvedTicketForNextStep) return;

    if (nextStepData.assignTo === 'teacher' && !nextStepData.teacherId) {
      alert('Please select a teacher or assign to Admin');
      return;
    }

    try {
      const ticketId = getTicketIdString(approvedTicketForNextStep);
      const teacher = nextStepData.assignTo === 'teacher' 
        ? teachers.find(t => t.id === nextStepData.teacherId)
        : null;
      
      if (nextStepData.assignTo === 'teacher' && !teacher) {
        alert('Selected teacher not found');
        return;
      }

      // Use the new endpoint to create Sabq ticket
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/tickets/${ticketId}/create-sabq-ticket`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignedTeacherId: nextStepData.assignTo === 'teacher' 
              ? nextStepData.teacherId 
              : (user?.id || 'admin'),
            assignedTeacherName: nextStepData.assignTo === 'teacher'
              ? teacher?.fullName || 'Teacher'
              : (user?.name || 'Admin'),
            sabqFeedback: nextStepData.sabqFeedback.trim() || undefined,
            notes: nextStepData.sabqFeedback.trim() || undefined
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create Sabq ticket');
      }

      const result = await response.json();
      
      await refreshData();
      setShowNextStepModal(false);
      setApprovedTicketForNextStep(null);
      setNextStepData({ assignTo: 'teacher', teacherId: '', sabqFeedback: '' });
      
      alert(`Sabq ticket created and assigned to ${result.ticket.assignedTeacherName}`);
    } catch (error: any) {
      console.error('Error saving Sabq feedback:', error);
      alert(error.message || 'Failed to save Sabq feedback');
    }
  };

  const getTicketIdString = (ticket: AssignmentTicket): string =>
    ticket.id || (ticket as any)._id || '';

  const handleToggleTicketSelection = (ticket: AssignmentTicket) => {
    const ticketId = getTicketIdString(ticket);
    if (!ticketId) return;

    setSelectedTicketsMap((prev) => {
      const next = { ...prev };
      if (next[ticketId]) {
        delete next[ticketId];
      } else {
        next[ticketId] = true;
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const next: Record<string, boolean> = {};
    filteredTickets.forEach((ticket) => {
      const ticketId = getTicketIdString(ticket);
      if (ticketId) {
        next[ticketId] = true;
      }
    });
    setSelectedTicketsMap(next);
  };

  const clearSelectedTickets = () => {
    setSelectedTicketsMap({});
  };

  const handleBulkDeleteTickets = async () => {
    if (selectedCount === 0) return;

    const confirmDelete =
      typeof window === 'undefined'
        ? true
        : window.confirm(`Delete ${selectedCount} selected ticket${selectedCount === 1 ? '' : 's'}? This cannot be undone.`);

    if (!confirmDelete) return;

    const ticketIds = selectedTicketIds;

    setIsBulkDeleting(true);
    try {
      if (ticketIds.length === 1) {
        await deleteTicket(ticketIds[0]);
      } else {
        await deleteTickets(ticketIds);
      }
      if (selectedTicket && ticketIds.includes(getTicketIdString(selectedTicket))) {
        setSelectedTicket(null);
      }
      clearSelectedTickets();
      await refreshData();
    } catch (error) {
      console.error('Error deleting tickets:', error);
      alert('Failed to delete selected tickets.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleStartEditTicket = (ticket: AssignmentTicket) => {
    setEditingTicket(ticket);
    setEditForm({
      assignedTeacherId: ticket.assignedTeacherId || '',
      progressNotes: ticket.progressNotes || '',
      assignmentRange: ticket.assignmentRange || '',
      assignmentPortion: ticket.assignmentPortion || '',
      audioLink: ticket.audioLink || ''
    });
  };

  const handleSaveTicketEdit = async () => {
    if (!editingTicket) return;

    const ticketId = editingTicket.id || (editingTicket as any)._id;
    if (!ticketId) return;

    const teacher = teachers.find(t => t.id === editForm.assignedTeacherId);

    const payload: Partial<AssignmentTicket> = {
      progressNotes: editForm.progressNotes,
      assignmentRange: editForm.assignmentRange,
      assignmentPortion: editForm.assignmentPortion,
      audioLink: editForm.audioLink,
    };

    if (editForm.assignedTeacherId) {
      payload.assignedTeacherId = editForm.assignedTeacherId;
      payload.assignedTeacherName = teacher?.fullName || editingTicket.assignedTeacherName;
    }

    setIsSavingEdit(true);
    try {
      await updateTicket(ticketId, payload);

      if (selectedTicket && (selectedTicket.id || (selectedTicket as any)._id) === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, ...payload } : prev);
      }

      setEditingTicket(null);
      await refreshData();
      alert('Ticket updated successfully.');
    } catch (error) {
      console.error('Error updating ticket:', error);
      alert('Failed to update ticket.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteTicket = async (ticket: AssignmentTicket) => {
    const ticketId = ticket.id || (ticket as any)._id;
    if (!ticketId) return;

    if (typeof window !== 'undefined' && !window.confirm('Delete this ticket? This action cannot be undone.')) {
      return;
    }

    try {
      setTicketDeletingId(ticketId);
      await deleteTicket(ticketId);
      if (selectedTicket && (selectedTicket.id || (selectedTicket as any)._id) === ticketId) {
        setSelectedTicket(null);
      }
      removeTicketFromSelection(ticketId);
      await refreshData();
      alert('Ticket deleted successfully.');
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Failed to delete ticket.');
    } finally {
      setTicketDeletingId(null);
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
    if (!isAdminUser) {
      alert('Only admins can finalize tickets.');
      return;
    }

    const trimmedReport = finalizeData.finalReport.trim();
    const trimmedHomework = finalizeData.homework.trim();

    if (!trimmedReport) {
      alert('Please enter a sabq summary');
      return;
    }
    if (!trimmedHomework) {
      alert('Please enter homework instructions');
      return;
    }

    try {
      const ticketId = selectedTicket.id || (selectedTicket as any)._id;
      if (selectedTicketMarkings.length > 0) {
        await updateTicket(ticketId, { mushafMarkings: selectedTicketMarkings });
      }

      const previousReportsText = [
        sabqiTicketInChain?.progressNotes?.trim()
          ? `Sabqi Notes:\n${sabqiTicketInChain.progressNotes.trim()}`
          : null,
        manzilTicketInChain?.progressNotes?.trim()
          ? `Manzil Notes:\n${manzilTicketInChain.progressNotes.trim()}`
          : null,
      ]
        .filter(Boolean)
        .join('\n\n');

      const defaultReport =
        sabqTicketInChain?.progressNotes?.trim() ||
        selectedTicket.progressNotes?.trim() ||
        'Finalized by admin';

      const combinedFinalReport = [trimmedReport || defaultReport, previousReportsText]
        .filter(Boolean)
        .join('\n\n');

      const classworkSections: ClassworkSection[] = [];

      if (sabqTicketInChain?.progressNotes?.trim()) {
        classworkSections.push({
          step: 'sabq',
          title: 'Sabq Notes',
          summary: sabqTicketInChain.progressNotes.trim(),
          assignmentRange: sabqTicketInChain.assignmentRange || '',
          assignmentPortion: sabqTicketInChain.assignmentPortion,
          teacherName: sabqTicketInChain.assignedTeacherName || '',
          order: classworkSections.length,
        });
      }

      if (sabqiTicketInChain?.progressNotes?.trim()) {
        classworkSections.push({
          step: 'sabqi',
          title: 'Sabqi Notes',
          summary: sabqiTicketInChain.progressNotes.trim(),
          assignmentRange: sabqiTicketInChain.assignmentRange || '',
          assignmentPortion: sabqiTicketInChain.assignmentPortion,
          teacherName: sabqiTicketInChain.assignedTeacherName || '',
          order: classworkSections.length,
        });
      }

      if (manzilTicketInChain?.progressNotes?.trim()) {
        classworkSections.push({
          step: 'manzil',
          title: 'Manzil Notes',
          summary: manzilTicketInChain.progressNotes.trim(),
          assignmentRange: manzilTicketInChain.assignmentRange || '',
          assignmentPortion: manzilTicketInChain.assignmentPortion,
          teacherName: manzilTicketInChain.assignedTeacherName || '',
          order: classworkSections.length,
        });
      }

      await finalizeTicket(ticketId, {
        finalReport: combinedFinalReport,
        homework: trimmedHomework,
        homeworkLink: finalizeData.homeworkLink.trim(),
        reviewedBy: user?.id || '',
        classworkSections,
        classworkSummary: trimmedReport,
        homeworkSummary: trimmedHomework,
        classworkType: 'sabq',
      });

      alert('Ticket finalized! Assignment created and visible to student.');
      removeTicketFromSelection(ticketId);
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
    setSelectedNextTeacherNote('');
    setFinalizeData({ finalReport: '', homework: '', homeworkLink: '' });
    setShowMushaf(false);
    setShowRevisionForm(false);
    setActionBanner(null);
  };

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student?.fullName || studentId;
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

  const formatTicketTimestamp = (ticket?: AssignmentTicket | null) => {
    if (!ticket) return '—';
    const reference =
      (ticket.updatedAt instanceof Date ? ticket.updatedAt : null) ||
      (ticket.completedAt instanceof Date ? ticket.completedAt : null) ||
      (ticket.createdAt instanceof Date ? ticket.createdAt : null) ||
      null;
    const date =
      reference ||
      (ticket.updatedAt ? new Date(ticket.updatedAt) : ticket.createdAt ? new Date(ticket.createdAt) : null);
    if (!date || Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMistakeTypeLabel = (type: string) => {
    switch ((type || '').toLowerCase()) {
      case 'memory':
        return 'Memory';
      case 'madd':
        return 'Mad (Elongation)';
      case 'ikhfa':
        return 'Ikhfa';
      case 'holding':
        return 'Holding / Fluency';
      case 'tech':
        return 'Ghunna';
      case 'other':
        return 'Other';
      default:
        return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Other';
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'pending_review': return 'bg-soft-accent text-[var(--color-accent)]';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border border-blue-300';
      case 'approved': return 'bg-soft-primary text-[var(--color-primary)]';
      case 'needs_revision': return 'bg-white border border-[rgba(var(--color-accent-rgb),0.45)] text-[var(--color-accent)]';
      case 'finalized': return 'bg-[var(--color-primary)] text-white';
      case 'skipped': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTicketKey = (ticket: AssignmentTicket) =>
    ticket.id || (ticket as any)._id || `ticket-${ticket.studentId}-${ticket.workflowStep}`;

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

  const currentTicketList = useMemo(() => {
    if (view === 'pending') return pendingTickets;
    if (view === 'sabq') return sabqTickets;
    if (view === 'finalize') return finalizeTickets;
    return allTickets;
  }, [view, pendingTickets, sabqTickets, finalizeTickets, allTickets]);

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
  const needsAssignment =
    isApproved &&
    selectedTicket?.workflowStep !== 'finalize' &&
    !!nextActiveTicket;
  const readyForFinalize = isApproved && selectedTicket?.workflowStep === 'finalize';
  const isAdminUser = user?.role === 'admin' || user?.role === 'superadmin';
  const displayedMarkings = readyForFinalize ? aggregatedMarkings : selectedTicketMarkings;
  const mistakePages = useMemo(() => extractMistakePages(displayedMarkings), [displayedMarkings]);
  const mistakesByPage = useMemo(() => {
    const map = new Map<number, MushafMistake[]>();
    displayedMarkings.forEach((mark) => {
      if (typeof mark.page !== 'number') return;
      if (!map.has(mark.page)) {
        map.set(mark.page, []);
      }
      map.get(mark.page)!.push(mark);
    });
    return map;
  }, [displayedMarkings]);
  const mistakeTypeSummary = useMemo(() => {
    const counts = displayedMarkings.reduce<Record<string, number>>((acc, mark) => {
      const key = mark.type || 'other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return (Object.entries(counts) as Array<[string, number]>)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [displayedMarkings]);
  const totalMistakes = displayedMarkings.length;
  const totalMistakePages = mistakePages.length;

  useEffect(() => {
    if (readyForFinalize && selectedTicket) {
      const sabqDefault = sabqTicketInChain?.progressNotes?.trim() || selectedTicket.progressNotes?.trim() || '';
      const homeworkDefault = manzilTicketInChain?.progressNotes?.trim()
        ? `Review: ${manzilTicketInChain.progressNotes.trim()}`
        : '';

      setFinalizeData((prev) => ({
        finalReport: prev.finalReport || sabqDefault,
        homework: prev.homework || homeworkDefault,
        homeworkLink: prev.homeworkLink || '',
      }));

      if (aggregatedMarkings.length > 0) {
        const firstPage = aggregatedMarkings[0]?.page;
        setCurrentPage(typeof firstPage === 'number' ? firstPage : 1);
        setShowMushaf(true);
      } else {
        setShowMushaf(false);
        setCurrentPage(1);
      }
    } else if (!selectedTicket || displayedMarkings.length === 0) {
      setShowMushaf(false);
    }
  }, [
    aggregatedMarkings,
    displayedMarkings,
    manzilTicketInChain,
    readyForFinalize,
    sabqTicketInChain,
    selectedTicket,
  ]);

  useEffect(() => {
    if (selectedTicket && selectedTicket.workflowStep !== 'finalize') {
      const fallbackNote = selectedTicket.revisionNotes || '';
      setSelectedNextTeacherNote(nextActiveTicket?.revisionNotes || fallbackNote);
    } else {
      setSelectedNextTeacherNote('');
    }
  }, [nextActiveTicket, selectedTicket]);

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
    <>
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-7xl mx-auto max-h-[90vh] overflow-y-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">Ticket Management</h2>
            <p className="text-sm text-gray-500">
              {view === 'finalize'
                ? 'Review all reports from students and finalize with homework assignments.'
                : view === 'sabq' 
                ? 'All Sabq (New Lesson) tickets. Filter and manage Sabq tickets across all statuses.'
                : view === 'all'
                ? 'All tickets in the system. View and manage tickets across all workflow steps.'
                : 'Tickets that are currently under review. Approved tickets remain visible for next step assignment.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAdminUser && filteredTickets.length > 0 && (
              <button
                onClick={selectedCount === 0 ? handleSelectAllVisible : clearSelectedTickets}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                title={selectedCount === 0 ? 'Select all visible tickets' : 'Clear selection'}
              >
                {selectedCount === 0 ? `Select All (${filteredTickets.length})` : `Clear (${selectedCount})`}
              </button>
            )}
            <span className="rounded-full bg-soft-accent px-3 py-1 text-sm font-semibold text-[var(--color-accent)]">
              {pendingTickets.length} pending
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Close
              </button>
            )}
          </div>
        </div>
        {actionBanner && (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              actionBanner.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {actionBanner.message}
          </div>
        )}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setView('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'pending' ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-200 text-[rgba(var(--color-primary-rgb),0.7)] hover:bg-soft-primary'
              }`}
            >
              Pending & In Progress ({pendingTickets.length})
            </button>
            <button
              onClick={() => setView('sabq')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'sabq' ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-200 text-[rgba(var(--color-primary-rgb),0.7)] hover:bg-soft-primary'
              }`}
            >
              All Sabq Tickets ({sabqTickets.length})
            </button>
            <button
              onClick={() => setView('finalize')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'finalize' ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-200 text-[rgba(var(--color-primary-rgb),0.7)] hover:bg-soft-primary'
              }`}
            >
              Finalize Reports ({finalizeTickets.length})
            </button>
            <button
              onClick={() => setView('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'all' ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-200 text-[rgba(var(--color-primary-rgb),0.7)] hover:bg-soft-primary'
              }`}
            >
              All Tickets ({allTickets.length})
            </button>
          </div>
        </div>

        {!selectedTicket && selectedCount > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="font-semibold">
              {selectedCount} ticket{selectedCount === 1 ? '' : 's'} selected
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleBulkDeleteTickets}
                disabled={isBulkDeleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-75 shadow-sm hover:shadow-md"
              >
                {isBulkDeleting ? 'Deleting…' : 'Delete Selected'}
              </button>
              <button
                onClick={handleSelectAllVisible}
                className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
              >
                Select All Visible
              </button>
              <button
                onClick={clearSelectedTickets}
                className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-100 transition"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

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
                      CURRENT STEP • {selectedTicket.workflowStep.toUpperCase()}
                    </p>
                    <h3 className="text-2xl font-bold text-gray-900">{getStudentName(selectedTicket.studentId)}</h3>
                  </header>
                  <dl className="grid gap-4 sm:grid-cols-2 text-sm text-gray-600 mt-4">
                    <div>
                      <dt className="font-semibold text-gray-700 mb-1">Assigned teacher</dt>
                      <dd className="text-gray-900">{selectedTicket.assignedTeacherName || '—'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-700 mb-1">Program</dt>
                      <dd className="text-gray-900">{selectedTicket.program || '—'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-700 mb-1">Range / Focus</dt>
                      <dd className="text-gray-900">
                        {selectedTicket.assignmentRange || 'Not specified'}
                        {selectedTicket.assignmentPortion && (
                          <span className="ml-1">
                            • {formatAssignmentPortion(selectedTicket.assignmentPortion)}
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-700 mb-1">Portion size</dt>
                      <dd className="text-gray-900">
                        {selectedTicket.assignmentPortion
                          ? formatAssignmentPortion(selectedTicket.assignmentPortion)
                          : 'Not specified'}
                      </dd>
                    </div>
                  </dl>
                  {/* Admin's Internal Note Section */}
                  {(selectedTicket as any).revisionNotes && (
                    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                        ADMIN NOTES
                      </h4>
                      <p className="whitespace-pre-wrap text-sm text-gray-700">
                        {(selectedTicket as any).revisionNotes}
                      </p>
                    </div>
                  )}

                  {/* Teacher Notes Section */}
                  {selectedTicket.progressNotes && (
                    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                        TEACHER NOTES
                      </h4>
                      <p className="whitespace-pre-wrap text-sm text-gray-700">
                        {selectedTicket.progressNotes}
                      </p>
                    </div>
                  )}

                  {!selectedTicket.progressNotes && !(selectedTicket as any).revisionNotes && (
                    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                        TEACHER NOTES
                      </h4>
                      <p className="text-sm text-gray-500 italic">No notes recorded yet.</p>
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
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Internal note for next teacher
                      </label>
                      <textarea
                        value={selectedNextTeacherNote}
                        onChange={(event) => setSelectedNextTeacherNote(event.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        placeholder="Mention focus areas, mistakes to watch for, or pacing instructions…"
                      />
                    </div>
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
                  <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5">
                    <header className="space-y-1">
                      <h4 className="text-base font-semibold text-gray-900">Finalize & publish</h4>
                      <p className="text-xs text-gray-500">
                        Summarize today's session, assign homework, and send the full report to the student.
                      </p>
                    </header>

                    {!isAdminUser ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        Only admins can finalize tickets. Please reach out to an administrator to publish this report.
                      </div>
                    ) : (
                      <>
                        <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4">
                          <h5 className="text-sm font-semibold text-purple-800 mb-3">Recent listening reports</h5>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {finalizeHistoryEntries.map((entry) => (
                              <div
                                key={`finalize-history-${entry.label}`}
                                className="rounded-xl border border-purple-100 bg-white p-3 shadow-sm text-sm text-gray-700"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-xs uppercase tracking-wide text-purple-500 font-semibold">
                                    {entry.label}
                                  </p>
                                  <span className="text-[11px] text-gray-400">
                                    {formatTicketTimestamp(entry.ticket)}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                  Teacher:{' '}
                                  <span className="font-semibold text-gray-900">
                                    {entry.teacher || '—'}
                                  </span>
                                </p>
                                {entry.range && (
                                  <p className="text-xs text-gray-500">{entry.range}</p>
                                )}
                                {entry.portion && (
                                  <p className="text-[11px] text-gray-400">
                                    Portion: {formatAssignmentPortion(entry.portion)}
                                  </p>
                                )}
                                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700 min-h-[40px]">
                                  {entry.notes || 'No notes recorded yet.'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                          <h5 className="text-sm font-semibold text-gray-800 mb-3">Ticket history</h5>
                          <div className="space-y-3">
                            {ticketChain.map((ticket) => (
                              <div
                                key={ticket.id}
                                className="rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-600"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                    <span>{getStepLabel(ticket.workflowStep)}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(ticket.status)}`}>
                                      {ticket.status.replace('_', ' ')}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-gray-400">
                                    {formatTicketTimestamp(ticket)}
                                  </span>
                                </div>
                                {ticket.assignmentRange && (
                                  <p className="mt-1 text-[11px] text-gray-500">{ticket.assignmentRange}</p>
                                )}
                                {ticket.assignmentPortion && (
                                  <p className="text-[11px] text-gray-400">
                                    Portion: {formatAssignmentPortion(ticket.assignmentPortion as string)}
                                  </p>
                                )}
                                {ticket.progressNotes && (
                                  <p className="mt-2 whitespace-pre-wrap text-[11px] text-gray-600">
                                    {ticket.progressNotes}
                                  </p>
                                )}
                                <p className="mt-1 text-[11px] text-gray-500">
                                  Listener: {ticket.assignedTeacherName || '—'}
                                </p>
                              </div>
                            ))}
                            {ticketChain.length === 0 && (
                              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-3 py-2 text-xs text-gray-500">
                                Step history unavailable.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                              Sabq summary <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              value={finalizeData.finalReport}
                              onChange={(e) => setFinalizeData((prev) => ({ ...prev, finalReport: e.target.value }))}
                              rows={4}
                              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-accent-rgb),0.35)]"
                              placeholder="Summarize today's sabq…"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                              Homework for next session <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              value={finalizeData.homework}
                              onChange={(e) => setFinalizeData((prev) => ({ ...prev, homework: e.target.value }))}
                              rows={4}
                              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-accent-rgb),0.35)]"
                              placeholder="Clearly outline tomorrow's assignment…"
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
                            className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-accent-rgb),0.35)]"
                            placeholder="https://example.com"
                          />
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">
                          <h5 className="text-sm font-semibold text-gray-800 mb-3">Student preview</h5>
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-gray-500">Sabq summary</p>
                              <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-gray-50 px-3 py-2 text-gray-800 text-sm">
                                {finalizeData.finalReport || 'Add a sabq summary above.'}
                              </pre>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-gray-500">Previous reports</p>
                              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
                                <li>
                                  <span className="font-semibold">Sabqi:</span>{' '}
                                  {sabqiTicketInChain?.progressNotes?.trim() || 'No report.'}
                                </li>
                                <li>
                                  <span className="font-semibold">Manzil:</span>{' '}
                                  {manzilTicketInChain?.progressNotes?.trim() || 'No report.'}
                                </li>
                              </ul>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-gray-500">Homework</p>
                              <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-gray-50 px-3 py-2 text-gray-800 text-sm">
                                {finalizeData.homework || 'Add homework instructions above.'}
                              </pre>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                          <button
                            onClick={handleFinalize}
                            className="flex-1 rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-accent-rgb),0.85)]"
                          >
                            Finalize & publish to student
                          </button>
                          <button
                            type="button"
                            onClick={handleBackToList}
                            className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </section>
                )}
              </div>

              <aside className="space-y-5">
                <section className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                          🎯
                        </span>
                        <span>Mistakes overview</span>
                      </div>
                      {totalMistakes === 0 ? (
                        <p className="text-sm text-gray-500">
                          No mistakes were marked for this ticket.
                        </p>
                      ) : (
                        <>
                          <p className="text-sm text-gray-600">
                            {totalMistakes} mistake{totalMistakes !== 1 ? 's' : ''} across {totalMistakePages}{' '}
                            page{totalMistakePages !== 1 ? 's' : ''}
                          </p>
                          {mistakeTypeSummary.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {mistakeTypeSummary.map(({ type, count }) => (
                                <span
                                  key={type}
                                  className="inline-flex items-center gap-1 rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700"
                                >
                                  {getMistakeTypeLabel(type)}
                                  <span className="text-purple-500">· {count}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex flex-col items-stretch gap-2 sm:flex-row">
                      <button
                        onClick={() => {
                          if (totalMistakes === 0) return;
                          if (!showMushaf) {
                            const firstPage = mistakePages[0] ?? 1;
                            setCurrentPage(firstPage);
                          }
                          setShowMushaf((prev) => !prev);
                        }}
                        disabled={totalMistakes === 0}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                          totalMistakes === 0
                            ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                            : showMushaf
                              ? 'border-purple-600 bg-purple-600 text-white hover:bg-purple-700'
                              : 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
                        }`}
                      >
                        {showMushaf ? 'Hide Mushaf' : 'View Mushaf'}
                      </button>
                    </div>
                  </div>

                  {totalMistakes > 0 && (
                    <div className="mt-5 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Pages with mistakes
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {mistakePages.map((page) => {
                          const mistakesOnPage = mistakesByPage.get(page) || [];
                          return (
                            <div
                              key={`mistake-page-${page}`}
                              className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                            >
                              <div>
                                <p className="text-sm font-semibold text-gray-900">Page {page}</p>
                                <p className="text-xs text-gray-500">
                                  {mistakesOnPage.length} mistake{mistakesOnPage.length === 1 ? '' : 's'}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  if (!showMushaf) {
                                    setShowMushaf(true);
                                  }
                                  setCurrentPage(page);
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-white px-3 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50 transition"
                              >
                                View
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
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
              <div className="hidden flex flex-wrap items-center gap-2">
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

            <p className="text-sm text-gray-500">
              {view === 'finalize'
                ? 'Review all reports from students and finalize with homework assignments.'
                : 'Review and approve tickets. Approved tickets remain visible so you can assign next steps in the workflow.'}
            </p>

            {view === 'finalize' ? (
              // Special view for finalize tab - shows all reports grouped by student
              filteredTickets.map(ticketItem => {
                const ticketKey = getTicketKey(ticketItem);
                const ticketId = getTicketIdString(ticketItem);
                
                // Build ticket chain to get all reports from that day
                const buildTicketChain = (ticket: AssignmentTicket): AssignmentTicket[] => {
                  const chain: AssignmentTicket[] = [];
                  const seen = new Set<string>();
                  let current: AssignmentTicket | null | undefined = ticket;
                  
                  // Go backwards through previousTicketId chain
                  while (current) {
                    const key = current.id || (current as any)._id;
                    if (key && seen.has(key)) break;
                    if (key) seen.add(key);
                    chain.unshift(current);
                    const prevId = current.previousTicketId;
                    if (!prevId) break;
                    current = tickets.find((t) => {
                      const tId = t.id || (t as any)._id;
                      return tId === prevId || tId?.toString() === prevId?.toString();
                    });
                    if (!current) break;
                  }
                  return chain;
                };
                
                const ticketChain = buildTicketChain(ticketItem);
                const allReports = ticketChain.filter(t => ['sabqi', 'sabq', 'manzil'].includes(t.workflowStep));
                
                // Get student name
                const studentName = getStudentName(ticketItem.studentId);
                
                // Get or initialize form state for this ticket
                const formState = finalizeForms[ticketId] || {
                  homework: '',
                  homeworkLink: '',
                  finalReport: '',
                  isFinalizing: false
                };
                
                const updateFormState = (updates: Partial<typeof formState>) => {
                  setFinalizeForms(prev => ({
                    ...prev,
                    [ticketId]: { ...formState, ...updates }
                  }));
                };
                
                return (
                  <div
                    key={ticketKey}
                    className="border-2 border-[var(--color-primary)]/30 rounded-xl p-6 space-y-6 bg-gradient-to-br from-white to-gray-50/50"
                  >
                    {/* Student Name Header */}
                    <div className="border-b border-gray-200 pb-4">
                      <h2 className="text-3xl font-bold text-gray-900">{studentName}</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {ticketItem.program || 'Program not specified'} • {new Date(ticketItem.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {/* All Reports from That Day */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">All Reports</h3>
                      {allReports.length > 0 ? (
                        allReports.map((reportTicket) => {
                          const reportId = reportTicket.id || (reportTicket as any)._id;
                          return (
                            <div
                              key={reportId}
                              className="bg-white rounded-lg border border-gray-200 p-4 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="text-base font-semibold text-gray-900 capitalize">
                                  {reportTicket.workflowStep === 'sabqi' ? 'Sabqi' : reportTicket.workflowStep === 'sabq' ? 'Sabq' : 'Manzil'} Report
                                </h4>
                                <span className="text-xs font-medium text-gray-500">
                                  Teacher: {reportTicket.assignedTeacherName || '—'}
                                </span>
                              </div>
                              
                              {reportTicket.progressNotes && (
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {reportTicket.progressNotes}
                                  </p>
                                </div>
                              )}
                              
                              {(reportTicket as any).mushafMarkings && Array.isArray((reportTicket as any).mushafMarkings) && (reportTicket as any).mushafMarkings.length > 0 && (
                                <div className="text-xs text-gray-500">
                                  Mistakes: {(reportTicket as any).mushafMarkings.length}
                                </div>
                              )}
                              
                              {reportTicket.assignmentRange && (
                                <div className="text-xs text-gray-500">
                                  Range: {reportTicket.assignmentRange}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-gray-500 italic">No reports found for this ticket.</p>
                      )}
                    </div>
                    
                    {/* Homework Fields */}
                    <div className="border-t border-gray-200 pt-4 space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Finalize & Publish</h3>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Final Report (Optional)
                        </label>
                        <textarea
                          value={formState.finalReport}
                          onChange={(e) => updateFormState({ finalReport: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all resize-none"
                          placeholder="Add any final notes or summary..."
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Homework Instructions <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={formState.homework}
                          onChange={(e) => updateFormState({ homework: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all resize-none"
                          placeholder="Enter homework instructions for the student..."
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Homework Link (Optional)
                        </label>
                        <input
                          type="url"
                          value={formState.homeworkLink}
                          onChange={(e) => updateFormState({ homeworkLink: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                          placeholder="https://..."
                        />
                      </div>
                      
                      <button
                        onClick={async () => {
                          if (!formState.homework.trim()) {
                            alert('Homework instructions are required to finalize.');
                            return;
                          }
                          
                          updateFormState({ isFinalizing: true });
                          try {
                            await finalizeTicket(ticketId, {
                              finalReport: formState.finalReport.trim() || undefined,
                              homework: formState.homework.trim(),
                              homeworkLink: formState.homeworkLink.trim() || undefined,
                              reviewedBy: user?.id || '',
                              classworkSections: allReports.map(r => ({
                                step: r.workflowStep,
                                title: r.workflowStep === 'sabqi' ? 'Sabqi' : r.workflowStep === 'sabq' ? 'Sabq' : 'Manzil',
                                details: r.progressNotes || '',
                                teacherName: r.assignedTeacherName || '',
                                order: allReports.indexOf(r),
                                assignmentRange: r.assignmentRange || '',
                                assignmentPortion: r.assignmentPortion || ''
                              })),
                              classworkType: 'sabq',
                              classworkSummary: formState.finalReport.trim() || allReports.map(r => r.progressNotes).filter(Boolean).join('\n\n'),
                              homeworkSummary: formState.homework.trim()
                            } as any);
                            
                            alert('Ticket finalized! Assignment created and visible to student.');
                            updateFormState({
                              homework: '',
                              homeworkLink: '',
                              finalReport: '',
                              isFinalizing: false
                            });
                            await refreshData();
                          } catch (error: any) {
                            console.error('Error finalizing ticket:', error);
                            alert(error.message || 'Failed to finalize ticket');
                            updateFormState({ isFinalizing: false });
                          }
                        }}
                        disabled={formState.isFinalizing || !formState.homework.trim()}
                        className="w-full rounded-lg bg-[var(--color-primary)] px-6 py-3 text-base font-semibold text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)] disabled:cursor-not-allowed disabled:opacity-50 shadow-lg hover:shadow-xl"
                      >
                        {formState.isFinalizing ? 'Finalizing...' : 'Finalize & Publish to Student'}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              filteredTickets.map(ticket => {
              const ticketKey = getTicketKey(ticket);
              const ticketId = getTicketIdString(ticket);
              const isSelected = !!selectedTicketsMap[ticketId];
              const isApproving = approvingTicketId === ticketId;
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
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1 space-y-2">
                      {isAdminUser && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleTicketSelection(ticket)}
                          className="w-4 h-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                          title="Select ticket for bulk operations"
                        />
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          CURRENT STEP • {ticket.workflowStep.toUpperCase()}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(ticket.status)}`}>
                          {ticket.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">{getStudentName(ticket.studentId)}</h3>
                      
                      {/* Student Info Grid */}
                      <div className="grid gap-4 sm:grid-cols-2 mt-4">
                        <div>
                          <dt className="font-semibold text-gray-700 text-sm mb-1">Assigned teacher</dt>
                          <dd className="text-sm text-gray-900">{ticket.assignedTeacherName || '—'}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-gray-700 text-sm mb-1">Program</dt>
                          <dd className="text-sm text-gray-900">{ticket.program || '—'}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-gray-700 text-sm mb-1">Range / Focus</dt>
                          <dd className="text-sm text-gray-900">
                            {ticket.assignmentRange || 'Not specified'}
                            {ticket.assignmentPortion && (
                              <span className="ml-1">
                                • {formatAssignmentPortion(ticket.assignmentPortion as string)}
                              </span>
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-gray-700 text-sm mb-1">Portion size</dt>
                          <dd className="text-sm text-gray-900">
                            {ticket.assignmentPortion
                              ? formatAssignmentPortion(ticket.assignmentPortion as string)
                              : 'Not specified'}
                          </dd>
                        </div>
                      </div>

                      {/* Admin's Internal Note Section */}
                      {(ticket as any).revisionNotes && (
                        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                            ADMIN NOTES
                          </h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {(ticket as any).revisionNotes}
                          </p>
                        </div>
                      )}

                      {/* Teacher Notes Section */}
                      {ticket.progressNotes && (
                        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                            TEACHER NOTES
                          </h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {ticket.progressNotes}
                          </p>
                        </div>
                      )}

                      {!ticket.progressNotes && !(ticket as any).revisionNotes && (
                        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                            TEACHER NOTES
                          </h4>
                          <p className="text-sm text-gray-500 italic">No notes recorded yet.</p>
                        </div>
                      )}

                      {/* Additional Info */}
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                        <span>Submitted {formatTicketTimestamp(ticket)}</span>
                        <span>•</span>
                        <span>Mistakes: {typeof (ticket as any).mistakeCount === 'number' ? (ticket as any).mistakeCount : 0}</span>
                        <span>•</span>
                        <span>Next: {nextStepLabel}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[12rem]">
                      {ticket.status === 'approved' ? (
                        <>
                          {/* Approved tickets: Show "Assign Next" or "Finalize" button */}
                          {ticket.workflowStep !== 'finalize' ? (
                            <button
                              onClick={() => {
                                setActionBanner(null);
                                setSelectedTicket(ticket);
                                setShowRevisionForm(false);
                                // If Sabqi approved, show "Assign for Sabq" modal
                                if (ticket.workflowStep === 'sabqi') {
                                  setApprovedTicketForNextStep(ticket);
                                  setNextStepData({
                                    assignTo: 'teacher',
                                    teacherId: '',
                                    sabqFeedback: ''
                                  });
                                  setShowNextStepModal(true);
                                } else {
                                  // For other approved tickets, allow quick assign
                                  openQuickAssign(ticket);
                                }
                                setSelectedNextTeacher('');
                              }}
                              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)]"
                            >
                              Assign Next
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setActionBanner(null);
                                setSelectedTicket(ticket);
                                setShowRevisionForm(false);
                                setSelectedNextTeacher('');
                              }}
                              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)]"
                            >
                              Finalize
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setActionBanner(null);
                              setSelectedTicket(ticket);
                              setShowRevisionForm(false);
                              setSelectedNextTeacher('');
                            }}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                          >
                            View details
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Pending/In Progress tickets: Show "Approve" button */}
                          <button
                            onClick={() => handleApprove(ticket)}
                            disabled={isApproving}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {isApproving ? 'Approving…' : 'Approve'}
                          </button>
                          <button
                            onClick={() => {
                              setActionBanner(null);
                              setSelectedTicket(ticket);
                              setShowRevisionForm(false);
                              setSelectedNextTeacher('');
                            }}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                          >
                            View details
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          setActionBanner(null);
                          setSelectedTicket(ticket);
                          setShowRevisionForm(false);
                          setSelectedNextTeacher('');
                        }}
                        className="hidden rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)]"
                      >
                        Review
                      </button>
                      <button
                        onClick={() => {
                          setActionBanner(null);
                          openQuickAssign(ticket);
                          setShowRevisionForm(false);
                          setSelectedNextTeacher('');
                        }}
                        disabled={ticket.workflowStep === 'finalize'}
                        className={`hidden px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          ticket.workflowStep === 'finalize'
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'border border-[rgba(var(--color-primary-rgb),0.35)] bg-soft-primary text-[var(--color-primary)] hover:bg-soft-primary'
                        }`}
                      >
                        Assign Next
                      </button>
                      <button
                        onClick={() => {
                          setActionBanner(null);
                          setSelectedTicket(ticket);
                          setShowRevisionForm(false);
                          setFinalizeData({ finalReport: '', homework: '', homeworkLink: '' });
                        }}
                        disabled={ticket.workflowStep !== 'finalize'}
                        className={`hidden px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          ticket.workflowStep !== 'finalize'
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'border border-[rgba(var(--color-accent-rgb),0.35)] bg-soft-accent text-[var(--color-accent)] hover:bg-[rgba(var(--color-accent-rgb),0.25)]'
                        }`}
                      >
                        Finalize
                      </button>
                      <button
                        onClick={() => handleToggleHistory(ticketKey)}
                        className="hidden px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className={`w-4 h-4 transition-transform ${isHistoryExpanded ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                        {isHistoryExpanded ? 'Hide History' : 'Show History'}
                      </button>
                      {isAdminUser && (
                        <>
                          <button
                            onClick={() => handleStartEditTicket(ticket)}
                            className="px-3 py-2 text-xs font-semibold text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            Edit Ticket
                          </button>
                          <button
                            onClick={() => handleDeleteTicket(ticket)}
                            disabled={ticketDeletingId === ticketId}
                            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                              ticketDeletingId === ticketId
                                ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                                : 'border-red-200 text-red-600 hover:bg-red-50'
                            }`}
                          >
                            {ticketDeletingId === ticketId ? 'Deleting…' : 'Delete Ticket'}
                          </button>
                        </>
                      )}
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
                                  <span>{historyTicket.workflowStep}</span>
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
              })
            )}

            {filteredTickets.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">
                  {currentTicketList.length === 0
                    ? 'No tickets are currently pending review.'
                    : 'No tickets match the selected filter.'}
                </p>
              </div>
            )}
          </div>
        )}

        {editingTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Edit Ticket</h3>
                  <p className="text-xs text-gray-500">
                    Student: {getStudentName(editingTicket.studentId)} • Step: {editingTicket.workflowStep}
                  </p>
                </div>
                <button
                  onClick={() => setEditingTicket(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-600">
                    Assigned teacher
                  </label>
                  <select
                    value={editForm.assignedTeacherId}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, assignedTeacherId: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-rgb),0.25)]"
                  >
                    <option value="">Keep current assignment</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-600">
                    Progress notes
                  </label>
                  <textarea
                    value={editForm.progressNotes}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, progressNotes: event.target.value }))
                    }
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-rgb),0.25)]"
                    placeholder="Update teacher notes or comments..."
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-600">
                      Assignment range
                    </label>
                    <input
                      value={editForm.assignmentRange}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, assignmentRange: event.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-rgb),0.25)]"
                      placeholder="e.g. Juz 5, Ayah 1-20"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-600">
                      Portion
                    </label>
                    <select
                      value={editForm.assignmentPortion}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, assignmentPortion: event.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-rgb),0.25)]"
                    >
                      {TICKET_PORTION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-600">
                    Audio link (optional)
                  </label>
                  <input
                    type="url"
                    value={editForm.audioLink}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, audioLink: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-rgb),0.25)]"
                    placeholder="https://example.com/audio"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleSaveTicketEdit}
                  disabled={isSavingEdit}
                  className="flex-1 rounded-lg bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingEdit ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  onClick={() => setEditingTicket(null)}
                  className="rounded-lg bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {quickAssignTicket && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quick assign flow</p>
                <h3 className="text-lg font-bold text-gray-900">
                  {quickAssignTicket.studentName || getStudentName(quickAssignTicket.studentId)}
                </h3>
                <p className="text-sm text-gray-600">
                  Current step · {quickAssignCurrentLabel}
                </p>
              </div>
              <button
                onClick={closeQuickAssign}
                className="self-end rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 sm:self-center"
              >
                Close
              </button>
            </div>

            {quickAssignError && (
              <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {quickAssignError}
              </div>
            )}

            <div className="space-y-6 px-5 py-6 max-h-[80vh] overflow-y-auto">
              {quickAssignContext?.baseTicket && (
                <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recitation recap</p>
                  <div className="mt-3 space-y-3 text-sm text-gray-700">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Listener
                      </span>
                      <span>{quickAssignContext.baseTicket.assignedTeacherName || '—'}</span>
                    </div>
                    {(quickAssignContext.baseTicket.assignmentRange || quickAssignContext.baseTicket.assignmentPortion) && (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Portion covered
                        </span>
                        <span>
                          {quickAssignContext.baseTicket.assignmentRange || '—'}
                          {quickAssignContext.baseTicket.assignmentPortion
                            ? ` • ${formatAssignmentPortion(quickAssignContext.baseTicket.assignmentPortion)}`
                            : ''}
                        </span>
                      </div>
                    )}
                    {quickAssignContext.baseTicket.progressNotes && (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Teacher notes
                        </span>
                        <p className="whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-2 text-gray-800">
                          {quickAssignContext.baseTicket.progressNotes}
                        </p>
                      </div>
                    )}
                    {(quickAssignContext.nextTicket?.revisionNotes || quickAssignContext.baseTicket.revisionNotes) && (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Internal notes
                        </span>
                        <p className="whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-2 text-gray-800">
                          {quickAssignContext.nextTicket?.revisionNotes || quickAssignContext.baseTicket.revisionNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Step 1</p>
                    <h4 className="text-base font-semibold text-gray-900">Approve {quickAssignCurrentLabel}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Approval unlocks the next ticket in the chain.
                    </p>
                  </div>
                  {quickAssignIsApproved && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      ✅ Approved
                    </span>
                  )}
                </div>
                {!quickAssignIsApproved && (
                  <button
                    onClick={handleQuickApprove}
                    disabled={quickAssignLoading.approve}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {quickAssignLoading.approve ? 'Approving…' : 'Approve & unlock next step'}
                  </button>
                )}
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Step 2</p>
                    <h4 className="text-base font-semibold text-gray-900">
                      {quickAssignNextTicket ? `Next: ${quickAssignNextStepLabel}` : 'Workflow complete'}
                    </h4>
                    {quickAssignNextTicket ? (
                      <p className="text-sm text-gray-600 mt-1">
                        {quickAssignNextTicket.workflowStep === 'finalize'
                          ? 'Publish homework and close the chain.'
                          : 'Choose who should hear the next portion.'}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">
                        All steps in this chain are already approved. Create a new Sabq ticket to begin the next cycle.
                      </p>
                    )}
                  </div>
                  {quickAssignNextTicket && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
                      Status: {quickAssignNextTicket.status.replace('_', ' ')}
                    </span>
                  )}
                </div>

                {!quickAssignNextTicket ? null : quickAssignNextTicket.workflowStep === 'finalize' ? (
                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Final report (optional)
                      </label>
                      <textarea
                        value={quickAssignFinalReport}
                        onChange={(event) => setQuickAssignFinalReport(event.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-rgb),0.25)]"
                        placeholder="Summary for the student…"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Homework instructions <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={quickAssignHomework}
                        onChange={(event) => setQuickAssignHomework(event.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-rgb),0.25)]"
                        placeholder="Example: Revise Surah An-Naba, pages 582-584."
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Homework link (optional)
                      </label>
                      <input
                        type="url"
                        value={quickAssignHomeworkLink}
                        onChange={(event) => setQuickAssignHomeworkLink(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-rgb),0.25)]"
                        placeholder="https://…"
                      />
                    </div>
                    <button
                      onClick={handleQuickFinalize}
                      disabled={!quickAssignIsApproved || quickAssignLoading.finalize}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {quickAssignLoading.finalize ? 'Publishing…' : 'Finalize & publish homework'}
                    </button>
                    {!quickAssignIsApproved && (
                      <p className="text-xs text-orange-600">
                        Approve the current step first to enable finalization.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Internal note for next teacher
                      </label>
                      <textarea
                        value={quickAssignTeacherNote}
                        onChange={(event) => setQuickAssignTeacherNote(event.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-rgb),0.25)]"
                        placeholder="Highlight focus areas, mistakes to watch for, or pacing instructions…"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Assign teacher
                      </label>
                      <select
                        value={quickAssignTeacherId}
                        onChange={(event) => setQuickAssignTeacherId(event.target.value)}
                        disabled={!quickAssignIsApproved || quickAssignLoading.assign}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-rgb),0.25)] disabled:cursor-not-allowed disabled:bg-gray-100"
                      >
                        <option value="">Select teacher…</option>
                        {teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleQuickAssignNext}
                      disabled={!quickAssignIsApproved || !quickAssignTeacherId || quickAssignLoading.assign}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {quickAssignLoading.assign ? 'Assigning…' : `Assign ${quickAssignNextStepLabel}`}
                    </button>
                    {!quickAssignIsApproved && (
                      <p className="text-xs text-orange-600">
                        Approve the current step to unlock assignment controls.
                      </p>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Assign for Sabq Modal - After Sabqi Approval */}
      {showNextStepModal && approvedTicketForNextStep && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary)] to-[var(--color-accent)] text-white px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Ticket Approved - Next Steps</h2>
                <p className="text-white/90 text-xs sm:text-sm mt-1">
                  {approvedTicketForNextStep.studentName} - {getStepLabel(approvedTicketForNextStep.workflowStep)} approved
                </p>
              </div>
              <button
                onClick={() => {
                  setShowNextStepModal(false);
                  setApprovedTicketForNextStep(null);
                  setNextStepData({ assignTo: 'teacher', teacherId: '', sabqFeedback: '' });
                }}
                className="rounded-full bg-white/20 hover:bg-white/30 p-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
              <div className="mb-6 rounded-xl border-2 border-green-200 bg-green-50 p-4">
                <p className="text-sm font-semibold text-green-900">
                  {getStepLabel(approvedTicketForNextStep.workflowStep)} ticket approved successfully!
                </p>
                <p className="text-xs text-green-700 mt-1">Now assign for Sabq (New Lesson)</p>
              </div>

              <div className="space-y-6">
                {/* Assign To Section */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Assign To</label>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-gray-50">
                      <input
                        type="radio"
                        name="assignTo"
                        value="admin"
                        checked={nextStepData.assignTo === 'admin'}
                        onChange={(e) => setNextStepData(prev => ({ ...prev, assignTo: 'admin', teacherId: '' }))}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Admin (You will review sabq)</div>
                        <div className="text-xs text-gray-600 mt-1">Admin will listen to the new lesson directly</div>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-gray-50">
                      <input
                        type="radio"
                        name="assignTo"
                        value="teacher"
                        checked={nextStepData.assignTo === 'teacher'}
                        onChange={(e) => setNextStepData(prev => ({ ...prev, assignTo: 'teacher' }))}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Teacher</div>
                        <div className="text-xs text-gray-600 mt-1">Assign to a teacher to listen</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Teacher Selection (if teacher selected) */}
                {nextStepData.assignTo === 'teacher' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Select Teacher <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={nextStepData.teacherId}
                      onChange={(e) => setNextStepData(prev => ({ ...prev, teacherId: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                    >
                      <option value="">Select a teacher...</option>
                      {teachers.map(teacher => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sabq Feedback Field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Your Feedback for Sabq (Optional)
                  </label>
                  <textarea
                    value={nextStepData.sabqFeedback}
                    onChange={(e) => setNextStepData(prev => ({ ...prev, sabqFeedback: e.target.value }))}
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all resize-none"
                    placeholder="Add any specific feedback or instructions for the Sabq review..."
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowNextStepModal(false);
                  setApprovedTicketForNextStep(null);
                  setNextStepData({ assignTo: 'teacher', teacherId: '', sabqFeedback: '' });
                }}
                className="px-6 py-3 rounded-xl border-2 border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-all w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSabqFeedback}
                disabled={nextStepData.assignTo === 'teacher' && !nextStepData.teacherId}
                className="px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto shadow-lg hover:shadow-xl"
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminTicketManagement;

