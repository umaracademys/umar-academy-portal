/**
 * Script to count users in all collections
 * 
 * Usage: node backend/countUsers.js
 */

const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String,
  password: String,
  loginEnabled: { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Student Schema
const studentSchema = new mongoose.Schema({}, { strict: false });
const Student = mongoose.model('Student', studentSchema);

// Teacher Schema
const teacherSchema = new mongoose.Schema({}, { strict: false });
const Teacher = mongoose.model('Teacher', teacherSchema);

// Admin Schema
const adminSchema = new mongoose.Schema({}, { strict: false });
const Admin = mongoose.model('Admin', adminSchema);

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

async function countUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Count users by role in Users collection
    const totalUsers = await User.countDocuments({});
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Count in other collections
    const totalStudents = await Student.countDocuments({});
    const totalTeachers = await Teacher.countDocuments({});
    const totalAdmins = await Admin.countDocuments({});

    // Count active vs inactive users
    const activeUsers = await User.countDocuments({ loginEnabled: { $ne: false } });
    const inactiveUsers = await User.countDocuments({ loginEnabled: false });

    // Count locked accounts
    const now = new Date();
    const lockedUsers = await User.countDocuments({
      accountLockedUntil: { $exists: true, $ne: null, $gt: now }
    });

    // Count users with passwords
    const usersWithPassword = await User.countDocuments({ password: { $exists: true, $ne: null } });
    const usersWithoutPassword = await User.countDocuments({ 
      $or: [
        { password: { $exists: false } },
        { password: null }
      ]
    });

    console.log('📊 USER STATISTICS');
    console.log('='.repeat(60));
    
    console.log('\n👥 USERS COLLECTION:');
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Active Users: ${activeUsers}`);
    console.log(`   Inactive Users: ${inactiveUsers}`);
    console.log(`   Locked Accounts: ${lockedUsers}`);
    console.log(`   Users with Password: ${usersWithPassword}`);
    console.log(`   Users without Password: ${usersWithoutPassword}`);
    
    if (usersByRole.length > 0) {
      console.log('\n   Users by Role:');
      usersByRole.forEach(item => {
        console.log(`      ${item._id || 'No role'}: ${item.count}`);
      });
    }

    console.log('\n📚 OTHER COLLECTIONS:');
    console.log(`   Students: ${totalStudents}`);
    console.log(`   Teachers: ${totalTeachers}`);
    console.log(`   Admins: ${totalAdmins}`);

    // Calculate total unique users (users that might exist in multiple collections)
    const allEmails = new Set();
    
    const userEmails = await User.find({}, { email: 1 });
    userEmails.forEach(u => allEmails.add(u.email?.toLowerCase()));
    
    const studentEmails = await Student.find({}, { email: 1 });
    studentEmails.forEach(s => allEmails.add(s.email?.toLowerCase()));
    
    const teacherEmails = await Teacher.find({}, { email: 1 });
    teacherEmails.forEach(t => allEmails.add(t.email?.toLowerCase()));
    
    const adminEmails = await Admin.find({}, { email: 1 });
    adminEmails.forEach(a => allEmails.add(a.email?.toLowerCase()));

    console.log(`\n📧 UNIQUE EMAILS ACROSS ALL COLLECTIONS: ${allEmails.size}`);

    console.log('\n' + '='.repeat(60));
    console.log(`📊 SUMMARY:`);
    console.log(`   Total Users (Users collection): ${totalUsers}`);
    console.log(`   Total Students: ${totalStudents}`);
    console.log(`   Total Teachers: ${totalTeachers}`);
    console.log(`   Total Admins: ${totalAdmins}`);
    console.log(`   Unique Email Addresses: ${allEmails.size}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error counting users:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

countUsers();
