import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import QaidahPage from './QaidahPage';
import QaidahCanvas from './QaidahCanvas';

interface QaidahViewerProps {
  currentPage: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  studentId?: string;
  book?: 'qaidah1' | 'qaidah2' | 'quran';
}

const QaidahViewer: React.FC<QaidahViewerProps> = ({
  currentPage,
  totalPages = 100, // Default, can be detected or passed as prop
  onPageChange,
  studentId: propStudentId,
  book: propBook,
}) => {
  const { user } = useAuth();
  const { students } = useData();
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [preloadedPages, setPreloadedPages] = useState<Set<number>>(new Set());
  const [selectedStudentId, setSelectedStudentId] = useState<string>(propStudentId || '');
  const [selectedBook, setSelectedBook] = useState<'qaidah1' | 'qaidah2' | 'quran'>(propBook || 'qaidah1');
  const navigate = useNavigate();
  const pageRef = useRef<number>(currentPage);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Check if user can mark (teacher or admin)
  const canMark = user && (user.role === 'teacher' || user.role === 'admin' || user.role === 'superadmin');

  // Update ref when currentPage changes
  useEffect(() => {
    pageRef.current = currentPage;
  }, [currentPage]);

  // Reset zoom and position when page changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [currentPage]);

  // Helper to get image URL (tries PNG first, then JPG)
  const getImageUrl = useCallback((pageNum: number): string => {
    // For quran, use different path
    if (selectedBook === 'quran') {
      return `/quran/${pageNum}.png`;
    }
    // For qaidah, use qaidah path
    return `/qaidah/${pageNum}.png`;
  }, [selectedBook]);

  // Preload adjacent pages
  const preloadPage = useCallback((pageNum: number) => {
    if (pageNum < 1 || pageNum > totalPages || preloadedPages.has(pageNum)) {
      return;
    }

    const img = new Image();
    img.onload = () => {
      setPreloadedPages((prev) => new Set(prev).add(pageNum));
    };
    img.src = getImageUrl(pageNum);
  }, [totalPages, preloadedPages, getImageUrl]);

  // Preload current, previous, and next pages
  useEffect(() => {
    preloadPage(currentPage);
    if (currentPage > 1) preloadPage(currentPage - 1);
    if (currentPage < totalPages) preloadPage(currentPage + 1);
    // Preload a few more pages ahead for smooth navigation
    if (currentPage < totalPages - 1) preloadPage(currentPage + 2);
    if (currentPage < totalPages - 2) preloadPage(currentPage + 3);
  }, [currentPage, totalPages, preloadPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (e.key === 'ArrowLeft' && currentPage > 1) {
        e.preventDefault();
        goToPage(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        e.preventDefault();
        goToPage(currentPage + 1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((prev) => Math.min(5, prev + 0.25));
      } else if (e.key === '-') {
        e.preventDefault();
        setZoom((prev) => Math.max(0.5, prev - 0.25));
      } else if (e.key === '0') {
        e.preventDefault();
        setZoom(1);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    onPageChange?.(page);
    navigate(`/qaidah/${page}`);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(5, prev + 0.25));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.5, prev - 0.25));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const imageUrl = getImageUrl(currentPage);

  // Get available students for selection (if teacher, only show assigned students)
  const availableStudents = user?.role === 'teacher' 
    ? students.filter(s => {
        const teacherId = (user as any).teacherId || (user as any).id;
        return s.assignedTeacher === teacherId || 
               (s as any).assignedTeacher?.toString() === teacherId?.toString();
      })
    : students;

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col relative overflow-hidden">
      {/* Student and Book Selection (for teachers/admins) */}
      {canMark && (
        <div className="absolute top-4 left-4 z-30 bg-black/80 backdrop-blur-sm rounded-lg p-3 flex flex-col gap-2 min-w-[200px]">
          <div className="text-white text-sm font-semibold mb-1">Marking Mode</div>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="px-3 py-2 bg-gray-700 text-white rounded text-sm"
          >
            <option value="">Select Student</option>
            {availableStudents.map((student) => (
              <option key={student.id || (student as any)._id} value={student.id || (student as any)._id}>
                {student.fullName || (student as any).fullName}
              </option>
            ))}
          </select>
          <select
            value={selectedBook}
            onChange={(e) => setSelectedBook(e.target.value as 'qaidah1' | 'qaidah2' | 'quran')}
            className="px-3 py-2 bg-gray-700 text-white rounded text-sm"
          >
            <option value="qaidah1">Qaidah 1</option>
            <option value="qaidah2">Qaidah 2</option>
            <option value="quran">Quran</option>
          </select>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          ← Prev
        </button>
        
        <div className="px-4 py-2 bg-white/10 text-white rounded min-w-[120px] text-center">
          <span className="font-semibold">{currentPage}</span>
          {totalPages && <span className="text-white/70"> / {totalPages}</span>}
        </div>
        
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          Next →
        </button>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-black/70 backdrop-blur-sm rounded-lg p-2">
        <button
          onClick={handleZoomIn}
          className="px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          onClick={handleResetZoom}
          className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
          aria-label="Reset zoom"
        >
          Reset
        </button>
        <div className="px-3 py-1 text-white text-xs text-center border-t border-white/20 mt-1 pt-1">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Page Display */}
      <div className="flex-1 relative" ref={containerRef}>
        <QaidahPage
          pageNumber={currentPage}
          imageUrl={imageUrl}
          zoom={zoom}
          onZoomChange={setZoom}
          position={position}
          onPositionChange={setPosition}
          containerRef={containerRef}
          imageRef={imageRef}
        />
        
        {/* Qaidah Canvas Overlay for marking */}
        {canMark && selectedStudentId && (
          <QaidahCanvas
            studentId={selectedStudentId}
            book={selectedBook}
            page={currentPage}
            imageUrl={imageUrl}
            zoom={zoom}
            position={position}
            containerRef={containerRef}
            imageRef={imageRef}
            enabled={true}
          />
        )}
      </div>

      {/* Page Indicator (bottom) */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm">
        Page {currentPage} of {totalPages}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="absolute bottom-4 right-4 z-20 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs opacity-60 hover:opacity-100 transition-opacity">
        <div className="space-y-1">
          <div>← → Navigate</div>
          <div>+ − Zoom</div>
          <div>0 Reset</div>
        </div>
      </div>
    </div>
  );
};

export default QaidahViewer;
