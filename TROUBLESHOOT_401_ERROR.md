# 🔍 Troubleshooting 401 Unauthorized Error

## Understanding 401 Errors

A **401 Unauthorized** error means the server rejected your request because you're not authenticated or your credentials are invalid.

---

## 🎯 Common 401 Error Scenarios

### 1. Login Failed (401)
**Symptom:** Browser console shows:
```
POST http://localhost:3001/api/auth/login 401 (Unauthorized)
```

**Possible Causes:**
- ❌ Wrong email
- ❌ Wrong password
- ❌ Wrong role selected
- ❌ User doesn't exist in database
- ❌ Password not set in database

**Solutions:**

#### Check Your Credentials
- **Super Admin:**
  - Email: `sadmin@umaracademy.org`
  - Password: `Admin786!` (or `password123` if not updated)
  - Role: `Super Admin`

#### Verify User Exists
Run this script to check:
```bash
cd backend && node checkUser.js
```

#### Reset Password
If password doesn't work, reset it:
```bash
cd backend && node resetSuperAdminPassword.js
# This sets password to: password123
```

---

### 2. Missing Authentication Token (401)
**Symptom:** Browser console shows:
```
GET http://localhost:3001/api/activity-logs 401 (Unauthorized)
Error: Access token required
```

**Possible Causes:**
- ❌ Not logged in
- ❌ Token not stored in localStorage
- ❌ Token expired (after 7 days)
- ❌ Making API call before login completes

**Solutions:**

#### Check if You're Logged In
Open browser console (F12) and run:
```javascript
console.log('Token:', localStorage.getItem('umar_academy_token'));
console.log('User:', localStorage.getItem('umar_academy_user'));
```

**If both are `null`:**
- You're not logged in
- Try logging in again

#### Check Token Expiration
JWT tokens expire after **7 days**. If expired:
- Logout and login again
- Token will be refreshed

#### Verify Token is Being Sent
Check Network tab in browser:
1. Open DevTools (F12)
2. Go to **Network** tab
3. Find the failed request
4. Click on it
5. Check **Request Headers**
6. Look for: `Authorization: Bearer <token>`

**If missing:**
- Token not being sent with request
- Check `BackendDataContext.tsx` - `getAuthHeaders()` function

---

### 3. Invalid/Expired Token (403)
**Symptom:** Browser console shows:
```
GET http://localhost:3001/api/activity-logs 403 (Forbidden)
Error: Invalid or expired token
```

**Note:** This is actually a **403** error, not 401, but related.

**Solutions:**
- Logout and login again
- Clear localStorage and re-login
- Check if `JWT_SECRET` changed (would invalidate all tokens)

---

## 🔧 Step-by-Step Troubleshooting

### Step 1: Identify the Exact Error

**Open Browser Console (F12):**
1. Go to **Console** tab
2. Look for red error messages
3. Note the exact endpoint that failed
4. Check the error message

**Check Network Tab:**
1. Go to **Network** tab
2. Find the failed request (red status)
3. Click on it
4. Check:
   - **Status Code:** Should be 401
   - **Request URL:** Which endpoint?
   - **Request Headers:** Is `Authorization` header present?
   - **Response:** What error message?

---

### Step 2: Check Authentication State

**In Browser Console:**
```javascript
// Check if logged in
const token = localStorage.getItem('umar_academy_token');
const user = localStorage.getItem('umar_academy_user');

console.log('Token exists:', !!token);
console.log('User exists:', !!user);

if (token) {
  console.log('Token (first 20 chars):', token.substring(0, 20) + '...');
}
if (user) {
  const userObj = JSON.parse(user);
  console.log('User:', userObj.email, userObj.role);
}
```

---

### Step 3: Verify Backend is Running

**Test Backend Health:**
```bash
curl http://localhost:3001/api/health
```

**Expected Response:**
```json
{"status":"OK","message":"Backend is running"}
```

**If you get connection error:**
- Backend is not running
- Start backend: `cd backend && npm start`

---

### Step 4: Test Login Endpoint

**Test Login Directly:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sadmin@umaracademy.org",
    "password": "Admin786!",
    "role": "superadmin"
  }'
```

**Expected Response (Success):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "sadmin@umaracademy.org",
    "role": "superadmin",
    "name": "Super Admin"
  }
}
```

**Expected Response (Failure - 401):**
```json
{
  "error": "Invalid email, password, or role"
}
```

---

### Step 5: Check Which Endpoints Require Auth

**Endpoints that REQUIRE authentication:**
- ✅ `/api/activity-logs` (GET) - Super Admin only
- ✅ `/api/activity-logs/stats` (GET) - Super Admin only
- ✅ `/api/users` (POST) - Create user - Admin/Super Admin only

