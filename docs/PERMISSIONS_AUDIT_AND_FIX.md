# Umar Academy Portal – Permissions Audit & Fix

Script: **backend/scripts/permissionsAuditAndFix.js**

## Goal

1. Ensure all teachers and admins have the correct permission keys (52 teacher keys, full admin set).
2. Automatically fix missing or misassigned permissions for teacher/admin documents.
3. Report orphaned users and duplicate emails; students and sidebar behavior are validated by reference (frontend enforces).

## Phases

### Phase 1: Load Data

- Fetches all **users**, **teachers**, **admins** from MongoDB.
- Loads **ALL_TEACHER_PERMISSION_KEYS** and **ALL_ADMIN_PERMISSION_KEYS** from `backend/shared/permissions.js`.
- Uses reference copies of **ROUTE_PERMISSIONS** (mirrors `src/utils/routePermissions.ts`) and **STUDENT_ALLOWED_IDS** (mirrors `src/modules/student/components/StudentSidebar.tsx`) for validation and reporting.

### Phase 2: Detect Issues

- **Teachers:** Missing any of the 52 teacher permission keys; Qaidah access is governed by `canAccessQaidah` (sidebar shows/hides accordingly).
- **Admins:** Missing any of the admin permission keys from `backend/shared/permissions.js`.
- **Students:** Sidebar is filtered by `allowedIds` in StudentSidebar; script reports student count and allowed ids (no DB change for students).
- **Orphaned users:** Users with `role=teacher` or `role=admin`/`superadmin` but no corresponding teacher/admin document.
- **Duplicate emails:** Duplicate emails in `users`, `teachers`, and `admins` (reported for manual resolution).

### Phase 3: Apply Fixes

- **Teachers:** Add missing permission keys with value **false** (boolean permissions). Existing keys are left unchanged.
- **Admins:** Add missing admin permission keys with value **false**.
- **Students:** No DB updates; frontend StudentSidebar filters by `allowedIds` only.
- **Orphaned users:** Logged only; optional `--fix-orphans` logs them (no automatic cleanup; create teacher/admin doc or change role manually).
- **Duplicates:** Logged only; resolve manually (choose first occurrence, merge or remove).

### Phase 4: Validation Summary

- Teachers fixed: count  
- Admins fixed: count  
- Students checked: count  
- Orphaned users found: count  
- Duplicate email groups found: count  

Use **`--dry-run`** to run Phases 1–2 and report only (no writes). Run without `--dry-run` to apply permission key fixes.

### Phase 5: Integration Check (manual)

After running the script and refreshing the app:

1. **Teacher/Admin sidebars:** Confirm only allowed links show (per `usePermission` / admin permissions).
2. **Student sidebar:** Confirm only allowed items show: Dashboard, Assignments, Messages, Profile, PDF Homework, Courses, Progress, Payments.
3. **Route protection:** Visiting a route without permission (e.g. teacher opening `/teachers`) redirects to `/unauthorized`.
4. **Students:** Visiting `/teachers` or non-student dashboard redirects to `/student/dashboard` or login.
5. **Qaidah:** Link shown only when user has `canAccessQaidah` (teacher/admin) or is superadmin.

## Usage

Run from repo root. Requires MongoDB connection (`MONGODB_URI` from `.env` or environment).

### 1. Set your MongoDB URI in .env (recommended)

Create or update `.env` in your repo root:

```env
MONGODB_URI='mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/umar-academy-portal?retryWrites=true&w=majority'
```

This avoids quoting issues and lets all scripts pick up the URI automatically. Use single quotes in zsh to prevent parsing issues.

### 2. Run in dry-run mode (report only, no DB writes)

```bash
node backend/scripts/permissionsAuditAndFix.js --dry-run
```

- Detects missing teacher/admin keys  
- Checks student sidebar allowedIds  
- Logs orphaned users & duplicates  
- No changes applied  

### 3. Apply missing permission keys (teachers/admins)

```bash
node backend/scripts/permissionsAuditAndFix.js
```

- Adds missing keys with default `false`  
- Existing keys remain unchanged  
- Student nav & duplicates remain read-only  

### 4. Log orphaned users only (no auto-cleanup)

```bash
node backend/scripts/permissionsAuditAndFix.js --fix-orphans
```

- Lists users with role teacher or admin/superadmin without matching document  
- No deletion is performed  

### 5. Run with custom MongoDB URI (optional)

```bash
MONGODB_URI='your_real_uri_here' node backend/scripts/permissionsAuditAndFix.js --dry-run
```

- Do **not** paste `"mongodb+srv://..."` literally (that placeholder causes DNS errors).  
- Use your real URI and wrap it in **single quotes** in zsh to prevent parsing issues.

## Phase 5 checklist (manual integration check)

After running the script and refreshing the app, confirm:

1. **Teacher/Admin sidebars** show only allowed links (per `usePermission` / admin permissions).
2. **Student sidebar** shows only allowed items: Dashboard, Assignments, Messages, Profile, PDF Homework, Courses, Progress, Payments.
3. **Unauthorized routes** redirect to `/unauthorized` (e.g. teacher opening `/teachers`).
4. **Students** cannot access teacher/admin routes; they redirect to `/student/dashboard` or login.
5. **Qaidah link** appears only when user has `canAccessQaidah` or is superadmin.
