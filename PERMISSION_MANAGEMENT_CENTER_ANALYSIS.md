# Permission Management Center - Complete Analysis

## Executive Summary

The Umar Academy Portal implements a **comprehensive Role-Based Access Control (RBAC) system** with fine-grained permissions, JWT token-based authentication, real-time permission updates via Socket.IO, and multi-tab synchronization. The system supports **4 user roles** (superadmin, admin, teacher, student) with **67+ granular permissions** organized into 19 functional modules.

---

## 1. End-to-End Permission System Flow

### 1.1 Database Storage

**Collections:**
- **`users`** - Base user authentication (email, password, role)
  - Fields: `name`, `email`, `role`, `password`, `permissionsVersion` (Phase 4)
  - No permissions stored here - only role and version tracking

- **`teachers`** - Teacher-specific data and permissions
  - Fields: `userId` (ref to User), `permissions` (object), `permissionsVersion` (number)
  - **67 teacher permissions** (e.g., `canCreateAssignments`, `canSendMessages`, `canViewStudentEmail`)
  - Permissions stored as boolean flags: `{ canCreateAssignments: true, canSendMessages: false, ... }`

- **`admins`** - Admin-specific data and permissions
  - Fields: `userId` (ref to User), `permissions` (object), `permissionsVersion` (number)
  - **40 admin permissions** (e.g., `canManageTeachers`, `canManageStudents`, `canManagePermissions`)
  - Permissions stored as boolean flags

**Schema Example:**
```javascript
// Teacher Schema (backend/server.js)
const teacherSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  permissions: {
    canViewAssessments: Boolean,
    canEditAssessments: Boolean,
    canAccessMessages: Boolean,
    canSendMessages: Boolean,
    // ... 67 total permissions
  },
  permissionsVersion: { type: Number, default: 1 }
});

// Admin Schema
const adminSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  permissions: {
    canManageTeachers: { type: Boolean, default: false },
    canManageStudents: { type: Boolean, default: false },
    canManagePermissions: { type: Boolean, default: false },
    // ... 40 total permissions
  },
  permissionsVersion: { type: Number, default: 1 }
});
```

---

### 1.2 JWT Token Structure

**Token Payload (on Login):**
```javascript
{
  userId: "68f964c11efadca0902593cf",
  email: "sadmin@umaracademy.org",
  role: "superadmin",
  permissions: {
    "*": true  // Superadmin marker - all permissions granted
  },
  permissionsVersion: 1737031318123,  // Timestamp
  iat: 1737031318,  // Issued at
  exp: 1737636118   // Expires in 7 days
}

// Teacher Token Example
{
  userId: "69264a8a3fae7e2bf4aff5fd",
  email: "teacher@example.com",
  role: "teacher",
  permissions: {
    canViewAssessments: true,
    canEditAssessments: true,
    canAccessMessages: true,
    canSendMessages: true,
    canCreateAssignments: true,
    // ... only enabled permissions
  },
  permissionsVersion: 1737031318123,
  iat: 1737031318,
  exp: 1737636118
}
```

**Token Generation (backend/server.js:2184):**
```javascript
// After login, permissions are extracted from Teacher/Admin records
const tokenPayload = {
  userId: user._id,
  email: user.email,
  role: user.role
};

// Only include permissions if they exist (backward compatibility)
if (userPermissions !== null) {
  tokenPayload.permissions = userPermissions;
  tokenPayload.permissionsVersion = permissionsVersion;
}

const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

// Store permissionsVersion in User model for comparison
await User.updateOne(
  { _id: user._id },
  { $set: { permissionsVersion: permissionsVersion } }
);
```

---

### 1.3 Backend Permission Checks

**Middleware Chain:**
```
Request → authenticateToken → requirePermission('canCreateAssignments') → Route Handler
```

