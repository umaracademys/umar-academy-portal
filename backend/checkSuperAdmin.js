/**
 * Script to check superadmin user status
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// User Schema (matching server.js)
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String,
  password: String,
  avatar: String,
  loginEnabled: { type: Boolean, default: true },
  failedLoginAttempts: { type: Number, default: 0 },
  accountLockedUntil: Date,
  lastFailedLoginAttempt: Date,
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function checkSuperAdmin() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const email = 'sadmin@umaracademy.org';
    console.log(`🔍 Checking superadmin: ${email}\n`);

    // Search for user (case-insensitive)
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });

    if (user) {
      console.log('✅ Superadmin found!');
      console.log('\n📋 User Details:');
      console.log('   ID:', user._id);
      console.log('   Name:', user.name || 'Not set');
      console.log('   Email:', user.email);
      console.log('   Role:', user.role);
      console.log('   Login Enabled:', user.loginEnabled !== false ? '✅ YES' : '❌ NO');
      console.log('   Has Password:', user.password ? '✅ YES' : '❌ NO');
      console.log('   Password Type:', user.password ? (user.password.startsWith('$2') ? 'Hashed (bcrypt)' : 'Plain text') : 'None');
      console.log('   Failed Login Attempts:', user.failedLoginAttempts || 0);
      if (user.accountLockedUntil && new Date() < user.accountLockedUntil) {
        console.log('   🔒 Account LOCKED until:', user.accountLockedUntil);
        const minutesLeft = Math.ceil((user.accountLockedUntil - new Date()) / 60000);
        console.log('   ⏰ Minutes remaining:', minutesLeft);
      } else {
        console.log('   ✅ Account NOT locked');
      }
      console.log('   Created:', user.createdAt);
      console.log('   Updated:', user.updatedAt);

      // Test password if provided
      if (process.argv[2]) {
        const testPassword = process.argv[2];
        console.log('\n🔐 Testing password...');
        
        if (!user.password) {
          console.log('   ⚠️  No password set - any password will work');
        } else {
          const isBcryptHash = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$');
          
          if (isBcryptHash) {
            const isValid = await bcrypt.compare(testPassword, user.password);
            console.log('   Password match:', isValid ? '✅ YES' : '❌ NO');
          } else {
            const isValid = testPassword === user.password;
            console.log('   Password match (plain text):', isValid ? '✅ YES' : '❌ NO');
          }
        }
      } else {
        console.log('\n💡 To test a password, run:');
        console.log(`   node backend/checkSuperAdmin.js "your-password"`);
      }

      // Suggest fixes
      console.log('\n💡 Suggested Actions:');
      if (!user.password) {
        console.log('   1. Set a password: node backend/resetSuperAdminPassword.js');
      }
      if (user.loginEnabled === false) {
        console.log('   2. Enable login: Update loginEnabled to true');
      }
      if (user.accountLockedUntil && new Date() < user.accountLockedUntil) {
        console.log('   3. Reset lockout: node backend/resetSuperAdminLockout.js');
      }
      if (user.role !== 'superadmin') {
        console.log(`   4. Fix role: Current role is "${user.role}", should be "superadmin"`);
      }
    } else {
      console.log('❌ Superadmin not found');
      console.log(`\n   No user with email "${email}" exists in the database.`);
      console.log('\n💡 To create superadmin, run:');
      console.log('   node backend/seedDatabase.js');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking superadmin:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkSuperAdmin();

