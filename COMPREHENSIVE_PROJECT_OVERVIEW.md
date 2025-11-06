# 📚 Umar Academy Portal - Comprehensive Project Overview

> **Last Updated**: Current Session  
> **Status**: Active Development  
> **Architecture**: Monorepo with pnpm workspaces

---

## 🎯 **PROJECT PURPOSE**

Umar Academy Portal is a comprehensive educational management system designed for Quranic recitation education. It manages the complete workflow from student registration to assignment creation, recitation review, and progress tracking through an interactive Mushaf (Quran text) interface.

### **Key Capabilities:**
- **Student Management**: Complete student lifecycle management with program tracking
- **Teacher Management**: Teacher assignments, permissions, and workload management
- **Recitation Workflow**: Ticket-based system for managing Sabq → Sabqi → Manzil → Finalize workflow
- **Interactive Mushaf**: Digital Quran interface with mistake marking and historical tracking
- **Assignment System**: Create, manage, and track student assignments
- **Personal Mistake Tracking**: Historical mistake tracking for each student across all recitations

---

## 🏗️ **ARCHITECTURE**

### **Project Structure**
```
umar-academy-portal/
├── packages/
│   └── mushaf/                    # Separated Mushaf package (monorepo)
│       ├── src/
│       │   ├── components/        # InteractiveMushaf, InteractiveMushafSimple
│       │   ├── types/             # Mushaf types and interfaces
│       │   ├── services/          # Quran API, audio service
│       │   └── index.ts           # Package exports
│       ├── public/
│       │   └── data/words/        # word_by_word.json (8.4MB)
│       └── package.json
├── src/                           # Main frontend application
│   ├── components/                # 40+ React components
│   ├── pages/                     # Dashboard and main pages
│   ├── modules/student/           # Student module
│   ├── contexts/                  # React Context providers
│   ├── services/                  # API services
│   ├── types/                     # TypeScript types
│   └── models/                    # Data models
├── backend/                       # Node.js backend
│   ├── server.js                  # Express API server
│   ├── quranSchemas.js            # MongoDB schemas
│   └── migrateSqliteToMongo.js    # Data migration script
└── [config files]
```

### **Tech Stack**

#### **Frontend**
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router v6** - Navigation
- **pnpm workspaces** - Monorepo management

#### **Backend**
- **Node.js** - Runtime
- **Express.js** - Web framework
- **MongoDB** - Primary database (via Mongoose)
- **SQLite** - Legacy data (for migration)
- **bcryptjs** - Password hashing

#### **Deployment**
- **Render** - Frontend and backend hosting
- **MongoDB Atlas** - Cloud database (or local)

---

## 👥 **USER ROLES & PERMISSIONS**

### **1. Super Admin** 👑
- **Full system control**
- Register students, teachers, admins
- Manage all permissions
- View all system statistics
- Access ticket management
- Finalize assignments

### **2. Admin** 🛡️
- **Permission-based access** (5 core permissions):
  - ✅ Manage Teachers
  - ✅ Manage Students
  - ✅ Manage Financials
  - ✅ View Reports
  - ✅ Manage Permissions (if granted)
- Can create and manage tickets
- Can approve/reject ticket submissions

### **3. Teacher** 👨‍🏫
- **Permission-based access** (7 granular permissions):
  - ✅ View Assessments
  - ✅ Edit Assessments
  - ✅ View Evaluations
  - ✅ Edit Evaluations
  - ✅ View Financials
  - ✅ Manage Schedule
  - ✅ Contact Parents
- See assigned students only
- View and fill assigned tickets
- Mark mistakes in Interactive Mushaf
- View student progress and historical mistakes

### **4. Student** 🎓
- View own assignments
- View own courses
- View finalized assignments with Mushaf
- See mistake history (if enabled)
- Submit assignments

---

## 🎯 **CORE FEATURES**

### **1. TICKET-BASED RECITATION WORKFLOW** 🎫

**Purpose**: Manage the complete recitation review process from Sabq to Finalize.

#### **Workflow Chain:**
```
1. Admin creates ticket → Assigns to Teacher A for Sabq
   ↓
2. Teacher A listens to recitation → Marks mistakes in Mushaf → Submits for Review
   ↓
3. Admin reviews → Approves → Assigns to Teacher B for Sabqi
   ↓
4. Teacher B fills ticket → Submits for Review
   ↓
5. Admin reviews → Approves → Assigns to Teacher C for Manzil
   ↓
6. Teacher C fills ticket → Submits for Review
   ↓
7. Admin reviews → Approves → Assigns to Teacher D for Finalize
   ↓
8. Admin listens to sabq → Writes report → Adds homework → Finalizes
   ↓
9. Assignment created → Student sees on their assignment page
```

