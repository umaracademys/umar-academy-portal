import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker - use version that matches react-pdf's pdfjs-dist
const pdfjsVersion = '5.4.296';
const cdnWorkerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = cdnWorkerUrl;
}

interface SimpleStablePdfViewerProps {
  pdfUrl: string;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onTotalPagesChange?: (totalPages: number) => void;
  width?: number;
}

/**
 * Simple, stable PDF viewer component
 * Fixes issues from the original code:
 * - Correct CSS import paths
 * - Proper worker configuration
 * - Stable document lifecycle
 * - Prevents duplicate loads
 * - Safe page rendering
 */
const SimpleStablePdfViewer: React.FC<SimpleStablePdfViewerProps> = ({
  pdfUrl,
  currentPage: externalCurrentPage,
  onPageChange,
  onTotalPagesChange,
  width = 600,
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [internalPageNumber, setInternalPageNumber] = useState(1);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [isDocumentReady, setIsDocumentReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use external page number if provided, otherwise use internal state
  const pageNumber = externalCurrentPage ?? internalPageNumber;

  // Refs to track document state
  const isMountedRef = useRef(true);
  const isRenderingRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  // Update internal page number when external changes
  useEffect(() => {
    if (externalCurrentPage !== undefined && externalCurrentPage !== internalPageNumber) {
      setInternalPageNumber(externalCurrentPage);
    }
  }, [externalCurrentPage, internalPageNumber]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Document load success handler
  const onDocumentLoadSuccess = useCallback(
    (pdf: { numPages: number }) => {
      try {
        // Prevent duplicate loads
        if (loadedUrl === pdfUrl) {
          return;
        }

        if (!isMountedRef.current) {
          return;
        }

        const pageCount = pdf.numPages;
        
        // Validate page count
        if (typeof pageCount !== 'number' || pageCount < 1 || !Number.isInteger(pageCount)) {
          console.error('❌ Invalid numPages value:', pageCount);
          setError('Invalid PDF document: page count is invalid');
          return;
        }

        console.log(`✅ PDF document loaded: ${pageCount} pages`);
        
        setNumPages(pageCount);
        setLoadedUrl(pdfUrl);
        setError(null);
        
        // Reset to page 1 when new document loads
        const newPage = 1;
        setInternalPageNumber(newPage);
        onPageChange?.(newPage);

        // Delay marking document as ready to ensure transport is stable
        if (timeoutRef.current !== null) {
          window.clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = window.setTimeout(() => {
          if (isMountedRef.current) {
            setIsDocumentReady(true);
          }
        }, 150);

        // Notify parent of total pages
        try {
          onTotalPagesChange?.(pageCount);
        } catch (callbackError) {
          console.error('Error in onTotalPagesChange callback:', callbackError);
        }
      } catch (error) {
        console.error('Error in onDocumentLoadSuccess:', error);
        if (isMountedRef.current) {
          setError('Failed to process document load');
        }
      }
    },
    [loadedUrl, pdfUrl, onPageChange, onTotalPagesChange]
  );

  // Document load error handler
  const onDocumentLoadError = useCallback((err: Error | unknown) => {
    try {
      if (!isMountedRef.current) {
        return;
      }

      const errorMessage = err instanceof Error 
        ? err.message 
        : typeof err === 'string' 
          ? err 
          : 'Failed to load PDF document';

      console.error('❌ Error loading PDF:', err);
      
      if (isMountedRef.current) {
        setError(errorMessage);
        setIsDocumentReady(false);
      }
    } catch (handlerError) {
      console.error('Error in onDocumentLoadError handler:', handlerError);
    }
  }, []);

  // Page render success handler
  const onPageRenderSuccess = useCallback(() => {
    try {
      if (isMountedRef.current) {
        isRenderingRef.current = false;
      }
    } catch (error) {
      console.error('Error in onPageRenderSuccess:', error);
    }
  }, []);

  // Page render error handler
  const onPageRenderError = useCallback((err: Error | unknown) => {
    try {
      if (!isMountedRef.current) {
        return;
      }

      const errorMessage = err instanceof Error 
        ? err.message 
        : typeof err === 'string' 
          ? err 
          : 'Unknown error';

      // Only log non-destroy errors to avoid spam
      if (!errorMessage.includes('Transport destroyed') && !errorMessage.includes('destroyed')) {
        console.error('❌ Error rendering PDF page:', err);
      }

      if (isMountedRef.current) {
        isRenderingRef.current = false;
        
        // Mark document as not ready if transport is destroyed
        if (errorMessage.includes('Transport destroyed') || errorMessage.includes('destroyed')) {
          setIsDocumentReady(false);
        }
      }
    } catch (handlerError) {
      console.error('Error in onPageRenderError handler:', handlerError);
    }
  }, []);

  // Handle page navigation
  const handlePrevPage = useCallback(() => {
    try {
      if (numPages && pageNumber > 1) {
        const newPage = pageNumber - 1;
        setInternalPageNumber(newPage);
        onPageChange?.(newPage);
      }
    } catch (error) {
      console.error('Error in handlePrevPage:', error);
    }
  }, [pageNumber, numPages, onPageChange]);

  const handleNextPage = useCallback(() => {
    try {
      if (numPages && pageNumber < numPages) {
        const newPage = pageNumber + 1;
        setInternalPageNumber(newPage);
        onPageChange?.(newPage);
      }
    } catch (error) {
      console.error('Error in handleNextPage:', error);
    }
  }, [pageNumber, numPages, onPageChange]);

  // Validate page number
  const isValidPage = numPages !== null && 
    Number.isInteger(pageNumber) && 
    pageNumber >= 1 && 
    pageNumber <= numPages;

  // Only render page when document is ready and not rendering
  const shouldRenderPage = isDocumentReady && 
    !isRenderingRef.current && 
    isValidPage && 
    numPages !== null;

  return (
    <div className="w-full">
      <Document
        key={pdfUrl} // Only remount if pdfUrl changes
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        options={{
          httpHeaders: {
            'Accept': 'application/pdf',
          },
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        }}
        loading={
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="ml-4 text-gray-600">Loading PDF...</p>
          </div>
        }
        error={
          <div className="text-center p-8 text-red-600 bg-red-50 rounded-lg">
            <p className="font-semibold text-lg mb-2">Failed to load PDF</p>
            {error && <p className="text-sm">{error}</p>}
          </div>
        }
      >
        {shouldRenderPage ? (
          <div key={`page-wrapper-${pageNumber}`}>
            <Page
              pageNumber={pageNumber}
              width={width}
              onRenderSuccess={onPageRenderSuccess}
              onRenderError={onPageRenderError}
              onLoadSuccess={() => {
                // Mark as rendering when page starts loading
                isRenderingRef.current = true;
              }}
              loading={
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              }
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </div>
        ) : numPages !== null && !isDocumentReady ? (
          <div className="flex items-center justify-center p-8 text-gray-500">
            <p>Preparing document...</p>
          </div>
        ) : numPages !== null && !isValidPage ? (
          <div className="flex items-center justify-center p-8 text-gray-500">
            <p>Invalid page number: {pageNumber} (valid range: 1-{numPages})</p>
          </div>
        ) : null}
      </Document>

      {numPages !== null && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            onClick={handlePrevPage}
            disabled={pageNumber <= 1 || !isDocumentReady}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-gray-700">
            Page {pageNumber} of {numPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={pageNumber >= numPages || !isDocumentReady}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-semibold">Error:</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default SimpleStablePdfViewer;
