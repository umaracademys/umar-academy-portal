/**
 * Annotation Selection and Edit Utilities
 * 
 * Handles selection, hit testing, and edit operations for annotations.
 * Provides utilities for detecting clicks on annotations, calculating bounds,
 * and managing selection state.
 * 
 * Design decisions:
 * - Hit testing uses normalized coordinates for consistency
 * - Selection handles different annotation types appropriately
 * - Resize handles positioned at corners/edges for better UX
 * 
 * Future extensions:
 * - Add multi-select support
 * - Add selection grouping
 * - Add keyboard shortcuts for selection
 */

import { Annotation } from './UndoRedoHistory';

export interface SelectionState {
  selectedAnnotation: Annotation | null;
  isResizing: boolean;
  resizeHandle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;
  startPoint: { x: number; y: number } | null;
  originalAnnotation: Annotation | null;
}

/**
 * Check if a point (in normalized coordinates) hits an annotation
 * Returns the annotation if hit, null otherwise
 */
export function hitTestAnnotation(
  x: number,
  y: number,
  annotations: Annotation[],
  canvasWidth: number,
  canvasHeight: number
): Annotation | null {
  for (const annotation of annotations) {
    const annX = annotation.x * canvasWidth;
    const annY = annotation.y * canvasHeight;
    const annWidth = (annotation.width || 0.1) * canvasWidth;
    const annHeight = (annotation.height || 0.05) * canvasHeight;

    switch (annotation.type) {
      case 'highlight':
      case 'note':
        // Rectangle hit test
        if (x >= annX && x <= annX + annWidth && y >= annY && y <= annY + annHeight) {
          return annotation;
        }
        break;

      case 'arrow':
        // Line hit test (with tolerance)
        const arrowEndX = annX + annWidth;
        const arrowEndY = annY + annHeight;
        const distance = pointToLineDistance(x, y, annX, annY, arrowEndX, arrowEndY);
        if (distance < 10) { // 10px tolerance
          return annotation;
        }
        break;

      case 'text':
        // Text hit test (approximate based on position)
        if (x >= annX - 10 && x <= annX + 100 && y >= annY - 10 && y <= annY + 20) {
          return annotation;
        }
        break;

      case 'drawing':
        // Check if point is near any point in the drawing
        if (annotation.points) {
          for (const point of annotation.points) {
            const px = point.x * canvasWidth;
            const py = point.y * canvasHeight;
            const distance = Math.sqrt(Math.pow(x - px, 2) + Math.pow(y - py, 2));
            if (distance < 10) { // 10px tolerance
              return annotation;
            }
          }
        }
        break;

      case 'line':
        // Line hit test (with tolerance)
        const lineEndX = annX + annWidth;
        const lineEndY = annY + annHeight;
        const lineDistance = pointToLineDistance(x, y, annX, annY, lineEndX, lineEndY);
        if (lineDistance < 10) { // 10px tolerance
          return annotation;
        }
        break;

      case 'rectangle':
      case 'filled-rectangle':
        // Rectangle hit test
        if (x >= annX && x <= annX + annWidth && y >= annY && y <= annY + annHeight) {
          return annotation;
        }
        break;

      case 'circle':
      case 'filled-circle': {
        // Circle hit test
        const centerX = annX + annWidth / 2;
        const centerY = annY + annHeight / 2;
        const radiusX = Math.abs(annWidth) / 2;
        const radiusY = Math.abs(annHeight) / 2;
        const radius = Math.max(radiusX, radiusY);
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        if (distance <= radius) {
          return annotation;
        }
        break;
      }

      case 'diamond':
      case 'filled-diamond': {
        // Diamond hit test (rotated square)
        const centerX = annX + annWidth / 2;
        const centerY = annY + annHeight / 2;
        const halfWidth = Math.abs(annWidth) / 2;
        const halfHeight = Math.abs(annHeight) / 2;
        // Check if point is inside diamond using cross product
        const dx = Math.abs(x - centerX);
        const dy = Math.abs(y - centerY);
        if (dx / halfWidth + dy / halfHeight <= 1) {
          return annotation;
        }
        break;
      }
    }
  }

  return null;
}

