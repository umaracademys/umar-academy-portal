# Core Functionality Focus Plan

## 🎯 Core Functions (Priority Order)

### 1. **Authentication & Login** (CRITICAL)
- **Endpoint**: `POST /api/auth/login`
- **Status**: ⚠️ Known issues with rate limiting (429 errors)
- **Priority**: HIGHEST
- **What to verify**:
  - Login works for all roles (student, teacher, admin, superadmin)
  - Token generation and validation
  - Rate limiting doesn't block legitimate users
  - Password reset functionality

### 2. **User Management** (CRITICAL)
- **Endpoints**:
  - `GET /api/users` - List all users
  - `GET /api/students` - List students
  - `GET /api/teachers` - List teachers
  - `GET /api/admins` - List admins
  - `GET /api/users/:id/details` - User details
- **Status**: ⚠️ Known 401/404 errors
- **Priority**: HIGHEST
- **What to verify**:
  - All users can be fetched
  - Token authentication works
  - User details endpoint works
  - No duplicate users/teachers

### 3. **Assignment Management** (CORE)
- **Endpoints**:
  - `GET /api/assignments` - List assignments
  - `GET /api/assignments/student/:studentId` - Student assignments
  - `GET /api/assignments/:id` - Assignment details
  - `POST /api/assignments` - Create assignment
  - `PUT /api/assignments/:id` - Update assignment
- **Status**: ⚠️ Manual assignments not showing dates
- **Priority**: HIGH
- **What to verify**:
  - Assignments can be created manually
  - Assignments show correct dates
  - Assignment history displays correctly
  - Students can view their assignments

### 4. **Ticket System** (CORE)
- **Endpoints**: (Need to verify)
  - Ticket creation
  - Ticket review workflow (Sabq → Sabqi → Manzil)
  - Ticket to assignment conversion
- **Status**: Unknown
- **Priority**: HIGH
- **What to verify**:
  - Tickets can be created
  - Workflow progression works
  - Tickets convert to assignments correctly

### 5. **Teacher-Student Assignment** (CORE)
- **Component**: `TeacherStudentAssignmentManager`
- **Status**: Functional but may need optimization
- **Priority**: MEDIUM
- **What to verify**:
  - Teachers can be assigned to students
  - Multi-teacher assignment works (up to 9)
  - Assignment sync works correctly

---

## 🔍 Current Known Issues

1. **Authentication Issues**:
   - 401 Unauthorized errors on `/api/users` and `/api/admins`
   - Token validation problems
   - Rate limiting too aggressive (429 errors)

2. **User Management Issues**:
   - Duplicate teachers in lists
   - 404 errors when fetching user details
   - Missing token validation

3. **Assignment Issues**:
   - Manual assignments not showing creation dates
   - Assignment history missing entries

4. **Data Loading Issues**:
   - Race conditions in data fetching
   - Cache invalidation problems
   - Token expiration handling

---

## ✅ Action Plan

### Phase 1: Fix Authentication (IMMEDIATE)
- [ ] Verify token generation works
- [ ] Fix token validation in `fetchWithTimeout`
- [ ] Adjust rate limiting to be less aggressive
- [ ] Test login for all roles

### Phase 2: Fix User Management (IMMEDIATE)
- [ ] Fix 401 errors on user endpoints
- [ ] Fix duplicate teacher issue
- [ ] Verify user details endpoint works
- [ ] Test user creation/update/delete

### Phase 3: Fix Assignment Management (HIGH PRIORITY)
- [ ] Verify assignment creation works
- [ ] Fix date display for manual assignments
- [ ] Test assignment history
- [ ] Verify assignment viewing for students

### Phase 4: Verify Ticket System (HIGH PRIORITY)
- [ ] Test ticket creation
- [ ] Verify workflow progression
- [ ] Test ticket to assignment conversion

### Phase 5: Optimize & Clean Up (MEDIUM PRIORITY)
- [ ] Remove duplicate code
- [ ] Optimize data loading
- [ ] Improve error handling
- [ ] Add better logging

---

## 🚫 What to Skip (For Now)

- UI/UX improvements (unless blocking core functionality)
- Advanced features (notifications, messaging, etc.)
- Performance optimizations (unless causing errors)
- New features
- Mobile responsiveness (unless breaking functionality)

---

## 📝 Testing Checklist

For each core function, verify:
- [ ] Can create/read/update/delete
- [ ] Authentication works
- [ ] Permissions are enforced
- [ ] Errors are handled gracefully
- [ ] Data persists correctly
- [ ] No duplicate entries
- [ ] Dates/timestamps are correct
