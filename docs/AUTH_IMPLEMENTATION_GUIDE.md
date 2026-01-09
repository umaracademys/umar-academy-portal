# Authentication Implementation Guide

## Exact Code Changes Required

This document provides exact code snippets for implementing consistent authentication across `/api/users`, `/api/students`, and `/api/teachers`.

---

## Step 1: Add Role Check Middleware

**Location**: `backend/server.js` after line 1483 (after `authenticateToken` definition)

**Add this code**:

```javascript
// Role-based authorization middleware
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const userRole = req.user.role;
  if (userRole !== 'admin' && userRole !== 'superadmin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  
  next();
};
```

---

## Step 2: Update /api/users Routes

### 2.1 GET /api/users

**Location**: Line 1990

**BEFORE**:
```javascript
app.get('/api/users', async (req, res) => {
```

**AFTER**:
```javascript
app.get('/api/users', authenticateToken, async (req, res) => {
```

---

### 2.2 GET /api/users/:id

**Location**: Line 2098

**BEFORE**:
```javascript
app.get('/api/users/:id', apiLimiter, async (req, res) => {
```

**AFTER**:
```javascript
app.get('/api/users/:id', apiLimiter, authenticateToken, async (req, res) => {
```

---

### 2.3 POST /api/users

**Location**: Line 2448

**BEFORE**:
```javascript
app.post('/api/users', apiLimiter, authenticateToken, async (req, res) => {
```

**AFTER**:
```javascript
app.post('/api/users', apiLimiter, authenticateToken, requireAdmin, async (req, res) => {
```

---

### 2.4 DELETE /api/users/:id

**Location**: Line 4559

**BEFORE**:
```javascript
app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**AFTER**:
```javascript
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Step 3: Update /api/students Routes

### 3.1 GET /api/students

**Location**: Line 2114

**BEFORE**:
```javascript
app.get('/api/students', async (req, res) => {
```

**AFTER**:
```javascript
app.get('/api/students', authenticateToken, async (req, res) => {
```

---

### 3.2 POST /api/students

**Location**: Line 2526

**BEFORE**:
```javascript
app.post('/api/students', async (req, res) => {
```

**AFTER**:
```javascript
app.post('/api/students', authenticateToken, requireAdmin, async (req, res) => {
```

---

### 3.3 PUT /api/students/:id

**Location**: Line 2646

**BEFORE**:
```javascript
app.put('/api/students/:id', async (req, res) => {
```

**AFTER**:
```javascript
app.put('/api/students/:id', authenticateToken, requireAdmin, async (req, res) => {
```

---

### 3.4 PATCH /api/students/:id/recitation

**Location**: Line 2842

**BEFORE**:
```javascript
app.patch('/api/students/:id/recitation', async (req, res) => {
```

**AFTER**:
```javascript
app.patch('/api/students/:id/recitation', authenticateToken, requireAdmin, async (req, res) => {
```

---

### 3.5 DELETE /api/students/:id

**Location**: Line 4495

**BEFORE**:
```javascript
app.delete('/api/students/:id', async (req, res) => {
```

**AFTER**:
```javascript
app.delete('/api/students/:id', authenticateToken, requireAdmin, async (req, res) => {
```

---

### 3.6 GET /api/students/:studentId/personal-mushaf

**Location**: Line 7424

**BEFORE**:
```javascript
app.get('/api/students/:studentId/personal-mushaf', async (req, res) => {
```

**AFTER**:
```javascript
app.get('/api/students/:studentId/personal-mushaf', authenticateToken, async (req, res) => {
```

---

### 3.7 GET /api/students/:studentId/personal-mushaf/filter

**Location**: Line 7453

**BEFORE**:
```javascript
app.get('/api/students/:studentId/personal-mushaf/filter', async (req, res) => {
```

**AFTER**:
```javascript
app.get('/api/students/:studentId/personal-mushaf/filter', authenticateToken, async (req, res) => {
```

---

### 3.8 POST /api/students/:studentId/personal-mushaf/mistakes

**Location**: Line 7484

**BEFORE**:
```javascript
app.post('/api/students/:studentId/personal-mushaf/mistakes', async (req, res) => {
```

**AFTER**:
```javascript
app.post('/api/students/:studentId/personal-mushaf/mistakes', authenticateToken, requireAdmin, async (req, res) => {
```

---

### 3.9 GET /api/students/:studentId/homework-suggestions

**Location**: Line 8692

**BEFORE**:
```javascript
app.get('/api/students/:studentId/homework-suggestions', async (req, res) => {
```

**AFTER**:
```javascript
app.get('/api/students/:studentId/homework-suggestions', authenticateToken, async (req, res) => {
```

---

## Step 4: Update /api/teachers Routes

### 4.1 GET /api/teachers

**Location**: Line 2319

**BEFORE**:
```javascript
app.get('/api/teachers', async (req, res) => {
```

**AFTER**:
```javascript
app.get('/api/teachers', authenticateToken, async (req, res) => {
```

---

### 4.2 GET /api/teachers/sync-assigned-students

**Location**: Line 2391

**BEFORE**:
```javascript
app.get('/api/teachers/sync-assigned-students', handleManualSync);
```

**AFTER**:
```javascript
app.get('/api/teachers/sync-assigned-students', authenticateToken, requireAdmin, handleManualSync);
```

