// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


// Sync all students from production to local MongoDB
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PRODUCTION_API = 'https://umar-academy-backend.onrender.com/api';
const LOCAL_MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String,
  password: String,
  avatar: String,
  loginEnabled: { type: Boolean, default: true },
  emailNotifications: { type: Boolean, default: true },
  smsNotifications: { type: Boolean, default: false },
  twoFactorEnabled: { type: Boolean, default: false }
}, { timestamps: true });

// Student Schema (flexible)
const studentSchema = new mongoose.Schema({}, { strict: false, timestamps: true });

const User = mongoose.model('User', userSchema);
const Student = mongoose.model('Student', studentSchema);

const syncStudents = async () => {
  try {
    console.log('🔄 Starting sync from production to local MongoDB...\n');

    // Step 1: Fetch students from production API
    console.log('📡 Fetching students from production API...');
    const response = await fetch(`${PRODUCTION_API}/students`);
    if (!response.ok) {
      throw new Error(`Failed to fetch students: ${response.status} ${response.statusText}`);
    }
    const productionStudents = await response.json();
    console.log(`✅ Found ${productionStudents.length} students in production\n`);

    // Step 2: Connect to local MongoDB
    console.log('🔧 Connecting to local MongoDB...');
    await mongoose.connect(LOCAL_MONGODB_URI);
    console.log('✅ Connected to local MongoDB\n');

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Step 3: Process each student
    for (const prodStudent of productionStudents) {
      try {
        const email = prodStudent.email;
        if (!email) {
          console.log(`⚠️  Skipping student without email: ${prodStudent.fullName || 'Unknown'}`);
          skippedCount++;
          continue;
        }

        // Check if student already exists
        const existingStudent = await Student.findOne({ email });
        const existingUser = await User.findOne({ email, role: 'student' });

        if (existingStudent && existingUser) {
          console.log(`⏭️  Already exists: ${prodStudent.fullName} (${email})`);
          skippedCount++;
          continue;
        }

        // Prepare student data (remove _id and userId nested object, keep userId reference)
        const studentData = { ...prodStudent };
        delete studentData._id;
        delete studentData.__v;
        
        // Extract userId if it exists in nested form
        let userIdRef = null;
        if (prodStudent.userId && prodStudent.userId._id) {
          userIdRef = prodStudent.userId._id;
        }

        // Create or update user account
        let user;
        if (!existingUser) {
          // Hash password if it's plain text
          let hashedPassword = prodStudent.userId?.password || 'password123';
          if (!hashedPassword.startsWith('$2a$')) {
            hashedPassword = await bcrypt.hash(hashedPassword, 10);
          }

          user = new User({
            name: prodStudent.fullName || prodStudent.name || 'Student',
            email: email,
            role: 'student',
            password: hashedPassword,
            avatar: prodStudent.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(prodStudent.fullName || 'Student')}&background=2E4D32&color=fff`,
            loginEnabled: prodStudent.userId?.loginEnabled !== false,
            emailNotifications: prodStudent.userId?.emailNotifications !== false,
            smsNotifications: prodStudent.userId?.smsNotifications === true,
            twoFactorEnabled: prodStudent.userId?.twoFactorEnabled === true
          });
          await user.save();
          console.log(`✅ Created user account: ${email}`);
        } else {
          user = existingUser;
          console.log(`✅ Using existing user account: ${email}`);
        }

        // Create or update student profile
        if (!existingStudent) {
          studentData.userId = user._id;
          const student = new Student(studentData);
          await student.save();
          console.log(`✅ Created student profile: ${prodStudent.fullName} (${email})`);
          createdCount++;
        } else {
          // Update existing student
          studentData.userId = user._id;
          await Student.updateOne({ email }, { $set: studentData });
          console.log(`🔄 Updated student profile: ${prodStudent.fullName} (${email})`);
          updatedCount++;
        }

      } catch (error) {
        console.error(`❌ Error processing ${prodStudent.fullName || 'Unknown'} (${prodStudent.email}):`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SYNC SUMMARY:');
    console.log('='.repeat(50));
    console.log(`✅ Created: ${createdCount} students`);
    console.log(`🔄 Updated: ${updatedCount} students`);
    console.log(`⏭️  Skipped: ${skippedCount} students (already exist)`);
    console.log(`❌ Errors: ${errorCount} students`);
    console.log(`📊 Total processed: ${productionStudents.length} students`);
    console.log('='.repeat(50));

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    console.log('🎉 Sync completed!');
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
};

syncStudents();

