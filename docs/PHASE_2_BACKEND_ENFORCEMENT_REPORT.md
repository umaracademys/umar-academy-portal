# PHASE 2 — BACKEND ENFORCEMENT — COMPLETE

**Date:** 2026-01-09  
**Status:** ✅ **COMPLETE**

---

## EXECUTIVE SUMMARY

Phase 2 successfully implemented backend permission enforcement for the **Assignments module**. A generic permission middleware was created and applied to all write routes (POST, PUT, DELETE), ensuring that backend routes enforce permissions independently of frontend checks.

---

## 1. FILES CREATED

### ✅ `backend/middleware/requirePermission.js`

**Purpose:** Generic permission middleware that enforces permissions using the single source of truth

**Features:**
- ✅ Validates permission keys using `backend/shared/permissions.js`
- ✅ Throws error if invalid permission key is passed (prevents typos)
- ✅ Works for both teachers and admins
- ✅ Handles superadmin bypass (superadmin has all permissions)
- ✅ Fetches permissions from Teacher/Admin records
- ✅ Returns HTTP 403 with clear error messages
- ✅ Includes permission key in error response for debugging
- ✅ Handles admin permission mapping (e.g., `canManageAssignments` for admin assignment operations)

**Key Functions:**
- `requirePermission(permissionKey)` - Middleware factory function
- `initializePermissionModels(TeacherModel, AdminModel)` - Initialize models

**Permission Mapping Logic:**
- For admins checking teacher-specific assignment permissions:
  - `canCreateAssignments` → also checks `canManageAssignments`
  - `canEditAssignments` → also checks `canManageAssignments`
  - `canDeleteAssignments` → also checks `canManageAssignments`
  - `canGradeHomework` → also checks `canManageHomework`

**Error Handling:**
- Invalid permission key → Throws error at middleware creation time (prevents runtime errors)
- Missing authentication → HTTP 401
- Missing user ID → HTTP 403
- Missing permissions record → HTTP 403
- Permission denied → HTTP 403 with permission key

---

## 2. FILES UPDATED

### ✅ `backend/server.js`

**Changes:**
1. **Imported new middleware:**
   ```javascript
   const { requirePermission, initializePermissionModels } = require('./middleware/requirePermission');
   ```

2. **Initialized permission models:**
   ```javascript
   if (typeof Admin !== 'undefined') {
     initializeModels(Teacher, Admin);
     initializePermissionModels(Teacher, Admin); // New
   }
   ```

3. **Applied permission middleware to Assignments routes:**

   **POST /api/assignments** (Create Assignment)
   - **Before:** No permission check
   - **After:** `authenticateToken, requirePermission('canCreateAssignments')`
   - **Teachers:** Need `canCreateAssignments` permission
   - **Admins:** Need `canManageAssignments` permission (mapped automatically)

   **PUT /api/assignments/:id** (Update Assignment)
   - **Before:** No permission check
   - **After:** `authenticateToken, requirePermission('canEditAssignments')`
   - **Teachers:** Need `canEditAssignments` permission
   - **Admins:** Need `canManageAssignments` permission (mapped automatically)

   **DELETE /api/assignments/:id** (Delete Assignment)
   - **Before:** No permission check
   - **After:** `authenticateToken, requirePermission('canDeleteAssignments')`
   - **Teachers:** Need `canDeleteAssignments` permission
   - **Admins:** Need `canManageAssignments` permission (mapped automatically)

   **POST /api/assignments/:id/grade-homework** (Grade Homework)
   - **Before:** No permission check
   - **After:** `authenticateToken, requirePermission('canGradeHomework')`
   - **Teachers:** Need `canGradeHomework` permission
   - **Admins:** Need `canManageHomework` permission (mapped automatically)

   **POST /api/assignments/:id/submit-homework** (Submit Homework)
   - **Status:** No permission check (students can submit homework)
   - **Reason:** Students don't have permission records, so this route remains open

---

## 3. PERMISSION MAPPING

### Assignments Module Routes

| Route | Method | Permission (Teacher) | Permission (Admin) | Status |
|-------|--------|---------------------|-------------------|--------|
| `/api/assignments` | POST | `canCreateAssignments` | `canManageAssignments` | ✅ Protected |
| `/api/assignments/:id` | PUT | `canEditAssignments` | `canManageAssignments` | ✅ Protected |
| `/api/assignments/:id` | DELETE | `canDeleteAssignments` | `canManageAssignments` | ✅ Protected |
| `/api/assignments/:id/grade-homework` | POST | `canGradeHomework` | `canManageHomework` | ✅ Protected |
| `/api/assignments/:id/submit-homework` | POST | N/A (students) | N/A (students) | ⚠️ Open (intentional) |
| `/api/assignments` | GET | Not protected | Not protected | ⚠️ Not protected (Phase 2 scope) |
| `/api/assignments/:id` | GET | Not protected | Not protected | ⚠️ Not protected (Phase 2 scope) |

**Note:** GET routes were not protected in Phase 2 per requirements (start with write routes first).

---

## 4. PERMISSION ENFORCEMENT FLOW

### Request Flow

