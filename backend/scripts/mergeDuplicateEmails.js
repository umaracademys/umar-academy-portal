/**
 * backend/scripts/mergeDuplicateEmails.js
 *
 * Merges duplicate emails in users, teachers, and admins:
 * - Keeps one user per email (earliest by createdAt); repoints Admin/Teacher/Student
 *   userId to that user, then deletes duplicate users.
 * - Keeps one admin per email (prefer linked to kept user); merges permissions
 *   (true wins over false); deletes duplicate admin docs.
 * - Keeps one teacher per email (prefer linked to kept user); merges permissions;
 *   deletes duplicate teacher docs.
 *
 * USAGE:
 *   node backend/scripts/mergeDuplicateEmails.js
 *   node backend/scripts/mergeDuplicateEmails.js --dry-run
 *   node backend/scripts/mergeDuplicateEmails.js --email faheem@gmail.com
 *   MONGODB_URI="mongodb+srv://..." node backend/scripts/mergeDuplicateEmails.js
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
const emailIdx = process.argv.indexOf('--email');
const EMAIL_FILTER = emailIdx >= 0 && process.argv[emailIdx + 1]
  ? process.argv[emailIdx + 1].toLowerCase().trim()
  : null;

// Minimal schemas (no backend/models for User/Teacher/Admin/Student)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  fullName: String
}, { strict: false, timestamps: true });
const User = mongoose.models.User || mongoose.model('User', userSchema);

const teacherSchema = new mongoose.Schema({}, { strict: false });
const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema);

const adminSchema = new mongoose.Schema({}, { strict: false });
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

const studentSchema = new mongoose.Schema({}, { strict: false });
const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

function normalizeEmail(email) {
  return typeof email === 'string' ? email.toLowerCase().trim() : '';
}

/** Merge permission objects: merged[key] = true if any doc has permissions[key] === true */
function mergePermissions(docs, keys) {
  const merged = {};
  for (const key of keys) {
    const anyTrue = docs.some((d) => d.permissions && d.permissions[key] === true);
    merged[key] = !!anyTrue;
  }
  return merged;
}

