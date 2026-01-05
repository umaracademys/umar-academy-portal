# 🎫 Ticket & Assignment System - Complete Explanation

## 📋 Overview

Your portal uses a **two-stage system**:
1. **Ticket System** - Internal workflow for teachers to review recitations
2. **Assignment System** - Student-facing final output

---

## 🎫 **PART 1: TICKET SYSTEM**

### **What is a Ticket?**

A ticket is a **work item** assigned to a teacher to review a student's recitation. Think of it as a "to-do" item for teachers.

### **Ticket Types:**

| Type | Purpose | Description |
|------|---------|-------------|
| **Sabq** 📖 | New Material | Student recites NEW verses they're learning |
| **Sabqi** 📚 | Review Material | Student recites PREVIOUSLY learned verses from memory |
| **Manzil** 📿 | Large Review | Student recites LARGE portions (multiple Juz) |

### **Ticket Lifecycle:**

```
┌─────────────┐
│   Admin     │ Creates ticket
│             │ Assigns to Teacher
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Status: pending │ Teacher sees ticket
│                 │ in "My Tickets"
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Status:         │ Teacher opens Mushaf
│ in_progress     │ Marks mistakes
│                 │ Adds comment
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Status:         │ Teacher submits
│ submitted       │ for admin review
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Admin Reviews   │ Admin checks mistakes
│                 │ & comments
└──────┬──────────┘
       │
       ├─── Reject ──► Reassign to another teacher
       │
       └─── Approve ──► Convert to Assignment
```

### **Ticket Statuses:**

| Status | Meaning | Who Sees It |
|--------|---------|-------------|
| `pending` | Just created, waiting for teacher | Teacher, Admin |
| `in_progress` | Teacher started working on it | Teacher, Admin |
| `submitted` | Teacher finished, waiting for review | Admin only |
| `reassigned` | Sent back to another teacher | Teacher, Admin |
| `sent_to_assignment` | Approved and converted | Admin, Student (via assignment) |

### **What's Inside a Ticket?**

```javascript
{
  // Basic Info
  studentId: "student123",
  studentName: "Ahmed Ali",
  type: "sabq",  // or "sabqi" or "manzil"
  status: "submitted",
  
  // Admin Info
  createdBy: "admin456",
  createdByName: "Admin Name",
  adminComment: "Review Surah Al-Fatiha",
  
  // Teacher Assignment
  assignedTeacherId: "teacher789",
  assignedTeacherName: "Teacher Name",
  
  // Teacher's Work
  teacherComment: "Student did well, minor mistakes",
  mistakes: [
    {
      type: "madd",        // Type of mistake
      page: 1,             // Mushaf page
      surah: 1,            // Surah number
      ayah: 2,             // Ayah number
      wordIndex: 5,        // Which word
      note: "Hold longer",  // Teacher's note
      timestamp: "2024-01-15"
    },
    // ... more mistakes
  ],
  
  // Assignment Link (after approval)
  sentToAssignmentId: "assignment123",
  sentAt: "2024-01-15T10:00:00Z"
}
```

---

## 📝 **PART 2: ASSIGNMENT SYSTEM**

### **What is an Assignment?**

An assignment is what **students see** on their dashboard. It's the final output that combines:
- Classwork (from tickets)
- Homework instructions
- Mistakes marked by teachers
- Feedback and grades

### **Assignment Structure:**

```javascript
{
  // Basic Info
  studentId: "student123",
  studentName: "Ahmed Ali",
  status: "active",  // or "completed" or "archived"
  
  // Classwork - Multiple entries per type
  classwork: {
    sabq: [
      {
        type: "sabq",
        assignmentRange: "Surah Al-Fatiha, Ayah 1-7",
        details: "Review Surah Al-Fatiha",
        surahNumber: 1,
        createdAt: "2024-01-15"  // When ticket was approved
      },
      // Can have multiple sabq entries
    ],
    sabqi: [
      {
        type: "sabqi",
        assignmentRange: "Surah Al-Baqarah, Ayah 1-10",
        details: "Review from memory",
        createdAt: "2024-01-16"
      },
      // Can have multiple sabqi entries
    ],
    manzil: [
      // Can have multiple manzil entries
    ]
  },
  
  // Homework
  homework: {
    enabled: true,
    content: "Memorize Surah Al-Fatiha",
    link: "https://example.com/audio",
    submission: {
      submitted: true,
      submittedAt: "2024-01-20",
      content: "Student's homework text",
      audioUrl: "https://...",
      grade: 85,
      feedback: "Good work!",
      status: "graded"
    }
  },
  
  // Mistakes from tickets
  mushafMistakes: [
    // All mistakes from approved tickets
  ],
  
  // Link to tickets
  fromTicketId: "ticket123"  // Which ticket created this
}
```

