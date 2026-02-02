/**
 * Remove an admin (and their user account) by email.
 * Deletes from both `admins` and `users` collections.
 *
 * Usage: node backend/scripts/removeAdminByEmail.js <email>
 *        MONGODB_URI="..." node backend/scripts/removeAdminByEmail.js Azfar@gmail.com
 *        node backend/scripts/removeAdminByEmail.js Azfar@gmail.com --dry-run  (report only)
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';
const DRY_RUN = process.argv.includes('--dry-run');

const userSchema = new mongoose.Schema({}, { strict: false });
const adminSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

function normalizeEmail(email) {
  return typeof email === 'string' ? email.toLowerCase().trim() : '';
}

async function run() {
  const emailArg = process.argv.find((a) => !a.startsWith('--') && a.includes('@'));
  if (!emailArg) {
    console.error('Usage: node backend/scripts/removeAdminByEmail.js <email> [--dry-run]');
    process.exit(1);
  }

  const email = normalizeEmail(emailArg);
  if (!email) {
    console.error('Invalid email');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);

  const admin = await Admin.findOne({ email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
  const user = await User.findOne({ email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });

  if (!admin && !user) {
    console.log(`No admin or user found with email: ${email}`);
    await mongoose.disconnect();
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log('--dry-run: no changes made.');
    if (admin) console.log('Would delete admin:', admin.email, admin.fullName, admin._id);
    if (user) console.log('Would delete user:', user.email, user.name || user.fullName, user._id);
    await mongoose.disconnect();
    process.exit(0);
  }

  if (admin) {
    await Admin.deleteOne({ _id: admin._id });
    console.log('Deleted admin:', admin.email, admin.fullName, admin._id);
  }
  if (user) {
    await User.deleteOne({ _id: user._id });
    console.log('Deleted user:', user.email, user.name || user.fullName, user._id);
  }

  console.log('Done.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
