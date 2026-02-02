// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


// Fix login for all users in production database
// This script should be run on Render Shell with production MONGODB_URI
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Use production MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable not set!');
  console.error('   This script must be run on Render Shell or with production MONGODB_URI set');
  process.exit(1);
}

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

const fixProductionLogins = async () => {
  try {
    console.log('🔧 Connecting to Production MongoDB...');
    console.log('   URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to Production MongoDB\n');

    // Get all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users in production database\n`);

    let fixedCount = 0;
    let passwordResetCount = 0;
    let alreadyGoodCount = 0;
    let errorCount = 0;
    const passwordResets = [];

    for (const user of users) {
      try {
        let needsUpdate = false;
        const updates = {};
        let passwordNeedsReset = false;

        // 1. Ensure loginEnabled is true
        if (user.loginEnabled === false) {
          updates.loginEnabled = true;
          needsUpdate = true;
          console.log(`✅ Enabling login for: ${user.email} (${user.role})`);
        }

        // 2. Check password status
        if (!user.password) {
          // No password - set default
          passwordNeedsReset = true;
          updates.password = await bcrypt.hash('password123', 10);
          needsUpdate = true;
          passwordResets.push({ email: user.email, role: user.role, name: user.name });
          console.log(`   ⚠️  Setting default password for: ${user.email} (${user.role})`);
        } else if (!user.password.startsWith('$2a$') && 
                   !user.password.startsWith('$2b$') && 
                   !user.password.startsWith('$2y$')) {
          // Plain text password - hash it (keep the same password, just hash it)
          passwordNeedsReset = true;
          updates.password = await bcrypt.hash(user.password, 10);
          needsUpdate = true;
          console.log(`   🔄 Hashing plain text password for: ${user.email} (${user.role})`);
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
          if (passwordNeedsReset && !user.password) {
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
    console.log(`🔑 Passwords set/reset: ${passwordResetCount} users`);
    console.log(`✓ Already good: ${alreadyGoodCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log(`📊 Total processed: ${users.length} users`);
    console.log('='.repeat(50));

    if (passwordResets.length > 0) {
      console.log('\n⚠️  IMPORTANT - Users with reset passwords:');
      passwordResets.forEach((u, idx) => {
        console.log(`   ${idx + 1}. ${u.name || 'Unknown'} (${u.email}) - Role: ${u.role}`);
        console.log(`      Default password: password123`);
      });
      console.log('\n   Please inform these users to change their password after first login!');
    }

    // Show login-ready status
    console.log('\n📋 Login Status Check:');
    let loginDisabled = 0;
    let noPassword = 0;
    let plainTextPassword = 0;
    for (const u of users) {
      if (u.loginEnabled === false) loginDisabled++;
      if (!u.password) noPassword++;
      else if (!u.password.startsWith('$2a$') && !u.password.startsWith('$2b$') && !u.password.startsWith('$2y$')) plainTextPassword++;
    }
    console.log(`   Total users: ${users.length}`);
    console.log(`   Login disabled: ${loginDisabled}`);
    console.log(`   No password: ${noPassword}`);
    console.log(`   Plain text password: ${plainTextPassword}`);
    console.log(`   ✅ Ready to login: ${users.length - loginDisabled - noPassword - plainTextPassword}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    console.log('🎉 Fix completed!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
};

fixProductionLogins();

