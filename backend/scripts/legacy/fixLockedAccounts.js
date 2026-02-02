// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


// Fix all locked student accounts and reset passwords if needed
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

const fixLockedAccounts = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all locked accounts
    const now = new Date();
    const lockedUsers = await User.find({
      $or: [
        { accountLockedUntil: { $exists: true, $ne: null, $gt: now } },
        { failedLoginAttempts: { $gte: 3 } }
      ]
    });

    console.log(`📊 Found ${lockedUsers.length} locked accounts or accounts with high failed attempts\n`);

    let unlockedCount = 0;
    let passwordResetCount = 0;

    for (const user of lockedUsers) {
      try {
        const wasLocked = user.accountLockedUntil && new Date(user.accountLockedUntil) > now;
        const needsPasswordReset = !user.password || 
          (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$') && !user.password.startsWith('$2y$'));

        console.log(`\n🔍 ${user.email} (${user.role})`);
        
        if (wasLocked) {
          const lockUntil = user.accountLockedUntil instanceof Date ? user.accountLockedUntil : new Date(user.accountLockedUntil);
          const minutesRemaining = Math.ceil((lockUntil - now) / 60000);
          console.log(`   ⚠️  Account locked until: ${lockUntil.toLocaleString()} (${minutesRemaining} minutes remaining)`);
        }
        
        if (user.failedLoginAttempts >= 3) {
          console.log(`   ⚠️  Failed attempts: ${user.failedLoginAttempts}`);
        }

        if (needsPasswordReset) {
          console.log(`   ⚠️  Password needs reset`);
        }

        // Unlock account
        if (wasLocked || user.failedLoginAttempts >= 3) {
          user.failedLoginAttempts = 0;
          user.accountLockedUntil = null;
          user.lastFailedLoginAttempt = null;
          unlockedCount++;
          console.log(`   ✅ Account unlocked`);
        }

        // Reset password if needed
        if (needsPasswordReset || user.role === 'student') {
          const defaultPassword = 'password123';
          const hashedPassword = await bcrypt.hash(defaultPassword, 10);
          user.password = hashedPassword;
          user.passwordChangeRequired = true;
          passwordResetCount++;
          console.log(`   ✅ Password reset to: password123`);
        }

        await user.save();
      } catch (error) {
        console.error(`   ❌ Error fixing ${user.email}:`, error.message);
      }
    }

    console.log('\n\n📊 SUMMARY:');
    console.log(`   Total accounts checked: ${lockedUsers.length}`);
    console.log(`   Accounts unlocked: ${unlockedCount}`);
    console.log(`   Passwords reset: ${passwordResetCount}`);

    if (unlockedCount === 0 && passwordResetCount === 0) {
      console.log('\n✅ No locked accounts found!');
    } else {
      console.log('\n✅ All locked accounts have been fixed!');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
};

fixLockedAccounts();

