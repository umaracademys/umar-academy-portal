# Umar Academy Portal — Full System Audit

**Date:** January 2026  
**Purpose:** Plain-English audit for the app owner. No rewrites, no renames — explain, verify, protect.  
**Audience:** Non-technical owner; religious education system in production.

---

## SECTION 1 — HIGH-LEVEL SYSTEM OVERVIEW

### What kind of app this is

**Umar Academy Portal** is a **Learning Management System (LMS)** for a Quranic academy. It has:

- **Three web portals:** Admin, Teacher, Student (each with its own dashboard and workflows).
- **Real-time features:** Live recitation monitoring over WebSockets (Socket.IO), and instant updates for tickets, assignments, and notifications.
- **Core religious workflows:** Sabq / Sabqi / Manzil (recitation review), Interactive Mushaf (mistake marking on Quran pages), Qaidah (beginner books), weekly evaluations, assignments, and teacher–student messaging.

So: **LMS + portals + real-time + Quran-specific features.**

### Who the users are

| Role | Who they are | What they do |
|------|----------------|--------------|
| **Super Admin** | Academy owner / top admin | Full access; manage admins, permissions, maintenance, all data. |
| **Admin** | Staff with granular permissions | Manage teachers, students, tickets, assignments, attendance, evaluations, messages — according to permission flags. |
| **Teacher** | Instructors | See assigned students only; run tickets (sabq/sabqi/manzil), mark mistakes, submit reviews; view own attendance and payroll. |
| **Student** | Enrolled learners | See own assignments, tickets, personal Mushaf mistakes; submit homework; limited profile. |

### Core workflows (login → daily use → data saved)

1. **Login** → User enters email/password → Backend checks credentials and lockout → Returns JWT → Frontend stores token and role; user is sent to the right dashboard.
2. **Admin daily:** Manage teachers/students, create tickets, approve ticket reviews, send data to assignments, manage attendance, read/send messages, handle notifications.
3. **Teacher daily:** Open assigned tickets, do recitation review (Mushaf + mistakes), submit ticket; optionally use live recitation (Socket.IO); view own attendance and payroll.
4. **Student daily:** View assignments and tickets, see personal Mushaf mistakes, submit homework; view profile.
5. **Data saved:** Almost everything is in **MongoDB** (users, students, teachers, assignments, tickets, evaluations, attendance, messages, notifications, etc.). **Static Mushaf layout** (page/word positions) comes from **local SQLite/JSON** or an external API. **Uploaded files** (recordings, message attachments) go to the server’s **`backend/uploads/`** folder.

### What is mission-critical

- **Authentication and role/permission checks** — who can see and do what.
- **Ownership rules** — students only their data; teachers only assigned students/tickets; admins by permission.
- **Ticket flow** — create → assign → teacher reviews (Mushaf + mistakes) → submit → admin approves → data sent to assignment and (where applicable) Student Personal Mushaf.
- **Assignment ↔ ticket link** — assignment status and classwork/homework must stay in sync when a ticket is approved.
- **Mushaf mistake data** — stored in tickets, assignments, and Student Personal Mushaf; must not be lost on refresh once saved to backend.
- **Uploaded files** — recordings and attachments must persist (today they live on the server disk; redeploy can wipe them if uploads are not persisted outside the app).

### Simple diagram (data flow)

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (React + Vite)                                         │
│  • Login, Dashboards, Mushaf, Tickets, Assignments, Messages      │
│  • Socket.IO client (tickets, assignments, notifications)        │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / WSS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  API Server (Node.js + Express) — backend/server.js              │
│  • REST: /api/auth, /api/students, /api/tickets, etc.            │
│  • Socket.IO: recitation live, ticket/assignment events          │
│  • Middleware: JWT auth, permissions, ownership checks           │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  MongoDB        │  │  SQLite / JSON   │  │  Local files    │
│  (main data)    │  │  (Mushaf layout) │  │  (uploads)      │
│  Users, Tickets,│  │  Page/word       │  │  recordings,    │
│  Assignments,   │  │  positions       │  │  messages,      │
│  Messages, etc.│  │  public/data/    │  │  backend/       │
└─────────────────┘  └─────────────────┘  │  uploads/       │
                                         └─────────────────┘
