# Data Loading Performance Audit

**Date**: 2026-01-09  
**Goal**: Identify unnecessary data loading on pages that don't need it

---

## 🔍 Current Problem

**BackendDataContext** loads ALL data on mount:
- Users
- Teachers  
- Students
- Assignments (305)
- Tickets
- Notifications
- Reviews

**Issue**: Every page loads ALL data, even if it only needs 1-2 pieces.

---

## 📊 Page-by-Page Data Usage Analysis

### Pages That DON'T Need Assignments:
1. **TeacherStudentAssignmentManager** (`/teacher-student-assignment`)
   - Needs: Students, Teachers
   - Doesn't need: Assignments, Tickets, Notifications, Reviews
   - **Problem**: Loads all 305 assignments unnecessarily

2. **TeacherProfile** (`/profile`)
   - Needs: Current teacher data
   - Doesn't need: Assignments, Tickets, Notifications, Reviews, All students
   - **Problem**: Loads everything

3. **StudentsPage** (`/students`)
   - Needs: Students, Teachers (for assignment)
   - Doesn't need: Assignments, Tickets, Notifications, Reviews
   - **Problem**: Loads assignments unnecessarily

4. **TeachersPage** (`/teachers`)
   - Needs: Teachers, Students (for assignment)
   - Doesn't need: Assignments, Tickets, Notifications, Reviews
   - **Problem**: Loads assignments unnecessarily

5. **TeacherPdfViewer** (`/pdf-teaching`)
   - Needs: Students (assigned to teacher), PDFs
   - Doesn't need: Assignments, Tickets, Notifications, Reviews
   - **Problem**: Loads assignments unnecessarily

6. **Qaidah Pages** (`/qaidah`)
   - Needs: Nothing from BackendDataContext
   - Doesn't need: Everything
   - **Problem**: Loads ALL data unnecessarily

7. **MushafDemo** (`/mushaf-demo`)
   - Needs: Nothing from BackendDataContext
   - Doesn't need: Everything
   - **Problem**: Loads ALL data unnecessarily

### Pages That DO Need Assignments:
1. **AssignmentManagement** (`/assignments`)
   - Needs: Assignments, Students, Teachers
   - ✅ Correctly loads assignments

2. **StudentAssignments** (`/student/assignments`)
   - Needs: Assignments (filtered by student)
   - ✅ Needs assignments

3. **TeacherDashboard** (`/dashboard` for teachers)
   - Needs: Assignments (for assigned students), Students, Teachers
   - ✅ Needs assignments

4. **SuperAdminDashboard** (`/dashboard` for superadmin)
   - Needs: Everything (overview page)
   - ✅ Correctly loads everything

5. **AdminDashboard** (`/dashboard` for admin)
   - Needs: Everything (overview page)
   - ✅ Correctly loads everything

---

## 🎯 Optimization Strategy

### Option 1: Lazy Load by Page (Recommended)
- Only load data when page actually needs it
- Use route-based data loading
- Cache data for 5 minutes

### Option 2: Page-Specific Data Hooks
- Create hooks like `useStudentsOnly()`, `useAssignmentsOnly()`
- Each page requests only what it needs

### Option 3: Conditional Loading in BackendDataContext
- Check current route
- Only load data needed for that route

---

## 📈 Performance Impact Estimates

### Current Performance:
- **Every page**: Loads ALL data (users, teachers, students, assignments, tickets, notifications, reviews)
- **Time**: 3-5 seconds initial load
- **Unnecessary API calls**: 5+ per page

### After Optimization:
- **TeacherStudentAssignmentManager**: Only students + teachers (2 API calls)
- **Time**: 500ms-1s (5x faster)
- **Unnecessary API calls**: 0

---

## 🚀 Implementation Plan

1. **Create page-specific data hooks**
2. **Update BackendDataContext to support selective loading**
3. **Update each page to request only needed data**
4. **Keep cache for instant subsequent loads**

---

## ✅ Next Steps

1. Implement lazy loading by route
2. Create `usePageData()` hook that loads based on route
3. Update all pages to use selective loading
4. Test performance improvements