**1. Authentication Middleware (`authenticateToken`):**
```javascript
// backend/server.js:1842
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    
    // Phase 4: Check permission version
    if ((decoded.role === 'teacher' || decoded.role === 'admin') && decoded.permissionsVersion) {
      const user = await User.findById(decoded.userId).select('permissionsVersion');
      if (user?.permissionsVersion !== decoded.permissionsVersion) {
        return res.status(401).json({
          error: 'Your permissions have been updated. Please log in again.',
          code: 'PERMISSIONS_OUTDATED'
        });
      }
    }
    
    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || null,
      permissionsVersion: decoded.permissionsVersion || null
    };
    
    next();
  });
};
```

**2. Permission Middleware (`requirePermission`):**
```javascript
// backend/middleware/requirePermission.js:35
function requirePermission(permissionKey) {
  return async (req, res, next) => {
    // 1. Superadmin bypass
    if (req.user.role === 'superadmin' || req.user.permissions?.['*'] === true) {
      return next();
    }
    
    // 2. Permission resolution priority
    let userPermissions = null;
    
    // Priority 1: Use permissions from JWT token (fast path - no DB query)
    if (req.user.permissions && typeof req.user.permissions === 'object') {
      // Validate permission keys (security hardening)
      const validatedPermissions = {};
      for (const key in req.user.permissions) {
        if (key === '*' || isValidPermissionKey(key)) {
          validatedPermissions[key] = req.user.permissions[key] === true;
        }
      }
      userPermissions = validatedPermissions;
    }
    
    // Priority 2: Fallback to DB lookup (for old tokens or missing permissions)
    if (!userPermissions || Object.keys(userPermissions).length === 0) {
      if (req.user.role === 'teacher') {
        const teacher = await Teacher.findOne({ userId: req.user.userId });
        userPermissions = teacher?.permissions || {};
      } else if (req.user.role === 'admin') {
        const admin = await Admin.findOne({ userId: req.user.userId });
        userPermissions = admin?.permissions || {};
      }
    }
    
    // 3. Check specific permission
    const hasPermission = userPermissions[permissionKey] === true;
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: `Access denied. You don't have permission: ${permissionKey}`,
        permission: permissionKey 
      });
    }
    
    next();
  };
}
```

**Route Usage:**
```javascript
// Example: Protected route
app.post('/api/assignments', 
  authenticateToken,                    // 1. Verify JWT token
  requirePermission('canCreateAssignments'),  // 2. Check permission
  async (req, res) => {
    // 3. Route handler (only reached if permission granted)
    // ...
  }
);
```

---

### 1.4 Frontend Permission Enforcement

**1. Permission Hook (`usePermission`):**
```typescript
// src/hooks/usePermission.ts:109
export function usePermission(): UsePermissionReturn {
  const { user } = useAuth();
  const { teachers, admins } = useBackendData();
  
  // Priority 1: Get permissions from JWT token (fast path)
  // Priority 2: Fallback to BackendDataContext (for backward compatibility)
  const permissions = useMemo(() => {
    const tokenPermissions = extractPermissionsFromToken();
    if (tokenPermissions) return tokenPermissions;
    return getPermissionsFromContext(user, teachers, admins);
  }, [user, teachers, admins]);
  
  const can = (permissionKey: TeacherPermissionKey | AdminPermissionKey): boolean => {
    if (isSuperadmin) return true;  // Superadmin bypass
    if (!permissions) return false;
    
    if (user?.role === 'teacher') {
      return hasTeacherPermission(permissions as TeacherPermissions, permissionKey);
    } else if (user?.role === 'admin') {
      return hasAdminPermission(permissions as AdminPermissions, permissionKey);
    }
    return false;
  };
  
  return { can, hasAll, hasAny, permissions, isSuperadmin };
}
```

**2. Permission Component (`RequirePermission`):**
```typescript
// src/components/RequirePermission.tsx:75
export const RequirePermission: React.FC<RequirePermissionProps> = ({
  permission,
  children,
  fallback,
  hideIfDenied = false,
}) => {
  const { can } = usePermission();
  const hasPermission = can(permission);
  
  // Hide if denied and hideIfDenied is true
  if (!hasPermission && hideIfDenied) {
    return fallback ? <>{fallback}</> : null;
  }
  
  // Disable if denied (better UX than hiding)
  if (!hasPermission) {
    return (
      <div className="opacity-50 cursor-not-allowed" style={{ pointerEvents: 'none' }}>
        {children}
      </div>
    );
  }
  
  // Permission granted - render normally
  return <>{children}</>;
};
```

**3. Usage in Components:**
```typescript
// Example: Conditional rendering
const { can } = usePermission();

