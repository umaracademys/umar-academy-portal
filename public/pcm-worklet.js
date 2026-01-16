/**
 * PCM Audio Worklet Processor
 * Captures microphone audio and converts to 16-bit PCM (16kHz, mono)
 * 
 * Why PCM?
 * - No container format overhead (WebM, MP4, etc.)
 * - No FFmpeg needed (direct audio data)
 * - Low latency (< 300ms)
 * - Whisper-compatible (16-bit PCM, 16kHz, mono)
 * - No temp files
 * - Production-ready for live streaming
 */

class PCMProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    // Configuration
    this.targetSampleRate = 16000; // Whisper requires 16kHz
    this.targetChannels = 1; // Mono
    this.bitDepth = 16; // 16-bit PCM
    
    // Resampling state (if input is not 16kHz)
    this.inputSampleRate = options.processorOptions?.sampleRate || 48000;
    this.resampleRatio = this.inputSampleRate / this.targetSampleRate;
    this.resampleBuffer = [];
    
    // Buffer for accumulating samples before sending
    this.bufferSize = 4800; // ~300ms at 16kHz (4800 samples = 0.3 seconds)
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    
    // Frame counter for resampling
    this.frameCount = 0;
    
    console.log(`[PCM Worklet] Initialized: ${this.inputSampleRate}Hz → ${this.targetSampleRate}Hz, ${this.targetChannels} channel(s)`);
  }

  /**
   * Resample audio from input sample rate to 16kHz
   * Simple linear interpolation (sufficient for real-time)
   */
  resample(inputSamples) {
    if (this.inputSampleRate === this.targetSampleRate) {
      return inputSamples; // No resampling needed
    }
    
    const outputLength = Math.floor(inputSamples.length / this.resampleRatio);
    const output = new Float32Array(outputLength);
    
    for (let i = 0; i < outputLength; i++) {
      const sourceIndex = i * this.resampleRatio;
      const index = Math.floor(sourceIndex);
      const fraction = sourceIndex - index;
      
      if (index + 1 < inputSamples.length) {
        // Linear interpolation
        output[i] = inputSamples[index] * (1 - fraction) + inputSamples[index + 1] * fraction;
      } else {
        output[i] = inputSamples[index] || 0;
      }
    }
    
    return output;
  }

  /**
   * Convert Float32 samples to Int16 PCM
   * Float32 range: -1.0 to 1.0
   * Int16 range: -32768 to 32767
   */
  float32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1] range
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      // Convert to Int16
      int16Array[i] = sample < 0 
        ? sample * 0x8000 
        : sample * 0x7FFF;
    }
    
    return int16Array;
  }

  /**
   * Main processing function (called every 128 samples by default)
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    // Check if we have input data
    if (!input || input.length === 0) {
      return true; // Keep processor alive
    }
    
    // Get mono channel (first channel, or mix if stereo)
    let inputChannel = input[0];
    
    if (input.length > 1) {
      // Mix stereo to mono
      inputChannel = new Float32Array(input[0].length);
      for (let i = 0; i < input[0].length; i++) {
        inputChannel[i] = (input[0][i] + input[1][i]) / 2;
      }
    }
    
    if (!inputChannel || inputChannel.length === 0) {
      return true;
    }
    
    // Resample to 16kHz if needed
    const resampled = this.resample(inputChannel);
    
    // Add to buffer
    for (let i = 0; i < resampled.length; i++) {
      this.buffer[this.bufferIndex++] = resampled[i];
      
      // When buffer is full, send to main thread
      if (this.bufferIndex >= this.bufferSize) {
        // Convert Float32 → Int16 PCM
        const int16PCM = this.float32ToInt16(this.buffer);
        
        // Send binary PCM data to main thread
        this.port.postMessage({
          type: 'pcm-data',
          data: int16PCM.buffer, // Transfer ArrayBuffer (zero-copy)
          sampleRate: this.targetSampleRate,
          channels: this.targetChannels,
          bitDepth: this.bitDepth,
          samples: int16PCM.length
        }, [int16PCM.buffer]); // Transfer ownership (zero-copy)
        
        // Reset buffer
        this.bufferIndex = 0;
      }
    }
    
    // Keep processor alive
    return true;
  }
}

// Register the processor
registerProcessor('pcm-processor', PCMProcessor);
