// Add a new teacher
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

// Teacher Schema (matching server.js)
const teacherSchema = new mongoose.Schema({
  teacherId: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fullName: String,
  email: { type: String, unique: true, sparse: true },
  contact: String,
  phoneNumber: String,
  emergencyContact: String,
  department: String,
  specialization: [String],
  location: String,
  employmentType: String,
  shiftType: String,
  shifts: [{
    name: String,
    startTime: String,
    endTime: String
  }],
  status: String,
  assignedStudents: [String],
  idDocument: String,
  permissions: {
    canViewAssessments: Boolean,
    canEditAssessments: Boolean,
    canViewEvaluations: Boolean,
    canEditEvaluations: Boolean,
    canViewFinancials: Boolean,
    canManageSchedule: Boolean,
    canContactParents: Boolean,
    canViewStudentEmail: Boolean,
    canViewStudentContact: Boolean,
    canViewStudentPersonalInfo: Boolean
  },
  payroll: {
    hourlyRate: Number,
    dailyHours: Number,
    daysWorking: Number,
    monthlyHours: Number,
    monthlySalary: Number,
    currency: String,
    paymentType: String,
    bankAccount: String
  },
  schedule: {
    days: [String],
    workingDays: [String],
    startTime: String,
    endTime: String,
    workingHours: {
      start: String,
      end: String
    },
    timezone: String
  },
  hireDate: String,
  avatar: String,
  specialization: [String]
}, { timestamps: true });

const Teacher = mongoose.model('Teacher', teacherSchema);

const addTeacher = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const email = 'rashid86amir82@gmail.com';
    const fullName = 'Rashid Amir'; // Default name, can be updated later
    const defaultPassword = 'password123';

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('⚠️  User already exists with this email!');
      console.log('   Email:', existingUser.email);
      console.log('   Role:', existingUser.role);
      console.log('   ID:', existingUser._id);
      
      // Check if teacher profile exists
      const existingTeacher = await Teacher.findOne({ email });
      if (existingTeacher) {
        console.log('\n✅ Teacher profile also exists!');
        console.log('   Full Name:', existingTeacher.fullName);
        process.exit(0);
      } else {
        console.log('\n⚠️  User exists but no teacher profile. Creating teacher profile...');
        // Create teacher profile for existing user
        const teacher = new Teacher({
          teacherId: `TCH${Date.now()}`,
          userId: existingUser._id,
          fullName: fullName,
          email: email,
          contact: '',
          department: 'Quran',
          location: '',
          employmentType: 'full-time',
          status: 'active',
          assignedStudents: [],
          permissions: {
            canViewAssessments: true,
            canEditAssessments: true,
            canViewEvaluations: true,
            canEditEvaluations: true,
            canViewFinancials: false,
            canManageSchedule: true,
            canContactParents: true,
            canViewStudentEmail: true,
            canViewStudentContact: true,
            canViewStudentPersonalInfo: true
          },
          payroll: {
            monthlySalary: 0,
            currency: 'USD',
            paymentType: 'monthly'
          },
          schedule: {
            workingDays: [],
            workingHours: {
              start: '',
              end: ''
            },
            timezone: 'UTC'
          },
          hireDate: new Date().toISOString()
        });
        await teacher.save();
        console.log('✅ Teacher profile created successfully!');
        process.exit(0);
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create user
    console.log('📝 Creating user...');
    const user = await User.create({
      name: fullName,
      email: email,
      role: 'teacher',
      password: hashedPassword,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=10b981&color=fff`
    });
    console.log('✅ User created:', user.email);

    // Create teacher profile
    console.log('📝 Creating teacher profile...');
    const teacher = new Teacher({
      teacherId: `TCH${Date.now()}`,
      userId: user._id,
      fullName: fullName,
      email: email,
      contact: '',
      department: 'Quran',
      location: '',
      employmentType: 'full-time',
      status: 'active',
      assignedStudents: [],
      permissions: {
        canViewAssessments: true,
        canEditAssessments: true,
        canViewEvaluations: true,
        canEditEvaluations: true,
        canViewFinancials: false,
        canManageSchedule: true,
        canContactParents: true,
        canViewStudentEmail: true,
        canViewStudentContact: true,
        canViewStudentPersonalInfo: true
      },
      payroll: {
        monthlySalary: 0,
        currency: 'USD',
        paymentType: 'monthly'
      },
      schedule: {
        workingDays: [],
        workingHours: {
          start: '',
          end: ''
        },
        timezone: 'UTC'
      },
      hireDate: new Date().toISOString()
    });
    await teacher.save();
    console.log('✅ Teacher profile created:', teacher.fullName);

    console.log('\n🎉 Teacher added successfully!');
    console.log('\n🔑 Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${defaultPassword}`);
    console.log(`   Role: Teacher`);
    console.log('\n⚠️  Please update the teacher profile with complete information (contact, location, etc.)');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding teacher:', error);
    if (error.code === 11000) {
      console.error('   Duplicate email - teacher may already exist');
    }
    process.exit(1);
  }
};

addTeacher();

