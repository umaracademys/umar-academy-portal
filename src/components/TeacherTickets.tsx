import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBackendData } from '../contexts/BackendDataContext';
import { AssignmentTicket, TicketStatus, WorkflowStep, MushafMistake } from '../types';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { getQuranChapters, Chapter } from '@umar-academy/mushaf';

// Helper function to calculate Juz from page number
const getJuzFromPage = (page: number): number => {
  // Simplified Juz calculation - each Juz is approximately 20 pages
  // Juz 1: pages 1-2
  // Juz 2: pages 2-5
  // Juz 3: pages 5-8
  // ... (more accurate mapping would require exact page boundaries)
  if (page <= 2) return 1;
  if (page <= 5) return 2;
  if (page <= 8) return 3;
  if (page <= 11) return 4;
  if (page <= 14) return 5;
  if (page <= 17) return 6;
  if (page <= 20) return 7;
  if (page <= 23) return 8;
  if (page <= 26) return 9;
  if (page <= 29) return 10;
  if (page <= 32) return 11;
  if (page <= 35) return 12;
  if (page <= 38) return 13;
  if (page <= 41) return 14;
  if (page <= 44) return 15;
  if (page <= 47) return 16;
  if (page <= 50) return 17;
  if (page <= 53) return 18;
  if (page <= 56) return 19;
  if (page <= 59) return 20;
  if (page <= 62) return 21;
  if (page <= 65) return 22;
  if (page <= 68) return 23;
  if (page <= 71) return 24;
  if (page <= 74) return 25;
  if (page <= 77) return 26;
  if (page <= 80) return 27;
  if (page <= 83) return 28;
  if (page <= 86) return 29;
  return 30; // pages 86-604
};

