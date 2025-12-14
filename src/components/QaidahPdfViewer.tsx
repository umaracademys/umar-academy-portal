import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker - use local worker file
// Use absolute URL to ensure it works in all environments
if (typeof window !== 'undefined') {
  const workerUrl = new URL('/pdfjs/pdf.worker.min.mjs', window.location.origin).href;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
} else {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
}

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
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pageWidth, setPageWidth] = useState(800);
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef || internalContainerRef;
  const lastPinchDistance = useRef<number | null>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log(`✅ PDF document loaded successfully: ${numPages} pages`);
    setNumPages(numPages);
    setIsLoading(false);
    onTotalPagesChange?.(numPages);
    onLoad?.();
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('❌ Error loading PDF:', error);
    console.error('❌ PDF URL:', pdfUrl);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    setIsLoading(false);
  };

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

  // Update page width based on container
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const updatePageWidth = () => {
        setPageWidth(Math.min(container.clientWidth - 40, 1200));
      };
      updatePageWidth();
      window.addEventListener('resize', updatePageWidth);
      return () => window.removeEventListener('resize', updatePageWidth);
    }
  }, [containerRef]);

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      {!pdfUrl ? (
        <div className="text-center p-8 text-gray-500">
          <p>No PDF URL provided</p>
        </div>
      ) : (
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
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
                <p className="text-xs mt-1 text-gray-500">Verify the PDF file exists and is accessible</p>
              </div>
            }
            options={{
              cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
              cMapPacked: true,
            }}
          >
          <Page
            pageNumber={currentPage}
            width={pageWidth}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            loading={
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            }
          />
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
