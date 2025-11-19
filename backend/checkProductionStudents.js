// Check all students in production database
// Run from Render Shell: node checkProductionStudents.js
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set!');
  process.exit(1);
}

// Student Schema
const studentSchema = new mongoose.Schema({}, { strict: false });
const Student = mongoose.model('Student', studentSchema);

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  password: String
}, { strict: false });
const User = mongoose.model('User', userSchema);

const checkStudents = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    console.log('   URI:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all students
    const students = await Student.find({}).sort({ fullName: 1 });
    console.log(`📊 Total Students: ${students.length}\n`);

    if (students.length === 0) {
      console.log('❌ No students found in Student collection');
    } else {
      console.log('📋 ALL STUDENTS:\n');
      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        console.log(`${i + 1}. ${student.fullName || 'Unknown Name'}`);
        console.log(`   Email: ${student.email || 'N/A'}`);
        console.log(`   Student ID: ${student.studentId || 'N/A'}`);
        console.log(`   Status: ${student.status || 'N/A'}`);
        console.log(`   Program: ${student.program || 'N/A'}`);
        
        // Check if user exists
        if (student.email) {
          const user = await User.findOne({ email: student.email, role: 'student' });
          if (user) {
            console.log(`   ✅ Can login (User account exists)`);
          } else {
            console.log(`   ❌ Cannot login (No User account)`);
          }
        }
        console.log('');
      }
    }

    // Search for specific names
    console.log('\n🔍 Searching for: hummah, ia, musa\n');
    const searchNames = ['hummah', 'ia', 'musa'];
    
    for (const searchName of searchNames) {
      const found = await Student.find({
        $or: [
          { fullName: { $regex: searchName, $options: 'i' } },
          { email: { $regex: searchName, $options: 'i' } }
        ]
      });
      
      if (found.length > 0) {
        console.log(`✅ Found "${searchName}":`);
        found.forEach(s => {
          console.log(`   - ${s.fullName} (${s.email})`);
        });
      } else {
        console.log(`❌ Not found: "${searchName}"`);
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkStudents();

