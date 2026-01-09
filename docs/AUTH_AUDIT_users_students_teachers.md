# Authentication Audit: /api/users, /api/students, /api/teachers

## Executive Summary

**Current State**: Inconsistent authentication across these three route groups. Some endpoints require authentication, others don't, creating security vulnerabilities.

**Recommendation**: Implement role-based authentication with clear rules:
- **Read operations (GET)**: Require authentication (all roles can read)
- **Write operations (POST/PUT/PATCH)**: Require authentication + role check (admin/superadmin only)
- **Delete operations**: Require authentication + role check (admin/superadmin only)
- **Public endpoints**: Explicitly mark and document exceptions

---

## Current Authentication State

### 1. /api/users Routes

| Method | Route | Current Auth | Frontend Sends Auth | Security Risk |
|--------|-------|--------------|---------------------|---------------|
| GET | `/api/users` | ❌ None | ✅ Optional | 🔴 HIGH - Exposes all user data |
| GET | `/api/users/locked` | ✅ `authenticateToken` | ✅ Yes | ✅ Secure |
| GET | `/api/users/:id` | ❌ None | ✅ Optional | 🔴 HIGH - Exposes user data |
| POST | `/api/users` | ✅ `authenticateToken` | ✅ Yes | ✅ Secure |
| PUT | `/api/users/:id` | ✅ `authenticateToken` | ✅ Yes | ✅ Secure |
| PUT | `/api/users/:id/password` | ✅ `authenticateToken` | ✅ Yes | ✅ Secure |
| GET | `/api/users/:id/login-history` | ✅ `authenticateToken` | ✅ Yes | ✅ Secure |
| PUT | `/api/users/:id/settings` | ✅ `authenticateToken` | ✅ Yes | ✅ Secure |
| POST | `/api/users/:id/unlock` | ✅ `authenticateToken` | ✅ Yes | ✅ Secure |
| GET | `/api/users/:id/details` | ✅ `authenticateToken` | ✅ Yes | ✅ Secure |
| DELETE | `/api/users/:id` | ❌ None | ✅ Optional | 🔴 CRITICAL - Anyone can delete users |

**Issues**:
- `GET /api/users` - No auth, exposes all user emails, roles, IDs
- `GET /api/users/:id` - No auth, exposes individual user data
- `DELETE /api/users/:id` - No auth, critical security vulnerability

---

### 2. /api/students Routes

| Method | Route | Current Auth | Frontend Sends Auth | Security Risk |
|--------|-------|--------------|---------------------|---------------|
| GET | `/api/students` | ❌ None | ✅ Optional | 🔴 HIGH - Exposes all student data |
| POST | `/api/students` | ❌ None | ✅ Yes (via `fetchWithTimeout`) | 🔴 HIGH - Anyone can create students |
| PUT | `/api/students/:id` | ❌ None | ✅ Yes | 🔴 HIGH - Anyone can modify students |
| PATCH | `/api/students/:id/recitation` | ❌ None | ✅ Optional | 🔴 HIGH - Anyone can modify recitation data |
| DELETE | `/api/students/:id` | ❌ None | ✅ Optional | 🔴 CRITICAL - Anyone can delete students |
| GET | `/api/students/:studentId/personal-mushaf` | ❌ None | ✅ Optional | 🟡 MEDIUM - Personal data exposure |
| GET | `/api/students/:studentId/personal-mushaf/filter` | ❌ None | ✅ Optional | 🟡 MEDIUM - Personal data exposure |
| POST | `/api/students/:studentId/personal-mushaf/mistakes` | ❌ None | ✅ Optional | 🟡 MEDIUM - Can modify personal data |
| GET | `/api/students/:studentId/homework-suggestions` | ❌ None | ✅ Optional | 🟡 MEDIUM - Personal data exposure |
| GET | `/api/students/:studentId/pdf-homework` | ✅ `authenticateToken` | ✅ Yes | ✅ Secure |

**Issues**:
- All CRUD operations lack authentication
- Frontend sends auth headers but backend doesn't validate them
- Critical security vulnerabilities for student data

