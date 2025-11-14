const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

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

// Connect to MongoDB (don't exit on failure - allow graceful degradation)
mongoose.connect(MONGODB_URI)
.then(() => {
  console.log(`📊 Connected to MongoDB`);
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
  avatar: String
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

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

// Sync teacher assignedStudents arrays with actual student assignments
const syncTeacherAssignedStudents = async () => {
  try {
    const allStudents = await Student.find({});
    const allTeachers = await Teacher.find({});
    
    // Track which teachers need to be saved
    const teachersToUpdate = new Map();
    
    // Reset all teachers' assignedStudents arrays
    for (const teacher of allTeachers) {
      teacher.assignedStudents = [];
      teachersToUpdate.set(teacher._id.toString(), teacher);
    }
    
    // Build assignedStudents arrays from student assignments
    for (const student of allStudents) {
      const studentId = student._id.toString();
      const assignedTeacherId = student.assignedTeacherId || student.assignedTeacher;
      
      if (assignedTeacherId) {
        let teacher = null;
        
        // Try to find teacher by ObjectId
        if (mongoose.Types.ObjectId.isValid(assignedTeacherId)) {
          teacher = await Teacher.findById(assignedTeacherId);
        }
        
        // If not found, try other fields
        if (!teacher) {
          teacher = await Teacher.findOne({
            $or: [
              { teacherId: assignedTeacherId },
              { email: assignedTeacherId },
              { fullName: assignedTeacherId },
              { _id: assignedTeacherId }
            ]
          });
        }
        
        if (teacher) {
          // Ensure assignedTeacherId is set on student
          if (!student.assignedTeacherId) {
            student.assignedTeacherId = teacher._id.toString();
            await student.save();
          }
          
          // Get the teacher from our tracking map or fetch fresh
          const teacherToUpdate = teachersToUpdate.get(teacher._id.toString()) || teacher;
          
          // Add student to teacher's assignedStudents array
          if (!teacherToUpdate.assignedStudents || !Array.isArray(teacherToUpdate.assignedStudents)) {
            teacherToUpdate.assignedStudents = [];
          }
          if (!teacherToUpdate.assignedStudents.includes(studentId)) {
            teacherToUpdate.assignedStudents.push(studentId);
          }
          
          // Track this teacher for saving
          teachersToUpdate.set(teacher._id.toString(), teacherToUpdate);
        }
      }
    }
    
    // Save all updated teachers
    let savedCount = 0;
    for (const teacher of teachersToUpdate.values()) {
      await teacher.save();
      savedCount++;
    }
    
    console.log(`✅ Synced all teachers' assignedStudents arrays (${savedCount} teachers updated)`);
    return true;
  } catch (error) {
    console.error('❌ Error syncing teacher assignedStudents:', error);
    return false;
  }
};

// Get all teachers
app.get('/api/teachers', async (req, res) => {
  try {
    // Sync assignedStudents arrays before returning teachers
    const syncOnLoad = req.query.sync === 'true';
    if (syncOnLoad) {
      await syncTeacherAssignedStudents();
    }
    
    const teachers = await Teacher.find({}).populate('userId');
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync teacher assignedStudents arrays endpoint
app.post('/api/teachers/sync-assigned-students', async (req, res) => {
  try {
    const success = await syncTeacherAssignedStudents();
    if (success) {
      res.json({ message: 'Successfully synced all teachers\' assignedStudents arrays' });
    } else {
      res.status(500).json({ error: 'Failed to sync assignedStudents arrays' });
    }
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
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'A user with that email already exists.' });
    }
    console.error('❌ Failed to create user:', error);
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
          // Also set assignedTeacherId on student if not already set
          if (!student.assignedTeacherId) {
            student.assignedTeacherId = teacher._id.toString();
            await student.save();
          }
          
          if (!teacher.assignedStudents || !Array.isArray(teacher.assignedStudents)) {
            teacher.assignedStudents = [];
          }
          if (!teacher.assignedStudents.includes(studentId)) {
            teacher.assignedStudents.push(studentId);
            await teacher.save();
            console.log(`✅ Added student ${studentId} to teacher ${teacher.fullName}'s assignedStudents array`);
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
    
    // Remove from old teacher's assignedStudents array
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
      
      if (oldTeacher && oldTeacher.assignedStudents) {
        oldTeacher.assignedStudents = oldTeacher.assignedStudents.filter(
          (id) => id.toString() !== studentId
        );
        await oldTeacher.save();
        console.log(`✅ Removed student ${studentId} from teacher ${oldTeacher.fullName}'s assignedStudents array`);
      }
    }
    
    // Add to new teacher's assignedStudents array
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
        
        if (!newTeacher.assignedStudents || !Array.isArray(newTeacher.assignedStudents)) {
          newTeacher.assignedStudents = [];
        }
        if (!newTeacher.assignedStudents.includes(studentId)) {
          newTeacher.assignedStudents.push(studentId);
          await newTeacher.save();
          console.log(`✅ Added student ${studentId} to teacher ${newTeacher.fullName}'s assignedStudents array`);
        }
      } else {
        console.log(`⚠️ Teacher not found for ID: ${newTeacherId}`);
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
    if (normalized.schedule.days && !normalized.schedule.workingDays) {
      normalized.schedule.workingDays = normalized.schedule.days;
    }
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
      
      return res.json(updatedTeacher);
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

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
  } catch (error) {
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
  }],
  classworkSections: [{
    step: { type: String },
    title: { type: String },
    details: { type: String },
    teacherName: { type: String },
    order: { type: Number },
    assignmentRange: { type: String },
    assignmentPortion: { type: String }
  }],
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
  status: { type: String, enum: ['assigned', 'in_progress', 'pending_review', 'approved', 'needs_revision', 'finalized', 'completed', 'pending', 'skipped'], default: 'assigned' },
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
  classworkSections: [{
    step: { type: String },
    title: { type: String },
    details: { type: String },
    teacherName: { type: String },
    order: { type: Number },
    assignmentRange: { type: String },
    assignmentPortion: { type: String }
  }],
  program: { type: String, required: true },
  assignmentRange: { type: String },
  assignmentPortion: { type: String }
}, { timestamps: true });

const AssignmentTicket = mongoose.model('AssignmentTicket', assignmentTicketSchema);

// Student Personal Mushaf Schema - tracks all mistakes across all recitations
const studentPersonalMushafSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  studentName: { type: String, required: true },
  mistakes: [{
    id: String,
    type: { type: String, enum: ['madd', 'holding', 'memory', 'ikhfa', 'tech', 'other'], required: true },
    page: { type: Number, required: true },
    surah: { type: Number, required: true },
    ayah: { type: Number, required: true },
    wordIndex: Number,
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

// Admin Notification Schema
const adminNotificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['recitation_review_pending', 'assignment_submitted', 'student_enrolled', 'payment_received', 'profile_update_request'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  recitationReviewId: { type: String },
  assignmentId: { type: String },
  studentId: { type: String },
  teacherId: { type: String }, // For profile_update_request
  read: { type: Boolean, default: false },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
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

app.post('/api/recitation-reviews/:id/convert-to-assignment', async (req, res) => {
  try {
    console.log(`🔄 Converting recitation review to assignment: ${req.params.id}`);
    const review = await RecitationReview.findById(req.params.id);
    if (!review) {
      console.error(`❌ Recitation review not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Recitation review not found' });
    }
    
    console.log(`📋 Review found: ${review.recitationType} for ${review.studentName}`);
    console.log(`👤 Reviewed by: ${review.reviewedBy || 'Not reviewed yet'}`);
    
    // Handle assignedBy - convert to ObjectId if it exists, or use a default admin user
    let assignedById = null;
    if (review.reviewedBy) {
      // If reviewedBy is a valid ObjectId string, use it
      if (mongoose.Types.ObjectId.isValid(review.reviewedBy)) {
        assignedById = new mongoose.Types.ObjectId(review.reviewedBy);
      } else {
        // If it's not a valid ObjectId, try to find an admin user
        const adminUser = await User.findOne({ role: { $in: ['admin', 'superadmin'] } });
        if (adminUser) {
          assignedById = adminUser._id;
        } else {
          // Last resort: use the reviewer ID as string (may cause validation error, but better than undefined)
          assignedById = review.reviewedBy;
        }
      }
    } else {
      // If review hasn't been reviewed yet, find an admin user to assign as creator
      const adminUser = await User.findOne({ role: { $in: ['admin', 'superadmin'] } });
      if (adminUser) {
        assignedById = adminUser._id;
        console.log(`⚠️ Review not reviewed yet, using admin user as creator: ${adminUser._id}`);
      } else {
        console.error('❌ No admin user found to assign as creator');
        return res.status(500).json({ error: 'No admin user found. Please ensure at least one admin exists.' });
      }
    }
    
    // Create assignment from review
    const assignmentData = {
      title: `${review.recitationType.charAt(0).toUpperCase() + review.recitationType.slice(1)} - ${review.studentName}`,
      description: review.notes || 'Recitation review converted to assignment',
      type: 'classwork',
      classworkType: review.recitationType,
      program: review.program || 'Unknown Program',
      assignedBy: assignedById,
      assignedTo: [review.studentId],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'pending_homework', // Needs homework to be added
      fromRecitationReviewId: review._id.toString(),
      listenerName: review.teacherName, // The teacher who submitted the review
      listenerId: review.teacherId
    };
    
    console.log(`📝 Creating assignment with data:`, JSON.stringify(assignmentData, null, 2));
    
    const assignment = new Assignment(assignmentData);
    await assignment.save();
    
    console.log(`✅ Assignment created: ${assignment._id}`);
    
    // Update review status
    review.status = 'converted_to_assignment';
    review.convertedToAssignmentId = assignment._id.toString();
    await review.save();
    
    console.log(`✅ Review status updated to converted_to_assignment`);
    
    res.status(201).json(assignment);
  } catch (error) {
    console.error('❌ Error converting recitation review to assignment:', error);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
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

app.post('/api/admin-notifications', async (req, res) => {
  try {
    const notification = new AdminNotification(req.body);
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// IMPORTANT: Specific routes must come BEFORE generic :id route
// Approve ticket (just approve, don't advance)
app.post('/api/tickets/:id/approve', async (req, res) => {
  try {
    const ticket = await AssignmentTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    ticket.status = 'approved';
    ticket.reviewedBy = req.body.reviewedBy;
    ticket.reviewedAt = new Date();
    await ticket.save();
    
    // End any associated listening sessions for this ticket
    const ticketId = ticket._id.toString();
    const activeSessions = await ListeningSession.find({
      ticketId: ticketId,
      status: 'in_progress'
    });
    
    for (const session of activeSessions) {
      session.status = 'completed';
      session.endedAt = new Date();
      session.lastHeartbeatAt = new Date();
      
      if (session.startedAt) {
        session.totalListeningSeconds = Math.max(
          0,
          Math.round((new Date().getTime() - session.startedAt.getTime()) / 1000)
        );
      }
      
      await session.save();
      const serialized = serializeListeningSession(session);
      broadcastListeningSessionEvent('session_ended', serialized);
    }
    
    res.json({ 
      ticket: ticket,
      message: 'Ticket approved successfully.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve and advance ticket (Combines approve + assign next in one action - kept for backward compatibility)
app.post('/api/tickets/:id/approve-and-advance', async (req, res) => {
  try {
    const currentTicket = await AssignmentTicket.findById(req.params.id);
    if (!currentTicket) {
      return res.status(404).json({ error: 'Current ticket not found' });
    }
    
    // Update current ticket to approved
    currentTicket.status = 'approved';
    currentTicket.reviewedBy = req.body.reviewedBy;
    currentTicket.reviewedAt = new Date();
    await currentTicket.save();
    
    // End any associated listening sessions for this ticket
    const ticketId = currentTicket._id.toString();
    const activeSessions = await ListeningSession.find({
      ticketId: ticketId,
      status: 'in_progress'
    });
    
    for (const session of activeSessions) {
      session.status = 'completed';
      session.endedAt = new Date();
      session.lastHeartbeatAt = new Date();
      
      if (session.startedAt) {
        session.totalListeningSeconds = Math.max(
          0,
          Math.round((new Date().getTime() - session.startedAt.getTime()) / 1000)
        );
      }
      
      await session.save();
      const serialized = serializeListeningSession(session);
      broadcastListeningSessionEvent('session_ended', serialized);
    }
    
    // If not finalize step, activate and assign next ticket
    if (currentTicket.workflowStep !== 'finalize') {
      const workflowFlow = { sabq: 'sabqi', sabqi: 'manzil', manzil: 'finalize' };
      const nextStep = workflowFlow[currentTicket.workflowStep];
      
      if (nextStep && currentTicket.nextTicketId) {
        // Find and activate next ticket
        const nextTicket = await AssignmentTicket.findById(currentTicket.nextTicketId);
        if (nextTicket) {
          // Assign teacher if provided, otherwise keep as admin (for finalize)
          if (req.body.nextTeacherId && req.body.nextTeacherName) {
            nextTicket.assignedTeacherId = req.body.nextTeacherId;
            nextTicket.assignedTeacherName = req.body.nextTeacherName;
          }
          nextTicket.status = 'assigned';
          await nextTicket.save();
        }
      }
    }
    
    res.json({ 
      ticket: currentTicket,
      message: currentTicket.workflowStep === 'finalize' 
        ? 'Ticket approved. Ready to add homework.'
        : 'Ticket approved. Next step activated.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign ticket to next teacher (can be done separately after approval)
app.post('/api/tickets/:id/assign-next', async (req, res) => {
  try {
    const currentTicket = await AssignmentTicket.findById(req.params.id);
    if (!currentTicket) {
      return res.status(404).json({ error: 'Current ticket not found' });
    }
    
    // If not finalize step, activate and assign next ticket
    if (currentTicket.workflowStep === 'finalize') {
      return res.status(400).json({ error: 'Cannot assign next step for finalize ticket. Use finalize endpoint instead.' });
    }
    
    const workflowFlow = { sabq: 'sabqi', sabqi: 'manzil', manzil: 'finalize' };
    const nextStep = workflowFlow[currentTicket.workflowStep];
    
    const { assignedTeacherId, assignedTeacherName, internalNote } = req.body || {};

    if (!assignedTeacherId || !assignedTeacherName) {
      return res.status(400).json({ error: 'Teacher ID and name are required' });
    }
    
    if (!nextStep) {
      return res.status(400).json({ error: 'No next step available for this ticket' });
    }
    
    let nextTicket = null;
    
    // If nextTicketId exists, find and activate it
    if (currentTicket.nextTicketId) {
      nextTicket = await AssignmentTicket.findById(currentTicket.nextTicketId);
    }
    
    // If next ticket doesn't exist, create it
    if (!nextTicket) {
      nextTicket = new AssignmentTicket({
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
    } else {
      // Assign teacher to existing next ticket
      nextTicket.assignedTeacherId = req.body.assignedTeacherId;
      nextTicket.assignedTeacherName = req.body.assignedTeacherName;
      nextTicket.status = 'assigned';
      await nextTicket.save();
    }
    
    res.json({ 
      ticket: nextTicket,
      message: `Next step (${nextStep}) activated and assigned to ${nextTicket.assignedTeacherName}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Skip remaining listening steps and move directly to finalize
app.post('/api/tickets/:id/skip-to-finalize', async (req, res) => {
  try {
    const ticketId = req.params.id;
    const reviewedBy = req.body.reviewedBy;

    const currentTicket = await AssignmentTicket.findById(ticketId);
    if (!currentTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Helper function to end listening sessions for a ticket
    const endListeningSessionsForTicket = async (ticketIdStr) => {
      const activeSessions = await ListeningSession.find({
        ticketId: ticketIdStr,
        status: 'in_progress'
      });
      
      for (const session of activeSessions) {
        session.status = 'completed';
        session.endedAt = new Date();
        session.lastHeartbeatAt = new Date();
        
        if (session.startedAt) {
          session.totalListeningSeconds = Math.max(
            0,
            Math.round((new Date().getTime() - session.startedAt.getTime()) / 1000)
          );
        }
        
        await session.save();
        const serialized = serializeListeningSession(session);
        broadcastListeningSessionEvent('session_ended', serialized);
      }
    };

    // If already at finalize step, ensure it's approved and return
    if (currentTicket.workflowStep === 'finalize') {
      if (currentTicket.status !== 'approved') {
        currentTicket.status = 'approved';
        currentTicket.reviewedBy = reviewedBy;
        currentTicket.reviewedAt = new Date();
        await currentTicket.save();
      }
      
      // End listening sessions for finalize ticket
      await endListeningSessionsForTicket(currentTicket._id.toString());
      
      return res.json({
        ticket: currentTicket,
        message: 'Finalize ticket ready for publishing.'
      });
    }

    // Approve the current ticket if necessary
    if (currentTicket.status !== 'approved') {
      currentTicket.status = 'approved';
      currentTicket.reviewedBy = reviewedBy;
      currentTicket.reviewedAt = new Date();
      await currentTicket.save();
    }
    
    // End listening sessions for current ticket
    await endListeningSessionsForTicket(currentTicket._id.toString());

    let iterator = currentTicket;
    const visited = new Set();
    let finalizeTicket = null;

    while (iterator && iterator.nextTicketId) {
      if (visited.has(iterator.nextTicketId)) {
        break;
      }
      visited.add(iterator.nextTicketId);

      const nextTicket = await AssignmentTicket.findById(iterator.nextTicketId);
      if (!nextTicket) {
        break;
      }

      if (nextTicket.workflowStep === 'finalize') {
        finalizeTicket = nextTicket;
        break;
      }

      nextTicket.status = 'skipped';
      nextTicket.reviewedBy = reviewedBy;
      nextTicket.reviewedAt = new Date();
      await nextTicket.save();
      
      // End listening sessions for skipped tickets
      await endListeningSessionsForTicket(nextTicket._id.toString());

      iterator = nextTicket;
    }

    if (!finalizeTicket) {
      finalizeTicket = new AssignmentTicket({
        studentId: currentTicket.studentId,
        studentName: currentTicket.studentName,
        workflowStep: 'finalize',
        assignedTeacherId: reviewedBy || currentTicket.assignedTeacherId || '',
        assignedTeacherName: 'Admin',
        status: 'approved',
        previousTicketId: currentTicket._id.toString(),
        program: currentTicket.program,
        reviewedBy,
        reviewedAt: new Date()
      });
      await finalizeTicket.save();
    } else {
      finalizeTicket.previousTicketId = currentTicket._id.toString();
      finalizeTicket.status = 'approved';
      finalizeTicket.reviewedBy = reviewedBy;
      finalizeTicket.reviewedAt = new Date();
      if (!finalizeTicket.assignedTeacherName) {
        finalizeTicket.assignedTeacherName = 'Admin';
      }
      if (!finalizeTicket.assignedTeacherId && reviewedBy) {
        finalizeTicket.assignedTeacherId = reviewedBy;
      }
      await finalizeTicket.save();
    }

    currentTicket.nextTicketId = finalizeTicket._id.toString();
    await currentTicket.save();

    res.json({
      ticket: finalizeTicket,
      message: 'Workflow fast-forwarded to finalize step.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Finalize ticket (Admin adds homework and creates assignment)
app.post('/api/tickets/:id/finalize', async (req, res) => {
  try {
    const ticket = await AssignmentTicket.findById(req.params.id);
    if (!ticket) {
      console.error(`❌ Ticket not found: ${req.params.id}`);
      return res.status(404).json({ error: `Ticket not found: ${req.params.id}` });
    }
    
    // Only finalize step tickets can be finalized
    if (ticket.workflowStep !== 'finalize') {
      return res.status(400).json({ error: 'Only finalize step tickets can be finalized' });
    }
    
    const buildTicketClassworkContext = async () => {
      const ticketChain = [];
      let currentTicket = ticket;
      while (currentTicket) {
        ticketChain.unshift({
          step: currentTicket.workflowStep,
          teacherName: currentTicket.assignedTeacherName,
          teacherId: currentTicket.assignedTeacherId,
          progressNotes: currentTicket.progressNotes,
          assignmentRange: currentTicket.assignmentRange,
          assignmentPortion: currentTicket.assignmentPortion
        });
        
        if (currentTicket.previousTicketId) {
          currentTicket = await AssignmentTicket.findById(currentTicket.previousTicketId);
        } else {
          currentTicket = null;
        }
      }

      const sectionCounters = {};
      const classworkSections = [];
      const formatPortionLabel = (portion) => {
        if (!portion) return '';
        switch (portion.toLowerCase()) {
          case 'quarter':
            return '¼ Juz';
          case 'half':
            return '½ Juz';
          case 'three_quarters':
            return '¾ Juz';
          case 'full':
            return 'Full Juz';
          default:
            return portion;
        }
      };

      ticketChain.forEach((entry) => {
        const normalizedStep = (entry.step || '').toLowerCase();
        if (!['sabq', 'sabqi', 'manzil'].includes(normalizedStep)) {
          return;
        }

        const portionRaw = (entry.assignmentPortion || '').trim();
        const notes = (entry.progressNotes || '').trim();

        sectionCounters[normalizedStep] = (sectionCounters[normalizedStep] || 0) + 1;
        const count = sectionCounters[normalizedStep];
        const baseTitle = normalizedStep.charAt(0).toUpperCase() + normalizedStep.slice(1);
        const title = count > 1 ? `${baseTitle} ${count}` : baseTitle;

        classworkSections.push({
          step: normalizedStep,
          title,
          details: notes,
          teacherName: entry.teacherName || '',
          order: classworkSections.length,
          assignmentRange: entry.assignmentRange || '',
          assignmentPortion: portionRaw
        });
      });

      ticket.classworkSections = classworkSections;

      const listenersInfo = classworkSections
        .filter(section => section.teacherName)
        .map(section => {
          const parts = [section.title];
          if (section.teacherName) parts.push(`Teacher: ${section.teacherName}`);
          if (section.assignmentRange) parts.push(section.assignmentRange);
          if (section.assignmentPortion) parts.push(formatPortionLabel(section.assignmentPortion));
          if (section.details) parts.push(section.details);
          return parts.join(' — ');
        })
        .join('\n');

      const chainLength = ticketChain.length;
      let classworkType = ticket.workflowStep;
      if (classworkType === 'finalize') {
        const previousEntry = chainLength >= 2 ? ticketChain[chainLength - 2] : null;
        classworkType = (previousEntry?.step) || 'sabq';
      }

      const mainListener = ticketChain.find(t => t.step === 'sabq') || ticketChain[0];

      const fullDescription = [ticket.finalReport || '', listenersInfo]
        .filter(Boolean)
        .join('\n\n');

      return {
        ticketChain,
        classworkSections,
        listenersInfo,
        classworkType,
        mainListener,
        fullDescription
      };
    };
    
    // Check if assignment already exists for this ticket (by fromTicketId)
    const existingAssignmentByTicketId = await Assignment.findOne({ fromTicketId: ticket._id.toString() });
    if (existingAssignmentByTicketId) {
      // Update ticket and assignment
      ticket.finalReport = req.body.finalReport;
      ticket.homework = req.body.homework;
      ticket.homeworkLink = req.body.homeworkLink || '';
      ticket.reviewedBy = req.body.reviewedBy;
      ticket.reviewedAt = new Date();
      ticket.status = 'finalized';
      const {
        classworkSections,
        fullDescription,
        mainListener,
        classworkType
      } = await buildTicketClassworkContext();
      if (!ticket.assignmentId) {
        ticket.assignmentId = existingAssignmentByTicketId._id.toString();
      }
      await ticket.save();
      
      // Update existing assignment
      existingAssignmentByTicketId.description = fullDescription || req.body.finalReport || '';
      existingAssignmentByTicketId.homeworkComments = req.body.homework || '';
      existingAssignmentByTicketId.homeworkLink = req.body.homeworkLink || '';
      existingAssignmentByTicketId.classworkSections = classworkSections;
      if (classworkType) {
        existingAssignmentByTicketId.classworkType = classworkType;
      }
      if (mainListener) {
        if (mainListener.teacherName) {
          existingAssignmentByTicketId.listenerName = mainListener.teacherName;
        }
        if (mainListener.teacherId) {
          existingAssignmentByTicketId.listenerId = mainListener.teacherId;
        }
      }
      await existingAssignmentByTicketId.save();
      
      return res.json({
        ticket: ticket,
        assignment: existingAssignmentByTicketId,
        message: 'Ticket finalized and assignment updated successfully'
      });
    }
    
    // Check if ticket is already finalized with assignmentId
    if (ticket.status === 'finalized' && ticket.assignmentId) {
      // Return existing assignment
      const existingAssignment = await Assignment.findById(ticket.assignmentId);
      if (existingAssignment) {
        return res.json({
          ticket: ticket,
          assignment: existingAssignment,
          message: 'Ticket already finalized'
        });
      }
    }
    
    // Update ticket with final report and homework
    ticket.finalReport = req.body.finalReport;
    ticket.homework = req.body.homework;
    ticket.homeworkLink = req.body.homeworkLink || '';
    ticket.reviewedBy = req.body.reviewedBy;
    ticket.reviewedAt = new Date();
    ticket.status = 'finalized';
    
    const {
      classworkSections,
      listenersInfo,
      classworkType,
      mainListener,
      fullDescription
    } = await buildTicketClassworkContext();
    
    // Get assignedBy - use reviewedBy if it's a valid ObjectId, otherwise use a default admin ID
    let assignedBy = req.body.reviewedBy || ticket.assignedTeacherId;
    // If assignedBy is not a valid ObjectId, try to find an admin user
    if (!assignedBy || !mongoose.Types.ObjectId.isValid(assignedBy)) {
      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        assignedBy = adminUser._id;
      } else {
        // Fallback to superadmin if no admin found
        const superAdmin = await User.findOne({ role: 'superadmin' });
        assignedBy = superAdmin ? superAdmin._id : new mongoose.Types.ObjectId();
      }
    }
    
    // Create new assignment
    let assignment;
    try {
      assignment = new Assignment({
        title: `${classworkType} - ${ticket.studentName}`,
        description: fullDescription,
        type: 'classwork',
        classworkType: classworkType,
        program: ticket.program,
        assignedTo: [ticket.studentId],
        assignedBy: assignedBy,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'published',
        homeworkComments: ticket.homework,
        homeworkLink: ticket.homeworkLink,
        listenerName: mainListener?.teacherName || ticket.assignedTeacherName || 'Teacher',
        listenerId: mainListener?.teacherId || ticket.assignedTeacherId,
        fromTicketId: ticket._id.toString(), // Link to ticket
        mushafMarkings: ticket.mushafMarkings || [], // Copy mistake markings
        classworkSections: classworkSections
    });
    
    await assignment.save();
    } catch (saveError) {
      // If duplicate key error, try to find and update existing assignment
      if (saveError.code === 11000) {
        console.error(`⚠️ Duplicate key error for ticket ${ticket._id}:`, saveError.message);
        // Try to find assignment by fromTicketId (most reliable)
        const existingAssignment = await Assignment.findOne({ fromTicketId: ticket._id.toString() });
        if (existingAssignment) {
          assignment = existingAssignment;
          // Update existing assignment
          assignment.title = `${classworkType} - ${ticket.studentName}`;
          assignment.description = ticket.finalReport || '';
          assignment.homeworkComments = ticket.homework;
          assignment.homeworkLink = ticket.homeworkLink;
          assignment.fromTicketId = ticket._id.toString(); // Ensure this is set
          assignment.classworkSections = classworkSections;
          await assignment.save();
          console.log(`✅ Updated existing assignment ${assignment._id} for ticket ${ticket._id}`);
        } else {
          // The duplicate key error is likely due to a unique index on assignmentId field
          // Try to find any assignment that might be related to this ticket
          // Search by student and classwork type as well
          let searchClassworkType = classworkType;
          const conflictingAssignment = await Assignment.findOne({ 
            $or: [
              { fromTicketId: ticket._id.toString() },
              { 
                'assignedTo': ticket.studentId,
                classworkType: searchClassworkType,
                program: ticket.program
              }
            ]
          }).sort({ createdAt: -1 }); // Get most recent
          
          if (conflictingAssignment) {
            assignment = conflictingAssignment;
            // Update existing assignment
            assignment.title = `${classworkType} - ${ticket.studentName}`;
            assignment.description = ticket.finalReport || '';
            assignment.homeworkComments = ticket.homework;
            assignment.homeworkLink = ticket.homeworkLink;
            assignment.fromTicketId = ticket._id.toString(); // Ensure this is set
            assignment.classworkSections = classworkSections;
            await assignment.save();
            console.log(`✅ Updated conflicting assignment ${assignment._id} for ticket ${ticket._id}`);
          } else {
            // If still not found, this is a database index issue
            // Return a more helpful error message
            console.error(`❌ Could not find existing assignment for ticket ${ticket._id}. Duplicate key error: ${saveError.message}`);
            return res.status(500).json({ 
              error: 'Failed to create assignment. A duplicate assignment may already exist. Please contact support.',
              details: saveError.message
            });
          }
        }
      } else {
        throw saveError;
      }
    }
    
    // Update ticket with assignment ID
    ticket.assignmentId = assignment._id.toString();
    await ticket.save();
    
    res.json({
      ticket: ticket,
      assignment: assignment,
      message: 'Ticket finalized and assignment created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single ticket (must come AFTER specific routes)
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

// Create ticket (Admin assigns to teacher) - Auto-creates full workflow chain
app.post('/api/tickets', async (req, res) => {
  try {
    const { autoCreateChain, ...ticketData } = req.body;
    
    // If creating sabq ticket and autoCreateChain is true, create the full chain
    if (autoCreateChain && ticketData.workflowStep === 'sabq') {
      const sabqTicket = new AssignmentTicket({
        ...ticketData,
        workflowStep: 'sabq',
        status: 'assigned'
      });
      await sabqTicket.save();
      
      // Create subsequent tickets in chain (but don't assign teachers yet - assign when previous is approved)
      const sabqiTicket = new AssignmentTicket({
        studentId: ticketData.studentId,
        studentName: ticketData.studentName,
        workflowStep: 'sabqi',
        assignedTeacherId: ticketData.assignedTeacherId || 'pending',
        assignedTeacherName: 'TBD',
        status: 'pending', // New status - waiting for previous step
        previousTicketId: sabqTicket._id.toString(),
        program: ticketData.program
      });
      await sabqiTicket.save();
      sabqTicket.nextTicketId = sabqiTicket._id.toString();
      
      const manzilTicket = new AssignmentTicket({
        studentId: ticketData.studentId,
        studentName: ticketData.studentName,
        workflowStep: 'manzil',
        assignedTeacherId: ticketData.assignedTeacherId || 'pending',
        assignedTeacherName: 'TBD',
        status: 'pending',
        previousTicketId: sabqiTicket._id.toString(),
        program: ticketData.program
      });
      await manzilTicket.save();
      sabqiTicket.nextTicketId = manzilTicket._id.toString();
      
      const finalizeTicket = new AssignmentTicket({
        studentId: ticketData.studentId,
        studentName: ticketData.studentName,
        workflowStep: 'finalize',
        assignedTeacherId: ticketData.assignedTeacherId || 'admin',
        assignedTeacherName: 'Admin',
        status: 'pending',
        previousTicketId: manzilTicket._id.toString(),
        program: ticketData.program
      });
      await finalizeTicket.save();
      manzilTicket.nextTicketId = finalizeTicket._id.toString();
      
      await sabqTicket.save();
      await sabqiTicket.save();
      await manzilTicket.save();
      
      return res.status(201).json({
        sabq: sabqTicket,
        chainCreated: true,
        message: 'Full workflow chain created successfully'
      });
    } else {
      // Regular single ticket creation
      const ticket = new AssignmentTicket(ticketData);
      await ticket.save();
      res.status(201).json(ticket);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update ticket (Teacher updates progress or Admin reviews)
app.put('/api/tickets/:id', async (req, res) => {
  try {
    const oldTicket = await AssignmentTicket.findById(req.params.id);
    if (!oldTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    const wasApproved = oldTicket.status === 'approved';
    const isBeingApproved = req.body.status === 'approved';
    
    const ticket = await AssignmentTicket.findByIdAndUpdate(
      req.params.id,
      { $set: req.body, updatedAt: new Date() },
      { new: true }
    );
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // If ticket status changed to approved, end any associated listening sessions
    if (!wasApproved && isBeingApproved) {
      const ticketId = ticket._id.toString();
      const activeSessions = await ListeningSession.find({
        ticketId: ticketId,
        status: 'in_progress'
      });
      
      for (const session of activeSessions) {
        session.status = 'completed';
        session.endedAt = new Date();
        session.lastHeartbeatAt = new Date();
        
        if (session.startedAt) {
          session.totalListeningSeconds = Math.max(
            0,
            Math.round((new Date().getTime() - session.startedAt.getTime()) / 1000)
          );
        }
        
        await session.save();
        const serialized = serializeListeningSession(session);
        broadcastListeningSessionEvent('session_ended', serialized);
      }
    }
    
    // If mushafMarkings are provided, save them to student's personal Mushaf
    if (req.body.mushafMarkings && Array.isArray(req.body.mushafMarkings) && req.body.mushafMarkings.length > 0) {
      try {
        // Find or create student's personal Mushaf
        let personalMushaf = await StudentPersonalMushaf.findOne({ studentId: ticket.studentId });
        
        if (!personalMushaf) {
          personalMushaf = new StudentPersonalMushaf({
            studentId: ticket.studentId,
            studentName: ticket.studentName,
            mistakes: []
          });
        }
        
        // Add new mistakes to personal Mushaf (avoid duplicates)
        const existingMistakeIds = new Set(personalMushaf.mistakes.map((m) => m.id));
        
        req.body.mushafMarkings.forEach((mistake) => {
          // Only add if not already present (based on id or location)
          const isDuplicate = existingMistakeIds.has(mistake.id) || 
            personalMushaf.mistakes.some((existing) => 
              existing.page === mistake.page &&
              existing.surah === mistake.surah &&
              existing.ayah === mistake.ayah &&
              existing.wordIndex === mistake.wordIndex &&
              existing.type === mistake.type
            );
          
          if (!isDuplicate) {
            personalMushaf.mistakes.push({
              ...mistake,
              ticketId: ticket._id.toString(),
              workflowStep: ticket.workflowStep,
              markedBy: ticket.assignedTeacherId,
              markedByName: ticket.assignedTeacherName,
              timestamp: mistake.timestamp || new Date(),
              createdAt: new Date()
            });
          }
        });
        
        await personalMushaf.save();
        console.log(`✅ Saved ${req.body.mushafMarkings.length} mistakes to personal Mushaf for student ${ticket.studentId}`);
      } catch (mushafError) {
        console.error('⚠️ Error saving to personal Mushaf:', mushafError);
        // Don't fail the request if personal Mushaf save fails
      }
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

const detachTicketFromChain = async (ticket) => {
  if (!ticket) return;

  if (ticket.previousTicketId) {
    const previous = await AssignmentTicket.findById(ticket.previousTicketId);
    if (previous && previous.nextTicketId === ticket._id.toString()) {
      previous.nextTicketId = ticket.nextTicketId || '';
      await previous.save();
    }
  }

  if (ticket.nextTicketId) {
    const next = await AssignmentTicket.findById(ticket.nextTicketId);
    if (next && next.previousTicketId === ticket._id.toString()) {
      next.previousTicketId = ticket.previousTicketId || '';
      await next.save();
    }
  }
};

// Delete ticket
app.delete('/api/tickets/:id', async (req, res) => {
  try {
    const ticketId = req.params.id;
    const ticket = await AssignmentTicket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    await detachTicketFromChain(ticket);
    await AssignmentTicket.deleteOne({ _id: ticketId });

    res.json({ message: 'Ticket deleted successfully', ticketId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk delete tickets
app.post('/api/tickets/bulk-delete', async (req, res) => {
  try {
    const { ticketIds } = req.body;

    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({ error: 'ticketIds array is required' });
    }

    const uniqueIds = [...new Set(ticketIds.map((id) => id?.toString()).filter(Boolean))];
    const results = {
      deleted: [],
      notFound: [],
      errors: [],
    };

    for (const ticketId of uniqueIds) {
      try {
        const ticket = await AssignmentTicket.findById(ticketId);
        if (!ticket) {
          results.notFound.push(ticketId);
          continue;
        }

        await detachTicketFromChain(ticket);
        await AssignmentTicket.deleteOne({ _id: ticketId });
        results.deleted.push(ticketId);
      } catch (error) {
        results.errors.push({ ticketId, message: error.message });
      }
    }

    res.json({
      message: `Bulk delete processed. Removed ${results.deleted.length} tickets.`,
      ...results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve ticket (just approve, don't advance)
app.post('/api/tickets/:id/approve', async (req, res) => {
  try {
    const ticket = await AssignmentTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    ticket.status = 'approved';
    ticket.reviewedBy = req.body.reviewedBy;
    ticket.reviewedAt = new Date();
    await ticket.save();
    
    // End any associated listening sessions for this ticket
    const ticketId = ticket._id.toString();
    const activeSessions = await ListeningSession.find({
      ticketId: ticketId,
      status: 'in_progress'
    });
    
    for (const session of activeSessions) {
      session.status = 'completed';
      session.endedAt = new Date();
      session.lastHeartbeatAt = new Date();
      
      if (session.startedAt) {
        session.totalListeningSeconds = Math.max(
          0,
          Math.round((new Date().getTime() - session.startedAt.getTime()) / 1000)
        );
      }
      
      await session.save();
      const serialized = serializeListeningSession(session);
      broadcastListeningSessionEvent('session_ended', serialized);
    }
    
    res.json({ 
      ticket: ticket,
      message: 'Ticket approved successfully.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve and advance ticket (Combines approve + assign next in one action - kept for backward compatibility)
app.post('/api/tickets/:id/approve-and-advance', async (req, res) => {
  try {
    const currentTicket = await AssignmentTicket.findById(req.params.id);
    if (!currentTicket) {
      return res.status(404).json({ error: 'Current ticket not found' });
    }

    // Update current ticket to approved
    currentTicket.status = 'approved';
    currentTicket.reviewedBy = req.body.reviewedBy;
    currentTicket.reviewedAt = new Date();
    await currentTicket.save();
    
    // End any associated listening sessions for this ticket
    const ticketId = currentTicket._id.toString();
    const activeSessions = await ListeningSession.find({
      ticketId: ticketId,
      status: 'in_progress'
    });
    
    for (const session of activeSessions) {
      session.status = 'completed';
      session.endedAt = new Date();
      session.lastHeartbeatAt = new Date();
      
      if (session.startedAt) {
        session.totalListeningSeconds = Math.max(
          0,
          Math.round((new Date().getTime() - session.startedAt.getTime()) / 1000)
        );
      }
      
      await session.save();
      const serialized = serializeListeningSession(session);
      broadcastListeningSessionEvent('session_ended', serialized);
    }
    
    // If not finalize step, activate and assign next ticket
    if (currentTicket.workflowStep !== 'finalize') {
      const workflowFlow = { sabq: 'sabqi', sabqi: 'manzil', manzil: 'finalize' };
      const nextStep = workflowFlow[currentTicket.workflowStep];
      
      if (nextStep && currentTicket.nextTicketId) {
        // Find and activate next ticket
        const nextTicket = await AssignmentTicket.findById(currentTicket.nextTicketId);
        if (nextTicket) {
          // Assign teacher if provided, otherwise keep as admin (for finalize)
          if (req.body.nextTeacherId && req.body.nextTeacherName) {
            nextTicket.assignedTeacherId = req.body.nextTeacherId;
            nextTicket.assignedTeacherName = req.body.nextTeacherName;
          }
          nextTicket.status = 'assigned';
          await nextTicket.save();
        }
      }
    }
    
    res.json({ 
      ticket: currentTicket,
      message: currentTicket.workflowStep === 'finalize' 
        ? 'Ticket approved. Ready to add homework.'
        : 'Ticket approved. Next step activated.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign ticket to next teacher (can be done separately after approval)
app.post('/api/tickets/:id/assign-next', async (req, res) => {
  try {
    const currentTicket = await AssignmentTicket.findById(req.params.id);
    if (!currentTicket) {
      return res.status(404).json({ error: 'Current ticket not found' });
    }
    
    // If not finalize step, activate and assign next ticket
    if (currentTicket.workflowStep === 'finalize') {
      return res.status(400).json({ error: 'Cannot assign next step for finalize ticket. Use finalize endpoint instead.' });
    }
    
    const workflowFlow = { sabq: 'sabqi', sabqi: 'manzil', manzil: 'finalize' };
    const nextStep = workflowFlow[currentTicket.workflowStep];
    
    if (!req.body.assignedTeacherId || !req.body.assignedTeacherName) {
      return res.status(400).json({ error: 'Teacher ID and name are required' });
    }
    
    if (!nextStep) {
      return res.status(400).json({ error: 'No next step available for this ticket' });
    }
    
    let nextTicket = null;
    
    // If nextTicketId exists, find and activate it
    if (currentTicket.nextTicketId) {
      nextTicket = await AssignmentTicket.findById(currentTicket.nextTicketId);
    }
    
    // If next ticket doesn't exist, create it
    if (!nextTicket) {
      nextTicket = new AssignmentTicket({
        studentId: currentTicket.studentId,
        studentName: currentTicket.studentName,
        workflowStep: nextStep,
        assignedTeacherId,
        assignedTeacherName,
        status: 'assigned',
        previousTicketId: currentTicket._id.toString(),
        program: currentTicket.program,
        revisionNotes: internalNote ? internalNote.trim() : undefined
      });
      await nextTicket.save();
      
      // Update current ticket with next ticket reference
      currentTicket.nextTicketId = nextTicket._id.toString();
      await currentTicket.save();
    } else {
      // Assign teacher to existing next ticket
      nextTicket.assignedTeacherId = assignedTeacherId;
      nextTicket.assignedTeacherName = assignedTeacherName;
      nextTicket.status = 'assigned';
      if (typeof internalNote === 'string') {
        nextTicket.revisionNotes = internalNote.trim();
      }
      await nextTicket.save();
    }
    
    res.json({ 
      ticket: nextTicket,
      message: `Next step (${nextStep}) activated and assigned to ${nextTicket.assignedTeacherName}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


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

// Health check - improved with database connectivity check
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const healthStatus = {
      status: 'OK',
      message: 'Backend is running',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      uptime: process.uptime()
    };
    
    // If database is not connected, still return 200 but indicate the issue
    res.json(healthStatus);
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server regardless of MongoDB connection status
// Bind to 0.0.0.0 for deployment platforms (Render, Heroku, etc.)
const HOST = process.env.HOST || '0.0.0.0';
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
