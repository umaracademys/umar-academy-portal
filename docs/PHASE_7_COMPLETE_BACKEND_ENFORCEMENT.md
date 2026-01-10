# PHASE 7 — COMPLETE BACKEND PERMISSION ENFORCEMENT

**Date:** 2026-01-09  
**Status:** 📋 **IMPLEMENTATION PLAN**

---

## EXECUTIVE SUMMARY

Phase 7 completes backend permission enforcement for all 96 permissions across the application. Currently, only 4 permissions (4.2%) are fully enforced. This phase will bring enforcement to 100% by adding `requirePermission()` middleware to all API routes.

**Current State:**
- ✅ 4 permissions fully enforced (Assignments module)
- ⚠️ 92 permissions need backend enforcement
- 🔴 Critical gaps: Permission management, user management, PII access

**Target State:**
- ✅ 100% backend enforcement
- ✅ All critical permissions protected
- ✅ All high-priority permissions protected
- ✅ All medium-priority permissions protected

---

## 1. PHASE 7 OVERVIEW

### Objectives

1. **Route-Level Enforcement:** Add `requirePermission()` to all API routes
2. **Priority-Based Implementation:** Critical → High → Medium
3. **Dead Permission Cleanup:** Identify and document 27 unused permissions
4. **Permission Refinement:** Split high-risk permissions, adjust defaults
5. **Testing Coverage:** Manual and automated tests for all permissions

### Implementation Strategy

- **Incremental:** Module-by-module implementation
- **Non-Breaking:** Maintain backward compatibility
- **Fast Path:** Preserve JWT token-based permission checks (no DB queries)
- **Versioned:** Leverage Phase 5 permission versioning

---

## 2. CRITICAL PERMISSIONS (Week 1 - Days 1-3)

### 2.1 Permission Management Routes

**Risk:** CRITICAL - Users can modify permissions via API

#### Routes to Protect:

```javascript
// Update teacher permissions
app.put('/api/teachers/:id', authenticateToken, requirePermission('canManagePermissions'), async (req, res) => {
  // Only allow if updating permissions field
  if (req.body.permissions) {
    // Permission check already applied above
  }
  // ... rest of handler
});

// Update admin permissions  
app.put('/api/admins/:id', authenticateToken, requirePermission('canManagePermissions'), async (req, res) => {
  // Only allow if updating permissions field
  if (req.body.permissions) {
    // Permission check already applied above
  }
  // ... rest of handler
});
```

**Implementation Notes:**
- Check `req.body.permissions` exists before applying permission check
- Superadmin bypass already handled by middleware
- Increment `permissionsVersion` when permissions change (already implemented)

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

### 2.2 User Management Routes

**Risk:** CRITICAL - Users can create/edit/delete accounts via API

#### Teacher Management:

```javascript
// Create teacher
app.post('/api/teachers', authenticateToken, requirePermission('canManageTeachers'), async (req, res) => {
  // ... handler
});

// Update teacher (non-permission fields)
app.put('/api/teachers/:id', authenticateToken, requirePermission('canManageTeachers'), async (req, res) => {
  // If updating permissions, use canManagePermissions instead
  if (req.body.permissions) {
    // This should be handled by separate permission check
  }
  // ... handler
});

// Delete teacher (if exists)
app.delete('/api/teachers/:id', authenticateToken, requirePermission('canManageTeachers'), async (req, res) => {
  // ... handler
});
```

#### Student Management:

```javascript
// Create student
app.post('/api/students', authenticateToken, requirePermission('canManageStudents'), async (req, res) => {
  // ... handler
});

// Update student
app.put('/api/students/:id', authenticateToken, requirePermission('canManageStudents'), async (req, res) => {
  // ... handler
});

// Delete student
app.delete('/api/students/:id', authenticateToken, requirePermission('canManageStudents'), async (req, res) => {
  // ... handler
});
```

#### Admin Management:

```javascript
// Create admin
app.post('/api/admins', authenticateToken, requirePermission('canManageTeachers'), async (req, res) => {
  // Admins are managed via canManageTeachers (people operations)
  // ... handler
});

// Update admin (non-permission fields)
app.put('/api/admins/:id', authenticateToken, requirePermission('canManageTeachers'), async (req, res) => {
  // If updating permissions, use canManagePermissions instead
  // ... handler
});
```

#### User Account Management:

```javascript
// Create user account
app.post('/api/users', authenticateToken, requirePermission('canManageTeachers'), async (req, res) => {
  // Creating users requires canManageTeachers (people operations)
  // ... handler
});

// Update user account
app.put('/api/users/:id', authenticateToken, requirePermission('canManageTeachers'), async (req, res) => {
  // Updating user accounts requires canManageTeachers
  // ... handler
});

// Delete user account
app.delete('/api/users/:id', authenticateToken, requirePermission('canManageTeachers'), async (req, res) => {
  // ... handler
});
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

### 2.3 PII Access Routes

**Risk:** CRITICAL - Student PII accessible via API

#### Student Data Access:

```javascript
// Get student list (filter PII based on permissions)
app.get('/api/students', authenticateToken, async (req, res) => {
  // Check permissions and filter PII
  const canViewEmail = req.user.permissions?.canViewStudentEmail === true || req.user.role === 'superadmin';
  const canViewContact = req.user.permissions?.canViewStudentContact === true || req.user.role === 'superadmin';
  const canViewPersonalInfo = req.user.permissions?.canViewStudentPersonalInfo === true || req.user.role === 'superadmin';
  
  // Filter student data based on permissions
  // ... handler
});

// Get single student (filter PII)
app.get('/api/students/:id', authenticateToken, async (req, res) => {
  // Check permissions and filter PII
  // ... handler
});

// Get student details
app.get('/api/users/:id/details', authenticateToken, requirePermission('canViewStudentPersonalInfo'), async (req, res) => {
  // ... handler
});
```

**Implementation Notes:**
- GET routes need conditional PII filtering (not full permission denial)
- Students can always view their own data
- Teachers/admins need explicit permissions for PII

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

## 3. HIGH-PRIORITY PERMISSIONS (Week 1-2 - Days 4-7)

### 3.1 Ticket Workflow Routes

**Risk:** HIGH - Ticket workflow can be bypassed

#### Routes to Protect:

```javascript
// Get tickets (access check)
app.get('/api/tickets', authenticateToken, requirePermission('canAccessTickets'), async (req, res) => {
  // ... handler
});

// Create ticket
app.post('/api/tickets', authenticateToken, requirePermission('canCreateTickets'), async (req, res) => {
  // ... handler
});

// Get single ticket (access check)
app.get('/api/tickets/:id', authenticateToken, requirePermission('canAccessTickets'), async (req, res) => {
  // ... handler
});

// Review ticket
app.put('/api/tickets/:id/review', authenticateToken, requirePermission('canReviewTickets'), async (req, res) => {
  // ... handler
});

// Approve ticket
app.put('/api/tickets/:id/approve', authenticateToken, requirePermission('canApproveTickets'), async (req, res) => {
  // ... handler
});

// Finalize ticket
app.put('/api/tickets/:id/finalize', authenticateToken, requirePermission('canFinalizeTickets'), async (req, res) => {
  // ... handler
});

// Manage ticket workflow (admin only)
app.put('/api/tickets/:id/workflow', authenticateToken, requirePermission('canManageTicketWorkflow'), async (req, res) => {
  // ... handler
});
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

### 3.2 Message Routes

**Risk:** HIGH - Message access/moderation not protected

#### Routes to Protect (from `backend/routes/messages.js`):

```javascript
// Get conversations (access check)
app.get('/api/conversations', authenticateToken, requirePermission('canAccessMessages'), async (req, res) => {
  // ... handler
});

// Get single conversation (access check)
app.get('/api/conversations/:id', authenticateToken, requirePermission('canAccessMessages'), async (req, res) => {
  // ... handler
});

// Send message
app.post('/api/conversations/:id/messages', authenticateToken, requirePermission('canSendMessages'), async (req, res) => {
  // ... handler
});

// Get all messages (admin only)
app.get('/api/messages/all', authenticateToken, requirePermission('canViewAllMessages'), async (req, res) => {
  // ... handler
});

// Moderate message
app.put('/api/messages/:id/moderate', authenticateToken, requirePermission('canModerateMessages'), async (req, res) => {
  // ... handler
});
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

### 3.3 Evaluation Routes

**Risk:** HIGH - Evaluation workflow can be bypassed

#### Routes to Protect:

```javascript
// Get evaluations (access check)
app.get('/api/evaluations', authenticateToken, requirePermission('canAccessEvaluations'), async (req, res) => {
  // ... handler
});

