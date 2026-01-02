import React, { useState, useEffect, useMemo } from 'react';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { MushafMistake } from '@umar-academy/mushaf';
import Card from './Card';

interface TeacherPersonalMushafProps {
  studentId: string;
  studentName: string;
  onClose: () => void;
  ticketId?: string; // Optional: if marking mistakes for a specific ticket/session
  workflowStep?: 'sabq' | 'sabqi' | 'manzil'; // Current workflow step
  onSessionComplete?: (newMistakes: MushafMistake[]) => void; // Callback when session is done
}

interface MistakeWithStatus extends MushafMistake {
  isNew?: boolean; // True if marked in this session
  isExisting?: boolean; // True if existed before this session
  sessionId?: string; // ID of current session
  previousMistakeId?: string; // ID of existing mistake if this is a re-mark
}

const TeacherPersonalMushaf: React.FC<TeacherPersonalMushafProps> = ({ 
  studentId, 
  studentName, 
  onClose,
  ticketId,
  workflowStep,
  onSessionComplete
}) => {
  const { getStudentPersonalMushaf, addMistakeToPersonalMushaf } = useBackendData();
  const { user } = useAuth();
  const { teachers } = useData();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [existingMistakes, setExistingMistakes] = useState<MushafMistake[]>([]); // Mistakes that existed before session
  const [newMistakes, setNewMistakes] = useState<MistakeWithStatus[]>([]); // Mistakes marked in this session
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'sabq' | 'sabqi' | 'manzil'>('all');
  const [filterPage, setFilterPage] = useState<number | null>(null);
  const [sessionActive, setSessionActive] = useState(true); // Whether teacher is actively marking mistakes
  const [showNewOnly, setShowNewOnly] = useState(false); // Toggle to show only new mistakes
  
  // Session ID to track mistakes in this session
  const sessionId = useMemo(() => ticketId || `session-${Date.now()}`, [ticketId]);

  // Get current teacher info
  const currentTeacher = useMemo(() => {
    if (!user) return null;
    return teachers.find(t => t.id === user.id || t.email === user.email);
  }, [user, teachers]);

  // Load existing mistakes from student's personal mushaf
  useEffect(() => {
    const loadPersonalMushaf = async () => {
      if (!studentId) {
        setError('Student ID not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getStudentPersonalMushaf(studentId);
        
        if (data && data.mistakes) {
          // Convert to MushafMistake format - these are existing mistakes
          const convertedMistakes: MushafMistake[] = data.mistakes.map((m: any) => ({
            id: m.id,
            type: m.type,
            page: m.page,
            surah: m.surah,
            ayah: m.ayah,
            wordIndex: m.wordIndex,
            letterIndex: m.letterIndex,
            position: m.position,
            note: m.note,
            audioUrl: m.audioUrl,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            workflowStep: m.workflowStep
          } as MushafMistake & { workflowStep?: string }));
          
          setExistingMistakes(convertedMistakes);
          
          // Set initial page to first mistake if available
          if (convertedMistakes.length > 0) {
            setCurrentPage(convertedMistakes[0].page);
          }
        } else {
          setExistingMistakes([]);
        }
      } catch (err) {
        console.error('Error loading personal Mushaf:', err);
        setError(err instanceof Error ? err.message : 'Failed to load personal Mushaf');
      } finally {
        setLoading(false);
      }
    };

    loadPersonalMushaf();
  }, [studentId, getStudentPersonalMushaf]);

  // Combine existing and new mistakes for display
  const allMistakes = useMemo((): MistakeWithStatus[] => {
    const combined: MistakeWithStatus[] = [
      ...existingMistakes.map((m: MushafMistake): MistakeWithStatus => ({
        ...m,
        isExisting: true,
        isNew: false
      })),
      ...newMistakes.map((m: MistakeWithStatus): MistakeWithStatus => ({
        ...m,
        isNew: true,
        isExisting: false
      }))
    ];
    
    // Remove duplicates (if a mistake was re-marked, keep the new one)
    const uniqueMistakes = new Map<string, MistakeWithStatus>();
    combined.forEach((mistake: MistakeWithStatus) => {
      // Access properties from MushafMistake base type
      const page = (mistake as MushafMistake).page;
      const surah = (mistake as MushafMistake).surah;
      const ayah = (mistake as MushafMistake).ayah;
      const wordIndex = (mistake as MushafMistake).wordIndex;
      const type = (mistake as MushafMistake).type;
      const key = `${page}-${surah}-${ayah}-${wordIndex}-${type}`;
      if (!uniqueMistakes.has(key) || mistake.isNew) {
        uniqueMistakes.set(key, mistake);
      }
    });
    
    return Array.from(uniqueMistakes.values());
  }, [existingMistakes, newMistakes]);

  // Filter mistakes based on selected filters
  const filteredMistakes = useMemo(() => {
    let filtered = allMistakes;
    
    if (showNewOnly) {
      filtered = filtered.filter(m => m.isNew);
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(m => (m as any).workflowStep === filterType);
    }
    
    if (filterPage !== null) {
      filtered = filtered.filter(m => m.page === filterPage);
    }
    
    return filtered;
  }, [allMistakes, filterType, filterPage, showNewOnly]);

  // Get unique pages with mistakes
  const pagesWithMistakes = useMemo(() => {
    const pages = new Set<number>(allMistakes.map(m => m.page));
    return Array.from(pages).sort((a, b) => a - b);
  }, [allMistakes]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: allMistakes.length,
      existing: existingMistakes.length,
      new: newMistakes.length,
      sabq: allMistakes.filter(m => (m as any).workflowStep === 'sabq').length,
      sabqi: allMistakes.filter(m => (m as any).workflowStep === 'sabqi').length,
      manzil: allMistakes.filter(m => (m as any).workflowStep === 'manzil').length,
      byType: {} as Record<string, number>
    };
  }, [allMistakes, existingMistakes, newMistakes]);

  // Calculate type statistics
  useEffect(() => {
    const byType: Record<string, number> = {};
    allMistakes.forEach(m => {
      byType[m.type] = (byType[m.type] || 0) + 1;
    });
    stats.byType = byType;
  }, [allMistakes]);

  // Handle mistake marking
  const handleMistakeMark = async (mistake: Omit<MushafMistake, 'id' | 'timestamp'>) => {
    if (!studentId || !currentTeacher) {
      alert('Student ID or Teacher info not found');
      return;
    }

    // Check if this mistake already exists
    const existingMistake = existingMistakes.find(m => 
      m.page === mistake.page &&
      m.surah === mistake.surah &&
      m.ayah === mistake.ayah &&
      m.wordIndex === mistake.wordIndex &&
      m.type === mistake.type &&
      (mistake.letterIndex === undefined || m.letterIndex === mistake.letterIndex)
    );

    // Check if already marked in this session
    const sessionMistake = newMistakes.find(m =>
      m.page === mistake.page &&
      m.surah === mistake.surah &&
      m.ayah === mistake.ayah &&
      m.wordIndex === mistake.wordIndex &&
      m.type === mistake.type &&
      (mistake.letterIndex === undefined || m.letterIndex === mistake.letterIndex)
    );

    if (sessionMistake) {
      // Already marked in this session - show info
      alert('This mistake has already been marked in this session.');
      return;
    }

    try {
      // Add to new mistakes list immediately (optimistic update)
      const newMistakeWithStatus: MistakeWithStatus = {
        ...mistake,
        id: `new-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        isNew: true,
        isExisting: !!existingMistake,
        sessionId,
        previousMistakeId: existingMistake?.id,
        workflowStep: workflowStep
      } as MistakeWithStatus;

      setNewMistakes(prev => [...prev, newMistakeWithStatus]);

      // If it's an existing mistake, show difference
      if (existingMistake) {
        const difference = {
          existing: {
            timestamp: existingMistake.timestamp,
            note: existingMistake.note,
            workflowStep: (existingMistake as any).workflowStep,
            markedBy: (existingMistake as any).markedByName || 'Unknown'
          },
          new: {
            timestamp: new Date(),
            note: mistake.note,
            workflowStep: workflowStep,
            markedBy: currentTeacher.fullName || 'Teacher'
          }
        };
        console.log('⚠️ Mistake already exists. Difference:', difference);
        
        // Show alert with difference information
        const differenceMessage = `This mistake was already marked.\n\n` +
          `Previous:\n` +
          `- Date: ${new Date(existingMistake.timestamp).toLocaleString()}\n` +
          `- Note: ${existingMistake.note || 'None'}\n` +
          `- Workflow: ${(existingMistake as any).workflowStep || 'N/A'}\n` +
          `- Marked by: ${(existingMistake as any).markedByName || 'Unknown'}\n\n` +
          `New:\n` +
          `- Date: ${new Date().toLocaleString()}\n` +
          `- Note: ${mistake.note || 'None'}\n` +
          `- Workflow: ${workflowStep || 'N/A'}\n` +
          `- Marked by: ${currentTeacher.fullName || 'Teacher'}`;
        
        // Don't block, just inform
        console.log(differenceMessage);
      }

      // Save to backend - backend will handle updates vs new mistakes
      const result = await addMistakeToPersonalMushaf(
        studentId,
        {
          ...mistake,
          workflowStep: workflowStep // Include workflow step in mistake data
        },
        currentTeacher.id,
        currentTeacher.fullName || 'Teacher'
      );

      if (!result || !result.success) {
        // Rollback if save failed
        setNewMistakes(prev => prev.filter((m: MistakeWithStatus) => (m as MushafMistake).id !== (newMistakeWithStatus as MushafMistake).id));
        alert('Failed to save mistake. Please try again.');
      } else if (result.isUpdate) {
        // If it was an update, update the existing mistake in the list
        setExistingMistakes(prev => prev.map((m: MushafMistake) => 
          m.id === result.existingMistake?.id 
            ? { ...m, ...newMistakeWithStatus, isExisting: true, isNew: false } as MushafMistake
            : m
        ));
        // Remove from new mistakes since it's an update
        setNewMistakes(prev => prev.filter((m: MistakeWithStatus) => (m as MushafMistake).id !== (newMistakeWithStatus as MushafMistake).id));
      }
    } catch (err) {
      console.error('Error saving mistake:', err);
      alert(err instanceof Error ? err.message : 'Failed to save mistake');
    }
  };

  // Handle session completion - sync all new mistakes to student's personal mushaf
  const handleSessionComplete = async () => {
    if (newMistakes.length === 0) {
      alert('No new mistakes to save.');
      setSessionActive(false);
      return;
    }

    try {
      // All mistakes are already saved via addMistakeToPersonalMushaf
      // Just reload to show updated state
      const data = await getStudentPersonalMushaf(studentId);
      
      if (data && data.mistakes) {
        const convertedMistakes: MushafMistake[] = data.mistakes.map((m: any) => ({
          id: m.id,
          type: m.type,
          page: m.page,
          surah: m.surah,
          ayah: m.ayah,
          wordIndex: m.wordIndex,
          letterIndex: m.letterIndex,
          position: m.position,
          note: m.note,
          audioUrl: m.audioUrl,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          workflowStep: m.workflowStep
        } as MushafMistake & { workflowStep?: string }));
        
        setExistingMistakes(convertedMistakes);
        setNewMistakes([]);
        setSessionActive(false);
        
        // Call callback if provided
        if (onSessionComplete) {
          onSessionComplete(newMistakes);
        }
        
        alert(`Session completed! ${newMistakes.length} new mistake(s) have been saved to ${studentName}'s Personal Mushaf.`);
      }
    } catch (err) {
      console.error('Error completing session:', err);
      alert('Error completing session. Mistakes may not have been synced.');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-gray-600">Loading {studentName}'s Personal Mushaf...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                📖 {studentName}'s Personal Mushaf
              </h2>
              <p className="text-white/90 text-sm mt-1">
                {sessionActive 
                  ? `Marking mistakes for ${workflowStep || 'recitation'} session`
                  : `Viewing all mistakes from ${studentName}'s recitation reviews`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {sessionActive && newMistakes.length > 0 && (
                <button
                  onClick={handleSessionComplete}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition shadow-lg"
                >
                  Complete Session ({newMistakes.length} new)
                </button>
              )}
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors text-xl font-bold"
                title="Close"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Bar */}
        <div className="px-4 py-3 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <div className="text-center px-2 py-2 rounded-lg bg-white border border-primary/20 shadow-sm">
              <div className="text-xl font-bold text-primary">{stats.total}</div>
              <div className="text-[10px] font-semibold text-gray-600 uppercase">Total</div>
            </div>
            <div className="text-center px-2 py-2 rounded-lg bg-white border border-green-200 shadow-sm">
              <div className="text-xl font-bold text-green-600">{stats.new}</div>
              <div className="text-[10px] font-semibold text-gray-600 uppercase">New</div>
            </div>
            <div className="text-center px-2 py-2 rounded-lg bg-white border border-gray-200 shadow-sm">
              <div className="text-xl font-bold text-gray-600">{stats.existing}</div>
              <div className="text-[10px] font-semibold text-gray-600 uppercase">Existing</div>
            </div>
            <div className="text-center px-2 py-2 rounded-lg bg-white border border-blue-200 shadow-sm">
              <div className="text-xl font-bold text-blue-600">{stats.sabq}</div>
              <div className="text-[10px] font-semibold text-gray-600 uppercase">Sabq</div>
            </div>
            <div className="text-center px-2 py-2 rounded-lg bg-white border border-green-200 shadow-sm">
              <div className="text-xl font-bold text-green-600">{stats.sabqi}</div>
              <div className="text-[10px] font-semibold text-gray-600 uppercase">Sabqi</div>
            </div>
            <div className="text-center px-2 py-2 rounded-lg bg-white border border-purple-200 shadow-sm">
              <div className="text-xl font-bold text-purple-600">{stats.manzil}</div>
              <div className="text-[10px] font-semibold text-gray-600 uppercase">Manzil</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 bg-white border-b-2 border-gray-200 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Filter:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="sabq">Sabq</option>
              <option value="sabqi">Sabqi</option>
              <option value="manzil">Manzil</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Page:</label>
            <select
              value={filterPage || ''}
              onChange={(e) => setFilterPage(e.target.value ? parseInt(e.target.value) : null)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Pages</option>
              {pagesWithMistakes.map(page => (
                <option key={page} value={page}>Page {page}</option>
              ))}
            </select>
          </div>

          {sessionActive && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showNewOnly}
                onChange={(e) => setShowNewOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-gray-700">Show new mistakes only</span>
            </label>
          )}
          
          <div className="ml-auto px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm font-semibold text-blue-700">
              Showing <span className="font-bold">{filteredMistakes.length}</span> of <span className="font-bold">{stats.total}</span> mistakes
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '0' }}>
          {allMistakes.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="text-6xl mb-4">📖</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Mistakes Yet</h3>
              <p className="text-gray-600 mb-4">
                {studentName}'s personal Mushaf will show all mistakes from recitation reviews.
              </p>
              <p className="text-sm text-gray-500">
                Click on any word to mark a mistake.
              </p>
            </div>
          ) : (
            <div className="w-full flex justify-center items-center min-h-full" style={{ padding: '0' }}>
              <div className="w-full max-w-7xl mx-auto flex justify-center" style={{ padding: '0' }}>
                <InteractiveMushaf
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  mistakes={filteredMistakes.filter(m => m.page === currentPage).map(m => ({
                    ...m,
                    // Highlight new mistakes differently
                    ...(m.isNew && { 
                      // Add visual indicator for new mistakes
                      note: m.note ? `🆕 ${m.note}` : '🆕 New mistake'
                    })
                  }))}
                  historicalMistakes={existingMistakes.filter(m => 
                    m.page === currentPage && 
                    !filteredMistakes.some(fm => 
                      fm.page === m.page &&
                      fm.surah === m.surah &&
                      fm.ayah === m.ayah &&
                      fm.wordIndex === m.wordIndex &&
                      fm.type === m.type
                    )
                  )}
                  onMistakeMark={sessionActive ? handleMistakeMark : undefined}
                  readOnly={!sessionActive}
                  mode="marking"
                  showHistorical={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Mistake List Footer */}
        {filteredMistakes.length > 0 && (
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-t-2 border-gray-200 max-h-48 overflow-y-auto">
            <h3 className="text-sm font-bold text-primary mb-3">
              Mistakes on Page {currentPage} ({filteredMistakes.filter(m => m.page === currentPage).length})
            </h3>
            <div className="space-y-2">
              {filteredMistakes
                .filter(m => m.page === currentPage)
                .map((mistake) => (
                  <div
                    key={mistake.id}
                    className={`flex items-start gap-2 p-3 rounded-lg border-2 shadow-sm transition-all ${
                      mistake.isNew 
                        ? 'bg-green-50 border-green-300' 
                        : 'bg-white border-gray-100'
                    }`}
                  >
                    {mistake.isNew && (
                      <span className="px-2 py-0.5 rounded-full bg-green-500 text-white text-xs font-bold">
                        NEW
                      </span>
                    )}
                    {mistake.isExisting && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-400 text-white text-xs font-bold">
                        EXISTING
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-white text-xs font-bold shadow-sm ${
                      (mistake as any).workflowStep === 'sabq' ? 'bg-blue-500' :
                      (mistake as any).workflowStep === 'sabqi' ? 'bg-green-500' :
                      (mistake as any).workflowStep === 'manzil' ? 'bg-purple-500' : 'bg-gray-500'
                    }`}>
                      {(mistake as any).workflowStep?.toUpperCase() || 'N/A'}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-bold shadow-sm">
                      {mistake.type}
                    </span>
                    {mistake.note && (
                      <span className="text-gray-700 text-xs italic ml-auto">"{mistake.note}"</span>
                    )}
                    <span className="text-gray-400 text-xs ml-auto">
                      Surah {mistake.surah}:{mistake.ayah}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherPersonalMushaf;

