# Proposed Backend Implementation - Ticket Workflow Endpoints

## Overview

This document proposes implementations for 6 missing ticket workflow endpoints used by the frontend. These endpoints handle ticket lifecycle management, workflow progression, and assignment creation.

---

## 1. POST /api/tickets/bulk-delete

### Frontend Usage
- **File**: `src/contexts/BackendDataContext.tsx` (line 3187)
- **Function**: `deleteTickets(ids: string[])`
- **Purpose**: Delete multiple tickets at once

### Request Format
```json
{
  "ticketIds": ["id1", "id2", "id3"]
}
```

### Expected Response
- **Success**: HTTP 200 with success message
- **Error**: HTTP 400/404/500 with error message

### Proposed Implementation

```javascript
// Bulk delete tickets
app.post('/api/tickets/bulk-delete', async (req, res) => {
  try {
    const { ticketIds } = req.body;
    
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({ error: 'ticketIds array is required and must not be empty' });
    }
    
    // Validate all IDs are valid MongoDB ObjectIds
    const invalidIds = ticketIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ 
        error: `Invalid ticket IDs: ${invalidIds.join(', ')}` 
      });
    }
    
    // Delete tickets
    const result = await Ticket.deleteMany({ 
      _id: { $in: ticketIds } 
    });
    
    console.log(`✅ Deleted ${result.deletedCount} ticket(s) out of ${ticketIds.length} requested`);
    
    res.json({ 
      message: `Successfully deleted ${result.deletedCount} ticket(s)`,
      deletedCount: result.deletedCount,
      requestedCount: ticketIds.length
    });
  } catch (error) {
    console.error('❌ Error in bulk delete tickets:', error);
    res.status(500).json({ error: error.message || 'Failed to delete tickets' });
  }
});
```

**Placement**: After `app.delete('/api/tickets/:id')` (around line 6825)

---

## 2. POST /api/tickets/:ticketId/assign-next

### Frontend Usage
- **File**: `src/contexts/BackendDataContext.tsx` (lines 3215, 3274)
- **Functions**: `assignTicketToNextTeacher`, `assignTicketToNext`
- **Purpose**: Assign ticket to next teacher in workflow chain (creates new ticket for next step)

### Request Format
```json
{
  "assignedTeacherId": "teacher_id",
  "assignedTeacherName": "Teacher Name",
  "internalNote": "Optional internal note"
}
```

### Expected Response
- **Success**: HTTP 200 with new ticket object
- **Error**: HTTP 404/500 with error message

### Proposed Implementation

```javascript
// Assign ticket to next teacher (creates new ticket for next workflow step)
app.post('/api/tickets/:ticketId/assign-next', async (req, res) => {
  try {
    const { assignedTeacherId, assignedTeacherName, internalNote } = req.body;
    const ticketId = req.params.ticketId;
    
    if (!assignedTeacherId || !assignedTeacherName) {
      return res.status(400).json({ error: 'assignedTeacherId and assignedTeacherName are required' });
    }
    
    const currentTicket = await Ticket.findById(ticketId);
    if (!currentTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Determine next workflow step
    let nextType;
    if (currentTicket.type === 'sabq') {
      nextType = 'sabqi';
    } else if (currentTicket.type === 'sabqi') {
      nextType = 'manzil';
    } else {
      return res.status(400).json({ error: 'Cannot assign next step from manzil ticket' });
    }
    
    // Create new ticket for next step
    const nextTicket = new Ticket({
      studentId: currentTicket.studentId,
      studentName: currentTicket.studentName,
      type: nextType,
      status: 'pending',
      createdBy: currentTicket.createdBy || currentTicket.assignedTeacherId,
      createdByName: currentTicket.createdByName || currentTicket.assignedTeacherName,
      adminComment: internalNote || '',
      assignedTeacherId: assignedTeacherId,
      assignedTeacherName: assignedTeacherName,
      teacherNotes: internalNote || ''
    });
    
    await nextTicket.save();
    
    // Link tickets
    currentTicket.nextTicketId = nextTicket._id.toString();
    nextTicket.previousTicketId = currentTicket._id.toString();
    await currentTicket.save();
    await nextTicket.save();
    
    console.log(`✅ Created next ticket ${nextTicket._id} for workflow step ${nextType}`);
    
    res.json(nextTicket);
  } catch (error) {
    console.error('❌ Error assigning ticket to next:', error);
    res.status(500).json({ error: error.message || 'Failed to assign ticket to next teacher' });
  }
});
```

