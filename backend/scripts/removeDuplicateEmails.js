/**
 * backend/scripts/removeDuplicateEmails.js
 *
 * Deletes duplicate emails in users, teachers, and admins collections,
 * keeping the first document (earliest createdAt) for each email.
 *
 * USAGE:
 *   node backend/scripts/removeDuplicateEmails.js
 *   node backend/scripts/removeDuplicateEmails.js --dry-run   (report only, no deletes)
 *   MONGODB_URI="mongodb+srv://..." node backend/scripts/removeDuplicateEmails.js
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

const adminSchema = new mongoose.Schema({}, { strict: false });
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

const collections = [
  { name: 'users', model: User },
  { name: 'teachers', model: Teacher },
  { name: 'admins', model: Admin },
];

async function removeDuplicates() {
  await mongoose.connect(MONGODB_URI);

  if (DRY_RUN) {
    console.log('--- DRY RUN: no documents will be deleted ---\n');
  }

  for (const col of collections) {
    console.log(`\nProcessing collection: ${col.name}`);

    const docs = await col.model
      .find({ email: { $exists: true, $ne: '' } })
      .sort({ createdAt: 1 })
      .lean();

    const emailMap = {};
    docs.forEach((d) => {
      const email = (d.email || '').toLowerCase().trim();
      if (!email) return;
      if (!emailMap[email]) emailMap[email] = [];
      emailMap[email].push(d._id);
    });

    let deletedCount = 0;
    for (const [email, ids] of Object.entries(emailMap)) {
      if (ids.length > 1) {
        const keepId = ids[0];
        const deleteIds = ids.slice(1);
        console.log(`  Email: ${email} — keeping: ${keepId}, would delete: ${deleteIds.length} (${deleteIds.join(', ')})`);
        if (!DRY_RUN) {
          const result = await col.model.deleteMany({ _id: { $in: deleteIds } });
          deletedCount += result.deletedCount;
        }
      }
    }
    if (!DRY_RUN && deletedCount > 0) {
      console.log(`  Deleted ${deletedCount} duplicate(s) in ${col.name}.`);
    }
  }

  console.log('\n' + (DRY_RUN ? 'Dry run complete. Run without --dry-run to delete.' : '✅ Duplicate emails removed successfully!'));
  await mongoose.disconnect();
}

removeDuplicates().catch((err) => {
  console.error('Error removing duplicates:', err);
  process.exit(1);
});
