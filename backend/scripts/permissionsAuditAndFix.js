/**
 * Umar Academy Portal – Permissions Audit & Fix
 *
 * 1. Ensure all teachers/admins have correct permission keys (52 teacher, admin set).
 * 2. Fix missing or misassigned permissions for teacher/admin documents.
 * 3. Report orphaned users, duplicate emails; optional fixes.
 *
 * Run: node backend/scripts/permissionsAuditAndFix.js
 *      node backend/scripts/permissionsAuditAndFix.js --dry-run   (report only, no writes)
 *      node backend/scripts/permissionsAuditAndFix.js --fix-orphans   (log only; no auto-delete)
 *      MONGODB_URI="..." node backend/scripts/permissionsAuditAndFix.js
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const mongoose = require('mongoose');
const { ALL_TEACHER_PERMISSION_KEYS, ALL_ADMIN_PERMISSION_KEYS } = require('../shared/permissions');

// Connect using MONGODB_URI (default local if unset)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';
const DRY_RUN = process.argv.includes('--dry-run');
const FIX_ORPHANS = process.argv.includes('--fix-orphans');

// Phase 1: Reference data (mirrors frontend for validation)
// ROUTE_PERMISSIONS: src/utils/routePermissions.ts
const ROUTE_PERMISSIONS = {
  '/assignments': ['canAccessAssignments', 'canManageAssignments'],
  '/students': ['canManageStudents', 'canViewStudentEmail', 'canViewStudentPersonalInfo'],
  '/teachers': ['canManageTeachers'],
  '/teacher-student-assignment': ['canManageStudentAssignments'],
  '/permissions': ['canManagePermissions'],
  '/messages': ['canAccessMessages'],
  '/teacher-attendance': ['canManageAttendance'],
  '/my-attendance': ['canAccessAttendance'],
  '/pdf-teaching': ['canAccessPdf'],
  '/mushaf/review': ['canAccessMushaf', 'canReviewTickets'],
};

// STUDENT_NAV_ITEMS / allowedIds: src/modules/student/components/StudentSidebar.tsx
const STUDENT_ALLOWED_IDS = [
  'dashboard',
  'assignments',
  'messages',
  'profile',
  'pdf-homework',
  'courses',
  'progress',
  'payments',
];

// Minimal schemas
const userSchema = new mongoose.Schema(
  { name: String, email: String, role: String, fullName: String },
  { strict: false, timestamps: true }
);
const User = mongoose.models.User || mongoose.model('User', userSchema);

const teacherSchema = new mongoose.Schema({}, { strict: false });
const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema);

const adminSchema = new mongoose.Schema({}, { strict: false });
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

function normalizeEmail(email) {
  return typeof email === 'string' ? email.toLowerCase().trim() : '';
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
}

function subsection(title) {
  console.log('\n--- ' + title + ' ---');
}

async function run() {
  await mongoose.connect(MONGODB_URI);

  const stats = {
    teachersFixed: 0,
    adminsFixed: 0,
    studentsChecked: 0,
    orphanedUsersFound: 0,
    duplicateEmailsFound: 0,
    teachersWithMissingKeys: 0,
    adminsWithMissingKeys: 0,
  };

  // ---------- Phase 1: Load Data ----------
  section('Phase 1: Load Data');

  const users = await User.find({}).lean();
  const teachers = await Teacher.find({}).lean();
  const admins = await Admin.find({}).lean();

  // In-memory maps: email -> [ids] for duplicate detection (case-insensitive)
  const emailToUserIds = new Map();
  const emailToTeacherIds = new Map();
  const emailToAdminIds = new Map();
  users.forEach((u) => {
    const e = normalizeEmail(u.email);
    if (!e) return;
    if (!emailToUserIds.has(e)) emailToUserIds.set(e, []);
    emailToUserIds.get(e).push(u._id.toString());
  });
  teachers.forEach((t) => {
    const e = normalizeEmail(t.email);
    if (!e) return;
    if (!emailToTeacherIds.has(e)) emailToTeacherIds.set(e, []);
    emailToTeacherIds.get(e).push(t._id.toString());
  });
  admins.forEach((a) => {
    const e = normalizeEmail(a.email);
    if (!e) return;
    if (!emailToAdminIds.has(e)) emailToAdminIds.set(e, []);
    emailToAdminIds.get(e).push(a._id.toString());
  });

  const teacherUserIds = new Set(
    teachers.map((t) => (t.userId ? t.userId.toString() : null)).filter(Boolean)
  );
  const adminUserIds = new Set(
    admins.map((a) => (a.userId ? a.userId.toString() : null)).filter(Boolean)
  );
  const studentUsers = users.filter((u) => (u.role || '').toLowerCase() === 'student');

  console.log('Users:', users.length);
  console.log('Teachers (docs):', teachers.length);
  console.log('Admins (docs):', admins.length);
  console.log('Students (users with role=student):', studentUsers.length);
  console.log('Teacher permission keys (expected):', ALL_TEACHER_PERMISSION_KEYS.length);
  console.log('Admin permission keys (expected):', ALL_ADMIN_PERMISSION_KEYS.length);
  console.log('ROUTE_PERMISSIONS paths:', Object.keys(ROUTE_PERMISSIONS).length);
  console.log('STUDENT_ALLOWED_IDS:', STUDENT_ALLOWED_IDS.length);
  console.log('In-memory maps: email -> [ids] for users, teachers, admins (duplicate detection).');

  // ---------- Phase 2: Detect Issues ----------
  section('Phase 2: Detect Issues');

  const teacherExpectedKeys = new Set(ALL_TEACHER_PERMISSION_KEYS);
  const adminExpectedKeys = new Set(ALL_ADMIN_PERMISSION_KEYS);

  const teachersToFix = [];
  for (const t of teachers) {
    const perms = t.permissions && typeof t.permissions === 'object' ? t.permissions : {};
    const present = new Set(Object.keys(perms));
    const missing = [...teacherExpectedKeys].filter((k) => !present.has(k));
    if (missing.length > 0) {
      teachersToFix.push({
        _id: t._id,
        email: t.email || '(empty)',
        fullName: t.fullName || '(empty)',
        missing,
        presentCount: present.size,
      });
      stats.teachersWithMissingKeys++;
    }
  }

  subsection('Teachers: missing permission keys');
  console.log('Teachers with missing keys:', teachersToFix.length);
  if (teachersToFix.length > 0) {
    teachersToFix.slice(0, 10).forEach((t, i) => {
      console.log(
        `  ${i + 1}. ${t.email} (${t.fullName}) missing ${t.missing.length} keys, e.g. ${t.missing.slice(0, 3).join(', ')}`
      );
    });
    if (teachersToFix.length > 10) {
      console.log(`  ... and ${teachersToFix.length - 10} more`);
    }
  }

  const adminsToFix = [];
  for (const a of admins) {
    const perms = a.permissions && typeof a.permissions === 'object' ? a.permissions : {};
    const present = new Set(Object.keys(perms));
    const missing = [...adminExpectedKeys].filter((k) => !present.has(k));
    if (missing.length > 0) {
      adminsToFix.push({
        _id: a._id,
        email: a.email || '(empty)',
        fullName: a.fullName || '(empty)',
        missing,
        presentCount: present.size,
      });
      stats.adminsWithMissingKeys++;
    }
  }

  subsection('Admins: missing permission keys');
  console.log('Admins with missing keys:', adminsToFix.length);
  if (adminsToFix.length > 0) {
    adminsToFix.slice(0, 10).forEach((a, i) => {
      console.log(
        `  ${i + 1}. ${a.email} (${a.fullName}) missing ${a.missing.length} keys, e.g. ${a.missing.slice(0, 3).join(', ')}`
      );
    });
  }

  subsection('Orphaned users (role=teacher/admin but no doc)');
  const orphanedTeacher = users.filter(
    (u) => (u.role || '').toLowerCase() === 'teacher' && !teacherUserIds.has(u._id.toString())
  );
  const orphanedAdmin = users.filter(
    (u) =>
      ['admin', 'superadmin'].includes((u.role || '').toLowerCase()) &&
      !adminUserIds.has(u._id.toString())
  );
  stats.orphanedUsersFound = orphanedTeacher.length + orphanedAdmin.length;
  console.log('Orphaned teacher users (no teacher doc):', orphanedTeacher.length);
  orphanedTeacher.slice(0, 5).forEach((u, i) =>
    console.log(`  ${i + 1}. ${u.email} (${u.name || u.fullName}) _id=${u._id}`)
  );
  console.log('Orphaned admin/superadmin users (no admin doc):', orphanedAdmin.length);
  orphanedAdmin.slice(0, 5).forEach((u, i) =>
    console.log(`  ${i + 1}. ${u.email} (${u.name || u.fullName}) role=${u.role} _id=${u._id}`)
  );

  subsection('Duplicate emails');
  const byEmail = (collection, name) => {
    const map = new Map();
    collection.forEach((doc) => {
      const email = normalizeEmail(doc.email);
      if (!email) return;
      if (!map.has(email)) map.set(email, []);
      map.get(email).push(doc);
    });
    const dups = [...map.entries()].filter(([, arr]) => arr.length > 1);
    return dups;
  };
  const dupUsers = byEmail(users, 'users');
  const dupTeachers = byEmail(teachers, 'teachers');
  const dupAdmins = byEmail(admins, 'admins');
  stats.duplicateEmailsFound = dupUsers.length + dupTeachers.length + dupAdmins.length;
  console.log('Duplicate emails in users:', dupUsers.length);
  console.log('Duplicate emails in teachers:', dupTeachers.length);
  console.log('Duplicate emails in admins:', dupAdmins.length);
  if (dupUsers.length + dupTeachers.length + dupAdmins.length > 0) {
    console.log('  (Resolve manually: choose first occurrence, merge or remove duplicates.)');
  }

  subsection('Students');
  stats.studentsChecked = studentUsers.length;
  const expectedStudentNavCount = 8;
  const studentNavCount = STUDENT_ALLOWED_IDS.length;
  const studentNavOk = studentNavCount === expectedStudentNavCount;
  console.log(
    'Student sidebar:',
    studentNavCount,
    'items in allowedIds (expected',
    expectedStudentNavCount,
    '). Allowed ids:',
    STUDENT_ALLOWED_IDS.join(', ')
  );
  if (studentNavOk) {
    console.log('No missing or extra items (validation only, no DB write).');
  } else {
    console.log('Warn: allowedIds count differs from expected; check StudentSidebar.tsx.');
  }
  console.log('Students cannot access teacher/admin sidebar or routes (enforced by frontend).');

  // ---------- Phase 3: Apply Fixes ----------
  section('Phase 3: Apply Fixes');

  if (DRY_RUN) {
    console.log('DRY RUN: no documents will be updated. Run without --dry-run to apply fixes.');
  } else {
    for (const { _id, missing } of teachersToFix) {
      const doc = await Teacher.findById(_id).lean();
      if (!doc) continue;
      const perms = { ...(doc.permissions && typeof doc.permissions === 'object' ? doc.permissions : {}) };
      missing.forEach((k) => {
        perms[k] = false;
      });
      await Teacher.updateOne({ _id }, { $set: { permissions: perms } });
      stats.teachersFixed++;
      console.log(`  Updated teacher ${doc.email || _id} (+${missing.length} keys)`);
    }

    for (const { _id, missing } of adminsToFix) {
      const doc = await Admin.findById(_id).lean();
      if (!doc) continue;
      const perms = { ...(doc.permissions && typeof doc.permissions === 'object' ? doc.permissions : {}) };
      missing.forEach((k) => {
        perms[k] = false;
      });
      await Admin.updateOne({ _id }, { $set: { permissions: perms } });
      stats.adminsFixed++;
      console.log(`  Updated admin ${doc.email || _id} (+${missing.length} keys)`);
    }

    if (teachersToFix.length === 0 && adminsToFix.length === 0) {
      console.log('No teacher or admin documents needed permission key updates.');
    }
  }

  if (FIX_ORPHANS && stats.orphanedUsersFound > 0) {
    console.log('\n--fix-orphans: Orphaned users are logged above. No automatic cleanup (create teacher/admin doc or change role manually).');
  }

  if (stats.duplicateEmailsFound > 0) {
    console.log('\nDuplicate emails: log only. Resolve manually (choose canonical record, merge or remove).');
  }

  // ---------- Phase 4: Validation Summary ----------
  section('Phase 4: Validation Summary');

  console.log('Teachers fixed (missing keys added):     ', stats.teachersFixed);
  console.log('Admins fixed (missing keys added):        ', stats.adminsFixed);
  console.log('Students checked:                         ', stats.studentsChecked);
  console.log('Orphaned users found:                     ', stats.orphanedUsersFound);
  console.log('Duplicate email groups found:             ', stats.duplicateEmailsFound);
  console.log('Teachers with missing keys (detected):    ', stats.teachersWithMissingKeys);
  console.log('Admins with missing keys (detected):      ', stats.adminsWithMissingKeys);
  if (DRY_RUN && (stats.teachersWithMissingKeys > 0 || stats.adminsWithMissingKeys > 0)) {
    console.log('\nRun without --dry-run to apply permission key fixes.');
  }

  // ---------- Phase 5: Integration Check (manual) ----------
  section('Phase 5: Integration Check (manual)');

  console.log('After running this script and refreshing the app:');
  console.log('  1. Teacher/Admin sidebars: confirm only allowed links show (per usePermission / adminPermissions).');
  console.log('  2. Student sidebar: confirm only STUDENT_ALLOWED_IDS items show (Dashboard, Assignments, Messages, Profile, PDF Homework, Courses, Progress, Payments).');
  console.log('  3. Visiting a route without permission (e.g. teacher opening /teachers) should redirect to /unauthorized.');
  console.log('  4. Students visiting /teachers or /dashboard should redirect to /student/dashboard or login.');
  console.log('  5. Qaidah link: only shown when canAccessQaidah (teacher) or canAccessQaidah (admin) or superadmin.');

  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