```

---

## SECTION 2 — BACKEND ARCHITECTURE (PLAIN ENGLISH)

### 2.1 Server structure

- **Entry point:** `backend/server.js` (single large file: Express app, MongoDB connection, all route handlers, Socket.IO, and Mongoose schemas).
- **How routes are registered:** Routes are defined inline in `server.js` (e.g. `app.get('/api/students', ...)`, `app.post('/api/tickets', ...)`). A few features use separate route files (e.g. `routes/messages.js`, `routes/recitationRoutes.js`) but the bulk of the API lives in `server.js`.
- **Middleware used:**
  - **Auth:** `authenticateToken` — checks JWT, puts `req.user` (userId, email, role, permissions).
  - **Permissions:** `requirePermission('canXxx')` — for admins/teachers, checks permission flags (from token or DB); superadmin bypasses.
  - **Ownership:** `validateStudentOwnership`, `validateTeacherOwnership`, `validateAssignmentOwnership`, `validateTicketOwnership` — ensure the logged-in user is allowed to access that student/teacher/assignment/ticket.
  - **Rate limiting:** Login and general API limiters to reduce brute-force and abuse.
  - **Other:** CORS, Helmet, compression; error handling and 404 at the end.
- **Socket.IO:** Uses JWT in handshake; user is attached to rooms (`student:userId`, `teacher:userId`, `admins`). Used for: live recitation (audio chunks, transcription, metrics), ticket/assignment real-time updates, maintenance mode, permission invalidation. It does **not** replace REST for CRUD; all create/update/delete still go through HTTP API.

### 2.2 Databases used

| Store | What lives there | Why |
|-------|-------------------|-----|
| **MongoDB** | Users, Admins, Teachers, Students, Assignments, Tickets, WeeklyEvaluations, TeacherAttendance, RecitationReview, RecitationSession, StudentPersonalMushaf, MistakeLibrary, AiPhrase, AdminNotification, TeacherNotification (legacy), unified Notification, Conversation, Message, ActivityLog, QaidahMark, QaidahPageLearning, QaidahStudentLearning, PdfDocument, PdfAnnotation, SabqAudioClip, TestResult, Evaluation*, TeacherPair, PairStudent, PairDailyReport, PairTeacherMessage, TeacherStudentMessage, etc. | Main operational data: who is who, what was assigned, what was reviewed, what was said. Flexible schema and rich documents fit tickets/assignments/evaluations. |
| **SQLite / JSON (public/data/)** | Mushaf layout: which words/lines sit on which page (e.g. `qpc-v1-15-lines.db`, `word by word.db`, `layouts/`, `words/word_by_word.json`). | Static, read-only Quran structure. Fast local lookup for the Interactive Mushaf (page → words → positions). Some code paths also use an external API (e.g. qul.tarteel.ai) for layout. |
| **Local files (backend/uploads/)** | Recordings (mistakes, sabq-audio, general recordings), message attachments (uploads/messages). | Files uploaded through the app; stored on the server filesystem. **Risk:** If the server or container is replaced without persisting this folder, uploads are lost. |

---

## SECTION 3 — DATABASE SCHEMA AUDIT (PLAIN ENGLISH)

For each main collection, below: what it is in real life, main fields, who creates/reads/updates/deletes, what depends on it, and what breaks if it breaks.

### Users (User)

- **What it is:** One row per login account (email, hashed password, role: student | teacher | admin | superadmin). Includes login lockout, password-change-required flag, and permission version for token invalidation.
- **Key fields (plain English):** Email, name, role, password (hashed), login enabled/disabled, failed login attempts and lockout until, permissions version.
- **Who creates:** Admins (or scripts) when creating teachers/students/admins; public registration can create student-related requests.
- **Who reads/updates/deletes:** Backend for every authenticated request; admins manage users; users can update own profile where allowed.
- **Depends on:** Nothing; everything else (Student, Teacher, Admin, tickets, assignments) references User by userId or by linked profile.
- **If this breaks:** Nobody can log in or be identified; the whole academy breaks.

### Students (Student)

- **What it is:** Profile for a learner: link to User, level, payment status, enrollment, assigned teachers, program, contact, schedule, recitation profile (sabq/sabqi/manzil), assessments/evaluations arrays.
- **Key fields:** userId, fullName, email, assignedTeacherIds (array), program, paymentStatus, recitationProfile, status.
- **Who creates/updates:** Admins (and APIs they use); teachers do not create students but can update some assignment-related data for assigned students.
- **Who reads:** Admins, assigned teachers, and the student (own only). Enforced by validateStudentOwnership on sensitive routes.
- **Depends on:** User (userId). Referenced by Assignment, Ticket, StudentPersonalMushaf, weekly evaluations, messages.
- **If this breaks:** You cannot assign work, run tickets, or show the right data to teachers/students.

### Teachers (Teacher)

- **What it is:** Profile for an instructor: link to User, contact, department, shifts, assigned students, permissions (granular), payroll (hourly rate, days, currency, monthly salary), status.
- **Key fields:** userId, fullName, email, assignedStudents (array of student IDs), permissions (object), payroll, permissionsVersion.
- **Who creates/updates:** Admins (require canManageTeachers). Teachers may view own profile (and payroll) but not change permissions.
- **Who reads:** Admins; teachers see own record; backend uses it for permission and assignment checks.
- **Depends on:** User. Referenced by Ticket (assignedTeacherId), TeacherAttendance, evaluations, messages, pairs.
- **If this breaks:** You cannot assign tickets or teachers to students; permission checks fail.

### Admins (Admin)

- **What it is:** Staff profile linked to User, with granular permissions (canManageTeachers, canApproveTickets, etc.) and departments.
- **Key fields:** userId, fullName, email, permissions (large object), permissionsVersion, assignedDepartments.
- **Who creates/updates:** Super admin (or admins with canManageTeachers). Permissions and version are used to invalidate JWTs.
- **Who reads:** Backend on every permission check; admins list other admins (with auth).
- **Depends on:** User. Used for all permission-gated actions.
- **If this breaks:** Admins cannot do their job; permission system is wrong.

### Assignments (Assignment)

- **What it is:** A set of classwork (sabq/sabqi/manzil entries) and homework for one student, with optional PDF, submission, and grades. Can be created from a ticket or from scratch.
- **Key fields:** studentId, studentName, assignedBy, assignedByRole, classwork (sabq/sabqi/manzil arrays), homework (enabled, items, submission, feedback, status), mushafMistakes, status, fromTicketId.
- **Who creates:** Admins (or system when approving a ticket). Teachers with permission can create for assigned students.
- **Who reads/updates:** Admins; teachers for assigned students; students for own. Enforced by validateAssignmentOwnership / validateStudentOwnership.
- **Depends on:** Student. Referenced by Ticket (sentToAssignmentId). When a ticket is approved, its review data and mistakes are written into the assignment.
- **If this breaks:** Students and teachers lose current work and homework; ticket approval cannot update the right assignment.

### Tickets (Ticket)

- **What it is:** A single recitation review task: sabq, sabqi, or manzil. Tracks student, assigned teacher, status (pending → in_progress → submitted → approved → sent_to_assignment), mistakes, comments, recording, optional AI metrics.
- **Key fields:** studentId, type (sabq|sabqi|manzil), status, createdBy, assignedTeacherId, teacherComment, mistakes (array with page/surah/ayah/wordIndex/position/type), recitationRange, mistakeCount, atkees, tajweedIssues, sabqEntries (for sabq), sentToAssignmentId, sentAt, recordingUrl, recitationSessionId.
- **Who creates:** Admins (canCreateTickets). Who updates: Assigned teacher (start, submit with mistakes); admin (approve, reassign, delete). Who reads: Admins, assigned teacher, student (own). validateTicketOwnership used on sensitive routes; POST /api/tickets/:id/submit does inline ownership check.
- **Depends on:** Student, Teacher (optional), Assignment (when approved). Mistakes from approved tickets are also synced to StudentPersonalMushaf.
- **If this breaks:** Review workflow stops; teachers cannot submit; admin cannot approve or send to assignment; assignment and Personal Mushaf stay out of sync.

### Attendance (TeacherAttendance)

- **What it is:** One record per teacher per day: morning/evening or single shift, status (present/absent/late), check-in/out, paid days, shared-with-teacher flag.
- **Key fields:** teacherId, date, employmentType, morningShift/eveningShift or shift, sharedWithTeacher, recordedBy.
- **Who creates/updates:** Admins (canManageAttendance). Teachers can read own if shared.
- **Depends on:** Teacher. Used for payroll and reporting.
- **If this breaks:** Payroll and attendance reports are wrong; teachers cannot see their own attendance if you rely on this.

### Teacher evaluations / RecitationReview / WeeklyEvaluation

- **What it is:** RecitationReview = one-off review; WeeklyEvaluation = weekly report per student (ratings, level, mistakes, goals, status workflow draft→submitted→approved).
- **Key fields (WeeklyEvaluation):** studentId, teacherId, week dates, level, ratings, strengths/weaknesses, structuredMistakes, status, reviewedBy, adminFeedback.
- **Who creates/updates:** Teachers (drafts and submit); admins review/approve/reject.
- **Depends on:** Student, Teacher. Can drive assignments or homework.
- **If this breaks:** Weekly progress tracking and accountability are lost.

### Payments / Payroll

- **What it is:** No separate Payment collection found in server.js. **Payroll** is an embedded object on Teacher (hourly rate, days, currency, monthly salary, payment type). Student has `paymentStatus` and optional `payments` array on the frontend/context; backend Student schema has `paymentStatus`, `tuitionFee`, `registrationAmount`.
- **Who creates/updates:** Admins when editing teacher or student. Teacher payroll is shown in Teacher Profile and Teacher Payroll UI; payment history in UI appears to be mock or derived (e.g. from payroll), not a separate table.
- **If this breaks:** Salary and payment status display is wrong; no separate audit trail of payments unless you add one.

### Chat / Messages

- **What it is:** Conversations (Conversation) and Messages (Message). Conversation has type (teacher_student, pair_teacher), participants (always includes admin), context (studentId/pairId). Message has sender, body, attachments, read receipts, redaction (admin).
- **Who creates/updates:** Teachers, students, admins (within conversation). Backend routes use message permission middleware and participant checks.
- **Depends on:** User, Teacher, Student, TeacherPair (for pair conversations).
- **If this breaks:** Internal communication between teachers, students, and admin is lost.

### Notifications

- **What it is:** Unified Notification model (recipientId, recipientRole, type, entityType, entityId, read, etc.). Replaces AdminNotification and TeacherNotification for new flows. Types include ticket_created, assignment_submitted, weekly_evaluation_submitted, etc.
- **Who creates:** Backend when events occur (e.g. ticket created, assignment submitted). Who reads: Admins and teachers via notification endpoints (authenticated).
- **If this breaks:** Users miss important updates; no data loss of core entities, but UX degrades.

### Student Personal Mushaf (StudentPersonalMushaf)

- **What it is:** One document per student: list of all mistakes ever marked for them (page, surah, ayah, wordIndex, position, type, note, ticketId, workflowStep, timeline). Used so students and teachers see a single history of mistakes across tickets/assignments.
- **Key fields:** studentId, studentName, mistakes (array of mistake objects).
- **Who creates/updates:** Backend when a ticket is approved (mistakes merged in); also when a teacher adds a mistake during assessment (addMistakeToPersonalMushaf API). Read/add endpoints are protected by authenticateToken + validateStudentOwnership.
- **Depends on:** Student. Used by Mushaf review UI and assignment/mistake views.
- **If this breaks:** Mistake history is wrong or missing; teachers and students see incomplete picture.

### RecitationSession (in backend/schemas/recitationSession.js)

- **What it is:** One session of live recitation (e.g. for a ticket): expected text, transcript segments, detected mistakes, fluency metrics, link to ticketId and student/teacher.
- **Who creates/updates:** Backend when live recitation is used (Socket.IO + processing). Who reads: Backend and frontend for that session.
- **If this breaks:** Live recitation metrics and reports for that session are lost; ticket flow can still work without it.

### Others (short)

- **MistakeLibrary, AiPhrase, AiPhraseCategory:** Reference data for mistake types and AI suggestions; used in forms and tickets. If broken, dropdowns and suggestions fail.
- **QaidahMark, QaidahPageLearning, QaidahStudentLearning:** Qaidah progress and learning objectives. If broken, Qaidah module and homework suggestions are wrong.
- **PdfDocument, PdfAnnotation:** PDF library and annotations for homework. If broken, PDF homework and annotations are lost.
- **SabqAudioClip:** Audio clips per mistake (sabq). If broken, audio feedback for sabq mistakes is lost.
- **ActivityLog:** Login and security events. If broken, you lose audit trail only; core data unchanged.
- **TeacherPair, PairStudent, PairDailyReport, PairTeacherMessage:** Pair-teaching and reporting. If broken, that workflow is affected only.

---

## SECTION 4 — MODULE-BY-MODULE AUDIT

### Authentication & Roles

- **What it solves:** Who can log in and what they can do (role + permissions).
- **Frontend:** Login page, AuthContext (token, user, role), protected routes, DashboardRouter (role → dashboard).
- **Backend:** POST /api/auth/login (rate-limited), JWT issue, authenticateToken, requirePermission, validateXxxOwnership.
- **Schemas:** User, Admin, Teacher (permissions).
- **Flow:** Login → JWT → stored in memory/localStorage → sent as Bearer on every API call; Socket.IO sends token in handshake.
- **What could go wrong:** Default or weak JWT secret; token not validated on every sensitive route; permission version not updated when permissions change (old tokens still valid); lockout not applied.
- **Severity:** **High** — everything depends on auth and permissions.

### Admin Dashboard

- **What it solves:** Central place for admins to see stats, manage users, tickets, assignments, attendance, messages, notifications.
- **Frontend:** SuperAdminDashboard, AdminDashboard, lazy-loaded; permission-based menu and actions.
- **Backend:** Many GET/POST/PUT/DELETE under /api (users, students, teachers, tickets, assignments, attendance, etc.) with authenticateToken and requirePermission.
- **Schemas:** All main ones.
- **Flow:** Admin opens dashboard → fetches lists and stats → performs actions → backend checks permission and ownership where applicable.
- **What could go wrong:** A route missing requirePermission or ownership check; superadmin vs admin confusion; list endpoints returning too much data (filtering by permission is critical).
- **Severity:** **High** — wrong permission or ownership can expose or mutate data.

### Student Portal

- **What it solves:** Students see own profile, assignments, tickets, personal Mushaf, homework submission.
- **Frontend:** StudentRouter, StudentDashboard, StudentAssignments, StudentProfile, etc.; student sees only own data in UI.
- **Backend:** GET /api/assignments/me, GET /api/assignments/student/:studentId (validateStudentOwnership), GET /api/students/:studentId/personal-mushaf (validateStudentOwnership), GET /api/tickets (filtered by role), homework submit.
- **Schemas:** Student, Assignment, Ticket, StudentPersonalMushaf.
- **Flow:** Student logs in → dashboard → assignments/tickets loaded for their studentId; ownership enforced by backend.
- **What could go wrong:** Any API that takes studentId from URL or body and does not enforce ownership could let one student see another’s data. validateStudentOwnership must be on every student-scoped route.
- **Severity:** **High** — student data isolation is mandatory.

### Teacher Portal

- **What it solves:** Teachers see assigned students, tickets assigned to them, run recitation review (Mushaf + mistakes), submit tickets, view own attendance and payroll.
- **Frontend:** TeacherDashboard, TeacherTicketReview, MushafReviewPage, TeacherAttendanceView, TeacherProfile, TeacherPayroll.
- **Backend:** GET /api/tickets/teacher/:teacherId (should be restricted to self or admin), GET /api/assignments/me, POST /api/tickets/:id/start, POST /api/tickets/:id/submit (with inline ownership), teacher attendance (validateTeacherOwnership for own), personal-mushaf and mistakes (only for assigned students).
- **Schemas:** Teacher, Ticket, Assignment, Student, StudentPersonalMushaf.
- **Flow:** Teacher opens ticket → starts → marks mistakes on Mushaf → submits; backend must ensure only assigned teacher (or admin) can submit.
- **What could go wrong:** A teacher could submit or see another teacher’s ticket if ownership is not enforced on submit and on GET ticket by id. In code, submit does inline ownership (assigned teacher or assigned to student); GET /api/tickets/:id uses validateTicketOwnership.
- **Severity:** **High** — wrong teacher must not submit or see another’s tickets.

### Assignments

- **What it solves:** One place per student for classwork (sabq/sabqi/manzil) and homework; linked to tickets when admin approves.
- **Frontend:** AssignmentManagement, EnhancedAssignmentForm, StudentAssignments, homework submit and grade UI.
- **Backend:** GET/POST/PUT/DELETE /api/assignments, GET /api/assignments/student/:studentId, GET /api/assignments/:id; validateAssignmentOwnership or validateStudentOwnership; POST submit-homework, POST grade-homework (requirePermission).
- **Schemas:** Assignment (studentId, classwork, homework, mushafMistakes, fromTicketId, status).
- **Flow:** Admin/teacher creates or updates assignment; when ticket is approved, assignment is updated and mistakes merged; student submits homework; teacher/admin grades.
- **What could go wrong:** Assignment and ticket get out of sync (e.g. approve ticket but assignment update fails); status desync; wrong student’s assignment returned if ownership is missing.
- **Severity:** **High** — assignment is the single source of “what to do” and “what was done” for the student.

### Attendance (Student & Teacher)

- **What it is:** Teacher attendance is implemented (TeacherAttendance); student attendance not found as a dedicated collection in the audited schemas.
- **Frontend:** TeacherAttendanceManagement, TeacherAttendanceView.
- **Backend:** POST/GET /api/teacher-attendance, validateTeacherOwnership for teacher’s own view, requirePermission('canManageAttendance') for create/update/delete.
- **Schemas:** TeacherAttendance.
- **Flow:** Admin records teacher attendance; can share with teacher; teacher sees own if shared.
- **What could go wrong:** Teacher seeing another teacher’s attendance if ownership is missing; duplicate records per teacher/date (schema has unique index to prevent).
- **Severity:** **Medium** — payroll and compliance depend on it.

### Ticket System

- **What it solves:** Sabq/Sabqi/Manzil workflow: create → assign teacher → teacher reviews (Mushaf + mistakes) → submit → admin approves → data sent to assignment and Personal Mushaf.
- **Frontend:** Ticket creation, TeacherTicketReview, MushafReviewPage, Admin ticket review and approve.
- **Backend:** Full CRUD + POST start, submit, approve-send, reassign, bulk-delete; ownership enforced on GET/update/delete and inline on submit.
- **Schemas:** Ticket, Assignment, StudentPersonalMushaf.
- **Flow:** See Section 5.
- **What could go wrong:** Double submit if frontend doesn’t disable button; assignment or Personal Mushaf update failing silently after approve; wrong teacher submitting (prevented by current ownership logic).
- **Severity:** **High** — core academy workflow.

### Interactive Mushaf

- **What it solves:** Show Quran pages with word-level layout; let teacher (or admin) mark mistakes on words; persist mistakes to ticket and/or Personal Mushaf.
- **Frontend:** Mushaf package (WordByWordPage, InteractiveMushaf), MushafReviewPage, StudentPersonalMushaf, TeacherPersonalMushaf; layout loaded from public/data SQLite/JSON or external API.
- **Backend:** GET /api/students/:studentId/personal-mushaf (and filter), POST add mistake to personal-mushaf; ticket submit/approve writes mistakes to assignment and Personal Mushaf.
- **Schemas:** StudentPersonalMushaf, Ticket.mistakes, Assignment.mushafMistakes.
- **Flow:** Load page layout → user clicks word → choose mistake type → save (to ticket in review flow, or to Personal Mushaf in assessment flow). On refresh, persisted data is re-fetched from API; in-session only state is lost if not saved.
- **What could go wrong:** Layout not loading (SQLite/JSON missing or API down); mistakes not saved before refresh (user loses current session if they didn’t submit); wrong studentId on personal-mushaf API would write to wrong student (prevented by validateStudentOwnership).
- **Severity:** **High** — core teaching and review experience.

### Mistake Marking

- **What it solves:** Record type and position of mistake (and optional audio) on the Mushaf; show in ticket, assignment, and Personal Mushaf.
- **Frontend:** Same as Interactive Mushaf; mistake type picker, optional audio upload.
- **Backend:** Mistake arrays on Ticket and Assignment; StudentPersonalMushaf; POST /api/mistakes/audio (authenticateToken); POST add mistake to personal-mushaf (authenticateToken + validateStudentOwnership).
- **Flow:** Mark → optional audio → save to ticket or Personal Mushaf; on approve, ticket mistakes are merged to assignment and Personal Mushaf.
- **What could go wrong:** Audio or mistake written to wrong student if ownership is missing (currently protected); large payloads or missing indexes could slow saves.
- **Severity:** **High** — data integrity for religious feedback.

### Chat (Socket.IO + Messages)

- **What it solves:** Teacher–student and pair-teacher conversations; admin in the loop; attachments.
- **Frontend:** MessagesPage, ProfessionalMessagesPage, conversation/message components.
- **Backend:** routes/messages.js (and possibly mounts in server.js); Conversation and Message models; permission checks and participant validation.
- **Schemas:** Conversation, Message.
- **Flow:** User opens conversations → loads list and messages via REST; Socket.IO used for real-time notifications (e.g. permissions_updated), not for full chat persistence in the audited code.
- **What could go wrong:** Participant or permission check missing could expose conversations; file upload path traversal (backend validates path within uploads).
- **Severity:** **Medium** — trust and privacy.

### Payments

- **What it is:** Payroll is on Teacher; paymentStatus (and possibly payments array) on Student; no separate Payment collection in backend. Frontend shows payroll and mock or derived payment history.
- **Severity:** **Low** for data breach (no central payment DB); **Medium** for business if you rely on this for real payments — then you need a proper payment/audit trail.

### Payroll

- **What it is:** Embedded in Teacher (hourly rate, days, currency, monthly salary). Shown in TeacherProfile and TeacherPayroll; admins set it when creating/editing teachers.
- **Severity:** **Medium** — correct display and access control (teachers see own only).

### Reports

- **What it is:** Analytics and exports likely built on top of assignments, attendance, evaluations (no dedicated “Report” schema found). Depends on canViewReports / canExportReports.
- **Severity:** **Medium** — wrong permission could leak aggregated data.

### Email / Notifications

- **What it is:** Nodemailer for password reset and possibly emails; in-app notifications via Notification model and notification endpoints; Socket.IO for real-time push (e.g. ticket:updated).
- **Backend:** Notification creation on events; GET/read endpoints with auth.
- **Severity:** **Low** for stability; **Medium** if notification content or recipient is wrong (e.g. wrong entityId).

---

## SECTION 5 — INTERACTIVE MUSHAF & TICKET FLOW (DEEP DIVE)

### Where Mushaf data comes from

- **Layout (page → lines → words):**  
  - **Primary:** Local SQLite in `public/data/` (e.g. `qpc-v1-15-lines.db`, `word by word.db`, `layouts/qpc-v1-15-lines.db`) and JSON (e.g. `words/word_by_word.json`). The mushaf package loads these to get word positions per page.  
  - **Fallback:** External API (e.g. `https://qul.tarteel.ai/layouts/...`) or backend MongoDB API (e.g. fetchPageLines(pageNumber, 'v4')) when local files are not available.  
