# Umar Academy Portal — Cleanup Inventory & Plan

**Status:** Read-only inventory and proposal. **No files have been deleted or moved.**  
**Rule:** Do not execute Phase A/B/C until you explicitly say: *"Approved. Execute Phase A only."* (or Phase B/C as specified.)

---

## STEP 1 — FULL INVENTORY (READ-ONLY)

### 1.1 File Inventory (by purpose)

```
/
├── .github/
│   └── workflows/          # CI (e.g. deploy)
├── .gitignore
├── .npmrc
├── index.html              # SPA entry
├── frontend-server.js      # Serves built frontend (production)
├── package.json            # Root workspace
├── pnpm-lock.yaml
├── render-build.sh         # Render.com build
├── render.yaml             # Render config
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── postcss.config.js
│
├── docs/                   # Developer / ops documentation
│   ├── CACHE_CONSISTENCY_*.md
│   ├── ENDPOINT_VERIFICATION.md
│   ├── FIX_IMPLEMENTATION_SUMMARY.md
│   ├── INSTANT_DATA_LOADING.md
│   ├── INTERACTIVE_MUSHAF_ARCHITECTURE.md
│   ├── MOBILE_TESTING_REPORT.md
│   ├── PRODUCTION_INCIDENT_*.md
│   ├── TEST_CREDENTIALS*.md, TESTING_*.md
│   └── WEBSOCKET_SETUP.md
│
├── e2e/                    # Playwright E2E specs
│   ├── cache-consistency.spec.ts
│   ├── data-loading.spec.ts
│   ├── mobile-cache-performance.spec.ts
│   └── teacher-portal.spec.ts
│
├── packages/
│   └── mushaf/             # Quran layout & interactive Mushaf (workspace)
│       └── src/
│           ├── components/
│           ├── data/
│           ├── hooks/
│           ├── services/
│           ├── types/
│           ├── utils/
│           └── index.ts
│
├── public/                 # Static assets (served as-is)
│   ├── _redirects
│   ├── data/               # Mushaf layout DBs & JSON (SQLite, word_by_word)
│   ├── favicon.*
│   ├── fonts/
│   ├── pdf-documents/
│   ├── pdfjs/
│   ├── qaidah/
│   ├── recorder-worklet.js, pcm-worklet.js
│   └── sqljs/
│
├── scripts/                # One-off / maintenance scripts (repo root)
│   ├── check-duplicate-teachers.js
│   ├── cleanup-duplicate-users.js
│   ├── copy-qaidah-pages.js
│   ├── download-qpc-v4-layout.js
│   ├── download-qpc-v4-layout.sh
│   └── verify-qpc-v4-layout.js
│
├── src/                    # Frontend (React + Vite)
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── vite-env.d.ts
│   ├── __tests__/          # Vitest unit tests
│   ├── components/         # Shared & feature components
│   │   ├── ui/
│   │   ├── workflow/
│   │   ├── messaging/
│   │   └── permission-manager-v2/
│   ├── contexts/
│   ├── hooks/
│   ├── modules/
│   │   └── student/
│   ├── pages/
│   │   └── qaidah/
│   ├── scripts/            # seedData.ts (npm run seed)
│   ├── services/
│   ├── shared/
│   ├── types/
│   └── utils/
│
├── backend/                # Node.js API (Express + MongoDB)
│   ├── server.js           # Single entry; all routes/schemas in file
│   ├── config/
│   ├── middleware/
│   ├── models/             # Conversation, Message, Notification
│   ├── routes/             # messages, recitationRoutes, liveRecitationRoutes
│   ├── schemas/            # recitationSession
│   ├── services/
│   ├── shared/
│   ├── utils/
│   ├── __tests__/
│   ├── docs/
│   └── [many one-off .js scripts]
│
├── playwright-report/      # Generated (E2E report)
├── test-results/           # Generated (E2E)
│
└── [ROOT .md FILES]        # Many audit/implementation docs (see 1.2)
└── [ROOT test-*.js]        # Ad-hoc test scripts (see 1.2)
```

