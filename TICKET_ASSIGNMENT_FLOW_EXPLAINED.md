# 🎫 Ticket & Assignment Creation Flow - Complete Technical Guide

## 📋 Overview

This document explains how tickets and assignments are created, processed, and converted in both **Backend** and **Frontend**.

---

## 🔄 **COMPLETE WORKFLOW**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ADMIN CREATES TICKET                                      │
│    Frontend: TicketCreationForm.tsx                          │
│    Backend: POST /api/tickets                                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. TICKET STATUS                                             │
│    • Sabq → sent_to_assignment (immediate)                   │
│    • Sabqi/Manzil → pending (waiting for teacher)           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. TEACHER REVIEWS TICKET                                    │
│    Frontend: TeacherTicketReview.tsx                        │
│    Backend: POST /api/tickets/:id/submit                     │
│    Status: pending → submitted                               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. ADMIN APPROVES TICKET                                     │
│    Frontend: AdminTicketReview.tsx                          │
│    Backend: POST /api/tickets/:id/approve-send              │
│    Status: submitted → sent_to_assignment                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. ASSIGNMENT CREATED/UPDATED                                │
│    Backend: Auto-creates or updates Assignment              │
│    • Adds classwork entry (sabq/sabqi/manzil)                │
│    • Transfers mistakes to assignment                       │
│    • Links ticket to assignment                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. STUDENT SEES ASSIGNMENT                                   │
│    Frontend: StudentAssignments.tsx                         │
│    Status: active                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎫 **TICKET CREATION**

### **Frontend: TicketCreationForm.tsx**

**Location:** `src/components/TicketCreationForm.tsx`

**User Flow:**
1. Admin selects student
2. Chooses ticket type: **Sabq**, **Sabqi**, or **Manzil**
3. Fills form fields based on type
4. Submits ticket

**Form Fields:**

**For Sabq:**
- `adminComment` (required) - Admin's comment/notes
- Status: Automatically set to `sent_to_assignment`
- No teacher assignment needed

**For Sabqi/Manzil:**
- `assignedTeacherId` (required) - Teacher to review
- `teacherNotes` (optional) - Admin's notes to teacher
- `adminComment` (optional) - Admin's comment
- Status: Automatically set to `pending`

**Code Flow:**
```typescript
// src/components/TicketCreationForm.tsx
const handleSubmit = async (e: React.FormEvent) => {
  const ticketData: Partial<Ticket> = {
    studentId: student.id,
    studentName: student.fullName,
    type: ticketType,
    adminComment: adminComment.trim(),
    assignedTeacherId: ticketType !== 'sabq' ? selectedTeacherId : undefined,
    assignedTeacherName: ticketType !== 'sabq' ? teacherName : undefined,
    teacherNotes: ticketType !== 'sabq' ? teacherNotes.trim() : undefined,
    status: ticketType === 'sabq' ? 'sent_to_assignment' : 'pending',
    createdBy: user.id || '',
    createdByName: user.name || user.email || 'Unknown'
  };
  
  // Call BackendDataContext function
  updatedTicket = await createTicket(ticketData);
};
```

