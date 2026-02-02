# Phase F — Consolidation & Quality Cleanup (Report)

**Goal:** Remove duplicate code, consolidate shared logic/components/hooks, clean API calls, and eliminate residual legacy/unused code to improve maintainability and production quality.

---

## Step 1 — Consolidation completed

### Utilities (deduplicated)

| File | Change |
|------|--------|
| **src/utils/dataMasking.ts** | Extracted `applyOptionMask()` helper; `maskTeacher` and `maskUser` now use it. Removes repeated if-blocks for option-based masking. |
| **src/services/qaidahApi.ts** | Extracted `parseQaidahMarkDataResponse()`; `fetchQaidahMarks` and `saveQaidahMarks` use it. Removes duplicate response-parsing and empty-fallback logic. |

### Central API

| File | Change |
|------|--------|
| **src/services/api.ts** (new) | Central helpers: `getApiBase()`, `getAuthToken()`, `getAuthHeaders()`, `getConversations()`, `getConversationStats()`, `lockConversation()`. Types: `ConversationListItem`, `ConversationStats`. |
| **src/components/messaging/SuperAdminMessagesPage.tsx** | Replaced inline `API_BASE` and fetch logic with `getConversations`, `getConversationStats`, `lockConversation` from `api.ts`. Removes duplicate URL/auth handling. |

### Shared UI / hooks (new)

| File | Purpose |
|------|--------|
| **src/components/ui/EmptyState.tsx** | Reusable empty state (title, message, icon, action). Use for "no data" or empty lists across dashboards. |
| **src/hooks/useLoadingState.ts** | Shared loading/error state and `run(fn)` helper for async operations. Use for consistent loading/error handling. |

### Not done in Phase F (deferred)

- **Messaging:** Single shared `MessagesPage` with role-based props and extracted `MessageList`, `MessageBubble`, etc. — deferred; both pages still separate; only SuperAdminMessagesPage now uses central API.
- **Attendance:** Shared `Sidebar`, `FilterControls`, `AttendanceTable`, `useTeacherAttendance` — deferred to avoid large refactor in one pass.
- **Dashboards:** Widespread use of `EmptyState` and `useLoadingState` in StudentDashboard, StudentProfile, TeacherDashboard — deferred; components exist for adoption.
- **Mushaf/Permissions:** Shared `PermissionTable` / `PermissionCard` and `usePermissions` — deferred.
- **Backend:** Moving inline routes from `server.js` to dedicated route files — not done.

---

## Step 2 — API cleanup

- **Frontend:** Double `/api` fix from Phase E kept. New `src/services/api.ts` used by SuperAdminMessagesPage; other components can migrate to it over time.
- **Backend:** No duplicate routes; parameterized routes remain after fixed routes. No changes.

---

## Step 3 — Legacy / unused

- **permission-manager-v2:** Not imported anywhere; remains as legacy/unused. No production imports.
- **WeeklyEvaluationForm:** Removed in Phase A; only `EnhancedWeeklyEvaluationForm` is used.
- **backend/models/legacy/** and **backend/scripts/legacy/:** Used only by messaging routes and migration script; no new production imports. No cleanup required.

---

## Step 4 — ESLint & jscpd

- **ESLint:** `no-duplicate-imports` and `no-duplicate-case` are in place (Phase E). No `--fix` run was performed; TypeScript parsing still requires `@typescript-eslint/parser` for full src lint.
- **jscpd:** Utils and API consolidation reduces some clones; full re-run recommended after further refactors. No mandatory “fix all clones” in this phase.

---

## Step 5 — Verification (completed)

| Check | Command | Result |
|-------|--------|--------|
| Build Mushaf | `pnpm run build:mushaf` | **Passed.** |
| Build app | `pnpm run build:fast` | **Passed.** |
| Unit tests | `pnpm run test` | **Pre-existing failures only** (dataCache, Playwright under Vitest, sabq-audio); no new failures from Phase F. |
| E2E | `pnpm run test:e2e` | Run manually with app running. |

---

## Step 6 — Optional (not done)

- Shared hooks library (e.g. `useMessages`, `useAttendance`) — only `useLoadingState` added.
- Full CSS/Tailwind extraction — not done.

---

## Summary of changes

| Category | Done | Deferred |
|----------|------|----------|
| Utils dedupe | dataMasking, qaidahApi | — |
| Central API | api.ts + SuperAdminMessagesPage | Migrate other components to api.ts |
| Shared components | EmptyState | MessageBubble, ConversationCard consolidation |
| Shared hooks | useLoadingState | useTeacherAttendance, useMessages |
| Messaging | Central API only | Single MessagesPage + subcomponents |
| Attendance | — | Sidebar, FilterControls, AttendanceTable, useTeacherAttendance |
| Dashboards | EmptyState, useLoadingState | Use across Student/Teacher dashboards |
| Mushaf/Permissions | — | PermissionTable, usePermissions |
| Legacy | Verified no bad imports | — |

---

## Documentation updates

- **src/components/README.md** — Add mention of `EmptyState` and `useLoadingState`; note Phase F consolidation.
- **PHASE_F_CONSOLIDATION_REPORT.md** — This file.

---

## Pre-existing issues (unchanged)

- **TypeScript:** `pnpm run build` (tsc) may still fail (e.g. @umar-academy/mushaf, SuperAdminDashboard, TeacherAttendance props). `pnpm run build:fast` (Vite only) is the standard frontend build.
- **Tests:** dataCache, Playwright-under-Vitest, sabq-audio — same as before Phase F.
