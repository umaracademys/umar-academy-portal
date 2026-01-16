/**
 * Recitation Processing Service
 * Orchestrates the full pipeline: transcription → comparison → metrics → mistakes
 */

const whisperService = require('./whisperService');
const textComparisonService = require('./textComparisonService');
const { getQuranWords, getExpectedText } = require('./quranDataService');
const RecitationSession = require('../schemas/recitationSession');

class RecitationProcessor {
  /**
   * Process complete audio file
   * @param {Buffer} audioBuffer - Audio file buffer
   * @param {string} sessionId - Recitation session ID
   * @returns {Promise<Object>} Processed session
   */
  async processAudio(audioBuffer, sessionId) {
    try {
      const session = await RecitationSession.findById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Update status
      session.status = 'processing';
      await session.save();

      console.log(`📝 [Session ${sessionId}] Starting transcription...`);

      // Step 1: Transcribe audio
      const transcription = await whisperService.transcribe(audioBuffer, {
        chunk_length_s: 30,
        stride_length_s: 5
      });
      
      session.transcript = transcription.text;
      session.transcriptSegments = transcription.segments;
      await session.save();

      console.log(`✅ [Session ${sessionId}] Transcription complete: ${transcription.text.length} characters`);

      // Step 2: Get expected text from Mushaf
      console.log(`📖 [Session ${sessionId}] Fetching expected text...`);
      const expectedWords = await getQuranWords(
        session.surahNumber,
        session.startAyah,
        session.endAyah
      );
      const expectedText = await getExpectedText(
        session.surahNumber,
        session.startAyah,
        session.endAyah
      );

      if (!expectedWords || expectedWords.length === 0) {
        throw new Error('No expected words found for the specified range');
      }

      session.expectedText = expectedText;
      session.expectedWords = expectedWords;
      await session.save();

      console.log(`✅ [Session ${sessionId}] Expected text loaded: ${expectedWords.length} words`);

      // Step 3: Compare texts and detect mistakes
      console.log(`🔍 [Session ${sessionId}] Comparing texts...`);
      const comparison = await textComparisonService.compareText(
        transcription.text,
        expectedWords,
        session.surahNumber,
        session.startAyah,
        session.endAyah
      );

      // Step 4: Calculate fluency metrics from segments
      const fluencyMetrics = textComparisonService.calculateFluencyMetrics(
        transcription.segments,
        session.duration || (transcription.segments.length > 0 
          ? transcription.segments[transcription.segments.length - 1].endTime 
          : 0)
      );

      // Step 5: Update session with results
      session.detectedMistakes = comparison.mistakes.map((mistake, index) => ({
        ...mistake,
        id: `mistake-${sessionId}-${index}`,
        timestamp: mistake.timestamp || (transcription.segments[0]?.startTime || 0)
      }));

      session.metrics = {
        totalWords: comparison.metrics.totalWords,
        wordsSpoken: comparison.metrics.wordsSpoken,
        wordsCorrect: comparison.metrics.wordsCorrect,
        wordsSkipped: comparison.metrics.wordsSkipped,
        wordsRepeated: comparison.metrics.wordsRepeated,
        wordsIncorrect: comparison.metrics.wordsIncorrect,
        fluencyPercentage: Math.round(comparison.metrics.fluencyPercentage * 100) / 100,
        wordsPerMinute: Math.round(fluencyMetrics.wordsPerMinute * 100) / 100,
        pauseCount: fluencyMetrics.pauseCount,
        totalPauseTime: Math.round(fluencyMetrics.totalPauseTime * 100) / 100,
        averagePauseDuration: Math.round(fluencyMetrics.averagePauseDuration * 100) / 100,
        tajweedMistakes: comparison.mistakes.filter(m => m.type === 'tajweed').length,
        memoryMistakes: comparison.mistakes.filter(m => m.type === 'skipped' || m.type === 'incorrect').length,
        holdingMistakes: comparison.mistakes.filter(m => m.type === 'pause').length
      };

      session.status = 'completed';
      session.endedAt = new Date();
      await session.save();

      console.log(`✅ [Session ${sessionId}] Processing completed:`, {
        fluency: `${session.metrics.fluencyPercentage}%`,
        wpm: session.metrics.wordsPerMinute,
        mistakes: session.detectedMistakes.length
      });

      return session;
    } catch (error) {
      console.error(`❌ [Session ${sessionId}] Processing error:`, error);
      const session = await RecitationSession.findById(sessionId);
      if (session) {
        session.status = 'failed';
        session.processingError = error.message;
        await session.save();
      }
      throw error;
    }
  }

