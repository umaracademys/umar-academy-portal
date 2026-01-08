// Reset student password
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
  failedLoginAttempts: { type: Number, default: 0 },
  accountLockedUntil: Date,
  lastFailedLoginAttempt: Date
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const resetPassword = async () => {
  try {
    const email = process.argv[2] || 'zidanm@gmail.com';
    const newPassword = process.argv[3] || 'password123';
    
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find user
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`❌ User with email ${email} not found!`);
      process.exit(1);
    }

    // Reset password and lockout
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.lastFailedLoginAttempt = null;
    user.loginEnabled = true;
    await user.save();
    
    console.log('✅ Password reset successfully!');
    console.log('\n🔑 Login Credentials:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Password: ${newPassword}`);
    console.log('\n✅ You can now login with these credentials!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  }
};

resetPassword();

