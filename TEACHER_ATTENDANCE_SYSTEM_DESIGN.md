# 📅 Teacher Attendance System - Design Document

## Overview
A comprehensive attendance tracking system for teachers that supports:
- Full-time teachers (2 shifts: Morning & Evening)
- Part-time teachers (1 shift)
- Paid days tracking
- Attendance history and reports
- Payroll integration

---

## 🏗️ System Architecture

### 1. Data Model

#### Teacher Attendance Record
```typescript
interface TeacherAttendance {
  id: string;
  teacherId: string;
  teacherName: string;
  date: string; // YYYY-MM-DD format
  employmentType: 'Full Time' | 'Part Time';
  
  // For Full Time teachers (2 shifts)
  morningShift?: {
    status: 'present' | 'absent' | 'late' | 'half-day';
    checkIn?: string; // HH:mm format
    checkOut?: string; // HH:mm format
    notes?: string;
  };
  
  eveningShift?: {
    status: 'present' | 'absent' | 'late' | 'half-day';
    checkIn?: string; // HH:mm format
    checkOut?: string; // HH:mm format
    notes?: string;
  };
  
  // For Part Time teachers (1 shift)
  shift?: {
    name: string; // Shift name from teacher.shifts
    status: 'present' | 'absent' | 'late' | 'half-day';
    checkIn?: string;
    checkOut?: string;
    notes?: string;
  };
  
  // Paid days tracking
  paidDays: number; // Number of paid days for this month
  isPaid: boolean; // Whether this day is counted as paid
  
  // Metadata
  recordedBy: string; // Admin/SuperAdmin ID who recorded this
  recordedByName: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 📋 Features

### 1. Take Attendance (Admin/SuperAdmin)
- **Component**: `TeacherAttendanceForm`
- **Location**: Admin/SuperAdmin Dashboard → Attendance Section
- **Features**:
  - Select date (default: today)
  - Filter teachers by employment type
  - For Full Time: Mark morning & evening shifts separately
  - For Part Time: Mark single shift
  - Quick actions: "Mark All Present", "Mark All Absent"
  - Bulk entry for multiple teachers
  - Enter paid days per teacher
  - Notes field for each entry

### 2. View Attendance History (Admin/SuperAdmin)
- **Component**: `TeacherAttendanceReport`
- **Location**: Reports Section
- **Features**:
  - Filter by date range
  - Filter by teacher
  - Filter by employment type
  - View monthly summaries
  - Export to CSV/PDF
  - Calculate total paid days per month
  - Attendance statistics (present rate, absent rate, etc.)

### 3. View Own Attendance (Teachers)
- **Component**: `TeacherAttendanceView`
- **Location**: Teacher Dashboard → Attendance Tab
- **Features**:
  - View own attendance history
  - Filter by month
  - View paid days summary
  - See attendance statistics

---

## 🔌 Backend API Endpoints

### 1. Create/Update Attendance
```
POST /api/teacher-attendance
PUT /api/teacher-attendance/:id
```
- Create or update attendance record for a teacher on a specific date
- Supports bulk operations

### 2. Get Attendance Records
```
GET /api/teacher-attendance
GET /api/teacher-attendance/teacher/:teacherId
GET /api/teacher-attendance/date/:date
GET /api/teacher-attendance/month/:year/:month
```
- Get attendance records with filters
- Support pagination

### 3. Get Attendance Statistics
```
GET /api/teacher-attendance/stats/:teacherId
GET /api/teacher-attendance/stats/month/:year/:month
```
- Calculate attendance statistics
- Paid days summary

### 4. Delete Attendance
```
DELETE /api/teacher-attendance/:id
```
- Delete attendance record (admin/superadmin only)

---

## 🎨 UI Components

### 1. TeacherAttendanceForm
**Purpose**: Take attendance for teachers
**Props**:
- `onClose: () => void`
- `selectedDate?: string` (optional, defaults to today)
- `selectedTeacherId?: string` (optional, for single teacher)

**Features**:
- Date picker
- Teacher list with employment type badges
- Shift-specific attendance marking
- Paid days input
- Notes field
- Save/Cancel buttons

### 2. TeacherAttendanceReport
**Purpose**: View attendance history and reports
**Props**:
- `onClose: () => void`
- `teacherId?: string` (optional, for filtering)

**Features**:
- Date range picker
- Teacher filter dropdown
- Employment type filter
- Monthly calendar view
- Summary statistics
- Export functionality

### 3. TeacherAttendanceView
**Purpose**: Teachers view their own attendance
**Props**:
- `teacherId: string`

**Features**:
- Monthly calendar view
- Attendance summary
- Paid days display
- Notes display

---

## 🔗 Integration Points

### 1. Admin/SuperAdmin Dashboard
- Add "Teacher Attendance" section
- Quick action: "Take Attendance Today"
- Link to full attendance form

### 2. Reports Section
- Add "Teacher Attendance Report" card
- Link to attendance history view

### 3. Teacher Dashboard
- Add "My Attendance" tab
- Show current month summary
- Link to full attendance view

### 4. Payroll Integration
- Use attendance data to calculate:
  - Actual working days
  - Paid days
  - Deductions for absences
  - Overtime (if applicable)

---

## 📊 Database Schema (MongoDB)

```javascript
const teacherAttendanceSchema = new mongoose.Schema({
  teacherId: { type: String, required: true, index: true },
  teacherName: { type: String, required: true },
  date: { type: String, required: true, index: true }, // YYYY-MM-DD
  employmentType: { type: String, enum: ['Full Time', 'Part Time'], required: true },
  
  // Full Time shifts
  morningShift: {
    status: { type: String, enum: ['present', 'absent', 'late', 'half-day'] },
    checkIn: String,
    checkOut: String,
    notes: String
  },
  eveningShift: {
    status: { type: String, enum: ['present', 'absent', 'late', 'half-day'] },
    checkIn: String,
    checkOut: String,
    notes: String
  },
  
  // Part Time shift
  shift: {
    name: String,
    status: { type: String, enum: ['present', 'absent', 'late', 'half-day'] },
    checkIn: String,
    checkOut: String,
    notes: String
  },
  
  // Paid days
  paidDays: { type: Number, default: 0 },
  isPaid: { type: Boolean, default: false },
  
  // Metadata
  recordedBy: { type: String, required: true },
  recordedByName: { type: String, required: true }
}, { timestamps: true });

