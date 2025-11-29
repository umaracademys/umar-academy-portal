// Reset password for a user
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
  loginEnabled: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const resetPassword = async () => {
  try {
    const email = process.argv[2] || 'Rabyya@live.com';
    const newPassword = process.argv[3] || 'password123';
    
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log(`🔍 Searching for user: ${email}`);
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (!user) {
      console.log('❌ User not found!');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`✅ User found: ${user.name} (${user.email})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Login Enabled: ${user.loginEnabled !== false ? '✅ YES' : '❌ NO'}`);
    console.log(`\n🔄 Resetting password...`);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.loginEnabled = true; // Ensure login is enabled
    await user.save();

    console.log(`✅ Password reset successfully!`);
    console.log(`\n📋 Login Credentials:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   Role: ${user.role}`);
    console.log(`\n⚠️  Please change this password after first login!`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

resetPassword();

