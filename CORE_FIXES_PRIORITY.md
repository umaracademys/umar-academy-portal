# Core Functionality Fixes - Priority List

## 🔴 CRITICAL FIXES (Do First)

### 1. Authentication Token Issues
**Problem**: 401 errors on `/api/users` and `/api/admins` endpoints
**Root Cause**: Token validation or token not being sent properly
**Fix**:
- Verify token is being stored correctly in localStorage
- Check token expiration time (might be too short)
- Ensure token is sent in Authorization header for all requests
- Add better error handling for expired tokens

**Files to check**:
- `src/contexts/BackendDataContext.tsx` - `fetchWithTimeout` function
- `src/contexts/AuthContext.tsx` - Token storage/retrieval
- `backend/server.js` - `authenticateToken` middleware

### 2. User List Endpoints
**Problem**: 401/404 errors when fetching users
**Fix**:
- Verify authentication middleware is working
- Check if token is valid when making requests
- Ensure proper error handling

**Files to check**:
- `backend/server.js` - `/api/users`, `/api/admins` endpoints
- `src/contexts/BackendDataContext.tsx` - Data loading functions

### 3. Duplicate Teachers
**Problem**: Teachers appearing multiple times in lists
**Status**: ✅ Already fixed in `TeachersPage.tsx`
**Verify**: Make sure fix is working correctly

---

## 🟡 HIGH PRIORITY FIXES (Do Next)

### 4. Assignment Date Display
**Problem**: Manual assignments not showing creation dates
**Status**: ✅ Already fixed (createdAt timestamps added)
**Verify**: Test that dates show correctly

### 5. Assignment Creation
**Problem**: Need to verify manual assignment creation works
**Test**:
- Create assignment manually
- Verify it appears in assignment history
- Check dates are correct

---

## 🟢 MEDIUM PRIORITY (After Core Works)

### 6. Ticket System Workflow
**Test**: 
- Create ticket
- Progress through Sabq → Sabqi → Manzil
- Convert to assignment
- Verify all steps work

### 7. Teacher-Student Assignment
**Test**:
- Assign teachers to students
- Verify multi-teacher assignment (up to 9)
- Check sync works correctly

---

## 📋 Testing Checklist

### Authentication
- [ ] Login works for all roles
- [ ] Token is stored in localStorage
- [ ] Token is sent in requests
- [ ] Expired tokens are handled gracefully
- [ ] Rate limiting doesn't block legitimate users

### User Management
- [ ] Can fetch all users
- [ ] Can fetch students
- [ ] Can fetch teachers (no duplicates)
- [ ] Can fetch admins
- [ ] Can view user details
- [ ] Can create/update/delete users

### Assignments
- [ ] Can create assignments manually
- [ ] Assignments show correct dates
- [ ] Assignment history displays correctly
- [ ] Students can view their assignments

### Tickets
- [ ] Can create tickets
- [ ] Workflow progression works
- [ ] Tickets convert to assignments

---

## 🚀 Quick Wins

1. **Increase Token Expiration Time** (if too short)
   - Check JWT expiration in `backend/server.js`
   - Default is usually 24 hours, might need to be longer

2. **Add Token Refresh Logic**
   - Automatically refresh token before expiration
   - Handle token refresh errors gracefully

3. **Improve Error Messages**
   - Show user-friendly error messages
   - Log detailed errors for debugging

4. **Add Request Retry Logic**
   - Retry failed requests once
   - Handle network errors gracefully

---

## 🔍 Debugging Steps

1. **Check Browser Console**
   - Look for 401/403/404 errors
   - Check network tab for failed requests
   - Verify Authorization headers are present

2. **Check Backend Logs**
   - Look for authentication errors
   - Check token validation failures
   - Verify endpoint is being hit

3. **Test Token Manually**
   - Decode JWT token to check expiration
   - Verify token contains correct user data
   - Check if token is expired

4. **Test Endpoints Directly**
   - Use curl or Postman to test endpoints
   - Verify authentication works
   - Check response format

---

## 📝 Next Steps

1. Start with authentication fixes (highest priority)
2. Test all core endpoints
3. Fix any issues found
4. Move to next priority level
5. Document all fixes