---

## 🔄 **HOW TICKETS BECOME ASSIGNMENTS**

### **Step-by-Step Conversion Process:**

When admin clicks **"Approve & Send"** on a ticket:

```
┌─────────────────────────────────────────┐
│ STEP 1: Ticket Status Updated          │
│                                         │
│ status: "submitted"                     │
│   ↓                                     │
│ status: "sent_to_assignment"            │
│                                         │
│ sentToAssignmentId: "assignment123"   │
│ sentAt: "2024-01-15T10:00:00Z"         │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ STEP 2: Assignment Created/Updated      │
│                                         │
│ If no active assignment exists:         │
│   → Create NEW assignment               │
│                                         │
│ If active assignment exists:            │
│   → Add to EXISTING assignment          │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ STEP 3: Classwork Added                 │
│                                         │
│ Sabq ticket → assignment.classwork      │
│              .sabq[]                    │
│                                         │
│ Sabqi ticket → assignment.classwork     │
│               .sabqi[]                  │
│                                         │
│ Manzil ticket → assignment.classwork    │
│                .manzil[]                │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ STEP 4: Mistakes Transferred            │
│                                         │
│ ticket.mistakes[] →                     │
│   assignment.mushafMistakes[]           │
│                                         │
│ Also synced to:                        │
│   StudentPersonalMushaf.mistakes[]      │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ STEP 5: Student Sees Assignment        │
│                                         │
│ Assignment appears on:                  │
│   - Student Dashboard                   │
│   - Student Assignments Page            │
│                                         │
│ Student can:                            │
│   - View classwork                      │
│   - See mistakes in Mushaf              │
│   - Submit homework                     │
└─────────────────────────────────────────┘
```

### **Key Points:**

1. **One Ticket = One Classwork Entry**
   - Each approved ticket adds ONE entry to the assignment
   - Multiple tickets can add multiple entries

2. **Multiple Tickets → One Assignment**
   - Sabq ticket approved → Adds to assignment
   - Sabqi ticket approved → Adds to SAME assignment
   - Manzil ticket approved → Adds to SAME assignment
   - Student sees ONE assignment with all three types

3. **Date Handling**
   - When ticket is approved TODAY → Assignment entry gets TODAY's date
   - Not the ticket's original creation date
   - This ensures "today's report" shows today's date

---

## 👥 **USER ROLES & WHAT THEY DO**

### **1. Admin/Super Admin** 👨‍💼

**Creates Tickets:**
- Selects student
- Chooses ticket type (Sabq/Sabqi/Manzil)
- Assigns to teacher
- Adds instructions/notes

**Reviews Tickets:**
- Views teacher's mistakes
- Reads teacher's comments
- Checks Mushaf markings
- Approves or rejects

**Converts to Assignment:**
- Clicks "Approve & Send"
- Ticket becomes assignment
- Student sees it immediately

**Manages Assignments:**
- Adds homework instructions
- Grades student submissions
- Provides feedback

### **2. Teacher** 👨‍🏫

**Receives Tickets:**
- Sees tickets in "My Tickets"
- Status: "pending" or "in_progress"

**Reviews Recitation:**
- Opens Interactive Mushaf
- Clicks words to mark mistakes
- Selects mistake type
- Adds notes/comments

**Submits Ticket:**
- Adds review comment
- Submits for admin review
- Status changes to "submitted"

**Can Be Reassigned:**
- If admin rejects, ticket goes to another teacher
- Previous work is preserved

### **3. Student** 🎓

**Sees Assignments:**
- Views on dashboard
- Sees classwork (Sabq/Sabqi/Manzil)
- Views mistakes in Mushaf
- Reads homework instructions

**Submits Homework:**
- Types text response
- Uploads audio recording
- Adds links/attachments
- Submits for grading

**Receives Feedback:**
- Sees grades
- Reads teacher feedback
- Can resubmit if needed

---

## 📊 **COMPLETE WORKFLOW EXAMPLE**

### **Scenario: Student Ahmed's Recitation Review**

