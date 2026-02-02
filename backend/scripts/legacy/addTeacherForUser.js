// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


// Add teacher profile for existing user
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
    canViewStudentPersonalInfo: Boolean,
    // Tickets Module
    canAccessTickets: Boolean,
    canCreateTickets: Boolean,
    canReviewTickets: Boolean,
    canApproveTickets: Boolean,
    canFinalizeTickets: Boolean
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

const addTeacherForUser = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const email = 'shahhalim53@gmail.com';
    const userId = '69585830297f2961eed7b3d0';

    // Find user by email or userId
    let user = await User.findOne({ email });
    if (!user && userId) {
      user = await User.findById(userId);
    }

    if (!user) {
      console.error('❌ User not found!');
      console.error('   Email:', email);
      console.error('   UserId:', userId);
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   Email:', user.email);
    console.log('   Name:', user.name);
    console.log('   Role:', user.role);
    console.log('   ID:', user._id);

    // Check if teacher profile already exists
    const existingTeacher = await Teacher.findOne({ 
      $or: [
        { email: email },
        { userId: user._id }
      ]
    });

    if (existingTeacher) {
      console.log('\n✅ Teacher profile already exists!');
      console.log('   Full Name:', existingTeacher.fullName);
      console.log('   Teacher ID:', existingTeacher._id);
      process.exit(0);
    }

    // Create teacher profile for existing user
    console.log('\n📝 Creating teacher profile...');
    const fullName = user.name || email.split('@')[0];
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
        canViewStudentPersonalInfo: true,
        // Tickets Module - allow all teachers to create and access tickets
        canAccessTickets: true,
        canCreateTickets: true,
        canReviewTickets: true,
        canApproveTickets: false,
        canFinalizeTickets: false
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
    console.log('   Full Name:', teacher.fullName);
    console.log('   Teacher ID:', teacher._id);
    console.log('   User ID:', teacher.userId);

    // Update user role if not already teacher
    if (user.role !== 'teacher') {
      user.role = 'teacher';
      await user.save();
      console.log('✅ User role updated to "teacher"');
    }

    console.log('\n🎉 Teacher profile added successfully!');
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

addTeacherForUser();