**Context Function:**
```typescript
// src/contexts/BackendDataContext.tsx
const createTicket = async (ticket: Partial<Ticket>): Promise<Ticket> => {
  const response = await fetch(`${API_BASE}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticket)
  });
  const newTicket = await response.json();
  // Update local state
  setRecitationTickets(prev => [...prev, mappedTicket]);
  await refreshData();
  return mappedTicket;
};
```

### **Backend: POST /api/tickets**

**Location:** `backend/server.js` (line ~5792)

**Endpoint:**
```javascript
app.post('/api/tickets', async (req, res) => {
  try {
    const ticket = new Ticket(req.body);
    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Ticket Schema:**
```javascript
const ticketSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  studentName: { type: String, required: true },
  type: { type: String, enum: ['sabq', 'sabqi', 'manzil'], required: true },
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'submitted', 'approved', 'reassigned', 'sent_to_assignment'], 
    default: 'pending' 
  },
  createdBy: { type: String, required: true },
  createdByName: { type: String, required: true },
  adminComment: { type: String, default: '' },
  assignedTeacherId: { type: String },
  assignedTeacherName: { type: String },
  teacherNotes: { type: String, default: '' },
  teacherComment: { type: String, default: '' },
  mistakes: { type: [ticketMistakeSchema], default: [] },
  // ... more fields
}, { timestamps: true });
```

**What Happens:**
1. Validates ticket data
2. Creates new Ticket document in MongoDB
3. Sets default status (`pending` or `sent_to_assignment` based on type)
4. Returns created ticket

---

## 📝 **ASSIGNMENT CREATION**

### **Method 1: Direct Assignment Creation**

**Frontend: AssignmentForm.tsx**

**Location:** `src/components/AssignmentForm.tsx`

**User Flow:**
1. Admin clicks "Create Assignment" for a student
2. Fills classwork (Sabq/Sabqi/Manzil entries)
3. Optionally adds homework (legacy format)
4. Optionally marks mistakes in Mushaf
5. Adds comment
6. Submits

**Form Structure:**
```typescript
const assignmentData: Assignment = {
  studentId: student.id,
  studentName: student.fullName,
  assignedBy: user.id || '',
  assignedByName: user.name || user.email || 'Unknown',
  assignedByRole: user.role,
  classwork: {
    sabq: [...], // Array of ClassworkPhase
    sabqi: [...],
    manzil: [...]
  },
  homework: {
    enabled: boolean,
    content: string,
    link: string
  },
  comment: string,
  mushafMistakes: [...],
  status: 'active'
};

// If created from ticket
if (prefillTicket?.type === 'sabq') {
  assignmentData.ticketId = prefillTicket.id;
}

await addAssignment(assignmentData);
```

**Context Function:**
```typescript
// src/contexts/BackendDataContext.tsx
const addAssignment = async (assignment: Assignment) => {
  const response = await fetch(`${API_BASE}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assignment)
  });
  const newAssignment = await response.json();
  setAssignments(prev => [...prev, mappedAssignment]);
};
```

**Backend: POST /api/assignments**

**Location:** `backend/server.js` (line ~5315)

**Endpoint:**
```javascript
app.post('/api/assignments', async (req, res) => {
  try {
    const { ticketId, ...assignmentData } = req.body;
    
    // Ensure all classwork entries have createdAt set to current date
    const currentDate = new Date();
    if (assignmentData.classwork) {
      // Normalize createdAt for all classwork entries
      assignmentData.classwork.sabq = assignmentData.classwork.sabq.map(entry => ({
        ...entry,
        createdAt: entry.createdAt || currentDate
      }));
      // Same for sabqi and manzil
    }
    
    const assignment = new Assignment(assignmentData);
    await assignment.save();
    
    // Link ticket if provided
    if (ticketId) {
      const ticket = await Ticket.findById(ticketId);
      if (ticket && ticket.status === 'sent_to_assignment') {
        ticket.sentToAssignmentId = assignment._id.toString();
        ticket.sentAt = new Date();
        await ticket.save();
      }
    }
    
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**What Happens:**
1. Validates assignment data
2. Ensures `createdAt` dates are set correctly
3. Creates new Assignment document
4. Links ticket if `ticketId` provided
5. Returns created assignment

---

### **Method 2: Assignment from Approved Ticket**

**Frontend: AdminTicketReview.tsx**

**Location:** `src/components/AdminTicketReview.tsx`

**User Flow:**
1. Admin reviews submitted ticket
2. Clicks "Approve & Send to Assignment"
3. Backend automatically creates/updates assignment

**Code Flow:**
```typescript
// src/components/AdminTicketReview.tsx
const handleApproveAndSend = async () => {
  const result = await approveAndSendTicket(selectedTicket.id, '');
  // Backend handles assignment creation/update
};
```

**Context Function:**
```typescript
// src/contexts/BackendDataContext.tsx
const approveAndSendTicket = async (id: string, assignmentId: string) => {
  const response = await fetch(`${API_BASE}/tickets/${id}/approve-send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignmentId })
  });
  return await response.json();
};
```

**Backend: POST /api/tickets/:id/approve-send**

**Location:** `backend/server.js` (line ~5893)

**Endpoint Logic:**

```javascript
app.post('/api/tickets/:id/approve-send', async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  
  // STEP 1: Find or Create Assignment
  let assignment;
  
  if (assignmentId) {
    // Use provided assignment ID
    assignment = await Assignment.findById(assignmentId);
  } else {
    // Find most recent active assignment for student
    assignment = await Assignment.findOne({
      studentId: ticket.studentId,
      status: 'active'
    }).sort({ createdAt: -1 });
    
    // If no active assignment exists, create new one
    if (!assignment) {
      assignment = new Assignment({
        studentId: ticket.studentId,
        studentName: ticket.studentName,
        assignedBy: ticket.createdBy,
        assignedByName: ticket.createdByName,
        assignedByRole: 'admin',
        fromTicketId: ticket._id.toString(),
        classwork: { sabq: [], sabqi: [], manzil: [] },
        homework: { enabled: false, content: '', link: '' },
        status: 'active',
        createdAt: new Date() // Current date, not ticket date
      });
      await assignment.save();
    }
  }
  
  // STEP 2: Add Classwork Entry Based on Ticket Type
  const currentDate = new Date();
  
  if (ticket.type === 'sabq') {
    assignment.classwork.sabq.push({
      type: 'sabq',
      assignmentRange: ticket.adminComment || 'Sabq recitation',
      details: ticket.adminComment || '',
      createdAt: currentDate // Always current date
    });
  } else if (ticket.type === 'sabqi') {
    assignment.classwork.sabqi.push({
      type: 'sabqi',
      assignmentRange: ticket.teacherComment || ticket.adminComment,
      details: ticket.teacherComment || ticket.adminComment,
      createdAt: currentDate
    });
  } else if (ticket.type === 'manzil') {
    assignment.classwork.manzil.push({
      type: 'manzil',
      assignmentRange: ticket.teacherComment || ticket.adminComment,
      details: ticket.teacherComment || ticket.adminComment,
      createdAt: currentDate
    });
  }
  
  // STEP 3: Transfer Mistakes
  if (ticket.mistakes && ticket.mistakes.length > 0) {
    const assignmentMistakes = ticket.mistakes.map(m => ({
      ...m,
      workflowStep: ticket.type,
      markedBy: ticket.assignedTeacherId || ticket.createdBy,
      markedByName: ticket.assignedTeacherName || ticket.createdByName
    }));
    
    assignment.mushafMistakes.push(...assignmentMistakes);
    
    // Also sync to Student Personal Mushaf
    // ... (code to sync mistakes)
  }
  
  // STEP 4: Update Ticket Status
  ticket.status = 'sent_to_assignment';
  ticket.sentToAssignmentId = assignment._id.toString();
  ticket.sentAt = new Date();
  await ticket.save();
  
  // STEP 5: Save Assignment
  await assignment.save();
  
  res.json({ ticket, assignment });
});
```

**What Happens:**
1. Finds existing active assignment OR creates new one
2. Adds classwork entry based on ticket type (sabq/sabqi/manzil)
3. Transfers mistakes from ticket to assignment
4. Syncs mistakes to Student Personal Mushaf
5. Updates ticket status to `sent_to_assignment`
6. Links ticket to assignment
7. Returns both ticket and assignment

---

## 🔑 **KEY DIFFERENCES**

### **Direct Assignment Creation vs. Ticket → Assignment**

| Aspect | Direct Assignment | Ticket → Assignment |
|--------|------------------|---------------------|
| **Who Creates** | Admin directly | Admin approves ticket |
| **Workflow** | Single step | Multi-step (ticket → review → approval) |
| **Teacher Review** | Not required | Required for Sabqi/Manzil |
| **Mistakes** | Marked in form | Transferred from ticket |
| **Date Handling** | Current date | Current date (not ticket date) |
| **Classwork Source** | Manual entry | From ticket comments |

---

## 📊 **DATA STRUCTURES**

### **Ticket Schema**
```javascript
{
  studentId: String,
  studentName: String,
  type: 'sabq' | 'sabqi' | 'manzil',
  status: 'pending' | 'in_progress' | 'submitted' | 'sent_to_assignment',
  createdBy: String,
  createdByName: String,
  adminComment: String,
  assignedTeacherId: String,
  assignedTeacherName: String,
  teacherNotes: String,
  teacherComment: String,
  mistakes: [Mistake],
  sentToAssignmentId: String,
  sentAt: Date
}
```

### **Assignment Schema**
```javascript
{
  studentId: String,
  studentName: String,
  assignedBy: String,
  assignedByName: String,
  assignedByRole: 'admin' | 'super_admin' | 'teacher',
  classwork: {
    sabq: [ClassworkPhase],
    sabqi: [ClassworkPhase],
    manzil: [ClassworkPhase]
  },
  homework: {
    enabled: Boolean,
    content: String,
    link: String,
    items: [HomeworkItem], // NEW: Structured homework
    notes: String
  },
  mushafMistakes: [AssignmentMistake],
  fromTicketId: String,
  status: 'active' | 'completed' | 'archived',
  createdAt: Date,
  updatedAt: Date
}
```

### **ClassworkPhase Schema**
```javascript
{
  type: 'sabq' | 'sabqi' | 'manzil',
  assignmentRange: String,
  details: String,
  surahNumber: Number,
  surahName: String,
  createdAt: Date // Always current date when created
}
```

---

## 🎯 **IMPORTANT NOTES**

### **Date Handling**
- **Ticket Creation Date:** When ticket is created
- **Assignment Creation Date:** When assignment is created (current date)
- **Classwork Entry Date:** When ticket is approved (current date), NOT ticket creation date
- This ensures "today's report" shows today's date

### **Status Flow**
```
Ticket:
pending → in_progress → submitted → sent_to_assignment