**Endpoints that DON'T require authentication:**
- ❌ `/api/users` (GET) - Public (for backward compatibility)
- ❌ `/api/students` (all methods)
- ❌ `/api/teachers` (all methods)
- ❌ `/api/assignments` (all methods)
- ❌ `/api/tickets` (all methods)
- ❌ `/api/auth/login` (POST)

**If you get 401 on a public endpoint:**
- Check if endpoint was recently changed to require auth
- Check backend logs for errors

---

## 🐛 Common Issues & Fixes

### Issue 1: "Access token required" on Activity Log

**Problem:** Trying to access Activity Log without being logged in as Super Admin.

**Fix:**
1. Login as Super Admin (`sadmin@umaracademy.org`)
2. Make sure you selected "Super Admin" role
3. Try accessing Activity Log again

---

### Issue 2: Token Not Being Sent

**Problem:** API calls failing because token not in request headers.

**Check:**
```javascript
// In browser console
const token = localStorage.getItem('umar_academy_token');
console.log('Token:', token);
```

**If token exists but still failing:**
- Check `BackendDataContext.tsx` - `getAuthHeaders()` function
- Verify `requireAuth` parameter is `true` for protected endpoints

---

### Issue 3: Token Expired

**Problem:** Token expired after 7 days.

**Fix:**
1. Logout (clears old token)
2. Login again (gets new token)
3. Token valid for another 7 days

**Auto-refresh:** Currently not implemented. You need to manually login again.

---

### Issue 4: Wrong JWT Secret

**Problem:** Backend `JWT_SECRET` changed, invalidating all existing tokens.

**Check:**
- Verify `JWT_SECRET` in backend environment variables
- If changed, all users need to login again

---

### Issue 5: CORS Issues (Can Look Like 401)

**Problem:** CORS blocking request, might show as 401.

**Check:**
- Browser console for CORS errors
- Backend `FRONTEND_URL` environment variable
- Backend CORS configuration in `server.js`

---

## ✅ Quick Fixes

### Fix 1: Clear and Re-login

```javascript
// In browser console
localStorage.clear();
location.reload();
// Then login again
```

### Fix 2: Reset Super Admin Password

```bash
cd backend
node resetSuperAdminPassword.js
# Password reset to: password123
```

### Fix 3: Check Backend Logs

```bash
# If backend is running locally
# Check terminal output for errors

# If on Render
# Check Render dashboard → Logs tab
```

### Fix 4: Verify Environment Variables

**Backend:**
- `JWT_SECRET` - Should be set (or uses default)
- `FRONTEND_URL` - Should match your frontend URL

**Frontend:**
- `VITE_API_BASE_URL` - Should point to backend + `/api`

---

## 🔍 Debugging Checklist

- [ ] Backend is running and accessible
- [ ] User exists in database
- [ ] Password is correct
- [ ] Role matches user's role in database
- [ ] Token exists in localStorage
- [ ] Token is being sent in request headers
- [ ] Token is not expired (less than 7 days old)
- [ ] Endpoint requires authentication (check if it should)
- [ ] User has correct role for protected endpoints (Super Admin for activity logs)
- [ ] No CORS errors in browser console
- [ ] Backend logs show the request arriving

---

## 📝 Example: Debugging a 401 Error

**Scenario:** Getting 401 when trying to view Activity Log

**Step 1:** Check browser console
```
GET http://localhost:3001/api/activity-logs 401 (Unauthorized)
```

**Step 2:** Check Network tab
- Request URL: `http://localhost:3001/api/activity-logs`
- Request Headers: Missing `Authorization` header
- Response: `{"error": "Access token required"}`

**Step 3:** Check localStorage
```javascript
localStorage.getItem('umar_academy_token') // Returns null
```

**Step 4:** Conclusion
- Not logged in
- Need to login first

**Step 5:** Fix
- Login with Super Admin credentials
- Token will be stored
- Try Activity Log again

---

## 🚨 Still Having Issues?

1. **Check Backend Logs:**
   - Look for `unauthorized_access` activity logs
   - Check for specific error messages

2. **Check Activity Log (if accessible):**
   - Go to Super Admin Dashboard
   - View Activity Log tab
   - Look for recent `unauthorized_access` events
   - Check IP address, endpoint, error message

3. **Verify Database:**
   ```bash
   cd backend
   node checkUser.js
   # Verify user exists and has correct role
   ```

4. **Test with curl:**
   ```bash
   # Test login
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"sadmin@umaracademy.org","password":"Admin786!","role":"superadmin"}'
   
   # Save token from response, then test protected endpoint
   curl http://localhost:3001/api/activity-logs \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

---

## 💡 Prevention Tips

1. **Always check login status** before making protected API calls
2. **Handle token expiration** gracefully (redirect to login)
3. **Store tokens securely** (currently in localStorage - consider httpOnly cookies for production)
4. **Log authentication errors** for debugging
5. **Test with different user roles** to verify permissions

---

**Need more help?** Check the specific error message in browser console and backend logs for more details!

