import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QaidahViewer from '../../components/QaidahViewer';

const QaidahPageViewer: React.FC = () => {
  const { pageNumber } = useParams<{ pageNumber: string }>();
  const navigate = useNavigate();
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [isDetectingPages, setIsDetectingPages] = useState(true);

  // Parse page number from URL
  const currentPage = pageNumber ? parseInt(pageNumber, 10) : 1;

  // Validate page number
  useEffect(() => {
    if (isNaN(currentPage) || currentPage < 1) {
      navigate('/qaidah/1', { replace: true });
    }
  }, [currentPage, navigate]);

  // DISABLED: Image-based page detection removed
  // Qaidah books now use PDF-based rendering exclusively
  // Page count will be determined from PDF metadata by QaidahViewer
  useEffect(() => {
    // Skip image-based detection - PDF viewer will handle page count
    // Set a default total pages (will be overridden by PDF metadata)
    setTotalPages(100); // Default fallback
    setIsDetectingPages(false);
  }, []);

  const handlePageChange = (page: number) => {
    navigate(`/qaidah/${page}`, { replace: true });
  };

  if (isDetectingPages) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Qaidah pages...</p>
        </div>
      </div>
    );
  }

  return (
    <QaidahViewer
      currentPage={currentPage}
      totalPages={totalPages || 100}
      onPageChange={handlePageChange}
    />
  );
};

export default QaidahPageViewer;
