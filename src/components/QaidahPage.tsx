import React, { useState, useRef, useEffect } from 'react';

interface QaidahPageProps {
  pageNumber: number;
  imageUrl: string;
  onLoad?: () => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  position?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  containerRef?: React.RefObject<HTMLDivElement>;
  imageRef?: React.RefObject<HTMLImageElement>;
}

const QaidahPage: React.FC<QaidahPageProps> = ({
  pageNumber,
  imageUrl,
  onLoad,
  zoom = 1,
  onZoomChange,
  position = { x: 0, y: 0 },
  onPositionChange,
  containerRef: externalContainerRef,
  imageRef: externalImageRef,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const internalImageRef = useRef<HTMLImageElement>(null);
  const containerRef = externalContainerRef || internalContainerRef;
  const imageRef = externalImageRef || internalImageRef;
  const lastPinchDistance = useRef<number | null>(null);
  const lastPinchCenter = useRef<{ x: number; y: number } | null>(null);

  // Handle image load with fallback to alternative format
  useEffect(() => {
    setIsLoading(true);
    setImageError(false);
    
    const img = new Image();
      const tryAlternativeFormat = () => {
        // Try alternative format based on page number
        // Determine base path from current imageUrl (preserve qaidah1/qaidah2/quran)
        let basePath = '/qaidah'; // default fallback
        if (imageUrl.includes('/quran/')) {
          basePath = '/quran';
        } else if (imageUrl.includes('/qaidah1/')) {
          basePath = '/qaidah1';
        } else if (imageUrl.includes('/qaidah2/')) {
          basePath = '/qaidah2';
        }
        const baseUrl = `${basePath}/${pageNumber}`;
        const altUrl = imageUrl.endsWith('.png') 
          ? `${baseUrl}.jpg`
          : `${baseUrl}.png`;
      
      const altImg = new Image();
      altImg.onload = () => {
        setIsLoading(false);
        setImageError(false);
        onLoad?.();
        // Update the image source if we're using the alternative
        if (imageRef.current) {
          imageRef.current.src = altUrl;
        }
      };
      altImg.onerror = () => {
        setIsLoading(false);
        setImageError(true);
      };
      altImg.src = altUrl;
    };
    
    img.onload = () => {
      setIsLoading(false);
      setImageError(false);
      onLoad?.();
    };
    img.onerror = tryAlternativeFormat;
    img.src = imageUrl;
  }, [imageUrl, pageNumber, onLoad]);

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
      
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      lastPinchCenter.current = { x: centerX, y: centerY };
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
    lastPinchCenter.current = null;
    setIsDragging(false);
  };

  // Constrain position based on zoom level
  useEffect(() => {
    if (imageRef.current && containerRef.current) {
      const img = imageRef.current;
      const container = containerRef.current;
      const imgWidth = img.naturalWidth * zoom;
      const imgHeight = img.naturalHeight * zoom;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const maxX = Math.max(0, (imgWidth - containerWidth) / 2);
      const maxY = Math.max(0, (imgHeight - containerHeight) / 2);

      const constrainedX = Math.max(-maxX, Math.min(maxX, position.x));
      const constrainedY = Math.max(-maxY, Math.min(maxY, position.y));

      if (constrainedX !== position.x || constrainedY !== position.y) {
        onPositionChange?.({ x: constrainedX, y: constrainedY });
      }
    }
  }, [zoom, position, onPositionChange]);

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
      
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-lg font-semibold">Page {pageNumber} not found</p>
            <p className="text-sm mt-2">Image: {imageUrl}</p>
          </div>
        </div>
      )}

      {!imageError && (
        <img
          ref={imageRef}
          src={imageUrl}
          alt={`Qaidah Page ${pageNumber}`}
          className="max-w-none select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          draggable={false}
        />
      )}
    </div>
  );
};

export default QaidahPage;
