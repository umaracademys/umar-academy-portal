import { useEffect, useRef, useCallback } from 'react';

import type React from 'react';

export interface MobileGestures {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onLongPress: (event: React.TouchEvent | React.MouseEvent) => void;
  onDoubleTap: () => void;
  onPinchStart?: (event: React.TouchEvent) => void;
  onPinchMove?: (event: React.TouchEvent, scale: number) => void;
  onPinchEnd?: () => void;
}

interface UseMobileGesturesOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onLongPress?: (event: React.TouchEvent | React.MouseEvent) => void;
  onDoubleTap?: () => void;
  onPinchStart?: (event: React.TouchEvent) => void;
  onPinchMove?: (event: React.TouchEvent, scale: number) => void;
  onPinchEnd?: () => void;
  longPressDelay?: number; // milliseconds
  swipeThreshold?: number; // pixels
}

/**
 * Hook to handle mobile gestures for Mushaf navigation
 * 
 * - Swipe left/right for page navigation
 * - Long-press for mistake marking
 * - Double-tap for Focus Mode toggle
 */
export function useMobileGestures(options: UseMobileGesturesOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onLongPress,
    onDoubleTap,
    onPinchStart,
    onPinchMove,
    onPinchEnd,
    longPressDelay = 500,
    swipeThreshold = 50,
  } = options;

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<number>(0);
  const doubleTapDelay = 300; // milliseconds
  const pinchStartRef = useRef<{ distance: number; touches: Array<{ clientX: number; clientY: number }> } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    // Start long-press timer
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        onLongPress(e);
        touchStartRef.current = null;
      }, longPressDelay);
    }
  }, [onLongPress, longPressDelay]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Clear long-press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Check for swipe (horizontal movement > threshold, minimal vertical movement)
    if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaY) < Math.abs(deltaX) * 0.5) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    // Check for double-tap
    if (deltaTime < 300 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      const now = Date.now();
      if (now - lastTapRef.current < doubleTapDelay && onDoubleTap) {
        onDoubleTap();
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }

    touchStartRef.current = null;
  }, [onSwipeLeft, onSwipeRight, onDoubleTap, swipeThreshold]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Cancel long-press if user moves finger
    if (longPressTimerRef.current && touchStartRef.current) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, []);

  // Handle mouse events for desktop long-press simulation
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        onLongPress(e);
      }, longPressDelay);
    }
  }, [onLongPress, longPressDelay]);

  const handleMouseUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Pinch-to-zoom handlers
  const getDistance = (touches: Array<{ clientX: number; clientY: number }>): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handlePinchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && onPinchStart) {
      const touchesArray: Array<{ clientX: number; clientY: number }> = Array.from(e.touches).map((touch: React.Touch) => ({
        clientX: touch.clientX,
        clientY: touch.clientY
      }));
      const distance = getDistance(touchesArray);
      pinchStartRef.current = { distance, touches: touchesArray };
      onPinchStart(e);
    }
  }, [onPinchStart]);

  const handlePinchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartRef.current && onPinchMove) {
      const touchesArray: Array<{ clientX: number; clientY: number }> = Array.from(e.touches).map((touch: React.Touch) => ({
        clientX: touch.clientX,
        clientY: touch.clientY
      }));
      const currentDistance = getDistance(touchesArray);
      const scale = currentDistance / pinchStartRef.current.distance;
      onPinchMove(e, scale);
    }
  }, [onPinchMove]);

  const handlePinchEnd = useCallback(() => {
    if (onPinchEnd) {
      onPinchEnd();
    }
    pinchStartRef.current = null;
  }, [onPinchEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
    onTouchStartCapture: handlePinchStart,
    onTouchMoveCapture: handlePinchMove,
    onTouchEndCapture: handlePinchEnd,
  };
}

