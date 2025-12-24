/**
 * Phase 6: Future-Ready Type Definitions
 * 
 * These types define the structure for future features that are NOT yet implemented.
 * They serve as architectural blueprints to ensure the codebase can accommodate
 * these features without major refactoring.
 * 
 * DO NOT import these types in production code yet.
 * Use them only for planning and architectural design.
 */

// ============================================================================
// 1. AI Detection of Common Mistakes
// ============================================================================

export interface MistakeDetection {
  id: string;
  annotationId: string;
  type: 'madd' | 'holding' | 'memory' | 'ikhfa' | 'tech' | 'letter' | 
        'heavy_letter' | 'no_rounding_lips' | 'heavy_h' | 'light_l' | 'atkee';
  confidence: number; // 0-1, AI confidence score
  detectedAt: Date;
  reviewedBy?: string; // Teacher ID who reviewed
  reviewedAt?: Date;
  isConfirmed: boolean;
  aiModel: string; // Model version used
  context?: {
    surroundingText?: string;
    pageContext?: string;
    audioAnalysis?: any;
  };
}

// ============================================================================
// 2. Teacher Performance Insights
// ============================================================================

export interface TeacherPerformanceMetrics {
  teacherId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalLessons: number;
    totalStudents: number;
    averageAnnotationsPerLesson: number;
    averageMistakesDetected: number;
    commonMistakeTypes: Array<{ type: string; count: number }>;
    studentProgressRate: number; // % improvement
    homeworkCompletionRate: number;
    averageResponseTime: number; // minutes
    teachingStrengths: string[];
    areasForImprovement: string[];
  };
  trends: {
    annotationsOverTime: Array<{ date: Date; count: number }>;
    mistakeDetectionAccuracy: number;
    studentEngagement: number;
  };
}

export interface LessonInsight {
  lessonId: string;
  pdfId: string;
  date: Date;
  duration: number; // minutes
  annotationsCount: number;
  mistakesMarked: number;
  studentInteractions: number;
  effectivenessScore: number; // Calculated metric
}

// ============================================================================
// 3. Lesson Replay
// ============================================================================

export interface LessonEvent {
  timestamp: number; // Relative to lesson start (ms)
  type: 'annotation_create' | 'annotation_update' | 'annotation_delete' | 
        'page_change' | 'zoom_change' | 'note_add' | 'tool_change' |
        'mistake_mark' | 'homework_assign';
  data: any; // Event-specific data
  annotationId?: string; // If related to annotation
  userId: string; // User who performed the action
}

export interface LessonReplay {
  id: string;
  pdfId: string;
  teacherId: string;
  startTime: Date;
  endTime: Date;
  events: LessonEvent[];
  annotations: any[]; // Snapshot at end
  audioRecording?: string; // URL to audio file
  duration: number; // Total duration in seconds
}

// ============================================================================
// 4. Real-Time Collaborative Teaching
// ============================================================================

export interface ActiveUser {
  userId: string;
  userName: string;
  role: 'teacher' | 'student';
  cursor: { x: number; y: number; page: number };
  color: string; // User's annotation color
  lastSeen: Date;
  avatar?: string;
}

export interface CollaborationEvent {
  type: 'annotation_create' | 'annotation_update' | 'annotation_delete' | 
        'cursor_move' | 'user_join' | 'user_leave' | 'page_change';
  userId: string;
  timestamp: Date;
  data: any;
  sessionId: string;
}

export interface CollaborationSession {
  id: string;
  pdfId: string;
  teacherIds: string[];
  studentId?: string;
  activeUsers: ActiveUser[];
  createdAt: Date;
  isActive: boolean;
}

// ============================================================================
// 5. Audio Notes Per Annotation
// ============================================================================

export interface AudioNote {
  id: string;
  annotationId: string;
  audioUrl: string;
  duration: number; // seconds
  transcript?: string; // Optional: speech-to-text
  createdAt: Date;
  createdBy: string;
  fileSize?: number; // bytes
  mimeType?: string; // e.g., 'audio/webm', 'audio/mp3'
}

