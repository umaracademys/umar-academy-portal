import React, {
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
} from 'react';
import {
  Document,
  Page,
  pdfjs,
} from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker - use version that matches react-pdf's pdfjs-dist
const pdfjsVersion = '5.4.296';
const cdnWorkerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = cdnWorkerUrl;
}

/**
 * State Management with useReducer
 * Centralizes complex document lifecycle and rendering state
 */

interface State {
  pdfUrl: string | null;
  isLoaded: boolean;
  isDestroyed: boolean;
  isLoading: boolean;
  error: string | null;
  isDocumentReady: boolean; // Document is loaded AND ready for page rendering
  numPages: number;
  isRendering: boolean;
}

type Action =
  | { type: 'LOAD_START'; payload: { url: string } }
  | { type: 'LOAD_SUCCESS'; payload: { numPages: number } }
  | { type: 'LOAD_ERROR'; payload: { error: string } }
  | { type: 'DESTROY_DOCUMENT' }
  | { type: 'SET_RENDERING'; payload: { isRendering: boolean } }
  | { type: 'SET_DOCUMENT_READY'; payload: { ready: boolean } };

const initialState: State = {
  pdfUrl: null,
  isLoaded: false,
  isDestroyed: false,
  isLoading: false,
  error: null,
  isDocumentReady: false,
  numPages: 0,
  isRendering: false,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'LOAD_START':
      return {
        ...initialState,
        pdfUrl: action.payload.url,
        isLoading: true,
        isDestroyed: false,
        error: null,
      };

    case 'LOAD_SUCCESS':
      return {
        ...state,
        numPages: action.payload.numPages,
        isLoaded: true,
        isLoading: false,
        isDocumentReady: false, // Will be set to true after a brief delay
        error: null,
      };

    case 'SET_DOCUMENT_READY':
      return {
        ...state,
        isDocumentReady: action.payload.ready,
      };

    case 'LOAD_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload.error,
      };

    case 'DESTROY_DOCUMENT':
      return {
        ...state,
        isLoaded: false,
        isDestroyed: true,
        isDocumentReady: false,
        numPages: 0,
      };

    case 'SET_RENDERING':
      return {
        ...state,
        isRendering: action.payload.isRendering,
      };

    default:
      return state;
  }
};

/**
 * Validation utilities
 */

function validatePdfUrl(url: string): { isValid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'PDF URL must be a non-empty string' };
  }

  // Security: Only allow http/https URLs
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { isValid: false, error: 'PDF URL must be absolute (http:// or https://)' };
  }

  // Security: Prevent XSS
  const dangerousPatterns = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /on\w+\s*=/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(url)) {
      return { isValid: false, error: 'Invalid URL format detected' };
    }
  }

  return { isValid: true };
}

function validatePageNumber(page: number, maxPages: number): boolean {
  return Number.isInteger(page) && page >= 1 && page <= maxPages;
}

function validateZoom(zoom: number): number {
  if (typeof zoom !== 'number' || isNaN(zoom)) {
    return 1.0;
  }
  return Math.max(0.5, Math.min(5, zoom));
}

/**
 * QaidahPdfViewer Component
 * A stable, full-featured PDF viewer with proper lifecycle management
 */

interface QaidahPdfViewerProps {
  pdfUrl: string;
  currentPage: number;
  onPageChange?: (page: number) => void;
  onTotalPagesChange?: (totalPages: number) => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  position?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  containerRef?: React.RefObject<HTMLDivElement>;
  onLoad?: () => void;
  showDownload?: boolean;
  showPageJump?: boolean;
}

