import React, { useState, useEffect, useMemo } from 'react';
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
  const { getStudentPersonalMushaf } = useBackendData();
  const { user } = useAuth();
  const { getStudentByEmail, students } = useData();
  const [studentName, setStudentName] = useState<string>(propStudentName || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [mistakes, setMistakes] = useState<MushafMistake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'sabq' | 'sabqi' | 'manzil'>('all');
  const [filterPage, setFilterPage] = useState<number | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    sabq: 0,
    sabqi: 0,
    manzil: 0,
    byType: {} as Record<string, number>
  });

  // Get current student ID from props, user context, or student lookup
  const studentId = useMemo(() => {
    if (propStudentId) return propStudentId;
    
    // Try to get from student lookup
    const currentStudent = getStudentByEmail(user?.email || '');
    if (currentStudent?.id) return currentStudent.id;
    
    // Fallback to user ID
    return user?.id || '';
  }, [propStudentId, user, getStudentByEmail]);

  // Get student name from students list if not provided
  useEffect(() => {
    if (propStudentName) {
      setStudentName(propStudentName);
    } else if (studentId) {
      const student = students.find(s => s.id === studentId);
      if (student?.fullName) {
        setStudentName(student.fullName);
      }
    }
  }, [studentId, propStudentName, students]);

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
        
        // Update student name from API response if available
        if (data?.studentName && !studentName) {
          setStudentName(data.studentName);
        }
        
        if (data && data.mistakes) {
          // Convert to MushafMistake format
          const convertedMistakes: MushafMistake[] = data.mistakes.map((m: any) => ({
            id: m.id,
            type: m.type,
            page: m.page,
            surah: m.surah,
            ayah: m.ayah,
            wordIndex: m.wordIndex,
            position: m.position,
            note: m.note,
            audioUrl: m.audioUrl,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            workflowStep: m.workflowStep // Include workflow step for filtering
          } as MushafMistake & { workflowStep?: string }));
          
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
        setLoading(false);
      }
    };

    loadPersonalMushaf();
  }, [studentId, getStudentPersonalMushaf]);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.85)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                {studentName ? `${studentName}'s Personal Mushaf` : 'My Personal Mushaf'}
              </h2>
              <p className="text-white/80 text-sm mt-1">
                {studentName ? `All mistakes from ${studentName}'s recitation reviews` : 'All mistakes from your recitation reviews'}
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors text-xl font-bold"
                title="Close"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Statistics Bar */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-xs text-gray-600">Total Mistakes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.sabq}</div>
              <div className="text-xs text-gray-600">Sabq</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.sabqi}</div>
              <div className="text-xs text-gray-600">Sabqi</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.manzil}</div>
              <div className="text-xs text-gray-600">Manzil</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{pagesWithMistakes.length}</div>
              <div className="text-xs text-gray-600">Pages</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 bg-white border-b border-gray-200 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter by Type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Types</option>
              <option value="sabq">Sabq</option>
              <option value="sabqi">Sabqi</option>
              <option value="manzil">Manzil</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter by Page:</label>
            <select
              value={filterPage || ''}
              onChange={(e) => setFilterPage(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Pages</option>
              {pagesWithMistakes.map(page => (
                <option key={page} value={page}>Page {page}</option>
              ))}
            </select>
          </div>
          
          <div className="ml-auto text-sm text-gray-600">
            Showing {filteredMistakes.length} of {stats.total} mistakes
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {mistakes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📖</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Mistakes Yet</h3>
              <p className="text-gray-600">
                Your personal Mushaf will show all mistakes from your recitation reviews.
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="bg-soft-accent rounded-2xl p-4 w-full max-w-4xl">
                <InteractiveMushaf
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  mistakes={filteredMistakes.filter(m => m.page === currentPage)}
                  historicalMistakes={mistakes.filter(m => m.page === currentPage && !filteredMistakes.includes(m))}
                  onMistakeMark={() => {}} // Read-only
                  readOnly={true}
                  mode="viewing"
                  showHistorical={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Mistake List Sidebar (if mistakes exist) */}
        {filteredMistakes.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="max-h-40 overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Mistakes on Page {currentPage} ({filteredMistakes.filter(m => m.page === currentPage).length})
              </h3>
              <div className="space-y-2">
                {filteredMistakes
                  .filter(m => m.page === currentPage)
                  .map((mistake) => (
                    <div
                      key={mistake.id}
                      className="flex items-start gap-2 p-2 bg-white rounded-lg text-xs"
                    >
                      <span className={`px-2 py-1 rounded-full text-white text-xs font-semibold ${
                        (mistake as any).workflowStep === 'sabq' ? 'bg-blue-500' :
                        (mistake as any).workflowStep === 'sabqi' ? 'bg-green-500' :
                        (mistake as any).workflowStep === 'manzil' ? 'bg-purple-500' : 'bg-gray-500'
                      }`}>
                        {(mistake as any).workflowStep?.toUpperCase() || 'N/A'}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-primary text-white text-xs font-semibold">
                        {mistake.type}
                      </span>
                      {mistake.note && (
                        <span className="text-gray-600 italic">"{mistake.note}"</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentPersonalMushaf;