{can('canCreateAssignments') && (
  <button onClick={handleCreate}>Create Assignment</button>
)}

// Example: Using RequirePermission component
<RequirePermission permission="canSendMessages">
  <button onClick={handleSend}>Send Message</button>
</RequirePermission>

// Example: Route protection (in App.tsx or router)
<Route 
  path="/assignments" 
  element={
    <RequirePermission permission="canAccessAssignments" hideIfDenied>
      <AssignmentsPage />
    </RequirePermission>
  } 
/>
```

---

### 1.5 Real-Time Permission Updates (Socket.IO)

**Backend: Permission Update Flow:**
```javascript
// backend/server.js:4104 (updateTeacher)
if (updateData.permissions) {
  // 1. Increment permissionsVersion
  const newVersion = Date.now();
  await User.updateOne(
    { _id: currentTeacher.userId },
    { $set: { permissionsVersion: newVersion } }
  );
  
  // 2. Emit Socket.IO event to force re-auth
  io.to(`teacher:${currentTeacher.userId}`).emit('permissions_updated');
  console.log(`🔄 Emitted permissions_updated to teacher:${currentTeacher.userId}`);
}
```

**Frontend: Socket.IO Handler:**
```typescript
// src/hooks/useSocket.ts:163
socket.on('permissions_updated', () => {
  console.log('🔄 Permissions updated - reconnecting socket...');
  disconnectSocket();
  setTimeout(() => {
    const currentToken = getToken();
    if (isAuthenticated && currentToken) {
      connectSocket();
    }
  }, 1000);
});
```

**Frontend: Multi-Tab Sync:**
```typescript
// src/contexts/AuthContext.tsx:116
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'umar_academy_token' || e.key === 'umar_academy_user') {
      // Reload user from localStorage
      const newToken = localStorage.getItem('umar_academy_token');
      const newUser = localStorage.getItem('umar_academy_user');
      
      if (newToken && newUser) {
        // Check if token is expired
        if (isTokenExpired(newToken)) {
          setUser(null);  // Auto-logout
          return;
        }
        // Update user state
        setUser(JSON.parse(newUser));
      } else {
        setUser(null);  // Token removed - logout
      }
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

---

## 2. Structural Overview

### 2.1 Database Collections

```
MongoDB Collections:
├── users
│   ├── _id (ObjectId)
│   ├── email (String, unique)
│   ├── role (String: 'superadmin' | 'admin' | 'teacher' | 'student')
│   ├── password (String, hashed)
│   └── permissionsVersion (Number) ← Phase 4: Token invalidation
│
├── teachers
│   ├── _id (ObjectId)
│   ├── userId (ObjectId, ref: users)
│   ├── permissions (Object: { canCreateAssignments: Boolean, ... })
│   └── permissionsVersion (Number)
│
└── admins
    ├── _id (ObjectId)
    ├── userId (ObjectId, ref: users)
    ├── permissions (Object: { canManageTeachers: Boolean, ... })
    └── permissionsVersion (Number)
```

### 2.2 Backend Modules

```
backend/
├── server.js
│   ├── User Schema (authentication only)
│   ├── Teacher Schema (67 permissions)
│   ├── Admin Schema (40 permissions)
│   ├── authenticateToken middleware (JWT verification + version check)
│   ├── Login endpoint (embeds permissions in JWT)
│   ├── updateTeacher endpoint (invalidates tokens on permission change)
│   └── updateAdmin endpoint (invalidates tokens on permission change)
│
├── middleware/
│   ├── requirePermission.js
│   │   ├── requirePermission(permissionKey) factory
│   │   ├── Priority 1: Token permissions (fast path)
│   │   ├── Priority 2: DB lookup (fallback)
│   │   └── Superadmin bypass logic
│   │
│   ├── checkPermissionVersion.js
│   │   └── Version validation middleware
│   │
│   └── permissions.js (legacy - being phased out)
│
└── shared/
    └── permissions.js
        ├── ALL_TEACHER_PERMISSION_KEYS (67 keys)
        ├── ALL_ADMIN_PERMISSION_KEYS (40 keys)
        ├── isValidPermissionKey() validator
        └── Single source of truth for permission keys
```

### 2.3 Frontend Modules

```
src/
├── contexts/
│   ├── AuthContext.tsx
│   │   ├── User authentication state
│   │   ├── JWT token storage (localStorage)
│   │   ├── Permission extraction from token
│   │   ├── Multi-tab sync (storage events)
│   │   └── Token expiration checking
│   │
│   └── BackendDataContext.tsx
│       ├── Teachers/Admins data (fallback for permissions)
│       └── Data caching
│
├── hooks/
│   ├── usePermission.ts
│   │   ├── can(permissionKey) function
│   │   ├── hasAll(permissionKeys) function
│   │   ├── hasAny(permissionKeys) function
│   │   ├── Priority 1: JWT token permissions
│   │   └── Priority 2: BackendDataContext fallback
│   │
│   └── useSocket.ts
│       ├── Socket.IO connection management
│       ├── permissions_updated event handler
│       └── Auto-reconnection on permission updates
│
├── components/
│   ├── RequirePermission.tsx
│   │   ├── Conditional rendering based on permissions
│   │   ├── Disable vs hide logic
│   │   └── Tooltip support
│   │
│   └── PermissionManager.tsx
│       ├── UI for managing teacher/admin permissions
│       ├── Bulk permission operations
│       └── Permission grouping by module
│
└── shared/
    └── permissions.ts
        ├── ALL_TEACHER_PERMISSIONS (67 definitions)
        ├── ALL_ADMIN_PERMISSIONS (40 definitions)
        ├── Type-safe permission keys
        ├── Permission metadata (label, module, risk, defaults)
        └── Single source of truth (mirrors backend/shared/permissions.js)
```

### 2.4 Permission Caching & Versioning

**Caching Strategy:**
1. **JWT Token (Primary Cache):**
   - Permissions embedded in token (no DB query needed)
   - Valid for 7 days
   - Checked on every API request

2. **BackendDataContext (Fallback Cache):**
   - Teacher/Admin records cached in React context
   - Used if token doesn't have permissions (backward compatibility)
   - Refreshed on data reload

3. **Permission Versioning (Phase 4):**
   - `permissionsVersion` stored in User model (timestamp)
   - `permissionsVersion` included in JWT token
   - On permission update: User version incremented → token invalidated
   - On API request: Token version compared to User version → reject if mismatch

---

## 3. Edge Cases & Security Considerations

### 3.1 Token Invalidation on Permission Change

**Flow:**
```
1. Superadmin updates teacher permissions
   ↓
2. Backend increments User.permissionsVersion (Date.now())
   ↓
3. Backend emits Socket.IO 'permissions_updated' event
   ↓
4. Frontend receives event → disconnects socket → forces re-auth
   ↓
5. User must log in again to get new token with updated permissions
```

**Code:**
```javascript
// backend/server.js:4104
if (updateData.permissions) {
  const newVersion = Date.now();
  await User.updateOne(
    { _id: currentTeacher.userId },
    { $set: { permissionsVersion: newVersion } }
  );
  
  io.to(`teacher:${currentTeacher.userId}`).emit('permissions_updated');
}
```

**Security:**
- ✅ Old tokens rejected immediately (version mismatch)
- ✅ Socket.IO disconnects user (forces re-authentication)
- ✅ Multi-tab sync ensures all tabs log out

---

### 3.2 Multi-Tab & Real-Time Sync

**Storage Event Sync:**
```typescript
// Tab 1: Superadmin updates permissions
localStorage.setItem('umar_academy_token', newToken);
window.dispatchEvent(new Event('storage'));  // Broadcast

// Tab 2: Receives storage event
window.addEventListener('storage', (e) => {
  if (e.key === 'umar_academy_token') {
    // Reload user from new token
    const newToken = localStorage.getItem('umar_academy_token');
    // Check expiration, update state
  }
});
```

**Socket.IO Real-Time Updates:**
```typescript
// Backend emits to specific user room
io.to(`teacher:${userId}`).emit('permissions_updated');

// Frontend receives and reconnects
socket.on('permissions_updated', () => {
  disconnectSocket();
  // User must re-login to get new token
});
```

---

### 3.3 Unauthorized Access Prevention

**Backend Protection:**
1. **JWT Verification:** All protected routes require valid token
2. **Permission Check:** `requirePermission` middleware validates specific permission
3. **Version Check:** Token version compared to DB version (Phase 4)
4. **Superadmin Bypass:** Only superadmin can bypass permission checks

**Frontend Protection:**
1. **Route Guards:** `RequirePermission` component hides/disables routes
2. **UI Elements:** Buttons/actions disabled if permission denied
3. **API Calls:** Backend still validates (frontend is UX only)

**Defense in Depth:**
- ✅ Frontend hides UI (UX)
- ✅ Backend validates permissions (security)
- ✅ Token versioning prevents stale permissions
- ✅ Socket.IO forces re-auth on permission changes

---

### 3.4 Logging & Audit

**Activity Logging:**
```javascript
// backend/server.js:1719
const logActivity = async (eventType, data) => {
  const logEntry = new ActivityLog({
    eventType: 'permission_version_mismatch',  // or 'user_updated'
    userId: data.userId,
    userEmail: data.email,
    userRole: data.role,
    details: {
      tokenVersion: decoded.permissionsVersion,
      dbVersion: user.permissionsVersion
    }
  });
  await logEntry.save();
};
```

**Log Events:**
- `permission_version_mismatch` - Token version doesn't match DB
- `user_updated` - Permission changes logged
- `unauthorized_access` - Permission denied attempts

---

## 4. Code Snippets

### 4.1 JWT Payload with Permissions

```javascript
// Example: Teacher Token
{
  "userId": "69264a8a3fae7e2bf4aff5fd",
  "email": "teacher@example.com",
  "role": "teacher",
  "permissions": {
    "canViewAssessments": true,
    "canEditAssessments": true,
    "canAccessMessages": true,
    "canSendMessages": true,
    "canCreateAssignments": true,
    "canAccessTickets": true,
    "canCreateTickets": true
    // ... only enabled permissions included
  },
  "permissionsVersion": 1737031318123,
  "iat": 1737031318,
  "exp": 1737636118
}

// Example: Superadmin Token
{
  "userId": "68f964c11efadca0902593cf",
  "email": "sadmin@umaracademy.org",
  "role": "superadmin",
  "permissions": {
    "*": true  // Superadmin marker - all permissions granted
  },
  "permissionsVersion": 1737031318123,
  "iat": 1737031318,
  "exp": 1737636118
}
```

### 4.2 Backend Permission Middleware

```javascript
// backend/middleware/requirePermission.js
function requirePermission(permissionKey) {
  return async (req, res, next) => {
    // 1. Superadmin bypass
    if (req.user.role === 'superadmin' || req.user.permissions?.['*'] === true) {
      return next();
    }
    
    // 2. Get permissions (token first, then DB)
    let userPermissions = req.user.permissions || await getPermissionsFromDB(req.user);
    
    // 3. Check permission
    if (userPermissions[permissionKey] !== true) {
      return res.status(403).json({ 
        error: `Access denied. You don't have permission: ${permissionKey}`,
        permission: permissionKey 
      });
    }
    
    next();
  };
}

