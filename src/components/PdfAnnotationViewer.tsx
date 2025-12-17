import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
const pdfjsVersion = '5.4.296';
const cdnWorkerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = cdnWorkerUrl;
}

interface Annotation {
  id: string;
  page: number;
  type: 'highlight' | 'text' | 'drawing' | 'arrow' | 'note';
  x: number; // Normalized position (0-1)
  y: number; // Normalized position (0-1)
  width?: number;
  height?: number;
  color: string;
  text?: string;
  note?: string;
  points?: Array<{ x: number; y: number }>;
  createdAt?: Date;
}

interface PdfAnnotationViewerProps {
  pdfUrl: string;
  annotations?: Annotation[];
  readOnly?: boolean; // If true, no annotations can be added/edited
  onAnnotationsChange?: (annotations: Annotation[]) => void;
  onSave?: (annotations: Annotation[], notes: string) => Promise<void>;
  showControls?: boolean;
  initialPage?: number;
  initialNotes?: string; // Initial notes text
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
  } = props;
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [zoom, setZoom] = useState(1);
  const [annotations, setAnnotations] = useState<Annotation[]>(externalAnnotations);
  const [selectedTool, setSelectedTool] = useState<'highlight' | 'text' | 'drawing' | 'arrow' | 'note' | null>(null);
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [notes, setNotes] = useState(initialNotes);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Update notes when initialNotes changes
  useEffect(() => {
    if (initialNotes) {
      setNotes(initialNotes);
    }
  }, [initialNotes]);
  const [drawingPoints, setDrawingPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  
  const pageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);

  // Update annotations when external annotations change
  useEffect(() => {
    if (externalAnnotations && externalAnnotations.length >= 0) {
      setAnnotations(externalAnnotations);
    }
  }, [externalAnnotations]);

  // Handle page number change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (numPages || 1)) {
      setCurrentPage(page);
      setIsDrawing(false);
      setDrawingPoints([]);
    }
  };

  // Convert screen coordinates to normalized (0-1) coordinates
  const screenToNormalized = useCallback((x: number, y: number, pageElement: HTMLElement) => {
    const rect = pageElement.getBoundingClientRect();
    const normalizedX = (x - rect.left) / rect.width;
    const normalizedY = (y - rect.top) / rect.height;
    return { x: Math.max(0, Math.min(1, normalizedX)), y: Math.max(0, Math.min(1, normalizedY)) };
  }, []);

  // Handle mouse events for annotations
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (readOnly || !selectedTool || !pageRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();

    const { x, y } = screenToNormalized(e.clientX, e.clientY, pageRef.current);
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
      setAnnotations(prev => {
        const updated = [...prev, newAnnotation];
        onAnnotationsChange?.(updated);
        return updated;
      });
    } else if (selectedTool === 'text') {
      // For text, create annotation and allow editing
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
      setAnnotations(prev => {
        const updated = [...prev, newAnnotation];
        onAnnotationsChange?.(updated);
        return updated;
      });
      // Prompt for text
      const text = prompt('Enter text:');
      if (text !== null) {
        setAnnotations(prev => {
          const updated = prev.map(a => a.id === newAnnotation.id ? { ...a, text, note: text } : a);
          onAnnotationsChange?.(updated);
          return updated;
        });
      } else {
        // Remove annotation if cancelled
        setAnnotations(prev => {
          const updated = prev.filter(a => a.id !== newAnnotation.id);
          onAnnotationsChange?.(updated);
          return updated;
        });
      }
    }
  }, [readOnly, selectedTool, currentPage, selectedColor, screenToNormalized, onAnnotationsChange]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (readOnly || !selectedTool || !pageRef.current) return;
    
    if (!isDrawing && !isDragging) return;

    const { x, y } = screenToNormalized(e.clientX, e.clientY, pageRef.current);
    
    if (selectedTool === 'drawing' && isDrawing) {
      setDrawingPoints(prev => [...prev, { x, y }]);
    } else if ((selectedTool === 'highlight' || selectedTool === 'arrow' || selectedTool === 'note') && isDragging && startPoint && currentAnnotation) {
      // Update annotation size based on drag
      const width = Math.abs(x - startPoint.x);
      const height = Math.abs(y - startPoint.y);
      const newX = Math.min(x, startPoint.x);
      const newY = Math.min(y, startPoint.y);
      
      setAnnotations(prev => {
        const updated = prev.map(a => 
          a.id === currentAnnotation.id 
            ? { ...a, x: newX, y: newY, width, height }
            : a
        );
        onAnnotationsChange?.(updated);
        return updated;
      });
    }
  }, [readOnly, isDrawing, isDragging, selectedTool, screenToNormalized, startPoint, currentAnnotation, onAnnotationsChange]);

  const handleMouseUp = useCallback((e?: React.MouseEvent) => {
    if (readOnly || !selectedTool) return;

    if (selectedTool === 'drawing' && isDrawing && drawingPoints.length > 1) {
      const newAnnotation: Annotation = {
        id: `${Date.now()}-${Math.random()}`,
        page: currentPage,
        type: 'drawing',
        x: drawingPoints[0].x,
        y: drawingPoints[0].y,
        color: selectedColor,
        points: [...drawingPoints],
      };
      setAnnotations(prev => {
        const updated = [...prev, newAnnotation];
        onAnnotationsChange?.(updated);
        return updated;
      });
    }
    
    // Clean up dragging state
    if (isDragging && currentAnnotation) {
      // Remove annotation if it's too small (likely accidental click)
      if (currentAnnotation.width < 0.01 && currentAnnotation.height < 0.01) {
        setAnnotations(prev => {
          const updated = prev.filter(a => a.id !== currentAnnotation.id);
          onAnnotationsChange?.(updated);
          return updated;
        });
      }
    }
    
    setIsDrawing(false);
    setIsDragging(false);
    setDrawingPoints([]);
    setCurrentAnnotation(null);
    setStartPoint(null);
  }, [readOnly, isDrawing, isDragging, selectedTool, drawingPoints, currentPage, selectedColor, currentAnnotation, onAnnotationsChange]);

  // Delete annotation
  const deleteAnnotation = useCallback((id: string) => {
    if (readOnly) return;
    const updated = annotations.filter(a => a.id !== id);
    setAnnotations(updated);
    onAnnotationsChange?.(updated);
  }, [readOnly, annotations, onAnnotationsChange]);

  // Update annotation text
  const updateAnnotationText = useCallback((id: string, text: string) => {
    if (readOnly) return;
    const updated = annotations.map(a => 
      a.id === id ? { ...a, text, note: text } : a
    );
    setAnnotations(updated);
    onAnnotationsChange?.(updated);
  }, [readOnly, annotations, onAnnotationsChange]);

  // Render annotations on canvas
  useEffect(() => {
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
    pageAnnotations.forEach(annotation => {
      ctx.save();
      ctx.strokeStyle = annotation.color;
      ctx.fillStyle = annotation.color;
      ctx.lineWidth = 2;

      const x = annotation.x * canvas.width;
      const y = annotation.y * canvas.height;

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
            // Draw arrowhead
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
          } else {
            // Show placeholder
            ctx.fillStyle = '#CCCCCC';
            ctx.font = '12px Arial';
            ctx.fillText('Text', x * canvas.width, y * canvas.height);
          }
          break;
      }
      ctx.restore();
    });
  }, [annotations, currentPage, pageDimensions]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!onSave || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(annotations, notes);
    } catch (error) {
      console.error('Error saving annotations:', error);
      alert('Failed to save annotations');
    } finally {
      setIsSaving(false);
    }
  }, [onSave, annotations, notes, isSaving]);

  const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#000000'];

  return (
    <div className="w-full h-full flex flex-col bg-gray-100">
      {showControls && !readOnly && (
        <div className="bg-white border-b p-2 flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            <button
              onClick={() => setSelectedTool(selectedTool === 'highlight' ? null : 'highlight')}
              className={`px-3 py-1 rounded ${selectedTool === 'highlight' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              title="Highlight"
            >
              ✏️ Highlight
            </button>
            <button
              onClick={() => setSelectedTool(selectedTool === 'text' ? null : 'text')}
              className={`px-3 py-1 rounded ${selectedTool === 'text' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              title="Text"
            >
              📝 Text
            </button>
            <button
              onClick={() => setSelectedTool(selectedTool === 'drawing' ? null : 'drawing')}
              className={`px-3 py-1 rounded ${selectedTool === 'drawing' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              title="Draw"
            >
              ✍️ Draw
            </button>
            <button
              onClick={() => setSelectedTool(selectedTool === 'arrow' ? null : 'arrow')}
              className={`px-3 py-1 rounded ${selectedTool === 'arrow' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              title="Arrow"
            >
              ➡️ Arrow
            </button>
            <button
              onClick={() => setSelectedTool(selectedTool === 'note' ? null : 'note')}
              className={`px-3 py-1 rounded ${selectedTool === 'note' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              title="Note"
            >
              📌 Note
            </button>
          </div>
          <div className="flex gap-1 items-center">
            <span>Color:</span>
            {colors.map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-6 h-6 rounded border-2 ${selectedColor === color ? 'border-gray-800' : 'border-gray-300'}`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
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
              onMouseLeave={(e) => handleMouseUp(e)}
              style={{ cursor: selectedTool ? 'crosshair' : 'default', pointerEvents: readOnly ? 'none' : 'auto' }}
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

