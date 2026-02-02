/**
 * Audit database for user role vs permission inconsistencies.
 *
 * Rules:
 * - Students: must not have teacher/admin permissions (only STUDENT_ALLOWED_IDS allowed).
 * - Teachers: must have all 52 teacher permission keys.
 * - Admins: must have all 45 admin permission keys.
 * - Superadmin: no checks (full access).
 * - Orphaned: role=teacher/admin/superadmin with no matching teacher/admin document.
 * - Duplicate emails: case-insensitive in users, teachers, admins.
 *
 * Run: node backend/scripts/auditRolePermissionConsistency.js --dry-run
 *      node backend/scripts/auditRolePermissionConsistency.js --fix-missing
 *      node backend/scripts/auditRolePermissionConsistency.js --fix-student --fix-orphans --fix-duplicates
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const mongoose = require('mongoose');
const { ALL_TEACHER_PERMISSION_KEYS, ALL_ADMIN_PERMISSION_KEYS } = require('../shared/permissions');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';
const DRY_RUN = process.argv.includes('--dry-run');
const FIX_MISSING = process.argv.includes('--fix-missing');
const FIX_STUDENT = process.argv.includes('--fix-student');
const FIX_ORPHANS = process.argv.includes('--fix-orphans');
const FIX_DUPLICATES = process.argv.includes('--fix-duplicates');

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

const TEACHER_KEYS_SET = new Set(ALL_TEACHER_PERMISSION_KEYS);
const ADMIN_KEYS_SET = new Set(ALL_ADMIN_PERMISSION_KEYS);
const INVALID_FOR_STUDENT = new Set([...ALL_TEACHER_PERMISSION_KEYS, ...ALL_ADMIN_PERMISSION_KEYS]);

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

  const users = await User.find({}).lean();
  const teachers = await Teacher.find({}).lean();
  const admins = await Admin.find({}).lean();

  const teacherByUserId = new Map();
  const teacherByEmail = new Map();
  teachers.forEach((t) => {
    const uid = t.userId ? t.userId.toString() : null;
    if (uid) teacherByUserId.set(uid, t);
    const e = normalizeEmail(t.email);
    if (e) teacherByEmail.set(e, t);
  });
  const adminByUserId = new Map();
  const adminByEmail = new Map();
  admins.forEach((a) => {
    const uid = a.userId ? a.userId.toString() : null;
    if (uid) adminByUserId.set(uid, a);
    const e = normalizeEmail(a.email);
    if (e) adminByEmail.set(e, a);
  });

  const summary = {
    usersChecked: 0,
    teachersWithMissingPermissions: 0,
    adminsWithMissingPermissions: 0,
    studentsWithInvalidPermissions: 0,
    orphanedUsers: 0,
    duplicateEmailGroups: 0,
  };

  const details = [];
  const orphanedList = [];
  const duplicateUsers = new Map();
  const duplicateTeachers = new Map();
  const duplicateAdmins = new Map();

  // Duplicate emails (case-insensitive)
  function collectDuplicates(collection, key, map) {
    collection.forEach((doc) => {
      const e = normalizeEmail(doc.email);
      if (!e) return;
      if (!map.has(e)) map.set(e, []);
      map.get(e).push({ _id: doc._id.toString(), email: doc.email, name: doc.fullName || doc.name });
    });
  }
  collectDuplicates(users, 'email', duplicateUsers);
  collectDuplicates(teachers, 'email', duplicateTeachers);
  collectDuplicates(admins, 'email', duplicateAdmins);
  const dupUserGroups = [...duplicateUsers.entries()].filter(([, arr]) => arr.length > 1);
  const dupTeacherGroups = [...duplicateTeachers.entries()].filter(([, arr]) => arr.length > 1);
  const dupAdminGroups = [...duplicateAdmins.entries()].filter(([, arr]) => arr.length > 1);
  summary.duplicateEmailGroups = dupUserGroups.length + dupTeacherGroups.length + dupAdminGroups.length;

  for (const user of users) {
    summary.usersChecked++;
    const userId = user._id.toString();
    const email = user.email || '(empty)';
    const role = (user.role || '').toLowerCase();

    // Superadmin: skip permission checks
    if (role === 'superadmin') {
      const hasAdminDoc = adminByUserId.has(userId) || adminByEmail.has(normalizeEmail(user.email));
      if (!hasAdminDoc) {
        orphanedList.push({ userId, email, role, issue: 'Orphaned (no admin document)' });
        summary.orphanedUsers++;
        details.push({
          userId,
          email,
          role,
          issue: 'Orphaned user',
          missingOrInvalid: ['No matching admin document'],
        });
      }
      continue;
    }

    if (role === 'student') {
      const perms = user.permissions && typeof user.permissions === 'object' ? user.permissions : {};
      const invalidKeys = Object.keys(perms).filter((k) => INVALID_FOR_STUDENT.has(k));
      if (invalidKeys.length > 0) {
        summary.studentsWithInvalidPermissions++;
        details.push({
          userId,
          email,
          role,
          issue: 'Student has teacher/admin permission keys',
          missingOrInvalid: invalidKeys,
        });
        if (FIX_STUDENT && !DRY_RUN) {
          await User.updateOne({ _id: user._id }, { $unset: { permissions: '' } });
          console.log('  Fixed student', email, ': removed invalid permissions');
        }
      }
      continue;
    }

    if (role === 'teacher') {
      const teacher = teacherByUserId.get(userId) || teacherByEmail.get(normalizeEmail(user.email));
      if (!teacher) {
        orphanedList.push({ userId, email, role, issue: 'Orphaned (no teacher document)' });
        summary.orphanedUsers++;
        details.push({
          userId,
          email,
          role,
          issue: 'Orphaned user',
          missingOrInvalid: ['No matching teacher document'],
        });
        continue;
      }
      const perms = teacher.permissions && typeof teacher.permissions === 'object' ? teacher.permissions : {};
      const missing = ALL_TEACHER_PERMISSION_KEYS.filter((k) => !Object.prototype.hasOwnProperty.call(perms, k));
      if (missing.length > 0) {
        summary.teachersWithMissingPermissions++;
        details.push({
          userId,
          email,
          role,
          issue: 'Teacher missing permission keys',
          missingOrInvalid: missing,
        });
        if (FIX_MISSING && !DRY_RUN) {
          const next = { ...perms };
          missing.forEach((k) => (next[k] = false));
          await Teacher.updateOne({ _id: teacher._id }, { $set: { permissions: next } });
          console.log('  Fixed teacher', email, ': added', missing.length, 'keys');
        }
      }
      continue;
    }

    if (role === 'admin') {
      const admin = adminByUserId.get(userId) || adminByEmail.get(normalizeEmail(user.email));
      if (!admin) {
        orphanedList.push({ userId, email, role, issue: 'Orphaned (no admin document)' });
        summary.orphanedUsers++;
        details.push({
          userId,
          email,
          role,
          issue: 'Orphaned user',
          missingOrInvalid: ['No matching admin document'],
        });
        continue;
      }
      const perms = admin.permissions && typeof admin.permissions === 'object' ? admin.permissions : {};
      const missing = ALL_ADMIN_PERMISSION_KEYS.filter((k) => !Object.prototype.hasOwnProperty.call(perms, k));
      if (missing.length > 0) {
        summary.adminsWithMissingPermissions++;
        details.push({
          userId,
          email,
          role,
          issue: 'Admin missing permission keys',
          missingOrInvalid: missing,
        });
        if (FIX_MISSING && !DRY_RUN) {
          const next = { ...perms };
          missing.forEach((k) => (next[k] = false));
          await Admin.updateOne({ _id: admin._id }, { $set: { permissions: next } });
          console.log('  Fixed admin', email, ': added', missing.length, 'keys');
        }
      }
    }
  }

  // orphanedUsers already incremented in loop

  // ---------- Output ----------
  section('Summary');

  console.log('| Metric                              | Count |');
  console.log('|-------------------------------------|-------|');
  console.log('| Users checked                      |', String(summary.usersChecked).padStart(5), '|');
  console.log('| Teachers with missing permissions  |', String(summary.teachersWithMissingPermissions).padStart(5), '|');
  console.log('| Admins with missing permissions    |', String(summary.adminsWithMissingPermissions).padStart(5), '|');
  console.log('| Students with invalid permissions  |', String(summary.studentsWithInvalidPermissions).padStart(5), '|');
  console.log('| Orphaned users                      |', String(summary.orphanedUsers).padStart(5), '|');
  console.log('| Duplicate email groups              |', String(summary.duplicateEmailGroups).padStart(5), '|');

  section('Detailed report');

  if (details.length === 0) {
    console.log('No role-permission mismatches found.');
  } else {
    details.forEach((d, i) => {
      console.log(`\n${i + 1}. userId=${d.userId} email=${d.email} role=${d.role}`);
      console.log(`   Issue: ${d.issue}`);
      console.log(`   Missing/invalid: ${d.missingOrInvalid.slice(0, 10).join(', ')}${d.missingOrInvalid.length > 10 ? '...' : ''}`);
    });
  }

  if (FIX_ORPHANS && orphanedList.length > 0) {
    subsection('Orphaned users (logged)');
    orphanedList.forEach((o) => console.log(`  ${o.email} (${o.role}) ${o.issue}`));
    console.log('  No automatic cleanup. Create teacher/admin document or change role manually.');
  }

  if (FIX_DUPLICATES && summary.duplicateEmailGroups > 0) {
    subsection('Duplicate emails (logged)');
    dupUserGroups.forEach(([email, arr]) => console.log(`  users: ${email} -> ${arr.length} docs`));
    dupTeacherGroups.forEach(([email, arr]) => console.log(`  teachers: ${email} -> ${arr.length} docs`));
    dupAdminGroups.forEach(([email, arr]) => console.log(`  admins: ${email} -> ${arr.length} docs`));
    console.log('  Manual merge recommended. Choose canonical document and remove/merge duplicates.');
  }

  section('Suggestions for fixes');

  console.log('1. Add missing keys (set to false): run with --fix-missing (or use permissionsAuditAndFix.js).');
  console.log('2. Remove invalid keys for students: run with --fix-student (strips permissions field on User).');
  console.log('3. Orphaned users: run with --fix-orphans to log; create teacher/admin doc or change user role manually.');
  console.log('4. Duplicate emails: run with --fix-duplicates to log; resolve manually (choose first occurrence, merge or remove).');
  if (DRY_RUN && (FIX_MISSING || FIX_STUDENT)) {
    console.log('\n--dry-run: no database writes were performed. Omit --dry-run to apply fixes.');
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
