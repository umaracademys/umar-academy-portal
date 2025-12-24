# Phase 6 — Future-Ready Architecture Design

## Overview

This document outlines the architectural design for future enhancements without implementing them. The goal is to ensure the current codebase can accommodate these features without major refactoring.

---

## 1. AI Detection of Common Mistakes

### Architecture Design

**Data Structure:**
```typescript
interface MistakeDetection {
  id: string;
  annotationId: string; // Links to annotation
  type: 'madd' | 'holding' | 'memory' | 'ikhfa' | 'tech' | 'letter' | 'heavy_letter' | 'no_rounding_lips' | 'heavy_h' | 'light_l' | 'atkee';
  confidence: number; // 0-1, AI confidence score
  detectedAt: Date;
  reviewedBy?: string; // Teacher ID who reviewed
  reviewedAt?: Date;
  isConfirmed: boolean; // Teacher confirmed or rejected
  aiModel: string; // Model version used
  context?: {
    surroundingText?: string;
    pageContext?: string;
    audioAnalysis?: any;
  };
}

// Extend Annotation interface
interface Annotation {
  // ... existing fields
  aiDetectedMistakes?: MistakeDetection[]; // Phase 6: AI-detected mistakes
  manualMistakes?: string[]; // Teacher-marked mistakes
}
```

**API Endpoints (Future):**
- `POST /api/ai/detect-mistakes` - Analyze annotations for mistakes
- `GET /api/ai/mistakes/:annotationId` - Get detected mistakes for annotation
- `POST /api/ai/mistakes/:id/confirm` - Teacher confirms AI detection
- `POST /api/ai/mistakes/:id/reject` - Teacher rejects AI detection

**Integration Points:**
- Hook in `PdfAnnotationViewer.tsx` after annotation creation
- Background processing queue for AI analysis
- Real-time updates via WebSocket (optional)

**Current Code Hooks:**
- `PdfAnnotationViewer.tsx` - Add `onMistakeDetected` callback prop
- `Annotation` interface - Already supports `note` field (can store mistake type)
- Mistake marking UI - Already implemented, can be enhanced with AI suggestions

---

## 2. Teacher Performance Insights

### Architecture Design

**Data Structure:**
```typescript
interface TeacherPerformanceMetrics {
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
    mistakeDetectionAccuracy: number; // If using AI
    studentEngagement: number;
  };
}

interface LessonInsight {
  lessonId: string;
  pdfId: string;
  date: Date;
  duration: number; // minutes
  annotationsCount: number;
  mistakesMarked: number;
  studentInteractions: number;
  effectivenessScore: number; // Calculated metric
}
```

**API Endpoints (Future):**
- `GET /api/insights/teacher/:teacherId` - Get performance metrics
- `GET /api/insights/teacher/:teacherId/lessons` - Get lesson insights
- `GET /api/insights/teacher/:teacherId/trends` - Get trends over time
- `GET /api/insights/comparison` - Compare with other teachers (anonymized)

**Integration Points:**
- Track annotation creation/deletion events
- Monitor homework assignment and completion
- Calculate metrics from existing data
- Dashboard component for visualization

**Current Code Hooks:**
- `PdfAnnotationViewer.tsx` - Already tracks annotation changes
- `TeacherPdfViewer.tsx` - Can track lesson sessions
- `Assignment` schema - Already tracks homework assignments
- Event logging system - Can be extended for analytics

---

## 3. Lesson Replay

### Architecture Design

**Data Structure:**
```typescript
interface LessonReplay {
  id: string;
  pdfId: string;
  teacherId: string;
  startTime: Date;
  endTime: Date;
  events: LessonEvent[];
  annotations: Annotation[]; // Snapshot at end
  audioRecording?: string; // URL to audio file
}

interface LessonEvent {
  timestamp: number; // Relative to lesson start (ms)
  type: 'annotation_create' | 'annotation_update' | 'annotation_delete' | 'page_change' | 'zoom_change' | 'note_add' | 'tool_change';
  data: any; // Event-specific data
  annotationId?: string; // If related to annotation
}

// Extend PdfAnnotationViewer props
interface PdfAnnotationViewerProps {
  // ... existing props
  replayMode?: boolean; // Phase 6: Enable replay mode
  replayData?: LessonReplay; // Phase 6: Replay data
  onReplayComplete?: () => void; // Phase 6: Callback when replay finishes
}
```

