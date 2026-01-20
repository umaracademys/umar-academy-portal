# Notification System Usage Examples

## Overview

The unified `Notification` model replaces `AdminNotification` and `TeacherNotification` with a single, write-optimized schema that includes:

- **Deduplication**: Unique index prevents duplicates
- **Entity Normalization**: Uses `entityType` + `entityId` instead of `assignmentId`, `ticketId`, etc.
- **Upsert Pattern**: All writes use `updateOne` with `upsert: true` for race-condition safety
- **TTL Cleanup**: Auto-expires old notifications
- **Index-Optimized Queries**: All queries use indexes

## ⚠️ CRITICAL RULES

1. **NEVER use `Notification.create()`** - Always use `Notification.createOrUpdate()` or helper functions
2. **Always use `entityType` + `entityId`** - Never use `assignmentId`, `ticketId`, `recitationReviewId`, etc.
3. **All notifications must be created at write time** - No dynamic generation during GET requests
4. **Use helper functions** - They handle ID normalization and deduplication automatically

---

## Example 1: Ticket Created → Admin Notification

### ❌ OLD WAY (Don't use)
```javascript
// OLD: AdminNotification with inconsistent fields
const adminNotification = new AdminNotification({
  type: 'recitation_review_pending',
  title: 'New Ticket Submitted',
  message: `${ticket.studentName} submitted a ticket`,
  recitationReviewId: ticket._id.toString(), // ❌ Inconsistent field name
  studentId: ticket.studentId, // ❌ String ID
  priority: 'high',
  read: false
});
await adminNotification.save(); // ❌ Can create duplicates
```

### ✅ NEW WAY (Use this)
```javascript
const { notifyTicketCreated } = require('../utils/notificationHelpers');

// Option 1: Notify all admins (most common)
await notifyTicketCreated(ticket);

// Option 2: Notify specific admin
await notifyTicketCreated(ticket, adminId);

// Option 3: Direct usage (if helper doesn't exist)
await Notification.createOrUpdate({
  recipientId: adminId, // ObjectId
  recipientRole: 'admin',
  type: 'ticket_created',
  entityType: 'ticket', // ✅ Normalized
  entityId: ticket._id, // ✅ ObjectId
  title: 'New Ticket Submitted',
  message: `${ticket.studentName} submitted a ticket`,
  actionUrl: `/dashboard?ticketId=${ticket._id}`,
  priority: 'high',
  source: 'api',
  metadata: {
    studentId: ticket.studentId,
    ticketType: ticket.type
  }
});
```