```
DAY 1 - Morning:
┌─────────────────────────────────────┐
│ Admin creates SABQ ticket           │
│ - Student: Ahmed                    │
│ - Type: Sabq                        │
│ - Assigns to: Teacher A             │
│ - Status: pending                   │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Teacher A receives ticket           │
│ - Opens Mushaf                      │
│ - Marks 3 mistakes                  │
│ - Adds comment: "Good progress"    │
│ - Submits                           │
│ - Status: submitted                 │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Admin reviews ticket                │
│ - Checks mistakes                   │
│ - Reads comment                     │
│ - Clicks "Approve & Send"           │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Assignment Created                  │
│ - Status: active                    │
│ - classwork.sabq[0] = {             │
│     assignmentRange: "...",         │
│     createdAt: "2024-01-15"         │
│   }                                 │
│ - mushafMistakes = [3 mistakes]     │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Student Ahmed sees assignment       │
│ - On dashboard                      │
│ - Sees Sabq classwork               │
│ - Views mistakes in Mushaf          │
└─────────────────────────────────────┘

DAY 1 - Afternoon:
┌─────────────────────────────────────┐
│ Admin creates SABQI ticket          │
│ - Same student: Ahmed               │
│ - Type: Sabqi                        │
│ - Assigns to: Teacher B             │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Teacher B reviews & submits          │
│ Admin approves                       │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ SAME Assignment Updated              │
│ - classwork.sabqi[0] = {...}        │
│ - More mistakes added               │
│ - Student sees BOTH sabq & sabqi    │
└─────────────────────────────────────┘

DAY 2:
┌─────────────────────────────────────┐
│ Admin adds homework                  │
│ - "Memorize Surah Al-Fatiha"        │
│ - Adds link to audio                │
│ - Assignment updated                 │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Student Ahmed submits homework      │
│ - Uploads audio recording           │
│ - Adds text notes                   │
│ - Status: submitted                 │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Teacher grades homework             │
│ - Grade: 85/100                     │
│ - Feedback: "Excellent!"            │
│ - Status: graded                    │
└─────────────────────────────────────┘
```

---

## 🔍 **KEY DIFFERENCES**

| Aspect | Ticket System | Assignment System |
|--------|---------------|-------------------|
| **Who Sees It** | Teachers & Admins | Students, Teachers & Admins |
| **Purpose** | Internal workflow | Student-facing output |
| **Status** | pending → submitted → sent_to_assignment | active → completed → archived |
| **Content** | One review session | Multiple reviews + homework |
| **Lifecycle** | Temporary (converted to assignment) | Permanent (student record) |

---

## 💡 **IMPORTANT CONCEPTS**

### **1. One Assignment Can Have Multiple Entries**

```
Assignment {
  classwork: {
    sabq: [
      { createdAt: "2024-01-15" },  // From ticket #1
      { createdAt: "2024-01-16" }  // From ticket #2
    ],
    sabqi: [
      { createdAt: "2024-01-17" }   // From ticket #3
    ]
  }
}
```

### **2. Mistakes Are Preserved**

- Mistakes marked in ticket → Saved to assignment
- Mistakes also synced to Student Personal Mushaf
- Students can see historical mistakes

### **3. Date Handling**

- Ticket created: January 10
- Ticket approved: January 15
- Assignment entry `createdAt`: January 15 (approval date, not creation date)

### **4. Assignment Status**

- `active` - Student can work on it
- `completed` - Student finished
- `archived` - Old assignment (read-only)

---

## 🎯 **SUMMARY**

**Ticket System:**
- Internal workflow tool
- Teachers review recitations
- Admin approves/rejects
- Temporary (converts to assignment)

**Assignment System:**
- Student-facing output
- Combines multiple tickets
- Includes homework
- Permanent record

**The Flow:**
```
Ticket (Teacher Work) → Approval → Assignment (Student Sees)
```

This system ensures:
✅ Structured workflow
✅ Quality control (admin review)
✅ Complete student records
✅ Historical mistake tracking
✅ Homework management

---

## 📱 **Where to Find Things**

**For Admins:**
- Create Tickets: `AdminTicketReview.tsx` or `TicketCreationForm.tsx`
- Review Tickets: `AdminTicketReview.tsx`
- Manage Assignments: `AssignmentManagement.tsx`

**For Teachers:**
- View Tickets: `TeacherDashboard.tsx` → "My Tickets"
- Review Ticket: `TeacherTicketReview.tsx`
- Mark Mistakes: Interactive Mushaf component

**For Students:**
- View Assignments: `StudentDashboard.tsx`
- See Details: `StudentAssignments.tsx`
- Submit Homework: Assignment detail page

---

This system provides a complete digital workflow from ticket creation to assignment completion! 🎉

