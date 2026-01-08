import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { Ticket } from '../types/ticket';
import { MushafMistake } from '@umar-academy/mushaf';
import { useBackendData } from '../contexts/BackendDataContext';
import { WorkflowBanner } from './workflow/WorkflowBanner';
import { AICommentDraft } from './workflow/AICommentDraft';
import { MistakeBadgeHighlight } from './workflow/MistakeBadgeHighlight';

interface TeacherTicketReviewProps {
  ticket: Ticket;
  onClose: () => void;
  onSubmit: (
    ticketId: string, 
    data: { 
      teacherComment: string; 
      mistakes: MushafMistake[];
    }
  ) => Promise<void>;
}

const TeacherTicketReview: React.FC<TeacherTicketReviewProps> = ({ ticket, onClose, onSubmit }) => {
  const { getStudentPersonalMushaf } = useBackendData();
  const [mushafPage, setMushafPage] = useState(1);
  const [mistakes, setMistakes] = useState<MushafMistake[]>(ticket.mistakes || []);
  const [teacherComment, setTeacherComment] = useState(ticket.teacherComment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personalMushafMistakes, setPersonalMushafMistakes] = useState<MushafMistake[]>([]);
  const [loadingPersonalMushaf, setLoadingPersonalMushaf] = useState(false);
  const [fullMushafView, setFullMushafView] = useState(false); // Full-Page Mushaf Mode
  const [showReviewComment, setShowReviewComment] = useState(false); // Review Comment hidden by default
  const [mushafZoom, setMushafZoom] = useState(1.0); // Zoom level
  const [showSidebar, setShowSidebar] = useState(false); // Hide sidebar by default for Mushaf-first experience
  const [newMistakeIds, setNewMistakeIds] = useState<Set<string>>(new Set()); // Track newly added mistakes
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const initialMistakesRef = useRef<Set<string>>(new Set(ticket.mistakes?.map(m => m.id || '') || []));

  // Load student's personal mushaf when ticket is opened
  useEffect(() => {
    const loadPersonalMushaf = async () => {
      if (!ticket.studentId) {
        setPersonalMushafMistakes([]);
        return;
      }

      try {
        setLoadingPersonalMushaf(true);
        const personalMushafData = await getStudentPersonalMushaf(ticket.studentId);
        
        if (personalMushafData && personalMushafData.mistakes) {
          const convertedMistakes: MushafMistake[] = personalMushafData.mistakes.map((m: any) => ({
            id: m.id || `personal-${Date.now()}-${Math.random()}`,
            type: m.type,
            page: m.page,
            surah: m.surah,
            ayah: m.ayah,
            wordIndex: m.wordIndex,
            position: m.position,
            note: m.note,
            audioUrl: m.audioUrl ? (() => {
              if (m.audioUrl.startsWith('http')) return m.audioUrl;
              let baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
              // Remove /api from base URL if present (uploads are served from root, not /api)
              if (baseUrl.endsWith('/api')) {
                baseUrl = baseUrl.replace('/api', '');
              }
              baseUrl = baseUrl.replace(/\/$/, '');
              const audioPath = m.audioUrl.startsWith('/') ? m.audioUrl : `/${m.audioUrl}`;
              return `${baseUrl}${audioPath}`;
            })() : undefined,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
          }));
          setPersonalMushafMistakes(convertedMistakes);
        } else {
          setPersonalMushafMistakes([]);
        }
      } catch (error) {
        console.error('Error loading personal mushaf:', error);
        setPersonalMushafMistakes([]);
      } finally {
        setLoadingPersonalMushaf(false);
      }
    };

    loadPersonalMushaf();
  }, [ticket.studentId, getStudentPersonalMushaf]);

  // Initialize mushaf page when ticket is selected
  useEffect(() => {
    if (ticket.mistakes && ticket.mistakes.length > 0) {
      const firstMistake = ticket.mistakes[0];
      if (firstMistake?.page) {
        setMushafPage(firstMistake.page);
      }
    } else if (personalMushafMistakes.length > 0) {
      // If no ticket mistakes, show first personal mistake
      const firstMistake = personalMushafMistakes[0];
      if (firstMistake?.page) {
        setMushafPage(firstMistake.page);
      }
    }
  }, [ticket.mistakes, personalMushafMistakes]);

  // Convert mistakes to MushafMistake format
  const mushafMistakes = useMemo(() => {
    return mistakes.map(m => ({
      id: m.id || `mistake-${Date.now()}-${Math.random()}`,
      type: m.type,
      page: m.page,
      surah: m.surah,
      ayah: m.ayah,
      wordIndex: m.wordIndex,
      position: m.position,
      note: m.note,
      audioUrl: m.audioUrl ? (m.audioUrl.startsWith('http') ? m.audioUrl : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}${m.audioUrl.startsWith('/') ? '' : '/'}${m.audioUrl}`) : undefined,
      timestamp: m.timestamp || new Date()
    }));
  }, [mistakes]);

  const handleMistakeMark = (mistake: Omit<MushafMistake, 'id' | 'timestamp'>) => {
    const newMistake: MushafMistake = {
      ...mistake,
      id: `mistake-${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    };
    setMistakes(prev => [...prev, newMistake]);
    // Track as new mistake
    setNewMistakeIds(prev => new Set(prev).add(newMistake.id!));
  };

  const handleRemoveMistake = (mistakeId: string) => {
    setMistakes(prev => prev.filter(m => m.id !== mistakeId));
  };

  // Categorize mistakes
  const mistakeCategories = useMemo(() => {
    const regularMistakes = mistakes.filter(m => {
      const type = m.type.toLowerCase();
      return type !== 'atkee' && !['madd', 'ikhfa', 'holding', 'tech'].includes(type);
    });
    const atkeeMistakes = mistakes.filter(m => m.type.toLowerCase() === 'atkee');
    const tajweedMistakes = mistakes.filter(m => {
      const type = m.type.toLowerCase();
      return ['madd', 'ikhfa', 'holding', 'tech'].includes(type);
    });
    return {
      mistakes: regularMistakes.length,
      atkee: atkeeMistakes.length,
      tajweed: tajweedMistakes.length
    };
  }, [mistakes]);

  // ESC key handler to exit Full Mushaf View
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullMushafView) {
        setFullMushafView(false);
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [fullMushafView]);

  // Validation: Submit enabled if mistakes OR comment exists
  const canSubmit = useMemo(() => {
    return mistakes.length > 0 || teacherComment.trim().length > 0;
  }, [mistakes.length, teacherComment]);

  // Banner visibility: Show until form is valid
  const showBanner = useMemo(() => {
    return !bannerDismissed && (!canSubmit || (mistakes.length === 0 && !teacherComment.trim()));
  }, [bannerDismissed, canSubmit, mistakes.length, teacherComment]);

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError('Please mark at least one mistake OR add a review comment before submitting');
      if (mistakes.length === 0) {
        setShowSidebar(true); // Show sidebar to guide user
      }
      if (!teacherComment.trim()) {
        setShowReviewComment(true); // Show comment panel if missing
      }
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Submit ticket without recording
      const submitData = {
        teacherComment: teacherComment.trim(),
        mistakes: mushafMistakes
      };
      
      console.log('📤 Submitting ticket:', {
        ticketId: ticket.id,
        mistakesCount: mushafMistakes.length
      });
      
      await onSubmit(ticket.id, submitData);
      
      console.log('✅ Ticket submitted successfully');
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeColors = {
    sabq: { bg: 'bg-primary', text: 'text-white' },
    sabqi: { bg: 'bg-accent', text: 'text-white' },
    manzil: { bg: 'bg-primary/80', text: 'text-white' }
  };
  const colors = typeColors[ticket.type as keyof typeof typeColors] || typeColors.sabq;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col border-4 border-accent/30">
        {/* Modern Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-br from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.95)] border-b-4 border-accent/50 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-xl">📝</span>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow-lg">Review Ticket</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold ${colors.bg} ${colors.text} shadow-md`}>
                    {ticket.type.toUpperCase()}
                  </span>
                  <p className="text-white/90 text-sm font-medium">
                    {ticket.studentName}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full transition-all hover:scale-110 text-xl sm:text-2xl font-bold shadow-lg border-2 border-white/30"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Admin Notes (if provided) */}
        {ticket.teacherNotes && (
          <div className="px-6 py-4 bg-primary/10 border-l-4 border-primary">
            <p className="text-xs font-bold text-primary mb-1 uppercase tracking-wide">📝 Admin Instructions</p>
            <p className="text-sm text-primary/90 font-medium">{ticket.teacherNotes}</p>
          </div>
        )}

        {/* Previous Review (if reassigned) */}
        {ticket.status === 'reassigned' && ticket.previousTeacherComment && (
          <div className="px-6 py-4 bg-orange-50 border-l-4 border-orange-500">
            <p className="text-xs font-bold text-orange-800 mb-2 uppercase tracking-wide">⚠️ Previous Review</p>
            <p className="text-sm text-orange-900 mb-2">{ticket.previousTeacherComment}</p>
            {ticket.reassignmentReason && (
              <p className="text-xs text-orange-700 font-semibold">Reason: {ticket.reassignmentReason}</p>
            )}
            {ticket.previousMistakes && ticket.previousMistakes.length > 0 && (
              <div className="mt-3 pt-3 border-t border-orange-300">
                <p className="text-xs font-bold text-orange-800 mb-2">Previous Mistakes ({ticket.previousMistakes.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {ticket.previousMistakes.map((m, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded-lg font-semibold border border-orange-300">
                      {m.type} (Page {m.page})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contextual Workflow Banner */}
        <WorkflowBanner
          message="Mark Mushaf mistakes first, then add your review comment."
          type="info"
          visible={showBanner}
          onDismiss={() => setBannerDismissed(true)}
          icon="💡"
        />

        {/* Error Message */}
        {error && (
          <div className="px-6 py-4 bg-red-50 border-l-4 border-red-500">
            <p className="text-sm font-bold text-red-800">⚠️ {error}</p>
          </div>
        )}

        {/* Content */}
        <div className={`flex-1 overflow-y-auto ${fullMushafView ? 'p-0' : 'p-6'} bg-gradient-to-b from-gray-50 to-white transition-all duration-300`}>
          {fullMushafView ? (
            /* Full-Page Mushaf View */
            <div className="relative w-full h-full">
              {/* Full View Header Bar */}
              <div className="absolute top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                    <span>📖</span> Full Mushaf View
                  </h3>
                  <span className="text-xs text-gray-600">
                    {mistakes.length} mistake{mistakes.length !== 1 ? 's' : ''} marked
                  </span>
                </div>
                <button
                  onClick={() => setFullMushafView(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                  title="Exit Full View (ESC)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Exit Full View
                </button>
              </div>
              
              {/* Full-Page Mushaf */}
              <div className="pt-12 h-full overflow-auto">
                {loadingPersonalMushaf && (
                  <div className="text-center py-4 text-gray-500">
                    Loading student's mistake history...
                  </div>
                )}
                <InteractiveMushaf
                  currentPage={mushafPage}
                  onPageChange={setMushafPage}
                  mistakes={mushafMistakes}
                  historicalMistakes={personalMushafMistakes}
                  showHistorical={true}
                  onMistakeMark={handleMistakeMark}
                  readOnly={false}
                  mode="marking"
                  studentName={ticket.studentName}
                  enableZoom={true}
                  zoom={mushafZoom}
                  onZoomChange={setMushafZoom}
                />
              </div>
            </div>
          ) : (
            /* Normal View - Mushaf-First with Optional Sidebar */
            <div className={`grid gap-6 transition-all duration-300 ${showSidebar ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {/* Mushaf View - Full width when sidebar hidden */}
              <div className={showSidebar ? 'lg:col-span-2' : ''}>
                <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
                  <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-extrabold text-primary flex items-center gap-2">
                        <span>📖</span> Interactive Mushaf
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setShowSidebar(!showSidebar)}
                          className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs font-semibold flex items-center gap-1.5"
                          title={showSidebar ? "Hide sidebar" : "Show mistakes & comment"}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showSidebar ? "M6 18L18 6M6 6l12 12" : "M9 5l7 7-7 7"} />
                          </svg>
                          {showSidebar ? 'Hide Panel' : 'Show Panel'}
                        </button>
                        <button
                          onClick={() => setFullMushafView(true)}
                          className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-xs font-semibold flex items-center gap-1.5"
                          title="Full Mushaf View (ESC to exit)"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                          Full View
                        </button>
                        {mistakes.length > 0 && (
                          <div className="px-3 py-1.5 bg-primary/10 rounded-lg">
                            <span className="text-sm font-bold text-primary">
                              {mistakes.length} mistake{mistakes.length !== 1 ? 's' : ''} marked
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-b from-gray-50 to-white">
                    {loadingPersonalMushaf && (
                      <div className="text-center py-4 text-gray-500">
                        Loading student's mistake history...
                      </div>
                    )}
                    <InteractiveMushaf
                      currentPage={mushafPage}
                      onPageChange={setMushafPage}
                      mistakes={mushafMistakes}
                      historicalMistakes={personalMushafMistakes}
                      showHistorical={true}
                      onMistakeMark={handleMistakeMark}
                      readOnly={false}
                      mode="marking"
                      studentName={ticket.studentName}
                      enableZoom={true}
                      zoom={mushafZoom}
                      onZoomChange={setMushafZoom}
                    />
                  </div>
                </div>
              </div>

              {/* Sidebar - Mistakes List and Comment - Hidden by default */}
              {showSidebar && (
                <div className="space-y-4">
                {/* Mistakes List Card */}
                <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-base font-extrabold text-primary flex items-center gap-2">
                      <span>🔴</span> Marked Mistakes
                    </h3>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {mistakeCategories.mistakes > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded font-semibold">
                          Mistakes: {mistakeCategories.mistakes}
                        </span>
                      )}
                      {mistakeCategories.atkee > 0 && (
                        <span className="px-2 py-1 bg-accent/20 text-accent rounded font-semibold">
                          Atkee: {mistakeCategories.atkee}
                        </span>
                      )}
                      {mistakeCategories.tajweed > 0 && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-semibold">
                          Tajweed: {mistakeCategories.tajweed}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  {mistakes.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-2xl">👆</span>
                      </div>
                      <p className="text-sm text-primary/70 font-medium">Click on words in the Mushaf to mark mistakes</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {mistakes.map((mistake) => {
                        const isNew = newMistakeIds.has(mistake.id || '');
                        return (
                          <MistakeBadgeHighlight
                            key={mistake.id}
                            mistake={mistake}
                            isNew={isNew}
                            showTimestamp={false}
                            onRemove={handleRemoveMistake}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Comment Section Card - Hidden by default */}
              {showReviewComment ? (
                <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
                  <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center justify-between">
                      <label className="block text-base font-extrabold text-primary flex items-center gap-2">
                        <span>💬</span> Your Review Comment <span className="text-red-500">*</span>
                      </label>
                      <button
                        onClick={() => setShowReviewComment(false)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Hide comment"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <AICommentDraft
                        mistakes={mistakes}
                        onDraftGenerated={(draft) => {
                          setTeacherComment(draft);
                          // Scroll to textarea
                          setTimeout(() => {
                            const textarea = document.querySelector('textarea');
                            textarea?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 100);
                        }}
                        disabled={mistakes.length === 0}
                      />
                    </div>
                    <textarea
                      value={teacherComment}
                      onChange={(e) => setTeacherComment(e.target.value)}
                      rows={8}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition resize-none font-medium shadow-sm"
                      placeholder="Enter your review comments here... Describe the student's recitation, areas of improvement, and any additional notes. Or use 'Generate Review Summary' to auto-draft based on marked mistakes."
                      autoFocus
                    />
                    <p className="text-xs text-primary/60 mt-2 font-medium">
                      This comment will be sent to the admin for review.
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowReviewComment(true)}
                  className="w-full p-4 bg-white rounded-2xl border-2 border-dashed border-gray-300 hover:border-primary/50 transition-all text-left"
                >
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <span>💬</span>
                    <span>Add Review Comment</span>
                    <span className="text-red-500 ml-auto">*</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {teacherComment ? `${teacherComment.substring(0, 50)}...` : 'Click to add your review comment'}
                  </p>
                </button>
              )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modern Footer */}
        <div className="px-6 py-5 border-t-2 border-gray-200 bg-white flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 border-2 border-gray-300 text-primary rounded-xl font-extrabold hover:bg-gray-50 transition-all shadow-md"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !canSubmit}
            className="px-8 py-3 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl font-extrabold hover:from-primary/90 hover:to-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
            title={!canSubmit ? 'Mark at least one mistake OR add a comment to submit' : 'Submit review'}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <span>✓</span>
                <span>Submit Review</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherTicketReview;

