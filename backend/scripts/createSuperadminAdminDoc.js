/**
 * Create an admin document for the superadmin user (sadmin@umaracademy.org).
 * Links the existing User to an Admin doc with all 45 permissions set to true.
 * Uses backend/shared/permissions.js ALL_ADMIN_PERMISSION_KEYS.
 *
 * Usage: MONGODB_URI="..." node backend/scripts/createSuperadminAdminDoc.js
 *        node backend/scripts/createSuperadminAdminDoc.js --dry-run  (report only)
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const mongoose = require('mongoose');
const { ALL_ADMIN_PERMISSION_KEYS } = require('../shared/permissions');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';
const DRY_RUN = process.argv.includes('--dry-run');
const SUPERADMIN_EMAIL = 'sadmin@umaracademy.org';

const userSchema = new mongoose.Schema({}, { strict: false });
const adminSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

async function run() {
  await mongoose.connect(MONGODB_URI);

  const user = await User.findOne({ email: new RegExp(`^${SUPERADMIN_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
  if (!user) {
    console.error('User not found:', SUPERADMIN_EMAIL);
    await mongoose.disconnect();
    process.exit(1);
  }

  const existing = await Admin.findOne({ email: new RegExp(`^${SUPERADMIN_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
  if (existing) {
    console.log('Admin document already exists for', SUPERADMIN_EMAIL, '(id:', existing._id, ')');
    await mongoose.disconnect();
    process.exit(0);
  }

  const permissions = {};
  ALL_ADMIN_PERMISSION_KEYS.forEach((key) => { permissions[key] = true; });

  const adminDoc = {
    adminId: `ADM${Date.now()}`,
    userId: user._id,
    fullName: user.name || user.fullName || 'Super Admin',
    email: SUPERADMIN_EMAIL,
    contact: '',
    permissionsVersion: 1,
    permissions,
    assignedDepartments: [],
    hireDate: new Date(),
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (DRY_RUN) {
    console.log('--dry-run: would insert admin document:');
    console.log(JSON.stringify(adminDoc, null, 2));
    await mongoose.disconnect();
    process.exit(0);
  }

  const inserted = await Admin.create(adminDoc);
  console.log('Created admin document for Super Admin');
  console.log('  _id:', inserted._id);
  console.log('  userId:', inserted.userId, '(matches user', user._id, ')');
  console.log('  email:', inserted.email);
  console.log('  permissions: 45 keys, all true');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