// Create evaluation
app.post('/api/evaluations', authenticateToken, requirePermission('canCreateEvaluations'), async (req, res) => {
  // ... handler
});

// Review evaluation
app.put('/api/evaluations/:id/review', authenticateToken, requirePermission('canReviewEvaluations'), async (req, res) => {
  // ... handler
});

// Approve evaluation
app.put('/api/evaluations/:id/approve', authenticateToken, requirePermission('canApproveEvaluations'), async (req, res) => {
  // ... handler
});

// Manage evaluations (admin only)
app.put('/api/evaluations/:id', authenticateToken, requirePermission('canManageEvaluations'), async (req, res) => {
  // ... handler
});
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

### 3.4 Recitation Reviews (Tickets)

**Risk:** HIGH - Related to ticket workflow

#### Routes to Protect:

```javascript
// Get recitation reviews
app.get('/api/recitation-reviews', authenticateToken, requirePermission('canAccessTickets'), async (req, res) => {
  // ... handler
});

// Create recitation review
app.post('/api/recitation-reviews', authenticateToken, requirePermission('canCreateTickets'), async (req, res) => {
  // ... handler
});

// Update recitation review
app.put('/api/recitation-reviews/:id', authenticateToken, requirePermission('canReviewTickets'), async (req, res) => {
  // ... handler
});

// Convert review to assignment
app.post('/api/recitation-reviews/:reviewId/convert-to-assignment', authenticateToken, requirePermission('canFinalizeTickets'), async (req, res) => {
  // ... handler
});
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

## 4. MEDIUM-PRIORITY PERMISSIONS (Week 2-3)

### 4.1 Assessment Routes

**Risk:** MEDIUM - Assessment data can be modified

#### Routes to Protect:

```javascript
// Get assessments (view check)
app.get('/api/assessments', authenticateToken, requirePermission('canViewAssessments'), async (req, res) => {
  // ... handler
});

// Create/update assessment (edit check)
app.post('/api/assessments', authenticateToken, requirePermission('canEditAssessments'), async (req, res) => {
  // ... handler
});

app.put('/api/assessments/:id', authenticateToken, requirePermission('canEditAssessments'), async (req, res) => {
  // ... handler
});
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

### 4.2 Report Routes

**Risk:** MEDIUM - Reports accessible via API

#### Routes to Protect:

```javascript
// Get reports
app.get('/api/reports', authenticateToken, requirePermission('canViewReports'), async (req, res) => {
  // ... handler
});

// Get analytics
app.get('/api/analytics', authenticateToken, requirePermission('canViewAnalytics'), async (req, res) => {
  // ... handler
});

// Export reports
app.get('/api/reports/export', authenticateToken, requirePermission('canExportReports'), async (req, res) => {
  // ... handler
});

// Get system stats (admin only)
app.get('/api/system/stats', authenticateToken, requirePermission('canViewSystemStats'), async (req, res) => {
  // ... handler
});
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

### 4.3 Attendance Routes

**Risk:** MEDIUM - Attendance can be modified

#### Routes to Protect:

```javascript
// Get attendance records
app.get('/api/attendance', authenticateToken, requirePermission('canAccessAttendance'), async (req, res) => {
  // ... handler
});

// Record attendance
app.post('/api/attendance', authenticateToken, requirePermission('canRecordAttendance'), async (req, res) => {
  // ... handler
});

// Get attendance reports
app.get('/api/attendance/reports', authenticateToken, requirePermission('canViewAttendanceReports'), async (req, res) => {
  // ... handler
});

// Manage attendance (admin only)
app.put('/api/attendance/:id', authenticateToken, requirePermission('canManageAttendance'), async (req, res) => {
  // ... handler
});
```

**Teacher Attendance Routes:**

```javascript
// Get teacher attendance
app.get('/api/teacher-attendance', authenticateToken, requirePermission('canAccessAttendance'), async (req, res) => {
  // ... handler
});

// Record teacher attendance
app.post('/api/teacher-attendance', authenticateToken, requirePermission('canRecordAttendance'), async (req, res) => {
  // ... handler
});

// Bulk record teacher attendance
app.post('/api/teacher-attendance/bulk', authenticateToken, requirePermission('canRecordAttendance'), async (req, res) => {
  // ... handler
});

// Get teacher attendance stats
app.get('/api/teacher-attendance/stats/:teacherId', authenticateToken, requirePermission('canViewAttendanceReports'), async (req, res) => {
  // ... handler
});

// Delete teacher attendance (admin only)
app.delete('/api/teacher-attendance/:id', authenticateToken, requirePermission('canManageAttendance'), async (req, res) => {
  // ... handler
});
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

### 4.4 PDF Routes

**Risk:** MEDIUM - PDF operations not protected

#### Routes to Protect:

```javascript
// Get PDFs (access check)
app.get('/api/pdfs', authenticateToken, requirePermission('canAccessPdf'), async (req, res) => {
  // ... handler
});

// Upload PDF
app.post('/api/pdfs', authenticateToken, requirePermission('canUploadPdf'), async (req, res) => {
  // ... handler
});

// Annotate PDF
app.post('/api/pdfs/:id/annotate', authenticateToken, requirePermission('canAnnotatePdf'), async (req, res) => {
  // ... handler
});

// View PDF annotations
app.get('/api/pdfs/:id/annotations', authenticateToken, requirePermission('canViewPdfAnnotations'), async (req, res) => {
  // ... handler
});

// Manage PDF library (admin only)
app.put('/api/pdfs/:id', authenticateToken, requirePermission('canManagePdfLibrary'), async (req, res) => {
  // ... handler
});

// View all PDF annotations (admin only)
app.get('/api/pdfs/annotations/all', authenticateToken, requirePermission('canViewAllPdfAnnotations'), async (req, res) => {
  // ... handler
});
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

### 4.5 Homework Routes

**Risk:** MEDIUM - Homework operations partially protected

#### Routes to Protect:

```javascript
// Get homework (access check)
app.get('/api/homework', authenticateToken, requirePermission('canAccessHomework'), async (req, res) => {
  // ... handler
});

// Create homework
app.post('/api/homework', authenticateToken, requirePermission('canCreateHomework'), async (req, res) => {
  // ... handler
});

// Grade homework (already protected via assignments)
// app.post('/api/assignments/:id/grade-homework', authenticateToken, requirePermission('canGradeHomework'), async (req, res) => {
//   ✅ Already implemented
// });

// View homework submissions
app.get('/api/homework/submissions', authenticateToken, requirePermission('canViewHomeworkSubmissions'), async (req, res) => {
  // ... handler
});

// Manage homework (admin only)
app.put('/api/homework/:id', authenticateToken, requirePermission('canManageHomework'), async (req, res) => {
  // ... handler
});

// View all homework (admin only)
app.get('/api/homework/all', authenticateToken, requirePermission('canViewAllHomework'), async (req, res) => {
  // ... handler
});
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

### 4.6 Recording Routes

**Risk:** MEDIUM - Recording operations not protected

#### Routes to Protect:

```javascript
// Get recordings (access check)
app.get('/api/recordings', authenticateToken, requirePermission('canAccessRecordings'), async (req, res) => {
  // ... handler
});

// Upload recording
app.post('/api/recordings/upload', authenticateToken, requirePermission('canUploadRecordings'), async (req, res) => {
  // ... handler
});

// Delete recording
app.delete('/api/recordings/:id', authenticateToken, requirePermission('canDeleteRecordings'), async (req, res) => {
  // ... handler
});

// View all recordings (admin only)
app.get('/api/recordings/all', authenticateToken, requirePermission('canViewAllRecordings'), async (req, res) => {
  // ... handler
});

// Manage recordings (admin only)
app.put('/api/recordings/:id', authenticateToken, requirePermission('canManageRecordings'), async (req, res) => {
  // ... handler
});
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

### 4.7 Mushaf Routes

**Risk:** MEDIUM - Mushaf operations not protected

#### Routes to Protect:

```javascript
// Get Mushaf data (access check)
app.get('/api/mushaf', authenticateToken, requirePermission('canAccessMushaf'), async (req, res) => {
  // ... handler
});

// Mark mistake
app.post('/api/mistakes', authenticateToken, requirePermission('canMarkMistakes'), async (req, res) => {
  // ... handler
});

// Upload mistake audio
app.post('/api/mistakes/audio', authenticateToken, requirePermission('canMarkMistakes'), async (req, res) => {
  // ... handler
});

// View mistake history
app.get('/api/mistakes/history', authenticateToken, requirePermission('canViewMistakeHistory'), async (req, res) => {
  // ... handler
});

