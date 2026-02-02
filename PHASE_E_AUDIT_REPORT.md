# Phase E — Duplicate Code, API & Legacy Audit (Report)

**Goal:** Identify duplicate code, overlapping APIs, legacy references, and other quality issues; produce a report with suggestions for consolidation and fixes.

---

## Step 1 — Duplicate code (detection)

### Dependencies and config

- **Installed:** `eslint` and `jscpd` as devDependencies (`pnpm add -D -w eslint jscpd`).
- **ESLint:** `.eslintrc.json` and `eslint.config.js` (flat config for ESLint 9) with rules:
  - `no-duplicate-imports`: error
  - `no-duplicate-case`: error  
  ESLint 9 uses flat config: `eslint.config.js` is the active config; `.eslintrc.json` is kept for reference. For TypeScript/TSX, add `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` so ESLint can parse `.ts`/`.tsx`; the above rules will then apply.

### jscpd (clone detection)

**Command:** `npx jscpd src --min-lines 10 --min-tokens 50 --reporters console`

**Summary:**

| Format     | Files analyzed | Total lines | Clones found | Duplicated lines |
|------------|----------------|-------------|--------------|------------------|
| tsx        | 145            | 50,742      | 192          | 4,043 (7.97%)    |
| javascript | 139            | 25,562      | 25           | 1,957 (7.66%)    |
| typescript | 38             | 6,467       | 4            | 52 (0.8%)        |
| css        | 4              | 677         | 1            | 10 (1.48%)       |
| **Total**  | **326**        | **83,448**  | **222**      | **6,062 (7.26%)** |

**Notable clone pairs (refactor suggestions):**

| Location | Suggestion |
|----------|------------|
| **StudentDashboard.tsx** (62–72, 173–183); **StudentProfile** (337–347) | Extract shared loading/empty block to a hook or shared component. |
| **MistakeBadgeHighlight.tsx** (65–76 vs 109–121) | Extract repeated fetch/format logic to a util or hook. |
| **ProfessionalMessagesPage** vs **SuperAdminMessagesPage** (multiple blocks) | Consolidate into one shared MessagesPage with role-based props or shared layout + hooks. |
| **NewMessageModal.tsx** (164–181 vs 201–218) | Extract repeated block to a helper or inline component. |
| **MessageItem** vs **ProfessionalConversationView**; **ConversationCard** vs **SuperAdminMessagesPage**/MessageItem | Shared message/conversation UI: extract shared `MessageBubble` or conversation card component. |
| **dataMasking.ts** (81–92 vs 108–119); **qaidahApi.ts** (62–73 vs 115–126) | Extract repeated logic into a single function. |
| **TeacherAttendanceManagement** vs **TeacherAttendanceView** (multiple blocks) | Extract shared Sidebar, table, and filters into shared components. |
| **AdminAiLibrary** vs **SuperAdminAiLibrary** (large overlap) | Merge or share layout + hooks; single page with role-based behavior. |
| **MushafReviewPage** (self-clones + vs **PermissionsPage** 64–82) | Extract shared layout/permission UI. |
| **ProfileUpdateRequestModal** vs **StudentProfileUpdateRequestModal** (large overlap) | Single component with optional student-specific props. |
| **PairTeacherMessage** vs **TeacherStudentMessage**; **PairTeacherMessagesAdmin** vs **TeacherStudentMessagesAdmin** | Shared message UI and list logic: extract shared components/hooks. |
| **TeacherWeeklyEvaluationReview** vs **WeeklyEvaluationsAdmin** (multiple blocks) | Shared evaluation list/detail: extract shared components. |
| **ApprovedEvaluationsAdmin** vs **ApprovedTicketsAdmin**; **AdminRecordings** vs **StudentRecordings** | Shared table/modal patterns: extract shared components. |
| **TeacherPayroll** vs **TeacherPerformance**; **TeacherPairManagement** (self-clones) | Extract shared stat cards and section layout. |
| **index.css** (451–461 vs 483–493) | Deduplicate CSS rules. |

