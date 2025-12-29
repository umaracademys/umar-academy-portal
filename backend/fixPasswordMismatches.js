/**
 * Script to fix password mismatches for specific students
 * Usage: node backend/fixPasswordMismatches.js
 */

// Load dotenv if available
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed, that's okay
}

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 
  process.env.MONGO_URI || 
  'mongodb://localhost:27017/umar-academy-portal';

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String,
  password: String,
  avatar: String
}, { strict: false, timestamps: true });

const User = mongoose.model('User', userSchema);

// Students with password mismatches - update these passwords
const studentsToFix = [
  { email: 'mhd.eliyas@gmail.com', password: 'Yn7^i!A4Z!$p', name: 'Aaliyah Anam' },
  { email: 'mddt80888@yahoo.com', password: '0hTUOIC#uPcq', name: 'Noah Dano' }
];

async function fixPasswords() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    console.log(`📊 Connection URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log(`📋 Fixing passwords for ${studentsToFix.length} students...\n`);
    console.log('='.repeat(80));

    for (const student of studentsToFix) {
      try {
        const emailLower = student.email.toLowerCase();
        
        // Find user by email
        const user = await User.findOne({ 
          email: { $regex: new RegExp(`^${emailLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          role: 'student'
        });

        if (!user) {
          console.log(`❌ User not found: ${student.name} (${student.email})`);
          continue;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(student.password, 10);
        
        // Update the password
        user.password = hashedPassword;
        await user.save();

        console.log(`✅ Password updated for: ${student.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Password: ${student.password}`);
        console.log(`   Hash: ${hashedPassword.substring(0, 20)}...`);
        console.log('');
      } catch (err) {
        console.error(`❌ Error fixing password for ${student.name}:`, err.message);
        console.log('');
      }
    }

    console.log('='.repeat(80));
    console.log('\n✅ Password fix complete!');
    console.log('\nYou can now verify the passwords with: node backend/verifyStudentList.js\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

// Run the fix
fixPasswords();