- **Images:** Page backgrounds can come from the same external host (e.g. qul.tarteel.ai) or local assets.

### How page → words → positions work

- For a given page number, the app loads “lines” (each line has first_word_id, last_word_id, surah, etc.) and “words” (id, surah, ayah, text). Words are then mapped to positions (x, y or similar) for hit-testing clicks. So: **page number → lines from DB/API → words from DB/API → coordinates → overlay on page image.**

### How mistakes are stored

- **During a ticket review:** Mistakes are held in React state and sent in the ticket **submit** payload (array of { type, page, surah, ayah, wordIndex, position, note, audioUrl, ... }). Backend saves them on the Ticket document.
- **When admin approves (approve-send):** Backend copies ticket mistakes to the Assignment’s mushafMistakes and merges them into StudentPersonalMushaf. So **three places:** Ticket (submitted), Assignment (after approve), StudentPersonalMushaf (lifetime view).
- **Direct to Personal Mushaf:** When a teacher marks a mistake in “assessment” mode (not ticket flow), frontend calls POST add mistake to personal-mushaf; backend appends to that student’s StudentPersonalMushaf (with validateStudentOwnership).

### How sessions persist (refresh, pause, resume)

- **Ticket in progress:** If the teacher does **not** submit, mistakes exist only in browser state. **Refresh = lose current session mistakes** for that ticket. After **submit**, they are in the Ticket and survive refresh.
- **Personal Mushaf:** Once mistakes are saved (via submit then approve, or via add-mistake API), they are in MongoDB; refresh just re-fetches them.
- **Assignment:** Mistakes are stored on the assignment document; they persist and are shown when viewing that assignment.

