import { useState, useCallback, useEffect } from 'react';

export interface MushafZoom {
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setZoom: (value: number) => void;
}

const MIN_ZOOM = 0.8;
const MAX_ZOOM = 1.4;
const DEFAULT_ZOOM = 1.0;
const ZOOM_STEP = 0.1;

/**
 * Hook to manage Mushaf zoom state
 * 
 * Zoom range: 80% → 140%
 * Persists zoom state during session
 */
export function useMushafZoom(
  initialZoom?: number,
  onZoomChange?: (zoom: number) => void
): MushafZoom {
  const [zoom, setZoomState] = useState(() => {
    // Try to restore from sessionStorage
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('mushaf_zoom');
      if (saved) {
        const parsed = parseFloat(saved);
        if (parsed >= MIN_ZOOM && parsed <= MAX_ZOOM) {
          return parsed;
        }
      }
    }
    return initialZoom ?? DEFAULT_ZOOM;
  });

  // Sync with prop if provided
  useEffect(() => {
    if (initialZoom !== undefined && initialZoom !== zoom) {
      setZoomState(initialZoom);
    }
  }, [initialZoom]);

  // Persist to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mushaf_zoom', zoom.toString());
    }
  }, [zoom]);

  const setZoom = useCallback((value: number) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
    setZoomState(clamped);
    onZoomChange?.(clamped);
  }, [onZoomChange]);

  const zoomIn = useCallback(() => {
    setZoom(zoom + ZOOM_STEP);
  }, [zoom, setZoom]);

  const zoomOut = useCallback(() => {
    setZoom(zoom - ZOOM_STEP);
  }, [zoom, setZoom]);

  const resetZoom = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
  }, [setZoom]);

  return {
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
  };
}


