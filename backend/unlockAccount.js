// Unlock a user account by email
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// User Schema
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
  failedLoginAttempts: { type: Number, default: 0 },
  accountLockedUntil: Date,
  lastFailedLoginAttempt: Date,
  passwordChangeRequired: { type: Boolean, default: false }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const unlockAccount = async () => {
  try {
    const email = process.argv[2] || 'mhd.eliyas@gmail.com';
    
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

    console.log(`✅ User found: ${user.name || 'Unknown'} (${user.email})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Failed Login Attempts: ${user.failedLoginAttempts || 0}`);
    
    if (user.accountLockedUntil) {
      const lockUntil = user.accountLockedUntil instanceof Date ? user.accountLockedUntil : new Date(user.accountLockedUntil);
      const now = new Date();
      const minutesRemaining = Math.ceil((lockUntil - now) / 60000);
      console.log(`   Account Locked Until: ${lockUntil.toLocaleString()}`);
      console.log(`   Minutes Remaining: ${minutesRemaining > 0 ? minutesRemaining : 'Expired'}`);
    } else {
      console.log(`   Account Status: Not locked`);
    }

    // Unlock the account
    console.log(`\n🔄 Unlocking account...`);
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.lastFailedLoginAttempt = null;
    await user.save();

    console.log(`✅ Account unlocked successfully!`);
    console.log(`\n📋 Account Status:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Failed Attempts: 0`);
    console.log(`   Account Locked: NO`);
    console.log(`   Can Login: YES ✅`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
};

unlockAccount();

