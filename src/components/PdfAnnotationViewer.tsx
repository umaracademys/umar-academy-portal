/**
 * Enhanced PDF Annotation Viewer
 * 
 * Features:
 * - Undo/Redo system with per-page history
 * - Edit mode: select, resize, reposition, delete, change color
 * - Performance optimizations: smooth freehand lines, batch rendering
 * - Autosave functionality
 * 
 * Design decisions:
 * - Per-page history: Maintains context when switching pages
 * - Selection mode: Click annotations to select/edit (when no tool selected)
 * - Smooth drawing: Uses point reduction and bezier curves for better performance
 * - Autosave: Saves every 10 seconds or on annotation completion
 * 
 * Future extensions:
 * - Multi-select support
 * - Copy/paste annotations
 * - Annotation layers/groups
 * - Export annotations as JSON
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { UndoRedoHistory, Annotation } from '../utils/UndoRedoHistory';
import { 
  hitTestAnnotation, 
  getResizeHandle, 
  resizeAnnotation, 
  moveAnnotation,
  SelectionState 
} from '../utils/AnnotationSelection';

// Set up PDF.js worker
const pdfjsVersion = '5.4.296';
const cdnWorkerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = cdnWorkerUrl;
}

interface PdfAnnotationViewerProps {
  pdfUrl: string;
  annotations?: Annotation[];
  readOnly?: boolean;
  onAnnotationsChange?: (annotations: Annotation[]) => void;
  onSave?: (annotations: Annotation[], notes: string) => Promise<void>;
  showControls?: boolean;
  initialPage?: number;
  initialNotes?: string;
  autosaveInterval?: number; // Autosave interval in seconds (default: 10)
}

const PdfAnnotationViewer: React.FC<PdfAnnotationViewerProps> = (props) => {
  const {
    pdfUrl,
    annotations: externalAnnotations = [],
    readOnly = false,
    onAnnotationsChange,
    onSave,
    showControls = true,
    initialPage = 1,
    initialNotes = '',
    autosaveInterval = 10, // Default 10 seconds
  } = props;

  // Core state
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [zoom, setZoom] = useState(1);
  const [annotations, setAnnotations] = useState<Annotation[]>(externalAnnotations);
  const [selectedTool, setSelectedTool] = useState<'highlight' | 'text' | 'drawing' | 'arrow' | 'note' | 'line' | 'rectangle' | 'circle' | 'diamond' | 'filled-rectangle' | 'filled-circle' | 'filled-diamond' | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(2); // Stroke width for drawing/arrow tools
  const [highlightOpacity, setHighlightOpacity] = useState(0.3); // Opacity for highlights
  const [notes, setNotes] = useState(initialNotes);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  // Edit/Selection state
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedAnnotation: null,
    isResizing: false,
    resizeHandle: null,
    startPoint: null,
    originalAnnotation: null,
  });
  const [isMoving, setIsMoving] = useState(false);

  // Undo/Redo system
  const historyRef = useRef(new UndoRedoHistory());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Autosave
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSaveRef = useRef<Annotation[]>([]);
  const hasUnsavedChangesRef = useRef(false);

  // Refs
  const pageRef = useRef<HTMLDivElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null); // Temporary canvas for real-time drawing preview
  const renderRequestRef = useRef<number | null>(null);
  const drawingPointsRef = useRef<Array<{ x: number; y: number }>>([]); // Use ref to avoid state updates during drawing

  // Update undo/redo button states
  const updateUndoRedoState = useCallback(() => {
    setCanUndo(historyRef.current.canUndo(currentPage));
    setCanRedo(historyRef.current.canRedo(currentPage));
  }, [currentPage]);

  // Initialize annotations from external source
  useEffect(() => {
    if (externalAnnotations && externalAnnotations.length >= 0) {
      setAnnotations(externalAnnotations);
      lastSaveRef.current = externalAnnotations;
      // Initialize history for current page with full annotations array
      // Only initialize if history is empty for this page
      if (!historyRef.current.canUndo(currentPage) && !historyRef.current.canRedo(currentPage)) {
        historyRef.current.saveState(currentPage, externalAnnotations);
        updateUndoRedoState();
      }
    }
  }, [externalAnnotations, currentPage, updateUndoRedoState]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= (numPages || 1)) {
      setCurrentPage(page);
      setIsDrawing(false);
      setDrawingPoints([]);
      drawingPointsRef.current = [];
      setSelectionState({
        selectedAnnotation: null,
        isResizing: false,
        resizeHandle: null,
        startPoint: null,
        originalAnnotation: null,
      });
      // Clear drawing canvas
      if (drawingCanvasRef.current) {
        const ctx = drawingCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
        }
      }
      updateUndoRedoState();
    }
  }, [numPages, updateUndoRedoState]);

  // Convert screen coordinates to normalized (0-1) coordinates
  const screenToNormalized = useCallback((x: number, y: number, pageElement: HTMLElement) => {
    const rect = pageElement.getBoundingClientRect();
    const normalizedX = (x - rect.left) / rect.width;
    const normalizedY = (y - rect.top) / rect.height;
    return { x: Math.max(0, Math.min(1, normalizedX)), y: Math.max(0, Math.min(1, normalizedY)) };
  }, []);

  // Convert normalized to screen coordinates
  const normalizedToScreen = useCallback((x: number, y: number, pageElement: HTMLElement) => {
    const rect = pageElement.getBoundingClientRect();
    return {
      x: x * rect.width,
      y: y * rect.height,
    };
  }, []);

  // Smooth drawing points using point reduction (improves performance)
  // Only smooth if we have many points to avoid unnecessary processing
  const smoothDrawingPoints = useCallback((points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> => {
    if (points.length <= 3) return points;
    
    // For small drawings, just return points as-is
    if (points.length < 20) return points;

    // Use a simpler smoothing algorithm for better performance
    // Average nearby points to create smoother curves
    const smoothed: Array<{ x: number; y: number }> = [points[0]];
    const windowSize = 3;
    
    for (let i = 1; i < points.length - 1; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(points.length, i + Math.ceil(windowSize / 2));
      
      let sumX = 0;
      let sumY = 0;
      let count = 0;
      
      for (let j = start; j < end; j++) {
        sumX += points[j].x;
        sumY += points[j].y;
        count++;
      }
      
      smoothed.push({
        x: sumX / count,
        y: sumY / count
      });
    }
    
    smoothed.push(points[points.length - 1]);
    return smoothed;
  }, []);

  // Update annotations with history tracking
  const updateAnnotations = useCallback((updater: (prev: Annotation[]) => Annotation[], saveToHistory: boolean = true) => {
    setAnnotations(prev => {
      const updated = updater(prev);
      
      // Save to history if requested
      if (saveToHistory) {
        // Save the NEW state (after change) to history
        // This allows undo to go back to the previous state
        console.log('💾 Saving to history - page:', currentPage, 'annotations:', updated.length);
        historyRef.current.saveState(currentPage, updated);
        updateUndoRedoState();
        hasUnsavedChangesRef.current = true;
        console.log('✅ History saved. Can undo?', historyRef.current.canUndo(currentPage));
      }

      // Notify parent
      onAnnotationsChange?.(updated);
      return updated;
    });
  }, [currentPage, onAnnotationsChange, updateUndoRedoState]);

  // Undo action
  const handleUndo = useCallback(() => {
    if (readOnly) return;
    console.log('🔄 Undo called for page', currentPage);
    console.log('📊 Can undo?', historyRef.current.canUndo(currentPage));
    const previousState = historyRef.current.undo(currentPage);
    console.log('📦 Previous state:', previousState ? previousState.length + ' annotations' : 'null');
    if (previousState) {
      setAnnotations(previousState);
      onAnnotationsChange?.(previousState);
      updateUndoRedoState();
      hasUnsavedChangesRef.current = true;
    } else {
      console.log('⚠️ No previous state to undo to');
    }
  }, [readOnly, currentPage, onAnnotationsChange, updateUndoRedoState]);

  // Redo action
  const handleRedo = useCallback(() => {
    if (readOnly) return;
    const nextState = historyRef.current.redo(currentPage);
    if (nextState) {
      setAnnotations(nextState);
      onAnnotationsChange?.(nextState);
      updateUndoRedoState();
      hasUnsavedChangesRef.current = true;
    }
  }, [readOnly, currentPage, onAnnotationsChange, updateUndoRedoState]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (readOnly || !pageRef.current) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = pageRef.current.getBoundingClientRect();
    const screenX = e.clientX;
    const screenY = e.clientY;
    const { x, y } = screenToNormalized(screenX, screenY, pageRef.current);

    // Get current page annotations
    const pageAnnotations = annotations.filter(a => a.page === currentPage);
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;

    // Check if clicking on an existing annotation (edit mode)
    if (!selectedTool && !readOnly) {
      const hitAnnotation = hitTestAnnotation(screenX - rect.left, screenY - rect.top, pageAnnotations, canvasWidth, canvasHeight);
      
      if (hitAnnotation) {
        // Check if clicking on resize handle
        const handle = getResizeHandle(screenX - rect.left, screenY - rect.top, hitAnnotation, canvasWidth, canvasHeight);
        
        if (handle) {
          // Start resizing
          setSelectionState({
            selectedAnnotation: hitAnnotation,
            isResizing: true,
            resizeHandle: handle,
            startPoint: { x, y },
            originalAnnotation: { ...hitAnnotation },
          });
          return;
        } else {
          // Start moving
          setSelectionState({
            selectedAnnotation: hitAnnotation,
            isResizing: false,
            resizeHandle: null,
            startPoint: { x, y },
            originalAnnotation: { ...hitAnnotation },
          });
          setIsMoving(true);
          return;
        }
      } else {
        // Deselect
        setSelectionState({
          selectedAnnotation: null,
          isResizing: false,
          resizeHandle: null,
          startPoint: null,
          originalAnnotation: null,
        });
      }
    }

    // Create new annotation
    if (!selectedTool) return;

    setStartPoint({ x, y });

    if (selectedTool === 'drawing') {
      setIsDrawing(true);
      drawingPointsRef.current = [{ x, y }];
      setDrawingPoints([{ x, y }]);
      
      // Initialize drawing canvas for real-time preview
      if (drawingCanvasRef.current && pageRef.current) {
        const canvas = drawingCanvasRef.current;
        const rect = pageRef.current.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = selectedColor;
          ctx.lineWidth = strokeWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          const startX = x * rect.width;
          const startY = y * rect.height;
          ctx.moveTo(startX, startY);
        }
      }
    } else if (selectedTool === 'highlight' || selectedTool === 'arrow' || selectedTool === 'note') {
      setIsDragging(true);
      const newAnnotation: Annotation = {
        id: `${Date.now()}-${Math.random()}`,
        page: currentPage,
        type: selectedTool,
        x,
        y,
        color: selectedColor,
        width: 0,
        height: 0,
        ...(selectedTool === 'highlight' ? { opacity: highlightOpacity } : {}),
        ...(selectedTool === 'arrow' || selectedTool === 'drawing' ? { strokeWidth: strokeWidth } : {}),
      } as any;
      setCurrentAnnotation(newAnnotation);
      updateAnnotations(prev => [...prev, newAnnotation], false); // Don't save to history yet
    } else if (['line', 'rectangle', 'circle', 'diamond', 'filled-rectangle', 'filled-circle', 'filled-diamond'].includes(selectedTool)) {
      // Shape drawing
      setIsDragging(true);
      const isFilled = selectedTool.startsWith('filled-');
      const newAnnotation: Annotation = {
        id: `${Date.now()}-${Math.random()}`,
        page: currentPage,
        type: selectedTool as any,
        x,
        y,
        color: selectedColor,
        width: 0,
        height: 0,
        strokeWidth: strokeWidth,
        isFilled: isFilled,
      } as any;
      setCurrentAnnotation(newAnnotation);
      updateAnnotations(prev => [...prev, newAnnotation], false); // Don't save to history yet
    } else if (selectedTool === 'text') {
      const newAnnotation: Annotation = {
        id: `${Date.now()}-${Math.random()}`,
        page: currentPage,
        type: 'text',
        x,
        y,
        color: selectedColor,
        text: '',
        width: 0.2,
        height: 0.05,
      };
      updateAnnotations(prev => [...prev, newAnnotation], false);
      
      const text = prompt('Enter text:');
      if (text !== null && text.trim()) {
        updateAnnotations(prev => 
          prev.map(a => a.id === newAnnotation.id ? { ...a, text, note: text } : a),
          true
        );
      } else {
        updateAnnotations(prev => prev.filter(a => a.id !== newAnnotation.id), false);
      }
    }
  }, [readOnly, selectedTool, currentPage, selectedColor, screenToNormalized, annotations, updateAnnotations]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (readOnly || !pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const screenX = e.clientX;
    const screenY = e.clientY;
    const { x, y } = screenToNormalized(screenX, screenY, pageRef.current);

    // Handle resizing
    if (selectionState.isResizing && selectionState.selectedAnnotation && selectionState.startPoint && selectionState.originalAnnotation) {
      const deltaX = x - selectionState.startPoint.x;
      const deltaY = y - selectionState.startPoint.y;
      const resized = resizeAnnotation(
        selectionState.selectedAnnotation,
        selectionState.resizeHandle!,
        x,
        y,
        selectionState.startPoint.x,
        selectionState.startPoint.y,
        selectionState.originalAnnotation
      );
      
      updateAnnotations(prev => 
        prev.map(a => a.id === selectionState.selectedAnnotation!.id ? resized : a),
        false // Don't save to history during drag
      );
      return;
    }

    // Handle moving
    if (isMoving && selectionState.selectedAnnotation && selectionState.startPoint) {
      const deltaX = x - selectionState.startPoint.x;
      const deltaY = y - selectionState.startPoint.y;
      const moved = moveAnnotation(selectionState.selectedAnnotation, deltaX, deltaY);
      
      updateAnnotations(prev => 
        prev.map(a => a.id === selectionState.selectedAnnotation!.id ? moved : a),
        false // Don't save to history during drag
      );
      return;
    }

    // Handle drawing - use ref for performance, render directly to canvas
    if (selectedTool === 'drawing' && isDrawing) {
      if (!pageRef.current || !drawingCanvasRef.current) return;
      
      const rect = pageRef.current.getBoundingClientRect();
      const canvas = drawingCanvasRef.current;
      
      // Ensure canvas is properly sized
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.strokeStyle = selectedColor;
          ctx.lineWidth = strokeWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          // Redraw all points if canvas was resized
          if (drawingPointsRef.current.length > 0) {
            ctx.beginPath();
            const firstPoint = drawingPointsRef.current[0];
            ctx.moveTo(firstPoint.x * rect.width, firstPoint.y * rect.height);
            for (let i = 1; i < drawingPointsRef.current.length; i++) {
              const pt = drawingPointsRef.current[i];
              ctx.lineTo(pt.x * rect.width, pt.y * rect.height);
            }
            ctx.stroke();
          }
        }
      }
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const screenX = x * rect.width;
        const screenY = y * rect.height;
        
        // Add point to ref (for final annotation)
        drawingPointsRef.current.push({ x, y });
        
        // Draw line segment in real-time with smooth rendering
        ctx.lineTo(screenX, screenY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
      }
      
      return;
    }

    // Handle dragging new annotation
    if ((selectedTool === 'highlight' || selectedTool === 'arrow' || selectedTool === 'note' || 
         (selectedTool && ['line', 'rectangle', 'circle', 'diamond', 'filled-rectangle', 'filled-circle', 'filled-diamond'].includes(selectedTool))) 
        && isDragging && startPoint && currentAnnotation) {
      let width = Math.abs(x - startPoint.x);
      let height = Math.abs(y - startPoint.y);
      let newX = Math.min(x, startPoint.x);
      let newY = Math.min(y, startPoint.y);
      
      // Perfect square/circle when Shift is pressed
      if (isShiftPressed && selectedTool && (selectedTool === 'rectangle' || selectedTool === 'circle' || 
          selectedTool === 'filled-rectangle' || selectedTool === 'filled-circle' ||
          selectedTool === 'diamond' || selectedTool === 'filled-diamond')) {
        const size = Math.max(width, height);
        width = size;
        height = size;
      }
      
      updateAnnotations(prev => 
        prev.map(a => 
          a.id === currentAnnotation.id 
            ? { ...a, x: newX, y: newY, width, height }
            : a
        ),
        false // Don't save to history during drag
      );
    }
  }, [readOnly, selectedTool, isDrawing, isDragging, isMoving, selectionState, startPoint, currentAnnotation, screenToNormalized, updateAnnotations]);

  // Handle mouse up
  const handleMouseUp = useCallback((e?: React.MouseEvent) => {
    if (readOnly) return;

    // Finalize drawing
    if (selectedTool === 'drawing' && isDrawing) {
      // Clear drawing canvas
      if (drawingCanvasRef.current) {
        const ctx = drawingCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
        }
      }
      
      // Use points from ref (captured all points during drawing)
      const finalPoints = drawingPointsRef.current.length > 0 ? drawingPointsRef.current : drawingPoints;
      
      if (finalPoints.length > 1) {
        // Smooth points for better appearance
        const smoothedPoints = smoothDrawingPoints(finalPoints);
        
        const newAnnotation: Annotation = {
          id: `${Date.now()}-${Math.random()}`,
          page: currentPage,
          type: 'drawing',
          x: smoothedPoints[0].x,
          y: smoothedPoints[0].y,
          color: selectedColor,
          points: smoothedPoints,
          strokeWidth: strokeWidth,
        } as any;
        updateAnnotations(prev => [...prev, newAnnotation], true); // Save to history
      }
      
      // Reset drawing ref
      drawingPointsRef.current = [];
    }

    // Finalize dragging new annotation
    if (isDragging && currentAnnotation && startPoint) {
      const finalWidth = currentAnnotation.width || 0;
      const finalHeight = currentAnnotation.height || 0;
      
      // Remove tiny annotations (accidental clicks)
      if (finalWidth < 0.01 && finalHeight < 0.01) {
        updateAnnotations(prev => prev.filter(a => a.id !== currentAnnotation.id), true);
      } else {
        // Save to history when drag completes
        updateAnnotations(prev => prev, true);
      }
    }

    // Finalize resize/move
    if (selectionState.isResizing || isMoving) {
      updateAnnotations(prev => prev, true); // Save to history
    }

    // Clean up
    setIsDrawing(false);
    setIsDragging(false);
    setIsMoving(false);
    setDrawingPoints([]);
    drawingPointsRef.current = [];
    setCurrentAnnotation(null);
    setStartPoint(null);
    
    // Clear drawing canvas
    if (drawingCanvasRef.current) {
      const ctx = drawingCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
      }
    }
    setSelectionState(prev => ({
      ...prev,
      isResizing: false,
      startPoint: null,
    }));
  }, [readOnly, selectedTool, isDrawing, isDragging, isMoving, drawingPoints, currentPage, selectedColor, currentAnnotation, selectionState, smoothDrawingPoints, updateAnnotations]);

  // Delete selected annotation
  const handleDeleteSelected = useCallback(() => {
    if (readOnly || !selectionState.selectedAnnotation) return;
    updateAnnotations(prev => prev.filter(a => a.id !== selectionState.selectedAnnotation!.id), true);
    setSelectionState({
      selectedAnnotation: null,
      isResizing: false,
      resizeHandle: null,
      startPoint: null,
      originalAnnotation: null,
    });
  }, [readOnly, selectionState, updateAnnotations]);

  // Change color of selected annotation
  const handleChangeColor = useCallback((color: string) => {
    if (readOnly || !selectionState.selectedAnnotation) return;
    updateAnnotations(prev => 
      prev.map(a => a.id === selectionState.selectedAnnotation!.id ? { ...a, color } : a),
      true
    );
  }, [readOnly, selectionState, updateAnnotations]);

  // Autosave function
  const performAutosave = useCallback(async () => {
    if (!onSave || isSaving || !hasUnsavedChangesRef.current) return;

    const currentAnnotations = annotations;
    // Only save if annotations actually changed
    if (JSON.stringify(currentAnnotations) === JSON.stringify(lastSaveRef.current)) {
      return;
    }

    try {
      setIsSaving(true);
      await onSave(currentAnnotations, notes);
      lastSaveRef.current = currentAnnotations;
      hasUnsavedChangesRef.current = false;
      console.log('✅ Autosaved annotations');
    } catch (error) {
      console.error('❌ Autosave failed:', error);
      // Don't show alert for autosave failures to avoid interrupting user
    } finally {
      setIsSaving(false);
    }
  }, [onSave, annotations, notes, isSaving]);

  // Setup autosave timer
  useEffect(() => {
    if (readOnly || !onSave) return;

    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearInterval(autosaveTimerRef.current);
    }

    // Set up new timer
    autosaveTimerRef.current = setInterval(() => {
      performAutosave();
    }, autosaveInterval * 1000);

    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current);
      }
    };
  }, [readOnly, onSave, autosaveInterval, performAutosave]);

  // Manual save
  const handleSave = useCallback(async () => {
    if (!onSave || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(annotations, notes);
      lastSaveRef.current = annotations;
      hasUnsavedChangesRef.current = false;
    } catch (error) {
      console.error('Error saving annotations:', error);
      alert('Failed to save annotations');
    } finally {
      setIsSaving(false);
    }
  }, [onSave, annotations, notes, isSaving]);

  // Optimized rendering with requestAnimationFrame
  const renderAnnotations = useCallback(() => {
    if (!annotationCanvasRef.current || !pageRef.current || !pageDimensions) return;

    const canvas = annotationCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = pageRef.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw annotations for current page
    const pageAnnotations = annotations.filter(a => a.page === currentPage);
    
    // Batch render for better performance
    pageAnnotations.forEach(annotation => {
      ctx.save();
      ctx.strokeStyle = annotation.color;
      ctx.fillStyle = annotation.color;
      // Use strokeWidth from annotation if available, otherwise default to 2
      ctx.lineWidth = (annotation as any).strokeWidth || strokeWidth;

      const x = annotation.x * canvas.width;
      const y = annotation.y * canvas.height;
      const isSelected = selectionState.selectedAnnotation?.id === annotation.id;

      // Draw selection highlight
      if (isSelected && !readOnly) {
        ctx.strokeStyle = '#0066FF';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        if (annotation.width && annotation.height) {
          ctx.strokeRect(
            x - 2,
            y - 2,
            annotation.width * canvas.width + 4,
            annotation.height * canvas.height + 4
          );
        }
        ctx.setLineDash([]);
        ctx.lineWidth = 2;
      }

      switch (annotation.type) {
        case 'highlight':
          ctx.globalAlpha = (annotation as any).opacity || highlightOpacity;
          const highlightWidth = (annotation.width || 0.1) * canvas.width;
          const highlightHeight = (annotation.height || 0.05) * canvas.height;
          if (highlightWidth > 0 && highlightHeight > 0) {
            ctx.fillRect(x, y, highlightWidth, highlightHeight);
          }
          ctx.globalAlpha = 1;
          break;

        case 'arrow':
          const arrowWidth = (annotation.width || 0.1) * canvas.width;
          const arrowHeight = (annotation.height || 0.05) * canvas.height;
          const arrowStrokeWidth = (annotation as any).strokeWidth || strokeWidth;
          if (arrowWidth !== 0 || arrowHeight !== 0) {
            ctx.lineWidth = arrowStrokeWidth;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + arrowWidth, y + arrowHeight);
            ctx.stroke();
            if (Math.abs(arrowWidth) > 5 || Math.abs(arrowHeight) > 5) {
              const angle = Math.atan2(arrowHeight, arrowWidth);
              const arrowheadSize = Math.max(8, arrowStrokeWidth * 2);
              ctx.beginPath();
              ctx.moveTo(x + arrowWidth, y + arrowHeight);
              ctx.lineTo(
                x + arrowWidth - arrowheadSize * Math.cos(angle - Math.PI / 6),
                y + arrowHeight - arrowheadSize * Math.sin(angle - Math.PI / 6)
              );
              ctx.lineTo(
                x + arrowWidth - arrowheadSize * Math.cos(angle + Math.PI / 6),
                y + arrowHeight - arrowheadSize * Math.sin(angle + Math.PI / 6)
              );
              ctx.closePath();
              ctx.fill();
            }
          }
          break;

        case 'drawing':
          if (annotation.points && annotation.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(annotation.points[0].x * canvas.width, annotation.points[0].y * canvas.height);
            for (let i = 1; i < annotation.points.length; i++) {
              ctx.lineTo(annotation.points[i].x * canvas.width, annotation.points[i].y * canvas.height);
            }
            ctx.stroke();
          }
          break;

        case 'note':
          ctx.fillStyle = '#FFFF00';
          ctx.fillRect(x, y, 20, 20);
          if (annotation.text) {
            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.fillText(annotation.text, x + 25, y + 15);
          }
          break;

        case 'text':
          if (annotation.text) {
            ctx.fillStyle = annotation.color || '#000000';
            ctx.font = '14px Arial';
            ctx.fillText(annotation.text, x * canvas.width, y * canvas.height);
          }
          break;

        case 'line':
          const lineWidth = (annotation.width || 0.1) * canvas.width;
          const lineHeight = (annotation.height || 0.05) * canvas.height;
          if (lineWidth !== 0 || lineHeight !== 0) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + lineWidth, y + lineHeight);
            ctx.stroke();
          }
          break;

        case 'rectangle':
        case 'filled-rectangle': {
          const rectWidth = (annotation.width || 0.1) * canvas.width;
          const rectHeight = (annotation.height || 0.05) * canvas.height;
          if (rectWidth > 0 && rectHeight > 0) {
            if (annotation.isFilled || annotation.type === 'filled-rectangle') {
              ctx.fillRect(x, y, rectWidth, rectHeight);
            } else {
              ctx.strokeRect(x, y, rectWidth, rectHeight);
            }
          }
          break;
        }

        case 'circle':
        case 'filled-circle': {
          const circleWidth = (annotation.width || 0.1) * canvas.width;
          const circleHeight = (annotation.height || 0.05) * canvas.height;
          const radiusX = Math.abs(circleWidth) / 2;
          const radiusY = Math.abs(circleHeight) / 2;
          const centerX = x + circleWidth / 2;
          const centerY = y + circleHeight / 2;
          const radius = Math.max(radiusX, radiusY);
          
          if (radius > 0) {
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radius, radius, 0, 0, 2 * Math.PI);
            if (annotation.isFilled || annotation.type === 'filled-circle') {
              ctx.fill();
            } else {
              ctx.stroke();
            }
          }
          break;
        }

        case 'diamond':
        case 'filled-diamond': {
          const diamondWidth = (annotation.width || 0.1) * canvas.width;
          const diamondHeight = (annotation.height || 0.05) * canvas.height;
          if (diamondWidth > 0 && diamondHeight > 0) {
            const centerX = x + diamondWidth / 2;
            const centerY = y + diamondHeight / 2;
            ctx.beginPath();
            ctx.moveTo(centerX, y); // Top
            ctx.lineTo(x + diamondWidth, centerY); // Right
            ctx.lineTo(centerX, y + diamondHeight); // Bottom
            ctx.lineTo(x, centerY); // Left
            ctx.closePath();
            if (annotation.isFilled || annotation.type === 'filled-diamond') {
              ctx.fill();
            } else {
              ctx.stroke();
            }
          }
          break;
        }
      }

      // Draw resize handles for selected annotation
      if (isSelected && !readOnly && annotation.width && annotation.height) {
        const handles = [
          { x: x, y: y, type: 'nw' },
          { x: x + annotation.width * canvas.width, y: y, type: 'ne' },
          { x: x, y: y + annotation.height * canvas.height, type: 'sw' },
          { x: x + annotation.width * canvas.width, y: y + annotation.height * canvas.height, type: 'se' },
        ];

        ctx.fillStyle = '#0066FF';
        handles.forEach(handle => {
          ctx.fillRect(handle.x - 4, handle.y - 4, 8, 8);
        });
      }

      ctx.restore();
    });
  }, [annotations, currentPage, pageDimensions, selectionState, readOnly]);

  // Render with requestAnimationFrame for smooth updates
  useEffect(() => {
    if (renderRequestRef.current) {
      cancelAnimationFrame(renderRequestRef.current);
    }
    renderRequestRef.current = requestAnimationFrame(renderAnnotations);
    return () => {
      if (renderRequestRef.current) {
        cancelAnimationFrame(renderRequestRef.current);
      }
    };
  }, [renderAnnotations]);

  // Keyboard shortcuts
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z / Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl+Shift+Z / Cmd+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
      // Delete key to remove selected annotation
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectionState.selectedAnnotation) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
      // Escape to deselect
      if (e.key === 'Escape') {
        setSelectionState({
          selectedAnnotation: null,
          isResizing: false,
          resizeHandle: null,
          startPoint: null,
          originalAnnotation: null,
        });
        setSelectedTool(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, handleUndo, handleRedo, selectionState, handleDeleteSelected]);

  // Extended color palette
  const colors = [
    '#FF0000', '#FF6B6B', '#FFA500', '#FFD700', '#FFFF00', '#ADFF2F', '#00FF00', '#00CED1',
    '#00BFFF', '#0000FF', '#8A2BE2', '#FF00FF', '#FF1493', '#DC143C', '#000000', '#808080',
    '#FFFFFF', '#F5F5F5', '#D3D3D3', '#A9A9A9'
  ];

  // Helper to deselect tool and clear selection
  const deselectTool = useCallback(() => {
    setSelectedTool(null);
    setSelectionState({
      selectedAnnotation: null,
      isResizing: false,
      resizeHandle: null,
      startPoint: null,
      originalAnnotation: null,
    });
  }, []);

  // Reset zoom to 100%
  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {showControls && !readOnly && (
        <div className="relative bg-gradient-to-b from-gray-800 via-gray-700 to-gray-800 border-b border-gray-900 shadow-2xl flex-shrink-0">
          {/* Vertical Light Strip on Left */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-gray-400 via-gray-500 to-transparent opacity-30 blur-sm"></div>
          
          <div className="relative p-2 space-y-2 overflow-x-auto">
            {/* Compact Single Row: All Controls */}
            <div className="flex items-center gap-2 flex-nowrap min-w-max">
              {/* History Controls */}
              <div className="flex items-center gap-1 bg-gray-900/50 backdrop-blur-sm rounded-md border border-gray-600/30 p-1 shadow-lg flex-shrink-0">
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className={`px-2.5 py-1.5 rounded transition-all text-sm ${
                    canUndo 
                      ? 'bg-gray-700/80 text-gray-200 hover:bg-gray-600 border border-gray-500/50' 
                      : 'bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700/30'
                  }`}
                  title="Undo (Ctrl+Z)"
                >
                  <span className="text-base">↶</span>
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className={`px-2.5 py-1.5 rounded transition-all text-sm ${
                    canRedo 
                      ? 'bg-gray-700/80 text-gray-200 hover:bg-gray-600 border border-gray-500/50' 
                      : 'bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700/30'
                  }`}
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <span className="text-base">↷</span>
                </button>
              </div>

              {/* Selection Mode Button */}
              <button
                onClick={deselectTool}
                className={`px-3 py-1.5 rounded-md border transition-all text-sm font-medium flex-shrink-0 ${
                  !selectedTool
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-500'
                    : 'bg-gray-700/60 text-gray-300 border-gray-600/50 hover:bg-gray-600/60 hover:text-white'
                }`}
                title="Selection Mode"
              >
                👆
              </button>

              {/* Annotation Tools */}
              <div className="flex items-center gap-1.5 bg-gray-900/40 backdrop-blur-sm rounded-md border border-gray-600/30 p-1.5 shadow-lg flex-shrink-0">
                <button
                  onClick={() => {
                    const newTool = selectedTool === 'highlight' ? null : 'highlight';
                    setSelectedTool(newTool);
                    if (newTool) {
                      setSelectionState({
                        selectedAnnotation: null,
                        isResizing: false,
                        resizeHandle: null,
                        startPoint: null,
                        originalAnnotation: null,
                      });
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded transition-all text-sm ${
                    selectedTool === 'highlight'
                      ? 'bg-gradient-to-r from-yellow-500/80 to-yellow-600/80 text-white border border-yellow-400/50'
                      : 'bg-gray-700/60 text-gray-300 border border-gray-600/50 hover:bg-gray-600/60'
                  }`}
                  title="Highlight"
                >
                  🖍️
                </button>
                <button
                  onClick={() => {
                    const newTool = selectedTool === 'text' ? null : 'text';
                    setSelectedTool(newTool);
                    if (newTool) {
                      setSelectionState({
                        selectedAnnotation: null,
                        isResizing: false,
                        resizeHandle: null,
                        startPoint: null,
                        originalAnnotation: null,
                      });
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded transition-all text-sm ${
                    selectedTool === 'text'
                      ? 'bg-gradient-to-r from-blue-500/80 to-blue-600/80 text-white border border-blue-400/50'
                      : 'bg-gray-700/60 text-gray-300 border border-gray-600/50 hover:bg-gray-600/60'
                  }`}
                  title="Text"
                >
                  📝
                </button>
                <button
                  onClick={() => {
                    const newTool = selectedTool === 'drawing' ? null : 'drawing';
                    setSelectedTool(newTool);
                    if (newTool) {
                      setSelectionState({
                        selectedAnnotation: null,
                        isResizing: false,
                        resizeHandle: null,
                        startPoint: null,
                        originalAnnotation: null,
                      });
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded transition-all text-sm ${
                    selectedTool === 'drawing'
                      ? 'bg-gradient-to-r from-purple-500/80 to-purple-600/80 text-white border border-purple-400/50'
                      : 'bg-gray-700/60 text-gray-300 border border-gray-600/50 hover:bg-gray-600/60'
                  }`}
                  title="Draw"
                >
                  ✍️
                </button>
                <button
                  onClick={() => {
                    const newTool = selectedTool === 'arrow' ? null : 'arrow';
                    setSelectedTool(newTool);
                    if (newTool) {
                      setSelectionState({
                        selectedAnnotation: null,
                        isResizing: false,
                        resizeHandle: null,
                        startPoint: null,
                        originalAnnotation: null,
                      });
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded transition-all text-sm ${
                    selectedTool === 'arrow'
                      ? 'bg-gradient-to-r from-red-500/80 to-red-600/80 text-white border border-red-400/50'
                      : 'bg-gray-700/60 text-gray-300 border border-gray-600/50 hover:bg-gray-600/60'
                  }`}
                  title="Arrow"
                >
                  ➡️
                </button>
              </div>

              {/* Shapes Section */}
              <div className="flex items-center gap-1.5 bg-gray-900/40 backdrop-blur-sm rounded-md border border-gray-600/30 p-1.5 shadow-lg flex-shrink-0">
                <span className="text-xs font-semibold text-gray-400 px-1">Shapes:</span>
                {/* Line */}
                <button
                  onClick={() => {
                    const newTool = selectedTool === 'line' ? null : 'line';
                    setSelectedTool(newTool);
                    if (newTool) {
                      setSelectionState({
                        selectedAnnotation: null,
                        isResizing: false,
                        resizeHandle: null,
                        startPoint: null,
                        originalAnnotation: null,
                      });
                    }
                  }}
                  className={`w-10 h-10 rounded transition-all flex items-center justify-center ${
                    selectedTool === 'line'
                      ? 'bg-gradient-to-r from-blue-500/80 to-blue-600/80 text-white border-2 border-blue-400/50 shadow-md'
                      : 'bg-gray-700/60 text-gray-300 border border-gray-600/50 hover:bg-gray-600/60'
                  }`}
                  title="Line"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="2" y1="10" x2="18" y2="10" />
                  </svg>
                </button>
                {/* Rectangle */}
                <button
                  onClick={() => {
                    const newTool = selectedTool === 'rectangle' ? null : 'rectangle';
                    setSelectedTool(newTool);
                    if (newTool) {
                      setSelectionState({
                        selectedAnnotation: null,
                        isResizing: false,
                        resizeHandle: null,
                        startPoint: null,
                        originalAnnotation: null,
                      });
                    }
                  }}
                  className={`w-10 h-10 rounded transition-all flex items-center justify-center ${
                    selectedTool === 'rectangle'
                      ? 'bg-gradient-to-r from-blue-500/80 to-blue-600/80 text-white border-2 border-blue-400/50 shadow-md'
                      : 'bg-gray-700/60 text-gray-300 border border-gray-600/50 hover:bg-gray-600/60'
                  }`}
                  title="Rectangle"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="4" width="12" height="12" />
                  </svg>
                </button>
                {/* Circle */}
                <button
                  onClick={() => {
                    const newTool = selectedTool === 'circle' ? null : 'circle';
                    setSelectedTool(newTool);
                    if (newTool) {
                      setSelectionState({
                        selectedAnnotation: null,
                        isResizing: false,
                        resizeHandle: null,
                        startPoint: null,
                        originalAnnotation: null,
                      });
                    }
                  }}
                  className={`w-10 h-10 rounded transition-all flex items-center justify-center ${
                    selectedTool === 'circle'
                      ? 'bg-gradient-to-r from-blue-500/80 to-blue-600/80 text-white border-2 border-blue-400/50 shadow-md'
                      : 'bg-gray-700/60 text-gray-300 border border-gray-600/50 hover:bg-gray-600/60'
                  }`}
                  title="Circle"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="10" cy="10" r="6" />
                  </svg>
                </button>
                {/* Diamond */}
                <button
                  onClick={() => {
                    const newTool = selectedTool === 'diamond' ? null : 'diamond';
                    setSelectedTool(newTool);
                    if (newTool) {
                      setSelectionState({
                        selectedAnnotation: null,
                        isResizing: false,
                        resizeHandle: null,
                        startPoint: null,
                        originalAnnotation: null,
                      });
                    }
                  }}
                  className={`w-10 h-10 rounded transition-all flex items-center justify-center ${
                    selectedTool === 'diamond'
                      ? 'bg-gradient-to-r from-blue-500/80 to-blue-600/80 text-white border-2 border-blue-400/50 shadow-md'
                      : 'bg-gray-700/60 text-gray-300 border border-gray-600/50 hover:bg-gray-600/60'
                  }`}
                  title="Diamond"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 4 L16 10 L10 16 L4 10 Z" />
                  </svg>
                </button>
                {/* Filled Rectangle */}
                <button
                  onClick={() => {
                    const newTool = selectedTool === 'filled-rectangle' ? null : 'filled-rectangle';
                    setSelectedTool(newTool);
                    if (newTool) {
                      setSelectionState({
                        selectedAnnotation: null,
                        isResizing: false,
                        resizeHandle: null,
                        startPoint: null,
                        originalAnnotation: null,
                      });
                    }
                  }}
                  className={`w-10 h-10 rounded transition-all flex items-center justify-center ${
                    selectedTool === 'filled-rectangle'
                      ? 'bg-gradient-to-r from-blue-500/80 to-blue-600/80 text-white border-2 border-blue-400/50 shadow-md'
                      : 'bg-gray-700/60 text-gray-300 border border-gray-600/50 hover:bg-gray-600/60'
                  }`}
                  title="Filled Rectangle"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <rect x="4" y="4" width="12" height="12" />
                  </svg>
                </button>
                {/* Filled Circle */}
                <button
                  onClick={() => {
                    const newTool = selectedTool === 'filled-circle' ? null : 'filled-circle';
                    setSelectedTool(newTool);
                    if (newTool) {
                      setSelectionState({
                        selectedAnnotation: null,
                        isResizing: false,
                        resizeHandle: null,
                        startPoint: null,
                        originalAnnotation: null,
                      });
                    }
                  }}
                  className={`w-10 h-10 rounded transition-all flex items-center justify-center ${
                    selectedTool === 'filled-circle'
                      ? 'bg-gradient-to-r from-blue-500/80 to-blue-600/80 text-white border-2 border-blue-400/50 shadow-md'
                      : 'bg-gray-700/60 text-gray-300 border border-gray-600/50 hover:bg-gray-600/60'
                  }`}
                  title="Filled Circle"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <circle cx="10" cy="10" r="6" />
                  </svg>
                </button>
                {/* Filled Diamond */}
                <button
                  onClick={() => {
                    const newTool = selectedTool === 'filled-diamond' ? null : 'filled-diamond';
                    setSelectedTool(newTool);
                    if (newTool) {
                      setSelectionState({
                        selectedAnnotation: null,
                        isResizing: false,
                        resizeHandle: null,
                        startPoint: null,
                        originalAnnotation: null,
                      });
                    }
                  }}
                  className={`w-10 h-10 rounded transition-all flex items-center justify-center ${
                    selectedTool === 'filled-diamond'
                      ? 'bg-gradient-to-r from-blue-500/80 to-blue-600/80 text-white border-2 border-blue-400/50 shadow-md'
                      : 'bg-gray-700/60 text-gray-300 border border-gray-600/50 hover:bg-gray-600/60'
                  }`}
                  title="Filled Diamond"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 4 L16 10 L10 16 L4 10 Z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const newTool = selectedTool === 'note' ? null : 'note';
                    setSelectedTool(newTool);
                    if (newTool) {
                      setSelectionState({
                        selectedAnnotation: null,
                        isResizing: false,
                        resizeHandle: null,
                        startPoint: null,
                        originalAnnotation: null,
                      });
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded transition-all text-sm ${
                    selectedTool === 'note'
                      ? 'bg-gradient-to-r from-green-500/80 to-green-600/80 text-white border border-green-400/50'
                      : 'bg-gray-700/60 text-gray-300 border border-gray-600/50 hover:bg-gray-600/60'
                  }`}
                  title="Note"
                >
                  📌
                </button>
              </div>

              {/* Color Picker - Compact */}
              <div className="flex items-center gap-1.5 bg-gray-900/40 backdrop-blur-sm rounded-md border border-gray-600/30 p-1.5 shadow-lg flex-shrink-0">
                <span className="text-xs font-semibold text-gray-300">Color:</span>
                <div className="flex gap-1 max-w-xs overflow-x-auto">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        setSelectedColor(color);
                        if (selectionState.selectedAnnotation) {
                          handleChangeColor(color);
                        }
                      }}
                      className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 flex-shrink-0 ${
                        selectedColor === color 
                          ? 'border-gray-200 ring-1 ring-offset-1 ring-gray-400/50 scale-110' 
                          : 'border-gray-600/50 hover:border-gray-500/70'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Stroke Width - Compact */}
              {(selectedTool === 'drawing' || selectedTool === 'arrow' || 
                (selectedTool && ['line', 'rectangle', 'circle', 'diamond', 'filled-rectangle', 'filled-circle', 'filled-diamond'].includes(selectedTool))) && (
                <div className="flex items-center gap-1.5 bg-gray-900/40 backdrop-blur-sm rounded-md border border-gray-600/30 p-1.5 shadow-lg flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-300">W:</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(Number(e.target.value))}
                    className="w-20 accent-gray-500"
                  />
                  <span className="text-xs text-gray-300 w-6 font-medium">{strokeWidth}</span>
                </div>
              )}

              {/* Opacity - Compact */}
              {selectedTool === 'highlight' && (
                <div className="flex items-center gap-1.5 bg-gray-900/40 backdrop-blur-sm rounded-md border border-gray-600/30 p-1.5 shadow-lg flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-300">Op:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={highlightOpacity}
                    onChange={(e) => setHighlightOpacity(Number(e.target.value))}
                    className="w-20 accent-gray-500"
                  />
                  <span className="text-xs text-gray-300 w-8 font-medium">{Math.round(highlightOpacity * 100)}%</span>
                </div>
              )}

              {/* Edit Tools - Compact */}
              {selectionState.selectedAnnotation && (
                <div className="flex items-center gap-1.5 bg-red-900/30 backdrop-blur-sm rounded-md border border-red-600/30 p-1.5 shadow-lg flex-shrink-0">
                  <button
                    onClick={handleDeleteSelected}
                    className="px-2.5 py-1.5 rounded bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 transition-all text-sm font-medium border border-red-500/50"
                    title="Delete (Del)"
                  >
                    🗑️
                  </button>
                  <button
                    onClick={deselectTool}
                    className="px-2 py-1.5 rounded bg-gray-700/60 text-gray-300 hover:bg-gray-600/60 hover:text-white transition-all text-sm border border-gray-600/50"
                    title="Deselect"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Zoom Controls - Compact */}
              <div className="flex items-center gap-1 bg-gray-900/40 backdrop-blur-sm rounded-md border border-gray-600/30 p-1 shadow-lg flex-shrink-0 ml-auto">
                <button
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                  className="px-2.5 py-1.5 bg-gray-700/60 text-gray-300 rounded border border-gray-600/50 hover:bg-gray-600/60 hover:text-white transition-all text-sm font-semibold"
                  title="Zoom Out"
                >
                  −
                </button>
                <button
                  onClick={handleResetZoom}
                  className="px-2.5 py-1.5 bg-gray-700/60 text-gray-300 rounded border border-gray-600/50 hover:bg-gray-600/60 hover:text-white transition-all text-xs font-medium min-w-[45px]"
                  title="Reset to 100%"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                  className="px-2.5 py-1.5 bg-gray-700/60 text-gray-300 rounded border border-gray-600/50 hover:bg-gray-600/60 hover:text-white transition-all text-sm font-semibold"
                  title="Zoom In"
                >
                  +
                </button>
              </div>

              {/* Save Button - Always Visible */}
              {onSave && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all text-sm flex-shrink-0 ${
                    isSaving
                      ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed border border-gray-700/30'
                      : 'bg-gradient-to-r from-green-600 to-green-700 text-white border border-green-500/50 hover:from-green-500 hover:to-green-600'
                  }`}
                  title="Save Annotations"
                >
                  {isSaving ? '⏳' : '💾'} Save
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 min-h-0">
        <div className="flex justify-center">
          <div className="relative" ref={pageRef}>
            <Document
              file={pdfUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={<div>Loading PDF...</div>}
              error={<div>Error loading PDF</div>}
            >
              <Page
                pageNumber={currentPage}
                scale={zoom}
                onLoadSuccess={(page) => {
                  setPageDimensions({ width: page.width, height: page.height });
                  // Resize drawing canvas when page loads
                  if (drawingCanvasRef.current && pageRef.current) {
                    const canvas = drawingCanvasRef.current;
                    const rect = pageRef.current.getBoundingClientRect();
                    canvas.width = rect.width;
                    canvas.height = rect.height;
                  }
                }}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
            <canvas
              ref={annotationCanvasRef}
              className="absolute top-0 left-0 pointer-events-none z-0"
              style={{ width: '100%', height: '100%' }}
            />
            <canvas
              ref={drawingCanvasRef}
              className="absolute top-0 left-0 pointer-events-none z-5"
              style={{ width: '100%', height: '100%' }}
            />
            <div
              className="absolute inset-0 z-10"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ 
                cursor: selectionState.isResizing 
                  ? `${selectionState.resizeHandle || 'default'}-resize` 
                  : selectionState.selectedAnnotation && !selectedTool
                  ? 'move'
                  : selectedTool 
                  ? 'crosshair' 
                  : 'default',
                pointerEvents: readOnly ? 'none' : 'auto' 
              }}
            />
          </div>
        </div>
      </div>

      {showControls && (
        <div className="bg-gradient-to-b from-gray-800 via-gray-700 to-gray-800 border-t border-gray-900 p-2 shadow-2xl flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 bg-gray-700/60 text-gray-300 rounded-md border border-gray-600/50 hover:bg-gray-600/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium"
              >
                ← Prev
              </button>
              <span className="px-3 py-1.5 text-gray-300 font-semibold bg-gray-900/40 rounded-md border border-gray-600/30 text-sm">
                Page {currentPage} of {numPages || '?'}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= (numPages || 1)}
                className="px-3 py-1.5 bg-gray-700/60 text-gray-300 rounded-md border border-gray-600/50 hover:bg-gray-600/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {!readOnly && (
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 border-t border-gray-900 p-3 shadow-2xl">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add general notes about this PDF..."
            className="w-full p-3 bg-gray-900/60 text-gray-200 border border-gray-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder-gray-500 shadow-inner"
            rows={3}
          />
        </div>
      )}

      {readOnly && annotations.some(a => a.note || a.text) && (
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 border-t border-gray-900 p-4 shadow-2xl">
          <h3 className="font-semibold mb-3 text-gray-300">Notes:</h3>
          {annotations
            .filter(a => a.note || a.text)
            .map(a => (
              <div key={a.id} className="mb-3 p-3 bg-gray-900/60 rounded-lg border border-gray-600/30 shadow-md">
                <p className="text-sm text-gray-400 mb-1">Page {a.page}:</p>
                <p className="text-gray-200">{a.note || a.text}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default PdfAnnotationViewer;

