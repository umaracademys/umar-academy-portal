# Phase 6 Architecture Hooks

This document describes the architectural hooks placed in the codebase to support future Phase 6 features without implementing them yet.

## Current Implementation Status

### ✅ Implemented Hooks

1. **Annotation Interface Extended**
   - Location: `src/utils/UndoRedoHistory.ts`
   - Added optional fields for:
     - AI-detected mistakes
     - Collaboration metadata
     - Audio notes
     - Replay timestamps
   - **Impact**: No breaking changes, all fields optional

2. **Event Tracking Points**
   - Location: `src/components/PdfAnnotationViewer.tsx`
   - Hook: `updateAnnotations` callback
   - Ready for: Lesson replay, performance tracking
   - **Impact**: Comments indicate where events would be emitted

3. **Type Definitions**
   - Location: `src/types/future-features.ts`
   - Complete type definitions for all Phase 6 features
   - **Impact**: TypeScript will catch type errors when implementing

4. **Props Interface Extended**
   - Location: `src/components/PdfAnnotationViewer.tsx`
   - Commented-out props for future features
   - **Impact**: Easy to uncomment when ready

## Integration Points

### 1. AI Mistake Detection
**Hook Location**: `PdfAnnotationViewer.tsx` - `updateAnnotations`
```typescript
// Future: After annotation creation
// aiService.detectMistakes([newAnnotation]).then(mistakes => {
//   updateAnnotations(prev => prev.map(a => 
//     a.id === newAnnotation.id 
//       ? { ...a, aiDetectedMistakes: mistakes }
//       : a
//   ));
// });
```

**Database**: Add `mistakeDetections` collection (see PHASE_6_ARCHITECTURE.md)

### 2. Teacher Performance Insights
**Hook Location**: `PdfAnnotationViewer.tsx` - `updateAnnotations`, `handleSave`
```typescript
// Future: Track metrics
// analyticsService.trackEvent({
//   type: 'annotation_create',
//   teacherId: user.id,
//   pdfId: pdfId,
//   timestamp: Date.now()
// });
```

**Database**: Use existing `Assignment` and `PdfAnnotation` collections
**New Collection**: `teacherMetrics` (see PHASE_6_ARCHITECTURE.md)

### 3. Lesson Replay
**Hook Location**: All event handlers in `PdfAnnotationViewer.tsx`
```typescript
// Future: Record events
// if (replayMode) {
//   replayRecorder.record({
//     timestamp: Date.now() - replayStartTime,
//     type: 'annotation_create',
//     data: newAnnotation
//   });
// }
```

**Database**: New `lessons` collection (see PHASE_6_ARCHITECTURE.md)

### 4. Real-Time Collaboration
**Hook Location**: `PdfAnnotationViewer.tsx` - `updateAnnotations`, `onAnnotationsChange`
```typescript
// Future: Broadcast changes
// if (collaborationSessionId) {
//   collaborationService.sendEvent({
//     type: 'annotation_update',
//     userId: user.id,
//     data: updated,
//     sessionId: collaborationSessionId
//   });
// }
```

**Database**: New `collaborationSessions` collection
**Infrastructure**: WebSocket server required

### 5. Audio Notes
**Hook Location**: Context menu, annotation rendering
```typescript
// Future: Add audio button to context menu
// <button onClick={() => audioService.startRecording(annotation.id)}>
//   🎤 Record Audio
// </button>
```

**Database**: New `audioNotes` collection
**Storage**: File storage for audio files (S3, local, etc.)

## Migration Strategy

### Phase 6.1: Database Schema Updates
1. Add optional fields to existing schemas
2. Create new collections with indexes
3. Run migration scripts (backward compatible)

### Phase 6.2: API Layer
1. Add new endpoints (versioned: `/api/v2/...`)
2. Implement WebSocket server (if needed)
3. Add background job processing

### Phase 6.3: Frontend Integration
1. Uncomment hooks in `PdfAnnotationViewer.tsx`
2. Create new service classes
3. Add UI components
4. Enable via feature flags

## Feature Flags

Recommended implementation:
```typescript
// src/config/features.ts
export const FEATURES = {
  AI_MISTAKE_DETECTION: process.env.REACT_APP_ENABLE_AI === 'true',
  COLLABORATION: process.env.REACT_APP_ENABLE_COLLABORATION === 'true',
  AUDIO_NOTES: process.env.REACT_APP_ENABLE_AUDIO === 'true',
  LESSON_REPLAY: process.env.REACT_APP_ENABLE_REPLAY === 'true',
  PERFORMANCE_INSIGHTS: process.env.REACT_APP_ENABLE_INSIGHTS === 'true',
};
```

## Testing Strategy

### Unit Tests (Future)
- Mock services for AI, collaboration, audio
- Test event emission and handling
- Test conflict resolution

### Integration Tests (Future)
- Test WebSocket connections
- Test audio upload/playback
- Test replay functionality

### Performance Tests (Future)
- Load test with multiple collaborators
- Test AI processing latency
- Test audio file handling

## Security Considerations

### AI Features
- Anonymize student data before sending to AI
- Rate limit AI API calls
- Cache AI results to reduce API calls

### Collaboration
- Validate session membership
- Encrypt WebSocket messages
- Rate limit events per user

### Audio Notes
- Validate file types and sizes
- Scan for malicious content
- Encrypt stored audio files

## Performance Optimizations

### Caching Strategy
- Cache AI detection results
- Cache collaboration session state
- Cache audio transcripts

### Batch Operations
- Batch annotation updates in collaboration
- Batch AI detection requests
- Batch analytics events

### Lazy Loading
- Load audio notes on-demand
- Load replay data progressively
- Load collaboration cursors on visible pages only

## Conclusion

The codebase is architected to support all Phase 6 features:

✅ **Type-Safe**: TypeScript interfaces defined
✅ **Event-Driven**: Hooks in place for event tracking
✅ **Modular**: Services can be added independently
✅ **Scalable**: Database schema ready for extension
✅ **Secure**: Security considerations documented
✅ **Performant**: Optimization strategies defined

When ready to implement Phase 6 features:
1. Uncomment hooks in code
2. Implement service classes
3. Add database migrations
4. Enable via feature flags
5. Test incrementally

No major refactoring required! 🎉

