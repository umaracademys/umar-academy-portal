// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


/**
 * Script to check if a user exists in the database
 * 
 * Usage: node backend/checkUser.js <email>
 */

const mongoose = require('mongoose');

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

async function checkUser(email) {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Search for user (case-insensitive)
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });

    if (user) {
      console.log('✅ User found!');
      console.log('\n📋 User Details:');
      console.log('   ID:', user._id);
      console.log('   Name:', user.name || user.fullName || 'Not set');
      console.log('   Email:', user.email);
      console.log('   Role:', user.role);
      console.log('   Login Enabled:', user.loginEnabled);
      console.log('   Created:', user.createdAt);
      console.log('   Updated:', user.updatedAt);
      if (user.isDeveloper) console.log('   ⚠️  Developer Account');
      if (user.isTestAccount) console.log('   ⚠️  Test Account');
    } else {
      console.log('❌ User not found');
      console.log(`\n   No user with email "${email}" exists in the database.`);
      console.log('\n💡 To create this user, you can:');
      console.log('   1. Use the Super Admin dashboard to create a new admin');
      console.log('   2. Or modify/create a script to add this user');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking user:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2] || 'Azfar@gmail.com';

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node backend/checkUser.js <email>');
  process.exit(1);
}

checkUser(email);