// Manage mistake library (admin only)
app.put('/api/mistakes/library', authenticateToken, requirePermission('canManageMistakeLibrary'), async (req, res) => {
  // ... handler
});

// View all mistakes (admin only)
app.get('/api/mistakes/all', authenticateToken, requirePermission('canViewAllMistakes'), async (req, res) => {
  // ... handler
});

// Manage Mushaf (admin only)
app.put('/api/mushaf/settings', authenticateToken, requirePermission('canManageMushaf'), async (req, res) => {
  // ... handler
});
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

### 4.8 Qaidah Routes

**Risk:** LOW - Qaidah operations not protected

#### Routes to Protect:

```javascript
// Get Qaidah data (access check)
app.get('/api/qaidah', authenticateToken, requirePermission('canAccessQaidah'), async (req, res) => {
  // ... handler
});

// View Qaidah progress
app.get('/api/qaidah/progress', authenticateToken, requirePermission('canViewQaidahProgress'), async (req, res) => {
  // ... handler
});

// Manage Qaidah (admin only)
app.put('/api/qaidah', authenticateToken, requirePermission('canManageQaidah'), async (req, res) => {
  // ... handler
});

// View Qaidah reports (admin only)
app.get('/api/qaidah/reports', authenticateToken, requirePermission('canViewQaidahReports'), async (req, res) => {
  // ... handler
});
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

### 4.9 Notification Routes

**Risk:** MEDIUM - Notification operations not protected

#### Routes to Protect:

```javascript
// Get notifications (view check)
app.get('/api/notifications', authenticateToken, requirePermission('canViewNotifications'), async (req, res) => {
  // ... handler
});

// Create notification
app.post('/api/notifications', authenticateToken, requirePermission('canManageNotifications'), async (req, res) => {
  // ... handler
});

// Send notification
app.post('/api/notifications/:id/send', authenticateToken, requirePermission('canSendNotifications'), async (req, res) => {
  // ... handler
});

// Manage notifications (admin only)
app.put('/api/notifications/:id', authenticateToken, requirePermission('canManageNotifications'), async (req, res) => {
  // ... handler
});
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

### 4.10 Assignment Routes (Additional)

**Risk:** MEDIUM - Some assignment routes not protected

#### Routes to Protect:

```javascript
// Get assignments (access check)
app.get('/api/assignments', authenticateToken, requirePermission('canAccessAssignments'), async (req, res) => {
  // ... handler
});

// Get student assignments
app.get('/api/assignments/student/:studentId', authenticateToken, requirePermission('canAccessAssignments'), async (req, res) => {
  // ... handler
});

// Get single assignment
app.get('/api/assignments/:id', authenticateToken, requirePermission('canAccessAssignments'), async (req, res) => {
  // ... handler
});

// Submit homework (student action - no permission needed, but verify student owns assignment)
app.post('/api/assignments/:id/submit-homework', authenticateToken, async (req, res) => {
  // Students can submit their own homework - no permission check needed
  // But verify req.user.userId matches assignment studentId
  // ... handler
});

// Bulk create assignments (admin only)
app.post('/api/assignments/bulk', authenticateToken, requirePermission('canBulkCreateAssignments'), async (req, res) => {
  // ... handler
});
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION** (except submit-homework)

---

### 4.11 Student Assignment Routes

**Risk:** HIGH - Student-teacher assignment not protected

#### Routes to Protect:

```javascript
// Assign student to teacher
app.post('/api/students/:id/assign-teacher', authenticateToken, requirePermission('canManageStudentAssignments'), async (req, res) => {
  // ... handler
});

// Update student assignment
app.put('/api/students/:id/assign-teacher', authenticateToken, requirePermission('canManageStudentAssignments'), async (req, res) => {
  // ... handler
});
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

### 4.12 Activity Log Routes

**Risk:** LOW - Activity logs need protection

#### Routes to Protect:

```javascript
// Get activity logs (superadmin only - or canViewSystemStats)
app.get('/api/activity-logs', authenticateToken, requirePermission('canViewSystemStats'), async (req, res) => {
  // ... handler
});

// Get activity log stats (superadmin only)
app.get('/api/activity-logs/stats', authenticateToken, requirePermission('canViewSystemStats'), async (req, res) => {
  // ... handler
});
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

### 4.13 Communication Routes

**Risk:** LOW - Parent contact not protected

#### Routes to Protect:

```javascript
// Contact parent
app.post('/api/students/:id/contact-parent', authenticateToken, requirePermission('canContactParents'), async (req, res) => {
  // ... handler
});
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

### 4.14 Schedule Routes

**Risk:** MEDIUM - Schedule management not protected

#### Routes to Protect:

```javascript
// Get schedule
app.get('/api/schedule', authenticateToken, requirePermission('canManageSchedule'), async (req, res) => {
  // ... handler
});

// Update schedule
app.put('/api/schedule', authenticateToken, requirePermission('canManageSchedule'), async (req, res) => {
  // ... handler
});
```

**Status:** ⚠️ **NEEDS IMPLEMENTATION**

---

## 5. DEAD PERMISSIONS (27 Total)

### 5.1 Teacher Dead Permissions (12)

These permissions are defined but have no corresponding routes or UI:

1. `canViewFinancials` - No financial routes exist
2. `canUploadPdf` - No PDF upload route exists
3. `canManageMistakeLibrary` - No mistake library management route
4. `canManageQaidah` - No Qaidah management route
5. `canDeleteRecordings` - No recording delete route
6. `canViewAllRecordings` - No "view all" recordings route
7. `canCreateEvaluations` - No evaluation creation route (only recitation reviews)
8. `canReviewEvaluations` - No evaluation review route
9. `canApproveEvaluations` - No evaluation approval route
10. `canExportReports` - No report export route
11. `canManageSchedule` - No schedule management routes
12. `canContactParents` - No parent contact route

**Action:** Document for future implementation or remove from schema

---

### 5.2 Admin Dead Permissions (15)

These permissions are defined but have no corresponding routes:

1. `canManageFinancials` - No financial management routes
2. `canManagePdfLibrary` - No PDF library management route
3. `canViewAllPdfAnnotations` - No "view all" annotations route
4. `canManageHomework` - No homework management route
5. `canViewAllHomework` - No "view all" homework route
6. `canManageEvaluations` - No evaluation management route
7. `canManageTicketWorkflow` - No ticket workflow management route
8. `canManageAttendance` - No attendance management route (except teacher attendance)
9. `canManageRecordings` - No recording management route
10. `canViewAllRecordings` - No "view all" recordings route
11. `canManageMushaf` - No Mushaf management route
12. `canViewAllMistakes` - No "view all" mistakes route
13. `canManageQaidah` - No Qaidah management route
14. `canViewQaidahReports` - No Qaidah reports route
15. `canBulkCreateAssignments` - No bulk assignment creation route

**Action:** Document for future implementation or remove from schema

---

### 5.3 Dead Permission Cleanup Plan

**Option 1: Remove Dead Permissions**
- Remove from `src/shared/permissions.ts`
- Remove from `backend/shared/permissions.js`
- Remove from database schemas
- Update TypeScript types

**Option 2: Keep for Future Implementation**
- Document as "planned" permissions
- Add TODO comments in code
- Create GitHub issues for implementation

**Recommendation:** **Option 2** - Keep permissions but document as planned features

---

## 6. SPLIT/DOWNGRADE RECOMMENDATIONS

### 6.1 Permissions to Split

#### High-Risk "Manage" Permissions

**Current:**
- `canManageTeachers` - Single permission for create/edit/delete
- `canManageStudents` - Single permission for create/edit/delete
- `canManageFinancials` - Single permission for all financial operations

**Recommended Split:**

```typescript
// Teacher Management - Split into:
canCreateTeachers: boolean;    // Create new teacher accounts
canEditTeachers: boolean;      // Edit existing teacher accounts
canDeleteTeachers: boolean;    // Delete teacher accounts

// Student Management - Split into:
canCreateStudents: boolean;    // Create new student accounts
canEditStudents: boolean;      // Edit existing student accounts
canDeleteStudents: boolean;    // Delete student accounts

// Financial Management - Split into:
canViewFinancials: boolean;   // View financial data (already exists for teachers)
canEditFinancials: boolean;   // Edit financial records
canManageBilling: boolean;    // Manage billing and payments
```

**Implementation Impact:**
- Requires schema migration
- Requires frontend updates
- Requires permission manager updates
- **Recommendation:** Defer to Phase 8 (Permission Refinement)

---

### 6.2 Permissions to Downgrade Defaults

#### PII Permissions for Teachers

