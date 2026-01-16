// MongoDB Schema for Recitation Sessions
const mongoose = require('mongoose');

const recitationSessionSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, index: true }, // Link to ticket
  studentId: { type: String, required: true, index: true },
  studentName: { type: String, required: true },
  teacherId: { type: String, required: true },
  teacherName: { type: String, required: true },
  workflowStep: { type: String, enum: ['sabq', 'sabqi', 'manzil'], required: true },
  
  // Session metadata
  startedAt: { type: Date, required: true },
  endedAt: { type: Date },
  duration: { type: Number }, // Duration in seconds
  zoomMeetingId: { type: String }, // Zoom meeting ID
  zoomParticipantId: { type: String }, // Student's Zoom participant ID
  
  // Recitation range
  surahNumber: { type: Number, required: true },
  startAyah: { type: Number, required: true },
  endAyah: { type: Number, required: true },
  startPage: { type: Number },
  endPage: { type: Number },
  
  // Transcription
  transcript: { type: String }, // Full transcript (Arabic text)
  transcriptSegments: [{ // Time-aligned segments
    text: String,
    startTime: Number, // Seconds from start
    endTime: Number,
    confidence: Number // 0-1
  }],
  
  // Expected text (from Mushaf)
  expectedText: { type: String, required: true }, // Expected recitation text
  expectedWords: [{ // Word-by-word expected text
    wordIndex: Number,
    surah: Number,
    ayah: Number,
    text: String,
    page: Number
  }],
  
  // Detected mistakes
  detectedMistakes: [{
    type: { type: String, enum: ['skipped', 'repeated', 'incorrect', 'tajweed', 'pause'] },
    wordIndex: Number, // Expected word index
    surah: Number,
    ayah: Number,
    page: Number,
    detectedText: String, // What student actually said
    expectedText: String, // What should have been said
    timestamp: Number, // Time in seconds from start
    confidence: Number, // Detection confidence 0-1
    tajweedRule: String, // If tajweed mistake, which rule
    note: String // Additional notes
  }],
  
  // Fluency metrics
  metrics: {
    totalWords: { type: Number }, // Total words in expected text
    wordsSpoken: { type: Number }, // Words actually spoken
    wordsCorrect: { type: Number }, // Correctly spoken words
    wordsSkipped: { type: Number }, // Skipped words
    wordsRepeated: { type: Number }, // Repeated words
    wordsIncorrect: { type: Number }, // Incorrect words
    fluencyPercentage: { type: Number }, // (wordsCorrect / totalWords) * 100
    wordsPerMinute: { type: Number }, // Average WPM
    pauseCount: { type: Number }, // Number of pauses > 1 second
    totalPauseTime: { type: Number }, // Total pause time in seconds
    averagePauseDuration: { type: Number }, // Average pause duration
    tajweedMistakes: { type: Number }, // Count of tajweed mistakes
    memoryMistakes: { type: Number }, // Count of memory mistakes
    holdingMistakes: { type: Number }, // Count of holding/fluency mistakes
    
    // GOP (Goodness of Pronunciation) metrics
    pronunciationQuality: { type: Number, default: null }, // Overall pronunciation quality (0-100)
    overallGOP: { type: Number, default: null }, // Overall GOP score (0-1)
    wordsWithPronunciationIssues: { type: Number, default: 0 },
    totalPronunciationIssues: { type: Number, default: 0 },
    pronunciationIssuesByType: {
      vowel_substitution: { type: Number, default: 0 },
      vowel_length: { type: Number, default: 0 },
      consonant_quality: { type: Number, default: 0 },
      tajweed: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    },
    
    // Tajweed and Fluency Scoring (2026 Standards)
    tajweedScore: { type: Number, default: null }, // 0-100, overall Tajweed quality
    fluencyScore: { type: Number, default: null }, // 0-100, calculated by WPM + Correct Waqf usage
    phoneticAccuracy: { type: Number, default: null }, // 0-100, GOP score from Whisper timestamps
    makhrajAccuracy: { type: Number, default: null }, // 0-100, Makhraj (articulation point) accuracy
    waqfConsistency: { type: Number, default: null }, // 0-100, Waqf (pause) consistency score
    
    // Detailed Tajweed Analysis
    tajweedAnalysis: {
      maddAccuracy: { type: Number, default: null }, // Madd (elongation) accuracy
      ghunnahAccuracy: { type: Number, default: null }, // Ghunnah (nasalization) accuracy
      waqfAccuracy: { type: Number, default: null }, // Waqf (pause) accuracy
      correctMaddCount: { type: Number, default: 0 },
      totalMaddCount: { type: Number, default: 0 },
      correctGhunnahCount: { type: Number, default: 0 },
      totalGhunnahCount: { type: Number, default: 0 },
      correctWaqfCount: { type: Number, default: 0 },
      invalidPauseCount: { type: Number, default: 0 },
      totalWaqfCount: { type: Number, default: 0 },
      correctMakhrajCount: { type: Number, default: 0 },
      totalMakhrajCount: { type: Number, default: 0 }
    }
  },
  
  // Processing status
  status: { 
    type: String, 
    enum: ['recording', 'processing', 'completed', 'failed'], 
    default: 'recording' 
  },
  processingError: { type: String }, // Error message if processing failed
  
  // Report generation
  reportGenerated: { type: Boolean, default: false },
  reportGeneratedAt: { type: Date },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

recitationSessionSchema.index({ ticketId: 1, createdAt: -1 });
recitationSessionSchema.index({ studentId: 1, createdAt: -1 });
recitationSessionSchema.index({ status: 1 });

const RecitationSession = mongoose.model('RecitationSession', recitationSessionSchema);

module.exports = RecitationSession;
