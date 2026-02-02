// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


// Check if a user exists by email
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// User Schema (matching server.js)
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String,
  password: String,
  avatar: String
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Student Schema
const studentSchema = new mongoose.Schema({}, { strict: false });
const Student = mongoose.model('Student', studentSchema);

// Teacher Schema
const teacherSchema = new mongoose.Schema({}, { strict: false });
const Teacher = mongoose.model('Teacher', teacherSchema);

const checkEmail = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const emailToCheck = 'Saria_mdn@yahoo.com';
    console.log(`🔍 Searching for: ${emailToCheck}\n`);

    // Check in Users collection
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${emailToCheck}$`, 'i') }
    });
    
    if (user) {
      console.log('✅ USER FOUND IN USERS COLLECTION:');
      console.log('   Email:', user.email);
      console.log('   Name:', user.name || 'N/A');
      console.log('   Role:', user.role || 'N/A');
      console.log('   ID:', user._id);
      console.log('   Created:', user.createdAt);
      console.log('   Login Enabled:', user.loginEnabled !== false ? '✅ YES' : '❌ NO');
      console.log('   Has Password:', user.password ? '✅ YES' : '❌ NO');
    } else {
      console.log('❌ NOT FOUND in Users collection');
    }

    // Check in Students collection
    const student = await Student.findOne({ 
      email: { $regex: new RegExp(`^${emailToCheck}$`, 'i') }
    });
    
    if (student) {
      console.log('\n✅ FOUND IN STUDENTS COLLECTION:');
      console.log('   Email:', student.email);
      console.log('   Full Name:', student.fullName || 'N/A');
      console.log('   ID:', student._id);
      console.log('   Status:', student.status || 'N/A');
      console.log('   User ID:', student.userId || 'N/A');
    } else {
      console.log('\n❌ NOT FOUND in Students collection');
    }

    // Check in Teachers collection
    const teacher = await Teacher.findOne({ 
      email: { $regex: new RegExp(`^${emailToCheck}$`, 'i') }
    });
    
    if (teacher) {
      console.log('\n✅ FOUND IN TEACHERS COLLECTION:');
      console.log('   Email:', teacher.email);
      console.log('   Full Name:', teacher.fullName || 'N/A');
      console.log('   ID:', teacher._id);
      console.log('   User ID:', teacher.userId || 'N/A');
    } else {
      console.log('\n❌ NOT FOUND in Teachers collection');
    }

    // Summary
    if (user || student || teacher) {
      console.log('\n✅ SUMMARY: Email exists in database');
    } else {
      console.log('\n❌ SUMMARY: Email NOT FOUND in any collection');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkEmail();