1. **Request arrives** → `authenticateToken` middleware validates JWT token
2. **Token valid** → `req.user` populated with `userId`, `email`, `role`
3. **Permission check** → `requirePermission('canCreateAssignments')` middleware:
   - Validates permission key exists in `backend/shared/permissions.js`
   - Fetches Teacher/Admin record from database using `userId`
   - Checks `permissions[permissionKey] === true`
   - For admins: Also checks mapped permissions (e.g., `canManageAssignments`)
   - Superadmin bypass: Always allows
4. **Permission granted** → Request proceeds to route handler
5. **Permission denied** → Returns HTTP 403 with error message

### Error Responses

**Missing Authentication:**
```json
{
  "error": "Authentication required",
  "permission": "canCreateAssignments"
}
```

**Permission Denied:**
```json
{
  "error": "Access denied. You don't have permission: canCreateAssignments",
  "permission": "canCreateAssignments"
}
```

**Invalid Role:**
```json
{
  "error": "Access denied. Invalid role: student",
  "permission": "canCreateAssignments"
}
```

---

## 5. VALIDATION

### ✅ Type Safety

- ✅ Permission keys validated at middleware creation time
- ✅ Invalid keys throw error immediately (prevents runtime errors)
- ✅ Uses `isValidPermissionKey()` from `backend/shared/permissions.js`

### ✅ Backward Compatibility

- ✅ No breaking changes to API responses
- ✅ Route URLs unchanged
- ✅ Request/response payloads unchanged
- ✅ Existing clients continue to work (if they have proper permissions)

### ✅ Safe Failure Behavior

- ✅ HTTP 403 for permission denied (not 500)
- ✅ Clear error messages
- ✅ Permission key included in error response
- ✅ Server does not crash on permission errors
- ✅ Graceful handling of missing records

---

## 6. TESTING SCENARIOS

### Scenario 1: Teacher with Permission
- **User:** Teacher with `canCreateAssignments: true`
- **Request:** `POST /api/assignments`
- **Expected:** ✅ Success (201 Created)

### Scenario 2: Teacher without Permission
- **User:** Teacher with `canCreateAssignments: false`
- **Request:** `POST /api/assignments`
- **Expected:** ❌ HTTP 403 with error message

### Scenario 3: Admin with Permission
- **User:** Admin with `canManageAssignments: true`
- **Request:** `POST /api/assignments`
- **Expected:** ✅ Success (mapped to `canManageAssignments`)

### Scenario 4: Super Admin
- **User:** Super Admin
- **Request:** `POST /api/assignments`
- **Expected:** ✅ Success (bypasses all checks)

### Scenario 5: Invalid Permission Key
- **Code:** `requirePermission('invalidKey')`
- **Expected:** ❌ Throws error at middleware creation time

### Scenario 6: Unauthenticated Request
- **Request:** `POST /api/assignments` (no token)
- **Expected:** ❌ HTTP 401 (from `authenticateToken` middleware)

---

## 7. SECURITY IMPROVEMENTS

### Before Phase 2:
- ❌ No backend permission checks
- ❌ Anyone with valid token could create/edit/delete assignments
- ❌ Frontend-only protection (easily bypassed)

### After Phase 2:
- ✅ Backend enforces permissions
- ✅ Permission checks happen server-side
- ✅ Cannot bypass by calling API directly
- ✅ Superadmin properly bypasses checks
- ✅ Admin permission mapping works correctly

---

## 8. REMAINING WORK (Future Phases)

### GET Routes (Not Protected in Phase 2)
- `GET /api/assignments` - Could use `canAccessAssignments`
- `GET /api/assignments/:id` - Could use `canAccessAssignments`
- `GET /api/assignments/student/:studentId` - Could use `canAccessAssignments`

### Other Modules (Not Protected in Phase 2)
- Tickets module
- Messages module
- PDF module
- Homework module
- Evaluations module
- Attendance module
- Recordings module
- Mushaf module
- Qaidah module

**Note:** These will be protected in future phases following the same pattern.

---

## 9. STATISTICS

### Routes Protected
- **Total Routes Protected:** 4
- **Write Routes (POST/PUT/DELETE):** 4
- **Read Routes (GET):** 0 (intentionally not protected in Phase 2)

### Permission Keys Used
- `canCreateAssignments` (teacher)
- `canEditAssignments` (teacher)
- `canDeleteAssignments` (teacher)
- `canGradeHomework` (teacher)
- `canManageAssignments` (admin - mapped)
- `canManageHomework` (admin - mapped)

---

## 10. CONCLUSION

**Phase 2 Status:** ✅ **COMPLETE**

**Achievements:**
- ✅ Created generic `requirePermission` middleware
- ✅ Applied middleware to all Assignments write routes
- ✅ Validated permission keys using single source of truth
- ✅ Handled admin permission mapping
- ✅ Maintained backward compatibility
- ✅ Added safe failure behavior

**Impact:**
- ✅ Backend now enforces permissions independently of frontend
- ✅ Cannot bypass permissions by calling API directly
- ✅ Foundation established for protecting other modules

**Ready for Next Phase:** ✅ **YES**

---

**Report Generated:** 2026-01-09  
**Next Steps:** Apply same pattern to other modules (Tickets, Messages, etc.)


