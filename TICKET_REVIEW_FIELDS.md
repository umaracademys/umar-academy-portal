# Ticket Review Fields - Complete Reference

This document lists all fields expected for ticket review in the Admin Ticket Review Queue.

## 📋 Fields for Ticket List Display

These fields are needed to display tickets in the queue list:

### Required Fields (Always Shown)
- `id` / `_id` - Ticket identifier
- `studentId` - Student ID
- `studentName` - Student name (displayed prominently)
- `type` - Ticket type: `'sabq' | 'sabqi' | 'manzil'`
- `status` - Ticket status: `'pending' | 'in_progress' | 'submitted' | 'approved' | 'reassigned' | 'sent_to_assignment'`

### Teacher Information
- `assignedTeacherId` - Teacher ID (fallback if name missing)
- `assignedTeacherName` - Teacher name (displayed as "Teacher: [Name]")

### Admin Information
- `createdBy` - Admin user ID who created the ticket
- `createdByName` - Admin name who created the ticket (displayed as "Created by: [Name]")
- `createdAt` - Creation date (displayed as "Created: [Date]")

### Teacher Submission
- `teacherComment` - Teacher's review comment (shown in preview if available)
- `submittedAt` - Submission date (displayed as "Submitted: [Date]")

### Mistakes
- `mistakes` - Array of mistakes (used to show mistake count: "X mistakes")

---

## 🔍 Fields for Detailed Ticket Review

When a ticket is clicked and opened for review, these fields are needed:

### Basic Ticket Information
- All fields from the list above, plus:

### Recitation Range (for Sabqi/Manzil tickets)
- `recitationRange.surahNumber` - Start surah number
- `recitationRange.surahName` - Start surah Arabic name
- `recitationRange.endSurahNumber` - End surah number (if different)
- `recitationRange.endSurahName` - End surah Arabic name (if different)
- `recitationRange.juzNumber` - Juz number
- `recitationRange.startAyahNumber` - Start ayah number
- `recitationRange.startAyahText` - Start ayah Arabic text
- `recitationRange.endAyahNumber` - End ayah number
- `recitationRange.endAyahText` - End ayah Arabic text

### Sabq Entries (for Sabq tickets - multiple entries)
- `sabqEntries[]` - Array of Sabq entries, each containing:
  - `id` - Entry ID
  - `recitationRange` - Same structure as above
  - `mistakes[]` - Array of mistakes for this entry
  - `mistakeCount` - Number or 'weak'
  - `atkees` - Numeric 1-20
  - `tajweedIssues[]` - Array of tajweed issues
  - `adminComment` - Admin comment for this entry

### Mistakes (Detailed)
- `mistakes[]` - Array of mistake objects, each containing:
  - `id` - Mistake ID
  - `type` - Mistake type (madd, holding, memory, etc.)
  - `page` - Mushaf page number
  - `surah` - Surah number
  - `surahName` - Arabic surah name
  - `ayah` - Ayah number
  - `wordIndex` - Word index in ayah
  - `wordText` - Arabic word text
  - `position.x` - X coordinate on Mushaf
  - `position.y` - Y coordinate on Mushaf
  - `note` - Mistake note/description
  - `audioUrl` - Audio recording URL for this mistake
  - `timestamp` - When mistake was marked

### Tajweed Issues
- `tajweedIssues[]` - Array of tajweed issues, each containing:
  - `type` - Issue type (ghunnah_error, qalqalah_error, etc.)
  - `surahName` - Arabic surah name
  - `wordText` - Arabic word text
  - `note` - Issue description

### Mistake Metrics
- `mistakeCount` - Number (1-20) or 'weak'
- `atkees` - Numeric value (1-20)

### Comments
- `adminComment` - Admin's comment/notes
- `teacherComment` - Teacher's review comment
- `teacherNotes` - Admin's notes to teacher
- `reviewNotes` - Additional review notes

### Homework Range (for Sabq tickets)
- `homeworkRange` - Same structure as `recitationRange`

### Reassignment Information (if reassigned)
- `reassignedFromTeacherId` - Previous teacher ID
- `reassignedFromTeacherName` - Previous teacher name
- `reassignedToTeacherId` - New teacher ID
- `reassignedToTeacherName` - New teacher name
- `reassignmentReason` - Reason for reassignment
- `previousTeacherComment` - Previous teacher's comment
- `previousMistakes[]` - Previous mistakes (if reassigned)

### Assignment Integration
- `sentToAssignmentId` - Assignment ID if sent to assignment
- `sentAt` - When ticket was sent to assignment

### Recording Information
- `recordingUrl` - URL to recording file
- `recordingFormat` - Recording format (webm, mp3, etc.)
- `recordingDuration` - Recording duration in seconds
- `recordingStartedAt` - When recording started
- `recordingStoppedAt` - When recording stopped

### Timestamps
- `startedAt` - When ticket was started
- `submittedAt` - When ticket was submitted
- `approvedAt` - When ticket was approved
- `reassignedAt` - When ticket was reassigned
- `createdAt` - When ticket was created
- `updatedAt` - When ticket was last updated

---

## ✅ Current Backend Endpoints

### GET `/api/tickets` (Main ticket list)
**Currently returns:**
- `studentId`, `studentName`, `type`, `status`, `assignedTeacherId`, `assignedTeacherName`, `teacherComment`, `mistakes`, `submittedAt`, `createdAt`, `id`, `createdBy`, `createdByName`

### GET `/api/tickets/pending-review` (Pending tickets)
**Currently returns:**
- `studentId`, `studentName`, `type`, `status`, `assignedTeacherId`, `assignedTeacherName`, `teacherComment`, `mistakes`, `submittedAt`, `createdAt`, `id`, `createdBy`, `createdByName`

### GET `/api/tickets/:id` (Full ticket details)
**Returns:** Complete ticket object with ALL fields (used when ticket is clicked for review)

---

## 🎯 Summary

**For Ticket List:**
- ✅ All required fields are now included in backend endpoints
- ✅ Frontend displays all available information

**For Detailed Review:**
- ✅ Full ticket data is fetched from `/api/tickets/:id` when ticket is clicked
- ✅ All fields are available for review

**Status:** ✅ **All fields are properly wired and displayed**
