/**
 * Full audit of MongoDB users, teachers, and admins collections
 * for the Umar Academy LMS project.
 *
 * Run: node backend/scripts/auditMongoUsersTeachersAdmins.js
 *      node backend/scripts/auditMongoUsersTeachersAdmins.js --samples   (include sample records)
 *      node backend/scripts/auditMongoUsersTeachersAdmins.js --output report.txt
 *      MONGODB_URI="..." node backend/scripts/auditMongoUsersTeachersAdmins.js
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const mongoose = require('mongoose');
const { ALL_TEACHER_PERMISSION_KEYS, ALL_ADMIN_PERMISSION_KEYS } = require('../shared/permissions');

const fs = require('fs');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';
const INCLUDE_SAMPLES = process.argv.includes('--samples');
const outIdx = process.argv.indexOf('--output');
const OUTPUT_FILE = outIdx >= 0 && process.argv[outIdx + 1] ? process.argv[outIdx + 1] : null;
let logBuffer = [];
function log(msg) {
  const line = typeof msg === 'string' ? msg : JSON.stringify(msg);
  console.log(line);
  logBuffer.push(line);
}

// Minimal schemas for read-only audit (no schema drift issues)
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

function normalizeEmail(email) {
  return typeof email === 'string' ? email.toLowerCase().trim() : '';
}

function sample(arr, n = 3) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  return arr.slice(0, n);
}

function section(title) {
  log('\n' + '='.repeat(60));
  log(title);
  log('='.repeat(60));
}

function subsection(title) {
  log('\n--- ' + title + ' ---');
}

async function runAudit() {
  const report = {
    teachersMissingUserId: [],
    teachersEmailNotInUsers: [],
    usersTeacherNoTeacherDoc: [],
    usersAdminNoAdminDoc: [],
    duplicateEmailsUsers: [],
    duplicateEmailsTeachers: [],
    duplicateEmailsAdmins: [],
    orphanedUsersTeacher: [],
    orphanedUsersAdmin: [],
    teachersIncompletePermissions: []
  };

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const users = await User.find({}).lean();
  const teachers = await Teacher.find({}).lean();
  const admins = await Admin.find({}).lean();

  const userEmails = new Set(users.map(u => normalizeEmail(u.email)).filter(Boolean));
  const userIds = new Set(users.map(u => u._id.toString()));
  const teacherUserIds = new Set(teachers.map(t => t.userId && t.userId.toString()).filter(Boolean));
  const teacherEmails = new Set(teachers.map(t => normalizeEmail(t.email)).filter(Boolean));
  const adminUserIds = new Set(admins.map(a => a.userId && a.userId.toString()).filter(Boolean));
  const adminEmails = new Set(admins.map(a => normalizeEmail(a.email)).filter(Boolean));

  // --- A. Teacher → User Mapping ---
  subsection('A. Teacher → User Mapping');

  for (const t of teachers) {
    const tid = t._id.toString();
    const email = normalizeEmail(t.email);
    if (!t.userId || (typeof t.userId === 'object' && !t.userId.toString())) {
      report.teachersMissingUserId.push({
        _id: tid,
        email: t.email || '(empty)',
        fullName: t.fullName || '(empty)'
      });
    }
    if (email && !userEmails.has(email)) {
      report.teachersEmailNotInUsers.push({
        _id: tid,
        email: t.email,
        fullName: t.fullName || '(empty)'
      });
    }
  }

  log('Teachers with missing or null userId: ' + report.teachersMissingUserId.length);
  if (report.teachersMissingUserId.length > 0) {
    report.teachersMissingUserId.forEach((r, i) =>
      log(`  ${i + 1}. ${r.email} (${r.fullName}) _id=${r._id}`));
    if (INCLUDE_SAMPLES) {
      log('Sample record: ' + JSON.stringify(sample(report.teachersMissingUserId, 1)[0], null, 2));
    }
  }

  log('Teachers whose email does not exist in users.email: ' + report.teachersEmailNotInUsers.length);
  if (report.teachersEmailNotInUsers.length > 0) {
    report.teachersEmailNotInUsers.forEach((r, i) =>
      log(`  ${i + 1}. ${r.email} (${r.fullName}) _id=${r._id}`));
    if (INCLUDE_SAMPLES) {
      log('Sample record: ' + JSON.stringify(sample(report.teachersEmailNotInUsers, 1)[0], null, 2));
    }
  }

  // --- B. User → Teacher Mapping ---
  subsection('B. User → Teacher Mapping');

  const teacherUsers = users.filter(u => (u.role || '').toLowerCase() === 'teacher');
  for (const u of teacherUsers) {
    const uid = u._id.toString();
    if (!teacherUserIds.has(uid)) {
      report.usersTeacherNoTeacherDoc.push({
        _id: uid,
        email: u.email || '(empty)',
        name: u.name || u.fullName || '(empty)'
      });
    }
  }

  log('Users with role "teacher" but no teacher doc (teachers.userId): ' + report.usersTeacherNoTeacherDoc.length);
  if (report.usersTeacherNoTeacherDoc.length > 0) {
    report.usersTeacherNoTeacherDoc.forEach((r, i) =>
      log(`  ${i + 1}. ${r.email} (${r.name}) _id=${r._id}`));
    if (INCLUDE_SAMPLES) {
      log('Sample record: ' + JSON.stringify(sample(report.usersTeacherNoTeacherDoc, 1)[0], null, 2));
    }
  }

  // --- C. Duplicate Detection ---
  subsection('C. Duplicate Emails');

  const usersByEmail = new Map();
  users.forEach(u => {
    const e = normalizeEmail(u.email);
    if (!e) return;
    if (!usersByEmail.has(e)) usersByEmail.set(e, []);
    usersByEmail.get(e).push(u);
  });
  usersByEmail.forEach((list, email) => {
    if (list.length > 1) {
      report.duplicateEmailsUsers.push({
        email,
        count: list.length,
        ids: list.map(u => u._id.toString())
      });
    }
  });

  const teachersByEmail = new Map();
  teachers.forEach(t => {
    const e = normalizeEmail(t.email);
    if (!e) return;
    if (!teachersByEmail.has(e)) teachersByEmail.set(e, []);
    teachersByEmail.get(e).push(t);
  });
  teachersByEmail.forEach((list, email) => {
    if (list.length > 1) {
      report.duplicateEmailsTeachers.push({
        email,
        count: list.length,
        ids: list.map(t => t._id.toString())
      });
    }
  });

  const adminsByEmail = new Map();
  admins.forEach(a => {
    const e = normalizeEmail(a.email);
    if (!e) return;
    if (!adminsByEmail.has(e)) adminsByEmail.set(e, []);
    adminsByEmail.get(e).push(a);
  });
  adminsByEmail.forEach((list, email) => {
    if (list.length > 1) {
      report.duplicateEmailsAdmins.push({
        email,
        count: list.length,
        ids: list.map(a => a._id.toString())
      });
    }
  });

  log('Duplicate emails in users: ' + report.duplicateEmailsUsers.length);
  if (report.duplicateEmailsUsers.length > 0) {
    report.duplicateEmailsUsers.forEach((r, i) =>
      log(`  ${i + 1}. ${r.email} (${r.count} docs) ids=${r.ids.join(', ')}`));
    if (INCLUDE_SAMPLES) {
      log('Sample: ' + JSON.stringify(sample(report.duplicateEmailsUsers, 1)[0], null, 2));
    }
  }
  log('Duplicate emails in teachers: ' + report.duplicateEmailsTeachers.length);
  if (report.duplicateEmailsTeachers.length > 0) {
    report.duplicateEmailsTeachers.forEach((r, i) =>
      log(`  ${i + 1}. ${r.email} (${r.count} docs) ids=${r.ids.join(', ')}`));
    if (INCLUDE_SAMPLES) {
      log('Sample: ' + JSON.stringify(sample(report.duplicateEmailsTeachers, 1)[0], null, 2));
    }
  }
  log('Duplicate emails in admins: ' + report.duplicateEmailsAdmins.length);
  if (report.duplicateEmailsAdmins.length > 0) {
    report.duplicateEmailsAdmins.forEach((r, i) =>
      log(`  ${i + 1}. ${r.email} (${r.count} docs) ids=${r.ids.join(', ')}`));
    if (INCLUDE_SAMPLES) {
      log('Sample: ' + JSON.stringify(sample(report.duplicateEmailsAdmins, 1)[0], null, 2));
    }
  }

  // --- D. Orphaned Users ---
  subsection('D. Orphaned Users (role teacher/admin but no corresponding doc)');

  for (const u of users) {
    const role = (u.role || '').toLowerCase();
    const uid = u._id.toString();
    if (role === 'teacher' && !teacherUserIds.has(uid)) {
      report.orphanedUsersTeacher.push({
        _id: uid,
        email: u.email || '(empty)',
        name: u.name || u.fullName || '(empty)'
      });
    }
    if ((role === 'admin' || role === 'superadmin') && !adminUserIds.has(uid)) {
      report.orphanedUsersAdmin.push({
        _id: uid,
        email: u.email || '(empty)',
        name: u.name || u.fullName || '(empty)',
        role: u.role
      });
    }
  }

  log('Users with role "teacher" and no teacher doc: ' + report.orphanedUsersTeacher.length);
  if (report.orphanedUsersTeacher.length > 0) {
    report.orphanedUsersTeacher.forEach((r, i) =>
      log(`  ${i + 1}. ${r.email} (${r.name}) _id=${r._id}`));
    if (INCLUDE_SAMPLES) {
      log('Sample record: ' + JSON.stringify(sample(report.orphanedUsersTeacher, 1)[0], null, 2));
    }
  }
  log('Users with role "admin" or "superadmin" and no admin doc: ' + report.orphanedUsersAdmin.length);
  if (report.orphanedUsersAdmin.length > 0) {
    report.orphanedUsersAdmin.forEach((r, i) =>
      log(`  ${i + 1}. ${r.email} (${r.name}) role=${r.role} _id=${r._id}`));
    if (INCLUDE_SAMPLES) {
      log('Sample record: ' + JSON.stringify(sample(report.orphanedUsersAdmin, 1)[0], null, 2));
    }
  }

  // --- E. Permission Object Validation (Teachers) ---
  subsection('E. Teacher permission object validation');

  const expectedTeacherKeys = new Set(ALL_TEACHER_PERMISSION_KEYS);
  for (const t of teachers) {
    const perms = t.permissions && typeof t.permissions === 'object' ? t.permissions : {};
    const present = new Set(Object.keys(perms));
    const missing = [...expectedTeacherKeys].filter(k => !present.has(k));
    if (missing.length > 0) {
      report.teachersIncompletePermissions.push({
        _id: t._id.toString(),
        email: t.email || '(empty)',
        fullName: t.fullName || '(empty)',
        missingKeys: missing,
        missingCount: missing.length,
        presentCount: present.size,
        expectedCount: expectedTeacherKeys.size
      });
    }
  }

  log('Teachers with missing or incomplete permission keys (expected ' + expectedTeacherKeys.size + ' keys): ' + report.teachersIncompletePermissions.length);
  if (report.teachersIncompletePermissions.length > 0) {
    report.teachersIncompletePermissions.forEach((r, i) => {
      log(`  ${i + 1}. ${r.email} (${r.fullName}) missing ${r.missingCount} keys: ${r.missingKeys.slice(0, 5).join(', ')}${r.missingKeys.length > 5 ? '...' : ''}`);
    });
    if (INCLUDE_SAMPLES) {
      const s = sample(report.teachersIncompletePermissions, 1)[0];
      log('Sample record: ' + JSON.stringify({ ...s, missingKeys: s.missingKeys.slice(0, 10) }, null, 2));
    }
  }

  // --- Summary ---
  section('AUDIT SUMMARY');
  log('Collections: users=' + users.length + ', teachers=' + teachers.length + ', admins=' + admins.length);
  log('');
  log('Missing userId (teachers):              ' + report.teachersMissingUserId.length);
  log('Teacher email not in users:             ' + report.teachersEmailNotInUsers.length);
  log('Users role=teacher, no teacher doc:    ' + report.usersTeacherNoTeacherDoc.length);
  log('Duplicate emails (users):              ' + report.duplicateEmailsUsers.length);
  log('Duplicate emails (teachers):           ' + report.duplicateEmailsTeachers.length);
  log('Duplicate emails (admins):             ' + report.duplicateEmailsAdmins.length);
  log('Orphaned users (teacher):              ' + report.orphanedUsersTeacher.length);
  log('Orphaned users (admin/superadmin):     ' + report.orphanedUsersAdmin.length);
  log('Teachers with incomplete permissions:  ' + report.teachersIncompletePermissions.length);

  // --- MongoDB shell / Node.js snippets ---
  section('QUERIES (MongoDB shell or Node.js)');
  const snippets = `
// --- A. Teachers with missing userId ---
db.teachers.find({ $or: [ { userId: null }, { userId: { $exists: false } } ] });

// --- B. Teachers whose email not in users ---
// (Run in Node after loading users: const userEmails = new Set(users.map(u => (u.email || '').toLowerCase())); )
db.teachers.find({});  // then filter in code: t => !userEmails.has((t.email || '').toLowerCase())

// --- C. Users with role teacher but no teacher doc ---
// (Run in Node: get all teacher userIds from teachers, then find users where role==='teacher' and _id not in that set)
db.users.find({ role: 'teacher' });

// --- D. Duplicate emails in users ---
db.users.aggregate([
  { $match: { email: { $exists: true, $ne: '' } } },
  { $group: { _id: { $toLower: '$email' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
  { $match: { count: { $gt: 1 } } }
]);

// --- E. Duplicate emails in teachers ---
db.teachers.aggregate([
  { $match: { email: { $exists: true, $ne: '' } } },
  { $group: { _id: { $toLower: '$email' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
  { $match: { count: { $gt: 1 } } }
]);

// --- F. Duplicate emails in admins ---
db.admins.aggregate([
  { $match: { email: { $exists: true, $ne: '' } } },
  { $group: { _id: { $toLower: '$email' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
  { $match: { count: { $gt: 1 } } }
]);

// --- G. Orphaned users (teacher) ---
// In Node: users with role 'teacher' whose _id is not in teachers.userId
// db.users.find({ role: 'teacher' }); then filter by teachers.userId set

// --- H. Orphaned users (admin/superadmin) ---
db.users.find({ role: { $in: ['admin', 'superadmin'] } });
// then filter by admins.userId set in code

// --- I. Teachers with incomplete permissions (expected ${ALL_TEACHER_PERMISSION_KEYS.length} keys) ---
// In Node: for each teacher, check Object.keys(teacher.permissions || {}).length < ${ALL_TEACHER_PERMISSION_KEYS.length}
db.teachers.find({}).forEach(function(t) {
  var keys = Object.keys(t.permissions || {});
  if (keys.length < ${ALL_TEACHER_PERMISSION_KEYS.length}) print(t.email + ' keys=' + keys.length);
});
`;
  log(snippets.trim());

  if (OUTPUT_FILE) {
    fs.writeFileSync(OUTPUT_FILE, logBuffer.join('\n'), 'utf8');
    console.log('\nReport written to: ' + OUTPUT_FILE);
  }

  await mongoose.disconnect();
  return report;
}

runAudit()
  .then(() => {
    console.log('\nAudit complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Audit failed:', err);
    process.exit(1);
  });
