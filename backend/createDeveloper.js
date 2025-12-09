/**
 * Script to create a developer account in MongoDB
 * 
 * Usage: node backend/createDeveloper.js
 * 
 * This will create a developer user with:
 * - Email: developer@test.com
 * - Password: developer123 (you can change this)
 * - Role: superadmin (for full access)
 * - isDeveloper: true flag
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema (matching server.js)
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
  isDeveloper: { type: Boolean, default: false }, // Add developer flag
  isTestAccount: { type: Boolean, default: false }, // Add test account flag
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// MongoDB connection string - update this to match your database
// Check your .env file or backend/server.js for the correct connection string
const MONGODB_URI = process.env.MONGODB_URI || 
  process.env.MONGO_URI || 
  'mongodb://localhost:27017/umar-academy-portal';

async function createDeveloper() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Developer account details
    const developerEmail = 'developer@test.com';
    const developerPassword = 'developer123'; // Change this to a secure password
    const developerName = 'Developer Account';
    const developerRole = 'superadmin'; // Use 'superadmin' for full access, or 'admin' for limited access

    // Check if developer already exists
    const existingDeveloper = await User.findOne({ email: developerEmail });
    if (existingDeveloper) {
      console.log('⚠️  Developer account already exists!');
      console.log('   Email:', existingDeveloper.email);
      console.log('   Role:', existingDeveloper.role);
      console.log('   isDeveloper:', existingDeveloper.isDeveloper);
      console.log('\n   To update the account, delete it first or modify this script.');
      await mongoose.disconnect();
      return;
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(developerPassword, saltRounds);

    // Create developer user
    console.log('👤 Creating developer account...');
    const developer = new User({
      name: developerName,
      email: developerEmail,
      role: developerRole,
      password: hashedPassword,
      loginEnabled: true,
      isDeveloper: true, // This flag triggers developer mode
      isTestAccount: true, // Alternative flag that also triggers developer mode
      emailNotifications: false,
      smsNotifications: false,
    });

    await developer.save();
    console.log('✅ Developer account created successfully!');
    console.log('\n📋 Account Details:');
    console.log('   Email:', developerEmail);
    console.log('   Password:', developerPassword);
    console.log('   Role:', developerRole);
    console.log('   Name:', developerName);
    console.log('\n🔒 Data masking will be automatically applied when this account logs in.');
    console.log('   All personal information (names, emails, phones, addresses) will be masked.');
    console.log('\n⚠️  IMPORTANT: Change the password in production!');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error creating developer account:', error);
    if (error.code === 11000) {
      console.error('   This email already exists in the database.');
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
createDeveloper();