### How tickets connect to assignments

- Ticket has optional **sentToAssignmentId** and **sentAt**. When admin clicks “Approve & Send”:
  1. Backend finds or creates an assignment for that student (optionally linking fromTicketId).
  2. It updates the assignment with ticket review data (classwork, mistakes, etc.) via `updateAssignmentFromTicket`.
  3. It sets ticket status to `sent_to_assignment`, sets `sentToAssignmentId` and `sentAt`.
  4. It merges ticket mistakes into StudentPersonalMushaf.
- So: **one ticket → one assignment (per student)**; the same assignment can be updated by multiple approvals if you reuse it.

### What happens on Submit / Approve / Reject

- **Submit (teacher):**  
  - Backend checks ticket exists, then **ownership** (admin, or assigned teacher, or teacher assigned to that student).  
  - Updates ticket: status = submitted, teacherComment, mistakes, recitationRange, recording, etc.  
  - If ticket already has sentToAssignmentId, it also updates that assignment with the new review data (so assignment stays in sync).  
  - Emits Socket.IO ticket:updated.

- **Approve (admin):**  
  - requirePermission('canApproveTickets') and validateTicketOwnership.  
  - Find or create assignment, updateAssignmentFromTicket, merge mistakes into assignment and into StudentPersonalMushaf, set ticket to sent_to_assignment, send Socket.IO events.

