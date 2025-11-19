# 🔧 Fix: 401 Error When Adding Student

## Problem

When trying to add a student, the application was throwing a 401 error:
```
Failed to load resource: the server responded with a status of 401
Error adding student: Error: Access token required
```

## Root Cause

The `addStudent` function in `BackendDataContext.tsx` was making direct `fetch` calls without including the JWT authentication token in the request headers.

Specifically:
- The `/api/users` endpoint **requires authentication** (has `authenticateToken` middleware)
- The `addStudent` function was not sending the `Authorization: Bearer <token>` header
- This caused the backend to return a 401 error

## Solution

Updated `addStudent` function to use `fetchWithTimeout` helper which automatically includes authentication headers:

### Before:
```typescript
const userResponse = await fetch(`${API_BASE}/users`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({...}),
});
```

### After:
```typescript
const userResponse = await fetchWithTimeout(
  `${API_BASE}/users`,
  {
    method: 'POST',
    body: JSON.stringify({...}),
  },
  10000,
  true // requireAuth = true - includes Authorization header
);
```

## Changes Made

1. **Updated `/api/users` call**: Now uses `fetchWithTimeout` with `requireAuth = true`
2. **Updated `/api/students` call**: Also uses `fetchWithTimeout` with `requireAuth = true` for consistency

## How It Works

The `fetchWithTimeout` function:
1. Checks if `requireAuth` is `true`
2. Calls `getAuthHeaders()` which:
   - Gets the token from `localStorage.getItem('umar_academy_token')`
   - Adds `Authorization: Bearer <token>` header
3. Includes the auth header in the request

## Testing

To verify the fix:
1. Make sure you're logged in (token exists in localStorage)
2. Try adding a new student
3. The request should now succeed without 401 errors

## Related Files

- `src/contexts/BackendDataContext.tsx` - Fixed `addStudent` function
- `backend/server.js` - `/api/users` endpoint requires `authenticateToken` middleware

---

**Status**: ✅ Fixed
**Date**: $(date)