**Summary:** No duplicate code was removed in Phase E. Consolidation is left as suggested refactors for Phase F.

---

## Step 2 — Duplicate or conflicting APIs

### Backend routes

- **Source:** `backend/server.js` (inline) + `backend/routes/messages.js`, `recitationRoutes.js`, `liveRecitationRoutes.js` (mounted at `/api`).
- **Findings:**
  - No duplicate paths: specific routes (e.g. `/api/users/locked`, `/api/weekly-evaluations/approved`) are registered before parameterized ones (e.g. `/api/users/:id`, `/api/weekly-evaluations/:id`).
  - No conflicting HTTP verbs for the same path.
  - Messages API: unified router at `/api` provides `/conversations`, `/conversations/:id/messages`, lock/unlock, admin stats.

### Frontend API calls

- **Finding:** In `SuperAdminMessagesPage.tsx`, conversations were called with `${API_BASE}/api/conversations/...`. Since `API_BASE` already includes `/api`, this produced `/api/api/conversations/...`.
- **Fix applied:**
  - `loadStats`: `${API_BASE}/api/conversations/admin/stats` → `${API_BASE}/conversations/admin/stats`
  - `handleLockConversation`: `${API_BASE}/api/conversations/${id}/lock|unlock` → `${API_BASE}/conversations/${id}/lock|unlock`
- **Unused endpoints:** Not audited exhaustively; frontend fetch usage matches backend routes for the flows checked. No redundant frontend calls were removed in Phase E.

---

## Step 3 — Legacy / obsolete logic

### References checked

