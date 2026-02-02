# Comprehensive Read-Only Audit Report — Umar Academy Portal (MERN)

**Date:** 2025-01-30  
**Scope:** Schema, routes, permissions, frontend usage, data health, performance & safety  
**Rules:** No data or schema changes applied. Reports only. Await approval before fixes.

---

## Summary by Severity

| Severity | Count |
|----------|-------|
| 🔴 Critical | 6 |
| 🟠 High | 10 |
| 🟡 Medium | 12 |
| 🟢 Low / Cleanup | 8 |

---

# 🔴 CRITICAL (must fix)

## C1. Routes return full user list to any authenticated user
- **Module:** API / Users  
- **File:** `backend/server.js`  
- **Line:** ~3178  
- **Why:** `GET /api/users` uses only `authenticateToken`. Any logged-in user (including students) can list all users (emails, roles, IDs). Passwords are excluded but PII and account enumeration are exposed.  
- **Recommendation:** Add role check (admin/superadmin only) or `requirePermission('canManageTeachers')` (or a dedicated “view users” permission). Document intended access model.

## C2. Listening session endpoints have no authentication
- **Module:** API / Listening sessions  
- **File:** `backend/server.js`  
- **Lines:** 11473 (PATCH), 11528 (POST end), 11562 (GET history), 11612 (DELETE), 11630 (DELETE by date)  
- **Why:** `PATCH /api/listening-sessions/:id`, `POST .../id/end`, `GET .../history`, `DELETE .../id`, `DELETE .../date/:date` are called without `authenticateToken`. Anyone can read, update, or delete listening sessions.  
- **Recommendation:** Add `authenticateToken` (and ownership/permission checks where appropriate) to all listening-session routes. Confirm intended audience (teacher/student/admin) and add corresponding permission guards.

## C3. Broken ObjectId reference: Student/Teacher `courses` ref to non-existent Course model
- **Module:** Schema  
- **File:** `backend/server.js`  
- **Lines:** 1682 (Student), 1922 (Teacher)  
- **Why:** `courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]` references a `Course` model that is never defined in the backend. Populate/validation can fail; referential integrity is undefined.  
- **Recommendation:** Either define a `Course` model and use it, or remove the `courses` field from both schemas and migrate data/references. Do not change data until schema strategy is decided.

## C4. GET /api/students and GET /api/admins without permission guard
- **Module:** API  
- **File:** `backend/server.js`  
- **Lines:** ~3303 (students), ~4633 (admins)  
- **Why:** Both use only `authenticateToken`. Any authenticated user can list all students (PII is filtered in handler but list membership is exposed) and all admins.  
- **Recommendation:** Protect `GET /api/students` with a permission (e.g. `canManageStudents` or “view students”) and `GET /api/admins` with admin/superadmin-only or a dedicated permission. Align with frontend route permissions.

## C5. PUT /api/users/:id has no permission or ownership check
- **Module:** API  
- **File:** `backend/server.js`  
- **Line:** ~6003  
- **Why:** Any authenticated user can update any user’s profile (name, email, role, etc.) by ID.  
- **Recommendation:** Restrict to self (same `req.user.userId`) for non-sensitive fields, or require admin/superadmin (or `canManageTeachers`) for full updates. Enforce in middleware or handler.

## C6. POST /api/ai/suggestions has no authentication
- **Module:** API / AI  
- **File:** `backend/server.js`  
- **Line:** ~13175  
- **Why:** `POST /api/ai/suggestions` is called without `authenticateToken`. Unauthenticated callers can hit the AI suggestion endpoint (abuse/cost/rate limits).  
- **Recommendation:** Add `authenticateToken` and, if needed, permission or rate limiting specific to this endpoint.

---

# 🟠 HIGH

