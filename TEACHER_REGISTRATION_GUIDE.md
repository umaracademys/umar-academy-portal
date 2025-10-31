# Teacher Registration & Profile System - Complete Guide

## 🎉 Enhanced Teacher Registration System

The teacher registration system has been completely rebuilt with a modern multi-tab interface, comprehensive employment tracking, and automatic payroll calculations.

---

## 📋 Registration Form Structure

### **4-Tab Registration Process**

#### **Tab 1: Personal Information** 👤
Complete personal details with ID verification:

**Required Fields:**
- ✅ **Full Name** - Complete legal name
- ✅ **Email Address** - Official academy email
- ✅ **Phone Number** - Primary contact number (format: +1-555-0000)
- ✅ **Emergency Contact** - Emergency contact number
- ✅ **Department** - Teaching department (e.g., Islamic Studies, Mathematics, Science)

**Document Upload:**
- ✅ **ID Document** - Upload PNG or PDF file
  - Accepts: PNG, JPG, PDF
  - Automatically converted to base64 for storage
  - Preview available in teacher profile

---

#### **Tab 2: Employment & Scheduling** 📅

**Employment Type Selection:**

1. **Full Time** (Automatic Configuration)
   - 🔄 **Auto-assigns Both Shifts:**
     - Morning Shift: 08:00 - 12:00
     - Afternoon Shift: 13:00 - 17:00
   - ✅ Default: 8 hours/day, 22 days/month

2. **Part Time** (Manual Selection Required)
   - **Morning Shift** 🌅: 08:00 - 12:00
   - **Evening Shift** 🌙: 17:00 - 21:00
   - ✅ Default: 4 hours/day, 22 days/month

**Shift Display:**
- Full Time teachers see 2 shifts automatically
- Part Time teachers select one shift
- All shifts displayed with start/end times

**Working Days:**
- ✅ Select from Monday - Sunday
- ✅ Visual day selector with toggle buttons
- ✅ Selected days highlighted in green

---

#### **Tab 3: Payroll Information** 💰

**Manual Input Fields:**
- ✅ **Hourly Rate** ($) - Payment per hour (e.g., $25.00)
- ✅ **Daily Hours** - Hours worked per day (1-24)
- ✅ **Days Working** - Days worked per month (1-31)

**Auto-Calculated Fields:**
- 🔄 **Monthly Hours** = Daily Hours × Days Working
  - Example: 8 hrs × 22 days = 176 hours
- 🔄 **Monthly Salary** = Hourly Rate × Monthly Hours
  - Example: $25/hr × 176 hrs = $4,400

**Visual Display:**
- ✅ Real-time calculation as you type
- ✅ Beautiful gradient cards showing calculations
- ✅ Formula breakdown displayed
- ✅ Currency formatting ($X,XXX.XX)

**Example Calculations:**

| Employment Type | Hours/Day | Days/Month | Hourly Rate | Monthly Hours | Monthly Salary |
|----------------|-----------|------------|-------------|---------------|----------------|
| Full Time      | 8         | 22         | $25         | 176           | $4,400         |
| Part Time (M)  | 4         | 22         | $20         | 88            | $1,760         |
| Part Time (E)  | 4         | 20         | $22         | 80            | $1,760         |

---

#### **Tab 4: Permissions** 🔐

**7 Granular Access Permissions:**

1. ✅ **Can View Assessments** - View student test scores
2. ✅ **Can Edit Assessments** - Add/modify assessments
3. ✅ **Can View Evaluations** - View behavioral evaluations
4. ✅ **Can Edit Evaluations** - Create/edit evaluations
5. ✅ **Can View Financials** - Access financial data
6. ✅ **Can Manage Schedule** - Modify student schedules
7. ✅ **Can Contact Parents** - Send parent communications

**Features:**
- ✅ Each permission has detailed description
- ✅ Toggle on/off with checkboxes
- ✅ Can be modified later by Super Admin

---

## 👨‍🏫 Teacher Profile Page

### **Accessible From:**
- Teacher Dashboard → "View My Profile" button (top right)
- Direct URL: `/profile`

### **Profile Sections:**

#### **1. Profile Header**
- Full name with avatar
- Department
- Employment type badge
- Active/Inactive status

#### **2. Personal Information Card**
- Email address
- Phone number
- Emergency contact
- Department
- Hire date (formatted)
- Teacher ID

#### **3. Employment Details Card**
- Employment type (Full Time / Part Time badge)
- Shift type
- All assigned shifts with times
- Working days (color-coded badges)

#### **4. Payroll Information Card**
Large visual display with:
- **Hourly Rate** - Blue card
- **Daily Hours** - Purple card
- **Days Working** - Indigo card
- **Monthly Hours** - Green card (calculated)
- **Monthly Salary** - Yellow card (calculated, prominent)

Each card shows:
- Label
- Large value
- Calculation formula

#### **5. Assigned Students Card**
- Total count of assigned students
- Blue highlight card

#### **6. Permissions & Access Card**
- Grid display of all 7 permissions
- ✓ Green for allowed
- ✗ Red for denied
- Permission names in plain English

#### **7. ID Document Card** (if uploaded)
- Preview of uploaded ID
- For images: Direct preview
- For PDFs: Link to view

