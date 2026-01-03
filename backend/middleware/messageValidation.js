/**
 * Message Validation Middleware
 * 
 * Server-side validation to prevent contact information sharing
 * and ensure message security.
 * 
 * @module middleware/messageValidation
 */

/**
 * Patterns to detect contact information
 */
const CONTACT_PATTERNS = {
  // Email patterns
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Phone number patterns (various formats)
  phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{10,}/g,
  
  // WhatsApp patterns
  whatsapp: /(whatsapp|wa\.me|wa\.link|chat\.whatsapp\.com)/gi,
  
  // Telegram patterns
  telegram: /(telegram|t\.me|@[a-zA-Z0-9_]{5,})/gi,
  
  // Zoom/Skype patterns
  videoCall: /(zoom\.us|skype:|meet\.google\.com|teams\.microsoft\.com)/gi,
  
  // Social media handles
  socialMedia: /(@[a-zA-Z0-9_]{3,}|instagram\.com|facebook\.com|twitter\.com|x\.com)/gi,
  
  // URLs (may contain contact info)
  suspiciousUrls: /(http|https):\/\/[^\s]+/g
};

/**
 * Blocked keywords that indicate contact sharing
 */
const BLOCKED_KEYWORDS = [
  'my email is',
  'my phone is',
  'contact me at',
  'reach me at',
  'call me at',
  'text me at',
  'email me at',
  'whatsapp me',
  'telegram me',
  'add me on',
  'my number is',
  'my contact is',
  'personal email',
  'personal phone',
  'private email',
  'private phone',
  'direct message',
  'dm me',
  'private message',
  'pm me'
];

/**
 * Validate message body for contact information
 * 
 * @param {string} body - Message body to validate
 * @returns {Object} - { valid: boolean, violations: string[] }
 */
function validateMessageBody(body) {
  if (!body || typeof body !== 'string') {
    return { valid: false, violations: ['Message body is required'] };
  }
  
  const violations = [];
  const lowerBody = body.toLowerCase();
  
  // Check for blocked keywords
  for (const keyword of BLOCKED_KEYWORDS) {
    if (lowerBody.includes(keyword.toLowerCase())) {
      violations.push(`Contains blocked keyword: "${keyword}"`);
    }
  }
  
  // Check for email patterns
  const emails = body.match(CONTACT_PATTERNS.email);
  if (emails) {
    // Allow @umaracademy.org emails (official domain)
    const nonOfficialEmails = emails.filter(email => 
      !email.toLowerCase().includes('@umaracademy.org')
    );
    if (nonOfficialEmails.length > 0) {
      violations.push(`Contains email address(es): ${nonOfficialEmails.join(', ')}`);
    }
  }
  
  // Check for phone numbers
  const phones = body.match(CONTACT_PATTERNS.phone);
  if (phones) {
    violations.push(`Contains phone number(s): ${phones.join(', ')}`);
  }
  
  // Check for WhatsApp references
  if (CONTACT_PATTERNS.whatsapp.test(body)) {
    violations.push('Contains WhatsApp reference');
  }
  
  // Check for Telegram references
  if (CONTACT_PATTERNS.telegram.test(body)) {
    violations.push('Contains Telegram reference');
  }
  
  // Check for video call links
  if (CONTACT_PATTERNS.videoCall.test(body)) {
    violations.push('Contains video call link');
  }
  
  // Check for suspicious social media references
  if (CONTACT_PATTERNS.socialMedia.test(body)) {
    violations.push('Contains social media reference');
  }
  
  return {
    valid: violations.length === 0,
    violations
  };
}

/**
 * Validate file attachment
 * 
 * @param {Object} file - File object with mimetype and size
 * @returns {Object} - { valid: boolean, error: string }
 */
function validateAttachment(file) {
  if (!file) {
    return { valid: false, error: 'File is required' };
  }
  
  // Allowed MIME types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/webm',
    'video/mp4',
    'video/webm',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  // Blocked executable types
  const blockedTypes = [
    'application/x-msdownload',
    'application/x-executable',
    'application/x-sharedlib',
    'application/x-elf',
    'application/x-mach-binary',
    'application/x-msdos-program',
    'application/x-ms-installer',
    'application/x-dmg',
    'application/x-iso9660-image'
  ];
  
  // Check file type
  if (blockedTypes.includes(file.mimetype)) {
    return { valid: false, error: 'Executable files are not allowed' };
  }
  
  if (!allowedTypes.includes(file.mimetype)) {
    return { valid: false, error: `File type ${file.mimetype} is not allowed` };
  }
  
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }
  
  return { valid: true };
}

/**
 * Express middleware to validate message body
 */
function validateMessageMiddleware(req, res, next) {
  const { body: messageBody } = req.body;
  
  if (!messageBody) {
    return res.status(400).json({ 
      error: 'Message body is required',
      code: 'MISSING_BODY'
    });
  }
  
  const validation = validateMessageBody(messageBody);
  
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Message contains prohibited content',
      code: 'CONTACT_INFO_DETECTED',
      violations: validation.violations,
      message: 'Messages cannot contain email addresses, phone numbers, or external contact information. Please use the in-app messaging system.'
    });
  }
  
  next();
}

/**
 * Express middleware to validate attachments
 */
function validateAttachmentsMiddleware(req, res, next) {
  const { attachments } = req.body;
  
  if (!attachments || !Array.isArray(attachments)) {
    return next();
  }
  
  for (const attachment of attachments) {
    const validation = validateAttachment(attachment);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid attachment',
        code: 'INVALID_ATTACHMENT',
        details: validation.error
      });
    }
  }
  
  next();
}

module.exports = {
  validateMessageBody,
  validateAttachment,
  validateMessageMiddleware,
  validateAttachmentsMiddleware,
  CONTACT_PATTERNS,
  BLOCKED_KEYWORDS
};

