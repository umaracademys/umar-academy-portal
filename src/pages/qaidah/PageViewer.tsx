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
            let resolved = false;
            
            img.onload = () => {
              if (!resolved) {
                resolved = true;
                resolve(true);
              }
            };
            
            img.onerror = () => {
              if (ext === 'png') {
                // Try JPG if PNG fails
                tryImage('jpg');
              } else if (!resolved) {
                resolved = true;
                resolve(false);
              }
            };
            
            // Try qaidah2 first (most common), then qaidah1, then generic qaidah
            const paths = [`/qaidah2/${pageNum}.${ext}`, `/qaidah1/${pageNum}.${ext}`, `/qaidah/${pageNum}.${ext}`];
            let pathIndex = 0;
            
            const tryPath = () => {
              if (pathIndex >= paths.length) {
                if (!resolved) {
                  resolved = true;
                  resolve(false);
                }
                return;
              }
              img.src = paths[pathIndex];
              pathIndex++;
            };
            
            tryPath();
            
            // Timeout after 2 seconds
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                resolve(false);
              }
            }, 2000);
          };
          tryImage('png');
        });
      };

      // Try common page counts first (starting with smaller counts)
      // Qaidah1 has ~83 pages, Qaidah2 has ~48 pages
      const commonCounts = [25, 48, 50, 83, 100, 150, 200];
      let highestFound = 1;
      
      for (const count of commonCounts) {
        const exists = await checkPageExists(count);
        if (exists) {
          highestFound = count;
          // If we found a page at this count, it might be the last one
          // But continue checking slightly higher to be sure
        } else if (highestFound > 1) {
          // If we found pages before but this one doesn't exist, we've likely found the max
          maxPage = highestFound;
          foundLastPage = true;
          break;
        }
      }

      // If we found some pages but not the last one, use the highest found as starting point
      if (!foundLastPage && highestFound > 1) {
        maxPage = highestFound;
        foundLastPage = true;
      }

      // If not found, do a binary search starting from a reasonable high value
      if (!foundLastPage) {
        let low = 1;
        let high = 200;
        let lastFound = 1;

        // First, find an upper bound by checking pages in increments
        // This avoids checking every single page
        for (let testPage = 10; testPage <= 200; testPage += 10) {
          const exists = await checkPageExists(testPage);
          if (exists) {
            lastFound = testPage;
          } else {
            // Found the upper bound
            high = Math.min(testPage, 200);
            break;
          }
        }

        // Now do binary search between lastFound and high
        low = lastFound;
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
