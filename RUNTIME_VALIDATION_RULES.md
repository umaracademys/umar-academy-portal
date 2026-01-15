# Runtime Validation Rules & Hidden Failure Detection

## Runtime Validation Rules

### 1. Student API Validation

#### POST /api/students
```javascript
{
  fullName: required, string, minLength: 2,
  email: optional, valid email format,
  contact: optional, string, minLength: 10,
  program: optional, enum: ['Full-Time HQ', 'Part-Time HQ', 'After School'],
  assignedTeacherIds: optional, array of strings,
  assignedTeacherIds.*: string (MongoDB ObjectId format),
  tuitionFee: optional, number,
  registrationAmount: optional, number
}
```

#### PUT /api/students/:id
```javascript
{
  id: required, MongoDB ObjectId,
  fullName: optional, string, minLength: 2,
  email: optional, valid email format,
  contact: optional, string, minLength: 10,
  program: optional, enum: ['Full-Time HQ', 'Part-Time HQ', 'After School'],
  assignedTeacherIds: optional, array of strings,
  assignedTeacherIds.*: string (MongoDB ObjectId format)
}
```

### 2. Assignment API Validation

#### POST /api/assignments
```javascript
{
  studentId: required, string,
  studentName: required, string,
  classwork: optional, object with structure:
    {
      sabq: optional, array of { type, assignmentRange, details, ... },
      sabqi: optional, array of { type, assignmentRange, details, ... },
      manzil: optional, array of { type, assignmentRange, details, ... }
    },
  homework: optional, object with structure:
    {
      enabled: boolean,
      content: string,
      items: array of { type, range, content, ... }
    }
}
```

#### PUT /api/assignments/:id
```javascript
{
  id: required, MongoDB ObjectId,
  classwork: optional, object (same structure as POST),
  homework: optional, object (same structure as POST),
  comment: optional, string
}
```

### 3. Ticket API Validation

#### POST /api/tickets
```javascript
{
  studentId: required, string,
  studentName: required, string,
  type: required, enum: ['sabq', 'sabqi', 'manzil'],
  adminComment: optional, string,
  assignedTeacherId: optional, string (MongoDB ObjectId)
}
```

#### POST /api/tickets/:id/submit
```javascript
{
  id: required, MongoDB ObjectId,
  teacherComment: required, string,
  mistakes: optional, array of:
    {
      id: string,
      type: enum: ['madd', 'holding', 'memory', 'ikhfa', 'tech', 'other', ...],
      page: number,
      surah: number,
      ayah: number,
      wordIndex: number,
      position: { x: number, y: number },
      note: string,
      audioUrl: optional, string
    },
  recordingUrl: optional, string
}
```

### 4. Teacher API Validation

#### PUT /api/teachers/:id
```javascript
{
  id: required, MongoDB ObjectId,
  fullName: optional, string, minLength: 2,
  email: optional, valid email format,
  contact: optional, string,
  permissions: optional, object with boolean values,
  permissions.*: boolean (key must be valid permission key)
}
```

### 5. Authentication Validation

#### POST /api/auth/login
```javascript
{
  email: required, valid email format,
  password: required, string, minLength: 8,
  role: optional, enum: ['student', 'teacher', 'admin', 'superadmin']
}
```

---

## Hidden Failure Detection

### 1. Schema Drift Detection

**What to Monitor:**
- Log messages containing "SCHEMA DRIFT DETECTED"
- Unknown fields in request bodies
- Mongoose validation errors

**Detection Code:**
```javascript
// In schema pre-save hook
studentSchema.pre('save', function(next) {
  const doc = this;
  const schemaPaths = Object.keys(studentSchema.paths);
  const docKeys = Object.keys(doc.toObject({ virtuals: false }));
  
  const unknownFields = docKeys.filter(key => {
    return !schemaPaths.includes(key) && 
           !['_id', '__v', 'createdAt', 'updatedAt'].includes(key);
  });
  
  if (unknownFields.length > 0) {
    // Log for monitoring
    console.error('SCHEMA DRIFT:', {
      model: 'Student',
      documentId: doc._id,
      unknownFields: unknownFields
    });
  }
  
  next();
});
```

**Alert Threshold:**
- > 5 schema drift events per hour → Investigate
- Any drift in production → Log and alert

