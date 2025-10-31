const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:5175/umar-academy-portal';

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Allow all origins in development
  credentials: true
}));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log(`📊 Connected to MongoDB`);
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

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
  email: { type: String, unique: true, sparse: true },
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

// API Routes

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all students
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find({}).populate('userId');
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all teachers
app.get('/api/teachers', async (req, res) => {
  try {
    const teachers = await Teacher.find({}).populate('userId');
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new student
app.post('/api/students', async (req, res) => {
  try {
    // Convert userId to ObjectId if it's a string
    const studentData = { ...req.body };
    if (studentData.userId && typeof studentData.userId === 'string') {
      studentData.userId = new mongoose.Types.ObjectId(studentData.userId);
    }
    
    const student = new Student(studentData);
    await student.save();
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new teacher
app.post('/api/teachers', async (req, res) => {
  try {
    // Convert userId to ObjectId if it's a string
    const teacherData = { ...req.body };
    if (teacherData.userId && typeof teacherData.userId === 'string') {
      teacherData.userId = new mongoose.Types.ObjectId(teacherData.userId);
    }
    
    const teacher = new Teacher(teacherData);
    await teacher.save();
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assignment Schema
const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['classwork', 'homework'], required: true },
  classworkType: { type: String, enum: ['sabq', 'sabqi', 'manzil'] },
  program: { type: String, required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: [{ type: String }], // Array of student IDs
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['draft', 'pending_homework', 'published', 'completed'], default: 'published' },
  // Recitation review link
  fromRecitationReviewId: { type: String }, // Link to recitation review if converted from review
  // Homework fields (for assignments created from recitation reviews)
  homeworkLink: { type: String }, // Link for homework
  homeworkComments: { type: String }, // Comments for homework
  attachments: [{
    type: { type: String, enum: ['text', 'link'] },
    content: String,
    title: String
  }],
  submissions: [{
    id: String,
    studentId: String,
    submittedAt: Date,
    content: String,
    attachments: [{
      type: { type: String, enum: ['file', 'link'] },
      content: String,
      title: String
    }],
    grade: Number,
    feedback: String,
    status: { type: String, enum: ['submitted', 'graded', 'returned'], default: 'submitted' }
  }],
  notifications: [{
    id: String,
    studentId: String,
    type: { type: String, enum: ['assignment_created', 'assignment_due', 'assignment_submitted', 'assignment_graded'] },
    message: String,
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
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
  audioLink: { type: String }, // WhatsApp audio link
  status: { type: String, enum: ['pending_review', 'approved', 'rejected', 'converted_to_assignment'], default: 'pending_review' },
  reviewedBy: { type: String }, // Admin/Super Admin ID
  reviewedAt: { type: Date },
  convertedToAssignmentId: { type: String } // Assignment ID if converted
}, { timestamps: true });

const RecitationReview = mongoose.model('RecitationReview', recitationReviewSchema);

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

// Assignment routes
app.get('/api/assignments', async (req, res) => {
  try {
    const assignments = await Assignment.find({}).populate('assignedBy', 'name email');
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/assignments', async (req, res) => {
  try {
    const assignment = new Assignment(req.body);
    await assignment.save();
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/assignments/:id', async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/assignments/:id', async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/assignments/:id/submissions', async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    const submission = {
      id: new mongoose.Types.ObjectId().toString(),
      ...req.body,
      submittedAt: new Date(),
      status: 'submitted'
    };
    
    assignment.submissions.push(submission);
    await assignment.save();
    
    res.status(201).json(submission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recitation Review Routes
app.get('/api/recitation-reviews', async (req, res) => {
  try {
    const reviews = await RecitationReview.find({}).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/recitation-reviews', async (req, res) => {
  try {
    const review = new RecitationReview(req.body);
    await review.save();
    
    // Create notification for Admin and Super Admin
    const adminNotification = new AdminNotification({
      type: 'recitation_review_pending',
      title: 'New Recitation Review Pending',
      message: `${review.teacherName} submitted a ${review.recitationType} review for ${review.studentName}`,
      recitationReviewId: review._id.toString(),
      studentId: review.studentId,
      priority: 'high'
    });
    await adminNotification.save();
    
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/recitation-reviews/:id', async (req, res) => {
  try {
    const review = await RecitationReview.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!review) {
      return res.status(404).json({ error: 'Recitation review not found' });
    }
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/recitation-reviews/:id/convert-to-assignment', async (req, res) => {
  try {
    const review = await RecitationReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Recitation review not found' });
    }
    
    // Create assignment from review
    const assignment = new Assignment({
      title: `${review.recitationType.charAt(0).toUpperCase() + review.recitationType.slice(1)} - ${review.studentName}`,
      description: review.notes,
      type: 'classwork',
      classworkType: review.recitationType,
      program: review.program,
      assignedBy: review.reviewedBy, // Admin/Super Admin who reviewed
      assignedTo: [review.studentId],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'pending_homework', // Needs homework to be added
      fromRecitationReviewId: review._id.toString()
    });
    await assignment.save();
    
    // Update review status
    review.status = 'converted_to_assignment';
    review.convertedToAssignmentId = assignment._id.toString();
    await review.save();
    
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Notification Routes
app.get('/api/admin-notifications', async (req, res) => {
  try {
    const notifications = await AdminNotification.find({})
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin-notifications/:id/read', async (req, res) => {
  try {
    const notification = await AdminNotification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin-notifications/read-all', async (req, res) => {
  try {
    await AdminNotification.updateMany({}, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 MongoDB URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials in logs
});
