import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { Ticket, TajweedIssue, TajweedIssueType, MistakeCount, Atkees, RecitationRange } from '../types/ticket';
import { MushafMistake } from '@umar-academy/mushaf';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { useToast } from '../hooks/useToast';
import { fetchVersesBySurah } from '../services/quranApi';
import { getQuranChapters } from '@umar-academy/mushaf';

type ReviewMode = 'admin-sabq' | 'teacher-review';

const MushafReviewPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    recitationTickets, 
    getStudentPersonalMushaf, 
    getStudentAssignments,
    updateRecitationTicket,
    submitTicket,
    approveAndSendTicket,
    refreshDataLight
  } = useBackendData();
  const { showToast } = useToast();

  // Get mode from URL or determine from user role
  const mode: ReviewMode = useMemo(() => {
    const urlMode = searchParams.get('mode') as ReviewMode | null;
    if (urlMode === 'admin-sabq' || urlMode === 'teacher-review') {
      return urlMode;
    }
    // Auto-detect based on user role and ticket type
    if (user?.role === 'superadmin' || user?.role === 'admin') {
      return 'admin-sabq';
    }
    return 'teacher-review';
  }, [searchParams, user?.role]);

  // State management
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mushafPage, setMushafPage] = useState(1);
  const [mistakes, setMistakes] = useState<MushafMistake[]>([]);
  const [personalMushafMistakes, setPersonalMushafMistakes] = useState<MushafMistake[]>([]);
  const [loadingPersonalMushaf, setLoadingPersonalMushaf] = useState(false);
  const [mushafZoom, setMushafZoom] = useState(1.0);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('mushaf');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Admin Sabq specific state
  const [sabqEntries, setSabqEntries] = useState<any[]>([]);
  const [currentSabqIndex, setCurrentSabqIndex] = useState<number | null>(null);
  const [currentMistakes, setCurrentMistakes] = useState<MushafMistake[]>([]); // Current mistakes for active Sabq entry
  const [currentRecitationRange, setCurrentRecitationRange] = useState<RecitationRange>({
    surahNumber: 1,
    startAyahNumber: 0,
    endAyahNumber: 0
  });
  const [selectedStartAyah, setSelectedStartAyah] = useState<{ surah: number; ayah: number } | null>(null);
  const [selectedEndAyah, setSelectedEndAyah] = useState<{ surah: number; ayah: number } | null>(null);
  const [mistakeCount, setMistakeCount] = useState<MistakeCount | undefined>(undefined);
  const [atkees, setAtkees] = useState<number | undefined>(undefined);
  const [tajweedIssues, setTajweedIssues] = useState<TajweedIssue[]>([]);
  const [adminComment, setAdminComment] = useState('');
  const [homeworkRange, setHomeworkRange] = useState<RecitationRange | undefined>(undefined);

  // Teacher Review specific state
  const [teacherComment, setTeacherComment] = useState('');
  const [recitationRange, setRecitationRange] = useState<RecitationRange>({
    surahNumber: 1,
    startAyahNumber: 0,
    endAyahNumber: 0
  });
  const [reviewNotes, setReviewNotes] = useState('');

  const [surahs, setSurahs] = useState<any[]>([]);
  const [loadingAyahText, setLoadingAyahText] = useState(false);
  const [mistakesWithWords, setMistakesWithWords] = useState<Map<string, string>>(new Map());
  const hasNavigatedRef = useRef(false);

  // Helper function to estimate page from surah (fallback)
  const estimatePageFromSurah = useCallback((surahNumber: number): number | null => {
    const surahPageMap: Record<number, number> = {
      1: 1, 2: 2, 3: 50, 4: 77, 5: 106, 6: 128, 7: 151, 8: 177, 9: 187,
      10: 208, 11: 221, 12: 235, 13: 249, 14: 255, 15: 262, 16: 267, 17: 282, 18: 293, 19: 305,
      20: 312, 21: 322, 22: 332, 23: 342, 24: 350, 25: 359, 26: 367, 27: 377, 28: 385, 29: 396,
      30: 404, 31: 411, 32: 415, 33: 418, 34: 428, 35: 434, 36: 440, 37: 446, 38: 453, 39: 458,
      40: 467, 41: 477, 42: 483, 43: 489, 44: 496, 45: 499, 46: 502, 47: 507, 48: 511, 49: 515,
      50: 518, 51: 520, 52: 523, 53: 526, 54: 528, 55: 531, 56: 534, 57: 537, 58: 542, 59: 545,
      60: 549, 61: 551, 62: 553, 63: 554, 64: 556, 65: 558, 66: 560, 67: 562, 68: 564, 69: 566,
      70: 568, 71: 570, 72: 572, 73: 574, 74: 575, 75: 577, 76: 578, 77: 580, 78: 582, 79: 583,
      80: 585, 81: 586, 82: 587, 83: 587, 84: 589, 85: 590, 86: 591, 87: 591, 88: 592, 89: 593,
      90: 594, 91: 595, 92: 595, 93: 596, 94: 596, 95: 597, 96: 597, 97: 598, 98: 598, 99: 599,
      100: 599, 101: 600, 102: 600, 103: 601, 104: 601, 105: 602, 106: 602, 107: 603, 108: 603,
      109: 603, 110: 604, 111: 604, 112: 604, 113: 604, 114: 604
    };
    return surahPageMap[surahNumber] || null;
  }, []);

  // Load surahs on mount
  useEffect(() => {
    const loadSurahs = async () => {
      try {
        const chapters = await getQuranChapters();
        setSurahs(chapters);
      } catch (error) {
        console.error('Error loading surahs:', error);
      }
    };
    loadSurahs();
  }, []);

  // Load ticket data
  useEffect(() => {
    const loadTicket = async () => {
      if (!ticketId) {
        setError('Ticket ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Find ticket in context
        let foundTicket = recitationTickets.find(t => t.id === ticketId || t._id === ticketId);
        
        // If not found, fetch from API
        if (!foundTicket) {
          const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
          const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
          
          const response = await fetch(`${API_BASE}/tickets/${ticketId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error('Failed to fetch ticket');
          }

          const ticketData = await response.json();
          foundTicket = {
            ...ticketData,
            id: ticketData._id || ticketData.id
          };
        }

        if (!foundTicket) {
          throw new Error('Ticket not found');
        }

        setTicket(foundTicket);
        setMistakes(foundTicket.mistakes || []);
        setTeacherComment(foundTicket.teacherComment || '');
        setAdminComment(foundTicket.adminComment || '');
        setRecitationRange(foundTicket.recitationRange || {
          surahNumber: 1,
          startAyahNumber: 0,
          endAyahNumber: 0
        });

        // Load Sabq entries if admin mode
        if (mode === 'admin-sabq' && foundTicket.sabqEntries) {
          setSabqEntries(foundTicket.sabqEntries);
        }

        // Initialize page from first mistake or recitation range
        if (foundTicket.mistakes && foundTicket.mistakes.length > 0) {
          const firstMistake = foundTicket.mistakes[0];
          if (firstMistake.page) {
            setMushafPage(firstMistake.page);
          }
        } else if (foundTicket.recitationRange && foundTicket.recitationRange.startAyahNumber > 0) {
          // Try to estimate page from surah/ayah
          const estimatedPage = estimatePageFromSurah(foundTicket.recitationRange.surahNumber);
          if (estimatedPage) {
            setMushafPage(estimatedPage);
          }
        }

        // Load personal mushaf
        if (foundTicket.studentId) {
          loadPersonalMushaf(foundTicket.studentId);
        }
      } catch (err) {
        console.error('Error loading ticket:', err);
        setError(err instanceof Error ? err.message : 'Failed to load ticket');
        showToast('Failed to load ticket', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadTicket();
  }, [ticketId, recitationTickets, showToast]);

  // Load personal mushaf mistakes
  const loadPersonalMushaf = useCallback(async (studentId: string) => {
    try {
      setLoadingPersonalMushaf(true);
      const personalMushafData = await getStudentPersonalMushaf(studentId);
      
      if (personalMushafData?.mistakes) {
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
            if (baseUrl.endsWith('/api')) baseUrl = baseUrl.replace('/api', '');
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
  }, [getStudentPersonalMushaf]);

  // Handle mistake marking - optimized to prevent flickering
  const handleMistakeMark = useCallback((mistake: Omit<MushafMistake, 'id' | 'timestamp'>) => {
    const newMistake: MushafMistake = {
      ...mistake,
      id: `mistake-${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    };
    
    // Use functional update to prevent flickering
    const updateMistakes = (prev: MushafMistake[]) => {
      // Check if mistake already exists (prevent duplicates)
      const exists = prev.some(m => 
        m.page === newMistake.page &&
        m.surah === newMistake.surah &&
        m.ayah === newMistake.ayah &&
        m.wordIndex === newMistake.wordIndex
      );
      
      if (exists) return prev;
      return [...prev, newMistake];
    };

    // Update both mistakes and currentMistakes for admin-sabq mode
    setMistakes(updateMistakes);
    if (mode === 'admin-sabq') {
      setCurrentMistakes(updateMistakes);
    }
  }, [mode]);

  // Handle verse double-click for range selection
  const handleVerseDoubleClick = useCallback(async (surah: number, ayah: number, page: number) => {
    if (!selectedStartAyah) {
      setSelectedStartAyah({ surah, ayah });
      setMushafPage(page);
      
      // Load ayah text
      try {
        setLoadingAyahText(true);
        const verses = await fetchVersesBySurah(surah);
        const verse = verses.find(v => v.ayah === ayah);
        if (verse) {
          setCurrentRecitationRange(prev => ({
            ...prev,
            surahNumber: surah,
            startAyahNumber: ayah,
            startAyahText: verse.text,
            surahName: surahs.find(s => s.id === surah)?.name_arabic
          }));
        }
      } catch (error) {
        console.error('Error loading ayah text:', error);
      } finally {
        setLoadingAyahText(false);
      }
    } else {
      setSelectedEndAyah({ surah, ayah });
      setMushafPage(page);
      
      // Load ayah text
      try {
        setLoadingAyahText(true);
        const verses = await fetchVersesBySurah(surah);
        const verse = verses.find(v => v.ayah === ayah);
        if (verse) {
          setCurrentRecitationRange(prev => ({
            ...prev,
            endAyahNumber: ayah,
            endAyahText: verse.text,
            endSurahNumber: surah !== prev.surahNumber ? surah : undefined,
            endSurahName: surah !== prev.surahNumber ? surahs.find(s => s.id === surah)?.name_arabic : undefined
          }));
        }
      } catch (error) {
        console.error('Error loading ayah text:', error);
      } finally {
        setLoadingAyahText(false);
      }
    }
  }, [selectedStartAyah, surahs]);

  // Handle submission - optimized with proper error handling
  const handleSubmit = useCallback(async () => {
    if (!ticket) {
      showToast('No ticket selected', 'error');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'admin-sabq') {
        // Admin Sabq submission
        const sabqData = {
          sabqEntries: sabqEntries.length > 0 ? sabqEntries : [{
            id: `sabq-${Date.now()}`,
            recitationRange: currentRecitationRange,
            mistakes: mistakes,
            mistakeCount: mistakeCount,
            atkees: atkees,
            tajweedIssues: tajweedIssues,
            adminComment: adminComment
          }],
          homeworkRange: homeworkRange,
          adminComment: adminComment
        };

        // Use the submit-sabq endpoint
        const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
        const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/tickets/${ticket.id}/submit-sabq`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(sabqData)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to submit Sabq review');
        }

        const result = await response.json();
        showToast('Sabq review submitted successfully', 'success');
        
        // Refresh data
        await refreshDataLight();
        
        // Navigate back
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        // Teacher review submission
        const submitData = {
          teacherComment: teacherComment,
          mistakes: mistakes,
          recitationRange: recitationRange,
          mistakeCount: mistakeCount,
          atkees: atkees,
          tajweedIssues: tajweedIssues,
          reviewNotes: reviewNotes
        };

        await submitTicket(ticket.id, submitData);
        showToast('Review submitted successfully', 'success');
        
        // Refresh data
        await refreshDataLight();
        
        // Navigate back
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit review';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    ticket, mode, sabqEntries, currentRecitationRange, mistakes, mistakeCount, atkees, 
    tajweedIssues, adminComment, homeworkRange, teacherComment, recitationRange, 
    reviewNotes, submitTicket, refreshDataLight, navigate, showToast
  ]);

  // Get surah name helper
  const getSurahName = useCallback((surahNumber: number): string | undefined => {
    const surah = surahs.find(s => s.id === surahNumber);
    return surah?.name_arabic || surah?.name_simple;
  }, [surahs]);

  // Memoize mistakes for current page to prevent flickering
  // For admin-sabq mode, use currentMistakes; for teacher-review, use mistakes
  const activeMistakes = useMemo(() => {
    return mode === 'admin-sabq' ? currentMistakes : mistakes;
  }, [mode, currentMistakes, mistakes]);

  const mistakesForPage = useMemo(() => {
    return activeMistakes.filter(m => m.page === mushafPage);
  }, [activeMistakes, mushafPage]);

  const historicalMistakesForPage = useMemo(() => {
    return personalMushafMistakes.filter(m => m.page === mushafPage);
  }, [personalMushafMistakes, mushafPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error || 'Ticket not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          isMobileOpen={isMobileOpen}
          onMobileToggle={() => setIsMobileOpen(!isMobileOpen)}
        />
        
        <main className="flex-1 lg:ml-0">
          {/* Header Bar */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ← Back
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {mode === 'admin-sabq' ? 'Admin Sabq Review' : 'Teacher Ticket Review'}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {ticket.studentName} • {ticket.type?.toUpperCase()} • Page {mushafPage}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  {showSidebar ? 'Hide' : 'Show'} Panel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block animate-spin mr-2">⏳</span>
                      Submitting...
                    </>
                  ) : (
                    'Submit Review'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-4 mt-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex h-[calc(100vh-80px)]">
            {/* Mushaf Area */}
            <div className={`flex-1 overflow-auto bg-white transition-all duration-300 ${showSidebar ? 'mr-0' : ''}`}>
              <div className="p-4">
                {loadingPersonalMushaf && (
                  <div className="text-center py-4 text-sm text-gray-500">
                    Loading student's mistake history...
                  </div>
                )}
                
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  <InteractiveMushaf
                    key={`mushaf-${mushafPage}-${mistakesForPage.length}`}
                    currentPage={mushafPage}
                    onPageChange={(page) => {
                      // Validate page range (1-604) to prevent errors
                      if (page >= 1 && page <= 604) {
                        setMushafPage(page);
                      }
                    }}
                    mistakes={mistakesForPage}
                    historicalMistakes={historicalMistakesForPage}
                    showHistorical={true}
                    onMistakeMark={handleMistakeMark}
                    onVerseDoubleClick={handleVerseDoubleClick}
                    onMistakesWithWords={(mistakesWithWordsData) => {
                      if (!mistakesWithWordsData || mistakesWithWordsData.length === 0) return;
                      
                      setMistakesWithWords(prev => {
                        const newMap = new Map(prev);
                        mistakesWithWordsData.forEach((m: any) => {
                          if (m.wordText && m.id) {
                            newMap.set(m.id, m.wordText);
                          }
                        });
                        return newMap;
                      });
                    }}
                    readOnly={false}
                    mode="marking"
                    studentName={ticket.studentName}
                    enableZoom={true}
                    zoom={mushafZoom}
                    onZoomChange={(zoom) => {
                      // Clamp zoom between 0.8 and 1.4
                      const clampedZoom = Math.max(0.8, Math.min(1.4, zoom));
                      setMushafZoom(clampedZoom);
                    }}
                    showSurahIndexDefault={true}
                  />
                </div>
              </div>
            </div>

            {/* Sidebar */}
            {showSidebar && (
              <div className="w-96 border-l border-gray-200 overflow-y-auto bg-gray-50 p-4 space-y-4">
                {/* Mistake Summary */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Mistake Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Mistakes:</span>
                      <span className="font-semibold text-gray-900">{activeMistakes.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Current Page:</span>
                      <span className="font-semibold text-gray-900">{mistakesForPage.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Historical:</span>
                      <span className="font-semibold text-gray-900">{historicalMistakesForPage.length}</span>
                    </div>
                  </div>
                </div>

                {/* Mistakes List */}
                {activeMistakes.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Mistakes ({activeMistakes.length})</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {activeMistakes.map((mistake, index) => (
                        <div
                          key={mistake.id || index}
                          className="p-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => {
                            if (mistake.page && mistake.page >= 1 && mistake.page <= 604) {
                              setMushafPage(mistake.page);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-xs font-semibold text-gray-900">
                                {mistake.type || 'Unknown'}
                              </div>
                              <div className="text-xs text-gray-600">
                                Page {mistake.page} • Surah {mistake.surah}:{mistake.ayah}
                              </div>
                              {mistake.note && (
                                <div className="text-xs text-gray-500 mt-1 italic">
                                  {mistake.note}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const removeMistake = (prev: MushafMistake[]) => prev.filter(m => m.id !== mistake.id);
                                setMistakes(removeMistake);
                                if (mode === 'admin-sabq') {
                                  setCurrentMistakes(removeMistake);
                                }
                              }}
                              className="text-red-600 hover:text-red-800 text-sm px-2"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comment Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">
                    {mode === 'admin-sabq' ? 'Admin Comment' : 'Teacher Comment'}
                  </h3>
                  <textarea
                    value={mode === 'admin-sabq' ? adminComment : teacherComment}
                    onChange={(e) => {
                      if (mode === 'admin-sabq') {
                        setAdminComment(e.target.value);
                      } else {
                        setTeacherComment(e.target.value);
                      }
                    }}
                    placeholder="Add your comment..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>

                {/* Recitation Range (if selected) */}
                {currentRecitationRange.startAyahNumber > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Recitation Range</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Start: </span>
                        <span className="font-semibold" style={{ fontFamily: 'Amiri, "Scheherazade New", serif', direction: 'rtl' }}>
                          {getSurahName(currentRecitationRange.surahNumber)} {currentRecitationRange.startAyahNumber}
                        </span>
                        {currentRecitationRange.startAyahText && (
                          <div className="text-xs text-gray-600 mt-1" style={{ fontFamily: 'Amiri, "Scheherazade New", serif', direction: 'rtl' }}>
                            {currentRecitationRange.startAyahText}
                          </div>
                        )}
                      </div>
                      {currentRecitationRange.endAyahNumber > 0 && (
                        <div>
                          <span className="text-gray-600">End: </span>
                          <span className="font-semibold" style={{ fontFamily: 'Amiri, "Scheherazade New", serif', direction: 'rtl' }}>
                            {getSurahName(currentRecitationRange.endSurahNumber || currentRecitationRange.surahNumber)} {currentRecitationRange.endAyahNumber}
                          </span>
                          {currentRecitationRange.endAyahText && (
                            <div className="text-xs text-gray-600 mt-1" style={{ fontFamily: 'Amiri, "Scheherazade New", serif', direction: 'rtl' }}>
                              {currentRecitationRange.endAyahText}
                            </div>
                          )}
                        </div>
                      )}
                      {currentRecitationRange.startAyahNumber > 0 && currentRecitationRange.endAyahNumber === 0 && (
                        <div className="text-xs text-blue-600 mt-2">
                          💡 Double-click on another verse to set end ayah
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Admin Sabq Specific Features */}
                {mode === 'admin-sabq' && (
                  <>
                    {/* Mistake Count & Atkees */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h3 className="text-sm font-bold text-gray-900 mb-3">Mistake Count & Atkees</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Mistake Count (1-20 or 'weak')
                          </label>
                          <input
                            type="text"
                            value={mistakeCount || ''}
                            onChange={(e) => {
                              const value = e.target.value.trim();
                              if (value === '' || value === 'weak' || (parseInt(value) >= 1 && parseInt(value) <= 20)) {
                                setMistakeCount(value === '' ? undefined : (value === 'weak' ? 'weak' : parseInt(value) as MistakeCount));
                              }
                            }}
                            placeholder="1-20 or 'weak'"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Atkees (1-20)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={atkees || ''}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (isNaN(value) || (value >= 1 && value <= 20)) {
                                setAtkees(isNaN(value) ? undefined : value);
                              }
                            }}
                            placeholder="1-20"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Tajweed Issues */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h3 className="text-sm font-bold text-gray-900 mb-3">Tajweed Issues</h3>
                      <div className="space-y-2">
                        {[
                          'heavy_letters',
                          'fatha_not_vertical',
                          'kasrah_not_horizontal',
                          'clarity_compromised',
                          'lack_of_confidence',
                          'incorrect_stops',
                          'ghunnah_error',
                          'qalqalah_error',
                          'idgham_error',
                          'madd_error',
                          'tajweed_rule_violation'
                        ].map((type) => {
                          const isSelected = tajweedIssues.some(issue => issue.type === type);
                          return (
                            <label
                              key={type}
                              className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-colors ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setTajweedIssues(prev => {
                                    const existing = prev.find(issue => issue.type === type);
                                    if (existing) {
                                      return prev.filter(issue => issue.type !== type);
                                    } else {
                                      return [...prev, { type: type as TajweedIssueType }];
                                    }
                                  });
                                }}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                              <span className="text-xs font-medium text-gray-900">
                                {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sabq Entries List */}
                    {sabqEntries.length > 0 && (
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="text-sm font-bold text-gray-900 mb-3">
                          Sabq Entries ({sabqEntries.length})
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {sabqEntries.map((entry, index) => (
                            <div
                              key={entry.id || index}
                              className="p-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
                              onClick={() => {
                                setCurrentSabqIndex(index);
                                setCurrentMistakes([...entry.mistakes]);
                                setCurrentRecitationRange({ ...entry.recitationRange });
                                setMistakeCount(entry.mistakeCount);
                                setAtkees(entry.atkees);
                                setTajweedIssues([...entry.tajweedIssues]);
                                setAdminComment(entry.adminComment || '');
                                if (entry.mistakes.length > 0 && entry.mistakes[0].page) {
                                  setMushafPage(entry.mistakes[0].page);
                                }
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="text-xs font-semibold text-gray-900">
                                    Entry {index + 1}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {getSurahName(entry.recitationRange.surahNumber)} {entry.recitationRange.startAyahNumber}-{entry.recitationRange.endAyahNumber}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {entry.mistakes.length} mistakes • {entry.mistakeCount || 'N/A'} count • {entry.atkees || 'N/A'} atkees
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSabqEntries(prev => prev.filter((_, i) => i !== index));
                                  }}
                                  className="text-red-600 hover:text-red-800 text-sm px-2"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            // Save current entry if valid
                            if (currentRecitationRange.startAyahNumber > 0 && currentRecitationRange.endAyahNumber > 0) {
                              const entry = {
                                id: currentSabqIndex !== null ? sabqEntries[currentSabqIndex].id : `sabq-${Date.now()}`,
                                recitationRange: { ...currentRecitationRange },
                                mistakes: [...currentMistakes],
                                mistakeCount: mistakeCount,
                                atkees: atkees,
                                tajweedIssues: [...tajweedIssues],
                                adminComment: adminComment
                              };
                              
                              if (currentSabqIndex !== null) {
                                const updated = [...sabqEntries];
                                updated[currentSabqIndex] = entry;
                                setSabqEntries(updated);
                              } else {
                                setSabqEntries(prev => [...prev, entry]);
                              }
                              
                              // Reset
                              setCurrentSabqIndex(null);
                              setCurrentMistakes([]);
                              setMistakes([]);
                              setCurrentRecitationRange({
                                surahNumber: 1,
                                startAyahNumber: 0,
                                endAyahNumber: 0
                              });
                              setSelectedStartAyah(null);
                              setSelectedEndAyah(null);
                              setMistakeCount(undefined);
                              setAtkees(undefined);
                              setTajweedIssues([]);
                              setAdminComment('');
                            } else {
                              showToast('Please select start and end ayah first', 'warning');
                            }
                          }}
                          className="w-full mt-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          {currentSabqIndex !== null ? 'Update Entry' : 'Add Sabq Entry'}
                        </button>
                      </div>
                    )}

                    {/* Add New Sabq Entry Button */}
                    {currentRecitationRange.startAyahNumber === 0 && (
                      <div className="bg-blue-50 rounded-lg border-2 border-blue-200 p-4">
                        <p className="text-xs text-blue-900 mb-2 font-semibold">
                          💡 Double-click on verses in the Mushaf to select recitation range
                        </p>
                        <p className="text-xs text-blue-700">
                          Select start and end ayah, then mark mistakes and add entry
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Teacher Review Specific Features */}
                {mode === 'teacher-review' && (
                  <>
                    {/* Mistake Count & Atkees */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h3 className="text-sm font-bold text-gray-900 mb-3">Mistake Count & Atkees</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Mistake Count (1-20 or 'weak')
                          </label>
                          <input
                            type="text"
                            value={mistakeCount || ''}
                            onChange={(e) => {
                              const value = e.target.value.trim();
                              if (value === '' || value === 'weak' || (parseInt(value) >= 1 && parseInt(value) <= 20)) {
                                setMistakeCount(value === '' ? undefined : (value === 'weak' ? 'weak' : parseInt(value) as MistakeCount));
                              }
                            }}
                            placeholder="1-20 or 'weak'"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Atkees (1-20)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={atkees || ''}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (isNaN(value) || (value >= 1 && value <= 20)) {
                                setAtkees(isNaN(value) ? undefined : value);
                              }
                            }}
                            placeholder="1-20"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Review Notes */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h3 className="text-sm font-bold text-gray-900 mb-3">Review Notes</h3>
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Add review notes..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
                        rows={3}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MushafReviewPage;