**API Endpoints (Future):**
- `POST /api/lessons/start` - Start recording lesson
- `POST /api/lessons/:id/stop` - Stop recording and save
- `GET /api/lessons/:id/replay` - Get replay data
- `GET /api/lessons/teacher/:teacherId` - List teacher's lessons

**Integration Points:**
- Event capture in `PdfAnnotationViewer.tsx`
- Timeline scrubber component
- Playback controls (play, pause, speed, seek)
- Export replay as video (optional)

**Current Code Hooks:**
- `updateAnnotations` callback - Can capture annotation events
- `handlePageChange` - Can capture page navigation
- `handleMouseDown/Move/Up` - Can capture interaction events
- History system - Already tracks annotation states

---

## 4. Real-Time Collaborative Teaching

### Architecture Design

**Data Structure:**
```typescript
interface CollaborationSession {
  id: string;
  pdfId: string;
  teacherIds: string[]; // Multiple teachers can collaborate
  studentId?: string; // Optional: student viewing
  createdAt: Date;
  activeUsers: ActiveUser[];
}

interface ActiveUser {
  userId: string;
  userName: string;
  role: 'teacher' | 'student';
  cursor: { x: number; y: number; page: number };
  color: string; // User's annotation color
  lastSeen: Date;
}

interface CollaborationEvent {
  type: 'annotation_create' | 'annotation_update' | 'annotation_delete' | 'cursor_move' | 'user_join' | 'user_leave';
  userId: string;
  timestamp: Date;
  data: any;
}

// Extend Annotation interface
interface Annotation {
  // ... existing fields
  createdBy?: string; // Phase 6: User ID who created
  lastModifiedBy?: string; // Phase 6: User ID who last modified
  collaborationId?: string; // Phase 6: Collaboration session ID
}
```

**API Endpoints (Future):**
- `POST /api/collaboration/session` - Create collaboration session
- `GET /api/collaboration/session/:id` - Get session details
- `WebSocket /ws/collaboration/:sessionId` - Real-time events
- `POST /api/collaboration/session/:id/join` - Join session
- `POST /api/collaboration/session/:id/leave` - Leave session