**Current Defaults:**
- `canViewStudentEmail`: `defaultTeacher: true` ⚠️
- `canViewStudentContact`: `defaultTeacher: true` ⚠️
- `canViewStudentPersonalInfo`: `defaultTeacher: true` ⚠️

**Recommended Defaults:**
- `canViewStudentEmail`: `defaultTeacher: false` ✅
- `canViewStudentContact`: `defaultTeacher: false` ✅
- `canViewStudentPersonalInfo`: `defaultTeacher: false` ✅

**Rationale:**
- PII access should be opt-in, not default
- Reduces risk of accidental PII exposure
- Aligns with privacy best practices

**Implementation:**
```typescript
// In src/shared/permissions.ts
{
  key: 'canViewStudentEmail',
  label: 'View Student Email',
  module: 'student-info',
  risk: 'medium',
  defaultTeacher: false,  // Changed from true
  defaultAdmin: false,
  description: 'View student email addresses'
},
// ... repeat for canViewStudentContact and canViewStudentPersonalInfo
```

**Impact:**
- Existing teachers will need explicit permission grant
- New teachers won't have PII access by default
- **Recommendation:** Implement in Phase 7 (Low Priority)

---

### 6.3 Risk Level Adjustments

**Current → Recommended:**

1. `canViewStudentEmail` - **Medium → Low** (if default changed to false)
2. `canViewStudentContact` - **Medium → Low** (if default changed to false)
3. `canViewStudentPersonalInfo` - **Medium → Low** (if default changed to false)
4. `canViewAllRecordings` - **Medium → Low** (if properly enforced)
5. `canViewAllPdfAnnotations` - **Medium → Low** (if properly enforced)

**Recommendation:** Adjust risk levels after defaults are changed

---

## 7. ROUTE ENFORCEMENT CHECKLIST

### Module-by-Module Implementation

#### 🔴 CRITICAL PRIORITY (Week 1 - Days 1-3)

| Route | Method | Permission | Priority | Status |
|-------|--------|------------|----------|--------|
| `/api/teachers/:id` (permissions) | PUT | `canManagePermissions` | Critical | ⚠️ TODO |
| `/api/admins/:id` (permissions) | PUT | `canManagePermissions` | Critical | ⚠️ TODO |
| `/api/teachers` | POST | `canManageTeachers` | Critical | ⚠️ TODO |
| `/api/teachers/:id` | PUT | `canManageTeachers` | Critical | ⚠️ TODO |
| `/api/teachers/:id` | DELETE | `canManageTeachers` | Critical | ⚠️ TODO |
| `/api/students` | POST | `canManageStudents` | Critical | ⚠️ TODO |
| `/api/students/:id` | PUT | `canManageStudents` | Critical | ⚠️ TODO |
| `/api/students/:id` | DELETE | `canManageStudents` | Critical | ⚠️ TODO |
| `/api/admins` | POST | `canManageTeachers` | Critical | ⚠️ TODO |
| `/api/admins/:id` | PUT | `canManageTeachers` | Critical | ⚠️ TODO |
| `/api/users` | POST | `canManageTeachers` | Critical | ⚠️ TODO |
| `/api/users/:id` | PUT | `canManageTeachers` | Critical | ⚠️ TODO |
| `/api/users/:id` | DELETE | `canManageTeachers` | Critical | ⚠️ TODO |
| `/api/students` | GET | `canViewStudentEmail` (filter) | Critical | ⚠️ TODO |
| `/api/students/:id` | GET | `canViewStudentEmail` (filter) | Critical | ⚠️ TODO |
| `/api/users/:id/details` | GET | `canViewStudentPersonalInfo` | Critical | ⚠️ TODO |

---

#### 🟡 HIGH PRIORITY (Week 1-2 - Days 4-7)

**Tickets Module:**

| Route | Method | Permission | Priority | Status |
|-------|--------|------------|----------|--------|
| `/api/tickets` | GET | `canAccessTickets` | High | ⚠️ TODO |
| `/api/tickets` | POST | `canCreateTickets` | High | ⚠️ TODO |
| `/api/tickets/:id` | GET | `canAccessTickets` | High | ⚠️ TODO |
| `/api/tickets/:id/review` | PUT | `canReviewTickets` | High | ⚠️ TODO |
| `/api/tickets/:id/approve` | PUT | `canApproveTickets` | High | ⚠️ TODO |
| `/api/tickets/:id/finalize` | PUT | `canFinalizeTickets` | High | ⚠️ TODO |
| `/api/tickets/:id/workflow` | PUT | `canManageTicketWorkflow` | High | ⚠️ TODO |
| `/api/recitation-reviews` | GET | `canAccessTickets` | High | ⚠️ TODO |
| `/api/recitation-reviews` | POST | `canCreateTickets` | High | ⚠️ TODO |
| `/api/recitation-reviews/:id` | PUT | `canReviewTickets` | High | ⚠️ TODO |
| `/api/recitation-reviews/:reviewId/convert-to-assignment` | POST | `canFinalizeTickets` | High | ⚠️ TODO |

**Messages Module:**

| Route | Method | Permission | Priority | Status |
|-------|--------|------------|----------|--------|
| `/api/conversations` | GET | `canAccessMessages` | High | ⚠️ TODO |
| `/api/conversations/:id` | GET | `canAccessMessages` | High | ⚠️ TODO |
| `/api/conversations/:id/messages` | POST | `canSendMessages` | High | ⚠️ TODO |
| `/api/messages/all` | GET | `canViewAllMessages` | High | ⚠️ TODO |
| `/api/messages/:id/moderate` | PUT | `canModerateMessages` | High | ⚠️ TODO |

**Evaluations Module:**

| Route | Method | Permission | Priority | Status |
|-------|--------|------------|----------|--------|
| `/api/evaluations` | GET | `canAccessEvaluations` | High | ⚠️ TODO |
| `/api/evaluations` | POST | `canCreateEvaluations` | High | ⚠️ TODO |
| `/api/evaluations/:id/review` | PUT | `canReviewEvaluations` | High | ⚠️ TODO |
| `/api/evaluations/:id/approve` | PUT | `canApproveEvaluations` | High | ⚠️ TODO |
| `/api/evaluations/:id` | PUT | `canManageEvaluations` | High | ⚠️ TODO |

**Student Assignment:**

| Route | Method | Permission | Priority | Status |
|-------|--------|------------|----------|--------|
| `/api/students/:id/assign-teacher` | POST | `canManageStudentAssignments` | High | ⚠️ TODO |
| `/api/students/:id/assign-teacher` | PUT | `canManageStudentAssignments` | High | ⚠️ TODO |

---

#### 🟢 MEDIUM PRIORITY (Week 2-3)

**Assessments Module:**

| Route | Method | Permission | Priority | Status |
|-------|--------|------------|----------|--------|
| `/api/assessments` | GET | `canViewAssessments` | Medium | ⚠️ TODO |
| `/api/assessments` | POST | `canEditAssessments` | Medium | ⚠️ TODO |
| `/api/assessments/:id` | PUT | `canEditAssessments` | Medium | ⚠️ TODO |

**Reports Module:**

| Route | Method | Permission | Priority | Status |
|-------|--------|------------|----------|--------|
| `/api/reports` | GET | `canViewReports` | Medium | ⚠️ TODO |
| `/api/analytics` | GET | `canViewAnalytics` | Medium | ⚠️ TODO |
| `/api/reports/export` | GET | `canExportReports` | Medium | ⚠️ TODO |
| `/api/system/stats` | GET | `canViewSystemStats` | Medium | ⚠️ TODO |
| `/api/activity-logs` | GET | `canViewSystemStats` | Medium | ⚠️ TODO |
| `/api/activity-logs/stats` | GET | `canViewSystemStats` | Medium | ⚠️ TODO |

**Attendance Module:**

| Route | Method | Permission | Priority | Status |
|-------|--------|------------|----------|--------|
| `/api/attendance` | GET | `canAccessAttendance` | Medium | ⚠️ TODO |
| `/api/attendance` | POST | `canRecordAttendance` | Medium | ⚠️ TODO |
| `/api/attendance/reports` | GET | `canViewAttendanceReports` | Medium | ⚠️ TODO |
| `/api/attendance/:id` | PUT | `canManageAttendance` | Medium | ⚠️ TODO |
| `/api/teacher-attendance` | GET | `canAccessAttendance` | Medium | ⚠️ TODO |
| `/api/teacher-attendance` | POST | `canRecordAttendance` | Medium | ⚠️ TODO |
| `/api/teacher-attendance/bulk` | POST | `canRecordAttendance` | Medium | ⚠️ TODO |
| `/api/teacher-attendance/stats/:teacherId` | GET | `canViewAttendanceReports` | Medium | ⚠️ TODO |
| `/api/teacher-attendance/:id` | DELETE | `canManageAttendance` | Medium | ⚠️ TODO |

