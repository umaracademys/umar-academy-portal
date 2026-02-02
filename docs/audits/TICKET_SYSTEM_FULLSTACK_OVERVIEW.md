# 🎫 Ticket System - Full Stack Overview

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Ticket Types & Status Flow](#ticket-types--status-flow)
3. [Frontend Components](#frontend-components)
4. [Backend API Endpoints](#backend-api-endpoints)
5. [Data Flow](#data-flow)
6. [Database Schema](#database-schema)
7. [Real-time Updates](#real-time-updates)

---

## 🏗️ System Architecture

### **Frontend (React/TypeScript)**
- **Context**: `BackendDataContext.tsx` - Manages ticket state, API calls, caching
- **Components**: Ticket creation, review, submission UI
- **State Management**: React hooks + Context API + Local cache

### **Backend (Node.js/Express/MongoDB)**
- **Database**: MongoDB with Mongoose schemas
- **Real-time**: Socket.IO for live updates
- **Authentication**: JWT tokens
- **Permissions**: Role-based access control

---

## 🎯 Ticket Types & Status Flow

### **Ticket Types**
1. **Sabq** - Initial recitation review (Admin creates, Admin reviews)
2. **Sabqi** - First review phase (Teacher marks mistakes)
3. **Manzil** - Final review phase (Teacher confirms completion)

### **Status Workflow**
```
┌─────────┐
│ pending │  ← Created by Admin/Teacher
└────┬────┘
     │
     ▼
┌──────────────┐
│ in_progress  │  ← Teacher starts review
└────┬─────────┘
     │
     ▼
┌──────────────┐
│  submitted   │  ← Teacher submits with mistakes
└────┬─────────┘
     │
     ├───► ┌──────────────┐
     │     │  reassigned  │  ← Admin reassigns to different teacher
     │     └──────────────┘
     │
     ▼
┌──────────────┐
│   approved   │  ← Admin approves
└────┬─────────┘
     │
     ▼
┌──────────────────────┐
│ sent_to_assignment   │  ← Converted to Assignment
└──────────────────────┘
```

---

## 🖥️ Frontend Components

### **1. Ticket Creation**
**Component**: `TicketCreationForm.tsx`
- **Location**: Used in `AssignmentManagement.tsx`, `SuperAdminDashboard.tsx`
- **Flow**:
  1. User selects student
  2. User selects ticket type (sabq/sabqi/manzil)
  3. For sabqi/manzil: Select teacher (or auto-assigned if teacher creating)
  4. Add admin comment / teacher notes
  5. Submit → `createTicket()` in `BackendDataContext`

**API Call**:
```typescript
POST /api/tickets
Body: {
  studentId, studentName, type, status: 'pending',
  assignedTeacherId, assignedTeacherName,
  adminComment, teacherNotes,
  createdBy, createdByName
}
```

### **2. Teacher Review & Submission**
**Component**: `TeacherTicketReview.tsx`
- **Location**: `TeacherDashboard.tsx`
- **Flow**:
  1. Teacher clicks ticket → Opens Interactive Mushaf
  2. Teacher marks mistakes on Quran pages
  3. Teacher adds recitation range (start/end ayah)
  4. Teacher adds comment, mistake count, atkees, tajweed issues
  5. Submit → `submitTicket()` in `BackendDataContext`

**API Call**:
```typescript
POST /api/tickets/:id/submit
Body: {
  teacherComment, mistakes[], recitationRange,
  mistakeCount, atkees, tajweedIssues[],
  reviewNotes, recordingUrl (optional)
}
```

**Status Change**: `in_progress` → `submitted`

### **3. Admin Review & Approval**
**Component**: `AdminTicketReview.tsx`
- **Location**: `SuperAdminDashboard.tsx`, `AdminDashboard.tsx`
- **Flow**:
  1. Admin opens ticket review modal
  2. Admin views teacher's mistakes and comments
  3. Admin can edit, reassign, or approve
  4. Approve → `approveAndSendTicket()` in `BackendDataContext`

**API Call**:
```typescript
POST /api/tickets/:id/approve-send
Body: { assignmentId (optional) }
```

**Status Change**: `submitted` → `approved` → `sent_to_assignment`

### **4. Sabq Special Flow**
**Component**: `AdminSabqReview.tsx`
- **Flow**:
  1. Admin creates Sabq ticket
  2. Opens Interactive Mushaf automatically
  3. Admin marks multiple Sabq entries (different ranges)
  4. Admin submits → Creates assignment directly

**API Call**:
```typescript
POST /api/tickets/:id/submit-sabq
Body: {
  sabqEntries[], homeworkRange, adminComment
}
```

---

## 🔌 Backend API Endpoints

### **Ticket CRUD**
```
GET    /api/tickets              - List all tickets (with filters)
GET    /api/tickets/:id          - Get single ticket
POST   /api/tickets              - Create new ticket
PUT    /api/tickets/:id          - Update ticket
DELETE /api/tickets/:id          - Delete ticket
```

### **Ticket Workflow**
```
POST   /api/tickets/:id/start           - Start review (pending → in_progress)
POST   /api/tickets/:id/submit          - Submit review (in_progress → submitted)
POST   /api/tickets/:id/submit-sabq     - Submit Sabq (pending → sent_to_assignment)
POST   /api/tickets/:id/approve-send    - Approve & convert to assignment
POST   /api/tickets/:id/reassign        - Reassign to different teacher
```

### **Key Endpoint Details**

#### **POST /api/tickets** (Create)
- **Auth**: `authenticateToken`, `requirePermission('canCreateTickets')`
- **Auto-assignment**: If teacher creates, auto-assigns to that teacher
- **Validation**: Student exists, teacher has permission
- **WebSocket**: Emits `ticket:created` to student, teacher, admins

#### **POST /api/tickets/:id/submit** (Submit)
- **Auth**: `authenticateToken` (ownership validated after fetch)
- **Fix Applied**: Fetches by `_id` only (no status filters)
- **Validation**: 
  - Prevents double submission
  - Allows expired tickets (grace period)
  - Blocks only if cancelled/deleted
- **Updates**: Status, mistakes, recitation range, comments
- **WebSocket**: Emits `ticket:updated` with minimal payload

#### **POST /api/tickets/:id/approve-send** (Approve)
- **Auth**: `authenticateToken`, `requirePermission('canApproveTickets')`
- **Creates/Updates**: Assignment with ticket data
- **Updates**: Assignment classwork (sabq/sabqi/manzil entries)
- **Links**: Ticket → Assignment via `sentToAssignmentId`

---

## 🔄 Data Flow

### **1. Ticket Creation Flow**
```
Frontend (TicketCreationForm)
  ↓
BackendDataContext.createTicket()
  ↓
POST /api/tickets
  ↓
Backend: Create Ticket document
  ↓
WebSocket: Emit ticket:created
  ↓
Frontend: Update state + cache
  ↓
UI: Show new ticket in list
```

### **2. Teacher Submission Flow**
```
Frontend (TeacherTicketReview)
  ↓
Teacher marks mistakes on Mushaf
  ↓
BackendDataContext.submitTicket()
  ↓
POST /api/tickets/:id/submit
  ↓
Backend: 
  - Fetch ticket by _id (no filters)
  - Validate ownership
  - Validate business rules
  - Update ticket status + data
  ↓
WebSocket: Emit ticket:updated
  ↓
Frontend: Update state
  ↓
UI: Show submitted status
```

### **3. Admin Approval Flow**
```
Frontend (AdminTicketReview)
  ↓
Admin clicks "Approve & Send"
  ↓
BackendDataContext.approveAndSendTicket()
  ↓
POST /api/tickets/:id/approve-send
  ↓
Backend:
  - Find or create Assignment
  - Update assignment with ticket data
  - Add mistakes to assignment.mushafMistakes
  - Add classwork entries (sabq/sabqi/manzil)
  - Link ticket to assignment
  ↓
WebSocket: Emit assignment:updated
  ↓
Frontend: Refresh assignments
  ↓
UI: Show ticket as approved
```

---

## 💾 Database Schema

### **Ticket Document Structure**
```javascript
{
  _id: ObjectId,
  studentId: String,           // Required
  studentName: String,          // Required
  type: 'sabq' | 'sabqi' | 'manzil',
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'reassigned' | 'sent_to_assignment',
  
  // Admin fields
  createdBy: String,           // Admin/Teacher ID
  createdByName: String,
  adminComment: String,
  
  // Teacher assignment
  assignedTeacherId: String,
  assignedTeacherName: String,
  teacherNotes: String,
  
  // Teacher submission
  teacherComment: String,
  mistakes: [{
    id, type, page, surah, ayah,
    wordIndex, wordText, position, note
  }],
  recitationRange: {
    surahNumber, startAyahNumber, endAyahNumber,
    startAyahText, endAyahText
  },
  mistakeCount: Number | 'weak',
  atkees: Number (1-20),
  tajweedIssues: [{ type, surahName, wordText, note }],
  reviewNotes: String,
  
  // Sabq-specific
  sabqEntries: [{ recitationRange, mistakes, adminComment }],
  homeworkRange: RecitationRange,
  
  // Reassignment
  reassignedFromTeacherId: String,
  reassignedToTeacherId: String,
  reassignmentReason: String,
  previousTeacherComment: String,
  previousMistakes: [],
  
  // Assignment integration
  sentToAssignmentId: String,
  sentAt: Date,
  
  // Recording
  recordingUrl: String,
  recordingFormat: String,
  recordingDuration: Number,
  
  // Timestamps
  startedAt: Date,
  submittedAt: Date,
  approvedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### **Indexes** (Performance Optimization)
```javascript
- { studentId: 1, status: 1 }
- { assignedTeacherId: 1, status: 1 }
- { type: 1, status: 1 }
- { status: 1, submittedAt: -1 }  // For pending reviews
- { studentId: 1, type: 1, status: 1, sentAt: -1 }
```

---

## 🔔 Real-time Updates (Socket.IO)

### **Events Emitted**

#### **ticket:created**
```javascript
io.to(`student:${studentId}`).emit('ticket:created', ticket);
io.to(`teacher:${teacherId}`).emit('ticket:created', ticket);
io.to('admins').emit('ticket:created', ticket);
```

#### **ticket:updated**
```javascript
// Minimal payload (50-70% smaller)
{
  id: ticket._id,
  status: 'submitted',
  submittedAt: Date,
  // ... only changed fields
}
```

#### **ticket:deleted**
```javascript
{ id: ticket._id }
```

### **Frontend Listeners**
**Location**: `BackendDataContext.tsx`
```typescript
socket.on('ticket:created', (ticket) => {
  // Add to state
  setRecitationTickets(prev => [...prev, ticket]);
});

socket.on('ticket:updated', (payload) => {
  // Update existing ticket
  setRecitationTickets(prev => 
    prev.map(t => t.id === payload.id ? { ...t, ...payload } : t)
  );
});
```

---

## 🔐 Security & Permissions

### **Permission Checks**
- `canCreateTickets` - Create new tickets
- `canReviewTickets` - Review submitted tickets
- `canApproveTickets` - Approve and send to assignment
- `canManageTeachers` - Reassign tickets

### **Ownership Validation**
- **Students**: Can only access their own tickets
- **Teachers**: Can access tickets for assigned students OR tickets assigned to them
- **Admins**: Can access everything

### **Middleware Chain**
```javascript
authenticateToken → requirePermission → validateTicketOwnership → Route Handler
```

---

## 📊 State Management (Frontend)

### **BackendDataContext**
```typescript
// State
const [recitationTickets, setRecitationTickets] = useState<Ticket[]>([]);

// Functions
createTicket(ticket) → POST /api/tickets
startTicket(id) → POST /api/tickets/:id/start
submitTicket(id, data) → POST /api/tickets/:id/submit
approveAndSendTicket(id) → POST /api/tickets/:id/approve-send
updateRecitationTicket(id, data) → PUT /api/tickets/:id
deleteTicket(id) → DELETE /api/tickets/:id
getPendingReviewTickets() → Filters tickets with status='submitted'
```

### **Caching Strategy**
- **Cache Key**: `'tickets'`
- **Invalidation**: On create, update, delete
- **TTL**: None (manual invalidation)
- **Location**: `BackendDataContext.tsx` using `dataCache` Map

---

## 🎨 UI Components Flow

### **Teacher Dashboard**
```
TeacherDashboard
  ├─ Ticket List (pending/in_progress)
  ├─ Click Ticket → TeacherTicketReview
  │   ├─ Interactive Mushaf
  │   ├─ Mistake Marking
  │   ├─ Submit Button
  │   └─ submitTicket() → Status: submitted
  └─ Submitted Tickets (read-only)
```

### **Admin Dashboard**
```
SuperAdminDashboard
  ├─ Review Tickets Button
  ├─ AdminTicketReview Modal
  │   ├─ Pending Tickets List (status='submitted')
  │   ├─ Click Ticket → View Details
  │   ├─ Approve & Send → approveAndSendTicket()
  │   ├─ Reassign → reassignTicket()
  │   └─ Edit → TicketCreationForm
  └─ Approved Tickets (status='sent_to_assignment')
```

---

## 🔧 Key Fixes Applied

### **1. Ticket Submit 404 Fix**
- **Problem**: Tickets not found after long sessions
- **Solution**: 
  - Removed `validateTicketOwnership` middleware from submit route
  - Fetch by `_id` only (no status/expiration filters)
  - Validate ownership AFTER fetching
  - Allow expired tickets (grace period)

### **2. ID Matching**
- **Problem**: Frontend uses `id`, backend uses `_id`
- **Solution**: 
  - Backend always returns both `_id` and `id`
  - Frontend maps `id = _id.toString()`
  - Helper function `findTicketById()` handles both formats

### **3. Real-time Updates**
- **Optimization**: Minimal WebSocket payloads (50-70% smaller)
- **Events**: `ticket:created`, `ticket:updated`, `ticket:deleted`
- **Rooms**: `student:${id}`, `teacher:${id}`, `admins`

---

## 📈 Performance Optimizations

1. **Database Indexes**: Compound indexes for common queries
2. **Lean Queries**: Use `.lean()` for read-only operations
3. **Pagination**: Ticket lists paginated (default 100, max 200)
4. **Caching**: Frontend cache for instant loads
5. **WebSocket**: Minimal payloads, targeted rooms

---

## 🔄 Complete Workflow Example

### **Sabqi Ticket Lifecycle**

1. **Admin Creates Ticket**
   ```
   Frontend: TicketCreationForm
   → POST /api/tickets { type: 'sabqi', studentId, assignedTeacherId }
   → Backend: Create Ticket { status: 'pending' }
   → WebSocket: ticket:created → Teacher receives notification
   ```

2. **Teacher Starts Review**
   ```
   Frontend: TeacherDashboard → Click ticket
   → POST /api/tickets/:id/start
   → Backend: Update { status: 'in_progress', startedAt: now }
   → WebSocket: ticket:updated
   ```

3. **Teacher Marks Mistakes**
   ```
   Frontend: TeacherTicketReview → Interactive Mushaf
   → Teacher clicks on Quran page
   → Add mistake to state
   → Multiple mistakes collected
   ```

4. **Teacher Submits**
   ```
   Frontend: Submit button
   → POST /api/tickets/:id/submit {
     teacherComment, mistakes[], recitationRange,
     mistakeCount, atkees, tajweedIssues
   }
   → Backend: 
     - Fetch by _id (no filters)
     - Validate ownership
     - Update { status: 'submitted', submittedAt: now }
   → WebSocket: ticket:updated → Admin receives notification
   ```

5. **Admin Reviews**
   ```
   Frontend: AdminTicketReview → Click ticket
   → GET /api/tickets/:id
   → Display mistakes, comments, recitation range
   ```

6. **Admin Approves**
   ```
   Frontend: "Approve & Send" button
   → POST /api/tickets/:id/approve-send
   → Backend:
     - Find or create Assignment
     - Add ticket data to assignment.classwork.sabqi[]
     - Update ticket { status: 'sent_to_assignment', sentToAssignmentId }
   → WebSocket: assignment:updated
   → Frontend: Ticket removed from pending list
   ```

---

## 🎯 Key Features

1. **Interactive Mushaf Integration** - Mark mistakes directly on Quran pages
2. **Multiple Sabq Entries** - Admin can mark multiple ranges in one ticket
3. **Reassignment** - Admin can reassign tickets to different teachers
4. **Assignment Integration** - Tickets automatically create/update assignments
5. **Real-time Updates** - Socket.IO for live notifications
6. **Mistake Tracking** - Detailed mistake types, positions, word text
7. **Tajweed Analysis** - Track tajweed-specific issues
8. **Recording Support** - Optional audio recordings per ticket

---

## 📝 Notes

- **Ticket IDs**: Always use `_id` for database queries, map to `id` for frontend
- **Status Transitions**: Enforced in backend, validated before updates
- **Data Integrity**: Tickets never deleted on expiration, only on explicit delete
- **Grace Period**: Expired tickets can still be submitted (long session support)
- **Cache Invalidation**: Always invalidate on mutations (create/update/delete)