#### **Ticket Statuses:**
- `assigned` - Ticket assigned to teacher
- `in_progress` - Teacher working on it
- `pending_review` - Submitted, waiting for admin review
- `approved` - Admin approved, ready for next step
- `needs_revision` - Admin sent back for corrections
- `finalized` - Complete with homework, visible to student
- `completed` - Fully done

#### **Components:**
- **`TeacherTickets.tsx`** - Teachers view and fill tickets
- **`AdminTicketManagement.tsx`** - Admins review and manage tickets
- **`AssignTicketForm.tsx`** - Create new tickets

#### **API Endpoints:**
- `GET /api/tickets` - Get all tickets
- `POST /api/tickets` - Create ticket
- `PUT /api/tickets/:id` - Update ticket
- `POST /api/tickets/:id/approve` - Approve ticket
- `POST /api/tickets/:id/assign-next` - Assign to next teacher
- `POST /api/tickets/:id/finalize` - Finalize and create assignment

---

### **2. INTERACTIVE MUSHAF** 📖

**Purpose**: Digital Quran interface for marking mistakes during recitation reviews.

#### **Features:**
- **Word-by-word display** - Shows Quran text word by word
- **Mistake marking** - Click words to mark different mistake types
- **Historical mistakes** - Shows past mistakes for the same student
- **Audio recording** - Record mistake audio directly in interface
- **Mistake types**:
  - Memory Mistake
  - Mad (Elongation) Mistake
  - Ikhfa Mistake
  - Holding/Fluency Mistake
  - Ghunna Mistake
  - Other Mistake
- **Surah navigation** - Jump to specific surahs
- **Page navigation** - Navigate through pages
- **Read-only mode** - For viewing mistakes without editing

#### **Components:**
- **`InteractiveMushaf.tsx`** - Main Mushaf component (1,300+ lines)
- **`InteractiveMushafSimple.tsx`** - Simplified version
- **`WordByWordPage`** - Renders words on a page
- **`MistakeModal`** - Modal for marking mistakes

#### **Data:**
- **`word_by_word.json`** - 8.4MB JSON file with all Quran words
- **Layout data** - Fetched from backend API (`/api/quran/pages/:page/lines`)
- **Chapter data** - Fetched from backend API (`/api/quran/chapters`)

#### **Package Structure:**
The Mushaf is now a separate package (`@umar-academy/mushaf`) in a monorepo:
- **Location**: `packages/mushaf/`
- **Build**: Vite library mode
- **Exports**: Components, types, services

---

### **3. PERSONAL MISTAKE TRACKING** 📊

**Purpose**: Track all mistakes for each student across all recitations for historical reference.

#### **Features:**
- **Student Personal Mushaf** - Each student has their own mistake history
- **Historical mistakes** - Shown in different color in Mushaf
- **Mistake persistence** - Mistakes saved to `studentPersonalMushaf` collection
- **Teacher visibility** - Teachers can see historical mistakes when reviewing
- **Context awareness** - Shows which recitation/ticket the mistake came from

#### **Database Schema:**
```javascript
{
  studentId: String,
  mistakes: [{
    id: String,
    type: String, // 'madd', 'holding', 'memory', 'ikhfa', 'tech', 'other'
    page: Number,
    surah: Number,
    ayah: Number,
    wordIndex: Number,
    position: { x: Number, y: Number },
    note: String,
    audioUrl: String,
    timestamp: Date,
    sourceTicketId: String, // Which ticket/recitation this came from
    sourceWorkflowStep: String // 'sabq', 'sabqi', 'manzil'
  }],
  lastUpdated: Date
}
```

---

### **4. ASSIGNMENT MANAGEMENT** 📝

**Purpose**: Create and manage assignments for students.

#### **Features:**
- **Program-specific templates**:
  - **Full Time HQ & Part Time HQ**: Classwork + Homework sections
  - **After School Reading**: Single link + Feedback
- **Bulk creation** - Create multiple assignments at once
- **CSV import** - Import assignments from CSV
- **Student selection** - Filter by program, teacher
- **Due date management**
- **Assignment submissions** - Students submit assignments
- **Status tracking** - Draft, published, completed

#### **Components:**
- `SimpleAssignmentForm.tsx` - Main assignment form
- `BulkAssignmentCreator.tsx` - Bulk creation interface
- `CSVAssignmentImporter.tsx` - CSV import
- `AssignmentsPage.tsx` - Main assignments page

