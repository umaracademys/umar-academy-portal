// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


// Fix login for all users - ensure loginEnabled and proper passwords
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
  emailNotifications: { type: Boolean, default: true },
  smsNotifications: { type: Boolean, default: false },
  twoFactorEnabled: { type: Boolean, default: false }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const fixAllLogins = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users in database\n`);

    let fixedCount = 0;
    let passwordResetCount = 0;
    let alreadyGoodCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        let needsUpdate = false;
        const updates = {};
        let passwordNeedsReset = false;

        // 1. Ensure loginEnabled is true
        if (user.loginEnabled === false) {
          updates.loginEnabled = true;
          needsUpdate = true;
          console.log(`✅ Enabling login for: ${user.email}`);
        }

        // 2. Check password status
        if (!user.password) {
          // No password - set default
          passwordNeedsReset = true;
          updates.password = await bcrypt.hash('password123', 10);
          needsUpdate = true;
          console.log(`   ⚠️  Setting default password for: ${user.email}`);
        } else if (!user.password.startsWith('$2a$') && 
                   !user.password.startsWith('$2b$') && 
                   !user.password.startsWith('$2y$')) {
          // Plain text password - hash it
          passwordNeedsReset = true;
          updates.password = await bcrypt.hash(user.password, 10);
          needsUpdate = true;
          console.log(`   🔄 Hashing plain text password for: ${user.email}`);
        }

        // 3. Ensure emailNotifications defaults to true if not set
        if (user.emailNotifications === undefined) {
          updates.emailNotifications = true;
          needsUpdate = true;
        }

        // Update user if needed
        if (needsUpdate) {
          await User.updateOne({ _id: user._id }, { $set: updates });
          fixedCount++;
          if (passwordNeedsReset) {
            passwordResetCount++;
          }
        } else {
          alreadyGoodCount++;
        }

      } catch (error) {
        console.error(`❌ Error fixing ${user.email}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 FIX SUMMARY:');
    console.log('='.repeat(50));
    console.log(`✅ Fixed: ${fixedCount} users`);
    console.log(`🔑 Passwords reset: ${passwordResetCount} users`);
    console.log(`✓ Already good: ${alreadyGoodCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log(`📊 Total processed: ${users.length} users`);
    console.log('='.repeat(50));

    if (passwordResetCount > 0) {
      console.log('\n⚠️  IMPORTANT:');
      console.log(`   ${passwordResetCount} user(s) had their passwords reset to: password123`);
      console.log('   Please inform these users to change their password after first login!');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    console.log('🎉 Fix completed!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
};

fixAllLogins();