// Compound index for efficient queries
teacherAttendanceSchema.index({ teacherId: 1, date: 1 }, { unique: true });
teacherAttendanceSchema.index({ date: 1 });
teacherAttendanceSchema.index({ teacherId: 1, date: -1 });
```

---

## 🚀 Implementation Plan

### Phase 1: Backend
1. ✅ Create database schema
2. ✅ Create API endpoints
3. ✅ Add authentication/authorization
4. ✅ Add validation

### Phase 2: Frontend Types & Context
1. ✅ Create TypeScript types
2. ✅ Create attendance context/hooks
3. ✅ Add to BackendDataContext

### Phase 3: Components
1. ✅ Create TeacherAttendanceForm
2. ✅ Create TeacherAttendanceReport
3. ✅ Create TeacherAttendanceView

### Phase 4: Integration
1. ✅ Add to Admin/SuperAdmin dashboards
2. ✅ Add to Reports section
3. ✅ Add to Teacher dashboard

### Phase 5: Testing & Refinement
1. ✅ Test with full-time teachers (2 shifts)
2. ✅ Test with part-time teachers (1 shift)
3. ✅ Test paid days tracking
4. ✅ Test reports and exports

---

## 💡 Key Considerations

1. **Date Handling**: Use YYYY-MM-DD format consistently
2. **Time Zones**: Store times in local timezone
3. **Validation**: Ensure one record per teacher per date
4. **Permissions**: Only admin/superadmin can take attendance
5. **History**: Keep audit trail of who recorded what
6. **Performance**: Index database properly for fast queries
7. **Bulk Operations**: Support marking multiple teachers at once
8. **Export**: Support CSV/PDF export for payroll

---

## 📝 Notes

- Full-time teachers can have different statuses for morning and evening shifts
- Part-time teachers have one shift per day
- Paid days are tracked separately and can be entered manually
- Attendance history helps with payroll calculations
- Teachers can view their own attendance but cannot modify it

