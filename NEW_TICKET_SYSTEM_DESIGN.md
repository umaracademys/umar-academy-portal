# 🎫 New Ticket System Design - Complete Workflow

## 📋 Understanding Your Requirements

### **Phase 1: Super Admin Creates Ticket**

```
┌─────────────────────────────────────────────────────────────┐
│  Create New Ticket                            [✕ Close]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: Select Program                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Program: [Full Time HQ ▼]                          │  │
│  │                                                       │  │
│  │  Step 2: Select Student                              │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  [Avatar] Ahmad Ali                             │  │  │
│  │  │  [Avatar] Fatima Khan                           │  │  │
│  │  │  [Avatar] Hassan Raza                           │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Step 3: Select Recitation Type                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ○ ✨ Sabq (New Lesson)                              │  │
│  │    Teacher: Admin (Auto-selected)                    │  │
│  │                                                       │  │
│  │  ○ 🧠 Sabqi (Revision)                               │  │
│  │    Teacher: [Select Teacher ▼]                       │  │
│  │                                                       │  │
│  │  ○ 🔁 Manzil                                         │  │
│  │    Teacher: [Select Teacher ▼]                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Step 4: Notes for Teacher                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [___________________________________________]        │  │
│  │  [___________________________________________]        │  │
│  │  [___________________________________________]        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  [Cancel]                                    [Create Ticket]│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### **Phase 2: Teacher Receives Ticket**

```
┌─────────────────────────────────────────────────────────────┐
│  My Tickets                                    [Refresh]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🎫 New Ticket #123                                  │  │
│  │  ─────────────────────────────────────────────────── │  │
│  │  Student: Ahmad Ali                                  │  │
│  │  Type: 🧠 Sabqi (Revision)                           │  │
│  │                                                       │  │
│  │  📝 Notes from Admin:                                │  │
│  │  Please focus on tajweed rules, especially madd...   │  │
│  │                                                       │  │
│  │  [▶️ Start Recitation]                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Fill Ticket: Sabqi for Ahmad Ali            [✕ Close]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Student: Ahmad Ali                                  │  │
│  │  Type: 🧠 Sabqi (Revision)                           │  │
│  │                                                       │  │
│  │  📝 Notes from Admin:                                │  │
│  │  Please focus on tajweed rules...                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📖 Interactive Mushaf                                │  │
│  │  ─────────────────────────────────────────────────── │  │
│  │                                                       │  │
│  │  [Mushaf View with Marking Interface]                │  │
│  │  • Click words to mark mistakes                      │  │
│  │  • Mistakes shown with colors                        │  │
│  │  • Index on the side                                 │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📝 Share Report with Admin                          │  │
│  │  ─────────────────────────────────────────────────── │  │
│  │  [Progress Notes:_________________________________]  │  │
│  │  [_____________________________________________]     │  │
│  │  [_____________________________________________]     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  [Cancel]                                    [Submit Report]│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### **Phase 3: Admin Reviews Ticket**

```
┌─────────────────────────────────────────────────────────────┐
│  Ticket Management                            [✕ Close]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Pending Review]  [In Progress]  [Approved]               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🎫 Ticket #123                                       │  │
│  │  Student: [Ahmad Ali ← Click to View Report]         │  │
│  │  Type: 🧠 Sabqi (Revision)                           │  │
│  │  Teacher: Rashid                                     │  │
│  │  Status: ⏳ Pending Review                           │  │
│  │  Submitted: 2 hours ago                              │  │
│  │                                                       │  │
│  │  [👀 View Report]                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Review Ticket: Ahmad Ali - Sabqi            [✕ Close]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🧠 SABQI (Revision)                                  │  │
│  │  Student: Ahmad Ali                                   │  │
│  │  Teacher: Rashid                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📝 Report from Teacher                               │  │
│  │  ─────────────────────────────────────────────────── │  │
│  │  Student recited well, minor mistakes in tajweed.    │  │
│  │  Needs more practice on madd rules...                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📖 Mushaf Mistakes (5)              [📖 View Mushaf]│  │
│  │  Memory: 2  Madd: 2  Ikhfa: 1                         │  │
│  │  [Page 2 (3)] [Page 3 (2)]                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ✏️ Admin Feedback (Optional)                         │  │
│  │  [___________________________________________]        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  [🔄 Reassign to Redo]              [✅ Approve & Continue]│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### **Phase 4: After Approval (Don't Close Ticket!)**

```
┌─────────────────────────────────────────────────────────────┐
│  Ticket Approved - Next Steps                 [✕ Close]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ Sabqi ticket approved!                                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Assign for Sabq                                      │  │
│  │  ─────────────────────────────────────────────────── │  │
│  │                                                       │  │
│  │  Assign to:                                           │  │
│  │  ○ Admin (You will review sabq)                      │  │
│  │  ○ Teacher: [Select Teacher ▼]                       │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  📝 Your Feedback for Sabq:                     │  │  │
│  │  │  [___________________________________________]  │  │  │
│  │  │  [___________________________________________]  │  │  │
│  │  │  [___________________________________________]  │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  [Save & Continue]                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

