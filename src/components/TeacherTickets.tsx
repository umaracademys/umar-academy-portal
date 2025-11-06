import React, { useState, useEffect } from 'react';
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

interface TeacherTicketsProps {
  onClose?: () => void;
}

const TeacherTickets: React.FC<TeacherTicketsProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { tickets, students, updateTicket, getStudentPersonalMushafFiltered } = useBackendData();
  
  const [selectedTicket, setSelectedTicket] = useState<AssignmentTicket | null>(null);
  const [formData, setFormData] = useState({
    progressNotes: '',
    audioLink: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMushaf, setShowMushaf] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [mushafMarkings, setMushafMarkings] = useState<MushafMistake[]>([]);
  const [historicalMistakes, setHistoricalMistakes] = useState<MushafMistake[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  // Get tickets assigned to current teacher
  // Filter out finalized/completed tickets - they should not appear in the list
  const activeTickets = tickets.filter(t => 
    t.status !== 'finalized' && t.status !== 'completed'
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
    // - approved: Show approved tickets assigned to teacher (for visibility)
    const validStatus = t.status === 'assigned' || 
                       t.status === 'in_progress' || 
                       t.status === 'needs_revision' ||
                       t.status === 'approved' || // Show approved tickets assigned to this teacher
                       t.status === 'pending'; // Include pending tickets (filtered by isAssigned below)
    
    if (isAssigned) {
      if (!validStatus) {
        console.log('🔍 Ticket found but wrong status:', {
          id: t.id || (t as any)._id,
          workflowStep: t.workflowStep,
          status: t.status,
          assignedTeacherId: t.assignedTeacherId,
          assignedTeacherName: t.assignedTeacherName,
          userId: user?.id,
          userName: user?.name
        });
      } else {
        console.log('✅ Ticket visible to teacher:', {
          id: t.id || (t as any)._id,
          workflowStep: t.workflowStep,
          status: t.status,
          student: t.studentName
        });
      }
    }
    
    return isAssigned && validStatus;
  });

  // Get completed tickets (for reference)
  const completedTickets = activeTickets.filter(t => 
    isTicketAssignedToTeacher(t) && t.status === 'pending_review'
  );
  
  // Debug logging
  console.log('🎫 Teacher Tickets Debug:', {
    userId: user?.id,
    userName: user?.name,
    userEmail: user?.email,
    userRole: user?.role,
    totalTickets: tickets.length,
    activeTickets: activeTickets.length,
    myTickets: myTickets.length,
    completedTickets: completedTickets.length,
    allTicketTeacherIds: activeTickets.map(t => ({
      id: t.id || (t as any)._id,
      workflowStep: t.workflowStep,
      assignedTeacherId: t.assignedTeacherId,
      assignedTeacherName: t.assignedTeacherName,
      status: t.status,
      isAssigned: isTicketAssignedToTeacher(t)
    }))
  });

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
    const newMistake: MushafMistake = {
      ...mistake,
      id: `mistake-${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    };
    setMushafMarkings(prev => [...prev, newMistake]);
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
      await updateTicket(ticketId, {
        status: 'pending_review',
        progressNotes: formData.progressNotes,
        audioLink: formData.audioLink || undefined,
        mushafMarkings: mushafMarkings, // Include Mushaf markings
        completedBy: user?.id,
        completedAt: new Date()
      });
      
      alert('Ticket submitted successfully! Admin will review it.');
      setSelectedTicket(null);
      setFormData({ progressNotes: '', audioLink: '' });
    } catch (error) {
      console.error('Error submitting ticket:', error);
      alert('Failed to submit ticket');
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

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student?.fullName || studentId;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Professional Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Ticket Management</h1>
                <p className="text-sm text-gray-500 mt-1">Review and manage student recitation tickets</p>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

      {selectedTicket ? (
        <div className="space-y-6">
          {/* Ticket Information Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  {/* Back Button */}
                  <button
                    onClick={() => {
                      setSelectedTicket(null);
                      setFormData({ progressNotes: '', audioLink: '' });
                      setShowMushaf(false);
                      setCurrentPage(1);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
                    title="Back to Tickets"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="hidden sm:inline">Back</span>
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{getStudentName(selectedTicket.studentId)}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-600">{getStepLabel(selectedTicket.workflowStep)}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-sm text-gray-600">{selectedTicket.program}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedTicket.status)}`}>
                    {selectedTicket.status.replace('_', ' ')}
                  </span>
                  <button
                    onClick={() => setShowMushaf(!showMushaf)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                      showMushaf 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    {showMushaf ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Hide Mushaf
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Show Mushaf
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {(selectedTicket.revisionNotes || selectedTicket.audioLink) && (
              <div className="px-6 py-4 space-y-3">
                {selectedTicket.revisionNotes && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-900 mb-1">Revision Notes</p>
                      <p className="text-sm text-red-700">{selectedTicket.revisionNotes}</p>
                    </div>
                  </div>
                )}
                {selectedTicket.audioLink && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-green-900 mb-1">Audio Recording</p>
                      <a
                        href={selectedTicket.audioLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-700 hover:text-green-900 underline break-all inline-flex items-center gap-1"
                      >
                        {selectedTicket.audioLink}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mushaf View - Professional Layout */}
          {showMushaf && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Mushaf Header with Integrated Page Navigation */}
              <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white">Interactive Mushaf</h3>
                    <p className="text-sm text-blue-100 mt-1">
                      Mark mistakes while listening to the student's recitation
                    </p>
                  </div>
                  
                  {/* Page Navigation - Integrated in Header */}
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                      className="p-1.5 text-white hover:bg-white/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Previous page"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <div className="text-center min-w-[100px]">
                      <div className="text-sm font-semibold text-white">Page {currentPage}</div>
                      <div className="text-xs text-blue-100">
                        {getCurrentSurah(currentPage)?.name_simple || 'N/A'} • Juz {getJuzFromPage(currentPage)}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(604, currentPage + 1))}
                      disabled={currentPage >= 604}
                      className="p-1.5 text-white hover:bg-white/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Next page"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Mistake Counter */}
                  {mushafMarkings.length > 0 && (
                    <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/30">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-semibold text-white">
                          {mushafMarkings.length} mistake{mushafMarkings.length !== 1 ? 's' : ''} marked
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900 mb-2">How to mark mistakes:</p>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Navigate to the page using the navigation bar above</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Click on any word in the Mushaf to mark a mistake</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Select the mistake type from the popup menu</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Use the Surah Index sidebar to quickly jump to different surahs</span>
                      </li>
                    </ul>
                    {historicalMistakes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <p className="text-xs text-blue-700">
                          <strong>Historical Mistakes:</strong> Previously marked mistakes are shown with dashed borders to help track recurring issues.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mushaf Container - Responsive with overflow handling */}
              <div className="p-2 sm:p-4 lg:p-6 bg-gradient-to-br from-gray-50 to-gray-100 overflow-x-hidden">
                <div className="w-full max-w-full mx-auto overflow-x-hidden">
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

              {/* Mistake Summary */}
              {mushafMarkings.length > 0 && (
                <div className="px-6 py-4 bg-green-50 border-t border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-semibold text-green-900">
                        {mushafMarkings.length} mistake{mushafMarkings.length !== 1 ? 's' : ''} marked for this recitation
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to clear all marked mistakes?')) {
                          setMushafMarkings([]);
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-800 font-medium px-3 py-1 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submission Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Review & Submit</h3>
                {mushafMarkings.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-semibold text-green-700">{mushafMarkings.length} mistake{mushafMarkings.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
            <form onSubmit={handleSubmitTicket} className="p-6 space-y-5">

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Progress Notes <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-3">Include observations, corrections, praise, and specific feedback</p>
                <textarea
                  value={formData.progressNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, progressNotes: e.target.value }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, audioLink: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="https://..."
                />
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
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {myTickets.length === 0 && completedTickets.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-semibold text-gray-900 mb-2">No active tickets</p>
              <p className="text-sm text-gray-500">
                Tickets with status "assigned", "in_progress", or "needs_revision" will appear here.
              </p>
              {activeTickets.filter(t => isTicketAssignedToTeacher(t)).length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ You have {activeTickets.filter(t => isTicketAssignedToTeacher(t)).length} ticket(s) assigned to you, 
                    but they have status "{activeTickets.find(t => isTicketAssignedToTeacher(t))?.status}" 
                    which is not currently active. Please contact admin if you need to work on these tickets.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {myTickets.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Tickets</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {myTickets.map(ticket => (
                      <div
                        key={ticket.id || (ticket as any)._id || `ticket-${ticket.studentId}-${ticket.workflowStep}`}
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
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {completedTickets.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Review</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {completedTickets.map(ticket => (
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
            </>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default TeacherTickets;

