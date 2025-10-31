# 🚀 Quick Reference Guide - Umar Academy Portal

## 📊 **What We Have**

### **👥 User Roles (4)**
1. **Super Admin** 👑 - Full control
2. **Admin** 🛡️ - Permission-based access (5 permissions)
3. **Teacher** 👨‍🏫 - Permission-based access (7 permissions)
4. **Student** 🎓 - Own data access

### **📱 Main Pages (9+)**
- `/login` - Login page
- `/dashboard` - Role-based dashboard
- `/assignments` - Assignment management
- `/assignment-cards` - Card view
- `/my-assignments` - Student assignments
- `/profile` - Teacher profile
- `/student/*` - Student module (dashboard, assignments, courses, profile)

### **🎯 Core Features**

#### **1. User Management** ✅
- Student registration (full profile)
- Teacher registration (with permissions)
- Admin registration
- User editing

#### **2. Permission System** ✅
- Micro-management interface
- 7 teacher permissions
- 5 admin permissions
- Real-time updates

#### **3. Assignment System** ✅
- Create assignments
- Program-specific templates:
  - Full Time HQ & Part Time HQ: Classwork + Homework
  - After School Reading: Reading link + Feedback
- Bulk creation
- CSV import
- Student selection
- Assignment reports

#### **4. Student Management** ✅
- Student list
- Student profile (9 tabs)
- Student analytics
- Bulk operations

#### **5. Teacher Management** ✅
- Teacher dashboard (assigned students)
- Teacher profile
- Assessment tracking
- Evaluation tracking

### **🗄️ Database (MongoDB)**
- **Collections**: Users, Students, Teachers, Assignments
- **Location**: localhost:5175
- **Name**: umar-academy-portal

### **🔌 API Endpoints**
- **Base URL**: `http://localhost:3001/api`
- **Endpoints**:
  - `/users` - User CRUD
  - `/students` - Student CRUD
  - `/teachers` - Teacher CRUD
  - `/assignments` - Assignment CRUD + submissions
  - `/health` - Health check

### **📦 Components (30+)**

**Assignment Components**:
- `SimpleAssignmentForm.tsx` ⭐ (Main form)
- `BulkAssignmentCreator.tsx` (Bulk creation)
- `CSVAssignmentImporter.tsx` (CSV import)
- `AssignmentReports.tsx` (Reports)

**Student Components**:
- `StudentList.tsx`
- `StudentProfile.tsx`
- `StudentRegistrationForm.tsx`
- Plus 10+ more

**Teacher Components**:
- `TeacherList.tsx`
- `TeacherProfile.tsx`
- `TeacherRegistrationForm.tsx`
- Plus 10+ more

**Admin Components**:
- `PermissionManager.tsx`
- `AdminRegistrationForm.tsx`
- `DataManager.tsx`

---

## 🎯 **Current Status**

### **✅ Working**
- User authentication
- User registration (all roles)
- Permission management
- Assignment creation
- Student/Teacher profiles
- Backend API
- MongoDB integration

### **🔧 In Progress**
- Assignment submission flow
- Program-based student filtering
- Student fetching in forms

### **📝 Next Steps** (Suggestions)
1. Complete assignment submission system
2. Add payment tracking
3. Add attendance system
4. Add course management
5. Add notifications
6. Add reports/analytics

---

## 🚀 **How to Run**

```bash
# Backend (Terminal 1)
cd backend
npm start
# Runs on http://localhost:3001

# Frontend (Terminal 2)
npm run dev
# Runs on http://localhost:5174
```

**Login**: `sadmin@umaracademy.org` / `Admin123!`

---

## 📋 **Quick Commands**

```bash
# Seed database
npm run seed

# Test database connection
npm run test-db

# Build for production
npm run build
```

---

## 🗺️ **File Structure**

```
src/
├── components/      # 30+ reusable components
├── contexts/       # Data & Auth contexts
├── pages/          # 9+ main pages
├── modules/         # Feature modules (student)
├── types/          # TypeScript types
├── models/         # Data models
├── services/       # API services
└── scripts/        # Utility scripts
```

---

## 💡 **Quick Tips**

1. **Check permissions** - Many features are permission-based
2. **Program selection** - Different programs have different templates
3. **Use Super Admin** - For full access to all features
4. **Check console** - Debug logs are helpful
5. **Backend first** - Make sure backend is running before frontend

---

**For detailed information, see `PROJECT_OVERVIEW.md`**

