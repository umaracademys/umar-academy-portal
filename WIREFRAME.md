# 🎨 Umar Academy Portal - Application Wireframe

## 📱 Overall Application Structure

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER (All Pages)                    │
│  [Logo]  [Navigation Links]  [User Avatar]  [Logout]   │
└─────────────────────────────────────────────────────────┘

┌──────────────┬──────────────────────────────────────────┐
│              │                                           │
│   SIDEBAR    │           MAIN CONTENT AREA               │
│   (If any)   │                                           │
│              │                                           │
│  - Dashboard │  ┌────────────────────────────────────┐  │
│  - Students  │  │      Page Content                  │  │
│  - Teachers  │  │                                    │  │
│  - Tickets   │  │      [Components/Cards]            │  │
│  - Reports   │  │                                    │  │
│              │  └────────────────────────────────────┘  │
│              │                                           │
└──────────────┴──────────────────────────────────────────┘
```

---

## 🏠 Super Admin Dashboard (`/dashboard`)

```
┌─────────────────────────────────────────────────────────────┐
│  Teacher Workspace                                          │
│  Overview of all system activity                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Students │  │ Teachers │  │  Admins  │  │ Revenue  │   │
│  │   250    │  │    45    │  │    12    │  │ $125,000 │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  QUICK ACTIONS                                        │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  [Register Student]  [Register Teacher]              │  │
│  │  [Register Admin]    [Manage Permissions]            │  │
│  │  [Student Reports]   [Ticket Management]             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  STUDENT DIRECTORY                                    │  │
│  │  Browse and filter the complete student directory     │  │
│  │  [View directory →]                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  TEACHER DIRECTORY                                    │  │
│  │  Manage all registered teachers                       │  │
│  │  [View directory →]                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 👨‍🏫 Teacher Dashboard (`/dashboard` - Teacher Role)

```
┌─────────────────────────────────────────────────────────────┐
│  Teacher Workspace                                          │
│  Review assignments, log recitation feedback                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Submit Recitation Review]  [My Tickets]  [📊 Student Reports] │
│  [Manage Assignments]  [View My Profile]                   │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ Students │  │  Tickets │  │  Reviews │                  │
│  │    12    │  │     5    │  │     8    │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MY ASSIGNED STUDENTS                                 │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  ┌──────────────────────────────────────────┐        │  │
│  │  │  [Avatar]  Ahmad Ali                     │        │  │
│  │  │  📚 Program: Full Time HQ                │        │  │
│  │  │  📅 Enrolled: Jan 15, 2024               │        │  │
│  │  │                                           │        │  │
│  │  │  [View Activity History]  [Contact Parent]│       │  │
│  │  └──────────────────────────────────────────┘        │  │
│  │                                                       │  │
│  │  ┌──────────────────────────────────────────┐        │  │
│  │  │  [Avatar]  Fatima Khan                   │        │  │
│  │  │  📚 Program: Part Time HQ                │        │  │
│  │  │  📅 Enrolled: Feb 1, 2024                │        │  │
│  │  │                                           │        │  │
│  │  │  [View Activity History]  [Contact Parent]│       │  │
│  │  └──────────────────────────────────────────┘        │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Student Reports Modal (Teacher Dashboard)

```
┌─────────────────────────────────────────────────────────────┐
│  Student Reports                         [✕ Close]          │
│  View and manage your assigned students' assignment history  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SELECT STUDENT (3 assigned)                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ Ahmad Ali│  │ Fatima K.│  │ Hassan R.│                  │
│  │ Full Time│  │ Part Time│  │ Full Time│                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Assignment History: Ahmad Ali                       │  │
│  │  5 assignments found                                 │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  📅 January 15, 2024                                 │  │
│  │  2 assignments on this day                           │  │
│  │  ┌──────────────────────────────────────────┐        │  │
│  │  │  📝 Assignment (From Ticket System)      │        │  │
│  │  │  Listener: Rashid                         │        │  │
│  │  │                                           │        │  │
│  │  │  ┌────────────────────────────────────┐  │        │  │
│  │  │  │  CLASSWORK DETAILS                 │  │        │  │
│  │  │  ├────────────────────────────────────┤  │        │  │
│  │  │  │  ✨ Sabq      🧠 Sabqi    🔁 Manzil│  │        │  │
│  │  │  │  Portion:     Portion:    Portion: │  │        │  │
│  │  │  │  Juz 1,       Juz 1,      Juz 1,   │  │        │  │
│  │  │  │  Page 2-5     Page 1-3    Page 1-10│  │        │  │
│  │  │  │  Notes:       Notes:      Notes:   │  │        │  │
│  │  │  │  ...          ...         ...      │  │        │  │
│  │  │  └────────────────────────────────────┘  │        │  │
│  │  │                                           │        │  │
│  │  │  ┌────────────────────────────────────┐  │        │  │
│  │  │  │  📋 Final Report / Summary         │  │        │  │
│  │  │  │  Today's sabq was excellent...     │  │        │  │
│  │  │  └────────────────────────────────────┘  │        │  │
│  │  │                                           │        │  │
│  │  │  ┌────────────────────────────────────┐  │        │  │
│  │  │  │  📝 Homework                       │  │        │  │
│  │  │  │  Review pages 5-8 for next class   │  │        │  │
│  │  │  │  📎 Homework Link →                │  │        │  │
│  │  │  └────────────────────────────────────┘  │        │  │
│  │  │                                           │        │  │
│  │  │  ┌────────────────────────────────────┐  │        │  │
│  │  │  │  📖 Mushaf Mistakes (8)            │  │        │  │
│  │  │  │  [📖 View Mushaf]                  │  │        │  │
│  │  │  │                                    │  │        │  │
│  │  │  │  Memory: 3  Madd: 2  Ikhfa: 1     │  │        │  │
│  │  │  │  Navigate to pages:                │  │        │  │
│  │  │  │  [Page 2 (5)] [Page 3 (3)]        │  │        │  │
│  │  │  │                                    │  │        │  │
│  │  │  │  [Memory • Page 2] [Madd • Page 3]│  │        │  │
│  │  │  └────────────────────────────────────┘  │        │  │
│  │  │                                           │        │  │
│  │  │  [✏️ Edit]  [🗑️ Delete]                   │        │  │
│  │  └──────────────────────────────────────────┘        │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📖 Interactive Mushaf View (Expanded)

