import React from 'react';

interface MushafZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  minZoom?: number;
  maxZoom?: number;
  className?: string;
}

/**
 * Zoom controls for Mushaf content
 * Shows zoom level and provides zoom in/out/reset buttons
 */
export const MushafZoomControls: React.FC<MushafZoomControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  minZoom = 0.8,
  maxZoom = 1.4,
  className = '',
}) => {
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className={`flex items-center gap-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 ${className}`} style={{ direction: 'ltr' }}>
      <button
        onClick={onZoomOut}
        disabled={zoom <= minZoom}
        className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Zoom out"
        title="Zoom out"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>
      
      <button
        onClick={onReset}
        className="px-3 py-1 text-xs font-semibold text-gray-700 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors min-w-[50px]"
        title="Reset zoom to 100%"
      >
        {zoomPercent}%
      </button>
      
      <button
        onClick={onZoomIn}
        disabled={zoom >= maxZoom}
        className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Zoom in"
        title="Zoom in"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
};