## H1. User schema lacks `fullName` while scripts/APIs use it
- **Module:** Schema / Users  
- **File:** `backend/server.js` (userSchema ~1197)  
- **Why:** Audit scripts and possibly API responses use `user.fullName`. Schema only has `name`. If DB or clients send `fullName`, it may be dropped on save (strict mode) or inconsistent across reads.  
- **Recommendation:** Add `fullName: String` to User schema if the app treats it as first-class; otherwise standardize on `name` everywhere and stop using `fullName`. Document and align scripts.

## H2. POST /api/tickets/bulk-delete has no permission check
- **Module:** API  
- **File:** `backend/server.js`  
- **Line:** ~8656  
- **Why:** Only `authenticateToken` is used. Any authenticated user can bulk-delete tickets.  
- **Recommendation:** Add `requirePermission('canManageTicketWorkflow')` or equivalent and optionally scope by ownership/role.

## H3. GET /api/users/:id and GET /api/users/:id/details — no ownership or permission check
- **Module:** API  
- **File:** `backend/server.js`  
- **Lines:** ~3286, ~6436  
- **Why:** Any authenticated user can read any user’s details by ID.  
- **Recommendation:** Allow only self for non-admins, or require admin/superadmin (or a “view user” permission) for viewing other users.

## H4. Activity log list accepts unbounded `limit` from query
- **Module:** API / Activity logs  
- **File:** `backend/server.js`  
- **Lines:** 2950–2979  
- **Why:** `limit` is taken from `req.query` with default 100 but no maximum. A client can send `limit=999999` and cause large responses and load.  
- **Recommendation:** Cap `limit` (e.g. `Math.min(parseInt(limit) || 100, 500)`) and validate/sanitize `page` to avoid negative or huge skip.

## H5. GET /api/recitation-reviews has no permission check
- **Module:** API  
- **File:** `backend/server.js`  
- **Line:** ~7500  
- **Why:** Uses only `authenticateToken`. Any authenticated user can list recitation reviews (paginated).  
- **Recommendation:** Add `requirePermission('canCreateEvaluations')` or `canViewEvaluations` (or equivalent) if this is intended for teachers/admins only.

## H6. Unbounded list endpoints (no .limit) for users, students, teachers, admins
- **Module:** API  
- **File:** `backend/server.js`  
- **Lines:** 3189 (User.find({})), 3306 (Student.find({})), 3361–3362 (allStudents/allTeachers), 3632 (Teacher.find({})), 4636 (Admin.find({}))  
- **Why:** These list endpoints return full collections. As data grows, response size and memory use can become unacceptable.  
- **Recommendation:** Introduce server-side pagination (e.g. `page`, `limit` with a max limit) for `/api/users`, `/api/students`, `/api/teachers`, `/api/admins` and document default/max page size.

## H7. PUT /api/weekly-evaluations/:id has no permission check
- **Module:** API  
- **File:** `backend/server.js`  
- **Line:** ~12037  
- **Why:** Only `authenticateToken`. Any authenticated user can update any weekly evaluation by ID.  
- **Recommendation:** Add ownership (teacher who created it) or `requirePermission('canCreateEvaluations')` / `canEditEvaluations` and optionally scope by teacher/student.

## H8. Teacher attendance list endpoints without permission
- **Module:** API  
- **File:** `backend/server.js`  
- **Lines:** 5501 (GET test), 5737 (GET list), 5833 (GET stats)  
- **Why:** Only `authenticateToken` (or ownership for teacher-specific). Teachers could see other teachers’ attendance if IDs are guessable or list is unfiltered.  
- **Recommendation:** Ensure list/stats are scoped to current user (teacher) or add `requirePermission('canManageAttendance')` for admin-style listing.

## H9. POST /api/ai/phrases/init-categories has no authentication
- **Module:** API  
- **File:** `backend/server.js`  
- **Line:** ~14113  
- **Why:** Unauthenticated callers can trigger init of AI phrase categories (possible abuse or accidental calls).  
- **Recommendation:** Add `authenticateToken` and restrict to admin/superadmin or a specific permission if this is an admin-only operation.