- **Reject:**  
  - Not fully traced in this audit; typically status or a “rejected” state and possibly a reason. No assignment or Personal Mushaf update.

### What must NEVER break in this flow

1. **Ownership on submit** — only the assigned teacher (or admin) can submit; inline check must remain.
2. **Ownership on approve** — only admins with canApproveTickets; validateTicketOwnership ensures they act on a valid ticket they’re allowed to see.
3. **Assignment update on submit and approve** — if ticket has sentToAssignmentId, assignment must be updated so status and classwork never desync.
4. **Personal Mushaf merge on approve** — mistakes must be merged without duplicating; failure should be logged but must not break the approve response.
5. **Student-scoped mistake APIs** — GET/POST personal-mushaf must always use validateStudentOwnership so mistakes are never read or written for the wrong student.

---

## SECTION 6 — SECURITY & DATA PROTECTION AUDIT

### Authentication enforcement

- **Login:** Rate-limited; credentials checked; JWT issued with userId, email, role, permissions (and permissionsVersion). Account lockout is supported (failedLoginAttempts, accountLockedUntil).
- **REST:** authenticateToken is applied on almost all /api routes (except public registration and possibly health). It validates JWT and sets req.user. So: **enforced in practice**; any route added without authenticateToken would be an exception and a risk.
- **Socket.IO:** io.use() verifies JWT on connect and attaches user; unauthenticated connections are rejected. So: **enforced**.