#### **Integration with Tickets:**
- Assignments are automatically created when tickets are finalized
- Assignments show Mushaf mistakes if they came from a ticket
- Students see finalized assignments with mistake markings

---

### **5. USER MANAGEMENT** 👥

#### **Student Registration**
- Complete profile with:
  - Basic info (name, parent, email, contact)
  - Program selection (Full Time HQ, Part Time HQ, After School Reading)
  - Assigned teacher
  - Financial info (tuition, registration)
  - Schedule (days, times)
  - Siblings management
  - Assessments and evaluations tracking

#### **Teacher Registration**
- Complete profile with:
  - Basic info
  - Department assignment
  - Working schedule
  - 7 granular permissions
  - Payroll information
  - Assigned students

#### **Admin Registration**
- Complete profile with:
  - Basic info
  - Department assignments
  - 5 core permissions

---

### **6. PERMISSION MANAGEMENT** 🔐

**Component**: `PermissionManager.tsx`

#### **Teacher Permissions** (7):
1. View Assessments
2. Edit Assessments
3. View Evaluations
4. Edit Evaluations
5. View Financials
6. Manage Schedule
7. Contact Parents

#### **Admin Permissions** (5):
1. Manage Teachers
2. Manage Students
3. Manage Financials
4. View Reports
5. Manage Permissions

---

## 🗄️ **DATABASE STRUCTURE**

### **MongoDB Collections**

#### **Users**
```javascript
{
  name: String,
  email: String (unique),
  role: 'superadmin' | 'admin' | 'teacher' | 'student',
  password: String (hashed),
  avatar: String,
  timestamps
}
```

#### **Students**
```javascript
{
  studentId: String,
  userId: ObjectId (ref: User),
  fullName: String,
  parentName: String,
  email: String,
  contact: String,
  program: String,
  assignedTeacher: String,
  tuitionFee: Number,
  registrationAmount: Number,
  schedule: { days: [String], startTime: String, endTime: String },
  siblings: [{ name, program, ... }],
  assessments: [{ type, date, score, ... }],
  evaluations: [{ type, date, score, ... }],
  timestamps
}
```

#### **Teachers**
```javascript
{
  teacherId: String,
  userId: ObjectId (ref: User),
  fullName: String,
  email: String,
  department: String,
  assignedStudents: [String],
  schedule: { workingDays: [String], workingHours: {...} },
  permissions: {
    canViewAssessments: Boolean,
    canEditAssessments: Boolean,
    // ... 7 permissions
  },
  payroll: { monthlySalary, currency, ... },
  timestamps
}
```

#### **Assignments**
```javascript
{
  title: String,
  description: String,
  type: 'classwork' | 'homework',
  classworkType: 'sabq' | 'sabqi' | 'manzil',
  program: String,
  assignedBy: ObjectId (ref: User),
  assignedTo: [String], // Student IDs
  dueDate: Date,
  status: 'draft' | 'published' | 'completed',
  fromTicketId: String, // Links to ticket if created from ticket
  mushafMarkings: [{ ... }], // Mistakes from ticket
  attachments: [{ type, content, title }],
  submissions: [{ ... }],
  timestamps
}
```

#### **AssignmentTickets** (Ticket System)
```javascript
{
  studentId: String,
  studentName: String,
  workflowStep: 'sabq' | 'sabqi' | 'manzil' | 'finalize',
  assignedTeacherId: String,
  assignedTeacherName: String,
  status: 'assigned' | 'in_progress' | 'pending_review' | 'approved' | 'needs_revision' | 'finalized' | 'completed' | 'pending',
  progressNotes: String,
  audioLink: String,
  previousTicketId: String, // Links to previous step
  nextTicketId: String, // Links to next step
  reviewedBy: String, // Admin ID
  reviewedAt: Date,
  completedBy: String, // Teacher ID
  completedAt: Date,
  revisionNotes: String,
  finalReport: String,
  homework: String,
  homeworkLink: String,
  assignmentId: String, // Final assignment ID
  mushafMarkings: [{ ... }], // Mistakes marked in Mushaf
  program: String,
  timestamps
}
```

#### **StudentPersonalMushaf** (Historical Mistakes)
```javascript
{
  studentId: String,
  mistakes: [{
    id: String,
    type: 'madd' | 'holding' | 'memory' | 'ikhfa' | 'tech' | 'other',
    page: Number,
    surah: Number,
    ayah: Number,
    wordIndex: Number,
    position: { x: Number, y: Number },
    note: String,
    audioUrl: String,
    timestamp: Date,
    sourceTicketId: String,
    sourceWorkflowStep: String
  }],
  lastUpdated: Date
}
```

