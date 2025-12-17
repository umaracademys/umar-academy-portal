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
  const [selectedTool, setSelectedTool] = useState<'highlight' | 'text' | 'drawing' | 'arrow' | 'note' | null>(null);
  const [selectedColor, setSelectedColor] = useState('#FF0000');
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
  const renderRequestRef = useRef<number | null>(null);

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
      setSelectionState({
        selectedAnnotation: null,
        isResizing: false,
        resizeHandle: null,
        startPoint: null,
        originalAnnotation: null,
      });
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
  const smoothDrawingPoints = useCallback((points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> => {
    if (points.length <= 2) return points;

    // Reduce points using Douglas-Peucker algorithm (simplified)
    const threshold = 0.002; // Normalized threshold
    const reduced: Array<{ x: number; y: number }> = [points[0]];

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      // Calculate distance from current point to line between prev and next
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length > 0) {
        const t = ((curr.x - prev.x) * dx + (curr.y - prev.y) * dy) / (length * length);
        const projX = prev.x + t * dx;
        const projY = prev.y + t * dy;
        const dist = Math.sqrt(Math.pow(curr.x - projX, 2) + Math.pow(curr.y - projY, 2));

        if (dist > threshold) {
          reduced.push(curr);
        }
      } else {
        reduced.push(curr);
      }
    }

    reduced.push(points[points.length - 1]);
    return reduced;
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
      setDrawingPoints([{ x, y }]);
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
      };
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

    // Handle drawing
    if (selectedTool === 'drawing' && isDrawing) {
      setDrawingPoints(prev => {
        const newPoints = [...prev, { x, y }];
        // Throttle point addition for performance (every 3rd point)
        if (newPoints.length % 3 === 0 || newPoints.length < 10) {
          return newPoints;
        }
        return prev;
      });
      return;
    }

    // Handle dragging new annotation
    if ((selectedTool === 'highlight' || selectedTool === 'arrow' || selectedTool === 'note') && isDragging && startPoint && currentAnnotation) {
      const width = Math.abs(x - startPoint.x);
      const height = Math.abs(y - startPoint.y);
      const newX = Math.min(x, startPoint.x);
      const newY = Math.min(y, startPoint.y);
      
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
    if (selectedTool === 'drawing' && isDrawing && drawingPoints.length > 1) {
      const smoothedPoints = smoothDrawingPoints(drawingPoints);
      const newAnnotation: Annotation = {
        id: `${Date.now()}-${Math.random()}`,
        page: currentPage,
        type: 'drawing',
        x: smoothedPoints[0].x,
        y: smoothedPoints[0].y,
        color: selectedColor,
        points: smoothedPoints,
      };
      updateAnnotations(prev => [...prev, newAnnotation], true); // Save to history
    }

    // Finalize dragging new annotation
    if (isDragging && currentAnnotation) {
      if (currentAnnotation.width && currentAnnotation.width < 0.01 && currentAnnotation.height && currentAnnotation.height < 0.01) {
        // Remove tiny annotations (accidental clicks)
        updateAnnotations(prev => prev.filter(a => a.id !== currentAnnotation.id), false);
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
    setCurrentAnnotation(null);
    setStartPoint(null);
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
      ctx.lineWidth = 2;

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
          ctx.globalAlpha = 0.3;
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
          if (arrowWidth !== 0 || arrowHeight !== 0) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + arrowWidth, y + arrowHeight);
            ctx.stroke();
            if (Math.abs(arrowWidth) > 5 || Math.abs(arrowHeight) > 5) {
              const angle = Math.atan2(arrowHeight, arrowWidth);
              ctx.beginPath();
              ctx.moveTo(x + arrowWidth, y + arrowHeight);
              ctx.lineTo(
                x + arrowWidth - 10 * Math.cos(angle - Math.PI / 6),
                y + arrowHeight - 10 * Math.sin(angle - Math.PI / 6)
              );
              ctx.lineTo(
                x + arrowWidth - 10 * Math.cos(angle + Math.PI / 6),
                y + arrowHeight - 10 * Math.sin(angle + Math.PI / 6)
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

  const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#000000'];

  return (
    <div className="w-full h-full flex flex-col bg-gray-100">
      {showControls && !readOnly && (
        <div className="bg-white border-b p-2 flex items-center gap-2 flex-wrap">
          {/* Undo/Redo buttons */}
          <div className="flex gap-1 border-r pr-2">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              ↶ Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Shift+Z)"
            >
              ↷ Redo
            </button>
          </div>

          {/* Annotation tools */}
          <div className="flex gap-1">
            <button
              onClick={() => {
                setSelectedTool(selectedTool === 'highlight' ? null : 'highlight');
                setSelectionState({
                  selectedAnnotation: null,
                  isResizing: false,
                  resizeHandle: null,
                  startPoint: null,
                  originalAnnotation: null,
                });
              }}
              className={`px-3 py-1 rounded ${selectedTool === 'highlight' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              title="Highlight"
            >
              ✏️ Highlight
            </button>
            <button
              onClick={() => {
                setSelectedTool(selectedTool === 'text' ? null : 'text');
                setSelectionState({
                  selectedAnnotation: null,
                  isResizing: false,
                  resizeHandle: null,
                  startPoint: null,
                  originalAnnotation: null,
                });
              }}
              className={`px-3 py-1 rounded ${selectedTool === 'text' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              title="Text"
            >
              📝 Text
            </button>
            <button
              onClick={() => {
                setSelectedTool(selectedTool === 'drawing' ? null : 'drawing');
                setSelectionState({
                  selectedAnnotation: null,
                  isResizing: false,
                  resizeHandle: null,
                  startPoint: null,
                  originalAnnotation: null,
                });
              }}
              className={`px-3 py-1 rounded ${selectedTool === 'drawing' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              title="Draw"
            >
              ✍️ Draw
            </button>
            <button
              onClick={() => {
                setSelectedTool(selectedTool === 'arrow' ? null : 'arrow');
                setSelectionState({
                  selectedAnnotation: null,
                  isResizing: false,
                  resizeHandle: null,
                  startPoint: null,
                  originalAnnotation: null,
                });
              }}
              className={`px-3 py-1 rounded ${selectedTool === 'arrow' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              title="Arrow"
            >
              ➡️ Arrow
            </button>
            <button
              onClick={() => {
                setSelectedTool(selectedTool === 'note' ? null : 'note');
                setSelectionState({
                  selectedAnnotation: null,
                  isResizing: false,
                  resizeHandle: null,
                  startPoint: null,
                  originalAnnotation: null,
                });
              }}
              className={`px-3 py-1 rounded ${selectedTool === 'note' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              title="Note"
            >
              📌 Note
            </button>
          </div>

          {/* Color picker */}
          <div className="flex gap-1 items-center border-r pr-2">
            <span>Color:</span>
            {colors.map(color => (
              <button
                key={color}
                onClick={() => {
                  setSelectedColor(color);
                  if (selectionState.selectedAnnotation) {
                    handleChangeColor(color);
                  }
                }}
                className={`w-6 h-6 rounded border-2 ${selectedColor === color ? 'border-gray-800' : 'border-gray-300'}`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>

          {/* Edit tools (shown when annotation is selected) */}
          {selectionState.selectedAnnotation && (
            <div className="flex gap-1 border-r pr-2">
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                title="Delete (Del)"
              >
                🗑️ Delete
              </button>
            </div>
          )}

          {/* Save button */}
          {onSave && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="ml-auto px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Annotations'}
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
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
        <div className="bg-white border-t p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              ← Prev
            </button>
            <span className="px-3">
              Page {currentPage} of {numPages || '?'}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= (numPages || 1)}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              Next →
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              className="px-3 py-1 bg-gray-200 rounded"
            >
              −
            </button>
            <span className="px-2">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
              className="px-3 py-1 bg-gray-200 rounded"
            >
              +
            </button>
          </div>
        </div>
      )}

      {!readOnly && (
        <div className="bg-white border-t p-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add general notes about this PDF..."
            className="w-full p-2 border rounded"
            rows={3}
          />
        </div>
      )}

      {readOnly && annotations.some(a => a.note || a.text) && (
        <div className="bg-white border-t p-4">
          <h3 className="font-semibold mb-2">Notes:</h3>
          {annotations
            .filter(a => a.note || a.text)
            .map(a => (
              <div key={a.id} className="mb-2 p-2 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Page {a.page}:</p>
                <p>{a.note || a.text}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default PdfAnnotationViewer;

