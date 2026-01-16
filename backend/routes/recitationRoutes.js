/**
 * Recitation Monitoring API Routes
 * Handles AI-assisted recitation monitoring endpoints
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const RecitationSession = require('../schemas/recitationSession');
const recitationProcessor = require('../services/recitationProcessor');
const { getQuranWords, getExpectedText } = require('../services/quranDataService');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Get JWT_SECRET from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Authentication middleware (matches server.js implementation)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
};

// Configure multer for audio uploads (memory storage, no disk writes)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    const allowedMimes = [
      'audio/webm',
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/m4a',
      'audio/x-m4a'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'), false);
    }
  }
});

/**
 * POST /api/recitation-sessions
 * Create a new recitation session
 */
router.post('/recitation-sessions', authenticateToken, async (req, res) => {
  try {
    const {
      ticketId,
      surahNumber,
      startAyah,
      endAyah,
      startPage,
      endPage,
      zoomMeetingId,
      zoomParticipantId
    } = req.body;

    // Validate required fields
    if (!ticketId || !surahNumber || !startAyah || !endAyah) {
      return res.status(400).json({ 
        error: 'Missing required fields: ticketId, surahNumber, startAyah, endAyah' 
      });
    }

    // Validate ticket exists
    const Ticket = mongoose.models.Ticket || mongoose.model('Ticket');
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check if session already exists for this ticket
    const existingSession = await RecitationSession.findOne({ ticketId });
    if (existingSession) {
      return res.json({ 
        sessionId: existingSession._id, 
        session: existingSession,
        message: 'Session already exists for this ticket'
      });
    }

    // Fetch expected text and words from Mushaf
    console.log(`📖 Fetching expected text for Surah ${surahNumber}, Ayah ${startAyah}-${endAyah}...`);
    let expectedText = '';
    let expectedWords = [];
    
    try {
      expectedWords = await getQuranWords(
        parseInt(surahNumber),
        parseInt(startAyah),
        parseInt(endAyah)
      );
      expectedText = await getExpectedText(
        parseInt(surahNumber),
        parseInt(startAyah),
        parseInt(endAyah)
      );
      
      if (!expectedText || expectedWords.length === 0) {
        console.warn(`⚠️ No Quran text found for Surah ${surahNumber}, Ayah ${startAyah}-${endAyah}`);
        // Use placeholder if no text found
        expectedText = `Surah ${surahNumber}, Ayah ${startAyah}-${endAyah}`;
        expectedWords = [];
      }
    } catch (error) {
      console.error('Error fetching expected text:', error);
      // Use placeholder on error
      expectedText = `Surah ${surahNumber}, Ayah ${startAyah}-${endAyah}`;
      expectedWords = [];
    }

    // Create session
    const session = new RecitationSession({
      ticketId,
      studentId: ticket.studentId,
      studentName: ticket.studentName,
      teacherId: ticket.assignedTeacherId || req.user.userId,
      teacherName: ticket.assignedTeacherName || req.user.name,
      workflowStep: ticket.type,
      startedAt: new Date(),
      surahNumber: parseInt(surahNumber),
      startAyah: parseInt(startAyah),
      endAyah: parseInt(endAyah),
      startPage: startPage ? parseInt(startPage) : null,
      endPage: endPage ? parseInt(endPage) : null,
      zoomMeetingId: zoomMeetingId || null,
      zoomParticipantId: zoomParticipantId || null,
      expectedText: expectedText,
      expectedWords: expectedWords,
      status: 'recording'
    });

    await session.save();

    // Update ticket with session reference
    ticket.recitationSessionId = session._id.toString();
    await ticket.save();

    console.log(`✅ Created recitation session ${session._id} for ticket ${ticketId}`);

    res.json({ 
      success: true,
      sessionId: session._id,
      session 
    });
  } catch (error) {
    console.error('Error creating recitation session:', error);
    res.status(500).json({ error: error.message || 'Failed to create recitation session' });
  }
});

/**
 * POST /api/recitation-sessions/:sessionId/audio
 * Upload and process audio file
 */
router.post('/recitation-sessions/:sessionId/audio', 
  authenticateToken,
  upload.single('audio'),
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const audioBuffer = req.file.buffer;
      const duration = req.body.duration ? parseFloat(req.body.duration) : null;

      const session = await RecitationSession.findById(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check permissions
      if (session.teacherId !== req.user.userId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Update session duration if provided
      if (duration) {
        session.duration = duration;
        session.endedAt = new Date(session.startedAt.getTime() + duration * 1000);
      }

      // Process audio asynchronously
      recitationProcessor.processAudio(audioBuffer, sessionId)
        .then(() => {
          console.log(`✅ Audio processed for session ${sessionId}`);
        })
        .catch((error) => {
          console.error(`❌ Error processing audio for session ${sessionId}:`, error);
        });

      // Return immediately (processing happens in background)
      res.json({ 
        success: true, 
        message: 'Audio uploaded and processing started',
        sessionId 
      });
    } catch (error) {
      console.error('Error uploading audio:', error);
      res.status(500).json({ error: error.message || 'Failed to upload audio' });
    }
  }
);

/**
 * GET /api/recitation-sessions/:sessionId
 * Get session status and data
 */