**PDF Module:**

| Route | Method | Permission | Priority | Status |
|-------|--------|------------|----------|--------|
| `/api/pdfs` | GET | `canAccessPdf` | Medium | ⚠️ TODO |
| `/api/pdfs` | POST | `canUploadPdf` | Medium | ⚠️ TODO |
| `/api/pdfs/:id/annotate` | POST | `canAnnotatePdf` | Medium | ⚠️ TODO |
| `/api/pdfs/:id/annotations` | GET | `canViewPdfAnnotations` | Medium | ⚠️ TODO |
| `/api/pdfs/:id` | PUT | `canManagePdfLibrary` | Medium | ⚠️ TODO |
| `/api/pdfs/annotations/all` | GET | `canViewAllPdfAnnotations` | Medium | ⚠️ TODO |

**Homework Module:**

| Route | Method | Permission | Priority | Status |
|-------|--------|------------|----------|--------|
| `/api/homework` | GET | `canAccessHomework` | Medium | ⚠️ TODO |
| `/api/homework` | POST | `canCreateHomework` | Medium | ⚠️ TODO |
| `/api/homework/submissions` | GET | `canViewHomeworkSubmissions` | Medium | ⚠️ TODO |
| `/api/homework/:id` | PUT | `canManageHomework` | Medium | ⚠️ TODO |
| `/api/homework/all` | GET | `canViewAllHomework` | Medium | ⚠️ TODO |
| `/api/assignments` | GET | `canAccessAssignments` | Medium | ⚠️ TODO |
| `/api/assignments/student/:studentId` | GET | `canAccessAssignments` | Medium | ⚠️ TODO |
| `/api/assignments/:id` | GET | `canAccessAssignments` | Medium | ⚠️ TODO |
| `/api/assignments/bulk` | POST | `canBulkCreateAssignments` | Medium | ⚠️ TODO |

**Recordings Module:**

| Route | Method | Permission | Priority | Status |
|-------|--------|------------|----------|--------|
| `/api/recordings` | GET | `canAccessRecordings` | Medium | ⚠️ TODO |
| `/api/recordings/upload` | POST | `canUploadRecordings` | Medium | ⚠️ TODO |
| `/api/recordings/:id` | DELETE | `canDeleteRecordings` | Medium | ⚠️ TODO |
| `/api/recordings/all` | GET | `canViewAllRecordings` | Medium | ⚠️ TODO |
| `/api/recordings/:id` | PUT | `canManageRecordings` | Medium | ⚠️ TODO |

**Mushaf Module:**

| Route | Method | Permission | Priority | Status |
|-------|--------|------------|----------|--------|
| `/api/mushaf` | GET | `canAccessMushaf` | Medium | ⚠️ TODO |
| `/api/mistakes` | POST | `canMarkMistakes` | Medium | ⚠️ TODO |
| `/api/mistakes/audio` | POST | `canMarkMistakes` | Medium | ⚠️ TODO |
| `/api/mistakes/history` | GET | `canViewMistakeHistory` | Medium | ⚠️ TODO |
| `/api/mistakes/library` | PUT | `canManageMistakeLibrary` | Medium | ⚠️ TODO |
| `/api/mistakes/all` | GET | `canViewAllMistakes` | Medium | ⚠️ TODO |
| `/api/mushaf/settings` | PUT | `canManageMushaf` | Medium | ⚠️ TODO |

**Qaidah Module:**

| Route | Method | Permission | Priority | Status |
|-------|--------|------------|----------|--------|
| `/api/qaidah` | GET | `canAccessQaidah` | Medium | ⚠️ TODO |
| `/api/qaidah/progress` | GET | `canViewQaidahProgress` | Medium | ⚠️ TODO |
| `/api/qaidah` | PUT | `canManageQaidah` | Medium | ⚠️ TODO |
| `/api/qaidah/reports` | GET | `canViewQaidahReports` | Medium | ⚠️ TODO |

**Notifications Module:**

| Route | Method | Permission | Priority | Status |
|-------|--------|------------|----------|--------|
| `/api/notifications` | GET | `canViewNotifications` | Medium | ⚠️ TODO |
| `/api/notifications` | POST | `canManageNotifications` | Medium | ⚠️ TODO |
| `/api/notifications/:id/send` | POST | `canSendNotifications` | Medium | ⚠️ TODO |
| `/api/notifications/:id` | PUT | `canManageNotifications` | Medium | ⚠️ TODO |

**Communication Module:**

| Route | Method | Permission | Priority | Status |
|-------|--------|------------|----------|--------|
| `/api/students/:id/contact-parent` | POST | `canContactParents` | Medium | ⚠️ TODO |

**Schedule Module:**

| Route | Method | Permission | Priority | Status |
|-------|--------|------------|----------|--------|
| `/api/schedule` | GET | `canManageSchedule` | Medium | ⚠️ TODO |
| `/api/schedule` | PUT | `canManageSchedule` | Medium | ⚠️ TODO |

---

## 8. READY-TO-COPY MIDDLEWARE IMPLEMENTATIONS

### Critical Routes (Copy-Paste Ready)

```javascript
// ============================================
// CRITICAL: Permission Management
// ============================================

// Update teacher permissions
app.put('/api/teachers/:id', authenticateToken, async (req, res) => {
  // Check if updating permissions
  if (req.body.permissions) {
    // Apply permission check only when updating permissions
    const hasPermission = req.user.role === 'superadmin' || 
                         (req.user.permissions && req.user.permissions['*'] === true) ||
                         (req.user.permissions && req.user.permissions.canManagePermissions === true);
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Access denied. You need canManagePermissions to update permissions.',
        permission: 'canManagePermissions'
      });
    }
  }
  // ... rest of handler
});

// Update admin permissions
app.put('/api/admins/:id', authenticateToken, async (req, res) => {
  // Check if updating permissions
  if (req.body.permissions) {
    const hasPermission = req.user.role === 'superadmin' || 
                         (req.user.permissions && req.user.permissions['*'] === true) ||
                         (req.user.permissions && req.user.permissions.canManagePermissions === true);
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Access denied. You need canManagePermissions to update permissions.',
        permission: 'canManagePermissions'
      });
    }
  }
  // ... rest of handler
});

// ============================================
// CRITICAL: User Management
// ============================================

// Create teacher
app.post('/api/teachers', authenticateToken, requirePermission('canManageTeachers'), async (req, res) => {
  // ... handler
});

// Update teacher (non-permission fields)
app.put('/api/teachers/:id', authenticateToken, requirePermission('canManageTeachers'), async (req, res) => {
  // Note: Permission updates handled separately above
  // ... handler
});

// Create student
app.post('/api/students', authenticateToken, requirePermission('canManageStudents'), async (req, res) => {
  // ... handler
});

// Update student
app.put('/api/students/:id', authenticateToken, requirePermission('canManageStudents'), async (req, res) => {
  // ... handler
});

// Delete student
app.delete('/api/students/:id', authenticateToken, requirePermission('canManageStudents'), async (req, res) => {
  // ... handler
});

// Create admin
app.post('/api/admins', authenticateToken, requirePermission('canManageTeachers'), async (req, res) => {
  // ... handler
});

// Update admin (non-permission fields)
app.put('/api/admins/:id', authenticateToken, requirePermission('canManageTeachers'), async (req, res) => {
  // Note: Permission updates handled separately above
  // ... handler
});

// Create user
app.post('/api/users', authenticateToken, requirePermission('canManageTeachers'), async (req, res) => {
  // ... handler
});

// Update user
app.put('/api/users/:id', authenticateToken, requirePermission('canManageTeachers'), async (req, res) => {
  // ... handler
});

// Delete user
app.delete('/api/users/:id', authenticateToken, requirePermission('canManageTeachers'), async (req, res) => {
  // ... handler
});

// ============================================
// CRITICAL: PII Access
// ============================================

// Get students (filter PII)
app.get('/api/students', authenticateToken, async (req, res) => {
  try {
    const students = await Student.find();
    
    // Filter PII based on permissions
    const canViewEmail = req.user.role === 'superadmin' || 
                        (req.user.permissions && req.user.permissions['*'] === true) ||
                        (req.user.permissions && req.user.permissions.canViewStudentEmail === true);
    
    const canViewContact = req.user.role === 'superadmin' || 
                          (req.user.permissions && req.user.permissions['*'] === true) ||
                          (req.user.permissions && req.user.permissions.canViewStudentContact === true);
    
    const canViewPersonalInfo = req.user.role === 'superadmin' || 
                                (req.user.permissions && req.user.permissions['*'] === true) ||
                                (req.user.permissions && req.user.permissions.canViewStudentPersonalInfo === true);
    
    const filteredStudents = students.map(student => {
      const filtered = student.toObject();
      
      if (!canViewEmail) {
        delete filtered.email;
      }
      
      if (!canViewContact) {
        delete filtered.contact;
        delete filtered.phoneNumber;
      }
      
      if (!canViewPersonalInfo) {
        delete filtered.parentName;
        delete filtered.siblings;
      }
      
      return filtered;
    });
    
    res.json(filteredStudents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get student details
app.get('/api/users/:id/details', authenticateToken, requirePermission('canViewStudentPersonalInfo'), async (req, res) => {
  // ... handler
});
```

