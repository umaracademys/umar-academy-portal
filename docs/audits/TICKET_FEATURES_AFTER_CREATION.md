# 🎫 Ticket Features After Creation

## Overview
When a ticket is created, it enters a comprehensive workflow with multiple features and actions available based on the ticket type and status.

---

## 📋 Ticket Types

### 1. **Sabq** (Initial Recitation Review)
- **Created by**: Admin
- **Initial Status**: `pending`
- **Purpose**: Initial recitation review with Interactive Mushaf

### 2. **Sabqi** (First Review Phase)
- **Created by**: Admin or Teacher
- **Initial Status**: `pending`
- **Purpose**: Teacher marks mistakes and submits for review

### 3. **Manzil** (Final Review Phase)
- **Created by**: Admin or Teacher
- **Initial Status**: `pending`
- **Purpose**: Teacher confirms completion

---

## 🔄 Ticket Status Workflow

```
pending → in_progress → submitted → approved → sent_to_assignment
                              ↓
                         reassigned
```

---

## ✨ Features Available After Ticket Creation

### 1. **Real-Time Notifications** 🔔
- **Admin Notification**: Automatically created when ticket is submitted
  - Type: `recitation_review_pending`
  - Priority: `high`
  - Message: "New Ticket Submitted"
  - Includes student name and ticket type
- **WebSocket Events**: Real-time updates via Socket.IO
  - `ticket:created` event emitted to:
    - Student (if studentId exists)
    - Assigned Teacher (if assignedTeacherId exists)
    - All Admins (broadcast to 'admins' room)

### 2. **Ticket Assignment** 👥
- **Auto-Assignment**: For sabqi/manzil tickets, backend auto-assigns to teacher
- **Manual Assignment**: Admin can assign ticket to specific teacher
- **Reassignment**: Tickets can be reassigned to different teachers
  - Tracks previous teacher
  - Stores reassignment reason
  - Preserves previous teacher's comments and mistakes

### 3. **Interactive Mushaf Integration** 📖
- **Sabq Tickets**: Opens Interactive Mushaf viewer automatically
- **Mistake Marking**: Teachers can mark mistakes directly on Quran pages
  - Page number (1-604)
  - Surah and Ayah
  - Word position (x, y coordinates)
  - Word text (Arabic)
  - Mistake type (30+ types: madd, holding, memory, ikhfa, etc.)
- **Audio Recording**: Optional audio notes per mistake
- **Visual Feedback**: Mistakes highlighted on Mushaf pages

### 4. **Ticket Review & Editing** ✏️
- **View Ticket Details**: Full ticket information
  - Student information
  - Recitation range (Surah, Ayah, Pages)
  - Mistakes list
  - Teacher/Admin comments
  - Recording URLs
  - Timestamps
- **Edit Ticket**: Update ticket information
  - Student name
  - Type (sabq/sabqi/manzil)
  - Status
  - Teacher notes
  - Assigned teacher
- **Delete Ticket**: Remove ticket from system

### 5. **Teacher Actions** 👨‍🏫

#### When Ticket is `pending`:
- **Start Review**: Change status to `in_progress`
  - Opens Mushaf viewer
  - Allows mistake marking
  - Records `startedAt` timestamp

#### When Ticket is `in_progress`:
- **Mark Mistakes**: Add mistakes on Mushaf pages
  - Select mistake type
  - Add notes per mistake
  - Record audio per mistake (optional)
- **Add Comments**: Teacher comment field
- **Submit Review**: Change status to `submitted`
  - Includes all mistakes
  - Teacher comment
  - Recording URL (if provided)
  - Records `submittedAt` timestamp

### 6. **Admin Actions** 👨‍💼

#### For Sabq Tickets (`pending` status):
- **Admin Sabq Review**: Special review interface
  - Interactive Mushaf viewer
  - Mark mistakes directly
  - Add admin comments
  - Submit Sabq review
  - Auto-creates assignment when submitted

#### For Submitted Tickets (`submitted` status):
- **Review Mistakes**: View all teacher-marked mistakes
- **View Mushaf**: See mistakes on Interactive Mushaf
- **Approve & Send**: 
  - Approve ticket (status: `approved`)
  - Convert to assignment (status: `sent_to_assignment`)
  - Creates/updates student assignment
  - Links mistakes to assignment
  - Records `approvedAt` and `sentAt` timestamps

#### For All Tickets:
- **Reassign Ticket**: Change assigned teacher
  - Select new teacher
  - Add reassignment reason
  - Preserves previous teacher's work
- **Edit Ticket**: Modify ticket details
- **Delete Ticket**: Remove ticket

### 7. **Mistake Management** 🎯

#### Mistake Types (30+ types):
- **Tajweed Mistakes**: madd, holding, memory, ikhfa, tech, letter, etc.
- **Heavy/Light Letters**: heavy_letter, heavy_h, light_l
- **Ghunnah & Qalqalah**: ghunnah, qalqalah
- **Idgham & Iqlab**: idgham, iqlab, ikhfa_shafawi
- **Madd Types**: madd_muttasil, madd_munfasil, madd_laazim, madd_arid, madd_lin
- **Hamzat**: hamzat_wasl, hamzat_qat
- **Diacritics**: tashdeed, tanween, sukoon, fatha, kasrah, dammah
- **Atkees**: Separate numeric category (1-20)

#### Mistake Features:
- **Page-based**: Mistakes linked to specific Mushaf pages (1-604)
- **Position Tracking**: X, Y coordinates on page
- **Word-level**: Specific word index and Arabic text
- **Notes**: Custom notes per mistake
- **Audio**: Optional audio recording per mistake
- **Grouping**: Mistakes grouped by page/surah/ayah

