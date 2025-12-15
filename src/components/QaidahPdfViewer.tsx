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
// react-pdf uses pdfjs-dist 5.4.296, so we use the worker from that version
if (typeof window !== 'undefined') {
  const pdfjsVersion = '5.4.296';
  const cdnWorkerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;
  pdfjs.GlobalWorkerOptions.workerSrc = cdnWorkerUrl;
  console.log(`📄 PDF.js worker configured: ${cdnWorkerUrl} (version ${pdfjsVersion})`);
} else {
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs';
}

/**
 * State Management with useReducer
 * Centralizes complex document lifecycle and rendering state
 */

const initialState = {
  // Document Lifecycle State
  pdfUrl: null as string | null,
  isLoaded: false,
  isDestroyed: false,
  isLoading: false,
  error: null as string | null,

  // Rendering/View State
  numPages: 0,
  isRendering: false,
};

type State = typeof initialState;

type Action =
  | { type: 'LOAD_START'; payload: { url: string } }
  | { type: 'LOAD_SUCCESS'; payload: { numPages: number } }
  | { type: 'LOAD_ERROR'; payload: { error: string } }
  | { type: 'DESTROY_DOCUMENT' }
  | { type: 'SET_RENDERING'; payload: { isRendering: boolean } };

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
        error: null,
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
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pageWidth, setPageWidth] = useState(800);
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef || internalContainerRef;
  const lastPinchDistance = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const {
    isLoaded,
    isDestroyed,
    isLoading,
    error,
    numPages,
    isRendering,
  } = state;

  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Destroy document on final unmount
      if (isLoaded && !isDestroyed) {
        dispatch({ type: 'DESTROY_DOCUMENT' });
      }
    };
  }, [isLoaded, isDestroyed]);

  // Handle PDF URL changes - prevent duplicate loads
  useEffect(() => {
    // Check for redundant load
    if (pdfUrl === state.pdfUrl && isLoaded && !isDestroyed) {
      return;
    }

    // Start new load if URL changed
    if (pdfUrl && pdfUrl !== state.pdfUrl) {
      dispatch({
        type: 'LOAD_START',
        payload: { url: pdfUrl },
      });
    }
  }, [pdfUrl, state.pdfUrl, isLoaded, isDestroyed]);

  // Document load success handler
  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      if (!isMountedRef.current) {
        return;
      }

      console.log(`✅ PDF document loaded successfully: ${numPages} pages`);
      
      dispatch({
        type: 'LOAD_SUCCESS',
        payload: { numPages },
      });

      // Safe callback invocations
      if (isMountedRef.current) {
        onTotalPagesChange?.(numPages);
        onLoad?.();
      }
    },
    [onTotalPagesChange, onLoad]
  );

  // Document load error handler
  const onDocumentLoadError = useCallback(
    (error: Error) => {
      if (!isMountedRef.current) {
        return;
      }

      console.error('❌ Error loading PDF:', error);
      
      // Validate URL format
      if (pdfUrl && !pdfUrl.startsWith('http://') && !pdfUrl.startsWith('https://')) {
        console.error('❌ Invalid PDF URL format: URL must be absolute');
      }

      if (isMountedRef.current) {
        dispatch({
          type: 'LOAD_ERROR',
          payload: { error: error.message || 'Failed to load PDF document' },
        });
      }
    },
    [pdfUrl]
  );

  // Page render success handler - react-pdf Page doesn't have onRenderSuccess
  // We'll use onLoadSuccess to track when page is ready
  const onPageLoadSuccess = useCallback(() => {
    if (!isMountedRef.current) return;
    
    // Page is loaded and ready to render
    dispatch({
      type: 'SET_RENDERING',
      payload: { isRendering: false },
    });
  }, []);

  // Page render error handler
  const onPageRenderError = useCallback((error: Error) => {
    if (!isMountedRef.current) return;
    
    console.error('❌ Error rendering PDF page:', error);
    dispatch({
      type: 'SET_RENDERING',
      payload: { isRendering: false },
    });
  }, []);

  // Update page width based on container
  useEffect(() => {
    if (containerRef.current) {
      const updatePageWidth = () => {
        if (containerRef.current) {
          setPageWidth(Math.min(containerRef.current.clientWidth - 40, 1200));
        }
      };
      updatePageWidth();
      window.addEventListener('resize', updatePageWidth);
      return () => window.removeEventListener('resize', updatePageWidth);
    }
  }, [containerRef]);

  // Handle mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.5, Math.min(5, zoom + delta));
      onZoomChange?.(newZoom);
    }
  };

  // Handle mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      onPositionChange?.({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle touch events for pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
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
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDistance.current !== null) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const scale = distance / lastPinchDistance.current;
      const newZoom = Math.max(0.5, Math.min(5, zoom * scale));
      onZoomChange?.(newZoom);
      
      lastPinchDistance.current = distance;
    } else if (e.touches.length === 1 && isDragging) {
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      onPositionChange?.({ x: newX, y: newY });
    }
  };

  const handleTouchEnd = () => {
    lastPinchDistance.current = null;
    setIsDragging(false);
  };

  // Constrain position based on zoom level
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const scaledWidth = pageWidth * zoom;
      const scaledHeight = (pageWidth * 1.414) * zoom; // A4 aspect ratio

      const maxX = Math.max(0, (scaledWidth - containerWidth) / 2);
      const maxY = Math.max(0, (scaledHeight - containerHeight) / 2);

      const constrainedX = Math.max(-maxX, Math.min(maxX, position.x));
      const constrainedY = Math.max(-maxY, Math.min(maxY, position.y));

      if (constrainedX !== position.x || constrainedY !== position.y) {
        onPositionChange?.({ x: constrainedX, y: constrainedY });
      }
    }
  }, [zoom, position, onPositionChange, pageWidth, containerRef]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        e.preventDefault();
        onPageChange?.(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < numPages) {
        e.preventDefault();
        onPageChange?.(currentPage + 1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        onZoomChange?.(Math.min(5, zoom + 0.25));
      } else if (e.key === '-') {
        e.preventDefault();
        onZoomChange?.(Math.max(0.5, zoom - 0.25));
      } else if (e.key === '0') {
        e.preventDefault();
        onZoomChange?.(1);
        onPositionChange?.({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, numPages, zoom, onPageChange, onZoomChange, onPositionChange]);

  // Calculate page scale based on zoom
  const pageScale = useMemo(() => {
    return zoom;
  }, [zoom]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden bg-gray-100 flex items-center justify-center relative"
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
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading PDF...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
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
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          <Document
            key={pdfUrl} // Stable key based on URL only
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
                <p className="text-xs mt-3 text-gray-600">Check browser console (F12) for detailed error information</p>
              </div>
            }
          >
            {/* Only render Page when document is loaded, not destroyed, and page number is valid */}
            {isLoaded && !isDestroyed && numPages && currentPage >= 1 && currentPage <= numPages ? (
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
                  {isDestroyed
                    ? 'Document is being reloaded...'
                    : `Invalid page number: ${currentPage} (valid range: 1-${numPages})`}
                </p>
              </div>
            ) : null}
          </Document>
        </div>
      )}

      {numPages && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm">
          Page {currentPage} of {numPages}
        </div>
      )}
    </div>
  );
};

export default QaidahPdfViewer;