| Reference | Location | Status |
|-----------|----------|--------|
| **backend/models/legacy/** | `server.js`, `routes/messages.js`, `scripts/legacy/migrateMessages.js` | **Intentional.** Used by unified messaging and migration script; documented as legacy import. |
| **backend/scripts/legacy/** | Only `migrateMessages.js` requires backend (server, models); other scripts are standalone. | **Intentional.** No production code imports scripts. |
| **WeeklyEvaluationForm** | Removed in Phase A. | **Correct.** `TeacherDashboard` uses `EnhancedWeeklyEvaluationForm` only. |

**Conclusion:** No unintended legacy imports in production app code. Legacy model/script use is limited to messaging routes and migration script, with comments in place.

---

## Step 4 — Consistency checks

### TypeScript

- **`pnpm run build`** (tsc + vite): Fails with **pre-existing** errors (e.g. `@umar-academy/mushaf` module not found when type-checking from repo root without workspace resolution, SuperAdminDashboard `setShow*` names, TeacherAttendance SidebarProps, AdminDashboard/TeacherProfile prop types, BackendDataContext `Admin._id`). These are not introduced by Phase E.
- **`pnpm run build:fast`** (vite only): Succeeds and is the standard frontend build.

### Styling / conventions

- Not automated in Phase E. jscpd and manual review suggest repeated patterns (e.g. attendance pages, messaging pages) that could be standardized in a later refactor.

### Tests

- **`pnpm run test`:** Pre-existing failures (dataCache, Playwright specs under Vitest, backend sabq-audio missing supertest). No new failures from Phase E.
- **`pnpm run test:e2e`:** Not run in Phase E; recommended to run manually with app running.

---

## Step 5 — Consolidation suggestions (no changes in Phase E)

1. **Messaging:** Merge or share logic between `ProfessionalMessagesPage` and `SuperAdminMessagesPage` (e.g. shared layout, hooks, or a single page with role-based behavior).
2. **Attendance:** Extract shared UI/logic between `TeacherAttendanceManagement` and `TeacherAttendanceView` (Sidebar, table, filters).
3. **Student/teacher dashboards:** Extract shared loading/empty and profile blocks (StudentDashboard, StudentProfile) into small shared components or hooks.
4. **Utils:** Deduplicate blocks in `dataMasking.ts` and `qaidahApi.ts` into single functions.
5. **Mushaf/permissions:** Share repeated layout or permission UI between `MushafReviewPage` and `PermissionsPage` if useful.

---

## Step 6 — Documentation updates

- **backend/models/README.md** — Noted Phase E audit; clarified active vs legacy (Conversation, Message in legacy).
- **backend/routes/README.md** — **Created.** Describes inline routes vs mounted routers, route order, and the Phase E fix for double `/api` in frontend.
- **src/components/README.md** — **Created.** Describes shared UI, feature components, jscpd consolidation suggestions, and legacy/unused (permission-manager-v2, EnhancedWeeklyEvaluationForm).

---

## Step 7 — Verification

| Check | Command | Result |
|-------|--------|--------|
| Build Mushaf | `pnpm run build:mushaf` | Run after Phase E; expect pass. |
| Build app | `pnpm run build:fast` | Run after Phase E; expect pass. |
| Unit tests | `pnpm run test` | Pre-existing failures only; no new failures from Phase E. |
| E2E | `pnpm run test:e2e` | Run manually with app running. |

**Code change in Phase E:** Only the two URL fixes in `SuperAdminMessagesPage.tsx` (remove duplicate `/api` in conversations stats and lock/unlock). No duplicate code or APIs removed; no legacy imports removed.

---

## Outcome summary

- **Duplicate code:** Listed with file/line references and consolidation suggestions; no deletions in Phase E.
- **APIs:** No backend duplicate or conflicting routes; one frontend bug fixed (double `/api` in SuperAdminMessagesPage).
- **Legacy:** References to `models/legacy` and `scripts/legacy` are intentional and documented; no cleanup required.
- **Consistency:** Docs updated; TS/test issues noted as pre-existing.
- **Build/test:** `build:mushaf` and `build:fast` should pass; tests unchanged by Phase E.

---

## Phase F recommendations (refactor / consolidation)

Use this section as the execution baseline for Phase F. Only proceed after at least one deployment cycle with Phase E in place.

1. **Duplicate code**
   - Run `npx jscpd src --min-lines 10 --min-tokens 50` regularly; tackle high-impact clones first (messaging pages, attendance pages, AI library, profile modals, message components).
   - Add `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` so `no-duplicate-imports` and `no-duplicate-case` run on `.ts`/`.tsx`; fix any reported issues.

2. **Messaging**
   - Merge or share logic between `ProfessionalMessagesPage` and `SuperAdminMessagesPage` (shared layout, hooks, or single page with role-based behavior).
   - Extract shared message/conversation UI from `MessageItem`, `ConversationCard`, `ProfessionalConversationView`, and legacy message components.

3. **Attendance**
   - Extract shared UI/logic between `TeacherAttendanceManagement` and `TeacherAttendanceView` (Sidebar, table, filters).

4. **AI library**
   - Consolidate `AdminAiLibrary` and `SuperAdminAiLibrary` (shared layout + hooks or single page with role-based behavior).

5. **Profile / evaluations / tickets**
   - Merge `ProfileUpdateRequestModal` and `StudentProfileUpdateRequestModal` into one component with optional props.
   - Share evaluation list/detail patterns between `TeacherWeeklyEvaluationReview` and `WeeklyEvaluationsAdmin`.
   - Share table/modal patterns between `ApprovedEvaluationsAdmin` and `ApprovedTicketsAdmin`, and between `AdminRecordings` and `StudentRecordings`.

6. **Utils and CSS**
   - Deduplicate blocks in `dataMasking.ts` and `qaidahApi.ts` into single functions.
   - Deduplicate repeated rules in `src/index.css` (see jscpd clone).

7. **Verification**
   - After each refactor: `pnpm run build:mushaf`, `pnpm run build:fast`, `pnpm run test`. Run `pnpm run test:e2e` (with app running) for critical flows.
   - Document removed duplicates and new shared components in `src/components/README.md` and `backend/routes/README.md` as needed.
