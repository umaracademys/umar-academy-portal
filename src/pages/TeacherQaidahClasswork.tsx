import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import QaidahViewer from '../components/QaidahViewer';
import { useNavigate } from 'react-router-dom';

const TeacherQaidahClasswork: React.FC = () => {
  const { user } = useAuth();
  const { students } = useData();
  const navigate = useNavigate();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedBook, setSelectedBook] = useState<'qaidah1' | 'qaidah2' | 'quran'>('qaidah1');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(100);

  // Get available students (teachers see assigned students, admins see all)
  const availableStudents = user?.role === 'teacher'
    ? students.filter(s => {
        const teacherId = (user as any).teacherId || (user as any).id;
        return s.assignedTeacher === teacherId ||
               (s as any).assignedTeacher?.toString() === teacherId?.toString();
      })
    : students;

      // Detect total pages for selected book
  useEffect(() => {
    // For Quran, use Mushaf (604 pages)
    if (selectedBook === 'quran') {
      setTotalPages(604);
      return;
    }

    const detectTotalPages = async () => {
      let maxPage = 100;
      let foundLastPage = false;

      const checkPageExists = (pageNum: number): Promise<boolean> => {
        return new Promise((resolve) => {
          // Try JPG first (actual format), then PNG as fallback
          const tryFormat = (format: 'jpg' | 'png') => {
            const img = new Image();
            let resolved = false;
            
            img.onload = () => {
              if (!resolved) {
                resolved = true;
                resolve(true);
              }
            };
            
            img.onerror = () => {
              if (format === 'jpg') {
                // Try PNG if JPG fails
                tryFormat('png');
              } else if (!resolved) {
                resolved = true;
                resolve(false);
              }
            };
            
            // For qaidah, check qaidah1 or qaidah2 folders
            if (selectedBook === 'qaidah1') {
              img.src = `/qaidah1/${pageNum}.${format}`;
            } else if (selectedBook === 'qaidah2') {
              img.src = `/qaidah2/${pageNum}.${format}`;
            } else {
              img.src = `/qaidah/${pageNum}.${format}`;
            }
            
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                resolve(false);
              }
            }, 2000);
          };
          
          tryFormat('jpg');
        });
      };

      // Try common page counts first
      const commonCounts = [50, 100, 150, 200, 604]; // 604 for Quran
      for (const count of commonCounts) {
        const exists = await checkPageExists(count);
        if (exists) {
          maxPage = count;
          foundLastPage = true;
          break;
        }
      }

      // If not found, do a binary search
      if (!foundLastPage) {
        let low = 1;
        let high = selectedBook === 'quran' ? 604 : 200;
        let lastFound = 1;

        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const exists = await checkPageExists(mid);
          
          if (exists) {
            lastFound = mid;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
        maxPage = lastFound;
      }

      setTotalPages(maxPage);
    };

    if (selectedBook) {
      detectTotalPages();
    }
  }, [selectedBook]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    navigate(`/teacher/qaidah-classwork/${selectedBook}/${page}`, { replace: true });
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Access denied. Teachers and admins only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Bar with Controls */}
      <div className="bg-black/80 backdrop-blur-sm border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1 flex flex-col md:flex-row gap-4">
            {/* Student Selection */}
            <div className="flex-1">
              <label className="block text-white text-sm font-semibold mb-2">Select Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">-- Select Student --</option>
                {availableStudents.map((student) => (
                  <option key={student.id || (student as any)._id} value={student.id || (student as any)._id}>
                    {student.fullName || (student as any).fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Book Selection */}
            <div className="flex-1">
              <label className="block text-white text-sm font-semibold mb-2">Select Book</label>
              <select
                value={selectedBook}
                onChange={(e) => {
                  const book = e.target.value as 'qaidah1' | 'qaidah2' | 'quran';
                  setSelectedBook(book);
                  setCurrentPage(1);
                  navigate(`/teacher/qaidah-classwork/${book}/1`, { replace: true });
                }}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="qaidah1">Qaidah 1</option>
                <option value="qaidah2">Qaidah 2</option>
                <option value="quran">Quran</option>
              </select>
            </div>
          </div>

          {/* Back Button */}
          <div className="flex items-end">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Qaidah Viewer */}
      {selectedStudentId ? (
        <QaidahViewer
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          studentId={selectedStudentId}
          book={selectedBook}
        />
      ) : (
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold mb-2">Qaidah Classwork</h2>
            <p className="text-gray-400">Please select a student to begin marking classwork</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherQaidahClasswork;
