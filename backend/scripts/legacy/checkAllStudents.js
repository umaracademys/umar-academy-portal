// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


// Check all students with detailed information
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// Student Schema
const studentSchema = new mongoose.Schema({}, { strict: false });
const Student = mongoose.model('Student', studentSchema);

const checkAllStudents = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all students
    const students = await Student.find({}).sort({ fullName: 1 });
    console.log(`📊 Total Students: ${students.length}\n`);

    if (students.length === 0) {
      console.log('❌ No students found');
    } else {
      console.log('📋 ALL STUDENTS:\n');
      students.forEach((student, index) => {
        console.log(`${index + 1}. ${student.fullName || 'Unknown Name'}`);
        console.log(`   Email: ${student.email || 'N/A'}`);
        console.log(`   Student ID: ${student.studentId || 'N/A'}`);
        console.log(`   Status: ${student.status || 'N/A'}`);
        console.log(`   Program: ${student.program || 'N/A'}`);
        console.log(`   Assigned Teacher: ${student.assignedTeacher || 'N/A'}`);
        console.log(`   ID: ${student._id}`);
        console.log('');
      });
    }

    // Search for specific names
    console.log('\n🔍 Searching for specific students...\n');
    const searchNames = ['hummah', 'ia', 'musa', 'hafsa', 'abdullah'];
    
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
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkAllStudents();

