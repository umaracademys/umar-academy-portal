/**
 * Undo/Redo History Manager for PDF Annotations
 * 
 * This utility manages annotation history per page, allowing users to undo/redo
 * changes. History is stored separately for each page to maintain context.
 * 
 * Design decisions:
 * - Per-page history: Each page maintains its own undo/redo stack
 * - Maximum history size: Prevents memory issues on large PDFs
 * - Snapshot-based: Stores complete annotation state for each action
 * 
 * Future extensions:
 * - Add history persistence to localStorage
 * - Add history compression for large annotation sets
 * - Add history merging for batch operations
 */

export interface Annotation {
  id: string;
  page: number;
  type: 'highlight' | 'text' | 'drawing' | 'arrow' | 'note' | 'line' | 'rectangle' | 'circle' | 'diamond' | 'filled-rectangle' | 'filled-circle' | 'filled-diamond';
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  text?: string;
  note?: string;
  points?: Array<{ x: number; y: number }>;
  strokeWidth?: number;
  isFilled?: boolean;
  rotation?: number;
  createdAt?: Date;
}

interface HistoryState {
  annotations: Annotation[];
  timestamp: number;
}

export class UndoRedoHistory {
  private history: Map<number, HistoryState[]> = new Map(); // page -> history stack
  private currentIndex: Map<number, number> = new Map(); // page -> current position in history
  private maxHistorySize: number = 50; // Maximum history entries per page

  /**
   * Save current state to history for a specific page
   * This is called after each annotation operation
   */
  saveState(page: number, annotations: Annotation[]): void {
    // Get or create history for this page
    if (!this.history.has(page)) {
      this.history.set(page, []);
      this.currentIndex.set(page, -1);
    }

    const pageHistory = this.history.get(page)!;
    const currentIdx = this.currentIndex.get(page)!;

    // Remove any "future" history if we're not at the end (user did undo, then made new change)
    if (currentIdx < pageHistory.length - 1) {
      pageHistory.splice(currentIdx + 1);
    }

    // Add new state
    const newState: HistoryState = {
      annotations: JSON.parse(JSON.stringify(annotations)), // Deep clone
      timestamp: Date.now(),
    };

    pageHistory.push(newState);

    // Limit history size (remove oldest entries)
    // Track how many items we remove to adjust index if needed
    const itemsRemoved = Math.max(0, pageHistory.length - this.maxHistorySize);
    while (pageHistory.length > this.maxHistorySize) {
      pageHistory.shift();
    }

    // Always update index to point to the latest state
    // After removing items, index should be length - 1
    this.currentIndex.set(page, pageHistory.length - 1);
  }

  /**
   * Undo last action for a specific page
   * Returns the previous state or null if no history
   */
  undo(page: number): Annotation[] | null {
    if (!this.history.has(page)) return null;

    const pageHistory = this.history.get(page)!;
    const currentIdx = this.currentIndex.get(page)!;

    if (currentIdx <= 0) return null; // No history to undo

    const newIdx = currentIdx - 1;
    this.currentIndex.set(page, newIdx);

    return JSON.parse(JSON.stringify(pageHistory[newIdx].annotations)); // Deep clone
  }

  /**
   * Redo last undone action for a specific page
   * Returns the next state or null if no redo available
   */
  redo(page: number): Annotation[] | null {
    if (!this.history.has(page)) return null;

    const pageHistory = this.history.get(page)!;
    const currentIdx = this.currentIndex.get(page)!;

    if (currentIdx >= pageHistory.length - 1) return null; // Already at latest

    const newIdx = currentIdx + 1;
    this.currentIndex.set(page, newIdx);

    return JSON.parse(JSON.stringify(pageHistory[newIdx].annotations)); // Deep clone
  }

  /**
   * Check if undo is available for a page
   */
  canUndo(page: number): boolean {
    if (!this.history.has(page)) return false;
    const currentIdx = this.currentIndex.get(page)!;
    return currentIdx > 0;
  }

  /**
   * Check if redo is available for a page
   */
  canRedo(page: number): boolean {
    if (!this.history.has(page)) return false;
    const pageHistory = this.history.get(page)!;
    const currentIdx = this.currentIndex.get(page)!;
    return currentIdx < pageHistory.length - 1;
  }

  /**
   * Clear history for a specific page
   */
  clearPage(page: number): void {
    this.history.delete(page);
    this.currentIndex.delete(page);
  }

  /**
   * Clear all history
   */
  clearAll(): void {
    this.history.clear();
    this.currentIndex.clear();
  }

  /**
   * Get history size for a page (for debugging)
   */
  getHistorySize(page: number): number {
    return this.history.get(page)?.length || 0;
  }
}

