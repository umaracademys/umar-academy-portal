# Audit: User Role vs Permission Consistency

Script: **backend/scripts/auditRolePermissionConsistency.js**

## Goal

Audit the database for user role vs permission inconsistencies and optionally apply fixes.

## Rules

1. **Users** have roles: `student`, `teacher`, `admin`, `superadmin`.
2. **Students:** Must not have any teacher/admin permissions. Only STUDENT_ALLOWED_IDS (nav items) are allowed; any teacher/admin permission key on the user document is invalid.
3. **Teachers:** Must have all 52 teacher permission keys (in the teacher document). Missing keys are reported.
4. **Admins:** Must have all 45 admin permission keys (in the admin document). Missing keys are reported.
5. **Superadmin:** Full access; no permission checks. Orphaned check: superadmin with no admin document is logged.
6. **Orphaned users:** Role = teacher, admin, or superadmin with **no matching teacher/admin document**.
7. **Duplicate emails:** Case-insensitive duplicates in users, teachers, and admins.
8. **Role-permission mismatches:**
   - Student with teacher/admin permission keys → report (and optionally strip with `--fix-student`).
   - Teacher with missing permission keys → report (and optionally add with `--fix-missing`).
   - Admin with missing permission keys → report (and optionally add with `--fix-missing`).

## Output

- **Summary table:** Users checked, teachers with missing permissions, admins with missing permissions, students with invalid permissions, orphaned users, duplicate email groups.
- **Detailed report:** For each user with issues: userId, email, role, type of issue, missing/invalid permissions.
- **Suggestions:** Add missing keys (false), remove invalid keys for students, investigate orphaned users, resolve duplicate emails.

## Flags

| Flag | Effect |
|------|--------|
| `--dry-run` | Only report; no database writes. |
| `--fix-missing` | Auto-add missing teacher/admin permission keys (set to false). |
| `--fix-student` | Auto-remove invalid permission keys for students (unsets `permissions` on User). |
| `--fix-orphans` | Log orphaned users (no auto-cleanup). |
| `--fix-duplicates` | Log duplicate email groups (manual merge recommended). |

## Usage

```bash
# Report only (no writes)
node backend/scripts/auditRolePermissionConsistency.js --dry-run

# Add missing keys for teachers/admins
node backend/scripts/auditRolePermissionConsistency.js --fix-missing

# Strip invalid permissions from students
node backend/scripts/auditRolePermissionConsistency.js --fix-student

# Log orphaned users and duplicates
node backend/scripts/auditRolePermissionConsistency.js --fix-orphans --fix-duplicates

# Combine (e.g. fix missing + log orphaned); use without --dry-run to apply
node backend/scripts/auditRolePermissionConsistency.js --fix-missing --fix-orphans
```

Run from repo root. Requires `MONGODB_URI` (e.g. in `.env`).
