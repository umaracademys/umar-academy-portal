/**
 * Live Recitation Monitoring WebSocket Routes
 * Real-time audio streaming and processing
 */

const express = require('express');
const router = express.Router();
const RecitationSession = require('../schemas/recitationSession');
const liveRecitationProcessor = require('../services/liveRecitationProcessor');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Authentication middleware
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

/**
 * POST /api/recitation-sessions/:sessionId/start-live
 * Initialize live monitoring session
 */
router.post('/recitation-sessions/:sessionId/start-live', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await RecitationSession.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check permissions
    if (session.teacherId !== req.user.userId && 
        req.user.role !== 'admin' && 
        req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Initialize live processing
    await liveRecitationProcessor.initializeSession(
      sessionId,
      session.surahNumber,
      session.startAyah,
      session.endAyah
    );

    res.json({ 
      success: true,
      message: 'Live monitoring started',
      sessionId 
    });
  } catch (error) {
    console.error('Error starting live monitoring:', error);
    res.status(500).json({ error: error.message || 'Failed to start live monitoring' });
  }
});

/**
 * POST /api/recitation-sessions/:sessionId/finalize-live
 * Finalize live session and generate final metrics
 */
router.post('/recitation-sessions/:sessionId/finalize-live', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await RecitationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Finalize session
    await liveRecitationProcessor.finalizeSession(sessionId);

    const finalSession = await RecitationSession.findById(sessionId);
    
    res.json({ 
      success: true,
      session: finalSession
    });
  } catch (error) {
    console.error('Error finalizing live session:', error);
    res.status(500).json({ error: error.message || 'Failed to finalize session' });
  }
});

/**
 * GET /api/recitation-sessions/:sessionId/live-status
 * Get current live session status and metrics
 */
router.get('/recitation-sessions/:sessionId/live-status', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const sessionState = liveRecitationProcessor.getSessionState(sessionId);
    if (!sessionState) {
      // Try to get from database
      const session = await RecitationSession.findById(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      return res.json({
        status: session.status,
        metrics: session.metrics || {},
        transcript: session.transcript || ''
      });
    }

    res.json({
      status: 'recording',
      metrics: sessionState.metrics,
      transcript: sessionState.transcript,
      transcriptLength: sessionState.transcript.length,
      mistakesCount: sessionState.detectedMistakes.length,
      chunksBuffered: sessionState.chunkBuffer.length
    });
  } catch (error) {
    console.error('Error getting live status:', error);
    res.status(500).json({ error: error.message || 'Failed to get live status' });
  }
});

module.exports = router;