Assignment:
active → completed → archived
```

### **Mistake Transfer**
- Mistakes marked in ticket → Copied to assignment
- Mistakes also synced to Student Personal Mushaf
- Each mistake includes `workflowStep` (sabq/sabqi/manzil)
- Mistakes include `markedBy` and `markedByName`

### **Assignment Linking**
- One ticket can link to one assignment (`sentToAssignmentId`)
- One assignment can link to one ticket (`fromTicketId`)
- Multiple tickets can add entries to the same assignment
- Assignment finds existing active assignment OR creates new one

---

## 🔧 **API ENDPOINTS SUMMARY**

### **Tickets**
- `POST /api/tickets` - Create ticket
- `GET /api/tickets` - Get all tickets
- `GET /api/tickets/:id` - Get single ticket
- `PUT /api/tickets/:id` - Update ticket
- `POST /api/tickets/:id/start` - Start ticket (pending → in_progress)
- `POST /api/tickets/:id/submit` - Submit ticket (in_progress → submitted)
- `POST /api/tickets/:id/approve-send` - Approve & convert to assignment

### **Assignments**
- `POST /api/assignments` - Create assignment
- `GET /api/assignments` - Get all assignments
- `GET /api/assignments/:id` - Get single assignment
- `PUT /api/assignments/:id` - Update assignment
- `DELETE /api/assignments/:id` - Delete assignment
- `POST /api/assignments/:id/submit-homework` - Submit homework
- `PUT /api/assignments/:id/grade-homework` - Grade homework

---

## 📱 **FRONTEND COMPONENTS**

### **Ticket Components**
- `TicketCreationForm.tsx` - Create/edit tickets
- `TeacherTicketReview.tsx` - Teacher reviews ticket
- `AdminTicketReview.tsx` - Admin approves ticket

### **Assignment Components**
- `AssignmentForm.tsx` - Create/edit assignments (legacy)
- `HomeworkAssignmentForm.tsx` - Assign structured homework (NEW)
- `StudentAssignmentHistory.tsx` - View student's assignments
- `StudentAssignments.tsx` - Student view of assignments

### **Context Functions**
- `BackendDataContext.tsx` - Centralized API calls
  - `createTicket()` - Create ticket
  - `updateRecitationTicket()` - Update ticket
  - `submitTicket()` - Submit ticket for review
  - `approveAndSendTicket()` - Approve ticket
  - `addAssignment()` - Create assignment
  - `updateAssignment()` - Update assignment

---

## ✅ **VALIDATION RULES**

### **Ticket Creation**
- ✅ Student ID required
- ✅ Ticket type required (sabq/sabqi/manzil)
- ✅ Sabq: `adminComment` required
- ✅ Sabqi/Manzil: `assignedTeacherId` required
- ✅ Status auto-set based on type

### **Assignment Creation**
- ✅ Student ID required
- ✅ At least one classwork entry OR homework enabled
- ✅ `createdAt` dates normalized to current date
- ✅ Valid assignment status

---

## 🚀 **SUMMARY**

**Ticket System:**
- Admin creates ticket → Teacher reviews → Admin approves → Assignment created

**Assignment System:**
- Can be created directly OR from approved ticket
- Supports multiple classwork entries per type
- Supports structured homework (NEW)
- Mistakes synced to Personal Mushaf

**Key Flow:**
```
Ticket (Workflow) → Approval → Assignment (Student Record)
```

This system ensures:
✅ Structured workflow
✅ Quality control (teacher review)
✅ Complete student records
✅ Historical mistake tracking
✅ Flexible assignment creation


