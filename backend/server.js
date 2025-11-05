const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Use axios for making HTTP requests
const axios = require('axios');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Allow all origins in development
  credentials: true
}));

// Create uploads directory if it doesn't exist (must be before route that uses it)
const uploadsDir = path.join(__dirname, 'uploads', 'mistakes');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Audio upload route - must be before json middleware to handle binary data
app.post('/api/mistakes/audio', (req, res) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    try {
      const buffer = Buffer.concat(chunks);
      
      // Generate unique filename
      const timestamp = Date.now();
      const uniqueFilename = `mistake-${timestamp}-${Math.random().toString(36).substring(7)}.webm`;
      const filePath = path.join(uploadsDir, uniqueFilename);
      
      // Save file
      fs.writeFileSync(filePath, buffer);
      
      // Return URL
      const audioUrl = `/uploads/mistakes/${uniqueFilename}`;
      console.log(`✅ Audio uploaded: ${audioUrl}`);
      res.json({ audioUrl, filename: uniqueFilename });
    } catch (error) {
      console.error('Error in audio upload endpoint:', error);
      res.status(500).json({ error: error.message });
    }
  });
  req.on('error', (error) => {
    console.error('Error reading request:', error);
    res.status(500).json({ error: error.message });
  });
});

app.use(express.json({ limit: '10mb' }));

// Serve uploaded audio files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
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
  fromTicketId: { type: String }, // Link to ticket if created from ticket workflow
  listenerName: { type: String }, // Teacher/listener name who reviewed the recitation
  listenerId: { type: String }, // Teacher/listener ID
  // Homework fields (for assignments created from recitation reviews)
  homeworkLink: { type: String }, // Link for homework
  homeworkComments: { type: String }, // Comments for homework
  // Mushaf markings (from ticket workflow)
  mushafMarkings: [{
    id: String,
    type: { type: String, enum: ['madd', 'holding', 'memory', 'ikhfa', 'tech', 'other'] },
    page: Number,
    surah: Number,
    ayah: Number,
    wordIndex: Number,
    position: {
      x: Number,
      y: Number
    },
    note: String,
    audioUrl: String, // URL to audio recording
    timestamp: Date
  }],
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

// Assignment Ticket Schema (Ticket-Based Workflow)
const assignmentTicketSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  workflowStep: { type: String, enum: ['sabq', 'sabqi', 'manzil', 'finalize'], required: true },
  assignedTeacherId: { type: String, required: true },
  assignedTeacherName: { type: String, required: true },
  status: { type: String, enum: ['assigned', 'in_progress', 'pending_review', 'approved', 'needs_revision', 'finalized', 'completed'], default: 'assigned' },
  progressNotes: { type: String },
  audioLink: { type: String },
  previousTicketId: { type: String }, // Links to previous step
  nextTicketId: { type: String }, // Links to next step
  reviewedBy: { type: String }, // Admin ID
  reviewedAt: { type: Date },
  completedBy: { type: String }, // Teacher ID
  completedAt: { type: Date },
  revisionNotes: { type: String },
  finalReport: { type: String },
  homework: { type: String },
  homeworkLink: { type: String },
  assignmentId: { type: String }, // Final assignment ID
  mushafMarkings: [{
    id: String,
    type: { type: String, enum: ['madd', 'holding', 'memory', 'ikhfa', 'tech', 'other'] },
    page: Number,
    surah: Number,
    ayah: Number,
    wordIndex: Number,
    position: {
      x: Number,
      y: Number
    },
    note: String,
    audioUrl: String, // URL to audio recording
    timestamp: Date
  }],
  program: { type: String, required: true }
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

