# PRODUCTION INCIDENT AUDIT: Student Assignment Visibility

**Date:** 2026-01-10  
**Severity:** High  
**Status:** Root Cause Identified

---

## EXECUTIVE SUMMARY

Students do not see newly created assignments immediately due to **stale cache serving** without invalidation on assignment creation. The frontend cache persists for 5 minutes and is not cleared when assignments are created, causing students to see outdated data until cache expiration or manual refresh.

---

## CONFIRMED ROOT CAUSES

### 🔴 PRIMARY CAUSE: Cache Not Invalidated on Assignment Creation

**Location:** `src/contexts/BackendDataContext.tsx:2590-2625`

**Evidence:**
```typescript
const addAssignment = async (assignment: Assignment) => {
  // ... API call succeeds ...
  const newAssignment = await response.json();
  setAssignments(prev => [...prev, mappedAssignment]); // ✅ Updates React state
  // ❌ MISSING: dataCache.set('assignments', ...) - Cache NOT updated
  // ❌ MISSING: No cache invalidation
  // ❌ MISSING: No refetch trigger for students
};
```

**Impact:**
- Assignment is saved to database ✅
- Assignment appears in teacher/admin view immediately ✅
- Assignment does NOT appear in student view until cache expires (5 minutes) ❌
- Cache serves stale data without the new assignment ❌

**Why This Happens:**
1. `addAssignment` updates React state (`setAssignments`) but does NOT update `dataCache`
2. Cache is stored in `localStorage` with 5-minute expiration (`src/utils/dataCache.ts:11`)
3. When students navigate to assignments page, `loadData` checks cache first (`BackendDataContext.tsx:584`)
4. If cache exists and is valid, API call is **skipped** (`BackendDataContext.tsx:626: !cachedAssignments`)
5. Student sees cached data without the new assignment

---

### 🟡 SECONDARY CAUSE: Cache-First Strategy Without Invalidation

**Location:** `src/contexts/BackendDataContext.tsx:584-612`

**Evidence:**
```typescript
const cachedAssignments = useCache ? dataCache.get<any[]>('assignments') : null;
if (cachedAssignments && cachedAssignments.length > 0 && needsAssignments) {
  console.log('⚡ Using cached assignments:', cachedAssignments.length, '- skipping API call');
  // ... uses cached data ...
  setAssignments(mappedAssignments);
  // ❌ API call skipped if cache exists
}

const assignmentsPromise = needsAssignments && !cachedAssignments
  ? fetchWithTimeout(...) // Only fetches if NO cache
  : Promise.resolve({ ok: false, skipped: true });
```

**Impact:**
- Cache serves stale data for up to 5 minutes
- No mechanism to invalidate cache when assignments are created
- Students must wait for cache expiration or manually refresh

---

### 🟡 TERTIARY CAUSE: loadData Only Runs Once Per Session

**Location:** `src/contexts/BackendDataContext.tsx:1370-1384`

**Evidence:**
```typescript
const hasLoadedRef = useRef(false);
useEffect(() => {
  if (!hasLoadedRef.current) {
    hasLoadedRef.current = true;
    loadData(); // Only runs once on mount
  }
}, [loadData]);
```

**Impact:**
- Data loads once when app starts
- No automatic refetch when assignments are created elsewhere (different tab, teacher creates assignment)
- Students must manually refresh or wait for cache expiration

---

### 🟢 QUATERNARY CAUSE: No Real-time Update Mechanism

**Evidence:**
- No WebSocket connection
- No Server-Sent Events (SSE)
- No polling mechanism
- No event bus for cross-tab updates

**Impact:**
- Students cannot see assignments created in real-time
- Must rely on manual refresh or cache expiration

---

## BACKEND VERIFICATION ✅

### Assignment Creation Endpoint
**Location:** `backend/server.js:5910-5963`

**Status:** ✅ **CONFIRMED CORRECT**

```javascript
app.post('/api/assignments', authenticateToken, requirePermission('canCreateAssignments'), async (req, res) => {
  const assignment = new Assignment(assignmentData);
  await assignment.save(); // ✅ Properly awaited
  // ... ticket update logic ...
  res.status(201).json(assignment); // ✅ Response sent AFTER save
});
```

**Findings:**
- ✅ All database writes are properly awaited
- ✅ Response sent AFTER database commit
- ✅ No async side effects after response
- ✅ No background jobs or delayed writes
- ✅ Transaction committed before response

**Conclusion:** Backend is functioning correctly. Assignment is saved to database immediately.

---

### Student Assignment Fetch Endpoint
**Location:** `backend/server.js:5805-5893`

**Status:** ✅ **CONFIRMED CORRECT**

