/**
 * Live Recitation Processor
 * Real-time processing of audio chunks via WebSocket
 * Processes chunks as they arrive, updates metrics incrementally
 */

const whisperService = require('./whisperService');
const textComparisonService = require('./textComparisonService');
const { getQuranWords, getExpectedText } = require('./quranDataService');
const { pcmInt16ToFloat32, isValidPCMBuffer } = require('./pcmAudioUtils');
// ✅ NEW ARCHITECTURE: Removed streamingAudioConverter (no FFmpeg needed for PCM)
// ✅ HARD KILL: FFmpeg is DISABLED for live recitation
const RecitationSession = require('../schemas/recitationSession');

class LiveRecitationProcessor {
  constructor() {
    // Active sessions being processed in real-time
    this.activeSessions = new Map();
  }

  /**
   * Initialize live session
   */
  async initializeSession(sessionId, surahNumber, startAyah, endAyah) {
    try {
      console.log(`🔵 [DEBUG] Initializing live session ${sessionId} for Surah ${surahNumber}, Ayah ${startAyah}-${endAyah}`);
      
      const session = await RecitationSession.findById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Get expected text
      console.log(`🔵 [DEBUG] Fetching expected text for session ${sessionId}...`);
      const expectedWords = await getQuranWords(surahNumber, startAyah, endAyah);
      const expectedText = await getExpectedText(surahNumber, startAyah, endAyah);
      console.log(`✅ [DEBUG] Expected text loaded: ${expectedWords.length} words, ${expectedText.length} characters`);

      session.expectedText = expectedText;
      session.expectedWords = expectedWords;
      session.status = 'recording';
      await session.save();

      // ✅ NEW ARCHITECTURE: Pure PCM - No FFmpeg, No streaming converter needed
      // PCM chunks are processed directly, no initialization needed
      console.log(`✅ [PCM] Session ${sessionId} initialized for PCM processing`);

      // Initialize in-memory tracking
      const sessionData = {
        sessionId,
        transcript: '',
        transcriptSegments: [],
        detectedMistakes: [],
        metrics: {
          totalWords: expectedWords.length,
          wordsSpoken: 0,
          wordsCorrect: 0,
          wordsSkipped: 0,
          wordsRepeated: 0,
          wordsIncorrect: 0,
          fluencyPercentage: 0,
          wordsPerMinute: 0,
          pauseCount: 0,
          totalPauseTime: 0,
          tajweedMistakes: 0,
          memoryMistakes: 0,
          holdingMistakes: 0
        },
        expectedWords,
        lastProcessedTime: 0,
        chunkBuffer: [], // Buffer for accumulating PCM chunks
        startTime: Date.now()
      };
      
      this.activeSessions.set(sessionId, sessionData);
      console.log(`✅ [DEBUG] Session ${sessionId} initialized in memory. Expected words: ${expectedWords.length}`);

      return this.activeSessions.get(sessionId);
    } catch (error) {
      console.error(`Error initializing live session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Process audio chunk in real-time
   * ✅ PURE PCM ARCHITECTURE: NO WebM, NO FFmpeg, NO temp files
   * Accepts base64-encoded Int16 PCM and converts to Float32Array for Whisper
   */
  async processChunk(sessionId, audioChunkBase64, chunkIndex, sampleRate = 16000) {
    try {
      console.log(`🔵 [PCM] Processing chunk ${chunkIndex} for session ${sessionId}`);
      
      let sessionData = this.activeSessions.get(sessionId);
      if (!sessionData) {
        // Auto-initialize session if not already initialized (for backward compatibility)
        console.log(`⚠️ [PCM] Session ${sessionId} not initialized, attempting auto-initialization...`);
        try {
          const RecitationSession = require('../schemas/recitationSession');
          const session = await RecitationSession.findById(sessionId);
          if (!session) {
            throw new Error('Session not found in database');
          }
          await this.initializeSession(sessionId, session.surahNumber, session.startAyah, session.endAyah);
          sessionData = this.activeSessions.get(sessionId);
          if (!sessionData) {
            throw new Error('Failed to initialize session');
          }
          console.log(`✅ [PCM] Session ${sessionId} auto-initialized successfully`);
        } catch (initError) {
          throw new Error(`Session not initialized and auto-initialization failed: ${initError.message}`);
        }
      }

      // 🔒 HARD KILL: Reject non-PCM formats
      if (!audioChunkBase64 || typeof audioChunkBase64 !== 'string') {
        throw new Error('Invalid audio chunk: must be base64-encoded PCM string');
      }

      // Decode Base64 → Buffer (RAW PCM ONLY)
      let pcmBuffer;
      try {
        const base64Data = audioChunkBase64.includes(',') 
          ? audioChunkBase64.split(',')[1] 
          : audioChunkBase64;
        pcmBuffer = Buffer.from(base64Data, 'base64');
      } catch (decodeError) {
        throw new Error(`Failed to decode base64 PCM: ${decodeError.message}`);
      }

      // Validate PCM buffer
      if (!isValidPCMBuffer(pcmBuffer)) {
        throw new Error(`Invalid PCM buffer: length ${pcmBuffer.length} (must be multiple of 2 for Int16)`);
      }

      // Convert Int16 PCM → Float32Array
      const audioFloat32 = pcmInt16ToFloat32(pcmBuffer);

      // 🔒 HARD GUARANTEE: Must be Float32Array
      if (!(audioFloat32 instanceof Float32Array)) {
        throw new Error('Invalid PCM audio received: conversion failed');
      }

      if (audioFloat32.length === 0) {
        return {
          status: 'no_audio',
          message: 'Empty PCM chunk after conversion'
        };
      }

      console.log(`✅ [PCM] Converted Int16 PCM to Float32Array: ${audioFloat32.length} samples (${(audioFloat32.length / sampleRate).toFixed(2)}s at ${sampleRate}Hz)`);

      // Add chunk to buffer
      sessionData.chunkBuffer.push({
        chunk: audioFloat32,
        index: chunkIndex,
        timestamp: Date.now()
      });

      // Process PCM chunks in small batches (2 chunks = ~6 seconds at 16kHz)
      const minChunks = 2;
      if (sessionData.chunkBuffer.length >= minChunks) {
        console.log(`🔵 [PCM] Buffer threshold reached (${sessionData.chunkBuffer.length} >= ${minChunks}), processing batch...`);
        return await this.processBatch(sessionId);
      }

      console.log(`⏳ [PCM] Buffering PCM chunks (${sessionData.chunkBuffer.length}/${minChunks})...`);
      return {
        status: 'buffering',
        chunksBuffered: sessionData.chunkBuffer.length
      };
    } catch (error) {
      console.error(`❌ [PCM] Error processing chunk for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Process buffered PCM chunks
   * ✅ PURE PCM ARCHITECTURE: Combines Float32Array chunks and transcribes directly
   */
  async processBatch(sessionId) {
    try {
      console.log(`🔵 [PCM] Processing batch for session ${sessionId}`);
      
      const sessionData = this.activeSessions.get(sessionId);
      if (!sessionData || sessionData.chunkBuffer.length === 0) {
        console.warn(`⚠️ [DEBUG] No chunks to process for session ${sessionId}`);
        return null;
      }

      // Combine buffered chunks
      const chunks = sessionData.chunkBuffer.splice(0); // Clear buffer
      console.log(`🔵 [DEBUG] Processing ${chunks.length} buffered chunks...`);
      
      // Validate chunks (should all be Float32Array)
      const validChunks = chunks.filter(c => c.chunk && c.chunk instanceof Float32Array && c.chunk.length > 0);
      
      if (validChunks.length === 0) {
        return {
          status: 'no_audio',
          message: 'No valid PCM Float32Array chunks to process'
        };
      }
      
      // ✅ NEW ARCHITECTURE: Pure PCM - All chunks are Float32Array
      // Combine Float32Array chunks directly (no conversion needed)
      const float32Arrays = [];
      
      for (const chunk of validChunks) {
        // Chunk should already be Float32Array (from processChunk)
        if (chunk.chunk instanceof Float32Array) {
          float32Arrays.push(chunk.chunk);
        } else {
          console.warn(`⚠️ [PCM] Chunk ${chunk.index} is not Float32Array, skipping`);
        }
      }
      
      if (float32Arrays.length === 0) {
        return {
          status: 'no_audio',
          message: 'No valid PCM Float32Array chunks to process'
        };
      }
      
      // Combine all Float32Arrays
      const totalLength = float32Arrays.reduce((sum, arr) => sum + arr.length, 0);
      const combinedChunk = new Float32Array(totalLength);
      let offset = 0;
      for (const arr of float32Arrays) {
        combinedChunk.set(arr, offset);
        offset += arr.length;
      }
      
      console.log(`✅ [PCM] Combined ${float32Arrays.length} chunks into ${combinedChunk.length} samples (${(combinedChunk.length / 16000).toFixed(2)}s at 16kHz)`);

      // ✅ PURE PCM: Transcribe Float32Array directly (NO conversion needed)
      console.log(`🔵 [PCM] Transcribing PCM audio (${combinedChunk.length} samples, ${(combinedChunk.length / 16000).toFixed(2)}s at 16kHz)...`);
      const transcription = await whisperService.transcribeStream(combinedChunk, {
        chunk_length_s: 10, // Process in 10-second chunks for better accuracy
        stride_length_s: 2, // 2-second overlap
        language: 'ar'
      });

      console.log(`✅ [PCM] Transcription result: "${transcription.text}" (${transcription.text.length} chars, ${transcription.segments?.length || 0} segments)`);

      if (!transcription.text || transcription.text.trim().length === 0) {
        console.warn(`⚠️ [DEBUG] No speech detected in chunk`);
        return {
          status: 'no_speech',
          message: 'No speech detected in chunk'
        };
      }

      // Append to transcript
      const previousText = sessionData.transcript;
      sessionData.transcript = previousText 
        ? `${previousText} ${transcription.text}` 
        : transcription.text;

      // Update segments with adjusted timestamps
      const lastEndTime = sessionData.transcriptSegments.length > 0
        ? sessionData.transcriptSegments[sessionData.transcriptSegments.length - 1].endTime
        : 0;

      const newSegments = transcription.segments.map(seg => ({
        text: seg.text,
        startTime: seg.startTime + lastEndTime,
        endTime: seg.endTime + lastEndTime,
        confidence: seg.confidence
      }));

      sessionData.transcriptSegments.push(...newSegments);

      // Compare with expected text (incremental)
      console.log(`🔵 [DEBUG] Comparing transcript with expected text (incremental)...`);
      const comparison = await this.compareIncremental(
        sessionData.transcript,
        sessionData.expectedWords,
        sessionData.detectedMistakes
      );
      console.log(`🔵 [DEBUG] Comparison result: ${comparison.wordsCorrect} correct, ${comparison.wordsSkipped} skipped, ${comparison.wordsIncorrect} incorrect, ${comparison.newMistakes.length} new mistakes`);

      // Update mistakes (avoid duplicates)
      comparison.newMistakes.forEach(mistake => {
        const exists = sessionData.detectedMistakes.some(m =>
          m.surah === mistake.surah &&
          m.ayah === mistake.ayah &&
          m.wordIndex === mistake.wordIndex &&
          m.type === mistake.type
        );
        if (!exists) {
          sessionData.detectedMistakes.push({
            ...mistake,
            id: `mistake-${sessionId}-${Date.now()}-${Math.random()}`,
            timestamp: lastEndTime + (transcription.segments[0]?.startTime || 0)
          });
        }
      });

      // Update metrics
      this.updateMetrics(sessionData);

      // Persist to database (async, don't block)
      this.persistSession(sessionId, sessionData).catch(err => {
        console.error(`Error persisting session ${sessionId}:`, err);
      });

      return {
        status: 'processed',
        text: transcription.text,
        fullTranscript: sessionData.transcript,
        segments: newSegments,
        metrics: { ...sessionData.metrics },
        newMistakes: comparison.newMistakes.length
      };
    } catch (error) {
      console.error(`Error processing batch for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Compare transcript incrementally (only check new words)
   */
  async compareIncremental(transcript, expectedWords, existingMistakes) {
    // Tokenize transcript
    const transcriptWords = textComparisonService.tokenizeArabic(transcript);
    
    // Find which words we've already checked
    const checkedWordIndices = new Set(
      existingMistakes.map(m => m.wordIndex).filter(i => i !== undefined)
    );

    // Compare only new portion
    const newMistakes = [];
    let wordsCorrect = 0;
    let wordsSkipped = 0;
    let wordsIncorrect = 0;

    // Simple comparison for incremental updates
    // Full comparison happens on finalize
    const expectedWordTexts = expectedWords.map(w => w.text);
    let transcriptIndex = transcriptWords.length - 10; // Check last 10 words
    if (transcriptIndex < 0) transcriptIndex = 0;

    for (let i = 0; i < expectedWords.length; i++) {
      if (checkedWordIndices.has(expectedWords[i].wordIndex)) {
        continue; // Already checked
      }

      if (transcriptIndex >= transcriptWords.length) {
        break; // No more transcript
      }

      const similarity = textComparisonService.calculateSimilarity(
        transcriptWords[transcriptIndex],
        expectedWordTexts[i]
      );

      if (similarity >= 0.8) {
        wordsCorrect++;
        transcriptIndex++;
      } else if (similarity < 0.5) {
        newMistakes.push({
          type: 'incorrect',
          wordIndex: expectedWords[i].wordIndex,
          surah: expectedWords[i].surah,
          ayah: expectedWords[i].ayah,
          page: expectedWords[i].page,
          expectedText: expectedWordTexts[i],
          detectedText: transcriptWords[transcriptIndex] || '',
          confidence: 0.8
        });
        wordsIncorrect++;
        transcriptIndex++;
      }
    }

    return {
      newMistakes,
      wordsCorrect,
      wordsSkipped,
      wordsIncorrect
    };
  }

  /**
   * Update metrics from current state
   */
  updateMetrics(sessionData) {
    const { transcriptSegments, detectedMistakes, expectedWords, startTime } = sessionData;
    
    // Calculate WPM from segments
    if (transcriptSegments.length > 0) {
      const totalWords = transcriptSegments.reduce((sum, seg) => {
        return sum + (seg.text ? seg.text.split(/\s+/).length : 0);
      }, 0);
      
      const totalDuration = transcriptSegments.length > 0
        ? transcriptSegments[transcriptSegments.length - 1].endTime
        : (Date.now() - startTime) / 1000;

      sessionData.metrics.wordsPerMinute = totalDuration > 0
        ? (totalWords / totalDuration) * 60
        : 0;
    }

    // Count pauses
    let pauseCount = 0;
    let totalPauseTime = 0;
    for (let i = 1; i < transcriptSegments.length; i++) {
      const gap = transcriptSegments[i].startTime - transcriptSegments[i - 1].endTime;
      if (gap > 1.0) {
        pauseCount++;
        totalPauseTime += gap;
      }
    }

    sessionData.metrics.pauseCount = pauseCount;
    sessionData.metrics.totalPauseTime = totalPauseTime;
    sessionData.metrics.averagePauseDuration = pauseCount > 0
      ? totalPauseTime / pauseCount
      : 0;

    // Count mistakes by type
    sessionData.metrics.tajweedMistakes = detectedMistakes.filter(m => m.type === 'tajweed').length;
    sessionData.metrics.memoryMistakes = detectedMistakes.filter(m => 
      m.type === 'skipped' || m.type === 'incorrect'
    ).length;
    sessionData.metrics.holdingMistakes = detectedMistakes.filter(m => m.type === 'pause').length;

    // Update word counts (will be finalized on complete)
    const transcriptWords = textComparisonService.tokenizeArabic(sessionData.transcript);
    sessionData.metrics.wordsSpoken = transcriptWords.length;
  }

  /**
   * Persist session data to database (async)
   */
  async persistSession(sessionId, sessionData) {
    try {
      const session = await RecitationSession.findById(sessionId);
      if (!session) return;

      session.transcript = sessionData.transcript;
      session.transcriptSegments = sessionData.transcriptSegments;
      session.detectedMistakes = sessionData.detectedMistakes;
      session.metrics = sessionData.metrics;
      
      await session.save();
    } catch (error) {
      console.error(`Error persisting session ${sessionId}:`, error);
    }
  }

  /**
   * Finalize live session (full comparison)
   */
  async finalizeSession(sessionId) {
    try {
      const sessionData = this.activeSessions.get(sessionId);
      if (!sessionData) {
        throw new Error('Session not found');
      }

      // ✅ NEW ARCHITECTURE: Pure PCM - No streaming converter needed
      // All PCM chunks are already processed incrementally
      // Just process any remaining buffered chunks
      console.log(`🔵 [PCM] Finalizing session ${sessionId} (PCM architecture - no streaming converter needed)`);

      // Process any remaining buffered chunks (PCM format)
      if (sessionData.chunkBuffer.length > 0) {
        await this.processBatch(sessionId, 'pcm_float32');
      }

      // Full text comparison with GOP analysis
      // Also run Tajweed analysis for comprehensive scoring
      console.log(`🔵 [DEBUG] Running full text comparison with GOP analysis...`);
      const { tajweedAnalysisService } = require('./tajweedAnalysisService');
      
      // Build words with timestamps for GOP vowel length analysis
      const wordsWithTimestamps = sessionData.transcriptSegments.flatMap(seg => {
        const words = (seg.text || '').split(/\s+/);
        const wordDuration = (seg.endTime - seg.startTime) / words.length;
        return words.map((word, idx) => ({
          word,
          start: seg.startTime + (idx * wordDuration),
          end: seg.startTime + ((idx + 1) * wordDuration)
        }));
      });

      console.log(`🔵 [DEBUG] Built ${wordsWithTimestamps.length} words with timestamps from ${sessionData.transcriptSegments.length} segments`);

      // Create Whisper result object for GOP analysis
      const whisperResult = {
        text: sessionData.transcript,
        segments: sessionData.transcriptSegments,
        words: wordsWithTimestamps.map((w, idx) => ({
          word: w.word,
          text: w.word,
          start: w.start,
          end: w.end,
          index: idx,
          probability: 0.8 // Default probability (can be enhanced with actual Whisper confidence)
        }))
      };

      // Use enhanced comparison with GOP
      const transcribedWords = sessionData.transcript.split(/\s+/);
      console.log(`🔵 [DEBUG] Comparing ${transcribedWords.length} transcribed words with ${sessionData.expectedWords.length} expected words...`);
      
      const fullComparison = await textComparisonService.compareTranscriptsWithGOP(
        sessionData.expectedWords,
        transcribedWords,
        whisperResult,
        wordsWithTimestamps
      );
      
      console.log(`🔵 [DEBUG] Full comparison complete:`, {
        mistakes: fullComparison.mistakes.length,
        wordsCorrect: fullComparison.metrics.wordsCorrect,
        wordsSkipped: fullComparison.metrics.wordsSkipped,
        wordsIncorrect: fullComparison.metrics.wordsIncorrect,
        hasGOP: !!fullComparison.gopAnalysis,
        pronunciationQuality: fullComparison.metrics.pronunciationQuality
      });

      // Update with final comparison
      sessionData.detectedMistakes = fullComparison.mistakes.map((m, idx) => ({
        ...m,
        id: `mistake-${sessionId}-${idx}`,
        timestamp: m.timestamp || (sessionData.transcriptSegments[0]?.startTime || 0)
      }));

      // Final metrics calculation
      const fluencyMetrics = textComparisonService.calculateFluencyMetrics(
        sessionData.transcriptSegments,
        sessionData.transcriptSegments.length > 0
          ? sessionData.transcriptSegments[sessionData.transcriptSegments.length - 1].endTime
          : (Date.now() - sessionData.startTime) / 1000
      );

      // Run Tajweed analysis
      console.log(`🔵 [DEBUG] Running Tajweed analysis (Madd, Ghunnah, Waqf, Makhraj)...`);
      const tajweedAnalysis = tajweedAnalysisService.analyzeTajweed(
        whisperResult,
        sessionData.expectedWords,
        sessionData.transcriptSegments,
        fullComparison.gopAnalysis
      );
      
      console.log(`🔵 [DEBUG] Tajweed analysis complete:`, {
        tajweedScore: tajweedAnalysis.tajweedScore,
        maddAccuracy: tajweedAnalysis.maddAnalysis.maddAccuracy,
        ghunnahAccuracy: tajweedAnalysis.ghunnahAnalysis.ghunnahAccuracy,
        waqfAccuracy: tajweedAnalysis.waqfAnalysis.waqfAccuracy,
        makhrajAccuracy: tajweedAnalysis.makhrajAnalysis.makhrajAccuracy,
        waqfConsistency: tajweedAnalysis.waqfConsistency,
        totalIssues: tajweedAnalysis.totalIssues.length
      });

      // Calculate fluency score (WPM + Correct Waqf usage)
      const wpmScore = Math.min(100, (fluencyMetrics.wordsPerMinute || 0) / 60 * 100); // Normalize WPM to 0-100
      const waqfScore = tajweedAnalysis.waqfAnalysis.waqfAccuracy || 100;
      const fluencyScore = (wpmScore * 0.6) + (waqfScore * 0.4); // 60% WPM, 40% Waqf accuracy
      
      console.log(`🔵 [DEBUG] Calculated scores:`, {
        wpmScore,
        waqfScore,
        fluencyScore,
        tajweedScore: tajweedAnalysis.tajweedScore,
        makhrajAccuracy: tajweedAnalysis.makhrajAnalysis.makhrajAccuracy,
        waqfConsistency: tajweedAnalysis.waqfConsistency
      });

      sessionData.metrics = {
        ...fullComparison.metrics,
        ...fluencyMetrics,
        tajweedMistakes: fullComparison.mistakes.filter(m => m.type === 'tajweed').length,
        memoryMistakes: fullComparison.mistakes.filter(m => 
          m.type === 'skipped' || m.type === 'incorrect'
        ).length,
        holdingMistakes: fullComparison.mistakes.filter(m => m.type === 'pause').length,
        // GOP metrics (pronunciation quality)
        pronunciationQuality: fullComparison.metrics.pronunciationQuality !== null && fullComparison.metrics.pronunciationQuality !== undefined 
          ? fullComparison.metrics.pronunciationQuality 
          : null,
        overallGOP: fullComparison.metrics.overallGOP !== null && fullComparison.metrics.overallGOP !== undefined
          ? fullComparison.metrics.overallGOP
          : null,
        wordsWithPronunciationIssues: fullComparison.metrics.wordsWithPronunciationIssues || 0,
        totalPronunciationIssues: fullComparison.metrics.totalPronunciationIssues || 0,
        pronunciationIssuesByType: fullComparison.metrics.pronunciationIssuesByType || {
          vowel_substitution: 0,
          vowel_length: 0,
          consonant_quality: 0,
          tajweed: 0,
          other: 0
        },
        // Tajweed and Fluency Scoring (2026 Standards)
        tajweedScore: tajweedAnalysis.tajweedScore,
        fluencyScore: Math.round(fluencyScore * 100) / 100,
        phoneticAccuracy: fullComparison.metrics.pronunciationQuality || null,
        makhrajAccuracy: tajweedAnalysis.makhrajAnalysis.makhrajAccuracy,
        waqfConsistency: tajweedAnalysis.waqfConsistency,
        // Detailed Tajweed Analysis
        tajweedAnalysis: {
          maddAccuracy: tajweedAnalysis.maddAnalysis.maddAccuracy,
          ghunnahAccuracy: tajweedAnalysis.ghunnahAnalysis.ghunnahAccuracy,
          waqfAccuracy: tajweedAnalysis.waqfAnalysis.waqfAccuracy,
          makhrajAccuracy: tajweedAnalysis.makhrajAnalysis.makhrajAccuracy,
          correctMaddCount: tajweedAnalysis.maddAnalysis.correctMaddCount,
          totalMaddCount: tajweedAnalysis.maddAnalysis.totalMaddCount,
          correctGhunnahCount: tajweedAnalysis.ghunnahAnalysis.correctGhunnahCount,
          totalGhunnahCount: tajweedAnalysis.ghunnahAnalysis.totalGhunnahCount,
          correctWaqfCount: tajweedAnalysis.waqfAnalysis.correctWaqfCount,
          invalidPauseCount: tajweedAnalysis.waqfAnalysis.invalidPauseCount,
          totalWaqfCount: tajweedAnalysis.waqfAnalysis.totalWaqfCount,
          correctMakhrajCount: tajweedAnalysis.makhrajAnalysis.correctMakhrajCount,
          totalMakhrajCount: tajweedAnalysis.makhrajAnalysis.totalMakhrajCount
        }
      };

      // Persist final state
      console.log(`🔵 [DEBUG] Persisting final state to database...`);
      const session = await RecitationSession.findById(sessionId);
      if (session) {
        session.transcript = sessionData.transcript;
        session.transcriptSegments = sessionData.transcriptSegments;
        session.detectedMistakes = sessionData.detectedMistakes;
        session.metrics = sessionData.metrics;
        session.status = 'completed';
        session.endedAt = new Date();
        session.duration = (Date.now() - sessionData.startTime) / 1000;
        
        console.log(`🔵 [DEBUG] Final metrics to save:`, {
          tajweedScore: sessionData.metrics.tajweedScore,
          fluencyScore: sessionData.metrics.fluencyScore,
          makhrajAccuracy: sessionData.metrics.makhrajAccuracy,
          waqfConsistency: sessionData.metrics.waqfConsistency,
          phoneticAccuracy: sessionData.metrics.phoneticAccuracy,
          totalMistakes: sessionData.detectedMistakes.length
        });
        
        await session.save();
        console.log(`✅ [DEBUG] Session ${sessionId} saved to database`);
      } else {
        console.error(`❌ [DEBUG] Session ${sessionId} not found in database!`);
      }

      // ✅ NEW ARCHITECTURE: Pure PCM - No cleanup needed (no streaming converter)

      // Remove from active sessions
      this.activeSessions.delete(sessionId);

      return sessionData;
    } catch (error) {
      console.error(`Error finalizing session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get current session state
   */
  getSessionState(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Stop/cleanup session
   */
  stopSession(sessionId) {
    this.activeSessions.delete(sessionId);
  }
}

module.exports = new LiveRecitationProcessor();
