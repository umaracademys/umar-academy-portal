// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


// Check students in MongoDB
const mongoose = require('mongoose');

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

// Student Schema
const studentSchema = new mongoose.Schema({}, { strict: false });
const Student = mongoose.model('Student', studentSchema);

const checkStudents = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all students
    const students = await Student.find({});
    console.log(`📊 Total Students in Student collection: ${students.length}\n`);

    if (students.length === 0) {
      console.log('❌ No students found in Student collection');
    } else {
      console.log('📋 Students in Student collection:');
      for (let index = 0; index < students.length; index++) {
        const student = students[index];
        console.log(`\n${index + 1}. Student:`);
        console.log(`   ID: ${student._id}`);
        console.log(`   Student ID: ${student.studentId || 'N/A'}`);
        console.log(`   Full Name: ${student.fullName || 'N/A'}`);
        console.log(`   Email: ${student.email || 'N/A'}`);
        console.log(`   Status: ${student.status || 'N/A'}`);
        console.log(`   User ID: ${student.userId || 'N/A'}`);
        
        // Check if corresponding User exists
        if (student.email) {
          const user = await User.findOne({ email: student.email, role: 'student' });
          if (user) {
            console.log(`   ✅ User account exists (can login)`);
            console.log(`      User ID: ${user._id}`);
            console.log(`      Password set: ${!!user.password}`);
          } else {
            console.log(`   ❌ NO USER ACCOUNT (CANNOT LOGIN!)`);
            console.log(`      ⚠️  Student exists but no User record with role='student'`);
          }
        }
      }
    }

    // Also check Users with role='student'
    console.log('\n\n📊 Checking User collection for students...');
    const studentUsers = await User.find({ role: 'student' });
    console.log(`👥 Total Users with role='student': ${studentUsers.length}\n`);

    if (studentUsers.length === 0) {
      console.log('❌ No users found with role="student"');
    } else {
      console.log('📋 Users with role="student":');
      for (let index = 0; index < studentUsers.length; index++) {
        const user = studentUsers[index];
        console.log(`\n${index + 1}. User:`);
        console.log(`   ID: ${user._id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Password set: ${!!user.password}`);
        
        // Check if corresponding Student exists
        const student = await Student.findOne({ email: user.email });
        if (student) {
          console.log(`   ✅ Student profile exists`);
        } else {
          console.log(`   ⚠️  No Student profile (has login but no student data)`);
        }
      }
    }

    // Summary
    console.log('\n\n📊 SUMMARY:');
    console.log(`   Students in Student collection: ${students.length}`);
    console.log(`   Users with role='student': ${studentUsers.length}`);
    
    const studentsWithoutUsers = [];
    for (const student of students) {
      if (student.email) {
        const user = await User.findOne({ email: student.email, role: 'student' });
        if (!user) {
          studentsWithoutUsers.push(student);
        }
      }
    }
    
    if (studentsWithoutUsers.length > 0) {
      console.log(`\n   ⚠️  ${studentsWithoutUsers.length} student(s) CANNOT LOGIN (no User account):`);
      studentsWithoutUsers.forEach(s => {
        console.log(`      - ${s.email || s.fullName || 'Unknown'} (${s.email || 'no email'})`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkStudents();