**Integration Points:**
- WebSocket connection for real-time updates
- Conflict resolution for simultaneous edits
- Presence indicators (who's viewing what)
- Cursor tracking and display
- Lock mechanism for annotations being edited

**Current Code Hooks:**
- `PdfAnnotationViewer.tsx` - `onAnnotationsChange` can broadcast changes
- `updateAnnotations` - Can be extended to sync with server
- Canvas rendering - Can overlay other users' cursors
- User context - Already available via `useAuth()`

---

## 5. Audio Notes Per Annotation

### Architecture Design

**Data Structure:**
```typescript
interface AudioNote {
  id: string;
  annotationId: string;
  audioUrl: string;
  duration: number; // seconds
  transcript?: string; // Optional: speech-to-text
  createdAt: Date;
  createdBy: string;
}

// Extend Annotation interface
interface Annotation {
  // ... existing fields
  audioNoteId?: string; // Phase 6: Reference to audio note
  audioNote?: AudioNote; // Phase 6: Embedded audio note data
}
```

**API Endpoints (Future):**
- `POST /api/annotations/:id/audio` - Upload audio note
- `GET /api/annotations/:id/audio` - Get audio note
- `DELETE /api/annotations/:id/audio` - Delete audio note
- `POST /api/audio/transcribe` - Transcribe audio to text

**Integration Points:**
- Audio recording component (browser MediaRecorder API)
- Playback controls in annotation UI
- Waveform visualization
- Speech-to-text integration (optional)

**Current Code Hooks:**
- `Annotation` interface - Already has `note` field (can store transcript)
- Context menu - Can add "Record Audio" option
- Annotation rendering - Can add audio icon/play button
- Heart/Star buttons overlay - Can add audio button nearby

---

## Implementation Strategy

### Phase 6.1: Foundation (Current)
- ✅ Structured annotation data
- ✅ Event tracking hooks
- ✅ User context available
- ✅ History system in place

### Phase 6.2: Data Layer (Future)
- Add new fields to schemas
- Create migration scripts
- Add indexes for performance

### Phase 6.3: API Layer (Future)
- Implement endpoints
- Add WebSocket support (for collaboration)
- Add background job processing (for AI)

### Phase 6.4: UI Layer (Future)
- Add new components
- Integrate with existing viewer
- Add settings/preferences

---

## Code Structure Recommendations

### 1. Event System
```typescript
// Future: Centralized event emitter
class AnnotationEventEmitter {
  on(event: string, callback: Function): void;
  emit(event: string, data: any): void;
  off(event: string, callback: Function): void;
}
```

### 2. Plugin Architecture
```typescript
// Future: Plugin system for extensibility
interface AnnotationPlugin {
  name: string;
  onAnnotationCreate?(annotation: Annotation): void;
  onAnnotationUpdate?(annotation: Annotation): void;
  onAnnotationDelete?(annotationId: string): void;
  render?(annotation: Annotation, ctx: CanvasRenderingContext2D): void;
}
```

### 3. Service Layer
```typescript
// Future: Separate services for each feature
class AIService {
  detectMistakes(annotations: Annotation[]): Promise<MistakeDetection[]>;
}

class CollaborationService {
  joinSession(sessionId: string): WebSocket;
  sendEvent(event: CollaborationEvent): void;
}

class AudioService {
  recordAudio(): Promise<Blob>;
  uploadAudio(blob: Blob, annotationId: string): Promise<AudioNote>;
}
```

---

## Database Schema Extensions (Future)

### MongoDB Collections

```javascript
// Mistakes collection
const mistakeDetectionSchema = {
  annotationId: ObjectId,
  type: String,
  confidence: Number,
  detectedAt: Date,
  reviewedBy: ObjectId,
  reviewedAt: Date,
  isConfirmed: Boolean,
  aiModel: String
};

// Lessons collection
const lessonSchema = {
  pdfId: ObjectId,
  teacherId: ObjectId,
  startTime: Date,
  endTime: Date,
  events: [{
    timestamp: Number,
    type: String,
    data: Object
  }],
  annotations: [Object],
  audioRecording: String
};

// Collaboration sessions collection
const collaborationSessionSchema = {
  pdfId: ObjectId,
  teacherIds: [ObjectId],
  studentId: ObjectId,
  activeUsers: [{
    userId: ObjectId,
    userName: String,
    cursor: Object,
    lastSeen: Date
  }],
  createdAt: Date
};

// Audio notes collection
const audioNoteSchema = {
  annotationId: ObjectId,
  audioUrl: String,
  duration: Number,
  transcript: String,
  createdAt: Date,
  createdBy: ObjectId
};
```

---

## Performance Considerations

### Scalability
- **Caching**: Cache frequently accessed data (annotations, PDFs)
- **Pagination**: Paginate large annotation lists
- **Lazy Loading**: Load annotations on-demand per page
- **WebSocket**: Use for real-time features (collaboration)

### Optimization
- **Indexing**: Index frequently queried fields
- **Batch Operations**: Batch annotation updates
- **Debouncing**: Already implemented for autosave
- **Virtual Scrolling**: For long lists (history, students)

---

## Security Considerations

### Access Control
- Role-based permissions (already implemented)
- Session validation for collaboration
- Audio file access control
- AI data privacy (anonymize student data)

### Data Protection
- Encrypt audio recordings
- Secure WebSocket connections (WSS)
- Rate limiting on AI endpoints
- Audit logs for sensitive operations

---

## Testing Strategy (Future)

### Unit Tests
- Event system
- Annotation manipulation
- AI detection logic
- Collaboration conflict resolution

### Integration Tests
- API endpoints
- WebSocket connections
- Audio upload/playback
- Replay functionality

### E2E Tests
- Complete teaching workflow
- Student homework viewing
- Collaboration sessions
- Lesson replay

---

## Migration Path

### Step 1: Add Fields (Non-Breaking)
- Add optional fields to existing schemas
- Default values for backward compatibility
- No breaking changes to existing code

### Step 2: Feature Flags
- Use feature flags to enable/disable features
- Gradual rollout per teacher/class
- A/B testing capability

### Step 3: Backward Compatibility
- Support both old and new data formats
- Migration scripts for existing data
- Deprecation warnings for old APIs

---

## Conclusion

The current architecture is designed to support all Phase 6 features:

✅ **Extensible**: Plugin-like structure allows new features
✅ **Event-Driven**: Hooks in place for event tracking
✅ **Modular**: Components can be extended independently
✅ **Type-Safe**: TypeScript interfaces ready for extension
✅ **Scalable**: Database schema can accommodate new collections
✅ **Performant**: Optimizations already in place

No major refactoring will be needed when implementing Phase 6 features.