---

### 3. /api/teachers Routes

| Method | Route | Current Auth | Frontend Sends Auth | Security Risk |
|--------|-------|--------------|---------------------|---------------|
| GET | `/api/teachers` | ❌ None | ✅ Optional | 🔴 HIGH - Exposes all teacher data |
| GET | `/api/teachers/sync-assigned-students` | ❌ None | ✅ Optional | 🟡 MEDIUM - Can trigger sync operations |
| POST | `/api/teachers/sync-assigned-students` | ❌ None | ✅ Optional | 🟡 MEDIUM - Can trigger sync operations |
| GET | `/api/teachers/count` | ❌ None | ✅ Optional | 🟢 LOW - Public info |
| GET | `/api/teachers/sync-status` | ❌ None | ✅ Optional | 🟡 MEDIUM - Internal status |
| POST | `/api/teachers` | ❌ None | ✅ Optional | 🔴 HIGH - Anyone can create teachers |
| PUT | `/api/teachers/:id` | ❌ None | ✅ Optional (but sends via `fetchWithTimeout`) | 🔴 HIGH - Anyone can modify teachers |
| GET | `/api/teachers/:teacherId/weekly-evaluations` | ✅ `authenticateToken` | ✅ Yes | ✅ Secure |

**Issues**:
- All CRUD operations lack authentication
- Frontend sends auth headers but backend doesn't validate them
- Critical security vulnerabilities for teacher data

---

## Proposed Authentication Rules

### Rule 1: Read Operations (GET)
**Requirement**: `authenticateToken` middleware
**Rationale**: All authenticated users (admin, superadmin, teacher) can read data, but unauthenticated requests should be blocked.

**Affected Routes**:
- `GET /api/users` → Add `authenticateToken`
- `GET /api/users/:id` → Add `authenticateToken`
- `GET /api/students` → Add `authenticateToken`
- `GET /api/teachers` → Add `authenticateToken`
- `GET /api/students/:studentId/personal-mushaf` → Add `authenticateToken`
- `GET /api/students/:studentId/personal-mushaf/filter` → Add `authenticateToken`
- `GET /api/students/:studentId/homework-suggestions` → Add `authenticateToken`

**Exception**: `GET /api/teachers/count` - Can remain public (just a count)

---

### Rule 2: Write Operations (POST/PUT/PATCH)
**Requirement**: `authenticateToken` + role check (admin/superadmin only)
**Rationale**: Only admins should be able to create/modify users, students, and teachers.

**Affected Routes**:
- `POST /api/students` → Add `authenticateToken` + role check
- `PUT /api/students/:id` → Add `authenticateToken` + role check
- `PATCH /api/students/:id/recitation` → Add `authenticateToken` + role check
- `POST /api/teachers` → Add `authenticateToken` + role check
- `PUT /api/teachers/:id` → Add `authenticateToken` + role check
- `POST /api/students/:studentId/personal-mushaf/mistakes` → Add `authenticateToken` + role check

**Note**: `POST /api/users` already has `authenticateToken` but should add role check

---

### Rule 3: Delete Operations
**Requirement**: `authenticateToken` + role check (admin/superadmin only)
**Rationale**: Only admins should be able to delete records.

**Affected Routes**:
- `DELETE /api/users/:id` → Add `authenticateToken` + role check
- `DELETE /api/students/:id` → Add `authenticateToken` + role check

---

### Rule 4: Sync Operations
**Requirement**: `authenticateToken` + role check (admin/superadmin only)
**Rationale**: Sync operations modify data and should be restricted.

**Affected Routes**:
- `GET /api/teachers/sync-assigned-students` → Add `authenticateToken` + role check
- `POST /api/teachers/sync-assigned-students` → Add `authenticateToken` + role check
- `GET /api/teachers/sync-status` → Add `authenticateToken` + role check

---

## Implementation Plan

### Step 1: Create Role Check Middleware

