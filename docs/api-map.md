# API Map - Source of Truth

**Last Updated:** 2026-01-09  
**Status:** ✅ Audit Complete - Review Required

This document is the **ONLY source of truth** for all API endpoints in the Umar Academy Portal.

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Users](#users)
3. [Students](#students)
4. [Teachers](#teachers)
5. [Admins](#admins)
6. [Assignments](#assignments)
7. [Tickets](#tickets)
8. [Recitation Reviews](#recitation-reviews)
9. [Notifications](#notifications)
10. [Weekly Evaluations](#weekly-evaluations)
11. [Teacher Attendance](#teacher-attendance)
12. [Listening Sessions](#listening-sessions)
13. [Personal Mushaf](#personal-mushaf)
14. [Quran API](#quran-api)
15. [Qaidah API](#qaidah-api)
16. [PDF Documents](#pdf-documents)
17. [AI Features](#ai-features)
18. [Mistake Library](#mistake-library)
19. [Messaging System](#messaging-system)
20. [Email](#email)
21. [Activity Logs](#activity-logs)
22. [Health & System](#health--system)

---

## Authentication & Authorization

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| POST | `/api/auth/login` | ❌ No | User login | Rate limited |
| POST | `/api/auth/password-reset-request` | ❌ No | Request password reset | Rate limited |
| POST | `/api/auth/password-reset` | ❌ No | Reset password | Rate limited |
| POST | `/api/auth/request-unlock` | ❌ No | Request account unlock | |

---

## Users

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/users` | ❌ No | Get all users | Backward compatibility |
| GET | `/api/users/:id` | ❌ No | Get user by ID | |
| GET | `/api/users/:id/details` | ✅ Yes | Get user details | |
| GET | `/api/users/:id/login-history` | ✅ Yes | Get user login history | |
| GET | `/api/users/locked` | ✅ Yes | Get locked users | |
| POST | `/api/users` | ✅ Yes | Create user | Rate limited |
| PUT | `/api/users/:id` | ✅ Yes | Update user | |
| PUT | `/api/users/:id/password` | ✅ Yes | Update user password | |
| PUT | `/api/users/:id/settings` | ✅ Yes | Update user settings | |
| POST | `/api/users/:id/unlock` | ✅ Yes | Unlock user account | |
| DELETE | `/api/users/:id` | ❌ No | Delete user | |

---

## Students

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/students` | ❌ No | Get all students | |
| POST | `/api/students` | ❌ No | Create student | |
| PUT | `/api/students/:id` | ❌ No | Update student | Updates teacher assignedStudents arrays |
| PATCH | `/api/students/:id/recitation` | ❌ No | Update recitation profile | |
| DELETE | `/api/students/:id` | ❌ No | Delete student | |
| GET | `/api/students/:studentId/homework-suggestions` | ❌ No | Get homework suggestions | |
| GET | `/api/students/:studentId/pdf-homework` | ❌ No | Get PDF homework | |
| GET | `/api/students/:studentId/personal-mushaf` | ❌ No | Get personal mushaf | |
| GET | `/api/students/:studentId/personal-mushaf/filter` | ❌ No | Filter personal mushaf | |
| POST | `/api/students/:studentId/personal-mushaf/mistakes` | ❌ No | Add mistakes to personal mushaf | |

---

## Teachers

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/teachers` | ❌ No | Get all teachers | Supports `?sync=true` query |
| GET | `/api/teachers/:teacherId/weekly-evaluations` | ✅ Yes | Get teacher's weekly evaluations | |
| GET | `/api/teachers/count` | ❌ No | Get teacher count | |
| GET | `/api/teachers/sync-status` | ❌ No | Get sync status | |
| GET | `/api/teachers/sync-assigned-students` | ❌ No | Manual sync trigger | Also POST |
| POST | `/api/teachers/sync-assigned-students` | ❌ No | Manual sync trigger | Also GET |
| POST | `/api/teachers` | ❌ No | Create teacher | |
| PUT | `/api/teachers/:id` | ❌ No | Update teacher | |

---

## Admins

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/admins` | ❌ No | Get all admins | |
| POST | `/api/admins` | ✅ Yes | Create admin | |
| PUT | `/api/admins/:id` | ✅ Yes | Update admin | |

---

## Assignments

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/assignments` | ❌ No | Get all assignments | |
| GET | `/api/assignments/:id` | ❌ No | Get assignment by ID | |
| GET | `/api/assignments/student/:studentId` | ❌ No | Get assignments for student | |
| POST | `/api/assignments` | ❌ No | Create assignment | |
| PUT | `/api/assignments/:id` | ❌ No | Update assignment | |
| DELETE | `/api/assignments/:id` | ❌ No | Delete assignment | |
| POST | `/api/assignments/:id/submit-homework` | ❌ No | Submit homework | |
| POST | `/api/assignments/:id/grade-homework` | ❌ No | Grade homework | |
| POST | `/api/assignments/upload-homework-file` | ❌ No | Upload homework file | ❌ MISSING - Called by EnhancedAssignmentForm.tsx |

---

## Tickets

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/tickets` | ❌ No | Get all tickets | |
| GET | `/api/tickets/:id` | ❌ No | Get ticket by ID | |
| GET | `/api/tickets/:id/verify-assignment` | ❌ No | Verify assignment | |
| GET | `/api/tickets/pending-review` | ❌ No | Get pending review tickets | |
| GET | `/api/tickets/previous-reports/:studentId/:type` | ❌ No | Get previous reports | |
| GET | `/api/tickets/teacher/:teacherId` | ❌ No | Get tickets for teacher | |
| POST | `/api/tickets` | ✅ Yes | Create ticket | |
| POST | `/api/tickets/:id/start` | ❌ No | Start ticket | |
| POST | `/api/tickets/:id/submit` | ❌ No | Submit ticket | |
| POST | `/api/tickets/:id/approve-send` | ❌ No | Approve and send ticket | |
| POST | `/api/tickets/:id/reassign` | ❌ No | Reassign ticket | |
| POST | `/api/tickets/fix-missing-assignment-ids` | ❌ No | Fix missing assignment IDs | |
| POST | `/api/tickets/bulk-delete` | ❌ No | Bulk delete tickets | ❌ MISSING - Called by BackendDataContext.tsx |
| POST | `/api/tickets/:ticketId/assign-next` | ❌ No | Assign next step | ❌ MISSING - Called by BackendDataContext.tsx |
| POST | `/api/tickets/:ticketId/approve` | ❌ No | Approve ticket | ❌ MISSING - Called by BackendDataContext.tsx |
| POST | `/api/tickets/:ticketId/approve-and-advance` | ❌ No | Approve and advance | ❌ MISSING - Called by BackendDataContext.tsx |
| POST | `/api/tickets/:ticketId/skip-to-finalize` | ❌ No | Skip to finalize | ❌ MISSING - Called by BackendDataContext.tsx |
| POST | `/api/tickets/:ticketId/finalize` | ❌ No | Finalize ticket | ❌ MISSING - Called by BackendDataContext.tsx |
| PUT | `/api/tickets/:id` | ❌ No | Update ticket | |
| DELETE | `/api/tickets/:id` | ❌ No | Delete ticket | |

---

## Recitation Reviews

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/recitation-reviews` | ❌ No | Get all recitation reviews | |
| GET | `/api/recitation-reviews/:id` | ❌ No | Get recitation review by ID | |
| POST | `/api/recitation-reviews` | ❌ No | Create recitation review | |
| PUT | `/api/recitation-reviews/:id` | ❌ No | Update recitation review | |
| POST | `/api/recitation-reviews/:reviewId/convert-to-assignment` | ❌ No | Convert to assignment | ✅ ACTIVE - Used by AdminRecitationReview.tsx and BackendDataContext.tsx |

---

## Notifications

### Admin Notifications

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/admin-notifications` | ❌ No | Get admin notifications | |
| GET | `/api/admin-notifications/:id` | ✅ Yes | Get notification by ID | |
| POST | `/api/admin-notifications` | ❌ No | Create notification | |
| PUT | `/api/admin-notifications/:id/read` | ❌ No | Mark as read | |
| PUT | `/api/admin-notifications/read-all` | ❌ No | Mark all as read | |

### Teacher Notifications

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/teacher-notifications` | ✅ Yes | Get teacher notifications | |
| GET | `/api/teacher-notifications/:id` | ✅ Yes | Get notification by ID | |
| PUT | `/api/teacher-notifications/:id/read` | ✅ Yes | Mark as read | |
| PUT | `/api/teacher-notifications/read-all` | ✅ Yes | Mark all as read | |

---

## Weekly Evaluations

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/weekly-evaluations` | ✅ Yes | Get weekly evaluations | |
| GET | `/api/weekly-evaluations/:id` | ✅ Yes | Get evaluation by ID | |
| GET | `/api/weekly-evaluations/student/:studentId` | ✅ Yes | Get evaluations for student | |
| GET | `/api/weekly-evaluations/approved` | ✅ Yes | Get approved evaluations | |
| POST | `/api/weekly-evaluations` | ✅ Yes | Create evaluation | |
| PUT | `/api/weekly-evaluations/:id` | ✅ Yes | Update evaluation | |
| DELETE | `/api/weekly-evaluations/:id` | ❌ No | Delete evaluation | |
| POST | `/api/weekly-evaluations/:id/submit` | ✅ Yes | Submit evaluation | |
| POST | `/api/weekly-evaluations/:id/approve` | ✅ Yes | Approve evaluation | |
| POST | `/api/weekly-evaluations/:id/reject` | ✅ Yes | Reject evaluation | |
| POST | `/api/weekly-evaluations/:id/admin-feedback` | ✅ Yes | Add admin feedback | |
| POST | `/api/weekly-evaluations/:id/assign-homework` | ✅ Yes | Assign homework | |

---

## Teacher Attendance

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/teacher-attendance` | ✅ Yes | Get attendance records | |
| GET | `/api/teacher-attendance/teacher/:teacherId` | ✅ Yes | Get attendance for teacher | |
| GET | `/api/teacher-attendance/stats/:teacherId` | ✅ Yes | Get attendance stats | |
| GET | `/api/teacher-attendance/test/:teacherId` | ✅ Yes | Test endpoint | |
| POST | `/api/teacher-attendance` | ✅ Yes | Create attendance record | |
| POST | `/api/teacher-attendance/bulk` | ✅ Yes | Bulk create attendance | |
| DELETE | `/api/teacher-attendance/:id` | ✅ Yes | Delete attendance record | |

---

## Listening Sessions

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/listening-sessions/live` | ❌ No | Get live sessions | |
| GET | `/api/listening-sessions/stream` | ❌ No | Stream sessions | |
| GET | `/api/listening-sessions/history` | ❌ No | Get session history | |
| POST | `/api/listening-sessions/start` | ❌ No | Start session | |
| PATCH | `/api/listening-sessions/:id` | ❌ No | Update session | |
| POST | `/api/listening-sessions/:id/end` | ❌ No | End session | |
| DELETE | `/api/listening-sessions/:id` | ❌ No | Delete session | |
| DELETE | `/api/listening-sessions/date/:date` | ❌ No | Delete sessions by date | |

---

## Personal Mushaf

See [Students](#students) section for personal mushaf endpoints.

---

## Quran API

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/quran/chapters` | ❌ No | Get Quran chapters | |
| GET | `/api/quran/pages/:pageNumber` | ❌ No | Get page data | |
| GET | `/api/quran/pages/:pageNumber/verses` | ❌ No | Get page verses | |
| GET | `/api/quran/pages/:pageNumber/info` | ❌ No | Get page info | |
| GET | `/api/quran/pages/:pageNumber/lines` | ❌ No | Get page lines | |
| GET | `/api/quran/pages/:pageNumber/imlaei` | ❌ No | Get imlaei version | |
| GET | `/api/quran/surahs/:surahId/verses` | ❌ No | Get surah verses | |

---

## Qaidah API

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/qaidah/:studentId/:book/:page` | ❌ No | Get student page | |
| GET | `/api/qaidah/learning/:book/:page` | ❌ No | Get learning page | |
| GET | `/api/qaidah/pages/:book` | ❌ No | Get pages for book | |
| GET | `/api/qaidah/student-learning/:studentId/:book/:page/:date` | ❌ No | Get student learning | |
| GET | `/api/qaidah/student-learning/history/:studentId/:book/:page` | ❌ No | Get learning history | |
| POST | `/api/qaidah/save` | ✅ Yes | Save qaidah data | ✅ ACTIVE - Used by qaidahApi.ts and QaidahCanvas.tsx |
| DELETE | `/api/qaidah/pages/:book/:pageNumber` | ✅ Yes | Delete page | Super Admin only |

---

## PDF Documents

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/pdfs` | ❌ No | Get PDFs | |
| GET | `/api/pdfs/:id` | ❌ No | Get PDF by ID | |
| GET | `/api/pdfs/:pdfId/annotations` | ❌ No | Get annotations | |
| POST | `/api/pdfs/upload` | ✅ Yes | Upload PDF | ✅ ACTIVE - Used by pdfApi.ts and PdfManagement.tsx (Super Admin only) |
| POST | `/api/pdfs/:pdfId/annotations` | ✅ Yes | Create annotation | ✅ ACTIVE - Used by pdfApi.ts and TeacherPdfViewer.tsx (Teacher only) |
| POST | `/api/pdfs/:pdfId/annotations/assign` | ✅ Yes | Assign annotation | ✅ ACTIVE - Used by pdfApi.ts and TeacherPdfViewer.tsx (Teacher only) |
| DELETE | `/api/pdfs/:id` | ❌ No | Delete PDF | |

---

## AI Features

### AI Phrases

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/ai/phrases` | ❌ No | Get AI phrases | |
| GET | `/api/ai/phrases/categories` | ❌ No | Get categories | |
| GET | `/api/ai/suggestions` | ❌ No | Get suggestions | |
| POST | `/api/ai/phrases` | ❌ No | Create phrase | |
| POST | `/api/ai/phrases/categories` | ❌ No | Create category | |
| POST | `/api/ai/phrases/:id/use` | ❌ No | Mark phrase as used | |
| POST | `/api/ai/phrases/init-categories` | ❌ No | Initialize categories | |
| POST | `/api/ai/suggestions` | ❌ No | Get AI suggestions | |
| POST | `/api/ai/summarize` | ❌ No | Summarize text | |
| PUT | `/api/ai/phrases/:id` | ❌ No | Update phrase | |
| PUT | `/api/ai/phrases/categories/:name` | ❌ No | Update category | |
| DELETE | `/api/ai/phrases/:id` | ❌ No | Delete phrase | |
| DELETE | `/api/ai/phrases/categories/:name` | ❌ No | Delete category | |

---

## Mistake Library

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/mistake-library` | ❌ No | Get mistake library | |
| GET | `/api/mistake-library/:id` | ❌ No | Get mistake by ID | |
| GET | `/api/mistake-library/export/:format` | ❌ No | Export library | |
| POST | `/api/mistake-library` | ❌ No | Create mistake | |
| POST | `/api/mistake-library/:id/use` | ❌ No | Mark as used | |
| POST | `/api/mistakes/audio` | ❌ No | Upload audio mistake | |
| PUT | `/api/mistake-library/:id` | ❌ No | Update mistake | |
| DELETE | `/api/mistake-library/:id` | ❌ No | Delete mistake | |

---

## Messaging System

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/conversations` | ✅ Yes | Get conversations | |
| GET | `/api/conversations/:conversationId/messages` | ✅ Yes | Get messages | |
| GET | `/api/conversations/admin/stats` | ✅ Yes | Get admin stats | |
| POST | `/api/conversations` | ✅ Yes | Create conversation | |
| POST | `/api/conversations/:conversationId/messages` | ✅ Yes | Send message | |
| POST | `/api/conversations/:conversationId/messages/upload` | ✅ Yes | Upload attachment | |
| POST | `/api/conversations/:conversationId/messages/system` | ✅ Yes | Send system message | |
| PUT | `/api/conversations/:conversationId/messages/:messageId/read` | ✅ Yes | Mark message as read | |
| PUT | `/api/conversations/:conversationId/messages/mark-read` | ✅ Yes | Mark all as read | |
| PUT | `/api/conversations/:conversationId/lock` | ✅ Yes | Lock conversation | |
| PUT | `/api/conversations/:conversationId/unlock` | ✅ Yes | Unlock conversation | |
| PUT | `/api/conversations/:conversationId/messages/:messageId/redact` | ✅ Yes | Redact message | |

---

## Email

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/email/config` | ❌ No | Get email config | |
| POST | `/api/email/send` | ❌ No | Send email | |

---

## Activity Logs

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/activity-logs` | ✅ Yes | Get activity logs | Rate limited |
| GET | `/api/activity-logs/stats` | ✅ Yes | Get activity stats | Rate limited |

---

## Health & System

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/health` | ❌ No | Health check | |

---

## Public Endpoints

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| POST | `/api/public/student-registration` | ❌ No | Public student registration | |

---

## File Uploads

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| POST | `/api/recordings/upload` | ❌ No | Upload recording | |
| POST | `/api/pair-teacher-messages/upload` | ❌ No | Upload pair message file | ✅ ACTIVE - Used by messaging system |
| POST | `/api/teacher-student-messages/upload` | ❌ No | Upload teacher-student message file | ✅ ACTIVE - Used by TeacherStudentMessage.tsx |

---

## Evaluation Assignments

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/evaluation-assignments` | ✅ Yes | Get evaluation assignments | ✅ ACTIVE - Used by TeacherEvaluationAssignments.tsx |
| GET | `/api/evaluation-assignments/:id` | ✅ Yes | Get evaluation assignment by ID | ✅ ACTIVE - Used by TeacherEvaluationFlow.tsx |
| POST | `/api/evaluation-assignments/:id/start` | ✅ Yes | Start evaluation assignment | ✅ ACTIVE - Used by TeacherEvaluationFlow.tsx |
| POST | `/api/evaluation-assignments/:id/answers` | ✅ Yes | Submit evaluation answers | ✅ ACTIVE - Used by TeacherEvaluationFlow.tsx |
| POST | `/api/evaluation-assignments/:id/complete` | ✅ Yes | Complete evaluation assignment | ✅ ACTIVE - Used by TeacherEvaluationFlow.tsx |
| POST | `/api/evaluation-assignments/:id/upload` | ✅ Yes | Upload evaluation file | ✅ ACTIVE - Part of evaluation system |
| GET | `/api/evaluation-results` | ✅ Yes | Get evaluation results | ✅ ACTIVE - Used by EvaluationResultsPage.tsx and SuperAdminDashboard |
| GET | `/api/evaluations` | ✅ Yes | Get evaluations | ✅ ACTIVE - Used by TeacherEvaluationManagement.tsx |
| GET | `/api/evaluations/:id` | ✅ Yes | Get evaluation by ID | ✅ ACTIVE - Used by TeacherEvaluationManagement.tsx |
| POST | `/api/evaluations` | ✅ Yes | Create evaluation | ✅ ACTIVE - Used by TeacherEvaluationManagement.tsx |
| PUT | `/api/evaluations/:id` | ✅ Yes | Update evaluation | ✅ ACTIVE - Used by TeacherEvaluationManagement.tsx |
| DELETE | `/api/evaluations/:id` | ✅ Yes | Delete evaluation | ✅ ACTIVE - Used by TeacherEvaluationManagement.tsx |
| POST | `/api/evaluations/:id/assign` | ✅ Yes | Assign evaluation | ✅ ACTIVE - Part of evaluation system |

---

## Teacher Pairs

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/teacher-pairs` | ❌ No | Get teacher pairs | ✅ ACTIVE - Used by BackendDataContext.tsx and TeacherDashboard.tsx |
| GET | `/api/teacher-pairs/:id` | ❌ No | Get teacher pair by ID | ✅ ACTIVE - Used by BackendDataContext.tsx |
| POST | `/api/teacher-pairs` | ❌ No | Create teacher pair | ✅ ACTIVE - Used by BackendDataContext.tsx |
| PUT | `/api/teacher-pairs/:id` | ❌ No | Update teacher pair | ✅ ACTIVE - Used by BackendDataContext.tsx |
| DELETE | `/api/teacher-pairs/:id` | ❌ No | Delete teacher pair | ✅ ACTIVE - Used by BackendDataContext.tsx |

---

## Pair Students

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/pair-students` | ❌ No | Get pair students | ✅ ACTIVE - Used by BackendDataContext.tsx and TeacherDashboard.tsx |
| GET | `/api/pair-students/:id` | ❌ No | Get pair student by ID | ✅ ACTIVE - Used by BackendDataContext.tsx |
| POST | `/api/pair-students` | ❌ No | Create pair student | ✅ ACTIVE - Used by BackendDataContext.tsx |
| PUT | `/api/pair-students/:id` | ❌ No | Update pair student | ✅ ACTIVE - Used by BackendDataContext.tsx |
| DELETE | `/api/pair-students/:id` | ❌ No | Delete pair student | ✅ ACTIVE - Used by BackendDataContext.tsx |

---

## Pair Daily Reports

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/pair-daily-reports` | ❌ No | Get pair daily reports | ✅ ACTIVE - Used by BackendDataContext.tsx and PairDailyReportForm.tsx |
| GET | `/api/pair-daily-reports/:id` | ❌ No | Get pair daily report by ID | ✅ ACTIVE - Used by BackendDataContext.tsx |
| POST | `/api/pair-daily-reports` | ❌ No | Create pair daily report | ✅ ACTIVE - Used by BackendDataContext.tsx |
| PUT | `/api/pair-daily-reports/:id` | ❌ No | Update pair daily report | ✅ ACTIVE - Used by BackendDataContext.tsx |
| DELETE | `/api/pair-daily-reports/:id` | ❌ No | Delete pair daily report | ✅ ACTIVE - Used by BackendDataContext.tsx |

---

## Pair Teacher Messages

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/pair-teacher-messages` | ❌ No | Get pair teacher messages | ✅ ACTIVE - Used by BackendDataContext.tsx, TeacherDashboard.tsx, and SuperAdminDashboard.tsx |
| GET | `/api/pair-teacher-messages/:id` | ❌ No | Get pair teacher message by ID | ✅ ACTIVE - Used by BackendDataContext.tsx |
| POST | `/api/pair-teacher-messages` | ❌ No | Create pair teacher message | ✅ ACTIVE - Used by BackendDataContext.tsx |
| PUT | `/api/pair-teacher-messages/:id/read` | ❌ No | Mark message as read | ✅ ACTIVE - Used by BackendDataContext.tsx |
| PUT | `/api/pair-teacher-messages/mark-read` | ❌ No | Mark all messages as read | ✅ ACTIVE - Used by BackendDataContext.tsx |

---

## Teacher Student Messages

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/teacher-student-messages` | ❌ No | Get teacher-student messages | ✅ ACTIVE - Used by BackendDataContext.tsx, TeacherDashboard.tsx, TeacherStudentMessage.tsx, and SuperAdminDashboard.tsx |
| GET | `/api/teacher-student-messages/:id` | ❌ No | Get message by ID | ✅ ACTIVE - Used by BackendDataContext.tsx |
| POST | `/api/teacher-student-messages` | ❌ No | Create teacher-student message | ✅ ACTIVE - Used by BackendDataContext.tsx |
| PUT | `/api/teacher-student-messages/:id/read` | ❌ No | Mark message as read | ✅ ACTIVE - Used by BackendDataContext.tsx |
| PUT | `/api/teacher-student-messages/mark-read` | ❌ No | Mark all messages as read | ✅ ACTIVE - Used by BackendDataContext.tsx |

---

## Tests

| Method | Route | Auth Required | Purpose | Notes |
|--------|-------|---------------|---------|-------|
| GET | `/api/tests/:id` | ✅ Yes | Get test by ID | ✅ ACTIVE - Referenced in SuperAdminDashboard.tsx |
| GET | `/api/tests/:id/pdf` | ✅ Yes | Get test PDF | ✅ ACTIVE - Part of tests system |
| GET | `/api/tests/student/:studentId` | ✅ Yes | Get tests for student | ✅ ACTIVE - Part of tests system |
| POST | `/api/tests` | ✅ Yes | Create test | ✅ ACTIVE - Referenced in SuperAdminDashboard.tsx |
| PUT | `/api/tests/:id` | ✅ Yes | Update test | ✅ ACTIVE - Part of tests system |
| POST | `/api/tests/:id/post` | ✅ Yes | Post test | ✅ ACTIVE - Part of tests system |
| DELETE | `/api/tests/:id` | ✅ Yes | Delete test | ✅ ACTIVE - Referenced in SuperAdminDashboard.tsx |

---

## Legend

- ✅ Yes = Authentication required
- ❌ No = No authentication required
- ❌ MISSING = Endpoint called by frontend but not found in backend (CRITICAL)
- ✅ ACTIVE = Endpoint confirmed active and in use by frontend
- ⚠️ VERIFY = Endpoint needs verification (backend or frontend usage)

---

## Notes

1. **Rate Limiting**: Some endpoints have rate limiting applied (login, password reset, activity logs)
2. **Authentication**: Most endpoints use JWT Bearer token authentication
3. **CORS**: Enabled for frontend origin
4. **File Uploads**: Some endpoints accept multipart/form-data for file uploads

---

## Audit Status

✅ **AUDIT COMPLETE**

- **Total Backend Routes:** 198 (includes newly implemented convert-to-assignment endpoint)
- **Missing Endpoints:** 6 (called by frontend but not in backend - ticket workflow endpoints)
- **Active Endpoints:** 45+ routes confirmed active
- **Verified Endpoints:** All previously unverified endpoints have been verified and marked as ACTIVE

See `API_AUDIT_REPORT.md` for detailed findings, `UNUSED_ROUTES_REVIEW.md` for route verification results, and `ENDPOINT_VERIFICATION_RESULTS.md` for endpoint verification details.

