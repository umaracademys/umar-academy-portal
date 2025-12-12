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

  // Detect total number of pages by trying to load images
  useEffect(() => {
    const detectTotalPages = async () => {
      // Try to find the last page by checking if images exist
      // Start from a reasonable maximum (e.g., 200) and work backwards
      let maxPage = 200;
      let foundLastPage = false;

      // Binary search approach to find the last page
      const checkPageExists = (pageNum: number): Promise<boolean> => {
        return new Promise((resolve) => {
          // Try PNG first, then JPG
          const tryImage = (ext: string) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => {
              if (ext === 'png') {
                // Try JPG if PNG fails
                tryImage('jpg');
              } else {
                resolve(false);
              }
            };
            img.src = `/qaidah/${pageNum}.${ext}`;
            // Timeout after 2 seconds
            setTimeout(() => {
              if (ext === 'png') {
                tryImage('jpg');
              } else {
                resolve(false);
              }
            }, 2000);
          };
          tryImage('png');
        });
      };

      // Try common page counts first
      const commonCounts = [50, 100, 150, 200];
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
        let high = 200;
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
      setIsDetectingPages(false);
    };

    detectTotalPages();
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
