import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBackendData } from '../contexts/BackendDataContext';
import { AssignmentTicket, TicketStatus, WorkflowStep, MushafMistake } from '../types';
import InteractiveMushaf from './InteractiveMushaf';
import { getQuranChapters, Chapter } from '../services/quranApi';

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
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🎫 My Tickets</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      {selectedTicket ? (
        <div className="space-y-4">
          {/* Step 1: Navigation Bar - Fixed/Sticky at top */}
          <nav className="fixed md:sticky top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-40 shadow-sm">
            <div className="w-full md:max-w-6xl md:mx-auto px-2 md:px-4 md:py-3">
              <div className="flex items-center justify-between gap-1 md:gap-4 h-12 md:h-auto">
                {/* Left side - Back Button */}
                <div className="flex-shrink-0 w-[100px] md:w-[150px] lg:w-auto">
                  <button
                    onClick={() => {
                      setSelectedTicket(null);
                      setFormData({ progressNotes: '', audioLink: '' });
                      setShowMushaf(false);
                      setCurrentPage(1);
                    }}
                    className="p-1 lg:p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    title="Back to tickets"
                  >
                    <svg className="w-5 h-5 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                  </button>
                </div>

                {/* Center - Page Navigation */}
                <div className="flex-1 flex items-center justify-center gap-3 lg:gap-6">
                  <div className="flex items-center gap-2 lg:gap-3">
                    {/* Previous Page Button */}
                    {currentPage > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className="lg:hidden p-0.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                          title="Previous page"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className="hidden lg:flex items-center justify-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                          title="Previous page"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"></path>
                          </svg>
                          Previous
                        </button>
                      </>
                    )}

                    {/* Page Number */}
                    <div className="text-center">
                      <div className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        Page {currentPage}
                      </div>
                    </div>

                    {/* Next Page Button */}
                    {currentPage < 604 && (
                      <>
                        <button
                          onClick={() => setCurrentPage(Math.min(604, currentPage + 1))}
                          className="lg:hidden p-0.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                          title="Next page"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(604, currentPage + 1))}
                          className="hidden lg:flex items-center justify-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                          title="Next page"
                        >
                          Next
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 ml-1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"></path>
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Right side - Student info & metadata */}
                <div className="flex-shrink-0 w-[100px] md:w-[150px] lg:w-auto">
                  <div className="text-right text-[10px] lg:text-xs leading-tight text-gray-600 dark:text-gray-400">
                    <div className="font-medium truncate">{getStudentName(selectedTicket.studentId)}</div>
                    <div className="hidden lg:block text-gray-500 dark:text-gray-500 mt-0.5">
                      <span className="text-teal-600 dark:text-teal-400">Juz {getJuzFromPage(currentPage)}</span>
                      <span className="mx-1">•</span>
                      <span>{getCurrentSurah(currentPage)?.name_simple || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Add padding-top to compensate for fixed nav */}
          <div className="pt-16 md:pt-4">
          {/* Ticket Details - Collapsible Header */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-lg">Ticket Details</h3>
              <button
                onClick={() => setShowMushaf(!showMushaf)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
              >
                {showMushaf ? '📖 Hide Mushaf' : '📖 Show Mushaf'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Student:</span> {getStudentName(selectedTicket.studentId)}
              </div>
              <div>
                <span className="font-medium">Step:</span> {getStepLabel(selectedTicket.workflowStep)}
              </div>
              <div>
                <span className="font-medium">Program:</span> {selectedTicket.program}
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(selectedTicket.status)}`}>
                  {selectedTicket.status}
                </span>
              </div>
            </div>
            {selectedTicket.revisionNotes && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm font-medium text-red-800">Revision Notes:</p>
                <p className="text-sm text-red-700">{selectedTicket.revisionNotes}</p>
              </div>
            )}
          </div>

          {/* Mushaf View - Always available, toggleable */}
          <div className={`bg-white rounded-lg shadow-lg p-6 mb-6 ${showMushaf ? '' : 'hidden'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">📖 Interactive Mushaf - Mark Mistakes</h3>
              <button
                onClick={() => setShowMushaf(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close Mushaf
              </button>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-blue-800 mb-2">
                💡 <strong>Instructions:</strong> Navigate to the page number the student recited from. Click on any word in the Mushaf to mark a mistake. 
                Select the mistake type from the popup menu.
              </p>
              {historicalMistakes.length > 0 && (
                <p className="text-sm text-blue-700 mt-2">
                  📜 <strong>Historical Mistakes:</strong> Previously marked mistakes from this student are shown with dashed borders and lighter colors. 
                  This helps you see recurring mistakes and track progress over time.
                </p>
              )}
            </div>
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
            {mushafMarkings.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ <strong>{mushafMarkings.length} mistake{mushafMarkings.length !== 1 ? 's' : ''}</strong> marked
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Progress Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.progressNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, progressNotes: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={6}
                placeholder="Enter progress notes, observations, corrections needed, etc..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audio Link (Optional)
              </label>
              <input
                type="url"
                value={formData.audioLink}
                onChange={(e) => setFormData(prev => ({ ...prev, audioLink: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit for Review'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTicket(null);
                  setFormData({ progressNotes: '', audioLink: '' });
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
          </div>
          {/* End padding-top div */}
        </div>
      ) : (
        <div className="space-y-4">
          {myTickets.length === 0 && completedTickets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="mb-4">
                <p className="text-lg font-semibold">No active tickets assigned to you.</p>
                <p className="text-sm mt-2 text-gray-600">
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
            </div>
          ) : (
            <>
              {myTickets.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Active Tickets</h3>
                  <div className="space-y-3">
                    {myTickets.map(ticket => (
                      <div
                        key={ticket.id || (ticket as any)._id || `ticket-${ticket.studentId}-${ticket.workflowStep}`}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
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
                            <p className="text-sm text-gray-600">{ticket.program}</p>
                            {ticket.progressNotes && (
                              <p className="text-sm text-gray-500 mt-2 line-clamp-2">{ticket.progressNotes}</p>
                            )}
                          </div>
              <button
                onClick={() => handleStartTicket(ticket)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                {ticket.status === 'assigned' ? '📖 Start with Mushaf' : '📖 Continue with Mushaf'}
              </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {completedTickets.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Pending Review</h3>
                  <div className="space-y-3">
                    {completedTickets.map(ticket => (
                      <div
                        key={ticket.id || (ticket as any)._id || `completed-ticket-${ticket.studentId}-${ticket.workflowStep}`}
                        className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-lg">{getStepLabel(ticket.workflowStep)}</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                Awaiting Admin Review
                              </span>
                            </div>
                            <p className="font-medium text-gray-900">{getStudentName(ticket.studentId)}</p>
                          </div>
                        </div>
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
  );
};

export default TeacherTickets;

