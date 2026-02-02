# Complete Testing Guide - Production Stabilization Patches

This guide provides step-by-step instructions to test all Phase 1-4 patches.

---

## Prerequisites

1. **Backend server running** on `http://localhost:3001`
2. **Frontend server running** on `http://localhost:5173`
3. **Browser console open** (F12 or Cmd+Option+I)
4. **Backend terminal visible** to see logs

---

## Phase 1: Socket.IO & Error Logging

### Test 1.1: Socket.IO Connection & Room Join

**Steps:**
1. Open `http://localhost:5173` in browser
2. Log in with any account (superadmin, admin, teacher, or student)
3. Open browser console (F12)

**Expected Browser Console:**
```
✅ Socket.IO connected
✅ Requested join room: admins (or student:... or teacher:...)
```

**Expected Backend Logs:**
```
✅ Socket connected: [email] ([role]) [userId]
✅ Socket joined room: [room-name]
```

**✅ Pass if:** You see connection and room join messages in both frontend and backend.

---

### Test 1.2: Socket.IO Reconnection on Token Change

**Steps:**
1. While logged in, open browser console
2. Run this command:
```javascript
// Get current token
const oldToken = localStorage.getItem('umar_academy_token');
console.log('Old token:', oldToken.substring(0, 20) + '...');

// Change token (simulate token refresh)
localStorage.setItem('umar_academy_token', 'new-token-value-' + Date.now());

// Wait 5 seconds
setTimeout(() => {
  console.log('Check console for reconnection messages');
}, 5000);
```

**Expected Browser Console:**
```
🔄 Token changed, reconnecting...
🔌 Connecting Socket.IO...
✅ Socket.IO connected
```

**✅ Pass if:** Socket reconnects automatically when token changes.

---

### Test 1.3: Error Logging

**Steps:**
1. While logged in, open browser console
2. Run this command:
```javascript
const token = localStorage.getItem('umar_academy_token');
fetch('http://localhost:3001/api/test/error', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('✅ Error Response:', data);
  console.log('📝 Check backend terminal for structured error log');
});
```

**Expected Browser Console:**
```
✅ Error Response: { error: "Internal server error", ... }
```

**Expected Backend Logs:**
```
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
  "request": { ... }
}
```

**✅ Pass if:** You see structured error log in backend console with all fields.

---

### Test 1.4: Socket Room Verification

**Steps:**
1. While logged in, open browser console
2. Run this command:
```javascript
const token = localStorage.getItem('umar_academy_token');
fetch('http://localhost:3001/api/test/socket-rooms', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('✅ Socket Room Test:', data);
  if (data.socketCount > 0) {
    console.log(`✅ SUCCESS: ${data.socketCount} socket(s) in room ${data.expectedRoom}`);
  } else {
    console.warn(`⚠️ WARNING: No sockets found in room ${data.expectedRoom}`);
  }
});
```

**Expected Response:**
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

**✅ Pass if:** `socketCount > 0` and room matches your role.

---

## Phase 2: Auth & Token Sync

### Test 2.1: Multi-Tab Token Sync

**Steps:**
1. Open `http://localhost:5173` in **Tab 1**
2. Log in with any account
3. Open `http://localhost:5173` in **Tab 2** (same browser)
4. **Tab 2 should automatically show you logged in**

**Expected Browser Console (Tab 2):**
```
🔄 Storage changed in another tab, reloading user...
✅ AuthContext: User synced from other tab
```

**Test Logout Sync:**
1. In **Tab 1**, click logout
2. **Tab 2 should automatically log out**

**Expected Browser Console (Tab 2):**
```
🔄 Token/user removed in other tab, logging out...
```

**✅ Pass if:** Login/logout in one tab syncs to other tabs automatically.

---

### Test 2.2: Token Expiration Detection

**Steps:**
1. While logged in, open browser console
2. Run this command to check token expiration:
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

console.log('📋 Token Info:');
console.log('  Issued:', new Date(decoded.iat * 1000).toLocaleString());
console.log('  Expires:', new Date(decoded.exp * 1000).toLocaleString());
console.log('  Valid for:', Math.floor((decoded.exp * 1000 - Date.now()) / 1000 / 60), 'minutes');
console.log('  Status:', decoded.exp < Date.now() / 1000 ? '❌ EXPIRED' : '✅ VALID');
```

**Expected Output:**
```
📋 Token Info:
  Issued: 1/15/2026, 12:00:00 PM
  Expires: 1/22/2026, 12:00:00 PM
  Valid for: 10080 minutes
  Status: ✅ VALID