  /**
   * Process streaming audio chunk (real-time)
   * @param {Buffer} audioChunk - Audio chunk buffer
   * @param {string} sessionId - Recitation session ID
   * @returns {Promise<Object>} Partial transcription
   */
  async processStream(audioChunk, sessionId) {
    try {
      const session = await RecitationSession.findById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Process chunk
      const transcription = await whisperService.transcribeStream(audioChunk);
      
      // Append to existing transcript
      const existingText = session.transcript || '';
      const newText = transcription.text || '';
      session.transcript = existingText ? `${existingText} ${newText}` : newText;
      
      // Append segments with adjusted timestamps
      const existingSegments = session.transcriptSegments || [];
      const lastEndTime = existingSegments.length > 0 
        ? existingSegments[existingSegments.length - 1].endTime 
        : 0;
      
      const newSegments = transcription.segments.map(seg => ({
        ...seg,
        startTime: seg.startTime + lastEndTime,
        endTime: seg.endTime + lastEndTime
      }));
      
      session.transcriptSegments = [...existingSegments, ...newSegments];
      await session.save();

      return {
        text: newText,
        segments: newSegments,
        fullTranscript: session.transcript
      };
    } catch (error) {
      console.error(`❌ [Session ${sessionId}] Streaming error:`, error);
      throw error;
    }
  }

  /**
   * Finalize streaming session (compare texts after all chunks processed)
   * @param {string} sessionId - Recitation session ID
   * @returns {Promise<Object>} Finalized session
   */
  async finalizeStream(sessionId) {
    try {
      const session = await RecitationSession.findById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (!session.transcript || session.transcript.trim().length === 0) {
        throw new Error('No transcript available');
      }

      session.status = 'processing';
      await session.save();

      // Get expected text
      const expectedWords = await getQuranWords(
        session.surahNumber,
        session.startAyah,
        session.endAyah
      );
      const expectedText = await getExpectedText(
        session.surahNumber,
        session.startAyah,
        session.endAyah
      );

      session.expectedText = expectedText;
      session.expectedWords = expectedWords;
      await session.save();

      // Compare texts
      const comparison = await textComparisonService.compareText(
        session.transcript,
        expectedWords,
        session.surahNumber,
        session.startAyah,
        session.endAyah
      );

      // Calculate metrics
      const fluencyMetrics = textComparisonService.calculateFluencyMetrics(
        session.transcriptSegments,
        session.duration || (session.transcriptSegments.length > 0
          ? session.transcriptSegments[session.transcriptSegments.length - 1].endTime
          : 0)
      );

      // Update session
      session.detectedMistakes = comparison.mistakes.map((mistake, index) => ({
        ...mistake,
        id: `mistake-${sessionId}-${index}`,
        timestamp: mistake.timestamp || (session.transcriptSegments[0]?.startTime || 0)
      }));

      session.metrics = {
        totalWords: comparison.metrics.totalWords,
        wordsSpoken: comparison.metrics.wordsSpoken,
        wordsCorrect: comparison.metrics.wordsCorrect,
        wordsSkipped: comparison.metrics.wordsSkipped,
        wordsRepeated: comparison.metrics.wordsRepeated,
        wordsIncorrect: comparison.metrics.wordsIncorrect,
        fluencyPercentage: Math.round(comparison.metrics.fluencyPercentage * 100) / 100,
        wordsPerMinute: Math.round(fluencyMetrics.wordsPerMinute * 100) / 100,
        pauseCount: fluencyMetrics.pauseCount,
        totalPauseTime: Math.round(fluencyMetrics.totalPauseTime * 100) / 100,
        averagePauseDuration: Math.round(fluencyMetrics.averagePauseDuration * 100) / 100,
        tajweedMistakes: comparison.mistakes.filter(m => m.type === 'tajweed').length,
        memoryMistakes: comparison.mistakes.filter(m => m.type === 'skipped' || m.type === 'incorrect').length,
        holdingMistakes: comparison.mistakes.filter(m => m.type === 'pause').length
      };

      session.status = 'completed';
      session.endedAt = new Date();
      await session.save();

      return session;
    } catch (error) {
      console.error(`❌ [Session ${sessionId}] Finalization error:`, error);
      const session = await RecitationSession.findById(sessionId);
      if (session) {
        session.status = 'failed';
        session.processingError = error.message;
        await session.save();
      }
      throw error;
    }
  }
}

module.exports = new RecitationProcessor();
