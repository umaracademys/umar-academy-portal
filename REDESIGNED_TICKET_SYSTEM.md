# 🎫 Redesigned Ticket System - Assignment-Based Workflow

## 📋 New Requirements

### Key Changes:
1. **Tickets are tied to specific assignments** - Each ticket belongs to a particular assignment
2. **Approved tickets saved to assignment report** - When admin approves a ticket, it's saved in that assignment's report
3. **Admin creates next ticket for next assignment** - After approving, admin creates a new ticket for the next assignment (not workflow step)
4. **Tickets saved directly to student report** - When teacher submits ticket, it's automatically saved to the assignment's report
5. **Simplified ticket creation** - No sabqi/sabq/manzil selection when converting ticket to assignment
6. **Sabq filled by admin** - If admin selects sabq, they fill it out directly (no teacher assignment)
7. **Manzil can be multiple juz** - Manzil tickets can cover more than 2 juz

## 🔄 New Workflow

### Flow:
```
1. Admin creates assignment for student
2. Admin creates ticket for that assignment (selects assignment, then ticket type)
3. If ticket type is "Sabq" → Admin fills it out directly
4. If ticket type is "Manzil" or other → Assign to teacher
5. Teacher receives ticket → Fills it out → Submits
6. Ticket is automatically saved to assignment's report
7. Admin reviews ticket → Approves
8. Approved ticket is saved to assignment's report
9. Admin can create next ticket for next assignment
10. When converting ticket to assignment, show simple form (not sabq/sabqi/manzil options)
```

## 📝 Ticket Creation Flow

### Step 1: Select Assignment
- Show list of assignments for the student
- Or create new assignment first
- Select which assignment this ticket is for

### Step 2: Select Ticket Type
- **Sabq** - Admin fills out directly (no teacher)
- **Manzil** - Assign to teacher (can specify juz range, e.g., "Juz 1-3")
- **Other types** - As needed

### Step 3: Fill Details
- If Sabq: Admin fills progress notes, range, etc.
- If Manzil/Other: Assign to teacher, add notes

## 🗂️ Assignment Report Structure

Each assignment has a `reports` array:
```javascript
{
  assignmentId: "...",
  reports: [
    {
      ticketId: "...",
      type: "sabq" | "manzil" | "...",
      submittedBy: "teacherId",
      submittedAt: Date,
      progressNotes: "...",
      assignmentRange: "...",
      status: "pending" | "approved" | "needs_revision",
      approvedAt: Date,
      approvedBy: "adminId"
    }
  ]
}
```

## 🎨 UI Changes Needed

### 1. Create Ticket Form
- Add "Select Assignment" step before ticket type
- Remove sabqi/sabq/manzil from assignment conversion view
- Add "Sabq" option that shows admin form (no teacher selection)

### 2. Ticket to Assignment Conversion
- Show simple form with:
  - Final report field
  - Homework field
  - Homework link
  - (No sabq/sabqi/manzil selection)

### 3. Assignment Report View
- Show all tickets/reports for that assignment
- Group by date
- Show status (pending, approved, etc.)