### Role-based access control

- **Super admin:** Bypasses requirePermission (has all).  
- **Admin:** requirePermission('canXxx') loads permissions from Admin document (or from token if fresh).  
- **Teacher:** requirePermission checks Teacher permissions (or token).  
- **Student:** No permission flags; access is by ownership only (own data).  
- **Shared list:** backend/shared/permissions.js (and requirePermission) ensure only valid keys are used. So: **RBAC is implemented**; risk is missing requirePermission on a sensitive route or wrong key.

### Ownership validation (VERY IMPORTANT)

- **validateStudentOwnership:** Used on routes that take studentId (e.g. GET/POST personal-mushaf, assignments/student/:studentId). Ensures: admin/superadmin → allow; student → only own; teacher → only assigned students.  
- **validateTeacherOwnership:** Used for teacher-scoped routes (e.g. teacher attendance for :teacherId). Teacher sees only self; admin sees all.  
- **validateAssignmentOwnership:** Used for GET/PUT/DELETE assignment by id; resolves assignment then checks student access (admin / own student / teacher assigned to that student).  
- **validateTicketOwnership:** Used for GET/PUT/DELETE ticket by id and for approve-send. Ensures: admin → allow; student → own tickets only; teacher → tickets assigned to them or for assigned students.  
- **POST /api/tickets/:id/submit** does **not** use validateTicketOwnership middleware but **does** implement the same logic inline (admin, or assigned teacher, or teacher assigned to student). So: **submit is protected**; keeping this logic in sync with validateTicketOwnership is important.

