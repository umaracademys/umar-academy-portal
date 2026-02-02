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

---

## List API Response Format

### Current state

Backend list endpoints may return either:

- **Array format:** `T[]` (e.g. `[...]`)
- **Paginated format:** `{ items: T[], total?: number, page?: number }` or resource-specific keys (`students`, `teachers`, `assignments`, `tickets`, etc.)

### Frontend handling

The frontend uses `src/utils/normalizeList.ts` to safely extract arrays from any shape. It supports:

- Direct arrays
- `{ items: T[] }`
- `{ students: T[] }`, `{ teachers: T[] }`, `{ assignments: T[] }`, `{ tickets: T[] }`, `{ users: T[] }`, `{ admins: T[] }`, `{ notifications: T[] }`, `{ data: T[] }`

### Recommendation

For consistency and to avoid `forEach is not a function` crashes:

1. **Option A:** Standardize backend list responses to `{ items: T[], total?: number, page?: number }`
2. **Option B:** Always return arrays from list endpoints

The frontend will continue to handle both formats via `normalizeList`.
