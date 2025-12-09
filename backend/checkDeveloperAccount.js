/**
 * Script to check if developer account exists in MongoDB
 * 
 * Usage: 
 *   For local: node backend/checkDeveloperAccount.js
 *   For production: MONGODB_URI="your-production-uri" node backend/checkDeveloperAccount.js
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
  isDeveloper: { type: Boolean, default: false },
  isTestAccount: { type: Boolean, default: false },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 
  process.env.MONGO_URI || 
  'mongodb://localhost:27017/umar-academy-portal';

async function checkDeveloperAccount() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log('   URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check for developer account
    const developerEmail = 'developer@test.com';
    const developer = await User.findOne({ email: developerEmail });

    if (developer) {
      console.log('✅ Developer account found!');
      console.log('\n📋 Account Details:');
      console.log('   Email:', developer.email);
      console.log('   Name:', developer.name);
      console.log('   Role:', developer.role);
      console.log('   Login Enabled:', developer.loginEnabled);
      console.log('   isDeveloper:', developer.isDeveloper);
      console.log('   isTestAccount:', developer.isTestAccount);
      console.log('   Created:', developer.createdAt);
      console.log('   Updated:', developer.updatedAt);
      console.log('   Has Password:', developer.password ? 'Yes (hashed)' : 'No');
      
      // Test password
      if (developer.password) {
        const testPassword = 'developer123';
        const isPasswordValid = await bcrypt.compare(testPassword, developer.password);
        console.log('   Password Match (developer123):', isPasswordValid ? '✅ Yes' : '❌ No');
      }
    } else {
      console.log('❌ Developer account NOT found!');
      console.log('   Email searched:', developerEmail);
      console.log('\n   To create the account, run:');
      console.log('   node backend/createDeveloper.js (for local)');
      console.log('   MONGODB_URI="your-uri" node backend/createDeveloperProduction.js (for production)');
    }

    // Also check for any users with developer flags
    console.log('\n🔍 Checking for other developer/test accounts...');
    const allDevelopers = await User.find({
      $or: [
        { isDeveloper: true },
        { isTestAccount: true },
        { email: { $regex: /@(test|developer|demo)/i } }
      ]
    }).select('email name role isDeveloper isTestAccount');

    if (allDevelopers.length > 0) {
      console.log(`\n📊 Found ${allDevelopers.length} developer/test account(s):`);
      allDevelopers.forEach((user, index) => {
        console.log(`\n   ${index + 1}. ${user.email}`);
        console.log(`      Name: ${user.name}`);
        console.log(`      Role: ${user.role}`);
        console.log(`      isDeveloper: ${user.isDeveloper}`);
        console.log(`      isTestAccount: ${user.isTestAccount}`);
      });
    } else {
      console.log('   No other developer/test accounts found.');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error checking developer account:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
checkDeveloperAccount();