```
┌─────────────────────────────────────────────────────────────┐
│  📖 Mushaf Mistakes (8 mistakes)                            │
│  Page 2 • 5 mistakes on this page      [📖 Hide Mushaf]    │
│                                                              │
│  [Page 2 (5)]  [Page 3 (3)]  [Page 4 (0)]                  │
│     ↑ Active                                                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │              INTERACTIVE MUSHAF                       │  │
│  │                                                       │  │
│  │    [Previous Page]  [Page 2]  [Next Page]            │  │
│  │                                                       │  │
│  │    ┌──────────────────────────────────────────┐      │  │
│  │    │                                          │      │  │
│  │    │     [Quran Text with Highlighted Words] │      │  │
│  │    │     • Mistakes marked in red/yellow      │      │  │
│  │    │     • Click words to see mistake details │      │  │
│  │    │                                          │      │  │
│  │    │                                          │      │  │
│  │    └──────────────────────────────────────────┘      │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Assignments Page (`/assignments`)

```
┌─────────────────────────────────────────────────────────────┐
│  Assignments                                   [Create New] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Filter: [Program ▼]  [Type ▼]                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📚 Full Time HQ                                     │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  Student: Ahmad Ali                                  │  │
│  │  Assigned Teacher: Rashid                            │  │
│  │  Due: Jan 20, 2024                                   │  │
│  │                                                       │  │
│  │  ┌──────────────────────────────────────────┐        │  │
│  │  │  📋 Recitation Report                     │        │  │
│  │  │  Today's sabq was excellent...            │        │  │
│  │  └──────────────────────────────────────────┘        │  │
│  │                                                       │  │
│  │  ┌──────────────────────────────────────────┐        │  │
│  │  │  CLASSWORK DETAILS                       │        │  │
│  │  │  ✨ Sabq      🧠 Sabqi    🔁 Manzil       │        │  │
│  │  │  Portion:     Portion:    Portion:        │        │  │
│  │  │  Juz 1,       Juz 1,      Juz 1,          │        │  │
│  │  │  Page 2-5     Page 1-3    Page 1-10       │        │  │
│  │  │  Notes:       Notes:      Notes:          │        │  │
│  │  └──────────────────────────────────────────┘        │  │
│  │                                                       │  │
│  │  ┌──────────────────────────────────────────┐        │  │
│  │  │  📖 Mushaf Mistake Markings (8)          │        │  │
│  │  │  [📖 View Mushaf]                        │        │  │
│  │  └──────────────────────────────────────────┘        │  │
│  │                                                       │  │
│  │  ┌──────────────────────────────────────────┐        │  │
│  │  │  📝 Homework                              │        │  │
│  │  │  Review pages 5-8 for next class         │        │  │
│  │  │  📎 Homework Link →                       │        │  │
│  │  └──────────────────────────────────────────┘        │  │
│  │                                                       │  │
│  │  [Edit report]  [Reassign teacher]  [Delete]        │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎫 Ticket Management

