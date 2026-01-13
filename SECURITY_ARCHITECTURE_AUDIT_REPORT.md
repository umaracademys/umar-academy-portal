# Security & Architecture Audit Report
**Date:** 2025-01-27  
**Auditor:** Senior Full-Stack Architect & Security Engineer  
**Scope:** Full codebase audit (Frontend + Backend)

---

## Executive Summary

This audit identified **8 Critical**, **12 Medium**, and **9 Low** severity issues across security, performance, and architecture. The codebase shows good security practices in many areas (JWT auth, permission system, input sanitization) but has several critical vulnerabilities that must be addressed before production deployment.

**Key Findings:**
- ✅ **Strengths:** JWT authentication, permission-based authorization, input sanitization, rate limiting (partial), WebSocket security
- ❌ **Critical Issues:** XSS vulnerability, unauthenticated file uploads, default JWT secret, regex injection risks, excessive console logging
- ⚠️ **Medium Issues:** Missing rate limiting on many endpoints, large React context causing performance issues, CORS too permissive in dev
- 📝 **Low Issues:** Code organization, error message verbosity, missing pagination

---

## 🔴 CRITICAL ISSUES

### 1. XSS Vulnerability: Unsanitized HTML Rendering
**Severity:** CRITICAL  
**File:** `src/components/EmailModule.tsx:265`

**Problem:**
```tsx
<div dangerouslySetInnerHTML={{ __html: message }} />
```
Rendering user-controlled HTML without sanitization allows XSS attacks. An attacker could inject malicious scripts that execute in users' browsers.

**Why it's critical:**
- Allows complete account takeover via session hijacking
- Can steal authentication tokens from localStorage
- Can perform actions on behalf of authenticated users
- No Content Security Policy (CSP) bypass protection in place

**Fix:**
```tsx
import DOMPurify from 'dompurify';

// In component:
<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(message, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a'],
    ALLOWED_ATTR: ['href', 'target']
  })
}} />
```

**Additional Steps:**
1. Install: `pnpm add dompurify && pnpm add -D @types/dompurify`
2. Review all other uses of `dangerouslySetInnerHTML` in codebase
3. Consider using a markdown renderer instead of raw HTML

---

### 2. Unauthenticated File Upload Endpoints
**Severity:** CRITICAL  
**Files:** 
- `backend/server.js:257` - `/api/mistakes/audio`
- `backend/server.js:288` - `/api/pair-teacher-messages/upload`
- `backend/server.js:345` - `/api/recordings/upload`

**Problem:**
Three file upload endpoints accept files without authentication:
```javascript
app.post('/api/mistakes/audio', (req, res) => {
  // No authenticateToken middleware!
  const buffer = Buffer.concat(chunks);
  fs.writeFileSync(filePath, buffer);
});
```

**Why it's critical:**
- Anyone can upload files to your server
- No file type validation (only checks Content-Type header, which can be spoofed)
- No file size limits enforced
- Can fill disk space with malicious uploads
- Potential path traversal if filename not properly sanitized

**Fix:**
```javascript
// Add authentication and validation
const multer = require('multer');
const upload = multer({
  dest: 'uploads/temp/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/webm', 'audio/mpeg', 'audio/wav'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

app.post('/api/mistakes/audio', authenticateToken, upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Validate file extension matches MIME type
  const fileExtension = path.extname(req.file.originalname).toLowerCase();
  const allowedExtensions = ['.webm', '.mp3', '.wav'];
  if (!allowedExtensions.includes(fileExtension)) {
    fs.unlinkSync(req.file.path); // Delete uploaded file
    return res.status(400).json({ error: 'Invalid file extension' });
  }
  
  // Move to final location with sanitized filename
  const sanitizedFilename = sanitizeFilename(req.file.originalname);
  const finalPath = path.join(uploadsDir, sanitizedFilename);
  fs.renameSync(req.file.path, finalPath);
  
  res.json({ audioUrl: `/uploads/mistakes/${sanitizedFilename}` });
});
```

**Additional Steps:**
1. Add file size limits (currently unlimited)
2. Implement virus scanning for uploaded files
3. Store files outside web root or use cloud storage
4. Add rate limiting specifically for upload endpoints

---

### 3. Default JWT Secret in Production
**Severity:** CRITICAL  
**File:** `backend/server.js:40`