**Answer: “Can the wrong person submit, view, or delete something?”**  
- If every sensitive route consistently uses authenticateToken + requirePermission (where applicable) + the correct validateXxxOwnership, then **no**. The main residual risk is a **new or overlooked route** that misses one of these, or a bug in the ownership logic (e.g. wrong ID comparison). The audit did not find an obvious route where a wrong teacher can submit another’s ticket or a student can see another’s data, **given current code**.

### File upload safety

- **Multer / streaming:** Used for recordings and message attachments; destination is under backend/uploads (mistakes, recordings, sabq-audio, messages).  
- **Path traversal:** Code checks that the resolved path stays under the uploads directory before writing.  
- **Size limits:** Applied (e.g. 10MB for mistake audio).  
- **Auth:** Routes use authenticateToken (and permission/ownership where applicable). So: **reasonably safe**; remaining risk is allowed file types and malware scanning (not verified in this audit).

### Public vs private data exposure

- **Public:** POST /api/public/student-registration (no auth) — intended for parents to request registration; must be rate-limited and validated so it doesn’t become a spam or data leak.  
- **Private:** All other /api routes checked use authenticateToken and often ownership. **Static files:** /uploads served by Express; if uploads are under the app, only authenticated users who get a URL (e.g. in ticket or message) can access them; there is no per-file auth — so **whoever has the URL can open the file**. That’s acceptable if URLs are only shown to authorized users (e.g. teacher/student who owns the ticket).

### Socket security

- **Auth:** Socket handshake requires valid JWT; rooms are joined by role and userId (student:userId, teacher:userId, admins).  
- **join_room:** Server validates that the requested room matches the user’s role and id; otherwise it rejects. So: **Socket.IO is locked down** to authenticated users and correct rooms.

---

## SECTION 7 — RISK ANALYSIS (OWNER-LEVEL)

### HIGH RISK (must fix immediately)

1. **Data loss**  
   - **Uploads:** Files in `backend/uploads/` are on the server disk. If the server or container is recreated without backing up this folder (or moving uploads to cloud storage), **all recordings and message attachments are lost**.  
   - **Mitigation:** Back up uploads regularly and/or store uploads in persistent storage (e.g. S3) and keep only references in DB.

2. **Unauthorized actions**  
   - **Missing middleware on one route:** Any new or old route that allows changing data without authenticateToken + ownership (or permission) could let someone else submit, view, or delete data.  
   - **Mitigation:** Checklist (Section 9) and any new endpoint must be reviewed for auth + ownership/permission.

3. **Corrupt or inconsistent records**  
   - **Ticket approved but assignment/Personal Mushaf update fails:** Ticket status could be “sent_to_assignment” while the assignment or Personal Mushaf is missing mistakes.  
   - **Mitigation:** Ensure approve handler treats assignment and Personal Mushaf update as critical (retry or queue); log failures and alert.

4. **Legal / trust exposure**  
   - **Student data:** If a bug or misconfiguration allowed one student to see another’s assignments, tickets, or personal Mushaf, that would be a serious trust and possibly legal issue.  
   - **Mitigation:** Keep validateStudentOwnership on every student-scoped route; do not remove it for “convenience.”

### MEDIUM RISK

1. **Fragile code**  
   - **Single 19k+ line server.js:** Hard to maintain; one bad edit can break many features. No need to rewrite; consider extracting routes/schemas into separate files over time without changing API or behavior.

2. **Single points of failure**  
   - **MongoDB:** If the database is down, the app is down.  
   - **Uploads on one server:** If the server dies, uploads are lost unless backed up or stored elsewhere.

3. **Performance**  
   - Large lists (students, tickets, assignments) without pagination or with heavy payloads can slow down the UI and API. Indexes exist on main schemas; adding limits and pagination where missing would reduce risk.

### LOW RISK

1. **Code style**  
   - Inconsistent naming or style does not directly affect safety; can be improved gradually.

2. **Nice-to-have refactors**  
   - Splitting server.js, adding more tests, or moving layout to a CDN are improvements, not urgent for safety.

---

## SECTION 8 — FIX PLAN (NO REWRITE)

### Phase 1 — Safety & Data Integrity (minimal changes, no refactors, backend-only where possible)

