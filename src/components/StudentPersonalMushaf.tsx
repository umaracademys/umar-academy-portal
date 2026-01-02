import React, { useState, useEffect, useMemo, useRef } from 'react';
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
    } else if (studentId && !propStudentName && !studentName) {
      // Only look up student name if we don't have one yet
      const student = students.find(s => s.id === studentId);
      if (student?.fullName) {
        setStudentName(student.fullName);
      }
    }
  }, [studentId, propStudentName]); // Removed students and studentName from deps to prevent infinite loop

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

      // Prevent reloading if already loaded for this studentId
      if (hasLoadedRef.current) {
        return;
      }

      try {
        isLoadingRef.current = true;
        setLoading(true);
        setError(null);
        const data = await getStudentPersonalMushaf(studentId);
        
        // Update student name from API response if available (only if not already set)
        if (data?.studentName && !studentName && !propStudentName) {
          setStudentName(data.studentName);
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
          
          // Set initial page to first mistake if available
          if (convertedMistakes.length > 0) {
            setCurrentPage(convertedMistakes[0].page);
          }
        } else {
          setMistakes([]);
          setStats({ total: 0, sabq: 0, sabqi: 0, manzil: 0, byType: {} });
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
    hasLoadedRef.current = false;
    isLoadingRef.current = false;
  }, [studentId]);

  // Filter mistakes based on selected filters
  const filteredMistakes = useMemo(() => {
    let filtered = mistakes;
    
    if (filterType !== 'all') {
      filtered = filtered.filter(m => (m as any).workflowStep === filterType);
    }
    
    if (filterPage !== null) {
      filtered = filtered.filter(m => m.page === filterPage);
    }
    
    return filtered;
  }, [mistakes, filterType, filterPage]);

  // Get unique pages with mistakes
  const pagesWithMistakes = useMemo(() => {
    const pages = new Set<number>(mistakes.map(m => m.page));
    return Array.from(pages).sort((a, b) => a - b);
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-gray-600">Loading your personal Mushaf...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-[98vw] sm:max-w-[95vw] lg:max-w-[98vw] max-h-[98vh] sm:max-h-[95vh] overflow-hidden flex flex-col border-2 border-primary/20">
        {/* Header - Enhanced Design */}
        <div className="px-4 sm:px-6 py-4 border-b-2 border-primary/30 bg-gradient-to-r from-primary via-[rgba(var(--color-primary-rgb),0.9)] to-primary shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <span className="text-2xl">📖</span>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
                  {studentName ? `${studentName}'s Personal Mushaf` : 'My Personal Mushaf'}
                </h2>
                <p className="text-white/90 text-xs sm:text-sm mt-0.5 font-medium">
                  {studentName ? `All mistakes from ${studentName}'s recitation reviews` : 'All mistakes from your recitation reviews'}
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl transition-all text-xl font-bold shadow-lg hover:scale-110"
                title="Close"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Statistics Bar - Enhanced Design */}
        <div className="px-3 sm:px-4 py-3 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b-2 border-gray-200 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
            <div className="text-center px-3 py-2 rounded-xl bg-gradient-to-br from-white to-primary/5 border-2 border-primary/30 shadow-md hover:shadow-lg transition-all h-[70px] flex flex-col justify-center group cursor-pointer">
              <div className="text-2xl font-bold text-primary leading-tight group-hover:scale-110 transition-transform">{stats.total}</div>
              <div className="text-[10px] font-bold text-gray-700 uppercase tracking-wide leading-tight mt-1">Total Mistakes</div>
            </div>
            <div className="text-center px-3 py-2 rounded-xl bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 shadow-md hover:shadow-lg transition-all h-[70px] flex flex-col justify-center group cursor-pointer">
              <div className="text-2xl font-bold text-blue-600 leading-tight group-hover:scale-110 transition-transform">{stats.sabq}</div>
              <div className="text-[10px] font-bold text-gray-700 uppercase tracking-wide leading-tight mt-1">Sabq</div>
            </div>
            <div className="text-center px-3 py-2 rounded-xl bg-gradient-to-br from-white to-green-50 border-2 border-green-300 shadow-md hover:shadow-lg transition-all h-[70px] flex flex-col justify-center group cursor-pointer">
              <div className="text-2xl font-bold text-green-600 leading-tight group-hover:scale-110 transition-transform">{stats.sabqi}</div>
              <div className="text-[10px] font-bold text-gray-700 uppercase tracking-wide leading-tight mt-1">Sabqi</div>
            </div>
            <div className="text-center px-3 py-2 rounded-xl bg-gradient-to-br from-white to-purple-50 border-2 border-purple-300 shadow-md hover:shadow-lg transition-all h-[70px] flex flex-col justify-center group cursor-pointer">
              <div className="text-2xl font-bold text-purple-600 leading-tight group-hover:scale-110 transition-transform">{stats.manzil}</div>
              <div className="text-[10px] font-bold text-gray-700 uppercase tracking-wide leading-tight mt-1">Manzil</div>
            </div>
            <div className="text-center px-3 py-2 rounded-xl bg-gradient-to-br from-white to-orange-50 border-2 border-orange-300 shadow-md hover:shadow-lg transition-all h-[70px] flex flex-col justify-center group cursor-pointer">
              <div className="text-2xl font-bold text-orange-600 leading-tight group-hover:scale-110 transition-transform">{pagesWithMistakes.length}</div>
              <div className="text-[10px] font-bold text-gray-700 uppercase tracking-wide leading-tight mt-1">Pages</div>
            </div>
          </div>
        </div>

        {/* Filters - Enhanced Design with Surah Index Toggle */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-white via-gray-50 to-white border-b-2 border-gray-200 flex flex-wrap gap-3 sm:gap-4 items-center shadow-sm">
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm font-bold text-gray-700">Filter by Type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 border-2 border-gray-300 rounded-lg text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white hover:border-primary/50 shadow-sm"
            >
              <option value="all">All Types</option>
              <option value="sabq">Sabq</option>
              <option value="sabqi">Sabqi</option>
              <option value="manzil">Manzil</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm font-bold text-gray-700">Filter by Page:</label>
            <select
              value={filterPage || ''}
              onChange={(e) => setFilterPage(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 border-2 border-gray-300 rounded-lg text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white hover:border-primary/50 shadow-sm"
            >
              <option value="">All Pages</option>
              {pagesWithMistakes.map(page => (
                <option key={page} value={page}>Page {page}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border-2 border-green-300 rounded-lg shadow-sm">
            <span className="text-lg">📑</span>
            <span className="text-xs sm:text-sm font-bold text-green-700">
              Surah Index Active
            </span>
          </div>
          
          <div className="ml-auto px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 rounded-lg border-2 border-primary/30 shadow-sm">
            <span className="text-xs sm:text-sm font-bold text-primary">
              Showing <span className="font-extrabold text-lg">{filteredMistakes.length}</span> of <span className="font-extrabold text-lg">{stats.total}</span> mistakes
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Content - Always show Mushaf with surah index */}
        <div className="flex-1 overflow-y-auto bg-gray-50" style={{ padding: '0', position: 'relative' }}>
          <div className="w-full h-full p-2 sm:p-4 lg:p-6" style={{ position: 'relative', minHeight: '500px' }}>
            <div className="w-full h-full max-w-full">
              <InteractiveMushaf
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                mistakes={mistakes.length > 0 ? filteredMistakes.filter(m => m.page === currentPage) : []}
                historicalMistakes={mistakes.length > 0 ? mistakes.filter(m => m.page === currentPage && !filteredMistakes.includes(m)) : []}
                onMistakeMark={isStudent ? undefined : handleMistakeMark}
                readOnly={isStudent}
                mode={isStudent ? "viewing" : "marking"}
                showHistorical={true}
                showSurahIndexDefault={true}
                studentName={studentName}
              />
            </div>
          </div>
        </div>

        {/* Mistake List Footer (if mistakes exist) - Enhanced Design */}
        {filteredMistakes.length > 0 && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-t-2 border-gray-200 shadow-lg">
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              <h3 className="text-sm sm:text-base font-bold text-primary mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {filterDate ? `Mistakes on ${new Date(filterDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}` : 'All Mistakes'} ({filteredMistakes.length})
                {filterDate && (
                  <button
                    onClick={() => setFilterDate(null)}
                    className="ml-2 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded text-gray-700 transition-colors"
                  >
                    Clear Date Filter
                  </button>
                )}
              </h3>
              <div className="space-y-2">
                {filteredMistakes
                  .sort((a, b) => {
                    // Sort by date (newest first), then by page
                    const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                    const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                    if (dateB !== dateA) return dateB - dateA;
                    return a.page - b.page;
                  })
                  .map((mistake) => {
                    const mistakeDate = mistake.timestamp ? new Date(mistake.timestamp) : null;
                    const formattedDate = mistakeDate ? mistakeDate.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Unknown date';
                    
                    return (
                      <div
                        key={mistake.id}
                        className="flex items-start gap-2 p-3 bg-white rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg hover:border-primary/40 transition-all hover:scale-[1.02]"
                      >
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-3 py-1 rounded-full text-white text-xs font-bold shadow-md ${
                              (mistake as any).workflowStep === 'sabq' ? 'bg-blue-500' :
                              (mistake as any).workflowStep === 'sabqi' ? 'bg-green-500' :
                              (mistake as any).workflowStep === 'manzil' ? 'bg-purple-500' : 'bg-gray-500'
                            }`}>
                              {(mistake as any).workflowStep?.toUpperCase() || 'N/A'}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-bold shadow-md">
                              {mistake.type}
                            </span>
                            <span className="text-gray-500 text-xs sm:text-sm font-semibold">
                              Page {mistake.page} • Surah {mistake.surah}:{mistake.ayah}
                            </span>
                          </div>
                          {mistake.note && (
                            <p className="text-gray-700 text-xs sm:text-sm italic font-medium">"{mistake.note}"</p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{formattedDate}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentPersonalMushaf;

