# Schema Decisions — Umar Academy Portal

This document records schema-related findings and intentional decisions.  
**Last updated:** 2025-02-01

---

## C3. Student.courses and Teacher.courses

### Current state

- **Student schema** (server.js ~line 1705): `courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]`
- **Teacher schema** (server.js ~line 1946): `courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]`
- **Course model:** Not defined anywhere in the backend.

### Codebase audit (2025-02-01)

| Question | Result |
|----------|--------|
| **Is the field read?** | Yes. `BackendDataContext.tsx` reads `studentRecord.courses`, `teacherRecord.courses`, and `user.courses` for profile/context assembly. Values are passed through to frontend state. |
| **Is it written?** | No explicit writes found. No API handler or script sets `courses`. Mongoose would persist the field if it were ever set. |
| **Legacy / unused?** | Effectively legacy. The `ref: 'Course'` cannot populate (no Course model). `StudentProgress.tsx` uses hardcoded mock `progressData.courses` — not schema-backed. |

### Conclusion

- `courses` is **read-only** in practice; values come from existing DB documents.
- No production code **writes** to `courses`.
- The reference to `Course` is **invalid** — no Course model exists.
- Frontend fallbacks (`|| []`) handle empty/undefined safely.

### Decision status

**Deferred.** No schema or data changes until product decides:

1. Introduce a real `Course` model and migrate, or  
2. Remove `courses` from Student and Teacher schemas and clean up references.

### Schema comment

A comment has been added in the schema to document this status. See `backend/server.js` (Student and Teacher schemas).

---

## List Response Shapes (API Consistency)

### Background

Backend list endpoints historically return mixed shapes: some return `T[]`, others `{ items: T[] }` or `{ students: T[] }`, etc. This caused `forEach is not a function` crashes when the frontend expected an array.

### Mitigation (2025-02-01)

- **Frontend:** `src/utils/normalizeList.ts` normalizes all list data. All contexts and list components use it when parsing API responses or reading from cache.
- **Dev guards:** `normalizeListWithGuard()` logs unexpected shapes in development.

### Backend standardization (deferred)

No backend changes in this phase. Future work may standardize on:

```json
{ "items": [], "total": 0, "page": 1 }
```

---

*Add new decisions below as they are resolved.*
