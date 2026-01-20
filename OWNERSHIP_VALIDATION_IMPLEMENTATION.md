# Ownership Validation Implementation

## Summary
Implemented comprehensive data ownership validation across all routes that access user-specific data.

## Helper Functions Created

### Location: `backend/server.js` (after `authenticateToken` middleware)

1. **`isAdminOrSuperadmin(role)`** - Utility function to check admin access
2. **`getStudentByUserId(userId)`** - Get student record by user ID
3. **`getTeacherByUserId(userId)`** - Get teacher record by user ID
4. **`isTeacherAssignedToStudent(teacherId, studentId)`** - Check teacher-student assignment
5. **`validateStudentOwnership`** - Middleware for student data access
6. **`validateAssignmentOwnership`** - Middleware for assignment access
7. **`validateTicketOwnership`** - Middleware for ticket access
8. **`validateTeacherOwnership`** - Middleware for teacher data access

## Ownership Rules Implemented

### Students
- ✅ Can ONLY access their own data
- ✅ Cannot access other students' data
- ✅ Cannot access teacher data

### Teachers
- ✅ Can ONLY access data for assigned students
- ✅ Can access tickets assigned to them OR for assigned students
- ✅ Can access their own teacher data
- ✅ Cannot access other teachers' data (unless admin)

### Admins
- ✅ Can access ALL data (bypasses ownership checks)
- ✅ Full access to students, teachers, assignments, tickets

## Routes Protected with Ownership Validation

### Student Routes (19 routes)

1. ✅ `GET /api/assignments/student/:studentId` - `validateStudentOwnership`
2. ✅ `PATCH /api/students/:id/recitation` - `validateStudentOwnership`
3. ✅ `GET /api/students/:studentId/personal-mushaf` - `validateStudentOwnership`
4. ✅ `GET /api/students/:studentId/personal-mushaf/filter` - `validateStudentOwnership`
5. ✅ `POST /api/students/:studentId/personal-mushaf/mistakes` - `validateStudentOwnership`
6. ✅ `GET /api/students/:studentId/homework-suggestions` - `validateStudentOwnership`
7. ✅ `GET /api/students/:studentId/pdf-homework` - `validateStudentOwnership`
8. ✅ `GET /api/tests/student/:studentId` - `validateStudentOwnership`
9. ✅ `GET /api/qaidah/:studentId/:book/:page` - `validateStudentOwnership`
10. ✅ `GET /api/qaidah/student-learning/:studentId/:book/:page/:date` - `validateStudentOwnership`
11. ✅ `GET /api/qaidah/student-learning/history/:studentId/:book/:page` - `validateStudentOwnership`
12. ✅ `POST /api/qaidah/student-learning/:studentId/:book/:page/:date` - `validateStudentOwnership`
13. ✅ `GET /api/tickets/previous-reports/:studentId/:type` - `validateStudentOwnership`
14. ✅ `GET /api/weekly-evaluations/student/:studentId` - `validateStudentOwnership`

### Assignment Routes (4 routes)

1. ✅ `GET /api/assignments/:id` - `validateAssignmentOwnership`
2. ✅ `POST /api/assignments/:id/submit-homework` - `validateAssignmentOwnership`
3. ✅ `PUT /api/assignments/:id` - `validateAssignmentOwnership` + `requirePermission`
4. ✅ `DELETE /api/assignments/:id` - `validateAssignmentOwnership` + `requirePermission`

### Ticket Routes (8 routes)

1. ✅ `GET /api/tickets/:id` - `validateTicketOwnership`
2. ✅ `PUT /api/tickets/:id` - `validateTicketOwnership`
3. ✅ `POST /api/tickets/:id/start` - `validateTicketOwnership`
4. ✅ `POST /api/tickets/:id/submit` - `validateTicketOwnership`
5. ✅ `POST /api/tickets/:id/approve-send` - `validateTicketOwnership`
6. ✅ `POST /api/tickets/:id/submit-sabq` - `validateTicketOwnership`
7. ✅ `POST /api/tickets/:id/reassign` - `validateTicketOwnership` + `requirePermission`
8. ✅ `DELETE /api/tickets/:id` - `validateTicketOwnership`

### Teacher Routes (2 routes)

1. ✅ `GET /api/teachers/:teacherId/weekly-evaluations` - `validateTeacherOwnership`
2. ✅ `GET /api/teacher-attendance/teacher/:teacherId` - `validateTeacherOwnership`

## Security Benefits

### Before
- ❌ Students could access other students' data
- ❌ Teachers could access any student's data
- ❌ No ownership validation on critical routes
- ❌ Data leakage risk

### After
- ✅ Students can ONLY access their own data (403 Forbidden otherwise)
- ✅ Teachers can ONLY access assigned students (403 Forbidden otherwise)
- ✅ Admins have full access (as designed)
- ✅ All routes validate ownership before data access
- ✅ Consistent error responses (403 Forbidden)

## Implementation Details

### Validation Flow
1. Extract user info from `req.user` (set by `authenticateToken`)
2. Extract target resource ID from route parameters
3. Check if user is admin/superadmin → Allow access
4. For students: Verify student._id matches target ID
5. For teachers: Verify teacher is assigned to target student
6. For assignments/tickets: Verify ownership through related student
7. Return 403 Forbidden if ownership cannot be verified

### Error Responses
All ownership validation failures return:
```json
{
  "error": "Access denied. [specific reason]"
}
```
Status Code: `403 Forbidden`

### Database Queries
- Ownership validation queries are optimized:
  - Student lookups by `userId` (indexed)
  - Teacher lookups by `userId` (indexed)
  - Teacher-student assignment checks use `assignedStudents` array
  - Resources (assignments/tickets) are fetched once and attached to `req` for reuse

## Notes

- Ownership validation middleware is applied **AFTER** `authenticateToken`
- Resources fetched during validation are attached to `req` (e.g., `req.assignment`, `req.ticket`) to avoid duplicate queries
- All validation logic is centralized in reusable helper functions
- No code duplication across routes
- Consistent error handling and messages

## Testing Recommendations

1. Test student accessing their own data → ✅ Should succeed
2. Test student accessing another student's data → ❌ Should return 403
3. Test teacher accessing assigned student's data → ✅ Should succeed
4. Test teacher accessing non-assigned student's data → ❌ Should return 403
5. Test admin accessing any data → ✅ Should succeed
6. Test invalid resource IDs → ❌ Should return 404 before ownership check