### High-Priority Routes (Copy-Paste Ready)

```javascript
// ============================================
// HIGH: Ticket Workflow
// ============================================

app.get('/api/tickets', authenticateToken, requirePermission('canAccessTickets'), async (req, res) => {
  // ... handler
});

app.post('/api/tickets', authenticateToken, requirePermission('canCreateTickets'), async (req, res) => {
  // ... handler
});

app.get('/api/tickets/:id', authenticateToken, requirePermission('canAccessTickets'), async (req, res) => {
  // ... handler
});

app.put('/api/tickets/:id/review', authenticateToken, requirePermission('canReviewTickets'), async (req, res) => {
  // ... handler
});

app.put('/api/tickets/:id/approve', authenticateToken, requirePermission('canApproveTickets'), async (req, res) => {
  // ... handler
});

app.put('/api/tickets/:id/finalize', authenticateToken, requirePermission('canFinalizeTickets'), async (req, res) => {
  // ... handler
});

app.put('/api/tickets/:id/workflow', authenticateToken, requirePermission('canManageTicketWorkflow'), async (req, res) => {
  // ... handler
});

// Recitation reviews (ticket-related)
app.get('/api/recitation-reviews', authenticateToken, requirePermission('canAccessTickets'), async (req, res) => {
  // ... handler
});

app.post('/api/recitation-reviews', authenticateToken, requirePermission('canCreateTickets'), async (req, res) => {
  // ... handler
});

app.put('/api/recitation-reviews/:id', authenticateToken, requirePermission('canReviewTickets'), async (req, res) => {
  // ... handler
});

app.post('/api/recitation-reviews/:reviewId/convert-to-assignment', authenticateToken, requirePermission('canFinalizeTickets'), async (req, res) => {
  // ... handler
});

// ============================================
// HIGH: Messages
// ============================================

app.get('/api/conversations', authenticateToken, requirePermission('canAccessMessages'), async (req, res) => {
  // ... handler
});

app.get('/api/conversations/:id', authenticateToken, requirePermission('canAccessMessages'), async (req, res) => {
  // ... handler
});

app.post('/api/conversations/:id/messages', authenticateToken, requirePermission('canSendMessages'), async (req, res) => {
  // ... handler
});

app.get('/api/messages/all', authenticateToken, requirePermission('canViewAllMessages'), async (req, res) => {
  // ... handler
});

app.put('/api/messages/:id/moderate', authenticateToken, requirePermission('canModerateMessages'), async (req, res) => {
  // ... handler
});

// ============================================
// HIGH: Evaluations
// ============================================

app.get('/api/evaluations', authenticateToken, requirePermission('canAccessEvaluations'), async (req, res) => {
  // ... handler
});

app.post('/api/evaluations', authenticateToken, requirePermission('canCreateEvaluations'), async (req, res) => {
  // ... handler
});

app.put('/api/evaluations/:id/review', authenticateToken, requirePermission('canReviewEvaluations'), async (req, res) => {
  // ... handler
});

app.put('/api/evaluations/:id/approve', authenticateToken, requirePermission('canApproveEvaluations'), async (req, res) => {
  // ... handler
});

app.put('/api/evaluations/:id', authenticateToken, requirePermission('canManageEvaluations'), async (req, res) => {
  // ... handler
});

// ============================================
// HIGH: Student Assignment
// ============================================

app.post('/api/students/:id/assign-teacher', authenticateToken, requirePermission('canManageStudentAssignments'), async (req, res) => {
  // ... handler
});

app.put('/api/students/:id/assign-teacher', authenticateToken, requirePermission('canManageStudentAssignments'), async (req, res) => {
  // ... handler
});
```

### Medium-Priority Routes (Copy-Paste Ready)

```javascript
// ============================================
// MEDIUM: Assessments
// ============================================

app.get('/api/assessments', authenticateToken, requirePermission('canViewAssessments'), async (req, res) => {
  // ... handler
});

app.post('/api/assessments', authenticateToken, requirePermission('canEditAssessments'), async (req, res) => {
  // ... handler
});

app.put('/api/assessments/:id', authenticateToken, requirePermission('canEditAssessments'), async (req, res) => {
  // ... handler
});

// ============================================
// MEDIUM: Reports
// ============================================

app.get('/api/reports', authenticateToken, requirePermission('canViewReports'), async (req, res) => {
  // ... handler
});

app.get('/api/analytics', authenticateToken, requirePermission('canViewAnalytics'), async (req, res) => {
  // ... handler
});

app.get('/api/reports/export', authenticateToken, requirePermission('canExportReports'), async (req, res) => {
  // ... handler
});

app.get('/api/system/stats', authenticateToken, requirePermission('canViewSystemStats'), async (req, res) => {
  // ... handler
});

app.get('/api/activity-logs', authenticateToken, requirePermission('canViewSystemStats'), async (req, res) => {
  // ... handler
});

app.get('/api/activity-logs/stats', authenticateToken, requirePermission('canViewSystemStats'), async (req, res) => {
  // ... handler
});

// ============================================
// MEDIUM: Attendance
// ============================================

app.get('/api/attendance', authenticateToken, requirePermission('canAccessAttendance'), async (req, res) => {
  // ... handler
});

app.post('/api/attendance', authenticateToken, requirePermission('canRecordAttendance'), async (req, res) => {
  // ... handler
});

app.get('/api/attendance/reports', authenticateToken, requirePermission('canViewAttendanceReports'), async (req, res) => {
  // ... handler
});

app.put('/api/attendance/:id', authenticateToken, requirePermission('canManageAttendance'), async (req, res) => {
  // ... handler
});

app.get('/api/teacher-attendance', authenticateToken, requirePermission('canAccessAttendance'), async (req, res) => {
  // ... handler
});

app.post('/api/teacher-attendance', authenticateToken, requirePermission('canRecordAttendance'), async (req, res) => {
  // ... handler
});

app.post('/api/teacher-attendance/bulk', authenticateToken, requirePermission('canRecordAttendance'), async (req, res) => {
  // ... handler
});

app.get('/api/teacher-attendance/stats/:teacherId', authenticateToken, requirePermission('canViewAttendanceReports'), async (req, res) => {
  // ... handler
});

app.delete('/api/teacher-attendance/:id', authenticateToken, requirePermission('canManageAttendance'), async (req, res) => {
  // ... handler
});

// ============================================
// MEDIUM: PDF
// ============================================

app.get('/api/pdfs', authenticateToken, requirePermission('canAccessPdf'), async (req, res) => {
  // ... handler
});

app.post('/api/pdfs', authenticateToken, requirePermission('canUploadPdf'), async (req, res) => {
  // ... handler
});

app.post('/api/pdfs/:id/annotate', authenticateToken, requirePermission('canAnnotatePdf'), async (req, res) => {
  // ... handler
});

app.get('/api/pdfs/:id/annotations', authenticateToken, requirePermission('canViewPdfAnnotations'), async (req, res) => {
  // ... handler
});

app.put('/api/pdfs/:id', authenticateToken, requirePermission('canManagePdfLibrary'), async (req, res) => {
  // ... handler
});

app.get('/api/pdfs/annotations/all', authenticateToken, requirePermission('canViewAllPdfAnnotations'), async (req, res) => {
  // ... handler
});

// ============================================
// MEDIUM: Homework
// ============================================

app.get('/api/homework', authenticateToken, requirePermission('canAccessHomework'), async (req, res) => {
  // ... handler
});

app.post('/api/homework', authenticateToken, requirePermission('canCreateHomework'), async (req, res) => {
  // ... handler
});

app.get('/api/homework/submissions', authenticateToken, requirePermission('canViewHomeworkSubmissions'), async (req, res) => {
  // ... handler
});

app.put('/api/homework/:id', authenticateToken, requirePermission('canManageHomework'), async (req, res) => {
  // ... handler
});

app.get('/api/homework/all', authenticateToken, requirePermission('canViewAllHomework'), async (req, res) => {
  // ... handler
});

app.get('/api/assignments', authenticateToken, requirePermission('canAccessAssignments'), async (req, res) => {
  // ... handler
});

app.get('/api/assignments/student/:studentId', authenticateToken, requirePermission('canAccessAssignments'), async (req, res) => {
  // ... handler
});

app.get('/api/assignments/:id', authenticateToken, requirePermission('canAccessAssignments'), async (req, res) => {
  // ... handler
});

app.post('/api/assignments/bulk', authenticateToken, requirePermission('canBulkCreateAssignments'), async (req, res) => {
  // ... handler
});

// ============================================
// MEDIUM: Recordings
// ============================================

app.get('/api/recordings', authenticateToken, requirePermission('canAccessRecordings'), async (req, res) => {
  // ... handler
});

app.post('/api/recordings/upload', authenticateToken, requirePermission('canUploadRecordings'), async (req, res) => {
  // ... handler
});

app.delete('/api/recordings/:id', authenticateToken, requirePermission('canDeleteRecordings'), async (req, res) => {
  // ... handler
});

app.get('/api/recordings/all', authenticateToken, requirePermission('canViewAllRecordings'), async (req, res) => {
  // ... handler
});

app.put('/api/recordings/:id', authenticateToken, requirePermission('canManageRecordings'), async (req, res) => {
  // ... handler
});

// ============================================
// MEDIUM: Mushaf
// ============================================

app.get('/api/mushaf', authenticateToken, requirePermission('canAccessMushaf'), async (req, res) => {
  // ... handler
});

app.post('/api/mistakes', authenticateToken, requirePermission('canMarkMistakes'), async (req, res) => {
  // ... handler
});

app.post('/api/mistakes/audio', authenticateToken, requirePermission('canMarkMistakes'), async (req, res) => {
  // ... handler
});

app.get('/api/mistakes/history', authenticateToken, requirePermission('canViewMistakeHistory'), async (req, res) => {
  // ... handler
});

app.put('/api/mistakes/library', authenticateToken, requirePermission('canManageMistakeLibrary'), async (req, res) => {
  // ... handler
});

app.get('/api/mistakes/all', authenticateToken, requirePermission('canViewAllMistakes'), async (req, res) => {
  // ... handler
});

app.put('/api/mushaf/settings', authenticateToken, requirePermission('canManageMushaf'), async (req, res) => {
  // ... handler
});

// ============================================
// MEDIUM: Qaidah
// ============================================

app.get('/api/qaidah', authenticateToken, requirePermission('canAccessQaidah'), async (req, res) => {
  // ... handler
});

app.get('/api/qaidah/progress', authenticateToken, requirePermission('canViewQaidahProgress'), async (req, res) => {
  // ... handler
});

app.put('/api/qaidah', authenticateToken, requirePermission('canManageQaidah'), async (req, res) => {
  // ... handler
});

app.get('/api/qaidah/reports', authenticateToken, requirePermission('canViewQaidahReports'), async (req, res) => {
  // ... handler
});

// ============================================
// MEDIUM: Notifications
// ============================================

app.get('/api/notifications', authenticateToken, requirePermission('canViewNotifications'), async (req, res) => {
  // ... handler
});

app.post('/api/notifications', authenticateToken, requirePermission('canManageNotifications'), async (req, res) => {
  // ... handler
});

app.post('/api/notifications/:id/send', authenticateToken, requirePermission('canSendNotifications'), async (req, res) => {
  // ... handler
});

app.put('/api/notifications/:id', authenticateToken, requirePermission('canManageNotifications'), async (req, res) => {
  // ... handler
});

// ============================================
// MEDIUM: Communication
// ============================================

app.post('/api/students/:id/contact-parent', authenticateToken, requirePermission('canContactParents'), async (req, res) => {
  // ... handler
});

// ============================================
// MEDIUM: Schedule
// ============================================

app.get('/api/schedule', authenticateToken, requirePermission('canManageSchedule'), async (req, res) => {
  // ... handler
});

app.put('/api/schedule', authenticateToken, requirePermission('canManageSchedule'), async (req, res) => {
  // ... handler
});
```