**Root-level .md files (documentation only):**  
ALERT_CONFIRM_REPLACEMENT_SUMMARY.md, ASSIGNMENT_*.md, BACKEND_*.md, BUTTON_*.md, CLASSWORK_*.md, COMPLETE_TESTING_GUIDE.md, COMPREHENSIVE_*.md, CORE_*.md, DETAILED_*.md, DEVELOPER_*.md, DNS_*.md, DOMAIN_*.md, DOWNLOAD_*.md, DUPLICATE_*.md, FULL_STACK_*.md, HELP_*.md, HOW_TO_*.md, INPUT_*.md, JWT_*.md, NEXT_*.md, NOTIFICATION_*.md, NOTIFICATIONS_*.md, OWNERSHIP_*.md, PERFORMANCE_*.md, PERMISSION_*.md, PERMISSIONS_*.md, PHASE1_*.md, PHASE2_*.md, PRE_PUSH_*.md, PRODUCTION_*.md, RATE_*.md, README.md, RUNTIME_*.md, SABQ_*.md, SECURITY_*.md, STUDENT_*.md, TEACHER_*.md, TECHNICAL_*.md, TEST_*.md, TICKET_*.md, TICKETS_*.md, UMAR_ACADEMY_PORTAL_SYSTEM_AUDIT.md, UNIFIED_*.md, UPDATE_*.md, VERIFY_*.md, VIRTUALIZATION_*.md, etc.

**Root-level test / ad-hoc scripts:**  
test-all-phases.js, test-error-endpoint.js, test-homework-fields.js, test-phase1-patches.js, test-phase3.js, test-script-complete.js, test-script-simple.js, test-homework-update.md, test-api-validation.js (if present).

---

### 1.2 Classify Every File (summary + details for ⚠️ / ❌)

**Legend:**  
- **✅ Core / In Use** — Referenced by build, runtime, or npm scripts; do not remove.  
- **⚠️ Possibly Legacy** — Replaced by another file or not imported; removal could break something if there are indirect or doc references.  
- **🧪 Experimental / Old** — Clearly experimental or one-off; keep only if you still use it.  
- **❌ Unused / Safe to Remove** — Not imported, not in npm scripts, not referenced in code or CI; removal has no runtime/build impact.

---

#### Root: config & entry (all ✅ Core)

| File | Classification | Notes |
|------|----------------|-------|
| index.html | ✅ Core | SPA entry; references /src/main.tsx |
| frontend-server.js | ✅ Core | npm run start |
| package.json, pnpm-lock.yaml | ✅ Core | Workspace & scripts |
| render-build.sh, render.yaml | ✅ Core | Production deploy |
| tailwind.config.js, postcss.config.js | ✅ Core | Build |
| tsconfig.json, tsconfig.node.json | ✅ Core | TypeScript |
| vite.config.ts, vitest.config.ts | ✅ Core | Vite & Vitest |

---

#### Root: test / ad-hoc scripts (❌ or ⚠️)

| File | Classification | WHY | WHAT breaks if removed | WHEN last referenced |
|------|----------------|-----|------------------------|----------------------|
| test-all-phases.js | ❌ Unused | Not in package.json; not imported anywhere | Nothing | Never in code |
| test-phase3.js | ❌ Unused | Not in package.json; not imported | Nothing | Never |
| test-phase1-patches.js | ⚠️ Possibly Legacy | Referenced in PHASE1_TESTING_GUIDE.md (copy-paste into console) | Manual testing steps in doc would be wrong | PHASE1_TESTING_GUIDE.md |
| test-script-complete.js | ❌ Unused | Not in package.json; not imported | Nothing | Never |
| test-script-simple.js | ❌ Unused | Not in package.json; not imported | Nothing | Never |
| test-error-endpoint.js | ❌ Unused | Not in package.json; not imported | Nothing | Never |
| test-homework-fields.js | ❌ Unused | Not in package.json; not imported | Nothing | Never |
| test-api-validation.js | ❌ Unused | No references found | Nothing | Never |
| test-homework-update.md | ⚠️ Possibly Legacy | Doc only; may describe manual test | Documentation only | N/A |

---

#### Root: npm script targets that point to missing files

| Script (package.json) | Target | Status |
|-----------------------|--------|--------|
| "test-db" | tsx src/scripts/testConnection.ts | ❌ File does not exist — script would fail |
| "setup-mistakes-db" | tsx src/scripts/setupMistakesDb.ts | ❌ File does not exist — script would fail |

**Action:** Do not delete; flag for owner: either add the missing files or remove these two script entries to avoid confusion.

---

#### Root: documentation (.md)

All root-level `.md` files are **✅ Core (as docs)** or **⚠️ Possibly Legacy** in the sense “might be outdated.” They are not code; removal does not break build or runtime. Classify as:

