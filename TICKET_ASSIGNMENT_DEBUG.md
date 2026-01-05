# 🔍 Debugging: Approved Tickets Not Showing in Assignments

## ❌ Problem
Approved tickets show in "Previous Sabqi Tickets Found" but don't appear in student assignments.

---

## 🔍 **Diagnostic Steps**

### **Step 1: Check Ticket Status**

1. Find the ticket in MongoDB or via API:
   ```bash
   GET /api/tickets?status=sent_to_assignment&type=sabqi&studentId=[STUDENT_ID]
   ```

2. Verify ticket has:
   - ✅ `status: 'sent_to_assignment'`
   - ✅ `sentToAssignmentId` field (should have assignment ID)
   - ✅ `sentAt` timestamp

### **Step 2: Check Assignment**

1. Use the `sentToAssignmentId` from the ticket to find the assignment:
   ```bash
   GET /api/assignments/[ASSIGNMENT_ID]
   ```

2. Verify assignment has:
   - ✅ `status: 'active'`
   - ✅ `studentId` matches ticket's `studentId`
   - ✅ `classwork.sabqi` array has entries
   - ✅ Entry should have `assignmentRange` matching ticket comment

### **Step 3: Check Student Assignment Query**

The student dashboard queries assignments with:
- `studentId` matching current student
- `status: 'active'` (or no status filter)

**Verify:**
- Assignment `studentId` format matches student's ID format
- Assignment `status` is exactly `'active'` (not `'completed'` or other)

---

## 🐛 **Common Issues**

### **Issue 1: Assignment Status Not Active**

**Symptom:** Assignment exists but status is `'completed'` or `'inactive'`

**Fix:**
- Update assignment status to `'active'`
- Or modify query to include completed assignments

### **Issue 2: Student ID Mismatch**

**Symptom:** Assignment has different `studentId` format than expected

**Check:**
- Ticket `studentId` vs Assignment `studentId`
- Both should be same format (string vs ObjectId)

### **Issue 3: Classwork Not Added**

**Symptom:** Assignment exists but `classwork.sabqi` is empty

**Check backend logs for:**
- `📝 Adding sabqi entry to assignment`
- `✅ Sabqi entries after push`
- `✅ Assignment saved`

**Fix:** Re-run approval if classwork wasn't added

### **Issue 4: Assignment Not Created**

**Symptom:** Ticket has `sentToAssignmentId` but assignment doesn't exist

**Fix:**
- Check if assignment was deleted
- Re-approve ticket to create assignment

---

## 🔧 **Quick Fix Script**

If assignment exists but classwork is missing, you can manually add it:

```javascript
// In MongoDB or via API
const assignment = await Assignment.findById(ticket.sentToAssignmentId);
if (assignment && !assignment.classwork.sabqi.some(e => e.assignmentRange === ticket.teacherComment)) {
  assignment.classwork.sabqi.push({
    type: 'sabqi',
    assignmentRange: ticket.teacherComment || ticket.adminComment,
    details: ticket.teacherComment || ticket.adminComment,
    surahNumber: ticket.mistakes?.[0]?.surah
  });
  await assignment.save();
}
```

---

## 📋 **Checklist**

- [ ] Ticket has `status: 'sent_to_assignment'`
- [ ] Ticket has `sentToAssignmentId` field
- [ ] Assignment exists with that ID
- [ ] Assignment `status` is `'active'`
- [ ] Assignment `studentId` matches ticket `studentId`
- [ ] Assignment `classwork.sabqi` has entries
- [ ] Student query filters by correct `studentId`
- [ ] Student query includes `status: 'active'` assignments

---

## 🆘 **Still Not Working?**

Share these details:
1. Ticket ID
2. Assignment ID (from `sentToAssignmentId`)
3. Student ID
4. Screenshot of assignment document from MongoDB
5. Backend logs from when ticket was approved

