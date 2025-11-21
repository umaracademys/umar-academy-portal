# 🎫 Ticket & Assignment System - Complete Guide

## 📋 Overview

Your portal uses a **ticket-based workflow** to manage the recitation review process from initial review to final assignment creation. This system replaces the previous WhatsApp-based workflow with a structured digital process.

---

## 🔄 Complete Workflow

### **Step-by-Step Flow:**

```
1. Admin creates ticket → Assigns to Teacher for Sabq/Sabqi/Manzil
   ↓
2. Teacher receives ticket → Opens Mushaf → Marks mistakes → Adds comment → Submits
   ↓
3. Admin reviews ticket → Views mistakes → Approves & Sends to Assignment
   ↓
4. Ticket data converted to Assignment → Student sees on their dashboard
   ↓
5. Student completes homework → Submits → Gets feedback
```

---

## 🎫 **TICKET SYSTEM**

### **What is a Ticket?**

A ticket is a **work item** assigned to a teacher to review a student's recitation. Each ticket represents one phase of the recitation review process.

### **Ticket Types:**

1. **Sabq** 📖
   - First review of new material
   - Student recites new verses
   - Teacher marks mistakes

2. **Sabqi** 📚
   - Review of previously learned material
   - Student recites from memory
   - Teacher marks mistakes

3. **Manzil** 📿
   - Review of larger portions (multiple Juz)
   - Comprehensive review
   - Teacher marks mistakes

### **Ticket Statuses:**

| Status | Description | Who Can See |
|--------|-------------|-------------|
| `pending` | Just created, waiting for teacher | Teacher, Admin |
| `in_progress` | Teacher has started working | Teacher, Admin |
| `submitted` | Teacher submitted for review | Admin |
| `approved` | Admin approved (legacy) | Admin |
| `reassigned` | Sent back to another teacher | Teacher, Admin |
| `sent_to_assignment` | Converted to assignment | Admin, Student |

### **Ticket Data Structure:**