- **✅ Keep (reference docs):** README.md, UMAR_ACADEMY_PORTAL_SYSTEM_AUDIT.md, DEVELOPER_ACCESS_GUIDE.md, VERIFY_STUDENTS_INSTRUCTIONS.md, UPDATE_PASSWORD_ON_RENDER.md, HOW_TO_ADD_STUDENTS.md, PRE_PUSH_CHECKLIST.md, and any other doc you actively use.
- **⚠️ Possibly Legacy (outdated):** Any audit/phase doc that describes old behavior or one-off fixes. No code imports them; removal only affects human readers.

**No .md file is classified ❌ Unused** without your confirmation (you may still want to archive them).

---

#### src/: components

| File / folder | Classification | Notes |
|---------------|----------------|-------|
| App.tsx, main.tsx, index.css, vite-env.d.ts | ✅ Core | Entry & global styles |
| contexts/*, hooks/*, services/*, types/*, utils/*, shared/* | ✅ Core | Used by app or build |
| pages/* (all) | ✅ Core | Routed from App.tsx |
| modules/student/* | ✅ Core | Student portal |
| __tests__/* | ✅ Core | Vitest |
| scripts/seedData.ts | ✅ Core | npm run seed |
| docs/NOTIFICATIONS_INTEGRATION.md | ✅ Core (doc) | In-repo doc |
| components/PermissionManager.tsx | ✅ Core | Used by PermissionsPage, AdminDashboard, SuperAdminDashboard, TeacherDashboard |
| components/EnhancedWeeklyEvaluationForm.tsx | ✅ Core | Used by TeacherDashboard |
| components/WeeklyEvaluationForm.tsx | ⚠️ Possibly Legacy | **Not imported anywhere.** TeacherDashboard uses EnhancedWeeklyEvaluationForm. Likely superseded by Enhanced. | If something still expected “WeeklyEvaluationForm” by name in the future, that would break. | Never (no imports) |
| components/permission-manager-v2/* | ⚠️ Possibly Legacy | **PermissionManagerV2 is never imported.** App uses PermissionManager (v1). permission-manager-v2 may be an alternate or future replacement. | If you later switch PermissionsPage to use PermissionManagerV2, you’d need this. | Never (no imports) |

All other `src/components/*` and subfolders (ui/, workflow/, messaging/) are **✅ Core** — they are imported from pages or other components.

---

#### backend/

| File / folder | Classification | Notes |
|---------------|----------------|-------|
| server.js | ✅ Core | API entry |
| config/jwt.js | ✅ Core | Required by server.js |
| middleware/* | ✅ Core | Required by server.js |
| models/*, routes/*, schemas/* | ✅ Core | Required by server.js |
| services/* | ✅ Core | Required by server.js |
| shared/permissions.js | ✅ Core | Required by server.js |
| utils/* | ✅ Core | Required by server.js |
| security.js, connectMongo.js, quranSchemas.js | ✅ Core | Required by server.js |
| __tests__/sabq-audio.test.js | ✅ Core | backend npm test |
| production-test.js | ✅ Core | npm run test:production |
| createDeveloper.js, createDeveloperProduction.js, checkDeveloperAccount.js | ✅ Core | Referenced in root package.json |
| createTestUsers.js | ✅ Core | npm run setup:test-users |
| seedDatabase.js, clearDatabase.js, migrateSqliteToMongo.js, migrateQuranFromApi.js | ✅ Core | Referenced in backend/package.json scripts |
| add-sample-users.cjs | ⚠️ Possibly Legacy | Not in npm scripts; may be one-off seed | Manual seed flow if anyone runs it | Never in package.json |
| addTeacher.js, addTeacherForUser.js | ⚠️ Possibly Legacy | Not in npm scripts; documented in DUPLICATE_*, TEACHER_* as CLI tools | CLI admin workflows if used | docs only |
| checkAllStudents.js, checkAllUsers.js, checkAssignments.js, checkDatabase.js, checkDataSaved.js, checkEmail.js, checkEvaluation.js, checkProductionStudents.js, checkSpecificUser.js, checkStudents.js, checkSuperAdmin.js, checkUser.js | ⚠️ Possibly Legacy | Not required by server.js; run manually or from docs | Diagnostic/ops if used | docs / usage comments |
| createAdminProfile.js, createAdminUser.js, createMissingTeachers.js, createDeveloperViaAPI.js, createStudentUser.js | ⚠️ Possibly Legacy | Not in npm scripts; run manually | Admin/ops setup | docs / usage comments |
| fixAllUserLogins.js, fixLockedAccounts.js, fixPasswordMismatches.js, fixProductionUserLogins.js, fixStudentLogins.js, fixSuperAdminEmail.js, investigateDuplicateAdmins.js | ⚠️ Possibly Legacy | One-off fix scripts | Ops fixes if needed | docs / usage comments |
| exportToLocalMongo.js, exportToLocalMongoWithDump.js, migrateQuranFromApi.js (already covered), migrateSqliteToMongo.js (already covered), populateMongoFromPublicDb.js | ⚠️ Possibly Legacy / ✅ | migrate* in backend package.json; others manual | Migration/export flows | backend package.json / docs |
| mongoShell.js, resetPassword.js, resetStudentPassword.js, resetSuperAdminLockout.js, resetSuperAdminPassword.js, searchSaria.js, syncProductionStudents.js, unlockAccount.js, updateSuperAdminPassword.js, updateUserPasswords.js | ⚠️ Possibly Legacy | Manual/ops | Ops and support | docs / usage comments |
| verifyMongoConnection.js, verifyProductionMongo.js, verifyStudentList.js | ⚠️ Possibly Legacy | Manual/ops | Ops verification | docs (e.g. VERIFY_STUDENTS_INSTRUCTIONS.md) |
| testEndpoints.js, testMongoConnection.js | 🧪 Experimental / Old | Ad-hoc API/DB tests | Manual testing | Never in package.json |

**None of the backend one-off scripts are ❌ Unused** without your approval: they are referenced in docs or usage comments. Recommend **Phase C (document)** rather than delete.

---

#### scripts/ (repo root)

| File | Classification | Notes |
|------|----------------|-------|
| check-duplicate-teachers.js, cleanup-duplicate-users.js | ⚠️ Possibly Legacy | Not in package.json; one-off data fixes | Duplicate-cleanup if run | Never in package.json |
| copy-qaidah-pages.js, download-qpc-v4-layout.js, download-qpc-v4-layout.sh, verify-qpc-v4-layout.js | ⚠️ Possibly Legacy | Not in package.json; setup/maintenance | Qaidah/Mushaf asset setup | Never in package.json |

---

#### packages/mushaf

All files under `packages/mushaf/src/` are **✅ Core** for the Mushaf feature; the workspace is referenced in root package.json and built with `pnpm --filter @umar-academy/mushaf build`.

---

#### public/, e2e/, .github

- **public/** — ✅ Core (static assets; some paths in vite.config and app).
- **e2e/** — ✅ Core (Playwright; npm run test:e2e*).
- **.github/** — ✅ Core (CI).

---

#### Generated / ignored

- **playwright-report/**, **test-results/** — Generated; often in .gitignore. Not part of “safe to delete” codebase cleanup; can be cleaned by `playwright test` or CI.
- **backend/uploads/** — In .gitignore; runtime uploads. Do not delete as part of repo cleanup.

---

## STEP 2 — MODULE OWNERSHIP MAP

| Module | Purpose | Backend | Frontend | Data |
|--------|---------|---------|-----------|------|
| **Auth & roles** | Login, JWT, permissions | server.js (auth routes, middleware) | Login.tsx, AuthContext, RequirePermission | User, Admin, Teacher (MongoDB) |
| **Admin dashboard** | Super/Admin home, stats, actions | server.js (users, admins, activity-logs, maintenance) | SuperAdminDashboard, AdminDashboard | MongoDB (multiple) |
| **Students** | Student CRUD, list, credentials | server.js (/api/students, /api/users) | StudentsPage, StudentList, StudentRegistrationForm, etc. | Student, User (MongoDB) |
| **Teachers** | Teacher CRUD, list, payroll | server.js (/api/teachers) | TeachersPage, TeacherRegistrationForm, TeacherPayroll | Teacher, User (MongoDB) |
| **Assignments** | Classwork & homework per student | server.js (/api/assignments) | AssignmentManagement, EnhancedAssignmentForm, StudentAssignments | Assignment (MongoDB) |
| **Tickets** | Sabq/Sabqi/Manzil review workflow | server.js (/api/tickets) | TicketCreationForm, TeacherTicketReview, MushafReviewPage, AdminTicketReview | Ticket (MongoDB) |
| **Mushaf** | Quran display & mistake marking | server.js (personal-mushaf, mistakes); packages/mushaf | MushafReviewPage, StudentPersonalMushaf, TeacherPersonalMushaf, @umar-academy/mushaf | StudentPersonalMushaf (MongoDB); SQLite/JSON in public/data |
| **Attendance** | Teacher presence | server.js (/api/teacher-attendance) | TeacherAttendanceManagement, TeacherAttendanceView | TeacherAttendance (MongoDB) |
| **Evaluations** | Weekly evaluations, recitation reviews | server.js (/api/recitation-reviews, weekly-evaluations) | EnhancedWeeklyEvaluationForm, WeeklyEvaluationsAdmin, TeacherWeeklyEvaluationReview | WeeklyEvaluation, RecitationReview (MongoDB) |
| **Messages** | Teacher–student & pair messaging | backend/routes/messages.js | MessagesPage, ProfessionalMessagesPage, messaging/* | Conversation, Message (MongoDB) |
| **Notifications** | In-app notifications | server.js (/api/admin-notifications, teacher-notifications); Notification model | AdminNotificationCenter, TeacherNotificationCenter | Notification (MongoDB) |
| **Permissions** | Admin/teacher permission flags | server.js (users/:id/settings); middleware requirePermission | PermissionsPage, PermissionManager | Admin, Teacher (MongoDB) |
| **Qaidah** | Beginner books | server.js (qaidah-related if any); static in public/qaidah | pages/qaidah/*, QaidahViewer, QaidahPage | Static (public); possibly MongoDB for progress |
| **Payments / payroll** | Teacher salary display; student payment status | server.js (Teacher/Student schemas) | TeacherPayroll, TeacherProfile, StudentProfile (payment status) | Embedded on Teacher/Student (MongoDB); no separate Payment API |
| **PDF teaching** | PDF library & annotations | server.js (/api/pdf*) | TeacherPdfViewer, PdfManagement | PdfDocument, PdfAnnotation (MongoDB) |
| **Recitation (live)** | Live recitation monitoring | server.js (Socket.IO); routes/recitationRoutes, liveRecitationRoutes; services/recitation* | (Frontend that uses Socket.IO for live recitation) | RecitationSession (MongoDB) |

**Files not clearly in one module:**  
- **DataManager, DebugPanel, DeveloperModeIndicator** — Admin/dev tools; used from dashboards.  
- **MaintenanceBanner** — Global; used in App.  
- **Header, Sidebar, Button, StatCard, etc.** — Shared UI; used across modules.

---

## STEP 3 — PROPOSED CLEAN STRUCTURE (NO MOVES YET)

This is a **target layout** for clarity and maintainability. **Do not move or rename anything until you approve.**

```
/
├── .github/
├── docs/                    # All developer/ops documentation (consider moving root *.md here)
├── e2e/
├── packages/
│   └── mushaf/
├── public/
├── scripts/                 # Repo-level one-off scripts (keep as-is)
├── src/
│   ├── app/                 # (Optional) App.tsx, main.tsx, index.css could live under app/
│   ├── components/          # Keep; already grouped (ui/, workflow/, messaging/, permission-manager-v2/)
│   ├── contexts/
│   ├── hooks/
│   ├── modules/
│   │   └── student/
│   ├── pages/
│   ├── scripts/
│   ├── services/
│   ├── shared/
│   ├── types/
│   └── utils/
├── backend/
│   ├── server.js
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── schemas/
│   ├── services/
│   ├── shared/
│   ├── utils/
│   ├── scripts/             # (Optional) Move one-off .js scripts here from backend root
│   └── docs/
├── index.html
├── package.json
├── README.md
└── [other config files]
```

**What belongs where (proposal):**

- **docs/** — All long-form `.md` (root + backend/docs + src/docs). Eases discovery; no code imports paths to .md.
- **backend/scripts/** (optional) — Move backend one-off `.js` (addTeacher, check*, fix*, etc.) into `backend/scripts/` so `backend/` root has only server.js, config, middleware, models, routes, schemas, services, shared, utils. **Risk:** Any doc or external script that runs `node backend/checkUser.js` would need to become `node backend/scripts/checkUser.js` (API contract unchanged; only file path).
- **src/app/** — Optional; would require updating index.html and Vite entry if you move main.tsx/App.tsx. **Not recommended** unless you want a larger refactor later.

**What does NOT belong:**

- Do not put frontend code under backend/ or vice versa.
- Do not rename routes, API paths, or DB collections.
- Do not merge PermissionManager and permission-manager-v2 without explicit product decision.

---

## STEP 4 — SAFE CLEANUP PLAN

### Phase A — SAFE TO DELETE (only after explicit approval)

Candidates are **root-level ad-hoc test scripts** that are **not** in package.json and **not** imported anywhere. Removing them does not change build or runtime.

| File | Reason | Risk |
|------|--------|------|
| test-all-phases.js | Not in package.json; not imported | None |
| test-phase3.js | Not in package.json; not imported | None |
| test-script-complete.js | Not in package.json; not imported | None |
| test-script-simple.js | Not in package.json; not imported | None |
| test-error-endpoint.js | Not in package.json; not imported | None |
| test-homework-fields.js | Not in package.json; not imported | None |
| test-api-validation.js | No references found | None |

**Do not delete in Phase A:**  
- test-phase1-patches.js — Referenced in PHASE1_TESTING_GUIDE.md. Either keep or update the doc and then delete.  
- test-homework-update.md — Doc only; keep or archive with other docs.  
- Any backend script, permission-manager-v2, or WeeklyEvaluationForm — Not in Phase A.

**Execution rule:** Only delete Phase A files after you say: *"Approved. Execute Phase A only."* Then run build and smoke tests and stop if anything fails.

---

### Phase B — MOVE / MERGE (optional; do only after approval)

| Action | Old path | New path | Import changes | Why safe |
|--------|----------|----------|----------------|----------|
| Move backend one-off scripts | backend/checkUser.js, addTeacher.js, … | backend/scripts/checkUser.js, … | None in code (server.js does not require them). Docs and npm scripts that run these must be updated to new path. | No API or behavior change; only file location. |
| Consolidate docs | Root *.md | docs/ (e.g. docs/audits/, docs/guides/) | No code imports .md paths. | Documentation only. |

**Do not do in Phase B:**  
- Merging PermissionManager and PermissionManagerV2 (behavior/UI change).  
- Merging WeeklyEvaluationForm into EnhancedWeeklyEvaluationForm without product decision.  
- Renaming routes, APIs, or DB fields.

---

### Phase C — KEEP BUT DOCUMENT

Add short comments so future developers know why the file exists.

| File / area | Suggested comment (or doc line) |
|-------------|----------------------------------|
| backend/addTeacher.js, check*.js, fix*.js, createAdmin*.js, etc. | `// REQUIRED: One-off ops script. Run manually. See docs/ and DEVELOPER_ACCESS_GUIDE.md.` |
| backend/seedDatabase.js, clearDatabase.js, migrate*.js | Already in backend/package.json; optional: `// Used by: npm run seed, clear, migrate-quran, migrate-quran-api` |
| src/components/permission-manager-v2/ | At top of PermissionManagerV2.tsx: `// Alternate permission UI; not currently used by PermissionsPage (which uses PermissionManager). Do not remove without product decision.` |
| src/components/WeeklyEvaluationForm.tsx | At top: `// Legacy form; TeacherDashboard uses EnhancedWeeklyEvaluationForm. Kept for reference or rollback.` |
| Root test-*.js (if kept) | In README or CLEANUP doc: “Ad-hoc test scripts in repo root are not part of npm test; run manually if needed.” |

---

## STEP 5 — EXECUTION (ONLY AFTER APPROVAL)

**Current instruction: DO NOT EXECUTE.**

- Do **not** delete any file until you say: *"Approved. Execute Phase A only."*
- Do **not** move any file until you explicitly approve Phase B.
- When executing Phase A: delete only the listed files, run `pnpm run build` and your usual smoke/e2e checks, and stop immediately if anything fails.

---

## STEP 6 — FINAL DELIVERABLES (after execution)

After you approve and Phase A is run, the report will be updated with:

- ✅ Clean directory tree (after Phase A)
- ✅ List of removed files and reason for each
- ✅ Confirmation: build passes, app behavior unchanged
- ✅ Short README note explaining structure (plain English)

Until then, **no changes have been made**; this document is the inventory and plan only.

---

## Summary

- **Inventory:** Done (Step 1.1–1.2).  
- **Module map:** Done (Step 2).  
- **Proposed structure:** Done (Step 3).  
- **Cleanup plan:** Phase A (safe deletes), Phase B (optional moves), Phase C (document only).  
- **Execution:** None. Waiting for: *"Approved. Execute Phase A only."* (or B/C as you specify.)  
- **Stability > cleanliness:** No API, schema, or UI changes; no renames of routes or collections. Anything uncertain is flagged, not touched.
