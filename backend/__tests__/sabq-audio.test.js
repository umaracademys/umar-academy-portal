/**
 * COMPREHENSIVE TEST SUITE: Sabq Audio Handling Pipeline
 * 
 * Tests the complete audio flow:
 * 1. Audio upload with validation
 * 2. Ticket → Assignment audio persistence
 * 3. Sync regression (audio survives re-sync)
 * 4. Permission checks
 * 
 * Dependencies: Jest, Supertest, MongoDB (test database)
 */

const request = require('supertest');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import app (adjust path as needed)
let app;
let server;

// Test data
let testStudentId;
let testTicketId;
let testSabqEntryId;
let testMistakeId;
let testAssignmentId;
let adminToken;
let teacherToken;
let studentToken;

// Create a test audio file (mock MP3)
const createTestAudioFile = () => {
  const testAudioDir = path.join(__dirname, '..', 'uploads', 'sabq-audio');
  if (!fs.existsSync(testAudioDir)) {
    fs.mkdirSync(testAudioDir, { recursive: true });
  }
  
  // Create a minimal MP3 file (just header bytes)
  const mp3Header = Buffer.from([
    0xFF, 0xFB, 0x90, 0x00, // MP3 sync word + header
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00
  ]);
  
  const testFilePath = path.join(testAudioDir, 'test-audio.mp3');
  fs.writeFileSync(testFilePath, mp3Header);
  return testFilePath;
};

// Create a test WAV file
const createTestWavFile = () => {
  const testAudioDir = path.join(__dirname, '..', 'uploads', 'sabq-audio');
  if (!fs.existsSync(testAudioDir)) {
    fs.mkdirSync(testAudioDir, { recursive: true });
  }
  
  // Create a minimal WAV file (just header)
  const wavHeader = Buffer.from('RIFF');
  const wavSize = Buffer.alloc(4);
  wavSize.writeUInt32LE(36, 0);
  const wavData = Buffer.from('WAVE');
  const fmt = Buffer.from('fmt ');
  const fmtSize = Buffer.alloc(4);
  fmtSize.writeUInt32LE(16, 0);
  
  const wavBuffer = Buffer.concat([wavHeader, wavSize, wavData, fmt, fmtSize]);
  
  const testFilePath = path.join(testAudioDir, 'test-audio.wav');
  fs.writeFileSync(testFilePath, wavBuffer);
  return testFilePath;
};

beforeAll(async () => {
  // Initialize app and server
  // Adjust this based on your server setup
  const serverModule = require('../server');
  app = serverModule.app || serverModule;
  
  // Connect to test database
  const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/umar-academy-test';
  await mongoose.connect(TEST_MONGODB_URI);
  
  // Create test users and get tokens
  // This assumes you have test user creation helpers
  // Adjust based on your auth setup
  adminToken = 'test-admin-token'; // Replace with actual token generation
  teacherToken = 'test-teacher-token';
  studentToken = 'test-student-token';
  
  // Create test data
  const Student = mongoose.model('Student');
  const Ticket = mongoose.model('Ticket');
  const Assignment = mongoose.model('Assignment');
  
  // Create test student
  const student = new Student({
    name: 'Test Student',
    email: 'teststudent@test.com',
    program: 'Full Time HQ'
  });
  await student.save();
  testStudentId = student._id.toString();
  
  // Create test Sabq ticket
  const ticket = new Ticket({
    studentId: testStudentId,
    studentName: 'Test Student',
    type: 'sabq',
    status: 'pending',
    createdBy: 'test-admin-id',
    createdByName: 'Test Admin',
    sabqEntries: [{
      id: 'sabq-entry-1',
      recitationRange: {
        surahNumber: 1,
        surahName: 'الفاتحة',
        startAyahNumber: 1,
        startAyahText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        endAyahNumber: 7,
        endAyahText: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ'
      },
      mistakes: [{
        id: 'mistake-1',
        type: 'madd',
        page: 1,
        surah: 1,
        ayah: 1,
        wordIndex: 1,
        wordText: 'اللَّهِ'
      }],
      mistakeCount: 1,
      atkees: 5
    }]
  });
  await ticket.save();
  testTicketId = ticket._id.toString();
  testSabqEntryId = 'sabq-entry-1';
  testMistakeId = 'mistake-1';
});