const formatPortionLabel = (portion?: string) => {
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

const STEP_THEMES: Record<
  WorkflowStep,
  {
    accent: string;
    badge: string;
    chip: string;
  }
> = {
  sabq: {
    accent: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    badge: 'bg-emerald-500/10 text-emerald-700',
    chip: 'text-emerald-700'
  },
  sabqi: {
    accent: 'bg-sky-50 border-sky-200 text-sky-800',
    badge: 'bg-sky-500/10 text-sky-700',
    chip: 'text-sky-700'
  },
  manzil: {
    accent: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    badge: 'bg-indigo-500/10 text-indigo-700',
    chip: 'text-indigo-700'
  },
  finalize: {
    accent: 'bg-amber-50 border-amber-200 text-amber-800',
    badge: 'bg-amber-500/10 text-amber-700',
    chip: 'text-amber-700'
  }
};

const getStepTheme = (step: WorkflowStep) =>
  STEP_THEMES[step] || STEP_THEMES.sabq;

const extractAssignmentDetails = (ticket: AssignmentTicket) => {
  const range =
    typeof ticket.assignmentRange === 'string'
      ? ticket.assignmentRange.trim()
      : '';

  const rawPortion =
    typeof ticket.assignmentPortion === 'string'
      ? ticket.assignmentPortion.trim()
      : ticket.assignmentPortion
      ? String(ticket.assignmentPortion)
      : '';

  const portionLabel = rawPortion ? formatPortionLabel(rawPortion) : '';

  const uniquePortion =
    portionLabel &&
    range &&
    portionLabel.toLowerCase() === range.toLowerCase()
      ? ''
      : portionLabel;

  const summaryParts = [range, uniquePortion].filter(Boolean);

  return {
    range,
    portion: uniquePortion,
    summary: summaryParts.join(' • '),
    hasDetails: summaryParts.length > 0
  };
};

interface TeacherTicketsProps {
  onClose?: () => void;
}

const TeacherTickets: React.FC<TeacherTicketsProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { tickets, students, teachers, updateTicket, assignTicketToNext, refreshData, getStudentPersonalMushafFiltered } = useBackendData();
  
  const [selectedTicket, setSelectedTicket] = useState<AssignmentTicket | null>(null);
  const [formData, setFormData] = useState({
    progressNotes: '',
    audioLink: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAssignOption, setShowAssignOption] = useState(false);
  const [selectedTeacherForAssign, setSelectedTeacherForAssign] = useState('');
  const [showMushaf, setShowMushaf] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [mushafMarkings, setMushafMarkings] = useState<MushafMistake[]>([]);
  const [historicalMistakes, setHistoricalMistakes] = useState<MushafMistake[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [studentFilterLetter, setStudentFilterLetter] = useState<string>('ALL');
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});

  // Get tickets assigned to current teacher
  // Filter out finalized/completed tickets - they should not appear in the list
  // Also filter out tickets with workflowStep === 'finalize' (admin-only step)
  const activeTickets = tickets.filter(t => 
    t.status !== 'finalized' && 
    t.status !== 'completed' &&
    t.workflowStep !== 'finalize' // Finalize step is admin-only, teachers shouldn't see it
  );

  // Helper to check if ticket is assigned to current teacher (handle both ID formats)
  const isTicketAssignedToTeacher = (ticket: AssignmentTicket) => {
    const ticketTeacherId = ticket.assignedTeacherId || (ticket as any).assignedTeacherId;
    const ticketTeacherName = ticket.assignedTeacherName || (ticket as any).assignedTeacherName;
    const userId = user?.id || (user as any)?._id;
    const userName = user?.name || '';
    
    // Compare as strings to handle ObjectId vs string differences
    const idMatch = ticketTeacherId?.toString() === userId?.toString() ||
                    ticketTeacherId === userId;
    
    // Also check by name (in case ID doesn't match but name does)
    const nameMatch = ticketTeacherName?.trim() === userName?.trim() ||
                     (ticketTeacherName && userName && 
                      ticketTeacherName.trim().toLowerCase() === userName.trim().toLowerCase());
    
    return idMatch || nameMatch;
  };

  const myTickets = activeTickets.filter(t => {
    const isAssigned = isTicketAssignedToTeacher(t);
    // Include "pending" status tickets that are assigned to this teacher (from auto-create chain)
    // Note: "pending" tickets are created by auto-create chain but not yet activated
    // Teachers should see tickets that they can work on:
    // - assigned: Ticket assigned to them
    // - in_progress: They're currently working on it
    // - needs_revision: They need to revise it
    // - pending: Auto-created tickets waiting for activation (only if assigned)
    const validStatus = t.status === 'assigned' || 
                       t.status === 'in_progress' || 
                       t.status === 'needs_revision' ||
                       t.status === 'pending'; // Include pending tickets (filtered by isAssigned below)
    
    return isAssigned && validStatus;
  });

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student?.fullName || studentId;
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

  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    myTickets.forEach(ticket => {
      const name = getStudentName(ticket.studentId).trim();
      if (name.length > 0) {
        letters.add(name[0].toUpperCase());
      }
    });
    return Array.from(letters).sort();
  }, [myTickets, students]);

  const filteredMyTickets = useMemo(() => {
    if (studentFilterLetter === 'ALL') {
      return myTickets;
    }
    return myTickets.filter(ticket => {
      const name = getStudentName(ticket.studentId).trim().toUpperCase();
      return name.startsWith(studentFilterLetter);
    });
  }, [myTickets, studentFilterLetter, students]);

  const handleToggleHistory = (ticketKey: string) => {
    setExpandedHistoryIds(prev => ({
      ...prev,
      [ticketKey]: !prev[ticketKey]
    }));
  };

  // Get completed tickets (for reference)
  const completedTickets = activeTickets.filter(t => 
    isTicketAssignedToTeacher(t) && t.status === 'pending_review'
  );
  
  const [ticketView, setTicketView] = useState<'all' | 'pending'>('all');
  
  const mistakeLabels: Record<string, string> = {
    madd: 'Mad (Elongation)',
    ghunna: 'Ghunna',
    holding: 'Holding',
    memory: 'Memory',
    ikhfa: 'Ikhfa',
    tech: 'Tech',
    other: 'Other'
  };
  
  const mistakeStats = useMemo(() => {
    const byType = mushafMarkings.reduce<Record<string, number>>((acc, mistake) => {
      const key = (mistake.type || 'other').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const total = mushafMarkings.length;
    return { total, byType };
  }, [mushafMarkings]);
  
  const mistakesByPage = useMemo(() => {
    const map = new Map<number, { count: number; types: Record<string, number> }>();
    mushafMarkings.forEach((mistake) => {
      const page = mistake.page || 0;
      if (!map.has(page)) {
        map.set(page, { count: 0, types: {} });
      }
      const bucket = map.get(page)!;
      bucket.count += 1;
      const typeKey = (mistake.type || 'other').toLowerCase();
      bucket.types[typeKey] = (bucket.types[typeKey] || 0) + 1;
    });
    return Array.from(map.entries())
      .map(([page, data]) => ({ page, ...data }))
      .sort((a, b) => a.page - b.page);
  }, [mushafMarkings]);

  const visibleTickets = ticketView === 'pending' ? completedTickets : myTickets;
  const pendingCount = completedTickets.length;

  // Load chapters on mount
  useEffect(() => {
    const loadChapters = async () => {
      const loadedChapters = await getQuranChapters();
      if (loadedChapters.length > 0) {
        setChapters(loadedChapters);
      }
    };
    loadChapters();
  }, []);

  // Get current surah from page number
  const getCurrentSurah = (page: number): Chapter | null => {
    return chapters.find(ch => 
      page >= ch.pages[0] && page <= ch.pages[1]
    ) || null;
  };

  useEffect(() => {
    if (selectedTicket) {
      setFormData({
        progressNotes: selectedTicket.progressNotes || '',
        audioLink: selectedTicket.audioLink || ''
      });
      // Load existing Mushaf markings
      if (selectedTicket.mushafMarkings) {
        setMushafMarkings(selectedTicket.mushafMarkings);
      } else {
        setMushafMarkings([]);
      }
      setCurrentPage(1);
      
      // Load student's historical mistakes from personal Mushaf
      const loadHistoricalMistakes = async () => {
        try {
          const personalMushaf = await getStudentPersonalMushafFiltered(selectedTicket.studentId);
          if (personalMushaf && personalMushaf.mistakes) {
            // Filter out mistakes from the current ticket (exclude current ticket's mistakes)
            const currentTicketId = selectedTicket.id || (selectedTicket as any)._id;
            const historical = personalMushaf.mistakes.filter((m: any) => 
              m.ticketId !== currentTicketId
            );
            setHistoricalMistakes(historical);
            console.log(`✅ Loaded ${historical.length} historical mistakes for student ${selectedTicket.studentId}`);
          } else {
            setHistoricalMistakes([]);
          }
        } catch (error) {
          console.error('Error loading historical mistakes:', error);
          setHistoricalMistakes([]);
        }
      };
      
      loadHistoricalMistakes();
      
      // Auto-show Mushaf if ticket status is in_progress
      if (selectedTicket.status === 'in_progress') {
        setShowMushaf(true);
        console.log('✅ Auto-showing Mushaf for in_progress ticket');
      }
    } else {
      setShowMushaf(false);
      setHistoricalMistakes([]);
    }
  }, [selectedTicket, getStudentPersonalMushafFiltered]);

  const selectedAssignmentDetails = useMemo(() => {
    if (!selectedTicket) return null;
    return extractAssignmentDetails(selectedTicket);
  }, [selectedTicket]);

  const handleStartTicket = async (ticket: AssignmentTicket) => {
    try {
      const ticketId = ticket.id || (ticket as any)._id;
      if (!ticketId) {
        console.error('Ticket ID is missing:', ticket);
        alert('Invalid ticket - missing ID');
        return;
      }
      await updateTicket(ticketId, {
        status: 'in_progress'
      });
      // Update ticket with new status
      const updatedTicket = { ...ticket, status: 'in_progress' as TicketStatus };
      setSelectedTicket(updatedTicket);
      // Use setTimeout to ensure state updates are applied
      setTimeout(() => {
        setShowMushaf(true);
        console.log('✅ Ticket started, Mushaf state set to true');
      }, 100);
    } catch (error) {
      console.error('Error starting ticket:', error);
      alert('Failed to start ticket');
    }
  };

  const handleMistakeMark = (mistake: Omit<MushafMistake, 'id' | 'timestamp'>) => {
    const sanitisedMistake: MushafMistake = {
      ...mistake,
      audioUrl: mistake.audioUrl || undefined,
      id: `mistake-${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    };
    setMushafMarkings(prev => [...prev, sanitisedMistake]);
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTicket) return;
    
    if (!formData.progressNotes.trim()) {
      alert('Please enter progress notes');
      return;
    }

    setIsSubmitting(true);
    try {
      const ticketId = selectedTicket.id || (selectedTicket as any)._id;
      if (!ticketId) {
        console.error('Ticket ID is missing:', selectedTicket);
        alert('Invalid ticket - missing ID');
        setIsSubmitting(false);
        return;
      }
      const updateData: Partial<AssignmentTicket> = {
        progressNotes: formData.progressNotes.trim(),
        audioLink: formData.audioLink.trim() || undefined,
        mushafMarkings: mushafMarkings,
        status: 'in_progress',
        reviewedBy: user?.id || user?.email || undefined,
        updatedAt: new Date(),
      };
      await updateTicket(ticketId, updateData);
      
      alert('Ticket submitted successfully! Admin will review it.');
      setSelectedTicket(null);
      setFormData({ progressNotes: '', audioLink: '' });
      setMushafMarkings([]);
      setShowMushaf(false);
      setCurrentPage(1);
      setShowAssignOption(false);
      await refreshData();
    } catch (error) {
      console.error('Error submitting ticket:', error);
      alert('Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignToDifferentTeacher = async () => {
    if (!selectedTicket) return;
    
    if (!selectedTeacherForAssign) {
      alert('Please select a teacher');
      return;
    }

    const teacher = teachers.find(t => t.id === selectedTeacherForAssign);
    if (!teacher) {
      alert('Selected teacher not found');
      return;
    }

    setIsSubmitting(true);
    try {
      const ticketId = selectedTicket.id || (selectedTicket as any)._id;
      await assignTicketToNext(ticketId, teacher.id, teacher.fullName);
      
      alert('✅ Ticket assigned to different teacher successfully!');
      setSelectedTicket(null);
      setFormData({ progressNotes: '', audioLink: '' });
      setSelectedTeacherForAssign('');
      setShowAssignOption(false);
      setMushafMarkings([]);
      setShowMushaf(false);
      setCurrentPage(1);
      await refreshData();
    } catch (error) {
      console.error('Error assigning ticket:', error);
      alert('Failed to assign ticket to different teacher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      case 'pending_review': return 'bg-purple-100 text-purple-700';
      case 'needs_revision': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
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

  const getTicketKey = (ticket: AssignmentTicket) =>
    ticket.id || (ticket as any)._id || `ticket-${ticket.studentId}-${ticket.workflowStep}`;

  const formatHistoryTimestamp = (ticket: AssignmentTicket) => {
    const rawDate = (ticket as any).updatedAt || (ticket as any).completedAt || (ticket as any).createdAt;
    if (!rawDate) return '—';
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Ticket Management</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setTicketView('pending')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  ticketView === 'pending'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-gray-200 text-[rgba(var(--color-primary-rgb),0.7)] hover:bg-soft-primary'
                }`}
              >
                Pending Review ({pendingCount})
              </button>
              <button
                onClick={() => setTicketView('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  ticketView === 'all'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-gray-200 text-[rgba(var(--color-primary-rgb),0.7)] hover:bg-soft-primary'
                }`}
              >
                All Tickets
              </button>
              {onClose && (
                <button className="text-gray-500 hover:text-gray-700 px-4 py-2" onClick={onClose}>
                  Close
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {selectedTicket ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      setSelectedTicket(null);
                      setFormData({ progressNotes: '', audioLink: '' });
                      setShowMushaf(false);
                      setCurrentPage(1);
                    }}
                  >
                    <span>←</span>
                    Back to tickets
                  </button>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusColor(selectedTicket.status)}`}>
                    {selectedTicket.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                  <div className="space-y-6">
                    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
                      <header className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Current step • {getStepLabel(selectedTicket.workflowStep).replace(/^[^ ]+\s/, '')}
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
                          <dd>{selectedAssignmentDetails?.summary || '—'}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-gray-700">Portion size</dt>
                          <dd>{selectedAssignmentDetails?.portion || '—'}</dd>
                        </div>
                      </dl>

                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Teacher notes</h4>
                        <p className="whitespace-pre-wrap text-sm text-gray-700">
                          {selectedTicket.progressNotes?.trim() || 'No notes recorded yet.'}
                        </p>
                      </div>
                    </section>

                    <section className="rounded-xl border border-gray-200 bg-white p-5">
                      <h4 className="text-lg font-bold text-gray-900 mb-4">Review & Submit</h4>
                      <form onSubmit={handleSubmitTicket} className="space-y-5">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                              Progress Notes <span className="text-red-500">*</span>
                            </label>
                            <p className="text-xs text-gray-500 mb-3">
                              Include observations, corrections, praise, and specific feedback
                            </p>
                            <textarea
                              value={formData.progressNotes}
                              onChange={(e) => setFormData((prev) => ({ ...prev, progressNotes: e.target.value }))}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y transition-colors"
                              rows={6}
                              placeholder="Enter detailed progress notes...&#10;&#10;Example:&#10;- Student recited pages 1-2 well&#10;- Needs improvement on elongation (madd) rules&#10;- Good memory retention&#10;- Practice tajweed rules for page 3..."
                              required
                            />
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Tip: Mention specific pages, ayahs, or mistakes marked in the Mushaf
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                              Audio Link <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                            </label>
                            <p className="text-xs text-gray-500 mb-3">If you have a different audio link than the one above</p>
                            <input
                              type="url"
                              value={formData.audioLink}
                              onChange={(e) => setFormData((prev) => ({ ...prev, audioLink: e.target.value }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="https://..."
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-200">
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center justify-center gap-2"
                          >
                            {isSubmitting ? (
                              <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Submitting...
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Submit for Review
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (mushafMarkings.length > 0 || formData.progressNotes.trim()) {
                                if (confirm('Are you sure you want to cancel? Your progress notes and marked mistakes will be lost.')) {
                                  setSelectedTicket(null);
                                  setFormData({ progressNotes: '', audioLink: '' });
                                  setMushafMarkings([]);
                                }
                              } else {
                                setSelectedTicket(null);
                                setFormData({ progressNotes: '', audioLink: '' });
                              }
                            }}
                            className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>

                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <button
                          onClick={() => setShowAssignOption(!showAssignOption)}
                          className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          Assign to Different Teacher
                        </button>

                        {showAssignOption && (
                          <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                            <h4 className="text-sm font-semibold text-indigo-900 mb-3">Assign to Different Teacher</h4>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-semibold text-indigo-900 mb-1">
                                  Select Teacher <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={selectedTeacherForAssign}
                                  onChange={(e) => setSelectedTeacherForAssign(e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                  <option value="">Choose a teacher...</option>
                                  {teachers.filter(t => t.id !== user?.id).map(teacher => (
                                    <option key={teacher.id} value={teacher.id}>
                                      {teacher.fullName}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={handleAssignToDifferentTeacher}
                                  disabled={isSubmitting || !selectedTeacherForAssign}
                                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                                >
                                  Assign Ticket
                                </button>
                                <button
                                  onClick={() => {
                                    setShowAssignOption(false);
                                    setSelectedTeacherForAssign('');
                                  }}
                                  className="px-4 py-2 bg-white border border-indigo-300 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50 transition-colors text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>

                  <aside className="space-y-5">
                    <section className="rounded-xl border border-gray-200 bg-white p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700">🎯</span>
                            <span>Mistakes overview</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {mistakeStats.total > 0
                              ? `${mistakeStats.total} mistake${mistakeStats.total !== 1 ? 's' : ''} across ${mistakesByPage.length} page${mistakesByPage.length !== 1 ? 's' : ''}`
                              : 'No mistakes marked yet'}
                          </p>
                          {mistakeStats.total > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {Object.entries(mistakeStats.byType).map(([type, count]) => (
                                <span
                                  key={`mistake-chip-${type}`}
                                  className="inline-flex items-center gap-1 rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700"
                                >
                                  {mistakeLabels[type] || type}
                                  <span className="text-purple-500">· {count}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-stretch gap-2 sm:flex-row">
                          <button
                            onClick={() => setShowMushaf((prev) => !prev)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition border-purple-600 bg-purple-600 text-white hover:bg-purple-700"
                          >
                            {showMushaf ? 'Hide Mushaf' : 'Show Mushaf'}
                          </button>
                        </div>
                      </div>
                      {mistakesByPage.length > 0 && (
                        <div className="mt-5 space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pages with mistakes</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {mistakesByPage.map(({ page, count }) => (
                              <div
                                key={`mistake-page-${page}`}
                                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">Page {page}</p>
                                  <p className="text-xs text-gray-500">{count} mistake{count !== 1 ? 's' : ''}</p>
                                </div>
                                <button
                                  onClick={() => {
                                    setCurrentPage(page);
                                    setShowMushaf(true);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-white px-3 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50 transition"
                                >
                                  View
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>

                    {showMushaf && (
                      <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-0 sm:p-6">
                        <section className="relative w-full h-full flex flex-col rounded-none sm:rounded-xl border border-gray-200 bg-white shadow-2xl">
                          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h4 className="text-base font-semibold text-gray-900">Interactive Mushaf</h4>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200"
                              >
                                Prev page
                              </button>
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Page {currentPage}</span>
                              <button
                                onClick={() => setCurrentPage((prev) => prev + 1)}
                                className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200"
                              >
                                Next page
                              </button>
                              <button
                                className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                                onClick={() => setShowMushaf(false)}
                              >
                                Close
                              </button>
                            </div>
                          </div>
                          <div className="flex-1 min-h-0 overflow-hidden">
                            <div className="h-full w-full overflow-hidden">
                              <div className="flex h-full flex-col lg:flex-row">
                                <div className="flex-1 h-full overflow-hidden">
                                  <div className="h-full w-full overflow-auto px-3 sm:px-6 lg:px-10 xl:px-16 py-6">
                                    <div className="max-w-full mx-auto">
                                      <InteractiveMushaf
                                        currentPage={currentPage}
                                        onPageChange={setCurrentPage}
                                        mistakes={mushafMarkings}
                                        historicalMistakes={historicalMistakes}
                                        onMistakeMark={handleMistakeMark}
                                        mode="marking"
                                        studentName={selectedTicket.studentName}
                                        showHistorical={true}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </section>
                      </div>
                    )}

                    {mistakeStats.total > 0 && (
                      <section className="mt-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Mistake Report ({mistakeStats.total})
                        </h3>
                        <div className="space-y-2">
                          {mushafMarkings.map((mistake) => (
                            <div
                              key={mistake.id}
                              className="text-xs text-gray-700 p-2 bg-gray-50 rounded border border-gray-200"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <span className="font-semibold text-gray-900">{mistake.word}</span>
                                  <span className="text-gray-600"> — {mistakeLabels[mistake.type || 'other'] || mistake.type || 'Other'} Mistake</span>
                                  <span className="text-gray-500 text-[10px] ml-2">(Surah {mistake.surah}, Ayah {mistake.ayah})</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </aside>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {visibleTickets.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-semibold text-gray-900 mb-2">No tickets found</p>
                    <p className="text-sm text-gray-500">
                      {ticketView === 'pending'
                        ? 'Tickets submitted and waiting for admin review will appear here.'
                        : 'Tickets with status "assigned", "in_progress", or "needs_revision" will appear here.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {ticketView === 'all' && availableLetters.length > 0 && (
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
                        {availableLetters.map((letter) => (
                          <button
                            key={letter}
                            onClick={() => setStudentFilterLetter(letter)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors ${
                              studentFilterLetter === letter
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}
                            aria-label={`Filter by students starting with ${letter}`}
                          >
                            {letter}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {visibleTickets.map((ticket) => {
                        const ticketKey = getTicketKey(ticket);
                        const isHistoryExpanded = !!expandedHistoryIds[ticketKey];
                        const rawHistory = (studentTicketHistoryMap.get(ticket.studentId) || []).filter(
                          (otherTicket) => getTicketKey(otherTicket) !== ticketKey
                        );
                        const historyEntries = rawHistory
                          .slice()
                          .sort((a, b) => {
                            const aTime = new Date((a as any).updatedAt || (a as any).completedAt || (a as any).createdAt || 0).getTime();
                            const bTime = new Date((b as any).updatedAt || (b as any).completedAt || (b as any).createdAt || 0).getTime();
                            return bTime - aTime;
                          });
                        const assignmentDetails = extractAssignmentDetails(ticket);
                        const stepTheme = getStepTheme(ticket.workflowStep);

                        return (
                          <div
                            key={ticketKey}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all overflow-hidden"
                          >
                            <div className="p-5">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">{getStepLabel(ticket.workflowStep)}</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                                      {ticket.status.replace('_', ' ')}
                                    </span>
                                  </div>
                                  <h4 className="font-semibold text-gray-900 mb-1">{getStudentName(ticket.studentId)}</h4>
                                  <p className="text-sm text-gray-600">{ticket.program}</p>
                                </div>
                              </div>
                              {assignmentDetails.hasDetails && (
                                <div className={`mt-3 p-3 text-xs sm:text-sm border rounded-lg ${stepTheme.accent}`}>
                                  <p className="font-semibold">{assignmentDetails.summary}</p>
                                </div>
                              )}
                              {ticket.progressNotes && (
                                <p className="text-sm text-gray-500 mt-3 line-clamp-2 border-t border-gray-100 pt-3">{ticket.progressNotes}</p>
                              )}
                            </div>
                            <div className="px-5 pb-5">
                              <button
                                onClick={() => handleStartTicket(ticket)}
                                className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors flex items-center justify-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                {ticket.status === 'assigned' ? 'Start Review' : 'Continue Review'}
                              </button>
                              <button
                                onClick={() => handleToggleHistory(ticketKey)}
                                className="mt-3 w-full px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                              >
                                <svg
                                  className={`w-4 h-4 transition-transform ${isHistoryExpanded ? 'transform rotate-180' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                                {isHistoryExpanded ? 'Hide Assignment History' : 'Show Assignment History'}
                              </button>
                              {isHistoryExpanded && (
                                <div className="mt-3 space-y-2 text-left">
                                  {historyEntries.length === 0 ? (
                                    <div className="p-3 text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-lg italic">
                                      No previous assignments recorded for this student.
                                    </div>
                                  ) : (
                                    historyEntries.map((historyTicket) => {
                                      const historyKey = getTicketKey(historyTicket);
                                      const historyAssignment = extractAssignmentDetails(historyTicket);
                                      const historyTheme = getStepTheme(historyTicket.workflowStep);
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
                                          {historyAssignment.hasDetails && (
                                            <div className={`mt-2 text-xs border rounded-md px-2 py-1 ${historyTheme.accent}`}>
                                              {historyAssignment.summary}
                                            </div>
                                          )}
                                          {historyTicket.progressNotes && (
                                            <p className="mt-2 text-xs text-gray-600 line-clamp-3">{historyTicket.progressNotes}</p>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {ticketView === 'all' && completedTickets.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Review</h3>
                    <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {completedTickets.map((ticket) => (
                        <div
                          key={ticket.id || (ticket as any)._id || `completed-ticket-${ticket.studentId}-${ticket.workflowStep}`}
                          className="bg-gray-50 rounded-xl border border-gray-200 p-5"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">{getStepLabel(ticket.workflowStep)}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                              Awaiting Review
                            </span>
                          </div>
                          <p className="font-semibold text-gray-900">{getStudentName(ticket.studentId)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherTickets;

