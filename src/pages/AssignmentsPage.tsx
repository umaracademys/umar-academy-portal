import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Assignment, Program, ClassworkSection } from '../types/assignment';
import { MushafMistake } from '@umar-academy/mushaf';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { useBackendData } from '../contexts/BackendDataContext';
import { AssignmentTicket } from '../types';
import ModernAssignmentForm from '../components/ModernAssignmentForm';

const findNextActiveTicketInChain = (
  ticket: AssignmentTicket | null | undefined,
  tickets: AssignmentTicket[]
): AssignmentTicket | null => {
  if (!ticket) return null;
  const visited = new Set<string>();
  let nextId = ticket.nextTicketId;

  while (nextId) {
    if (visited.has(nextId)) break;
    visited.add(nextId);

    const nextTicket = tickets.find(
      (candidate) => (candidate.id || (candidate as any)._id) === nextId
    );
    if (!nextTicket) break;

    if (['approved', 'completed', 'skipped', 'finalized'].includes(nextTicket.status)) {
      nextId = nextTicket.nextTicketId || '';
      continue;
    }

    return nextTicket;
  }

  return null;
};

const AssignmentsPage: React.FC = () => {
  const {
    assignments,
    students,
    tickets,
    teachers,
    assignTicketToNext,
    finalizeTicket,
    updateAssignment,
    deleteAssignment,
    refreshData,
    recitationReviews,
  } = useBackendData();
  const { user } = useAuth();
  
  const [showMushafForAssignment, setShowMushafForAssignment] = useState<string | null>(null);
  const [mushafPage, setMushafPage] = useState<number>(1);
  const [filterProgram, setFilterProgram] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<AssignmentTicket | null>(null);
  const [selectedNextTeacher, setSelectedNextTeacher] = useState('');
  const [selectedNextTeacherNote, setSelectedNextTeacherNote] = useState('');
  const [finalizeData, setFinalizeData] = useState({
    finalReport: '',
    homework: '',
    homeworkLink: ''
  });
  const [finalReportTouched, setFinalReportTouched] = useState(false);
  const [homeworkTouched, setHomeworkTouched] = useState(false);
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
    sabq: { portion: '', notes: '' },
    sabqi: { portion: '', notes: '' },
    manzil: { portion: '', notes: '' },
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [recitationReviewData, setRecitationReviewData] = useState<any>(null);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);
  const [showFinalizeMushaf, setShowFinalizeMushaf] = useState(false);
  const [finalizeMushafPage, setFinalizeMushafPage] = useState(1);

  // Check if user can create assignments
  const canCreateAssignments = user?.role === 'superadmin' || 
    user?.role === 'admin' ||
    user?.role === 'teacher';
  const canFinalizeTickets = user?.role === 'superadmin' || user?.role === 'admin';

  const getTicketId = (ticket?: AssignmentTicket | null) =>
    ticket ? (ticket.id || (ticket as any)._id || '') : '';

  const selectedTicketChain = useMemo(() => {
    if (!selectedTicket) return [] as AssignmentTicket[];
    const chain: AssignmentTicket[] = [];
    let current: AssignmentTicket | null = selectedTicket;
    let guard = 0;
    while (current && guard < 10) {
      chain.unshift(current);
      const prevId = current.previousTicketId;
      if (!prevId) break;
      current = tickets.find((t) => (t.id || (t as any)._id) === prevId) || null;
      guard += 1;
    }
    return chain;
  }, [selectedTicket, tickets]);

  const sabqTicket = useMemo(
    () => selectedTicketChain.find((t) => t.workflowStep === 'sabq'),
    [selectedTicketChain]
  );

  const sabqiTicket = useMemo(
    () => selectedTicketChain.find((t) => t.workflowStep === 'sabqi'),
    [selectedTicketChain]
  );

  const manzilTicket = useMemo(
    () => selectedTicketChain.find((t) => t.workflowStep === 'manzil'),
    [selectedTicketChain]
  );

  const finalizeMistakeCounts = useMemo(() => {
    if (!selectedTicket || selectedTicket.workflowStep !== 'finalize') {
      return {} as Record<string, number>;
    }
    return (selectedTicket.mushafMarkings || []).reduce<Record<string, number>>((acc, mistake) => {
      const key = mistake.type || 'other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [selectedTicket]);

  const getTicketStepLabel = (ticket: AssignmentTicket) => {
    switch (ticket.workflowStep) {
      case 'sabq':
        return 'Sabq';
      case 'sabqi':
        return 'Sabqi';
      case 'manzil':
        return 'Manzil';
      case 'finalize':
        return 'Finalize';
      default:
        return ticket.workflowStep;
    }
  };

  const getTicketTimestampLabel = (ticket: AssignmentTicket) => {
    const rawDate = (ticket as any).updatedAt || ticket.completedAt || ticket.createdAt;
    if (!rawDate) return '—';
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Mock programs - in real app, this would come from API
  useEffect(() => {
    const mockPrograms: Program[] = [
      { id: '1', name: 'Full Time HQ', description: 'Full-time Hifz program', students: ['1', '2', '3'], createdAt: new Date(), status: 'active' },
      { id: '2', name: 'Part Time HQ', description: 'Part-time Hifz program', students: ['1', '4', '5'], createdAt: new Date(), status: 'active' },
      { id: '3', name: 'After School Reading', description: 'After school reading program', students: ['2', '3', '6'], createdAt: new Date(), status: 'active' }
    ];
    setPrograms(mockPrograms);
  }, []);

  const resolveNextActiveTicket = useCallback(
    (ticket?: AssignmentTicket | null) => findNextActiveTicketInChain(ticket, tickets),
    [tickets]
  );

  const nextActiveTicket = useMemo(
    () => resolveNextActiveTicket(selectedTicket),
    [resolveNextActiveTicket, selectedTicket]
  );

  useEffect(() => {
    if (selectedTicket && selectedTicket.workflowStep !== 'finalize') {
      const fallbackNote = selectedTicket.revisionNotes || '';
      setSelectedNextTeacherNote(nextActiveTicket?.revisionNotes || fallbackNote);
    } else {
      setSelectedNextTeacherNote('');
    }
  }, [nextActiveTicket, selectedTicket]);

  const getStudentName = (studentId: string): string => {
    const student = students.find(s => (s as any)._id === studentId || s.id === studentId);
    return student?.fullName || 'Unknown Student';
  };

  // Filter assignments - show those from finalized tickets OR converted from recitation reviews
  const filteredAssignments = assignments.filter(assignment => {
    // Show assignments created from approved/finalized tickets OR converted from recitation reviews
    const hasTicketId = !!(assignment as any).fromTicketId;
    const fromRecitationReview = !!(assignment as any).fromRecitationReviewId;
    
    const programMatch = !filterProgram || assignment.program === filterProgram;
    const typeMatch = !filterType || assignment.type === filterType;
    
    // Include assignments from tickets OR from recitation reviews
    return (hasTicketId || fromRecitationReview) && programMatch && typeMatch;
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
  const approvedTicketsNeedingAction = tickets.filter((ticket) => {
    if (ticket.status !== 'approved') return false;
    if (ticket.workflowStep === 'finalize') return false;

    const nextTicket = resolveNextActiveTicket(ticket);
    return !!nextTicket;
  });

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

  const handleOpenEditModal = async (assignment: Assignment) => {
    setEditingAssignment(assignment);
    
    // Initialize form with existing assignment data
    const existingClassworkSections = (assignment as any).classworkSections || [];
    const sabqSection = existingClassworkSections.find((s: any) => (s.step || '').toLowerCase() === 'sabq');
    const sabqiSection = existingClassworkSections.find((s: any) => (s.step || '').toLowerCase() === 'sabqi');
    const manzilSection = existingClassworkSections.find((s: any) => (s.step || '').toLowerCase() === 'manzil');
    
    // Get student ID from assignment
    const studentId = assignment.assignedTo?.[0] || (assignment as any).studentId;
    
    // Check if this assignment came from a recitation review
    const fromRecitationReviewId = (assignment as any).fromRecitationReviewId;
    let reviewData: any = null;
    
    // Also check for tickets from the same student that might have additional data
    let relatedTickets: any[] = [];
    if (studentId) {
      // Find tickets for this student that were created/updated around the same time as the assignment
      const assignmentDate = assignment.createdAt ? new Date(assignment.createdAt) : new Date();
      relatedTickets = tickets.filter((ticket: any) => {
        const ticketStudentId = ticket.studentId || (ticket as any).studentId;
        if (ticketStudentId !== studentId && ticketStudentId?.toString() !== studentId?.toString()) {
          return false;
        }
        // Check if ticket is from the same day or recent
        const ticketDate = ticket.createdAt ? new Date(ticket.createdAt) : new Date(ticket.updatedAt || new Date());
        const daysDiff = Math.abs(assignmentDate.getTime() - ticketDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 1; // Same day or within 1 day
      });
    }
    
    // Extract data from related tickets
    const sabqTicket = relatedTickets.find((t: any) => (t.workflowStep || '').toLowerCase() === 'sabq');
    const sabqiTicket = relatedTickets.find((t: any) => (t.workflowStep || '').toLowerCase() === 'sabqi');
    const manzilTicket = relatedTickets.find((t: any) => (t.workflowStep || '').toLowerCase() === 'manzil');
    
    if (fromRecitationReviewId) {
      // Find the recitation review that was converted
      reviewData = recitationReviews.find((r: any) => 
        (r.id || (r as any)._id) === fromRecitationReviewId
      );
      
      if (reviewData) {
        console.log('📖 Found recitation review data:', reviewData);
        setRecitationReviewData(reviewData);
        
        // Also find ALL recitation reviews for this student on the same day
        // This helps pre-fill all sections if the student had multiple reviews that day
        const assignmentDate = assignment.createdAt ? new Date(assignment.createdAt) : new Date();
        const assignmentDateStr = assignmentDate.toISOString().split('T')[0];
        
        const allReviewsForStudent = recitationReviews.filter((r: any) => {
          const reviewStudentId = (r as any).studentId || (r as any).student?._id || (r as any).student?.id;
          if (reviewStudentId !== studentId && reviewStudentId?.toString() !== studentId?.toString()) {
            return false;
          }
          // Check if review is from the same day
          const reviewDate = (r as any).createdAt ? new Date((r as any).createdAt) : new Date((r as any).updatedAt || new Date());
          const reviewDateStr = reviewDate.toISOString().split('T')[0];
          return reviewDateStr === assignmentDateStr;
        });
        
        console.log(`📚 Found ${allReviewsForStudent.length} recitation reviews for student on the same day`);
        
        // Find reviews for each type
        const sabqReview = allReviewsForStudent.find((r: any) => ((r as any).recitationType || '').toLowerCase() === 'sabq');
        const sabqiReview = allReviewsForStudent.find((r: any) => ((r as any).recitationType || '').toLowerCase() === 'sabqi');
        const manzilReview = allReviewsForStudent.find((r: any) => ((r as any).recitationType || '').toLowerCase() === 'manzil');
        
        // Pre-fill each section with its corresponding review data, or existing data, or ticket data
        // Priority: 1. Review notes (if review exists for that type), 2. Existing section data, 3. Ticket data, 4. Empty
        const sabqPortion = sabqReview ? ((sabqReview as any).notes || '') : 
          (sabqSection?.assignmentRange || sabqSection?.assignmentPortion || sabqTicket?.assignmentRange || sabqTicket?.assignmentPortion || '');
        const sabqNotes = sabqReview ? ((sabqReview as any).notes || '') : 
          (sabqSection?.details || sabqSection?.summary || sabqTicket?.progressNotes || '');
        
        const sabqiPortion = sabqiReview ? ((sabqiReview as any).notes || '') : 
          (sabqiSection?.assignmentRange || sabqiSection?.assignmentPortion || sabqiTicket?.assignmentRange || sabqiTicket?.assignmentPortion || '');
        const sabqiNotes = sabqiReview ? ((sabqiReview as any).notes || '') : 
          (sabqiSection?.details || sabqiSection?.summary || sabqiTicket?.progressNotes || '');
        
        const manzilPortion = manzilReview ? ((manzilReview as any).notes || '') : 
          (manzilSection?.assignmentRange || manzilSection?.assignmentPortion || manzilTicket?.assignmentRange || manzilTicket?.assignmentPortion || '');
        const manzilNotes = manzilReview ? ((manzilReview as any).notes || '') : 
          (manzilSection?.details || manzilSection?.summary || manzilTicket?.progressNotes || '');
        
        // Combine all review notes for final report, or use existing description
        const allReviewNotes = allReviewsForStudent
          .map((r: any) => {
            const type = ((r as any).recitationType || '').toUpperCase();
            const notes = (r as any).notes || '';
            return notes ? `${type}: ${notes}` : '';
          })
          .filter(Boolean)
          .join('\n\n');
        
        const finalReport = assignment.description || allReviewNotes || 
          (reviewData as any).notes || 
          `Recitation review for ${(reviewData as any).studentName} - ${(reviewData as any).recitationType} by ${(reviewData as any).teacherName}`;
        
        // Get audio link from any review (prioritize the main review)
        const reviewWithAudio = allReviewsForStudent.find((r: any) => (r as any).audioLink);
        const audioLink = (reviewData as any).audioLink || 
          (reviewWithAudio ? (reviewWithAudio as any).audioLink : '') ||
          (assignment as any).homeworkLink || '';
        
        // Initialize form with all available data
        const initialForm = {
          finalReport: finalReport,
          homework: (assignment as any).homeworkComments || assignment.homeworkSummary || '',
          homeworkLink: audioLink || (assignment as any).homeworkLink || '',
          sabq: { 
            portion: sabqPortion,
            notes: sabqNotes
          },
          sabqi: { 
            portion: sabqiPortion,
            notes: sabqiNotes
          },
          manzil: { 
            portion: manzilPortion,
            notes: manzilNotes
          },
        };
        
        console.log('📝 Initialized form with all review data:', {
          reviewsFound: allReviewsForStudent.length,
          sabqReview: !!sabqReview,
          sabqiReview: !!sabqiReview,
          manzilReview: !!manzilReview,
          sabq: initialForm.sabq,
          sabqi: initialForm.sabqi,
          manzil: initialForm.manzil,
          finalReport: initialForm.finalReport,
          audioLink: initialForm.homeworkLink
        });
        
        setEditForm(initialForm);
        return;
      }
    }
    
    // If no recitation review, use existing classwork sections, ticket data, or empty
    setEditForm({
      finalReport: assignment.description || '',
      homework: (assignment as any).homeworkComments || assignment.homeworkSummary || '',
      homeworkLink: (assignment as any).homeworkLink || '',
      sabq: { 
        portion: sabqSection?.assignmentRange || sabqSection?.assignmentPortion || sabqTicket?.assignmentRange || sabqTicket?.assignmentPortion || '',
        notes: sabqSection?.details || sabqSection?.summary || sabqTicket?.progressNotes || ''
      },
      sabqi: { 
        portion: sabqiSection?.assignmentRange || sabqiSection?.assignmentPortion || sabqiTicket?.assignmentRange || sabqiTicket?.assignmentPortion || '',
        notes: sabqiSection?.details || sabqiSection?.summary || sabqiTicket?.progressNotes || ''
      },
      manzil: { 
        portion: manzilSection?.assignmentRange || manzilSection?.assignmentPortion || manzilTicket?.assignmentRange || manzilTicket?.assignmentPortion || '',
        notes: manzilSection?.details || manzilSection?.summary || manzilTicket?.progressNotes || ''
      },
    });
    setRecitationReviewData(null);
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
      
      // Build classwork sections from form data
      const classworkSections: ClassworkSection[] = [];
      
      // Add sabq section if it has data
      if (editForm.sabq.portion.trim() || editForm.sabq.notes.trim()) {
        classworkSections.push({
          step: 'sabq',
          title: 'Sabq (New Lesson)',
          label: 'Sabq',
          summary: editForm.sabq.notes.trim(),
          assignmentRange: editForm.sabq.portion.trim(),
          order: 0,
        });
      }
      
      // Add sabqi section if it has data
      if (editForm.sabqi.portion.trim() || editForm.sabqi.notes.trim()) {
        classworkSections.push({
          step: 'sabqi',
          title: 'Sabqi (Revision)',
          label: 'Sabqi',
          summary: editForm.sabqi.notes.trim(),
          assignmentRange: editForm.sabqi.portion.trim(),
          order: 1,
        });
      }
      
      // Add manzil section if it has data
      if (editForm.manzil.portion.trim() || editForm.manzil.notes.trim()) {
        classworkSections.push({
          step: 'manzil',
          title: 'Manzil',
          label: 'Manzil',
          summary: editForm.manzil.notes.trim(),
          assignmentRange: editForm.manzil.portion.trim(),
          order: 2,
        });
      }
      
      await updateAssignment(assignmentId, {
        description: editForm.finalReport,
        homeworkComments: editForm.homework,
        homeworkLink: editForm.homeworkLink,
        homeworkSummary: editForm.homework,
        classworkSections: classworkSections,
        status: 'published', // Mark as finalized/published
        updatedAt: new Date(),
      });
      await refreshData();
      setEditingAssignment(null);
      setRecitationReviewData(null);
      alert('✅ Assignment updated and finalized successfully!');
    } catch (error) {
      console.error('Error updating assignment:', error);
      alert('Failed to update assignment.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  useEffect(() => {
    if (!selectedTicket || selectedTicket.workflowStep !== 'finalize') {
      setShowFinalizeMushaf(false);
      setFinalizeMushafPage(1);
      return;
    }

    const sabqSummary = sabqTicket?.progressNotes?.trim() || '';
    const defaultHomework = manzilTicket?.progressNotes?.trim()
      ? `Review: ${manzilTicket.progressNotes.trim()}`
      : '';

    setFinalizeData({
      finalReport: sabqSummary,
      homework: defaultHomework,
      homeworkLink: '',
    });
    setFinalReportTouched(Boolean(sabqSummary));
    setHomeworkTouched(Boolean(defaultHomework));

    const firstMistakePage = selectedTicket.mushafMarkings?.[0]?.page;
    setFinalizeMushafPage(firstMistakePage && !Number.isNaN(firstMistakePage) ? firstMistakePage : 1);
    setShowFinalizeMushaf(Boolean(selectedTicket.mushafMarkings?.length));
  }, [manzilTicket, sabqTicket, selectedTicket]);

  // Get workflow step label
  const getWorkflowStepLabel = (assignment: Assignment): string => {
    if (assignment.classworkType === 'sabq') return 'Sabq';
    if (assignment.classworkType === 'sabqi') return 'Sabqi';
    if (assignment.classworkType === 'manzil') return 'Manzil';
    return 'Recitation';
  };

  const formatAssignmentPortion = (portion?: string) => {
    if (!portion) return '';
    const normalized = portion.toLowerCase();
    switch (normalized) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 rounded-2xl p-8 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold mb-2">📝 Finalized Assignments</h1>
                <p className="text-green-100 text-lg">View assignments created from approved ticket workflow</p>
              </div>
                {canCreateAssignments && (
                <button
                  onClick={() => {
                    console.log('🛠️ AssignmentsPage: Create New Assignment clicked');
                    setShowCreateForm(true);
                  }}
                  className="px-8 py-4 bg-white text-green-600 rounded-xl hover:bg-green-50 font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center"
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
                const nextTicket = resolveNextActiveTicket(ticket);
                const advanceToFinalize = nextTicket?.workflowStep === 'finalize';
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
                        onClick={() => setSelectedTicket(advanceToFinalize && nextTicket ? nextTicket : ticket)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                          advanceToFinalize
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-green-500 hover:bg-green-600'
                        }`}
                      >
                        {advanceToFinalize ? 'Finalize & Add Homework' : 'Assign to Next Teacher'}
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
                        {!canFinalizeTickets && (
                          <p className="text-xs text-orange-600 mt-2">Only admins can finalize assignments.</p>
                        )}
                       </div>
                      {canFinalizeTickets && (
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                        >
                          Finalize & Add Homework
                        </button>
                      )}
                     </div>
                   </div>
                 );
               })}
            </div>
          </div>
        )}

        {/* Ticket Action Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Ticket Action</h3>
                <button
                  onClick={() => {
                    setSelectedTicket(null);
                    setSelectedNextTeacher('');
                    setSelectedNextTeacherNote('');
                    setFinalizeData({ finalReport: '', homework: '', homeworkLink: '' });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <p className="font-semibold">Student: {getStudentName(selectedTicket.studentId)}</p>
                <p className="text-sm text-gray-600">Step: {selectedTicket.workflowStep}</p>
                <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Last listener
                    </span>
                    <p className="mt-1 text-gray-800">{selectedTicket.assignedTeacherName || '—'}</p>
                  </div>
                  {(selectedTicket.assignmentRange || selectedTicket.assignmentPortion) && (
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Portion covered
                      </span>
                      <p className="mt-1 text-gray-800">
                        {selectedTicket.assignmentRange || '—'}
                        {selectedTicket.assignmentPortion
                          ? ` • ${formatAssignmentPortion(selectedTicket.assignmentPortion as string)}`
                          : ''}
                      </p>
                    </div>
                  )}
                  {selectedTicket.progressNotes && (
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Teacher notes
                      </span>
                      <p className="mt-1 whitespace-pre-wrap rounded-md bg-white px-3 py-2 text-gray-800 shadow-sm">
                        {selectedTicket.progressNotes}
                      </p>
                    </div>
                  )}
                  {selectedTicket.revisionNotes && (
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Internal notes
                      </span>
                      <p className="mt-1 whitespace-pre-wrap rounded-md bg-white px-3 py-2 text-gray-800 shadow-sm">
                        {selectedTicket.revisionNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {selectedTicket.workflowStep !== 'finalize' ? (
                nextActiveTicket ? (
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Internal note for next teacher
                      </label>
                      <textarea
                        value={selectedNextTeacherNote}
                        onChange={(event) => setSelectedNextTeacherNote(event.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Highlight focus areas, mistakes to watch for, or pacing guidance…"
                      />
                    </div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Teacher for Next Step
                    </label>
                    <select
                      value={selectedNextTeacher}
                      onChange={(e) => setSelectedNextTeacher(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                    >
                      <option value="">Choose a teacher...</option>
                      {teachers.map(teacher => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.fullName}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          if (!selectedNextTeacher) {
                            alert('Please select a teacher');
                            return;
                          }
                          const teacher = teachers.find(t => t.id === selectedNextTeacher);
                          if (!teacher) return;
                          try {
                            const ticketId = selectedTicket.id || (selectedTicket as any)._id;
                            await assignTicketToNext(
                              ticketId,
                              teacher.id,
                              teacher.fullName,
                              selectedNextTeacherNote.trim() || undefined
                            );
                            alert('✅ Next step assigned successfully!');
                            setSelectedTicket(null);
                            setSelectedNextTeacher('');
                            setSelectedNextTeacherNote('');
                            await refreshData();
                          } catch (error) {
                            alert('Failed to assign ticket');
                          }
                        }}
                        disabled={!selectedNextTeacher}
                        className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                      >
                        Assign to Next Teacher
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTicket(null);
                          setSelectedNextTeacher('');
                        }}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    All listening steps are approved. Finalize to publish homework and close the chain.
                  </div>
                )
              ) : (
                <div className="space-y-6">
                  {!canFinalizeTickets ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      Only admins can finalize assignments. Please contact an administrator to publish this report.
                    </div>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-green-200 bg-green-50/50 p-4">
                        <h4 className="text-sm font-semibold text-green-800 mb-3">
                          Recent listening reports
                        </h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-green-100 bg-white p-3 shadow-sm">
                            <p className="text-xs uppercase tracking-wide text-green-600 font-semibold mb-1">Sabqi</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {sabqiTicket?.progressNotes?.trim() || 'No sabqi notes recorded.'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-green-100 bg-white p-3 shadow-sm">
                            <p className="text-xs uppercase tracking-wide text-green-600 font-semibold mb-1">Manzil</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {manzilTicket?.progressNotes?.trim() || 'No manzil notes recorded.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3">Ticket history</h4>
                        <div className="space-y-3">
                          {selectedTicketChain.map((ticket, idx) => (
                            <div
                              key={`${ticket.workflowStep}-${idx}`}
                              className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                  <span>{getTicketStepLabel(ticket)}</span>
                                  <span className="text-gray-400 text-xs">• {ticket.status.replace('_', ' ')}</span>
                                </div>
                                <span className="text-xs text-gray-500">{getTicketTimestampLabel(ticket)}</span>
                              </div>
                              <p className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
                                {ticket.progressNotes?.trim() || 'No notes recorded.'}
                              </p>
                              <p className="mt-1 text-[11px] text-gray-500">
                                Teacher: {ticket.assignedTeacherName || '—'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            Sabq summary <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={finalizeData.finalReport}
                            onChange={(event) => {
                              setFinalReportTouched(true);
                              setFinalizeData((prev) => ({ ...prev, finalReport: event.target.value }));
                            }}
                            rows={5}
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                            placeholder="Summarize today's sabq..."
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            Homework for next day <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={finalizeData.homework}
                            onChange={(event) => {
                              setHomeworkTouched(true);
                              setFinalizeData((prev) => ({ ...prev, homework: event.target.value }));
                            }}
                            rows={4}
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                            placeholder="Homework instructions for the student..."
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-800">Interactive Mushaf</h4>
                            <p className="text-xs text-gray-500">Share what was marked during the session.</p>
                          </div>
                          <button
                            onClick={() => setShowFinalizeMushaf((prev) => !prev)}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                          >
                            {showFinalizeMushaf ? 'Hide Mushaf' : 'Show Mushaf'}
                          </button>
                        </div>
                        {showFinalizeMushaf && (
                          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3">
                            <InteractiveMushaf
                              currentPage={finalizeMushafPage}
                              onPageChange={setFinalizeMushafPage}
                              mistakes={selectedTicket.mushafMarkings || []}
                              historicalMistakes={[]}
                              onMistakeMark={() => {}}
                              mode="viewing"
                              studentName={getStudentName(selectedTicket.studentId)}
                              showHistorical={false}
                            />
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">
                        <h4 className="mb-3 text-sm font-semibold text-gray-800">Student preview</h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Sabq summary</p>
                            <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-gray-50 px-3 py-2 text-gray-700">
                              {finalizeData.finalReport || 'Add a sabq summary above.'}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Previous reports</p>
                            <ul className="mt-1 list-disc space-y-1 pl-5 text-gray-700">
                              <li><span className="font-semibold">Sabqi:</span> {sabqiTicket?.progressNotes?.trim() || 'No report.'}</li>
                              <li><span className="font-semibold">Manzil:</span> {manzilTicket?.progressNotes?.trim() || 'No report.'}</li>
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Homework</p>
                            <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-gray-50 px-3 py-2 text-gray-700">
                              {finalizeData.homework || 'Add homework instructions above.'}
                            </pre>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          onClick={async () => {
                            if (!finalizeData.finalReport.trim() || !finalizeData.homework.trim()) {
                              alert('Please fill in all required fields');
                              return;
                            }

                            try {
                              const ticketId = selectedTicket.id || (selectedTicket as any)._id;
                              const classworkSectionsPayload: ClassworkSection[] = [
                                {
                                  step: 'sabq',
                                  title: 'Sabq Summary',
                                  label: 'Sabq Summary',
                                  summary: finalizeData.finalReport.trim(),
                                  assignmentRange: finalizeData.finalReport.trim(),
                                  order: 0,
                                },
                                ...(sabqiTicket?.progressNotes?.trim()
                                  ? [
                                      {
                                        step: 'sabqi',
                                        title: 'Sabqi Notes',
                                        label: 'Sabqi Notes',
                                        summary: sabqiTicket.progressNotes.trim(),
                                        assignmentRange: sabqiTicket.progressNotes.trim(),
                                        order: 1,
                                      } as ClassworkSection,
                                    ]
                                  : []),
                                ...(manzilTicket?.progressNotes?.trim()
                                  ? [
                                      {
                                        step: 'manzil',
                                        title: 'Manzil Notes',
                                        label: 'Manzil Notes',
                                        summary: manzilTicket.progressNotes.trim(),
                                        assignmentRange: manzilTicket.progressNotes.trim(),
                                        order: 2,
                                      } as ClassworkSection,
                                    ]
                                  : []),
                              ];

                              const previousReportsText = [
                                sabqiTicket?.progressNotes?.trim()
                                  ? `Sabqi Notes:\n${sabqiTicket.progressNotes.trim()}`
                                  : null,
                                manzilTicket?.progressNotes?.trim()
                                  ? `Manzil Notes:\n${manzilTicket.progressNotes.trim()}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join('\n\n');

                              await finalizeTicket(ticketId, {
                                finalReport: [
                                  finalizeData.finalReport.trim(),
                                  previousReportsText,
                                ]
                                  .filter(Boolean)
                                  .join('\n\n'),
                                homework: finalizeData.homework,
                                homeworkLink: '',
                                reviewedBy: user?.id || '',
                                classworkSections: classworkSectionsPayload,
                                classworkSummary: finalizeData.finalReport.trim(),
                                homeworkSummary: finalizeData.homework,
                                classworkType: 'sabq',
                              } as any);
                              alert('✅ Ticket finalized! Assignment created.');
                              setSelectedTicket(null);
                              setFinalizeData({ finalReport: '', homework: '', homeworkLink: '' });
                              setFinalReportTouched(false);
                              setHomeworkTouched(false);
                              setShowFinalizeMushaf(false);
                              await refreshData();
                            } catch (error) {
                              alert('Failed to finalize ticket');
                            }
                          }}
                          className="flex-1 rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
                        >
                          Finalize &amp; Create Assignment
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTicket(null);
                            setFinalizeData({ finalReport: '', homework: '', homeworkLink: '' });
                            setFinalReportTouched(false);
                            setHomeworkTouched(false);
                            setShowFinalizeMushaf(false);
                          }}
                          className="rounded-xl bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                              {workflowStep}
                            </span>
                            {(latest as any).fromRecitationReviewId && (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                📖 From Recitation Review
                              </span>
                            )}
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
                            {(latest as any).fromRecitationReviewId && (
                              <span className="text-purple-600">✨ Converted from review</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:items-end">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleOpenEditModal(latest)}
                              className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                            >
                              Edit report
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAssignmentForAction(latest);
                                setShowAssignTeacherOption(true);
                                setSelectedTeacherForAssignment('');
                              }}
                              className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2"
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
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <h4 className="font-semibold text-gray-900 mb-2">📋 Recitation Report</h4>
                          <p className="text-gray-700 whitespace-pre-wrap text-sm">{latest.description}</p>
                        </div>
                      )}

                      {mushafMarkings.length > 0 && (
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
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
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
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
                                      className="px-3 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
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
                            <div className="mt-4 pt-4 border-t border-green-200">
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
                                              ? 'bg-green-600 text-white'
                                              : 'bg-green-100 text-green-800 hover:bg-green-200'
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
                                className="text-green-600 hover:underline font-medium text-sm"
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
                                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-green-200 text-green-600 hover:bg-green-50 transition-colors"
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
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Edit & Finalize Assignment</h3>
                  {recitationReviewData && (
                    <div className="text-sm text-purple-600 mt-1 space-y-1">
                      <p>
                        📖 From Recitation Review: <span className="font-semibold">{(recitationReviewData as any).recitationType}</span> by <span className="font-semibold">{(recitationReviewData as any).teacherName}</span>
                      </p>
                      {(recitationReviewData as any).audioLink && (
                        <p>
                          🔊 <a href={(recitationReviewData as any).audioLink} target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-800">Listen to Audio Recording</a>
                        </p>
                      )}
                      <p className="text-xs text-gray-600">
                        Student: {(recitationReviewData as any).studentName} • Program: {(recitationReviewData as any).program}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setEditingAssignment(null);
                    setEditForm({ finalReport: '', homework: '', homeworkLink: '', sabq: { portion: '', notes: '' }, sabqi: { portion: '', notes: '' }, manzil: { portion: '', notes: '' } });
                    setRecitationReviewData(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Classwork Sections - Sabq, Sabqi, Manzil */}
                <div className="bg-[#FDF7E7] rounded-lg border border-[#E7AA39]/40 p-4">
                  <h4 className="text-sm font-semibold text-[#2E4D32] mb-4 uppercase tracking-wide">Classwork Details</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Sabq Section */}
                    <div className="rounded-lg border border-[#E7AA39]/20 bg-white p-4">
                      <p className="text-xs font-semibold text-[#2E4D32]/70 uppercase tracking-wide mb-3">✨ Sabq (New Lesson)</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Portion/Range</label>
                          <input
                            type="text"
                            value={editForm.sabq.portion}
                            onChange={(e) => setEditForm(prev => ({ ...prev, sabq: { ...prev.sabq, portion: e.target.value } }))}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                            placeholder="e.g., Juz 1, Page 2-5"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                          <textarea
                            value={editForm.sabq.notes}
                            onChange={(e) => setEditForm(prev => ({ ...prev, sabq: { ...prev.sabq, notes: e.target.value } }))}
                            rows={3}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                            placeholder="Teacher's notes for sabq..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sabqi Section */}
                    <div className="rounded-lg border border-[#E7AA39]/20 bg-white p-4">
                      <p className="text-xs font-semibold text-[#2E4D32]/70 uppercase tracking-wide mb-3">🧠 Sabqi (Revision)</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Portion/Range</label>
                          <input
                            type="text"
                            value={editForm.sabqi.portion}
                            onChange={(e) => setEditForm(prev => ({ ...prev, sabqi: { ...prev.sabqi, portion: e.target.value } }))}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                            placeholder="e.g., Juz 1, Page 1-3"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                          <textarea
                            value={editForm.sabqi.notes}
                            onChange={(e) => setEditForm(prev => ({ ...prev, sabqi: { ...prev.sabqi, notes: e.target.value } }))}
                            rows={3}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                            placeholder="Teacher's notes for sabqi..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Manzil Section */}
                    <div className="rounded-lg border border-[#E7AA39]/20 bg-white p-4">
                      <p className="text-xs font-semibold text-[#2E4D32]/70 uppercase tracking-wide mb-3">🔁 Manzil</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Portion/Range</label>
                          <input
                            type="text"
                            value={editForm.manzil.portion}
                            onChange={(e) => setEditForm(prev => ({ ...prev, manzil: { ...prev.manzil, portion: e.target.value } }))}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                            placeholder="e.g., Juz 1, Page 1-10"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                          <textarea
                            value={editForm.manzil.notes}
                            onChange={(e) => setEditForm(prev => ({ ...prev, manzil: { ...prev.manzil, notes: e.target.value } }))}
                            rows={3}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                            placeholder="Teacher's notes for manzil..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Final Report */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Final Report / Summary <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={editForm.finalReport}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, finalReport: event.target.value }))
                    }
                    rows={6}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                    placeholder="Overall summary and final report..."
                  />
                </div>

                {/* Homework Section */}
                <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">📝 Homework</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Homework Instructions <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={editForm.homework}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, homework: event.target.value }))
                        }
                        rows={4}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                        placeholder="What should the student practice for homework?"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Optional Homework Link
                      </label>
                      <input
                        type="url"
                        value={editForm.homeworkLink}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, homeworkLink: event.target.value }))
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                        placeholder="https://resource-link.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleSaveAssignmentEdits}
                  disabled={isSavingEdit}
                  className="flex-1 rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingEdit ? 'Saving & Finalizing…' : '✅ Save & Finalize'}
                </button>
                <button
                  onClick={() => {
                    setEditingAssignment(null);
                    setEditForm({ finalReport: '', homework: '', homeworkLink: '', sabq: { portion: '', notes: '' }, sabqi: { portion: '', notes: '' }, manzil: { portion: '', notes: '' } });
                    setRecitationReviewData(null);
                  }}
                  className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