## H10. Regex on activity log email — ensure escape and index
- **Module:** API  
- **File:** `backend/server.js`  
- **Line:** 2965  
- **Why:** `query.userEmail = { $regex: escapeRegex(email), $options: 'i' }` — escapeRegex is used (good). Case-insensitive regex on large ActivityLog collection may not use index.  
- **Recommendation:** Confirm ActivityLog has an index that supports this query (e.g. `userEmail: 1`) or consider normalized lower-case field + equality. No schema change in this audit; only recommend index review.

---

# 🟡 MEDIUM

## M1. Student schema pre-save logs “dropped” fields but does not reject
- **Module:** Schema  
- **File:** `backend/server.js`  
- **Lines:** 1722–1739  
- **Why:** Unknown fields are logged as “schema drift” but still accepted (no strict reject). Drift can accumulate and mask real schema bugs.  
- **Recommendation:** Decide policy: either enforce strict schema (reject unknown fields) in a controlled migration, or keep logging and add alerts/monitoring; document the decision.

## M2. ROUTE_PERMISSIONS (frontend) does not cover all protected routes
- **Module:** Frontend / Permissions  
- **File:** `src/utils/routePermissions.ts`  
- **Why:** Only a subset of routes (e.g. `/assignments`, `/students`, `/teachers`, `/permissions`, `/messages`, `/teacher-attendance`, `/pdf-teaching`, `/mushaf/review`) are in ROUTE_PERMISSIONS. Other admin/teacher routes (e.g. evaluations, tickets, recordings, qaidah) may be guarded only by generic auth.  
- **Recommendation:** Audit all teacher/admin routes in the app and add entries to ROUTE_PERMISSIONS (or document which routes are “auth only” by design).

## M3. GET /api/teacher-attendance/teacher/:teacherId — ownership but no permission for admins
- **Module:** API  
- **File:** `backend/server.js`  
- **Line:** ~5790  
- **Why:** Uses `validateTeacherOwnership` so teachers see only their own attendance. Admins with “manage attendance” may need to see any teacher’s attendance; confirm behavior.  
- **Recommendation:** If admins should see any teacher’s attendance, allow when `requirePermission('canManageAttendance')` and pass teacherId; otherwise document that only self is allowed.

## M4. GET /api/maintenance is public
- **Module:** API  
- **File:** `backend/server.js`  
- **Line:** ~10998  
- **Why:** `GET /api/maintenance` has no auth. Maintenance status may be intentionally public for “under maintenance” pages; if it leaks internal info, that’s a concern.  
- **Recommendation:** If response is safe for public, document; otherwise protect with auth or remove sensitive details.

## M5. User schema: `role` has no enum
- **Module:** Schema  
- **File:** `backend/server.js`  
- **Line:** ~1199  
- **Why:** `role: String` allows any value. Typos or invalid roles can cause orphaned users or broken role checks.  
- **Recommendation:** Add `enum: ['student', 'teacher', 'admin', 'superadmin']` (or current canonical list) after confirming all valid roles. No data change in this audit.

## M6. Assignment schema references QaidahMark and QaidahStudentLearning
- **Module:** Schema  
- **File:** `backend/server.js`  
- **Lines:** 6703–6704  
- **Why:** `qaidahMarkId` and `learningObjectiveId` reference QaidahMark and QaidahStudentLearning. If those IDs are ever invalid or deleted, references become dangling.  
- **Recommendation:** Run a read-only check for assignments with non-existent QaidahMark/QaidahStudentLearning IDs; document whether application logic prevents orphans. Consider soft-delete or validation on write.

## M7. ticketSchema.tajweedIssues enum missing 'tajweed_rule_violation' in one sub-schema
- **Module:** Schema  
- **File:** `backend/server.js`  
- **Lines:** 6825 (root tajweedIssues) vs 6854 (sabqEntries.tajweedIssues)  
- **Why:** Root-level tajweedIssues use enum including 'tajweed_rule_violation'; sabqEntries.tajweedIssues use a similar enum — verify they match. Inconsistent enums can cause validation errors when moving data between levels.  
- **Recommendation:** Align all tajweedIssues enums (root and sabqEntries) to the same list and add a single shared constant if possible. No data change here.

