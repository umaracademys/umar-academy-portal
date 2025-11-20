import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { Ticket } from '../types/ticket';
import { MushafMistake } from '@umar-academy/mushaf';
import { useAutoRecording } from '../hooks/useAutoRecording';

interface TeacherTicketReviewProps {
  ticket: Ticket;
  onClose: () => void;
  onSubmit: (
    ticketId: string, 
    data: { 
      teacherComment: string; 
      mistakes: MushafMistake[];
      recordingUrl?: string;
      recordingFormat?: string;
      recordingDuration?: number;
      recordingStartedAt?: string;
      recordingStoppedAt?: string;
    }
  ) => Promise<void>;
}

const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';

const TeacherTicketReview: React.FC<TeacherTicketReviewProps> = ({ ticket, onClose, onSubmit }) => {
  const [mushafPage, setMushafPage] = useState(1);
  const [mistakes, setMistakes] = useState<MushafMistake[]>(ticket.mistakes || []);
  const [teacherComment, setTeacherComment] = useState(ticket.teacherComment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingUploaded, setRecordingUploaded] = useState(false);
  const recordingStartedAtRef = useRef<Date | null>(null);
  
  // Auto-recording hook - starts automatically when component mounts
  const {
    isRecording,
    recordingTime,
    audioBlob,
    error: recordingError,
    hasPermission,
    stopRecording
  } = useAutoRecording({
    autoStart: true,
    onRecordingComplete: async (blob, duration) => {
      console.log(`✅ Recording completed: ${duration} seconds, ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
    },
    onError: (err) => {
      console.error('Recording error:', err);
      setError(`Recording error: ${err.message}`);
    }
  });

  // Track when recording started
  useEffect(() => {
    if (isRecording && !recordingStartedAtRef.current) {
      recordingStartedAtRef.current = new Date();
    }
  }, [isRecording]);

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
      audioUrl: m.audioUrl,
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

  const uploadRecording = async (blob: Blob): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('recording', blob, `recording-${ticket.id}-${Date.now()}.webm`);
      
      const response = await fetch(`${API_BASE}/recordings/upload`, {
        method: 'POST',
        body: blob,
        headers: {
          'Content-Type': blob.type || 'audio/webm'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to upload recording');
      }

      const data = await response.json();
      return data.recordingUrl;
    } catch (err) {
      console.error('Error uploading recording:', err);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!teacherComment.trim()) {
      setError('Please add a comment before submitting');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Stop recording if still recording
      let recordingUrl: string | null = null;
      let recordingFormat: string | null = null;
      let recordingDuration: number | null = null;
      let recordingStartedAt: Date | null = null;
      let recordingStoppedAt: Date | null = null;

      if (isRecording) {
        stopRecording();
        // Wait a bit for recording to finalize
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Upload recording if available
      if (audioBlob) {
        recordingStartedAt = recordingStartedAtRef.current;
        recordingStoppedAt = new Date();
        recordingDuration = Math.floor((recordingStoppedAt.getTime() - (recordingStartedAt?.getTime() || Date.now())) / 1000);
        
        recordingUrl = await uploadRecording(audioBlob);
        recordingFormat = 'webm';
        
        if (recordingUrl) {
          setRecordingUploaded(true);
          console.log('✅ Recording uploaded:', recordingUrl);
        } else {
          console.warn('⚠️ Recording upload failed, but continuing with submission');
        }
      }

      // Submit ticket with recording data
      await onSubmit(ticket.id, {
        teacherComment: teacherComment.trim(),
        mistakes: mushafMistakes,
        ...(recordingUrl && {
          recordingUrl,
          recordingFormat,
          recordingDuration,
          recordingStartedAt: recordingStartedAt?.toISOString(),
          recordingStoppedAt: recordingStoppedAt?.toISOString()
        })
      });
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-accent-soft bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.85)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-semibold text-white">Review Ticket</h2>
              <p className="text-white/80 text-xs sm:text-sm mt-1">
                {ticket.studentName} - {ticket.type.toUpperCase()}
              </p>
            </div>
            {/* Recording Indicator */}
            <div className="flex items-center gap-3">
              {isRecording && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500 rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-white text-xs font-semibold">
                    Recording: {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
              {recordingUploaded && !isRecording && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500 rounded-full">
                  <span className="text-white text-xs font-semibold">✓ Recording Saved</span>
                </div>
              )}
              {recordingError && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500 rounded-full">
                  <span className="text-white text-xs font-semibold">⚠ Recording Error</span>
                </div>
              )}
              {!hasPermission && !isRecording && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-500 rounded-full">
                  <span className="text-white text-xs font-semibold">🎤 Click to allow microphone</span>
                </div>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors text-lg font-bold"
                title="Close"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Admin Notes (if provided) */}
        {ticket.teacherNotes && (
          <div className="px-4 sm:px-6 py-3 bg-blue-50 border-b border-blue-200">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Admin Notes:</span> {ticket.teacherNotes}
            </p>
          </div>
        )}

        {/* Previous Review (if reassigned) */}
        {ticket.status === 'reassigned' && ticket.previousTeacherComment && (
          <div className="px-4 sm:px-6 py-3 bg-orange-50 border-b border-orange-200">
            <p className="text-xs font-semibold text-orange-800 mb-1">Previous Review:</p>
            <p className="text-sm text-orange-700">{ticket.previousTeacherComment}</p>
            {ticket.reassignmentReason && (
              <p className="text-xs text-orange-600 mt-1">Reason: {ticket.reassignmentReason}</p>
            )}
            {ticket.previousMistakes && ticket.previousMistakes.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-orange-800 mb-1">Previous Mistakes ({ticket.previousMistakes.length}):</p>
                <div className="flex flex-wrap gap-1">
                  {ticket.previousMistakes.map((m, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded">
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
          <div className="px-4 sm:px-6 py-3 bg-red-50 border-b border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Mushaf View - Takes 2 columns */}
            <div className="lg:col-span-2 flex justify-center items-start">
              <div className="bg-soft-accent rounded-2xl p-3 sm:p-4 w-full flex justify-center">
                <div className="w-full max-w-4xl">
                  <InteractiveMushaf
                    currentPage={mushafPage}
                    onPageChange={setMushafPage}
                    mistakes={mushafMistakes}
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
              {/* Mistakes List */}
              <div className="bg-white rounded-2xl border border-accent-soft p-4">
                <h3 className="text-sm font-semibold text-primary mb-3">
                  Marked Mistakes ({mistakes.length})
                </h3>
                {mistakes.length === 0 ? (
                  <p className="text-xs text-primary-soft italic">No mistakes marked yet. Click on words in the mushaf to mark mistakes.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {mistakes.map((mistake) => (
                      <div
                        key={mistake.id}
                        className="flex items-start justify-between gap-2 p-2 bg-soft-accent rounded-xl"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary text-white">
                              {mistake.type}
                            </span>
                            <span className="text-xs text-primary-soft">
                              Page {mistake.page}
                            </span>
                          </div>
                          {mistake.surah && mistake.ayah && (
                            <p className="text-xs text-primary-soft">
                              Surah {mistake.surah}, Ayah {mistake.ayah}
                            </p>
                          )}
                          {mistake.note && (
                            <p className="text-xs text-primary mt-1 italic">"{mistake.note}"</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveMistake(mistake.id!)}
                          className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded-full hover:bg-red-50 transition-colors flex-shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comment Section */}
              <div className="bg-white rounded-2xl border border-accent-soft p-4">
                <label className="block text-sm font-semibold text-primary mb-2">
                  Your Comment *
                </label>
                <textarea
                  value={teacherComment}
                  onChange={(e) => setTeacherComment(e.target.value)}
                  placeholder="Enter your review comments here..."
                  rows={6}
                  className="w-full px-3 py-2 border border-accent-soft rounded-2xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition resize-none"
                  required
                />
                <p className="text-xs text-primary-soft mt-2">
                  This comment will be sent to the admin for review.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Submit Button */}
        <div className="px-4 sm:px-6 py-4 border-t border-accent-soft bg-white flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 border-2 border-accent-soft text-primary rounded-full font-bold hover:bg-soft-accent transition-colors shadow-md"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !teacherComment.trim()}
            className="px-8 py-3 bg-primary text-white rounded-full font-bold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherTicketReview;