#### **QuranPage** (Quran Layout Data)
```javascript
{
  pageNumber: Number,
  lines: [{
    lineNumber: Number,
    words: [{
      wordIndex: Number,
      surah: Number,
      ayah: Number,
      text: String,
      position: { x: Number, y: Number }
    }]
  }],
  version: String // 'v4', 'v15', etc.
}
```

#### **QuranWord** (Word Data)
```javascript
{
  word_index: Number,
  surah: Number,
  ayah: Number,
  text: String
}
```

#### **QuranChapter** (Chapter Metadata)
```javascript
{
  id: Number,
  name_simple: String,
  name_arabic: String,
  name_complex: String,
  translated_name: { name: String },
  pages: [Number, Number], // [start, end]
  verses_count: Number,
  revelation_place: String
}
```

---

## 🔌 **API ENDPOINTS**

### **Base URL**: `http://localhost:3001/api` (or production URL)

### **Authentication**
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### **Users**
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### **Students**
- `GET /api/students` - Get all students
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### **Teachers**
- `GET /api/teachers` - Get all teachers
- `POST /api/teachers` - Create teacher
- `PUT /api/teachers/:id` - Update teacher
- `DELETE /api/teachers/:id` - Delete teacher

### **Assignments**
- `GET /api/assignments` - Get all assignments
- `POST /api/assignments` - Create assignment
- `PUT /api/assignments/:id` - Update assignment
- `DELETE /api/assignments/:id` - Delete assignment
- `POST /api/assignments/:id/submissions` - Add submission

### **Tickets** (Assignment Tickets)
- `GET /api/tickets` - Get all tickets (with filters)
- `GET /api/tickets/:id` - Get single ticket
- `POST /api/tickets` - Create ticket
- `PUT /api/tickets/:id` - Update ticket
- `POST /api/tickets/:id/approve` - Approve ticket
- `POST /api/tickets/:id/assign-next` - Assign to next teacher
- `POST /api/tickets/:id/finalize` - Finalize ticket and create assignment

### **Quran Data**
- `GET /api/quran/chapters` - Get all chapters
- `GET /api/quran/pages/:page/lines` - Get page layout (query: `?version=v4`)
- `GET /api/quran/pages/:page/verses` - Get page verses

### **Mistakes**
- `POST /api/mistakes/audio` - Upload mistake audio (returns URL)
- `GET /api/mistakes/student/:studentId` - Get student's historical mistakes

### **Health Check**
- `GET /api/health` - Server health check

---

## 📱 **PAGES & ROUTES**

### **Authentication**
- `/login` - Login page for all roles

### **Dashboards**
- `/dashboard` - Role-based dashboard routing
  - Super Admin → `SuperAdminDashboard`
  - Admin → `AdminDashboard`
  - Teacher → `TeacherDashboard`
  - Student → `/student/dashboard`

### **Main Pages**
- `/assignments` - Assignment management (admin/teacher)
- `/assignment-cards` - Card-based assignment view
- `/my-assignments` - Student assignments view
- `/profile` - Teacher profile page

### **Student Module** (`/student/*`)
- `/student/dashboard` - Student main dashboard
- `/student/assignments` - Student assignments with Mushaf
- `/student/courses` - Student courses
- `/student/profile` - Student profile

### **Ticket Management** (via modals/components)
- Teacher Dashboard → "🎫 My Tickets"
- Super Admin Dashboard → "🎫 Manage Tickets", "➕ Assign New Ticket"

---

## 🎨 **KEY COMPONENTS**

### **Ticket Management**
- `TeacherTickets.tsx` - Teacher ticket interface
- `AdminTicketManagement.tsx` - Admin ticket review
- `AssignTicketForm.tsx` - Create new tickets

### **Mushaf Components** (from `@umar-academy/mushaf`)
- `InteractiveMushaf` - Main Mushaf component
- `InteractiveMushafSimple` - Simplified version
- `MistakeModal` - Mistake marking modal
- `WordByWordPage` - Word-by-word page renderer

### **Assignment Components**
- `SimpleAssignmentForm.tsx` - Main assignment form
- `BulkAssignmentCreator.tsx` - Bulk creation
- `CSVAssignmentImporter.tsx` - CSV import
- `AssignmentReports.tsx` - Assignment analytics

### **User Management**
- `StudentRegistrationForm.tsx` - Student registration
- `TeacherRegistrationForm.tsx` - Teacher registration
- `AdminRegistrationForm.tsx` - Admin registration
- `PermissionManager.tsx` - Permission management