---

## 9. TESTING INSTRUCTIONS

### 9.1 Manual Testing Checklist

For each permission, test the following scenarios:

#### Backend Testing

**Test Case 1: Permission Denied (403)**
```
1. Login as user WITHOUT permission
2. Make API request to protected route
3. Expected: HTTP 403 with error message
4. Expected: { error: "Access denied...", permission: "permissionKey" }
```

**Test Case 2: Permission Granted (200)**
```
1. Login as user WITH permission
2. Make API request to protected route
3. Expected: HTTP 200 with data
4. Expected: Request succeeds normally
```

**Test Case 3: Superadmin Bypass (200)**
```
1. Login as superadmin
2. Make API request to protected route
3. Expected: HTTP 200 (bypasses all checks)
4. Expected: Request succeeds regardless of permissions
```

**Test Case 4: Old Token (Backward Compatibility)**
```
1. Use token created before Phase 3 (no permissions field)
2. Make API request to protected route
3. Expected: Falls back to DB lookup
4. Expected: Request succeeds if DB permissions allow
```

**Test Case 5: Permission Version Mismatch (401)**
```
1. Login as user with permission
2. Admin updates user's permissions (version increments)
3. Make API request with old token
4. Expected: HTTP 401 with PERMISSIONS_OUTDATED code
5. Expected: User auto-logged out
```

#### Frontend Testing

**Test Case 1: UI Element Disabled**
```
1. Login as user WITHOUT permission
2. Navigate to page with protected UI element
3. Expected: Element is disabled (not hidden)
4. Expected: Tooltip shows permission requirement
```

**Test Case 2: UI Element Enabled**
```
1. Login as user WITH permission
2. Navigate to page with protected UI element
3. Expected: Element is enabled and functional
4. Expected: No tooltip shown
```

**Test Case 3: Navigation Hidden**
```
1. Login as user WITHOUT permission
2. Navigate to sidebar/navigation
3. Expected: Protected nav items are hidden (hideIfDenied=true)
```

---

### 9.2 Automated Testing Recommendations

#### Unit Tests

```javascript
// Test requirePermission middleware
describe('requirePermission middleware', () => {
  it('should return 403 when user lacks permission', async () => {
    // Mock req.user without permission
    // Make request
    // Assert 403 response
  });
  
  it('should allow request when user has permission', async () => {
    // Mock req.user with permission
    // Make request
    // Assert 200 response
  });
  
  it('should bypass check for superadmin', async () => {
    // Mock req.user as superadmin
    // Make request
    // Assert 200 response
  });
});
```

#### Integration Tests

```javascript
// Test protected routes end-to-end
describe('Protected Routes', () => {
  it('should protect POST /api/teachers with canManageTeachers', async () => {
    // Login as user without permission
    // Attempt to create teacher
    // Assert 403
  });
  
  it('should allow POST /api/teachers with canManageTeachers', async () => {
    // Login as user with permission
    // Create teacher
    // Assert 200
  });
});
```

---

## 10. TIMELINE & ROADMAP

### Week 1: Critical Permissions (Days 1-3)

**Day 1:**
- [ ] Protect permission management routes
- [ ] Protect user creation routes
- [ ] Test permission management protection

**Day 2:**
- [ ] Protect user update/delete routes
- [ ] Implement PII filtering for student routes
- [ ] Test user management protection

**Day 3:**
- [ ] Complete PII access protection
- [ ] Test all critical routes
- [ ] Document any issues

**Deliverable:** All critical permissions protected

---

### Week 1-2: High-Priority Permissions (Days 4-7)

**Day 4:**
- [ ] Protect ticket workflow routes
- [ ] Test ticket permissions

**Day 5:**
- [ ] Protect message routes
- [ ] Test message permissions

**Day 6:**
- [ ] Protect evaluation routes
- [ ] Protect student assignment routes
- [ ] Test evaluation permissions

**Day 7:**
- [ ] Complete high-priority routes
- [ ] Test all high-priority permissions
- [ ] Document any issues

**Deliverable:** All high-priority permissions protected

---

### Week 2-3: Medium-Priority Permissions (Days 8-14)

**Days 8-9:**
- [ ] Protect assessment routes
- [ ] Protect report routes
- [ ] Protect attendance routes

**Days 10-11:**
- [ ] Protect PDF routes
- [ ] Protect homework routes
- [ ] Protect recording routes

**Days 12-13:**
- [ ] Protect Mushaf routes
- [ ] Protect Qaidah routes
- [ ] Protect notification routes

