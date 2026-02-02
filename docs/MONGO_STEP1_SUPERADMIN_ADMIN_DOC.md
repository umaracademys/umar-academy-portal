# Step 1 — Create the Superadmin Admin Document

Ensure the superadmin user (sadmin@umaracademy.org) has an **admin document** in the `admins` collection so the app can load permissions and show the admin UI.

---

## Option A — Run the script (recommended)

From repo root, with `MONGODB_URI` set (e.g. in `.env` or in the shell):

```bash
node backend/scripts/createSuperadminAdminDoc.js
```

- Looks up the user with email `sadmin@umaracademy.org`.
- Inserts an admin document with `userId` = that user’s `_id`, `fullName`, `email`, and **all 45 admin permission keys** (from `backend/shared/permissions.js`) set to `true`.
- Skips if an admin doc for that email already exists.
- Use `--dry-run` to preview the document without inserting.

---

## Option B — Manual insert (Compass / shell)

If you insert manually, use the **same 45 permission keys** the backend expects (see `backend/shared/permissions.js` → `ALL_ADMIN_PERMISSION_KEYS`). Example structure:

- **userId:** ObjectId of the **user** document for sadmin@umaracademy.org (from `users` collection).
- **email:** `sadmin@umaracademy.org`
- **fullName:** `Super Admin`
- **permissions:** Object with all 45 keys set to `true`, e.g.  
  `canManageTeachers`, `canManageStudents`, `canManageFinancials`, `canViewReports`, `canManagePermissions`, `canAccessMessages`, `canViewAllMessages`, `canModerateMessages`, `canAccessPdf`, `canManagePdfLibrary`, `canViewAllPdfAnnotations`, `canAccessHomework`, `canManageHomework`, `canViewAllHomework`, `canAccessEvaluations`, `canManageEvaluations`, `canApproveEvaluations`, `canAccessTickets`, `canCreateTickets`, `canReviewTickets`, `canApproveTickets`, `canFinalizeTickets`, `canManageTicketWorkflow`, `canAccessAttendance`, `canManageAttendance`, `canViewAttendanceReports`, `canAccessRecordings`, `canManageRecordings`, `canViewAllRecordings`, `canAccessMushaf`, `canManageMushaf`, `canViewAllMistakes`, `canAccessQaidah`, `canManageQaidah`, `canViewQaidahReports`, `canAccessAssignments`, `canManageAssignments`, `canBulkCreateAssignments`, `canManageStudentAssignments`, `canManageNotifications`, `canViewNotifications`, `canSendNotifications`, `canViewAnalytics`, `canExportReports`, `canViewSystemStats`.

Do **not** use the user’s `_id` as the admin document’s `_id`; the admin doc gets its own `_id`. The link is `admin.userId` = `user._id`.

---

## Verification

After creating the admin document:

1. Run the permissions audit:  
   `node backend/scripts/permissionsAuditAndFix.js --dry-run`  
   “Orphaned admin/superadmin users” should no longer include sadmin@umaracademy.org.
2. Log in as superadmin in the app and confirm full access (sidebar, permissions page, etc.).
