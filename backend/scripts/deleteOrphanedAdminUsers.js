/**
 * Delete specific orphaned users (role=admin/superadmin, no matching admin doc)
 * from the `users` collection ONLY. Does not touch teachers, admins, or students.
 *
 * Target emails: test@umaracademy.com, developer@test.com, admin@umaracademy.com
 *
 * Safety: deletion only happens if
 *   - role is admin or superadmin
 *   - AND no matching admin doc exists (by userId or email)
 *   - AND no matching teacher doc exists (by userId or email)
 *
 * USAGE:
 *   node backend/scripts/deleteOrphanedAdminUsers.js
 *   node backend/scripts/deleteOrphanedAdminUsers.js --dry-run
 *   MONGODB_URI="..." node backend/scripts/deleteOrphanedAdminUsers.js
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';
const DRY_RUN = process.argv.includes('--dry-run');

const EMAILS_TO_DELETE = [
  'test@umaracademy.com',
  'developer@test.com',
  'admin@umaracademy.com',
].map((e) => e.toLowerCase().trim());

const userSchema = new mongoose.Schema({}, { strict: false });
const adminSchema = new mongoose.Schema({}, { strict: false });
const teacherSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema);

function normalizeEmail(email) {
  return typeof email === 'string' ? email.toLowerCase().trim() : '';
}

async function run() {
  await mongoose.connect(MONGODB_URI);

  if (DRY_RUN) {
    console.log('--- DRY RUN: no documents will be deleted ---\n');
  }

  for (const email of EMAILS_TO_DELETE) {
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    }).lean();

    if (!user) {
      console.log(`[SKIP] ${email} — no user found`);
      continue;
    }

    const role = (user.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') {
      console.log(`[SKIP] ${email} (_id: ${user._id}) — role is "${user.role}", not admin/superadmin`);
      continue;
    }

    const hasAdminDoc =
      (await Admin.findOne({
        $or: [
          { userId: user._id },
          { email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        ],
      }).lean()) != null;

    if (hasAdminDoc) {
      console.log(`[SKIP] ${email} (_id: ${user._id}) — has matching admin document`);
      continue;
    }

    const hasTeacherDoc =
      (await Teacher.findOne({
        $or: [
          { userId: user._id },
          { email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        ],
      }).lean()) != null;

    if (hasTeacherDoc) {
      console.log(`[SKIP] ${email} (_id: ${user._id}) — has matching teacher document`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`[WOULD DELETE] email: ${user.email || email}, _id: ${user._id}`);
      continue;
    }

    await User.deleteOne({ _id: user._id });
    console.log(`[DELETED] email: ${user.email || email}, _id: ${user._id}`);
  }

  console.log(DRY_RUN ? '\nDry run complete. Run without --dry-run to delete.' : '\nDone.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