```typescript
{
  id: string;
  studentId: string;
  studentName: string;
  type: 'sabq' | 'sabqi' | 'manzil';
  status: TicketStatus;
  
  // Admin fields
  createdBy: string;           // Admin ID
  createdByName: string;        // Admin name
  adminComment?: string;        // Admin's notes
  
  // Teacher assignment
  assignedTeacherId?: string;
  assignedTeacherName?: string;
  teacherNotes?: string;        // Admin's instructions to teacher
  
  // Teacher submission
  teacherComment?: string;      // Teacher's review notes
  mistakes?: TicketMistake[];   // Mistakes marked in Mushaf
  
  // Reassignment tracking
  reassignedFromTeacherId?: string;
  reassignedToTeacherId?: string;
  reassignmentReason?: string;
  previousTeacherComment?: string;
  previousMistakes?: TicketMistake[];
  
  // Assignment integration
  sentToAssignmentId?: string;  // Links to assignment
  sentAt?: Date;
  
  // Recording (if enabled)
  recordingUrl?: string;
  recordingFormat?: string;
  recordingDuration?: number;
  
  // Timestamps
  startedAt?: Date;
  submittedAt?: Date;
  approvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### **Mistake Structure:**

```typescript
{
  id: string;
  type: 'madd' | 'holding' | 'memory' | 'ikhfa' | 'tech' | 'other' | ...;
  page: number;              // Mushaf page number
  surah: number;             // Surah number
  ayah: number;              // Ayah number
  wordIndex?: number;        // Word position in ayah
  position?: { x: number; y: number };  // Click position
  note?: string;             // Additional notes
  audioUrl?: string;         // Audio explanation
  timestamp?: Date;
}
```

---

## 📝 **ASSIGNMENT SYSTEM**

### **What is an Assignment?**

An assignment is the **finalized output** that students see on their dashboard. It contains:
- Classwork (Sabq/Sabqi/Manzil entries)
- Homework instructions
- Mistakes from tickets
- Feedback and grades

### **Assignment Structure:**

```typescript
{
  id: string;
  studentId: string;
  studentName: string;
  assignedBy: string;        // Admin/Teacher ID
  assignedByName: string;
  assignedByRole: 'admin' | 'super_admin' | 'teacher';
  
  // Classwork - Multiple entries per type
  classwork: {
    sabq: ClassworkPhase[];      // Array of sabq entries
    sabqi: ClassworkPhase[];      // Array of sabqi entries
    manzil: ClassworkPhase[];     // Array of manzil entries
  };
  
  // Homework
  homework: {
    enabled: boolean;
    content: string;              // Homework instructions
    link?: string;                // Optional link
    submission?: {
      submitted: boolean;
      submittedAt?: Date;
      content?: string;           // Student's submission
      audioUrl?: string;          // Student's recording
      feedback?: string;          // Teacher feedback
      grade?: number;
      status: 'submitted' | 'graded' | 'returned';
    };
  };
  
  // Comment
  comment?: string;
  
  // Mistakes from tickets
  mushafMistakes?: AssignmentMistake[];
  
  // Status
  status: 'active' | 'completed' | 'archived';
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### **Classwork Phase:**

```typescript
{
  type: 'sabq' | 'sabqi' | 'manzil';
  assignmentRange: string;        // e.g., "Surah Al-Fatiha, Ayah 1-7"
  details?: string;               // Additional notes
  fromPage?: number;
  toPage?: number;
  fromAyah?: number;
  toAyah?: number;
  surahNumber?: number;
  surahName?: string;
}
```

---

## 👥 **User Roles & Actions**

### **1. Admin/Super Admin** 👨‍💼

**Can:**
- ✅ Create tickets for students
- ✅ Assign tickets to teachers
- ✅ View all tickets (pending, submitted, etc.)
- ✅ Review teacher submissions
- ✅ Approve tickets and send to assignments
- ✅ Reassign tickets to different teachers
- ✅ View Mushaf with mistakes
- ✅ Add homework to assignments
- ✅ Grade student submissions

**Components:**
- `AdminTicketReview.tsx` - Review submitted tickets
- `TicketCreationForm.tsx` - Create new tickets
- `AssignmentManagement.tsx` - Manage assignments

**Key Actions:**
```typescript
// Approve ticket and convert to assignment
approveAndSendTicket(ticketId, adminComment)

// Reassign ticket
reassignTicket(ticketId, newTeacherId, reason)

// Create new ticket
createTicket({
  studentId,
  type: 'sabq' | 'sabqi' | 'manzil',
  assignedTeacherId,
  teacherNotes
})
```

### **2. Teacher** 👨‍🏫

**Can:**
- ✅ View assigned tickets
- ✅ Open Mushaf to mark mistakes
- ✅ Add review comments
- ✅ Submit tickets for admin review
- ✅ See reassignment reasons (if ticket was sent back)

**Components:**
- `TeacherTicketReview.tsx` - Review and mark mistakes
- `TeacherDashboard.tsx` - View ticket list

**Key Actions:**
```typescript
// Submit ticket
submitTicket(ticketId, {
  teacherComment: string,
  mistakes: MushafMistake[]
})
```

**Workflow:**
1. Teacher sees ticket in "My Tickets"
2. Clicks ticket → Opens Mushaf view
3. Clicks words in Mushaf → Marks mistakes
4. Adds comment about recitation
5. Submits → Status changes to "submitted"
6. Admin receives notification

### **3. Student** 🎓

**Can:**
- ✅ View finalized assignments
- ✅ See classwork (Sabq/Sabqi/Manzil entries)
- ✅ See mistakes marked by teachers
- ✅ View homework instructions
- ✅ Submit homework
- ✅ View feedback and grades

**Components:**
- `StudentDashboard.tsx` - View assignments
- `StudentAssignments.tsx` - Assignment list
- `StudentAssignmentHistory.tsx` - Historical assignments

**What Students See:**
- Assignment title and description
- Classwork sections (Sabq, Sabqi, Manzil)
- Mistakes with Mushaf view
- Homework instructions
- Submission status
- Grades and feedback

---

## 🔗 **Ticket → Assignment Conversion**

### **How Tickets Become Assignments:**

When an admin **approves and sends** a ticket:

1. **Ticket Status Changes:**
   - `status` → `sent_to_assignment`
   - `sentToAssignmentId` → Assignment ID
   - `sentAt` → Current timestamp

2. **Assignment Created:**
   - New assignment document created
   - Student ID linked
   - Classwork phase added based on ticket type:
     - Sabq ticket → `classwork.sabq[]`
     - Sabqi ticket → `classwork.sabqi[]`
     - Manzil ticket → `classwork.manzil[]`

3. **Mistakes Transferred:**
   - All mistakes from ticket → `assignment.mushafMistakes[]`
   - Mistakes include workflow step (sabq/sabqi/manzil)

4. **Student Notification:**
   - Assignment appears on student dashboard
   - Status: `active`

### **API Endpoint:**

```javascript
POST /api/tickets/:id/approve-send
```

**Request Body:**
```json
{
  "adminComment": "Optional admin comment"
}
```

**Response:**
```json
{
  "ticket": { /* Updated ticket */ },
  "assignment": { /* New assignment */ }
}
```

---

## 📊 **Data Flow Diagram**

```
┌─────────────┐
│   Admin     │
│ Creates     │
│  Ticket     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Ticket: pending │
│ Type: sabq      │
│ Teacher: A      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Teacher Opens   │
│ Mushaf & Marks  │
│   Mistakes      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Ticket:         │
│ submitted       │
│ Mistakes: [...] │
│ Comment: "..."  │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Admin Reviews   │
│ & Approves      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Ticket:         │
│ sent_to_        │
│ assignment      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Assignment      │
│ Created         │
│ classwork: {    │
│   sabq: [...]   │
│ }               │
│ mistakes: [...] │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Student Sees    │
│ Assignment      │
│ on Dashboard    │
└─────────────────┘
```

---

## 🎯 **Key Features**

### **1. Mistake Marking in Mushaf**
- Teachers click words in the Mushaf to mark mistakes
- Each mistake has:
  - Type (madd, holding, memory, etc.)
  - Location (page, surah, ayah, word)
  - Optional note
  - Optional audio explanation

### **2. Reassignment System**
- Admin can reassign tickets to different teachers
- Previous teacher's work is preserved
- New teacher sees:
  - Previous comment
  - Previous mistakes
  - Reassignment reason

### **3. Multiple Classwork Entries**
- One assignment can have multiple Sabq/Sabqi/Manzil entries
- Each entry represents one ticket that was approved
- Students see all entries in one assignment

### **4. Homework System**
- Admin adds homework when creating/editing assignments
- Students can submit:
  - Text content
  - Audio recording
  - Links (Google Drive, etc.)
  - Attachments
- Teachers/Admins can grade and provide feedback

### **5. Personal Mushaf**
- All mistakes are tracked per student
- Historical mistakes shown in Mushaf view
- Mistakes linked to tickets and assignments

---

## 🔍 **Database Schema**

### **Ticket Collection:**
```javascript
{
  studentId: String (indexed),
  studentName: String,
  type: 'sabq' | 'sabqi' | 'manzil',
  status: 'pending' | 'in_progress' | 'submitted' | ...,
  createdBy: String,
  assignedTeacherId: String (indexed),
  teacherComment: String,
  mistakes: [TicketMistake],
  sentToAssignmentId: String,
  // ... timestamps
}
```

### **Assignment Collection:**
```javascript
{
  studentId: String (indexed),
  studentName: String,
  classwork: {
    sabq: [ClassworkPhase],
    sabqi: [ClassworkPhase],
    manzil: [ClassworkPhase]
  },
  homework: {
    enabled: Boolean,
    content: String,
    submission: { ... }
  },
  mushafMistakes: [AssignmentMistake],
  status: 'active' | 'completed' | 'archived',
  // ... timestamps
}
```

### **Student Personal Mushaf Collection:**
```javascript
{
  studentId: String (indexed),
  studentName: String,
  mistakes: [{
    type: String,
    page: Number,
    surah: Number,
    ayah: Number,
    ticketId: String,        // Reference to ticket
    workflowStep: String,    // sabq/sabqi/manzil
    markedBy: String,       // Teacher ID
    timestamp: Date
  }]
}
```

---

## 📱 **UI Components**

### **Admin Components:**

1. **AdminTicketReview.tsx**
   - List of submitted tickets
   - Mushaf view with mistakes
   - Approve & Send button
   - Reassign button
   - Recording (if enabled)

2. **TicketCreationForm.tsx**
   - Select student
   - Select ticket type
   - Assign to teacher
   - Add notes

3. **AssignmentManagement.tsx**
   - View all assignments
   - Create assignments manually
   - Edit assignments
   - Add homework

### **Teacher Components:**

1. **TeacherTicketReview.tsx**
   - Mushaf view
   - Mistake marking interface
   - Comment textarea
   - Submit button
   - Mistake list sidebar

2. **TeacherDashboard.tsx**
   - Ticket list (pending, in_progress)
   - Ticket status badges
   - Quick actions

### **Student Components:**

1. **StudentDashboard.tsx**
   - Assignment cards
   - Status indicators
   - Classwork summary
   - Homework submission

2. **StudentAssignments.tsx**
   - Detailed assignment view
   - Mushaf with mistakes
   - Homework instructions
   - Submission form

---

## 🔄 **Common Workflows**

### **Workflow 1: New Sabq Review**

1. Admin creates Sabq ticket → Assigns to Teacher A
2. Teacher A receives ticket → Opens Mushaf
3. Teacher marks mistakes → Adds comment → Submits
4. Admin reviews → Approves → Assignment created
5. Student sees assignment with Sabq classwork

### **Workflow 2: Reassignment**

1. Teacher A submits ticket
2. Admin reviews → Not satisfied → Reassigns to Teacher B
3. Teacher B sees:
   - Previous teacher's comment
   - Previous mistakes
   - Reassignment reason
4. Teacher B reviews → Marks additional mistakes → Submits
5. Admin approves → Assignment created

### **Workflow 3: Multiple Tickets → One Assignment**

1. Admin approves Sabq ticket → Assignment created
2. Admin approves Sabqi ticket → Added to same assignment
3. Admin approves Manzil ticket → Added to same assignment
4. Student sees one assignment with all three types

### **Workflow 4: Homework Submission**

1. Admin adds homework to assignment
2. Student sees homework instructions
3. Student submits:
   - Text response
   - Audio recording
   - Link/attachment
4. Teacher/Admin grades → Provides feedback
5. Student sees grade and feedback

---

## 🛠️ **API Endpoints**

### **Tickets:**

- `GET /api/tickets` - Get all tickets (with filters)
- `GET /api/tickets/:id` - Get single ticket
- `POST /api/tickets` - Create new ticket
- `PUT /api/tickets/:id` - Update ticket
- `POST /api/tickets/:id/submit` - Submit ticket (teacher)
- `POST /api/tickets/:id/approve-send` - Approve & convert to assignment
- `POST /api/tickets/:id/reassign` - Reassign ticket

### **Assignments:**

- `GET /api/assignments` - Get all assignments
- `GET /api/assignments/:id` - Get single assignment
- `POST /api/assignments` - Create assignment
- `PUT /api/assignments/:id` - Update assignment
- `POST /api/assignments/:id/submit-homework` - Submit homework (student)
- `PUT /api/assignments/:id/grade` - Grade homework

---

## 📈 **Statistics & Tracking**

### **Ticket Metrics:**
- Total tickets created
- Tickets by status
- Tickets by type (Sabq/Sabqi/Manzil)
- Average time to complete
- Reassignment rate

### **Assignment Metrics:**
- Total assignments
- Assignments by status
- Homework submission rate
- Average grade
- Completion rate

---

## 🎨 **Visual Indicators**

### **Ticket Status Badges:**
- 🟡 **Pending** - Yellow
- 🔵 **In Progress** - Blue
- 🟢 **Submitted** - Green
- ✅ **Approved** - Green checkmark
- 🔄 **Reassigned** - Orange
- 📝 **Sent to Assignment** - Purple

### **Assignment Status:**
- 🟢 **Active** - Green (student can work on it)
- ✅ **Completed** - Green checkmark (student finished)
- 📦 **Archived** - Gray (old assignments)

---

## 💡 **Best Practices**

1. **Ticket Creation:**
   - Always assign to appropriate teacher
   - Add clear notes/instructions
   - Select correct ticket type

2. **Mistake Marking:**
   - Be specific with mistake types
   - Add notes for clarity
   - Mark all mistakes accurately

3. **Review Process:**
   - Review mistakes carefully
   - Check teacher comments
   - Use reassignment if needed

4. **Assignment Management:**
   - Add clear homework instructions
   - Provide timely feedback
   - Grade consistently

---

## 🔐 **Permissions**

- **Admin/Super Admin:** Full access to all tickets and assignments
- **Teacher:** Can only see assigned tickets, cannot create assignments
- **Student:** Can only see own assignments, cannot see tickets

---

## 📝 **Notes**

- Tickets are **internal workflow items** (teachers/admins only)
- Assignments are **student-facing** (what students see)
- One ticket = One classwork entry
- Multiple tickets can be added to one assignment
- Mistakes are preserved across tickets and assignments
- Personal Mushaf tracks all mistakes for each student

---

This system provides a complete digital workflow for managing recitation reviews from initial ticket creation to final assignment completion! 🎉

