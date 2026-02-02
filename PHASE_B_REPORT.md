# Phase B — Move / Merge Report

**Completed:** Backend one-off scripts moved; documentation consolidated; LEGACY comment added to moved scripts.

---

## 1. Backend scripts → `backend/scripts/`

**Moved (44 files):**

- addTeacher.js, addTeacherForUser.js  
- checkAllStudents.js, checkAllUsers.js, checkAssignments.js, checkDatabase.js, checkDataSaved.js, checkEmail.js, checkEvaluation.js, checkProductionStudents.js, checkSpecificUser.js, checkStudents.js, checkSuperAdmin.js, checkUser.js  
- createAdminProfile.js, createAdminUser.js, createDeveloperViaAPI.js, createMissingTeachers.js, createStudentUser.js  
- fixAllUserLogins.js, fixLockedAccounts.js, fixPasswordMismatches.js, fixProductionUserLogins.js, fixStudentLogins.js, fixSuperAdminEmail.js  
- investigateDuplicateAdmins.js  
- exportToLocalMongo.js, exportToLocalMongoWithDump.js, populateMongoFromPublicDb.js, mongoShell.js  
- resetPassword.js, resetStudentPassword.js, resetSuperAdminLockout.js, resetSuperAdminPassword.js  
- searchSaria.js, syncProductionStudents.js, unlockAccount.js, updateSuperAdminPassword.js, updateUserPasswords.js  
- verifyMongoConnection.js, verifyProductionMongo.js, verifyStudentList.js  
- testEndpoints.js, testMongoConnection.js  

**Not moved (still in `backend/` root):**

- server.js, connectMongo.js, security.js, quranSchemas.js  
- seedDatabase.js, clearDatabase.js, migrateSqliteToMongo.js, migrateQuranFromApi.js (used by backend `package.json`)  
- createDeveloper.js, createDeveloperProduction.js, checkDeveloperAccount.js, createTestUsers.js, production-test.js (used by root `package.json`)  
- config/, middleware/, models/, routes/, schemas/, services/, shared/, utils/  
- add-sample-users.cjs, countUsers.js  

**How to run a moved script:** From repo root: `node backend/scripts/<scriptName>.js [args]`

---

## 2. Documentation consolidated

- **Root `.md`** (except README.md) → **docs/audits/**  
  README.md remains at repo root.

- **backend/docs/*.md** → **docs/backend/**  
  (NOTIFICATION_USAGE_EXAMPLES.md, SABQ_AUDIO_API.md)

- **backend/*.md** (MIGRATION_INSTRUCTIONS, NOTIFICATION_REFACTOR_SUMMARY, RENDER_MIGRATION_STEPS, SABQ_AUDIO_IMPLEMENTATION_SUMMARY) → **docs/backend/**

- **src/docs/*.md** → **docs/frontend/**  
  (NOTIFICATIONS_INTEGRATION.md)

- **New folders:** docs/audits, docs/guides, docs/testing, docs/frontend, docs/backend, docs/references (guides/testing/references are empty for now).

---

## 3. LEGACY/OPS comment

Prepending line added to every `backend/scripts/*.js` that did not already contain it:

```text
// LEGACY / OPS SCRIPT: Manual usage only. See docs/audits/DEVELOPER_ACCESS_GUIDE.md for instructions.
```

---

## 4. Verification

- **Server:** Does not require any of the moved scripts; no changes to server.js or app behavior.
- **npm scripts:** Unchanged (createDeveloper, createTestUsers, seed, migrate, etc. still point to files in `backend/` root).
- **Docs:** Any doc that said “run `node backend/checkUser.js`” should now say “run `node backend/scripts/checkUser.js`”. Search for `backend/checkUser`, `backend/addTeacher`, etc. in `docs/` and update if you rely on those instructions.

---

## 5. Next steps (reminder)

1. Build mushaf: `pnpm run build:mushaf`  
2. Build app: `pnpm run build:fast`  
3. Run tests: `pnpm run test`  
4. Manually check scripts in `backend/scripts/` when needed (run from repo root with `node backend/scripts/<name>.js`).
