/**
 * Secure JWT Configuration Module
 * 
 * This module enforces strict JWT_SECRET validation:
 * - Server FAILS TO START if JWT_SECRET is missing
 * - No default JWT secret is allowed
 * - Secret length must be >= 64 characters
 * 
 * This ensures JWT authentication is secure by default.
 */

const MIN_SECRET_LENGTH = 64;
const DEFAULT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';

/**
 * Validates and returns JWT_SECRET from environment
 * @throws {Error} If JWT_SECRET is missing, is default, or too short
 * @returns {string} Valid JWT_SECRET
 */
function getJWTSecret() {
  const jwtSecret = process.env.JWT_SECRET;

  // CRITICAL: Fail if JWT_SECRET is not set
  if (!jwtSecret) {
    console.error('');
    console.error('❌ CRITICAL SECURITY ERROR: JWT_SECRET is not set!');
    console.error('');
    console.error('   The server cannot start without a secure JWT_SECRET.');
    console.error('   Please set JWT_SECRET environment variable with a strong random string.');
    console.error('');
    console.error('   Generate a secure secret with:');
    console.error('     openssl rand -base64 48');
    console.error('   Or:');
    console.error('     node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"');
    console.error('');
    throw new Error('JWT_SECRET environment variable is required. Server cannot start without it.');
  }

  // CRITICAL: Fail if using default secret
  if (jwtSecret === DEFAULT_SECRET) {
    console.error('');
    console.error('❌ CRITICAL SECURITY ERROR: Using default JWT_SECRET!');
    console.error('');
    console.error('   The default JWT_SECRET is insecure and must not be used.');
    console.error('   Please set JWT_SECRET environment variable to a strong random string.');
    console.error('');
    console.error('   Generate a secure secret with:');
    console.error('     openssl rand -base64 48');
    console.error('   Or:');
    console.error('     node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"');
    console.error('');
    throw new Error('Default JWT_SECRET is not allowed. Please set a secure JWT_SECRET environment variable.');
  }

  // CRITICAL: Fail if secret is too short
  if (jwtSecret.length < MIN_SECRET_LENGTH) {
    console.error('');
    console.error(`❌ CRITICAL SECURITY ERROR: JWT_SECRET is too short!`);
    console.error('');
    console.error(`   JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`);
    console.error(`   Current length: ${jwtSecret.length} characters`);
    console.error('');
    console.error('   Generate a secure secret with:');
    console.error('     openssl rand -base64 48');
    console.error('   Or:');
    console.error('     node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"');
    console.error('');
    throw new Error(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters long. Current length: ${jwtSecret.length}`);
  }

  // Log success (only first 8 chars for security)
  const preview = jwtSecret.substring(0, 8) + '...';
  console.log(`✅ JWT_SECRET validated (length: ${jwtSecret.length}, preview: ${preview})`);

  return jwtSecret;
}

// Validate JWT_SECRET immediately when module is loaded
// This ensures the server fails to start if JWT_SECRET is invalid
let validatedSecret = null;
try {
  validatedSecret = getJWTSecret();
} catch (error) {
  // Re-throw to prevent server from starting
  throw error;
}

// Export the validated secret
module.exports = {
  JWT_SECRET: validatedSecret,
  getJWTSecret,
  MIN_SECRET_LENGTH
};
