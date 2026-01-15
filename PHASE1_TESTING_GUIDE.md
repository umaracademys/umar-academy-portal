# Phase 1 Testing Guide

## Quick Test Instructions

### Option 1: Browser Console Test (Easiest)

1. **Open your browser console** (F12 or Cmd+Option+I)
2. **Copy and paste** the contents of `test-phase1-patches.js` into the console
3. **Press Enter** to run the tests

The script will automatically:
- ✅ Test Socket Room Membership
- ✅ Test Error Logging
- ✅ Test Token Expiration Detection

---

### Option 2: Manual Testing

#### Test 1: Socket Room Membership

**In Browser Console:**
```javascript
const token = localStorage.getItem('umar_academy_token');
fetch('http://localhost:3001/api/test/socket-rooms', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(console.log);
```

**Expected Result:**
```json
{
  "userId": "...",
  "role": "superadmin",
  "expectedRoom": "admins",
  "socketCount": 1,
  "socketIds": ["..."],
  "message": "✅ 1 socket(s) found in room admins"
}
```

**Check Backend Logs:**
Look for:
```
✅ Socket connected: sadmin@umaracademy.org (superadmin) [68f964c11efadca0902593cf]
✅ Socket joined room: admins
```

---

#### Test 2: Error Logging

**In Browser Console:**
```javascript
const token = localStorage.getItem('umar_academy_token');
fetch('http://localhost:3001/api/test/error', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(console.log);
```

**Expected Result:**
- Frontend: Error response with message
- Backend Console: Structured error log like:
```json
❌ ERROR: {
  "timestamp": "2026-01-15T...",
  "path": "/api/test/error",
  "method": "GET",
  "userId": "...",
  "userRole": "superadmin",
  "error": {
    "name": "Error",
    "message": "Test error for Phase 1 error logging verification"
  },
  "request": {
    "body": {},
    "query": {},
    "params": {}
  }
}
```

---

#### Test 3: Token Expiration Detection

**In Browser Console:**
```javascript
const token = localStorage.getItem('umar_academy_token');
const base64Url = token.split('.')[1];
const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
const jsonPayload = decodeURIComponent(
  atob(base64)
    .split('')
    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
    .join('')
);
const decoded = JSON.parse(jsonPayload);

console.log('Token Expiration:', new Date(decoded.exp * 1000));
console.log('Is Expired:', decoded.exp < Date.now() / 1000);
```

**Expected Behavior:**
- If token is expired: Socket.IO should disconnect
- If token is valid: Socket.IO should remain connected
- Check browser console for: `⚠️ Token expired, disconnecting socket`

**To Test Expiration:**
1. Manually expire token in localStorage:
```javascript
// Create an expired token (exp: past date)
const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGY5NjRjMTFlZmFkY2EwOTAyNTkzY2YiLCJleHAiOjE2MDAwMDAwMDB9.expired';
localStorage.setItem('umar_academy_token', expiredToken);
// Socket should disconnect within 5 seconds
```

---

## Backend Log Verification

### Check Socket Connection Logs

**Look for these patterns in backend console:**

1. **Connection:**
```
✅ Socket connected: [email] ([role]) [userId]
✅ Socket joined room: [room]
```

2. **Room Join Request:**
```
✅ Socket joined room: admins
```

3. **Disconnect:**
```
❌ Socket disconnected: [email] ([role]) [reason]
```

### Check Error Logs

**Look for structured error format:**
```
❌ ERROR: {
  "timestamp": "...",
  "path": "...",
  "method": "...",
  "userId": "...",
  "userRole": "...",
  "error": { ... },
  "request": { ... }
}
```

---

## Expected Results Summary

| Test | Frontend | Backend | Status |
|------|----------|---------|--------|
| Socket Room | Shows socket count | Logs room join | ✅ |
| Error Logging | Error response | Structured log | ✅ |
| Token Expiration | Detects expiry | N/A | ✅ |

---

## Troubleshooting

### Socket Room Test Returns 0 Sockets
- **Cause**: Socket not connected or room not joined
- **Fix**: Check browser console for Socket.IO connection messages
- **Verify**: Backend logs show room join

### Error Logging Not Structured
- **Cause**: errorLogger middleware not loaded
- **Fix**: Restart backend server
- **Verify**: Check `backend/middleware/errorLogger.js` exists

### Token Expiration Not Detected
- **Cause**: Token polling not running
- **Fix**: Check `useSocket.ts` has token check interval
- **Verify**: Browser console shows token check messages

---

## Next Steps After Testing

1. ✅ Verify all tests pass
2. ✅ Check backend logs match expected format
3. ✅ Confirm Socket.IO reconnects work
4. ✅ Proceed to Phase 2 (Auth & Sync)
