/**
 * Script to check if a specific user exists in the database
 * 
 * Usage: node backend/checkSpecificUser.js
 */

const mongoose = require('mongoose');

// User Schema (matching server.js)
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String,
  password: String,
  avatar: String,
  loginEnabled: { type: Boolean, default: true },
  twoFactorEnabled: { type: Boolean, default: false },
  emailNotifications: { type: Boolean, default: true },
  smsNotifications: { type: Boolean, default: false },
  contact: String,
  phoneNumber: String,
  isDeveloper: { type: Boolean, default: false },
  isTestAccount: { type: Boolean, default: false },
  failedLoginAttempts: { type: Number, default: 0 },
  accountLockedUntil: Date,
  lastFailedLoginAttempt: Date,
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

async function checkUser(email) {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log(`🔍 Searching for: ${email}\n`);

    // Search for user (case-insensitive)
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });

    if (user) {
      console.log('✅ USER FOUND IN USERS COLLECTION:');
      console.log('   ID:', user._id);
      console.log('   Name:', user.name || user.fullName || 'Not set');
      console.log('   Email:', user.email);
      console.log('   Role:', user.role);
      console.log('   Login Enabled:', user.loginEnabled !== false ? '✅ YES' : '❌ NO');
      console.log('   Has Password:', user.password ? '✅ YES (hashed)' : '❌ NO');
      console.log('   Created:', user.createdAt);
      console.log('   Updated:', user.updatedAt);
      if (user.isDeveloper) console.log('   ⚠️  Developer Account');
      if (user.isTestAccount) console.log('   ⚠️  Test Account');
      if (user.accountLockedUntil && new Date() < user.accountLockedUntil) {
        console.log('   🔒 Account LOCKED until:', user.accountLockedUntil);
      }
      if (user.failedLoginAttempts > 0) {
        console.log('   ⚠️  Failed Login Attempts:', user.failedLoginAttempts);
      }
    } else {
      console.log('❌ User NOT FOUND in Users collection');
    }

    // Check in Students collection
    const student = await Student.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });
    
    if (student) {
      console.log('\n✅ FOUND IN STUDENTS COLLECTION:');
      console.log('   Email:', student.email);
      console.log('   Full Name:', student.fullName || 'N/A');
      console.log('   ID:', student._id);
      console.log('   Status:', student.status || 'N/A');
      console.log('   Program:', student.program || 'N/A');
      console.log('   User ID:', student.userId || 'N/A');
    } else {
      console.log('\n❌ NOT FOUND in Students collection');
    }

    // Check in Teachers collection
    const teacher = await Teacher.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });
    
    if (teacher) {
      console.log('\n✅ FOUND IN TEACHERS COLLECTION:');
      console.log('   Email:', teacher.email);
      console.log('   Full Name:', teacher.fullName || 'N/A');
      console.log('   ID:', teacher._id);
      console.log('   Status:', teacher.status || 'N/A');
      console.log('   User ID:', teacher.userId || 'N/A');
    } else {
      console.log('\n❌ NOT FOUND in Teachers collection');
    }

    // Check in Admins collection
    const admin = await Admin.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });
    
    if (admin) {
      console.log('\n✅ FOUND IN ADMINS COLLECTION:');
      console.log('   Email:', admin.email);
      console.log('   Full Name:', admin.fullName || 'N/A');
      console.log('   ID:', admin._id);
      console.log('   Status:', admin.status || 'N/A');
      console.log('   User ID:', admin.userId || 'N/A');
    } else {
      console.log('\n❌ NOT FOUND in Admins collection');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    if (user || student || teacher || admin) {
      console.log('✅ SUMMARY: Email exists in database');
      if (user) {
        console.log(`\n💡 To login, use:`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Password: (check if password is set)`);
        if (!user.password) {
          console.log(`   ⚠️  WARNING: User has no password set!`);
        }
        if (user.loginEnabled === false) {
          console.log(`   ⚠️  WARNING: Login is disabled for this account!`);
        }
        if (user.accountLockedUntil && new Date() < user.accountLockedUntil) {
          console.log(`   🔒 Account is currently locked!`);
        }
      }
    } else {
      console.log('❌ SUMMARY: Email NOT FOUND in any collection');
      console.log('\n💡 To create this user, you can:');
      console.log('   1. Use the Super Admin dashboard to register');
      console.log('   2. Or use a script to add this user');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking user:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Check the specific user
const email = 'fatima.rahmannn@gmail.com';
checkUser(email);

