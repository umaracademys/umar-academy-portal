// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


/**
 * Script to investigate duplicate admins in the database
 * 
 * This script will:
 * 1. Check for duplicate admins in the Admin collection (by email and _id)
 * 2. Check for admins in User collection (role='admin' or 'superadmin')
 * 3. Identify overlaps between Admin and User collections
 * 4. Report findings
 * 
 * Usage: node backend/investigateDuplicateAdmins.js
 */

const mongoose = require('mongoose');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  fullName: String,
  email: { type: String, unique: true },
  role: String,
  password: String,
  avatar: String,
  loginEnabled: { type: Boolean, default: true },
}, { timestamps: true });

// Admin Schema
const adminSchema = new mongoose.Schema({
  adminId: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fullName: String,
  email: { type: String, unique: true, sparse: true },
  contact: String,
  permissions: mongoose.Schema.Types.Mixed,
  assignedDepartments: [String],
  hireDate: Date,
  status: String,
  avatar: String,
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);

async function investigateDuplicates() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Get all admins from Admin collection
    console.log('📊 Step 1: Analyzing Admin collection...');
    const adminRecords = await Admin.find({}).lean();
    console.log(`   Found ${adminRecords.length} admin records in Admin collection\n`);

    // 2. Check for duplicates in Admin collection by email
    console.log('📊 Step 2: Checking for duplicate emails in Admin collection...');
    const adminEmails = new Map();
    const duplicateAdminEmails = [];

    adminRecords.forEach(admin => {
      const email = admin.email?.toLowerCase().trim();
      if (email) {
        if (adminEmails.has(email)) {
          duplicateAdminEmails.push({
            email,
            existing: adminEmails.get(email),
            duplicate: admin
          });
        } else {
          adminEmails.set(email, admin);
        }
      }
    });

    if (duplicateAdminEmails.length > 0) {
      console.log(`   ⚠️ Found ${duplicateAdminEmails.length} duplicate email(s) in Admin collection:`);
      duplicateAdminEmails.forEach(({ email, existing, duplicate }) => {
        console.log(`      Email: ${email}`);
        console.log(`         Existing: _id=${existing._id}, fullName=${existing.fullName}`);
        console.log(`         Duplicate: _id=${duplicate._id}, fullName=${duplicate.fullName}`);
      });
    } else {
      console.log('   ✅ No duplicate emails found in Admin collection');
    }
    console.log('');

    // 3. Check for duplicates in Admin collection by _id (shouldn't happen, but check anyway)
    console.log('📊 Step 3: Checking for duplicate _ids in Admin collection...');
    const adminIds = new Set();
    const duplicateAdminIds = [];

    adminRecords.forEach(admin => {
      const id = admin._id.toString();
      if (adminIds.has(id)) {
        duplicateAdminIds.push(admin);
      } else {
        adminIds.add(id);
      }
    });

    if (duplicateAdminIds.length > 0) {
      console.log(`   ⚠️ Found ${duplicateAdminIds.length} duplicate _id(s) in Admin collection (this should never happen!)`);
    } else {
      console.log('   ✅ No duplicate _ids found in Admin collection');
    }
    console.log('');

    // 4. Get all admin/superadmin users from User collection
    console.log('📊 Step 4: Analyzing User collection for admin/superadmin users...');
    const adminUsers = await User.find({
      role: { $in: ['admin', 'superadmin'] }
    }).lean();
    console.log(`   Found ${adminUsers.length} users with role='admin' or 'superadmin'\n`);

    // 5. Check for overlaps between Admin collection and User collection
    console.log('📊 Step 5: Checking for overlaps between Admin and User collections...');
    const overlaps = [];

    adminRecords.forEach(admin => {
      const adminEmail = admin.email?.toLowerCase().trim();
      if (adminEmail) {
        const matchingUser = adminUsers.find(u => {
          const userEmail = u.email?.toLowerCase().trim();
          return userEmail === adminEmail;
        });

        if (matchingUser) {
          overlaps.push({
            email: adminEmail,
            adminRecord: admin,
            userRecord: matchingUser,
            userIdMatch: admin.userId && admin.userId.toString() === matchingUser._id.toString()
          });
        }
      }
    });

    if (overlaps.length > 0) {
      console.log(`   ⚠️ Found ${overlaps.length} overlap(s) between Admin and User collections:`);
      overlaps.forEach(({ email, adminRecord, userRecord, userIdMatch }) => {
        console.log(`      Email: ${email}`);
        console.log(`         Admin: _id=${adminRecord._id}, userId=${adminRecord.userId || 'null'}`);
        console.log(`         User: _id=${userRecord._id}, role=${userRecord.role}`);
        console.log(`         userId matches: ${userIdMatch ? '✅' : '❌'}`);
      });
    } else {
      console.log('   ✅ No overlaps found between Admin and User collections');
    }
    console.log('');

    // 6. Check for duplicate emails in User collection (admin/superadmin only)
    console.log('📊 Step 6: Checking for duplicate emails in User collection (admin/superadmin)...');
    const userEmails = new Map();
    const duplicateUserEmails = [];

    adminUsers.forEach(user => {
      const email = user.email?.toLowerCase().trim();
      if (email) {
        if (userEmails.has(email)) {
          duplicateUserEmails.push({
            email,
            existing: userEmails.get(email),
            duplicate: user
          });
        } else {
          userEmails.set(email, user);
        }
      }
    });

    if (duplicateUserEmails.length > 0) {
      console.log(`   ⚠️ Found ${duplicateUserEmails.length} duplicate email(s) in User collection (admin/superadmin):`);
      duplicateUserEmails.forEach(({ email, existing, duplicate }) => {
        console.log(`      Email: ${email}`);
        console.log(`         Existing: _id=${existing._id}, role=${existing.role}, fullName=${existing.name || existing.fullName}`);
        console.log(`         Duplicate: _id=${duplicate._id}, role=${duplicate.role}, fullName=${duplicate.name || duplicate.fullName}`);
      });
    } else {
      console.log('   ✅ No duplicate emails found in User collection (admin/superadmin)');
    }
    console.log('');

    // 7. Summary
    console.log('📊 SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Admin Collection:`);
    console.log(`   Total records: ${adminRecords.length}`);
    console.log(`   Duplicate emails: ${duplicateAdminEmails.length}`);
    console.log(`   Duplicate _ids: ${duplicateAdminIds.length}`);
    console.log('');
    console.log(`User Collection (admin/superadmin):`);
    console.log(`   Total users: ${adminUsers.length}`);
    console.log(`   Duplicate emails: ${duplicateUserEmails.length}`);
    console.log('');
    console.log(`Overlaps (Admin ↔ User):`);
    console.log(`   Total overlaps: ${overlaps.length}`);
    console.log(`   userId matches: ${overlaps.filter(o => o.userIdMatch).length}`);
    console.log(`   userId mismatches: ${overlaps.filter(o => !o.userIdMatch).length}`);
    console.log('='.repeat(60));

    // 8. Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (duplicateAdminEmails.length > 0) {
      console.log('   1. ⚠️ Remove duplicate admin records from Admin collection');
      console.log('      - Keep the oldest record (by createdAt)');
      console.log('      - Update any references to use the canonical admin _id');
    }
    if (duplicateUserEmails.length > 0) {
      console.log('   2. ⚠️ Remove duplicate user records from User collection');
      console.log('      - Keep the oldest record (by createdAt)');
      console.log('      - Update any references to use the canonical user _id');
    }
    if (overlaps.length > 0 && overlaps.some(o => !o.userIdMatch)) {
      console.log('   3. ⚠️ Fix userId mismatches in Admin collection');
      console.log('      - Update Admin.userId to match the corresponding User._id');
    }
    if (overlaps.length === 0 && adminUsers.length > 0 && adminRecords.length > 0) {
      console.log('   4. ℹ️ Consider linking Admin records to User records via userId');
      console.log('      - This ensures proper relationship between Admin and User collections');
    }
    if (duplicateAdminEmails.length === 0 && duplicateUserEmails.length === 0 && overlaps.length === 0) {
      console.log('   ✅ No issues found! The duplicates are likely from frontend merging logic.');
      console.log('   💡 The frontend deduplication is working correctly.');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the investigation
investigateDuplicates();
