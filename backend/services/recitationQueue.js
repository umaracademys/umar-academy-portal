/**
 * Recitation Queue Service
 * Non-blocking queue for audio chunks to prevent Socket.IO blocking
 * Uses background processing for Whisper transcription
 */

const { EventEmitter } = require('events');

class RecitationQueue extends EventEmitter {
  constructor() {
    super();
    this.queues = new Map(); // sessionId -> chunk queue
    this.processing = new Map(); // sessionId -> boolean (is processing)
    this.workers = new Map(); // sessionId -> worker interval
    this.batchSize = 2; // Process 2 chunks at a time
    this.processInterval = 100; // Check queue every 100ms
  }

  /**
   * Enqueue a chunk for processing (non-blocking)
   * @param {string} sessionId - Session ID
   * @param {Object} chunkData - Chunk data { audioChunkBase64, chunkIndex, sampleRate }
   */
  enqueueChunk(sessionId, chunkData) {
    if (!this.queues.has(sessionId)) {
      this.queues.set(sessionId, []);
      this.processing.set(sessionId, false);
    }

    const queue = this.queues.get(sessionId);
    queue.push({
      ...chunkData,
      enqueuedAt: Date.now()
    });

    // Start worker if not already running
    if (!this.workers.has(sessionId)) {
      this.startWorker(sessionId);
    }

    // Emit event for monitoring
    this.emit('chunk-enqueued', { sessionId, queueSize: queue.length });
  }

  /**
   * Start background worker for a session
   * @param {string} sessionId - Session ID
   */
  startWorker(sessionId) {
    if (this.workers.has(sessionId)) {
      return; // Worker already running
    }

    console.log(`🔵 [Queue] Starting worker for session ${sessionId}`);

    const workerInterval = setInterval(async () => {
      await this.processQueue(sessionId);
    }, this.processInterval);

    this.workers.set(sessionId, workerInterval);

    // Process immediately (don't wait for first interval)
    this.processQueue(sessionId).catch(err => {
      console.error(`❌ [Queue] Error in initial queue processing for ${sessionId}:`, err);
    });
  }

  /**
   * Process queued chunks for a session
   * @param {string} sessionId - Session ID
   */
  async processQueue(sessionId) {
    const queue = this.queues.get(sessionId);
    if (!queue || queue.length === 0) {
      return; // No chunks to process
    }

    if (this.processing.get(sessionId)) {
      return; // Already processing
    }

    // Check if we have enough chunks to process a batch
    if (queue.length < this.batchSize) {
      return; // Wait for more chunks
    }

    this.processing.set(sessionId, true);

    try {
      // Get batch of chunks
      const batch = queue.splice(0, this.batchSize);
      
      console.log(`🔵 [Queue] Processing batch of ${batch.length} chunks for session ${sessionId} (${queue.length} remaining)`);

      // Process batch (this is async but doesn't block Socket.IO)
      const liveRecitationProcessor = require('./liveRecitationProcessor');
      
      // Process each chunk in the batch
      for (const chunkData of batch) {
        try {
          const result = await liveRecitationProcessor.processChunk(
            sessionId,
            chunkData.audioChunkBase64,
            chunkData.chunkIndex,
            chunkData.sampleRate || 16000
          );

          // Emit result for Socket.IO to send to clients
          this.emit('chunk-processed', {
            sessionId,
            chunkIndex: chunkData.chunkIndex,
            result
          });
        } catch (chunkError) {
          console.error(`❌ [Queue] Error processing chunk ${chunkData.chunkIndex}:`, chunkError);
          this.emit('chunk-error', {
            sessionId,
            chunkIndex: chunkData.chunkIndex,
            error: chunkError.message
          });
        }
      }
    } catch (error) {
      console.error(`❌ [Queue] Error processing queue for session ${sessionId}:`, error);
      this.emit('queue-error', { sessionId, error: error.message });
    } finally {
      this.processing.set(sessionId, false);
    }
  }

  /**
   * Stop worker and clear queue for a session
   * @param {string} sessionId - Session ID
   */
  stopWorker(sessionId) {
    if (this.workers.has(sessionId)) {
      clearInterval(this.workers.get(sessionId));
      this.workers.delete(sessionId);
      console.log(`🛑 [Queue] Stopped worker for session ${sessionId}`);
    }

    this.queues.delete(sessionId);
    this.processing.delete(sessionId);
  }

  /**
   * Get queue status for a session
   * @param {string} sessionId - Session ID
   * @returns {Object} Queue status
   */
  getQueueStatus(sessionId) {
    const queue = this.queues.get(sessionId);
    return {
      sessionId,
      queueSize: queue ? queue.length : 0,
      isProcessing: this.processing.get(sessionId) || false,
      hasWorker: this.workers.has(sessionId)
    };
  }

  /**
   * Clear all queues and stop all workers
   */
  clearAll() {
    for (const sessionId of this.workers.keys()) {
      this.stopWorker(sessionId);
    }
    console.log(`🧹 [Queue] Cleared all queues and workers`);
  }
}

module.exports = new RecitationQueue();
