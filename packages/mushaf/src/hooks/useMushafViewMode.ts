import { useState, useEffect, useCallback } from 'react';

export interface MushafViewMode {
  focusMode: boolean;
  toolsHidden: boolean;
  toggleFocusMode: () => void;
  toggleToolsHidden: () => void;
  setFocusMode: (value: boolean) => void;
  setToolsHidden: (value: boolean) => void;
}

/**
 * Hook to manage Mushaf view modes (Focus Mode and Hide Tools)
 * 
 * Focus Mode: Hides all UI tools, expands Mushaf, increases font size
 * Hide Tools: Disables marking interactions but keeps mistakes visible
 */
export function useMushafViewMode(
  focusModeProp?: boolean,
  toolsHiddenProp?: boolean
): MushafViewMode {
  const [focusMode, setFocusModeState] = useState(() => {
    // Default to true on mobile (<= 768px)
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return focusModeProp ?? false;
  });
  
  const [toolsHidden, setToolsHiddenState] = useState(toolsHiddenProp ?? false);

  // Sync with props if provided
  useEffect(() => {
    if (focusModeProp !== undefined) {
      setFocusModeState(focusModeProp);
    }
  }, [focusModeProp]);

  useEffect(() => {
    if (toolsHiddenProp !== undefined) {
      setToolsHiddenState(toolsHiddenProp);
    }
  }, [toolsHiddenProp]);

  // Auto-enable focus mode on mobile
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      if (window.innerWidth <= 768 && focusModeProp === undefined) {
        setFocusModeState(true);
      } else if (window.innerWidth > 768 && focusModeProp === undefined) {
        setFocusModeState(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [focusModeProp]);

  const toggleFocusMode = useCallback(() => {
    setFocusModeState(prev => !prev);
  }, []);

  const toggleToolsHidden = useCallback(() => {
    setToolsHiddenState(prev => !prev);
  }, []);

  const setFocusMode = useCallback((value: boolean) => {
    setFocusModeState(value);
  }, []);

  const setToolsHidden = useCallback((value: boolean) => {
    setToolsHiddenState(value);
  }, []);

  return {
    focusMode,
    toolsHidden,
    toggleFocusMode,
    toggleToolsHidden,
    setFocusMode,
    setToolsHidden,
  };
}