afterAll(async () => {
  // Cleanup test data
  const Student = mongoose.model('Student');
  const Ticket = mongoose.model('Ticket');
  const Assignment = mongoose.model('Assignment');
  const SabqAudioClip = mongoose.model('SabqAudioClip');
  
  await Student.deleteMany({ email: 'teststudent@test.com' });
  await Ticket.deleteMany({ studentId: testStudentId });
  await Assignment.deleteMany({ studentId: testStudentId });
  await SabqAudioClip.deleteMany({ studentId: testStudentId });
  
  // Cleanup test audio files
  const testAudioDir = path.join(__dirname, '..', 'uploads', 'sabq-audio');
  if (fs.existsSync(testAudioDir)) {
    const files = fs.readdirSync(testAudioDir);
    files.forEach(file => {
      if (file.startsWith('test-') || file.startsWith('sabq-')) {
        fs.unlinkSync(path.join(testAudioDir, file));
      }
    });
  }
  
  await mongoose.connection.close();
});

describe('PART 2: Audio Upload Endpoint', () => {
  test('1. Upload valid MP3 file', async () => {
    const testAudioPath = createTestAudioFile();
    
    const response = await request(app)
      .post('/api/audio/sabq/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('studentId', testStudentId)
      .field('ticketId', testTicketId)
      .field('sabqEntryId', testSabqEntryId)
      .field('surahNumber', '1')
      .field('ayahNumber', '1')
      .field('wordText', 'اللَّهِ')
      .field('mistakeId', testMistakeId)
      .attach('audio', testAudioPath);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('audioUrl');
    expect(response.body).toHaveProperty('format');
    expect(response.body.format).toBe('mp3');
    expect(response.body.audioUrl).toContain('/uploads/sabq-audio/');
    
    // Verify SabqAudioClip was created
    const SabqAudioClip = mongoose.model('SabqAudioClip');
    const audioClip = await SabqAudioClip.findOne({ ticketId: testTicketId });
    expect(audioClip).toBeTruthy();
    expect(audioClip.wordText).toBe('اللَّهِ'); // Arabic text preserved
    expect(audioClip.surahNumber).toBe(1);
    expect(audioClip.ayahNumber).toBe(1);
  });
  
  test('2. Upload valid WAV file', async () => {
    const testWavPath = createTestWavFile();
    
    const response = await request(app)
      .post('/api/audio/sabq/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('studentId', testStudentId)
      .field('ticketId', testTicketId)
      .field('sabqEntryId', testSabqEntryId)
      .field('surahNumber', '1')
      .field('ayahNumber', '2')
      .field('wordText', 'الرَّحْمَٰنِ')
      .attach('audio', testWavPath);
    
    expect(response.status).toBe(200);
    expect(response.body.format).toBe('wav');
  });
  
  test('3. Reject invalid file type', async () => {
    const invalidFile = path.join(__dirname, 'test-invalid.txt');
    fs.writeFileSync(invalidFile, 'This is not an audio file');
    
    const response = await request(app)
      .post('/api/audio/sabq/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('studentId', testStudentId)
      .field('ticketId', testTicketId)
      .field('sabqEntryId', testSabqEntryId)
      .field('surahNumber', '1')
      .field('ayahNumber', '1')
      .field('wordText', 'اللَّهِ')
      .attach('audio', invalidFile);
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid file type');
    
    fs.unlinkSync(invalidFile);
  });
  
  test('4. Reject oversized file', async () => {
    // Create a file larger than 10MB
    const largeFile = path.join(__dirname, 'large-file.mp3');
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
    fs.writeFileSync(largeFile, largeBuffer);
    
    const response = await request(app)
      .post('/api/audio/sabq/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('studentId', testStudentId)
      .field('ticketId', testTicketId)
      .field('sabqEntryId', testSabqEntryId)
      .field('surahNumber', '1')
      .field('ayahNumber', '1')
      .field('wordText', 'اللَّهِ')
      .attach('audio', largeFile);
    
    expect(response.status).toBe(413);
    expect(response.body.error).toContain('File too large');
    
    fs.unlinkSync(largeFile);
  });
  
  test('5. Reject missing required fields', async () => {
    const testAudioPath = createTestAudioFile();
    
    const response = await request(app)
      .post('/api/audio/sabq/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('studentId', testStudentId)
      // Missing ticketId, sabqEntryId, etc.
      .attach('audio', testAudioPath);
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Missing required fields');
  });
  
  test('6. Ensure Arabic wordText is saved', async () => {
    const testAudioPath = createTestAudioFile();
    const arabicWord = 'الرَّحِيمِ';
    
    const response = await request(app)
      .post('/api/audio/sabq/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('studentId', testStudentId)
      .field('ticketId', testTicketId)
      .field('sabqEntryId', testSabqEntryId)
      .field('surahNumber', '1')
      .field('ayahNumber', '1')
      .field('wordText', arabicWord)
      .attach('audio', testAudioPath);
    
    expect(response.status).toBe(200);
    
    // Verify Arabic text is preserved
    const SabqAudioClip = mongoose.model('SabqAudioClip');
    const audioClip = await SabqAudioClip.findOne({ wordText: arabicWord });
    expect(audioClip).toBeTruthy();
    expect(audioClip.wordText).toBe(arabicWord);
  });
});

describe('PART 4: Ticket → Assignment Audio Persistence', () => {
  test('1. Audio URL exists in assignment after ticket submit', async () => {
    // First, upload audio to a mistake
    const testAudioPath = createTestAudioFile();
    const uploadResponse = await request(app)
      .post('/api/audio/sabq/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('studentId', testStudentId)
      .field('ticketId', testTicketId)
      .field('sabqEntryId', testSabqEntryId)
      .field('surahNumber', '1')
      .field('ayahNumber', '1')
      .field('wordText', 'اللَّهِ')
      .field('mistakeId', testMistakeId)
      .attach('audio', testAudioPath);
    
    expect(uploadResponse.status).toBe(200);
    const audioUrl = uploadResponse.body.audioUrl;
    
    // Submit the Sabq ticket
    const Ticket = mongoose.model('Ticket');
    const ticket = await Ticket.findById(testTicketId);
    ticket.sabqEntries[0].mistakes[0].audioUrl = audioUrl;
    await ticket.save();
    
    const submitResponse = await request(app)
      .post(`/api/tickets/${testTicketId}/submit-sabq`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sabqEntries: ticket.sabqEntries,
        homeworkRange: null,
        adminComment: 'Test comment'
      });
    
    expect(submitResponse.status).toBe(200);
    
    // Verify assignment has audioUrl
    const Assignment = mongoose.model('Assignment');
    const assignment = await Assignment.findOne({ studentId: testStudentId, status: 'active' });
    expect(assignment).toBeTruthy();
    
    const sabqEntry = assignment.classwork.sabq.find(e => e.fromTicketId === testTicketId);
    expect(sabqEntry).toBeTruthy();
    
    const mistake = sabqEntry.mistakes.find(m => m.id === testMistakeId);
    expect(mistake).toBeTruthy();
    expect(mistake.audioUrl).toBe(audioUrl); // Audio URL preserved
    expect(mistake.wordText).toBe('اللَّهِ'); // Arabic wordText preserved
    
    testAssignmentId = assignment._id.toString();
  });
});

describe('PART 5: Sync Regression Test', () => {
  test('1. Audio URL survives syncAssignmentFromTickets', async () => {
    const Assignment = mongoose.model('Assignment');
    const assignment = await Assignment.findById(testAssignmentId);
    
    // Get the audioUrl before sync
    const sabqEntry = assignment.classwork.sabq.find(e => e.fromTicketId === testTicketId);
    const mistake = sabqEntry.mistakes.find(m => m.id === testMistakeId);
    const originalAudioUrl = mistake.audioUrl;
    
    expect(originalAudioUrl).toBeTruthy();
    
    // Manually remove audioUrl to simulate missing data
    mistake.audioUrl = undefined;
    await assignment.save();
    
    // Run sync
    const { syncAssignmentFromTickets } = require('../server');
    const syncedAssignment = await syncAssignmentFromTickets(assignment);
    
    // Verify audioUrl is restored
    const syncedSabqEntry = syncedAssignment.classwork.sabq.find(e => e.fromTicketId === testTicketId);
    const syncedMistake = syncedSabqEntry.mistakes.find(m => m.id === testMistakeId);
    expect(syncedMistake.audioUrl).toBe(originalAudioUrl);
  });
  
  test('2. No duplication of audio URLs', async () => {
    const Assignment = mongoose.model('Assignment');
    const assignment = await Assignment.findById(testAssignmentId);
    
    // Count audio URLs before sync
    const sabqEntry = assignment.classwork.sabq.find(e => e.fromTicketId === testTicketId);
    const audioUrlCountBefore = sabqEntry.mistakes.filter(m => m.audioUrl).length;
    
    // Run sync multiple times
    const { syncAssignmentFromTickets } = require('../server');
    await syncAssignmentFromTickets(assignment);
    await assignment.save();
    await syncAssignmentFromTickets(assignment);
    await assignment.save();
    
    // Reload assignment
    const reloadedAssignment = await Assignment.findById(testAssignmentId);
    const reloadedSabqEntry = reloadedAssignment.classwork.sabq.find(e => e.fromTicketId === testTicketId);
    const audioUrlCountAfter = reloadedSabqEntry.mistakes.filter(m => m.audioUrl).length;
    
    expect(audioUrlCountAfter).toBe(audioUrlCountBefore); // No duplication
  });
});

describe('PART 5: Permission Test', () => {
  test('1. Student cannot upload audio', async () => {
    const testAudioPath = createTestAudioFile();
    
    const response = await request(app)
      .post('/api/audio/sabq/upload')
      .set('Authorization', `Bearer ${studentToken}`)
      .field('studentId', testStudentId)
      .field('ticketId', testTicketId)
      .field('sabqEntryId', testSabqEntryId)
      .field('surahNumber', '1')
      .field('ayahNumber', '1')
      .field('wordText', 'اللَّهِ')
      .attach('audio', testAudioPath);
    
    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Only admins and teachers');
  });
  
  test('2. Teacher can upload audio', async () => {
    const testAudioPath = createTestAudioFile();
    
    const response = await request(app)
      .post('/api/audio/sabq/upload')
      .set('Authorization', `Bearer ${teacherToken}`)
      .field('studentId', testStudentId)
      .field('ticketId', testTicketId)
      .field('sabqEntryId', testSabqEntryId)
      .field('surahNumber', '1')
      .field('ayahNumber', '3')
      .field('wordText', 'الرَّحْمَٰنِ')
      .attach('audio', testAudioPath);
    
    expect(response.status).toBe(200);
  });
  
  test('3. Admin can upload audio', async () => {
    const testAudioPath = createTestAudioFile();
    
    const response = await request(app)
      .post('/api/audio/sabq/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('studentId', testStudentId)
      .field('ticketId', testTicketId)
      .field('sabqEntryId', testSabqEntryId)
      .field('surahNumber', '1')
      .field('ayahNumber', '4')
      .field('wordText', 'مَالِكِ')
      .attach('audio', testAudioPath);
    
    expect(response.status).toBe(200);
  });
});

describe('PART 3: Audio Retrieval Endpoints', () => {
  test('1. GET /api/audio/sabq/by-ticket/:ticketId returns grouped audio', async () => {
    const response = await request(app)
      .get(`/api/audio/sabq/by-ticket/${testTicketId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('audioClips');
    expect(response.body).toHaveProperty('ticketId');
    expect(Array.isArray(response.body.audioClips)).toBe(true);
    
    // Verify grouping structure
    if (response.body.audioClips.length > 0) {
      const surah = response.body.audioClips[0];
      expect(surah).toHaveProperty('surahNumber');
      expect(surah).toHaveProperty('ayahs');
      expect(Array.isArray(surah.ayahs)).toBe(true);
      
      if (surah.ayahs.length > 0) {
        const ayah = surah.ayahs[0];
        expect(ayah).toHaveProperty('ayahNumber');
        expect(ayah).toHaveProperty('words');
        expect(Array.isArray(ayah.words)).toBe(true);
        
        if (ayah.words.length > 0) {
          const word = ayah.words[0];
          expect(word).toHaveProperty('wordText'); // Arabic text preserved
          expect(word).toHaveProperty('audioUrl');
        }
      }
    }
  });
  
  test('2. GET /api/audio/sabq/by-assignment/:assignmentId returns grouped audio', async () => {
    const response = await request(app)
      .get(`/api/audio/sabq/by-assignment/${testAssignmentId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('audioClips');
    expect(response.body).toHaveProperty('assignmentId');
    expect(Array.isArray(response.body.audioClips)).toBe(true);
  });
  
  test('3. Audio retrieval preserves Arabic wordText', async () => {
    const response = await request(app)
      .get(`/api/audio/sabq/by-ticket/${testTicketId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    
    // Find word with Arabic text
    let foundArabicWord = false;
    response.body.audioClips.forEach(surah => {
      surah.ayahs.forEach(ayah => {
        ayah.words.forEach(word => {
          if (word.wordText && /[\u0600-\u06FF]/.test(word.wordText)) {
            foundArabicWord = true;
            expect(word.wordText).toBeTruthy(); // Arabic text preserved
          }
        });
      });
    });
    
    expect(foundArabicWord).toBe(true);
  });
  
  test('4. Pagination works correctly', async () => {
    const response = await request(app)
      .get(`/api/audio/sabq/by-ticket/${testTicketId}?page=1&limit=10`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('page', 1);
    expect(response.body).toHaveProperty('limit', 10);
  });
});

describe('PART 6: Performance & Safety', () => {
  test('1. Graceful failure if audio missing', async () => {
    // Try to retrieve audio for non-existent ticket
    const fakeTicketId = new mongoose.Types.ObjectId().toString();
    const response = await request(app)
      .get(`/api/audio/sabq/by-ticket/${fakeTicketId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.audioClips).toEqual([]);
    expect(response.body.total).toBe(0);
  });
  
  test('2. Indexes exist for efficient queries', async () => {
    const SabqAudioClip = mongoose.model('SabqAudioClip');
    const indexes = await SabqAudioClip.collection.getIndexes();
    
    // Verify compound index exists
    expect(indexes).toHaveProperty('studentId_1_surahNumber_1_ayahNumber_1');
    expect(indexes).toHaveProperty('ticketId_1_sabqEntryId_1');
    expect(indexes).toHaveProperty('ticketId_1');
  });
});
