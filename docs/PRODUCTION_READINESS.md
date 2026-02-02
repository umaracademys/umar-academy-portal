# Production Readiness — Umar Academy Portal

**Last updated:** 2025-02-01  
**Branch:** audit-hardening-jan-2025

---

## What is secure

- Critical access control: users, students, admins, listening sessions, AI suggestions
- High-priority fixes: activity log limit cap, recitation reviews permission, teacher attendance scoping
- List endpoints paginated and capped (default 50, max 200)
- User profile: self or admin/superadmin only
- Teacher attendance: teachers see only own shared records; admins require canManageAttendance
- Defensive fallbacks for `fullName` / `name` in frontend

---

## What is intentionally open

| Endpoint/Area | Reason |
|---------------|--------|
| GET /api/maintenance | Public; for "under maintenance" banner |
| GET /api/quran/* | Quran data may be intentionally public (product decision) |
| GET /api/students (with canManageStudents) | Teachers/admins with permission can list |
| GET /api/recitation-reviews (with canViewEvaluations) | Teachers/admins with permission |

---

## What is deferred

| Item | Location | Reason |
|------|----------|--------|
| C3: Student/Teacher `courses` ref | Schema | No Course model; product decision needed (define Course vs remove field) |
| M5: User.role enum | Schema | Documented in SECURITY_MODEL.md; no enum yet |
| M7: tajweedIssues enum alignment | Schema | Root has `other`; sabqEntries do not; document only |
| H1: User.fullName schema | Schema | Fallbacks added; no schema change |
| Index recommendations | DB | M8, L8 — verify with production query patterns |

---

## Pre-merge checklist

- [ ] Run audit scripts (dry-run)
- [ ] Manual test: Student login → confirm blocked admin routes
- [ ] Manual test: Teacher login → confirm scoped data
- [ ] Manual test: Admin login → confirm full access
- [ ] Confirm no unintended schema diffs
