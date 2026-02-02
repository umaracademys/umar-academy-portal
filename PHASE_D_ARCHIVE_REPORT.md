# Phase D — Archive Legacy Backend Scripts (Report)

**Goal:** Organize, document, and archive legacy one-off backend scripts without breaking the app or production flows.

**Execution rule:** Only move and comment scripts; no active scripts deleted.

---

## Step 1 — Identification

- **Source:** All `.js` files in `backend/scripts/` (moved there in Phase B).
- **Cross-reference:** `backend/package.json` and root `package.json` were checked. No file in `backend/scripts/` is referenced by any npm script.
- **Active scripts** (used by npm/production) live in **`backend/` root**, not in `backend/scripts/`:
  - `seedDatabase.js`, `clearDatabase.js`, `migrateSqliteToMongo.js`, `migrateQuranFromApi.js` (backend package.json)
  - `createDeveloper.js`, `createDeveloperProduction.js`, `checkDeveloperAccount.js`, `createTestUsers.js`, `production-test.js` (root package.json)

**Conclusion:** All 45 `.js` files in `backend/scripts/` were treated as legacy/one-off and archived.

---

## Step 2 — Categorization

| Category              | Action taken                                                                 |
|-----------------------|-------------------------------------------------------------------------------|
| Active scripts        | None in `backend/scripts/`. Active scripts remain in `backend/` root.        |
| Legacy/one-off scripts| Moved to `backend/scripts/legacy/` with deprecation comment at top.           |
| Experimental/test     | No separate folder; `testEndpoints.js`, `testMongoConnection.js` in legacy/. |

---

## Step 3 — LEGACY comments

Every script moved to `backend/scripts/legacy/` has at the top:

```js
// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.
```

(Replaced the previous 3-line "LEGACY / OPS SCRIPT" block.)

---

## Step 4 — Path fixes for moved scripts

Scripts that required backend paths were updated for the new location (`backend/scripts/legacy/`):

| File                      | Change                                                                 |
|---------------------------|------------------------------------------------------------------------|
| `migrateMessages.js`      | `require('../server')` → `require('../../server')`; `require('../models/legacy/...)` → `require('../../models/legacy/...)` |
| `testEndpoints.js`        | `require('./config/jwt')` → `require('../../config/jwt')`             |
| `populateMongoFromPublicDb.js` | `require('./quranSchemas')` → `require('../../quranSchemas')`; `path.join(__dirname, '..', 'public', ...)` → `path.join(__dirname, '..', '..', 'public', ...)` |

---

## Step 5 — README update

**`backend/scripts/README.md`** now includes:

- **Active scripts** — list of scripts used in npm/production (all in `backend/` root).
- **Legacy scripts** — list of archived scripts in `backend/scripts/legacy/`.
- **Experimental scripts** — note that test/ad-hoc scripts are in `legacy/`.
- **Note:** “Do not import legacy scripts in production code unless explicitly required for historical/manual operations.”
- Run example updated to: `node backend/scripts/legacy/scriptName.js`.

---

## Legacy moves (45 files)

All moved from `backend/scripts/` → `backend/scripts/legacy/`:

- addTeacher.js, addTeacherForUser.js  
- checkAllStudents.js, checkAllUsers.js, checkAssignments.js, checkDatabase.js, checkDataSaved.js  
- checkEmail.js, checkEvaluation.js, checkProductionStudents.js, checkSpecificUser.js  
- checkStudents.js, checkSuperAdmin.js, checkUser.js  
- createAdminProfile.js, createAdminUser.js, createDeveloperViaAPI.js, createMissingTeachers.js, createStudentUser.js  
- exportToLocalMongo.js, exportToLocalMongoWithDump.js  
- fixAllUserLogins.js, fixLockedAccounts.js, fixPasswordMismatches.js, fixProductionUserLogins.js  
- fixStudentLogins.js, fixSuperAdminEmail.js  
- investigateDuplicateAdmins.js  
- migrateMessages.js, mongoShell.js  
- populateMongoFromPublicDb.js  
- resetPassword.js, resetStudentPassword.js, resetSuperAdminLockout.js, resetSuperAdminPassword.js  
- searchSaria.js, syncProductionStudents.js  
- testEndpoints.js, testMongoConnection.js  
- unlockAccount.js, updateSuperAdminPassword.js, updateUserPasswords.js  
- verifyMongoConnection.js, verifyProductionMongo.js, verifyStudentList.js  

---

## Run instructions for legacy scripts

From repo root:

```bash
node backend/scripts/legacy/<scriptName>.js
```

Examples:

- `node backend/scripts/legacy/checkUser.js user@example.com`
- `node backend/scripts/legacy/resetSuperAdminPassword.js`
- `node backend/scripts/legacy/migrateMessages.js`

---

## Verification (completed)

- **Build:** `pnpm run build:mushaf` and `pnpm run build:fast` — **passed** (no regressions).
- **Tests:** `pnpm run test` — failures are **pre-existing** (dataCache.test.ts, Playwright specs under Vitest, sabq-audio missing supertest); no new failures from Phase D.
- **Manual:** Run an active script (e.g. from backend root: `node backend/seedDatabase.js`) to confirm paths; run a legacy script (e.g. `node backend/scripts/legacy/checkUser.js <email>`) to confirm legacy paths.

---

## Conclusion

- All 45 legacy scripts are archived in **`backend/scripts/legacy/`** with LEGACY comments at the top of each file.
- Active scripts (seedDatabase.js, migrateSqliteToMongo.js, createDeveloper.js, etc.) remain untouched in **`backend/` root**.
- **`backend/scripts/README.md`** and **`PHASE_D_ARCHIVE_REPORT.md`** are updated with categorization, path fixes, and run instructions.
- Builds pass (`pnpm run build:mushaf`, `pnpm run build:fast`); no new test failures introduced by Phase D.

---

## Optional (Step 6)

After archiving legacy scripts for at least one deployment cycle and confirming they are never used by production, consider removing them permanently. Not done in this phase.
