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
    const teachersWithArrays = teachers.map(teacher => ({
      ...teacher,
      assignedStudents: Array.isArray(teacher.assignedStudents) ? teacher.assignedStudents : [],
      _id: teacher._id.toString()
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
    const { teacherComment, mistakes } = req.body;
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'submitted',
        teacherComment: teacherComment || '',
        mistakes: mistakes || [],
        submittedAt: new Date()
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

// Admin approves and sends to assignment
app.post('/api/tickets/:id/approve-send', async (req, res) => {
  try {
    const { assignmentId } = req.body;
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
    
    console.log('💾 Saving ticket with assignment ID:', {
      ticketId: ticket._id,
      sentToAssignmentId: ticket.sentToAssignmentId,
      status: ticket.status
    });
    
    await ticket.save();
    
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

// Fix tickets that are missing sentToAssignmentId
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

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
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
