// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


// Reset superadmin password
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
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const resetPassword = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find superadmin
    const superAdmin = await User.findOne({ 
      email: 'sadmin@umaracademy.org',
      role: 'superadmin'
    });
    
    if (!superAdmin) {
      console.log('❌ Superadmin not found!');
      process.exit(1);
    }

    // Reset password
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    superAdmin.password = hashedPassword;
    await superAdmin.save();
    
    console.log('✅ Password reset successfully!');
    console.log('\n🔑 Login Credentials:');
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Password: ${newPassword}`);
    console.log('\n✅ You can now login with these credentials!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  }
};

resetPassword();

