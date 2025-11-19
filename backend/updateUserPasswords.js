// Script to update all user passwords to hashed versions
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String,
  password: String,
  avatar: String
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const updatePasswords = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users`);

    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    let updated = 0;
    let skipped = 0;

    for (const user of users) {
      // Check if password is already hashed
      const isBcryptHash = user.password && (
        user.password.startsWith('$2a$') || 
        user.password.startsWith('$2b$') || 
        user.password.startsWith('$2y$')
      );

      if (!isBcryptHash) {
        // Update password
        user.password = hashedPassword;
        await user.save();
        console.log(`✅ Updated password for: ${user.email} (${user.role})`);
        updated++;
      } else {
        console.log(`⏭️  Skipped (already hashed): ${user.email}`);
        skipped++;
      }
    }

    console.log('\n🎉 Password update complete!');
    console.log(`✅ Updated: ${updated} users`);
    console.log(`⏭️  Skipped: ${skipped} users`);
    console.log(`\n🔑 Default password for all users: ${defaultPassword}`);
    console.log('⚠️  Please change passwords after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating passwords:', error);
    process.exit(1);
  }
};

updatePasswords();

