# MongoDB Audit: users, teachers, admins

Full audit of the `users`, `teachers`, and `admins` collections for mismatches and inconsistencies (Umar Academy LMS).

## How to run

From repo root:

```bash
# Default (stdout only)
node backend/scripts/auditMongoUsersTeachersAdmins.js

# Include sample record per category
node backend/scripts/auditMongoUsersTeachersAdmins.js --samples

# Write report to file
node backend/scripts/auditMongoUsersTeachersAdmins.js --output audit-report.txt

# Custom MongoDB URI
MONGODB_URI="mongodb+srv://..." node backend/scripts/auditMongoUsersTeachersAdmins.js
```

## What the audit checks

| Task | Description |
|------|-------------|
| **A. Teacher → User** | Teachers with missing/null `userId`; teachers whose `email` is not in `users.email`. |
| **B. User → Teacher** | Users with role `"teacher"` but no teacher document (`teachers.userId`). |
| **C. Duplicates** | Duplicate emails in `users`, `teachers`, and `admins` (case-insensitive). |
| **D. Orphaned users** | Users with role `teacher` or `admin`/`superadmin` with no corresponding teacher/admin doc. |
| **E. Teacher permissions** | Each teacher document’s `permissions` object; lists teachers with missing/incomplete keys (expected ~52 keys from `backend/shared/permissions.js`). |

## Output

- Counts and listings for each category above.
- **AUDIT SUMMARY** with totals.
- **QUERIES** section: MongoDB shell / Node.js snippets you can run manually to reproduce or drill down.

Optional `--samples` prints one sample record per category (JSON). Optional `--output <file>` writes the full report to a file.

## Collections

- **users** — Auth/identity; `email`, `role` (teacher/admin/superadmin/student).
- **teachers** — Teacher profile; `userId` (ref User), `email`, `permissions` (object with ~52 keys).
- **admins** — Admin profile; `userId` (ref User), `email`, `permissions`.

No backend or API code is changed; this is read-only.
