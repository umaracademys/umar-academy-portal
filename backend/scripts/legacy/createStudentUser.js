// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


// Create student user account
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  fullName: String,
  email: { type: String, unique: true },
  role: String,
  password: String,
  avatar: String,
  loginEnabled: { type: Boolean, default: true },
  failedLoginAttempts: { type: Number, default: 0 },
  accountLockedUntil: Date,
  lastFailedLoginAttempt: Date
}, { timestamps: true });

// Student Schema
const studentSchema = new mongoose.Schema({
  email: String,
  fullName: String,
  studentId: String,
  userId: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Student = mongoose.model('Student', studentSchema);

const createStudentUser = async () => {
  try {
    const email = process.argv[2] || 'zidanm@gmail.com';
    const password = process.argv[3] || 'password123';
    const fullName = process.argv[4] || 'Student User';
    
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (user) {
      console.log(`⚠️ User with email ${email} already exists!`);
      console.log('Resetting password...');
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      user.role = 'student';
      user.loginEnabled = true;
      user.failedLoginAttempts = 0;
      user.accountLockedUntil = null;
      await user.save();
      console.log('✅ Password reset successfully!');
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await User.create({
        email,
        name: fullName,
        fullName: fullName,
        role: 'student',
        password: hashedPassword,
        loginEnabled: true,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&color=fff`
      });
      console.log('✅ User created successfully!');
    }

    // Check if student record exists
    let student = await Student.findOne({ email });
    if (!student) {
      student = await Student.create({
        email,
        fullName: user.fullName || user.name || fullName,
        userId: user._id
      });
      console.log('✅ Student record created!');
    } else {
      // Link student to user if not already linked
      if (!student.userId) {
        student.userId = user._id;
        await student.save();
        console.log('✅ Student record linked to user!');
      }
    }
    
    console.log('\n🔑 Login Credentials:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Password: ${password}`);
    console.log('\n✅ You can now login with these credentials!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating user:', error);
    if (error.code === 11000) {
      console.error('   Email already exists. Try resetting password instead.');
    }
    process.exit(1);
  }
};

createStudentUser();

