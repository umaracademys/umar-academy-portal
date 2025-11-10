import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Assignment, Program, ClassworkSection } from '../types/assignment';
import { MushafMistake } from '@umar-academy/mushaf';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { useBackendData } from '../contexts/BackendDataContext';
import { AssignmentTicket } from '../types';
import ModernAssignmentForm from '../components/ModernAssignmentForm';
import AssignmentSectionBuilder from '../components/assignment/AssignmentSectionBuilder';

const AssignmentsPage: React.FC = () => {
  const {
    assignments,
    students,
    tickets,
    teachers,
    approveTicket,
    assignTicketToNext,
    finalizeTicket,
    updateAssignment,
    deleteAssignment,
    refreshData,
  } = useBackendData();
  const { user } = useAuth();
  
  const [showMushafForAssignment, setShowMushafForAssignment] = useState<string | null>(null);
  const [mushafPage, setMushafPage] = useState<number>(1);
  const [filterProgram, setFilterProgram] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [quickAssignTicket, setQuickAssignTicket] = useState<AssignmentTicket | null>(null);
  const [quickAssignTeacherId, setQuickAssignTeacherId] = useState('');
  const [quickAssignFinalReport, setQuickAssignFinalReport] = useState('');
  const [quickAssignHomework, setQuickAssignHomework] = useState('');
  const [quickAssignHomeworkLink, setQuickAssignHomeworkLink] = useState('');
  const [quickAssignSections, setQuickAssignSections] = useState<ClassworkSection[]>([]);
  const [quickAssignFinalReportTouched, setQuickAssignFinalReportTouched] = useState(false);
  const [quickAssignHomeworkTouched, setQuickAssignHomeworkTouched] = useState(false);
  const [quickAssignError, setQuickAssignError] = useState<string | null>(null);
  const [quickAssignLoading, setQuickAssignLoading] = useState({ approve: false, assign: false, finalize: false });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAssignmentForAction, setSelectedAssignmentForAction] = useState<Assignment | null>(null);
  const [showAssignTeacherOption, setShowAssignTeacherOption] = useState(false);
  const [selectedTeacherForAssignment, setSelectedTeacherForAssignment] = useState('');
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editForm, setEditForm] = useState({
    finalReport: '',
    homework: '',
    homeworkLink: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);

  const getTicketId = (ticket?: AssignmentTicket | null) =>
    ticket ? (ticket.id || (ticket as any)._id || '') : '';

  const findTicketById = useCallback(
    (id?: string | null) => {
      if (!id) return null;
      return tickets.find((t) => (t.id || (t as any)._id) === id) || null;
    },
    [tickets]
  );

  const quickAssignContext = useMemo(() => {
    if (!quickAssignTicket) {
      return null;
    }

    if (quickAssignTicket.workflowStep === 'finalize') {
      return {
        baseTicket: quickAssignTicket,
        nextTicket: quickAssignTicket,
      };
    }

    let basePointer: AssignmentTicket = quickAssignTicket;
    let nextTicket: AssignmentTicket | null = null;
    let guard = 0;

    while (guard < 10) {
      const nextId = basePointer.nextTicketId;
      if (!nextId) {
        break;
      }

      const candidate = findTicketById(nextId);
      if (!candidate) {
        break;
      }

      if (candidate.status === 'approved' || candidate.status === 'completed') {
        basePointer = candidate;
        guard += 1;
        continue;
      }

      nextTicket = candidate;
      break;
    }

    return {
      baseTicket: basePointer,
      nextTicket,
    };
  }, [findTicketById, quickAssignTicket]);

  const quickAssignNextTicket = quickAssignContext?.nextTicket ||
    (quickAssignContext?.baseTicket?.workflowStep === 'finalize' ? quickAssignContext.baseTicket : null);

  const quickAssignCurrentLabel = quickAssignContext?.baseTicket
    ? (quickAssignContext.baseTicket.workflowStep === 'sabq'
        ? 'Sabq'
        : quickAssignContext.baseTicket.workflowStep === 'sabqi'
          ? 'Sabqi'
          : quickAssignContext.baseTicket.workflowStep === 'manzil'
            ? 'Manzil'
            : quickAssignContext.baseTicket.workflowStep)
    : '';

  const quickAssignNextStepLabel = quickAssignNextTicket
    ? (quickAssignNextTicket.workflowStep === 'sabq'
        ? 'Sabq'
        : quickAssignNextTicket.workflowStep === 'sabqi'
          ? 'Sabqi'
        : quickAssignNextTicket.workflowStep === 'manzil'
            ? 'Manzil'
            : quickAssignNextTicket.workflowStep === 'finalize'
              ? 'Finalize'
              : quickAssignNextTicket.workflowStep)
    : '';

  const quickAssignIsFinalizeMode = quickAssignNextTicket?.workflowStep === 'finalize';

  const quickAssignFinalizeTarget = useMemo(() => {
    if (!quickAssignContext) {
      return null;
    }
 
    if (quickAssignIsFinalizeMode && quickAssignNextTicket) {
      return quickAssignNextTicket;
    }
 
    if (quickAssignContext.baseTicket.workflowStep === 'finalize') {
      return quickAssignContext.baseTicket;
    }
 
    return null;
   }, [quickAssignContext, quickAssignIsFinalizeMode, quickAssignNextTicket]);
 
   const quickAssignBaseTicket = quickAssignContext?.baseTicket || quickAssignTicket;

  const quickAssignMistakeCounts = useMemo(() => {
    if (!quickAssignFinalizeTarget?.mushafMarkings) {
      return {} as Record<string, number>;
    }
    return quickAssignFinalizeTarget.mushafMarkings.reduce<Record<string, number>>((acc, mistake) => {
      const key = mistake.type || 'other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [quickAssignFinalizeTarget]);

  const openQuickAssign = useCallback((ticket: AssignmentTicket) => {
    setQuickAssignTicket(ticket);
    setQuickAssignTeacherId('');
    setQuickAssignFinalReport('');
    setQuickAssignHomework('');
    setQuickAssignHomeworkLink('');
    setQuickAssignSections([]);
    setQuickAssignFinalReportTouched(false);
    setQuickAssignHomeworkTouched(false);
    setQuickAssignError(null);
    setQuickAssignLoading({ approve: false, assign: false, finalize: false });
  }, []);

  const closeQuickAssign = useCallback(() => {
    setQuickAssignTicket(null);
    setQuickAssignTeacherId('');
    setQuickAssignFinalReport('');
    setQuickAssignHomework('');
    setQuickAssignHomeworkLink('');
    setQuickAssignSections([]);
    setQuickAssignFinalReportTouched(false);
    setQuickAssignHomeworkTouched(false);
    setQuickAssignError(null);
    setQuickAssignLoading({ approve: false, assign: false, finalize: false });
  }, []);

  const quickAssignIsApproved = quickAssignContext?.baseTicket?.status === 'approved';

  useEffect(() => {
    if (!quickAssignContext || !quickAssignTicket) {
      return;
    }

    const { baseTicket, nextTicket } = quickAssignContext;

    if (nextTicket && nextTicket.workflowStep !== 'finalize') {
      const defaultTeacherId = nextTicket.assignedTeacherId || baseTicket.assignedTeacherId || '';
      if (defaultTeacherId && !quickAssignTeacherId) {
        setQuickAssignTeacherId(defaultTeacherId);
      }
      return;
    }

    const finalizeTarget = nextTicket && nextTicket.workflowStep === 'finalize'
      ? nextTicket
      : baseTicket.workflowStep === 'finalize'
        ? baseTicket
        : null;

    if (!finalizeTarget) {
      return;
    }

    const ticketSections = (finalizeTarget as any).classworkSections as ClassworkSection[] | undefined;

    if (ticketSections && ticketSections.length > 0) {
      setQuickAssignSections(ticketSections);
    } else if (finalizeTarget.assignmentRange) {
      setQuickAssignSections([
        {
          step: (finalizeTarget.workflowStep as 'sabq' | 'sabqi' | 'manzil') || 'sabq',
          title: 'Ticket range',
          label: 'Ticket range',
          assignmentRange: finalizeTarget.assignmentRange,
          assignmentPortion: finalizeTarget.assignmentPortion,
          order: 0,
          summary: finalizeTarget.assignmentRange,
        },
      ]);
    } else {
      setQuickAssignSections([]);
    }

    setQuickAssignFinalReportTouched(Boolean(finalizeTarget.finalReport));
    setQuickAssignHomeworkTouched(Boolean(finalizeTarget.homework));
    setQuickAssignFinalReport(finalizeTarget.finalReport || '');
    setQuickAssignHomework(finalizeTarget.homework || '');
    setQuickAssignHomeworkLink(finalizeTarget.homeworkLink || '');
  }, [quickAssignContext, quickAssignTeacherId, quickAssignTicket]);

  // Check if user can create assignments
  const canCreateAssignments = user?.role === 'superadmin' || 
    user?.role === 'admin' ||
    user?.role === 'teacher';

  const handleQuickApprove = useCallback(async () => {
    const baseTicket = quickAssignContext?.baseTicket;
    if (!baseTicket || baseTicket.status === 'approved') {
      return;
    }

    try {
      setQuickAssignLoading((prev) => ({ ...prev, approve: true }));
      const ticketId = getTicketId(baseTicket);
      await approveTicket(ticketId, user?.id || '');
      alert('Ticket approved successfully.');
      setQuickAssignError(null);
      await refreshData();
    } catch (error) {
      console.error('Error approving ticket from assignments page:', error);
      setQuickAssignError('Failed to approve the ticket. Please try again.');
    } finally {
      setQuickAssignLoading((prev) => ({ ...prev, approve: false }));
    }
  }, [approveTicket, quickAssignContext, refreshData, user]);

  const handleQuickAssignNext = useCallback(async () => {
    if (!quickAssignContext?.baseTicket || !quickAssignNextTicket || quickAssignNextTicket.workflowStep === 'finalize') {
      return;
    }

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
      const ticketId = getTicketId(quickAssignContext.baseTicket);
      await assignTicketToNext(ticketId, teacher.id, teacher.fullName);
      alert(`Assigned ${quickAssignNextStepLabel} to ${teacher.fullName}.`);
      setQuickAssignError(null);
      closeQuickAssign();
      await refreshData();
    } catch (error) {
      console.error('Error assigning next teacher from assignments page:', error);
      setQuickAssignError('Failed to assign the next teacher.');
    } finally {
      setQuickAssignLoading((prev) => ({ ...prev, assign: false }));
    }
  }, [assignTicketToNext, closeQuickAssign, quickAssignContext, quickAssignNextStepLabel, quickAssignNextTicket, quickAssignTeacherId, refreshData, teachers]);

  const handleQuickFinalize = useCallback(async () => {
    if (!quickAssignIsFinalizeMode || !quickAssignNextTicket) {
      return;
    }

    if (!quickAssignFinalReport.trim() || !quickAssignHomework.trim()) {
      setQuickAssignError('Final report and homework are required.');
      return;
    }

    if (quickAssignSections.length === 0) {
      setQuickAssignError('Add at least one portion before finalizing.');
      return;
    }

    try {
      setQuickAssignLoading((prev) => ({ ...prev, finalize: true }));
      const ticketId = getTicketId(quickAssignNextTicket);
      const classworkSummary = quickAssignSections
        .map((section) => section.summary || section.assignmentRange)
        .filter(Boolean)
        .join('\n');

      await finalizeTicket(ticketId, {
        finalReport: quickAssignFinalReport.trim(),
        homework: quickAssignHomework.trim(),
        homeworkLink: quickAssignHomeworkLink.trim(),
        reviewedBy: user?.id || '',
        classworkSections: quickAssignSections,
        classworkSummary,
        homeworkSummary: quickAssignHomework.trim(),
        classworkType: quickAssignSections[0]?.step,
      } as any);

      alert('Ticket finalized and assignment published.');
      setQuickAssignError(null);
      closeQuickAssign();
      await refreshData();
    } catch (error) {
      console.error('Error finalizing ticket from assignments page:', error);
      setQuickAssignError('Failed to finalize this ticket.');
    } finally {
      setQuickAssignLoading((prev) => ({ ...prev, finalize: false }));
    }
  }, [
    closeQuickAssign,
    finalizeTicket,
    quickAssignFinalReport,
    quickAssignHomework,
    quickAssignHomeworkLink,
    quickAssignIsFinalizeMode,
    quickAssignNextTicket,
    quickAssignSections,
    refreshData,
    user,
  ]);
 
  // Mock programs - in real app, this would come from API
  useEffect(() => {
    const mockPrograms: Program[] = [
      { id: '1', name: 'Full Time HQ', description: 'Full-time Hifz program', students: ['1', '2', '3'], createdAt: new Date(), status: 'active' },
      { id: '2', name: 'Part Time HQ', description: 'Part-time Hifz program', students: ['1', '4', '5'], createdAt: new Date(), status: 'active' },
      { id: '3', name: 'After School Reading', description: 'After school reading program', students: ['2', '3', '6'], createdAt: new Date(), status: 'active' }
    ];
    setPrograms(mockPrograms);
  }, []);

  const getStudentName = (studentId: string): string => {
    const student = students.find(s => (s as any)._id === studentId || s.id === studentId);
    return student?.fullName || 'Unknown Student';
  };

  // Filter assignments - only show those from finalized tickets
  const filteredAssignments = assignments.filter(assignment => {
    // Only show assignments created from approved/finalized tickets
    const hasTicketId = !!(assignment as any).fromTicketId;
    
    const programMatch = !filterProgram || assignment.program === filterProgram;
    const typeMatch = !filterType || assignment.type === filterType;
    
    return hasTicketId && programMatch && typeMatch;
  });

  const assignmentsByStudent = useMemo(() => {
    const grouped = new Map<string, Assignment[]>();
    filteredAssignments.forEach((assignment) => {
      const studentId = assignment.assignedTo?.[0];
      if (!studentId) return;
      const list = grouped.get(studentId) ?? [];
      list.push(assignment);
      grouped.set(studentId, list);
    });

    return Array.from(grouped.entries())
      .map(([studentId, studentAssignments]) => ({
        studentId,
        studentName: getStudentName(studentId),
        assignments: [...studentAssignments].sort((a, b) => {
          const aDate = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt || a.updatedAt || '');
          const bDate = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt || b.updatedAt || '');
          return bDate.getTime() - aDate.getTime();
        }),
      }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [filteredAssignments, students]);

  // Get approved tickets that need action (assign to next teacher or finalize)
  const approvedTicketsNeedingAction = tickets.filter(ticket => 
    ticket.status === 'approved' && 
    ticket.workflowStep !== 'finalize' && 
    (!ticket.nextTicketId || (() => {
      const nextTicket = tickets.find(t => t.id === ticket.nextTicketId || (t as any)._id === ticket.nextTicketId);
      return nextTicket?.status === 'pending';
    })())
  );

  const approvedFinalizeTickets = tickets.filter(ticket => 
    ticket.status === 'approved' && 
    ticket.workflowStep === 'finalize'
  );

  // Get mistake type label
  const getMistakeTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      "memory": "Memory",
      "madd": "Mad (Elongation)",
      "ikhfa": "Ikhfa",
      "holding": "Holding/Fluency",
      "tech": "Ghunna",
      "other": "Other",
    };
    return typeMap[type] || type;
  };

  const resolveAssignmentId = (assignment: Assignment): string | undefined => {
    return (assignment as any).id || (assignment as any)._id || assignment.id;
  };

  const formatDisplayDate = (value?: Date | string): string => {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleToggleHistoryForStudent = (studentId: string) => {
    setExpandedHistory((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const handleOpenEditModal = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setEditForm({
      finalReport: assignment.description || '',
      homework: (assignment as any).homeworkComments || assignment.homeworkSummary || '',
      homeworkLink: (assignment as any).homeworkLink || '',
    });
  };

  const handleDeleteAssignment = async (assignment: Assignment) => {
    const assignmentId = resolveAssignmentId(assignment);
    if (!assignmentId) return;

    const confirmed = typeof window === 'undefined' ? true : window.confirm('Delete this assignment report? The student will no longer see it.');
    if (!confirmed) return;

    try {
      setDeletingAssignmentId(assignmentId);
      await deleteAssignment(assignmentId);
      await refreshData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Failed to delete assignment.');
    } finally {
      setDeletingAssignmentId(null);
    }
  };

  const handleSaveAssignmentEdits = async () => {
    if (!editingAssignment) return;
    if (!editForm.finalReport.trim()) {
      alert('Final report cannot be empty.');
      return;
    }
    if (!editForm.homework.trim()) {
      alert('Homework cannot be empty.');
      return;
    }

    const assignmentId = resolveAssignmentId(editingAssignment);
    if (!assignmentId) return;

    try {
      setIsSavingEdit(true);
      await updateAssignment(assignmentId, {
        description: editForm.finalReport,
        homeworkComments: editForm.homework,
        homeworkLink: editForm.homeworkLink,
        homeworkSummary: editForm.homework,
        updatedAt: new Date(),
      });
      await refreshData();
      setEditingAssignment(null);
    } catch (error) {
      console.error('Error updating assignment:', error);
      alert('Failed to update assignment.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  useEffect(() => {
    const finalizeTarget = quickAssignFinalizeTarget;

    if (!quickAssignTicket || !finalizeTarget || finalizeTarget.workflowStep !== 'finalize') {
      return;
    }

    const sectionSummaries = quickAssignSections.map((section, index) => {
      const title =
        section.label ||
        section.title ||
        `${section.step.charAt(0).toUpperCase() + section.step.slice(1)} ${quickAssignSections.length > 1 ? index + 1 : ''}`;
      const range = section.summary || section.assignmentRange || '';
      const notes = section.details ? ` — ${section.details}` : '';
      return `• ${title}${range ? `: ${range}` : ''}${notes}`;
    });

    const mistakes = finalizeTarget.mushafMarkings || [];
    const mistakeCounts = mistakes.reduce<Record<string, number>>((acc, mistake) => {
      const key = mistake.type || 'other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const mistakeLines = Object.entries(mistakeCounts).map(
      ([type, count]) => `• ${getMistakeTypeLabel(type)} — ${count} time${count === 1 ? '' : 's'}`
    );

    const autoReport = [
      `Classwork Summary (${new Date().toLocaleDateString()}):`,
      sectionSummaries.length > 0 ? sectionSummaries.join('\n') : '• Portions recorded via ticket workflow.',
      '',
      mistakes.length > 0
        ? `Recorded Mistakes (${mistakes.length}):`
        : 'No mistakes recorded during this session.',
      mistakeLines.join('\n'),
    ]
      .filter(Boolean)
      .join('\n');

    const lastSection = quickAssignSections[quickAssignSections.length - 1];
    const homeworkLines = [
      lastSection?.summary || lastSection?.assignmentRange
        ? `Review ${lastSection.summary || lastSection.assignmentRange} with clean recitation.`
        : null,
      mistakeLines.length > 0
        ? `Focus on correcting: ${mistakeLines
            .map((line) => line.replace(/^•\s*/, '').replace(/\s—.*$/, '').toLowerCase())
            .join(', ')}.`
        : null,
      'Prepare the next portion with steady pacing and tajweed focus.',
    ].filter(Boolean);

    const autoHomework = homeworkLines.join('\n');

    if (!quickAssignFinalReportTouched) {
      setQuickAssignFinalReport(autoReport);
    }

    if (!quickAssignHomeworkTouched) {
      setQuickAssignHomework(autoHomework);
    }
  }, [
    quickAssignFinalizeTarget,
    quickAssignFinalReportTouched,
    quickAssignHomeworkTouched,
    quickAssignSections,
    quickAssignTicket,
  ]);

  // Get workflow step label
  const getWorkflowStepLabel = (assignment: Assignment): string => {
    if (assignment.classworkType === 'sabq') return 'Sabq';
    if (assignment.classworkType === 'sabqi') return 'Sabqi';
    if (assignment.classworkType === 'manzil') return 'Manzil';
    return 'Recitation';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-700 rounded-2xl p-8 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold mb-2">📝 Finalized Assignments</h1>
                <p className="text-purple-100 text-lg">View assignments created from approved ticket workflow</p>
              </div>
                {canCreateAssignments && (
                    <button
                      onClick={() => setShowCreateForm(true)}
                  className="px-8 py-4 bg-white text-purple-600 rounded-xl hover:bg-purple-50 font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center"
                    >
                      <span className="mr-2">✨</span>
                      Create New Assignment
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Approved Tickets Needing Action */}
        {(approvedTicketsNeedingAction.length > 0 || approvedFinalizeTickets.length > 0) && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6 rounded-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ⚠️ Approved Tickets Needing Action
            </h2>
            <div className="space-y-3">
              {approvedTicketsNeedingAction.map(ticket => {
                const ticketId = ticket.id || (ticket as any)._id;
                return (
                  <div key={ticketId} className="bg-white p-4 rounded-lg border border-yellow-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{getStudentName(ticket.studentId)}</p>
                        <p className="text-sm text-gray-600">
                          {ticket.workflowStep === 'sabq' ? '📖 Sabq' : 
                           ticket.workflowStep === 'sabqi' ? '📚 Sabqi' : 
                           ticket.workflowStep === 'manzil' ? '📿 Manzil' : ticket.workflowStep}
                          {' → '}
                          {ticket.workflowStep === 'sabq' ? '📚 Sabqi' : 
                           ticket.workflowStep === 'sabqi' ? '📿 Manzil' : 
                           ticket.workflowStep === 'manzil' ? '✅ Finalize' : 'Next Step'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Student hasn't recited next portion yet</p>
                      </div>
                      <button
                        onClick={() => openQuickAssign(ticket)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        Assign to Next Teacher
                      </button>
                    </div>
                  </div>
                );
              })}
              {approvedFinalizeTickets.map(ticket => {
                const ticketId = ticket.id || (ticket as any)._id;
                return (
                  <div key={ticketId} className="bg-white p-4 rounded-lg border border-yellow-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{getStudentName(ticket.studentId)}</p>
                        <p className="text-sm text-gray-600">✅ Finalize - Ready to add homework</p>
                      </div>
                      <button
                        onClick={() => openQuickAssign(ticket)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                      >
                        Finalize & Add Homework
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Assign Modal */}
        {quickAssignTicket && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
              <div className="flex flex-col gap-2 border-b border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quick ticket workflow</p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {quickAssignBaseTicket ? getStudentName(quickAssignBaseTicket.studentId) : 'Student'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Current step · {quickAssignCurrentLabel}
                    {quickAssignNextTicket && (
                      <span className="text-gray-400">
                        {' '}
                        → {quickAssignNextStepLabel}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${quickAssignIsApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                  >
                    {quickAssignIsApproved ? 'Approved' : 'Pending approval'}
                  </span>
                  <button
                    onClick={closeQuickAssign}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                  >
                    Close
                  </button>
                </div>
              </div>

              {quickAssignError && (
                <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {quickAssignError}
                </div>
              )}

              <div className="max-h-[80vh] space-y-6 overflow-y-auto px-6 py-6">
                <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Step 1</p>
                      <h4 className="text-base font-semibold text-gray-900">Approve {quickAssignCurrentLabel}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Approval unlocks the remaining steps in this workflow chain.
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
                        {quickAssignNextTicket
                          ? quickAssignIsFinalizeMode
                            ? 'Finalize & publish homework'
                            : `Assign ${quickAssignNextStepLabel}`
                          : 'Workflow complete'}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {quickAssignNextTicket
                          ? quickAssignIsFinalizeMode
                            ? 'Summarize the session and push homework to the student dashboard.'
                            : 'Choose who should hear the student next.'
                          : 'All tickets in this chain are already finalized.'}
                      </p>
                    </div>
                    {quickAssignNextTicket && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
                        Next status: {quickAssignNextTicket.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  {!quickAssignNextTicket ? (
                    <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                      No remaining steps. Create a new Sabq ticket to start the next cycle for this student.
                    </div>
                  ) : quickAssignIsFinalizeMode ? (
                    <div className="space-y-6">
                      <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-purple-700">Classwork portions</p>
                            <p className="text-xs text-purple-600">
                              Build the assignment summary that the student will see instantly.
                            </p>
                          </div>
                          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                            Mobile friendly
                          </span>
                        </div>
                        <div className="mt-4">
                          <AssignmentSectionBuilder
                            value={quickAssignSections}
                            onChange={setQuickAssignSections}
                          />
                        </div>
                      </div>

                      <div className="grid gap-5 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            Final report <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={quickAssignFinalReport}
                            onChange={(event) => {
                              setQuickAssignFinalReportTouched(true);
                              setQuickAssignFinalReport(event.target.value);
                            }}
                            rows={5}
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                            placeholder="Auto-generated summary…"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            Homework for next day <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={quickAssignHomework}
                            onChange={(event) => {
                              setQuickAssignHomeworkTouched(true);
                              setQuickAssignHomework(event.target.value);
                            }}
                            rows={4}
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                            placeholder="Auto-generated homework…"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            Optional homework link
                          </label>
                          <input
                            type="url"
                            value={quickAssignHomeworkLink}
                            onChange={(event) => setQuickAssignHomeworkLink(event.target.value)}
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                            placeholder="https://resource-link.com"
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                        <h4 className="mb-3 text-sm font-semibold text-gray-800">Student preview</h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Classwork</p>
                            <ul className="mt-1 list-disc space-y-1 pl-5">
                              {quickAssignSections.length === 0 ? (
                                <li className="text-gray-500">No portions added yet</li>
                              ) : (
                                quickAssignSections.map((section, idx) => (
                                  <li key={`${section.step}-${idx}`} className="text-gray-700">
                                    {section.summary || section.assignmentRange || section.label}
                                  </li>
                                ))
                              )}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Mistakes from classwork</p>
                            <ul className="mt-1 list-disc space-y-1 pl-5">
                              {Object.keys(quickAssignMistakeCounts).length === 0 ? (
                                <li className="text-gray-500">No mistakes recorded</li>
                              ) : (
                                Object.entries(quickAssignMistakeCounts).map(([type, count]) => (
                                  <li key={type} className="text-gray-700">
                                    {getMistakeTypeLabel(type)} — {count}
                                  </li>
                                ))
                              )}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Homework</p>
                            <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-white px-3 py-2 text-gray-700 shadow-inner">
                              {quickAssignHomework || 'Auto-generated homework will appear here.'}
                            </pre>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          onClick={handleQuickFinalize}
                          disabled={quickAssignLoading.finalize}
                          className="flex-1 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {quickAssignLoading.finalize ? 'Publishing…' : 'Finalize & create assignment'}
                        </button>
                        <button
                          onClick={closeQuickAssign}
                          className="rounded-xl bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          Assign listening teacher
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
                        {!quickAssignIsApproved && (
                          <p className="mt-2 text-xs text-orange-600">
                            Approve the current step first to unlock assigning.
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          onClick={handleQuickAssignNext}
                          disabled={!quickAssignIsApproved || !quickAssignTeacherId || quickAssignLoading.assign}
                          className="flex-1 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {quickAssignLoading.assign ? 'Assigning…' : `Send to ${quickAssignNextStepLabel}`}
                        </button>
                        <button
                          onClick={closeQuickAssign}
                          className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Program</label>
              <select
                value={filterProgram}
                onChange={(e) => setFilterProgram(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Programs</option>
                {programs.map(program => (
                  <option key={program.id} value={program.id}>{program.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="classwork">Classwork</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterProgram('');
                  setFilterType('');
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Assignments List */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Assignments ({filteredAssignments.length})</h2>
            <p className="text-sm text-gray-500 mt-1">
              Daily recitation reports grouped by student. Expand history to revisit previous days, edit notes, or remove reports.
            </p>
          </div>

          {assignmentsByStudent.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
              <p className="text-gray-600">
                Assignments will appear here once tickets are finalized
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {assignmentsByStudent.map(({ studentId, studentName, assignments }) => {
                if (assignments.length === 0) {
                  return null;
                }

                const [latest, ...history] = assignments;
                const latestId = resolveAssignmentId(latest) || `${studentId}-latest`;
                const mushafMarkings = (latest as any).mushafMarkings || [];
                const workflowStep = getWorkflowStepLabel(latest);
                const isHistoryExpanded = expandedHistory[studentId] ?? false;
                const latestProgram = programs.find((program) => program.id === latest.program)?.name || 'Unknown Program';

                return (
                  <div key={studentId} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">{studentName}</h3>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                              {workflowStep}
                            </span>
                            {latest.listenerName && (
                              <span className="text-sm text-gray-600">
                                👂 Listener: {latest.listenerName}
                              </span>
                            )}
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              Finalized {formatDisplayDate(latest.createdAt || latest.updatedAt)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span>📚 {latestProgram}</span>
                            <span>📅 Due {formatDisplayDate(latest.dueDate as any)}</span>
                            {latest.homeworkSummary && (
                              <span>📝 Homework recorded</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:items-end">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleOpenEditModal(latest)}
                              className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                            >
                              Edit report
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAssignmentForAction(latest);
                                setShowAssignTeacherOption(true);
                                setSelectedTeacherForAssignment('');
                              }}
                              className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                              Reassign teacher
                            </button>
                            <button
                              onClick={() => handleDeleteAssignment(latest)}
                              disabled={deletingAssignmentId === latestId}
                              className="px-4 py-2 rounded-lg text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingAssignmentId === latestId ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                          {history.length > 0 && (
                            <button
                              onClick={() => handleToggleHistoryForStudent(studentId)}
                              className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1"
                            >
                              <span>{isHistoryExpanded ? 'Hide daily history' : `Show daily history (${history.length})`}</span>
                              <svg
                                className={`w-4 h-4 transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {latest.description && (
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <h4 className="font-semibold text-gray-900 mb-2">📋 Recitation Report</h4>
                          <p className="text-gray-700 whitespace-pre-wrap text-sm">{latest.description}</p>
                        </div>
                      )}

                      {mushafMarkings.length > 0 && (
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold text-gray-900">
                              📖 Mushaf Mistake Markings ({mushafMarkings.length} mistake{mushafMarkings.length !== 1 ? 's' : ''})
                            </h4>
                            <button
                              onClick={() => {
                                if (showMushafForAssignment === latestId) {
                                  setShowMushafForAssignment(null);
                                } else {
                                  setShowMushafForAssignment(latestId);
                                  const firstMistake = mushafMarkings[0];
                                  if (firstMistake?.page) {
                                    setMushafPage(firstMistake.page);
                                  }
                                }
                              }}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                            >
                              {showMushafForAssignment === latestId ? '📖 Hide Mushaf' : '📖 View Mushaf'}
                            </button>
                          </div>

                          {showMushafForAssignment !== latestId && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              <span className="text-xs font-semibold text-gray-700 self-center">Navigate to pages:</span>
                              {(Array.from(new Set(mushafMarkings.map((m: MushafMistake) => m.page))) as number[])
                                .sort((a: number, b: number) => a - b)
                                .map((page: number) => {
                                  const mistakesOnPage = mushafMarkings.filter((m: MushafMistake) => m.page === page).length;
                                  return (
                                    <button
                                      key={page}
                                      onClick={() => {
                                        setShowMushafForAssignment(latestId);
                                        setMushafPage(page);
                                      }}
                                      className="px-3 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors"
                                    >
                                      Page {page} ({mistakesOnPage})
                                    </button>
                                  );
                                })}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 mt-3">
                            {['memory', 'madd', 'ikhfa', 'holding', 'tech', 'other'].map((type) => {
                              const count = mushafMarkings.filter((m: MushafMistake) => m.type === type).length;
                              if (count === 0) return null;
                              return (
                                <span key={type} className="px-2 py-1 bg-white rounded text-xs font-medium text-gray-700">
                                  {getMistakeTypeLabel(type)}: {count}
                                </span>
                              );
                            })}
                          </div>

                          {showMushafForAssignment === latestId && (
                            <div className="mt-4 pt-4 border-t border-purple-200">
                              <div className="flex justify-between items-center mb-3">
                                <div className="text-sm text-gray-600">
                                  Page {mushafPage} • {mushafMarkings.filter((m: MushafMistake) => m.page === mushafPage).length} mistake{mushafMarkings.filter((m: MushafMistake) => m.page === mushafPage).length !== 1 ? 's' : ''} on this page
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {(Array.from(new Set(mushafMarkings.map((m: MushafMistake) => m.page))) as number[])
                                    .sort((a: number, b: number) => a - b)
                                    .map((page: number) => {
                                      const mistakesOnPage = mushafMarkings.filter((m: MushafMistake) => m.page === page).length;
                                      return (
                                        <button
                                          key={page}
                                          onClick={() => setMushafPage(page)}
                                          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                            mushafPage === page
                                              ? 'bg-purple-600 text-white'
                                              : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                                          }`}
                                        >
                                          Page {page} ({mistakesOnPage})
                                        </button>
                                      );
                                    })}
                                </div>
                              </div>

                              <InteractiveMushaf
                                currentPage={mushafPage}
                                onPageChange={setMushafPage}
                                mistakes={mushafMarkings}
                                onMistakeMark={() => {}}
                                readOnly={true}
                                mode="viewing"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {latest.homeworkComments && (
                        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                          <h4 className="font-semibold text-gray-900 mb-2">📝 Homework</h4>
                          <p className="text-gray-700 whitespace-pre-wrap text-sm">{latest.homeworkComments}</p>
                          {(latest as any).homeworkLink && (
                            <div className="mt-3">
                              <a
                                href={(latest as any).homeworkLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline font-medium text-sm"
                              >
                                📎 Homework Link →
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {history.length > 0 && isHistoryExpanded && (
                      <div className="mt-6 space-y-4 border-t border-gray-200 pt-4">
                        {history.map((entry, index) => {
                          const entryId = resolveAssignmentId(entry) || `${studentId}-${index}`;
                          const entryWorkflow = getWorkflowStepLabel(entry);
                          const entryMarkings = (entry as any).mushafMarkings || [];
                          return (
                            <div key={entryId} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold text-gray-900">
                                      {formatDisplayDate(entry.createdAt || entry.updatedAt)}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-200 text-gray-700">
                                      {entryWorkflow}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 line-clamp-3">
                                    {entry.description || 'No report text provided for this day.'}
                                  </p>
                                  {entry.homeworkComments && (
                                    <p className="mt-2 text-xs text-gray-500 line-clamp-2">
                                      Homework: {entry.homeworkComments}
                                    </p>
                                  )}
                                  {entryMarkings.length > 0 && (
                                    <p className="mt-2 text-xs text-gray-500">
                                      {entryMarkings.length} mistake{entryMarkings.length !== 1 ? 's' : ''} recorded.
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2 md:justify-end">
                                  <button
                                    onClick={() => handleOpenEditModal(entry)}
                                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedAssignmentForAction(entry);
                                      setShowAssignTeacherOption(true);
                                      setSelectedTeacherForAssignment('');
                                    }}
                                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
                                  >
                                    Reassign
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAssignment(entry)}
                                    disabled={deletingAssignmentId === entryId}
                                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {deletingAssignmentId === entryId ? 'Deleting…' : 'Delete'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit Assignment Modal */}
        {editingAssignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Edit Daily Report</h3>
                <button
                  onClick={() => {
                    setEditingAssignment(null);
                    setEditForm({ finalReport: '', homework: '', homeworkLink: '' });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Final report <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={editForm.finalReport}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, finalReport: event.target.value }))
                    }
                    rows={6}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Homework <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={editForm.homework}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, homework: event.target.value }))
                    }
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Optional homework link
                  </label>
                  <input
                    type="url"
                    value={editForm.homeworkLink}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, homeworkLink: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="https://resource-link.com"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleSaveAssignmentEdits}
                  disabled={isSavingEdit}
                  className="flex-1 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingEdit ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  onClick={() => {
                    setEditingAssignment(null);
                    setEditForm({ finalReport: '', homework: '', homeworkLink: '' });
                  }}
                  className="rounded-xl bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Assignment Modal */}
        {showCreateForm && (
          <ModernAssignmentForm
            onClose={() => {
              setShowCreateForm(false);
            }}
            onSuccess={() => {
              setShowCreateForm(false);
              refreshData();
            }}
          />
        )}

        {/* Reassign Teacher Modal */}
        {selectedAssignmentForAction && showAssignTeacherOption && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Reassign Assignment</h3>
                <button
                  onClick={() => {
                    setSelectedAssignmentForAction(null);
                    setShowAssignTeacherOption(false);
                    setSelectedTeacherForAssignment('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <p className="font-semibold text-gray-900 mb-1">Assignment:</p>
                <p className="text-sm text-gray-600 mb-2">
                  {getStudentName(selectedAssignmentForAction.assignedTo[0])} - {getWorkflowStepLabel(selectedAssignmentForAction)}
                </p>
                <p className="text-xs text-gray-500">
                  Current Teacher: {selectedAssignmentForAction.listenerName || 'Not assigned'}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select New Teacher <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTeacherForAssignment}
                  onChange={(e) => setSelectedTeacherForAssignment(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Choose a teacher...</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (!selectedTeacherForAssignment) {
                      alert('Please select a teacher');
                      return;
                    }

                    const teacher = teachers.find(t => t.id === selectedTeacherForAssignment);
                    if (!teacher) {
                      alert('Selected teacher not found');
                      return;
                    }

                    try {
                      await updateAssignment(selectedAssignmentForAction.id, {
                        listenerName: teacher.fullName,
                        listenerId: teacher.id,
                        assignedBy: teacher.id
                      });
                      alert('✅ Assignment reassigned successfully!');
                      setSelectedAssignmentForAction(null);
                      setShowAssignTeacherOption(false);
                      setSelectedTeacherForAssignment('');
                      await refreshData();
                    } catch (error) {
                      console.error('Error reassigning assignment:', error);
                      alert('Failed to reassign assignment');
                    }
                  }}
                  disabled={!selectedTeacherForAssignment}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reassign
                </button>
                <button
                  onClick={() => {
                    setSelectedAssignmentForAction(null);
                    setShowAssignTeacherOption(false);
                    setSelectedTeacherForAssignment('');
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentsPage;