```javascript
// Check if user is admin or superadmin
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

// Check if user is superadmin only
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

**Placement**: After `authenticateToken` definition (around line 1483)

---

### Step 2: Update Route Middleware

#### /api/users Routes

```javascript
// BEFORE (line 1990)
app.get('/api/users', async (req, res) => {

// AFTER
app.get('/api/users', authenticateToken, async (req, res) => {
```

```javascript
// BEFORE (line 2098)
app.get('/api/users/:id', apiLimiter, async (req, res) => {

// AFTER
app.get('/api/users/:id', apiLimiter, authenticateToken, async (req, res) => {
```

```javascript
// BEFORE (line 2448)
app.post('/api/users', apiLimiter, authenticateToken, async (req, res) => {

// AFTER (add role check)
app.post('/api/users', apiLimiter, authenticateToken, requireAdmin, async (req, res) => {
```

```javascript
// BEFORE (line 4559)
app.delete('/api/users/:id', async (req, res) => {

// AFTER
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
```

---

#### /api/students Routes

```javascript
// BEFORE (line 2114)
app.get('/api/students', async (req, res) => {

// AFTER
app.get('/api/students', authenticateToken, async (req, res) => {
```

```javascript
// BEFORE (line 2526)
app.post('/api/students', async (req, res) => {

// AFTER
app.post('/api/students', authenticateToken, requireAdmin, async (req, res) => {
```

```javascript
// BEFORE (line 2646)
app.put('/api/students/:id', async (req, res) => {

// AFTER
app.put('/api/students/:id', authenticateToken, requireAdmin, async (req, res) => {
```

```javascript
// BEFORE (line 2842)
app.patch('/api/students/:id/recitation', async (req, res) => {

// AFTER
app.patch('/api/students/:id/recitation', authenticateToken, requireAdmin, async (req, res) => {
```

```javascript
// BEFORE (line 4495)
app.delete('/api/students/:id', async (req, res) => {

// AFTER
app.delete('/api/students/:id', authenticateToken, requireAdmin, async (req, res) => {
```

```javascript
// BEFORE (line 7424)
app.get('/api/students/:studentId/personal-mushaf', async (req, res) => {

// AFTER
app.get('/api/students/:studentId/personal-mushaf', authenticateToken, async (req, res) => {
```

```javascript
// BEFORE (line 7453)
app.get('/api/students/:studentId/personal-mushaf/filter', async (req, res) => {

// AFTER
app.get('/api/students/:studentId/personal-mushaf/filter', authenticateToken, async (req, res) => {
```

```javascript
// BEFORE (line 7484)
app.post('/api/students/:studentId/personal-mushaf/mistakes', async (req, res) => {

// AFTER
app.post('/api/students/:studentId/personal-mushaf/mistakes', authenticateToken, requireAdmin, async (req, res) => {
```

```javascript
// BEFORE (line 8692)
app.get('/api/students/:studentId/homework-suggestions', async (req, res) => {

// AFTER
app.get('/api/students/:studentId/homework-suggestions', authenticateToken, async (req, res) => {
```

---

#### /api/teachers Routes

```javascript
// BEFORE (line 2319)
app.get('/api/teachers', async (req, res) => {

// AFTER
app.get('/api/teachers', authenticateToken, async (req, res) => {
```

```javascript
// BEFORE (line 2391)
app.get('/api/teachers/sync-assigned-students', handleManualSync);
app.post('/api/teachers/sync-assigned-students', handleManualSync);

// AFTER
app.get('/api/teachers/sync-assigned-students', authenticateToken, requireAdmin, handleManualSync);
app.post('/api/teachers/sync-assigned-students', authenticateToken, requireAdmin, handleManualSync);
```

```javascript
// BEFORE (line 2415)
app.get('/api/teachers/sync-status', async (req, res) => {

// AFTER
app.get('/api/teachers/sync-status', authenticateToken, requireAdmin, async (req, res) => {
```

```javascript
// BEFORE (line 3326)
app.post('/api/teachers', async (req, res) => {

// AFTER
app.post('/api/teachers', authenticateToken, requireAdmin, async (req, res) => {
```

```javascript
// BEFORE (line 3350)
app.put('/api/teachers/:id', async (req, res) => {

// AFTER
app.put('/api/teachers/:id', authenticateToken, requireAdmin, async (req, res) => {
```

---

## Frontend Changes Required

### Current State
- Frontend already sends auth headers via `getAuthHeaders()` in most cases
- Some endpoints use `fetchWithTimeout` with `requireAuth = false` or `requireAuth = true`
- Frontend code in `BackendDataContext.tsx` line 1812 shows: `false // Backend endpoint doesn't require auth currently`

### Required Changes

**1. Update `fetchWithTimeout` calls to always require auth:**

```typescript
// BEFORE (line 1812)
false // Backend endpoint doesn't require auth currently

// AFTER
true // Backend now requires authentication
```

**2. Ensure all API calls include auth headers:**

All calls to `/api/users`, `/api/students`, `/api/teachers` should use `getAuthHeaders()` or `fetchWithTimeout` with `requireAuth = true`.

**3. Handle 401/403 errors gracefully:**

Add error handling for authentication failures:

```typescript
if (response.status === 401) {
  // Redirect to login or show auth error
  throw new Error('Authentication required. Please log in.');
}
if (response.status === 403) {
  // Show permission error
  throw new Error('You do not have permission to perform this action.');
}
```

---

## Testing Checklist

### Backend Testing
- [ ] Test GET endpoints without auth token → Should return 401
- [ ] Test GET endpoints with valid token → Should return 200
- [ ] Test POST/PUT/DELETE with teacher token → Should return 403
- [ ] Test POST/PUT/DELETE with admin token → Should return 200/201
- [ ] Test POST/PUT/DELETE with superadmin token → Should return 200/201
- [ ] Verify existing authenticated endpoints still work

### Frontend Testing
- [ ] Verify all API calls include auth headers
- [ ] Test error handling for 401 responses
- [ ] Test error handling for 403 responses
- [ ] Verify UI shows appropriate error messages
- [ ] Test that authenticated users can still access data

---

## Migration Strategy

### Phase 1: Add Middleware (Non-Breaking)
1. Add `requireAdmin` and `requireSuperAdmin` middleware
2. Add `authenticateToken` to GET endpoints
3. Test that authenticated requests still work

### Phase 2: Add Role Checks (Breaking)
1. Add `requireAdmin` to POST/PUT/DELETE endpoints
2. Update frontend to handle 403 errors
3. Test with different user roles

### Phase 3: Cleanup
1. Remove comments like "Backend endpoint doesn't require auth currently"
2. Update API documentation
3. Add API versioning if needed for backward compatibility

---

## Security Impact

### Before
- 🔴 **CRITICAL**: Anyone can delete users/students
- 🔴 **HIGH**: Anyone can read all user/student/teacher data
- 🔴 **HIGH**: Anyone can create/modify users/students/teachers
- 🟡 **MEDIUM**: Unauthenticated access to personal data

### After
- ✅ **SECURE**: Only authenticated admins can delete
- ✅ **SECURE**: Only authenticated users can read data
- ✅ **SECURE**: Only authenticated admins can create/modify
- ✅ **SECURE**: Personal data requires authentication

---

## Summary

**Total Routes Audited**: 29
**Routes Requiring Changes**: 22
- **GET routes**: 7 need `authenticateToken`
- **POST routes**: 4 need `authenticateToken` + `requireAdmin`
- **PUT routes**: 3 need `authenticateToken` + `requireAdmin`
- **PATCH routes**: 1 needs `authenticateToken` + `requireAdmin`
- **DELETE routes**: 2 need `authenticateToken` + `requireAdmin`
- **Sync routes**: 3 need `authenticateToken` + `requireAdmin`

**Frontend Changes**: Minimal (already sends auth headers, just need to ensure consistency)

**Breaking Changes**: Yes - Unauthenticated requests will fail. Frontend must ensure all requests include auth headers.

