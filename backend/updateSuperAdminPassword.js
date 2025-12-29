// Update super admin password
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

const updatePassword = async () => {
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

    // Hash new password
    const newPassword = 'Password!!!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    superAdmin.password = hashedPassword;
    await superAdmin.save();
    
    console.log('✅ Password updated successfully!');
    console.log('\n🔑 Updated Login Credentials:');
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Password: ${newPassword}`);
    console.log('\n✅ You can now login with these credentials!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating password:', error);
    process.exit(1);
  }
};

updatePassword();

