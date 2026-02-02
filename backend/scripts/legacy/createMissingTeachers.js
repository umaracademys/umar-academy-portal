// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


// Create teacher profiles for all users with role 'teacher' that don't have Teacher records
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

const createMissingTeachers = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all users with role 'teacher'
    const teacherUsers = await User.find({ role: 'teacher' });
    console.log(`📊 Found ${teacherUsers.length} users with role 'teacher'\n`);

    // Get all existing teachers
    const existingTeachers = await Teacher.find({});
    const existingTeacherUserIds = new Set(
      existingTeachers.map(t => t.userId?.toString() || t.userId)
    );
    const existingTeacherEmails = new Set(
      existingTeachers.map(t => t.email?.toLowerCase()).filter(Boolean)
    );

    console.log(`📊 Found ${existingTeachers.length} existing teacher profiles\n`);

    // Find users without teacher profiles
    const missingTeachers = teacherUsers.filter(user => {
      const userId = user._id.toString();
      const email = user.email?.toLowerCase();
      return !existingTeacherUserIds.has(userId) && 
             !existingTeacherEmails.has(email);
    });

    console.log(`📝 Found ${missingTeachers.length} users without teacher profiles:\n`);
    missingTeachers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.name || 'No name'}) - ID: ${user._id}`);
    });

    if (missingTeachers.length === 0) {
      console.log('\n✅ All teachers have profiles!');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`\n📝 Creating teacher profiles for ${missingTeachers.length} users...\n`);

    let created = 0;
    let skipped = 0;

    for (const user of missingTeachers) {
      try {
        // Check again if teacher profile exists (in case of race condition)
        const existingTeacher = await Teacher.findOne({
          $or: [
            { userId: user._id },
            { email: user.email }
          ]
        });

        if (existingTeacher) {
          console.log(`⏭️  Skipping ${user.email} - teacher profile already exists`);
          skipped++;
          continue;
        }

        const fullName = user.name || user.email.split('@')[0];
        const teacher = new Teacher({
          teacherId: `TCH${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
          userId: user._id,
          fullName: fullName,
          email: user.email,
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
          hireDate: new Date().toISOString(),
          avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=10b981&color=fff`
        });

        await teacher.save();
        console.log(`✅ Created teacher profile for ${user.email} (${fullName})`);
        created++;
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⏭️  Skipping ${user.email} - duplicate email (teacher may have been created concurrently)`);
          skipped++;
        } else {
          console.error(`❌ Error creating teacher profile for ${user.email}:`, error.message);
        }
      }
    }

    console.log(`\n🎉 Completed!`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📊 Total processed: ${missingTeachers.length}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createMissingTeachers();