## M8. ListeningSession schema — no index on status + endedAt for history query
- **Module:** Schema / Performance  
- **File:** `backend/server.js`  
- **Line:** ~7205 (ListeningSession schema)  
- **Why:** History endpoint filters by `status: { $in: ['completed', 'abandoned'] }` and `endedAt`. Missing compound index may cause collection scans as data grows.  
- **Recommendation:** Add compound index e.g. `{ status: 1, endedAt: -1 }` for the history query. Verify in MongoDB.

## M9. Frontend permission keys vs backend — single source of truth
- **Module:** Permissions  
- **Files:** `backend/shared/permissions.js`, `src/shared/permissions.ts`  
- **Why:** Backend and frontend each define ALL_TEACHER_* and ALL_ADMIN_* keys. Duplication risks drift (e.g. new key on frontend only).  
- **Recommendation:** Document process for adding permissions (e.g. “add to both files and run audit script”). Consider codegen or shared package in future; no change in this audit.

## M10. Student.courses and Teacher.courses — unused or legacy?
- **Module:** Schema  
- **File:** `backend/server.js`  
- **Why:** `courses` array exists but Course model is missing (see C3). If no code path reads/writes `courses`, they are dead fields.  
- **Recommendation:** Grep codebase for reads/writes to `student.courses` / `teacher.courses`. If unused, plan removal after C3 resolution; if used, implement Course model or replace with another structure.

## M11. GET /api/quran/* routes are unauthenticated
- **Module:** API  
- **File:** `backend/server.js`  
- **Lines:** 14609, 14816, 14861, 14983, 15205, 15364, 15394, 15603, 15684  
- **Why:** Quran data may be intentionally public. If so, no change; if not, these expose data without auth.  
- **Recommendation:** Confirm product decision: public vs authenticated. Document and, if needed, add auth.

## M12. POST /api/email/send and GET /api/email/config
- **Module:** API  
- **File:** `backend/server.js`  
- **Lines:** 15979, 16047  
- **Why:** Email send/config may be used by backend only or admin; if exposed without auth, risk of abuse (e.g. spam, config leak).  
- **Recommendation:** Confirm which clients call these; add auth and permission if called from frontend or untrusted clients.

---

# 🟢 LOW / CLEANUP

## L1. Redundant or overlapping indexes (User)
- **Module:** Schema  
- **File:** `backend/server.js`  
- **Lines:** 1220–1224  
- **Why:** User has both `{ email: 1 }` unique and `{ email: 1, role: 1 }`. For queries that filter only by email, the single-field index suffices; compound can be redundant unless role+email queries are common.  
- **Recommendation:** Profile queries; if no role+email compound queries, consider dropping compound to reduce write cost. Low priority.

## L2. WeeklyEvaluation schema — many optional nested fields
- **Module:** Schema  
- **File:** `backend/server.js`  
- **Lines:** 1347–1443  
- **Why:** Large nested structure with legacy aliases (e.g. fixingEtiquette) and optional fields. Harder to validate and document.  
- **Recommendation:** Document required vs optional per workflow; consider splitting or versioning if evals evolve. No change in audit.

## L3. Backend scripts use minimal schemas (strict: false)
- **Module:** Scripts  
- **Files:** e.g. `backend/scripts/removeDuplicateEmails.js`, `mergeDuplicateEmails.js`, `deleteOrphanedAdminUsers.js`  
- **Why:** Scripts define minimal schemas with `strict: false` for flexibility. Acceptable for one-off scripts but can hide field name errors.  
- **Recommendation:** Keep for scripts; ensure production server uses full schemas. Add a one-line comment in script headers that they are not the source of truth for schema.