```
┌─────────────────────────────────────────────────────────────┐
│  Ticket Management                            [✕ Close]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Pending]  [In Progress]  [Approved]  [Finalized]         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Ticket #123                                          │  │
│  │  Student: Ahmad Ali                                   │  │
│  │  Assigned Teacher: Rashid                             │  │
│  │  Program: Full Time HQ                                │  │
│  │  Step: Sabq                                           │  │
│  │  Status: Pending Review                               │  │
│  │                                                       │  │
│  │  Progress Notes:                                      │  │
│  │  Student recited well, minor mistakes in tajweed...  │  │
│  │                                                       │  │
│  │  Internal Notes (Admin):                             │  │
│  │  [Notes field]                                        │  │
│  │                                                       │  │
│  │  [✅ Approve]  [❌ Reject]  [🔄 Request Revision]     │  │
│  │  [➡️ Assign to Next Teacher]                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎓 Student Dashboard (`/student/dashboard`)

```
┌─────────────────────────────────────────────────────────────┐
│  Student Dashboard                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ My Courses│ │Assignments│ │  Grades  │                  │
│  │     3     │ │     12    │ │   4.5/5  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MY ASSIGNMENTS                                       │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  📅 January 15, 2024                                 │  │
│  │  ┌──────────────────────────────────────────┐        │  │
│  │  │  📝 Assignment                            │        │  │
│  │  │                                           │        │  │
│  │  │  ┌────────────────────────────────────┐  │        │  │
│  │  │  │  ✨ Sabq (New Lesson)              │  │        │  │
│  │  │  │  Portion: Juz 1, Page 2-5          │  │        │  │
│  │  │  │  Notes: Great progress...          │  │        │  │
│  │  │  └────────────────────────────────────┘  │        │  │
│  │  │                                           │        │  │
│  │  │  ┌────────────────────────────────────┐  │        │  │
│  │  │  │  🧠 Sabqi (Revision)               │  │        │  │
│  │  │  │  Portion: Juz 1, Page 1-3          │  │        │  │
│  │  │  │  Notes: Practice more...           │  │        │  │
│  │  │  └────────────────────────────────────┘  │        │  │
│  │  │                                           │        │  │
│  │  │  ┌────────────────────────────────────┐  │        │  │
│  │  │  │  🔁 Manzil                         │  │        │  │
│  │  │  │  Portion: Juz 1, Page 1-10         │  │        │  │
│  │  │  │  Notes: Keep up the good work      │  │        │  │
│  │  │  └────────────────────────────────────┘  │        │  │
│  │  │                                           │        │  │
│  │  │  ┌────────────────────────────────────┐  │        │  │
│  │  │  │  📝 Homework                       │  │        │  │
│  │  │  │  Review pages 5-8 for next class   │  │        │  │
│  │  │  │  📎 Homework Link →                │  │        │  │
│  │  │  └────────────────────────────────────┘  │        │  │
│  │  │                                           │        │  │
│  │  │  ┌────────────────────────────────────┐  │        │  │
│  │  │  │  📖 Mushaf Mistakes (8)            │  │        │  │
│  │  │  │  [📖 View Mushaf]                  │  │        │  │
│  │  │  └────────────────────────────────────┘  │        │  │
│  │  └──────────────────────────────────────────┘        │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Student Profile Modal