async function mergeDuplicates() {
  await mongoose.connect(MONGODB_URI);

  if (DRY_RUN) {
    console.log('--- DRY RUN: no documents will be updated or deleted ---\n');
  }
  if (EMAIL_FILTER) {
    console.log('--- Filtering to email:', EMAIL_FILTER, '---\n');
  }

  const users = await User.find({ email: { $exists: true, $ne: '' } })
    .sort({ createdAt: 1 })
    .lean();
  const teachers = await Teacher.find({ email: { $exists: true, $ne: '' } }).lean();
  const admins = await Admin.find({ email: { $exists: true, $ne: '' } }).lean();

  const userByEmail = new Map();
  users.forEach((u) => {
    const e = normalizeEmail(u.email);
    if (!e) return;
    if (EMAIL_FILTER && e !== EMAIL_FILTER) return;
    if (!userByEmail.has(e)) userByEmail.set(e, []);
    userByEmail.get(e).push(u);
  });

  const teacherByEmail = new Map();
  teachers.forEach((t) => {
    const e = normalizeEmail(t.email);
    if (!e) return;
    if (EMAIL_FILTER && e !== EMAIL_FILTER) return;
    if (!teacherByEmail.has(e)) teacherByEmail.set(e, []);
    teacherByEmail.get(e).push(t);
  });

  const adminByEmail = new Map();
  admins.forEach((a) => {
    const e = normalizeEmail(a.email);
    if (!e) return;
    if (EMAIL_FILTER && e !== EMAIL_FILTER) return;
    if (!adminByEmail.has(e)) adminByEmail.set(e, []);
    adminByEmail.get(e).push(a);
  });

  const duplicateUserEmails = [...userByEmail.entries()].filter(([, arr]) => arr.length > 1);
  const duplicateTeacherEmails = [...teacherByEmail.entries()].filter(([, arr]) => arr.length > 1);
  const duplicateAdminEmails = [...adminByEmail.entries()].filter(([, arr]) => arr.length > 1);

  if (duplicateUserEmails.length === 0 && duplicateTeacherEmails.length === 0 && duplicateAdminEmails.length === 0) {
    console.log('No duplicate emails found.');
    await mongoose.disconnect();
    return;
  }

  // --- 1. Merge duplicate USERS: keep earliest; repoint Admin/Teacher/Student; delete extras
  for (const [email, list] of duplicateUserEmails) {
    const [canonical, ...duplicates] = list;
    const canonicalId = canonical._id;
    const duplicateIds = duplicates.map((d) => d._id);

    console.log('\n[Users]', email, '— keep', canonicalId, '; repoint then delete', duplicateIds.length, 'duplicate(s)');

    for (const dupId of duplicateIds) {
      if (!DRY_RUN) {
        const resAdmin = await Admin.updateMany({ userId: dupId }, { $set: { userId: canonicalId } });
        const resTeacher = await Teacher.updateMany({ userId: dupId }, { $set: { userId: canonicalId } });
        const resStudent = await Student.updateMany({ userId: dupId }, { $set: { userId: canonicalId } });
        if (resAdmin.modifiedCount + resTeacher.modifiedCount + resStudent.modifiedCount > 0) {
          console.log('  Repointed Admin/Teacher/Student from', dupId, '→', canonicalId);
        }
        await User.deleteOne({ _id: dupId });
      }
      console.log('  Deleted user', dupId);
    }
  }

  // --- 2. Merge duplicate ADMINS: keep one (prefer userId = canonical user for that email), merge permissions
  for (const [email, list] of duplicateAdminEmails) {
    const canonicalUser = userByEmail.get(email);
    const canonicalUserId = canonicalUser && canonicalUser.length > 0
      ? canonicalUser[0]._id
      : null;

    const sorted = [...list].sort((a, b) => {
      const aMatch = a.userId && canonicalUserId && a.userId.toString() === canonicalUserId.toString() ? 1 : 0;
      const bMatch = b.userId && canonicalUserId && b.userId.toString() === canonicalUserId.toString() ? 1 : 0;
      if (bMatch !== aMatch) return bMatch - aMatch;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime;
    });
    const [keep, ...remove] = sorted;
    const allDocs = list;
    const mergedPerms = mergePermissions(allDocs, ALL_ADMIN_PERMISSION_KEYS);

    console.log('\n[Admins]', email, '— keep', keep._id, '; merge permissions; delete', remove.length, 'duplicate(s)');

    if (!DRY_RUN) {
      await Admin.updateOne({ _id: keep._id }, { $set: { permissions: mergedPerms } });
      await Admin.deleteMany({ _id: { $in: remove.map((r) => r._id) } });
    }
    console.log('  Merged', Object.keys(mergedPerms).length, 'permission keys (true wins)');
  }

  // --- 3. Merge duplicate TEACHERS: keep one (prefer userId = canonical user), merge permissions
  for (const [email, list] of duplicateTeacherEmails) {
    const canonicalUser = userByEmail.get(email);
    const canonicalUserId = canonicalUser && canonicalUser.length > 0
      ? canonicalUser[0]._id
      : null;

    const sorted = [...list].sort((a, b) => {
      const aMatch = a.userId && canonicalUserId && a.userId.toString() === canonicalUserId.toString() ? 1 : 0;
      const bMatch = b.userId && canonicalUserId && b.userId.toString() === canonicalUserId.toString() ? 1 : 0;
      if (bMatch !== aMatch) return bMatch - aMatch;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime;
    });
    const [keep, ...remove] = sorted;
    const allDocs = list;
    const mergedPerms = mergePermissions(allDocs, ALL_TEACHER_PERMISSION_KEYS);

    console.log('\n[Teachers]', email, '— keep', keep._id, '; merge permissions; delete', remove.length, 'duplicate(s)');

    if (!DRY_RUN) {
      await Teacher.updateOne({ _id: keep._id }, { $set: { permissions: mergedPerms } });
      await Teacher.deleteMany({ _id: { $in: remove.map((r) => r._id) } });
    }
    console.log('  Merged', Object.keys(mergedPerms).length, 'permission keys (true wins)');
  }

  console.log('\n' + (DRY_RUN ? 'Dry run complete. Run without --dry-run to apply.' : '✅ Merge complete.'));
  await mongoose.disconnect();
}

mergeDuplicates().catch((err) => {
  console.error('Error merging duplicates:', err);
  process.exit(1);
});
