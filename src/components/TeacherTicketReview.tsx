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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    adminNotes: false,
    previousReview: false,
    mistakes: false,
    comment: false
  });
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Compact Header */}
        <div className="px-3 py-2 bg-primary border-b border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Review Ticket</h2>
              <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${colors.bg} ${colors.text}`}>
                {ticket.type.toUpperCase()}
              </span>
              <span className="text-white/90 text-xs">
                {ticket.studentName}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded transition-colors text-lg font-bold"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Compact Admin Notes - Wrapped */}
        {ticket.teacherNotes && (
          <div className="px-3 py-2 bg-primary/5 border-b border-gray-200">
            <button
              onClick={() => setExpandedSections(prev => ({ ...prev, adminNotes: !prev.adminNotes }))}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="text-xs font-semibold text-primary">Admin Instructions</span>
              <span className="text-xs text-gray-500">{expandedSections.adminNotes ? '▼' : '▶'}</span>
            </button>
            {expandedSections.adminNotes && (
              <p className="text-xs text-gray-700 mt-1">{ticket.teacherNotes}</p>
            )}
          </div>
        )}

        {/* Compact Previous Review - Wrapped */}
        {ticket.status === 'reassigned' && ticket.previousTeacherComment && (
          <div className="px-3 py-2 bg-orange-50 border-b border-gray-200">
            <button
              onClick={() => setExpandedSections(prev => ({ ...prev, previousReview: !prev.previousReview }))}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="text-xs font-semibold text-orange-800">Previous Review</span>
              <span className="text-xs text-gray-500">{expandedSections.previousReview ? '▼' : '▶'}</span>
            </button>
            {expandedSections.previousReview && (
              <div className="mt-1">
                <p className="text-xs text-orange-900 mb-1">{ticket.previousTeacherComment}</p>
                {ticket.reassignmentReason && (
                  <p className="text-xs text-orange-700">Reason: {ticket.reassignmentReason}</p>
                )}
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

        {/* Compact Content */}
        <div className={`flex-1 overflow-y-auto ${fullMushafView ? 'p-0' : 'p-3'} bg-gray-50 transition-all duration-300`}>
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
            /* Compact Normal View - Mushaf with Wrapped Features */
            <div className="space-y-3">
              {/* Compact Mushaf Header */}
              <div className="bg-white rounded-lg border border-gray-200 p-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Interactive Mushaf</h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowSidebar(!showSidebar)}
                      className="px-2 py-1 bg-gray-600 text-white rounded text-xs font-medium hover:bg-gray-700 transition-colors"
                      title={showSidebar ? "Hide panel" : "Show panel"}
                    >
                      {showSidebar ? 'Hide' : 'Show'} Panel
                    </button>
                    <button
                      onClick={() => setFullMushafView(true)}
                      className="px-2 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-primary/90 transition-colors"
                      title="Full view (ESC to exit)"
                    >
                      Full View
                    </button>
                    {mistakes.length > 0 && (
                      <span className="px-2 py-1 bg-primary/10 rounded text-xs font-semibold text-primary">
                        {mistakes.length} mistakes
                      </span>
                    )}
                  </div>
                </div>
                {loadingPersonalMushaf && (
                  <div className="text-center py-2 text-xs text-gray-500">
                    Loading...
                  </div>
                )}
                <div className="border border-gray-200 rounded overflow-hidden" style={{ maxHeight: '500px', overflow: 'auto' }}>
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

              {/* Compact Wrapped Mistakes Panel */}
              {showSidebar && (
                <div className="space-y-2">
                {/* Compact Mistakes List - Wrapped */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedSections(prev => ({ ...prev, mistakes: !prev.mistakes }))}
                  className="w-full px-2 py-1.5 flex items-center justify-between border-b border-gray-200 bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-900">Marked Mistakes</span>
                    <div className="flex gap-1 text-xs">
                      {mistakeCategories.mistakes > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-xs">
                          {mistakeCategories.mistakes}
                        </span>
                      )}
                      {mistakeCategories.atkee > 0 && (
                        <span className="px-1.5 py-0.5 bg-accent/20 text-accent rounded text-xs">
                          Atkee: {mistakeCategories.atkee}
                        </span>
                      )}
                      {mistakeCategories.tajweed > 0 && (
                        <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                          Tajweed: {mistakeCategories.tajweed}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{expandedSections.mistakes ? '▼' : '▶'}</span>
                </button>
                {expandedSections.mistakes && (
                <div className="p-2">
                  {mistakes.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-500">Click on words in the Mushaf to mark mistakes</p>
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
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
                )}
              </div>

              {/* Compact Comment Section - Wrapped */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedSections(prev => ({ ...prev, comment: !prev.comment }))}
                  className="w-full px-2 py-1.5 flex items-center justify-between border-b border-gray-200 bg-gray-50"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-900">Review Comment</span>
                    <span className="text-red-500 text-xs">*</span>
                    {teacherComment && (
                      <span className="text-xs text-gray-500">({teacherComment.length} chars)</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{expandedSections.comment ? '▼' : '▶'}</span>
                </button>
                {expandedSections.comment && (
                <div className="p-2">
                  <div className="mb-2">
                    <AICommentDraft
                      mistakes={mistakes}
                      onDraftGenerated={(draft) => {
                        setTeacherComment(draft);
                      }}
                      disabled={mistakes.length === 0}
                    />
                  </div>
                  <textarea
                    value={teacherComment}
                    onChange={(e) => setTeacherComment(e.target.value)}
                    rows={6}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                    placeholder="Enter your review comments..."
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This comment will be sent to the admin for review.
                  </p>
                </div>
                )}
              </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Compact Footer */}
        <div className="px-3 py-2 border-t border-gray-200 bg-white flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !canSubmit}
            className="px-4 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            title={!canSubmit ? 'Mark at least one mistake OR add a comment to submit' : 'Submit review'}
          >
            {isSubmitting ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <span>✓</span>
                <span>Submit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherTicketReview;