```
┌─────────────────────────────────────────────────────────────┐
│  Student Profile                              [✕ Close]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Avatar]  Ahmad Ali                                        │
│  Student ID: STU-001                                        │
│  Parent: Ahmed Ali                                          │
│                                                              │
│  [Overview] [Activity History] [Schedule] [Family]         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ACTIVITY HISTORY                                     │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │  Total   │  │Assignments│  │  Tickets │           │  │
│  │  │    45    │  │    32     │  │    13    │           │  │
│  │  └──────────┘  └──────────┘  └──────────┘           │  │
│  │                                                       │  │
│  │  📅 January 15, 2024                                 │  │
│  │  2 activities on this day                            │  │
│  │  ┌──────────────────────────────────────────┐        │  │
│  │  │  📝 Assignment                            │        │  │
│  │  │  10:30 AM                                 │        │  │
│  │  │  Today's sabq was excellent...            │        │  │
│  │  │                                           │        │  │
│  │  │  📖 Mushaf Mistakes (8)                   │        │  │
│  │  │  [Memory • Page 2] [Madd • Page 3]       │        │  │
│  │  └──────────────────────────────────────────┘        │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Color Scheme & Theme

```
Primary Colors:
- Green: #10b981 (Primary actions, buttons)
- Cream/Yellow: #FDF7E7 (Classwork sections background)
- Amber: #E7AA39 (Borders, accents)

Status Colors:
- Success: Green (#10b981)
- Warning: Yellow/Orange (#E7AA39)
- Error: Red (#ef4444)
- Info: Blue (#3b82f6)

Background Colors:
- White: Main content
- Gray-50: Secondary backgrounds
- Gray-100: Borders, dividers
```

---

## 📐 Layout Patterns

### **Card-Based Layout**
- Rounded corners (`rounded-xl`, `rounded-lg`)
- Border with shadow (`border`, `shadow-sm`)
- Padding: `p-4`, `p-6`
- Spacing: `gap-4`, `gap-6`

### **Modal Structure**
- Full-screen overlay with dark background
- Centered modal with max-width
- Header with gradient background
- Scrollable main content
- Close button in header

### **Button Styles**
- Primary: Green background, white text
- Secondary: Border only, green text
- Danger: Red border, red text
- Small: `px-3 py-2 text-xs`
- Medium: `px-4 py-2 text-sm`
- Large: `px-5 py-3 text-sm`

---

## 🔄 Common UI Patterns

### **Assignment Display Card**
```
┌─────────────────────────────────────┐
│  [Icon]  Title                      │
│  Metadata (Teacher, Date, Program)  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Classwork Details (Sabq...)  │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Final Report                 │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Homework                     │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Mushaf Mistakes              │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Edit]  [Delete]                   │
└─────────────────────────────────────┘
```

### **Student Card (Teacher Dashboard)**
```
┌─────────────────────────────────────┐
│  [Avatar]  Student Name             │
│  📚 Program Type                    │
│  📅 Enrolled Date                   │
│                                     │
│  [View Activity History]            │
│  [Contact Parent]                   │
└─────────────────────────────────────┘
```

---

## 📱 Responsive Breakpoints

- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md, lg)
- **Desktop**: > 1024px (xl)

Grid layouts adjust:
- Mobile: 1 column
- Tablet: 2-3 columns
- Desktop: 3-4 columns

---

## 🎯 Key Interactive Elements

1. **Student Selection**: Grid of clickable cards
2. **Date Grouping**: Activities grouped by date with expand/collapse
3. **Mushaf Toggle**: Show/Hide Mushaf view
4. **Page Navigation**: Quick jump to pages with mistakes
5. **Edit/Delete Actions**: Inline buttons for each assignment
6. **Modal Workflows**: Edit forms in modal overlays

---

This wireframe represents the current implementation structure of your Umar Academy Portal application.