// ============================================================================
// Future Service Interfaces (Architectural Blueprints)
// ============================================================================

/**
 * AI Service Interface (Future)
 * Handles AI-powered mistake detection
 */
export interface AIService {
  detectMistakes(annotations: any[], pdfContext?: any): Promise<MistakeDetection[]>;
  analyzeStudentProgress(studentId: string, period: { start: Date; end: Date }): Promise<any>;
  suggestImprovements(teacherId: string, metrics: TeacherPerformanceMetrics): Promise<string[]>;
}

/**
 * Collaboration Service Interface (Future)
 * Handles real-time collaborative features
 */
export interface CollaborationService {
  createSession(pdfId: string, userId: string): Promise<CollaborationSession>;
  joinSession(sessionId: string, userId: string): Promise<WebSocket>;
  leaveSession(sessionId: string, userId: string): Promise<void>;
  sendEvent(event: CollaborationEvent): void;
  onEvent(callback: (event: CollaborationEvent) => void): void;
}

/**
 * Audio Service Interface (Future)
 * Handles audio recording and playback
 */
export interface AudioService {
  startRecording(): Promise<MediaRecorder>;
  stopRecording(recorder: MediaRecorder): Promise<Blob>;
  uploadAudio(blob: Blob, annotationId: string): Promise<AudioNote>;
  transcribeAudio(audioUrl: string): Promise<string>;
  deleteAudio(audioNoteId: string): Promise<void>;
}

/**
 * Replay Service Interface (Future)
 * Handles lesson recording and replay
 */
export interface ReplayService {
  startRecording(pdfId: string, teacherId: string): Promise<string>; // Returns sessionId
  stopRecording(sessionId: string): Promise<LessonReplay>;
  getReplay(sessionId: string): Promise<LessonReplay>;
  playReplay(replay: LessonReplay, onEvent: (event: LessonEvent) => void): Promise<void>;
}

/**
 * Analytics Service Interface (Future)
 * Handles performance metrics and insights
 */
export interface AnalyticsService {
  getTeacherMetrics(teacherId: string, period: { start: Date; end: Date }): Promise<TeacherPerformanceMetrics>;
  getLessonInsights(teacherId: string, limit?: number): Promise<LessonInsight[]>;
  trackEvent(event: LessonEvent): Promise<void>;
  getTrends(teacherId: string, metric: string, period: { start: Date; end: Date }): Promise<any[]>;
}

// ============================================================================
// Event System Architecture (Future)
// ============================================================================

/**
 * Centralized event emitter for annotation events
 * Allows plugins and features to subscribe to events
 */
export interface AnnotationEventEmitter {
  on(event: string, callback: (data: any) => void): void;
  emit(event: string, data: any): void;
  off(event: string, callback: (data: any) => void): void;
  once(event: string, callback: (data: any) => void): void;
}

/**
 * Plugin architecture for extensibility
 */
export interface AnnotationPlugin {
  name: string;
  version: string;
  onAnnotationCreate?(annotation: any): void | Promise<void>;
  onAnnotationUpdate?(annotation: any): void | Promise<void>;
  onAnnotationDelete?(annotationId: string): void | Promise<void>;
  onPageChange?(page: number): void | Promise<void>;
  render?(annotation: any, ctx: CanvasRenderingContext2D): void;
  cleanup?(): void;
}

// ============================================================================
// Configuration Types (Future)
// ============================================================================

export interface FeatureFlags {
  aiMistakeDetection: boolean;
  collaboration: boolean;
  audioNotes: boolean;
  lessonReplay: boolean;
  performanceInsights: boolean;
}

export interface UserPreferences {
  enableAISuggestions: boolean;
  enableCollaboration: boolean;
  enableAudioNotes: boolean;
  defaultAnnotationColor: string;
  compactMode: boolean;
  showFloatingToolbar: boolean;
}

