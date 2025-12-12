const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

// Use axios for making HTTP requests
const axios = require('axios');

// Try to load better-sqlite3, but make it optional (may fail on some platforms)
let Database = null;
try {
  Database = require('better-sqlite3');
} catch (error) {
  console.warn('⚠️  better-sqlite3 not available:', error.message);
  console.warn('   SQLite database features will be disabled');
}

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const isProduction = process.env.NODE_ENV === 'production';

// Conditional logging - disable non-critical logs in production
const logger = {
  log: isProduction ? () => {} : console.log,
  info: isProduction ? () => {} : console.info,
  warn: isProduction ? () => {} : console.warn,
  error: console.error, // Keep errors even in production for debugging
  debug: isProduction ? () => {} : console.debug
};

// Override console methods in production (optional - for consistency)
if (isProduction) {
  console.log = logger.log;
  console.info = logger.info;
  console.warn = logger.warn;
  console.debug = logger.debug;
  // Keep console.error for critical errors
}

// Trust proxy for accurate IP addresses (important for rate limiting and logging)
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5174',
      'http://localhost:5175',
      process.env.FRONTEND_URL
    ].filter(Boolean); // Remove undefined values
    
    // In development, allow all localhost origins
    if (process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Create uploads directories if they don't exist (must be before route that uses it)
const uploadsDir = path.join(__dirname, 'uploads', 'mistakes');
const recordingsDir = path.join(__dirname, 'uploads', 'recordings');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
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

// File upload route for pair teacher messages - must be before json middleware
app.post('/api/pair-teacher-messages/upload', (req, res) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    try {
      const buffer = Buffer.concat(chunks);
      
      // Get content type and filename from headers
      const contentType = req.headers['content-type'] || 'application/octet-stream';
      const filename = req.headers['x-filename'] || `file-${Date.now()}`;
      
      // Determine file type
      let fileType = 'document';
      if (contentType.startsWith('image/')) fileType = 'image';
      else if (contentType.startsWith('video/')) fileType = 'video';
      else if (contentType.startsWith('audio/')) fileType = 'audio';
      else if (contentType.includes('pdf')) fileType = 'document';
      else if (contentType.includes('word') || contentType.includes('document')) fileType = 'document';
      
      // Create messages directory if it doesn't exist
      const messagesDir = path.join(__dirname, 'uploads', 'messages');
      if (!fs.existsSync(messagesDir)) {
        fs.mkdirSync(messagesDir, { recursive: true });
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const extension = filename.split('.').pop() || 'bin';
      const uniqueFilename = `message-${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;
      const filePath = path.join(messagesDir, uniqueFilename);
      
      // Save file
      fs.writeFileSync(filePath, buffer);
      
      // Return URL
      const fileUrl = `/uploads/messages/${uniqueFilename}`;
      console.log(`✅ File uploaded: ${fileUrl} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
      res.json({ 
        url: fileUrl,
        filename: uniqueFilename,
        originalName: filename,
        type: fileType,
        size: buffer.length,
        mimeType: contentType
      });
    } catch (error) {
      console.error('Error in file upload endpoint:', error);
      res.status(500).json({ error: error.message });
    }
  });
  req.on('error', (error) => {
    console.error('Error reading request:', error);
    res.status(500).json({ error: error.message });
  });
});

// Recording upload route for ticket recordings - must be before json middleware
app.post('/api/recordings/upload', (req, res) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    try {
      const buffer = Buffer.concat(chunks);
      
      // Get content type from headers to determine format
      const contentType = req.headers['content-type'] || 'audio/webm';
      const extension = contentType.includes('webm') ? 'webm' : contentType.includes('mp4') ? 'mp4' : 'webm';
      
      // Generate unique filename
      const timestamp = Date.now();
      const uniqueFilename = `recording-${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;
      const filePath = path.join(recordingsDir, uniqueFilename);
      
      // Save file
      fs.writeFileSync(filePath, buffer);
      
      // Return URL
      const recordingUrl = `/uploads/recordings/${uniqueFilename}`;
      console.log(`✅ Recording uploaded: ${recordingUrl} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
      res.json({ 
        recordingUrl, 
        filename: uniqueFilename,
        size: buffer.length,
        format: extension
      });
    } catch (error) {
      console.error('Error in recording upload endpoint:', error);
      res.status(500).json({ error: error.message });
    }
  });
  req.on('error', (error) => {
    console.error('Error reading request:', error);
    res.status(500).json({ error: error.message });
  });
});

app.use(express.json({ limit: '10mb' }));

// Serve uploaded audio files - must be before 404 handler
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // Set proper headers for audio files
    if (filePath.endsWith('.webm') || filePath.endsWith('.mp4') || filePath.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/webm');
      res.setHeader('Accept-Ranges', 'bytes');
    }
  },
  fallthrough: false // Don't fall through to next middleware if file not found
}));

// Log uploads directory for debugging
console.log(`📁 Uploads directory: ${path.join(__dirname, 'uploads')}`);
console.log(`📁 Mistakes directory: ${uploadsDir}`);
console.log(`📁 Recordings directory: ${recordingsDir}`);

// Connect to MongoDB (don't exit on failure - allow graceful degradation)
mongoose.connect(MONGODB_URI)
.then(async () => {
  console.log(`📊 Connected to MongoDB`);
  
  // Auto-initialize AI Phrase categories if they don't exist
  try {
    const categoryCount = await AiPhraseCategory.countDocuments();
    if (categoryCount === 0) {
      console.log('🔧 Auto-initializing AI Phrase categories...');
      const defaultCategories = [
        { name: 'progress_report', displayName: 'Progress Report', description: 'Phrases for student progress reports', isSystem: true },
        { name: 'evaluation', displayName: 'Evaluation', description: 'Phrases for student evaluations', isSystem: true },
        { name: 'attendance', displayName: 'Attendance', description: 'Phrases for attendance notes', isSystem: true },
        { name: 'general', displayName: 'General', description: 'General purpose phrases', isSystem: true },
        { name: 'tajweed', displayName: 'Tajweed', description: 'Tajweed-related phrases', isSystem: true },
        { name: 'memory', displayName: 'Memory', description: 'Memory-related phrases', isSystem: true },
        { name: 'mistakes', displayName: 'Mistakes', description: 'Mistake-related phrases', isSystem: true }
      ];

      const created = [];
      for (const cat of defaultCategories) {
        const existing = await AiPhraseCategory.findOne({ name: cat.name });
        if (!existing) {
          const category = new AiPhraseCategory({
            ...cat,
            createdBy: 'system',
            createdByName: 'System'
          });
          await category.save();
          created.push(category);
        }
      }

      // Add default phrases to general category
      const generalCategory = await AiPhraseCategory.findOne({ name: 'general' });
      if (generalCategory) {
        const defaultPhrases = [
          'Please complete the assignment',
          'Review the material carefully',
          'Practice regularly',
          'Focus on accuracy',
          'Take your time',
          'Ask questions if needed',
          'Good progress',
          'Keep up the good work',
          'Needs more practice',
          'Excellent effort',
          'Well done',
          'Continue practicing',
          'Pay attention to details',
          'Work on pronunciation',
          'Memorize thoroughly'
        ];

        let phraseCount = 0;
        for (const phraseText of defaultPhrases) {
          const existing = await AiPhrase.findOne({ phrase: phraseText, category: 'general' });
          if (!existing) {
            const phrase = new AiPhrase({
              phrase: phraseText,
              category: 'general',
              createdBy: 'system',
              createdByName: 'System',
              isActive: true
            });
            await phrase.save();
            phraseCount++;
          }
        }

        // Update category phrase count
        if (phraseCount > 0) {
          await AiPhraseCategory.updateOne(
            { name: 'general' },
            { $inc: { phraseCount: phraseCount } }
          );
        }

        console.log(`✅ Auto-initialized: ${created.length} categories and ${phraseCount} default phrases`);
      }
    } else {
      console.log(`✅ AI Phrase Library: ${categoryCount} categories already exist`);
    }
  } catch (error) {
    console.error('⚠️  Error auto-initializing AI Phrase categories:', error.message);
    // Don't fail server startup if initialization fails
  }
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  console.error('⚠️  Server will continue to run, but database operations may fail');
  // Don't exit - allow server to start even if DB is unavailable
  // This prevents infinite restart loops on deployment platforms
});

// Import Quran schemas
const { QuranPage, QuranWord, QuranChapter } = require('./quranSchemas');

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String,
  password: String,
  avatar: String,
  loginEnabled: { type: Boolean, default: true },
  twoFactorEnabled: { type: Boolean, default: false },
  emailNotifications: { type: Boolean, default: true },
  smsNotifications: { type: Boolean, default: false },
  contact: String,
  phoneNumber: String
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Admin Schema
const adminSchema = new mongoose.Schema({
  adminId: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fullName: String,
  email: { type: String, unique: true, sparse: true },
  contact: String,
  permissions: {
    canManageTeachers: { type: Boolean, default: false },
    canManageStudents: { type: Boolean, default: false },
    canManageFinancials: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: false },
    canManagePermissions: { type: Boolean, default: false }
  },
  assignedDepartments: [String], // Array of programs: Full Time HQ, Part Time HQ, After School Reading
  hireDate: { type: Date, default: Date.now },
  status: { type: String, default: 'active' },
  avatar: String
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);

// Assessment and Evaluation schemas
const assessmentSchema = new mongoose.Schema({
  id: String,
  date: String,
  type: String,
  score: Number,
  maxScore: Number,
  notes: String,
  conductedBy: String
}, { _id: false });

const evaluationSchema = new mongoose.Schema({
  id: String,
  date: String,
  category: String,
  rating: Number,
  comments: String,
  evaluatedBy: String
}, { _id: false });

// Weekly Evaluation Schema - for comprehensive weekly student reports
const weeklyEvaluationSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  studentId: { type: String, required: true, index: true },
  studentName: { type: String, required: true },
  teacherId: { type: String, required: true, index: true },
  teacherName: { type: String, required: true },
  weekStartDate: { type: Date, required: true }, // Start of the week being evaluated
  weekEndDate: { type: Date, required: true }, // End of the week being evaluated
  
  // Tajweed evaluation
  tajweedEvaluation: {
    overallRating: { type: Number, min: 1, max: 10 },
    strengths: String, // What the student did well in tajweed
    areasForImprovement: String, // Areas that need work
    specificNotes: String // Detailed tajweed notes
  },
  
  // Memory evaluation
  memoryEvaluation: {
    overallRating: { type: Number, min: 1, max: 10 },
    memorizedPages: String, // What was memorized this week
    retentionQuality: String, // How well they retained previous memorization
    specificNotes: String // Detailed memory notes
  },
  
  // Mistakes section
  mistakes: {
    mistakesMade: [{
      type: String, // Type of mistake (madd, memory, ikhfa, etc.)
      description: String, // Description of the mistake
      location: String, // Where it occurred (surah, ayah, page)
      frequency: Number // How often it occurred
    }],
    howFixed: String, // How the teacher helped fix the mistakes
    improvement: String // Progress made in fixing mistakes
  },
  
  // General notes
  generalNotes: String,
  
  // Approval workflow
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'feedback_provided', 'resubmitted', 'approved', 'rejected'],
    default: 'draft',
    index: true
  },
  submittedAt: Date,
  reviewedBy: String, // Super Admin ID
  reviewedByName: String, // Super Admin name
  reviewedAt: Date,
  adminFeedback: String, // Feedback from super admin
  approvedAt: Date,
  
  // For tracking resubmissions
  resubmissionCount: { type: Number, default: 0 },
  previousFeedback: [{
    feedback: String,
    providedBy: String,
    providedByName: String,
    providedAt: Date
  }]
}, { timestamps: true });

const WeeklyEvaluation = mongoose.model('WeeklyEvaluation', weeklyEvaluationSchema);

// Mistake Library Schema - Common mistakes and how to fix them
const mistakeLibrarySchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  category: {
    type: String,
    enum: ['letter', 'word', 'tajweed_rule', 'memory_technique', 'general'],
    required: true,
    index: true
  },
  title: { type: String, required: true }, // e.g., "Heavy Letter (ق)", "Madd Rule"
  description: String, // Detailed description
  mistake: { type: String, required: true }, // The common mistake
  howToFix: { type: String, required: true }, // How to fix it
  examples: [{
    text: String, // Example text
    correct: String, // Correct pronunciation/usage
    incorrect: String // Incorrect pronunciation/usage
  }],
  tips: [String], // Teaching tips
  relatedMistakes: [String], // IDs of related mistakes
  tags: [String], // For searchability
  createdBy: { type: String, required: true }, // User ID
  createdByName: { type: String, required: true },
  isPublic: { type: Boolean, default: true }, // Can be shared
  usageCount: { type: Number, default: 0 }, // How many times used
  lastUsed: Date
}, { timestamps: true });

mistakeLibrarySchema.index({ category: 1, title: 1 });
mistakeLibrarySchema.index({ tags: 1 });
mistakeLibrarySchema.index({ mistake: 'text', howToFix: 'text', title: 'text' }); // Text search

const MistakeLibrary = mongoose.model('MistakeLibrary', mistakeLibrarySchema);

// AI Phrase Library Schema - Global phrase suggestions system
const aiPhraseSchema = new mongoose.Schema({
  phrase: { type: String, required: true, index: 'text' }, // Text search index
  category: { type: String, required: true, index: true }, // e.g., "progress_report", "evaluation", "attendance", "general"
  createdBy: { type: String, required: false, default: 'system' }, // User ID
  createdByName: { type: String, required: false, default: 'System' }, // User name for display
  usageCount: { type: Number, default: 0 }, // Track how often it's used
  lastUsed: Date,
  isActive: { type: Boolean, default: true } // Can be deactivated without deleting
}, { timestamps: true });

// Compound index for category + text search
aiPhraseSchema.index({ category: 1, phrase: 'text' });

const AiPhrase = mongoose.model('AiPhrase', aiPhraseSchema);

// AI Phrase Category Schema - Categories for organizing phrases
const aiPhraseCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g., "progress_report"
  displayName: { type: String, required: true }, // e.g., "Progress Report"
  description: String,
  createdBy: { type: String, required: false, default: 'system' }, // Only Super Admin can create
  createdByName: { type: String, required: false, default: 'System' },
  isSystem: { type: Boolean, default: false }, // System categories cannot be deleted
  phraseCount: { type: Number, default: 0 } // Cache count
}, { timestamps: true });

const AiPhraseCategory = mongoose.model('AiPhraseCategory', aiPhraseCategorySchema);

// Recitation profile schema helpers
const recitationUnitSchema = new mongoose.Schema({
  unitType: { type: String, enum: ['juz', 'surah', 'pages'], default: 'surah' },
  juzNumber: Number,
  surahNumber: Number,
  surahName: String,
  fromAyah: Number,
  toAyah: Number,
  fromPage: Number,
  toPage: Number,
  pageCount: Number,
  notes: String,
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const recitationHistorySchema = new mongoose.Schema({
  workflowStep: { type: String, enum: ['sabq', 'sabqi', 'manzil'], required: true },
  unitType: { type: String, enum: ['juz', 'surah', 'pages'], required: true },
  juzNumber: Number,
  surahNumber: Number,
  surahName: String,
  fromAyah: Number,
  toAyah: Number,
  fromPage: Number,
  toPage: Number,
  pageCount: Number,
  notes: String,
  ticketId: String,
  completedAt: { type: Date, default: Date.now }
}, { _id: false });

// Student Schema
const studentSchema = new mongoose.Schema({
  studentId: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  level: String,
  paymentStatus: String,
  enrollmentDate: Date,
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  assignedTeacher: String, // Teacher ID or name who is assigned to this student
  assignedTeacherId: String, // Teacher ID (for easier lookup)
  program: String, // Program type (Full Time HQ, Part Time HQ, After School Reading)
  fullName: String,
  email: String,
  contact: String,
  parentName: String,
  tuitionFee: Number,
  registrationAmount: Number,
  schedule: {
    days: [String],
    startTime: String,
    endTime: String,
    room: String
  },
  siblings: [{
    id: String,
    fullName: String,
    program: String,
    assignedTeacher: String
  }],
  status: { type: String, default: 'active' },
  avatar: String,
  assessments: { type: [assessmentSchema], default: [] },
  evaluations: { type: [evaluationSchema], default: [] },
  enrolledDate: { type: Date, default: Date.now },
  recitationProfile: {
    current: {
      sabq: { type: recitationUnitSchema, default: () => ({}) },
      sabqi: { type: recitationUnitSchema, default: () => ({}) },
      manzil: { type: recitationUnitSchema, default: () => ({}) }
    },
    history: { type: [recitationHistorySchema], default: [] }
  }
}, { timestamps: true });

const Student = mongoose.model('Student', studentSchema);

// Teacher Schema
const teacherSchema = new mongoose.Schema({
  teacherId: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fullName: String,
  email: { type: String, unique: true, sparse: true },
  contact: String,
  phoneNumber: String, // Alias for contact
  emergencyContact: String,
  department: String,
  specialization: [String],
  location: String,
  employmentType: String,
  shiftType: String, // Morning, Evening, Both
  shifts: [{
    name: String,
    startTime: String,
    endTime: String
  }],
  status: String,
  assignedStudents: [String],
  idDocument: String, // Base64 encoded document
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
    days: [String], // Alias for workingDays (for frontend compatibility)
    workingDays: [String], // Main field
    startTime: String, // Alias for workingHours.start
    endTime: String, // Alias for workingHours.end
    workingHours: {
      start: String,
      end: String
    },
    timezone: String,
    // Full Time schedule format
    fullTimeSchedule: {
      morningShift: {
        startTime: String,
        endTime: String
      },
      eveningShift: {
        startTime: String,
        endTime: String
      },
      workingDays: [String]
    },
    // Part Time schedule format (individual day schedules)
    daySchedules: [{
      day: String,
      startTime: String,
      endTime: String
    }]
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
  hireDate: Date,
  avatar: String,
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
}, { timestamps: true });

const Teacher = mongoose.model('Teacher', teacherSchema);

// Teacher Attendance Schema
const teacherAttendanceSchema = new mongoose.Schema({
  teacherId: { type: String, required: true, index: true },
  teacherName: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD format
  employmentType: { type: String, enum: ['Full Time', 'Part Time'], required: true },
  
  // Full Time shifts (morning and evening)
  morningShift: {
    status: { type: String, enum: ['present', 'absent', 'late', 'half-day'], default: 'absent' },
    checkIn: String, // HH:mm format
    checkOut: String, // HH:mm format
    notes: String
  },
  eveningShift: {
    status: { type: String, enum: ['present', 'absent', 'late', 'half-day'], default: 'absent' },
    checkIn: String, // HH:mm format
    checkOut: String, // HH:mm format
    notes: String
  },
  
  // Part Time shift
  shift: {
    name: String, // Shift name from teacher.shifts
    status: { type: String, enum: ['present', 'absent', 'late', 'half-day'], default: 'absent' },
    checkIn: String, // HH:mm format
    checkOut: String, // HH:mm format
    notes: String
  },
  
  // Paid days tracking
  paidDays: { type: Number, default: 0 },
  isPaid: { type: Boolean, default: false },
  
  // Metadata
  recordedBy: { type: String, required: true }, // Admin/SuperAdmin ID
  recordedByName: { type: String, required: true } // Admin/SuperAdmin name
}, { timestamps: true });

// Compound index for efficient queries - ensure one record per teacher per date
teacherAttendanceSchema.index({ teacherId: 1, date: 1 }, { unique: true });
teacherAttendanceSchema.index({ date: 1 });
teacherAttendanceSchema.index({ teacherId: 1, date: -1 });

const TeacherAttendance = mongoose.model('TeacherAttendance', teacherAttendanceSchema);

// Activity Log Schema - Track security events and user activities
const activityLogSchema = new mongoose.Schema({
  eventType: { 
    type: String, 
    required: true,
    enum: ['login_attempt', 'login_success', 'login_failure', 'password_reset_request', 'password_reset_success', 'password_reset_failure', 'user_created', 'user_updated', 'user_deleted', 'api_access', 'unauthorized_access', 'rate_limit_exceeded']
  },
  userId: String,
  userEmail: String,
  userRole: String,
  ipAddress: String,
  userAgent: String,
  details: mongoose.Schema.Types.Mixed, // Store additional event-specific data
  status: { 
    type: String, 
    enum: ['success', 'failure', 'pending', 'blocked'],
    default: 'success'
  },
  errorMessage: String,
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

// Index for efficient queries
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ eventType: 1, timestamp: -1 });
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ ipAddress: 1, timestamp: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

// Helper function to log activities
const logActivity = async (eventType, data) => {
  try {
    // Get IP address from request (works with trust proxy)
    const ipAddress = data.req?.ip || 
                     data.req?.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     data.req?.connection?.remoteAddress || 
                     'unknown';
    const userAgent = data.req?.get('user-agent') || 'unknown';
    
    const logEntry = new ActivityLog({
      eventType,
      userId: data.userId || null,
      userEmail: data.email || data.userEmail || null,
      userRole: data.role || data.userRole || null,
      ipAddress,
      userAgent,
      details: data.details || {},
      status: data.status || 'success',
      errorMessage: data.errorMessage || null
    });
    
    await logEntry.save();
  } catch (error) {
    console.error('❌ Failed to log activity:', error);
    // Don't throw - logging failures shouldn't break the app
  }
};

// Rate limiting for login endpoint (more lenient in development)
const isDevelopment = process.env.NODE_ENV !== 'production';
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 20 : 5, // More lenient in development (20 attempts vs 5 in production)
  message: 'Too many login attempts from this IP, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost in development
    if (isDevelopment) {
      const ip = req.ip || req.connection?.remoteAddress || '';
      return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.startsWith('127.') || ip === 'unknown';
    }
    return false;
  },
  handler: async (req, res) => {
    // Log rate limit exceeded
    await logActivity('rate_limit_exceeded', {
      req,
      status: 'blocked',
      errorMessage: 'Too many login attempts',
      details: { endpoint: '/api/auth/login' }
    });
    res.status(429).json({ error: 'Too many login attempts from this IP, please try again after 15 minutes.' });
  }
});

// Rate limiting for general API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    logActivity('unauthorized_access', {
      req,
      status: 'blocked',
      errorMessage: 'No token provided',
      details: { endpoint: req.path, method: req.method }
    });
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      await logActivity('unauthorized_access', {
        req,
        status: 'blocked',
        errorMessage: 'Invalid or expired token',
        details: { endpoint: req.path, method: req.method }
      });
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// API Routes