---

## 🔄 Complete Workflow Example

### **As Super Admin:**

1. **Click "Register Teacher"** (green button)

2. **Tab 1 - Personal Info:**
   ```
   Full Name: Dr. Ahmed Ali
   Email: ahmed@umaracademy.org
   Phone: +1-555-1234
   Emergency: +1-555-5678
   Department: Islamic Studies
   Upload ID: teacher_id.png
   ```
   Click "Next →"

3. **Tab 2 - Employment:**
   ```
   Employment Type: Full Time (clicked)
   → Auto shows: Morning & Afternoon shifts
   Working Days: Mon, Tue, Wed, Thu, Fri (selected)
   ```
   Click "Next →"

4. **Tab 3 - Payroll:**
   ```
   Hourly Rate: $25
   Daily Hours: 8
   Days Working: 22
   
   → Auto calculates:
   Monthly Hours: 176 hrs
   Monthly Salary: $4,400.00
   ```
   Click "Next →"

5. **Tab 4 - Permissions:**
   ```
   ✓ Can View Assessments
   ✓ Can Edit Assessments
   ✓ Can View Evaluations
   ✓ Can Edit Evaluations
   ✗ Can View Financials (unchecked)
   ✓ Can Manage Schedule
   ✓ Can Contact Parents
   ```
   Click "✓ Register Teacher"

### **As Teacher:**

1. **Login** with credentials
2. **See Dashboard** with assigned students
3. **Click "👤 View My Profile"**
4. **View Complete Information:**
   - Personal details
   - Employment type and shifts
   - Complete payroll breakdown
   - All permissions
   - Uploaded ID document

---

## 💡 Key Features

### **Smart Auto-Fill**
- ✅ Full Time → Auto-sets 2 shifts, 8 hrs/day
- ✅ Part Time → Auto-sets 1 shift, 4 hrs/day
- ✅ Shift change → Auto-updates times

### **Real-Time Calculations**
- ✅ Monthly hours update as you type
- ✅ Salary recalculates instantly
- ✅ Formula shown for transparency

### **Visual Progress**
- ✅ Tab navigation with icons
- ✅ Progress bar showing completion %
- ✅ "Step X of 4" indicator

### **Data Validation**
- ✅ Required fields marked with *
- ✅ Email format validation
- ✅ Phone number formatting
- ✅ Number ranges enforced
- ✅ File type restrictions (PNG/PDF)

### **Responsive Design**
- ✅ Mobile-friendly tabs
- ✅ Adaptive grid layouts
- ✅ Touch-friendly buttons
- ✅ Scrollable content

---

## 📊 Database Structure

### **Teacher Object:**
```typescript
{
  id: "TCH1234567890",
  fullName: "Dr. Ahmed Ali",
  email: "ahmed@umaracademy.org",
  phoneNumber: "+1-555-1234",
  emergencyContact: "+1-555-5678",
  department: "Islamic Studies",
  employmentType: "Full Time",
  shiftType: "Both",
  shifts: [
    { name: "Morning Shift", startTime: "08:00", endTime: "12:00" },
    { name: "Afternoon Shift", startTime: "13:00", endTime: "17:00" }
  ],
  idDocument: "data:image/png;base64,...",
  assignedStudents: ["STU001", "STU002"],
  permissions: {
    canViewAssessments: true,
    canEditAssessments: true,
    canViewEvaluations: true,
    canEditEvaluations: true,
    canViewFinancials: false,
    canManageSchedule: true,
    canContactParents: true
  },
  schedule: {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    startTime: "08:00 AM",
    endTime: "05:00 PM"
  },
  payroll: {
    hourlyRate: 25,
    dailyHours: 8,
    daysWorking: 22,
    monthlyHours: 176,
    monthlySalary: 4400
  },
  hireDate: "2025-10-21",
  status: "active",
  avatar: "https://ui-avatars.com/api/..."
}
```

---

## 🎯 Benefits

### **For Super Admin:**
- ✅ Complete teacher information in one place
- ✅ Automatic payroll calculations (no errors)
- ✅ Visual shift management
- ✅ ID document storage
- ✅ Granular permission control

### **For Teachers:**
- ✅ View complete profile anytime
- ✅ See exact salary breakdown
- ✅ Understand their permissions
- ✅ Access shift schedule
- ✅ Professional profile display

### **For System:**
- ✅ Structured data storage
- ✅ Automatic calculations (no manual errors)
- ✅ Permission-based access control
- ✅ Document management
- ✅ Audit trail ready

---

## 🔐 Security & Privacy

- ✅ Teachers can only view their own profile
- ✅ Payroll info only visible to teacher and admin
- ✅ ID documents securely stored
- ✅ Permission checks on all actions
- ✅ Role-based access control

---

## 📱 Navigation

**Super Admin → Register Teacher:**
`Dashboard → "Register Teacher" button → 4-tab form → Submit`

**Teacher → View Profile:**
`Dashboard → "View My Profile" button → Profile page`

**Teacher → Back to Dashboard:**
`Profile page → "← Back to Dashboard" button`

---

Built with precision for Umar Academy Portal ✨