### 2. Permission Mismatch Detection

**What to Monitor:**
- Permission check fallback to DB (indicates token permissions missing/outdated)
- Permission version mismatches
- Permission check failures

**Detection Code:**
```javascript
// In requirePermission middleware
if (!userPermissions || Object.keys(userPermissions).length === 0) {
  // Fallback to DB - log this
  console.warn('PERMISSION FALLBACK:', {
    userId: req.user.userId,
    role: req.user.role,
    reason: 'Token permissions missing or empty'
  });
  
  // Check version mismatch
  if (req.user.permissionsVersion) {
    const dbUser = await User.findById(req.user.userId);
    if (dbUser.permissionsVersion !== req.user.permissionsVersion) {
      console.error('PERMISSION VERSION MISMATCH:', {
        userId: req.user.userId,
        tokenVersion: req.user.permissionsVersion,
        dbVersion: dbUser.permissionsVersion
      });
    }
  }
}
```

**Alert Threshold:**
- > 10 fallbacks per hour → Investigate token generation
- Any version mismatch → Force token refresh

### 3. Socket Room Join Failures

**What to Monitor:**
- Socket connections without room membership
- Events not delivered (deliveredCount = 0)
- Room join errors

**Detection Code:**
```javascript
// In emitAssignmentEvent
const socketsInRoom = await io.in(room).fetchSockets();

if (socketsInRoom.length === 0 && targetUsers.length > 0) {
  console.warn('SOCKET ROOM EMPTY:', {
    room: room,
    event: event,
    targetUsers: targetUsers,
    totalSockets: (await io.fetchSockets()).length
  });
}
```

**Alert Threshold:**
- > 3 empty room events per hour → Investigate socket connection
- Any event with 0 delivery → Alert immediately

### 4. Token Expiration Issues

**What to Monitor:**
- TOKEN_EXPIRED errors
- TOKEN_INVALID errors
- 401/403 responses

**Detection Code:**
```javascript
// In authenticateToken middleware
if (err.name === 'TokenExpiredError') {
  await logActivity('token_expired', {
    req,
    userId: decoded?.userId,
    expiredAt: decoded?.exp ? new Date(decoded.exp * 1000) : null
  });
}
```

**Alert Threshold:**
- > 20 expired tokens per hour → Check token expiration settings
- Sudden spike in 401/403 → Possible token generation issue

### 5. API Contract Drift

**What to Monitor:**
- Validation errors (400 responses with validation details)
- Unknown fields in requests
- Type mismatches

**Detection Code:**
```javascript
// In validation middleware
if (!errors.isEmpty()) {
  console.error('VALIDATION ERROR:', {
    path: req.path,
    method: req.method,
    errors: errors.array(),
    body: sanitizeRequestData(req.body)
  });
}
```

**Alert Threshold:**
- > 10 validation errors per hour → Check frontend-backend contract
- Repeated validation errors for same field → API contract drift

### 6. Field Mapping Issues

**What to Monitor:**
- assignedTeacher vs assignedTeacherId inconsistencies
- Field normalization warnings
- Legacy field usage

**Detection Code:**
```javascript
// In normalizeStudentAssignmentFields
const warnings = validateStudentFields(normalized, 'save');
if (warnings.length > 0) {
  console.warn('FIELD MAPPING WARNING:', {
    studentId: normalized._id || normalized.id,
    warnings: warnings
  });
}
```

**Alert Threshold:**
- > 5 field mapping warnings per hour → Check data migration
- Any inconsistency → Log and fix

### 7. Silent Data Loss

**What to Monitor:**
- Mongoose save operations with strict mode
- Fields not saved to database
- Update operations with no effect

**Detection Code:**
```javascript
// Before save
const beforeSave = doc.toObject();
await doc.save();
const afterSave = await Model.findById(doc._id).lean();

// Compare fields
const lostFields = Object.keys(beforeSave).filter(key => {
  return !afterSave.hasOwnProperty(key) && 
         !['_id', '__v', 'createdAt', 'updatedAt'].includes(key);
});

if (lostFields.length > 0) {
  console.error('SILENT DATA LOSS:', {
    model: 'Student',
    documentId: doc._id,
    lostFields: lostFields
  });
}
```