// Login endpoint with password verification
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Log login attempt
    await logActivity('login_attempt', {
      req,
      email,
      role,
      details: { timestamp: new Date() }
    });

    // Validate input
    if (!email || !password) {
      await logActivity('login_failure', {
        req,
        email,
        role,
        status: 'failure',
        errorMessage: 'Email and password are required'
      });
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email first (to check if email exists)
    const userByEmail = await User.findOne({ email });
    if (!userByEmail) {
      await logActivity('login_failure', {
        req,
        email,
        role,
        status: 'failure',
        errorMessage: 'Email not found'
      });
      return res.status(401).json({ error: 'Invalid email, password, or role' });
    }

    // Check if role matches
    if (userByEmail.role !== role) {
      await logActivity('login_failure', {
        req,
        email,
        role,
        actualRole: userByEmail.role,
        status: 'failure',
        errorMessage: `Role mismatch: expected ${role}, but user has role ${userByEmail.role}`
      });
      return res.status(401).json({ error: `Invalid role. This account is registered as ${userByEmail.role}, not ${role}.` });
    }

    const user = userByEmail;

    // Check if login is enabled for this user
    if (user.loginEnabled === false) {
      await logActivity('login_failure', {
        req,
        email,
        role,
        userId: user._id.toString(),
        status: 'failure',
        errorMessage: 'Login disabled for this account'
      });
      return res.status(403).json({ error: 'Login is disabled for this account. Please contact an administrator.' });
    }

    // Verify password
    let isPasswordValid = false;
    if (!user.password) {
      // If password is not set (legacy user), accept any password for backward compatibility
      // This allows existing users to login during the transition period
      console.warn(`⚠️ User ${email} has no password set. Accepting login for backward compatibility.`);
      isPasswordValid = true;
    } else {
      // Check if password is plain text (legacy) or hashed
      // If it's not a bcrypt hash (starts with $2a$, $2b$, or $2y$), treat as plain text for migration
      const isBcryptHash = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$');
      
      if (isBcryptHash) {
        // Verify password with bcrypt
        isPasswordValid = await bcrypt.compare(password, user.password);
      } else {
        // Legacy plain text password - compare directly (for migration period only)
        console.warn(`⚠️ User ${email} has plain text password. Please update to hashed password.`);
        isPasswordValid = password === user.password;
        
        // Auto-upgrade: hash the password if login is successful
        if (isPasswordValid) {
          const hashedPassword = await bcrypt.hash(password, 10);
          user.password = hashedPassword;
          await user.save();
          console.log(`✅ Auto-upgraded password for user ${email}`);
        }
      }
    }

    if (!isPasswordValid) {
      await logActivity('login_failure', {
        req,
        email,
        role,
        userId: user._id.toString(),
        status: 'failure',
        errorMessage: 'Invalid password'
      });
      return res.status(401).json({ error: 'Invalid email, password, or role' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' } // Token expires in 7 days
    );

    // Log successful login
    await logActivity('login_success', {
      req,
      email: user.email,
      role: user.role,
      userId: user._id.toString(),
      status: 'success',
      details: { timestamp: new Date() }
    });

    // Return user data (without password) and token
    // Include isDeveloper and isTestAccount flags for frontend data masking
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name || user.fullName || 'Unknown',
        email: user.email,
        role: user.role,
        avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.fullName || 'User')}&background=random&color=fff`,
        isDeveloper: user.isDeveloper || false,
        isTestAccount: user.isTestAccount || false,
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    await logActivity('login_failure', {
      req,
      status: 'failure',
      errorMessage: error.message
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get activity logs (protected route - Super Admin only)
app.get('/api/activity-logs', apiLimiter, authenticateToken, async (req, res) => {
  try {
    // Check if user is super admin
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied. Super Admin only.' });
    }

    const { 
      eventType, 
      userId, 
      email, 
      ipAddress, 
      startDate, 
      endDate, 
      limit = 100,
      page = 1 
    } = req.query;

    // Build query
    const query = {};
    if (eventType) query.eventType = eventType;
    if (userId) query.userId = userId;
    if (email) query.userEmail = { $regex: email, $options: 'i' };
    if (ipAddress) query.ipAddress = ipAddress;
    
    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await ActivityLog.countDocuments(query);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Failed to fetch activity logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Password reset request endpoint
app.post('/api/auth/password-reset-request', loginLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    // Log password reset request
    await logActivity('password_reset_request', {
      req,
      email,
      status: 'pending',
      details: { timestamp: new Date() }
    });

    // Find user by email
    const user = await User.findOne({ email });
    
    // Always return success message (security best practice - don't reveal if email exists)
    // In production, you would send an email with reset token here
    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.',
      success: true 
    });
  } catch (error) {
    console.error('❌ Password reset request error:', error);
    await logActivity('password_reset_failure', {
      req,
      status: 'failure',
      errorMessage: error.message
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password reset endpoint (with token verification)
app.post('/api/auth/password-reset', loginLimiter, async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    // Validate input
    if (!email || !token || !newPassword) {
      await logActivity('password_reset_failure', {
        req,
        email,
        status: 'failure',
        errorMessage: 'Missing required fields'
      });
      return res.status(400).json({ error: 'Email, token, and new password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      await logActivity('password_reset_failure', {
        req,
        email,
        status: 'failure',
        errorMessage: 'User not found'
      });
      return res.status(404).json({ error: 'User not found' });
    }

    // In production, verify token here (would be stored in database with expiry)
    // For now, we'll just hash and update the password
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Log successful password reset
    await logActivity('password_reset_success', {
      req,
      email: user.email,
      userId: user._id.toString(),
      role: user.role,
      status: 'success',
      details: { timestamp: new Date() }
    });

    res.json({ message: 'Password reset successfully', success: true });
  } catch (error) {
    console.error('❌ Password reset error:', error);
    await logActivity('password_reset_failure', {
      req,
      status: 'failure',
      errorMessage: error.message
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get activity statistics
app.get('/api/activity-logs/stats', apiLimiter, authenticateToken, async (req, res) => {
  try {
    // Check if user is super admin
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied. Super Admin only.' });
    }

    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await ActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          successes: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          failures: {
            $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const totalEvents = await ActivityLog.countDocuments({
      timestamp: { $gte: startDate }
    });

    const recentLogins = await ActivityLog.countDocuments({
      eventType: 'login_success',
      timestamp: { $gte: startDate }
    });

    const failedLogins = await ActivityLog.countDocuments({
      eventType: 'login_failure',
      timestamp: { $gte: startDate }
    });

    const blockedAttempts = await ActivityLog.countDocuments({
      eventType: 'rate_limit_exceeded',
      timestamp: { $gte: startDate }
    });

    res.json({
      period: `${days} days`,
      totalEvents,
      recentLogins,
      failedLogins,
      blockedAttempts,
      byEventType: stats
    });
  } catch (error) {
    console.error('❌ Failed to fetch activity stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all users (optional auth - for backward compatibility, but passwords are always excluded)
app.get('/api/users', apiLimiter, async (req, res) => {
  try {
    const users = await User.find({}).select('-password'); // Always exclude passwords
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single user by ID (no password)
app.get('/api/users/:id', apiLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get all students
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find({})
      .populate('userId')
      .sort({ program: 1, fullName: 1 }); // Sort by program first, then A-Z by name
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync teacher assignedStudents arrays with actual student assignments
const syncTeacherAssignedStudents = async () => {
  try {
    console.log('🔄 Starting syncTeacherAssignedStudents...');
    const allStudents = await Student.find({}).lean();
    const allTeachers = await Teacher.find({}).lean();
    
    console.log(`📊 Found ${allStudents.length} students and ${allTeachers.length} teachers`);
    
    // Build a map of teacher IDs to teacher objects for quick lookup
    const teacherMap = new Map();
    allTeachers.forEach(teacher => {
      const teacherId = teacher._id.toString();
      teacherMap.set(teacherId, teacher);
      // Also index by other identifiers
      if (teacher.teacherId) teacherMap.set(teacher.teacherId, teacher);
      if (teacher.email) teacherMap.set(teacher.email, teacher);
      // CRITICAL: Index by userId - students might have teacher's userId instead of teacher _id
      if (teacher.userId) {
        const userIdStr = teacher.userId.toString();
        teacherMap.set(userIdStr, teacher);
        console.log(`📌 Indexed teacher ${teacher.fullName}: userId=${userIdStr}, _id=${teacherId}`);
      }
    });
    
    // First, reset all teachers' assignedStudents arrays
    console.log('🔄 Resetting all teachers\' assignedStudents arrays...');
    await Teacher.updateMany({}, { $set: { assignedStudents: [] } });
    
    // Build assignedStudents arrays from student assignments using $addToSet
    let matchedCount = 0;
    let notFoundCount = 0;
    
    for (const student of allStudents) {
      const studentId = student._id.toString();
      let assignedTeacherId = (student.assignedTeacherId || student.assignedTeacher || '').toString().trim();
      
      console.log(`🔍 Processing student ${student.fullName || studentId}: assignedTeacherId="${assignedTeacherId}"`);
      
      if (!assignedTeacherId) {
        console.log(`⚠️ Student ${student.fullName || studentId} has no assignedTeacherId or assignedTeacher`);
        continue;
      }
      
      // Find teacher in map by direct ID match (includes _id, userId, teacherId, email)
      let teacher = teacherMap.get(assignedTeacherId);
      if (teacher) {
        console.log(`✅ Found teacher ${teacher.fullName} in map by direct match: ${assignedTeacherId}`);
      }
      
      // If not found in map, try finding by userId in the array (most common case)
      // Students often have the User's ID stored, not the Teacher document's _id
      if (!teacher && mongoose.Types.ObjectId.isValid(assignedTeacherId)) {
        const teacherByUserId = allTeachers.find(t => {
          if (t.userId) {
            const userIdStr = t.userId.toString();
            return userIdStr === assignedTeacherId;
          }
          return false;
        });
        if (teacherByUserId) {
          teacher = teacherByUserId;
          console.log(`✅ Found teacher ${teacher.fullName} by userId match: ${assignedTeacherId} matches userId ${teacher.userId.toString()}`);
        }
      }
      
      // If not found, try ObjectId lookup (exact match by teacher _id)
      if (!teacher && mongoose.Types.ObjectId.isValid(assignedTeacherId)) {
        const teacherDoc = allTeachers.find(t => {
          const tid = t._id.toString();
          return tid === assignedTeacherId;
        });
        if (teacherDoc) {
          teacher = teacherDoc;
          console.log(`✅ Found teacher ${teacher.fullName} by teacher _id match: ${assignedTeacherId}`);
        }
      }
      
      // If still not found, try querying the database
      if (!teacher) {
        const queries = [];
        
        // Try ObjectId if valid
        if (mongoose.Types.ObjectId.isValid(assignedTeacherId)) {
          queries.push({ _id: assignedTeacherId });
          queries.push({ userId: assignedTeacherId }); // Important: also search by userId
          // Also try converting to ObjectId (in case of string mismatch)
          try {
            const objId = new mongoose.Types.ObjectId(assignedTeacherId);
            queries.push({ _id: objId });
            queries.push({ userId: objId });
          } catch (e) {
            // Ignore conversion errors
          }
        }
        
        // Try other fields
        queries.push(
          { teacherId: assignedTeacherId },
          { email: assignedTeacherId },
          { fullName: assignedTeacherId }
        );
        
        // Remove null/undefined queries
        const validQueries = queries.filter(query => {
          return Object.values(query).some(v => v !== null && v !== undefined);
        });
        
        if (validQueries.length > 0) {
          console.log(`🔍 Trying database query with ${validQueries.length} conditions for assignedTeacherId: ${assignedTeacherId}`);
          const teacherDoc = await Teacher.findOne({ $or: validQueries }).lean();
          if (teacherDoc) {
            teacher = teacherDoc;
            console.log(`✅ Found teacher ${teacher.fullName} by database query`);
          } else {
            console.log(`❌ No teacher found in database for assignedTeacherId: ${assignedTeacherId}`);
          }
        }
      }
      
      if (teacher) {
        const teacherMongoId = teacher._id;
        const teacherIdStr = teacherMongoId.toString();
        
        // Ensure assignedTeacherId is set on student (normalize to teacher's _id)
        if (!student.assignedTeacherId || student.assignedTeacherId !== teacherIdStr) {
          await Student.updateOne(
            { _id: student._id },
            { 
              $set: { 
                assignedTeacherId: teacherIdStr,
                assignedTeacher: teacherIdStr
              }
            }
          );
          console.log(`✅ Set assignedTeacherId on student ${student.fullName || studentId} to ${teacherIdStr}`);
        }
        
        // Use $addToSet to atomically add student to teacher's assignedStudents array
        const updateResult = await Teacher.findByIdAndUpdate(
          teacherMongoId,
          { $addToSet: { assignedStudents: studentId } },
          { new: true }
        );
        
        if (updateResult) {
          matchedCount++;
          console.log(`✅ Added student ${student.fullName || studentId} (${studentId}) to teacher ${teacher.fullName}'s assignedStudents using $addToSet`);
        } else {
          console.error(`❌ Failed to add student ${studentId} to teacher ${teacher.fullName}'s assignedStudents`);
        }
      } else {
        notFoundCount++;
        console.log(`⚠️ Teacher not found for assignedTeacherId: ${assignedTeacherId}`);
      }
    }
    
    console.log(`✅ Synced all teachers' assignedStudents arrays: ${matchedCount} students matched, ${notFoundCount} teachers not found`);
    
    // Verify the sync by checking final counts
    const finalTeachers = await Teacher.find({}).lean();
    console.log('📊 Final teacher assignedStudents counts:');
    finalTeachers.forEach(teacher => {
      const count = Array.isArray(teacher.assignedStudents) ? teacher.assignedStudents.length : 0;
      console.log(`  - ${teacher.fullName} (${teacher._id}): ${count} students`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error syncing teacher assignedStudents:', error);
    console.error('Stack trace:', error.stack);
    return false;
  }
};

// Get all teachers
app.get('/api/teachers', async (req, res) => {
  try {
    // Sync assignedStudents arrays before returning teachers
    const syncOnLoad = req.query.sync === 'true';
    if (syncOnLoad) {
      console.log('🔄 GET /api/teachers called with sync=true, running sync...');
      const syncResult = await syncTeacherAssignedStudents();
      console.log(`🔄 Sync result: ${syncResult ? 'Success' : 'Failed'}`);
      
      // After sync, fetch fresh teacher records to ensure we have the latest data
      // There might be a caching issue, so we'll fetch again after sync
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure DB write completes
    }
    
    const teachers = await Teacher.find({}).populate('userId').lean();
    
    // Convert to plain objects and ensure assignedStudents is always an array
    // IMPORTANT: Keep _id as ObjectId or string - don't lose it
    const teachersWithArrays = teachers.map(teacher => ({
      ...teacher,
      assignedStudents: Array.isArray(teacher.assignedStudents) ? teacher.assignedStudents : [],
      _id: teacher._id?.toString() || teacher._id, // Ensure _id is always included as string
      id: teacher._id?.toString() || teacher._id // Also include as 'id' for compatibility
    }));
    
    // Log assignedStudents arrays for debugging
    if (syncOnLoad) {
      console.log('📊 Teachers after sync:');
      teachersWithArrays.forEach(teacher => {
        console.log(`  - ${teacher.fullName} (${teacher._id}): assignedStudents=[${teacher.assignedStudents.join(', ')}] (${teacher.assignedStudents.length} students)`);
      });
    }
    
    res.json(teachersWithArrays);
  } catch (error) {
    console.error('❌ Error in GET /api/teachers:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Helper function for manual sync (used by both GET and POST)
const handleManualSync = async (req, res) => {
  try {
    console.log('🔄 Manual sync triggered via ' + req.method + ' /api/teachers/sync-assigned-students');
    const success = await syncTeacherAssignedStudents();
    if (success) {
      // Fetch updated teachers to verify
      const teachers = await Teacher.find({}).lean();
      const summary = teachers.map(t => ({
        name: t.fullName,
        id: t._id.toString(),
        assignedStudentsCount: Array.isArray(t.assignedStudents) ? t.assignedStudents.length : 0,
        assignedStudents: t.assignedStudents || []
      }));
      res.json({ 
        message: 'Successfully synced all teachers\' assignedStudents arrays',
        summary: summary
      });
    } else {
      res.status(500).json({ error: 'Failed to sync assignedStudents arrays' });
    }
  } catch (error) {
    console.error('❌ Error in manual sync endpoint:', error);
    res.status(500).json({ error: error.message });
  }
};

// Sync teacher assignedStudents arrays endpoint (manual trigger - supports both GET and POST)
app.get('/api/teachers/sync-assigned-students', handleManualSync);
app.post('/api/teachers/sync-assigned-students', handleManualSync);

// Simple endpoint to get teacher count
app.get('/api/teachers/count', async (req, res) => {
  try {
    const count = await Teacher.countDocuments({});
    const teachers = await Teacher.find({}).select('_id fullName email userId').lean();
    
    res.json({
      count,
      teachers: teachers.map(t => ({
        _id: t._id?.toString(),
        fullName: t.fullName,
        email: t.email,
        userId: t.userId?.toString()
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET endpoint to check current state (for debugging)
app.get('/api/teachers/sync-status', async (req, res) => {
  try {
    const students = await Student.find({}).lean();
    const teachers = await Teacher.find({}).lean();
    
    const studentAssignments = students.map(s => ({
      studentName: s.fullName,
      studentId: s._id.toString(),
      assignedTeacherId: s.assignedTeacherId || s.assignedTeacher || 'none'
    }));
    
    const teacherArrays = teachers.map(t => ({
      teacherName: t.fullName,
      teacherId: t._id.toString(),
      assignedStudentsCount: Array.isArray(t.assignedStudents) ? t.assignedStudents.length : 0,
      assignedStudents: t.assignedStudents || []
    }));
    
    res.json({
      students: studentAssignments,
      teachers: teacherArrays,
      summary: {
        totalStudents: students.length,
        totalTeachers: teachers.length,
        studentsWithTeachers: students.filter(s => s.assignedTeacherId || s.assignedTeacher).length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new user (protected route - requires authentication)
app.post('/api/users', apiLimiter, authenticateToken, async (req, res) => {
  try {
    const { name, email, role, password, avatar } = req.body;

    // Validate input
    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const user = new User({
      name,
      email,
      role,
      password: hashedPassword,
      avatar
    });
    
    await user.save();
    
    // Log user creation
    await logActivity('user_created', {
      req,
      userId: req.user?.userId || null,
      email: user.email,
      role: user.role,
      status: 'success',
      details: { createdBy: req.user?.email || 'system', newUserEmail: email }
    });
    
    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    res.json(userResponse);
  } catch (error) {
    if (error?.code === 11000) {
      await logActivity('user_created', {
        req,
        userId: req.user?.userId || null,
        status: 'failure',
        errorMessage: 'User already exists',
        details: { email: req.body.email }
      });
      return res.status(409).json({ error: 'A user with that email already exists.' });
    }
    console.error('❌ Failed to create user:', error);
    await logActivity('user_created', {
      req,
      userId: req.user?.userId || null,
      status: 'failure',
      errorMessage: error.message
    });
    res.status(500).json({ error: error.message || 'Failed to create user' });
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

    if (!studentData.recitationProfile) {
      studentData.recitationProfile = {
        current: {
          sabq: {},
          sabqi: {},
          manzil: {}
        },
        history: []
      };
    } else {
      // Ensure current steps exist even if partial payload was provided
      studentData.recitationProfile.current = {
        sabq: studentData.recitationProfile.current?.sabq || {},
        sabqi: studentData.recitationProfile.current?.sabqi || {},
        manzil: studentData.recitationProfile.current?.manzil || {}
      };
      studentData.recitationProfile.history = Array.isArray(studentData.recitationProfile.history)
        ? studentData.recitationProfile.history
        : [];
    }
    
    const student = new Student(studentData);
    await student.save();
    
    // If student is assigned to a teacher, add student ID to teacher's assignedStudents array
    if (studentData.assignedTeacher || studentData.assignedTeacherId) {
      const teacherId = studentData.assignedTeacherId || studentData.assignedTeacher;
      if (teacherId) {
        let teacher = null;
        
        // Try to find teacher by ObjectId first (if it's a valid ObjectId)
        if (mongoose.Types.ObjectId.isValid(teacherId)) {
          teacher = await Teacher.findById(teacherId);
        }
        
        // If not found, try other fields
        if (!teacher) {
          teacher = await Teacher.findOne({
            $or: [
              { teacherId: teacherId },
              { email: teacherId },
              { fullName: teacherId }
            ]
          });
        }
        
        if (teacher) {
          const studentId = student._id.toString();
          const teacherMongoId = teacher._id;
          
          // Also set assignedTeacherId on student if not already set
          if (!student.assignedTeacherId) {
            student.assignedTeacherId = teacher._id.toString();
            await student.save();
          }
          
          // Use $addToSet to atomically add student to teacher's assignedStudents array
          const updateResult = await Teacher.findByIdAndUpdate(
            teacherMongoId,
            { $addToSet: { assignedStudents: studentId } },
            { new: true }
          );
          
          if (updateResult) {
            console.log(`✅ Added student ${studentId} to teacher ${teacher.fullName}'s assignedStudents array using $addToSet`);
          } else {
            console.error(`❌ Failed to add student ${studentId} to teacher ${teacher.fullName}'s assignedStudents array`);
          }
        } else {
          console.log(`⚠️ Teacher not found for ID: ${teacherId}`);
        }
      }
    }
    
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update student profile (full update)
app.put('/api/students/:id', async (req, res) => {
  try {
    const studentData = { ...req.body };
    if (studentData.userId && typeof studentData.userId === 'string') {
      studentData.userId = new mongoose.Types.ObjectId(studentData.userId);
    }

    // Get the old student data to check for teacher assignment changes
    const oldStudent = await Student.findById(req.params.id);
    const oldTeacherId = (oldStudent && (oldStudent.assignedTeacherId || oldStudent.assignedTeacher)) || null;
    const newTeacherId = studentData.assignedTeacherId || studentData.assignedTeacher;

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      studentData,
      { new: true, runValidators: true }
    );

    if (!updatedStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // If teacher assignment changed, update teacher's assignedStudents array
    const studentId = updatedStudent._id.toString();
    
    // Remove from old teacher's assignedStudents array using $pull
    if (oldTeacherId && oldTeacherId !== newTeacherId) {
      let oldTeacher = null;
      if (mongoose.Types.ObjectId.isValid(oldTeacherId)) {
        oldTeacher = await Teacher.findById(oldTeacherId);
      }
      if (!oldTeacher) {
        oldTeacher = await Teacher.findOne({
          $or: [
            { teacherId: oldTeacherId },
            { email: oldTeacherId },
            { fullName: oldTeacherId }
          ]
        });
      }
      
      if (oldTeacher) {
        const updateResult = await Teacher.findByIdAndUpdate(
          oldTeacher._id,
          { $pull: { assignedStudents: studentId } },
          { new: true }
        );
        if (updateResult) {
          console.log(`✅ Removed student ${studentId} from teacher ${oldTeacher.fullName}'s assignedStudents array using $pull`);
        } else {
          console.error(`❌ Failed to remove student ${studentId} from teacher ${oldTeacher.fullName}'s assignedStudents array`);
        }
      }
    }
    
    // Add to new teacher's assignedStudents array using $addToSet
    if (newTeacherId) {
      let newTeacher = null;
      if (mongoose.Types.ObjectId.isValid(newTeacherId)) {
        newTeacher = await Teacher.findById(newTeacherId);
      }
      if (!newTeacher) {
        newTeacher = await Teacher.findOne({
          $or: [
            { teacherId: newTeacherId },
            { email: newTeacherId },
            { fullName: newTeacherId }
          ]
        });
      }
      
      if (newTeacher) {
        // Set assignedTeacherId on student if not already set
        if (!updatedStudent.assignedTeacherId) {
          updatedStudent.assignedTeacherId = newTeacher._id.toString();
          await updatedStudent.save();
        }
        
        // Use $addToSet to atomically add student to teacher's assignedStudents array
        const updateResult = await Teacher.findByIdAndUpdate(
          newTeacher._id,
          { $addToSet: { assignedStudents: studentId } },
          { new: true }
        );
        
        if (updateResult) {
          console.log(`✅ Added student ${studentId} to teacher ${newTeacher.fullName}'s assignedStudents array using $addToSet`);
        } else {
          console.error(`❌ Failed to add student ${studentId} to teacher ${newTeacher.fullName}'s assignedStudents array`);
        }
      } else {
        console.log(`⚠️ Teacher not found for ID: ${newTeacherId}`);
      }
    }

    // Also update the User record if student has a userId
    if (updatedStudent && updatedStudent.userId) {
      try {
        const userUpdateData = {};
        
        // Update name/fullName in User collection
        if (updatedStudent.fullName) {
          userUpdateData.name = updatedStudent.fullName;
        }
        
        // Update email in User collection
        if (updatedStudent.email) {
          userUpdateData.email = updatedStudent.email;
        }
        
        // Update contact/phoneNumber in User collection
        if (updatedStudent.contact) {
          userUpdateData.contact = updatedStudent.contact;
          userUpdateData.phoneNumber = updatedStudent.contact;
        }
        
        // Update avatar if provided
        if (updatedStudent.avatar) {
          userUpdateData.avatar = updatedStudent.avatar;
        }
        
        // Only update if there's data to update
        if (Object.keys(userUpdateData).length > 0) {
          await User.findByIdAndUpdate(
            updatedStudent.userId,
            userUpdateData,
            { new: true }
          );
          console.log(`✅ Updated User record for student: ${updatedStudent.userId.toString()}`);
        }
      } catch (userUpdateError) {
        console.error('⚠️ Failed to update User record (non-fatal):', userUpdateError);
        // Don't fail the entire request if User update fails
      }
    }

    res.json(updatedStudent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update recitation profile for a student
app.patch('/api/students/:id/recitation', async (req, res) => {
  try {
    const { current, historyEntry } = req.body || {};
    const updateOps = {};
    const setOps = {};

    if (current && typeof current === 'object') {
      ['sabq', 'sabqi', 'manzil'].forEach((step) => {
        if (current[step] !== undefined) {
          setOps[`recitationProfile.current.${step}`] = {
            ...(current[step] || {}),
            updatedAt: current[step]?.updatedAt || new Date()
          };
        }
      });
    }

    if (Object.keys(setOps).length > 0) {
      updateOps.$set = setOps;
    }

    if (historyEntry) {
      const entries = Array.isArray(historyEntry) ? historyEntry : [historyEntry];
      const sanitizedEntries = entries
        .filter(Boolean)
        .map((entry) => ({
          ...entry,
          completedAt: entry?.completedAt ? new Date(entry.completedAt) : new Date()
        }));

      if (sanitizedEntries.length > 0) {
        updateOps.$push = {
          'recitationProfile.history': { $each: sanitizedEntries }
        };
      }
    }

    if (Object.keys(updateOps).length === 0) {
      return res.status(400).json({ error: 'No recitation updates provided' });
    }

    let updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      updateOps,
      { new: true, runValidators: true }
    );

    if (!updatedStudent && mongoose.Types.ObjectId.isValid(req.params.id)) {
      updatedStudent = await Student.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(req.params.id) },
        updateOps,
        { new: true, runValidators: true }
      );
    }

    if (!updatedStudent) {
      updatedStudent = await Student.findOneAndUpdate(
        { studentId: req.params.id },
        updateOps,
        { new: true, runValidators: true }
      );
    }

    if (!updatedStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(updatedStudent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to normalize teacher data
const normalizeTeacherData = (teacherData) => {
  const normalized = { ...teacherData };
  
  // Handle contact/phoneNumber mapping
  if (normalized.phoneNumber && !normalized.contact) {
    normalized.contact = normalized.phoneNumber;
  }
  if (normalized.contact && !normalized.phoneNumber) {
    normalized.phoneNumber = normalized.contact;
  }
  
  // Map schedule format (frontend sends days/startTime/endTime, backend expects workingDays/workingHours)
  if (normalized.schedule) {
    // Ensure workingDays is set
    if (normalized.schedule.days && !normalized.schedule.workingDays) {
      normalized.schedule.workingDays = normalized.schedule.days;
    }
    if (normalized.schedule.workingDays && !normalized.schedule.days) {
      normalized.schedule.days = normalized.schedule.workingDays;
    }
    
    // Map workingHours from startTime/endTime if needed
    if (normalized.schedule.startTime || normalized.schedule.endTime) {
      if (!normalized.schedule.workingHours) {
        normalized.schedule.workingHours = {};
      }
      if (normalized.schedule.startTime && !normalized.schedule.workingHours.start) {
        normalized.schedule.workingHours.start = normalized.schedule.startTime;
      }
      if (normalized.schedule.endTime && !normalized.schedule.workingHours.end) {
        normalized.schedule.workingHours.end = normalized.schedule.endTime;
      }
    }
    
    // Preserve fullTimeSchedule if provided (for Full Time teachers)
    if (normalized.schedule.fullTimeSchedule) {
      // Ensure fullTimeSchedule structure is complete
      if (!normalized.schedule.fullTimeSchedule.morningShift) {
        normalized.schedule.fullTimeSchedule.morningShift = {
          startTime: '08:00',
          endTime: '12:00'
        };
      }
      if (!normalized.schedule.fullTimeSchedule.eveningShift) {
        normalized.schedule.fullTimeSchedule.eveningShift = {
          startTime: '13:00',
          endTime: '17:00'
        };
      }
      if (!normalized.schedule.fullTimeSchedule.workingDays) {
        normalized.schedule.fullTimeSchedule.workingDays = normalized.schedule.workingDays || [];
      }
    }
    
    // Preserve daySchedules if provided (for Part Time teachers)
    if (normalized.schedule.daySchedules && Array.isArray(normalized.schedule.daySchedules)) {
      // Ensure each daySchedule has required fields
      normalized.schedule.daySchedules = normalized.schedule.daySchedules.map((ds) => ({
        day: ds.day,
        startTime: ds.startTime || '08:00',
        endTime: ds.endTime || '12:00'
      }));
    }
    
    // Set timezone if not provided
    if (!normalized.schedule.timezone) {
      normalized.schedule.timezone = 'UTC';
    }
  }
  
  // Ensure payroll data is complete
  if (normalized.payroll) {
    // Ensure all payroll fields are present
    normalized.payroll = {
      hourlyRate: normalized.payroll.hourlyRate !== undefined ? normalized.payroll.hourlyRate : 0,
      dailyHours: normalized.payroll.dailyHours !== undefined ? normalized.payroll.dailyHours : 0,
      daysWorking: normalized.payroll.daysWorking !== undefined ? normalized.payroll.daysWorking : 0,
      monthlyHours: normalized.payroll.monthlyHours !== undefined 
        ? normalized.payroll.monthlyHours 
        : (normalized.payroll.dailyHours || 0) * (normalized.payroll.daysWorking || 0),
      monthlySalary: normalized.payroll.monthlySalary !== undefined 
        ? normalized.payroll.monthlySalary 
        : (normalized.payroll.hourlyRate || 0) * (normalized.payroll.dailyHours || 0) * (normalized.payroll.daysWorking || 0),
      currency: normalized.payroll.currency || 'USD',
      paymentType: normalized.payroll.paymentType || 'monthly',
      bankAccount: normalized.payroll.bankAccount || undefined,
    };
  }
  
  // Ensure permissions are preserved and have all fields
  if (normalized.permissions) {
    normalized.permissions = {
      canViewAssessments: normalized.permissions.canViewAssessments ?? true,
      canEditAssessments: normalized.permissions.canEditAssessments ?? true,
      canViewEvaluations: normalized.permissions.canViewEvaluations ?? true,
      canEditEvaluations: normalized.permissions.canEditEvaluations ?? true,
      canViewFinancials: normalized.permissions.canViewFinancials ?? false,
      canManageSchedule: normalized.permissions.canManageSchedule ?? true,
      canContactParents: normalized.permissions.canContactParents ?? true,
      canViewStudentEmail: normalized.permissions.canViewStudentEmail ?? true,
      canViewStudentContact: normalized.permissions.canViewStudentContact ?? true,
      canViewStudentPersonalInfo: normalized.permissions.canViewStudentPersonalInfo ?? true,
    };
  }
  
  // Ensure default values
  if (!normalized.status) {
    normalized.status = 'active';
  }
  if (!normalized.assignedStudents) {
    normalized.assignedStudents = [];
  }
  if (!normalized.specialization) {
    normalized.specialization = [];
  }
  
  // Set hireDate if not provided
  if (!normalized.hireDate) {
    normalized.hireDate = new Date();
  } else if (typeof normalized.hireDate === 'string') {
    normalized.hireDate = new Date(normalized.hireDate);
  }
  
  return normalized;
};

// Get all admins
app.get('/api/admins', async (req, res) => {
  try {
    const admins = await Admin.find({}).populate('userId');
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new admin
app.post('/api/admins', authenticateToken, async (req, res) => {
  try {
    const { userId, fullName, email, contact, permissions, assignedDepartments, hireDate, status, avatar } = req.body;

    // Validate required fields
    if (!fullName || !email) {
      return res.status(400).json({ error: 'Full name and email are required' });
    }

    // Convert userId to ObjectId if it's a string
    let adminUserId = userId;
    if (adminUserId && typeof adminUserId === 'string') {
      adminUserId = new mongoose.Types.ObjectId(adminUserId);
    }

    const adminData = {
      adminId: `ADM${Date.now()}`,
      userId: adminUserId,
      fullName,
      email,
      contact: contact || '',
      permissions: permissions || {
        canManageTeachers: false,
        canManageStudents: false,
        canManageFinancials: false,
        canViewReports: false,
        canManagePermissions: false
      },
      assignedDepartments: assignedDepartments || [],
      hireDate: hireDate ? new Date(hireDate) : new Date(),
      status: status || 'active',
      avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1F3224&color=fff`
    };

    const admin = new Admin(adminData);
    await admin.save();

    // Log admin creation
    await logActivity('user_created', {
      req,
      userId: req.user?.userId || null,
      email: admin.email,
      role: 'admin',
      status: 'success',
      details: { createdBy: req.user?.email || 'system', newAdminEmail: email }
    });

    res.json(admin);
  } catch (error) {
    if (error?.code === 11000) {
      await logActivity('user_created', {
        req,
        userId: req.user?.userId || null,
        status: 'failure',
        errorMessage: 'Admin already exists',
        details: { email: req.body.email }
      });
      return res.status(409).json({ error: 'An admin with that email already exists.' });
    }
    console.error('❌ Failed to create admin:', error);
    await logActivity('user_created', {
      req,
      userId: req.user?.userId || null,
      status: 'failure',
      errorMessage: error.message
    });
    res.status(500).json({ error: error.message || 'Failed to create admin' });
  }
});

// Update admin
app.put('/api/admins/:id', authenticateToken, async (req, res) => {
  try {
    const adminData = { ...req.body };
    if (adminData.userId && typeof adminData.userId === 'string') {
      adminData.userId = new mongoose.Types.ObjectId(adminData.userId);
    }
    if (adminData.hireDate && typeof adminData.hireDate === 'string') {
      adminData.hireDate = new Date(adminData.hireDate);
    }

    const admin = await Admin.findByIdAndUpdate(req.params.id, adminData, { new: true, runValidators: true });
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json(admin);
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
    
    // Normalize the teacher data
    const normalizedData = normalizeTeacherData(teacherData);
    
    const teacher = new Teacher(normalizedData);
    await teacher.save();
    res.json(teacher);
  } catch (error) {
    console.error('Error creating teacher:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'A teacher with that email already exists.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update teacher profile
app.put('/api/teachers/:id', async (req, res) => {
  try {
    const teacherId = req.params.id;
    console.log(`🔄 PUT /api/teachers/${teacherId}`);
    
    const teacherData = { ...req.body };
    if (teacherData.userId && typeof teacherData.userId === 'string') {
      teacherData.userId = new mongoose.Types.ObjectId(teacherData.userId);
    }
    
    // Normalize the teacher data
    const normalizedData = normalizeTeacherData(teacherData);
    
    // Try to convert ID to ObjectId if it's a valid ObjectId string
    const isValidObjectId = mongoose.Types.ObjectId.isValid(teacherId);
    const queryId = isValidObjectId ? new mongoose.Types.ObjectId(teacherId) : teacherId;
    
    console.log(`🔍 Looking for teacher with ID: ${teacherId} (valid ObjectId: ${isValidObjectId})`);
    
    let updatedTeacher = await Teacher.findByIdAndUpdate(
      queryId,
      normalizedData,
      { new: true, runValidators: true }
    );

    if (!updatedTeacher) {
      console.log(`⚠️ Teacher not found with direct ID, trying alternative queries...`);
      
      // Try finding by userId or teacherId (with proper ObjectId conversion)
      const queryConditions = [];
      
      if (isValidObjectId) {
        const objectId = new mongoose.Types.ObjectId(teacherId);
        queryConditions.push(
          { _id: objectId },
          { userId: objectId }
        );
      }
      
      // Also try as string
      queryConditions.push(
        { userId: teacherId },
        { teacherId: teacherId },
        { _id: teacherId }
      );
      
      console.log(`🔍 Query conditions:`, JSON.stringify(queryConditions, null, 2));
      
      const teacher = await Teacher.findOne({
        $or: queryConditions
      });
      
      if (!teacher) {
        console.error(`❌ Teacher not found with any query condition. ID: ${teacherId}`);
        // List all teacher IDs for debugging
        const allTeachers = await Teacher.find({}, '_id userId teacherId fullName email').limit(10);
        console.log(`📋 Sample teacher IDs:`, allTeachers.map(t => ({
          _id: t._id.toString(),
          userId: t.userId?.toString(),
          teacherId: t.teacherId,
          name: t.fullName || t.email
        })));
        return res.status(404).json({ error: `Teacher not found with ID: ${teacherId}` });
      }
      
      console.log(`✅ Found teacher via fallback query:`, teacher._id.toString());
      
      updatedTeacher = await Teacher.findByIdAndUpdate(
        teacher._id,
        normalizedData,
        { new: true, runValidators: true }
      );
    }

    // Also update the User record if teacher has a userId
    if (updatedTeacher && updatedTeacher.userId) {
      try {
        const userUpdateData = {};
        
        // Update name/fullName in User collection
        if (normalizedData.fullName) {
          userUpdateData.name = normalizedData.fullName;
        }
        
        // Update email in User collection
        if (normalizedData.email) {
          userUpdateData.email = normalizedData.email;
        }
        
        // Update contact/phoneNumber in User collection
        if (normalizedData.phoneNumber || normalizedData.contact) {
          userUpdateData.phoneNumber = normalizedData.phoneNumber || normalizedData.contact;
          userUpdateData.contact = normalizedData.contact || normalizedData.phoneNumber;
        }
        
        // Update avatar if provided
        if (normalizedData.avatar) {
          userUpdateData.avatar = normalizedData.avatar;
        }
        
        // Only update if there's data to update
        if (Object.keys(userUpdateData).length > 0) {
          await User.findByIdAndUpdate(
            updatedTeacher.userId,
            userUpdateData,
            { new: true }
          );
          console.log(`✅ Updated User record for teacher: ${updatedTeacher.userId.toString()}`);
        }
      } catch (userUpdateError) {
        console.error('⚠️ Failed to update User record (non-fatal):', userUpdateError);
        // Don't fail the entire request if User update fails
      }
    }

    console.log(`✅ Teacher updated successfully:`, updatedTeacher._id.toString());
    res.json(updatedTeacher);
  } catch (error) {
    console.error('❌ Error updating teacher:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'A teacher with that email already exists.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TEACHER ATTENDANCE ENDPOINTS
// ============================================

// REDESIGNED: Simple, reliable teacher lookup
// Always returns Teacher document with _id, or null
const findTeacherById = async (teacherId) => {
  if (!teacherId) {
    console.log('❌ No teacherId provided');
    return null;
  }
  
  const teacherIdStr = teacherId.toString().trim();
  console.log(`🔍 findTeacherById called with: "${teacherIdStr}" (type: ${typeof teacherId}, isValid: ${mongoose.Types.ObjectId.isValid(teacherIdStr)})`);
  
  // STEP 1: Try direct Teacher._id lookup (this is what we want 99% of the time)
  if (mongoose.Types.ObjectId.isValid(teacherIdStr)) {
    try {
      const objectId = new mongoose.Types.ObjectId(teacherIdStr);
      console.log(`🔍 Trying Teacher.findById with ObjectId: ${objectId}`);
      
      const teacher = await Teacher.findById(objectId).lean();
      if (teacher) {
        console.log(`✅ Found teacher by Teacher._id: ${teacher.fullName} (Teacher._id: ${teacher._id}, User._id: ${teacher.userId})`);
        return teacher;
      } else {
        console.log(`⚠️ Teacher.findById returned null for: ${teacherIdStr}`);
      }
    } catch (err) {
      console.log(`⚠️ Error in Teacher.findById(${teacherIdStr}): ${err.message}`);
      console.log(`⚠️ Error stack: ${err.stack}`);
    }
  } else {
    console.log(`⚠️ Invalid ObjectId format: ${teacherIdStr}`);
  }
  
  // STEP 2: If not found, it might be a User._id - find Teacher by userId
  if (mongoose.Types.ObjectId.isValid(teacherIdStr)) {
    try {
      const objectId = new mongoose.Types.ObjectId(teacherIdStr);
      console.log(`🔍 Trying Teacher.findOne({ userId: ${objectId} })`);
      
      const teacher = await Teacher.findOne({ userId: objectId }).lean();
      if (teacher) {
        console.log(`✅ Found teacher by User._id lookup: ${teacher.fullName} (Teacher._id: ${teacher._id}, User._id: ${teacherIdStr})`);
        console.log(`⚠️ WARNING: Frontend sent User._id instead of Teacher._id. Use Teacher._id: ${teacher._id} for future requests.`);
        return teacher;
      } else {
        console.log(`⚠️ Teacher.findOne({ userId }) returned null for: ${teacherIdStr}`);
      }
    } catch (err) {
      console.log(`⚠️ Error in Teacher.findOne by userId: ${err.message}`);
    }
  }
  
  // STEP 3: Last resort - try User lookup then Teacher
  if (mongoose.Types.ObjectId.isValid(teacherIdStr)) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(teacherIdStr).lean();
      if (user && user.role === 'teacher') {
        console.log(`🔍 Found User with role=teacher, looking for Teacher with userId: ${user._id}`);
        const teacher = await Teacher.findOne({ userId: user._id }).lean();
        if (teacher) {
          console.log(`✅ Found teacher via User->Teacher lookup: ${teacher.fullName} (Teacher._id: ${teacher._id}, User._id: ${user._id})`);
          console.log(`⚠️ WARNING: Frontend sent User._id instead of Teacher._id. Use Teacher._id: ${teacher._id} for future requests.`);
          return teacher;
        }
      }
    } catch (err) {
      console.log(`⚠️ Error in User->Teacher lookup: ${err.message}`);
    }
  }
  
  // Not found - log all teachers for debugging
  console.log(`❌ Teacher not found for ID: ${teacherIdStr}`);
  try {
    const allTeachers = await Teacher.find({}).select('_id fullName userId email').limit(20).lean();
    console.log(`📋 Available teachers (showing first 20 of ${allTeachers.length}):`);
    allTeachers.forEach(t => {
      const matches = t._id?.toString() === teacherIdStr || t.userId?.toString() === teacherIdStr;
      const marker = matches ? ' ⭐ MATCHES SEARCHED ID' : '';
      console.log(`  - ${t.fullName || 'Unknown'}: Teacher._id="${t._id?.toString()}", User._id="${t.userId?.toString()}", email="${t.email}"${marker}`);
    });
  } catch (err) {
    console.log(`⚠️ Error fetching teachers list: ${err.message}`);
  }
  
  return null;
};

// Test endpoint to check if a teacher exists
app.get('/api/teacher-attendance/test/:teacherId', authenticateToken, async (req, res) => {
  try {
    const teacherId = req.params.teacherId;
    const teacher = await findTeacherById(teacherId);
    const allTeachers = await Teacher.find({}).select('_id fullName userId').limit(10).lean();
    
    res.json({
      searchedId: teacherId,
      found: !!teacher,
      teacher: teacher ? {
        _id: teacher._id?.toString(),
        fullName: teacher.fullName,
        userId: teacher.userId?.toString()
      } : null,
      sampleTeachers: allTeachers.map(t => ({
        _id: t._id?.toString(),
        fullName: t.fullName,
        userId: t.userId?.toString()
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/teacher-attendance', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only admins and superadmins can record attendance' });
    }

    const attendanceData = { ...req.body };
    
    // Validate required fields
    if (!attendanceData.teacherId || !attendanceData.date) {
      return res.status(400).json({ error: 'teacherId and date are required' });
    }

    // Get teacher info using the helper function
    console.log('🔍 Looking up teacher with ID:', attendanceData.teacherId);
    console.log('🔍 ID type:', typeof attendanceData.teacherId);
    console.log('🔍 ID value:', JSON.stringify(attendanceData.teacherId));
    
    const teacher = await findTeacherById(attendanceData.teacherId);

    if (!teacher) {
      // Log available teachers for debugging
      const allTeachers = await Teacher.find({}).select('_id teacherId userId fullName email').lean();
      console.error(`❌ Teacher not found for ID: ${attendanceData.teacherId}`);
      console.error(`📋 Total teachers in database: ${allTeachers.length}`);
      
      // Check if the ID exists in the list
      const matchingTeacher = allTeachers.find(t => 
        t._id?.toString() === attendanceData.teacherId?.toString() ||
        t.userId?.toString() === attendanceData.teacherId?.toString()
      );
      
      if (matchingTeacher) {
        console.error(`⚠️ Found matching teacher but lookup failed:`, {
          fullName: matchingTeacher.fullName,
          _id: matchingTeacher._id?.toString(),
          userId: matchingTeacher.userId?.toString()
        });
      }
      
      allTeachers.forEach(t => {
        console.log(`  - ${t.fullName || 'Unknown'}: _id="${t._id?.toString()}", userId="${t.userId?.toString()}", teacherId="${t.teacherId}"`);
      });
      
      return res.status(404).json({ 
        error: `Teacher not found with ID: ${attendanceData.teacherId}. Check backend logs for available teachers.`,
        searchedId: attendanceData.teacherId?.toString(),
        totalTeachers: allTeachers.length,
        availableTeachers: allTeachers.map(t => ({
          _id: t._id?.toString(),
          fullName: t.fullName,
          userId: t.userId?.toString()
        }))
      });
    }
    
    console.log('✅ Teacher found:', {
      _id: teacher._id?.toString(),
      fullName: teacher.fullName,
      userId: teacher.userId?.toString()
    });

    // Determine employment type
    const employmentType = teacher.employmentType === 'Full Time' ? 'Full Time' : 'Part Time';

    // ALWAYS use Teacher document _id (not User._id) for attendance records
    const teacherDocumentId = teacher._id.toString();
    
    // Prepare attendance record
    const attendanceRecord = {
      teacherId: teacherDocumentId, // Always use Teacher._id
      teacherName: teacher.fullName,
      date: attendanceData.date, // YYYY-MM-DD format
      employmentType: employmentType,
      recordedBy: user.id || user._id,
      recordedByName: user.name || user.email,
      paidDays: attendanceData.paidDays || 0,
      isPaid: attendanceData.isPaid || false
    };
    
    console.log(`📝 Saving attendance for: ${teacher.fullName} (Teacher._id: ${teacherDocumentId})`);

    // Add shift data based on employment type
    if (employmentType === 'Full Time') {
      attendanceRecord.morningShift = attendanceData.morningShift || {
        status: 'absent',
        checkIn: '',
        checkOut: '',
        notes: ''
      };
      attendanceRecord.eveningShift = attendanceData.eveningShift || {
        status: 'absent',
        checkIn: '',
        checkOut: '',
        notes: ''
      };
    } else {
      attendanceRecord.shift = attendanceData.shift || {
        name: teacher.shifts?.[0]?.name || 'Default',
        status: 'absent',
        checkIn: '',
        checkOut: '',
        notes: ''
      };
    }

    // Upsert attendance record (update if exists, create if not)
    const attendance = await TeacherAttendance.findOneAndUpdate(
      { teacherId: attendanceRecord.teacherId, date: attendanceRecord.date },
      attendanceRecord,
      { upsert: true, new: true, runValidators: true }
    );

    res.json(attendance);
  } catch (error) {
    console.error('❌ Error creating/updating teacher attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk create/update attendance (for multiple teachers on same date)
app.post('/api/teacher-attendance/bulk', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only admins and superadmins can record attendance' });
    }

    const { date, attendances } = req.body; // attendances is array of attendance records

    if (!date || !Array.isArray(attendances)) {
      return res.status(400).json({ error: 'date and attendances array are required' });
    }

    const results = [];
    const errors = [];

    for (const attendanceData of attendances) {
      try {
        // Get teacher info using the helper function
        const teacher = await findTeacherById(attendanceData.teacherId);

        if (!teacher) {
          console.error('❌ Teacher not found in bulk for ID:', attendanceData.teacherId);
          errors.push({ teacherId: attendanceData.teacherId, error: 'Teacher not found' });
          continue;
        }

        const employmentType = teacher.employmentType === 'Full Time' ? 'Full Time' : 'Part Time';
        
        // ALWAYS use Teacher document _id for attendance records
        const teacherDocumentId = teacher._id.toString();

        const attendanceRecord = {
          teacherId: teacherDocumentId, // Always use Teacher._id
          teacherName: teacher.fullName,
          date: date,
          employmentType: employmentType,
          recordedBy: user.id || user._id,
          recordedByName: user.name || user.email,
          paidDays: attendanceData.paidDays || 0,
          isPaid: attendanceData.isPaid || false
        };

        if (employmentType === 'Full Time') {
          attendanceRecord.morningShift = attendanceData.morningShift || {
            status: 'absent',
            checkIn: '',
            checkOut: '',
            notes: ''
          };
          attendanceRecord.eveningShift = attendanceData.eveningShift || {
            status: 'absent',
            checkIn: '',
            checkOut: '',
            notes: ''
          };
        } else {
          attendanceRecord.shift = attendanceData.shift || {
            name: teacher.shifts?.[0]?.name || 'Default',
            status: 'absent',
            checkIn: '',
            checkOut: '',
            notes: ''
          };
        }

        const attendance = await TeacherAttendance.findOneAndUpdate(
          { teacherId: attendanceRecord.teacherId, date: date },
          attendanceRecord,
          { upsert: true, new: true, runValidators: true }
        );

        results.push(attendance);
      } catch (err) {
        errors.push({ teacherId: attendanceData.teacherId, error: err.message });
      }
    }

    res.json({ success: true, created: results.length, errors: errors, results });
  } catch (error) {
    console.error('❌ Error bulk creating/updating teacher attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get attendance records with filters
app.get('/api/teacher-attendance', authenticateToken, async (req, res) => {
  try {
    const { teacherId, date, startDate, endDate, month, year, employmentType } = req.query;
    const user = req.user;

    let query = {};

    // Teachers can only see their own attendance
    if (user.role === 'teacher') {
      const teacher = await Teacher.findOne({
        $or: [
          { userId: user.id || user._id },
          { email: user.email }
        ]
      }).lean();

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }
      query.teacherId = teacher._id.toString() || teacher.teacherId;
    } else if (teacherId) {
      // Admin/SuperAdmin can filter by teacher
      query.teacherId = teacherId;
    }

    if (date) {
      query.date = date;
    } else if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (month && year) {
      // Get all dates in the month
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const end = `${year}-${String(month).padStart(2, '0')}-31`;
      query.date = { $gte: start, $lte: end };
    }

    if (employmentType) {
      query.employmentType = employmentType;
    }

    const attendances = await TeacherAttendance.find(query)
      .sort({ date: -1, teacherName: 1 })
      .lean();

    res.json(attendances);
  } catch (error) {
    console.error('❌ Error fetching teacher attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get attendance for specific teacher
app.get('/api/teacher-attendance/teacher/:teacherId', authenticateToken, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { startDate, endDate, month, year } = req.query;
    const user = req.user;

    // Teachers can only see their own attendance
    if (user.role === 'teacher') {
      const teacher = await findTeacherById(user.id || user._id);
      if (!teacher) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }
      
      const teacherMongoId = teacher._id.toString() || teacher.teacherId;
      // Also check if the requested teacherId matches this teacher
      const requestedTeacher = await findTeacherById(teacherId);
      if (!requestedTeacher || requestedTeacher._id.toString() !== teacherMongoId) {
        return res.status(403).json({ error: 'You can only view your own attendance' });
      }
    }

    let query = { teacherId };

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (month && year) {
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const end = `${year}-${String(month).padStart(2, '0')}-31`;
      query.date = { $gte: start, $lte: end };
    }

    const attendances = await TeacherAttendance.find(query)
      .sort({ date: -1 })
      .lean();

    res.json(attendances);
  } catch (error) {
    console.error('❌ Error fetching teacher attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get attendance statistics for a teacher
app.get('/api/teacher-attendance/stats/:teacherId', authenticateToken, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { month, year } = req.query;
    const user = req.user;

    // Resolve teacherId to actual Teacher document _id using helper
    const teacher = await findTeacherById(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Teachers can only see their own stats
    if (user.role === 'teacher') {
      const currentUserTeacher = await findTeacherById(user.id || user._id);
      if (!currentUserTeacher || currentUserTeacher._id.toString() !== teacher._id.toString()) {
        return res.status(403).json({ error: 'You can only view your own statistics' });
      }
    }

    let query = { teacherId: teacher._id.toString() };

    if (month && year) {
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const end = `${year}-${String(month).padStart(2, '0')}-31`;
      query.date = { $gte: start, $lte: end };
    }

    const attendances = await TeacherAttendance.find(query).lean();

    const isFullTime = teacher.employmentType === 'Full Time';
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalHalfDay = 0;
    let totalPaidDays = 0;

    attendances.forEach(att => {
      if (isFullTime) {
        // Count morning shift
        if (att.morningShift?.status === 'present') totalPresent++;
        else if (att.morningShift?.status === 'absent') totalAbsent++;
        else if (att.morningShift?.status === 'late') totalLate++;
        else if (att.morningShift?.status === 'half-day') totalHalfDay++;

        // Count evening shift
        if (att.eveningShift?.status === 'present') totalPresent++;
        else if (att.eveningShift?.status === 'absent') totalAbsent++;
        else if (att.eveningShift?.status === 'late') totalLate++;
        else if (att.eveningShift?.status === 'half-day') totalHalfDay++;
      } else {
        if (att.shift?.status === 'present') totalPresent++;
        else if (att.shift?.status === 'absent') totalAbsent++;
        else if (att.shift?.status === 'late') totalLate++;
        else if (att.shift?.status === 'half-day') totalHalfDay++;
      }

      totalPaidDays += att.paidDays || 0;
    });

    const totalShifts = isFullTime ? attendances.length * 2 : attendances.length;
    const presentRate = totalShifts > 0 ? (totalPresent / totalShifts) * 100 : 0;

    res.json({
      teacherId,
      teacherName: teacher.fullName,
      employmentType: teacher.employmentType,
      period: month && year ? `${year}-${String(month).padStart(2, '0')}` : 'all',
      totalRecords: attendances.length,
      totalShifts,
      totalPresent,
      totalAbsent,
      totalLate,
      totalHalfDay,
      totalPaidDays,
      presentRate: Math.round(presentRate * 100) / 100
    });
  } catch (error) {
    console.error('❌ Error fetching teacher attendance statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete attendance record
app.delete('/api/teacher-attendance/:id', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only admins and superadmins can delete attendance' });
    }

    const attendance = await TeacherAttendance.findByIdAndDelete(req.params.id);
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    res.json({ message: 'Attendance record deleted successfully', attendance });
  } catch (error) {
    console.error('❌ Error deleting teacher attendance:', error);
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

// Admin password reset endpoint (for admin use - resets student/teacher password)
app.put('/api/users/:id/password', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin permissions
    const adminUser = await User.findById(req.user.userId);
    if (!adminUser || (adminUser.role !== 'superadmin' && adminUser.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    // Log password reset
    await logActivity('password_reset_success', {
      req,
      email: user.email,
      userId: user._id.toString(),
      role: user.role,
      status: 'success',
      details: { 
        timestamp: new Date(),
        resetBy: adminUser.email,
        resetByRole: adminUser.role
      }
    });

    res.json({ message: 'Password reset successfully', success: true });
  } catch (error) {
    console.error('❌ Password reset error:', error);
    await logActivity('password_reset_failure', {
      req,
      status: 'failure',
      errorMessage: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

// Helper function to parse user agent and extract browser/OS info
const parseUserAgent = (userAgent) => {
  if (!userAgent || userAgent === 'unknown') {
    return {
      browser: 'Unknown',
      browserVersion: '',
      os: 'Unknown',
      device: 'Unknown',
      fullUserAgent: 'Unknown'
    };
  }

  let browser = 'Unknown';
  let browserVersion = '';
  let os = 'Unknown';
  let device = 'Desktop';

  // Parse browser
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    if (match) browserVersion = match[1];
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    if (match) browserVersion = match[1];
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    if (match) browserVersion = match[1];
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    if (match) browserVersion = match[1];
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    browser = 'Opera';
    const match = userAgent.match(/(?:Opera|OPR)\/(\d+)/);
    if (match) browserVersion = match[1];
  }

  // Parse OS
  if (userAgent.includes('Windows')) {
    os = 'Windows';
    if (userAgent.includes('Windows NT 10.0')) os = 'Windows 10/11';
    else if (userAgent.includes('Windows NT 6.3')) os = 'Windows 8.1';
    else if (userAgent.includes('Windows NT 6.2')) os = 'Windows 8';
    else if (userAgent.includes('Windows NT 6.1')) os = 'Windows 7';
  } else if (userAgent.includes('Mac OS X') || userAgent.includes('Macintosh')) {
    os = 'macOS';
    const match = userAgent.match(/Mac OS X (\d+)[._](\d+)/);
    if (match) os = `macOS ${match[1]}.${match[2]}`;
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
    device = 'Mobile';
    const match = userAgent.match(/Android (\d+\.?\d*)/);
    if (match) os = `Android ${match[1]}`;
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
    device = userAgent.includes('iPad') ? 'Tablet' : 'Mobile';
    const match = userAgent.match(/OS (\d+)[._](\d+)/);
    if (match) os = `iOS ${match[1]}.${match[2]}`;
  }

  // Detect mobile devices
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    if (device === 'Desktop') device = 'Mobile';
  }

  return {
    browser,
    browserVersion,
    os,
    device,
    fullUserAgent: userAgent
  };
};

// Get user login history from activity logs
app.get('/api/users/:id/login-history', authenticateToken, async (req, res) => {
  try {
    const requestingUserId = req.user.userId;
    const targetUserId = req.params.id;
    
    // Check if user is viewing their own history OR is an admin
    const requestingUser = await User.findById(requestingUserId);
    const isAdmin = requestingUser && (requestingUser.role === 'superadmin' || requestingUser.role === 'admin');
    const isOwnHistory = requestingUserId === targetUserId;

    if (!isOwnHistory && !isAdmin) {
      return res.status(403).json({ error: 'Access denied. You can only view your own login history or need admin privileges.' });
    }

    const { limit = 100, page = 1 } = req.query;

    // Find login events for this user
    const query = {
      userId: targetUserId,
      eventType: { $in: ['login_attempt', 'login_success', 'login_failure'] }
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await ActivityLog.countDocuments(query);

    // Format logs with detailed information
    const loginHistory = logs.map(log => {
      const userAgentInfo = parseUserAgent(log.userAgent);
      
      return {
        id: log._id.toString(),
        date: log.timestamp.toISOString(),
        timestamp: log.timestamp,
        ip: log.ipAddress || 'Unknown',
        location: log.details?.location || 'Unknown',
        userAgent: log.userAgent || 'Unknown',
        browser: userAgentInfo.browser,
        browserVersion: userAgentInfo.browserVersion,
        os: userAgentInfo.os,
        device: userAgentInfo.device,
        status: log.eventType === 'login_success' ? 'success' : log.eventType === 'login_failure' ? 'failure' : 'attempt',
        errorMessage: log.errorMessage || null,
        userEmail: log.userEmail || null,
        userRole: log.userRole || null
      };
    });

    res.json({
      loginHistory,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('❌ Get login history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user settings (loginEnabled, etc.)
app.put('/api/users/:id/settings', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin permissions
    const adminUser = await User.findById(req.user.userId);
    if (!adminUser || (adminUser.role !== 'superadmin' && adminUser.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const { loginEnabled, twoFactorEnabled, emailNotifications, smsNotifications } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user settings (add fields to schema if they don't exist)
    if (loginEnabled !== undefined) user.loginEnabled = loginEnabled;
    if (twoFactorEnabled !== undefined) user.twoFactorEnabled = twoFactorEnabled;
    if (emailNotifications !== undefined) user.emailNotifications = emailNotifications;
    if (smsNotifications !== undefined) user.smsNotifications = smsNotifications;

    await user.save();

    // Log user update
    await logActivity('user_updated', {
      req,
      email: user.email,
      userId: user._id.toString(),
      role: user.role,
      status: 'success',
      details: {
        timestamp: new Date(),
        updatedBy: adminUser.email,
        updatedFields: Object.keys(req.body)
      }
    });

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    res.json(userResponse);
  } catch (error) {
    console.error('❌ Update user settings error:', error);
    await logActivity('user_updated', {
      req,
      status: 'failure',
      errorMessage: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

// Get user details including settings
app.get('/api/users/:id/details', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin permissions
    const adminUser = await User.findById(req.user.userId);
    if (!adminUser || (adminUser.role !== 'superadmin' && adminUser.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get last login from activity logs
    const lastLoginLog = await ActivityLog.findOne({
      userId: user._id.toString(),
      eventType: 'login_success'
    }).sort({ timestamp: -1 });

    // Get password change date from activity logs
    const lastPasswordReset = await ActivityLog.findOne({
      userId: user._id.toString(),
      eventType: 'password_reset_success'
    }).sort({ timestamp: -1 });

    // Return user details
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      ...userResponse,
      lastLogin: lastLoginLog?.timestamp || null,
      passwordChanged: lastPasswordReset?.timestamp || null,
      accountStatus: user.loginEnabled !== false ? 'active' : 'inactive',
      loginEnabled: user.loginEnabled !== false,
      twoFactorEnabled: user.twoFactorEnabled || false,
      emailNotifications: user.emailNotifications !== false,
      smsNotifications: user.smsNotifications || false,
      emailVerified: !!user.email,
      phoneVerified: !!user.contact || !!user.phoneNumber
    });
  } catch (error) {
    console.error('❌ Get user details error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete student
app.delete('/api/students/:id', async (req, res) => {
  try {
    const studentId = req.params.id;
    console.log(`🗑️ DELETE /api/students/${studentId}`);
    
    // Try to find the student first
    let student = null;
    
    // Check if it's a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      student = await Student.findById(studentId);
    }
    
    // If not found by _id, try finding by userId or studentId
    if (!student) {
      student = await Student.findOne({
        $or: [
          { userId: studentId },
          { studentId: studentId },
          { _id: studentId }
        ]
      });
    }
    
    if (!student) {
      console.error(`❌ Student not found with ID: ${studentId}`);
      return res.status(404).json({ error: `Student not found with ID: ${studentId}` });
    }
    
    // Delete the student record
    await Student.findByIdAndDelete(student._id);
    
    // If student has a userId, also delete the associated user
    if (student.userId) {
      try {
        await User.findByIdAndDelete(student.userId);
        console.log(`✅ Also deleted associated user: ${student.userId}`);
      } catch (userError) {
        console.warn(`⚠️ Could not delete associated user: ${userError.message}`);
        // Continue even if user deletion fails
      }
    }
    
    // Remove student from any teacher's assignedStudents array
    try {
      await Teacher.updateMany(
        { assignedStudents: student._id },
        { $pull: { assignedStudents: student._id } }
      );
      console.log(`✅ Removed student from teacher assignments`);
    } catch (teacherError) {
      console.warn(`⚠️ Could not update teacher assignments: ${teacherError.message}`);
    }
    
    console.log(`✅ Student deleted successfully: ${student._id}`);
    res.json({ message: 'Student deleted successfully', deletedId: student._id });
    
  } catch (error) {
    console.error('❌ Error deleting student:', error);
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

// Assignment Schema - New multi-phase assignment system
const classworkPhaseSchema = new mongoose.Schema({
  type: { type: String, enum: ['sabq', 'sabqi', 'manzil'], required: true },
  assignmentRange: { type: String, required: true }, // e.g., "Surah Al-Fatiha, Ayah 1-7"
  details: { type: String, default: '' }, // Additional notes/details
  fromPage: Number,
  toPage: Number,
  fromAyah: Number,
  toAyah: Number,
  surahNumber: Number,
  surahName: String
}, { _id: false });

const assignmentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  studentName: { type: String, required: true },
  assignedBy: { type: String, required: true }, // User ID (admin, super admin, or teacher)
  assignedByName: { type: String, required: true }, // User name
  assignedByRole: { type: String, enum: ['admin', 'super_admin', 'teacher'], required: true },
  // Classwork phases - can have multiple entries of each type
  classwork: {
    sabq: { type: [classworkPhaseSchema], default: [] },
    sabqi: { type: [classworkPhaseSchema], default: [] },
    manzil: { type: [classworkPhaseSchema], default: [] }
  },
  // Homework
  homework: {
    enabled: { type: Boolean, default: false },
    content: { type: String, default: '' }, // Text content
    link: { type: String, default: '' }, // Optional link
    // Homework submission
    submission: {
      submitted: { type: Boolean, default: false },
      submittedAt: Date,
      submittedBy: String, // Student ID
      submittedByName: String, // Student name
      content: String, // Student's submission content
      link: String, // Optional submission link (e.g., Google Drive, etc.)
      audioUrl: String, // Audio recording of recitation
      attachments: [{
        name: String,
        url: String,
        type: String
      }],
      feedback: String, // Teacher/Admin feedback
      gradedBy: String, // User ID who graded
      gradedByName: String, // User name who graded
      gradedAt: Date,
      grade: Number, // Optional grade
      status: { type: String, enum: ['submitted', 'graded', 'returned'], default: 'submitted' }
    }
  },
  // Comment
  comment: { type: String, default: '' },
  // Mushaf mistakes associated with this assignment
  mushafMistakes: [{
    id: String,
    type: { type: String, enum: ['madd', 'holding', 'memory', 'ikhfa', 'tech', 'other', 'letter', 'heavy_letter', 'no_rounding_lips', 'heavy_h', 'light_l', 'atkee'] },
    page: Number,
    surah: Number,
    ayah: Number,
    wordIndex: Number,
    position: {
      x: Number,
      y: Number
    },
    note: String,
    audioUrl: String,
    workflowStep: String, // sabq, sabqi, manzil
    markedBy: String,
    markedByName: String,
    timestamp: { type: Date, default: Date.now }
  }],
  // Status tracking
  status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
  completedAt: Date
}, { timestamps: true });

assignmentSchema.index({ studentId: 1, createdAt: -1 });
assignmentSchema.index({ assignedBy: 1, createdAt: -1 });

const Assignment = mongoose.model('Assignment', assignmentSchema);

// Ticket Schema - for sabq, sabqi, manzil workflow
const ticketMistakeSchema = new mongoose.Schema({
  id: String,
  type: { type: String, enum: ['madd', 'holding', 'memory', 'ikhfa', 'tech', 'other', 'letter', 'heavy_letter', 'no_rounding_lips', 'heavy_h', 'light_l', 'atkee'] },
  page: Number,
  surah: Number,
  ayah: Number,
  wordIndex: Number,
  position: {
    x: Number,
    y: Number
  },
  note: String,
  audioUrl: String, // Optional recording for this mistake
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const ticketSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  studentName: { type: String, required: true },
  type: { type: String, enum: ['sabq', 'sabqi', 'manzil'], required: true },
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'submitted', 'approved', 'reassigned', 'sent_to_assignment'], 
    default: 'pending' 
  },
  // Admin fields (for sabq or when creating sabqi/manzil)
  createdBy: { type: String, required: true }, // Admin ID
  createdByName: { type: String, required: true }, // Admin name
  adminComment: { type: String, default: '' }, // Admin's comment (for sabq, or notes for teacher)
  // Teacher assignment (for sabqi/manzil)
  assignedTeacherId: { type: String }, // Teacher ID (for sabqi/manzil)
  assignedTeacherName: { type: String }, // Teacher name
  teacherNotes: { type: String, default: '' }, // Admin's notes to teacher
  // Teacher submission
  teacherComment: { type: String, default: '' }, // Teacher's comment after review
  mistakes: { type: [ticketMistakeSchema], default: [] }, // Mistakes marked by teacher
  // Reassignment tracking
  reassignedFromTeacherId: { type: String }, // If reassigned, track previous teacher
  reassignedFromTeacherName: { type: String },
  reassignedToTeacherId: { type: String }, // New teacher if reassigned
  reassignedToTeacherName: { type: String },
  reassignmentReason: { type: String }, // Why it was reassigned
  previousTeacherComment: { type: String }, // Previous teacher's comment (if reassigned)
  previousMistakes: { type: [ticketMistakeSchema], default: [] }, // Previous mistakes (if reassigned)
  // Assignment integration
  sentToAssignmentId: { type: String }, // Assignment ID if sent to assignment page
  sentAt: { type: Date }, // When it was sent to assignment
  // Recording fields
  recordingUrl: { type: String }, // URL to stored recording file
  recordingFormat: { type: String, default: 'webm' }, // webm, mp3, etc.
  recordingDuration: { type: Number }, // Duration in seconds
  recordingStartedAt: { type: Date }, // When recording started
  recordingStoppedAt: { type: Date }, // When recording stopped
  // Timestamps
  startedAt: { type: Date }, // When teacher started
  submittedAt: { type: Date }, // When teacher submitted
  approvedAt: { type: Date }, // When admin approved
  reassignedAt: { type: Date } // When it was reassigned
}, { timestamps: true });

ticketSchema.index({ studentId: 1, status: 1 });
ticketSchema.index({ assignedTeacherId: 1, status: 1 });
ticketSchema.index({ type: 1, status: 1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

// Student Personal Mushaf Schema - tracks all mistakes across all recitations
const studentPersonalMushafSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  studentName: { type: String, required: true },
  mistakes: [{
    id: String,
    type: { type: String, enum: ['madd', 'holding', 'memory', 'ikhfa', 'tech', 'other', 'letter', 'heavy_letter', 'no_rounding_lips', 'heavy_h', 'light_l', 'atkee'], required: true },
    page: { type: Number, required: true },
    surah: { type: Number, required: true },
    ayah: { type: Number, required: true },
    wordIndex: Number,
    letterIndex: Number, // For letter-level mistakes
    position: {
      x: Number,
      y: Number
    },
    note: String,
    audioUrl: String,
    ticketId: String, // Reference to the ticket where this mistake was marked
    workflowStep: String, // sabq, sabqi, manzil
    markedBy: String, // Teacher ID who marked it
    markedByName: String, // Teacher name
    timestamp: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now } // When it was added to personal Mushaf
  }]
}, { timestamps: true });

const StudentPersonalMushaf = mongoose.model('StudentPersonalMushaf', studentPersonalMushafSchema);

// Test Result Schema - for student testing module
const testQuestionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  surah: { type: Number, required: true },
  ayah: { type: Number, required: true },
  page: { type: Number, required: true },
  memoryScore: { type: Number, min: 1, max: 10 },
  tajweedScore: { type: Number, min: 1, max: 10 },
  fluencyScore: { type: Number, min: 1, max: 10 },
  mistakes: [{
    id: String,
    type: { type: String, enum: ['madd', 'holding', 'memory', 'ikhfa', 'tech', 'other', 'letter', 'heavy_letter', 'no_rounding_lips', 'heavy_h', 'light_l', 'atkee'], required: true },
    page: { type: Number, required: true },
    surah: { type: Number, required: true },
    ayah: { type: Number, required: true },
    wordIndex: Number,
    letterIndex: Number,
    position: {
      x: Number,
      y: Number
    },
    note: String,
    audioUrl: String,
    timestamp: Date
  }],
  notes: String
}, { _id: false });

const testResultSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true }, // Frontend generated ID
  studentId: { type: String, required: true, index: true },
  studentName: { type: String, required: true },
  teacherId: { type: String, required: true },
  teacherName: { type: String, required: true },
  program: String,
  title: { type: String, default: 'Student Test' },
  questions: [testQuestionSchema],
  feedback: String,
  createdBy: { type: String, required: true },
  postedToStudent: { type: Boolean, default: false },
  postedAt: Date
}, { timestamps: true });

const TestResult = mongoose.model('TestResult', testResultSchema);

// ============================================
// TEACHER EVALUATION SYSTEM SCHEMAS
// ============================================

// Evaluation Question Schema
const evaluationQuestionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  questionText: { type: String, required: true },
  questionType: { 
    type: String, 
    enum: ['text', 'audio', 'video'], 
    required: true 
  },
  options: { type: [String], default: [] }, // For text questions - always 4 choices
  correctAnswer: String, // For text questions (MCQ) - must be correct before next question appears
  isRequired: { type: Boolean, default: true },
  order: { type: Number, required: true },
  mediaUrl: String, // For audio/video questions (reference media)
  instructions: String,
  points: { type: Number, default: 1 }
}, { _id: false });

// Teacher Evaluation Schema - Main evaluation template
const teacherEvaluationSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  title: { type: String, required: true },
  description: String,
  questions: [evaluationQuestionSchema],
  createdBy: { type: String, required: true }, // User ID
  createdByName: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['draft', 'active', 'archived'], 
    default: 'draft' 
  },
  evaluationPeriod: {
    startDate: Date,
    endDate: Date
  },
  autoSave: { type: Boolean, default: true }
}, { timestamps: true });

const Evaluation = mongoose.model('Evaluation', teacherEvaluationSchema);

// Evaluation Assignment Schema - Links evaluation to teacher
const evaluationAssignmentSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  evaluationId: { type: String, required: true, index: true },
  teacherId: { type: String, required: true, index: true },
  teacherName: { type: String, required: true },
  assignedBy: { type: String, required: true }, // Admin/Super Admin ID
  assignedByName: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['assigned', 'in_progress', 'completed', 'overdue'], 
    default: 'assigned',
    index: true
  },
  dueDate: Date,
  startedAt: Date,
  completedAt: Date,
  progress: { type: Number, default: 0, min: 0, max: 100 }, // Percentage
  currentQuestionIndex: { type: Number, default: 0 }
}, { timestamps: true });

const EvaluationAssignment = mongoose.model('EvaluationAssignment', evaluationAssignmentSchema);

// Evaluation Answer Schema - Teacher's answers
const evaluationAnswerSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  assignmentId: { type: String, required: true, index: true },
  questionId: { type: String, required: true },
  answerText: String,
  selectedOption: String, // For MCQ
  isCorrect: Boolean, // For MCQ validation
  mediaUrl: String, // For audio/video/file uploads
  answeredAt: { type: Date, default: Date.now },
  autoSaved: { type: Boolean, default: false }
}, { timestamps: true });

const EvaluationAnswer = mongoose.model('EvaluationAnswer', evaluationAnswerSchema);

// Evaluation Upload Schema - Media uploads (Cloudinary)
const evaluationUploadSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  assignmentId: { type: String, required: true, index: true },
  questionId: { type: String, required: true },
  answerId: String, // Link to answer if applicable
  fileType: { 
    type: String, 
    enum: ['audio', 'video', 'image', 'document'], 
    required: true 
  },
  cloudinaryUrl: { type: String, required: true },
  cloudinaryPublicId: { type: String, required: true },
  fileName: String,
  fileSize: Number,
  mimeType: String,
  uploadedBy: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const EvaluationUpload = mongoose.model('EvaluationUpload', evaluationUploadSchema);

// Admin Notification Schema
const adminNotificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['recitation_review_pending', 'assignment_submitted', 'student_enrolled', 'payment_received', 'profile_update_request', 'student_registration_request'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  recitationReviewId: { type: String },
  assignmentId: { type: String },
  studentId: { type: String },
  teacherId: { type: String }, // For profile_update_request
  read: { type: Boolean, default: false },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  registrationData: { type: mongoose.Schema.Types.Mixed } // Store full registration data for student_registration_request
}, { timestamps: true });

const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);


// Listening Session Schema - tracks live listening telemetry for control tower
const listeningMistakeSchema = new mongoose.Schema({
  id: String,
  type: { type: String },
  page: Number,
  surah: Number,
  ayah: Number,
  wordIndex: Number,
  note: String,
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const listeningSessionSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, index: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  teacherId: { type: String, required: true },
  teacherName: { type: String, required: true },
  workflowStep: { type: String, enum: ['sabq', 'sabqi', 'manzil', 'finalize'], required: true },
  status: { type: String, enum: ['in_progress', 'completed', 'abandoned'], default: 'in_progress' },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  lastHeartbeatAt: { type: Date, default: Date.now },
  totalListeningSeconds: { type: Number, default: 0 },
  currentPage: { type: Number },
  currentSurah: { type: Number },
  currentAyah: { type: Number },
  currentSection: { type: String },
  mistakeCount: { type: Number, default: 0 },
  mistakes: { type: [listeningMistakeSchema], default: [] }
}, { timestamps: true });

listeningSessionSchema.index({ status: 1, lastHeartbeatAt: 1 });

const ListeningSession = mongoose.model('ListeningSession', listeningSessionSchema);

// Qaidah Mark Schema - for teacher annotations on Qaidah pages
const qaidahMarkSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  book: { type: String, enum: ['qaidah1', 'qaidah2', 'quran'], required: true, index: true },
  page: { type: Number, required: true, index: true },
  marks: [{
    id: { type: String, required: true }, // UUID
    type: { type: String, enum: ['mistake', 'correct', 'note'], required: true },
    x: { type: Number, required: true, min: 0, max: 1 }, // Normalized 0-1
    y: { type: Number, required: true, min: 0, max: 1 }, // Normalized 0-1
    comment: { type: String, default: '' }
  }],
  classworkDate: { type: Date, index: true }, // Date of class session (optional for backward compatibility)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Compound index for efficient queries - allows multiple classwork sessions per student/book/page
qaidahMarkSchema.index({ student: 1, book: 1, page: 1, classworkDate: 1 });

const QaidahMark = mongoose.model('QaidahMark', qaidahMarkSchema);

// Qaidah Homework Schema - for student submissions and teacher review
const qaidahHomeworkSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  book: { type: String, enum: ['qaidah1', 'qaidah2', 'quran'], required: true, index: true },
  page: { type: Number, required: true, index: true },
  marks: [{
    id: { type: String, required: true }, // UUID
    type: { type: String, enum: ['mistake', 'correct', 'note'], required: true },
    x: { type: Number, required: true, min: 0, max: 1 }, // Normalized 0-1
    y: { type: Number, required: true, min: 0, max: 1 }, // Normalized 0-1
    comment: { type: String, default: '' }
  }],
  classworkDate: { type: Date, index: true }, // Date of class session
  homeworkInstructions: { type: String, default: '' },
  dueDate: { type: Date, required: true },
  youtubeLink: { type: String, default: '' }, // Student's submission
  teacherFeedback: { type: String, default: '' }, // Optional feedback
  status: { type: String, enum: ['pending', 'submitted', 'reviewed'], default: 'pending', index: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date }
}, { timestamps: true });

// Compound index for efficient queries
qaidahHomeworkSchema.index({ student: 1, book: 1, page: 1, classworkDate: 1 });
qaidahHomeworkSchema.index({ student: 1, status: 1 });
qaidahHomeworkSchema.index({ dueDate: 1 });

const QaidahHomework = mongoose.model('QaidahHomework', qaidahHomeworkSchema);

// --- Listening session helpers & SSE support ---
const listeningSessionClients = new Map();

const serializeListeningSession = (session) => {
  if (!session) return null;
  const plain = session.toObject ? session.toObject() : session;
  return {
    id: plain._id?.toString?.() || plain.id,
    ticketId: plain.ticketId,
    studentId: plain.studentId,
    studentName: plain.studentName,
    teacherId: plain.teacherId,
    teacherName: plain.teacherName,
    workflowStep: plain.workflowStep,
    status: plain.status,
    startedAt: plain.startedAt,
    endedAt: plain.endedAt,
    lastHeartbeatAt: plain.lastHeartbeatAt,
    totalListeningSeconds: plain.totalListeningSeconds,
    currentPage: plain.currentPage,
    currentSurah: plain.currentSurah,
    currentAyah: plain.currentAyah,
    currentSection: plain.currentSection,
    mistakeCount: plain.mistakeCount,
    mistakes: (plain.mistakes || []).map((mistake) => ({
      id: mistake.id,
      type: mistake.type,
      page: mistake.page,
      surah: mistake.surah,
      ayah: mistake.ayah,
      wordIndex: mistake.wordIndex,
      note: mistake.note,
      timestamp: mistake.timestamp
    }))
  };
};

const broadcastListeningSessionEvent = (event, payload) => {
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  const staleClientIds = [];
  listeningSessionClients.forEach((client, clientId) => {
    try {
      client.res.write(data);
    } catch (err) {
      console.warn('⚠️  Failed to write to SSE client:', err.message);
      staleClientIds.push(clientId);
    }
  });
  staleClientIds.forEach((clientId) => {
    const client = listeningSessionClients.get(clientId);
    if (client?.heartbeat) {
      clearInterval(client.heartbeat);
    }
    listeningSessionClients.delete(clientId);
  });
};

const getActiveListeningSessions = async () => {
  const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 2); // 2 hours heartbeat grace
  const allSessions = await ListeningSession.find({
    status: 'in_progress',
    lastHeartbeatAt: { $gte: cutoff }
  }).sort({ startedAt: -1 });
  
  // Deduplicate by ticketId - keep only the most recent session per ticket
  const deduplicated = new Map();
  allSessions.forEach((session) => {
    const ticketId = session.ticketId?.toString();
    if (ticketId) {
      const existing = deduplicated.get(ticketId);
      // Keep the session with the most recent lastHeartbeatAt
      if (!existing || 
          (session.lastHeartbeatAt && existing.lastHeartbeatAt && 
           session.lastHeartbeatAt.getTime() > existing.lastHeartbeatAt.getTime())) {
        deduplicated.set(ticketId, session);
      }
    } else {
      // If no ticketId, keep by _id
      deduplicated.set(session._id.toString(), session);
    }
  });
  
  return Array.from(deduplicated.values()).sort((a, b) => {
    const aTime = (a.startedAt || new Date()).getTime();
    const bTime = (b.startedAt || new Date()).getTime();
    return bTime - aTime;
  });
};

const getRecentListeningSessions = async (limit = 10, dateFilter = null) => {
  const query = {
    status: { $in: ['completed', 'abandoned'] }
  };
  
  if (dateFilter) {
    const startOfDay = new Date(dateFilter);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateFilter);
    endOfDay.setHours(23, 59, 59, 999);
    query.endedAt = { $gte: startOfDay, $lte: endOfDay };
  }
  
  return ListeningSession.find(query)
    .sort({ endedAt: -1 })
    .limit(limit);
};

const findListeningSessionByParam = async (param) => {
  if (!param) return null;
  if (mongoose.Types.ObjectId.isValid(param)) {
    const session = await ListeningSession.findById(param);
    if (session) {
      return session;
    }
  }
  return ListeningSession.findOne({ ticketId: param, status: 'in_progress' });
};

const enforceMistakeHistoryLimit = (session, limit = 50) => {
  if (session.mistakes && session.mistakes.length > limit) {
    session.mistakes = session.mistakes.slice(session.mistakes.length - limit);
  }
};



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
    const oldReview = await RecitationReview.findById(req.params.id);
    if (!oldReview) {
      return res.status(404).json({ error: 'Recitation review not found' });
    }

    const review = await RecitationReview.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // If status changed to approved or rejected, create notifications and update admin notification
    if (req.body.status && oldReview.status === 'pending_review' && (req.body.status === 'approved' || req.body.status === 'rejected')) {
      // Mark the related admin notification as read/resolved
      await AdminNotification.updateMany(
        { recitationReviewId: req.params.id, type: 'recitation_review_pending' },
        { read: true }
      );

      // Create a notification for the teacher about the review decision
      // Note: This assumes you might want to add a teacher notification system in the future
      // For now, we'll just update the admin notification
      console.log(`📢 Recitation review ${req.body.status}: ${review.recitationType} review for ${review.studentName} by ${review.teacherName}`);
    }

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assignment Routes
// Get all assignments (with optional filters)
app.get('/api/assignments', async (req, res) => {
  try {
    const { studentId, assignedBy, program } = req.query;
    const query = {};
    
    if (studentId) query.studentId = studentId;
    if (assignedBy) query.assignedBy = assignedBy;
    if (program) {
      // If program filter is provided, we need to join with students
      const students = await Student.find({ program }).select('_id');
      const studentIds = students.map(s => s._id.toString());
      query.studentId = { $in: studentIds };
    }
    
    console.log('📋 GET /api/assignments - Query:', query);
    const assignments = await Assignment.find(query)
      .sort({ createdAt: -1 })
      .limit(1000);
    console.log('📋 GET /api/assignments - Found:', assignments.length, 'assignments');
    if (assignments.length > 0) {
      console.log('📋 Sample assignment:', {
        id: assignments[0]._id,
        studentId: assignments[0].studentId,
        sabqCount: assignments[0].classwork?.sabq?.length || 0,
        sabqiCount: assignments[0].classwork?.sabqi?.length || 0,
        manzilCount: assignments[0].classwork?.manzil?.length || 0
      });
    }
    res.json(assignments);
  } catch (error) {
    console.error('❌ Error fetching assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get assignments for a specific student
app.get('/api/assignments/student/:studentId', async (req, res) => {
  try {
    const assignments = await Assignment.find({ studentId: req.params.studentId })
      .sort({ createdAt: -1 });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single assignment by ID
app.get('/api/assignments/:id', async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new assignment
app.post('/api/assignments', async (req, res) => {
  try {
    const { ticketId, ...assignmentData } = req.body;
    const assignment = new Assignment(assignmentData);
    await assignment.save();
    
    // If this assignment was created from a sabq ticket, update the ticket's sentToAssignmentId
    if (ticketId) {
      try {
        const ticket = await Ticket.findById(ticketId);
        if (ticket && ticket.status === 'sent_to_assignment' && !ticket.sentToAssignmentId) {
          ticket.sentToAssignmentId = assignment._id.toString();
          ticket.sentAt = new Date();
          await ticket.save();
          console.log('✅ Updated ticket with assignment ID:', {
            ticketId: ticket._id,
            assignmentId: assignment._id.toString()
          });
        }
      } catch (ticketError) {
        console.error('⚠️ Error updating ticket with assignment ID:', ticketError);
        // Don't fail the assignment creation if ticket update fails
      }
    }
    
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit homework for an assignment (MUST be before /api/assignments/:id PUT route)
app.post('/api/assignments/:id/submit-homework', async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (!assignment.homework.enabled) {
      return res.status(400).json({ error: 'Homework is not enabled for this assignment' });
    }

    const { content, link, attachments, audioUrl, studentId, studentName } = req.body;

    if (!content && !link && !audioUrl && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Please provide homework content, link, audio recording, or attachments' });
    }

    // Initialize homework.submission if it doesn't exist
    if (!assignment.homework.submission) {
      assignment.homework.submission = {
        submitted: false,
        status: 'submitted'
      };
    }

    // Update homework submission
    assignment.homework.submission.submitted = true;
    assignment.homework.submission.submittedAt = new Date();
    assignment.homework.submission.submittedBy = studentId;
    assignment.homework.submission.submittedByName = studentName;
    assignment.homework.submission.content = content || '';
    assignment.homework.submission.link = link || '';
    assignment.homework.submission.audioUrl = audioUrl || '';
    assignment.homework.submission.attachments = attachments || [];
    assignment.homework.submission.status = 'submitted';

    await assignment.save();

    console.log('✅ Homework submitted successfully:', {
      assignmentId: assignment._id,
      studentId,
      studentName,
      hasContent: !!content,
      hasLink: !!link,
      hasAudio: !!audioUrl,
      attachmentsCount: attachments?.length || 0
    });

    res.json(assignment);
  } catch (error) {
    console.error('Error submitting homework:', error);
    res.status(500).json({ error: error.message });
  }
});

// Grade homework (for teachers/admins) (MUST be before /api/assignments/:id PUT route)
app.post('/api/assignments/:id/grade-homework', async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (!assignment.homework.submission || !assignment.homework.submission.submitted) {
      return res.status(400).json({ error: 'No homework submission found' });
    }

    const { feedback, grade, gradedBy, gradedByName } = req.body;

    assignment.homework.submission.feedback = feedback || '';
    assignment.homework.submission.grade = grade;
    assignment.homework.submission.gradedBy = gradedBy;
    assignment.homework.submission.gradedByName = gradedByName;
    assignment.homework.submission.gradedAt = new Date();
    assignment.homework.submission.status = grade !== undefined && grade !== null ? 'graded' : 'returned';

    await assignment.save();

    console.log('✅ Homework graded successfully:', {
      assignmentId: assignment._id,
      gradedBy,
      grade,
      hasFeedback: !!feedback
    });

    res.json(assignment);
  } catch (error) {
    console.error('Error grading homework:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update assignment
app.put('/api/assignments/:id', async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete assignment
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

// Ticket Routes
// Get all tickets (with filters)
app.get('/api/tickets', async (req, res) => {
  try {
    const { studentId, assignedTeacherId, type, status } = req.query;
    const query = {};
    
    if (studentId) query.studentId = studentId;
    if (assignedTeacherId) query.assignedTeacherId = assignedTeacherId;
    if (type) query.type = type;
    if (status) query.status = status;
    
    const tickets = await Ticket.find(query)
      .sort({ createdAt: -1 })
      .limit(1000);
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tickets for teacher (pending and in_progress)
app.get('/api/tickets/teacher/:teacherId', async (req, res) => {
  try {
    const tickets = await Ticket.find({
      assignedTeacherId: req.params.teacherId,
      status: { $in: ['pending', 'in_progress', 'reassigned'] }
    })
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tickets pending admin review
app.get('/api/tickets/pending-review', async (req, res) => {
  try {
    const tickets = await Ticket.find({
      status: 'submitted'
    })
      .sort({ submittedAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get previous reports for reminder (sabqi/manzil) - MUST come before /:id route
app.get('/api/tickets/previous-reports/:studentId/:type', async (req, res) => {
  try {
    const { studentId, type } = req.params;
    const tickets = await Ticket.find({
      studentId,
      type,
      status: 'sent_to_assignment'
    })
      .sort({ sentAt: -1 })
      .limit(5); // Get last 5 reports
    
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fix tickets that are missing sentToAssignmentId - MUST come before /:id route
app.post('/api/tickets/fix-missing-assignment-ids', async (req, res) => {
  try {
    // Find all tickets with status 'sent_to_assignment' but no sentToAssignmentId
    const ticketsToFix = await Ticket.find({
      status: 'sent_to_assignment',
      $or: [
        { sentToAssignmentId: { $exists: false } },
        { sentToAssignmentId: null },
        { sentToAssignmentId: '' }
      ]
    });

    console.log(`🔧 Found ${ticketsToFix.length} tickets to fix`);

    let fixedCount = 0;
    for (const ticket of ticketsToFix) {
      // Try to find the assignment for this student
      const assignment = await Assignment.findOne({
        $or: [
          { studentId: ticket.studentId },
          { studentId: new mongoose.Types.ObjectId(ticket.studentId) }
        ],
        status: 'active'
      }).sort({ createdAt: -1 });

      if (assignment) {
        ticket.sentToAssignmentId = assignment._id.toString();
        ticket.sentAt = ticket.sentAt || new Date();
        await ticket.save();
        fixedCount++;
        console.log(`✅ Fixed ticket ${ticket._id} -> Assignment ${assignment._id}`);
      } else {
        console.log(`⚠️ No assignment found for ticket ${ticket._id} (student: ${ticket.studentId})`);
      }
    }

    res.json({
      message: `Fixed ${fixedCount} out of ${ticketsToFix.length} tickets`,
      fixed: fixedCount,
      total: ticketsToFix.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single ticket by ID - MUST come after all specific routes
app.get('/api/tickets/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new ticket
app.post('/api/tickets', async (req, res) => {
  try {
    const ticket = new Ticket(req.body);
    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update ticket
app.put('/api/tickets/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Teacher starts ticket (status: pending -> in_progress)
app.post('/api/tickets/:id/start', async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'in_progress',
        startedAt: new Date()
      },
      { new: true }
    );
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Teacher submits ticket (status: in_progress -> submitted)
app.post('/api/tickets/:id/submit', async (req, res) => {
  try {
    const { 
      teacherComment, 
      mistakes, 
      recordingUrl, 
      recordingFormat, 
      recordingDuration, 
      recordingStartedAt, 
      recordingStoppedAt 
    } = req.body;
    
    const updateData = {
      status: 'submitted',
      teacherComment: teacherComment || '',
      mistakes: mistakes || [],
      submittedAt: new Date()
    };
    
    // Add recording data if provided
    if (recordingUrl) {
      updateData.recordingUrl = recordingUrl;
      updateData.recordingFormat = recordingFormat || 'webm';
      if (recordingDuration !== undefined) {
        updateData.recordingDuration = recordingDuration;
      }
      if (recordingStartedAt) {
        updateData.recordingStartedAt = new Date(recordingStartedAt);
      }
      if (recordingStoppedAt) {
        updateData.recordingStoppedAt = new Date(recordingStoppedAt);
      }
    }
    
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    console.log(`✅ Ticket ${req.params.id} submitted${recordingUrl ? ' with recording' : ''}`);
    res.json(ticket);
  } catch (error) {
    console.error('❌ Error submitting ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin approves and sends to assignment
app.post('/api/tickets/:id/approve-send', async (req, res) => {
  try {
    const { assignmentId, recordingUrl, recordingFormat, recordingDuration, recordingStartedAt, recordingStoppedAt } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Find or create assignment for this student
    let assignment;
    console.log('🔍 Looking for assignment. Ticket:', {
      ticketId: ticket._id,
      studentId: ticket.studentId,
      studentName: ticket.studentName,
      type: ticket.type,
      teacherComment: ticket.teacherComment,
      adminComment: ticket.adminComment
    });

    if (assignmentId) {
      assignment = await Assignment.findById(assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }
      console.log('✅ Found assignment by ID:', assignment._id);
      } else {
      // Find the most recent active assignment for this student
      // Convert studentId to string to ensure proper matching
      const studentIdStr = String(ticket.studentId);
      console.log('🔍 Searching for assignment with studentId:', studentIdStr, '(type:', typeof studentIdStr, ')');
      
      // Check if this ticket was already sent to an assignment (prevent duplicates)
      if (ticket.sentToAssignmentId) {
        assignment = await Assignment.findById(ticket.sentToAssignmentId);
        if (assignment && assignment.status === 'active') {
          console.log('✅ Found assignment linked to this ticket:', assignment._id);
        } else {
          console.log('⚠️ Ticket has sentToAssignmentId but assignment not found or inactive, will create/find new one');
          ticket.sentToAssignmentId = undefined; // Clear invalid reference
        }
      }
      
      // If not found via ticket reference, search for active assignment
      if (!assignment) {
        assignment = await Assignment.findOne({
          studentId: studentIdStr,
          status: 'active'
        }).sort({ createdAt: -1 });
        
        // Also try finding by ObjectId if studentId looks like an ObjectId
        if (!assignment && /^[0-9a-fA-F]{24}$/.test(studentIdStr)) {
          console.log('🔍 Trying to find assignment with ObjectId match...');
          assignment = await Assignment.findOne({
            $or: [
              { studentId: studentIdStr },
              { studentId: new mongoose.Types.ObjectId(studentIdStr) }
            ],
            status: 'active'
          }).sort({ createdAt: -1 });
        }
      }

      if (assignment) {
        console.log('✅ Found existing active assignment:', assignment._id);
        console.log('📊 Current classwork counts:', {
          sabq: assignment.classwork.sabq.length,
          sabqi: assignment.classwork.sabqi.length,
          manzil: assignment.classwork.manzil.length
        });
        } else {
        // If no active assignment exists, create a new one
        console.log('📝 No active assignment found, creating new one');
        assignment = new Assignment({
          studentId: ticket.studentId,
          studentName: ticket.studentName,
          assignedBy: ticket.createdBy,
          assignedByName: ticket.createdByName,
          assignedByRole: 'admin', // Default to admin
          classwork: {
            sabq: [],
            sabqi: [],
            manzil: []
          },
          homework: {
            enabled: false,
            content: '',
            link: ''
          },
          comment: '',
          mushafMistakes: [],
          status: 'active'
        });
        await assignment.save();
        console.log('✅ Created new assignment:', assignment._id);
      }
    }

    // Add ticket content to assignment based on ticket type
    if (ticket.type === 'sabq') {
      // Add to sabq classwork
      assignment.classwork.sabq.push({
        type: 'sabq',
        assignmentRange: ticket.adminComment || 'Sabq recitation',
        details: ticket.adminComment || '',
        surahNumber: ticket.mistakes && ticket.mistakes.length > 0 ? ticket.mistakes[0].surah : undefined,
        surahName: undefined
      });
      // Add admin comment to main comment if it's the first sabq
      if (assignment.comment === '' && ticket.adminComment) {
        assignment.comment = ticket.adminComment;
      }
    } else if (ticket.type === 'sabqi') {
      // Add to sabqi classwork
      // Use teacher comment if available, otherwise use a default
      const commentText = ticket.teacherComment || ticket.adminComment || 'Sabqi recitation review';
      const sabqiEntry = {
        type: 'sabqi',
        assignmentRange: commentText,
        details: commentText,
        surahNumber: ticket.mistakes && ticket.mistakes.length > 0 ? ticket.mistakes[0].surah : undefined,
        surahName: undefined
      };
      console.log('📝 Adding sabqi entry to assignment:', sabqiEntry);
      console.log('📝 Ticket data:', {
        teacherComment: ticket.teacherComment,
        adminComment: ticket.adminComment,
        assignedTeacherName: ticket.assignedTeacherName
      });
      
      // Ensure classwork.sabqi exists
      if (!assignment.classwork.sabqi) {
        assignment.classwork.sabqi = [];
      }
      
      assignment.classwork.sabqi.push(sabqiEntry);
      console.log('✅ Sabqi entries after push:', assignment.classwork.sabqi.length);
      console.log('✅ Full sabqi array:', JSON.stringify(assignment.classwork.sabqi, null, 2));
    } else if (ticket.type === 'manzil') {
      // Add to manzil classwork
      // Use teacher comment if available, otherwise use a default
      const commentText = ticket.teacherComment || ticket.adminComment || 'Manzil recitation review';
      const manzilEntry = {
        type: 'manzil',
        assignmentRange: commentText,
        details: commentText,
        surahNumber: ticket.mistakes && ticket.mistakes.length > 0 ? ticket.mistakes[0].surah : undefined,
        surahName: undefined
      };
      console.log('📝 Adding manzil entry to assignment:', manzilEntry);
      console.log('📝 Ticket data:', {
        teacherComment: ticket.teacherComment,
        adminComment: ticket.adminComment,
        assignedTeacherName: ticket.assignedTeacherName
      });
      
      // Ensure classwork.manzil exists
      if (!assignment.classwork.manzil) {
        assignment.classwork.manzil = [];
      }
      
      assignment.classwork.manzil.push(manzilEntry);
      console.log('✅ Manzil entries after push:', assignment.classwork.manzil.length);
      console.log('✅ Full manzil array:', JSON.stringify(assignment.classwork.manzil, null, 2));
    }

    // Add mistakes from ticket to assignment
    if (ticket.mistakes && ticket.mistakes.length > 0) {
      const assignmentMistakes = ticket.mistakes.map(m => ({
        id: m.id || `mistake-${Date.now()}-${Math.random()}`,
        type: m.type,
        page: m.page,
        surah: m.surah,
        ayah: m.ayah,
        wordIndex: m.wordIndex,
        position: m.position,
        note: m.note,
        audioUrl: m.audioUrl,
        workflowStep: ticket.type,
        markedBy: ticket.assignedTeacherId,
        markedByName: ticket.assignedTeacherName,
        timestamp: m.timestamp || new Date()
      }));
      assignment.mushafMistakes = [...(assignment.mushafMistakes || []), ...assignmentMistakes];
    }

    // Log before saving
    console.log('💾 Saving assignment:', {
      assignmentId: assignment._id,
      studentId: assignment.studentId,
      sabqCount: assignment.classwork.sabq.length,
      sabqiCount: assignment.classwork.sabqi.length,
      manzilCount: assignment.classwork.manzil.length,
      mistakesCount: assignment.mushafMistakes.length
    });

    try {
    await assignment.save();
      console.log('✅ Assignment save() completed successfully');
    } catch (saveError) {
      console.error('❌ Error saving assignment:', saveError);
      console.error('❌ Assignment data that failed to save:', {
        studentId: assignment.studentId,
        studentName: assignment.studentName,
        classwork: assignment.classwork
      });
      throw saveError; // Re-throw to be caught by outer try-catch
    }
    
    // Verify it was saved
    try {
      const savedAssignment = await Assignment.findById(assignment._id);
      if (!savedAssignment) {
        console.error('❌ CRITICAL: Assignment was not found after save!');
        throw new Error('Assignment was not saved properly');
      }
      console.log('✅ Assignment saved. Verification:', {
        assignmentId: savedAssignment._id.toString(),
        studentId: savedAssignment.studentId,
        sabqCount: savedAssignment.classwork.sabq.length,
        sabqiCount: savedAssignment.classwork.sabqi.length,
        manzilCount: savedAssignment.classwork.manzil.length,
        sabqiEntries: savedAssignment.classwork.sabqi,
        manzilEntries: savedAssignment.classwork.manzil
      });
    } catch (verifyError) {
      console.error('❌ Error verifying assignment save:', verifyError);
      throw verifyError;
    }

    // Update ticket
    console.log('🔄 Updating ticket with assignment ID:', assignment._id.toString());
    ticket.status = 'sent_to_assignment';
    ticket.approvedAt = new Date();
    ticket.sentToAssignmentId = assignment._id.toString();
    ticket.sentAt = new Date();
    
    // Save recording data if provided (from admin review)
    if (recordingUrl) {
      ticket.recordingUrl = recordingUrl;
      ticket.recordingFormat = recordingFormat || 'webm';
      ticket.recordingDuration = recordingDuration || null;
      ticket.recordingStartedAt = recordingStartedAt ? new Date(recordingStartedAt) : null;
      ticket.recordingStoppedAt = recordingStoppedAt ? new Date(recordingStoppedAt) : null;
      console.log('🎙️ Saved recording data to ticket:', {
        recordingUrl,
        recordingFormat,
        recordingDuration,
        recordingStartedAt: ticket.recordingStartedAt,
        recordingStoppedAt: ticket.recordingStoppedAt
      });
    }
    
    console.log('💾 Saving ticket with assignment ID:', {
      ticketId: ticket._id,
      sentToAssignmentId: ticket.sentToAssignmentId,
      status: ticket.status
    });
    
    await ticket.save();
    
    // Sync mistakes to Student Personal Mushaf
    if (ticket.mistakes && ticket.mistakes.length > 0) {
      try {
        let personalMushaf = await StudentPersonalMushaf.findOne({ studentId: ticket.studentId });
        
        if (!personalMushaf) {
          // Create new personal Mushaf if it doesn't exist
          personalMushaf = new StudentPersonalMushaf({
            studentId: ticket.studentId,
            studentName: ticket.studentName,
            mistakes: []
          });
        }
        
        // Add mistakes from ticket to personal Mushaf (avoid duplicates)
        const existingMistakeIds = new Set(personalMushaf.mistakes.map(m => m.id));
        
        ticket.mistakes.forEach(mistake => {
          // Only add if not already exists (check by id or by page/surah/ayah/wordIndex)
          const isDuplicate = existingMistakeIds.has(mistake.id) || 
            personalMushaf.mistakes.some(existing => 
              existing.page === mistake.page &&
              existing.surah === mistake.surah &&
              existing.ayah === mistake.ayah &&
              existing.wordIndex === mistake.wordIndex &&
              existing.type === mistake.type
            );
          
          if (!isDuplicate) {
            personalMushaf.mistakes.push({
              id: mistake.id || `mistake-${Date.now()}-${Math.random()}`,
              type: mistake.type,
              page: mistake.page,
              surah: mistake.surah,
              ayah: mistake.ayah,
              wordIndex: mistake.wordIndex,
              position: mistake.position,
              note: mistake.note,
              audioUrl: mistake.audioUrl,
              ticketId: ticket._id.toString(),
              workflowStep: ticket.type,
              markedBy: ticket.assignedTeacherId,
              markedByName: ticket.assignedTeacherName,
              timestamp: mistake.timestamp || new Date(),
              createdAt: new Date()
            });
            existingMistakeIds.add(mistake.id || `mistake-${Date.now()}-${Math.random()}`);
          }
        });
        
        await personalMushaf.save();
        console.log('✅ Synced mistakes to Personal Mushaf:', {
          studentId: ticket.studentId,
          mistakesAdded: ticket.mistakes.length,
          totalMistakes: personalMushaf.mistakes.length
        });
      } catch (personalMushafError) {
        console.error('⚠️ Error syncing to Personal Mushaf (non-critical):', personalMushafError);
        // Don't fail the whole operation if Personal Mushaf sync fails
      }
    }
    
    // Verify ticket was saved
    const savedTicket = await Ticket.findById(ticket._id);
    console.log('✅ Ticket saved. Verification:', {
      ticketId: savedTicket._id.toString(),
      sentToAssignmentId: savedTicket.sentToAssignmentId,
      status: savedTicket.status
    });

    // Convert Mongoose documents to plain objects to ensure all fields are included
    const ticketObj = ticket.toObject ? ticket.toObject() : ticket;
    const assignmentObj = assignment.toObject ? assignment.toObject() : assignment;
    
    const responseData = {
      ticket: ticketObj,
      assignment: {
        id: assignmentObj._id?.toString() || assignmentObj.id,
        classwork: {
          sabq: assignmentObj.classwork?.sabq?.length || 0,
          sabqi: assignmentObj.classwork?.sabqi?.length || 0,
          manzil: assignmentObj.classwork?.manzil?.length || 0
        }
      }
    };
    
    console.log('📤 Sending response with ticket:', {
      ticketId: ticketObj._id?.toString() || ticketObj.id,
      sentToAssignmentId: ticketObj.sentToAssignmentId,
      status: ticketObj.status
    });
    console.log('📤 Sending response with assignment:', {
      assignmentId: responseData.assignment.id,
      sabq: responseData.assignment.classwork.sabq,
      sabqi: responseData.assignment.classwork.sabqi,
      manzil: responseData.assignment.classwork.manzil
    });
    console.log('📤 Full response data:', JSON.stringify(responseData, null, 2));
    
    res.json(responseData);
  } catch (error) {
    console.error('❌ Error approving and sending ticket:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Ticket ID:', req.params.id);
    console.error('❌ Request body:', req.body);
    res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Admin reassigns ticket
app.post('/api/tickets/:id/reassign', async (req, res) => {
  try {
    const { teacherId, teacherName, reason } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Save previous teacher's work
    const previousMistakes = [...(ticket.mistakes || [])];
    const previousComment = ticket.teacherComment || '';
    
    // Update ticket
    ticket.status = 'reassigned';
    ticket.reassignedFromTeacherId = ticket.assignedTeacherId;
    ticket.reassignedFromTeacherName = ticket.assignedTeacherName;
    ticket.reassignedToTeacherId = teacherId;
    ticket.reassignedToTeacherName = teacherName;
    ticket.reassignmentReason = reason || '';
    ticket.previousTeacherComment = previousComment;
    ticket.previousMistakes = previousMistakes;
    ticket.assignedTeacherId = teacherId;
    ticket.assignedTeacherName = teacherName;
    ticket.teacherComment = ''; // Reset for new teacher
    ticket.mistakes = []; // Reset mistakes for new teacher
    ticket.reassignedAt = new Date();
    
    await ticket.save();
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete ticket
app.delete('/api/tickets/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json({ message: 'Ticket deleted successfully' });
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

// Get single notification by ID
app.get('/api/admin-notifications/:id', authenticateToken, async (req, res) => {
  try {
    const notification = await AdminNotification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(notification);
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

app.post('/api/admin-notifications', async (req, res) => {
  try {
    const notification = new AdminNotification(req.body);
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PUBLIC REGISTRATION ENDPOINT (No Auth Required)
// ============================================
app.post('/api/public/student-registration', async (req, res) => {
  try {
    const registrationData = req.body;

    // Validate required fields
    if (!registrationData.studentFullName || !registrationData.parentFullName || 
        !registrationData.parentEmail || !registrationData.parentPhone) {
      return res.status(400).json({ 
        error: 'Missing required fields: studentFullName, parentFullName, parentEmail, and parentPhone are required' 
      });
    }

    // Create notification for admin
    const notification = new AdminNotification({
      type: 'student_registration_request',
      title: 'New Student Registration Request',
      message: `${registrationData.parentFullName} submitted a registration request for ${registrationData.studentFullName}. Program: ${registrationData.program || 'Not specified'}`,
      studentId: null, // Will be set when student is created
      priority: 'high',
      read: false,
      // Store registration data in a custom field (we'll add this to schema)
      registrationData: registrationData
    });

    await notification.save();

    // Log the registration request (you might want to store this in a separate collection)
    console.log('📝 New student registration request:', {
      studentName: registrationData.studentFullName,
      parentName: registrationData.parentFullName,
      parentEmail: registrationData.parentEmail,
      program: registrationData.program,
      timestamp: new Date()
    });

    res.status(201).json({ 
      success: true,
      message: 'Registration request submitted successfully. We will review your application and contact you soon.',
      notificationId: notification._id
    });
  } catch (error) {
    console.error('❌ Error processing registration request:', error);
    res.status(500).json({ error: error.message || 'Failed to submit registration request' });
  }
});

// Listening Session Routes
app.get('/api/listening-sessions/live', async (req, res) => {
  try {
    const [activeSessions, recentSessions] = await Promise.all([
      getActiveListeningSessions(),
      getRecentListeningSessions(10)
    ]);

    res.json({
      active: activeSessions.map(serializeListeningSession),
      recent: recentSessions.map(serializeListeningSession)
    });
  } catch (error) {
    console.error('Error fetching listening sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/listening-sessions/stream', async (req, res) => {
  try {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write('\n');

    const clientId = Date.now().toString();
    const heartbeat = setInterval(() => {
      try {
        res.write(': keep-alive\n\n');
      } catch (err) {
        clearInterval(heartbeat);
        listeningSessionClients.delete(clientId);
      }
    }, 25000);

    listeningSessionClients.set(clientId, { res, heartbeat });

    const [activeSessions, recentSessions] = await Promise.all([
      getActiveListeningSessions(),
      getRecentListeningSessions(10)
    ]);
    const snapshot = {
      active: activeSessions.map(serializeListeningSession),
      recent: recentSessions.map(serializeListeningSession)
    };
    res.write(`event: session_snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`);

    req.on('close', () => {
      clearInterval(heartbeat);
      listeningSessionClients.delete(clientId);
    });
  } catch (error) {
    console.error('Error establishing listening session stream:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      try {
        res.write(`event: session_error\ndata: ${JSON.stringify({ message: error.message })}\n\n`);
      } finally {
        res.end();
      }
    }
  }
});

app.post('/api/listening-sessions/start', async (req, res) => {
  try {
    const {
      ticketId,
      studentId,
      studentName,
      teacherId,
      teacherName,
      workflowStep,
      startedAt,
      currentPage,
      currentSurah,
      currentAyah,
      currentSection
    } = req.body || {};

    if (!ticketId || !studentId || !studentName || !teacherId || !teacherName || !workflowStep) {
      return res.status(400).json({ error: 'ticketId, student, teacher, and workflowStep are required' });
    }

    // Check if a listening session already exists for this ticket
    // This prevents duplicate sessions from being created
    let session = await ListeningSession.findOne({ ticketId, status: 'in_progress' });
    if (!session) {
      // Also check if there's a session with the same ticketId even if status is different
      // This ensures we don't create duplicate sessions
      const existingSession = await ListeningSession.findOne({ ticketId });
      if (existingSession) {
        // Update existing session instead of creating a new one
        session = existingSession;
        console.log(`⚠️ Found existing session for ticket ${ticketId}, reusing instead of creating duplicate`);
      } else {
        // Create new session only if none exists
        session = new ListeningSession({
          ticketId,
          studentId,
          studentName,
          teacherId,
          teacherName,
          workflowStep
        });
        console.log(`✅ Created new listening session for ticket ${ticketId}`);
      }
    } else {
      // Update existing session with latest data
      session.studentId = studentId;
      session.studentName = studentName;
      session.teacherId = teacherId;
      session.teacherName = teacherName;
      session.workflowStep = workflowStep;
      console.log(`🔄 Updated existing listening session for ticket ${ticketId}`);
    }

    if (startedAt) {
      session.startedAt = new Date(startedAt);
    } else if (!session.startedAt) {
      session.startedAt = new Date();
    }

    session.status = 'in_progress';
    session.endedAt = null;
    session.lastHeartbeatAt = new Date();

    if (currentPage !== undefined) session.currentPage = currentPage;
    if (currentSurah !== undefined) session.currentSurah = currentSurah;
    if (currentAyah !== undefined) session.currentAyah = currentAyah;
    if (currentSection !== undefined) session.currentSection = currentSection;

    await session.save();

    const serialized = serializeListeningSession(session);
    broadcastListeningSessionEvent('session_started', serialized);

    res.status(201).json(serialized);
  } catch (error) {
    console.error('Error starting listening session:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/listening-sessions/:id', async (req, res) => {
  try {
    const session = await findListeningSessionByParam(req.params.id);

    if (!session) {
      return res.status(404).json({ error: 'Listening session not found' });
    }

    const {
      currentPage,
      currentSurah,
      currentAyah,
      currentSection,
      mistake,
      status
    } = req.body || {};

    if (currentPage !== undefined) session.currentPage = currentPage;
    if (currentSurah !== undefined) session.currentSurah = currentSurah;
    if (currentAyah !== undefined) session.currentAyah = currentAyah;
    if (currentSection !== undefined) session.currentSection = currentSection;
    if (status && ['in_progress', 'completed', 'abandoned'].includes(status)) {
      session.status = status;
    }

    if (mistake) {
      session.mistakes = session.mistakes || [];
      session.mistakes.push({
        id: mistake.id || new mongoose.Types.ObjectId().toString(),
        type: mistake.type,
        page: mistake.page,
        surah: mistake.surah,
        ayah: mistake.ayah,
        wordIndex: mistake.wordIndex,
        note: mistake.note,
        timestamp: mistake.timestamp ? new Date(mistake.timestamp) : new Date()
      });
      session.mistakeCount = (session.mistakeCount || 0) + 1;
      enforceMistakeHistoryLimit(session);
    }

    session.lastHeartbeatAt = new Date();

    await session.save();

    const serialized = serializeListeningSession(session);
    broadcastListeningSessionEvent('session_updated', serialized);

    res.json(serialized);
  } catch (error) {
    console.error('Error updating listening session:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/listening-sessions/:id/end', async (req, res) => {
  try {
    const session = await findListeningSessionByParam(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Listening session not found' });
    }

    const endedAt = req.body?.endedAt ? new Date(req.body.endedAt) : new Date();
    const nextStatus = req.body?.status === 'abandoned' ? 'abandoned' : 'completed';

    session.status = nextStatus;
    session.endedAt = endedAt;
    session.lastHeartbeatAt = endedAt;

    if (session.startedAt) {
      session.totalListeningSeconds = Math.max(
        0,
        Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000)
      );
    }

    await session.save();

    const serialized = serializeListeningSession(session);
    broadcastListeningSessionEvent('session_ended', serialized);

    res.json(serialized);
  } catch (error) {
    console.error('Error ending listening session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get historical sessions grouped by date
app.get('/api/listening-sessions/history', async (req, res) => {
  try {
    const { days = 30, date } = req.query;
    const limit = parseInt(days) * 50; // Rough estimate for sessions per day
    
    const sessions = await ListeningSession.find({
      status: { $in: ['completed', 'abandoned'] },
      ...(date ? {
        endedAt: {
          $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
          $lte: new Date(new Date(date).setHours(23, 59, 59, 999))
        }
      } : {
        endedAt: { $gte: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000) }
      })
    })
      .sort({ endedAt: -1 })
      .limit(limit);
    
    // Group by date
    const groupedByDate = {};
    sessions.forEach((session) => {
      const dateKey = session.endedAt ? new Date(session.endedAt).toISOString().split('T')[0] : 'unknown';
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(serializeListeningSession(session));
    });
    
    res.json(groupedByDate);
  } catch (error) {
    console.error('Error fetching listening session history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete listening session(s)
app.delete('/api/listening-sessions/:id', async (req, res) => {
  try {
    const session = await findListeningSessionByParam(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Listening session not found' });
    }
    
    await ListeningSession.findByIdAndDelete(session._id);
    broadcastListeningSessionEvent('session_deleted', { id: session._id.toString() });
    
    res.json({ success: true, id: session._id.toString() });
  } catch (error) {
    console.error('Error deleting listening session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete listening sessions by date
app.delete('/api/listening-sessions/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const result = await ListeningSession.deleteMany({
      status: { $in: ['completed', 'abandoned'] },
      endedAt: { $gte: startOfDay, $lte: endOfDay }
    });
    
    broadcastListeningSessionEvent('sessions_deleted', { date, count: result.deletedCount });
    
    res.json({ success: true, deletedCount: result.deletedCount, date });
  } catch (error) {
    console.error('Error deleting listening sessions by date:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ticket routes removed - system redesigned with different phases

// Get student's personal Mushaf (all historical mistakes)
app.get('/api/students/:studentId/personal-mushaf', async (req, res) => {
  try {
    const { studentId } = req.params;
    const personalMushaf = await StudentPersonalMushaf.findOne({ studentId });
    
    if (!personalMushaf) {
      return res.json({ studentId, studentName: '', mistakes: [] });
    }
    
    res.json(personalMushaf);
  } catch (error) {
    console.error('Error fetching personal Mushaf:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get student's personal Mushaf mistakes for a specific page/surah/ayah
app.get('/api/students/:studentId/personal-mushaf/filter', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page, surah, ayah } = req.query;
    
    const personalMushaf = await StudentPersonalMushaf.findOne({ studentId });
    
    if (!personalMushaf) {
      return res.json({ mistakes: [] });
    }
    
    let filteredMistakes = personalMushaf.mistakes;
    
    if (page) {
      filteredMistakes = filteredMistakes.filter((m) => m.page === parseInt(page));
    }
    if (surah) {
      filteredMistakes = filteredMistakes.filter((m) => m.surah === parseInt(surah));
    }
    if (ayah) {
      filteredMistakes = filteredMistakes.filter((m) => m.ayah === parseInt(ayah));
    }
    
    res.json({ mistakes: filteredMistakes });
  } catch (error) {
    console.error('Error filtering personal Mushaf:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add mistake to student's personal Mushaf
app.post('/api/students/:studentId/personal-mushaf/mistakes', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { mistake, markedBy, markedByName } = req.body;
    
    if (!mistake) {
      return res.status(400).json({ error: 'Mistake data is required' });
    }
    
    // Find or create personal Mushaf
    let personalMushaf = await StudentPersonalMushaf.findOne({ studentId });
    
    if (!personalMushaf) {
      // Get student name
      const student = await Student.findOne({ id: studentId });
      const studentName = student?.fullName || 'Unknown Student';
      
      personalMushaf = new StudentPersonalMushaf({
        studentId,
        studentName,
        mistakes: []
      });
    }
    
    // Check for duplicates (same page, surah, ayah, wordIndex, type)
    const isDuplicate = personalMushaf.mistakes.some(existing => 
      existing.page === mistake.page &&
      existing.surah === mistake.surah &&
      existing.ayah === mistake.ayah &&
      existing.wordIndex === mistake.wordIndex &&
      existing.type === mistake.type &&
      (mistake.letterIndex === undefined || existing.letterIndex === mistake.letterIndex)
    );
    
    if (isDuplicate) {
      return res.status(400).json({ error: 'This mistake already exists' });
    }
    
    // Create new mistake entry
    const newMistake = {
      id: mistake.id || `mistake-${Date.now()}-${Math.random()}`,
      type: mistake.type,
      page: mistake.page,
      surah: mistake.surah,
      ayah: mistake.ayah,
      wordIndex: mistake.wordIndex,
      letterIndex: mistake.letterIndex,
      position: mistake.position || { x: 50, y: 50 },
      note: mistake.note || '',
      audioUrl: mistake.audioUrl,
      ticketId: null, // Direct addition, not from ticket
      workflowStep: 'direct', // Mark as directly added
      markedBy: markedBy || null,
      markedByName: markedByName || null,
      timestamp: mistake.timestamp ? new Date(mistake.timestamp) : new Date(),
      createdAt: new Date()
    };
    
    personalMushaf.mistakes.push(newMistake);
    await personalMushaf.save();
    
    console.log('✅ Added mistake to Personal Mushaf:', {
      studentId,
      mistakeId: newMistake.id,
      type: newMistake.type,
      page: newMistake.page
    });
    
    res.json({ success: true, mistake: newMistake, personalMushaf });
  } catch (error) {
    console.error('Error adding mistake to personal Mushaf:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// WEEKLY EVALUATION API ENDPOINTS
// ============================================

// Create or update weekly evaluation (Teacher)
app.post('/api/weekly-evaluations', async (req, res) => {
  try {
    const {
      id,
      studentId,
      studentName,
      teacherId,
      teacherName,
      weekStartDate,
      weekEndDate,
      tajweedEvaluation,
      memoryEvaluation,
      mistakes,
      generalNotes,
      status
    } = req.body;

    if (!studentId || !teacherId || !weekStartDate || !weekEndDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let evaluation;
    if (id) {
      // Update existing evaluation
      evaluation = await WeeklyEvaluation.findOne({ id });
      if (!evaluation) {
        return res.status(404).json({ error: 'Evaluation not found' });
      }

      // Only allow updates if status is draft or feedback_provided
      if (!['draft', 'feedback_provided'].includes(evaluation.status)) {
        return res.status(400).json({ error: 'Cannot update evaluation in current status' });
      }

      evaluation.studentId = studentId;
      evaluation.studentName = studentName;
      evaluation.teacherId = teacherId;
      evaluation.teacherName = teacherName;
      evaluation.weekStartDate = new Date(weekStartDate);
      evaluation.weekEndDate = new Date(weekEndDate);
      evaluation.tajweedEvaluation = tajweedEvaluation || {};
      evaluation.memoryEvaluation = memoryEvaluation || {};
      evaluation.mistakes = mistakes || {};
      evaluation.generalNotes = generalNotes || '';
      evaluation.status = status || evaluation.status;

      if (status === 'resubmitted') {
        evaluation.resubmissionCount = (evaluation.resubmissionCount || 0) + 1;
        evaluation.status = 'under_review';
      } else if (status === 'submitted' && evaluation.status === 'draft') {
        evaluation.submittedAt = new Date();
        evaluation.status = 'under_review';
      }
    } else {
      // Create new evaluation
      evaluation = new WeeklyEvaluation({
        id: `WE${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        studentId,
        studentName,
        teacherId,
        teacherName,
        weekStartDate: new Date(weekStartDate),
        weekEndDate: new Date(weekEndDate),
        tajweedEvaluation: tajweedEvaluation || {},
        memoryEvaluation: memoryEvaluation || {},
        mistakes: mistakes || {},
        generalNotes: generalNotes || '',
        status: status || 'draft'
      });

      if (status === 'submitted') {
        evaluation.submittedAt = new Date();
        evaluation.status = 'under_review';
      }
    }

    await evaluation.save();
    res.json(evaluation);
  } catch (error) {
    console.error('Error saving weekly evaluation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get weekly evaluations for a student
app.get('/api/students/:studentId/weekly-evaluations', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status, teacherId } = req.query;

    const query = { studentId };
    if (status) query.status = status;
    if (teacherId) query.teacherId = teacherId;

    const evaluations = await WeeklyEvaluation.find(query).sort({ weekStartDate: -1 });
    res.json(evaluations);
  } catch (error) {
    console.error('Error fetching weekly evaluations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get weekly evaluations for a teacher
app.get('/api/teachers/:teacherId/weekly-evaluations', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { status } = req.query;

    const query = { teacherId };
    if (status) query.status = status;

    const evaluations = await WeeklyEvaluation.find(query).sort({ weekStartDate: -1 });
    res.json(evaluations);
  } catch (error) {
    console.error('Error fetching teacher weekly evaluations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all weekly evaluations (for super admin review)
app.get('/api/weekly-evaluations', async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    const evaluations = await WeeklyEvaluation.find(query)
      .sort({ submittedAt: -1, createdAt: -1 });
    res.json(evaluations);
  } catch (error) {
    console.error('Error fetching weekly evaluations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single weekly evaluation
app.get('/api/weekly-evaluations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const evaluation = await WeeklyEvaluation.findOne({ id });

    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    res.json(evaluation);
  } catch (error) {
    console.error('Error fetching weekly evaluation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Super Admin review: Provide feedback or approve
app.post('/api/weekly-evaluations/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, feedback, reviewedBy, reviewedByName } = req.body;

    if (!['approve', 'request_changes'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const evaluation = await WeeklyEvaluation.findOne({ id });
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    if (!['under_review', 'resubmitted'].includes(evaluation.status)) {
      return res.status(400).json({ error: 'Evaluation is not in reviewable status' });
    }

    evaluation.reviewedBy = reviewedBy;
    evaluation.reviewedByName = reviewedByName;
    evaluation.reviewedAt = new Date();

    if (action === 'approve') {
      evaluation.status = 'approved';
      evaluation.approvedAt = new Date();
      
      // Add to student's evaluations array
      const student = await Student.findOne({ id: evaluation.studentId });
      if (student) {
        const approvedEvaluation = {
          id: evaluation.id,
          date: evaluation.weekStartDate.toISOString().split('T')[0],
          category: 'Weekly Report',
          rating: Math.round((evaluation.tajweedEvaluation?.overallRating || 0 + evaluation.memoryEvaluation?.overallRating || 0) / 2),
          comments: `Tajweed: ${evaluation.tajweedEvaluation?.overallRating || 'N/A'}/10, Memory: ${evaluation.memoryEvaluation?.overallRating || 'N/A'}/10. ${evaluation.generalNotes || ''}`,
          evaluatedBy: evaluation.teacherId,
          weeklyEvaluationId: evaluation.id
        };

        student.evaluations = student.evaluations || [];
        student.evaluations.push(approvedEvaluation);
        await student.save();
      }
    } else if (action === 'request_changes') {
      evaluation.status = 'feedback_provided';
      evaluation.adminFeedback = feedback || '';
      
      // Add to previous feedback history
      evaluation.previousFeedback = evaluation.previousFeedback || [];
      evaluation.previousFeedback.push({
        feedback: feedback || '',
        providedBy: reviewedBy,
        providedByName: reviewedByName,
        providedAt: new Date()
      });
    }

    await evaluation.save();
    res.json(evaluation);
  } catch (error) {
    console.error('Error reviewing weekly evaluation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete weekly evaluation (only if draft)
app.delete('/api/weekly-evaluations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const evaluation = await WeeklyEvaluation.findOne({ id });

    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    if (evaluation.status !== 'draft') {
      return res.status(400).json({ error: 'Can only delete draft evaluations' });
    }

    await WeeklyEvaluation.deleteOne({ id });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting weekly evaluation:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AI SUGGESTIONS API ENDPOINTS
// ============================================

// Get AI suggestions for a specific field
app.post('/api/ai/suggestions', async (req, res) => {
  try {
    const { fieldType, context, studentName, currentValue } = req.body;

    // Predefined suggestions based on field type
    const suggestions = {
      tajweedStrengths: [
        'Excellent pronunciation of Arabic letters',
        'Good application of tajweed rules',
        'Clear articulation of sounds',
        'Proper elongation (madd) application',
        'Good understanding of ikhfa rules',
        'Consistent application of ghunna',
        'Proper handling of heavy and light letters',
        'Good rhythm and flow in recitation'
      ],
      tajweedAreasForImprovement: [
        'Needs practice with madd (elongation) rules',
        'Work on ikhfa pronunciation',
        'Improve ghunna application',
        'Focus on heavy letter pronunciation',
        'Practice proper stopping and starting',
        'Work on letter articulation clarity',
        'Improve rhythm and pacing',
        'Focus on specific tajweed rules'
      ],
      tajweedSpecificNotes: [
        'Student shows good progress in basic tajweed rules',
        'Needs more practice with advanced tajweed concepts',
        'Demonstrates understanding but needs consistency',
        'Excellent foundation, ready for more complex rules',
        'Requires focused practice on specific areas',
        'Shows improvement week over week',
        'Needs reinforcement of fundamental rules'
      ],
      memoryMemorizedPages: [
        'Memorized pages X to Y this week',
        'Completed memorization of specific surah',
        'Reviewed previously memorized pages',
        'Made progress on new memorization',
        'Focused on retention of previous work',
        'Combined new and review memorization'
      ],
      memoryRetentionQuality: [
        'Excellent retention of previously memorized material',
        'Good recall with minimal mistakes',
        'Needs occasional review to maintain retention',
        'Strong memory, consistent performance',
        'Requires regular review sessions',
        'Shows improvement in retention over time'
      ],
      memorySpecificNotes: [
        'Student demonstrates strong memorization ability',
        'Needs more frequent review sessions',
        'Shows good progress in memorization speed',
        'Requires focus on accuracy over speed',
        'Excellent retention of long-term memorization',
        'Needs structured review schedule'
      ],
      mistakesHowFixed: [
        'Worked through mistakes one-on-one during session',
        'Provided additional practice exercises',
        'Used repetition and correction technique',
        'Demonstrated correct pronunciation multiple times',
        'Created practice drills for specific mistakes',
        'Used visual aids and examples',
        'Provided audio recordings for practice'
      ],
      mistakesImprovement: [
        'Shows significant improvement in mistake reduction',
        'Student is more aware of common mistakes',
        'Demonstrates self-correction ability',
        'Needs continued practice to eliminate mistakes',
        'Shows progress but requires more time',
        'Excellent response to correction techniques'
      ],
      generalNotes: [
        'Overall good progress this week',
        'Student is engaged and motivated',
        'Requires additional support in specific areas',
        'Shows consistent improvement',
        'Needs more practice time',
        'Excellent attitude and effort',
        'Ready for next level of challenges'
      ]
    };

    // Get suggestions for the field type
    const fieldSuggestions = suggestions[fieldType] || [];

    // If OpenAI API key is available, enhance suggestions
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey && context) {
      try {
        // You can integrate OpenAI here for dynamic suggestions
        // For now, return predefined suggestions
      } catch (error) {
        console.warn('OpenAI API not available, using predefined suggestions');
      }
    }

    res.json({ suggestions: fieldSuggestions });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI Summarize evaluation
app.post('/api/ai/summarize', async (req, res) => {
  try {
    const { evaluationData, studentName } = req.body;

    // Create a summary from the evaluation data
    let summary = `Weekly Evaluation Summary for ${studentName}\n\n`;
    
    summary += `Tajweed Evaluation:\n`;
    summary += `- Overall Rating: ${evaluationData.tajweedEvaluation?.overallRating || 'N/A'}/10\n`;
    if (evaluationData.tajweedEvaluation?.strengths) {
      summary += `- Strengths: ${evaluationData.tajweedEvaluation.strengths}\n`;
    }
    if (evaluationData.tajweedEvaluation?.areasForImprovement) {
      summary += `- Areas for Improvement: ${evaluationData.tajweedEvaluation.areasForImprovement}\n`;
    }
    
    summary += `\nMemory Evaluation:\n`;
    summary += `- Overall Rating: ${evaluationData.memoryEvaluation?.overallRating || 'N/A'}/10\n`;
    if (evaluationData.memoryEvaluation?.memorizedPages) {
      summary += `- Memorized: ${evaluationData.memoryEvaluation.memorizedPages}\n`;
    }
    if (evaluationData.memoryEvaluation?.retentionQuality) {
      summary += `- Retention Quality: ${evaluationData.memoryEvaluation.retentionQuality}\n`;
    }
    
    if (evaluationData.mistakes?.mistakesMade?.length > 0) {
      summary += `\nMistakes Identified:\n`;
      evaluationData.mistakes.mistakesMade.forEach((mistake, index) => {
        summary += `${index + 1}. ${mistake.type}: ${mistake.description} (Location: ${mistake.location}, Frequency: ${mistake.frequency})\n`;
      });
    }
    
    if (evaluationData.mistakes?.howFixed) {
      summary += `\nHow Mistakes Were Fixed: ${evaluationData.mistakes.howFixed}\n`;
    }
    
    if (evaluationData.mistakes?.improvement) {
      summary += `Improvement: ${evaluationData.mistakes.improvement}\n`;
    }
    
    if (evaluationData.generalNotes) {
      summary += `\nGeneral Notes: ${evaluationData.generalNotes}\n`;
    }

    // If OpenAI API key is available, use it for better summarization
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      try {
        // You can integrate OpenAI here for AI-powered summarization
        // For now, return the structured summary
      } catch (error) {
        console.warn('OpenAI API not available, using basic summary');
      }
    }

    res.json({ summary });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// MISTAKE LIBRARY API ENDPOINTS
// ============================================

// Get all mistake library entries
app.get('/api/mistake-library', async (req, res) => {
  try {
    const { category, search, tag } = req.query;
    const query = {};

    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (search) {
      query.$text = { $search: search };
    }

    const entries = await MistakeLibrary.find(query)
      .sort(search ? { score: { $meta: 'textScore' } } : { usageCount: -1, createdAt: -1 });
    
    res.json(entries);
  } catch (error) {
    console.error('Error fetching mistake library:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single mistake library entry
app.get('/api/mistake-library/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await MistakeLibrary.findOne({ id });

    if (!entry) {
      return res.status(404).json({ error: 'Mistake library entry not found' });
    }

    res.json(entry);
  } catch (error) {
    console.error('Error fetching mistake library entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create mistake library entry
app.post('/api/mistake-library', async (req, res) => {
  try {
    const {
      category,
      title,
      description,
      mistake,
      howToFix,
      examples,
      tips,
      relatedMistakes,
      tags,
      createdBy,
      createdByName,
      isPublic
    } = req.body;

    if (!category || !title || !mistake || !howToFix) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const entry = new MistakeLibrary({
      id: `ML${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category,
      title,
      description: description || '',
      mistake,
      howToFix,
      examples: examples || [],
      tips: tips || [],
      relatedMistakes: relatedMistakes || [],
      tags: tags || [],
      createdBy: createdBy || '',
      createdByName: createdByName || '',
      isPublic: isPublic !== undefined ? isPublic : true
    });

    await entry.save();
    res.json(entry);
  } catch (error) {
    console.error('Error creating mistake library entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update mistake library entry
app.put('/api/mistake-library/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await MistakeLibrary.findOne({ id });

    if (!entry) {
      return res.status(404).json({ error: 'Mistake library entry not found' });
    }

    const {
      category,
      title,
      description,
      mistake,
      howToFix,
      examples,
      tips,
      relatedMistakes,
      tags,
      isPublic
    } = req.body;

    if (category) entry.category = category;
    if (title) entry.title = title;
    if (description !== undefined) entry.description = description;
    if (mistake) entry.mistake = mistake;
    if (howToFix) entry.howToFix = howToFix;
    if (examples) entry.examples = examples;
    if (tips) entry.tips = tips;
    if (relatedMistakes) entry.relatedMistakes = relatedMistakes;
    if (tags) entry.tags = tags;
    if (isPublic !== undefined) entry.isPublic = isPublic;

    await entry.save();
    res.json(entry);
  } catch (error) {
    console.error('Error updating mistake library entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete mistake library entry
app.delete('/api/mistake-library/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await MistakeLibrary.findOne({ id });

    if (!entry) {
      return res.status(404).json({ error: 'Mistake library entry not found' });
    }

    await MistakeLibrary.deleteOne({ id });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting mistake library entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Increment usage count (when used in evaluation)
app.post('/api/mistake-library/:id/use', async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await MistakeLibrary.findOne({ id });

    if (!entry) {
      return res.status(404).json({ error: 'Mistake library entry not found' });
    }

    entry.usageCount = (entry.usageCount || 0) + 1;
    entry.lastUsed = new Date();
    await entry.save();

    res.json(entry);
  } catch (error) {
    console.error('Error updating usage count:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export mistake library as report (JSON/CSV)
app.get('/api/mistake-library/export/:format', async (req, res) => {
  try {
    const { format } = req.params;
    const { category, tag } = req.query;
    const query = { isPublic: true };

    if (category) query.category = category;
    if (tag) query.tags = tag;

    const entries = await MistakeLibrary.find(query).sort({ category: 1, title: 1 });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=mistake-library.json');
      res.json(entries);
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=mistake-library.csv');
      
      // CSV header
      let csv = 'Category,Title,Mistake,How to Fix,Description,Tips,Tags\n';
      
      entries.forEach(entry => {
        const escapeCsv = (str) => {
          if (!str) return '';
          return `"${str.replace(/"/g, '""')}"`;
        };
        
        csv += [
          entry.category,
          entry.title,
          entry.mistake,
          entry.howToFix,
          entry.description || '',
          entry.tips.join('; ') || '',
          entry.tags.join(', ') || ''
        ].map(escapeCsv).join(',') + '\n';
      });
      
      res.send(csv);
    } else {
      res.status(400).json({ error: 'Invalid format. Use json or csv' });
    }
  } catch (error) {
    console.error('Error exporting mistake library:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AI PHRASE LIBRARY API ENDPOINTS
// ============================================

// Get all categories (all users can view)
app.get('/api/ai/phrases/categories', async (req, res) => {
  try {
    const categories = await AiPhraseCategory.find({}).sort({ displayName: 1 });
    
    // Get phrase count for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const count = await AiPhrase.countDocuments({ category: cat.name, isActive: true });
        return {
          ...cat.toObject(),
          phraseCount: count
        };
      })
    );
    
    res.json(categoriesWithCounts);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create category (Super Admin only)
app.post('/api/ai/phrases/categories', async (req, res) => {
  try {
    const { name, displayName, description, createdBy, createdByName } = req.body;

    if (!name || !displayName) {
      return res.status(400).json({ error: 'Category name and display name are required' });
    }

    // Check if category already exists
    const existing = await AiPhraseCategory.findOne({ name });
    if (existing) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    // Use provided values or defaults
    const category = new AiPhraseCategory({
      name,
      displayName,
      description: description || '',
      createdBy: createdBy || 'system',
      createdByName: createdByName || 'System'
    });

    await category.save();
    res.json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update category (Super Admin only)
app.put('/api/ai/phrases/categories/:name', async (req, res) => {
  try {
    let { name } = req.params;
    const { displayName, description } = req.body;
    
    // Decode URL-encoded category name
    name = decodeURIComponent(name);
    
    // Try to find by name first
    let category = await AiPhraseCategory.findOne({ name });
    
    // If not found by name, try to find by displayName
    if (!category) {
      category = await AiPhraseCategory.findOne({ displayName: name });
      if (category) {
        name = category.name;
      }
    }
    
    if (!category) {
      return res.status(404).json({ error: `Category "${name}" not found` });
    }

    if (category.isSystem) {
      return res.status(400).json({ error: 'Cannot edit system category' });
    }

    if (displayName) category.displayName = displayName;
    if (description !== undefined) category.description = description;

    await category.save();
    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete category (Super Admin only, and only if no phrases exist)
app.delete('/api/ai/phrases/categories/:name', async (req, res) => {
  try {
    let { name } = req.params;
    
    // Decode URL-encoded category name
    name = decodeURIComponent(name);
    
    // Try to find by name first
    let category = await AiPhraseCategory.findOne({ name });
    
    // If not found by name, try to find by displayName (for backwards compatibility)
    if (!category) {
      category = await AiPhraseCategory.findOne({ displayName: name });
      if (category) {
        name = category.name; // Use the actual name field
      }
    }
    
    if (!category) {
      return res.status(404).json({ error: `Category "${name}" not found` });
    }

    if (category.isSystem) {
      return res.status(400).json({ error: 'Cannot delete system category' });
    }

    // Check if category has phrases
    const phraseCount = await AiPhrase.countDocuments({ category: category.name });
    if (phraseCount > 0) {
      return res.status(400).json({ error: `Cannot delete category with ${phraseCount} phrase(s). Delete phrases first.` });
    }

    await AiPhraseCategory.deleteOne({ _id: category._id });
    res.json({ success: true, message: `Category "${category.displayName}" deleted successfully` });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get phrases (with optional category filter)
app.get('/api/ai/phrases', async (req, res) => {
  try {
    const { category, search, limit = 100 } = req.query;
    const query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { phrase: { $regex: search, $options: 'i' } }
      ];
    }

    const phrases = await AiPhrase.find(query)
      .sort({ usageCount: -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.json(phrases);
  } catch (error) {
    console.error('Error fetching phrases:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to initialize AI Library if needed
async function initializeAiLibraryIfNeeded() {
  try {
    const categoryCount = await AiPhraseCategory.countDocuments();
    if (categoryCount === 0) {
      console.log('🔧 Auto-initializing AI Phrase categories (on-demand)...');
      const defaultCategories = [
        { name: 'progress_report', displayName: 'Progress Report', description: 'Phrases for student progress reports', isSystem: true },
        { name: 'evaluation', displayName: 'Evaluation', description: 'Phrases for student evaluations', isSystem: true },
        { name: 'attendance', displayName: 'Attendance', description: 'Phrases for attendance notes', isSystem: true },
        { name: 'general', displayName: 'General', description: 'General purpose phrases', isSystem: true },
        { name: 'tajweed', displayName: 'Tajweed', description: 'Tajweed-related phrases', isSystem: true },
        { name: 'memory', displayName: 'Memory', description: 'Memory-related phrases', isSystem: true },
        { name: 'mistakes', displayName: 'Mistakes', description: 'Mistake-related phrases', isSystem: true }
      ];

      const created = [];
      for (const cat of defaultCategories) {
        const existing = await AiPhraseCategory.findOne({ name: cat.name });
        if (!existing) {
          const category = new AiPhraseCategory({
            ...cat,
            createdBy: 'system',
            createdByName: 'System'
          });
          await category.save();
          created.push(category);
        }
      }

      // Add default phrases to general category
      const generalCategory = await AiPhraseCategory.findOne({ name: 'general' });
      if (generalCategory) {
        const defaultPhrases = [
          'Please complete the assignment',
          'Review the material carefully',
          'Practice regularly',
          'Focus on accuracy',
          'Take your time',
          'Ask questions if needed',
          'Good progress',
          'Keep up the good work',
          'Needs more practice',
          'Excellent effort',
          'Well done',
          'Continue practicing',
          'Pay attention to details',
          'Work on pronunciation',
          'Memorize thoroughly'
        ];

        let phraseCount = 0;
        for (const phraseText of defaultPhrases) {
          const existing = await AiPhrase.findOne({ phrase: phraseText, category: 'general' });
          if (!existing) {
            const phrase = new AiPhrase({
              phrase: phraseText,
              category: 'general',
              createdBy: 'system',
              createdByName: 'System',
              isActive: true
            });
            await phrase.save();
            phraseCount++;
          }
        }

        // Update category phrase count
        if (phraseCount > 0) {
          await AiPhraseCategory.updateOne(
            { name: 'general' },
            { $inc: { phraseCount: phraseCount } }
          );
        }

        console.log(`✅ Auto-initialized (on-demand): ${created.length} categories and ${phraseCount} default phrases`);
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('⚠️  Error auto-initializing AI Phrase categories:', error.message);
    return false;
  }
}

// Get suggestions based on category and query (fuzzy match)
app.get('/api/ai/suggestions', async (req, res) => {
  try {
    const { category, query: searchQuery } = req.query;

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    // Auto-initialize if no categories exist
    const totalCategories = await AiPhraseCategory.countDocuments();
    if (totalCategories === 0) {
      console.log(`[AI Suggestions] No categories found, initializing...`);
      await initializeAiLibraryIfNeeded();
    } else {
      // Check if this specific category has no phrases
      const phraseCount = await AiPhrase.countDocuments({ category, isActive: true });
      if (phraseCount === 0 && category === 'general') {
        // Add default phrases to general category if it's empty
        console.log(`[AI Suggestions] General category is empty, adding default phrases...`);
        const generalCategory = await AiPhraseCategory.findOne({ name: 'general' });
        if (generalCategory) {
          const defaultPhrases = [
            'Please complete the assignment',
            'Review the material carefully',
            'Practice regularly',
            'Focus on accuracy',
            'Take your time',
            'Ask questions if needed',
            'Good progress',
            'Keep up the good work',
            'Needs more practice',
            'Excellent effort',
            'Well done',
            'Continue practicing',
            'Pay attention to details',
            'Work on pronunciation',
            'Memorize thoroughly'
          ];

          let phraseCount = 0;
          for (const phraseText of defaultPhrases) {
            const existing = await AiPhrase.findOne({ phrase: phraseText, category: 'general' });
            if (!existing) {
              const phrase = new AiPhrase({
                phrase: phraseText,
                category: 'general',
                createdBy: 'system',
                createdByName: 'System',
                isActive: true
              });
              await phrase.save();
              phraseCount++;
            }
          }

          if (phraseCount > 0) {
            await AiPhraseCategory.updateOne(
              { name: 'general' },
              { $inc: { phraseCount: phraseCount } }
            );
            console.log(`[AI Suggestions] Added ${phraseCount} default phrases to general category`);
          }
        }
      }
    }

    const query = {
      category,
      isActive: true
    };

    // Fuzzy matching: if searchQuery provided, find phrases that contain it
    if (searchQuery && searchQuery.trim()) {
      const searchTerm = searchQuery.trim();
      query.phrase = { $regex: searchTerm, $options: 'i' };
    }

    // Debug: Log query and count
    const totalCount = await AiPhrase.countDocuments(query);
    console.log(`[AI Suggestions] Category: ${category}, Query: "${searchQuery || ''}", Total matches: ${totalCount}`);

    // Get phrases, prioritize by usage count and recent usage
    const phrases = await AiPhrase.find(query)
      .sort({
        usageCount: -1,
        lastUsed: -1,
        createdAt: -1
      })
      .limit(10);

    const result = phrases.map(p => ({
      id: p._id,
      phrase: p.phrase,
      category: p.category,
      usageCount: p.usageCount
    }));

    console.log(`[AI Suggestions] Returning ${result.length} phrases for category "${category}"`);
    res.json(result);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create phrase (Super Admin + Admin)
app.post('/api/ai/phrases', async (req, res) => {
  try {
    const { phrase, category, createdBy, createdByName } = req.body;

    console.log('[Create Phrase] Request body:', { phrase, category, createdBy, createdByName });

    if (!phrase || !category) {
      console.error('[Create Phrase] Missing required fields:', { phrase: !!phrase, category: !!category });
      return res.status(400).json({ error: 'Phrase and category are required' });
    }

    // Verify category exists, if not, create it (for system categories)
    let categoryExists = await AiPhraseCategory.findOne({ name: category });
    if (!categoryExists) {
      // Try to find by displayName
      categoryExists = await AiPhraseCategory.findOne({ displayName: category });
      if (!categoryExists) {
        // Auto-create general category if it doesn't exist
        if (category === 'general') {
          console.log('[Create Phrase] Auto-creating general category...');
          categoryExists = new AiPhraseCategory({
            name: 'general',
            displayName: 'General',
            description: 'General purpose phrases',
            isSystem: true,
            createdBy: 'system',
            createdByName: 'System'
          });
          await categoryExists.save();
        } else {
          console.error('[Create Phrase] Category does not exist:', category);
          return res.status(400).json({ error: `Category "${category}" does not exist. Please create it first.` });
        }
      }
    }

    // Check for duplicates (same phrase in same category, including inactive ones)
    const existing = await AiPhrase.findOne({ 
      phrase: phrase.trim(), 
      category: categoryExists.name 
    });
    
    if (existing) {
      // If exists but inactive, reactivate it
      if (!existing.isActive) {
        existing.isActive = true;
        await existing.save();
        console.log('[Create Phrase] Reactivated existing phrase');
        return res.json(existing);
      }
      // If exists and active, just return it (no error)
      console.log('[Create Phrase] Phrase already exists, returning existing phrase');
      return res.json(existing);
    }

    const aiPhrase = new AiPhrase({
      phrase: phrase.trim(),
      category: categoryExists.name, // Use the actual category name from DB
      createdBy: createdBy || 'system',
      createdByName: createdByName || 'System',
      isActive: true
    });

    await aiPhrase.save();

    // Update category phrase count
    await AiPhraseCategory.updateOne(
      { name: categoryExists.name },
      { $inc: { phraseCount: 1 } }
    );

    console.log('[Create Phrase] Successfully created phrase:', aiPhrase._id);
    res.json(aiPhrase);
  } catch (error) {
    console.error('[Create Phrase] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update phrase (Super Admin + Admin)
app.put('/api/ai/phrases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { phrase, category } = req.body;

    const aiPhrase = await AiPhrase.findById(id);
    if (!aiPhrase) {
      return res.status(404).json({ error: 'Phrase not found' });
    }

    const oldCategory = aiPhrase.category;

    if (phrase) aiPhrase.phrase = phrase.trim();
    if (category) {
      // Verify new category exists
      const categoryExists = await AiPhraseCategory.findOne({ name: category });
      if (!categoryExists) {
        return res.status(400).json({ error: 'Category does not exist' });
      }
      aiPhrase.category = category;
    }

    await aiPhrase.save();

    // Update category counts if category changed
    if (category && category !== oldCategory) {
      await AiPhraseCategory.updateOne(
        { name: oldCategory },
        { $inc: { phraseCount: -1 } }
      );
      await AiPhraseCategory.updateOne(
        { name: category },
        { $inc: { phraseCount: 1 } }
      );
    }

    res.json(aiPhrase);
  } catch (error) {
    console.error('Error updating phrase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete phrase (Super Admin + Admin)
app.delete('/api/ai/phrases/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const aiPhrase = await AiPhrase.findById(id);
    if (!aiPhrase) {
      return res.status(404).json({ error: 'Phrase not found' });
    }

    const category = aiPhrase.category;

    // Soft delete (set isActive to false)
    aiPhrase.isActive = false;
    await aiPhrase.save();

    // Update category phrase count
    await AiPhraseCategory.updateOne(
      { name: category },
      { $inc: { phraseCount: -1 } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting phrase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Track phrase usage (when a phrase is selected)
app.post('/api/ai/phrases/:id/use', async (req, res) => {
  try {
    const { id } = req.params;

    const aiPhrase = await AiPhrase.findById(id);
    if (!aiPhrase) {
      return res.status(404).json({ error: 'Phrase not found' });
    }

    aiPhrase.usageCount = (aiPhrase.usageCount || 0) + 1;
    aiPhrase.lastUsed = new Date();
    await aiPhrase.save();

    res.json(aiPhrase);
  } catch (error) {
    console.error('Error tracking usage:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize default categories (run once)
app.post('/api/ai/phrases/init-categories', async (req, res) => {
  try {
    const defaultCategories = [
      { name: 'progress_report', displayName: 'Progress Report', description: 'Phrases for student progress reports', isSystem: true },
      { name: 'evaluation', displayName: 'Evaluation', description: 'Phrases for student evaluations', isSystem: true },
      { name: 'attendance', displayName: 'Attendance', description: 'Phrases for attendance notes', isSystem: true },
      { name: 'general', displayName: 'General', description: 'General purpose phrases', isSystem: true },
      { name: 'tajweed', displayName: 'Tajweed', description: 'Tajweed-related phrases', isSystem: true },
      { name: 'memory', displayName: 'Memory', description: 'Memory-related phrases', isSystem: true },
      { name: 'mistakes', displayName: 'Mistakes', description: 'Mistake-related phrases', isSystem: true }
    ];

    const created = [];
    for (const cat of defaultCategories) {
      const existing = await AiPhraseCategory.findOne({ name: cat.name });
      if (!existing) {
        const category = new AiPhraseCategory({
          ...cat,
          createdBy: 'system',
          createdByName: 'System'
        });
        await category.save();
        created.push(category);
      }
    }

    // Also add default phrases to general category
    const generalCategory = await AiPhraseCategory.findOne({ name: 'general' });
    if (generalCategory) {
      const defaultPhrases = [
        'Please complete the assignment',
        'Review the material carefully',
        'Practice regularly',
        'Focus on accuracy',
        'Take your time',
        'Ask questions if needed',
        'Good progress',
        'Keep up the good work',
        'Needs more practice',
        'Excellent effort',
        'Well done',
        'Continue practicing',
        'Pay attention to details',
        'Work on pronunciation',
        'Memorize thoroughly'
      ];

      let phraseCount = 0;
      for (const phraseText of defaultPhrases) {
        const existing = await AiPhrase.findOne({ phrase: phraseText, category: 'general' });
        if (!existing) {
          const phrase = new AiPhrase({
            phrase: phraseText,
            category: 'general',
            createdBy: 'system',
            createdByName: 'System',
            isActive: true
          });
          await phrase.save();
          phraseCount++;
        }
      }

      // Update category phrase count
      if (phraseCount > 0) {
        await AiPhraseCategory.updateOne(
          { name: 'general' },
          { $inc: { phraseCount: phraseCount } }
        );
      }

      res.json({ 
        message: `Initialized ${created.length} categories and ${phraseCount} default phrases`, 
        created,
        phrasesAdded: phraseCount
      });
    } else {
      res.json({ message: `Initialized ${created.length} categories`, created });
    }
  } catch (error) {
    console.error('Error initializing categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Local SQLite Database for Quran pages
let quranDb = null;
let nastaleeqDb = null;
let qpcV4Db = null;

if (Database) {
try {
    const quranDbPath = path.join(__dirname, 'qpc-hafs-15-lines.db');
    if (fs.existsSync(quranDbPath)) {
  quranDb = new Database(quranDbPath, { readonly: true });
  console.log('✅ Connected to local Quran database (qpc-hafs-15-lines.db)');
    } else {
      console.warn('⚠️  Quran database file not found:', quranDbPath);
    }
} catch (error) {
  console.warn('⚠️ Could not connect to local Quran database:', error.message);
  console.log('   Continuing with Quran Foundation API only...');
}

// Local SQLite Database for Quran text (Nastaleeq)
try {
    const nastaleeqDbPath = path.join(__dirname, 'qpc-nastaleeq.db');
    if (fs.existsSync(nastaleeqDbPath)) {
  nastaleeqDb = new Database(nastaleeqDbPath, { readonly: true });
  console.log('✅ Connected to local Quran text database (qpc-nastaleeq.db)');
    } else {
      console.warn('⚠️  Nastaleeq database file not found:', nastaleeqDbPath);
    }
} catch (error) {
  console.warn('⚠️ Could not connect to local Quran text database:', error.message);
  console.log('   Continuing with Quran Foundation API only...');
}

// Local SQLite Database for Quran text (QPC V4)
try {
    const qpcV4DbPath = path.join(__dirname, 'qpc-v4.db');
    if (fs.existsSync(qpcV4DbPath)) {
  qpcV4Db = new Database(qpcV4DbPath, { readonly: true });
  console.log('✅ Connected to local Quran text database (qpc-v4.db)');
    } else {
      console.warn('⚠️  QPC V4 database file not found:', qpcV4DbPath);
    }
} catch (error) {
  console.warn('⚠️ Could not connect to local Quran text database (qpc-v4.db):', error.message);
  }
} else {
  console.warn('⚠️  SQLite support disabled - better-sqlite3 not available');
  console.warn('   All database operations will use MongoDB and external APIs');
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

// Get page info from MongoDB
async function getPageInfoFromDb(pageNumber) {
  try {
    const pageLines = await QuranPage.find({ page_number: pageNumber })
      .sort({ line_number: 1 })
      .lean();
    
    if (!pageLines || pageLines.length === 0) {
      return null;
    }
    
    const surahs = [...new Set(pageLines
      .map(l => l.surah_number)
      .filter(s => s !== null && s !== undefined)
      .map(s => parseInt(s))
      .filter(s => !isNaN(s))
    )];
    
    return {
      pageNumber,
      surahs: surahs,
      lines: pageLines.length,
      lineData: pageLines
    };
  } catch (error) {
    console.error(`Error getting page info from MongoDB for page ${pageNumber}:`, error.message);
    return null;
  }
}

// Get surah info from MongoDB
async function getSurahInfoFromDb(surahId) {
  try {
    const pageNumbers = await QuranPage.distinct('page_number', { surah_number: surahId });
    
    if (!pageNumbers || pageNumbers.length === 0) {
      return null;
    }
    
    const sortedPages = pageNumbers.sort((a, b) => a - b);
    return {
      surahId,
      pages: sortedPages,
      firstPage: sortedPages[0] || null,
      lastPage: sortedPages[sortedPages.length - 1] || null
    };
  } catch (error) {
    console.error(`Error getting surah info from MongoDB for surah ${surahId}:`, error.message);
    return null;
  }
}

// Get all surahs from MongoDB
async function getAllSurahsFromDb() {
  try {
    const surahs = await QuranPage.distinct('surah_number', {
      surah_number: { $ne: null, $exists: true }
    });
    
    return surahs
      .map(s => parseInt(s))
      .filter(s => !isNaN(s) && s > 0)
      .sort((a, b) => a - b);
  } catch (error) {
    console.error('Error getting all surahs from MongoDB:', error.message);
    return [];
  }
}

// Get verses from MongoDB (with version selection)
async function getVersesFromQuranDb(surahId, pageNumber = null, version = 'nastaleeq') {
  try {
    let query = { version };
    
    if (surahId) {
      query.surah = surahId;
    } else if (pageNumber) {
      query.page_number = pageNumber;
    } else {
      return null;
    }
    
    const words = await QuranWord.find(query)
      .sort({ surah: 1, ayah: 1, word: 1 })
      .lean();
    
    if (!words || words.length === 0) {
      return null;
    }
    
    // Group words by ayah
    const versesMap = new Map();
    
    words.forEach(word => {
      const key = `${word.surah}:${word.ayah}`;
      if (!versesMap.has(key)) {
        versesMap.set(key, {
          surah: word.surah,
          ayah: word.ayah,
          words: []
        });
      }
      versesMap.get(key).words.push(word.text);
    });
    
    // Convert to verse format
    const verses = Array.from(versesMap.values()).map((verse, idx) => ({
      id: idx + 1,
      chapter_id: verse.surah,
      verse_number: verse.ayah,
      verse_key: `${verse.surah}:${verse.ayah}`,
      text_uthmani: verse.words.join(' '),
      text_simple: verse.words.join(' '),
      text: verse.words.join(' ')
    }));
    
    return verses;
  } catch (error) {
    console.error(`Error getting verses from MongoDB (${version}):`, error.message);
    return null;
  }
}

// Legacy function for backward compatibility
function getVersesFromNastaleeqDb(surahId, pageNumber = null) {
  return getVersesFromQuranDb(surahId, pageNumber, 'nastaleeq');
}

// Get verses for a page using MongoDB
async function getPageVersesFromLocalDb(pageNumber, version = 'nastaleeq') {
  try {
    // Get surahs on this page from MongoDB
    const pageInfo = await getPageInfoFromDb(pageNumber);
    if (!pageInfo || pageInfo.surahs.length === 0) return null;
    
    // Get words for this page directly from MongoDB
    const words = await QuranWord.find({ 
      page_number: pageNumber,
      version: version 
    })
      .sort({ surah: 1, ayah: 1, word: 1 })
      .lean();
    
    if (!words || words.length === 0) {
      // Fallback: get verses from the first surah on the page
    const mainSurah = pageInfo.surahs[0];
      return await getVersesFromQuranDb(mainSurah, null, version);
    }
    
    // Group words by ayah
    const versesMap = new Map();
    words.forEach(word => {
      const key = `${word.surah}:${word.ayah}`;
      if (!versesMap.has(key)) {
        versesMap.set(key, {
          surah: word.surah,
          ayah: word.ayah,
          words: []
        });
      }
      versesMap.get(key).words.push(word.text);
    });
    
    // Convert to verse format
    const verses = Array.from(versesMap.values()).map((verse, idx) => ({
      id: idx + 1,
      chapter_id: verse.surah,
      verse_number: verse.ayah,
      verse_key: `${verse.surah}:${verse.ayah}`,
      text_uthmani: verse.words.join(' '),
      text_simple: verse.words.join(' '),
      text: verse.words.join(' ')
    }));
    
    return verses;
  } catch (error) {
    console.error(`Error getting page verses from MongoDB:`, error.message);
    return null;
  }
}

// Proxy endpoint to get Quran chapters (try MongoDB first, fallback to API)
app.get('/api/quran/chapters', async (req, res) => {
  // Try MongoDB first
    try {
    const surahIds = await getAllSurahsFromDb();
      if (surahIds.length > 0) {
        // Build chapters array from database
      const chaptersPromises = surahIds.map(async (id) => {
        const surahInfo = await getSurahInfoFromDb(id);
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
      
      const chapters = await Promise.all(chaptersPromises);
        
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

// Proxy endpoint to get page info (from MongoDB)
app.get('/api/quran/pages/:pageNumber/info', async (req, res) => {
  try {
    const pageNumber = parseInt(req.params.pageNumber);
    const pageInfo = await getPageInfoFromDb(pageNumber);
    
    if (pageInfo) {
      return res.json(pageInfo);
    }
    
    res.status(404).json({ error: `Page ${pageNumber} not found in database` });
  } catch (error) {
    console.error(`Error getting page info for page ${req.params.pageNumber}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get page lines with text (15-line format) - using MongoDB
app.get('/api/quran/pages/:pageNumber/lines', async (req, res) => {
  try {
    const pageNumber = parseInt(req.params.pageNumber);
    const version = req.query.version || 'v4'; // 'nastaleeq' or 'v4'
    
    console.log(`📖 Fetching page ${pageNumber} lines (version: ${version}) from MongoDB`);
    
    // Get page lines from MongoDB
    const allPageLines = await QuranPage.find({ page_number: pageNumber })
      .sort({ line_number: 1 })
      .lean();
    
    if (allPageLines.length === 0) {
      console.error(`❌ Page ${pageNumber} not found in MongoDB`);
      return res.status(404).json({ error: `Page ${pageNumber} not found in database` });
    }
    
    console.log(`✅ Found ${allPageLines.length} lines for page ${pageNumber} in MongoDB`);
    
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
    
    // Method 2: Try to get from page info (MongoDB)
    if (!surahId) {
      const pageInfo = await getPageInfoFromDb(pageNumber);
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
          // Query MongoDB to find surah from the first word ID on this page
          const firstWord = await QuranWord.findOne({ 
            word_id: ayahLine.first_word_id,
            version: version
          }).lean();
          
          if (firstWord && firstWord.surah) {
            surahId = firstWord.surah;
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
        // For pages beyond 77, query MongoDB
        try {
          const allPages = await QuranPage.findOne({
            page_number: { $lte: pageNumber },
            surah_number: { $ne: null, $exists: true }
          })
            .sort({ page_number: -1 })
            .lean();
        
        if (allPages && allPages.surah_number) {
          surahId = parseInt(allPages.surah_number);
            console.log(`⚠️ Using estimated surah ${surahId} from MongoDB for page ${pageNumber}`);
          }
        } catch (error) {
          console.warn(`⚠️ Could not query MongoDB: ${error.message}`);
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
    
    // Get all words for this surah from MongoDB
    const allWords = await QuranWord.find({ 
      surah: surahId,
      version: version
    })
      .sort({ ayah: 1, word: 1 })
      .lean();
    
    // Build lines with text
    const linesWithText = pageLines.map((line, idx) => {
      if (line.line_type === 'surah_name') {
        return {
          line_number: line.line_number,
          line_type: 'surah_name',
          is_centered: line.is_centered === true || line.is_centered === 1,
          surah_number: parseInt(line.surah_number),
          text: '',
          words: []
        };
      } else if (line.line_type === 'ayah') {
        // Get words for this line based on word IDs
        // Word IDs are sequential across the entire surah
        const firstWordId = parseInt(line.first_word_id) || 0;
        const lastWordId = parseInt(line.last_word_id) || 0;
        
        // Get words by word_id (sequential index)
        const lineWords = allWords.filter((w) => {
          return w.word_id >= firstWordId && w.word_id <= lastWordId;
        });
        
        const text = lineWords.map(w => w.text).join(' ');
        
        return {
          line_number: line.line_number,
          line_type: 'ayah',
          is_centered: line.is_centered === true || line.is_centered === 1,
          surah_number: surahId,
          first_word_id: firstWordId,
          last_word_id: lastWordId,
          text: text,
          words: lineWords.map(w => ({
            id: w.word_id,
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
          is_centered: line.is_centered === true || line.is_centered === 1,
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
    
    // Try MongoDB first
    const localVerses = await getPageVersesFromLocalDb(pageNumber, version);
    if (localVerses && localVerses.length > 0) {
      console.log(`✅ Quran verses for page ${pageNumber} from local DB (${version}, ${localVerses.length} verses)`);
      return res.json({ verses: localVerses, pagination: null, version });
    }
    
    // Try to get surah info from MongoDB to help with API calls
    const pageInfo = await getPageInfoFromDb(pageNumber);
    
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

// Email Configuration
const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'office@umaracademy.org',
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || 'office@umaracademy.org',
    pass: process.env.EMAIL_PASSWORD || '' // Should be set via environment variable
  }
};

// Create reusable transporter
let emailTransporter = null;
try {
  emailTransporter = nodemailer.createTransport({
    host: EMAIL_CONFIG.host,
    port: EMAIL_CONFIG.port,
    secure: EMAIL_CONFIG.secure,
    auth: EMAIL_CONFIG.auth.user && EMAIL_CONFIG.auth.pass ? EMAIL_CONFIG.auth : undefined,
    tls: {
      rejectUnauthorized: false // Allow self-signed certificates
    }
  });
  
  // Verify connection
  emailTransporter.verify((error, success) => {
    if (error) {
      console.warn('⚠️ Email transporter verification failed:', error.message);
      console.warn('   Email functionality may not work. Check EMAIL_USER and EMAIL_PASSWORD environment variables.');
    } else {
      console.log('✅ Email transporter ready');
    }
  });
} catch (error) {
  console.warn('⚠️ Failed to create email transporter:', error.message);
}

// Email Routes - Admin and Super Admin only
// Send email endpoint
app.post('/api/email/send', async (req, res) => {
  try {
    // Check authentication (token should be in header)
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check if user is admin or superadmin
    const user = await User.findById(decoded.userId);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Only admins and super admins can send emails' });
    }

    const { to, subject, text, html, cc, bcc } = req.body;

    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, and either text or html are required' 
      });
    }

    if (!emailTransporter) {
      return res.status(503).json({ 
        error: 'Email service is not configured. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.' 
      });
    }

    const mailOptions = {
      from: EMAIL_CONFIG.from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: subject,
      text: text,
      html: html || text?.replace(/\n/g, '<br>'),
      cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
    };

    const info = await emailTransporter.sendMail(mailOptions);
    
    console.log(`✅ Email sent successfully from ${user.email}:`, {
      to: mailOptions.to,
      subject: mailOptions.subject,
      messageId: info.messageId
    });

    res.json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Email sent successfully' 
    });
  } catch (error) {
    console.error('❌ Error sending email:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    });
  }
});

// Get email configuration (for frontend display)
app.get('/api/email/config', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Only admins and super admins can view email config' });
    }

    res.json({
      from: EMAIL_CONFIG.from,
      configured: !!emailTransporter && !!EMAIL_CONFIG.auth.user && !!EMAIL_CONFIG.auth.pass
    });
  } catch (error) {
    console.error('Error getting email config:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TEST RESULTS API ENDPOINTS
// ============================================

// Create a new test result
app.post('/api/tests', authenticateToken, async (req, res) => {
  try {
    const { studentId, studentName, title, questions, feedback, program } = req.body;
    
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Get user details from database to get name
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = req.user.userId.toString();
    const userName = user.name || user.email || 'Unknown Teacher';
    
    // Ensure each question has an ID
    const questionsWithIds = questions.map((q, index) => ({
      ...q,
      id: q.id || `q-${Date.now()}-${index}-${Math.random().toString(36).substring(7)}`
    }));
    
    const newTest = new TestResult({
      id: `test-${Date.now()}-${Math.random().toString(36).substring(7)}`, // Generate unique ID
      studentId,
      studentName,
      teacherId: userId, // Ensure teacherId comes from authenticated user
      teacherName: userName,
      program: program || null,
      title: title || `Test - ${new Date().toLocaleDateString()}`,
      questions: questionsWithIds,
      feedback: feedback || '',
      postedToStudent: false, // Default to not posted
      createdBy: userId
    });
    await newTest.save();
    console.log('✅ New test created:', newTest.id);
    res.status(201).json(newTest);
  } catch (error) {
    console.error('❌ Error creating test:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all tests for a specific student (only posted ones for students)
app.get('/api/tests/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.userId;

    let query = { studentId };

    // Students can only see tests posted to them
    if (userRole === 'student') {
      // Find the student record to verify ownership (studentId is the MongoDB _id)
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      // Check if the student's userId matches the authenticated user's userId
      if (student.userId && student.userId.toString() !== userId.toString()) {
        return res.status(403).json({ error: 'Access denied: You can only view your own test results' });
      }
      query.postedToStudent = true;
    }
    // Admins/SuperAdmins/Teachers can see all tests for a student
    // Teachers can only see tests they created or are assigned to their students
    if (userRole === 'teacher') {
      const teacher = await Teacher.findOne({ userId: userId });
      if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
      
      // Check if the student is assigned to this teacher (studentId is the MongoDB _id)
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      // Check if student is assigned to this teacher
      if (student.assignedTeacher !== teacher.id && student.assignedTeacherId !== teacher.id) {
        // Also allow if the teacher created the test
        const createdTests = await TestResult.find({ teacherId: userId.toString(), studentId });
        if (createdTests.length === 0) {
          return res.status(403).json({ error: 'Access denied: Student not assigned to teacher and teacher did not create test' });
        }
      }
    }

    const tests = await TestResult.find(query).sort({ createdAt: -1 });
    res.json(tests);
  } catch (error) {
    console.error('❌ Error fetching student tests:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single test result by ID
app.get('/api/tests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const test = await TestResult.findOne({ id });
    if (!test) {
      return res.status(404).json({ error: 'Test result not found' });
    }

    // Authorization check
    const userRole = req.user.role;
    const userId = req.user.userId;

    if (userRole === 'student' && (test.studentId !== userId.toString() || !test.postedToStudent)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (userRole === 'teacher') {
      const teacher = await Teacher.findOne({ userId: userId });
      if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
      if (test.teacherId !== userId.toString() && test.studentId !== teacher.assignedStudents.find(s => s === test.studentId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(test);
  } catch (error) {
    console.error('❌ Error fetching test by ID:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a test result
app.put('/api/tests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, questions, feedback } = req.body;

    const test = await TestResult.findOne({ id });
    if (!test) {
      return res.status(404).json({ error: 'Test result not found' });
    }

    // Only the teacher who created the test or an admin/superadmin can update
    if (req.user.role === 'teacher' && test.teacherId !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Access denied: Only the creator can update this test' });
    }
    if (req.user.role === 'student') {
      return res.status(403).json({ error: 'Access denied: Students cannot update tests' });
    }

    test.title = title || test.title;
    test.questions = questions || test.questions;
    test.feedback = feedback || test.feedback;
    await test.save();
    console.log('✅ Test updated:', test.id);
    res.json(test);
  } catch (error) {
    console.error('❌ Error updating test:', error);
    res.status(500).json({ error: error.message });
  }
});

// Post test to student portal
app.post('/api/tests/:id/post', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const test = await TestResult.findOne({ id });
    if (!test) {
      return res.status(404).json({ error: 'Test result not found' });
    }

    // Only the teacher who created the test or an admin/superadmin can post
    if (req.user.role === 'teacher' && test.teacherId !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Access denied: Only the creator can post this test' });
    }
    if (req.user.role === 'student') {
      return res.status(403).json({ error: 'Access denied: Students cannot post tests' });
    }

    test.postedToStudent = true;
    test.postedAt = new Date();
    await test.save();
    console.log('✅ Test posted to student portal:', test.id);
    res.json(test);
  } catch (error) {
    console.error('❌ Error posting test to student portal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a test result
app.delete('/api/tests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const test = await TestResult.findOne({ id });
    if (!test) {
      return res.status(404).json({ error: 'Test result not found' });
    }

    // Only the teacher who created the test or an admin/superadmin can delete
    if (req.user.role === 'teacher' && test.teacherId !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Access denied: Only the creator can delete this test' });
    }
    if (req.user.role === 'student') {
      return res.status(403).json({ error: 'Access denied: Students cannot delete tests' });
    }

    await TestResult.deleteOne({ id });
    console.log('✅ Test deleted:', id);
    res.status(204).send(); // No content
  } catch (error) {
    console.error('❌ Error deleting test:', error);
    res.status(500).json({ error: error.message });
  }
});

// PDF generation endpoint
app.get('/api/tests/:id/pdf', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const test = await TestResult.findOne({ id });
    if (!test) {
      return res.status(404).json({ error: 'Test result not found' });
    }

    // Authorization check (same as get single test)
    const userRole = req.user.role;
    const userId = req.user.userId;

    if (userRole === 'student' && (test.studentId !== userId.toString() || !test.postedToStudent)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (userRole === 'teacher') {
      const teacher = await Teacher.findOne({ userId: userId });
      if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
      if (test.teacherId !== userId.toString() && test.studentId !== teacher.assignedStudents.find(s => s === test.studentId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Fetch Quran chapters to get Arabic surah names
    let chapters = [];
    try {
      const chaptersResponse = await axios.get(`${req.protocol}://${req.get('host')}/api/quran/chapters`);
      if (chaptersResponse.data && chaptersResponse.data.chapters) {
        chapters = chaptersResponse.data.chapters;
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch chapters for PDF, using fallback');
    }

    // Helper function to get surah Arabic name
    const getSurahArabicName = (surahNumber) => {
      const chapter = chapters.find(c => c.id === surahNumber);
      return chapter?.name_arabic || '';
    };

    // Import PDFKit dynamically
    const PDFDocument = require('pdfkit');
    
    // Create PDF document
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Test-${test.studentName}-${test.title.replace(/\s+/g, '-')}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('Test Results', { align: 'center' });
    doc.moveDown();

    // Test Information
    doc.fontSize(14).font('Helvetica-Bold').text('Test Information:', { underline: true });
    doc.fontSize(12).font('Helvetica');
    doc.text(`Title: ${test.title || 'Student Test'}`);
    doc.text(`Student: ${test.studentName}`);
    doc.text(`Teacher: ${test.teacherName || 'Unknown'}`);
    if (test.program) {
      doc.text(`Program: ${test.program}`);
    }
    doc.text(`Date: ${new Date(test.createdAt).toLocaleDateString()}`);
    doc.moveDown();

    // Questions Summary
    doc.fontSize(14).font('Helvetica-Bold').text('Questions Summary:', { underline: true });
    doc.moveDown(0.5);
    
    // Calculate averages
    let totalMemory = 0, totalTajweed = 0, totalFluency = 0;
    let scoredQuestions = 0;
    
    test.questions.forEach((q, index) => {
      if (q.memoryScore && q.tajweedScore && q.fluencyScore) {
        totalMemory += q.memoryScore;
        totalTajweed += q.tajweedScore;
        totalFluency += q.fluencyScore;
        scoredQuestions++;
      }
    });

    const avgMemory = scoredQuestions > 0 ? (totalMemory / scoredQuestions).toFixed(1) : 'N/A';
    const avgTajweed = scoredQuestions > 0 ? (totalTajweed / scoredQuestions).toFixed(1) : 'N/A';
    const avgFluency = scoredQuestions > 0 ? (totalFluency / scoredQuestions).toFixed(1) : 'N/A';
    const overallAvg = scoredQuestions > 0 ? ((totalMemory + totalTajweed + totalFluency) / (scoredQuestions * 3)).toFixed(1) : 'N/A';

    doc.fontSize(12).font('Helvetica');
    doc.text(`Total Questions: ${test.questions.length}`);
    doc.text(`Average Memory Score: ${avgMemory}/10`);
    doc.text(`Average Tajweed Score: ${avgTajweed}/10`);
    doc.text(`Average Fluency Score: ${avgFluency}/10`);
    doc.text(`Overall Average: ${overallAvg}/10`);
    doc.moveDown();

    // Questions Details
    doc.fontSize(14).font('Helvetica-Bold').text('Questions Details:', { underline: true });
    doc.moveDown(0.5);

    test.questions.forEach((question, index) => {
      const surahArabicName = getSurahArabicName(question.surah);
      
      // Create a box/panel for the surah info - Beautiful formatting
      const startY = doc.y;
      const boxHeight = surahArabicName ? 40 : 25;
      
      // Draw a subtle background box with border
      doc.rect(50, startY, 500, boxHeight)
         .fillOpacity(0.08)
         .fill('#2E4D32')
         .fillOpacity(1)
         .strokeColor('#2E4D32')
         .lineWidth(1)
         .stroke();
      
      // Question number
      doc.fontSize(12).font('Helvetica-Bold');
      doc.fillColor('#2E4D32');
      doc.text(`Q${index + 1}:`, 55, startY + 5);
      doc.fillColor('black');
      
      // Arabic surah name - Larger, bold, right-aligned
      if (surahArabicName) {
        doc.fontSize(18).font('Helvetica-Bold');
        doc.fillColor('#2E4D32'); // Primary color
        // Position Arabic text on the right side
        const arabicTextWidth = doc.widthOfString(surahArabicName);
        doc.text(surahArabicName, 550 - arabicTextWidth, startY + 5);
        doc.fillColor('black'); // Reset to black
      }
      
      // English surah and ayah info - Below Arabic name
      doc.fontSize(11).font('Helvetica');
      doc.text(`Surah ${question.surah}, Ayah ${question.ayah}`, 55, startY + (surahArabicName ? 25 : 10));
      
      // Move down after the box
      doc.y = startY + boxHeight + 8;
      
      // Scores
      doc.fontSize(11).font('Helvetica');
      if (question.memoryScore) {
        doc.text(`  Memory: ${question.memoryScore}/10`, { indent: 20 });
      }
      if (question.tajweedScore) {
        doc.text(`  Tajweed: ${question.tajweedScore}/10`, { indent: 20 });
      }
      if (question.fluencyScore) {
        doc.text(`  Fluency: ${question.fluencyScore}/10`, { indent: 20 });
      }
      
      // Calculate average for this question
      if (question.memoryScore && question.tajweedScore && question.fluencyScore) {
        const qAvg = ((question.memoryScore + question.tajweedScore + question.fluencyScore) / 3).toFixed(1);
        doc.font('Helvetica-Bold').text(`  Average: ${qAvg}/10`, { indent: 20 });
      }
      
      // Mistakes count
      if (question.mistakes && question.mistakes.length > 0) {
        doc.text(`  Mistakes: ${question.mistakes.length}`, { indent: 20 });
      }
      
      // Notes
      if (question.notes) {
        doc.text(`  Notes: ${question.notes}`, { indent: 20 });
      }
      
      doc.moveDown(0.5);
    });

    // Feedback
    if (test.feedback) {
      doc.moveDown();
      doc.fontSize(14).font('Helvetica-Bold').text('Teacher Feedback:', { underline: true });
      doc.fontSize(12).font('Helvetica');
      doc.text(test.feedback, { align: 'left' });
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica').text(
      `Generated on ${new Date().toLocaleString()}`,
      { align: 'center' }
    );

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// Root route - simple health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Umar Academy Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Health check - improved with database connectivity check
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const healthStatus = {
      status: 'OK',
      message: 'Backend is running',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      uptime: process.uptime(),
      version: '1.0.0'
    };
    
    // If database is not connected, still return 200 but indicate the issue
    res.json(healthStatus);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'ERROR', 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// TEACHER EVALUATION SYSTEM API ROUTES
// ============================================

// Get all evaluations (Super Admin & Admin only)
app.get('/api/evaluations', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { status } = req.query;
    const query = status ? { status } : {};
    const evaluations = await Evaluation.find(query).sort({ createdAt: -1 });
    res.json(evaluations);
  } catch (error) {
    console.error('❌ Error fetching evaluations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single evaluation by ID
app.get('/api/evaluations/:id', authenticateToken, async (req, res) => {
  try {
    const evaluation = await Evaluation.findOne({ id: req.params.id });
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    // Teachers can only view if they have an assignment
    if (req.user.role === 'teacher') {
      const assignment = await EvaluationAssignment.findOne({
        evaluationId: req.params.id,
        teacherId: req.user.userId.toString()
      });
      if (!assignment) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(evaluation);
  } catch (error) {
    console.error('❌ Error fetching evaluation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new evaluation (Super Admin & Admin only)
app.post('/api/evaluations', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, description, questions, evaluationPeriod, autoSave } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const evaluationId = `eval-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const evaluation = new Evaluation({
      id: evaluationId,
      title,
      description,
      questions: questions || [],
      createdBy: req.user.userId.toString(),
      createdByName: user.name || user.email,
      evaluationPeriod: evaluationPeriod || {},
      autoSave: autoSave !== undefined ? autoSave : true
    });

    await evaluation.save();
    res.status(201).json(evaluation);
  } catch (error) {
    console.error('❌ Error creating evaluation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update evaluation (Super Admin & Admin only)
app.put('/api/evaluations/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const evaluation = await Evaluation.findOne({ id: req.params.id });
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    const { title, description, questions, status, evaluationPeriod, autoSave } = req.body;
    
    if (title) evaluation.title = title;
    if (description !== undefined) evaluation.description = description;
    if (questions) evaluation.questions = questions;
    if (status) evaluation.status = status;
    if (evaluationPeriod) evaluation.evaluationPeriod = evaluationPeriod;
    if (autoSave !== undefined) evaluation.autoSave = autoSave;

    await evaluation.save();
    res.json(evaluation);
  } catch (error) {
    console.error('❌ Error updating evaluation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete evaluation (Super Admin only)
app.delete('/api/evaluations/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const evaluation = await Evaluation.findOne({ id: req.params.id });
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    // Check if there are any assignments
    const assignments = await EvaluationAssignment.find({ evaluationId: req.params.id });
    if (assignments.length > 0) {
      return res.status(400).json({ error: 'Cannot delete evaluation with existing assignments' });
    }

    await Evaluation.deleteOne({ id: req.params.id });
    res.json({ message: 'Evaluation deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting evaluation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Assign evaluation to teacher(s) (Super Admin & Admin only)
app.post('/api/evaluations/:id/assign', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { teacherIds, dueDate } = req.body;
    if (!teacherIds || !Array.isArray(teacherIds) || teacherIds.length === 0) {
      return res.status(400).json({ error: 'teacherIds array is required' });
    }

    const evaluation = await Evaluation.findOne({ id: req.params.id });
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    const user = await User.findById(req.user.userId);
    const assignments = [];

    for (const teacherId of teacherIds) {
      const teacher = await Teacher.findOne({ userId: teacherId });
      if (!teacher) continue;

      const assignmentId = `assign-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const assignment = new EvaluationAssignment({
        id: assignmentId,
        evaluationId: req.params.id,
        teacherId: teacherId,
        teacherName: teacher.fullName,
        assignedBy: req.user.userId.toString(),
        assignedByName: user.name || user.email,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'assigned'
      });

      await assignment.save();
      assignments.push(assignment);
    }

    res.status(201).json({ assignments, count: assignments.length });
  } catch (error) {
    console.error('❌ Error assigning evaluation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get assignments (filtered by role)
app.get('/api/evaluation-assignments', authenticateToken, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'teacher') {
      query.teacherId = req.user.userId.toString();
    } else if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { status, evaluationId } = req.query;
    if (status) query.status = status;
    if (evaluationId) query.evaluationId = evaluationId;

    const assignments = await EvaluationAssignment.find(query)
      .sort({ createdAt: -1 })
      .populate('evaluationId', 'title description');

    res.json(assignments);
  } catch (error) {
    console.error('❌ Error fetching assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single assignment
app.get('/api/evaluation-assignments/:id', authenticateToken, async (req, res) => {
  try {
    const assignment = await EvaluationAssignment.findOne({ id: req.params.id });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Teachers can only view their own assignments
    if (req.user.role === 'teacher' && assignment.teacherId !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get evaluation details
    const evaluation = await Evaluation.findOne({ id: assignment.evaluationId });
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    // Get answers
    const answers = await EvaluationAnswer.find({ assignmentId: req.params.id });

    res.json({
      assignment,
      evaluation,
      answers
    });
  } catch (error) {
    console.error('❌ Error fetching assignment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start evaluation (Teacher only)
app.post('/api/evaluation-assignments/:id/start', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const assignment = await EvaluationAssignment.findOne({ id: req.params.id });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.teacherId !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (assignment.status === 'completed') {
      return res.status(400).json({ error: 'Evaluation already completed' });
    }

    assignment.status = 'in_progress';
    assignment.startedAt = new Date();
    await assignment.save();

    res.json(assignment);
  } catch (error) {
    console.error('❌ Error starting evaluation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit answer (Teacher only)
app.post('/api/evaluation-assignments/:id/answers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const assignment = await EvaluationAssignment.findOne({ id: req.params.id });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.teacherId !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { questionId, answerText, selectedOption, mediaUrl, autoSaved } = req.body;

    // Get evaluation to validate MCQ answers
    const evaluation = await Evaluation.findOne({ id: assignment.evaluationId });
    const question = evaluation.questions.find(q => q.id === questionId);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    let isCorrect = null;
    // All question types (text, audio, video) are MCQ with 4 choices - validate correctness
    if ((question.questionType === 'text' || question.questionType === 'audio' || question.questionType === 'video') && selectedOption) {
      isCorrect = selectedOption === question.correctAnswer;
      
      // If MCQ is incorrect, don't allow proceeding
      if (!isCorrect && !autoSaved) {
        return res.status(400).json({ 
          error: 'Incorrect answer. Please select the correct option to continue.',
          isCorrect: false
        });
      }
    }

    // Check if answer already exists
    let answer = await EvaluationAnswer.findOne({ 
      assignmentId: req.params.id, 
      questionId 
    });

    if (answer) {
      answer.answerText = answerText || answer.answerText;
      answer.selectedOption = selectedOption || answer.selectedOption;
      answer.isCorrect = isCorrect !== null ? isCorrect : answer.isCorrect;
      answer.mediaUrl = mediaUrl || answer.mediaUrl;
      answer.autoSaved = autoSaved !== undefined ? autoSaved : answer.autoSaved;
      answer.answeredAt = new Date();
    } else {
      const answerId = `answer-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      answer = new EvaluationAnswer({
        id: answerId,
        assignmentId: req.params.id,
        questionId,
        answerText,
        selectedOption,
        isCorrect,
        mediaUrl,
        autoSaved: autoSaved !== undefined ? autoSaved : false
      });
    }

    await answer.save();

    // Update assignment progress
    const totalQuestions = evaluation.questions.length;
    const answeredQuestions = await EvaluationAnswer.countDocuments({ 
      assignmentId: req.params.id 
    });
    assignment.progress = Math.round((answeredQuestions / totalQuestions) * 100);
    assignment.currentQuestionIndex = evaluation.questions.findIndex(q => q.id === questionId);
    await assignment.save();

    res.json({ answer, isCorrect, assignment });
  } catch (error) {
    console.error('❌ Error submitting answer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete evaluation (Teacher only)
app.post('/api/evaluation-assignments/:id/complete', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const assignment = await EvaluationAssignment.findOne({ id: req.params.id });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.teacherId !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify all required questions are answered
    const evaluation = await Evaluation.findOne({ id: assignment.evaluationId });
    const requiredQuestions = evaluation.questions.filter(q => q.isRequired);
    const answers = await EvaluationAnswer.find({ assignmentId: req.params.id });
    
    const answeredQuestionIds = new Set(answers.map(a => a.questionId));
    const unansweredRequired = requiredQuestions.filter(q => !answeredQuestionIds.has(q.id));

    if (unansweredRequired.length > 0) {
      return res.status(400).json({ 
        error: 'Please answer all required questions',
        unansweredQuestions: unansweredRequired.map(q => q.id)
      });
    }

    assignment.status = 'completed';
    assignment.completedAt = new Date();
    assignment.progress = 100;
    await assignment.save();

    res.json(assignment);
  } catch (error) {
    console.error('❌ Error completing evaluation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload media (Cloudinary) - Teacher only
app.post('/api/evaluation-assignments/:id/upload', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const assignment = await EvaluationAssignment.findOne({ id: req.params.id });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.teacherId !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Note: Cloudinary upload implementation would go here
    // For now, return a placeholder
    res.status(501).json({ error: 'Cloudinary upload not yet implemented' });
  } catch (error) {
    console.error('❌ Error uploading media:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get evaluation results (Super Admin & Admin only)
app.get('/api/evaluation-results', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { evaluationId, teacherId, status } = req.query;
    let query = {};

    if (evaluationId) query.evaluationId = evaluationId;
    if (teacherId) query.teacherId = teacherId;
    if (status) query.status = status;

    const assignments = await EvaluationAssignment.find(query)
      .sort({ completedAt: -1, createdAt: -1 });

    // Get detailed results with answers
    const results = await Promise.all(assignments.map(async (assignment) => {
      const evaluation = await Evaluation.findOne({ id: assignment.evaluationId });
      const answers = await EvaluationAnswer.find({ assignmentId: assignment.id })
        .sort({ answeredAt: 1 });

      return {
        assignment,
        evaluation: evaluation ? {
          id: evaluation.id,
          title: evaluation.title,
          description: evaluation.description,
          questions: evaluation.questions || []
        } : null,
        answers,
        totalQuestions: evaluation ? evaluation.questions.length : 0,
        answeredQuestions: answers.length
      };
    }));

    res.json(results);
  } catch (error) {
    console.error('❌ Error fetching results:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TEACHER PAIR MANAGEMENT API ENDPOINTS
// ============================================

// Teacher Pair Schema
const teacherPairSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  teacher1: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  teacher2: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  program: { type: String, enum: ['Full-Time HQ', 'Part-Time HQ', 'After School'], required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  notes: { type: String, default: '' }
}, { timestamps: true });

teacherPairSchema.index({ teacher1: 1, teacher2: 1 });
teacherPairSchema.index({ status: 1 });

const TeacherPair = mongoose.model('TeacherPair', teacherPairSchema);

// Pair Student Schema
const pairStudentSchema = new mongoose.Schema({
  pair: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherPair', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  startDate: { type: Date, required: true, default: Date.now },
  status: { type: String, enum: ['active', 'on-hold', 'completed'], default: 'active' },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  days: [{ type: String, enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], required: true }]
}, { timestamps: true });

// Unique partial index: one student can only belong to one active pair at a time
pairStudentSchema.index(
  { student: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);
pairStudentSchema.index({ pair: 1 });
pairStudentSchema.index({ student: 1, status: 1 });

const PairStudent = mongoose.model('PairStudent', pairStudentSchema);

// Pair Daily Report Schema
const pairDailyReportSchema = new mongoose.Schema({
  pair: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherPair', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  sabq: { type: String, default: '' },
  sabqi: { type: String, default: '' },
  manzil: { type: String, default: '' },
  mistakes: { type: String, default: '' },
  correctionMethod: { type: String, default: '' },
  behaviorNote: { type: String, default: '' },
  date: { type: Date, required: true, default: Date.now }
}, { timestamps: true });

pairDailyReportSchema.index({ pair: 1, student: 1, date: -1 });
pairDailyReportSchema.index({ student: 1, date: -1 });
pairDailyReportSchema.index({ teacher: 1, date: -1 });
pairDailyReportSchema.index({ date: -1 });

const PairDailyReport = mongoose.model('PairDailyReport', pairDailyReportSchema);

// Pair Teacher Message Schema
const pairTeacherMessageSchema = new mongoose.Schema({
  pair: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherPair', required: true },
  fromTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  toTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  message: { type: String, required: true, trim: true },
  files: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, default: 0 }
  }],
  read: { type: Boolean, default: false },
  readAt: { type: Date, default: null }
}, { timestamps: true });

pairTeacherMessageSchema.index({ pair: 1, createdAt: -1 });
pairTeacherMessageSchema.index({ fromTeacher: 1, toTeacher: 1, createdAt: -1 });
pairTeacherMessageSchema.index({ toTeacher: 1, read: 1, createdAt: -1 });
pairTeacherMessageSchema.index({ student: 1, createdAt: -1 });

const PairTeacherMessage = mongoose.model('PairTeacherMessage', pairTeacherMessageSchema);

// Teacher-Student Message Schema
const teacherStudentMessageSchema = new mongoose.Schema({
  fromTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  toStudent: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  fromStudent: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  toTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  message: { type: String, required: true, trim: true },
  attachments: [{
    filename: { type: String, required: true },
    url: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true }
  }],
  read: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
  adminInitiated: { type: Boolean, default: false },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

teacherStudentMessageSchema.index({ fromTeacher: 1, toStudent: 1, createdAt: -1 });
teacherStudentMessageSchema.index({ fromStudent: 1, toTeacher: 1, createdAt: -1 });
teacherStudentMessageSchema.index({ toStudent: 1, read: 1, createdAt: -1 });
teacherStudentMessageSchema.index({ toTeacher: 1, read: 1, createdAt: -1 });
teacherStudentMessageSchema.index({ adminInitiated: 1, createdAt: -1 });

const TeacherStudentMessage = mongoose.model('TeacherStudentMessage', teacherStudentMessageSchema);

// Get all teacher pairs
app.get('/api/teacher-pairs', async (req, res) => {
  try {
    const pairs = await TeacherPair.find({})
      .populate('teacher1', 'fullName email')
      .populate('teacher2', 'fullName email')
      .sort({ createdAt: -1 });
    res.json(pairs);
  } catch (error) {
    console.error('Error fetching teacher pairs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single teacher pair
app.get('/api/teacher-pairs/:id', async (req, res) => {
  try {
    const pair = await TeacherPair.findById(req.params.id)
      .populate('teacher1', 'fullName email')
      .populate('teacher2', 'fullName email');
    if (!pair) {
      return res.status(404).json({ error: 'Teacher pair not found' });
    }
    res.json(pair);
  } catch (error) {
    console.error('Error fetching teacher pair:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create teacher pair
app.post('/api/teacher-pairs', async (req, res) => {
  try {
    const { name, teacher1, teacher2, program, status, notes } = req.body;
    
    if (!name || !teacher1 || !teacher2 || !program) {
      return res.status(400).json({ error: 'Name, teacher1, teacher2, and program are required' });
    }

    // Validate and convert teacher IDs to ObjectIds
    if (!mongoose.Types.ObjectId.isValid(teacher1)) {
      return res.status(400).json({ error: 'Invalid teacher1 ID format' });
    }
    if (!mongoose.Types.ObjectId.isValid(teacher2)) {
      return res.status(400).json({ error: 'Invalid teacher2 ID format' });
    }

    // Verify teachers exist
    const teacher1Doc = await Teacher.findById(teacher1);
    const teacher2Doc = await Teacher.findById(teacher2);
    
    if (!teacher1Doc) {
      return res.status(404).json({ error: 'Teacher 1 not found' });
    }
    if (!teacher2Doc) {
      return res.status(404).json({ error: 'Teacher 2 not found' });
    }

    if (teacher1 === teacher2) {
      return res.status(400).json({ error: 'Teacher 1 and Teacher 2 cannot be the same' });
    }

    const pair = new TeacherPair({
      name,
      teacher1: new mongoose.Types.ObjectId(teacher1),
      teacher2: new mongoose.Types.ObjectId(teacher2),
      program,
      status: status || 'active',
      notes: notes || ''
    });

    await pair.save();
    const populated = await TeacherPair.findById(pair._id)
      .populate('teacher1', 'fullName email')
      .populate('teacher2', 'fullName email');
    
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating teacher pair:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update teacher pair
app.put('/api/teacher-pairs/:id', async (req, res) => {
  try {
    const { name, teacher1, teacher2, program, status, notes } = req.body;
    
    // Validate teacher IDs if provided
    if (teacher1 && !mongoose.Types.ObjectId.isValid(teacher1)) {
      return res.status(400).json({ error: 'Invalid teacher1 ID format' });
    }
    if (teacher2 && !mongoose.Types.ObjectId.isValid(teacher2)) {
      return res.status(400).json({ error: 'Invalid teacher2 ID format' });
    }

    // Verify teachers exist if provided
    if (teacher1) {
      const teacher1Doc = await Teacher.findById(teacher1);
      if (!teacher1Doc) {
        return res.status(404).json({ error: 'Teacher 1 not found' });
      }
    }
    if (teacher2) {
      const teacher2Doc = await Teacher.findById(teacher2);
      if (!teacher2Doc) {
        return res.status(404).json({ error: 'Teacher 2 not found' });
      }
    }

    if (teacher1 && teacher2 && teacher1 === teacher2) {
      return res.status(400).json({ error: 'Teacher 1 and Teacher 2 cannot be the same' });
    }

    const updateData = { name, program, status, notes };
    if (teacher1) updateData.teacher1 = new mongoose.Types.ObjectId(teacher1);
    if (teacher2) updateData.teacher2 = new mongoose.Types.ObjectId(teacher2);

    const pair = await TeacherPair.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('teacher1', 'fullName email')
      .populate('teacher2', 'fullName email');

    if (!pair) {
      return res.status(404).json({ error: 'Teacher pair not found' });
    }

    res.json(pair);
  } catch (error) {
    console.error('Error updating teacher pair:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete teacher pair
app.delete('/api/teacher-pairs/:id', async (req, res) => {
  try {
    // Check if pair has students
    const studentsCount = await PairStudent.countDocuments({ pair: req.params.id });
    if (studentsCount > 0) {
      return res.status(400).json({ error: 'Cannot delete pair with assigned students' });
    }

    const pair = await TeacherPair.findByIdAndDelete(req.params.id);
    if (!pair) {
      return res.status(404).json({ error: 'Teacher pair not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting teacher pair:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PAIR STUDENT MANAGEMENT API ENDPOINTS
// ============================================

// Get all pair students
app.get('/api/pair-students', async (req, res) => {
  try {
    const { pair, student, status } = req.query;
    const query = {};
    if (pair) query.pair = pair;
    if (student) query.student = student;
    if (status) query.status = status;

    const pairStudents = await PairStudent.find(query)
      .populate('pair', 'name program')
      .populate('student', 'fullName email studentId program')
      .sort({ 'student.program': 1, 'student.fullName': 1 });
    res.json(pairStudents);
  } catch (error) {
    console.error('Error fetching pair students:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single pair student
app.get('/api/pair-students/:id', async (req, res) => {
  try {
    const pairStudent = await PairStudent.findById(req.params.id)
      .populate('pair', 'name program teacher1 teacher2')
      .populate('student', 'fullName email studentId');
    if (!pairStudent) {
      return res.status(404).json({ error: 'Pair student not found' });
    }
    res.json(pairStudent);
  } catch (error) {
    console.error('Error fetching pair student:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create pair student
app.post('/api/pair-students', async (req, res) => {
  try {
    const { pair, student, startDate, status, startTime, endTime, days } = req.body;
    
    if (!pair || !student || !startTime || !endTime || !days || days.length === 0) {
      return res.status(400).json({ error: 'Pair, student, startTime, endTime, and days are required' });
    }

    // Check if student already has an active pair
    const existingActive = await PairStudent.findOne({ 
      student, 
      status: 'active' 
    });
    if (existingActive) {
      return res.status(400).json({ error: 'Student already belongs to an active pair' });
    }

    const pairStudent = new PairStudent({
      pair,
      student,
      startDate: startDate || new Date(),
      status: status || 'active',
      startTime,
      endTime,
      days
    });

    await pairStudent.save();
    const populated = await PairStudent.findById(pairStudent._id)
      .populate('pair', 'name program')
      .populate('student', 'fullName email studentId');
    
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating pair student:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update pair student
app.put('/api/pair-students/:id', async (req, res) => {
  try {
    const { status, startTime, endTime, days } = req.body;
    const pairStudent = await PairStudent.findByIdAndUpdate(
      req.params.id,
      { status, startTime, endTime, days },
      { new: true, runValidators: true }
    )
      .populate('pair', 'name program')
      .populate('student', 'fullName email studentId');

    if (!pairStudent) {
      return res.status(404).json({ error: 'Pair student not found' });
    }

    res.json(pairStudent);
  } catch (error) {
    console.error('Error updating pair student:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete pair student
app.delete('/api/pair-students/:id', async (req, res) => {
  try {
    const pairStudent = await PairStudent.findByIdAndDelete(req.params.id);
    if (!pairStudent) {
      return res.status(404).json({ error: 'Pair student not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting pair student:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PAIR DAILY REPORT API ENDPOINTS
// ============================================

// Get all daily reports
app.get('/api/pair-daily-reports', async (req, res) => {
  try {
    const { pair, student, teacher, date } = req.query;
    const query = {};
    if (pair) query.pair = pair;
    if (student) query.student = student;
    if (teacher) query.teacher = teacher;
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const reports = await PairDailyReport.find(query)
      .populate('pair', 'name program')
      .populate('student', 'fullName email studentId')
      .populate('teacher', 'fullName email')
      .sort({ date: -1, createdAt: -1 });
    res.json(reports);
  } catch (error) {
    console.error('Error fetching daily reports:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single daily report
app.get('/api/pair-daily-reports/:id', async (req, res) => {
  try {
    const report = await PairDailyReport.findById(req.params.id)
      .populate('pair', 'name program')
      .populate('student', 'fullName email studentId')
      .populate('teacher', 'fullName email');
    if (!report) {
      return res.status(404).json({ error: 'Daily report not found' });
    }
    res.json(report);
  } catch (error) {
    console.error('Error fetching daily report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create daily report
app.post('/api/pair-daily-reports', async (req, res) => {
  try {
    const { pair, student, teacher, sabq, sabqi, manzil, mistakes, correctionMethod, behaviorNote, date } = req.body;
    
    if (!pair || !student || !teacher || !date) {
      return res.status(400).json({ error: 'Pair, student, teacher, and date are required' });
    }

    const report = new PairDailyReport({
      pair,
      student,
      teacher,
      sabq: sabq || '',
      sabqi: sabqi || '',
      manzil: manzil || '',
      mistakes: mistakes || '',
      correctionMethod: correctionMethod || '',
      behaviorNote: behaviorNote || '',
      date: new Date(date)
    });

    await report.save();
    const populated = await PairDailyReport.findById(report._id)
      .populate('pair', 'name program')
      .populate('student', 'fullName email studentId')
      .populate('teacher', 'fullName email');
    
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating daily report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update daily report
app.put('/api/pair-daily-reports/:id', async (req, res) => {
  try {
    const { sabq, sabqi, manzil, mistakes, correctionMethod, behaviorNote, date } = req.body;
    const updateData = {};
    if (sabq !== undefined) updateData.sabq = sabq;
    if (sabqi !== undefined) updateData.sabqi = sabqi;
    if (manzil !== undefined) updateData.manzil = manzil;
    if (mistakes !== undefined) updateData.mistakes = mistakes;
    if (correctionMethod !== undefined) updateData.correctionMethod = correctionMethod;
    if (behaviorNote !== undefined) updateData.behaviorNote = behaviorNote;
    if (date) updateData.date = new Date(date);

    const report = await PairDailyReport.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('pair', 'name program')
      .populate('student', 'fullName email studentId')
      .populate('teacher', 'fullName email');

    if (!report) {
      return res.status(404).json({ error: 'Daily report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Error updating daily report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete daily report
app.delete('/api/pair-daily-reports/:id', async (req, res) => {
  try {
    const report = await PairDailyReport.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Daily report not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting daily report:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PAIR TEACHER MESSAGE API ENDPOINTS
// ============================================

// Get all pair teacher messages (for a pair, or all messages for a teacher)
// Admins can view all messages by not providing teacherId
app.get('/api/pair-teacher-messages', async (req, res) => {
  try {
    const { pair, teacherId, student, unreadOnly, adminView } = req.query;
    const query = {};
    
    if (pair) query.pair = pair;
    if (student) query.student = student;
    
    // If adminView is true, show all messages (admins can see everything)
    // Otherwise, filter by teacherId if provided
    if (adminView !== 'true' && teacherId) {
      query.$or = [
        { fromTeacher: teacherId },
        { toTeacher: teacherId }
      ];
    }
    
    if (unreadOnly === 'true' && teacherId) {
      query.read = false;
      query.toTeacher = teacherId; // Only unread messages where this teacher is the recipient
    }

    const messages = await PairTeacherMessage.find(query)
      .populate('pair', 'name program teacher1 teacher2')
      .populate('fromTeacher', 'fullName email')
      .populate('toTeacher', 'fullName email')
      .populate('student', 'fullName email studentId')
      .sort({ createdAt: -1 });
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching pair teacher messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single message
app.get('/api/pair-teacher-messages/:id', async (req, res) => {
  try {
    const message = await PairTeacherMessage.findById(req.params.id)
      .populate('pair', 'name program teacher1 teacher2')
      .populate('fromTeacher', 'fullName email')
      .populate('toTeacher', 'fullName email')
      .populate('student', 'fullName email studentId');
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    res.json(message);
  } catch (error) {
    console.error('Error fetching pair teacher message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create pair teacher message
app.post('/api/pair-teacher-messages', async (req, res) => {
  try {
    const { pair, fromTeacher, toTeacher, student, message, files } = req.body;
    
    if (!pair || !fromTeacher || !toTeacher || !message) {
      return res.status(400).json({ error: 'Pair, fromTeacher, toTeacher, and message are required' });
    }

    // Verify that the pair exists and contains these teachers
    const pairDoc = await TeacherPair.findById(pair);
    if (!pairDoc) {
      return res.status(404).json({ error: 'Teacher pair not found' });
    }

    const teacher1Id = pairDoc.teacher1.toString();
    const teacher2Id = pairDoc.teacher2.toString();
    const fromTeacherId = fromTeacher.toString();
    const toTeacherId = toTeacher.toString();

    if ((fromTeacherId !== teacher1Id && fromTeacherId !== teacher2Id) ||
        (toTeacherId !== teacher1Id && toTeacherId !== teacher2Id)) {
      return res.status(400).json({ error: 'Both teachers must be part of the specified pair' });
    }

    const newMessage = new PairTeacherMessage({
      pair,
      fromTeacher,
      toTeacher,
      student: student || null,
      message: message.trim(),
      files: files || [],
      read: false
    });

    await newMessage.save();
    
    const populated = await PairTeacherMessage.findById(newMessage._id)
      .populate('pair', 'name program teacher1 teacher2')
      .populate('fromTeacher', 'fullName email')
      .populate('toTeacher', 'fullName email')
      .populate('student', 'fullName email studentId');
    
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating pair teacher message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark message as read
app.put('/api/pair-teacher-messages/:id/read', async (req, res) => {
  try {
    const message = await PairTeacherMessage.findByIdAndUpdate(
      req.params.id,
      { read: true, readAt: new Date() },
      { new: true }
    )
      .populate('pair', 'name program teacher1 teacher2')
      .populate('fromTeacher', 'fullName email')
      .populate('toTeacher', 'fullName email')
      .populate('student', 'fullName email studentId');

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(message);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark multiple messages as read
app.put('/api/pair-teacher-messages/mark-read', async (req, res) => {
  try {
    const { messageIds, teacherId } = req.body;
    
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'Message IDs array is required' });
    }

    if (!teacherId) {
      return res.status(400).json({ error: 'Teacher ID is required' });
    }

    // Only mark messages as read if the teacher is the recipient
    const result = await PairTeacherMessage.updateMany(
      {
        _id: { $in: messageIds },
        toTeacher: teacherId,
        read: false
      },
      {
        $set: { read: true, readAt: new Date() }
      }
    );

    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TEACHER-STUDENT MESSAGING API ENDPOINTS
// ============================================

// File upload route for teacher-student messages
app.post('/api/teacher-student-messages/upload', (req, res) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    try {
      const buffer = Buffer.concat(chunks);
      
      const contentType = req.headers['content-type'] || 'application/octet-stream';
      const filename = req.headers['x-filename'] || `file-${Date.now()}`;
      
      let fileType = 'document';
      if (contentType.startsWith('image/')) fileType = 'image';
      else if (contentType.startsWith('video/')) fileType = 'video';
      else if (contentType.startsWith('audio/')) fileType = 'audio';
      else if (contentType.includes('pdf')) fileType = 'document';
      else if (contentType.includes('word') || contentType.includes('document')) fileType = 'document';
      
      const messagesDir = path.join(__dirname, 'uploads', 'messages');
      if (!fs.existsSync(messagesDir)) {
        fs.mkdirSync(messagesDir, { recursive: true });
      }
      
      const timestamp = Date.now();
      const extension = filename.split('.').pop() || 'bin';
      const uniqueFilename = `ts-message-${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;
      const filePath = path.join(messagesDir, uniqueFilename);
      
      fs.writeFileSync(filePath, buffer);
      
      const fileUrl = `/uploads/messages/${uniqueFilename}`;
      console.log(`✅ Teacher-Student message file uploaded: ${fileUrl} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
      res.json({ 
        url: fileUrl,
        filename: uniqueFilename,
        originalName: filename,
        type: fileType,
        size: buffer.length,
        mimeType: contentType
      });
    } catch (error) {
      console.error('Error in teacher-student message file upload:', error);
      res.status(500).json({ error: error.message });
    }
  });
  req.on('error', (error) => {
    console.error('Error reading request:', error);
    res.status(500).json({ error: error.message });
  });
});

// Get teacher-student messages
app.get('/api/teacher-student-messages', async (req, res) => {
  try {
    const { teacherId, studentId, unreadOnly, adminView } = req.query;
    const query = {};
    
    // Admin can see all messages
    if (adminView === 'true') {
      // No additional filters - show all
    } else if (teacherId && studentId) {
      // Conversation between specific teacher and student
      query.$or = [
        { fromTeacher: teacherId, toStudent: studentId },
        { fromStudent: studentId, toTeacher: teacherId }
      ];
    } else if (teacherId) {
      // All messages for a teacher (both sent and received)
      query.$or = [
        { fromTeacher: teacherId },
        { toTeacher: teacherId }
      ];
    } else if (studentId) {
      // All messages for a student (both sent and received)
      query.$or = [
        { fromStudent: studentId },
        { toStudent: studentId }
      ];
    }
    
    if (unreadOnly === 'true') {
      query.read = false;
      if (teacherId) query.toTeacher = teacherId;
      if (studentId) query.toStudent = studentId;
    }

    const messages = await TeacherStudentMessage.find(query)
      .populate('fromTeacher', 'fullName')
      .populate('toStudent', 'fullName studentId')
      .populate('fromStudent', 'fullName studentId')
      .populate('toTeacher', 'fullName')
      .populate('adminId', 'fullName email')
      .sort({ createdAt: -1 });
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching teacher-student messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single message
app.get('/api/teacher-student-messages/:id', async (req, res) => {
  try {
    const message = await TeacherStudentMessage.findById(req.params.id)
      .populate('fromTeacher', 'fullName')
      .populate('toStudent', 'fullName studentId')
      .populate('fromStudent', 'fullName studentId')
      .populate('toTeacher', 'fullName')
      .populate('adminId', 'fullName email');
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    res.json(message);
  } catch (error) {
    console.error('Error fetching teacher-student message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create teacher-student message
app.post('/api/teacher-student-messages', async (req, res) => {
  try {
    const { fromTeacher, toStudent, fromStudent, toTeacher, message, attachments, adminInitiated, adminId } = req.body;
    
    // Validate: must have either (fromTeacher + toStudent) OR (fromStudent + toTeacher)
    if (!((fromTeacher && toStudent) || (fromStudent && toTeacher))) {
      return res.status(400).json({ error: 'Must specify either (fromTeacher + toStudent) or (fromStudent + toTeacher)' });
    }
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const newMessage = new TeacherStudentMessage({
      fromTeacher: fromTeacher || null,
      toStudent: toStudent || null,
      fromStudent: fromStudent || null,
      toTeacher: toTeacher || null,
      message: message.trim(),
      attachments: attachments || [],
      read: false,
      adminInitiated: adminInitiated || false,
      adminId: adminInitiated ? adminId : null
    });

    await newMessage.save();
    
    // Populate before sending response
    await newMessage.populate('fromTeacher', 'fullName');
    await newMessage.populate('toStudent', 'fullName studentId');
    await newMessage.populate('fromStudent', 'fullName studentId');
    await newMessage.populate('toTeacher', 'fullName');
    if (adminId) {
      await newMessage.populate('adminId', 'fullName email');
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error creating teacher-student message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark message as read
app.put('/api/teacher-student-messages/:id/read', async (req, res) => {
  try {
    const message = await TeacherStudentMessage.findByIdAndUpdate(
      req.params.id,
      { read: true, readAt: new Date() },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    res.json(message);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark multiple messages as read
app.put('/api/teacher-student-messages/mark-read', async (req, res) => {
  try {
    const { messageIds, teacherId, studentId } = req.body;
    
    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ error: 'messageIds array is required' });
    }
    
    const query = { _id: { $in: messageIds } };
    if (teacherId) query.toTeacher = teacherId;
    if (studentId) query.toStudent = studentId;
    
    await TeacherStudentMessage.updateMany(
      query,
      { read: true, readAt: new Date() }
    );
    
    res.json({ success: true, count: messageIds.length });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// 404 handler for undefined routes (but skip /uploads as they're handled by static middleware)
app.use((req, res) => {
  // Don't handle /uploads routes here - they should be handled by static middleware
  if (req.path.startsWith('/uploads')) {
    // If we reach here, the file doesn't exist
    console.log(`⚠️  File not found: ${req.path}`);
    return res.status(404).json({ 
      error: 'File not found',
      path: req.path,
      method: req.method,
      message: 'The requested file does not exist in the uploads directory'
    });
  }
  
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// ==================== QAIDAH MARKING ROUTES ====================

// GET /api/qaidah/:studentId/:book/:page - Get marks for a specific page
app.get('/api/qaidah/:studentId/:book/:page', authenticateToken, async (req, res) => {
  try {
    const { studentId, book, page } = req.params;
    const pageNum = parseInt(page, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: 'Invalid page number' });
    }

    if (!['qaidah1', 'qaidah2', 'quran'].includes(book)) {
      return res.status(400).json({ error: 'Invalid book. Must be qaidah1, qaidah2, or quran' });
    }

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Find or create QaidahMark document
    let qaidahMark = await QaidahMark.findOne({
      student: studentId,
      book,
      page: pageNum
    });

    if (!qaidahMark) {
      // Return empty marks array if no marks exist yet
      return res.json({
        student: studentId,
        book,
        page: pageNum,
        marks: []
      });
    }

    res.json({
      student: qaidahMark.student,
      book: qaidahMark.book,
      page: qaidahMark.page,
      marks: qaidahMark.marks || []
    });
  } catch (error) {
    console.error('Error fetching qaidah marks:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/qaidah/save - Save marks for a page
app.post('/api/qaidah/save', authenticateToken, async (req, res) => {
  try {
    const { studentId, book, page, marks } = req.body;
    const userId = req.user.userId || req.user.id;

    if (!studentId || !book || !page) {
      return res.status(400).json({ error: 'Missing required fields: studentId, book, page' });
    }

    if (!['qaidah1', 'qaidah2', 'quran'].includes(book)) {
      return res.status(400).json({ error: 'Invalid book. Must be qaidah1, qaidah2, or quran' });
    }

    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: 'Invalid page number' });
    }

    // Validate marks array
    if (!Array.isArray(marks)) {
      return res.status(400).json({ error: 'Marks must be an array' });
    }

    // Validate each mark
    for (const mark of marks) {
      if (!mark.id || !mark.type || typeof mark.x !== 'number' || typeof mark.y !== 'number') {
        return res.status(400).json({ 
          error: 'Each mark must have: id, type, x (0-1), y (0-1)' 
        });
      }
      if (!['mistake', 'correct', 'note'].includes(mark.type)) {
        return res.status(400).json({ error: 'Mark type must be: mistake, correct, or note' });
      }
      if (mark.x < 0 || mark.x > 1 || mark.y < 0 || mark.y > 1) {
        return res.status(400).json({ error: 'Mark coordinates must be between 0 and 1' });
      }
    }

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Find or create QaidahMark document
    let qaidahMark = await QaidahMark.findOne({
      student: studentId,
      book,
      page: pageNum
    });

    if (qaidahMark) {
      // Update existing document
      qaidahMark.marks = marks;
      qaidahMark.updatedBy = userId;
      await qaidahMark.save();
    } else {
      // Create new document
      qaidahMark = new QaidahMark({
        student: studentId,
        book,
        page: pageNum,
        marks,
        createdBy: userId,
        updatedBy: userId
      });
      await qaidahMark.save();
    }

    res.json({
      success: true,
      student: qaidahMark.student,
      book: qaidahMark.book,
      page: qaidahMark.page,
      marks: qaidahMark.marks
    });
  } catch (error) {
    console.error('Error saving qaidah marks:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/qaidah/classwork - Save marks as classwork for a specific date
app.post('/api/qaidah/classwork', authenticateToken, async (req, res) => {
  try {
    const { studentId, book, page, marks, classworkDate } = req.body;
    const userId = req.user.userId || req.user.id;

    if (!studentId || !book || !page || !classworkDate) {
      return res.status(400).json({ error: 'Missing required fields: studentId, book, page, classworkDate' });
    }

    if (!['qaidah1', 'qaidah2', 'quran'].includes(book)) {
      return res.status(400).json({ error: 'Invalid book. Must be qaidah1, qaidah2, or quran' });
    }

    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: 'Invalid page number' });
    }

    // Validate classworkDate
    const date = new Date(classworkDate);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid classworkDate format' });
    }

    // Validate marks array
    if (!Array.isArray(marks)) {
      return res.status(400).json({ error: 'Marks must be an array' });
    }

    // Validate each mark
    for (const mark of marks) {
      if (!mark.id || !mark.type || typeof mark.x !== 'number' || typeof mark.y !== 'number') {
        return res.status(400).json({ 
          error: 'Each mark must have: id, type, x (0-1), y (0-1)' 
        });
      }
      if (!['mistake', 'correct', 'note'].includes(mark.type)) {
        return res.status(400).json({ error: 'Mark type must be: mistake, correct, or note' });
      }
      if (mark.x < 0 || mark.x > 1 || mark.y < 0 || mark.y > 1) {
        return res.status(400).json({ error: 'Mark coordinates must be between 0 and 1' });
      }
    }

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if classwork already exists for this student/book/page/date
    const existingClasswork = await QaidahMark.findOne({
      student: studentId,
      book,
      page: pageNum,
      classworkDate: date
    });

    if (existingClasswork) {
      // Update existing classwork
      existingClasswork.marks = marks;
      existingClasswork.updatedBy = userId;
      await existingClasswork.save();
      
      res.json({
        success: true,
        message: 'Classwork updated successfully',
        classwork: {
          id: existingClasswork._id,
          student: existingClasswork.student,
          book: existingClasswork.book,
          page: existingClasswork.page,
          classworkDate: existingClasswork.classworkDate,
          marks: existingClasswork.marks,
          createdAt: existingClasswork.createdAt,
          updatedAt: existingClasswork.updatedAt
        }
      });
    } else {
      // Create new classwork document
      const qaidahMark = new QaidahMark({
        student: studentId,
        book,
        page: pageNum,
        marks,
        classworkDate: date,
        createdBy: userId,
        updatedBy: userId
      });
      await qaidahMark.save();

      res.json({
        success: true,
        message: 'Classwork saved successfully',
        classwork: {
          id: qaidahMark._id,
          student: qaidahMark.student,
          book: qaidahMark.book,
          page: qaidahMark.page,
          classworkDate: qaidahMark.classworkDate,
          marks: qaidahMark.marks,
          createdAt: qaidahMark.createdAt,
          updatedAt: qaidahMark.updatedAt
        }
      });
    }
  } catch (error) {
    console.error('Error saving qaidah classwork:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/qaidah/classwork/:studentId/:book/:page - Get all classwork for a student/book/page
app.get('/api/qaidah/classwork/:studentId/:book/:page', authenticateToken, async (req, res) => {
  try {
    const { studentId, book, page } = req.params;
    const pageNum = parseInt(page, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: 'Invalid page number' });
    }

    if (!['qaidah1', 'qaidah2', 'quran'].includes(book)) {
      return res.status(400).json({ error: 'Invalid book. Must be qaidah1, qaidah2, or quran' });
    }

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Find all classwork for this student/book/page (sorted by date, newest first)
    const classworkList = await QaidahMark.find({
      student: studentId,
      book,
      page: pageNum,
      classworkDate: { $exists: true, $ne: null } // Only return documents with classworkDate
    }).sort({ classworkDate: -1 });

    res.json({
      student: studentId,
      book,
      page: pageNum,
      classwork: classworkList.map(cw => ({
        id: cw._id,
        student: cw.student,
        book: cw.book,
        page: cw.page,
        classworkDate: cw.classworkDate,
        marks: cw.marks || [],
        createdAt: cw.createdAt,
        updatedAt: cw.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching qaidah classwork:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== QAIDAH HOMEWORK ROUTES ====================

// POST /api/qaidah/homework/submit - Student submits homework
app.post('/api/qaidah/homework/submit', authenticateToken, async (req, res) => {
  try {
    const { homeworkId, youtubeLink } = req.body;
    const userId = req.user.userId || req.user.id;

    if (!homeworkId || !youtubeLink) {
      return res.status(400).json({ error: 'Missing required fields: homeworkId, youtubeLink' });
    }

    // Validate YouTube link format
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(youtubeLink)) {
      return res.status(400).json({ error: 'Invalid YouTube link format' });
    }

    // Find homework
    const homework = await QaidahHomework.findById(homeworkId);
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }

    // Verify student owns this homework
    const studentId = homework.student.toString();
    const userStudentId = (req.user.studentId || req.user.studentDocumentId)?.toString();
    if (studentId !== userStudentId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'You can only submit your own homework' });
    }

    // Update homework with submission
    homework.youtubeLink = youtubeLink;
    homework.status = 'submitted';
    await homework.save();

    res.json({
      success: true,
      message: 'Homework submitted successfully',
      homework: {
        id: homework._id,
        student: homework.student,
        book: homework.book,
        page: homework.page,
        youtubeLink: homework.youtubeLink,
        status: homework.status,
        updatedAt: homework.updatedAt
      }
    });
  } catch (error) {
    console.error('Error submitting homework:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/qaidah/homework/submissions/:studentId - Get all homework for a student
app.get('/api/qaidah/homework/submissions/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.userId || req.user.id;
    const userRole = req.user.role;

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check permissions: students can only see their own, teachers/admins can see any
    const userStudentId = (req.user.studentId || req.user.studentDocumentId)?.toString();
    if (userRole === 'student' && studentId !== userStudentId) {
      return res.status(403).json({ error: 'You can only view your own homework' });
    }

    // Find all homework for this student (sorted by due date, newest first)
    const homeworkList = await QaidahHomework.find({
      student: studentId
    }).sort({ dueDate: -1, createdAt: -1 });

    res.json({
      student: studentId,
      homework: homeworkList.map(hw => ({
        id: hw._id,
        student: hw.student,
        book: hw.book,
        page: hw.page,
        marks: hw.marks || [],
        classworkDate: hw.classworkDate,
        homeworkInstructions: hw.homeworkInstructions,
        dueDate: hw.dueDate,
        youtubeLink: hw.youtubeLink,
        teacherFeedback: hw.teacherFeedback,
        status: hw.status,
        assignedBy: hw.assignedBy,
        reviewedBy: hw.reviewedBy,
        reviewedAt: hw.reviewedAt,
        createdAt: hw.createdAt,
        updatedAt: hw.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching homework submissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/qaidah/homework/review - Teacher reviews homework
app.post('/api/qaidah/homework/review', authenticateToken, async (req, res) => {
  try {
    const { homeworkId, teacherFeedback, status } = req.body;
    const userId = req.user.userId || req.user.id;
    const userRole = req.user.role;

    // Only teachers/admins can review
    if (userRole !== 'teacher' && userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Only teachers and admins can review homework' });
    }

    if (!homeworkId) {
      return res.status(400).json({ error: 'Missing required field: homeworkId' });
    }

    if (status && !['pending', 'submitted', 'reviewed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be pending, submitted, or reviewed' });
    }

    // Find homework
    const homework = await QaidahHomework.findById(homeworkId);
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }

    // Update homework review
    if (teacherFeedback !== undefined) {
      homework.teacherFeedback = teacherFeedback;
    }
    if (status) {
      homework.status = status;
      if (status === 'reviewed') {
        homework.reviewedBy = userId;
        homework.reviewedAt = new Date();
      }
    }
    await homework.save();

    res.json({
      success: true,
      message: 'Homework review updated successfully',
      homework: {
        id: homework._id,
        student: homework.student,
        book: homework.book,
        page: homework.page,
        youtubeLink: homework.youtubeLink,
        teacherFeedback: homework.teacherFeedback,
        status: homework.status,
        reviewedBy: homework.reviewedBy,
        reviewedAt: homework.reviewedAt,
        updatedAt: homework.updatedAt
      }
    });
  } catch (error) {
    console.error('Error reviewing homework:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/qaidah/homework/assign - Assign homework to student (optional helper endpoint)
app.post('/api/qaidah/homework/assign', authenticateToken, async (req, res) => {
  try {
    const { studentId, book, page, marks, classworkDate, homeworkInstructions, dueDate } = req.body;
    const userId = req.user.userId || req.user.id;
    const userRole = req.user.role;

    // Only teachers/admins can assign
    if (userRole !== 'teacher' && userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Only teachers and admins can assign homework' });
    }

    if (!studentId || !book || !page || !dueDate) {
      return res.status(400).json({ error: 'Missing required fields: studentId, book, page, dueDate' });
    }

    if (!['qaidah1', 'qaidah2', 'quran'].includes(book)) {
      return res.status(400).json({ error: 'Invalid book. Must be qaidah1, qaidah2, or quran' });
    }

    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: 'Invalid page number' });
    }

    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid dueDate format' });
    }

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Create homework
    const homework = new QaidahHomework({
      student: studentId,
      book,
      page: pageNum,
      marks: marks || [],
      classworkDate: classworkDate ? new Date(classworkDate) : undefined,
      homeworkInstructions: homeworkInstructions || '',
      dueDate: dueDateObj,
      status: 'pending',
      assignedBy: userId
    });
    await homework.save();

    res.json({
      success: true,
      message: 'Homework assigned successfully',
      homework: {
        id: homework._id,
        student: homework.student,
        book: homework.book,
        page: homework.page,
        marks: homework.marks,
        classworkDate: homework.classworkDate,
        homeworkInstructions: homework.homeworkInstructions,
        dueDate: homework.dueDate,
        status: homework.status,
        createdAt: homework.createdAt
      }
    });
  } catch (error) {
    console.error('Error assigning homework:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Qaidah/Quran Page Upload API (Super Admin Only)
// ============================================

// Create public directories if they don't exist
const publicQaidah1Dir = path.join(__dirname, '..', 'public', 'qaidah1');
const publicQaidah2Dir = path.join(__dirname, '..', 'public', 'qaidah2');
const publicQuranDir = path.join(__dirname, '..', 'public', 'quran');
const publicQaidahDir = path.join(__dirname, '..', 'public', 'qaidah'); // Fallback

[publicQaidah1Dir, publicQaidah2Dir, publicQuranDir, publicQaidahDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// POST /api/qaidah/upload - Upload a Qaidah/Quran page (Super Admin only)
// Accepts JSON with base64 encoded file for simplicity
app.post('/api/qaidah/upload', authenticateToken, async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only super admins can upload pages' });
    }

    const { book, pageNumber, fileData, filename } = req.body;

    // Validate inputs
    if (!book || !['qaidah1', 'qaidah2', 'quran'].includes(book)) {
      return res.status(400).json({ error: 'Invalid book. Must be qaidah1, qaidah2, or quran' });
    }

    if (!pageNumber || isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ error: 'Invalid page number. Must be a positive integer' });
    }

    if (!fileData) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    // Parse base64 file data
    let fileBuffer;
    let fileExtension;
    
    if (fileData.startsWith('data:')) {
      // Data URL format: data:image/jpeg;base64,...
      const matches = fileData.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: 'Invalid file data format' });
      }
      fileExtension = matches[1].toLowerCase();
      if (fileExtension === 'jpeg') fileExtension = 'jpg';
      fileBuffer = Buffer.from(matches[2], 'base64');
    } else {
      // Assume base64 string
      fileBuffer = Buffer.from(fileData, 'base64');
      // Try to get extension from filename
      if (filename) {
        fileExtension = filename.split('.').pop().toLowerCase();
        if (fileExtension === 'jpeg') fileExtension = 'jpg';
      } else {
        fileExtension = 'jpg'; // Default
      }
    }

    // Validate file extension
    const allowedExtensions = ['jpg', 'jpeg', 'png'];
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({ error: `Invalid file type. Allowed: ${allowedExtensions.join(', ')}` });
    }

    // Determine target directory
    let targetDir;
    if (book === 'qaidah1') {
      targetDir = publicQaidah1Dir;
    } else if (book === 'qaidah2') {
      targetDir = publicQaidah2Dir;
    } else if (book === 'quran') {
      targetDir = publicQuranDir;
    } else {
      targetDir = publicQaidahDir;
    }

    // Ensure directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Save file (use .jpg extension for consistency)
    const savedExtension = fileExtension === 'jpeg' ? 'jpg' : fileExtension;
    const filePath = path.join(targetDir, `${pageNumber}.${savedExtension}`);
    
    fs.writeFileSync(filePath, fileBuffer);
    
    console.log(`✅ Page uploaded: ${book}/${pageNumber}.${savedExtension} (${(fileBuffer.length / 1024).toFixed(2)} KB)`);
    
    res.json({
      success: true,
      book,
      pageNumber,
      filename: `${pageNumber}.${savedExtension}`,
      url: `/${book}/${pageNumber}.${savedExtension}`,
      size: fileBuffer.length
    });
  } catch (error) {
    console.error('Error uploading page:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/qaidah/pages/:book - List all pages for a book (Super Admin only)
app.get('/api/qaidah/pages/:book', authenticateToken, (req, res) => {
  // Check if user is super admin
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Only super admins can view pages' });
  }

  try {
    const { book } = req.params;
    
    if (!['qaidah1', 'qaidah2', 'quran'].includes(book)) {
      return res.status(400).json({ error: 'Invalid book. Must be qaidah1, qaidah2, or quran' });
    }

    // Determine directory
    let targetDir;
    if (book === 'qaidah1') {
      targetDir = publicQaidah1Dir;
    } else if (book === 'qaidah2') {
      targetDir = publicQaidah2Dir;
    } else if (book === 'quran') {
      targetDir = publicQuranDir;
    } else {
      targetDir = publicQaidahDir;
    }

    // Read directory
    if (!fs.existsSync(targetDir)) {
      return res.json({ book, pages: [] });
    }

    const files = fs.readdirSync(targetDir);
    const pages = files
      .filter(file => /\.(jpg|jpeg|png)$/i.test(file))
      .map(file => {
        const pageMatch = file.match(/^(\d+)\./);
        if (pageMatch) {
          const pageNum = parseInt(pageMatch[1], 10);
          const stats = fs.statSync(path.join(targetDir, file));
          return {
            pageNumber: pageNum,
            filename: file,
            size: stats.size,
            url: `/${book}/${file}`,
            uploadedAt: stats.mtime
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.pageNumber - b.pageNumber);

    res.json({ book, pages, totalPages: pages.length });
  } catch (error) {
    console.error('Error listing pages:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/qaidah/pages/:book/:pageNumber - Delete a page (Super Admin only)
app.delete('/api/qaidah/pages/:book/:pageNumber', authenticateToken, async (req, res) => {
  // Check if user is super admin
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Only super admins can delete pages' });
  }

  try {
    const { book, pageNumber } = req.params;
    const pageNum = parseInt(pageNumber, 10);

    if (!['qaidah1', 'qaidah2', 'quran'].includes(book)) {
      return res.status(400).json({ error: 'Invalid book. Must be qaidah1, qaidah2, or quran' });
    }

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: 'Invalid page number' });
    }

    // Determine directory
    let targetDir;
    if (book === 'qaidah1') {
      targetDir = publicQaidah1Dir;
    } else if (book === 'qaidah2') {
      targetDir = publicQaidah2Dir;
    } else if (book === 'quran') {
      targetDir = publicQuranDir;
    } else {
      targetDir = publicQaidahDir;
    }

    // Try to delete file (check multiple extensions)
    const extensions = ['jpg', 'jpeg', 'png'];
    let deleted = false;
    let deletedFile = null;

    for (const ext of extensions) {
      const filePath = path.join(targetDir, `${pageNum}.${ext}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deleted = true;
        deletedFile = `${pageNum}.${ext}`;
        console.log(`✅ Page deleted: ${book}/${deletedFile}`);
        break;
      }
    }

    if (!deleted) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json({ success: true, book, pageNumber: pageNum, deletedFile });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({ error: error.message });
  }
});

// Global error handler middleware (must be last)
app.use((err, req, res, next) => {
  console.error('❌ Global error handler:', err);
  console.error('Stack:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server regardless of MongoDB connection status
// Bind to 0.0.0.0 for deployment platforms (Render, Heroku, etc.)
const HOST = process.env.HOST || '0.0.0.0';
// Test Results Routes
// Create test result

app.listen(PORT, HOST, () => {
  console.log(`🚀 Backend server running on ${HOST}:${PORT}`);
  console.log(`📊 MongoDB URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials in logs
  console.log(`✅ Server is ready to accept connections`);
});

// Handle uncaught exceptions and unhandled rejections to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Don't exit - log and continue (allows server to keep running)
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  if (reason instanceof Error) {
    console.error('Stack:', reason.stack);
  }
  // Don't exit - log and continue
});
