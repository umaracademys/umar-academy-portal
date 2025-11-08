const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:5175/umar-academy-portal';

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
const studentSchema = new mongoose.Schema({
  studentId: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  level: String,
  paymentStatus: String,
  enrollmentDate: Date,
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
}, { timestamps: true });

const Student = mongoose.model('Student', studentSchema);

// Teacher Schema
const teacherSchema = new mongoose.Schema({
  teacherId: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fullName: String,
  email: String,
  contact: String,
  department: String,
  specialization: [String],
  location: String,
  employmentType: String,
  status: String,
  assignedStudents: [String],
  payroll: {
    monthlySalary: Number,
    currency: String,
    paymentType: String,
    bankAccount: String
  },
  schedule: {
    workingDays: [String],
    workingHours: {
      start: String,
      end: String
    },
    timezone: String
  },
  qualifications: [{
    degree: String,
    institution: String,
    year: Number,
    certifications: [String]
  }],
  experience: {
    years: Number,
    previousInstitutions: [String]
  },
  performance: {
    rating: Number,
    totalStudents: Number,
    completionRate: Number,
    attendanceRate: Number
  },
  avatar: String,
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
}, { timestamps: true });

const Teacher = mongoose.model('Teacher', teacherSchema);

// Assignment Schema
const assignmentSchema = new mongoose.Schema({
  title: String,
  description: String,
  type: String,
  classworkType: String,
  program: String,
  assignedBy: String,
  assignedTo: [String],
  dueDate: Date,
  status: String,
  fromRecitationReviewId: String,
  homeworkLink: String,
  homeworkComments: String,
  classworkSections: [{
    step: { type: String },
    title: { type: String },
    details: { type: String },
    teacherName: { type: String },
    order: { type: Number },
    assignmentRange: { type: String },
    assignmentPortion: { type: String }
  }],
  mushafMarkings: [{
    type: String,
    content: String,
    title: String
  }],
  attachments: [{
    type: String,
    content: String,
    title: String
  }],
  submissions: [{
    id: String,
    studentId: String,
    submittedAt: Date,
    content: String,
    attachments: [String],
    grade: Number,
    feedback: String
  }],
  notifications: [{
    id: String,
    studentId: String,
    type: String,
    message: String,
    read: Boolean,
    createdAt: Date
  }]
}, { timestamps: true });

const Assignment = mongoose.model('Assignment', assignmentSchema);

// Recitation Review Schema
const recitationReviewSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  teacherId: { type: String, required: true },
  teacherName: { type: String, required: true },
  recitationType: { type: String, enum: ['sabq', 'sabqi', 'manzil'], required: true },
  program: { type: String, required: true },
  notes: { type: String, required: true },
  audioLink: { type: String },
  status: { type: String, enum: ['pending_review', 'approved', 'rejected', 'converted_to_assignment'], default: 'pending_review' },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
  convertedToAssignmentId: { type: String }
}, { timestamps: true });

const RecitationReview = mongoose.model('RecitationReview', recitationReviewSchema);

// Assignment Ticket Schema
const assignmentTicketSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  workflowStep: { type: String, enum: ['sabq', 'sabqi', 'manzil', 'finalize'], required: true },
  assignedTeacherId: { type: String, required: true },
  assignedTeacherName: { type: String, required: true },
  status: { type: String, enum: ['assigned', 'in_progress', 'pending_review', 'approved', 'needs_revision', 'finalized', 'completed', 'pending'], default: 'assigned' },
  progressNotes: { type: String },
  audioLink: { type: String },
  previousTicketId: { type: String },
  nextTicketId: { type: String },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
  completedBy: { type: String },
  completedAt: { type: Date },
  revisionNotes: { type: String },
  finalReport: { type: String },
  homework: { type: String },
  homeworkLink: { type: String },
  assignmentId: { type: String },
  program: { type: String, required: true },
  assignmentRange: { type: String },
  assignmentPortion: { type: String },
  classworkSections: [{
    step: { type: String },
    title: { type: String },
    details: { type: String },
    teacherName: { type: String },
    order: { type: Number },
    assignmentRange: { type: String },
    assignmentPortion: { type: String }
  }]
}, { timestamps: true });

const AssignmentTicket = mongoose.model('AssignmentTicket', assignmentTicketSchema);

// Admin Notification Schema
const adminNotificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['recitation_review_pending', 'assignment_submitted', 'student_enrolled', 'payment_received'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  recitationReviewId: { type: String },
  assignmentId: { type: String },
  studentId: { type: String },
  read: { type: Boolean, default: false },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
}, { timestamps: true });

const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);

// Clear Database
const clearDatabase = async () => {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🗑️  Clearing all demo data...');

    // Delete all collections except keep Super Admin if exists
    const superAdminEmail = 'sadmin@umaracademy.org';
    const superAdmin = await User.findOne({ email: superAdminEmail });
    
    // Delete all users except Super Admin
    const deletedUsers = await User.deleteMany({ email: { $ne: superAdminEmail } });
    console.log(`✅ Deleted ${deletedUsers.deletedCount} users (kept Super Admin)`);

    // Delete all other collections
    const deletedStudents = await Student.deleteMany({});
    console.log(`✅ Deleted ${deletedStudents.deletedCount} students`);

    const deletedTeachers = await Teacher.deleteMany({});
    console.log(`✅ Deleted ${deletedTeachers.deletedCount} teachers`);

    const deletedAssignments = await Assignment.deleteMany({});
    console.log(`✅ Deleted ${deletedAssignments.deletedCount} assignments`);

    const deletedReviews = await RecitationReview.deleteMany({});
    console.log(`✅ Deleted ${deletedReviews.deletedCount} recitation reviews`);

    const deletedTickets = await AssignmentTicket.deleteMany({});
    console.log(`✅ Deleted ${deletedTickets.deletedCount} tickets`);

    const deletedNotifications = await AdminNotification.deleteMany({});
    console.log(`✅ Deleted ${deletedNotifications.deletedCount} notifications`);

    console.log('\n✅ Database cleared successfully!');
    console.log('\n🔑 Super Admin login preserved:');
    if (superAdmin) {
      console.log(`   Email: ${superAdmin.email}`);
      console.log(`   Password: (your existing password)`);
    } else {
      console.log('   ⚠️  Super Admin not found. You may need to create it.');
    }

    console.log('\n📝 Next steps:');
    console.log('   1. Use the portal UI to add real students, teachers, and admins');
    console.log('   2. All data will be saved to MongoDB');
    console.log('   3. Demo data has been completely removed');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
};

clearDatabase();