const QaidahPdfViewer: React.FC<QaidahPdfViewerProps> = ({
  pdfUrl,
  currentPage,
  onPageChange,
  onTotalPagesChange,
  zoom = 1,
  onZoomChange,
  position = { x: 0, y: 0 },
  onPositionChange,
  containerRef: externalContainerRef,
  onLoad,
  showDownload = false,
  showPageJump = true,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pageWidth, setPageWidth] = useState(800);
  const [pageJumpInput, setPageJumpInput] = useState('');
  
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef || internalContainerRef;
  const lastPinchDistance = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const timeoutRefs = useRef<number[]>([]);
  const lastLoadedUrlRef = useRef<string | null>(null);

  const {
    isLoaded,
    isDestroyed,
    isLoading,
    error,
    numPages,
    isRendering,
    isDocumentReady,
  } = state;

  // Validate and sanitize inputs
  const validatedZoom = useMemo(() => validateZoom(zoom), [zoom]);
  const validatedPosition = useMemo(() => {
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
      return { x: 0, y: 0 };
    }
    return { x: position.x, y: position.y };
  }, [position]);

  // Track component mount state and cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      
      // Clear all pending timeouts
      timeoutRefs.current.forEach(timeout => {
        try {
          window.clearTimeout(timeout);
        } catch (error) {
          // Silently handle timeout cleanup errors
        }
      });
      timeoutRefs.current = [];
      
      // Destroy document on final unmount
      try {
        if (isLoaded && !isDestroyed) {
          dispatch({ type: 'DESTROY_DOCUMENT' });
        }
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    };
  }, [isLoaded, isDestroyed]);

  // Validate PDF URL
  useEffect(() => {
    try {
      const validation = validatePdfUrl(pdfUrl);
      if (!validation.isValid) {
        console.error('❌ Invalid PDF URL:', validation.error);
        dispatch({
          type: 'LOAD_ERROR',
          payload: { error: validation.error || 'Invalid PDF URL' },
        });
      }
    } catch (error) {
      console.error('❌ Error validating PDF URL:', error);
      dispatch({
        type: 'LOAD_ERROR',
        payload: { error: 'Failed to validate PDF URL' },
      });
    }
  }, [pdfUrl]);

  // Handle PDF URL changes - prevent duplicate loads
  useEffect(() => {
    try {
      const validation = validatePdfUrl(pdfUrl);
      if (!validation.isValid) {
        return;
      }

      // Check for redundant load
      if (pdfUrl === lastLoadedUrlRef.current && isLoaded && !isDestroyed) {
        return;
      }

      // Start new load if URL changed
      if (pdfUrl && pdfUrl !== lastLoadedUrlRef.current) {
        // Mark document as not ready when URL changes
        dispatch({
          type: 'SET_DOCUMENT_READY',
          payload: { ready: false },
        });
        
        dispatch({
          type: 'LOAD_START',
          payload: { url: pdfUrl },
        });
      }
    } catch (error) {
      console.error('Error handling PDF URL change:', error);
      dispatch({
        type: 'LOAD_ERROR',
        payload: { error: 'Failed to process PDF URL change' },
      });
    }
  }, [pdfUrl, isLoaded, isDestroyed]);

  // Document load success handler
  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      try {
        if (!isMountedRef.current) {
          return;
        }

        // Validate numPages
        if (typeof numPages !== 'number' || numPages < 1 || !Number.isInteger(numPages)) {
          console.error('❌ Invalid numPages value:', numPages);
          dispatch({
            type: 'LOAD_ERROR',
            payload: { error: 'Invalid PDF document: page count is invalid' },
          });
          return;
        }

        console.log(`✅ PDF document loaded successfully: ${numPages} pages`);
        
        dispatch({
          type: 'LOAD_SUCCESS',
          payload: { numPages },
        });

        lastLoadedUrlRef.current = pdfUrl;

        // Delay marking document as ready to ensure transport is stable
        const timeout: number = window.setTimeout(() => {
          try {
            if (isMountedRef.current) {
              dispatch({
                type: 'SET_DOCUMENT_READY',
                payload: { ready: true },
              });
            }
          } catch (error) {
            console.error('Error setting document ready:', error);
          }
        }, 150); // Increased delay for stability
        timeoutRefs.current.push(timeout);

        // Safe callback invocations
        if (isMountedRef.current) {
          try {
            onTotalPagesChange?.(numPages);
          } catch (error) {
            console.error('Error in onTotalPagesChange callback:', error);
          }
          
          try {
            onLoad?.();
          } catch (error) {
            console.error('Error in onLoad callback:', error);
          }
        }
      } catch (error) {
        console.error('Error in onDocumentLoadSuccess:', error);
        if (isMountedRef.current) {
          dispatch({
            type: 'LOAD_ERROR',
            payload: { error: 'Failed to process document load' },
          });
        }
      }
    },
    [pdfUrl, onTotalPagesChange, onLoad]
  );

  // Document load error handler
  const onDocumentLoadError = useCallback(
    (error: Error | unknown) => {
      try {
        if (!isMountedRef.current) {
          return;
        }

        const errorMessage = error instanceof Error 
          ? error.message 
          : typeof error === 'string' 
            ? error 
            : 'Failed to load PDF document';

        console.error('❌ Error loading PDF:', error);

        if (isMountedRef.current) {
          dispatch({
            type: 'LOAD_ERROR',
            payload: { error: errorMessage },
          });
        }
      } catch (handlerError) {
        console.error('Error in onDocumentLoadError handler:', handlerError);
      }
    },
    []
  );

  // Page load success handler
  const onPageLoadSuccess = useCallback(() => {
    try {
      if (!isMountedRef.current) return;
      
      // Page is loaded - unlock rendering after a delay
      const timeout: number = window.setTimeout(() => {
        try {
          if (isMountedRef.current) {
            dispatch({
              type: 'SET_RENDERING',
              payload: { isRendering: false },
            });
          }
        } catch (error) {
          console.error('Error unlocking rendering state:', error);
        }
      }, 100);
      timeoutRefs.current.push(timeout);
    } catch (error) {
      console.error('Error in onPageLoadSuccess:', error);
    }
  }, []);

  // Page render error handler
  const onPageRenderError = useCallback((error: Error | unknown) => {
    try {
      if (!isMountedRef.current) return;
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
          ? error 
          : 'Unknown error';
      
      // Only log non-destroy errors to avoid spam
      if (!errorMessage.includes('Transport destroyed') && !errorMessage.includes('destroyed')) {
        console.error('❌ Error rendering PDF page:', error);
      }
      
      // Mark document as not ready if transport is destroyed
      if (errorMessage.includes('Transport destroyed') || errorMessage.includes('destroyed')) {
        try {
          dispatch({
            type: 'SET_DOCUMENT_READY',
            payload: { ready: false },
          });
        } catch (dispatchError) {
          console.error('Error dispatching SET_DOCUMENT_READY:', dispatchError);
        }
      }
      
      try {
        dispatch({
          type: 'SET_RENDERING',
          payload: { isRendering: false },
        });
      } catch (dispatchError) {
        console.error('Error dispatching SET_RENDERING:', dispatchError);
      }
    } catch (handlerError) {
      console.error('Error in onPageRenderError handler:', handlerError);
    }
  }, []);

  // Update page width based on container (debounced)
  useEffect(() => {
    if (!containerRef.current) return;

    let resizeTimeout: number | null = null;
    
    const updatePageWidth = () => {
      try {
        if (containerRef.current) {
          const newWidth = Math.min(containerRef.current.clientWidth - 40, 1200);
          setPageWidth(prevWidth => {
            return Math.abs(newWidth - prevWidth) > 5 ? newWidth : prevWidth;
          });
        }
      } catch (error) {
        console.error('Error updating page width:', error);
      }
    };

    const handleResize = () => {
      if (resizeTimeout !== null) {
        window.clearTimeout(resizeTimeout);
      }
      resizeTimeout = window.setTimeout(updatePageWidth, 150);
    };

    updatePageWidth();
    window.addEventListener('resize', handleResize, { passive: true });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout !== null) {
        window.clearTimeout(resizeTimeout);
      }
    };
  }, [containerRef]);

  // Constrain position based on zoom level (memoized)
  const constrainedPosition = useMemo(() => {
    try {
      if (!containerRef.current) {
        return validatedPosition;
      }

      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const scaledWidth = pageWidth * validatedZoom;
      const scaledHeight = (pageWidth * 1.414) * validatedZoom;

      const maxX = Math.max(0, (scaledWidth - containerWidth) / 2);
      const maxY = Math.max(0, (scaledHeight - containerHeight) / 2);

      const constrainedX = Math.max(-maxX, Math.min(maxX, validatedPosition.x));
      const constrainedY = Math.max(-maxY, Math.min(maxY, validatedPosition.y));

      return { x: constrainedX, y: constrainedY };
    } catch (error) {
      console.error('Error calculating constrained position:', error);
      return validatedPosition;
    }
  }, [validatedZoom, validatedPosition, pageWidth, containerRef]);

  // Apply constrained position if it changed
  useEffect(() => {
    if (constrainedPosition.x !== validatedPosition.x || constrainedPosition.y !== validatedPosition.y) {
      try {
        onPositionChange?.(constrainedPosition);
      } catch (error) {
        console.error('Error updating position:', error);
      }
    }
  }, [constrainedPosition, validatedPosition, onPositionChange]);

  // Event handlers with error handling
  const handleWheel = useCallback((e: React.WheelEvent) => {
    try {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = validateZoom(validatedZoom + delta);
        try {
          onZoomChange?.(newZoom);
        } catch (error) {
          console.error('Error in onZoomChange callback:', error);
        }
      }
    } catch (error) {
      console.error('Error in handleWheel:', error);
    }
  }, [validatedZoom, onZoomChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    try {
      if (e.button === 0) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - validatedPosition.x, y: e.clientY - validatedPosition.y });
      }
    } catch (error) {
      console.error('Error in handleMouseDown:', error);
    }
  }, [validatedPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    try {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        try {
          onPositionChange?.({ x: newX, y: newY });
        } catch (error) {
          console.error('Error in onPositionChange callback:', error);
        }
      }
    } catch (error) {
      console.error('Error in handleMouseMove:', error);
    }
  }, [isDragging, dragStart, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    try {
      setIsDragging(false);
    } catch (error) {
      console.error('Error in handleMouseUp:', error);
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    try {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        lastPinchDistance.current = distance;
      } else if (e.touches.length === 1) {
        setIsDragging(true);
        setDragStart({ x: e.touches[0].clientX - validatedPosition.x, y: e.touches[0].clientY - validatedPosition.y });
      }
    } catch (error) {
      console.error('Error in handleTouchStart:', error);
    }
  }, [validatedPosition]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    try {
      if (e.touches.length === 2 && lastPinchDistance.current !== null) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        
        const scale = distance / lastPinchDistance.current;
        const newZoom = validateZoom(validatedZoom * scale);
        try {
          onZoomChange?.(newZoom);
        } catch (error) {
          console.error('Error in onZoomChange callback:', error);
        }
        
        lastPinchDistance.current = distance;
      } else if (e.touches.length === 1 && isDragging) {
        const newX = e.touches[0].clientX - dragStart.x;
        const newY = e.touches[0].clientY - dragStart.y;
        try {
          onPositionChange?.({ x: newX, y: newY });
        } catch (error) {
          console.error('Error in onPositionChange callback:', error);
        }
      }
    } catch (error) {
      console.error('Error in handleTouchMove:', error);
    }
  }, [validatedZoom, isDragging, dragStart, onZoomChange, onPositionChange]);

  const handleTouchEnd = useCallback(() => {
    try {
      lastPinchDistance.current = null;
      setIsDragging(false);
    } catch (error) {
      console.error('Error in handleTouchEnd:', error);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      try {
        if (e.key === 'ArrowLeft' && currentPage > 1 && validatePageNumber(currentPage - 1, numPages)) {
          e.preventDefault();
          try {
            onPageChange?.(currentPage - 1);
          } catch (error) {
            console.error('Error in onPageChange callback:', error);
          }
        } else if (e.key === 'ArrowRight' && currentPage < numPages && validatePageNumber(currentPage + 1, numPages)) {
          e.preventDefault();
          try {
            onPageChange?.(currentPage + 1);
          } catch (error) {
            console.error('Error in onPageChange callback:', error);
          }
        } else if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          try {
            const newZoom = validateZoom(validatedZoom + 0.25);
            onZoomChange?.(newZoom);
          } catch (error) {
            console.error('Error in onZoomChange callback:', error);
          }
        } else if (e.key === '-') {
          e.preventDefault();
          try {
            const newZoom = validateZoom(validatedZoom - 0.25);
            onZoomChange?.(newZoom);
          } catch (error) {
            console.error('Error in onZoomChange callback:', error);
          }
        } else if (e.key === '0') {
          e.preventDefault();
          try {
            onZoomChange?.(1);
            onPositionChange?.({ x: 0, y: 0 });
          } catch (error) {
            console.error('Error in zoom/position callbacks:', error);
          }
        }
      } catch (error) {
        console.error('Error in keyboard handler:', error);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, numPages, validatedZoom, onPageChange, onZoomChange, onPositionChange]);

  // Navigation handlers
  const handlePrevPage = useCallback(() => {
    try {
      if (currentPage > 1 && validatePageNumber(currentPage - 1, numPages)) {
        onPageChange?.(currentPage - 1);
      }
    } catch (error) {
      console.error('Error in handlePrevPage:', error);
    }
  }, [currentPage, numPages, onPageChange]);

  const handleNextPage = useCallback(() => {
    try {
      if (currentPage < numPages && validatePageNumber(currentPage + 1, numPages)) {
        onPageChange?.(currentPage + 1);
      }
    } catch (error) {
      console.error('Error in handleNextPage:', error);
    }
  }, [currentPage, numPages, onPageChange]);

  const handleZoomIn = useCallback(() => {
    try {
      const newZoom = validateZoom(validatedZoom + 0.25);
      onZoomChange?.(newZoom);
    } catch (error) {
      console.error('Error in handleZoomIn:', error);
    }
  }, [validatedZoom, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    try {
      const newZoom = validateZoom(validatedZoom - 0.25);
      onZoomChange?.(newZoom);
    } catch (error) {
      console.error('Error in handleZoomOut:', error);
    }
  }, [validatedZoom, onZoomChange]);

  const handleResetZoom = useCallback(() => {
    try {
      onZoomChange?.(1);
      onPositionChange?.({ x: 0, y: 0 });
    } catch (error) {
      console.error('Error in handleResetZoom:', error);
    }
  }, [onZoomChange, onPositionChange]);

  const handlePageJump = useCallback(() => {
    try {
      const pageNum = parseInt(pageJumpInput, 10);
      if (!isNaN(pageNum) && validatePageNumber(pageNum, numPages)) {
        onPageChange?.(pageNum);
        setPageJumpInput('');
      }
    } catch (error) {
      console.error('Error in handlePageJump:', error);
    }
  }, [pageJumpInput, numPages, onPageChange]);

  const handleDownload = useCallback(() => {
    try {
      if (pdfUrl) {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `qaidah-page-${currentPage}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  }, [pdfUrl, currentPage]);

  // Calculate page scale
  const pageScale = useMemo(() => {
    return validatedZoom;
  }, [validatedZoom]);

  // Validate current page number
  const isValidPage = useMemo(() => {
    return numPages > 0 && validatePageNumber(currentPage, numPages);
  }, [currentPage, numPages]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden bg-gray-100 flex flex-col relative"
    >
      {/* Controls Bar */}
      <div className="flex-shrink-0 bg-gray-800 text-white px-4 py-2 flex items-center justify-between flex-wrap gap-2 z-30">
        <div className="flex items-center gap-2">
          {/* Page Navigation */}
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || isRendering || !isDocumentReady}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            aria-label="Previous Page"
          >
            ← Prev
          </button>
          
          {showPageJump && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                max={numPages}
                value={pageJumpInput}
                onChange={(e) => setPageJumpInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePageJump()}
                placeholder={`${currentPage}`}
                className="w-16 px-2 py-1 text-gray-900 rounded text-center text-sm"
                disabled={!isDocumentReady}
              />
              <span className="text-sm">/ {numPages}</span>
            </div>
          )}
          
          <button
            onClick={handleNextPage}
            disabled={currentPage >= numPages || isRendering || !isDocumentReady}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            aria-label="Next Page"
          >
            Next →
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <button
            onClick={handleZoomOut}
            disabled={isRendering || !isDocumentReady}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            aria-label="Zoom Out"
          >
            −
          </button>
          
          <span className="px-3 py-1 text-sm min-w-[60px] text-center">
            {Math.round(validatedZoom * 100)}%
          </span>
          
          <button
            onClick={handleZoomIn}
            disabled={isRendering || !isDocumentReady}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            aria-label="Zoom In"
          >
            +
          </button>
          
          <button
            onClick={handleResetZoom}
            disabled={isRendering || !isDocumentReady}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-sm"
            aria-label="Reset Zoom"
          >
            Reset
          </button>

          {showDownload && (
            <button
              onClick={handleDownload}
              disabled={!isDocumentReady}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-sm"
              aria-label="Download PDF"
            >
              ⬇ Download
            </button>
          )}
        </div>
      </div>

      {/* PDF Viewer Area */}
      <div
        className="flex-1 relative overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading PDF...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center bg-white rounded-lg p-8 max-w-md mx-4 shadow-lg">
              <div className="text-6xl mb-4">🚫</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">PDF Load Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <p className="text-sm text-gray-500">Please check the URL or try again later.</p>
            </div>
          </div>
        )}

        {!error && pdfUrl && (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              transform: `translate(${validatedPosition.x}px, ${validatedPosition.y}px) scale(${validatedZoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <Document
              key={pdfUrl} // Stable key - only remounts when URL changes
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
                <div className="text-center p-8 text-red-600 bg-red-50 rounded-lg mx-4">
                  <p className="font-semibold text-lg mb-2">Failed to load PDF</p>
                  <p className="text-sm mt-2 break-all font-mono bg-white p-2 rounded">{pdfUrl}</p>
                </div>
              }
            >
              {/* Only render Page when document is fully ready */}
              {isLoaded && isDocumentReady && !isDestroyed && !isRendering && isValidPage ? (
                <div key={`page-wrapper-${currentPage}`}>
                  <Page
                    pageNumber={currentPage}
                    width={pageWidth}
                    scale={pageScale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    onLoadSuccess={onPageLoadSuccess}
                    onLoadError={onPageRenderError}
                    loading={
                      <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      </div>
                    }
                  />
                </div>
              ) : isLoaded && numPages ? (
                <div className="flex items-center justify-center p-8 text-gray-500">
                  <p>
                    {!isDocumentReady || isDestroyed || isRendering
                      ? 'Preparing document...'
                      : `Invalid page number: ${currentPage} (valid range: 1-${numPages})`}
                  </p>
                </div>
              ) : null}
            </Document>
          </div>
        )}
      </div>

      {/* Page Indicator */}
      {numPages > 0 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm">
          Page {currentPage} of {numPages}
        </div>
      )}
    </div>
  );
};

export default QaidahPdfViewer;
