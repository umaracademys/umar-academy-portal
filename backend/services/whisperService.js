/**
 * Whisper Speech-to-Text Service
 * CPU-based transcription using @xenova/transformers (Whisper Tiny/Base)
 * Cost-effective, no GPU required
 */

const { pipeline } = require('@xenova/transformers');
const fs = require('fs');
const path = require('path');

class WhisperService {
  constructor() {
    this.processor = null;
    this.modelName = process.env.WHISPER_MODEL || 'Xenova/whisper-tiny'; // 'tiny' for speed, 'base' for accuracy
    this.initialized = false;
    this.initializationPromise = null;
  }

  async initialize() {
    if (this.initialized) return;
    
    // Prevent multiple initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        console.log('🔧 Initializing Whisper model:', this.modelName);
        
        this.processor = await pipeline(
          'automatic-speech-recognition',
          this.modelName,
          {
            device: 'cpu', // Use CPU (no GPU required)
            dtype: 'q8', // Quantized model for lower memory
            model_file: 'onnx/model.onnx', // Use ONNX format for better CPU performance
          }
        );
        
        this.initialized = true;
        console.log('✅ Whisper model initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Whisper:', error);
        this.initializationPromise = null;
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Transcribe audio buffer
   * @param {Buffer|Float32Array} audioBuffer - Audio file buffer or Float32Array
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result with text and segments
   */
  async transcribe(audioBuffer, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Convert Buffer to Float32Array if needed
      let audioData = audioBuffer;
      if (Buffer.isBuffer(audioBuffer)) {
        const audioConverter = require('./audioConverter');
        audioData = await audioConverter.convertToFloat32Array(audioBuffer);
      } else if (!(audioBuffer instanceof Float32Array)) {
        throw new Error('Audio buffer must be Buffer or Float32Array');
      }

      const result = await this.processor(audioData, {
        return_timestamps: true,
        chunk_length_s: 30, // Process in 30-second chunks
        stride_length_s: 5, // 5-second overlap between chunks
        language: 'ar', // Arabic
        task: 'transcribe',
        ...options
      });

      // Format segments
      const segments = result.chunks ? result.chunks.map(chunk => ({
        text: chunk.text || '',
        startTime: chunk.timestamp ? chunk.timestamp[0] : 0,
        endTime: chunk.timestamp ? chunk.timestamp[1] : 0,
        confidence: chunk.score || 0.8
      })) : [];

      return {
        text: result.text || '',
        segments: segments
      };
    } catch (error) {
      console.error('❌ Transcription error:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Transcribe audio file from path
   * @param {string} filePath - Path to audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeFile(filePath, options = {}) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${filePath}`);
    }

    const audioBuffer = fs.readFileSync(filePath);
    return this.transcribe(audioBuffer, options);
  }

  /**
   * Process streaming audio chunk (for real-time)
   * Note: Whisper works best with full audio, but we can process chunks
   * @param {Buffer|Float32Array|string} audioChunk - Audio chunk buffer, Float32Array, or base64 string
   * @param {Object} options - Transcription options (may include format: 'pcm_float32' or 'webm')
   * @returns {Promise<Object>} Partial transcription
   */
  async transcribeStream(audioChunk, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // 🔒 HARD KILL: Only accept Float32Array (PCM-only mode)
      // FFmpeg is DISABLED - all audio must be pre-converted to Float32Array
      let audioData;
      
      if (audioChunk instanceof Float32Array) {
        // ✅ CORRECT PATH: Float32Array from PCM conversion
        audioData = audioChunk;
        console.log(`✅ [PCM] Whisper received Float32Array: ${audioData.length} samples`);
      } else if (Buffer.isBuffer(audioChunk)) {
        // 🔒 HARD KILL: Reject Buffers (could be WebM - FFmpeg is disabled)
        if (process.env.DISABLE_FFMPEG_FOR_LIVE === 'true') {
          // Check if it's WebM (has WebM header)
          const isWebM = audioChunk.length >= 4 && 
            (audioChunk[0] === 0x1A && audioChunk[1] === 0x45 && audioChunk[2] === 0xDF && audioChunk[3] === 0xA3);
          
          if (isWebM) {
            throw new Error('FFmpeg is DISABLED for live recitation. WebM buffers are not supported. Use PCM only.');
          }
        }
        
        // If it's PCM Float32 (length is multiple of 4), convert directly (no temp file)
        if (audioChunk.length % 4 === 0) {
          audioData = new Float32Array(
            audioChunk.buffer,
            audioChunk.byteOffset,
            audioChunk.length / 4
          );
          console.log(`✅ [PCM] Converted PCM Buffer to Float32Array: ${audioData.length} samples`);
        } else {
          throw new Error('Buffer format not recognized. Expected Float32Array. FFmpeg is disabled - use PCM only.');
        }
      } else if (typeof audioChunk === 'string') {
        // 🔒 HARD KILL: Reject base64 strings (could be WebM - FFmpeg is disabled)
        throw new Error('FFmpeg is DISABLED for live recitation. Base64 strings are not supported. Use PCM Float32Array only.');
      } else {
        throw new Error('Audio chunk must be Float32Array. FFmpeg is disabled - use PCM only.');
      }

      // For streaming, process smaller chunks
      const result = await this.processor(audioData, {
        return_timestamps: true,
        chunk_length_s: 10, // Smaller chunks for streaming
        stride_length_s: 2,
        language: 'ar',
        task: 'transcribe',
        ...options
      });

      return {
        text: result.text || '',
        segments: result.chunks ? result.chunks.map(chunk => ({
          text: chunk.text || '',
          startTime: chunk.timestamp ? chunk.timestamp[0] : 0,
          endTime: chunk.timestamp ? chunk.timestamp[1] : 0,
          confidence: chunk.score || 0.8
        })) : []
      };
    } catch (error) {
      console.error('❌ Streaming transcription error:', error);
      throw new Error(`Streaming transcription failed: ${error.message}`);
    }
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.initialized;
  }

  /**
   * Get model info
   */
  getModelInfo() {
    return {
      model: this.modelName,
      initialized: this.initialized,
      device: 'cpu'
    };
  }
}

// Export singleton instance
module.exports = new WhisperService();