**Day 14:**
- [ ] Protect remaining routes (communication, schedule)
- [ ] Complete all medium-priority permissions
- [ ] Test all routes

**Deliverable:** All medium-priority permissions protected

---

### Week 3: Testing & Documentation (Days 15-21)

**Days 15-17:**
- [ ] Manual testing of all permissions
- [ ] Document test results
- [ ] Fix any issues found

**Days 18-19:**
- [ ] Write automated tests
- [ ] Set up CI/CD test runs
- [ ] Test permission versioning

**Days 20-21:**
- [ ] Final documentation
- [ ] Performance testing
- [ ] Security audit

**Deliverable:** 100% enforcement with full test coverage

---

## 11. IMPLEMENTATION NOTES

### Special Cases

#### 1. Conditional Permission Checks

Some routes need conditional checks (e.g., permission updates):

```javascript
app.put('/api/teachers/:id', authenticateToken, async (req, res) => {
  // Check if updating permissions
  if (req.body.permissions) {
    // Apply canManagePermissions check
    if (!req.user.permissions?.canManagePermissions && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied', permission: 'canManagePermissions' });
    }
  }
  // For other fields, apply canManageTeachers
  if (!req.body.permissions) {
    if (!req.user.permissions?.canManageTeachers && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied', permission: 'canManageTeachers' });
    }
  }
  // ... handler
});
```

#### 2. PII Filtering (Not Full Denial)

Student GET routes should filter PII, not deny access:

```javascript
app.get('/api/students', authenticateToken, async (req, res) => {
  const students = await Student.find();
  
  // Filter PII based on permissions
  const filtered = students.map(student => {
    const studentObj = student.toObject();
    
    if (!req.user.permissions?.canViewStudentEmail && req.user.role !== 'superadmin') {
      delete studentObj.email;
    }
    
    // ... filter other PII fields
    
    return studentObj;
  });
  
  res.json(filtered);
});
```

#### 3. Student Self-Access

Students should always access their own data:

```javascript
app.get('/api/students/:id', authenticateToken, async (req, res) => {
  const student = await Student.findById(req.params.id);
  
  // Students can always view their own data
  if (req.user.role === 'student' && student.userId === req.user.userId) {
    return res.json(student);
  }
  
  // For others, apply permission checks and filter PII
  // ... permission checks and filtering
});
```

#### 4. Admin Permission Mapping

Admins with `canManageAssignments` can perform assignment operations:

```javascript
// Already handled in requirePermission middleware
// Admins with canManageAssignments can:
// - Create assignments (canCreateAssignments)
// - Edit assignments (canEditAssignments)
// - Delete assignments (canDeleteAssignments)
```

---

## 12. DEAD PERMISSION LIST

### Complete List (27 Permissions)

#### Teacher Dead Permissions (12)

1. `canViewFinancials` - No financial routes
2. `canUploadPdf` - No PDF upload route
3. `canManageMistakeLibrary` - No mistake library route
4. `canManageQaidah` - No Qaidah management route
5. `canDeleteRecordings` - No recording delete route
6. `canViewAllRecordings` - No "view all" recordings route
7. `canCreateEvaluations` - No evaluation creation route
8. `canReviewEvaluations` - No evaluation review route
9. `canApproveEvaluations` - No evaluation approval route
10. `canExportReports` - No report export route
11. `canManageSchedule` - No schedule management routes
12. `canContactParents` - No parent contact route

#### Admin Dead Permissions (15)

1. `canManageFinancials` - No financial management routes
2. `canManagePdfLibrary` - No PDF library management route
3. `canViewAllPdfAnnotations` - No "view all" annotations route
4. `canManageHomework` - No homework management route
5. `canViewAllHomework` - No "view all" homework route
6. `canManageEvaluations` - No evaluation management route
7. `canManageTicketWorkflow` - No ticket workflow management route
8. `canManageAttendance` - No attendance management route
9. `canManageRecordings` - No recording management route
10. `canViewAllRecordings` - No "view all" recordings route
11. `canManageMushaf` - No Mushaf management route
12. `canViewAllMistakes` - No "view all" mistakes route
13. `canManageQaidah` - No Qaidah management route
14. `canViewQaidahReports` - No Qaidah reports route
15. `canBulkCreateAssignments` - No bulk assignment creation route

**Action Plan:**
- Document as "planned features"
- Create GitHub issues for implementation
- Keep in schema for future use
- Mark as "dead" in permission manager UI

---

## 13. SPLIT/DOWNGRADE IMPLEMENTATION PLAN

### Phase 8: Permission Refinement (Future)

#### Splitting High-Risk Permissions

**Timeline:** After Phase 7 completion

**Steps:**
1. Add new split permissions to `src/shared/permissions.ts`
2. Update database schemas
3. Migrate existing permissions
4. Update frontend components
5. Update backend routes
6. Test thoroughly

**New Permissions:**

```typescript
// Teacher Management - Split
canCreateTeachers: boolean;
canEditTeachers: boolean;
canDeleteTeachers: boolean;

// Student Management - Split
canCreateStudents: boolean;
canEditStudents: boolean;
canDeleteStudents: boolean;

// Financial Management - Split
canViewFinancials: boolean;    // Already exists
canEditFinancials: boolean;    // New
canManageBilling: boolean;     // New
```

#### Downgrading Defaults

**Timeline:** Can be done in Phase 7 (Low Priority)

**Steps:**
1. Update `src/shared/permissions.ts` defaults
2. Update `backend/shared/permissions.js` defaults
3. Update existing teachers (grant PII permissions explicitly)
4. Test new teacher registration
5. Document change

**Changes:**

```typescript
// In src/shared/permissions.ts
{
  key: 'canViewStudentEmail',
  defaultTeacher: false,  // Changed from true
  // ...
},
{
  key: 'canViewStudentContact',
  defaultTeacher: false,  // Changed from true
  // ...
},
{
  key: 'canViewStudentPersonalInfo',
  defaultTeacher: false,  // Changed from true
  // ...
}
```

---

## 14. SUCCESS METRICS

### Phase 7 Completion Criteria

- [ ] **100% Backend Enforcement:** All permissions protected on backend routes
- [ ] **Critical Gaps Closed:** Permission management, user management, PII access protected
- [ ] **High-Priority Protected:** Tickets, messages, evaluations protected
- [ ] **Medium-Priority Protected:** All other modules protected
- [ ] **Testing Complete:** Manual tests passed for all permissions
- [ ] **Documentation Complete:** All routes documented with permissions
- [ ] **Performance Maintained:** JWT fast-path preserved (no DB queries per request)
- [ ] **Backward Compatibility:** Old tokens still work via DB fallback

### Metrics to Track

- **Enforcement Coverage:** 100% (currently 4.2%)
- **Critical Routes Protected:** 15/15 (100%)
- **High-Priority Routes Protected:** 25/25 (100%)
- **Medium-Priority Routes Protected:** 60/60 (100%)
- **Test Coverage:** >80% automated tests
- **Performance Impact:** <5ms overhead per request

---

## 15. RISK MITIGATION

### Implementation Risks

1. **Breaking Changes:** Risk of breaking existing functionality
   - **Mitigation:** Incremental implementation, thorough testing
   - **Rollback Plan:** Git branches, feature flags

2. **Performance Impact:** Risk of slowing down API
   - **Mitigation:** JWT fast-path (no DB queries), caching
   - **Monitoring:** Track request latency

3. **Permission Conflicts:** Risk of permission logic errors
   - **Mitigation:** Comprehensive testing, code review
   - **Validation:** Automated tests for all permissions

4. **User Impact:** Risk of locking out legitimate users
   - **Mitigation:** Gradual rollout, user communication
   - **Support:** Clear error messages, admin override

---

## 16. CONCLUSION

Phase 7 will complete backend permission enforcement, bringing coverage from 4.2% to 100%. The implementation is organized by priority, with critical security gaps addressed first.

**Key Deliverables:**
- ✅ All routes protected with `requirePermission()`
- ✅ Critical permissions enforced (permission management, user management, PII)
- ✅ High-priority permissions enforced (tickets, messages, evaluations)
- ✅ Medium-priority permissions enforced (all other modules)
- ✅ Dead permissions documented
- ✅ Testing instructions provided
- ✅ Implementation roadmap with timeline

**Estimated Timeline:** 3 weeks
- Week 1: Critical + High Priority
- Week 2: Medium Priority
- Week 3: Testing & Documentation

**Next Steps:**
1. Review and approve Phase 7 plan
2. Begin Week 1 implementation
3. Test incrementally
4. Document as you go

---

**Report Generated:** 2026-01-09  
**Phase 7 Status:** 📋 **READY FOR IMPLEMENTATION**