// Assignment Ticket Routes (Ticket-Based Workflow)
// Get all tickets
app.get('/api/tickets', async (req, res) => {
  try {
    const { teacherId, status, studentId } = req.query;
    let query = {};
    if (teacherId) query.assignedTeacherId = teacherId;
    if (status) query.status = status;
    if (studentId) query.studentId = studentId;
    
    const tickets = await AssignmentTicket.find(query).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single ticket
app.get('/api/tickets/:id', async (req, res) => {
  try {
    const ticket = await AssignmentTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create ticket (Admin assigns to teacher)
app.post('/api/tickets', async (req, res) => {
  try {
    const ticket = new AssignmentTicket(req.body);
    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update ticket (Teacher updates progress or Admin reviews)
app.put('/api/tickets/:id', async (req, res) => {
  try {
    const ticket = await AssignmentTicket.findByIdAndUpdate(
      req.params.id,
      { $set: req.body, updatedAt: new Date() },
      { new: true }
    );
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Create notification if status changed to pending_review
    if (req.body.status === 'pending_review') {
      const notification = new AdminNotification({
        type: 'recitation_review_pending',
        title: 'Ticket Pending Review',
        message: `${ticket.assignedTeacherName} submitted ${ticket.workflowStep} ticket for ${ticket.studentName}`,
        studentId: ticket.studentId,
        priority: 'high'
      });
      await notification.save();
    }
    
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign ticket to next teacher (Admin creates next step in chain)
app.post('/api/tickets/:id/assign-next', async (req, res) => {
  try {
    const currentTicket = await AssignmentTicket.findById(req.params.id);
    if (!currentTicket) {
      return res.status(404).json({ error: 'Current ticket not found' });
    }
    
    if (currentTicket.status !== 'approved') {
      return res.status(400).json({ error: 'Current ticket must be approved before assigning next step' });
    }
    
    // Determine next workflow step
    const workflowFlow = { sabq: 'sabqi', sabqi: 'manzil', manzil: 'finalize' };
    const nextStep = workflowFlow[currentTicket.workflowStep];
    
    if (!nextStep) {
      return res.status(400).json({ error: 'No next step available' });
    }
    
    // Create next ticket
    const nextTicket = new AssignmentTicket({
      studentId: currentTicket.studentId,
      studentName: currentTicket.studentName,
      workflowStep: nextStep,
      assignedTeacherId: req.body.assignedTeacherId,
      assignedTeacherName: req.body.assignedTeacherName,
      status: 'assigned',
      previousTicketId: currentTicket._id.toString(),
      program: currentTicket.program
    });
    
    await nextTicket.save();
    
    // Update current ticket with next ticket reference
    currentTicket.nextTicketId = nextTicket._id.toString();
    await currentTicket.save();
    
    res.status(201).json(nextTicket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Finalize ticket (Admin adds homework and creates assignment)
app.post('/api/tickets/:id/finalize', async (req, res) => {
  try {
    const ticket = await AssignmentTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    if (ticket.workflowStep !== 'finalize') {
      return res.status(400).json({ error: 'Only finalize step tickets can be finalized' });
    }
    
    // Update ticket with final report and homework
    ticket.status = 'finalized';
    ticket.finalReport = req.body.finalReport;
    ticket.homework = req.body.homework;
    ticket.homeworkLink = req.body.homeworkLink;
    ticket.reviewedBy = req.body.reviewedBy;
    ticket.reviewedAt = new Date();
    await ticket.save();
    
    // Get ticket chain to find all listeners (teachers)
    const ticketChain = [];
    let currentTicket = ticket;
    while (currentTicket) {
      ticketChain.unshift({
        step: currentTicket.workflowStep,
        teacherName: currentTicket.assignedTeacherName,
        teacherId: currentTicket.assignedTeacherId,
        progressNotes: currentTicket.progressNotes
      });
      
      if (currentTicket.previousTicketId) {
        currentTicket = await AssignmentTicket.findById(currentTicket.previousTicketId);
      } else {
        currentTicket = null;
      }
    }
    
    // Build description with listener information
    const listenersInfo = ticketChain
      .map(t => `👂 ${t.step.charAt(0).toUpperCase() + t.step.slice(1)} Listener: ${t.teacherName}`)
      .join('\n');
    
    const fullDescription = `${ticket.finalReport || ''}\n\n${listenersInfo}`;
    
    // Get main listener (the one who did the final step or sabq)
    const mainListener = ticketChain.find(t => t.step === 'sabq') || ticketChain[ticketChain.length - 1];
    
    // Create assignment from ticket
    const assignment = new Assignment({
      title: `${ticket.workflowStep} - ${ticket.studentName}`,
      description: fullDescription,
      type: 'classwork',
      classworkType: ticket.workflowStep === 'sabq' ? 'sabq' : ticket.workflowStep === 'sabqi' ? 'sabqi' : 'manzil',
      program: ticket.program,
      assignedBy: req.body.reviewedBy,
      assignedTo: [ticket.studentId],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'published',
      homeworkComments: ticket.homework,
      homeworkLink: ticket.homeworkLink,
      fromTicketId: ticket._id.toString(),
      listenerName: mainListener?.teacherName || ticket.assignedTeacherName,
      listenerId: mainListener?.teacherId || ticket.assignedTeacherId,
      mushafMarkings: ticket.mushafMarkings || [] // Include Mushaf markings in assignment
    });
    
    await assignment.save();
    
    // Link assignment to ticket
    ticket.assignmentId = assignment._id.toString();
    ticket.status = 'completed';
    await ticket.save();
    
    res.json({ ticket, assignment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Local SQLite Database for Quran pages
const quranDbPath = path.join(__dirname, 'qpc-hafs-15-lines.db');
let quranDb = null;

try {
  quranDb = new Database(quranDbPath, { readonly: true });
  console.log('✅ Connected to local Quran database (qpc-hafs-15-lines.db)');
} catch (error) {
  console.warn('⚠️ Could not connect to local Quran database:', error.message);
  console.log('   Continuing with Quran Foundation API only...');
}

// Local SQLite Database for Quran text (Nastaleeq)
const nastaleeqDbPath = path.join(__dirname, 'qpc-nastaleeq.db');
let nastaleeqDb = null;

try {
  nastaleeqDb = new Database(nastaleeqDbPath, { readonly: true });
  console.log('✅ Connected to local Quran text database (qpc-nastaleeq.db)');
} catch (error) {
  console.warn('⚠️ Could not connect to local Quran text database:', error.message);
  console.log('   Continuing with Quran Foundation API only...');
}

// Local SQLite Database for Quran text (QPC V4)
const qpcV4DbPath = path.join(__dirname, 'qpc-v4.db');
let qpcV4Db = null;

try {
  qpcV4Db = new Database(qpcV4DbPath, { readonly: true });
  console.log('✅ Connected to local Quran text database (qpc-v4.db)');
} catch (error) {
  console.warn('⚠️ Could not connect to local Quran text database (qpc-v4.db):', error.message);
}

// Quran Foundation API Proxy (to bypass CORS)
const AUTH_BASE = 'https://prelive-oauth2.quran.foundation';
const API_BASE = 'https://apis-prelive.quran.foundation';
const CLIENT_ID = 'c5f8f10d-c985-44cd-81b5-e7a5d387be1a';
const CLIENT_SECRET = 'Q~5_lmLi15izhTb4XC98~BtKPs';

let quranAccessToken = null;
let quranTokenExpiry = 0;

// Get Quran Foundation access token
async function getQuranAccessToken(retries = 3) {
  if (quranAccessToken && Date.now() < quranTokenExpiry) {
    return quranAccessToken;
  }

  // Reset token if expired
  quranAccessToken = null;
  quranTokenExpiry = 0;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Use axios with auth option (equivalent to --user in curl)
      const response = await axios({
        method: 'post',
        url: `${AUTH_BASE}/oauth2/token`,
        auth: {
          username: CLIENT_ID,
          password: CLIENT_SECRET
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: 'grant_type=client_credentials&scope=content',
        timeout: 10000, // 10 second timeout
      });

      quranAccessToken = response.data.access_token;
      quranTokenExpiry = Date.now() + ((response.data.expires_in || 3600) * 1000);
      
      console.log(`✅ Quran API access token obtained (attempt ${attempt}), expires in:`, response.data.expires_in, 'seconds');
      return quranAccessToken;
    } catch (error) {
      console.error(`❌ Failed to get Quran API access token (attempt ${attempt}/${retries}):`, error.response?.data || error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      // If this is the last attempt, throw the error
      if (attempt === retries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Helper function to make authenticated API requests
async function makeQuranApiRequest(endpoint) {
  try {
    const token = await getQuranAccessToken();
    
    // Build full URL - handle query parameters properly
    const fullUrl = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    
    const response = await axios({
      method: 'get',
      url: fullUrl,
      headers: {
        'x-auth-token': token,
        'x-client-id': CLIENT_ID,
      },
    });

    return response.data;
  } catch (error) {
    console.error(`Error making Quran API request to ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

// Get page info from local database
function getPageInfoFromDb(pageNumber) {
  if (!quranDb) return null;
  
  try {
    const lines = quranDb.prepare(`
      SELECT DISTINCT surah_number 
      FROM pages 
      WHERE page_number = ? AND surah_number != ''
    `).all(pageNumber);
    
    const surahs = lines.map(l => parseInt(l.surah_number)).filter(s => !isNaN(s));
    const pageLines = quranDb.prepare(`
      SELECT * FROM pages 
      WHERE page_number = ? 
      ORDER BY line_number
    `).all(pageNumber);
    
    return {
      pageNumber,
      surahs: [...new Set(surahs)], // Unique surahs
      lines: pageLines.length,
      lineData: pageLines
    };
  } catch (error) {
    console.error(`Error getting page info from DB for page ${pageNumber}:`, error.message);
    return null;
  }
}

// Get surah info from local database
function getSurahInfoFromDb(surahId) {
  if (!quranDb) return null;
  
  try {
    const pages = quranDb.prepare(`
      SELECT DISTINCT page_number 
      FROM pages 
      WHERE surah_number = ?
      ORDER BY page_number
    `).all(surahId);
    
    const pageNumbers = pages.map(p => p.page_number);
    return {
      surahId,
      pages: pageNumbers,
      firstPage: pageNumbers[0] || null,
      lastPage: pageNumbers[pageNumbers.length - 1] || null
    };
  } catch (error) {
    console.error(`Error getting surah info from DB for surah ${surahId}:`, error.message);
    return null;
  }
}

// Get all surahs from local database
function getAllSurahsFromDb() {
  if (!quranDb) return [];
  
  try {
    const surahs = quranDb.prepare(`
      SELECT DISTINCT surah_number 
      FROM pages 
      WHERE surah_number != '' AND surah_number IS NOT NULL
      ORDER BY CAST(surah_number AS INTEGER)
    `).all();
    
    return surahs.map(s => parseInt(s.surah_number)).filter(s => !isNaN(s) && s > 0);
  } catch (error) {
    console.error('Error getting surahs from DB:', error.message);
    return [];
  }
}

// Get verses from Quran text database (with version selection)
function getVersesFromQuranDb(surahId, pageNumber = null, version = 'nastaleeq') {
  // Select database based on version
  const db = version === 'v4' ? qpcV4Db : nastaleeqDb;
  if (!db) return null;
  
  try {
    let query;
    let params;
    
    if (surahId) {
      // Get all verses for a surah
      query = `
        SELECT surah, ayah, GROUP_CONCAT(text, ' ') as text_uthmani
        FROM words
        WHERE surah = ?
        GROUP BY surah, ayah
        ORDER BY CAST(ayah AS INTEGER)
      `;
      params = [surahId];
    } else if (pageNumber) {
      // Get verses for a page (we need to map page to surah/ayah from the pages DB)
      // For now, return null - we'll need the pages DB to map pages to surahs
      return null;
    } else {
      return null;
    }
    
    const verses = db.prepare(query).all(...params);
    
    return verses.map((v, idx) => ({
      id: idx + 1,
      chapter_id: v.surah,
      verse_number: v.ayah,
      verse_key: `${v.surah}:${v.ayah}`,
      text_uthmani: v.text_uthmani,
      text_simple: v.text_uthmani, // Using same text for simplicity
      text: v.text_uthmani
    }));
  } catch (error) {
    console.error(`Error getting verses from Quran DB (${version}):`, error.message);
    return null;
  }
}

// Legacy function for backward compatibility
function getVersesFromNastaleeqDb(surahId, pageNumber = null) {
  return getVersesFromQuranDb(surahId, pageNumber, 'nastaleeq');
}

// Get verses for a page using both databases
function getPageVersesFromLocalDb(pageNumber, version = 'nastaleeq') {
  const textDb = version === 'v4' ? qpcV4Db : nastaleeqDb;
  if (!quranDb || !textDb) return null;
  
  try {
    // Get surahs on this page from pages DB
    const pageInfo = getPageInfoFromDb(pageNumber);
    if (!pageInfo || pageInfo.surahs.length === 0) return null;
    
    // For now, get all verses from the first surah on the page
    // In a full implementation, we'd need to map page lines to specific ayahs
    // But since page 1 typically starts from the beginning of the surah,
    // we can approximate by getting the first N verses
    const mainSurah = pageInfo.surahs[0];
    const surahVerses = getVersesFromQuranDb(mainSurah, null, version);
    
    if (!surahVerses || surahVerses.length === 0) return null;
    
    // For page 1, typically shows first 7 verses of Al-Fatihah
    // For other pages, we'd need more sophisticated mapping
    // For now, return first 10 verses as an approximation
    // TODO: Implement proper page-to-ayah mapping
    const pageVerses = surahVerses.slice(0, 15); // Approximate verses per page
    
    return pageVerses;
  } catch (error) {
    console.error(`Error getting page verses from local DB:`, error.message);
    return null;
  }
}

// Proxy endpoint to get Quran chapters (try local DB first, fallback to API)
app.get('/api/quran/chapters', async (req, res) => {
  // Try local database first
  if (quranDb) {
    try {
      const surahIds = getAllSurahsFromDb();
      if (surahIds.length > 0) {
        // Build chapters array from database
        const chapters = surahIds.map(id => {
          const surahInfo = getSurahInfoFromDb(id);
          return {
            id,
            name_simple: `Surah ${id}`, // We'll need to add names later or use API
            name_arabic: '',
            name_complex: '',
            pages: surahInfo ? [surahInfo.firstPage, surahInfo.lastPage] : [1, 1],
            verses_count: 0, // Not in this DB
            revelation_place: 'unknown',
            translated_name: {
              language_name: 'english',
              name: `Chapter ${id}`
            }
          };
        });
        
        // If we have chapters from DB, try to enrich with API data for names
        try {
          const apiData = await makeQuranApiRequest('/content/api/v4/chapters');
          if (apiData && apiData.chapters) {
            // Merge API names with DB page info
            const enrichedChapters = chapters.map(dbChapter => {
              const apiChapter = apiData.chapters.find(c => c.id === dbChapter.id);
              if (apiChapter) {
                return {
                  ...dbChapter,
                  name_simple: apiChapter.name_simple,
                  name_arabic: apiChapter.name_arabic,
                  name_complex: apiChapter.name_complex,
                  verses_count: apiChapter.verses_count,
                  revelation_place: apiChapter.revelation_place,
                  translated_name: apiChapter.translated_name
                };
              }
              return dbChapter;
            });
            console.log(`✅ Quran chapters from local DB + API (${enrichedChapters.length} chapters)`);
            return res.json({ chapters: enrichedChapters });
          }
        } catch (apiError) {
          console.log('⚠️ Could not enrich with API data, using DB only');
        }
        
        console.log(`✅ Quran chapters from local DB (${chapters.length} chapters)`);
        return res.json({ chapters });
      }
    } catch (dbError) {
      console.error('Error getting chapters from local DB:', dbError.message);
      // Fall through to API
    }
  }
  
  // Fallback to API
  try {
    // Try to get token first
    let token;
    try {
      token = await getQuranAccessToken();
    } catch (tokenError) {
      console.error('❌ Failed to get access token for chapters:', tokenError.response?.data || tokenError.message);
      return res.status(500).json({ 
        error: 'Failed to authenticate with Quran API',
        details: tokenError.response?.data?.message || tokenError.message 
      });
    }
    
    // Try multiple endpoints
    const endpoints = [
      '/content/api/v4/chapters',
      '/api/v4/chapters',
    ];
    
    let data = null;
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const fullUrl = `${API_BASE}${endpoint}`;
        const response = await axios({
          method: 'get',
          url: fullUrl,
          headers: {
            'x-auth-token': token,
            'x-client-id': CLIENT_ID,
          },
        });
        
        data = response.data;
        console.log(`✅ Quran chapters fetched from ${endpoint} (${data.chapters?.length || 0} chapters)`);
        break;
      } catch (e) {
        lastError = e;
        console.log(`⚠️ Failed to fetch from ${endpoint}:`, e.response?.data?.message || e.message);
        continue;
      }
    }
    
    if (!data) {
      console.error('❌ All endpoints failed for chapters:', lastError?.response?.data || lastError?.message);
      return res.status(500).json({ 
        error: 'Failed to fetch Quran chapters',
        details: lastError?.response?.data?.message || lastError?.message || 'All endpoints failed'
      });
    }
    
    res.json(data);
  } catch (error) {
    console.error('❌ Unexpected error fetching Quran chapters:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Internal server error while fetching Quran chapters',
      details: error.response?.data?.message || error.message 
    });
  }
});

// Proxy endpoint to get Quran page (reading/text version)
app.get('/api/quran/pages/:pageNumber', async (req, res) => {
  try {
    const pageNumber = parseInt(req.params.pageNumber);
    const format = req.query.format || 'text'; // 'text' for reading, 'mushaf' for image
    
    // Try different possible endpoints for text/reading version
    const endpoints = [
      `/content/api/v4/pages/${pageNumber}`, // Main page endpoint
      `/content/api/v4/pages/${pageNumber}/text`, // Text/reading version
      `/content/api/v4/pages/${pageNumber}/verses`, // Verses with text
      `/api/v4/pages/${pageNumber}`,
    ];
    
    for (const endpoint of endpoints) {
      try {
        const data = await makeQuranApiRequest(endpoint);
        console.log(`✅ Quran page ${pageNumber} (${format}) fetched from:`, endpoint);
        return res.json(data);
      } catch (e) {
        // Try next endpoint
        continue;
      }
    }
    
    res.status(404).json({ error: `Page ${pageNumber} not found` });
  } catch (error) {
    console.error(`Error fetching Quran page ${req.params.pageNumber}:`, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.message || error.message 
    });
  }
});

// Proxy endpoint to get verses by surah/chapter
app.get('/api/quran/surahs/:surahId/verses', async (req, res) => {
  try {
    const surahId = parseInt(req.params.surahId);
    const version = req.query.version || 'nastaleeq'; // 'nastaleeq' or 'v4'
    
    // Try local database first
    const localVerses = getVersesFromQuranDb(surahId, null, version);
    if (localVerses && localVerses.length > 0) {
      console.log(`✅ Quran verses for surah ${surahId} from local DB (${version}, ${localVerses.length} verses)`);
      return res.json({ verses: localVerses, pagination: null, version });
    }
    
    // Get verses for this surah - try with text parameters first
    const endpoints = [
      `/content/api/v4/chapters/${surahId}/verses?text_type=uthmani`,
      `/content/api/v4/chapters/${surahId}/verses?fields=text_uthmani,text_simple`,
      `/content/api/v4/chapters/${surahId}/verses`,
      `/content/api/v4/verses/by_chapter/${surahId}?text_type=uthmani`,
      `/content/api/v4/verses/by_chapter/${surahId}?fields=text_uthmani,text_simple`,
      `/content/api/v4/verses/by_chapter/${surahId}`,
    ];
    
    let versesData = null;
    for (const endpoint of endpoints) {
      try {
        versesData = await makeQuranApiRequest(endpoint);
        console.log(`✅ Quran verses for surah ${surahId} fetched from:`, endpoint);
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!versesData) {
      console.log(`⚠️ No verses data found for surah ${surahId}, returning empty array`);
      return res.json({ verses: [], pagination: null });
    }
    
    // Get verses array
    const verses = versesData.verses || versesData || [];
    
    // Try to fetch verses with text using a different endpoint
    if (verses.length > 0 && !verses[0].text_uthmani && !verses[0].text) {
      try {
        // Try fetching verses with text parameter
        const versesWithTextData = await makeQuranApiRequest(`/content/api/v4/chapters/${surahId}/verses?text_type=uthmani`);
        if (versesWithTextData && versesWithTextData.verses) {
          return res.json({ verses: versesWithTextData.verses, pagination: versesWithTextData.pagination || versesData.pagination });
        }
      } catch (e) {
        console.log('⚠️ Could not fetch verses with text parameter, using individual verse requests');
      }
      
      // Fallback: Try to get text from verse by_verse endpoint
      const versesWithText = await Promise.all(verses.map(async (verse) => {
        // If verse already has text, return it
        if (verse.text_uthmani || verse.text) {
          return verse;
        }
        
        // Try different verse endpoints with text parameters
        const verseKey = verse.verse_key || `${verse.chapter_id || surahId}:${verse.verse_number || verse.id}`;
        const endpoints = [
          `/content/api/v4/verses/by_key/${verseKey}?fields=text_uthmani,text_simple`,
          `/content/api/v4/verses/by_key/${verseKey}?text_type=uthmani`,
          `/content/api/v4/verses/by_key/${verseKey}`,
        ];
        
        for (const endpoint of endpoints) {
          try {
            const verseTextData = await makeQuranApiRequest(endpoint);
            const text = verseTextData.verse?.text_uthmani || 
                        verseTextData.text_uthmani || 
                        verseTextData.verse?.text || 
                        verseTextData.text || '';
            
            if (text) {
              return {
                ...verse,
                text_uthmani: text,
                text_simple: verseTextData.verse?.text_simple || verseTextData.text_simple || text,
                chapter_id: verseTextData.verse?.chapter_id || verse.chapter_id || surahId
              };
            }
          } catch (e) {
            continue;
          }
        }
        
        // If we couldn't get text, return verse without text
        console.warn(`⚠️ Could not fetch text for verse ${verseKey}`);
        return verse;
      }));
      
      return res.json({ verses: versesWithText, pagination: versesData.pagination });
    }
    
    // If verses already have text, return as-is
    res.json({ verses: verses, pagination: versesData.pagination });
  } catch (error) {
    console.error(`Error fetching verses for surah ${req.params.surahId}:`, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.message || error.message 
    });
  }
});

// Proxy endpoint to get page info (from local DB)
app.get('/api/quran/pages/:pageNumber/info', async (req, res) => {
  try {
    const pageNumber = parseInt(req.params.pageNumber);
    const pageInfo = getPageInfoFromDb(pageNumber);
    
    if (pageInfo) {
      return res.json(pageInfo);
    }
    
    res.status(404).json({ error: `Page ${pageNumber} not found in local database` });
  } catch (error) {
    console.error(`Error getting page info for page ${req.params.pageNumber}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get page lines with text (15-line format)
app.get('/api/quran/pages/:pageNumber/lines', async (req, res) => {
  try {
    const pageNumber = parseInt(req.params.pageNumber);
    const version = req.query.version || 'nastaleeq'; // 'nastaleeq' or 'v4'
    
    console.log(`📖 Fetching page ${pageNumber} lines (version: ${version})`);
    
    // Select database based on version
    const textDb = version === 'v4' ? qpcV4Db : nastaleeqDb;
    
    if (!quranDb) {
      console.error(`❌ Quran DB not available`);
      return res.status(500).json({ error: `Quran database (qpc-hafs-15-lines.db) not available` });
    }
    
    if (!textDb) {
      console.error(`❌ Text DB not available for version: ${version}`);
      return res.status(500).json({ error: `Text database (${version === 'v4' ? 'qpc-v4.db' : 'qpc-nastaleeq.db'}) not available` });
    }
    
    console.log(`✅ Databases loaded: quranDb=${!!quranDb}, textDb=${!!textDb}`);
    
    // Get page lines from pages DB
    // Note: Some lines appear twice, so we'll deduplicate by line_number and line_type
    const allPageLines = quranDb.prepare(`
      SELECT * FROM pages 
      WHERE page_number = ? 
      ORDER BY line_number
    `).all(pageNumber);
    
    if (allPageLines.length === 0) {
      console.error(`❌ Page ${pageNumber} not found in database`);
      return res.status(404).json({ error: `Page ${pageNumber} not found in database` });
    }
    
    console.log(`✅ Found ${allPageLines.length} lines for page ${pageNumber}`);
    
    // Deduplicate lines - keep only unique combinations of line_number and line_type
    const seenLines = new Set();
    const pageLines = allPageLines.filter(line => {
      const key = `${line.line_number}-${line.line_type}`;
      if (seenLines.has(key)) {
        return false; // Duplicate, skip it
      }
      seenLines.add(key);
      return true;
    });
    
    // Get surah for this page - try multiple methods
    let surahId = null;
    
    // Method 1: Try to find from any line with surah_number (including ayah lines)
    const surahLine = pageLines.find(l => {
      const surahNum = l.surah_number;
      return surahNum && surahNum !== '' && surahNum !== null && !isNaN(parseInt(surahNum));
    });
    if (surahLine) {
      surahId = parseInt(surahLine.surah_number);
      console.log(`✅ Found surah ${surahId} from line data (line ${surahLine.line_number})`);
    }
    
    // Method 2: Try to get from page info (pages table)
    if (!surahId) {
      const pageInfo = getPageInfoFromDb(pageNumber);
      if (pageInfo && pageInfo.surahs && pageInfo.surahs.length > 0) {
        surahId = pageInfo.surahs[0]; // Use first surah found on this page
        console.log(`⚠️ No surah in line data for page ${pageNumber}, using page info: surah ${surahId}`);
      }
    }
    
    // Method 3: Try to find from ayah lines using word IDs
    if (!surahId && pageLines.length > 0) {
      // Try to get surah from first non-empty ayah line's word IDs
      const ayahLine = pageLines.find(l => l.line_type === 'ayah' && l.first_word_id);
      if (ayahLine && ayahLine.first_word_id) {
        try {
          // Query words table to find surah from the first word ID on this page
          const firstWord = textDb.prepare(`
            SELECT surah FROM words 
            WHERE id = ?
          `).get(ayahLine.first_word_id);
          
          if (firstWord && firstWord.surah) {
            surahId = parseInt(firstWord.surah);
            console.log(`✅ Found surah ${surahId} from word ID ${ayahLine.first_word_id} on page ${pageNumber}`);
          }
        } catch (e) {
          console.log(`⚠️ Could not query word ID ${ayahLine.first_word_id}:`, e.message);
        }
      }
    }
    
    // Method 4: Use page number to estimate surah (fallback)
    if (!surahId) {
      // Page 1-2: Surah 1 (Al-Fatiha)
      // Page 2-49: Surah 2 (Al-Baqarah)
      // Page 50-77: Surah 3 (Al-Imran)
      // etc.
      if (pageNumber <= 2) {
        surahId = 1;
      } else if (pageNumber <= 49) {
        surahId = 2;
      } else if (pageNumber <= 77) {
        surahId = 3;
      } else {
        // For pages beyond 77, we need to query the pages table
        const allPages = quranDb.prepare(`
          SELECT DISTINCT page_number, surah_number 
          FROM pages 
          WHERE page_number <= ? AND surah_number IS NOT NULL AND surah_number != ''
          ORDER BY page_number DESC
          LIMIT 1
        `).get(pageNumber);
        
        if (allPages && allPages.surah_number) {
          surahId = parseInt(allPages.surah_number);
          console.log(`⚠️ Using estimated surah ${surahId} from pages table for page ${pageNumber}`);
        }
      }
    }
    
    if (!surahId) {
      console.error(`❌ Could not determine surah for page ${pageNumber}`);
      console.log(`   Page lines sample:`, pageLines.slice(0, 5).map(l => ({ 
        line_number: l.line_number, 
        line_type: l.line_type, 
        surah_number: l.surah_number,
        first_word_id: l.first_word_id,
        last_word_id: l.last_word_id
      })));
      return res.status(404).json({ error: `Could not determine surah for page ${pageNumber}` });
    }
    
    console.log(`✅ Found surah ${surahId} for page ${pageNumber}`);
    
    // Get all words for this surah from selected database
    // Note: The words table has columns: id, location, surah, ayah, word, text
    const allWords = textDb.prepare(`
      SELECT * FROM words 
      WHERE surah = ? 
      ORDER BY CAST(ayah AS INTEGER), CAST(word AS INTEGER)
    `).all(surahId);
    
    // Build lines with text
    const linesWithText = pageLines.map((line, idx) => {
      if (line.line_type === 'surah_name') {
        return {
          line_number: line.line_number,
          line_type: 'surah_name',
          is_centered: line.is_centered === 1,
          surah_number: parseInt(line.surah_number),
          text: '',
          words: []
        };
      } else if (line.line_type === 'ayah') {
        // Get words for this line based on word IDs
        // Word IDs in pages DB are 1-based sequential across the entire surah
        const firstWordId = parseInt(line.first_word_id) || 0;
        const lastWordId = parseInt(line.last_word_id) || 0;
        
        // Get words by sequential index (1-based)
        // Note: allWords is already ordered by ayah and word
        const lineWords = allWords.filter((w, idx) => {
          const wordIndex = idx + 1; // 1-based index
          return wordIndex >= firstWordId && wordIndex <= lastWordId;
        });
        
        const text = lineWords.map(w => w.text).join(' ');
        
        return {
          line_number: line.line_number,
          line_type: 'ayah',
          is_centered: line.is_centered === 1,
          surah_number: surahId,
          first_word_id: firstWordId,
          last_word_id: lastWordId,
          text: text,
          words: lineWords.map(w => ({
            id: w.id,
            text: w.text,
            surah: w.surah,
            ayah: w.ayah,
            word: w.word
          }))
        };
      } else {
        return {
          line_number: line.line_number,
          line_type: line.line_type,
          is_centered: line.is_centered === 1,
          text: '',
          words: []
        };
      }
    });
    
    res.json({
      pageNumber,
      surahId,
      version,
      lines: linesWithText
    });
  } catch (error) {
    console.error(`Error getting page lines for page ${req.params.pageNumber}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get page lines with Imlaei script (from Quran.com API)
app.get('/api/quran/pages/:pageNumber/imlaei', async (req, res) => {
  try {
    const pageNumber = parseInt(req.params.pageNumber);
    console.log(`📖 Fetching page ${pageNumber} in Imlaei script from Quran.com API`);
    
    try {
      // Fetch from Quran.com API
      const response = await axios.get(`https://api.quran.com/api/v4/quran/verses/imlaei`, {
        params: {
          page_number: pageNumber
        },
        timeout: 10000
      });
      
      if (response.data && response.data.verses) {
        const verses = response.data.verses;
        console.log(`✅ Fetched ${verses.length} verses for page ${pageNumber} in Imlaei script`);
        
        // Organize verses by lines for 15-line Mushaf layout
        const lines = [];
        let currentLine = [];
        let lineNumber = 1;
        
        verses.forEach((verse, idx) => {
          const text = verse.text_imlaei || verse.text_uthmani || verse.text || '';
          const words = text.split(/\s+/).filter(w => w.trim());
          
          words.forEach(word => {
            currentLine.push({
              text: word,
              surah: verse.chapter_id || verse.surah_number,
              ayah: verse.verse_number || verse.verse_key?.split(':')[1],
              wordIndex: currentLine.length
            });
            
            // Rough estimate: ~15 words per line for Mushaf layout
            if (currentLine.length >= 15) {
              lines.push({
                line_number: lineNumber++,
                line_type: 'ayah',
                is_centered: false,
                text: currentLine.map(w => w.text).join(' '),
                words: currentLine
              });
              currentLine = [];
            }
          });
        });
        
        // Add remaining words
        if (currentLine.length > 0) {
          lines.push({
            line_number: lineNumber,
            line_type: 'ayah',
            is_centered: false,
            text: currentLine.map(w => w.text).join(' '),
            words: currentLine
          });
        }
        
        res.json({
          pageNumber,
          surahId: verses[0]?.chapter_id || verses[0]?.surah_number || 2,
          version: 'imlaei',
          lines: lines,
          verses: verses
        });
      } else {
        return res.status(404).json({ error: `No verses found for page ${pageNumber}` });
      }
    } catch (apiError) {
      console.error(`❌ Quran.com API error:`, apiError.message);
      return res.status(500).json({ error: `Failed to fetch from Quran.com API: ${apiError.message}` });
    }
  } catch (error) {
    console.error(`❌ Error getting Imlaei page lines for page ${req.params.pageNumber}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint to get verses for a page (for clickable words)
app.get('/api/quran/pages/:pageNumber/verses', async (req, res) => {
  try {
    const pageNumber = parseInt(req.params.pageNumber);
    const version = req.query.version || 'nastaleeq'; // 'nastaleeq' or 'v4'
    
    // Try local database first
    const localVerses = getPageVersesFromLocalDb(pageNumber, version);
    if (localVerses && localVerses.length > 0) {
      console.log(`✅ Quran verses for page ${pageNumber} from local DB (${version}, ${localVerses.length} verses)`);
      return res.json({ verses: localVerses, pagination: null, version });
    }
    
    // Try to get surah info from local DB to help with API calls
    const pageInfo = getPageInfoFromDb(pageNumber);
    
    // Get verses for this page - try with text parameters first
    // Note: /verses/by_page/ seems more reliable than /pages/.../verses
    const endpoints = [
      `/content/api/v4/verses/by_page/${pageNumber}?text_type=uthmani`,
      `/content/api/v4/verses/by_page/${pageNumber}?fields=text_uthmani,text_simple`,
      `/content/api/v4/verses/by_page/${pageNumber}`,
      `/content/api/v4/pages/${pageNumber}/verses?text_type=uthmani`,
      `/content/api/v4/pages/${pageNumber}/verses?fields=text_uthmani,text_simple`,
      `/content/api/v4/pages/${pageNumber}/verses`,
    ];
    
    let versesData = null;
    for (const endpoint of endpoints) {
      try {
        versesData = await makeQuranApiRequest(endpoint);
        console.log(`✅ Quran verses for page ${pageNumber} fetched from:`, endpoint);
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!versesData) {
      // Return empty array instead of 404 - some pages might not have verses
      console.log(`⚠️ No verses data found for page ${pageNumber}, returning empty array`);
      return res.json({ verses: [], pagination: null });
    }
    
    // Get verses array
    let verses = versesData.verses || versesData || [];
    
    // If we have page info from local DB, we can use it to filter/enrich verses
    if (pageInfo && pageInfo.surahs.length > 0 && verses.length > 0) {
      // Filter verses to only those from surahs on this page
      verses = verses.filter(v => {
        const chapterId = v.chapter_id || v.chapter_number;
        return pageInfo.surahs.includes(chapterId);
      });
      console.log(`✅ Filtered verses using local DB info: ${verses.length} verses from surahs ${pageInfo.surahs.join(', ')}`);
    }
    
    // Try to fetch verses with text using a different endpoint
    // The verses endpoint might support text parameter
    if (verses.length > 0 && !verses[0].text_uthmani && !verses[0].text) {
      try {
        // Try fetching verses with text parameter
        const versesWithTextData = await makeQuranApiRequest(`/content/api/v4/pages/${pageNumber}/verses?text_type=uthmani`);
        if (versesWithTextData && versesWithTextData.verses) {
          return res.json({ verses: versesWithTextData.verses, pagination: versesWithTextData.pagination || versesData.pagination });
        }
      } catch (e) {
        console.log('⚠️ Could not fetch verses with text parameter, using individual verse requests');
      }
      
      // Fallback: Try to get text from verse by_verse endpoint
      const versesWithText = await Promise.all(verses.map(async (verse) => {
        // If verse already has text, return it
        if (verse.text_uthmani || verse.text) {
          return verse;
        }
        
        // Try different verse endpoints with text parameters
        const verseKey = verse.verse_key || `${verse.chapter_id || 1}:${verse.verse_number || verse.id}`;
        const endpoints = [
          `/content/api/v4/verses/by_key/${verseKey}?fields=text_uthmani,text_simple`,
          `/content/api/v4/verses/by_key/${verseKey}?text_type=uthmani`,
          `/content/api/v4/verses/by_key/${verseKey}`,
        ];
        
        for (const endpoint of endpoints) {
          try {
            const verseTextData = await makeQuranApiRequest(endpoint);
            const text = verseTextData.verse?.text_uthmani || 
                        verseTextData.text_uthmani || 
                        verseTextData.verse?.text || 
                        verseTextData.text || '';
            
            if (text) {
              return {
                ...verse,
                text_uthmani: text,
                text_simple: verseTextData.verse?.text_simple || verseTextData.text_simple || text,
                chapter_id: verseTextData.verse?.chapter_id || verse.chapter_id || 1
              };
            }
          } catch (e) {
            continue;
          }
        }
        
        // If we couldn't get text, return verse without text
        console.warn(`⚠️ Could not fetch text for verse ${verseKey}`);
        return verse;
      }));
      
      return res.json({ verses: versesWithText, pagination: versesData.pagination });
    }
    
    // If verses already have text, return as-is
    res.json({ verses: verses, pagination: versesData.pagination });
  } catch (error) {
    console.error(`Error fetching verses for page ${req.params.pageNumber}:`, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.message || error.message 
    });
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
