# Backend scripts

These scripts are for **manual use only** (diagnostics, fixes, migrations, seeding). They are not used by the running server.

**Run from repo root:**

```bash
node backend/scripts/legacy/scriptName.js
# e.g. node backend/scripts/legacy/checkUser.js user@example.com
```

**Before running against production:** See **Step 0 — Preparation** in `docs/MONGO_PREPARATION_STEP0.md` (get MongoDB URI, backup DB, then run scripts with `MONGODB_URI` set).

See `docs/audits/DEVELOPER_ACCESS_GUIDE.md` and other docs in `docs/` for usage.

---

## Active scripts

Scripts used by **npm or production flows** live in **`backend/` root**, not in this folder:

- `seedDatabase.js` — `pnpm run seed` (from backend)
- `clearDatabase.js` — `pnpm run clear` (from backend)
- `migrateSqliteToMongo.js` — `pnpm run migrate-quran` (from backend)
- `migrateQuranFromApi.js` — `pnpm run migrate-quran-api` (from backend)
- `createDeveloper.js` — root `pnpm run create-developer`
- `createDeveloperProduction.js` — root `pnpm run create-developer:prod`
- `checkDeveloperAccount.js` — root `pnpm run check-developer`
- `createTestUsers.js` — root `pnpm run setup:test-users`
- `production-test.js` — root `pnpm run test:production`

None of the files in `backend/scripts/` or `backend/scripts/legacy/` are referenced by npm scripts.

---

## Audit scripts

- **auditMongoUsersTeachersAdmins.js** — Full audit of `users`, `teachers`, and `admins` collections: missing `userId`, email mismatches, orphaned users, duplicate emails, teacher permission key completeness. Run from repo root: `node backend/scripts/auditMongoUsersTeachersAdmins.js`. Use `--samples` to include sample records, `--output report.txt` to write the report to a file.
- **removeDuplicateEmails.js** — Removes duplicate emails in `users`, `teachers`, and `admins`, keeping the earliest document (by `createdAt`) per email. Run: `node backend/scripts/removeDuplicateEmails.js`. Use `--dry-run` to report what would be deleted without deleting.
- **mergeDuplicateEmails.js** — Merges duplicate emails: keeps one user per email (earliest), repoints Admin/Teacher/Student `userId` to that user and deletes duplicate users; merges admin/teacher permissions (true wins) and keeps one doc per email. Run: `node backend/scripts/mergeDuplicateEmails.js`. Use `--dry-run` to preview, `--email faheem@gmail.com` to merge only that email.
- **fixTeacherUserLinks.js** — Matches teachers to users by email and sets/fixes `teacher.userId`. Reports teachers with no matching user and emails with multiple users. Run: `node backend/scripts/fixTeacherUserLinks.js`. Use `--dry-run` to report only, no updates.
- **permissionsAuditAndFix.js** — Permissions audit and fix: ensures all teachers have 52 permission keys and admins have full admin permission set; adds missing keys (default false). Reports orphaned users and duplicate emails. Run: `node backend/scripts/permissionsAuditAndFix.js`. Use `--dry-run` to report only (no DB writes), `--fix-orphans` to log orphaned users (no auto-cleanup).
- **auditRolePermissionConsistency.js** — Audit user role vs permission inconsistencies: students must not have teacher/admin permissions; teachers need all 52 keys; admins need all 45 keys; orphaned users and duplicate emails. Run: `node backend/scripts/auditRolePermissionConsistency.js --dry-run`. Flags: `--fix-missing` (add missing keys as false), `--fix-student` (remove invalid permissions on student users), `--fix-orphans` (log orphaned), `--fix-duplicates` (log duplicates).
- **removeAdminByEmail.js** — Remove an admin (and their user account) by email. Deletes from both `admins` and `users`. Run: `node backend/scripts/removeAdminByEmail.js <email>`. Use `--dry-run` to report only.
- **deleteOrphanedAdminUsers.js** — Delete specific orphaned users (role=admin/superadmin, no matching admin/teacher doc) from `users` only. Target emails: test@umaracademy.com, developer@test.com, admin@umaracademy.com. Run: `node backend/scripts/deleteOrphanedAdminUsers.js`. Use `--dry-run` to preview.
- **createSuperadminAdminDoc.js** — Create an admin document for the superadmin user (sadmin@umaracademy.org) with all 45 permissions set to true; links to existing User. Run: `MONGODB_URI="..." node backend/scripts/createSuperadminAdminDoc.js`. Use `--dry-run` to preview.

---

## Legacy scripts

All one-off / admin / ops scripts are archived in **`backend/scripts/legacy/`**:

- addTeacher.js, addTeacherForUser.js  
- checkAllStudents.js, checkAllUsers.js, checkAssignments.js, checkDatabase.js, checkDataSaved.js  
- checkEmail.js, checkEvaluation.js, checkProductionStudents.js, checkSpecificUser.js  
- checkStudents.js, checkSuperAdmin.js, checkUser.js  
- createAdminProfile.js, createAdminUser.js, createDeveloperViaAPI.js, createMissingTeachers.js, createStudentUser.js  
- exportToLocalMongo.js, exportToLocalMongoWithDump.js  
- fixAllUserLogins.js, fixLockedAccounts.js, fixPasswordMismatches.js, fixProductionUserLogins.js  
- fixStudentLogins.js, fixSuperAdminEmail.js  
- investigateDuplicateAdmins.js  
- migrateMessages.js, mongoShell.js  
- populateMongoFromPublicDb.js  
- resetPassword.js, resetStudentPassword.js, resetSuperAdminLockout.js, resetSuperAdminPassword.js  
- searchSaria.js, syncProductionStudents.js  
- testEndpoints.js, testMongoConnection.js  
- unlockAccount.js, updateSuperAdminPassword.js, updateUserPasswords.js  
- verifyMongoConnection.js, verifyProductionMongo.js, verifyStudentList.js  

Each has a deprecation comment at the top. **Do not import legacy scripts in production code unless explicitly required for historical/manual operations.**

---

## Experimental scripts

There is no separate `backend/scripts/experimental/` folder. Test or ad-hoc scripts (e.g. `testEndpoints.js`, `testMongoConnection.js`) are in **`backend/scripts/legacy/`**.

---

**Legacy models:** Models in `backend/models/legacy/` are archived. Do not use in production unless explicitly needed (e.g. migrations or historical scripts).