**Placement**: After `app.post('/api/tickets/:id/reassign')` (around line 6812)

---

## 3. POST /api/tickets/:ticketId/approve

### Frontend Usage
- **File**: `src/contexts/BackendDataContext.tsx` (line 3248)
- **Function**: `approveTicket(ticketId: string, reviewedBy: string)`
- **Purpose**: Approve a ticket (marks as approved, doesn't create assignment)

### Request Format
```json
{
  "reviewedBy": "admin_user_id"
}
```

### Expected Response
- **Success**: HTTP 200 with updated ticket object
- **Error**: HTTP 404/500 with error message

### Proposed Implementation

```javascript
// Approve ticket (without creating assignment)
app.post('/api/tickets/:ticketId/approve', async (req, res) => {
  try {
    const { reviewedBy } = req.body;
    const ticketId = req.params.ticketId;
    
    if (!reviewedBy) {
      return res.status(400).json({ error: 'reviewedBy is required' });
    }
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Update ticket status
    ticket.status = 'approved';
    ticket.approvedAt = new Date();
    ticket.reviewedBy = reviewedBy;
    
    await ticket.save();
    
    console.log(`✅ Ticket ${ticketId} approved by ${reviewedBy}`);
    
    res.json(ticket);
  } catch (error) {
    console.error('❌ Error approving ticket:', error);
    res.status(500).json({ error: error.message || 'Failed to approve ticket' });
  }
});
```

**Placement**: After `app.post('/api/tickets/:id/approve-send')` (around line 6777)

---

## 4. POST /api/tickets/:ticketId/approve-and-advance

### Frontend Usage
- **File**: `src/contexts/BackendDataContext.tsx` (line 3299)
- **Function**: `approveAndAdvanceTicket(ticketId, reviewedBy, nextTeacherId?, nextTeacherName?)`
- **Purpose**: Approve current ticket and create next ticket in workflow

### Request Format
```json
{
  "reviewedBy": "admin_user_id",
  "nextTeacherId": "teacher_id",  // Optional
  "nextTeacherName": "Teacher Name"  // Optional
}
```

### Expected Response
- **Success**: HTTP 200 with result object containing approved ticket and next ticket
- **Error**: HTTP 404/500 with error message

### Proposed Implementation

```javascript
// Approve ticket and advance to next workflow step
app.post('/api/tickets/:ticketId/approve-and-advance', async (req, res) => {
  try {
    const { reviewedBy, nextTeacherId, nextTeacherName } = req.body;
    const ticketId = req.params.ticketId;
    
    if (!reviewedBy) {
      return res.status(400).json({ error: 'reviewedBy is required' });
    }
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Approve current ticket
    ticket.status = 'approved';
    ticket.approvedAt = new Date();
    ticket.reviewedBy = reviewedBy;
    await ticket.save();
    
    // Determine next workflow step
    let nextType;
    if (ticket.type === 'sabq') {
      nextType = 'sabqi';
    } else if (ticket.type === 'sabqi') {
      nextType = 'manzil';
    } else {
      return res.json({ 
        ticket,
        nextTicket: null,
        message: 'Ticket is at final step, cannot advance further'
      });
    }
    
    // Create next ticket if teacher info provided
    let nextTicket = null;
    if (nextTeacherId && nextTeacherName) {
      nextTicket = new Ticket({
        studentId: ticket.studentId,
        studentName: ticket.studentName,
        type: nextType,
        status: 'pending',
        createdBy: reviewedBy,
        createdByName: ticket.createdByName || 'Admin',
        adminComment: ticket.adminComment || '',
        assignedTeacherId: nextTeacherId,
        assignedTeacherName: nextTeacherName
      });
      
      await nextTicket.save();
      
      // Link tickets
      ticket.nextTicketId = nextTicket._id.toString();
      nextTicket.previousTicketId = ticket._id.toString();
      await ticket.save();
      await nextTicket.save();
      
      console.log(`✅ Approved ticket ${ticketId} and created next ticket ${nextTicket._id} for ${nextType}`);
    }
    
    res.json({ 
      ticket,
      nextTicket,
      message: nextTicket ? `Ticket approved and advanced to ${nextType}` : 'Ticket approved'
    });
  } catch (error) {
    console.error('❌ Error approving and advancing ticket:', error);
    res.status(500).json({ error: error.message || 'Failed to approve and advance ticket' });
  }
});
```

**Placement**: After `app.post('/api/tickets/:ticketId/approve')` (proposed above)

---

## 5. POST /api/tickets/:ticketId/skip-to-finalize

### Frontend Usage
- **File**: `src/contexts/BackendDataContext.tsx` (line 3349)
- **Function**: `skipTicketToFinalize(ticketId: string, reviewedBy?: string)`
- **Purpose**: Skip workflow steps and mark ticket ready for finalization

### Request Format
```json
{
  "reviewedBy": "admin_user_id"  // Optional
}
```

### Expected Response
- **Success**: HTTP 200 with updated ticket object
- **Error**: HTTP 404/500 with error message

### Proposed Implementation

```javascript
// Skip ticket to finalize step (mark as ready for finalization)
app.post('/api/tickets/:ticketId/skip-to-finalize', async (req, res) => {
  try {
    const { reviewedBy } = req.body;
    const ticketId = req.params.ticketId;
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Update ticket to indicate it's ready for finalization
    // Note: The current Ticket schema doesn't have a 'finalize' status,
    // so we'll use 'approved' status and add a flag or use existing fields
    ticket.status = 'approved';
    ticket.approvedAt = new Date();
    if (reviewedBy) {
      ticket.reviewedBy = reviewedBy;
    }
    // Store a note that this was skipped to finalize
    ticket.adminComment = (ticket.adminComment || '') + '\n[Skipped to finalize]';
    
    await ticket.save();
    
    console.log(`✅ Ticket ${ticketId} skipped to finalize step`);
    
    res.json({ 
      ticket,
      message: 'Ticket marked as ready for finalization'
    });
  } catch (error) {
    console.error('❌ Error skipping ticket to finalize:', error);
    res.status(500).json({ error: error.message || 'Failed to skip ticket to finalize' });
  }
});
```

**Note**: The current Ticket schema uses status enum `['pending', 'in_progress', 'submitted', 'approved', 'reassigned', 'sent_to_assignment']`. There's no 'finalize' status. The frontend references `AssignmentTicket` with `workflowStep: 'finalize'`, but the backend uses a different Ticket model. This endpoint marks the ticket as approved and ready for finalization.

**Placement**: After `app.post('/api/tickets/:ticketId/approve-and-advance')` (proposed above)

---

## 6. POST /api/tickets/:ticketId/finalize

### Frontend Usage
- **File**: `src/contexts/BackendDataContext.tsx` (line 3382)
- **Function**: `finalizeTicket(ticketId, data)`
- **Purpose**: Finalize ticket and create assignment with homework

### Request Format
```json
{
  "finalReport": "Final report text",
  "homework": "Homework instructions",
  "homeworkLink": "https://optional-link.com",
  "reviewedBy": "admin_user_id",
  "classworkSections": [  // Optional
    {
      "step": "sabq",
      "title": "Section title",
      "details": "Details",
      "teacherName": "Teacher Name",
      "order": 1,
      "assignmentRange": "1-5",
      "assignmentPortion": "portion"
    }
  ],
  "classworkSummary": "Summary text",  // Optional
  "homeworkSummary": "Homework summary",  // Optional
  "classworkType": "type"  // Optional
}
```

### Expected Response
- **Success**: HTTP 200 with object containing finalized ticket and created assignment
- **Error**: HTTP 404/500 with error message

### Proposed Implementation

```javascript
// Finalize ticket and create assignment
app.post('/api/tickets/:ticketId/finalize', async (req, res) => {
  try {
    const { 
      finalReport, 
      homework, 
      homeworkLink, 
      reviewedBy,
      classworkSections,
      classworkSummary,
      homeworkSummary,
      classworkType
    } = req.body;
    const ticketId = req.params.ticketId;
    
    if (!finalReport || !homework || !reviewedBy) {
      return res.status(400).json({ 
        error: 'finalReport, homework, and reviewedBy are required' 
      });
    }
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Get user info for assignment
    const user = await User.findById(reviewedBy);
    const assignedByName = user?.name || user?.email || 'Admin';
    const assignedByRole = user?.role === 'superadmin' ? 'super_admin' : 'admin';
    
    // Build classwork entries from ticket type and classworkSections
    const classwork = {
      sabq: [],
      sabqi: [],
      manzil: []
    };
    
    // Add classwork entry based on ticket type
    if (ticket.type === 'sabq' || ticket.type === 'sabqi' || ticket.type === 'manzil') {
      const classworkEntry = {
        range: ticket.adminComment || '',
        portion: '',
        teacherName: ticket.assignedTeacherName || ticket.createdByName || 'N/A',
        createdAt: new Date()
      };
      
      if (ticket.type === 'sabq') {
        classwork.sabq.push(classworkEntry);
      } else if (ticket.type === 'sabqi') {
        classwork.sabqi.push(classworkEntry);
      } else if (ticket.type === 'manzil') {
        classwork.manzil.push(classworkEntry);
      }
    }
    
    // Process classworkSections if provided
    if (Array.isArray(classworkSections)) {
      classworkSections.forEach((section) => {
        const entry = {
          range: section.assignmentRange || '',
          portion: section.assignmentPortion || '',
          teacherName: section.teacherName || 'N/A',
          createdAt: new Date()
        };
        
        if (section.step === 'sabq') {
          classwork.sabq.push(entry);
        } else if (section.step === 'sabqi') {
          classwork.sabqi.push(entry);
        } else if (section.step === 'manzil') {
          classwork.manzil.push(entry);
        }
      });
    }
    
    // Create assignment
    const assignment = new Assignment({
      studentId: ticket.studentId,
      studentName: ticket.studentName,
      assignedBy: reviewedBy,
      assignedByName: assignedByName,
      assignedByRole: assignedByRole,
      fromTicketId: ticket._id.toString(),
      classwork: classwork,
      homework: {
        enabled: true,
        content: homework,
        link: homeworkLink || ''
      },
      status: 'active',
      classworkSummary: classworkSummary,
      homeworkSummary: homeworkSummary,
      classworkType: classworkType
    });
    
    await assignment.save();
    
    // Update ticket
    ticket.status = 'sent_to_assignment';
    ticket.sentToAssignmentId = assignment._id.toString();
    ticket.sentAt = new Date();
    ticket.approvedAt = new Date();
    ticket.reviewedBy = reviewedBy;
    // Store final report in adminComment or create new field
    ticket.adminComment = (ticket.adminComment || '') + '\n[Final Report]: ' + finalReport;
    
    await ticket.save();
    
    console.log(`✅ Finalized ticket ${ticketId} and created assignment ${assignment._id}`);
    
    res.json({
      ticket,
      assignment,
      message: 'Ticket finalized and assignment created successfully'
    });
  } catch (error) {
    console.error('❌ Error finalizing ticket:', error);
    res.status(500).json({ error: error.message || 'Failed to finalize ticket' });
  }
});
```

**Placement**: After `app.post('/api/tickets/:ticketId/skip-to-finalize')` (proposed above)

---

## Implementation Notes

### Schema Considerations

1. **Ticket Status Enum**: The current Ticket schema doesn't include 'finalize' status. The endpoints use 'approved' or 'sent_to_assignment' as appropriate.

2. **AssignmentTicket vs Ticket**: The frontend references `AssignmentTicket` with `workflowStep: 'finalize'`, but the backend uses a simpler `Ticket` model. The proposed endpoints work with the existing Ticket schema.

3. **Classwork Sections**: The `finalize` endpoint processes `classworkSections` array and converts it to the Assignment's classwork structure (sabq/sabqi/manzil arrays).

### Error Handling

All endpoints include:
- Input validation
- Ticket existence checks
- Proper error messages
- Console logging for debugging

### Authentication

**Note**: These endpoints don't currently include authentication middleware. Consider adding `authenticateToken` middleware if needed:

```javascript
app.post('/api/tickets/:ticketId/approve', authenticateToken, async (req, res) => {
  // ...
});
```

### Testing Checklist

For each endpoint:
- [ ] Test with valid ticket ID
- [ ] Test with invalid ticket ID (should return 404)
- [ ] Test with missing required fields (should return 400)
- [ ] Test with invalid data types (should return 400)
- [ ] Verify database updates correctly
- [ ] Verify response format matches frontend expectations
- [ ] Test error handling and logging

---

## Placement Summary

All endpoints should be placed in `backend/server.js` after existing ticket routes:

1. **bulk-delete**: After `app.delete('/api/tickets/:id')` (~line 6825)
2. **assign-next**: After `app.post('/api/tickets/:id/reassign')` (~line 6812)
3. **approve**: After `app.post('/api/tickets/:id/approve-send')` (~line 6777)
4. **approve-and-advance**: After proposed `approve` endpoint
5. **skip-to-finalize**: After proposed `approve-and-advance` endpoint
6. **finalize**: After proposed `skip-to-finalize` endpoint

---

## Dependencies

- `Ticket` model (already exists)
- `Assignment` model (already exists)
- `User` model (for `finalize` endpoint to get user info)
- `mongoose` (for ObjectId validation in bulk-delete)