**Problem:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
```
If `JWT_SECRET` environment variable is not set, the server uses a hardcoded default secret that is publicly visible in the codebase.

**Why it's critical:**
- Anyone with code access can forge JWT tokens
- Can impersonate any user (including superadmin)
- Complete system compromise
- Tokens cannot be invalidated without changing secret

**Fix:**
```javascript
// At server startup, before any routes
if (isProduction) {
  if (!process.env.JWT_SECRET || 
      process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production' ||
      process.env.JWT_SECRET.length < 32) {
    console.error('❌ CRITICAL: JWT_SECRET must be set to a secure random value (min 32 chars)');
    console.error('   Generate with: openssl rand -base64 32');
    process.exit(1); // Exit immediately - don't start server
  }
}

const JWT_SECRET = process.env.JWT_SECRET; // No fallback in production
```

**Additional Steps:**
1. Generate new secret: `openssl rand -base64 32`
2. Set in production environment variables
3. Invalidate all existing tokens (force re-login)
4. Add secret rotation policy

---

### 4. Regex Injection in MongoDB Queries
**Severity:** CRITICAL  
**Files:** Multiple files using `$regex` with user input

**Problem:**
```javascript
// backend/server.js:1985
if (email) query.userEmail = { $regex: email, $options: 'i' };

// backend/checkUser.js:41
const user = await User.findOne({ 
  email: { $regex: new RegExp(`^${email}$`, 'i') } 
});
```

**Why it's critical:**
- User input is directly inserted into regex patterns
- Malicious regex patterns can cause ReDoS (Regular Expression Denial of Service)
- Can crash the server with patterns like `(a+)+$` on input `aaaaaaaaaaaaaaaaaaaa!`
- Some instances escape input, but not consistently

**Fix:**
```javascript
// Create utility function
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Use everywhere
if (email) {
  query.userEmail = { 
    $regex: new RegExp(`^${escapeRegex(email)}$`, 'i') 
  };
}

// Or use MongoDB's built-in case-insensitive search (safer)
if (email) {
  query.userEmail = { 
    $regex: email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    $options: 'i' 
  };
}
```

**Files to fix:**
- `backend/server.js:1985`
- `backend/checkUser.js:41`
- `backend/checkSpecificUser.js:56,83,100,116`
- `backend/unlockAccount.js:37`
- `backend/resetPassword.js:30`
- `backend/checkSuperAdmin.js:36`
- All other files using `$regex` with user input

---

### 5. Excessive Console Logging in Production
**Severity:** CRITICAL  
**Files:** Throughout codebase (37+ instances in frontend alone)

**Problem:**
```javascript
// src/contexts/AuthContext.tsx:30-35
console.log('🔍 AuthContext: Checking for saved user...');
console.log('🔍 AuthContext: Saved user exists:', !!savedUser);
console.log('🔍 AuthContext: Saved token exists:', !!savedToken);

// backend/server.js:274
console.log(`✅ Audio uploaded: ${audioUrl}`);
```

**Why it's critical:**
- Logs sensitive data (tokens, user info, emails)
- Performance impact (console.log is synchronous and slow)
- Information leakage to browser console / server logs
- Can expose internal system structure to attackers

**Fix:**
```javascript
// Create logging utility
// backend/utils/logger.js
const isProduction = process.env.NODE_ENV === 'production';

const logger = {
  log: (...args) => !isProduction && console.log(...args),
  info: (...args) => !isProduction && console.info(...args),
  warn: (...args) => console.warn(...args), // Keep warnings
  error: (...args) => console.error(...args), // Keep errors
  debug: (...args) => !isProduction && console.debug(...args),
  
  // Safe logging - redacts sensitive data
  safeLog: (message, data = {}) => {
    if (isProduction) return;
    const safeData = { ...data };
    // Redact sensitive fields
    ['token', 'password', 'email', 'userId'].forEach(key => {
      if (safeData[key]) safeData[key] = '[REDACTED]';
    });
    console.log(message, safeData);
  }
};

module.exports = logger;

