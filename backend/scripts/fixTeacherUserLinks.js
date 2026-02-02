/**
 * backend/scripts/fixTeacherUserLinks.js
 *
 * Matches teachers to users by email and fixes missing or wrong teacher.userId.
 * Reports when no user is found for a teacher or when multiple users share the same email.
 *
 * USAGE:
 *   node backend/scripts/fixTeacherUserLinks.js
 *   node backend/scripts/fixTeacherUserLinks.js --dry-run   (report only, no updates)
 *   MONGODB_URI="mongodb+srv://..." node backend/scripts/fixTeacherUserLinks.js
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';
const DRY_RUN = process.argv.includes('--dry-run');

// Minimal schemas (models live in server.js; no backend/models/User.js etc.)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String
}, { strict: false, timestamps: true });
const User = mongoose.models.User || mongoose.model('User', userSchema);

const teacherSchema = new mongoose.Schema({}, { strict: false });
const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema);

async function fixTeacherLinks() {
  await mongoose.connect(MONGODB_URI);

  if (DRY_RUN) {
    console.log('--- DRY RUN: no documents will be updated ---\n');
  }

  const teachers = await Teacher.find({}).lean();
  const users = await User.find({ role: 'teacher' }).lean();

  const emailToUserId = {};
  users.forEach((u) => {
    const email = (u.email || '').toLowerCase().trim();
    if (!email) return;
    if (!emailToUserId[email]) emailToUserId[email] = [];
    emailToUserId[email].push(u._id);
  });

  let updated = 0;
  let noUser = 0;
  let multipleUsers = 0;

  for (const t of teachers) {
    const email = (t.email || '').toLowerCase().trim();
    if (!email) continue;

    const matchedIds = emailToUserId[email] || [];
    if (matchedIds.length === 0) {
      console.log(`⚠️ No user found for teacher: ${t.fullName || t.email} (${email})`);
      noUser++;
      continue;
    }
    if (matchedIds.length > 1) {
      console.log(`⚠️ Multiple users for email ${email}: ${matchedIds.length} users. Using first.`);
      multipleUsers++;
    }

    const userId = matchedIds[0];
    const currentUserId = t.userId ? t.userId.toString() : null;
    const targetUserId = userId.toString();

    if (currentUserId !== targetUserId) {
      console.log(`🔧 Teacher ${t.fullName || email} (${email}): userId ${currentUserId || 'missing'} -> ${targetUserId}`);
      if (!DRY_RUN) {
        await Teacher.updateOne({ _id: t._id }, { $set: { userId } });
        updated++;
      }
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Teachers with no matching user: ${noUser}`);
  console.log(`Emails with multiple users (used first): ${multipleUsers}`);
  console.log(DRY_RUN ? `Would update: (dry run, no writes)` : `Updated: ${updated}`);
  console.log(DRY_RUN ? '\nRun without --dry-run to apply updates.' : '\n✅ Teacher ↔ User links fixed!');
  await mongoose.disconnect();
}

fixTeacherLinks().catch((err) => {
  console.error('Error fixing teacher links:', err);
  process.exit(1);
});
