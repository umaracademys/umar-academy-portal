// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


// List all users to verify MongoDB connection and see what's in the database
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

// Teacher Schema
const teacherSchema = new mongoose.Schema({}, { strict: false });
const Teacher = mongoose.model('Teacher', teacherSchema);

const checkAllUsers = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    console.log('   URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    console.log(`📊 Database: ${dbName}\n`);

    // Check Users collection
    console.log('👥 USERS COLLECTION:');
    const users = await User.find({}).select('-password').limit(50);
    console.log(`   Total users found: ${users.length} (showing first 50)`);
    if (users.length > 0) {
      users.forEach((u, idx) => {
        console.log(`   ${idx + 1}. ${u.email || 'N/A'} - ${u.name || 'N/A'} - ${u.role || 'N/A'}`);
      });
    } else {
      console.log('   ❌ No users found');
    }

    // Check for the specific email (case-insensitive)
    console.log('\n🔍 SEARCHING FOR: Saria_mdn@yahoo.com');
    const searchEmail = 'Saria_mdn@yahoo.com';
    
    // Try exact match
    const exactUser = await User.findOne({ email: searchEmail });
    if (exactUser) {
      console.log('   ✅ Found with exact match');
    } else {
      console.log('   ❌ Not found with exact match');
    }
    
    // Try case-insensitive
    const caseInsensitiveUser = await User.findOne({ 
      email: { $regex: new RegExp(`^${searchEmail}$`, 'i') }
    });
    if (caseInsensitiveUser) {
      console.log('   ✅ Found with case-insensitive match');
      console.log(`      Actual email in DB: ${caseInsensitiveUser.email}`);
    } else {
      console.log('   ❌ Not found with case-insensitive match');
    }
    
    // Try partial match
    const partialUsers = await User.find({ 
      email: { $regex: new RegExp('saria', 'i') }
    });
    if (partialUsers.length > 0) {
      console.log(`   ⚠️  Found ${partialUsers.length} user(s) with "saria" in email:`);
      partialUsers.forEach(u => {
        console.log(`      - ${u.email}`);
      });
    }

    // Check Students collection
    console.log('\n📚 STUDENTS COLLECTION:');
    const students = await Student.find({}).limit(50);
    console.log(`   Total students found: ${students.length} (showing first 50)`);
    if (students.length > 0) {
      students.forEach((s, idx) => {
        console.log(`   ${idx + 1}. ${s.email || 'N/A'} - ${s.fullName || 'N/A'}`);
      });
    } else {
      console.log('   ❌ No students found');
    }
    
    // Search for email in students
    const studentMatch = await Student.findOne({ 
      email: { $regex: new RegExp(`^${searchEmail}$`, 'i') }
    });
    if (studentMatch) {
      console.log(`\n   ✅ Found student with email: ${studentMatch.email}`);
      console.log(`      Full Name: ${studentMatch.fullName}`);
      console.log(`      Student ID: ${studentMatch._id}`);
    }

    // Check Teachers collection
    console.log('\n👨‍🏫 TEACHERS COLLECTION:');
    const teachers = await Teacher.find({}).limit(50);
    console.log(`   Total teachers found: ${teachers.length} (showing first 50)`);
    if (teachers.length > 0) {
      teachers.forEach((t, idx) => {
        console.log(`   ${idx + 1}. ${t.email || 'N/A'} - ${t.fullName || 'N/A'}`);
      });
    } else {
      console.log('   ❌ No teachers found');
    }
    
    // Search for email in teachers
    const teacherMatch = await Teacher.findOne({ 
      email: { $regex: new RegExp(`^${searchEmail}$`, 'i') }
    });
    if (teacherMatch) {
      console.log(`\n   ✅ Found teacher with email: ${teacherMatch.email}`);
      console.log(`      Full Name: ${teacherMatch.fullName}`);
      console.log(`      Teacher ID: ${teacherMatch._id}`);
    }

    // Check database stats
    console.log('\n📊 DATABASE STATS:');
    const collections = await db.listCollections().toArray();
    console.log(`   Collections: ${collections.map(c => c.name).join(', ')}`);
    
    const userCount = await User.countDocuments();
    const studentCount = await Student.countDocuments();
    const teacherCount = await Teacher.countDocuments();
    console.log(`   Total Users: ${userCount}`);
    console.log(`   Total Students: ${studentCount}`);
    console.log(`   Total Teachers: ${teacherCount}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkAllUsers();