After saving, show:
┌─────────────────────────────────────────────────────────────┐
│  Auto-assign Next Teacher                    [✕ Close]      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ Sabq feedback saved!                                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Assign Sabq Ticket to Teacher:                      │  │
│  │  [Select Teacher ▼]                                  │  │
│  │                                                       │  │
│  │  📝 Notes for Teacher:                               │  │
│  │  [___________________________________________]        │  │
│  │                                                       │  │
│  │  [Assign & Send Ticket]                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### **Phase 5: Teacher Completes Sabq Ticket**

Same as Phase 2 - Teacher fills sabq ticket, submits to admin.

---

### **Phase 6: Admin Reviews Sabq (After Sabqi Approved)**

```
┌─────────────────────────────────────────────────────────────┐
│  Review All Reports                          [✕ Close]      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ Sabqi: Approved                                         │
│  ⏳ Sabq: Pending Review                                    │
│  ⏸️ Manzil: Not Started                                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Combined Report View                                 │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  🧠 SABQI Report                                │  │  │
│  │  │  Teacher: Rashid                                │  │  │
│  │  │  Notes: Student recited well...                 │  │  │
│  │  │  Mistakes: 5                                    │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  ✨ SABQ Report                                 │  │  │
│  │  │  Teacher: Ahmed                                 │  │  │
│  │  │  Notes: Great progress...                       │  │  │
│  │  │  Mistakes: 8                                    │  │  │
│  │  │                                                 │  │  │
│  │  │  Admin Feedback: Focus on tajweed...            │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  🔁 MANZIL Report                               │  │  │
│  │  │  ⏸️ Not completed yet                            │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  📖 View All Mistakes Together                  │  │  │
│  │  │  [📖 View Combined Mushaf]                      │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  📝 Homework                                    │  │  │
│  │  │  [___________________________________________]  │  │  │
│  │  │  [___________________________________________]  │  │  │
│  │  │                                                 │  │  │
│  │  │  📎 Homework Link:                              │  │  │
│  │  │  [https://_________________]                    │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  [🔄 Reassign to Redo]              [✅ Finalize]   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### **Phase 7: After Finalization - Assignment Appears Everywhere**

```
┌─────────────────────────────────────────────────────────────┐
│  Student Reports (Admin Dashboard)                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Student: Ahmad Ali                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📝 Assignment - January 15, 2024                     │  │
│  │  ✅ Finalized from Ticket #123                        │  │
│  │                                                       │  │
│  │  [View Full Report]  [✏️ Edit]  [🗑️ Delete]          │  │
│  │                                                       │  │
│  │  • Sabqi Report (from Rashid)                         │  │
│  │  • Sabq Report (from Ahmed)                           │  │
│  │  • Manzil Report (from Hassan)                        │  │
│  │  • Combined Mushaf Mistakes                           │  │
│  │  • Homework                                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Same assignment also appears in:
- Teacher Dashboard → Student Reports
- Student Dashboard → Assignments

All with Edit and Delete buttons.
```

---

## 🎯 Key Changes from Current System

1. ✅ **Ticket stays open** after approval (no auto-close)
2. ✅ **Step-by-step assignment** after each approval
3. ✅ **Admin can review sabq** with feedback field
4. ✅ **Combined view** of all reports before finalization
5. ✅ **Homework field** shown only at finalization step
6. ✅ **Assignment appears** in all 3 dashboards after finalization
7. ✅ **Edit/Delete** buttons on all assignment views

---

## 🔄 Complete Flow Summary

```
1. Admin creates ticket
   └─> Select program → student → recitation type → teacher → notes

2. Teacher receives ticket
   └─> Sees student name + admin notes → Start recitation → Mark mistakes → Submit report

3. Admin reviews ticket
   └─> View full report → Approve OR Reassign to redo
       └─> If APPROVE: Don't close! → Assign for Sabq → Add sabq feedback → Assign to teacher

4. Teacher completes sabq
   └─> Same as step 2

5. Admin reviews sabq
   └─> View combined reports (Sabqi + Sabq) → Approve OR Reassign to redo
       └─> If APPROVE: Show finalization view → Add homework → Finalize

6. Assignment created
   └─> Appears in:
       - Admin Dashboard → Student Reports (with Edit/Delete)
       - Teacher Dashboard → Student Reports (with Edit/Delete)
       - Student Dashboard → Assignments (with Edit/Delete)
```

---

## ✅ Implementation Plan

Let me know if this matches what you want, and I'll start implementing:

1. **Redesign Create Ticket Form** - Step-by-step with program/student/type selection
2. **Update Teacher Ticket View** - Show admin notes prominently
3. **Update Admin Review Flow** - Don't close tickets, show assignment options
4. **Add Sabq Feedback Field** - Admin can add feedback before assigning
5. **Create Combined Review View** - Show all reports together
6. **Add Finalization View** - Homework field, link field, finalize button
7. **Update Assignment Display** - Show in all 3 dashboards with Edit/Delete

**Does this match your vision? Any changes needed before I start coding?** 🎯