---

### 4.3 POST /api/teachers/sync-assigned-students

**Location**: Line 2392

**BEFORE**:
```javascript
app.post('/api/teachers/sync-assigned-students', handleManualSync);
```

**AFTER**:
```javascript
app.post('/api/teachers/sync-assigned-students', authenticateToken, requireAdmin, handleManualSync);
```

---

### 4.4 GET /api/teachers/sync-status

**Location**: Line 2415

**BEFORE**:
```javascript
app.get('/api/teachers/sync-status', async (req, res) => {
```

**AFTER**:
```javascript
app.get('/api/teachers/sync-status', authenticateToken, requireAdmin, async (req, res) => {
```

---

### 4.5 POST /api/teachers

**Location**: Line 3326

**BEFORE**:
```javascript
app.post('/api/teachers', async (req, res) => {
```

**AFTER**:
```javascript
app.post('/api/teachers', authenticateToken, requireAdmin, async (req, res) => {
```

---

### 4.6 PUT /api/teachers/:id

**Location**: Line 3350

**BEFORE**:
```javascript
app.put('/api/teachers/:id', async (req, res) => {
```

**AFTER**:
```javascript
app.put('/api/teachers/:id', authenticateToken, requireAdmin, async (req, res) => {
```

---

## Step 5: Frontend Changes

### 5.1 Update BackendDataContext.tsx

**Location**: `src/contexts/BackendDataContext.tsx` line 1812

**BEFORE**:
```typescript
false // Backend endpoint doesn't require auth currently
```

**AFTER**:
```typescript
true // Backend now requires authentication
```

**Also update line 1824**:
```typescript
// BEFORE
false // Backend endpoint doesn't require auth currently

// AFTER
true // Backend now requires authentication
```

---

### 5.2 Add Error Handling

**Location**: `src/contexts/BackendDataContext.tsx` in `fetchWithTimeout` function (around line 305)

**Add after line 336** (after response received):

```typescript
// Handle authentication and authorization errors
if (response.status === 401) {
  clearTimeout(id);
  throw new Error('Authentication required. Please log in.');
}
if (response.status === 403) {
  clearTimeout(id);
  throw new Error('You do not have permission to perform this action.');
}
```

**Or update the existing error handling**:

```typescript
// In fetchWithTimeout function, after getting response
if (!response.ok) {
  clearTimeout(id);
  if (response.status === 401) {
    throw new Error('Authentication required. Please log in.');
  }
  if (response.status === 403) {
    throw new Error('You do not have permission to perform this action.');
  }
  // ... existing error handling
}
```

---

### 5.3 Ensure All API Calls Use Auth Headers

**Check these functions in `BackendDataContext.tsx`**:

1. **`loadData` function** (around line 350):
   - Verify `fetchWithTimeout` calls use `requireAuth = true` for:
     - `/api/users`
     - `/api/students`
     - `/api/teachers`

2. **`addStudent` function** (around line 1400):
   - Already uses `requireAuth = true` ✅

3. **`updateStudent` function** (around line 1459):
   - Already uses `getAuthHeaders()` ✅

4. **`addTeacher` function**:
   - Check if it uses `getAuthHeaders()` or `fetchWithTimeout` with auth

5. **`updateTeacher` function** (around line 1800):
   - Change `requireAuth = false` to `requireAuth = true`

---

## Step 6: Testing

### 6.1 Backend Testing Script

Create a test file or use Postman/curl to test:

```bash
# Test GET /api/users without auth (should fail)
curl http://localhost:3001/api/users

# Test GET /api/users with auth (should succeed)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/users

# Test POST /api/students with teacher token (should fail with 403)
curl -X POST -H "Authorization: Bearer TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test Student"}' \
  http://localhost:3001/api/students

# Test POST /api/students with admin token (should succeed)
curl -X POST -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test Student"}' \
  http://localhost:3001/api/students
```

---

## Summary of Changes

### Backend (`backend/server.js`)

**Add**:
- `requireAdmin` middleware (after line 1483)
- `requireSuperAdmin` middleware (after line 1483)

**Modify**:
- 7 GET routes: Add `authenticateToken`
- 4 POST routes: Add `authenticateToken` + `requireAdmin`
- 3 PUT routes: Add `authenticateToken` + `requireAdmin`
- 1 PATCH route: Add `authenticateToken` + `requireAdmin`
- 2 DELETE routes: Add `authenticateToken` + `requireAdmin`
- 3 Sync routes: Add `authenticateToken` + `requireAdmin`

**Total**: 20 route modifications + 2 new middleware functions

---

### Frontend (`src/contexts/BackendDataContext.tsx`)

**Modify**:
- Update `fetchWithTimeout` calls to use `requireAuth = true` (2 locations)
- Add error handling for 401/403 responses

**Total**: 2-3 modifications

---

## Rollback Plan

If issues arise, revert changes in reverse order:

1. Remove middleware from routes (keep middleware functions for future use)
2. Revert frontend changes
3. Test that everything works as before

---

## Notes

- **Breaking Change**: Yes - Unauthenticated requests will fail
- **Migration**: Frontend already sends auth headers, so impact should be minimal
- **Testing**: Test thoroughly in development before deploying to production
- **Monitoring**: Watch for 401/403 errors in production logs after deployment