### **Layout Components**
- `Header.tsx` - Top navigation
- `Sidebar.tsx` - Main navigation
- `Card.tsx` - Reusable card
- `StatCard.tsx` - Statistics display

---

## 🔄 **DATA FLOW**

### **Ticket → Assignment Flow:**
1. Admin creates ticket → `POST /api/tickets`
2. Teacher fills ticket → `PUT /api/tickets/:id` (marks mistakes in Mushaf)
3. Teacher submits → `PUT /api/tickets/:id` (status: `pending_review`)
4. Admin approves → `POST /api/tickets/:id/approve`
5. Admin assigns next → `POST /api/tickets/:id/assign-next` (creates next ticket)
6. Admin finalizes → `POST /api/tickets/:id/finalize` (creates assignment)
7. Mistakes saved to `StudentPersonalMushaf` collection
8. Student sees assignment with mistakes

### **Mistake Marking Flow:**
1. Teacher clicks word in Mushaf → `MistakeModal` opens
2. Teacher selects mistake type, adds note, records audio
3. Audio uploaded → `POST /api/mistakes/audio`
4. Mistake saved to ticket → `PUT /api/tickets/:id` (in `mushafMarkings` array)
5. On finalize, mistakes copied to `StudentPersonalMushaf`

---

## 🚀 **DEPLOYMENT**

### **Render Configuration**
- **Frontend**: Static site with SPA routing
- **Backend**: Node.js service
- **Database**: MongoDB Atlas (or local)

### **Environment Variables**
- `MONGODB_URI` - MongoDB connection string
- `PORT` - Backend port (default: 3001)
- `VITE_API_BASE_URL` - Frontend API base URL

### **Build Commands**
```bash
# Frontend
npm run build

# Backend
cd backend && npm start

# Mushaf package (if building separately)
pnpm build:mushaf
```

---

## 📊 **PROJECT METRICS**

- **Total Components**: 40+
- **Total Pages**: 9+
- **Total API Endpoints**: 20+
- **Database Collections**: 8+
- **User Roles**: 4
- **Permission Types**: 12 (7 teacher + 5 admin)
- **Workflow Steps**: 4 (Sabq, Sabqi, Manzil, Finalize)
- **Mistake Types**: 6
- **File Size**: `word_by_word.json` - 8.4MB

---

## 🎯 **RECENT CHANGES**

### **Mushaf Component Separation** ✅
- Separated Mushaf into `@umar-academy/mushaf` package
- Monorepo structure with pnpm workspaces
- Independent build and development

### **Ticket System Simplification** ✅
- Separated "Approve" from "Assign to Next"
- Simplified admin interface
- Better workflow control

### **Personal Mistake Tracking** ✅
- Historical mistake storage
- Visual distinction in Mushaf
- Context-aware mistake display

---

## 🔧 **DEVELOPMENT WORKFLOW**

### **Starting Development**
```bash
# Install dependencies
pnpm install

# Start backend
cd backend && npm start

# Start frontend (in another terminal)
pnpm dev

# Build Mushaf package (if needed)
pnpm build:mushaf
```

### **Common Tasks**
```bash
# Build everything
pnpm build:all

# Build main app
pnpm build

# Build Mushaf only
pnpm build:mushaf

# Seed database
cd backend && npm run seed

# Migrate Quran data
cd backend && npm run migrate-quran
```

---

## 📝 **NEXT STEPS (Potential)**

1. **Performance Optimization**
   - Lazy load `word_by_word.json`
   - Optimize Mushaf rendering
   - Add caching for Quran data

2. **Testing**
   - Unit tests for components
   - Integration tests for API
   - E2E tests for workflows

3. **Features**
   - Real-time notifications
   - Email notifications
   - Mobile app
   - Offline support

4. **Documentation**
   - API documentation
   - Component documentation
   - User guides

---

## 🎉 **SUMMARY**

Umar Academy Portal is a comprehensive educational management system specifically designed for Quranic recitation education. It features:

- ✅ **Ticket-based workflow** for managing recitation reviews
- ✅ **Interactive Mushaf** for marking mistakes digitally
- ✅ **Historical mistake tracking** for student progress
- ✅ **Assignment management** with program-specific templates
- ✅ **Role-based permissions** for fine-grained access control
- ✅ **Monorepo architecture** for maintainability

The system streamlines the entire process from student registration to finalizing assignments, replacing manual WhatsApp-based workflows with a digital, trackable system.

---

**Built with ❤️ for Umar Academy**

*Last Updated: Current Session*

