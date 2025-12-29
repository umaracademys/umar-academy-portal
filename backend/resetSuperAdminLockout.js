// Reset super admin account lockout and update password
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String,
  password: String,
  avatar: String,
  loginEnabled: { type: Boolean, default: true },
  failedLoginAttempts: { type: Number, default: 0 },
  accountLockedUntil: Date,
  lastFailedLoginAttempt: Date
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const resetLockout = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find super admin
    const superAdmin = await User.findOne({ 
      email: 'sadmin@umaracademy.org',
      role: 'superadmin'
    });
    
    if (!superAdmin) {
      console.log('❌ Super admin not found!');
      process.exit(1);
    }

    // Reset lockout
    superAdmin.failedLoginAttempts = 0;
    superAdmin.accountLockedUntil = null;
    superAdmin.lastFailedLoginAttempt = null;
    superAdmin.loginEnabled = true;

    // Update password to meet requirements
    const newPassword = 'Password123!!!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    superAdmin.password = hashedPassword;

    await superAdmin.save();
    
    console.log('✅ Account lockout reset and password updated!');
    console.log('\n🔑 Updated Login Credentials:');
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Password: ${newPassword}`);
    console.log('\n✅ You can now login with these credentials!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting lockout:', error);
    process.exit(1);
  }
};

resetLockout();

