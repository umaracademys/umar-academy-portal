import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import QaidahViewer from '../components/QaidahViewer';
import { useNavigate } from 'react-router-dom';
import { fetchAvailablePages } from '../services/qaidahApi';

const TeacherQaidahClasswork: React.FC = () => {
  const { user } = useAuth();
  const { students } = useData();
  const navigate = useNavigate();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedBook, setSelectedBook] = useState<'qaidah1' | 'qaidah2' | 'quran'>('qaidah1');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(100);
  const [availablePages, setAvailablePages] = useState<number[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Get available students (teachers see assigned students, admins see all)
  const availableStudents = user?.role === 'teacher'
    ? students.filter(s => {
        const teacherId = (user as any).teacherId || (user as any).id;
        return s.assignedTeacher === teacherId ||
               (s as any).assignedTeacher?.toString() === teacherId?.toString();
      })
    : students;

  // Fetch available pages from backend
  const loadPages = useCallback(async () => {
    setIsLoadingPages(true);
    try {
      // For Quran, use fixed 604 pages
      if (selectedBook === 'quran') {
        setTotalPages(604);
        setAvailablePages([]); // All pages available for Quran
        setIsLoadingPages(false);
        return;
      }

      const result = await fetchAvailablePages(selectedBook);
      setTotalPages(result.totalPages);
      setAvailablePages(result.pages);
      
      // If current page is not available, go to first available page
      if (result.pages.length > 0 && !result.pages.includes(currentPage)) {
        setCurrentPage(result.pages[0]);
      }
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading pages:', error);
      setTotalPages(100); // Fallback
      setAvailablePages([]);
    } finally {
      setIsLoadingPages(false);
    }
  }, [selectedBook, currentPage]);

  useEffect(() => {
    loadPages();
  }, [selectedBook]);

  // Auto-refresh pages every 30 seconds to catch new uploads
  useEffect(() => {
    if (selectedBook === 'quran') return; // Don't auto-refresh for Quran
    
    const interval = setInterval(() => {
      loadPages();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [selectedBook, loadPages]);

  const handlePageChange = (page: number) => {
    // For Quran, allow any page 1-604
    if (selectedBook === 'quran') {
      if (page >= 1 && page <= 604) {
        setCurrentPage(page);
        navigate(`/teacher/qaidah-classwork/${selectedBook}/${page}`, { replace: true });
      }
      return;
    }

    // For Qaidah books, only allow pages that exist
    if (availablePages.length > 0 && availablePages.includes(page)) {
      setCurrentPage(page);
      navigate(`/teacher/qaidah-classwork/${selectedBook}/${page}`, { replace: true });
    }
  };

  // Load page from URL if available
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const bookIndex = pathParts.indexOf('qaidah-classwork');
    if (bookIndex !== -1 && pathParts[bookIndex + 1] && pathParts[bookIndex + 2]) {
      const book = pathParts[bookIndex + 1] as 'qaidah1' | 'qaidah2' | 'quran';
      const page = parseInt(pathParts[bookIndex + 2], 10);
      if (['qaidah1', 'qaidah2', 'quran'].includes(book) && !isNaN(page)) {
        setSelectedBook(book);
        setCurrentPage(page);
      }
    }
  }, []);

  if (!user || (user.role !== 'teacher' && user.role !== 'admin' && user.role !== 'superadmin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only teachers and admins can access this page.</p>
        </div>
      </div>
    );
  }

  const selectedStudent = availableStudents.find(
    s => (s.id || (s as any)._id) === selectedStudentId
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Modern Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            {/* Title Section */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <span className="text-4xl">📚</span>
                Qaidah Classwork
              </h1>
              <p className="text-gray-300 text-sm">
                Mark and review student classwork on Qaidah and Quran pages
              </p>
            </div>

            {/* Controls Section */}
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              {/* Student Selection */}
              <div className="flex-1 lg:flex-initial lg:min-w-[250px]">
                <label className="block text-white text-sm font-semibold mb-2">
                  Select Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all hover:bg-white/30"
                >
                  <option value="" className="bg-gray-800">-- Select Student --</option>
                  {availableStudents.map((student) => (
                    <option 
                      key={student.id || (student as any)._id} 
                      value={student.id || (student as any)._id}
                      className="bg-gray-800"
                    >
                      {student.fullName || (student as any).fullName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Book Selection */}
              <div className="flex-1 lg:flex-initial lg:min-w-[200px]">
                <label className="block text-white text-sm font-semibold mb-2">
                  Select Book
                </label>
                <select
                  value={selectedBook}
                  onChange={(e) => {
                    const book = e.target.value as 'qaidah1' | 'qaidah2' | 'quran';
                    setSelectedBook(book);
                    setCurrentPage(1);
                    navigate(`/teacher/qaidah-classwork/${book}/1`, { replace: true });
                  }}
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all hover:bg-white/30"
                >
                  <option value="qaidah1" className="bg-gray-800">Qaidah 1</option>
                  <option value="qaidah2" className="bg-gray-800">Qaidah 2</option>
                  <option value="quran" className="bg-gray-800">Quran</option>
                </select>
              </div>

              {/* Back Button */}
              <div className="flex items-end">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  ← Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Student Info Card */}
          {selectedStudent && (
            <div className="mt-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {selectedStudent.fullName?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{selectedStudent.fullName}</p>
                    <p className="text-gray-300 text-sm">
                      {selectedBook === 'quran' ? 'Quran' : selectedBook === 'qaidah1' ? 'Qaidah 1' : 'Qaidah 2'} • 
                      {isLoadingPages ? ' Loading pages...' : ` ${totalPages} pages available`}
                    </p>
                  </div>
                </div>
                {selectedBook !== 'quran' && (
                  <button
                    onClick={loadPages}
                    disabled={isLoadingPages}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    title="Refresh pages (check for new uploads)"
                  >
                    <span>🔄</span>
                    <span>{isLoadingPages ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                )}
              </div>
              {selectedBook !== 'quran' && lastRefresh && (
                <p className="text-gray-400 text-xs mt-2">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Qaidah Viewer */}
      {selectedStudentId ? (
        isLoadingPages ? (
          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-500 mx-auto mb-4"></div>
              <p className="text-white text-lg">Loading pages...</p>
            </div>
          </div>
        ) : (
          <QaidahViewer
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            studentId={selectedStudentId}
            book={selectedBook}
            availablePages={availablePages}
          />
        )
      ) : (
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 shadow-2xl max-w-md">
            <div className="text-8xl mb-6">📖</div>
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Start</h2>
            <p className="text-gray-300 text-lg mb-6">
              Please select a student from the dropdown above to begin marking classwork
            </p>
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <span>✨</span>
              <span>Select a student to get started</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherQaidahClasswork;