```

**Test Expiration (Manual):**
```javascript
// Manually expire token (for testing)
localStorage.setItem('umar_academy_token', 'expired.test.token');
// Wait 5 seconds - Socket should disconnect
setTimeout(() => {
  console.log('Check console for: "⚠️ Token expired, disconnecting socket"');
}, 5000);
```

**Expected Browser Console:**
```
⚠️ Token expired, disconnecting socket
```

**✅ Pass if:** Token expiration is detected and user is logged out.

---

### Test 2.3: Periodic Token Check

**Steps:**
1. Log in and keep the app open
2. Wait 30 seconds (or check console every 30 seconds)
3. Token expiration is checked automatically

**Expected Behavior:**
- No console messages if token is valid
- Warning message if token expires during session

**✅ Pass if:** Token is checked periodically without errors.

---

## Phase 3: Data Integrity

### Test 3.1: Schema Drift Detection

**Steps:**
1. Open MongoDB shell or use a test script
2. Create a student document with unknown fields:

```javascript
// In MongoDB shell or test script
const Student = require('./models/Student'); // Adjust path as needed
const student = new Student({
  fullName: 'Test Student',
  email: 'test@test.com',
  program: 'After School',
  unknownField: 'This should be logged',
  anotherUnknownField: 123
});
await student.save();
```

**Expected Backend Logs:**
```
❌ SCHEMA DRIFT DETECTED [Student]: {
  documentId: "...",
  droppedFields: ["unknownField", "anotherUnknownField"],
  timestamp: "2026-01-15T..."
}
```

**✅ Pass if:** Unknown fields are detected and logged.

---

### Test 3.2: API Validation

**Test Invalid Student ID:**
```bash
curl -X PUT http://localhost:3001/api/students/invalid-id \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName": "Test"}'
```

**Expected Response:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "msg": "Invalid id format - must be valid MongoDB ObjectId",
      "param": "id",
      "location": "params"
    }
  ]
}
```

**✅ Pass if:** Invalid ID returns 400 with validation error.

---

### Test 3.3: Field Normalization

**Test with Legacy Fields:**
```bash
curl -X PUT http://localhost:3001/api/students/VALID_STUDENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test Student",
    "assignedTeacher": "teacher-id-1",
    "assignedTeacherId": "teacher-id-2"
  }'
```

**Expected Behavior:**
- Both `assignedTeacher` and `assignedTeacherId` normalized to arrays
- `assignedTeacherIds` and `assignedTeachers` arrays created
- Legacy fields maintained for backward compatibility

**Check Backend Logs:**
- No warnings if fields are consistent
- Warnings if fields are inconsistent

**✅ Pass if:** Legacy fields are normalized correctly.

---

## Phase 4: Permission Management

### Test 4.1: Permission Version Check

**Steps:**
1. Log in as a **teacher** or **admin**
2. Note your token (check JWT payload or use the token check script)
3. As **superadmin**, update that teacher/admin's permissions
4. Try to use the old token in an API call:

```javascript
// In browser console (while logged in as the teacher/admin)
const token = localStorage.getItem('umar_academy_token');

// Try to fetch data with old token
fetch('http://localhost:3001/api/students', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  if (data.code === 'PERMISSIONS_OUTDATED') {
    console.log('✅ Token invalidated correctly:', data);
  } else {
    console.log('Response:', data);
  }
});
```

**Expected Response:**
```json
{
  "error": "Your permissions have been updated. Please log in again.",
  "code": "PERMISSIONS_OUTDATED"
}
```

**Expected Backend Logs:**
```
🔄 Updated User permissionsVersion to [timestamp] for userId: ...
🔄 Emitted permissions_updated to teacher:...
❌ Permission version mismatch detected
```

**✅ Pass if:** Old token is rejected with `PERMISSIONS_OUTDATED` error.

---

### Test 4.2: Token Invalidation on Permission Update

