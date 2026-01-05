// Fix student login issues - create User accounts for students that don't have them
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

const fixStudentLogins = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all students
    const students = await Student.find({});
    console.log(`📊 Found ${students.length} students in Student collection\n`);

    let fixedCount = 0;
    let alreadyHasUserCount = 0;
    let noEmailCount = 0;

    for (const student of students) {
      if (!student.email) {
        console.log(`⚠️  Student "${student.fullName || 'Unknown'}" has no email - skipping`);
        noEmailCount++;
        continue;
      }

      // Check if User exists
      const existingUser = await User.findOne({ email: student.email, role: 'student' });
      
      if (existingUser) {
        console.log(`✅ ${student.email} - Already has User account`);
        alreadyHasUserCount++;
        
        // Check if password is set
        if (!existingUser.password) {
          console.log(`   ⚠️  No password set - setting default password...`);
          const hashedPassword = await bcrypt.hash('password123', 10);
          existingUser.password = hashedPassword;
          existingUser.passwordChangeRequired = true; // Set flag to require password change
          await existingUser.save();
          console.log(`   ✅ Password set to: password123 (password change required)`);
          fixedCount++;
        } else if (existingUser.passwordChangeRequired === undefined || existingUser.passwordChangeRequired === null) {
          // Ensure passwordChangeRequired flag is set for default passwords
          existingUser.passwordChangeRequired = true;
          await existingUser.save();
          console.log(`   ✅ Set passwordChangeRequired flag`);
        }
      } else {
        console.log(`❌ ${student.email} - NO USER ACCOUNT (creating now...)`);
        
        // Create User account
        const hashedPassword = await bcrypt.hash('password123', 10);
        const user = await User.create({
          name: student.fullName || student.email.split('@')[0],
          email: student.email,
          role: 'student',
          password: hashedPassword,
          passwordChangeRequired: true, // Set flag to require password change
          avatar: student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fullName || student.email)}&background=3b82f6&color=fff`
        });
        
        // Update student with userId
        if (student.userId) {
          console.log(`   ⚠️  Student already has userId but User didn't exist - updating User ID`);
        }
        student.userId = user._id;
        await student.save();
        
        console.log(`   ✅ User account created!`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Password: password123`);
        fixedCount++;
      }
    }

    console.log('\n\n📊 SUMMARY:');
    console.log(`   Total students: ${students.length}`);
    console.log(`   Already have User accounts: ${alreadyHasUserCount}`);
    console.log(`   Fixed/Created: ${fixedCount}`);
    console.log(`   No email: ${noEmailCount}`);

    if (fixedCount > 0) {
      console.log('\n✅ Fixed student login issues!');
      console.log('\n🔑 Default login credentials for newly created accounts:');
      console.log('   Password: password123');
      console.log('   Role: student');
    } else {
      console.log('\n✅ All students already have User accounts!');
    }

    // Show all students with their login info
    console.log('\n\n📋 ALL STUDENTS - LOGIN INFO:');
    const allStudents = await Student.find({});
    for (const student of allStudents) {
      if (student.email) {
        const user = await User.findOne({ email: student.email, role: 'student' });
        if (user) {
          console.log(`\n✅ ${student.fullName || 'Unknown'}`);
          console.log(`   Email: ${student.email}`);
          console.log(`   Password: ${user.password ? 'SET' : 'NOT SET'}`);
          console.log(`   Can login: ${user.password ? 'YES ✅' : 'NO ❌'}`);
        } else {
          console.log(`\n❌ ${student.fullName || 'Unknown'}`);
          console.log(`   Email: ${student.email}`);
          console.log(`   Can login: NO ❌ (No User account)`);
        }
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    if (error.code === 11000) {
      console.error('   Duplicate email - user may already exist');
    }
    process.exit(1);
  }
};

fixStudentLogins();