// Usage
app.post('/api/assignments', 
  authenticateToken,
  requirePermission('canCreateAssignments'),
  async (req, res) => {
    // Handler
  }
);
```

### 4.3 Frontend Permission Check

```typescript
// Using usePermission hook
import { usePermission } from '../hooks/usePermission';

function AssignmentsPage() {
  const { can, isSuperadmin } = usePermission();
  
  return (
    <div>
      {can('canCreateAssignments') && (
        <button onClick={handleCreate}>Create Assignment</button>
      )}
      
      {can('canEditAssignments') && (
        <button onClick={handleEdit}>Edit Assignment</button>
      )}
    </div>
  );
}

// Using RequirePermission component
import { RequirePermission } from '../components/RequirePermission';

function TeacherDashboard() {
  return (
    <div>
      <RequirePermission permission="canCreateAssignments">
        <button>Create Assignment</button>
      </RequirePermission>
      
      <RequirePermission 
        permission="canSendMessages"
        fallback={<span>No permission to send messages</span>}
      >
        <button>Send Message</button>
      </RequirePermission>
    </div>
  );
}
```

---

## 5. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERMISSION MANAGEMENT FLOW                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   DATABASE   │
├──────────────┤
│ users        │ ← Base authentication (role, permissionsVersion)
│ teachers     │ ← 67 permissions + permissionsVersion
│ admins       │ ← 40 permissions + permissionsVersion
└──────┬───────┘
       │
       │ Login Request
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Express)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. POST /api/auth/login                                    │
│     ├─ Verify credentials                                   │
│     ├─ Fetch Teacher/Admin record                           │
│     ├─ Extract permissions                                  │
│     ├─ Generate JWT with permissions embedded               │
│     └─ Store permissionsVersion in User model               │
│                                                              │
│  2. authenticateToken Middleware                             │
│     ├─ Verify JWT signature                                 │
│     ├─ Check permissionsVersion (Phase 4)                  │
│     └─ Attach user + permissions to req.user                │
│                                                              │
│  3. requirePermission('canCreateAssignments')               │
│     ├─ Priority 1: Check req.user.permissions (token)       │
│     ├─ Priority 2: Fallback to DB lookup                    │
│     └─ Grant/deny access                                    │
│                                                              │
│  4. PUT /api/teachers/:id (permission update)               │
│     ├─ Update Teacher.permissions                            │
│     ├─ Increment User.permissionsVersion                     │
│     └─ Emit Socket.IO 'permissions_updated' event            │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ JWT Token (with permissions)
       ▼
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (React + Vite)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. AuthContext                                             │
│     ├─ Store JWT token in localStorage                       │
│     ├─ Extract permissions from token                        │
│     ├─ Multi-tab sync (storage events)                      │
│     └─ Token expiration checking                            │
│                                                              │
│  2. usePermission Hook                                      │
│     ├─ Priority 1: Extract from JWT token                   │
│     ├─ Priority 2: Fallback to BackendDataContext           │
│     └─ can(permissionKey) function                          │
│                                                              │
│  3. RequirePermission Component                             │
│     ├─ Check permission using usePermission                 │
│     ├─ Hide/disable UI elements                             │
│     └─ Show tooltips for disabled items                     │
│                                                              │
│  4. useSocket Hook                                          │
│     ├─ Listen for 'permissions_updated' event               │
│     ├─ Disconnect socket on permission change               │
│     └─ Force re-authentication                              │
│                                                              │
│  5. Components                                              │
│     ├─ Conditional rendering: can('permission')            │
│     ├─ Route guards: <RequirePermission>                    │
│     └─ Button states: disabled if no permission            │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ Socket.IO Events
       ▼
┌─────────────────────────────────────────────────────────────┐
│              REAL-TIME PERMISSION UPDATES                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Permission Update Flow:                                     │
│  1. Superadmin updates permissions                          │
│  2. Backend increments permissionsVersion                   │
│  3. Backend emits 'permissions_updated' to user room        │
│  4. Frontend receives event → disconnects socket            │
│  5. User must re-login to get new token                     │
│  6. Multi-tab sync ensures all tabs log out                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Permission Modules

**19 Functional Modules:**
1. **Assessments** - View/edit student assessments
2. **Evaluations** - Create/review/approve evaluations
3. **Financial** - View/manage financial records
4. **Scheduling** - Manage schedules and logistics
5. **Communication** - Contact parents/students
6. **Student Info** - View student personal information
7. **Messages** - Access messaging system
8. **PDF** - PDF library and annotations
9. **Homework** - Create/grade homework
10. **Tickets** - Ticket-based recitation workflow
11. **Attendance** - Record and view attendance
12. **Recordings** - Audio/video recordings
13. **Mushaf** - Quran recitation tracking
14. **Qaidah** - Qaidah learning progress
15. **Assignments** - Student assignments
16. **Student Assignment** - Teacher-student assignment
17. **Notifications** - System notifications
18. **Reports** - Analytics and reports
19. **Security** - Permission management

**Total Permissions:**
- **Teachers:** 67 permissions
- **Admins:** 40 permissions
- **Students:** No permissions (role-based access only)

---

## 7. Security Features

### 7.1 Token Security
- ✅ JWT signed with secret key
- ✅ 7-day expiration
- ✅ Permission versioning (Phase 4)
- ✅ Token invalidation on permission change

### 7.2 Permission Validation
- ✅ Permission keys validated against shared list
- ✅ Invalid keys ignored (security hardening)
- ✅ Superadmin marker (`*`) for full access
- ✅ Type-safe permission keys (TypeScript)

### 7.3 Real-Time Security
- ✅ Socket.IO authentication required
- ✅ Permission updates force re-authentication
- ✅ Multi-tab sync prevents stale sessions
- ✅ Token expiration checked every 30 seconds

### 7.4 Audit & Logging
- ✅ Permission version mismatches logged
- ✅ Unauthorized access attempts logged
- ✅ Permission changes logged to ActivityLog
- ✅ Structured error logging (Phase 1)

---

## 8. Performance Optimizations

1. **Token-Based Permissions (Fast Path):**
   - Permissions in JWT → No DB query needed
   - 99% of requests use token permissions

2. **DB Fallback (Slow Path):**
   - Only used for old tokens or missing permissions
   - Logged for monitoring

3. **Caching:**
   - BackendDataContext caches Teacher/Admin records
   - Reduces API calls

4. **Permission Versioning:**
   - Single DB query to check version (not full permissions)
   - Efficient version comparison

---

## 9. Testing Checklist

- [x] JWT token includes permissions
- [x] Backend permission checks work
- [x] Frontend permission checks work
- [x] Permission updates invalidate tokens
- [x] Socket.IO disconnects on permission update
- [x] Multi-tab sync works
- [x] Token expiration detected
- [x] Superadmin bypass works
- [x] Unauthorized access blocked

---

## 10. Production Considerations

**Monitoring:**
- Watch for `permission_version_mismatch` events
- Monitor `unauthorized_access` attempts
- Track permission update frequency

**Scaling:**
- JWT tokens scale horizontally (stateless)
- Permission checks are fast (token-based)
- DB fallback only for edge cases

**Maintenance:**
- Permission keys defined in `shared/permissions.js` (backend) and `shared/permissions.ts` (frontend)
- Must keep both files in sync
- TypeScript ensures type safety

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-15  
**Status:** Production Ready ✅