| What to fix | Why | Effort |
|-------------|-----|--------|
| **Persist uploads** | Avoid losing all recordings and attachments on redeploy or server replace. | Medium (e.g. configure S3 or external volume and move write path; or document and automate backup of `backend/uploads/`). |
| **Ensure JWT secret** | No default or weak secret in production. | Small (env check on startup; strong secret in production env). |
| **Double-check every student-scoped route** | Ensure each has authenticateToken + validateStudentOwnership (or equivalent). | Small (grep and manual check). |
| **Approve flow robustness** | On approve-send, if assignment or Personal Mushaf update fails, log and consider retry; do not leave ticket “approved” with assignment out of sync. | Medium (add error handling and optional retry; keep current behavior otherwise). |

### Phase 2 — Structural Stability (reduce fragility, improve boundaries, still no rewrites)

| What to fix | Why | Effort |
|-------------|-----|--------|
| **Extract routes/schemas from server.js** | Easier to review and safer edits; no change to URLs or behavior. | Large (incremental extraction; keep same middleware and logic). |
| **Add pagination/limits to list endpoints** | Avoid timeouts and heavy payloads on large datasets. | Small–Medium (add limit/skip or cursor; keep response shape compatible). |
| **Document which routes are public** | Only /api/public/... (and health if any); everything else must require auth. | Small (one list in a doc or comment). |

### Phase 3 — UX & Reliability (user protection, warnings, edge cases)

| What to fix | Why | Effort |
|-------------|-----|--------|
| **Warn before refresh on Mushaf review** | “You have unsaved mistakes. Leave anyway?” so teachers don’t lose work by accident. | Small (frontend beforeunload or route guard). |
| **Clear error messages for lockout / wrong password** | Users understand why they can’t log in. | Small (message text and optional frontend copy). |
| **Assignment status desync detection** | Optional admin view or script: “tickets marked sent_to_assignment but assignment missing mistakes” to catch rare failures. | Medium (script or admin-only report). |

---

## SECTION 9 — ACCEPTANCE CHECKLIST

Use this to verify that critical behaviors still hold after any change or deployment:

- [ ] **Wrong teacher cannot submit ticket**  
  - Log in as Teacher A; open a ticket assigned to Teacher B (if UI allows); try to submit. Must be rejected (403 or equivalent).

- [ ] **Refresh during Mushaf does not lose work that was already saved**  
  - Submit a ticket with mistakes → refresh page → reopen ticket or view assignment/Personal Mushaf. Mistakes must still be there.

- [ ] **Uploaded files persist after redeploy**  
  - Upload a recording or message attachment; note the URL; redeploy (or simulate new container); hit the same URL. File must still be served (or you have a documented backup/restore).

- [ ] **Assignment status cannot desync**  
  - Approve a ticket and send to assignment; open that assignment. Classwork and mistakes from the ticket must appear on the assignment.

- [ ] **Student cannot access another student’s data**  
  - As Student A, try to call GET /api/assignments/student/:studentB_id or GET /api/students/:studentB_id/personal-mushaf with a valid token for A. Must be 403.

- [ ] **Teacher cannot see another teacher’s ticket (when not assigned)**  
  - As Teacher A, request GET /api/tickets/:id for a ticket assigned only to Teacher B. Must be 403 (or 404 if you hide existence).

- [ ] **Login lockout after N failures**  
  - Wrong password N times (from same IP); next attempt must be blocked or delayed as configured.

- [ ] **Super admin can still access everything**  
  - Log in as superadmin; open admin dashboard, teachers, students, tickets, assignments. All accessible.

---

## SECTION 10 — FINAL OWNER SUMMARY

### Is the system safe to operate today?

**Yes, with caveats.**  
Authentication, roles, and ownership checks are in place on the audited routes. Students and teachers are restricted to their own or assigned data. The main operational risk is **uploaded files**: they live on the server disk, so **back up the uploads folder** or move uploads to persistent storage so a redeploy or server replacement doesn’t wipe them.

### Is it safe to add new features now?

**Yes, if you follow the same rules.**  
Every new API that touches students, teachers, assignments, or tickets must:  
1) Use **authenticateToken**,  
2) Use **requirePermission** when the action is permission-gated, and  
3) Use the correct **validateXxxOwnership** (or equivalent logic) so the wrong person cannot view or change data.  
Do **not** add a route that “skips auth for convenience” or “assumes only admins will call it.”

### What is the single most dangerous flaw?

**Loss of uploaded files (recordings and attachments)** if the server or container is replaced without persisting `backend/uploads/`. That’s a data loss and trust issue. Second is **any new or old route that misses auth or ownership** — one such route can expose or corrupt data.

### What should NEVER be touched without care?

1. **Ownership validation logic** (validateStudentOwnership, validateTicketOwnership, etc.) — do not remove or relax it to “fix” a bug; fix the bug (e.g. correct ID or role) instead.  
2. **Ticket submit and approve flow** — especially the link from ticket → assignment and ticket → StudentPersonalMushaf. Any change there must preserve “only assigned teacher (or admin) can submit” and “approve always updates assignment and Personal Mushaf.”  
3. **JWT secret and auth middleware** — changing the secret invalidates all existing sessions; adding routes without authenticateToken can open the door to unauthorized access.  
4. **Database collection and field names** — the audit assumed no renames; renaming APIs or DB fields can break the running app and any external tools or backups.

---

**End of audit.**  
This document is a snapshot for the owner: what exists, how it’s structured, where the risks are, and what to fix first without rewriting the application.