### 8. **Recitation Range Tracking** 📍
- **Surah Range**: Start and end surah numbers
- **Ayah Range**: Start and end ayah numbers
- **Arabic Text**: Start and end ayah text (Arabic)
- **Juz Number**: Optional juz tracking
- **Page Numbers**: Linked to Mushaf pages

### 9. **Sabq-Specific Features** 📚
- **Multiple Entries**: Sabq tickets can have multiple `sabqEntries`
  - Each entry has its own recitation range
  - Separate mistakes per entry
  - Individual mistake count and atkees
  - Tajweed issues per entry
  - Admin comments per entry
- **Homework Range**: Separate homework range for next day
- **Tajweed Issues**: Track tajweed problems
  - Type (heavy_letters, fatha_not_vertical, etc.)
  - Surah name and word text
  - Notes

### 10. **Audio Recording** 🎙️
- **Ticket-level Recording**: Full ticket recording
  - Recording URL
  - Format (mp3, wav, etc.)
  - Duration
  - Start/Stop timestamps
- **Mistake-level Recording**: Per-mistake audio notes
  - Audio URL per mistake
  - Optional recording for detailed feedback

### 11. **Comments & Notes** 💬
- **Admin Comment**: Admin's initial notes
- **Teacher Notes**: Admin's notes to teacher (for assignment)
- **Teacher Comment**: Teacher's review comments
- **Review Notes**: Additional review notes
- **Reassignment Reason**: Reason for reassignment

### 12. **Assignment Integration** 📝
- **Auto-Conversion**: Approved tickets convert to assignments
- **Assignment Linking**: `sentToAssignmentId` links ticket to assignment
- **Mistake Transfer**: Mistakes transferred to assignment
- **Classwork Phase**: Ticket data creates classwork phase
  - Sabq → Sabq phase
  - Sabqi → Sabqi phase
  - Manzil → Manzil phase

### 13. **Bulk Operations** 📦
- **Bulk Delete**: Delete multiple pending tickets
- **Filter & Search**: 
  - Filter by status
  - Search by student name, type, teacher
- **Status Management**: View tickets by status
  - All statuses
  - Pending
  - In Progress
  - Submitted
  - Reassigned

### 14. **Tracking & History** 📊
- **Timestamps**: Complete audit trail
  - `createdAt`: When ticket was created
  - `startedAt`: When teacher started review
  - `submittedAt`: When teacher submitted
  - `approvedAt`: When admin approved
  - `sentAt`: When sent to assignment
  - `reassignedAt`: When reassigned
  - `updatedAt`: Last update
- **Reassignment History**: Tracks previous assignments
  - Previous teacher ID and name
  - New teacher ID and name
  - Reassignment reason
  - Previous teacher's work preserved

### 15. **Quick Stats & Insights** 📈
- **Ticket Quick Stats**: Overview of ticket statuses
- **Insight Banners**: Visual feedback on ticket progress
- **Mistake Badge Highlights**: Visual mistake indicators

---

## 🎯 Workflow Summary

### Sabq Ticket Flow:
1. **Admin Creates** → Status: `pending`
2. **Admin Reviews** → Opens Interactive Mushaf
3. **Admin Marks Mistakes** → Adds mistakes and comments
4. **Admin Submits** → Auto-creates assignment
5. **Assignment Created** → Status: `sent_to_assignment`

### Sabqi/Manzil Ticket Flow:
1. **Admin/Teacher Creates** → Status: `pending`
2. **Auto-Assigned to Teacher** → Backend assigns
3. **Teacher Starts** → Status: `in_progress`
4. **Teacher Marks Mistakes** → On Interactive Mushaf
5. **Teacher Submits** → Status: `submitted`
6. **Admin Reviews** → Views mistakes and comments
7. **Admin Approves** → Status: `approved`
8. **Admin Sends to Assignment** → Status: `sent_to_assignment`
9. **Assignment Updated** → Ticket data added to assignment

---

## 🔗 Related Components

- **TicketCreationForm**: Create/edit tickets
- **AdminTicketReview**: Admin review interface
- **TeacherTicketReview**: Teacher review interface
- **ActiveTicketsManagement**: Manage all active tickets
- **AdminSabqReview**: Special Sabq review interface
- **ApprovedTicketsAdmin**: View approved tickets
- **TicketQuickStats**: Quick statistics
- **TicketInsightBanner**: Progress insights
- **MistakeBadgeHighlight**: Mistake visualization

---

## 📡 API Endpoints

- `POST /api/tickets` - Create ticket
- `GET /api/tickets` - List all tickets
- `GET /api/tickets/:id` - Get ticket details
- `PUT /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket
- `POST /api/tickets/:id/start` - Start review
- `POST /api/tickets/:id/submit` - Submit review
- `POST /api/tickets/:id/submit-sabq` - Submit Sabq review
- `POST /api/tickets/:id/approve-send` - Approve and convert to assignment
- `POST /api/tickets/:id/reassign` - Reassign ticket
- `POST /api/tickets/bulk-delete` - Bulk delete tickets

---

## ✅ Key Features Summary

1. ✅ Real-time notifications
2. ✅ Auto-assignment to teachers
3. ✅ Interactive Mushaf integration
4. ✅ Comprehensive mistake marking (30+ types)
5. ✅ Audio recording (ticket & mistake level)
6. ✅ Multiple Sabq entries support
7. ✅ Reassignment with history tracking
8. ✅ Assignment auto-conversion
9. ✅ Complete audit trail
10. ✅ Bulk operations
11. ✅ Search and filtering
12. ✅ Status workflow management
13. ✅ Comments and notes system
14. ✅ Recitation range tracking
15. ✅ Tajweed issues tracking

---

This comprehensive ticket system provides a complete workflow for managing Islamic recitation reviews from creation to assignment conversion.