router.get('/recitation-sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const session = await RecitationSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check permissions
    if (session.teacherId !== req.user.userId && 
        session.studentId !== req.user.userId && 
        req.user.role !== 'admin' && 
        req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch session' });
  }
});

/**
 * POST /api/recitation-sessions/:sessionId/generate-report
 * Generate AI report for completed session
 */
router.post('/recitation-sessions/:sessionId/generate-report', 
  authenticateToken,
  async (req, res) => {
    try {
      const session = await RecitationSession.findById(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.status !== 'completed') {
        return res.status(400).json({ 
          error: 'Session not completed. Current status: ' + session.status 
        });
      }

      // Generate report
      const report = generateReport(session);

      // Update session
      session.reportGenerated = true;
      session.reportGeneratedAt = new Date();
      await session.save();

      // Update ticket with metrics
      const Ticket = mongoose.models.Ticket;
      if (Ticket) {
        const ticket = await Ticket.findById(session.ticketId);
        if (ticket) {
          ticket.aiMetrics = {
            fluencyPercentage: session.metrics.fluencyPercentage,
            wordsPerMinute: session.metrics.wordsPerMinute,
            totalMistakes: session.detectedMistakes.length,
            mistakesByType: {
              skipped: session.metrics.wordsSkipped,
              repeated: session.metrics.wordsRepeated,
              incorrect: session.metrics.wordsIncorrect,
              tajweed: session.metrics.tajweedMistakes,
              pause: session.metrics.pauseCount
            },
            reportGenerated: true,
            reportGeneratedAt: new Date()
          };
          await ticket.save();
        }
      }

      res.json({ 
        success: true,
        report 
      });
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ error: error.message || 'Failed to generate report' });
    }
  }
);

/**
 * POST /api/recitation-sessions/:sessionId/finalize
 * Finalize streaming session (compare texts after all chunks processed)
 */
router.post('/recitation-sessions/:sessionId/finalize',
  authenticateToken,
  async (req, res) => {
    try {
      const session = await RecitationSession.findById(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Finalize session
      await recitationProcessor.finalizeStream(req.params.sessionId);

      const updatedSession = await RecitationSession.findById(req.params.sessionId);
      res.json({ 
        success: true,
        session: updatedSession
      });
    } catch (error) {
      console.error('Error finalizing session:', error);
      res.status(500).json({ error: error.message || 'Failed to finalize session' });
    }
  }
);

/**
 * POST /api/recitation-sessions/:sessionId/generate-pdf
 * Generate PDF report (optional - requires puppeteer)
 */
router.post('/recitation-sessions/:sessionId/generate-pdf',
  authenticateToken,
  async (req, res) => {
    try {
      const session = await RecitationSession.findById(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.status !== 'completed') {
        return res.status(400).json({ error: 'Session not completed' });
      }

      const pdfGenerator = require('../services/pdfReportGenerator');
      const pdfResult = await pdfGenerator.generatePDF(session);

      if (pdfResult.pdfBuffer) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="recitation-report-${session._id}.pdf"`);
        res.send(pdfResult.pdfBuffer);
      } else {
        // Return HTML for browser printing
        res.setHeader('Content-Type', 'text/html');
        res.send(pdfResult.html);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ error: error.message || 'Failed to generate PDF' });
    }
  }
);

/**
 * Generate report from session data
 */
function generateReport(session) {
  return {
    sessionId: session._id.toString(),
    studentName: session.studentName,
    teacherName: session.teacherName,
    workflowStep: session.workflowStep,
    date: session.startedAt,
    duration: session.duration,
    
    // Recitation range
    surahNumber: session.surahNumber,
    startAyah: session.startAyah,
    endAyah: session.endAyah,
    startPage: session.startPage,
    endPage: session.endPage,
    
    // Fluency metrics
    fluencyPercentage: session.metrics.fluencyPercentage.toFixed(2),
    wordsPerMinute: session.metrics.wordsPerMinute.toFixed(2),
    totalWords: session.metrics.totalWords,
    wordsCorrect: session.metrics.wordsCorrect,
    wordsSpoken: session.metrics.wordsSpoken,
    
    // Mistake counts
    totalMistakes: session.detectedMistakes.length,
    mistakesByType: {
      skipped: session.metrics.wordsSkipped,
      repeated: session.metrics.wordsRepeated,
      incorrect: session.metrics.wordsIncorrect,
      tajweed: session.metrics.tajweedMistakes,
      pause: session.metrics.pauseCount
    },
    
    // Detailed mistakes
    mistakes: session.detectedMistakes.map(m => ({
      type: m.type,
      surah: m.surah,
      ayah: m.ayah,
      page: m.page,
      wordIndex: m.wordIndex,
      expectedText: m.expectedText,
      detectedText: m.detectedText,
      tajweedRule: m.tajweedRule,
      note: m.note,
      timestamp: m.timestamp,
      confidence: m.confidence
    })),
    
    // Pause analysis
    pauseAnalysis: {
      totalPauses: session.metrics.pauseCount,
      totalPauseTime: session.metrics.totalPauseTime.toFixed(2),
      averagePauseDuration: session.metrics.averagePauseDuration.toFixed(2)
    },
    
    // Transcript (optional - can be excluded for privacy)
    transcript: session.transcript,
    transcriptSegments: session.transcriptSegments
  };
}

module.exports = router;
