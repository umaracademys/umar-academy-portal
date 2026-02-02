# Security Model — Umar Academy Portal

**Last updated:** 2025-02-01

---

## Roles (M5: Canonical List)

| Role | Description |
|------|-------------|
| `student` | Enrolled learner; limited to own data |
| `teacher` | Instructor; scoped by assigned students and permissions |
| `admin` | Administrator; scoped by permissions |
| `superadmin` | Full system access |

**Note:** User schema `role` field has no enum enforced yet. The canonical list above is the source of truth. Invalid roles can cause orphaned users; consider enum in future.

---

## Permissions

- **Teacher permissions:** `backend/shared/permissions.js` — `ALL_TEACHER_PERMISSION_KEYS`
- **Admin permissions:** `backend/shared/permissions.js` — `ALL_ADMIN_PERMISSION_KEYS`
- **Mirrors:** `src/shared/permissions.ts` (frontend)

---

## Ownership Rules

| Resource | Self | Teacher | Admin | Superadmin |
|----------|------|---------|-------|------------|
| Own profile (GET/PUT /api/users/:id) | ✓ | — | ✓ | ✓ |
| Own user details (/api/users/:id/details) | ✓ | — | ✓ | ✓ |
| List users | — | canManageTeachers | ✓ | ✓ |
| List students | — | canManageStudents | ✓ | ✓ |
| List teachers | — | canManageTeachers | ✓ | ✓ |
| List admins | — | — | ✓ | ✓ |
| Own attendance (teacher) | ✓ | ✓ (shared only) | canManageAttendance | ✓ |
| Other teacher attendance | — | ✗ | canManageAttendance | ✓ |
| Own evaluations (weekly) | — | ✓ (owner) | ✓ | ✓ |
| Recitation reviews list | — | canViewEvaluations | ✓ | ✓ |

---

## Auth Model

- JWT via `authenticateToken` middleware
- Role and permissions attached to `req.user` after auth
- `requirePermission(key)` enforces permission checks
- `requireAdminOrSuperadmin`, `requireUsersListAccess` for role-based routes

---

## M7: Ticket tajweedIssues Enum Consistency

| Location | Enum values | Notes |
|----------|-------------|-------|
| Root ticket (`ticketSchema`) | heavy_letters, fatha_not_vertical, kasrah_not_horizontal, clarity_compromised, lack_of_confidence, incorrect_stops, ghunnah_error, qalqalah_error, idgham_error, madd_error, **tajweed_rule_violation**, **other** | Includes `other` |
| sabqEntries (`tajweedIssues`) | Same list **without** `other` | Mismatch documented |

**Recommendation:** Align enums in future schema update. Do not modify schema in this phase.