```javascript
app.get('/api/assignments/me', authenticateToken, async (req, res) => {
  // ... student lookup ...
  const assignments = await Assignment.find({ $or: [...] })
    .sort({ createdAt: -1 })
    .limit(1000);
  res.json(assignments); // ✅ Returns fresh data from database
});
```

**Findings:**
- ✅ No caching headers (`Cache-Control`, `ETag`) that would cause stale responses
- ✅ Query returns fresh data from database
- ✅ No CDN caching (Render.com doesn't cache API responses by default)

**Conclusion:** Backend returns fresh data. Issue is NOT in backend.

---

## FRONTEND VERIFICATION ❌

### Assignment Fetch Lifecycle
**Location:** `src/contexts/BackendDataContext.tsx:408-724`

**Flow:**
1. `loadData()` called on mount (line 1378)
2. Checks cache first (line 584)
3. If cache exists → uses cached data, **skips API call** (line 585-612)
4. If cache missing → fetches from API (line 626-631)
5. Cache updated with fetched data (line 684)

**Problem:** Cache is checked BEFORE API call, and API call is skipped if cache exists.

---

### Cache Storage
**Location:** `src/utils/dataCache.ts`

**Configuration:**
- Storage: `localStorage`
- Duration: 5 minutes (`CACHE_DURATION = 5 * 60 * 1000`)
- Expiration: Checked on read (`dataCache.get()`)

**Problem:** Cache persists across page navigations and browser sessions until expiration.

---

### Assignment Creation Flow
**Location:** `src/contexts/BackendDataContext.tsx:2590-2625`

**Flow:**
1. Teacher creates assignment → `addAssignment()` called
2. API call succeeds → assignment saved to database ✅
3. React state updated → `setAssignments([...prev, newAssignment])` ✅
4. **Cache NOT updated** ❌
5. **Cache NOT invalidated** ❌
6. **No refetch triggered** ❌

**Problem:** New assignment exists in database and React state, but NOT in cache. When student navigates to assignments page, cache is served (without new assignment), and API call is skipped.

---

## EVIDENCE SUMMARY

| Component | Status | Evidence |
|-----------|--------|----------|
| Backend Assignment Creation | ✅ Correct | `await assignment.save()` properly awaited, response sent after commit |
| Backend Student Fetch | ✅ Correct | Returns fresh data, no caching headers |
| Frontend Cache Strategy | ❌ Problem | Cache checked first, API skipped if cache exists |
| Frontend Cache Invalidation | ❌ Missing | No invalidation on assignment creation |
| Frontend State Update | ✅ Correct | React state updated correctly |
| Frontend Cache Update | ❌ Missing | Cache not updated on assignment creation |

---

## FIX STRATEGY (ORDERED BY PRIORITY)

### 1️⃣ IMMEDIATE FIX: Invalidate Cache on Assignment Creation

**Priority:** Critical  
**Risk:** Low  
**Effort:** 5 minutes

**Implementation:**
```typescript
// src/contexts/BackendDataContext.tsx:2590
const addAssignment = async (assignment: Assignment) => {
  // ... existing code ...
  const newAssignment = await response.json();
  const mappedAssignment = { ...newAssignment, id: newAssignment._id || newAssignment.id };
  
  setAssignments(prev => [...prev, mappedAssignment]);
  
  // ✅ FIX: Invalidate cache to force refetch
  dataCache.clear(); // Clear all cache, or
  // OR: dataCache.delete('assignments'); // If delete method exists
  
  // ✅ FIX: Trigger refetch for students (if student is viewing assignments)
  if (isStudentUser) {
    await loadData(false); // Force refetch without cache
  }
};
```

**Alternative (More Targeted):**
```typescript
// Update cache with new assignment instead of clearing
const cachedAssignments = dataCache.get<any[]>('assignments') || [];
dataCache.set('assignments', [...cachedAssignments, mappedAssignment]);
```

---

### 2️⃣ ARCHITECTURAL FIX: Add Cache Invalidation Method

**Priority:** High  
**Risk:** Low  
**Effort:** 15 minutes

**Implementation:**

**Step 1:** Add `delete` method to `dataCache`:
```typescript
// src/utils/dataCache.ts
export const dataCache: DataCache = {
  // ... existing methods ...
  
  delete(key: string): void {
    try {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (error) {
      console.warn(`Failed to delete cache for ${key}:`, error);
    }
  },
};
```

**Step 2:** Invalidate cache in `addAssignment`:
```typescript
// src/contexts/BackendDataContext.tsx:2590
const addAssignment = async (assignment: Assignment) => {
  // ... existing code ...
  setAssignments(prev => [...prev, mappedAssignment]);
  
  // ✅ Invalidate assignments cache
  dataCache.delete('assignments');
  
  // ✅ Update cache with new data (optional, for immediate visibility)
  const currentAssignments = assignments;
  dataCache.set('assignments', [...currentAssignments, mappedAssignment]);
};
```

**Step 3:** Also invalidate in `updateAssignment`:
```typescript
// src/contexts/BackendDataContext.tsx:2627
const updateAssignment = async (id: string, assignment: Partial<Assignment>) => {
  // ... existing code ...
  setAssignments(prev => prev.map(a => a.id === id ? updatedAssignment : a));
  
  // ✅ Invalidate cache
  dataCache.delete('assignments');
};
```

---

### 3️⃣ OPTIONAL IMPROVEMENT: Stale-While-Revalidate Pattern

**Priority:** Medium  
**Risk:** Medium  
**Effort:** 30 minutes

**Implementation:**
- Always fetch fresh data in background
- Serve cached data immediately
- Update UI when fresh data arrives
- This ensures students see new assignments within seconds, not minutes

**Code:**
```typescript
// src/contexts/BackendDataContext.tsx:584
const cachedAssignments = useCache ? dataCache.get<any[]>('assignments') : null;
if (cachedAssignments && cachedAssignments.length > 0 && needsAssignments) {
  // ✅ Serve cached data immediately
  setAssignments(mappedAssignments);
  
  // ✅ BUT ALSO fetch fresh data in background
  // Don't skip API call - fetch in background and update when ready
}

// Always fetch fresh data (don't skip if cache exists)
const assignmentsPromise = needsAssignments
  ? fetchWithTimeout(assignmentsEndpoint, {}, assignmentsTimeout, true)
  : Promise.resolve({ ok: false, skipped: true });
```

---

### 4️⃣ FUTURE ENHANCEMENT: Real-time Updates (WebSocket/SSE)

**Priority:** Low  
**Risk:** High  
**Effort:** 2-4 hours

**Implementation:**
- Add WebSocket or Server-Sent Events (SSE) connection
- Push assignment creation events to connected students
- Update UI immediately when event received

**Not recommended for immediate fix** - architectural change requiring significant testing.

---

## VERIFICATION PLAN

### Test Case 1: Assignment Creation → Student Visibility
**Steps:**
1. Teacher creates assignment
2. Student navigates to assignments page immediately (< 5 seconds)
3. **Expected:** Student sees new assignment
4. **Current:** Student does NOT see new assignment (cache served)

**After Fix:**
- ✅ Student sees new assignment immediately
- ✅ Cache is invalidated on creation
- ✅ Fresh data fetched if needed

---

### Test Case 2: Cache Expiration
**Steps:**
1. Teacher creates assignment
2. Wait 5+ minutes (cache expiration)
3. Student navigates to assignments page
4. **Expected:** Student sees new assignment (cache expired, fresh fetch)

**After Fix:**
- ✅ Same behavior, but also works immediately (no wait needed)

---

### Test Case 3: Multiple Assignment Creations
**Steps:**
1. Teacher creates Assignment A
2. Teacher creates Assignment B (within 5 minutes)
3. Student navigates to assignments page
4. **Expected:** Student sees both Assignment A and B

**After Fix:**
- ✅ Both assignments visible immediately
- ✅ Cache updated with each creation

---

### Test Case 4: Cross-Tab Updates
**Steps:**
1. Student has assignments page open in Tab 1
2. Teacher creates assignment
3. Student opens assignments page in Tab 2
4. **Expected:** Tab 2 shows new assignment

**After Fix:**
- ✅ Tab 2 shows new assignment (cache invalidated)
- ⚠️ Tab 1 still shows old data (requires manual refresh or real-time updates)

---

## LOGS TO MONITOR

### Before Fix:
```
⚡ Using cached assignments: 5 - skipping API call
🎓 Filtered cached assignments for student: 5 assignments
```

### After Fix:
```
✅ Assignment created, cache invalidated
🔄 Refetching assignments after creation...
📝 Assignments loaded from backend: 6 assignments
```

---

## ROLLBACK PLAN

If fix causes issues:
1. Revert `addAssignment` changes
2. Revert `dataCache.delete` method (if added)
3. Cache will continue to work as before (with 5-minute delay)

**Risk:** Low - changes are additive, existing behavior preserved.

---

## CONCLUSION

**Root Cause:** Frontend cache not invalidated on assignment creation, causing students to see stale data for up to 5 minutes.

**Fix:** Invalidate cache and update cache when assignments are created.

**Impact:** Students will see new assignments immediately instead of waiting up to 5 minutes.

**Timeline:** Immediate fix can be deployed in < 30 minutes.

---

**Audit Completed By:** AI Senior Full-Stack Engineer  
**Review Status:** Ready for Implementation
