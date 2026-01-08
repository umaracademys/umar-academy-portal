import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { MushafMistake } from '@umar-academy/mushaf';
import Card from './Card';

interface StudentPersonalMushafProps {
  onClose?: () => void;
  studentId?: string; // Optional: can be passed directly
  studentName?: string; // Optional: student name for display
}

const StudentPersonalMushaf: React.FC<StudentPersonalMushafProps> = ({ onClose, studentId: propStudentId, studentName: propStudentName }) => {
  const { getStudentPersonalMushaf, addMistakeToPersonalMushaf } = useBackendData();
  const { user } = useAuth();
  const { getStudentByEmail, students, teachers, admins } = useData();
  const [studentName, setStudentName] = useState<string>(propStudentName || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [mistakes, setMistakes] = useState<MushafMistake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'sabq' | 'sabqi' | 'manzil'>('all');
  const [filterPage, setFilterPage] = useState<number | null>(null);
  const [filterDate, setFilterDate] = useState<string | null>(null); // Filter by date (YYYY-MM-DD format)
  const [filterRecency, setFilterRecency] = useState<'all' | 'today' | 'recent' | 'historical'>('all'); // Quick recency filter
  const [isFullscreen, setIsFullscreen] = useState(false); // Fullscreen mode toggle
  const [showMistakeList, setShowMistakeList] = useState(true); // Toggle mistake list visibility
  const [expandedRecencyGroups, setExpandedRecencyGroups] = useState<Set<string>>(new Set(['today', 'recent'])); // Expanded groups by default
  const [showSurahIndex, setShowSurahIndex] = useState(false); // Surah index visibility
  const [isMobile, setIsMobile] = useState(false); // Detect mobile device
  const [stats, setStats] = useState({
    total: 0,
    sabq: 0,
    sabqi: 0,
    manzil: 0,
    byType: {} as Record<string, number>
  });
  
  // Ref to prevent concurrent loads
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const previousStudentIdRef = useRef<string>(''); // Track previous student ID to prevent unnecessary page resets

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get current student ID from props, user context, or student lookup
  const studentId = useMemo(() => {
    if (propStudentId) return propStudentId;
    
    // Try to get from student lookup
    if (user?.email) {
      const currentStudent = getStudentByEmail(user.email);
      if (currentStudent?.id) return currentStudent.id;
    }
    
    // Fallback to user ID
    return user?.id || '';
  }, [propStudentId, user?.id, user?.email]); // Removed getStudentByEmail to prevent infinite loop

  // Get student name from students list if not provided (only once)
  useEffect(() => {
    if (propStudentName && propStudentName !== studentName) {
      setStudentName(propStudentName);
    } else if (studentId && !studentName) {
      // Look up student name from students list
      const student = students.find(s => s.id === studentId || (s as any)._id === studentId);
      if (student?.fullName) {
        setStudentName(student.fullName);
      }
    }
  }, [studentId, propStudentName, students]); // Include students to check when it loads

  useEffect(() => {
    const loadPersonalMushaf = async () => {
      // Prevent concurrent loads
      if (isLoadingRef.current) {
        return;
      }
      
      if (!studentId) {
        setError('Student ID not found');
        setLoading(false);
        return;
      }

      // Prevent reloading if already loaded for this studentId (unless it's a different student)
      if (hasLoadedRef.current && previousStudentIdRef.current === studentId) {
        return;
      }

      try {
        isLoadingRef.current = true;
        setLoading(true);
        setError(null);
        const data = await getStudentPersonalMushaf(studentId);
        
        // Update student name from API response (prioritize API response)
        if (data?.studentName && data.studentName.trim() !== '' && data.studentName !== 'Unknown Student') {
          setStudentName(data.studentName);
        } else if (!studentName && !propStudentName) {
          // Fallback: try to get from students list if API didn't return name
          const student = students.find(s => s.id === studentId || (s as any)._id === studentId);
          if (student?.fullName) {
            setStudentName(student.fullName);
          }
        }
        
        if (data && data.mistakes) {
          // Convert to MushafMistake format
          const convertedMistakes: MushafMistake[] = data.mistakes.map((m: any) => {
            // Process audioUrl to ensure it's a full URL
            let audioUrl = m.audioUrl;
            if (audioUrl && !audioUrl.startsWith('http')) {
              // Fix URLs that incorrectly include /api/uploads
              audioUrl = audioUrl.replace('/api/uploads/', '/uploads/');
              
              // Get base URL
              let baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
              // Remove /api from base URL if present (uploads are served from root, not /api)
              if (baseUrl.endsWith('/api')) {
                baseUrl = baseUrl.replace('/api', '');
              }
              // Ensure base URL doesn't end with /
              baseUrl = baseUrl.replace(/\/$/, '');
              // Ensure audio URL starts with /
              const audioPath = audioUrl.startsWith('/') ? audioUrl : `/${audioUrl}`;
              audioUrl = `${baseUrl}${audioPath}`;
            }
            
            return {
              id: m.id,
              type: m.type,
              page: m.page,
              surah: m.surah,
              ayah: m.ayah,
              wordIndex: m.wordIndex,
              letterIndex: m.letterIndex,
              position: m.position,
              note: m.note,
              audioUrl: audioUrl,
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
              workflowStep: m.workflowStep // Include workflow step for filtering
            } as MushafMistake & { workflowStep?: string };
          });
          
          setMistakes(convertedMistakes);
          
          // Calculate statistics
          const statsData = {
            total: convertedMistakes.length,
            sabq: convertedMistakes.filter(m => (m as any).workflowStep === 'sabq').length,
            sabqi: convertedMistakes.filter(m => (m as any).workflowStep === 'sabqi').length,
            manzil: convertedMistakes.filter(m => (m as any).workflowStep === 'manzil').length,
            byType: {} as Record<string, number>
          };
          
          convertedMistakes.forEach(m => {
            statsData.byType[m.type] = (statsData.byType[m.type] || 0) + 1;
          });
          
          setStats(statsData);
          
          // Set initial page ONLY when a different student is selected (not on data refresh)
          if (previousStudentIdRef.current !== studentId && convertedMistakes.length > 0) {
            setCurrentPage(convertedMistakes[0].page);
          }
          
          // Update ref to track current student
          previousStudentIdRef.current = studentId;
        } else {
          setMistakes([]);
          setStats({ total: 0, sabq: 0, sabqi: 0, manzil: 0, byType: {} });
          previousStudentIdRef.current = studentId;
        }
      } catch (err) {
        console.error('Error loading personal Mushaf:', err);
        setError(err instanceof Error ? err.message : 'Failed to load personal Mushaf');
      } finally {
        isLoadingRef.current = false;
        hasLoadedRef.current = true;
        setLoading(false);
      }
    };

    loadPersonalMushaf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]); // Only depend on studentId to prevent infinite loops
  
  // Reset loading ref when studentId changes
  useEffect(() => {
    if (previousStudentIdRef.current !== studentId) {
      hasLoadedRef.current = false;
      isLoadingRef.current = false;
    }
  }, [studentId]);

  // Get unique dates from mistakes
  const mistakeDates = useMemo(() => {
    const dates = new Set<string>();
    mistakes.forEach(m => {
      if (m.timestamp) {
        const date = new Date(m.timestamp);
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        dates.add(dateStr);
      }
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)
  }, [mistakes]);

  // Enhanced mistake classification for display (must be defined before filteredMistakes)
  const getMistakeRecencyClass = useCallback((mistake: MushafMistake): 'recent' | 'older' | 'old' => {
    if (!mistake.timestamp) return 'old';
    const mistakeDate = new Date(mistake.timestamp);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (mistakeDate >= sevenDaysAgo) return 'recent';
    if (mistakeDate >= thirtyDaysAgo) return 'older';
    return 'old';
  }, []);

  // Filter mistakes based on selected filters
  const filteredMistakes = useMemo(() => {
    let filtered = mistakes;
    
    if (filterType !== 'all') {
      filtered = filtered.filter(m => (m as any).workflowStep === filterType);
    }
    
    if (filterPage !== null) {
      filtered = filtered.filter(m => m.page === filterPage);
    }
    
    // Filter by date if selected
    if (filterDate) {
      filtered = filtered.filter(m => {
        if (!m.timestamp) return false;
        const mistakeDate = new Date(m.timestamp).toISOString().split('T')[0];
        return mistakeDate === filterDate;
      });
    }
    
    // Filter by recency (quick filter)
    if (filterRecency !== 'all') {
      filtered = filtered.filter(m => {
        const recency = getMistakeRecencyClass(m);
        if (filterRecency === 'today') {
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (!m.timestamp) return false;
          const mistakeDate = new Date(m.timestamp);
          const mistakeDay = new Date(mistakeDate.getFullYear(), mistakeDate.getMonth(), mistakeDate.getDate());
          return mistakeDay.getTime() === today.getTime();
        } else if (filterRecency === 'recent') {
          const now = new Date();
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (!m.timestamp) return false;
          const mistakeDate = new Date(m.timestamp);
          return mistakeDate >= sevenDaysAgo && recency === 'recent';
        } else if (filterRecency === 'historical') {
          return recency === 'older' || recency === 'old';
        }
        return true;
      });
    }
    
    return filtered;
  }, [mistakes, filterType, filterPage, filterDate, filterRecency, getMistakeRecencyClass]);

  // Get unique pages with mistakes
  const pagesWithMistakes = useMemo(() => {
    const pages = new Set<number>(mistakes.map(m => m.page));
    return Array.from(pages).sort((a, b) => a - b);
  }, [mistakes]);

  // Categorize mistakes by recency (for visual distinction)
  const categorizeMistakesByRecency = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      recent: mistakes.filter(m => {
        if (!m.timestamp) return false;
        const mistakeDate = new Date(m.timestamp);
        return mistakeDate >= sevenDaysAgo;
      }),
      older: mistakes.filter(m => {
        if (!m.timestamp) return false;
        const mistakeDate = new Date(m.timestamp);
        return mistakeDate >= thirtyDaysAgo && mistakeDate < sevenDaysAgo;
      }),
      old: mistakes.filter(m => {
        if (!m.timestamp) return true;
        const mistakeDate = new Date(m.timestamp);
        return mistakeDate < thirtyDaysAgo;
      })
    };
  }, [mistakes]);

  // Check if current user is a student (should be read-only)
  const isStudent = useMemo(() => {
    if (!user) return true; // Default to read-only if no user
    return user.role === 'student';
  }, [user]);

  // Get current user info for marking mistakes (only for teachers/admins)
  const getCurrentUserInfo = useMemo(() => {
    if (!user || isStudent) return { id: '', name: '' };
    
    // Check if user is a teacher
    const teacher = teachers.find(t => t.id === user.id || t.email === user.email);
    if (teacher) {
      return { id: teacher.id, name: teacher.fullName || 'Teacher' };
    }
    
    // Check if user is an admin
    const admin = admins.find(a => a.id === user.id || a.email === user.email);
    if (admin) {
      return { id: admin.id, name: admin.fullName || 'Admin' };
    }
    
    return { id: user.id || '', name: user.name || user.email || 'User' };
  }, [user, teachers, admins, isStudent]);

  // Handle mistake marking
  const handleMistakeMark = async (mistake: Omit<MushafMistake, 'id' | 'timestamp'>) => {
    if (!studentId) {
      alert('Student ID not found');
      return;
    }

    try {
      const userInfo = getCurrentUserInfo;
      const result = await addMistakeToPersonalMushaf(
        studentId,
        mistake,
        userInfo.id,
        userInfo.name
      );

      if (result && result.success) {
        // Reload personal mushaf to show the new mistake
        const data = await getStudentPersonalMushaf(studentId);
        
        if (data && data.mistakes) {
          const convertedMistakes: MushafMistake[] = data.mistakes.map((m: any) => {
            // Process audioUrl to ensure it's a full URL
            let audioUrl = m.audioUrl;
            if (audioUrl && !audioUrl.startsWith('http')) {
              // Fix URLs that incorrectly include /api/uploads
              audioUrl = audioUrl.replace('/api/uploads/', '/uploads/');
              
              // Get base URL
              let baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
              // Remove /api from base URL if present (uploads are served from root, not /api)
              if (baseUrl.endsWith('/api')) {
                baseUrl = baseUrl.replace('/api', '');
              }
              // Ensure base URL doesn't end with /
              baseUrl = baseUrl.replace(/\/$/, '');
              // Ensure audio URL starts with /
              const audioPath = audioUrl.startsWith('/') ? audioUrl : `/${audioUrl}`;
              audioUrl = `${baseUrl}${audioPath}`;
            }
            
            return {
              id: m.id,
              type: m.type,
              page: m.page,
              surah: m.surah,
              ayah: m.ayah,
              wordIndex: m.wordIndex,
              letterIndex: m.letterIndex,
              position: m.position,
              note: m.note,
              audioUrl: audioUrl,
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
              workflowStep: m.workflowStep
            } as MushafMistake & { workflowStep?: string };
          });
          
          setMistakes(convertedMistakes);
          
          // Update statistics
          const statsData = {
            total: convertedMistakes.length,
            sabq: convertedMistakes.filter(m => (m as any).workflowStep === 'sabq').length,
            sabqi: convertedMistakes.filter(m => (m as any).workflowStep === 'sabqi').length,
            manzil: convertedMistakes.filter(m => (m as any).workflowStep === 'manzil').length,
            byType: {} as Record<string, number>
          };
          
          convertedMistakes.forEach(m => {
            statsData.byType[m.type] = (statsData.byType[m.type] || 0) + 1;
          });
          
          setStats(statsData);
          
          // Navigate to the page with the new mistake
          setCurrentPage(mistake.page);
        }
      }
    } catch (err) {
      console.error('Error saving mistake:', err);
      alert(err instanceof Error ? err.message : 'Failed to save mistake');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 max-w-[90vw] sm:max-w-md">
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-3 sm:border-b-2 border-primary"></div>
            <p className="text-gray-600 text-sm sm:text-base text-center">Loading your personal Mushaf...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-50 ${isFullscreen ? 'p-0' : 'p-1 sm:p-2 md:p-4'} overflow-y-auto`}>
      <div className={`bg-white ${isFullscreen ? 'rounded-none' : 'rounded-lg sm:rounded-xl md:rounded-2xl lg:rounded-3xl'} shadow-2xl w-full ${isFullscreen ? 'max-w-full h-full' : 'max-w-full sm:max-w-[98vw] md:max-w-[95vw] lg:max-w-[98vw] max-h-full sm:max-h-[98vh] md:max-h-[95vh]'} overflow-hidden flex flex-col border border-primary/20 sm:border-2`}>
        {/* Header - Enhanced Design */}
        {!isFullscreen && (
          <div className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4 border-b border-primary/30 sm:border-b-2 bg-gradient-to-r from-primary via-[rgba(var(--color-primary-rgb),0.9)] to-primary shadow-lg">
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 md:gap-3">
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-1 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-12 rounded-md sm:rounded-lg md:rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg flex-shrink-0">
                  <span className="text-base sm:text-lg md:text-xl lg:text-2xl">📖</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-white drop-shadow-lg truncate leading-tight">
                    {studentName ? `${studentName}'s Personal Mushaf` : 'My Personal Mushaf'}
                  </h2>
                  <p className="text-white/90 text-[9px] sm:text-[10px] md:text-xs lg:text-sm mt-0.5 font-medium truncate leading-tight">
                    {studentName ? `All mistakes from ${studentName}'s recitation reviews` : 'All mistakes from your recitation reviews'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0">
                {/* Surah Index Toggle - Mobile First */}
                <button
                  onClick={() => setShowSurahIndex(!showSurahIndex)}
                  className={`px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-md sm:rounded-lg transition-all text-[10px] sm:text-xs md:text-sm font-semibold shadow-lg hover:scale-105 flex items-center gap-1 touch-manipulation ${showSurahIndex ? 'bg-white/30 ring-2 ring-white/50' : ''}`}
                  title="Surah/Juz Index"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="hidden sm:inline">Index</span>
                </button>
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="px-1.5 sm:px-2 md:px-3 lg:px-4 py-1 sm:py-1.5 md:py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-md sm:rounded-lg transition-all text-[10px] sm:text-xs md:text-sm font-semibold shadow-lg hover:scale-105 flex items-center gap-0.5 sm:gap-1 md:gap-2 touch-manipulation"
                  title="Fullscreen Mode"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  <span className="hidden md:inline">Fullscreen</span>
                </button>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-md sm:rounded-lg md:rounded-xl transition-all text-base sm:text-lg md:text-xl font-bold shadow-lg hover:scale-110 touch-manipulation"
                    title="Close"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Header - Minimal */}
        {isFullscreen && (
          <div className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-black/80 backdrop-blur-sm border-b border-white/20 flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-1 min-w-0">
              <h2 className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-white truncate">
                {studentName ? `${studentName}'s Personal Mushaf` : 'My Personal Mushaf'}
              </h2>
              <div className="hidden md:flex items-center gap-1 sm:gap-1.5 md:gap-2 text-[9px] sm:text-[10px] md:text-xs text-white/70">
                <span className="px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 bg-red-500/20 rounded text-[9px] sm:text-[10px]">Recent: {categorizeMistakesByRecency.recent.length}</span>
                <span className="px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 bg-orange-500/20 rounded text-[9px] sm:text-[10px]">Older: {categorizeMistakesByRecency.older.length}</span>
                <span className="px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 bg-gray-500/20 rounded text-[9px] sm:text-[10px]">Old: {categorizeMistakesByRecency.old.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0">
              <button
                onClick={() => setShowMistakeList(!showMistakeList)}
                className="px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-md sm:rounded-lg text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-semibold transition-all touch-manipulation"
                title={showMistakeList ? "Hide Mistake List" : "Show Mistake List"}
              >
                {showMistakeList ? 'Hide' : 'Show'}
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-md sm:rounded-lg text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-semibold transition-all flex items-center gap-0.5 sm:gap-1 md:gap-2 touch-manipulation"
                title="Exit Fullscreen"
              >
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="hidden md:inline">Exit</span>
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-md sm:rounded-lg transition-all text-sm sm:text-base md:text-lg font-bold touch-manipulation"
                  title="Close"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        {/* Statistics Bar - Mobile: Compact Horizontal, Desktop: Cards */}
        {!isFullscreen && (
          <>
            {/* Mobile: Compact Horizontal Stats Bar */}
            {isMobile ? (
              <div className="px-3 py-2 bg-white border-b border-gray-200 shadow-sm">
                <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-md border border-primary/20 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-600">Total:</span>
                    <span className="text-sm font-bold text-primary">{stats.total}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-md border border-blue-200 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-600">Sabq:</span>
                    <span className="text-sm font-bold text-blue-600">{stats.sabq}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-md border border-green-200 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-600">Sabqi:</span>
                    <span className="text-sm font-bold text-green-600">{stats.sabqi}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 rounded-md border border-purple-200 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-600">Manzil:</span>
                    <span className="text-sm font-bold text-purple-600">{stats.manzil}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-50 rounded-md border border-orange-200 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-600">Pages:</span>
                    <span className="text-sm font-bold text-orange-600">{pagesWithMistakes.length}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Desktop: Traditional Cards */
              <div className="px-1.5 sm:px-2 md:px-3 lg:px-4 py-1.5 sm:py-2 md:py-3 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-200 sm:border-b-2 shadow-sm">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1 sm:gap-1.5 md:gap-2 lg:gap-3">
                  <div className="text-center px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg md:rounded-xl bg-gradient-to-br from-white to-primary/5 border border-primary/30 sm:border-2 shadow-sm sm:shadow-md hover:shadow-lg transition-all h-[45px] sm:h-[50px] md:h-[60px] lg:h-[70px] flex flex-col justify-center group cursor-pointer touch-manipulation">
                    <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-primary leading-tight group-hover:scale-110 transition-transform">{stats.total}</div>
                    <div className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-gray-700 uppercase tracking-wide leading-tight mt-0.5 sm:mt-1">Total</div>
                  </div>
                  <div className="text-center px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg md:rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-300 sm:border-2 shadow-sm sm:shadow-md hover:shadow-lg transition-all h-[45px] sm:h-[50px] md:h-[60px] lg:h-[70px] flex flex-col justify-center group cursor-pointer touch-manipulation">
                    <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-blue-600 leading-tight group-hover:scale-110 transition-transform">{stats.sabq}</div>
                    <div className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-gray-700 uppercase tracking-wide leading-tight mt-0.5 sm:mt-1">Sabq</div>
                  </div>
                  <div className="text-center px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg md:rounded-xl bg-gradient-to-br from-white to-green-50 border border-green-300 sm:border-2 shadow-sm sm:shadow-md hover:shadow-lg transition-all h-[45px] sm:h-[50px] md:h-[60px] lg:h-[70px] flex flex-col justify-center group cursor-pointer touch-manipulation">
                    <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-green-600 leading-tight group-hover:scale-110 transition-transform">{stats.sabqi}</div>
                    <div className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-gray-700 uppercase tracking-wide leading-tight mt-0.5 sm:mt-1">Sabqi</div>
                  </div>
                  <div className="text-center px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg md:rounded-xl bg-gradient-to-br from-white to-purple-50 border border-purple-300 sm:border-2 shadow-sm sm:shadow-md hover:shadow-lg transition-all h-[45px] sm:h-[50px] md:h-[60px] lg:h-[70px] flex flex-col justify-center group cursor-pointer touch-manipulation">
                    <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-purple-600 leading-tight group-hover:scale-110 transition-transform">{stats.manzil}</div>
                    <div className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-gray-700 uppercase tracking-wide leading-tight mt-0.5 sm:mt-1">Manzil</div>
                  </div>
                  <div className="text-center px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg md:rounded-xl bg-gradient-to-br from-white to-orange-50 border border-orange-300 sm:border-2 shadow-sm sm:shadow-md hover:shadow-lg transition-all h-[45px] sm:h-[50px] md:h-[60px] lg:h-[70px] flex flex-col justify-center group cursor-pointer touch-manipulation col-span-2 sm:col-span-1">
                    <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-orange-600 leading-tight group-hover:scale-110 transition-transform">{pagesWithMistakes.length}</div>
                    <div className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-gray-700 uppercase tracking-wide leading-tight mt-0.5 sm:mt-1">Pages</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Filters - Ultra Compact Design */}
        {!isFullscreen && (
        <div className="px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 md:py-2 bg-white border-b border-gray-200 shadow-sm overflow-x-auto">
          {/* Single Row - All Filters Combined */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 md:gap-2 min-w-max">
            {/* Quick Filters */}
            {(['all', 'today', 'recent', 'historical'] as const).map((recency) => {
              const isActive = filterRecency === recency;
              const count = recency === 'all' ? mistakes.length :
                           recency === 'today' ? mistakes.filter(m => {
                             const now = new Date();
                             const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                             if (!m.timestamp) return false;
                             const mistakeDate = new Date(m.timestamp);
                             const mistakeDay = new Date(mistakeDate.getFullYear(), mistakeDate.getMonth(), mistakeDate.getDate());
                             return mistakeDay.getTime() === today.getTime();
                           }).length :
                           recency === 'recent' ? categorizeMistakesByRecency.recent.length :
                           categorizeMistakesByRecency.older.length + categorizeMistakesByRecency.old.length;
              
              const colors = {
                all: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
                today: 'bg-red-100 hover:bg-red-200 text-red-700',
                recent: 'bg-orange-100 hover:bg-orange-200 text-orange-700',
                historical: 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              };
              
              const activeColors = {
                all: 'bg-gray-200 text-gray-900 ring-1 ring-gray-300',
                today: 'bg-red-200 text-red-900 ring-1 ring-red-300',
                recent: 'bg-orange-200 text-orange-900 ring-1 ring-orange-300',
                historical: 'bg-gray-200 text-gray-900 ring-1 ring-gray-300'
              };
              
              return (
                <button
                  key={recency}
                  onClick={() => setFilterRecency(recency)}
                  className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[9px] sm:text-[10px] font-bold transition-all ${
                    isActive ? activeColors[recency] : colors[recency]
                  }`}
                >
                  {recency === 'all' ? 'All' : recency === 'today' ? 'Today' : recency === 'recent' ? 'Recent' : 'Old'}
                  <span className={`ml-1 px-1 py-0.5 rounded ${isActive ? 'bg-white/80' : 'bg-white/60'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
            
            {/* Separator */}
            <div className="h-4 w-px bg-gray-300 mx-0.5" />
            
            {/* Date Filter */}
            <select
              value={filterDate || ''}
              onChange={(e) => {
                setFilterDate(e.target.value || null);
                if (e.target.value) setFilterRecency('all');
              }}
              className="px-1.5 sm:px-2 py-0.5 sm:py-1 border border-gray-300 rounded-md text-[9px] sm:text-[10px] font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-white hover:border-primary/50"
            >
              <option value="">All Dates</option>
              {mistakeDates.map(date => {
                const dateObj = new Date(date);
                const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return (
                  <option key={date} value={date}>{formattedDate}</option>
                );
              })}
            </select>
            
            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-1.5 sm:px-2 py-0.5 sm:py-1 border border-gray-300 rounded-md text-[9px] sm:text-[10px] font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-white hover:border-primary/50"
            >
              <option value="all">All</option>
              <option value="sabq">Sabq</option>
              <option value="sabqi">Sabqi</option>
              <option value="manzil">Manzil</option>
            </select>
            
            {/* Page Filter */}
            <select
              value={filterPage || ''}
              onChange={(e) => setFilterPage(e.target.value ? parseInt(e.target.value) : null)}
              className="px-1.5 sm:px-2 py-0.5 sm:py-1 border border-gray-300 rounded-md text-[9px] sm:text-[10px] font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-white hover:border-primary/50"
            >
              <option value="">All Pages</option>
              {pagesWithMistakes.map(page => (
                <option key={page} value={page}>P{page}</option>
              ))}
            </select>
            
            {/* Mistake Count - Compact */}
            <div className="ml-auto px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary/10 rounded-md border border-primary/30">
              <span className="text-[9px] sm:text-[10px] font-bold text-primary">
                <span className="font-extrabold">{filteredMistakes.length}</span>/<span className="font-extrabold">{stats.total}</span>
              </span>
            </div>
          </div>
        </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 bg-red-50 border-b border-red-200">
            <p className="text-xs sm:text-sm text-red-700 break-words">{error}</p>
          </div>
        )}

        {/* Professional Mobile Navigation - Swipe-Based */}
        <div className="sticky top-0 z-40 bg-white border-b border-primary/20 sm:border-b-2 shadow-md">
          {/* Mobile: Professional Page Selector with Swipe Hint */}
          {isMobile ? (
            <div className="px-3 py-3 flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="604"
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= 604) {
                      setCurrentPage(page);
                    }
                  }}
                  className="w-20 px-3 py-2 text-center text-base font-bold border-2 border-primary/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white shadow-sm touch-manipulation"
                />
                <span className="text-sm font-semibold text-gray-600">/ 604</span>
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Swipe right</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <span>Swipe left</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            /* Desktop: Traditional Navigation */
            <div className="px-1.5 sm:px-2 md:px-3 lg:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-1 sm:gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                className="px-1.5 sm:px-2 md:px-3 lg:px-4 py-1 sm:py-1.5 md:py-2 bg-primary text-white rounded-md sm:rounded-lg text-[10px] sm:text-xs md:text-sm font-bold transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center gap-0.5 sm:gap-1 md:gap-2 flex-shrink-0 touch-manipulation min-h-[36px] sm:min-h-[40px]"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden md:inline">Previous</span>
                <span className="hidden sm:inline md:hidden">Prev</span>
              </button>
              
              <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-1 justify-center min-w-0">
                <input
                  type="number"
                  min="1"
                  max="604"
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= 604) {
                      setCurrentPage(page);
                    }
                  }}
                  className="w-14 sm:w-16 md:w-20 px-1.5 sm:px-2 py-1 sm:py-1.5 text-center text-xs sm:text-sm md:text-base font-bold border border-primary/30 sm:border-2 rounded-md sm:rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-primary focus:border-primary bg-white touch-manipulation"
                />
                <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-600">/ 604</span>
                <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 hidden sm:inline">Page</span>
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(604, prev + 1))}
                disabled={currentPage >= 604}
                className="px-1.5 sm:px-2 md:px-3 lg:px-4 py-1 sm:py-1.5 md:py-2 bg-primary text-white rounded-md sm:rounded-lg text-[10px] sm:text-xs md:text-sm font-bold transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center gap-0.5 sm:gap-1 md:gap-2 flex-shrink-0 touch-manipulation min-h-[36px] sm:min-h-[40px]"
              >
                <span className="hidden md:inline">Next</span>
                <span className="hidden sm:inline md:hidden">Next</span>
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Content - Always show Mushaf with surah index */}
        <div className={`flex-1 overflow-y-auto bg-gray-50 ${isFullscreen ? 'h-full' : ''}`} style={{ padding: '0', position: 'relative' }}>
          <div className={`w-full h-full ${isFullscreen ? 'p-0' : 'p-1 sm:p-2 md:p-4 lg:p-6'}`} style={{ position: 'relative', minHeight: isFullscreen ? '100%' : '400px' }}>
            <div className="w-full h-full max-w-full">
              <InteractiveMushaf
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                mistakes={mistakes.length > 0 ? filteredMistakes.filter(m => {
                  const recency = getMistakeRecencyClass(m);
                  return m.page === currentPage && recency === 'recent';
                }) : []}
                historicalMistakes={mistakes.length > 0 ? mistakes.filter(m => {
                  const recency = getMistakeRecencyClass(m);
                  return m.page === currentPage && (recency === 'older' || recency === 'old');
                }) : []}
                onMistakeMark={isStudent ? undefined : handleMistakeMark}
                readOnly={isStudent}
                mode={isStudent ? "viewing" : "marking"}
                showHistorical={true}
                showSurahIndexDefault={showSurahIndex}
                studentName={studentName}
              />
            </div>
          </div>
        </div>

        {/* Professional Mistake Navigator - Mobile */}
        {isMobile && filteredMistakes.length > 0 && (() => {
          // Find current mistake index based on page
          const currentMistakeIndex = filteredMistakes.findIndex(m => m.page === currentPage);
          const hasPrev = currentMistakeIndex > 0;
          const hasNext = currentMistakeIndex < filteredMistakes.length - 1;
          const currentPosition = currentMistakeIndex >= 0 ? currentMistakeIndex + 1 : 0;
          
          return (
            <div className="sticky bottom-0 z-50 bg-white border-t-2 border-primary/30 shadow-lg px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    if (hasPrev) {
                      const prevMistake = filteredMistakes[currentMistakeIndex - 1];
                      setCurrentPage(prevMistake.page);
                      setFilterPage(prevMistake.page);
                    }
                  }}
                  disabled={!hasPrev}
                  className="px-3 py-2 bg-primary/10 hover:bg-primary/20 active:bg-primary/30 text-primary rounded-lg font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation flex items-center gap-1.5 min-h-[44px]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden xs:inline">Prev</span>
                </button>
                <div className="flex-1 text-center px-2">
                  <div className="text-sm font-bold text-primary">
                    {currentPosition > 0 ? `${currentPosition}` : '—'} / {filteredMistakes.length}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Mistakes</div>
                </div>
                <button
                  onClick={() => {
                    if (hasNext) {
                      const nextMistake = filteredMistakes[currentMistakeIndex + 1];
                      setCurrentPage(nextMistake.page);
                      setFilterPage(nextMistake.page);
                    }
                  }}
                  disabled={!hasNext}
                  className="px-3 py-2 bg-primary/10 hover:bg-primary/20 active:bg-primary/30 text-primary rounded-lg font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation flex items-center gap-1.5 min-h-[44px]"
                >
                  <span className="hidden xs:inline">Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })()}

        {/* Mistake List Footer (if mistakes exist) - Enhanced Design */}
        {filteredMistakes.length > 0 && (!isFullscreen || showMistakeList) && (
          <div className={`px-1.5 sm:px-2 md:px-3 lg:px-4 py-1.5 sm:py-2 md:py-3 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-t border-gray-200 sm:border-t-2 shadow-lg ${isFullscreen ? 'max-h-[30vh]' : ''} ${isMobile ? 'pb-20' : ''}`}>
            <div className="max-h-40 sm:max-h-48 md:max-h-64 overflow-y-auto custom-scrollbar">
              <h3 className="text-[10px] sm:text-xs md:text-sm lg:text-base font-bold text-primary mb-1.5 sm:mb-2 md:mb-3 flex items-center gap-1 sm:gap-1.5 md:gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="truncate">{filterDate ? `Mistakes on ${new Date(filterDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}` : 'All Mistakes'}</span> ({filteredMistakes.length})
                {filterDate && (
                  <button
                    onClick={() => setFilterDate(null)}
                    className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-gray-200 hover:bg-gray-300 rounded text-gray-700 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </h3>
              
              {/* Group mistakes by recency */}
              {(() => {
                const grouped = {
                  today: [] as MushafMistake[],
                  recent: [] as MushafMistake[],
                  older: [] as MushafMistake[],
                  old: [] as MushafMistake[]
                };
                
                filteredMistakes.forEach(mistake => {
                  const recency = getMistakeRecencyClass(mistake);
                  const now = new Date();
                  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const isToday = mistake.timestamp && new Date(mistake.timestamp) >= today;
                  
                  if (isToday) {
                    grouped.today.push(mistake);
                  } else if (recency === 'recent') {
                    grouped.recent.push(mistake);
                  } else if (recency === 'older') {
                    grouped.older.push(mistake);
                  } else {
                    grouped.old.push(mistake);
                  }
                });
                
                // Sort each group by date (newest first), then by page
                Object.values(grouped).forEach(group => {
                  group.sort((a, b) => {
                    const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                    const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                    if (dateB !== dateA) return dateB - dateA;
                    return a.page - b.page;
                  });
                });
                
                const groups = [
                  { key: 'today', label: '🆕 Today', mistakes: grouped.today, color: 'red', defaultExpanded: true },
                  { key: 'recent', label: '📅 Recent (Last 7 Days)', mistakes: grouped.recent, color: 'orange', defaultExpanded: true },
                  { key: 'older', label: '📆 Older (7-30 Days)', mistakes: grouped.older, color: 'orange', defaultExpanded: false },
                  { key: 'old', label: '📜 Old (30+ Days)', mistakes: grouped.old, color: 'gray', defaultExpanded: false }
                ];
                
                return (
                  <div className="space-y-2 sm:space-y-3">
                    {groups.map(group => {
                      if (group.mistakes.length === 0) return null;
                      
                      const isExpanded = expandedRecencyGroups.has(group.key);
                      const borderColor = group.color === 'red' ? 'border-red-300' : 
                                         group.color === 'orange' ? 'border-orange-300' : 
                                         'border-gray-300';
                      const bgColor = group.color === 'red' ? 'bg-red-50' : 
                                     group.color === 'orange' ? 'bg-orange-50' : 
                                     'bg-gray-50';
                      
                      return (
                        <div key={group.key} className={`rounded-lg sm:rounded-xl border-2 ${borderColor} ${bgColor} overflow-hidden`}>
                          <button
                            onClick={() => {
                              setExpandedRecencyGroups(prev => {
                                const next = new Set(prev);
                                if (next.has(group.key)) {
                                  next.delete(group.key);
                                } else {
                                  next.add(group.key);
                                }
                                return next;
                              });
                            }}
                            className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 flex items-center justify-between hover:bg-white/50 transition-colors"
                          >
                            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-1">
                              <span className="text-sm sm:text-base md:text-lg flex-shrink-0">{group.label.split(' ')[0]}</span>
                              <span className="font-bold text-gray-900 text-xs sm:text-sm md:text-base truncate">{group.label.split(' ').slice(1).join(' ')}</span>
                              <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold flex-shrink-0 ${
                                group.color === 'red' ? 'bg-red-200 text-red-800' :
                                group.color === 'orange' ? 'bg-orange-200 text-orange-800' :
                                'bg-gray-200 text-gray-800'
                              }`}>
                                {group.mistakes.length}
                              </span>
                            </div>
                            <svg 
                              className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-600 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {isExpanded && (
                            <div className="px-2 sm:px-3 md:px-4 pb-2 sm:pb-3 space-y-1.5 sm:space-y-2 bg-white/50">
                              {group.mistakes.map((mistake) => {
                                const mistakeDate = mistake.timestamp ? new Date(mistake.timestamp) : null;
                                const formattedDate = mistakeDate ? mistakeDate.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'Unknown';
                                
                                return (
                                  <div
                                    key={mistake.id}
                                    className="flex items-start gap-2 sm:gap-3 p-2 sm:p-2.5 md:p-3 bg-white rounded-lg border border-gray-200 hover:border-primary/40 hover:shadow-md transition-all group"
                                  >
                                    <div className="flex flex-col gap-1 sm:gap-1.5 flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                        <span className={`px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-white shadow-sm ${
                                          (mistake as any).workflowStep === 'sabq' ? 'bg-blue-500' :
                                          (mistake as any).workflowStep === 'sabqi' ? 'bg-green-500' :
                                          (mistake as any).workflowStep === 'manzil' ? 'bg-purple-500' : 'bg-gray-500'
                                        }`}>
                                          {(mistake as any).workflowStep?.toUpperCase() || 'N/A'}
                                        </span>
                                        <span className="px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 rounded-full bg-primary text-white text-[10px] sm:text-xs font-bold shadow-sm">
                                          {mistake.type}
                                        </span>
                                        <span className="text-gray-600 text-[10px] sm:text-xs md:text-sm font-semibold">
                                          P{mistake.page} • S{mistake.surah}:{mistake.ayah}
                                        </span>
                                      </div>
                                      {mistake.note && (
                                        <p className="text-gray-700 text-[10px] sm:text-xs md:text-sm italic font-medium truncate">"{mistake.note}"</p>
                                      )}
                                      <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                          <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                          {formattedDate}
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setCurrentPage(mistake.page);
                                        setFilterPage(mistake.page);
                                      }}
                                      className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                                      title="Jump to page"
                                    >
                                      Go
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentPersonalMushaf;