**Steps:**
1. Open app in **Tab 1** as a **teacher**
2. Open app in **Tab 2** as **superadmin**
3. In **Tab 2**, update the teacher's permissions
4. Check **Tab 1** (teacher's tab)

**Expected Behavior:**
- Teacher's Socket.IO disconnects
- Teacher receives `permissions_updated` event
- Teacher is logged out automatically
- Teacher must log in again

**Expected Browser Console (Tab 1 - Teacher):**
```
🔄 Permissions updated - reconnecting socket...
⚠️ Token expired, disconnecting socket
```

**Expected Backend Logs:**
```
🔄 Incremented teacher permissions version: 1 → 2
🔄 Updated User permissionsVersion to [timestamp] for userId: ...
🔄 Emitted permissions_updated to teacher:...
```

**✅ Pass if:** Permission update invalidates token and logs out user.

---

### Test 4.3: Permission Version in JWT

**Steps:**
1. Log in as a teacher or admin
2. Check JWT token payload:

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

console.log('JWT Payload:', decoded);
console.log('Permissions Version:', decoded.permissionsVersion);
```

**Expected Output:**
```json
{
  "userId": "...",
  "email": "...",
  "role": "teacher",
  "permissions": { ... },
  "permissionsVersion": 1234567890123,
  "iat": ...,
  "exp": ...
}
```

**✅ Pass if:** Token includes `permissionsVersion` field.

---

## Quick Test Script

Run this in your browser console to test all phases at once:

```javascript
// Complete Phase 1-4 Test Script
(async () => {
  console.log('🧪 Starting Complete Test Suite...\n');
  
  const token = localStorage.getItem('umar_academy_token');
  if (!token) {
    console.error('❌ No token found. Please login first.');
    return;
  }
  
  // Phase 1 Tests
  console.log('📋 Phase 1: Socket.IO & Error Logging');
  console.log('─────────────────────────────────────');
  
  // Test 1.1: Socket Room
  try {
    const roomRes = await fetch('http://localhost:3001/api/test/socket-rooms', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const roomData = await roomRes.json();
    console.log('✅ Socket Room:', roomData.socketCount > 0 ? 'PASS' : 'FAIL', roomData);
  } catch (e) {
    console.error('❌ Socket Room Test Failed:', e);
  }
  
  // Test 1.2: Error Logging
  try {
    const errorRes = await fetch('http://localhost:3001/api/test/error', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const errorData = await errorRes.json();
    console.log('✅ Error Logging:', errorData.error ? 'PASS' : 'FAIL', '(Check backend logs)');
  } catch (e) {
    console.error('❌ Error Logging Test Failed:', e);
  }
  
  // Phase 2 Tests
  console.log('\n📋 Phase 2: Auth & Token Sync');
  console.log('─────────────────────────────');
  
  // Test 2.1: Token Expiration
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    const isExpired = decoded.exp < Date.now() / 1000;
    console.log('✅ Token Expiration Check:', isExpired ? 'EXPIRED' : 'VALID');
    console.log('   Expires:', new Date(decoded.exp * 1000).toLocaleString());
  } catch (e) {
    console.error('❌ Token Expiration Test Failed:', e);
  }
  
  // Phase 4 Tests
  console.log('\n📋 Phase 4: Permission Management');
  console.log('──────────────────────────────────');
  
  // Test 4.1: Permission Version in JWT
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    console.log('✅ Permission Version in JWT:', decoded.permissionsVersion ? 'PASS' : 'FAIL');
    console.log('   Version:', decoded.permissionsVersion || 'Not found');
  } catch (e) {
    console.error('❌ Permission Version Test Failed:', e);
  }
  
  console.log('\n✅ Test Suite Complete!');
  console.log('📝 Next Steps:');
  console.log('   1. Test multi-tab sync manually (open 2 tabs)');
  console.log('   2. Test permission update (update permissions as superadmin)');
  console.log('   3. Check backend logs for all events');
})();
```

---

## Test Checklist

### Phase 1: Socket.IO & Error Logging
- [ ] Socket.IO connects on login
- [ ] Socket joins correct room (admins/teacher:ID/student:ID)
- [ ] Socket reconnects on token change
- [ ] Error logging shows structured format
- [ ] Socket room verification works

### Phase 2: Auth & Token Sync
- [ ] Multi-tab login sync works
- [ ] Multi-tab logout sync works
- [ ] Token expiration detected
- [ ] Periodic token check runs (every 30s)

### Phase 3: Data Integrity
- [ ] Schema drift detection logs unknown fields
- [ ] API validation rejects invalid IDs
- [ ] Field normalization works for legacy fields

### Phase 4: Permission Management
- [ ] Permission version in JWT token
- [ ] Permission version check rejects outdated tokens
- [ ] Token invalidation on permission update
- [ ] Socket.IO disconnects on permission update

---

## Troubleshooting

### Socket.IO Not Connecting
- Check backend is running on port 3001
- Check browser console for connection errors
- Verify token is valid in localStorage

### Permission Version Not Working
- Check User model has `permissionsVersion` field
- Verify token includes `permissionsVersion` in payload
- Check backend logs for version mismatch errors

### Multi-Tab Sync Not Working
- Ensure both tabs are in same browser
- Check browser console for storage events
- Verify localStorage is accessible

---

## Success Criteria

✅ **All tests pass** if:
1. Socket.IO connects and joins rooms correctly
2. Errors are logged in structured format
3. Multi-tab sync works for login/logout
4. Token expiration is detected
5. Permission updates invalidate tokens
6. API validation rejects invalid requests
7. Schema drift is detected and logged

---

## Next Steps After Testing

1. ✅ Verify all tests pass
2. ✅ Check backend logs match expected format
3. ✅ Confirm no errors in production
4. ✅ Monitor for any issues
5. ✅ Document any edge cases found

---

**Happy Testing! 🚀**