**Alert Threshold:**
- Any silent data loss → Critical alert
- > 1 lost field per day → Investigate schema

### 8. Real-time Event Delivery Failures

**What to Monitor:**
- Events emitted but not received
- Socket disconnections during event emission
- Room membership changes

**Detection Code:**
```javascript
// In emitAssignmentEvent
let deliveredCount = 0;
let failedCount = 0;

for (const userId of targetUsers) {
  const room = `student:${userId}`;
  const socketsInRoom = await io.in(room).fetchSockets();
  
  if (socketsInRoom.length > 0) {
    io.to(room).emit(event, assignmentData);
    deliveredCount++;
  } else {
    failedCount++;
  }
}

if (failedCount > 0) {
  console.warn('EVENT DELIVERY FAILURE:', {
    event: event,
    deliveredCount: deliveredCount,
    failedCount: failedCount,
    targetUsers: targetUsers
  });
}
```

**Alert Threshold:**
- > 5 delivery failures per hour → Check socket connections
- Any critical event (assignment:created) not delivered → Alert immediately

---

## Monitoring Dashboard Queries

### 1. Schema Drift Rate
```javascript
// Count schema drift events in last hour
db.activitylogs.countDocuments({
  action: 'schema_drift',
  createdAt: { $gte: new Date(Date.now() - 3600000) }
});
```

### 2. Permission Fallback Rate
```javascript
// Count permission fallbacks in last hour
// (Check logs for "PERMISSION FALLBACK" messages)
```

### 3. Token Expiration Rate
```javascript
// Count token expiration events
db.activitylogs.countDocuments({
  action: 'token_expired',
  createdAt: { $gte: new Date(Date.now() - 3600000) }
});
```

### 4. Validation Error Rate
```javascript
// Count validation errors
db.activitylogs.countDocuments({
  action: 'validation_error',
  createdAt: { $gte: new Date(Date.now() - 3600000) }
});
```

### 5. Socket Connection Health
```javascript
// Check socket room membership
// Use /api/debug/socket-rooms endpoint
```

---

## Alert Rules

### Critical Alerts (Immediate Action)
1. **Silent Data Loss**: Any field lost during save
2. **Schema Drift**: Unknown fields in production
3. **Permission Bypass**: Permission check failure with valid token
4. **Event Delivery Failure**: Critical event (assignment:created) not delivered

### Warning Alerts (Investigate)
1. **High Token Expiration Rate**: > 20/hour
2. **High Permission Fallback Rate**: > 10/hour
3. **High Validation Error Rate**: > 10/hour
4. **Socket Room Empty**: > 3 events/hour

### Info Alerts (Monitor)
1. **Field Mapping Warnings**: > 5/hour
2. **API Contract Drift**: Repeated validation errors
3. **Socket Reconnections**: > 10/hour

---

## Detection Script

```javascript
// backend/scripts/detectHiddenFailures.js
const mongoose = require('mongoose');

async function detectHiddenFailures() {
  const issues = [];
  
  // Check for schema drift
  const driftEvents = await ActivityLog.countDocuments({
    action: 'schema_drift',
    createdAt: { $gte: new Date(Date.now() - 3600000) }
  });
  
  if (driftEvents > 5) {
    issues.push({
      type: 'schema_drift',
      severity: 'high',
      count: driftEvents,
      message: `${driftEvents} schema drift events in last hour`
    });
  }
  
  // Check for permission fallbacks
  // (Would need to parse logs or add to ActivityLog)
  
  // Check for token expirations
  const tokenExpirations = await ActivityLog.countDocuments({
    action: 'token_expired',
    createdAt: { $gte: new Date(Date.now() - 3600000) }
  });
  
  if (tokenExpirations > 20) {
    issues.push({
      type: 'token_expiration',
      severity: 'medium',
      count: tokenExpirations,
      message: `${tokenExpirations} token expirations in last hour`
    });
  }
  
  return issues;
}

// Run every hour
setInterval(async () => {
  const issues = await detectHiddenFailures();
  if (issues.length > 0) {
    console.error('🚨 HIDDEN FAILURES DETECTED:', issues);
    // Send alert (email, Slack, etc.)
  }
}, 3600000);
```

---

*Last Updated: [Current Date]*  
*Version: 1.0*