// Replace all console.log with logger.log
// Remove sensitive data from logs
```

**Frontend:**
```typescript
// src/utils/logger.ts
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => isDev && console.log(...args),
  error: (...args: any[]) => console.error(...args),
  warn: (...args: any[]) => console.warn(...args),
  // Never log tokens, passwords, or user data
};
```

---

### 6. CORS Allows All Origins in Development
**Severity:** CRITICAL  
**File:** `backend/server.js:234-235`

**Problem:**
```javascript
// In development, allow all localhost origins
if (process.env.NODE_ENV !== 'production') {
  callback(null, true); // Allows ANY origin!
}
```

**Why it's critical:**
- In development, ANY origin can make requests to your API
- If accidentally deployed to production with `NODE_ENV !== 'production'`, complete CORS bypass
- Allows CSRF attacks from malicious websites
- Credentials are sent with requests (`credentials: true`)

**Fix:**
```javascript
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5174',
      'http://localhost:5175',
      process.env.FRONTEND_URL,
      'https://umar-academy-frontend-m2at.onrender.com',
      'https://umar-academy-frontend.onrender.com',
      ...(process.env.ADDITIONAL_FRONTEND_URLS ? process.env.ADDITIONAL_FRONTEND_URLS.split(',') : [])
    ].filter(Boolean);
    
    // NEVER allow all origins, even in development
    // Only allow specific localhost ports
    const isLocalhost = origin.startsWith('http://localhost:') || 
                       origin.startsWith('http://127.0.0.1:');
    const isAllowedPort = isLocalhost && 
      ['5173', '3000', '5174', '5175'].some(port => origin.includes(`:${port}`));
    
    if (isProduction) {
      // Production: strict whitelist
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // Development: allow localhost with specific ports only
      if (isAllowedPort || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true
}));
```

---

### 7. Rate Limiting Disabled in Development
**Severity:** CRITICAL  
**File:** `backend/server.js:1565-1571`

**Problem:**
```javascript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 10000 : 100,
  skip: (req) => {
    if (isDevelopment) {
      return true; // Skip all rate limiting in development
    }
    return false;
  }
});
```

**Why it's critical:**
- If deployed with `NODE_ENV !== 'production'`, no rate limiting
- Allows brute force attacks, DoS attacks
- No protection against API abuse
- Can exhaust server resources

**Fix:**
```javascript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 100, // Still limit in dev, just higher
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Only skip for localhost IPs in development
    if (isDevelopment) {
      const ip = req.ip || req.connection?.remoteAddress || '';
      return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('127.');
    }
    return false;
  },
  handler: async (req, res) => {
    await logActivity('rate_limit_exceeded', {
      req,
      status: 'blocked',
      errorMessage: 'Too many requests',
      details: { endpoint: req.path }
    });
    res.status(429).json({ 
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(15 * 60 / 1000)
    });
  }
});
```

---

### 8. Missing Authentication on Multiple Endpoints
**Severity:** CRITICAL  
**Files:** `backend/server.js` - Multiple endpoints

**Problem:**
Several endpoints lack `authenticateToken` middleware:
- `GET /api/users` (line 2198) - Exposes all users
- `GET /api/teachers` (line 2569) - Exposes all teachers
- `GET /api/admins` (line 3452) - Exposes all admins
- `GET /api/tickets` (line 6466) - Exposes all tickets
- `GET /api/tickets/:id` (line 6667) - Exposes ticket details
- `POST /api/tickets/:id/start` (line 6919) - Allows starting tickets
- `POST /api/tickets/:id/submit` (line 6939) - Allows submitting tickets
- `GET /api/assignments/student/:studentId` (line 5943) - Exposes student assignments
- `GET /api/assignments/:id` (line 6045) - Exposes assignment details
- `POST /api/assignments/:id/submit-homework` (line 6128) - Allows homework submission

**Why it's critical:**
- Unauthorized access to sensitive data
- Can view/modify data without authentication
- Privacy violations (student data, teacher info)
- Can manipulate assignments and tickets

**Fix:**
```javascript
// Add authenticateToken to all endpoints
app.get('/api/users', authenticateToken, async (req, res) => {
  // Add permission check if needed
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  // ... rest of handler
});

app.get('/api/teachers', authenticateToken, async (req, res) => {
  // ... handler
});

