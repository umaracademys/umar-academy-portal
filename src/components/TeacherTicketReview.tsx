import React, { useState, useMemo, useEffect } from 'react';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { Ticket } from '../types/ticket';
import { MushafMistake } from '@umar-academy/mushaf';
import { useBackendData } from '../contexts/BackendDataContext';

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

  const handleSubmit = async () => {
    if (!teacherComment.trim()) {
      setError('Please add a comment before submitting');
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
    sabq: { bg: 'bg-green-500', text: 'text-green-50' },
    sabqi: { bg: 'bg-blue-500', text: 'text-blue-50' },
    manzil: { bg: 'bg-purple-500', text: 'text-purple-50' }
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
          <div className="px-6 py-4 bg-blue-50 border-l-4 border-blue-500">
            <p className="text-xs font-bold text-blue-800 mb-1 uppercase tracking-wide">📝 Admin Instructions</p>
            <p className="text-sm text-blue-900 font-medium">{ticket.teacherNotes}</p>
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

        {/* Error Message */}
        {error && (
          <div className="px-6 py-4 bg-red-50 border-l-4 border-red-500">
            <p className="text-sm font-bold text-red-800">⚠️ {error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Mushaf View - Takes 2 columns */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-extrabold text-primary flex items-center gap-2">
                      <span>📖</span> Interactive Mushaf
                    </h3>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                      <span className="text-sm font-bold text-primary">
                        {mistakes.length} mistake{mistakes.length !== 1 ? 's' : ''} marked
                      </span>
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
                  />
                </div>
              </div>
            </div>

            {/* Sidebar - Mistakes List and Comment */}
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
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold">
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
                      {mistakes.map((mistake) => (
                        <div
                          key={mistake.id}
                          className="group flex items-start justify-between gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-primary/50 transition-all"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-primary text-white shadow-sm">
                                {mistake.type}
                              </span>
                              <span className="text-xs text-primary/70 font-semibold">
                                Page {mistake.page}
                              </span>
                            </div>
                            {mistake.surah && mistake.ayah && (
                              <p className="text-xs text-primary/60 mb-1">
                                Surah {mistake.surah}, Ayah {mistake.ayah}
                              </p>
                            )}
                            {mistake.note && (
                              <p className="text-xs text-primary/80 mt-1 italic">"{mistake.note}"</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveMistake(mistake.id!)}
                            className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0 font-bold"
                            title="Remove mistake"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Comment Section Card */}
              <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <label className="block text-base font-extrabold text-primary flex items-center gap-2">
                    <span>💬</span> Your Review Comment <span className="text-red-500">*</span>
                  </label>
                </div>
                <div className="p-4">
                  <textarea
                    value={teacherComment}
                    onChange={(e) => setTeacherComment(e.target.value)}
                    placeholder="Enter your review comments here... Describe the student's recitation, areas of improvement, and any additional notes."
                    rows={8}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition resize-none font-medium shadow-sm"
                    required
                  />
                  <p className="text-xs text-primary/60 mt-2 font-medium">
                    This comment will be sent to the admin for review.
                  </p>
                </div>
              </div>
            </div>
          </div>
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
            disabled={isSubmitting || !teacherComment.trim()}
            className="px-8 py-3 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl font-extrabold hover:from-primary/90 hover:to-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
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

