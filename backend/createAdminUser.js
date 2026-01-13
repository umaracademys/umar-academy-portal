/**
 * Script to create an admin user
 * 
 * Usage: node backend/createAdminUser.js <email> <password> <name>
 * Example: node backend/createAdminUser.js faheem@gmail.com "Faheem25!!!" "Faheem Admin"
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
  isDeveloper: { type: Boolean, default: false },
  isTestAccount: { type: Boolean, default: false },
  failedLoginAttempts: { type: Number, default: 0 },
  accountLockedUntil: Date,
  lastFailedLoginAttempt: Date,
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

async function createAdminUser(email, password, name) {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (existingUser) {
      console.log('⚠️  User already exists!');
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Name: ${existingUser.name || 'Not set'}`);
      
      // Ask if user wants to update password
      const updatePassword = process.argv.includes('--update-password');
      if (updatePassword) {
        console.log('\n🔄 Updating password...');
        const hashedPassword = await bcrypt.hash(password, 10);
        existingUser.password = hashedPassword;
        existingUser.loginEnabled = true;
        existingUser.failedLoginAttempts = 0;
        existingUser.accountLockedUntil = null;
        existingUser.lastFailedLoginAttempt = null;
        if (name) existingUser.name = name;
        await existingUser.save();
        console.log('✅ Password updated successfully!');
        console.log('\n🔑 Updated Credentials:');
        console.log(`   Email: ${existingUser.email}`);
        console.log(`   Password: ${password}`);
        console.log(`   Role: ${existingUser.role}`);
      } else {
        console.log('\n💡 To update the password, run:');
        console.log(`   node backend/createAdminUser.js "${email}" "${password}" "${name || 'Admin User'}" --update-password`);
      }
      
      await mongoose.disconnect();
      process.exit(0);
    }

    // Validate password
    if (!password || password.length < 8) {
      console.error('❌ Error: Password must be at least 8 characters long');
      process.exit(1);
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    console.log('👤 Creating admin account...');
    const admin = new User({
      name: name || 'Admin User',
      email: email.toLowerCase().trim(),
      role: 'admin',
      password: hashedPassword,
      loginEnabled: true,
      emailNotifications: true,
      failedLoginAttempts: 0,
      accountLockedUntil: null
    });

    await admin.save();
    console.log('✅ Admin account created successfully!\n');
    
    console.log('📋 Account Details:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Login Enabled: ${admin.loginEnabled}`);
    console.log(`   Created: ${admin.createdAt}`);
    
    console.log('\n🔑 Login Credentials:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: admin`);
    
    console.log('\n✅ You can now login with these credentials!');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    if (error.code === 11000) {
      console.error('   💡 This email is already registered. Use --update-password to update the password.');
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get arguments from command line
const email = process.argv[2] || 'faheem@gmail.com';
const password = process.argv[3] || 'Faheem25!!!';
const name = process.argv[4] || 'Faheem Admin';

if (!email || !password) {
  console.error('❌ Error: Email and password are required');
  console.log('\nUsage: node backend/createAdminUser.js <email> <password> [name]');
  console.log('Example: node backend/createAdminUser.js faheem@gmail.com "Faheem25!!!" "Faheem Admin"');
  process.exit(1);
}

createAdminUser(email, password, name);
