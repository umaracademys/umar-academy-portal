import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchQaidahMarks, saveQaidahMarks, saveQaidahClasswork, QaidahMark } from '../services/qaidahApi';

// Simple UUID generator
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

interface QaidahCanvasProps {
  studentId: string;
  book: 'qaidah1' | 'qaidah2' | 'quran';
  page: number;
  imageUrl: string;
  zoom: number;
  position: { x: number; y: number };
  containerRef: React.RefObject<HTMLDivElement>;
  imageRef: React.RefObject<HTMLImageElement>;
  enabled?: boolean; // Whether marking is enabled (for teachers)
}

type MarkType = 'mistake' | 'correct' | 'note' | 'delete';

const QaidahCanvas: React.FC<QaidahCanvasProps> = ({
  studentId,
  book,
  page,
  imageUrl,
  zoom,
  position,
  containerRef,
  imageRef,
  enabled = false
}) => {
  const [marks, setMarks] = useState<QaidahMark[]>([]);
  const [selectedTool, setSelectedTool] = useState<MarkType>('mistake');
  const [draggingMark, setDraggingMark] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [editingMark, setEditingMark] = useState<string | null>(null);
  const [editComment, setEditComment] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [classworkDate, setClassworkDate] = useState<string>(() => {
    // Default to today's date in local format for input
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [isSavingClasswork, setIsSavingClasswork] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showClassworkPanel, setShowClassworkPanel] = useState(false);

  // Load marks on page change
  useEffect(() => {
    if (!studentId || !enabled) {
      setIsLoading(false);
      return;
    }

    const loadMarks = async () => {
      setIsLoading(true);
      try {
        const data = await fetchQaidahMarks(studentId, book, page);
        setMarks(data.marks || []);
      } catch (error) {
        console.error('Error loading marks:', error);
        setMarks([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMarks();
  }, [studentId, book, page, enabled]);

  // Debounced save function
  const debouncedSave = useCallback((marksToSave: QaidahMark[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!studentId || !enabled) return;

      setIsSaving(true);
      try {
        await saveQaidahMarks(studentId, book, page, marksToSave);
      } catch (error) {
        console.error('Error saving marks:', error);
      } finally {
        setIsSaving(false);
      }
    }, 500);
  }, [studentId, book, page, enabled]);

  // Convert screen coordinates to normalized (0-1) coordinates
  const screenToNormalized = useCallback((screenX: number, screenY: number): { x: number; y: number } | null => {
    if (!imageRef.current || !containerRef.current) return null;

    const container = containerRef.current;
    const img = imageRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Get natural image dimensions
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    if (naturalWidth === 0 || naturalHeight === 0) return null;

    // Calculate position relative to container center
    const containerCenterX = containerRect.left + containerRect.width / 2;
    const containerCenterY = containerRect.top + containerRect.height / 2;
    
    // Account for panning (position offset)
    const relativeX = screenX - containerCenterX - position.x;
    const relativeY = screenY - containerCenterY - position.y;

    // Account for zoom - the displayed size is natural size * zoom
    const displayedWidth = naturalWidth * zoom;
    const displayedHeight = naturalHeight * zoom;
    
    // Convert to normalized coordinates (0-1) based on natural dimensions
    // The image is centered, so we need to offset by half the displayed size
    const normalizedX = (relativeX / displayedWidth) + 0.5;
    const normalizedY = (relativeY / displayedHeight) + 0.5;

    // Clamp to 0-1
    return {
      x: Math.max(0, Math.min(1, normalizedX)),
      y: Math.max(0, Math.min(1, normalizedY))
    };
  }, [containerRef, imageRef, zoom, position]);

  // Convert normalized coordinates to screen coordinates
  const normalizedToScreen = useCallback((normalizedX: number, normalizedY: number): { x: number; y: number } | null => {
    if (!imageRef.current || !containerRef.current) return null;

    const container = containerRef.current;
    const img = imageRef.current;
    const containerRect = container.getBoundingClientRect();
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    if (naturalWidth === 0 || naturalHeight === 0) return null;

    // Account for zoom
    const displayedWidth = naturalWidth * zoom;
    const displayedHeight = naturalHeight * zoom;
    
    // Container center
    const containerCenterX = containerRect.left + containerRect.width / 2;
    const containerCenterY = containerRect.top + containerRect.height / 2;
    
    // Convert normalized (0-1) to relative position from center
    const relativeX = (normalizedX - 0.5) * displayedWidth;
    const relativeY = (normalizedY - 0.5) * displayedHeight;
    
    // Add panning offset and convert to screen coordinates
    return {
      x: containerCenterX + position.x + relativeX,
      y: containerCenterY + position.y + relativeY
    };
  }, [containerRef, imageRef, zoom, position]);

  // Handle click/tap to add mark
  const handleCanvasClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!enabled || !imageRef.current || !containerRef.current) return;

    e.preventDefault();
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // Check if clicking on an existing mark
    const clickedMark = marks.find(mark => {
      const screenPos = normalizedToScreen(mark.x, mark.y);
      if (!screenPos) return false;
      const distance = Math.sqrt(
        Math.pow(clientX - screenPos.x, 2) + Math.pow(clientY - screenPos.y, 2)
      );
      return distance < 20; // 20px click radius
    });

    if (clickedMark) {
      if (selectedTool === 'delete') {
        // Delete mark
        const newMarks = marks.filter(m => m.id !== clickedMark.id);
        setMarks(newMarks);
        debouncedSave(newMarks);
      } else {
        // Edit mark
        setEditingMark(clickedMark.id);
        setEditComment(clickedMark.comment || '');
      }
      return;
    }

    // Add new mark
    if (selectedTool === 'delete') return;

    const normalized = screenToNormalized(clientX, clientY);
    if (!normalized) return;

    const newMark: QaidahMark = {
      id: generateUUID(),
      type: selectedTool as 'mistake' | 'correct' | 'note',
      x: normalized.x,
      y: normalized.y,
      comment: ''
    };

    const newMarks = [...marks, newMark];
    setMarks(newMarks);
    debouncedSave(newMarks);
  }, [enabled, marks, selectedTool, screenToNormalized, normalizedToScreen, debouncedSave]);

  // Handle mark drag
  const handleMarkMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent, markId: string) => {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDraggingMark(markId);
    setDragStart({ x: clientX, y: clientY });
  }, [enabled]);

  useEffect(() => {
    if (!draggingMark) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragStart.x;
      const deltaY = clientY - dragStart.y;

      const mark = marks.find(m => m.id === draggingMark);
      if (!mark) return;

      const currentScreenPos = normalizedToScreen(mark.x, mark.y);
      if (!currentScreenPos) return;

      const newScreenX = currentScreenPos.x + deltaX;
      const newScreenY = currentScreenPos.y + deltaY;

      const normalized = screenToNormalized(newScreenX, newScreenY);
      if (!normalized) return;

      const updatedMarks = marks.map(m =>
        m.id === draggingMark
          ? { ...m, x: normalized.x, y: normalized.y }
          : m
      );

      setMarks(updatedMarks);
      setDragStart({ x: clientX, y: clientY });
    };

    const handleMouseUp = () => {
      if (draggingMark) {
        debouncedSave(marks);
      }
      setDraggingMark(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [draggingMark, dragStart, marks, screenToNormalized, normalizedToScreen, debouncedSave]);

  // Handle comment save
  const handleSaveComment = useCallback(() => {
    if (!editingMark) return;

    const updatedMarks = marks.map(m =>
      m.id === editingMark
        ? { ...m, comment: editComment }
        : m
    );

    setMarks(updatedMarks);
    setEditingMark(null);
    debouncedSave(updatedMarks);
  }, [editingMark, editComment, marks, debouncedSave]);

  // Handle save as classwork
  const handleSaveClasswork = useCallback(async () => {
    if (!studentId || marks.length === 0) {
      setToastMessage('Please add marks before saving classwork');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const date = new Date(classworkDate);
    if (isNaN(date.getTime())) {
      setToastMessage('Please select a valid date');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setIsSavingClasswork(true);
    try {
      await saveQaidahClasswork(studentId, book, page, marks, date);
      setToastMessage('Classwork saved successfully!');
      setShowClassworkPanel(false);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error) {
      console.error('Error saving classwork:', error);
      setToastMessage('Failed to save classwork. Please try again.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsSavingClasswork(false);
    }
  }, [studentId, book, page, marks, classworkDate]);

  // Get mark icon/color
  const getMarkStyle = (type: string) => {
    switch (type) {
      case 'mistake':
        return { color: '#ef4444', icon: '❌' };
      case 'correct':
        return { color: '#22c55e', icon: '✔' };
      case 'note':
        return { color: '#3b82f6', icon: '📝' };
      default:
        return { color: '#6b7280', icon: '•' };
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <>
      {/* Toolbar */}
      <div className="absolute top-20 left-4 z-30 bg-black/80 backdrop-blur-sm rounded-lg p-2 flex flex-col gap-2">
        <button
          onClick={() => setSelectedTool('mistake')}
          className={`px-3 py-2 rounded transition-colors ${
            selectedTool === 'mistake'
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          title="Mark Mistake"
        >
          ❌ Mistake
        </button>
        <button
          onClick={() => setSelectedTool('correct')}
          className={`px-3 py-2 rounded transition-colors ${
            selectedTool === 'correct'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          title="Mark Correct"
        >
          ✔ Correct
        </button>
        <button
          onClick={() => setSelectedTool('note')}
          className={`px-3 py-2 rounded transition-colors ${
            selectedTool === 'note'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          title="Add Note"
        >
          📝 Note
        </button>
        <button
          onClick={() => setSelectedTool('delete')}
          className={`px-3 py-2 rounded transition-colors ${
            selectedTool === 'delete'
              ? 'bg-red-800 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          title="Delete Mode"
        >
          🗑 Delete
        </button>
        {isSaving && (
          <div className="px-3 py-1 text-xs text-yellow-400 text-center">
            Saving...
          </div>
        )}
        <button
          onClick={() => setShowClassworkPanel(!showClassworkPanel)}
          className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors mt-2"
          title="Save as Classwork"
        >
          📚 Save Classwork
        </button>
      </div>

      {/* Classwork Panel */}
      {showClassworkPanel && (
        <div className="absolute top-20 left-[200px] z-30 bg-black/90 backdrop-blur-sm rounded-lg p-4 min-w-[280px]">
          <div className="text-white text-sm font-semibold mb-3">Save as Classwork</div>
          <div className="mb-3">
            <label className="block text-white text-xs mb-1">Classwork Date</label>
            <input
              type="date"
              value={classworkDate}
              onChange={(e) => setClassworkDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm"
            />
          </div>
          <div className="text-white text-xs mb-3">
            Marks: {marks.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveClasswork}
              disabled={isSavingClasswork || marks.length === 0}
              className="flex-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSavingClasswork ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setShowClassworkPanel(false)}
              className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div 
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg"
          style={{
            animation: 'fadeIn 0.3s ease-in'
          }}
        >
          {toastMessage}
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>

      {/* Canvas overlay */}
      <div
        ref={canvasRef}
        className="absolute inset-0 z-10 pointer-events-auto"
        onClick={handleCanvasClick}
        onTouchStart={handleCanvasClick}
        style={{ cursor: selectedTool === 'delete' ? 'not-allowed' : 'crosshair' }}
      >
        {/* Render marks */}
        {marks.map((mark) => {
          const screenPos = normalizedToScreen(mark.x, mark.y);
          if (!screenPos) return null;

          const style = getMarkStyle(mark.type);
          const isDragging = draggingMark === mark.id;
          const isEditing = editingMark === mark.id;

          return (
            <div
              key={mark.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move select-none"
              style={{
                left: `${screenPos.x}px`,
                top: `${screenPos.y}px`,
                pointerEvents: 'auto'
              }}
              onMouseDown={(e) => handleMarkMouseDown(e, mark.id)}
              onTouchStart={(e) => handleMarkMouseDown(e, mark.id)}
              onClick={(e) => {
                e.stopPropagation();
                if (selectedTool !== 'delete') {
                  setEditingMark(mark.id);
                  setEditComment(mark.comment || '');
                }
              }}
            >
              <div
                className={`text-2xl transition-transform ${
                  isDragging ? 'scale-125' : 'hover:scale-110'
                }`}
                style={{ color: style.color }}
              >
                {style.icon}
              </div>
              {mark.comment && (
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {mark.comment}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit comment modal */}
      {editingMark && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Edit Comment</h3>
            <textarea
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
              className="w-full border rounded p-2 mb-4"
              rows={3}
              placeholder="Add a comment..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveComment}
                className="flex-1 bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingMark(null);
                  setEditComment('');
                }}
                className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QaidahCanvas;