**Key Points:**
- Uses `entityType: 'ticket'` and `entityId` (normalized)
- Automatically deduplicates (same ticket won't create duplicate notifications)
- Safe for retries/race conditions (upsert pattern)
- Includes `actionUrl` for deep linking

---

## Example 2: Weekly Evaluation Approved → Teacher Notification

### ❌ OLD WAY (Don't use)
```javascript
// OLD: Separate AdminNotification and TeacherNotification
const adminNotification = new AdminNotification({
  type: 'weekly_evaluation_approved',
  title: 'Weekly Evaluation Approved',
  message: `${reviewedByName} approved evaluation`,
  weeklyEvaluationId: evaluation.id, // ❌ Inconsistent field
  studentId: evaluation.studentId,
  priority: 'high',
  read: false
});
await adminNotification.save();

const teacherNotification = new TeacherNotification({
  teacherId: teacherId, // ❌ String ID
  type: 'weekly_evaluation_approved',
  title: 'Weekly Evaluation Response Shared',
  message: `${reviewedByName} shared feedback`,
  weeklyEvaluationId: evaluation.id, // ❌ Inconsistent field
  read: false,
  priority: 'high'
});
await teacherNotification.save();
```

### ✅ NEW WAY (Use this)
```javascript
const { notifyWeeklyEvaluationApproved } = require('../utils/notificationHelpers');

// Notifies both admin and teacher automatically
await notifyWeeklyEvaluationApproved(
  evaluation,
  reviewedByName,
  adminFeedback, // optional
  createdBy // optional
);
```

**Key Points:**
- Single function call handles both admin and teacher notifications
- Uses `entityType: 'weekly_evaluation'` and `entityId` (normalized)
- Automatically finds teacher from evaluation.teacherId
- Handles ID normalization (String → ObjectId)

---

## Example 3: Assignment Submitted → Admin Notification

### ❌ OLD WAY (Don't use)
```javascript
const adminNotification = new AdminNotification({
  type: 'assignment_submitted',
  title: 'New Assignment Created',
  message: `${assignedByName} created assignment`,
  assignmentId: assignment._id.toString(), // ❌ Inconsistent field
  studentId: assignment.studentId,
  priority: 'medium',
  read: false
});
await adminNotification.save();
```

### ✅ NEW WAY (Use this)
```javascript
const { notifyAssignmentSubmitted } = require('../utils/notificationHelpers');

// Notifies all admins
await notifyAssignmentSubmitted(assignment, createdBy);
```

---

## Example 4: Student Enrolled → Admin Notification

### ❌ OLD WAY (Don't use)
```javascript
const adminNotification = new AdminNotification({
  type: 'student_enrolled',
  title: 'New Student Enrolled',
  message: `${student.fullName} has been enrolled`,
  studentId: student._id.toString(), // ❌ String ID
  priority: 'medium',
  read: false
});
await adminNotification.save();
```

### ✅ NEW WAY (Use this)
```javascript
const { notifyStudentEnrolled } = require('../utils/notificationHelpers');

// Notifies all admins
await notifyStudentEnrolled(student, teacherIds, createdBy);
```

---

## Example 5: Direct Usage (When Helper Doesn't Exist)

If a helper function doesn't exist for your use case, use `Notification.createOrUpdate()` directly:

```javascript
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// Convert string IDs to ObjectId if needed
const recipientId = mongoose.Types.ObjectId.isValid(recipientIdString)
  ? new mongoose.Types.ObjectId(recipientIdString)
  : recipientIdString;

const entityId = mongoose.Types.ObjectId.isValid(entityIdString)
  ? new mongoose.Types.ObjectId(entityIdString)
  : entityIdString;

// Create or update notification (deduplication automatic)
await Notification.createOrUpdate({
  recipientId, // ObjectId
  recipientRole: 'admin', // or 'teacher' or 'student'
  type: 'ticket_created', // Must match enum
  entityType: 'ticket', // Must match enum
  entityId, // ObjectId
  title: 'Notification Title',
  message: 'Notification message',
  actionUrl: '/dashboard?ticketId=...', // Optional deep link
  priority: 'high', // 'low' | 'normal' | 'high'
  createdBy: userId, // Optional: who triggered this
  source: 'api', // 'api' | 'system' | 'manual'
  expiresAt: null, // Optional: Date for TTL cleanup (null = never expires)
  metadata: {
    // Optional: additional data
    customField: 'value'
  }
});
```

**Key Points:**
- Always use `createOrUpdate()` (never `create()`)
- Deduplication keys: `recipientId`, `type`, `entityType`, `entityId`
- If notification with same keys exists, it updates; otherwise creates new
- Safe for concurrent writes (race-condition safe)

---

## Example 6: Notify Multiple Recipients

```javascript
const Notification = require('../models/Notification');

// Notify multiple teachers
const teacherIds = [teacherId1, teacherId2, teacherId3];

await Notification.createForRecipients(
  teacherIds,
  'teacher',
  {
    type: 'message_received',
    entityType: 'conversation',
    entityId: conversationId,
    title: 'New Message',
    message: 'You have a new message',
    priority: 'normal'
  }
);
```

---

## Example 7: Notify All Admins

```javascript
const Notification = require('../models/Notification');

// Notify all admins (including superadmins)
await Notification.createForAllAdmins({
  type: 'system',
  entityType: 'student',
  entityId: studentId,
  title: 'System Alert',
  message: 'System maintenance scheduled',
  priority: 'high',
  source: 'system'
});
```

---

## Deduplication Explained

The unique index `{ recipientId: 1, type: 1, entityType: 1, entityId: 1 }` ensures:

1. **Same event, same recipient** → Updates existing notification (doesn't create duplicate)
2. **Retry-safe** → If endpoint called multiple times, only one notification created
3. **Race-condition safe** → Concurrent writes result in single notification

**Example:**
```javascript
// Call 1: Creates notification
await Notification.createOrUpdate({ recipientId, type: 'ticket_created', entityType: 'ticket', entityId, ... });

// Call 2 (retry/race condition): Updates same notification (doesn't create duplicate)
await Notification.createOrUpdate({ recipientId, type: 'ticket_created', entityType: 'ticket', entityId, ... });
```

---

## Index Purpose

### Query Performance Indexes

```javascript
// Index 1: { recipientId: 1, read: 1, createdAt: -1 }
// Used for: "Get unread notifications for user, sorted by newest"
const unreadNotifications = await Notification.find({
  recipientId: userId,
  read: false
}).sort({ createdAt: -1 }).limit(50);

// Index 2: { recipientId: 1, createdAt: -1 }
// Used for: "Get all notifications for user, sorted by newest"
const allNotifications = await Notification.find({
  recipientId: userId
}).sort({ createdAt: -1 }).limit(100);
```

### Deduplication Index

```javascript
// Index 3: { recipientId: 1, type: 1, entityType: 1, entityId: 1 } (UNIQUE)
// Prevents duplicate notifications
// Enables upsert operations
```

### TTL Index

```javascript
// Index 4: { expiresAt: 1 } with expireAfterSeconds: 0
// Auto-deletes notifications when expiresAt is reached
// Set expiresAt to null for notifications that never expire
```

---

## Entity Type Mapping

| Old Field | New entityType | Notes |
|-----------|----------------|-------|
| `recitationReviewId` | `'recitation_review'` | For recitation reviews |
| `assignmentId` | `'assignment'` | For assignments |
| `weeklyEvaluationId` | `'weekly_evaluation'` | For weekly evaluations |
| `ticketId` (implicit) | `'ticket'` | For tickets |
| `conversationId` | `'conversation'` | For conversations |
| `messageId` | `'message'` | For messages |
| `studentId` | `'student'` | For student-related notifications |

**Always use:**
```javascript
entityType: 'ticket', // ✅ Normalized
entityId: ticket._id  // ✅ ObjectId
```

**Never use:**
```javascript
ticketId: ticket._id.toString() // ❌ Old way
assignmentId: assignment._id.toString() // ❌ Old way
```

---

## Priority Mapping

| Old Priority | New Priority |
|--------------|--------------|
| `'low'` | `'low'` |
| `'medium'` | `'normal'` |
| `'high'` | `'high'` |

---

## Migration Notes

⚠️ **DO NOT DELETE** existing `AdminNotification` and `TeacherNotification` models yet.

The new `Notification` model runs **alongside** the old models. Migration will happen in a future step.

For now:
1. Use new `Notification` model for **new** notification creation
2. Keep old models for **reading** existing notifications (frontend still uses them)
3. Gradually migrate notification creation points to use new model

---

## Error Handling

All notification creation should be wrapped in try-catch to prevent failures from breaking main operations:

```javascript
try {
  await notifyTicketCreated(ticket);
  console.log('✅ Notification created');
} catch (error) {
  console.error('⚠️ Error creating notification:', error);
  // Don't fail the main operation if notification creation fails
}
```

---

## Testing Deduplication

To test that deduplication works:

```javascript
// Create notification
await Notification.createOrUpdate({
  recipientId: userId,
  recipientRole: 'admin',
  type: 'ticket_created',
  entityType: 'ticket',
  entityId: ticketId,
  title: 'Test',
  message: 'Test message'
});

// Try to create duplicate (should update, not create new)
await Notification.createOrUpdate({
  recipientId: userId,
  recipientRole: 'admin',
  type: 'ticket_created',
  entityType: 'ticket',
  entityId: ticketId,
  title: 'Test Updated',
  message: 'Updated message'
});

// Verify: Should have only 1 notification
const count = await Notification.countDocuments({
  recipientId: userId,
  type: 'ticket_created',
  entityType: 'ticket',
  entityId: ticketId
});
console.log(count); // Should be 1, not 2
```

---

## Summary

✅ **DO:**
- Use `Notification.createOrUpdate()` or helper functions
- Use `entityType` + `entityId` (normalized)
- Wrap in try-catch
- Use helper functions when available

❌ **DON'T:**
- Use `Notification.create()`
- Use `assignmentId`, `ticketId`, `recitationReviewId`, etc.
- Generate notifications during GET requests
- Delete old notification models yet