app.get('/api/tickets', authenticateToken, async (req, res) => {
  // Filter tickets based on user role
  let query = {};
  if (req.user.role === 'student') {
    query.studentId = req.user.userId;
  } else if (req.user.role === 'teacher') {
    query.assignedTeacherId = req.user.userId;
  }
  // ... rest of handler
});
```

**Action Items:**
1. Audit ALL endpoints in `backend/server.js`
2. Add `authenticateToken` to every endpoint that accesses/modifies data
3. Add role-based filtering (students can only see their own data)
4. Test with unauthenticated requests to verify

---

## 🟡 MEDIUM ISSUES

### 9. Large BackendDataContext Causing Performance Issues
**Severity:** MEDIUM  
**File:** `src/contexts/BackendDataContext.tsx` (4783 lines)

**Problem:**
- Single massive context file (4783 lines)
- Loads all data on mount (students, teachers, admins, assignments, tickets)
- No pagination or lazy loading
- Causes slow initial page load
- Re-renders entire app on any data change

**Why it's a problem:**
- Poor user experience (slow loading)
- High memory usage
- Unnecessary network requests
- Difficult to maintain and debug

**Fix:**
```typescript
// Split into smaller contexts
// src/contexts/StudentsContext.tsx
export const StudentsProvider = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);
  // Only student-related logic
};

// src/contexts/AssignmentsContext.tsx
export const AssignmentsProvider = ({ children }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  // Only assignment-related logic
};

// Implement pagination
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(50);

const loadStudents = async (page = 1) => {
  const response = await fetch(`${API_BASE}/students?page=${page}&limit=${pageSize}`);
  // ...
};

// Use React Query for caching and automatic refetching
import { useQuery } from '@tanstack/react-query';

