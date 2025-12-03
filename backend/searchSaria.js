// Search for any email containing "saria" (case-insensitive)
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

const studentSchema = new mongoose.Schema({}, { strict: false });
const Student = mongoose.model('Student', studentSchema);

const teacherSchema = new mongoose.Schema({}, { strict: false });
const Teacher = mongoose.model('Teacher', teacherSchema);

const searchSaria = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Search in all collections for "saria" (case-insensitive)
    console.log('🔍 Searching for emails containing "saria"...\n');

    // Users
    const users = await User.find({ 
      email: { $regex: /saria/i }
    });
    console.log(`👥 USERS with "saria" in email: ${users.length}`);
    users.forEach(u => {
      console.log(`   - ${u.email} (${u.name || 'N/A'}) - ${u.role || 'N/A'}`);
    });

    // Students
    const students = await Student.find({ 
      email: { $regex: /saria/i }
    });
    console.log(`\n📚 STUDENTS with "saria" in email: ${students.length}`);
    students.forEach(s => {
      console.log(`   - ${s.email || 'N/A'} (${s.fullName || 'N/A'})`);
    });

    // Teachers
    const teachers = await Teacher.find({ 
      email: { $regex: /saria/i }
    });
    console.log(`\n👨‍🏫 TEACHERS with "saria" in email: ${teachers.length}`);
    teachers.forEach(t => {
      console.log(`   - ${t.email || 'N/A'} (${t.fullName || 'N/A'})`);
    });

    // Also check all users (not just first 50)
    const allUsers = await User.find({}).select('email name role');
    console.log(`\n📊 Total users in database: ${allUsers.length}`);
    
    // Check if the exact email exists (case variations)
    const exactMatches = allUsers.filter(u => 
      u.email && u.email.toLowerCase() === 'saria_mdn@yahoo.com'
    );
    if (exactMatches.length > 0) {
      console.log(`\n✅ Found exact match (case-insensitive):`);
      exactMatches.forEach(u => {
        console.log(`   - ${u.email} (${u.name || 'N/A'}) - ${u.role || 'N/A'}`);
      });
    } else {
      console.log(`\n❌ No exact match found for "Saria_mdn@yahoo.com"`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Done');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

searchSaria();