## L4. rateLimiting: combinedListEndpointLimiter definition
- **Module:** Middleware  
- **File:** `backend/middleware/rateLimiting.js` (assumed)  
- **Why:** List endpoints use `combinedListEndpointLimiter`; exact window and max not seen in this audit.  
- **Recommendation:** Document rate limits (per window, per IP) for list endpoints and ensure they are strict enough in production.

## L5. ActivityLog schema — details as Mixed
- **Module:** Schema  
- **File:** `backend/server.js`  
- **Line:** ~2021  
- **Why:** `details: mongoose.Schema.Types.Mixed` allows arbitrary structure. Flexible but no validation.  
- **Recommendation:** Keep for flexibility; document expected shapes per eventType and consider validation in logging helper. Optional.

## L6. Student and Teacher schemas — both have assignedTeacher* legacy fields
- **Module:** Schema  
- **File:** `backend/server.js`  
- **Why:** assignedTeacher, assignedTeacherId vs assignedTeachers, assignedTeacherIds. Dual naming can cause bugs if one path is updated and the other not.  
- **Recommendation:** Document which is canonical; migrate reads/writes to one set and deprecate the other in a later phase.

## L7. Frontend: Sidebar link visibility vs PermissionProtectedRoute
- **Module:** Frontend  
- **Files:** `src/components/Sidebar.tsx`, `src/components/PermissionProtectedRoute.tsx`  
- **Why:** If a route is not in ROUTE_PERMISSIONS, Sidebar may still show a link and PermissionProtectedRoute may only do auth.  
- **Recommendation:** Align: every teacher/admin route either appears in ROUTE_PERMISSIONS and is guarded by permission, or is explicitly “auth only” and documented.

## L8. RecitationReview schema — no index on status or studentId
- **Module:** Schema  
- **File:** `backend/server.js`  
- **Line:** ~6582  
- **Why:** Queries may filter by status or studentId; indexes could speed up list and filter.  
- **Recommendation:** Add indexes based on actual query patterns (e.g. status, studentId, createdAt). Verify with explain.

---

# PHASE 5 — DATA HEALTH (READ-ONLY NOTES)

- **Orphaned users:** Handled by existing scripts (permissionsAuditAndFix, auditRolePermissionConsistency). Last run showed 0 orphaned users.  
- **Duplicate emails:** Handled by mergeDuplicateEmails / removeDuplicateEmails.  
- **Dangling ObjectIds:** Course ref (Student/Teacher.courses) is unresolved (see C3). QaidahMark / QaidahStudentLearning refs in Assignment should be checked for existence.  
- **Invalid enums:** User.role has no enum (M5). WeeklyEvaluation and Ticket status enums are defined; recommend validating existing data against them in a read-only pass.  
- **Cross-collection mismatches:** Teacher.userId / Admin.userId vs User._id are validated by existing audits. Student.userId same. No new cross-checks applied in this audit.

---

# PHASE 6 — PERFORMANCE & SAFETY (SUMMARY)

- **Unbounded lists:** See H6 (users, students, teachers, admins). RecitationReview, Assignments, Tickets, WeeklyEvaluations use pagination/limit.  
- **Regex:** Activity log email uses escapeRegex (good). Other regex in scripts use anchored/case-insensitive; scripts are one-off.  
- **Over-fetching:** Several list endpoints use .select() or .lean(); some still fetch full documents. Review per-route and add projection where needed.  
- **Indexes:** ListeningSession (M8), RecitationReview (L8), ActivityLog (H10) — see recommendations above.

---

# NEXT STEPS (NO CHANGES APPLIED)

1. Review this report and approve which findings to address.  
2. Prioritize Critical (C1–C6), then High (H1–H10).  
3. For schema changes (C3, H1, M5, M7, etc.): agree on strategy, then implement with migration plan.  
4. For routes: add auth and permission guards per recommendation; add pagination/caps where noted.  
5. Re-run permissions and role-consistency audits after any user/role/schema changes.

---

*End of report. No data or schema changes have been made.*