/**
 * Calculate distance from point to line segment
 */
function pointToLineDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx: number, yy: number;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get resize handle at a point (if any)
 * Returns the handle type or null
 */
export function getResizeHandle(
  x: number,
  y: number,
  annotation: Annotation,
  canvasWidth: number,
  canvasHeight: number,
  handleSize: number = 8
): 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null {
  if (!annotation.width || !annotation.height) return null;

  const annX = annotation.x * canvasWidth;
  const annY = annotation.y * canvasHeight;
  const annWidth = annotation.width * canvasWidth;
  const annHeight = annotation.height * canvasHeight;

  const halfHandle = handleSize / 2;

  // Corner handles
  if (Math.abs(x - annX) < halfHandle && Math.abs(y - annY) < halfHandle) return 'nw';
  if (Math.abs(x - (annX + annWidth)) < halfHandle && Math.abs(y - annY) < halfHandle) return 'ne';
  if (Math.abs(x - annX) < halfHandle && Math.abs(y - (annY + annHeight)) < halfHandle) return 'sw';
  if (Math.abs(x - (annX + annWidth)) < halfHandle && Math.abs(y - (annY + annHeight)) < halfHandle) return 'se';

  // Edge handles
  if (Math.abs(x - annX) < halfHandle && y >= annY && y <= annY + annHeight) return 'w';
  if (Math.abs(x - (annX + annWidth)) < halfHandle && y >= annY && y <= annY + annHeight) return 'e';
  if (Math.abs(y - annY) < halfHandle && x >= annX && x <= annX + annWidth) return 'n';
  if (Math.abs(y - (annY + annHeight)) < halfHandle && x >= annX && x <= annX + annWidth) return 's';

  return null;
}

/**
 * Update annotation position and size based on resize handle
 */
export function resizeAnnotation(
  annotation: Annotation,
  handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w',
  newX: number,
  newY: number,
  startX: number,
  startY: number,
  originalAnnotation: Annotation
): Annotation {
  const deltaX = newX - startX;
  const deltaY = newY - startY;

  let newAnnotation = { ...annotation };
  const origX = originalAnnotation.x;
  const origY = originalAnnotation.y;
  const origWidth = originalAnnotation.width || 0;
  const origHeight = originalAnnotation.height || 0;

  switch (handle) {
    case 'nw':
      newAnnotation.x = origX + deltaX;
      newAnnotation.y = origY + deltaY;
      newAnnotation.width = origWidth - deltaX;
      newAnnotation.height = origHeight - deltaY;
      break;
    case 'ne':
      newAnnotation.y = origY + deltaY;
      newAnnotation.width = origWidth + deltaX;
      newAnnotation.height = origHeight - deltaY;
      break;
    case 'sw':
      newAnnotation.x = origX + deltaX;
      newAnnotation.width = origWidth - deltaX;
      newAnnotation.height = origHeight + deltaY;
      break;
    case 'se':
      newAnnotation.width = origWidth + deltaX;
      newAnnotation.height = origHeight + deltaY;
      break;
    case 'n':
      newAnnotation.y = origY + deltaY;
      newAnnotation.height = origHeight - deltaY;
      break;
    case 's':
      newAnnotation.height = origHeight + deltaY;
      break;
    case 'e':
      newAnnotation.width = origWidth + deltaX;
      break;
    case 'w':
      newAnnotation.x = origX + deltaX;
      newAnnotation.width = origWidth - deltaX;
      break;
  }

  // Ensure minimum size
  if (newAnnotation.width && newAnnotation.width < 0.01) newAnnotation.width = 0.01;
  if (newAnnotation.height && newAnnotation.height < 0.01) newAnnotation.height = 0.01;

  return newAnnotation;
}

/**
 * Move annotation to new position
 */
export function moveAnnotation(
  annotation: Annotation,
  deltaX: number,
  deltaY: number
): Annotation {
  return {
    ...annotation,
    x: annotation.x + deltaX,
    y: annotation.y + deltaY,
  };
}

