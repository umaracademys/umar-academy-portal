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
import { useAuth } from '../contexts/AuthContext';
import QaidahLearningObjectives from './QaidahLearningObjectives';
import { debounce } from '../utils/debounce';

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
  currentUserId?: string; // Current user ID for heart/star tracking
  pdfTitle?: string; // PDF title to detect Qaidah books
  pdfFilename?: string; // PDF filename to detect Qaidah books
  pdfId?: string; // Phase 4: PDF ID for homework assignment
  onAssignHomework?: (studentId: string, studentName: string) => Promise<void>; // Phase 4: Homework assignment callback
  assignedStudents?: Array<{ id?: string; _id?: string; fullName?: string }>; // Phase 4: List of assigned students
  
  // Phase 6: Future-Ready Props (Not Implemented Yet - Architectural Hooks)
  // replayMode?: boolean; // Enable lesson replay mode
  // replayData?: any; // Lesson replay data
  // onReplayComplete?: () => void; // Callback when replay finishes
  // collaborationSessionId?: string; // Real-time collaboration session ID
  // onMistakeDetected?: (mistake: any) => void; // AI mistake detection callback
  // enableAudioNotes?: boolean; // Enable audio recording per annotation
  // performanceTracking?: boolean; // Track performance metrics
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
    currentUserId, // Optional user ID prop, falls back to auth context
    pdfTitle = '', // PDF title to detect Qaidah books
    pdfFilename = '', // PDF filename to detect Qaidah books
    pdfId, // Phase 4: PDF ID for homework assignment
    onAssignHomework, // Phase 4: Homework assignment callback
    assignedStudents = [], // Phase 4: List of assigned students
  } = props;

  // Get current user ID from auth context or prop
  const { user } = useAuth();
  const userId = currentUserId || user?.id || (user as any)?._id || 'anonymous';

  // Detect Qaidah book from PDF title or filename
  const detectQaidahBook = (): 'qaidah1' | 'qaidah2' | null => {
    const searchText = `${pdfTitle} ${pdfFilename} ${pdfUrl}`.toLowerCase();
    console.log('📚 Checking for Qaidah:', { pdfTitle, pdfFilename, pdfUrl, searchText });
    
    // Check for Qaidah 1 patterns: "qaidah 1", "qaidah1", "qaidah-1", "qaidah part 1", "part 1"
    if (
      searchText.includes('qaidah 1') || 
      searchText.includes('qaidah1') || 
      searchText.includes('qaidah-1') ||
      searchText.includes('qaidah part 1') ||
      (searchText.includes('qaidah') && searchText.includes('part 1'))
    ) {
      console.log('✅ Detected Qaidah 1');
      return 'qaidah1';
    }
    
    // Check for Qaidah 2 patterns: "qaidah 2", "qaidah2", "qaidah-2", "qaidah part 2", "part 2"
    if (
      searchText.includes('qaidah 2') || 
      searchText.includes('qaidah2') || 
      searchText.includes('qaidah-2') ||
      searchText.includes('qaidah part 2') ||
      (searchText.includes('qaidah') && searchText.includes('part 2'))
    ) {
      console.log('✅ Detected Qaidah 2');
      return 'qaidah2';
    }
    
    console.log('❌ Not a Qaidah book');
    return null;
  };

  const qaidahBook = detectQaidahBook();

  // Core state
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  
  useEffect(() => {
    if (qaidahBook) {
      console.log('📚 Qaidah Learning Objectives panel should be visible for:', qaidahBook, 'page', currentPage);
    }
  }, [qaidahBook, currentPage]);
  const [zoom, setZoom] = useState(1);
  const [annotations, setAnnotations] = useState<Annotation[]>(externalAnnotations);
  const [showTOC, setShowTOC] = useState(false);
  const [tocItems, setTocItems] = useState<Array<{ title: string; page: number; level: number }>>([]);
  // Phase 1: Simplified to core 4 tools: Highlight, Pen (drawing), Arrow, Notes
  const [selectedTool, setSelectedTool] = useState<'highlight' | 'drawing' | 'arrow' | 'note' | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(2); // Stroke width for drawing/arrow tools
  const [highlightOpacity, setHighlightOpacity] = useState(0.3); // Opacity for highlights
  const [notes, setNotes] = useState(initialNotes);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Annotation visibility and compact mode controls
  const [showBlackAnnotations, setShowBlackAnnotations] = useState(true);
  const [annotationMode, setAnnotationMode] = useState<'compact' | 'full'>('compact'); // Phase 2: Default to compact mode
  const [showAnnotationMenu, setShowAnnotationMenu] = useState(false);
  
  // Phase 5: Collapsible panels
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [isNotesCollapsed, setIsNotesCollapsed] = useState(false);
  
  // Phase 5: Floating radial toolbar (alternative to fixed toolbar)
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  
  // UI visibility controls
  const [showToolbar, setShowToolbar] = useState(true);
  const [showBottomBar, setShowBottomBar] = useState(true);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  
  // Phase 2: Gesture-based interactions
  const [isLongPress, setIsLongPress] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; annotation?: Annotation } | null>(null);
  const [isGestureDragging, setIsGestureDragging] = useState(false); // For click+drag highlight gesture
  
  // Phase 4: Homework assignment
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentFilter, setStudentFilter] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

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

  // Autosave with debounce (Phase 1: Replace interval with debounce)
  const autosaveDebouncedRef = useRef<ReturnType<typeof debounce> | null>(null);
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
        
        // Phase 6: Future Hook - Event Tracking for Lesson Replay
        // Future: Emit event for lesson replay recording
        // if (replayMode && replayRecorder) {
        //   replayRecorder.record({
        //     timestamp: Date.now() - replayStartTime,
        //     type: 'annotation_update',
        //     data: { annotations: updated, page: currentPage },
        //     userId: currentUserId
        //   });
        // }
        
        // Phase 6: Future Hook - Performance Tracking
        // Future: Track annotation metrics for teacher insights
        // if (performanceTracking && analyticsService) {
        //   analyticsService.trackEvent({
        //     type: 'annotation_update',
        //     count: updated.length,
        //     page: currentPage,
        //     teacherId: currentUserId,
        //     timestamp: Date.now()
        //   });
        // }
        
        // Phase 6: Future Hook - Real-Time Collaboration
        // Future: Broadcast changes to collaboration session
        // if (collaborationSessionId && collaborationService) {
        //   collaborationService.sendEvent({
        //     type: 'annotation_update',
        //     userId: currentUserId,
        //     data: updated,
        //     sessionId: collaborationSessionId,
        //     timestamp: new Date()
        //   });
        // }
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

  // Phase 2: Handle long press for mistake marking
  const handleLongPressStart = useCallback((x: number, y: number) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPress(true);
      // Create mistake marker annotation
      const mistakeAnnotation: Annotation = {
        id: `${Date.now()}-${Math.random()}`,
        page: currentPage,
        type: 'note',
        x,
        y,
        color: '#FF0000',
        width: 0.02,
        height: 0.02,
        note: 'Mistake',
        text: '❌',
      };
      updateAnnotations(prev => [...prev, mistakeAnnotation], true);
      setIsLongPress(false);
    }, 500); // 500ms for long press
  }, [currentPage, updateAnnotations]);

  const handleLongPressCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsLongPress(false);
  }, []);

  // Phase 2: Handle double-click for note
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (readOnly || !pageRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = pageRef.current.getBoundingClientRect();
    const { x, y } = screenToNormalized(e.clientX, e.clientY, pageRef.current);
    
    // Create note annotation
    const noteAnnotation: Annotation = {
      id: `${Date.now()}-${Math.random()}`,
      page: currentPage,
      type: 'note',
      x,
      y,
      color: '#FFFF00',
      width: 0.02,
      height: 0.02,
      note: '',
      text: '',
    };
    updateAnnotations(prev => [...prev, noteAnnotation], true);
    
    // Prompt for note text
    const text = prompt('Enter note text:');
    if (text !== null && text.trim()) {
      updateAnnotations(prev => 
        prev.map(a => a.id === noteAnnotation.id ? { ...a, note: text, text: text } : a),
        true
      );
    } else {
      // Remove note if no text entered
      updateAnnotations(prev => prev.filter(a => a.id !== noteAnnotation.id), true);
    }
  }, [readOnly, currentPage, screenToNormalized, updateAnnotations]);

  // Phase 2: Handle right-click for contextual menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (readOnly || !pageRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = pageRef.current.getBoundingClientRect();
    const screenX = e.clientX;
    const screenY = e.clientY;
    const { x, y } = screenToNormalized(screenX, screenY, pageRef.current);
    
    // Check if clicking on an existing annotation
    const pageAnnotations = annotations.filter(a => a.page === currentPage);
    const hitAnnotation = hitTestAnnotation(screenX - rect.left, screenY - rect.top, pageAnnotations, rect.width, rect.height);
    
    setContextMenu({
      x: screenX,
      y: screenY,
      annotation: hitAnnotation || undefined,
    });
  }, [readOnly, currentPage, annotations, screenToNormalized]);

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

    // Phase 2: Start long press timer
    handleLongPressStart(x, y);

    // Phase 2: Gesture-based highlight (click + drag when no tool selected)
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
        // Phase 2: Start gesture-based highlight (click + drag)
        setIsGestureDragging(true);
        setStartPoint({ x, y });
        const gestureHighlight: Annotation = {
          id: `${Date.now()}-${Math.random()}`,
          page: currentPage,
          type: 'highlight',
          x,
          y,
          color: selectedColor,
          width: 0,
          height: 0,
          opacity: highlightOpacity,
        } as any;
        setCurrentAnnotation(gestureHighlight);
        updateAnnotations(prev => [...prev, gestureHighlight], false);
        return;
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
        ...(selectedTool === 'arrow' ? { strokeWidth: strokeWidth } : {}),
      } as any;
      setCurrentAnnotation(newAnnotation);
      updateAnnotations(prev => [...prev, newAnnotation], false); // Don't save to history yet
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

    // Phase 2: Handle gesture-based highlight (click + drag when no tool selected)
    if (isGestureDragging && startPoint && currentAnnotation) {
      let width = Math.abs(x - startPoint.x);
      let height = Math.abs(y - startPoint.y);
      let newX = Math.min(x, startPoint.x);
      let newY = Math.min(y, startPoint.y);
      
      updateAnnotations(prev => 
        prev.map(a => 
          a.id === currentAnnotation.id 
            ? { ...a, x: newX, y: newY, width, height }
            : a
        ),
        false // Don't save to history during drag
      );
      return;
    }

    // Handle dragging new annotation (Phase 1: Only core tools)
    if ((selectedTool === 'highlight' || selectedTool === 'arrow' || selectedTool === 'note') 
        && isDragging && startPoint && currentAnnotation) {
      let width = Math.abs(x - startPoint.x);
      let height = Math.abs(y - startPoint.y);
      let newX = Math.min(x, startPoint.x);
      let newY = Math.min(y, startPoint.y);
      
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
      // Use a function to get the latest state
      updateAnnotations(prev => {
        const latestAnnotation = prev.find(a => a.id === currentAnnotation.id);
        if (!latestAnnotation) return prev;
        
        const finalWidth = latestAnnotation.width || 0;
        const finalHeight = latestAnnotation.height || 0;
        
        // Remove tiny annotations (accidental clicks)
        const minSize = 0.01;
        
        if (finalWidth < minSize && finalHeight < minSize) {
          // Remove the annotation
          return prev.filter(a => a.id !== currentAnnotation.id);
        }
        // Keep the annotation (it's already in the array with updated values)
        return prev;
      }, true); // Save to history when drag completes
    }

    // Finalize resize/move
    if (selectionState.isResizing || isMoving) {
      updateAnnotations(prev => prev, true); // Save to history
    }

    // Phase 2: Clean up gesture dragging
    if (isGestureDragging && currentAnnotation) {
      const finalWidth = currentAnnotation.width || 0;
      const finalHeight = currentAnnotation.height || 0;
      if (finalWidth < 0.01 && finalHeight < 0.01) {
        updateAnnotations(prev => prev.filter(a => a.id !== currentAnnotation.id), false);
      } else {
        updateAnnotations(prev => prev, true); // Save to history
      }
      setIsGestureDragging(false);
    }

    // Clean up
    setIsDrawing(false);
    setIsDragging(false);
    setIsMoving(false);
    setDrawingPoints([]);
    drawingPointsRef.current = [];
    setCurrentAnnotation(null);
    setStartPoint(null);
    handleLongPressCancel(); // Cancel long press timer
    
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
  }, [readOnly, selectedTool, isDrawing, isDragging, isMoving, isGestureDragging, drawingPoints, currentPage, selectedColor, currentAnnotation, selectionState, smoothDrawingPoints, updateAnnotations, handleLongPressCancel]);

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

  // Handle heart (like) click
  const handleHeartClick = useCallback((annotationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    updateAnnotations(prev => 
      prev.map(a => {
        if (a.id !== annotationId) return a;
        
        const heartedBy = a.heartedBy || [];
        const isHearted = heartedBy.includes(userId);
        
        if (isHearted) {
          // Remove heart
          const newHeartedBy = heartedBy.filter(id => id !== userId);
          return {
            ...a,
            hearts: Math.max(0, (a.hearts || 0) - 1),
            heartedBy: newHeartedBy,
          };
        } else {
          // Add heart
          return {
            ...a,
            hearts: (a.hearts || 0) + 1,
            heartedBy: [...heartedBy, userId],
          };
        }
      }),
      true // Save to history
    );
  }, [userId, updateAnnotations]);

  // Handle star (important) click
  const handleStarClick = useCallback((annotationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    updateAnnotations(prev => 
      prev.map(a => {
        if (a.id !== annotationId) return a;
        
        const starredBy = a.starredBy || [];
        const isStarred = starredBy.includes(userId);
        
        if (isStarred) {
          // Remove star
          return {
            ...a,
            starredBy: starredBy.filter(id => id !== userId),
          };
        } else {
          // Add star
          return {
            ...a,
            starredBy: [...starredBy, userId],
          };
        }
      }),
      true // Save to history
    );
  }, [userId, updateAnnotations]);

  // Autosave function (Phase 1: Debounced instead of interval-based)
  const performAutosave = useCallback(async () => {
    if (!onSave || isSaving) return;

    const currentAnnotations = annotations;
    // Only save if annotations actually changed
    if (JSON.stringify(currentAnnotations) === JSON.stringify(lastSaveRef.current)) {
      hasUnsavedChangesRef.current = false;
      return;
    }

    try {
      setIsSaving(true);
      await onSave(currentAnnotations, notes);
      lastSaveRef.current = JSON.parse(JSON.stringify(currentAnnotations)); // Deep clone
      hasUnsavedChangesRef.current = false;
      console.log('✅ Autosaved annotations');
    } catch (error) {
      console.error('❌ Autosave failed:', error);
      // Don't show alert for autosave failures to avoid interrupting user
    } finally {
      setIsSaving(false);
    }
  }, [onSave, annotations, notes, isSaving]);

  // Setup debounced autosave (Phase 1: Debounce instead of interval)
  useEffect(() => {
    if (readOnly || !onSave) return;

    // Create debounced autosave function (2 second delay)
    autosaveDebouncedRef.current = debounce(performAutosave, 2000);

    return () => {
      // Cleanup handled by debounce function
    };
  }, [readOnly, onSave, performAutosave]);

  // Trigger debounced autosave when annotations change
  useEffect(() => {
    if (readOnly || !onSave || !autosaveDebouncedRef.current) return;
    
    hasUnsavedChangesRef.current = true;
    autosaveDebouncedRef.current();
  }, [annotations, notes, readOnly, onSave]);

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

  // Helper function to check if a color is black or very dark
  const isBlackOrDark = useCallback((color: string): boolean => {
    if (!color) return false;
    
    // Normalize color string
    const normalizedColor = color.toLowerCase().trim();
    
    // Check for common black color values
    if (normalizedColor === '#000000' || normalizedColor === '#000' || normalizedColor === 'black') {
      return true;
    }
    
    // Check for dark grays (threshold: brightness < 30%)
    if (normalizedColor.startsWith('#')) {
      const hex = normalizedColor.slice(1);
      if (hex.length === 3) {
        // Handle 3-digit hex
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness < 76;
      } else if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness < 76;
      }
    }
    
    // Check for rgb/rgba values
    const rgbMatch = normalizedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness < 76;
    }
    
    return false;
  }, []);

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
    let pageAnnotations = annotations.filter(a => a.page === currentPage);
    
    // Filter out black annotations if hidden
    if (!showBlackAnnotations) {
      pageAnnotations = pageAnnotations.filter(a => !isBlackOrDark(a.color || '#000000'));
    }
    
    // Batch render for better performance
    pageAnnotations.forEach(annotation => {
      ctx.save();
      
      const isBlack = isBlackOrDark(annotation.color || '#000000');
      const isCompact = annotationMode === 'compact' && isBlack;
      
      // Apply compact mode scaling for black annotations (60-70% reduction = 0.35 scale)
      const compactScale = isCompact ? 0.35 : 1.0;
      
      ctx.strokeStyle = annotation.color;
      ctx.fillStyle = annotation.color;
      
      // Phase 5: Use strokeWidth from annotation if available, otherwise default to 2
      // In compact mode, reduce stroke width more aggressively (thinner strokes)
      let annStrokeWidth = (annotation as any).strokeWidth !== undefined ? (annotation as any).strokeWidth : strokeWidth;
      if (isCompact) {
        annStrokeWidth = Math.max(0.3, annStrokeWidth * 0.2); // Phase 5: Thinner strokes (20% of original)
        ctx.globalAlpha = 0.6; // Phase 5: Reduced opacity for compact mode
      } else {
        ctx.globalAlpha = 1.0;
      }
      ctx.lineWidth = annStrokeWidth;

      // Apply scaling transform for compact mode
      const x = annotation.x * canvas.width;
      const y = annotation.y * canvas.height;
      const width = (annotation.width || 0) * canvas.width;
      const height = (annotation.height || 0) * canvas.height;
      
      // For compact mode, center the scaled annotation
      let scaledX = x;
      let scaledY = y;
      let scaledWidth = width;
      let scaledHeight = height;
      
      if (isCompact) {
        scaledWidth = width * compactScale;
        scaledHeight = height * compactScale;
        // Center the scaled annotation
        scaledX = x + (width - scaledWidth) / 2;
        scaledY = y + (height - scaledHeight) / 2;
      }
      
      const isSelected = selectionState.selectedAnnotation?.id === annotation.id;

      // Draw selection highlight
      if (isSelected && !readOnly) {
        const savedStrokeStyle = ctx.strokeStyle;
        const savedLineWidth = ctx.lineWidth;
        ctx.strokeStyle = '#0066FF';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        if (annotation.width && annotation.height) {
          const selX = isCompact ? scaledX : x;
          const selY = isCompact ? scaledY : y;
          const selWidth = isCompact ? scaledWidth : width;
          const selHeight = isCompact ? scaledHeight : height;
          ctx.strokeRect(
            selX - 2,
            selY - 2,
            selWidth + 4,
            selHeight + 4
          );
        }
        ctx.setLineDash([]);
        ctx.strokeStyle = savedStrokeStyle;
        ctx.lineWidth = savedLineWidth;
      }

      switch (annotation.type) {
        case 'highlight':
          ctx.globalAlpha = (annotation as any).opacity || highlightOpacity;
          const highlightWidth = isCompact ? scaledWidth : width;
          const highlightHeight = isCompact ? scaledHeight : (annotation.height || 0.05) * canvas.height;
          if (highlightWidth > 0 && highlightHeight > 0) {
            ctx.fillRect(scaledX, scaledY, highlightWidth, highlightHeight);
          }
          ctx.globalAlpha = 1;
          break;

        case 'arrow':
          const arrowWidth = isCompact ? scaledWidth : width;
          const arrowHeight = isCompact ? scaledHeight : height;
          if (arrowWidth !== 0 || arrowHeight !== 0) {
            ctx.beginPath();
            ctx.moveTo(scaledX, scaledY);
            ctx.lineTo(scaledX + arrowWidth, scaledY + arrowHeight);
            ctx.stroke();
            if (Math.abs(arrowWidth) > 5 || Math.abs(arrowHeight) > 5) {
              const angle = Math.atan2(arrowHeight, arrowWidth);
              const arrowheadSize = Math.max(8, annStrokeWidth * 2);
              ctx.beginPath();
              ctx.moveTo(scaledX + arrowWidth, scaledY + arrowHeight);
              ctx.lineTo(
                scaledX + arrowWidth - arrowheadSize * Math.cos(angle - Math.PI / 6),
                scaledY + arrowHeight - arrowheadSize * Math.sin(angle - Math.PI / 6)
              );
              ctx.lineTo(
                scaledX + arrowWidth - arrowheadSize * Math.cos(angle + Math.PI / 6),
                scaledY + arrowHeight - arrowheadSize * Math.sin(angle + Math.PI / 6)
              );
              ctx.closePath();
              ctx.fill();
            }
          }
          break;

        case 'drawing':
          if (annotation.points && annotation.points.length > 1) {
            ctx.beginPath();
            const firstPoint = annotation.points[0];
            const firstX = isCompact ? scaledX + (firstPoint.x * canvas.width - x) * compactScale : firstPoint.x * canvas.width;
            const firstY = isCompact ? scaledY + (firstPoint.y * canvas.height - y) * compactScale : firstPoint.y * canvas.height;
            ctx.moveTo(firstX, firstY);
            for (let i = 1; i < annotation.points.length; i++) {
              const pt = annotation.points[i];
              const ptX = isCompact ? scaledX + (pt.x * canvas.width - x) * compactScale : pt.x * canvas.width;
              const ptY = isCompact ? scaledY + (pt.y * canvas.height - y) * compactScale : pt.y * canvas.height;
              ctx.lineTo(ptX, ptY);
            }
            ctx.stroke();
          }
          break;

        case 'note':
          const noteSize = isCompact ? 20 * compactScale : 20;
          ctx.fillStyle = '#FFFF00';
          ctx.fillRect(scaledX, scaledY, noteSize, noteSize);
          if (annotation.text) {
            ctx.fillStyle = '#000000';
            const fontSize = isCompact ? Math.max(8, 12 * compactScale) : 12;
            ctx.font = `${fontSize}px Arial`;
            ctx.fillText(annotation.text, scaledX + noteSize + 5, scaledY + noteSize * 0.75);
          }
          break;

        // Phase 1: Removed text, line, rectangle, circle, diamond shapes
        // Keeping rendering code for backward compatibility with existing annotations
        default:
          // Unknown annotation type - skip rendering
          break;
      }

      // Draw resize handles for selected annotation
      if (isSelected && !readOnly && annotation.width && annotation.height) {
        const handleX = isCompact ? scaledX : x;
        const handleY = isCompact ? scaledY : y;
        const handleWidth = isCompact ? scaledWidth : width;
        const handleHeight = isCompact ? scaledHeight : height;
        
        const handles = [
          { x: handleX, y: handleY, type: 'nw' },
          { x: handleX + handleWidth, y: handleY, type: 'ne' },
          { x: handleX, y: handleY + handleHeight, type: 'sw' },
          { x: handleX + handleWidth, y: handleY + handleHeight, type: 'se' },
        ];

        ctx.fillStyle = '#0066FF';
        handles.forEach(handle => {
          ctx.fillRect(handle.x - 4, handle.y - 4, 8, 8);
        });
      }

      ctx.restore();
      // Phase 5: Reset global alpha after each annotation
      ctx.globalAlpha = 1.0;
    });
  }, [annotations, currentPage, pageDimensions, selectionState, readOnly, showBlackAnnotations, annotationMode, isBlackOrDark, strokeWidth]);

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
    <div className="w-full h-full flex flex-col bg-gray-50 relative">
      {/* Phase 5: Floating toggle button when toolbar is hidden - Smooth transitions */}
      {showControls && !readOnly && !showToolbar && !showFloatingToolbar && (
        <button
          onClick={() => setShowToolbar(true)}
          className="fixed top-4 left-4 z-50 px-5 py-3 bg-gradient-to-r from-primary-700 via-primary-600 to-primary-700 text-white rounded-xl shadow-2xl hover:shadow-primary-500/50 hover:from-primary-800 hover:via-primary-700 hover:to-primary-800 transition-all duration-300 ease-in-out flex items-center gap-3 border-2 border-accent-400/40 hover:border-accent-300/60 transform hover:scale-105 active:scale-95"
          title="Show Toolbar"
        >
          <svg className="w-5 h-5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm font-bold tracking-wide">Show Tools</span>
        </button>
      )}

      {/* Phase 5: Floating Radial Toolbar */}
      {showControls && !readOnly && showFloatingToolbar && !showToolbar && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div className="bg-gray-800 rounded-full p-2 shadow-2xl border-2 border-gray-600 flex flex-col gap-2 transition-all duration-300">
            <button
              onClick={() => {
                setSelectedTool('highlight');
                setShowFloatingToolbar(false);
                setShowToolbar(true);
              }}
              className="w-12 h-12 rounded-full bg-yellow-500/80 hover:bg-yellow-500 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg"
              title="Highlight"
            >
              🖍️
            </button>
            <button
              onClick={() => {
                setSelectedTool('drawing');
                setShowFloatingToolbar(false);
                setShowToolbar(true);
              }}
              className="w-12 h-12 rounded-full bg-purple-500/80 hover:bg-purple-500 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg"
              title="Pen"
            >
              ✍️
            </button>
            <button
              onClick={() => {
                setSelectedTool('arrow');
                setShowFloatingToolbar(false);
                setShowToolbar(true);
              }}
              className="w-12 h-12 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg"
              title="Arrow"
            >
              ➡️
            </button>
            <button
              onClick={() => {
                setSelectedTool('note');
                setShowFloatingToolbar(false);
                setShowToolbar(true);
              }}
              className="w-12 h-12 rounded-full bg-green-500/80 hover:bg-green-500 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg"
              title="Note"
            >
              📌
            </button>
            <button
              onClick={() => {
                setShowFloatingToolbar(false);
                setShowToolbar(true);
              }}
              className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
              title="Show Full Toolbar"
            >
              ⚙️
            </button>
          </div>
        </div>
      )}
      
      {showControls && !readOnly && showToolbar && (
        <div className={`relative bg-gradient-to-b from-gray-800 via-gray-700 to-gray-800 border-b border-gray-900 shadow-2xl flex-shrink-0 transition-all duration-300 ease-in-out ${isToolbarCollapsed ? 'max-h-12 overflow-hidden' : ''}`}>
          {/* Vertical Light Strip on Left - Hidden on mobile */}
          <div className="hidden sm:block absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-gray-400 via-gray-500 to-transparent opacity-30 blur-sm"></div>
          
          <div className="relative p-2 sm:p-2 space-y-2 overflow-x-auto overflow-y-hidden">
            {/* Phase 5: Collapsible Toolbar Header */}
            <div className="flex justify-between items-center mb-1">
              <button
                onClick={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
                className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors duration-200"
                title={isToolbarCollapsed ? 'Expand Toolbar' : 'Collapse Toolbar'}
              >
                {isToolbarCollapsed ? '▼' : '▲'} {isToolbarCollapsed ? 'Show' : 'Hide'}
              </button>
              <button
                onClick={() => {
                  setShowToolbar(false);
                  setShowFloatingToolbar(true);
                }}
                className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors duration-200"
                title="Switch to Floating Toolbar"
              >
                ⭕ Float
              </button>
            </div>
            
            {/* Phase 5: Collapsible Content */}
            {!isToolbarCollapsed && (
              <div className="transition-all duration-300 ease-in-out">
                {/* Compact Single Row: All Controls */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap min-w-max">
              {/* History Controls */}
              <div className="flex items-center gap-1 bg-gray-900/50 backdrop-blur-sm rounded-md border border-gray-600/30 p-1 shadow-lg flex-shrink-0">
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className={`px-3 py-2 sm:px-2.5 sm:py-1.5 rounded transition-all text-base sm:text-sm min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation ${
                    canUndo 
                      ? 'bg-gray-700/80 text-gray-200 hover:bg-gray-600 active:bg-gray-500 border border-gray-500/50' 
                      : 'bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700/30'
                  }`}
                  title="Undo (Ctrl+Z)"
                >
                  <span className="text-lg sm:text-base">↶</span>
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className={`px-3 py-2 sm:px-2.5 sm:py-1.5 rounded transition-all text-base sm:text-sm min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation ${
                    canRedo 
                      ? 'bg-gray-700/80 text-gray-200 hover:bg-gray-600 active:bg-gray-500 border border-gray-500/50' 
                      : 'bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700/30'
                  }`}
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <span className="text-lg sm:text-base">↷</span>
                </button>
              </div>

              {/* Selection Mode Button */}
              <button
                onClick={deselectTool}
                className={`px-3 py-2 sm:px-3 sm:py-1.5 rounded-md border transition-all text-base sm:text-sm font-medium flex-shrink-0 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation ${
                  !selectedTool
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-500 active:from-blue-500 active:to-blue-600'
                    : 'bg-gray-700/60 text-gray-300 border-gray-600/50 hover:bg-gray-600/60 hover:text-white active:bg-gray-500/60'
                }`}
                title="Selection Mode"
              >
                <span className="text-xl sm:text-base">👆</span>
              </button>

              {/* Annotation Tools */}
              <div className="flex items-center gap-1 sm:gap-1.5 bg-gray-900/40 backdrop-blur-sm rounded-md border border-gray-600/30 p-1 sm:p-1.5 shadow-lg flex-shrink-0">
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
                  className={`px-2.5 py-2 sm:px-2.5 sm:py-1.5 rounded transition-all text-base sm:text-sm min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation ${
                    selectedTool === 'highlight'
                      ? 'bg-gradient-to-r from-yellow-500/80 to-yellow-600/80 text-white border border-yellow-400/50 active:from-yellow-400 active:to-yellow-500'
                      : 'bg-gray-700/60 text-gray-300 border border-gray-600/50 hover:bg-gray-600/60 active:bg-gray-500/60'
                  }`}
                  title="Highlight"
                >
                  <span className="text-xl sm:text-base">🖍️</span>
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
                  className={`px-2.5 py-2 sm:px-2.5 sm:py-1.5 rounded transition-all text-base sm:text-sm min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation ${
                    selectedTool === 'drawing'
                      ? 'bg-gradient-to-r from-purple-500/80 to-purple-600/80 text-white border border-purple-400/50 active:from-purple-400 active:to-purple-500'
                      : 'bg-gray-700/60 text-gray-300 border border-gray-600/50 hover:bg-gray-600/60 active:bg-gray-500/60'
                  }`}
                  title="Draw"
                >
                  <span className="text-xl sm:text-base">✍️</span>
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
                  className={`px-2.5 py-2 sm:px-2.5 sm:py-1.5 rounded transition-all text-base sm:text-sm min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation ${
                    selectedTool === 'arrow'
                      ? 'bg-gradient-to-r from-red-500/80 to-red-600/80 text-white border border-red-400/50 active:from-red-400 active:to-red-500'
                      : 'bg-gray-700/60 text-gray-300 border border-gray-600/50 hover:bg-gray-600/60 active:bg-gray-500/60'
                  }`}
                  title="Arrow"
                >
                  <span className="text-xl sm:text-base">➡️</span>
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
                  className={`px-2.5 py-2 sm:px-2.5 sm:py-1.5 rounded transition-all text-base sm:text-sm min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation ${
                    selectedTool === 'note'
                      ? 'bg-gradient-to-r from-green-500/80 to-green-600/80 text-white border border-green-400/50 active:from-green-400 active:to-green-500'
                      : 'bg-gray-700/60 text-gray-300 border border-gray-600/50 hover:bg-gray-600/60 active:bg-gray-500/60'
                  }`}
                  title="Note"
                >
                  <span className="text-xl sm:text-base">📌</span>
                </button>
              </div>

              {/* Phase 2: Preset Chips for Common Actions */}
              <div className="flex items-center gap-1 sm:gap-1.5 bg-gray-900/40 backdrop-blur-sm rounded-md border border-gray-600/30 p-1 sm:p-1.5 shadow-lg flex-shrink-0">
                <span className="hidden sm:inline text-xs font-semibold text-gray-300">Quick:</span>
                <button
                  onClick={() => {
                    setSelectedTool('highlight');
                    setSelectedColor('#FFFF00');
                    setHighlightOpacity(0.3);
                  }}
                  className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-200 border border-yellow-500/30 hover:bg-yellow-500/30 transition-all"
                  title="Quick Highlight"
                >
                  ⚡ Highlight
                </button>
                <button
                  onClick={() => {
                    setSelectedTool('note');
                    setSelectedColor('#FFFF00');
                  }}
                  className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-200 border border-green-500/30 hover:bg-green-500/30 transition-all"
                  title="Quick Note"
                >
                  ⚡ Note
                </button>
                <button
                  onClick={() => {
                    setSelectedTool('arrow');
                    setSelectedColor('#FF0000');
                  }}
                  className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-200 border border-red-500/30 hover:bg-red-500/30 transition-all"
                  title="Quick Arrow"
                >
                  ⚡ Arrow
                </button>
              </div>

              {/* Color Picker - Compact */}
              <div className="flex items-center gap-1 sm:gap-1.5 bg-gray-900/40 backdrop-blur-sm rounded-md border border-gray-600/30 p-1 sm:p-1.5 shadow-lg flex-shrink-0">
                <span className="hidden sm:inline text-xs font-semibold text-gray-300">Color:</span>
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
                      className={`w-7 h-7 sm:w-6 sm:h-6 rounded border-2 transition-all hover:scale-110 active:scale-95 flex-shrink-0 touch-manipulation ${
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
              
              {/* Phase 2: Hide/Show Annotations Toggle */}
              <button
                onClick={() => setShowBlackAnnotations(!showBlackAnnotations)}
                className={`px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-md transition-all text-base sm:text-sm flex-shrink-0 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation ${
                  showBlackAnnotations
                    ? 'bg-gray-700/60 text-gray-300 border border-gray-600/50 hover:bg-gray-600/60'
                    : 'bg-gray-800/60 text-gray-500 border border-gray-700/50 hover:bg-gray-700/60'
                }`}
                title={showBlackAnnotations ? 'Hide Annotations' : 'Show Annotations'}
              >
                <span className="text-xl sm:text-base">{showBlackAnnotations ? '👁️' : '👁️‍🗨️'}</span>
              </button>

              {/* Stroke Width - Compact (Phase 1: Only for Pen and Arrow) */}
              {(selectedTool === 'drawing' || selectedTool === 'arrow') && (
                <div className="flex items-center gap-1 sm:gap-1.5 bg-gray-900/40 backdrop-blur-sm rounded-md border border-gray-600/30 p-1 sm:p-1.5 shadow-lg flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-300">W:</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(Number(e.target.value))}
                    className="w-16 sm:w-20 accent-gray-500 touch-manipulation"
                  />
                  <span className="text-xs text-gray-300 w-6 font-medium">{strokeWidth}</span>
                </div>
              )}

              {/* Opacity - Compact */}
              {selectedTool === 'highlight' && (
                <div className="flex items-center gap-1 sm:gap-1.5 bg-gray-900/40 backdrop-blur-sm rounded-md border border-gray-600/30 p-1 sm:p-1.5 shadow-lg flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-300">Op:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={highlightOpacity}
                    onChange={(e) => setHighlightOpacity(Number(e.target.value))}
                    className="w-16 sm:w-20 accent-gray-500 touch-manipulation"
                  />
                  <span className="text-xs text-gray-300 w-8 font-medium">{Math.round(highlightOpacity * 100)}%</span>
                </div>
              )}

              {/* Edit Tools - Compact */}
              {selectionState.selectedAnnotation && (
                <div className="flex items-center gap-1 sm:gap-1.5 bg-red-900/30 backdrop-blur-sm rounded-md border border-red-600/30 p-1 sm:p-1.5 shadow-lg flex-shrink-0">
                  <button
                    onClick={handleDeleteSelected}
                    className="px-3 py-2 sm:px-2.5 sm:py-1.5 rounded bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 active:from-red-400 active:to-red-500 transition-all text-base sm:text-sm font-medium border border-red-500/50 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation"
                    title="Delete (Del)"
                  >
                    <span className="text-lg sm:text-base">🗑️</span>
                  </button>
                  <button
                    onClick={deselectTool}
                    className="px-3 py-2 sm:px-2 sm:py-1.5 rounded bg-gray-700/60 text-gray-300 hover:bg-gray-600/60 hover:text-white active:bg-gray-500/60 transition-all text-base sm:text-sm border border-gray-600/50 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation"
                    title="Deselect"
                  >
                    <span className="text-lg sm:text-base">✕</span>
                  </button>
                </div>
              )}

              {/* Annotation Visibility & Mode Controls - Always visible when controls are shown */}
              <div className="flex items-center gap-1 sm:gap-1.5 bg-gray-900/40 backdrop-blur-sm rounded-md border-2 border-blue-500/50 p-1 sm:p-1.5 shadow-lg flex-shrink-0">
                <div className="relative">
                  <button
                    onClick={() => setShowAnnotationMenu(!showAnnotationMenu)}
                    className={`px-3 py-2 sm:px-3 sm:py-2 rounded-md transition-all text-sm font-bold min-w-[44px] min-h-[44px] sm:min-w-[140px] sm:min-h-0 touch-manipulation flex items-center justify-center gap-2 ${
                      showBlackAnnotations && annotationMode === 'compact'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-2 border-blue-400 shadow-lg'
                        : showBlackAnnotations && annotationMode === 'full'
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white border-2 border-purple-400 shadow-lg'
                        : 'bg-gradient-to-r from-gray-700 to-gray-800 text-gray-200 border-2 border-gray-600 hover:from-gray-600 hover:to-gray-700'
                    }`}
                    title="Annotation Settings - Toggle black annotation visibility and display mode"
                  >
                    <span className="text-lg">📌</span>
                    <span className="text-xs font-bold hidden sm:inline">Annotations</span>
                    <span className={`text-xs transition-transform duration-200 ${showAnnotationMenu ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {showAnnotationMenu && (
                    <>
                      {/* Backdrop to close menu */}
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setShowAnnotationMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-56 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 transition-all duration-200">
                        <div className="p-2 space-y-1">
                          {/* Show/Hide Black Annotations Toggle */}
                          <label className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-700/50 cursor-pointer transition-colors">
                            <span className="text-sm text-gray-200">Show Black Annotations</span>
                            <input
                              type="checkbox"
                              checked={showBlackAnnotations}
                              onChange={(e) => setShowBlackAnnotations(e.target.checked)}
                              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                            />
                          </label>
                          
                          {/* Mode Toggle */}
                          <div className="px-3 py-2">
                            <span className="text-xs text-gray-400 mb-2 block">Display Mode:</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setAnnotationMode('compact');
                                  setShowAnnotationMenu(false);
                                }}
                                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${
                                  annotationMode === 'compact'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                              >
                                Compact
                              </button>
                              <button
                                onClick={() => {
                                  setAnnotationMode('full');
                                  setShowAnnotationMenu(false);
                                }}
                                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${
                                  annotationMode === 'full'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                              >
                                Full
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Zoom Controls - Compact */}
              <div className="flex items-center gap-1 bg-gray-900/40 backdrop-blur-sm rounded-md border border-gray-600/30 p-1 shadow-lg flex-shrink-0 ml-auto">
                <button
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                  className="px-3 py-2 sm:px-2.5 sm:py-1.5 bg-gray-700/60 text-gray-300 rounded border border-gray-600/50 hover:bg-gray-600/60 hover:text-white active:bg-gray-500/60 transition-all text-base sm:text-sm font-semibold min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation"
                  title="Zoom Out"
                >
                  −
                </button>
                <button
                  onClick={handleResetZoom}
                  className="px-3 py-2 sm:px-2.5 sm:py-1.5 bg-gray-700/60 text-gray-300 rounded border border-gray-600/50 hover:bg-gray-600/60 hover:text-white active:bg-gray-500/60 transition-all text-xs sm:text-xs font-medium min-w-[50px] sm:min-w-[45px] min-h-[44px] sm:min-h-0 touch-manipulation"
                  title="Reset to 100%"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                  className="px-3 py-2 sm:px-2.5 sm:py-1.5 bg-gray-700/60 text-gray-300 rounded border border-gray-600/50 hover:bg-gray-600/60 hover:text-white active:bg-gray-500/60 transition-all text-base sm:text-sm font-semibold min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation"
                  title="Zoom In"
                >
                  +
                </button>
              </div>

              {/* Phase 4: Mark as Homework Button */}
              {!readOnly && onAssignHomework && assignedStudents.length > 0 && (
                <button
                  onClick={() => setShowHomeworkModal(true)}
                  className="px-3 py-2 sm:px-3 sm:py-1.5 rounded-md font-semibold transition-all text-base sm:text-sm flex-shrink-0 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation bg-gradient-to-r from-blue-600 to-blue-700 text-white border border-blue-500/50 hover:from-blue-500 hover:to-blue-600 active:from-blue-400 active:to-blue-500"
                  title="Mark as Homework"
                >
                  <span className="text-base sm:text-sm">📚</span> <span className="hidden sm:inline">Homework</span>
                </button>
              )}

              {/* Save Button - Always Visible */}
              {onSave && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`px-3 py-2 sm:px-3 sm:py-1.5 rounded-md font-semibold transition-all text-base sm:text-sm flex-shrink-0 min-w-[80px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation ${
                    isSaving
                      ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed border border-gray-700/30'
                      : 'bg-gradient-to-r from-green-600 to-green-700 text-white border border-green-500/50 hover:from-green-500 hover:to-green-600 active:from-green-400 active:to-green-500'
                  }`}
                  title="Save Annotations"
                >
                  <span className="text-base sm:text-sm">{isSaving ? '⏳' : '💾'}</span> <span className="hidden sm:inline">Save</span>
                </button>
              )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-2 sm:p-4 min-h-0 flex">
        {/* Table of Contents Sidebar */}
        {showTOC && tocItems.length > 0 && (
          <div className="hidden lg:block w-64 bg-gray-900 border-r border-gray-700 flex-shrink-0 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-200">Table of Contents</h3>
              <button
                onClick={() => setShowTOC(false)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
                title="Close TOC"
              >
                ✕
              </button>
            </div>
            <nav className="space-y-1">
              {tocItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentPage(item.page);
                    handlePageChange(item.page);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md transition-all ${
                    currentPage === item.page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                  style={{ paddingLeft: `${item.level * 16 + 12}px` }}
                >
                  <span className="text-sm">{item.title}</span>
                  <span className="text-xs text-gray-400 ml-2">(p. {item.page})</span>
                </button>
              ))}
            </nav>
          </div>
        )}
        
        {/* TOC Toggle Button (Mobile) */}
        {tocItems.length > 0 && (
          <button
            onClick={() => setShowTOC(!showTOC)}
            className="lg:hidden fixed top-20 left-2 z-30 px-3 py-2 bg-gray-800 text-gray-200 rounded-md shadow-lg hover:bg-gray-700 transition-all"
            title="Toggle Table of Contents"
          >
            📑
          </button>
        )}
        
        {/* Mobile TOC Overlay */}
        {showTOC && tocItems.length > 0 && (
          <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowTOC(false)}>
            <div className="w-64 h-full bg-gray-900 border-r border-gray-700 overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-200">Table of Contents</h3>
                <button
                  onClick={() => setShowTOC(false)}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                  title="Close TOC"
                >
                  ✕
                </button>
              </div>
              <nav className="space-y-1">
                {tocItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentPage(item.page);
                      handlePageChange(item.page);
                      setShowTOC(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md transition-all ${
                      currentPage === item.page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                    style={{ paddingLeft: `${item.level * 16 + 12}px` }}
                  >
                    <span className="text-sm">{item.title}</span>
                    <span className="text-xs text-gray-400 ml-2">(p. {item.page})</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}
        
        <div className="flex-1 flex justify-center">
          <div className="relative" ref={pageRef}>
            <Document
              file={pdfUrl}
              onLoadSuccess={async (document) => {
                const { numPages } = document;
                setNumPages(numPages);
                
                // Extract table of contents
                try {
                  if (document.getOutline) {
                    const outline = await document.getOutline();
                    if (outline && outline.length > 0) {
                      const tocItemsList: Array<{ title: string; page: number; level: number }> = [];
                      
                      const extractOutline = (items: any[], level: number = 0) => {
                        items.forEach((item: any) => {
                          if (item.title) {
                            // Extract page number from destination
                            let pageNum = 1;
                            if (item.dest) {
                              if (Array.isArray(item.dest)) {
                                // Destination array format - first element might be page reference
                                const destRef = item.dest[0];
                                if (destRef && typeof destRef === 'object' && 'num' in destRef) {
                                  pageNum = destRef.num || 1;
                                } else if (typeof destRef === 'number') {
                                  pageNum = destRef;
                                } else if (item.dest.length > 0 && typeof item.dest[0] === 'number') {
                                  pageNum = item.dest[0];
                                }
                              } else if (typeof item.dest === 'number') {
                                pageNum = item.dest;
                              }
                            }
                            
                            tocItemsList.push({
                              title: item.title,
                              page: Math.max(1, Math.min(pageNum, numPages || 1)),
                              level,
                            });
                          }
                          if (item.items && item.items.length > 0) {
                            extractOutline(item.items, level + 1);
                          }
                        });
                      };
                      
                      extractOutline(outline);
                      setTocItems(tocItemsList);
                      if (tocItemsList.length > 0) {
                        setShowTOC(true); // Auto-show TOC if available
                      }
                    }
                  }
                } catch (error) {
                  console.log('No table of contents available:', error);
                }
              }}
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
              className="absolute top-0 left-0 pointer-events-none z-0 transition-opacity duration-300"
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
              onDoubleClick={handleDoubleClick}
              onContextMenu={handleContextMenu}
              style={{ 
                cursor: selectionState.isResizing 
                  ? `${selectionState.resizeHandle || 'default'}-resize` 
                  : selectionState.selectedAnnotation && !selectedTool
                  ? 'move'
                  : selectedTool 
                  ? 'crosshair' 
                  : isGestureDragging
                  ? 'crosshair'
                  : 'default',
                pointerEvents: readOnly ? 'none' : 'auto' 
              }}
            />
            
            {/* Phase 2: Contextual Menu */}
            {contextMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setContextMenu(null)}
                />
                <div
                  className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-2 min-w-[200px]"
                  style={{
                    left: `${contextMenu.x}px`,
                    top: `${contextMenu.y}px`,
                  }}
                >
                  {contextMenu.annotation ? (
                    // Menu for existing annotation
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          if (contextMenu.annotation) {
                            handleDeleteSelected();
                          }
                          setContextMenu(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-gray-200 text-sm flex items-center gap-2"
                      >
                        <span>🗑️</span> Delete
                      </button>
                      <button
                        onClick={() => {
                          if (contextMenu.annotation) {
                            setSelectedColor('#FF0000');
                            handleChangeColor('#FF0000');
                          }
                          setContextMenu(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-gray-200 text-sm flex items-center gap-2"
                      >
                        <span>🔴</span> Red
                      </button>
                      <button
                        onClick={() => {
                          if (contextMenu.annotation) {
                            setSelectedColor('#00FF00');
                            handleChangeColor('#00FF00');
                          }
                          setContextMenu(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-gray-200 text-sm flex items-center gap-2"
                      >
                        <span>🟢</span> Green
                      </button>
                      <button
                        onClick={() => {
                          if (contextMenu.annotation) {
                            setSelectedColor('#0000FF');
                            handleChangeColor('#0000FF');
                          }
                          setContextMenu(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-gray-200 text-sm flex items-center gap-2"
                      >
                        <span>🔵</span> Blue
                      </button>
                    </div>
                  ) : (
                    // Menu for empty space - quick actions
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setSelectedTool('highlight');
                          setContextMenu(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-gray-200 text-sm flex items-center gap-2"
                      >
                        <span>🖍️</span> Highlight
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTool('drawing');
                          setContextMenu(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-gray-200 text-sm flex items-center gap-2"
                      >
                        <span>✍️</span> Pen
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTool('arrow');
                          setContextMenu(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-gray-200 text-sm flex items-center gap-2"
                      >
                        <span>➡️</span> Arrow
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTool('note');
                          setContextMenu(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-gray-200 text-sm flex items-center gap-2"
                      >
                        <span>📌</span> Note
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Heart and Star buttons overlay */}
            {annotations
              .filter(a => a.page === currentPage && (a.width || a.height || a.type === 'note'))
              .map(annotation => {
                if (!pageRef.current) return null;
                
                const rect = pageRef.current.getBoundingClientRect();
                const annX = annotation.x * rect.width;
                const annY = annotation.y * rect.height;
                const annWidth = (annotation.width || 0) * rect.width;
                const annHeight = (annotation.height || 0) * rect.height;
                
                // Position buttons at top-right of annotation (or near text)
                const buttonX = annX + Math.max(annWidth, 20);
                const buttonY = annY - 30;
                
                const isHearted = annotation.heartedBy?.includes(userId) || false;
                const isStarred = annotation.starredBy?.includes(userId) || false;
                const heartCount = annotation.hearts || 0;
                
                return (
                  <div
                    key={`actions-${annotation.id}`}
                    className="absolute z-20 flex items-center gap-1"
                    style={{
                      left: `${buttonX}px`,
                      top: `${buttonY}px`,
                      pointerEvents: 'auto',
                    }}
                  >
                    {/* Heart Button */}
                    <button
                      onClick={(e) => handleHeartClick(annotation.id, e)}
                      className={`px-2.5 py-2 sm:px-2 sm:py-1 rounded-md transition-all text-base sm:text-sm flex items-center gap-1 shadow-lg min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation ${
                        isHearted
                          ? 'bg-red-500/90 text-white hover:bg-red-600 active:bg-red-700'
                          : 'bg-gray-800/90 text-gray-300 hover:bg-gray-700 active:bg-gray-600'
                      }`}
                      title={isHearted ? 'Unlike' : 'Like'}
                    >
                      <span className="text-lg sm:text-base">❤️</span>
                      {heartCount > 0 && (
                        <span className="text-xs sm:text-xs font-semibold">{heartCount}</span>
                      )}
                    </button>
                    
                    {/* Star Button */}
                    <button
                      onClick={(e) => handleStarClick(annotation.id, e)}
                      className={`px-2.5 py-2 sm:px-2 sm:py-1 rounded-md transition-all text-base sm:text-sm shadow-lg min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation ${
                        isStarred
                          ? 'bg-yellow-500/90 text-white hover:bg-yellow-600 active:bg-yellow-700'
                          : 'bg-gray-800/90 text-gray-300 hover:bg-gray-700 active:bg-gray-600'
                      }`}
                      title={isStarred ? 'Unmark as important' : 'Mark as important'}
                    >
                      <span className="text-lg sm:text-base">⭐</span>
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Floating toggle button when bottom bar is hidden */}
      {showControls && !showBottomBar && (
        <button
          onClick={() => setShowBottomBar(true)}
          className="fixed bottom-4 left-4 z-50 px-5 py-3 bg-gradient-to-r from-accent-500 via-accent-400 to-accent-500 text-primary-900 rounded-xl shadow-2xl hover:shadow-accent-500/50 hover:from-accent-600 hover:via-accent-500 hover:to-accent-600 transition-all duration-300 flex items-center gap-3 border-2 border-primary-400/30 hover:border-primary-300/50 transform hover:scale-105 active:scale-95"
          title="Show Navigation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm font-bold tracking-wide">Show Navigation</span>
        </button>
      )}

      {/* Page Navigation - Collapsible */}
      {showControls && showBottomBar && (
        <div className="bg-gradient-to-b from-gray-800 via-gray-700 to-gray-800 border-t border-gray-900 p-2 sm:p-2 shadow-2xl flex-shrink-0">
          {/* Toggle Button */}
          <div className="flex justify-start mb-1">
            <button
              onClick={() => setShowBottomBar(false)}
              className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
              title="Hide Navigation"
            >
              ▼ Hide
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* TOC Toggle Button */}
              {tocItems.length > 0 && (
                <button
                  onClick={() => setShowTOC(!showTOC)}
                  className="hidden lg:flex px-3 py-2 sm:px-3 sm:py-1.5 bg-gray-700/60 text-gray-300 rounded-md border border-gray-600/50 hover:bg-gray-600/60 hover:text-white active:bg-gray-500/60 transition-all text-sm font-medium min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation items-center justify-center"
                  title="Toggle Table of Contents"
                >
                  📑
                </button>
              )}
              
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-2 sm:px-3 sm:py-1.5 bg-gray-700/60 text-gray-300 rounded-md border border-gray-600/50 hover:bg-gray-600/60 hover:text-white active:bg-gray-500/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm sm:text-sm font-medium min-w-[60px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation"
                title="Previous Page"
              >
                ← Prev
              </button>
              <span className="px-2 sm:px-3 py-2 sm:py-1.5 text-gray-300 font-semibold bg-gray-900/40 rounded-md border border-gray-600/30 text-xs sm:text-sm">
                Page {currentPage} of {numPages || '?'}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= (numPages || 1)}
                className="px-3 py-2 sm:px-3 sm:py-1.5 bg-gray-700/60 text-gray-300 rounded-md border border-gray-600/50 hover:bg-gray-600/60 hover:text-white active:bg-gray-500/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm sm:text-sm font-medium min-w-[60px] min-h-[44px] sm:min-w-0 sm:min-h-0 touch-manipulation"
                title="Next Page"
              >
                Next →
              </button>
              
              {/* Page Jump Input */}
              {numPages && numPages > 1 && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max={numPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= numPages) {
                        handlePageChange(page);
                      }
                    }}
                    className="w-16 px-2 py-1.5 text-sm bg-gray-700/60 text-gray-300 rounded-md border border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    title="Jump to page"
                  />
                  <span className="text-xs text-gray-400">/ {numPages}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Phase 5: Collapsible Notes Panel */}
      {!readOnly && (
        <div className={`bg-gradient-to-b from-gray-800 to-gray-900 border-t border-gray-900 shadow-2xl transition-all duration-300 ${isNotesCollapsed ? 'p-2' : 'p-3'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-300">Notes</h3>
            <button
              onClick={() => setIsNotesCollapsed(!isNotesCollapsed)}
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
              title={isNotesCollapsed ? 'Expand Notes' : 'Collapse Notes'}
            >
              {isNotesCollapsed ? '▼' : '▲'}
            </button>
          </div>
          {!isNotesCollapsed && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add general notes about this PDF..."
              className="w-full p-3 bg-gray-900/60 text-gray-200 border border-gray-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder-gray-500 shadow-inner transition-all duration-300"
              rows={3}
            />
          )}
        </div>
      )}

      {readOnly && showBottomBar && annotations.some(a => a.note || a.text) && (
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

      {/* Learning Objectives Panel - Only show for Qaidah 1 and 2 */}
      {qaidahBook && (
        <QaidahLearningObjectives
          book={qaidahBook}
          page={currentPage}
          annotations={annotations.filter(a => a.page === currentPage)}
          onMistakeMark={(mistakeType: string) => {
            // Phase 3: One-tap mistake marking - place at center of visible area
            if (!pageRef.current) return;
            const rect = pageRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const { x, y } = screenToNormalized(centerX, centerY, pageRef.current);
            
            const mistakeAnnotation: Annotation = {
              id: `${Date.now()}-${Math.random()}`,
              page: currentPage,
              type: 'note',
              x: Math.max(0, Math.min(1, x - 0.01)),
              y: Math.max(0, Math.min(1, y - 0.01)),
              color: '#FF0000',
              width: 0.02,
              height: 0.02,
              note: mistakeType,
              text: `❌ ${mistakeType}`,
            };
            updateAnnotations(prev => [...prev, mistakeAnnotation], true);
          }}
        />
      )}
    </div>
  );
};

export default PdfAnnotationViewer;