const { data: students } = useQuery({
  queryKey: ['students'],
  queryFn: () => fetchStudents(),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

### 10. Missing Rate Limiting on Many Endpoints
**Severity:** MEDIUM  
**File:** `backend/server.js` - Multiple endpoints

**Problem:**
Only login endpoint and general API have rate limiting. Many sensitive endpoints lack rate limiting:
- Password reset endpoints
- File upload endpoints
- Ticket creation/submission
- Assignment creation
- User creation/deletion

**Fix:**
```javascript
// Create specific rate limiters
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: 'Too many password reset attempts'
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per 15 minutes
  message: 'Too many file uploads'
});

// Apply to endpoints
app.post('/api/auth/password-reset-request', passwordResetLimiter, async (req, res) => {
  // ...
});

app.post('/api/mistakes/audio', authenticateToken, uploadLimiter, async (req, res) => {
  // ...
});
```

---

### 11. Plain Text Password Support (Legacy)
**Severity:** MEDIUM  
**File:** `backend/server.js:1745-1747`

**Problem:**
```javascript
// Legacy plain text password - compare directly (for migration period only)
console.warn(`⚠️ User ${email} has plain text password. Please update to hashed password.`);
isPasswordValid = password === user.password;
```

**Why it's a problem:**
- Passwords stored in plain text are visible to anyone with database access
- Violates security best practices
- Should be removed after migration

**Fix:**
```javascript
// Remove plain text support after migration
if (!isBcryptHash) {
  // Force password reset for users with plain text passwords
  return res.status(403).json({ 
    error: 'Password reset required. Please use the password reset feature.',
    requiresPasswordReset: true
  });
}
```

---

### 12. File Upload Size Limits Not Enforced
**Severity:** MEDIUM  
**Files:** `backend/server.js:257, 288, 345`

**Problem:**
File upload endpoints don't check file size before saving:
```javascript
const buffer = Buffer.concat(chunks);
// No size check!
fs.writeFileSync(filePath, buffer);
```

**Why it's a problem:**
- Can fill disk space
- DoS attack vector
- No protection against large file uploads

**Fix:**
```javascript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
let totalSize = 0;

req.on('data', chunk => {
  totalSize += chunk.length;
  if (totalSize > MAX_FILE_SIZE) {
    req.destroy(); // Stop receiving data
    return res.status(413).json({ error: 'File too large. Maximum size: 10MB' });
  }
  chunks.push(chunk);
});
```

---

### 13. No CSRF Protection
**Severity:** MEDIUM  
**Files:** All POST/PUT/DELETE endpoints

**Problem:**
No CSRF token validation for state-changing operations.

**Why it's a problem:**
- Vulnerable to Cross-Site Request Forgery attacks
- Malicious websites can perform actions on behalf of users
- Especially dangerous for admin actions

**Fix:**
```javascript
// Install: npm install csurf
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

// Add to app
app.use(csrfProtection);

// Send token to frontend
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Frontend: Include in requests
const csrfToken = await fetch('/api/csrf-token').then(r => r.json());
fetch('/api/assignments', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken.csrfToken
  }
});
```

**Note:** CSRF protection may conflict with CORS. Consider using SameSite cookies instead.

---

### 14. Sensitive Data in localStorage
**Severity:** MEDIUM  
**Files:** `src/contexts/AuthContext.tsx:209-210`

**Problem:**
```typescript
localStorage.setItem('umar_academy_token', data.token);
localStorage.setItem('umar_academy_user', JSON.stringify(data.user));
```

**Why it's a problem:**
- localStorage is accessible to XSS attacks
- Tokens persist even after browser close
- No automatic expiration

**Fix:**
```typescript
// Use httpOnly cookies instead (set by backend)
// Backend:
res.cookie('token', token, {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
});

// Frontend: Remove localStorage, read from cookies
// Or use sessionStorage (cleared on tab close)
sessionStorage.setItem('umar_academy_token', data.token);

// Add token expiration check
const tokenExpiry = decoded.exp * 1000;
if (Date.now() > tokenExpiry) {
  // Token expired, force re-login
  logout();
}
```

---

### 15. Missing Input Validation on Some Endpoints
**Severity:** MEDIUM  
**Files:** Multiple endpoints in `backend/server.js`

**Problem:**
Some endpoints don't validate input before processing:
```javascript
app.post('/api/tickets', authenticateToken, async (req, res) => {
  const { studentId, type, pages } = req.body;
  // No validation!
  const ticket = new Ticket({ studentId, type, pages });
});
```

**Fix:**
```javascript
// Use validation library (Joi, express-validator, etc.)
const { body, validationResult } = require('express-validator');

app.post('/api/tickets', 
  authenticateToken,
  [
    body('studentId').isMongoId().withMessage('Invalid student ID'),
    body('type').isIn(['sabq', 'sabqi', 'manzil']).withMessage('Invalid ticket type'),
    body('pages').isArray().withMessage('Pages must be an array'),
    body('pages.*').isInt({ min: 1, max: 604 }).withMessage('Invalid page number')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ... handler
  }
);
```

---

### 16. Error Messages Expose Too Much Information
**Severity:** MEDIUM  
**Files:** `backend/server.js:7304-7311`

**Problem:**
```javascript
res.status(500).json({ 
  error: error.message,
  details: process.env.NODE_ENV === 'development' ? error.stack : undefined
});
```

**Why it's a problem:**
- Stack traces can reveal file paths, internal structure
- Error messages may leak sensitive information
- Helps attackers understand system architecture

**Fix:**
```javascript
// Create error handler middleware
const handleError = (err, req, res, next) => {
  // Log full error server-side
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.userId
  });
  
  // Send generic error to client
  const statusCode = err.statusCode || 500;
  const response = {
    error: statusCode === 500 ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString()
  };
  
  // Only include details in development
  if (process.env.NODE_ENV === 'development') {
    response.details = err.message;
    response.stack = err.stack;
  }
  
  res.status(statusCode).json(response);
};
```

---

### 17. No Database Query Timeout
**Severity:** MEDIUM  
**Files:** All MongoDB queries

**Problem:**
MongoDB queries have no timeout, can hang indefinitely.

**Fix:**
```javascript
// Set default timeout
mongoose.set('maxTimeMS', 30000); // 30 seconds

// Or per query
const students = await Student.find({})
  .maxTimeMS(30000)
  .lean();
```

---

### 18. Missing Pagination on List Endpoints
**Severity:** MEDIUM  
**Files:** Multiple GET endpoints

**Problem:**
Endpoints like `/api/students`, `/api/teachers` return all records without pagination.

**Fix:**
```javascript
app.get('/api/students', authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;
  
  const [students, total] = await Promise.all([
    Student.find({}).skip(skip).limit(limit).lean(),
    Student.countDocuments({})
  ]);
  
  res.json({
    students,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});
```

---

### 19. WebSocket Room-Based Authorization Weak
**Severity:** MEDIUM  
**File:** `backend/server.js:81-96`

**Problem:**
```javascript
if (socket.userRole === 'student') {
  socket.join(`student:${socket.userId}`);
} else if (socket.userRole === 'teacher') {
  socket.join(`teacher:${socket.userId}`);
}
```

**Why it's a problem:**
- No verification that user can access specific student/teacher data
- Teacher could potentially join student rooms if they know the ID
- No validation of room membership before emitting events

**Fix:**
```javascript
// Add room access validation
io.on('connection', (socket) => {
  // Join default room
  if (socket.userRole === 'student') {
    socket.join(`student:${socket.userId}`);
  }
  
  // Validate room access before joining additional rooms
  socket.on('join-room', async (roomId, callback) => {
    if (socket.userRole === 'student' && roomId.startsWith('student:')) {
      const requestedUserId = roomId.split(':')[1];
      if (requestedUserId !== socket.userId) {
        return callback({ error: 'Unauthorized room access' });
      }
    }
    // Additional validation for teacher/admin rooms
    socket.join(roomId);
    callback({ success: true });
  });
});
```

---

### 20. No Request ID Tracking
**Severity:** MEDIUM  
**Files:** All endpoints

**Problem:**
No request ID for tracing requests across logs.

**Fix:**
```javascript
const { v4: uuidv4 } = require('uuid');

app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Use in logs
console.error(`[${req.id}] Error:`, error);
```

---

## 🟢 LOW ISSUES

### 21. Code Organization: Monolithic server.js
**Severity:** LOW  
**File:** `backend/server.js` (15015 lines)

**Recommendation:**
Split into modules:
- `routes/auth.js`
- `routes/students.js`
- `routes/teachers.js`
- `routes/assignments.js`
- etc.

---

### 22. Inconsistent Error Response Format
**Severity:** LOW  
**Files:** Throughout backend

**Recommendation:**
Standardize error responses:
```javascript
{
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input',
    details: { field: 'email', reason: 'Invalid format' }
  }
}
```

---

### 23. Missing API Versioning
**Severity:** LOW  
**Files:** All API endpoints

**Recommendation:**
Add version prefix: `/api/v1/students`

---

### 24. No Request/Response Logging Middleware
**Severity:** LOW  
**Files:** All endpoints

**Recommendation:**
Add middleware to log requests/responses (with sensitive data redacted).

---

### 25. Hardcoded Frontend URLs
**Severity:** LOW  
**Files:** `backend/server.js:52-53`

**Recommendation:**
Move all URLs to environment variables.

---

### 26. Missing Health Check Endpoint
**Severity:** LOW  
**Files:** None

**Recommendation:**
```javascript
app.get('/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});
```

---

### 27. No API Documentation
**Severity:** LOW  
**Files:** None

**Recommendation:**
Add OpenAPI/Swagger documentation.

---

### 28. Missing Unit Tests
**Severity:** LOW  
**Files:** Test files exist but coverage is low

**Recommendation:**
Increase test coverage, especially for security-critical functions.

---

### 29. Inconsistent Naming Conventions
**Severity:** LOW  
**Files:** Throughout codebase

**Recommendation:**
Establish and enforce naming conventions (camelCase for variables, PascalCase for components, etc.).

---

## 📋 PRIORITY ACTION PLAN

### Immediate (Before Production):
1. ✅ Fix XSS vulnerability (#1)
2. ✅ Add authentication to file upload endpoints (#2)
3. ✅ Remove default JWT secret (#3)
4. ✅ Fix regex injection (#4)
5. ✅ Remove console.log statements (#5)
6. ✅ Fix CORS configuration (#6)
7. ✅ Enable rate limiting (#7)
8. ✅ Add authentication to all endpoints (#8)

### Short Term (Within 1 Week):
9. Split BackendDataContext (#9)
10. Add rate limiting to sensitive endpoints (#10)
11. Remove plain text password support (#11)
12. Add file size limits (#12)
13. Implement CSRF protection (#13)

### Medium Term (Within 1 Month):
14. Move tokens to httpOnly cookies (#14)
15. Add input validation (#15)
16. Improve error handling (#16)
17. Add database timeouts (#17)
18. Implement pagination (#18)

### Long Term (Ongoing):
19-29. Code organization, documentation, testing improvements

---

## 🔒 SECURITY CHECKLIST

- [ ] All endpoints require authentication
- [ ] All user input is validated and sanitized
- [ ] No sensitive data in logs
- [ ] Rate limiting on all endpoints
- [ ] CSRF protection implemented
- [ ] XSS protection (DOMPurify)
- [ ] Secure password storage (bcrypt only)
- [ ] JWT secret is strong and not default
- [ ] CORS is properly configured
- [ ] File uploads are validated and authenticated
- [ ] Error messages don't leak information
- [ ] Database queries have timeouts
- [ ] Regular security audits scheduled

---

## 📊 SUMMARY STATISTICS

- **Total Issues:** 29
- **Critical:** 8
- **Medium:** 12
- **Low:** 9
- **Files Reviewed:** 50+
- **Lines of Code Audited:** ~20,000+

---

**Report Generated:** 2025-01-27  
**Next Audit Recommended:** After critical issues are resolved
