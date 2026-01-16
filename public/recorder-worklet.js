/**
 * Audio Worklet Processor for Live Recitation Monitoring
 * Replaces deprecated ScriptProcessorNode with modern AudioWorkletNode
 * 
 * This processor captures audio from the microphone and sends Float32Array chunks
 * to the main thread via postMessage for real-time transcription.
 */

class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096; // Buffer size for audio processing
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    // Check if we have input data
    if (input && input.length > 0) {
      const inputChannel = input[0]; // Get mono channel (first channel)
      
      if (inputChannel && inputChannel.length > 0) {
        // Copy input samples to buffer
        for (let i = 0; i < inputChannel.length; i++) {
          this.buffer[this.bufferIndex++] = inputChannel[i];
          
          // When buffer is full, send it to main thread
          if (this.bufferIndex >= this.bufferSize) {
            // Send a copy of the buffer (Float32Array)
            this.port.postMessage(new Float32Array(this.buffer));
            this.bufferIndex = 0; // Reset buffer index
          }
        }
      }
    }
    
    // Return true to keep the processor alive
    return true;
  }
}

// Register the processor with the AudioWorklet
registerProcessor('recorder-processor', RecorderProcessor);
