/**
 * PCM Audio Utilities
 * Pure PCM conversion utilities - NO FFmpeg, NO WebM, NO temp files
 * 
 * This module provides direct PCM buffer conversion for Whisper compatibility.
 * All audio processing happens in-memory with no file I/O.
 */

/**
 * Converts Int16 PCM buffer → Float32Array for Whisper
 * @param {Buffer} buffer - Int16 PCM buffer (little-endian)
 * @returns {Float32Array} Float32Array normalized to [-1.0, 1.0] range
 */
function pcmInt16ToFloat32(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Input must be a Buffer');
  }

  if (buffer.length % 2 !== 0) {
    throw new Error(`Invalid PCM buffer length: ${buffer.length} (must be multiple of 2 for Int16)`);
  }

  const float32 = new Float32Array(buffer.length / 2);

  for (let i = 0; i < float32.length; i++) {
    // Read Int16 little-endian and normalize to [-1.0, 1.0]
    float32[i] = buffer.readInt16LE(i * 2) / 32768.0;
  }

  return float32;
}

/**
 * Validates that a buffer is valid Int16 PCM
 * @param {Buffer} buffer - Buffer to validate
 * @returns {boolean} True if valid Int16 PCM
 */
function isValidPCMBuffer(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    return false;
  }
  
  // Must be multiple of 2 (Int16 = 2 bytes per sample)
  if (buffer.length % 2 !== 0) {
    return false;
  }
  
  // Must have at least some data
  if (buffer.length === 0) {
    return false;
  }
  
  return true;
}

module.exports = {
  pcmInt16ToFloat32,
  isValidPCMBuffer
};
