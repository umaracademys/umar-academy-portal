# API Audit Report

**Date:** 2026-01-09  
**Status:** 🔍 Initial Audit Complete - Review Required

---

## Executive Summary

- **Total Backend Routes Found:** 197
- **Total Frontend API Calls Found:** ~150+ (estimated, needs detailed extraction)
- **Routes with ⚠️ NEEDS VERIFICATION:** Multiple endpoints found in backend but need frontend verification
- **Critical Missing Endpoints:** 7 endpoints called by frontend but not found in backend
- **Unused Backend Routes:** ~20+ routes found in backend but not verified in frontend

---

## Critical Issues Found

### 1. Frontend Calling Non-Existent Endpoints

| Frontend File | API Called | Backend Exists? | Issue | Recommendation |
|---------------|------------|-----------------|-------|----------------|
| `EnhancedAssignmentForm.tsx` | `POST /api/assignments/upload-homework-file` | ❌ NO | Endpoint not found in backend | **CRITICAL:** Create endpoint or remove frontend call |
| `TeacherEvaluationAssignments.tsx` | `GET /api/evaluation-assignments` | ⚠️ UNVERIFIED | Found in backend routes but needs verification | Verify endpoint exists and works |
| `BackendDataContext.tsx` | `POST /api/recitation-reviews/:reviewId/convert-to-assignment` | ⚠️ UNVERIFIED | Found in backend routes but needs verification | Verify endpoint exists and works |

### 2. Backend Routes Not Used by Frontend

| Backend Route | Method | Purpose | Used in Frontend? | Recommendation |
|---------------|--------|---------|-------------------|----------------|
| `/api/evaluation-assignments` | GET | Get evaluation assignments | ⚠️ UNVERIFIED | Verify if needed |
| `/api/evaluation-results` | GET | Get evaluation results | ⚠️ UNVERIFIED | Verify if needed |
| `/api/evaluations` | GET | Get evaluations | ⚠️ UNVERIFIED | Verify if needed |
| `/api/teacher-pairs` | GET | Get teacher pairs | ⚠️ UNVERIFIED | Verify if needed |
| `/api/pair-students` | GET | Get pair students | ⚠️ UNVERIFIED | Verify if needed |
| `/api/pair-daily-reports` | GET | Get pair daily reports | ⚠️ UNVERIFIED | Verify if needed |
| `/api/pair-teacher-messages` | GET | Get pair teacher messages | ⚠️ UNVERIFIED | Verify if needed |
| `/api/teacher-student-messages` | GET | Get teacher-student messages | ⚠️ UNVERIFIED | Verify if needed |
| `/api/tests` | POST | Create test | ⚠️ UNVERIFIED | Verify if needed |

### 3. Inconsistent Authentication Requirements

| Endpoint | Backend Auth | Frontend Expects Auth? | Issue |
|----------|--------------|------------------------|-------|
| `/api/users` | ❌ No | ✅ Yes (sometimes) | Inconsistent - some calls include auth headers |
| `/api/students` | ❌ No | ✅ Yes (sometimes) | Inconsistent - some calls include auth headers |
| `/api/teachers` | ❌ No | ✅ Yes (sometimes) | Inconsistent - some calls include auth headers |

---

## Detailed Frontend API Call Analysis

### BackendDataContext.tsx (Primary Data Context)

| API Called | Method | Backend Exists? | Auth Required? | Status |
|------------|--------|-----------------|----------------|--------|
| `/api/users` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/teachers` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/students` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/admins` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/assignments` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/tickets` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/recitation-reviews` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/admin-notifications` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/teacher-notifications` | GET | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/users/:id` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/users/:id` | PUT | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/students/:id` | PUT | ✅ Yes | ❌ No | ✅ OK |
| `/api/students/:id` | DELETE | ✅ Yes | ❌ No | ✅ OK |
| `/api/students/:id/recitation` | PATCH | ✅ Yes | ❌ No | ✅ OK |
| `/api/assignments` | POST | ✅ Yes | ❌ No | ✅ OK |
| `/api/assignments/:id` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/assignments/:id` | PUT | ✅ Yes | ❌ No | ✅ OK |
| `/api/tickets` | POST | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/tickets/:id` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/tickets/:id` | PUT | ✅ Yes | ❌ No | ✅ OK |
| `/api/tickets/:id/start` | POST | ✅ Yes | ❌ No | ✅ OK |
| `/api/tickets/:id/submit` | POST | ✅ Yes | ❌ No | ✅ OK |
| `/api/tickets/:id/approve-send` | POST | ✅ Yes | ❌ No | ✅ OK |
| `/api/tickets/:id/reassign` | POST | ✅ Yes | ❌ No | ✅ OK |
| `/api/tickets/previous-reports/:studentId/:type` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/tickets/fix-missing-assignment-ids` | POST | ✅ Yes | ❌ No | ✅ OK |
| `/api/tickets/bulk-delete` | POST | ❌ NO | ❌ NO | **CRITICAL:** Endpoint missing |
| `/api/tickets/:ticketId/assign-next` | POST | ❌ NO | ❌ NO | **CRITICAL:** Endpoint missing |
| `/api/tickets/:ticketId/approve` | POST | ❌ NO | ❌ NO | **CRITICAL:** Endpoint missing |
| `/api/tickets/:ticketId/approve-and-advance` | POST | ❌ NO | ❌ NO | **CRITICAL:** Endpoint missing |
| `/api/tickets/:ticketId/skip-to-finalize` | POST | ❌ NO | ❌ NO | **CRITICAL:** Endpoint missing |
| `/api/tickets/:ticketId/finalize` | POST | ❌ NO | ❌ NO | **CRITICAL:** Endpoint missing |
| `/api/recitation-reviews/:id` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/recitation-reviews/:id` | PUT | ✅ Yes | ❌ No | ✅ OK |
| `/api/recitation-reviews/:reviewId/convert-to-assignment` | POST | ⚠️ UNVERIFIED | ⚠️ UNVERIFIED | Needs verification |
| `/api/admin-notifications/:notificationId/read` | PUT | ✅ Yes | ❌ No | ✅ OK |
| `/api/admin-notifications/read-all` | PUT | ✅ Yes | ❌ No | ✅ OK |
| `/api/teacher-notifications/:notificationId/read` | PUT | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/teacher-notifications/read-all` | PUT | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/students/:studentId/personal-mushaf` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/students/:studentId/personal-mushaf/mistakes` | POST | ✅ Yes | ❌ No | ✅ OK |
| `/api/listening-sessions/start` | POST | ✅ Yes | ❌ No | ✅ OK |
| `/api/listening-sessions/:id` | PATCH | ✅ Yes | ❌ No | ✅ OK |
| `/api/listening-sessions/:id/end` | POST | ✅ Yes | ❌ No | ✅ OK |

### TeacherStudentAssignmentManager.tsx

| API Called | Method | Backend Exists? | Auth Required? | Status |
|------------|--------|-----------------|----------------|--------|
| `/api/teachers/sync-assigned-students` | POST | ✅ Yes | ❌ No | ✅ OK |

### EnhancedAssignmentForm.tsx

| API Called | Method | Backend Exists? | Auth Required? | Status |
|------------|--------|-----------------|----------------|--------|
| `/api/assignments/upload-homework-file` | POST | ❌ NO | ❌ NO | **CRITICAL:** Endpoint missing |

### TeacherEvaluationAssignments.tsx

| API Called | Method | Backend Exists? | Auth Required? | Status |
|------------|--------|-----------------|----------------|--------|
| `/api/evaluation-assignments` | GET | ⚠️ UNVERIFIED | ⚠️ UNVERIFIED | Needs verification |

### Messaging Components

| API Called | Method | Backend Exists? | Auth Required? | Status |
|------------|--------|-----------------|----------------|--------|
| `/api/conversations` | GET | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/conversations` | POST | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/conversations/:conversationId/messages` | GET | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/conversations/:conversationId/messages` | POST | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/conversations/:conversationId/messages/upload` | POST | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/conversations/admin/stats` | GET | ✅ Yes | ✅ Yes | ✅ OK |

### PDF Services

| API Called | Method | Backend Exists? | Auth Required? | Status |
|------------|--------|-----------------|----------------|--------|
| `/api/pdfs/upload` | POST | ⚠️ UNVERIFIED | ⚠️ UNVERIFIED | Needs verification |
| `/api/pdfs` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/pdfs/:id` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/pdfs/:id` | PUT | ⚠️ UNVERIFIED | ⚠️ UNVERIFIED | Needs verification |
| `/api/pdfs/:id` | DELETE | ✅ Yes | ❌ No | ✅ OK |
| `/api/pdfs/:pdfId/annotations` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/pdfs/:pdfId/annotations` | POST | ⚠️ UNVERIFIED | ⚠️ UNVERIFIED | Needs verification |
| `/api/pdfs/:pdfId/annotations/assign` | POST | ⚠️ UNVERIFIED | ⚠️ UNVERIFIED | Needs verification |
| `/api/students/:studentId/pdf-homework` | GET | ✅ Yes | ❌ No | ✅ OK |

### Qaidah Services

| API Called | Method | Backend Exists? | Auth Required? | Status |
|------------|--------|-----------------|----------------|--------|
| `/api/qaidah/:studentId/:book/:page` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/qaidah/save` | POST | ⚠️ UNVERIFIED | ⚠️ UNVERIFIED | Needs verification |
| `/api/qaidah/pages/:book` | GET | ✅ Yes | ❌ No | ✅ OK |

### Quran Services

| API Called | Method | Backend Exists? | Auth Required? | Status |
|------------|--------|-----------------|----------------|--------|
| `/api/quran/pages/:pageNumber` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/quran/pages/:pageNumber/verses` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/quran/chapters` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/quran/surahs/:surahId/verses` | GET | ✅ Yes | ❌ No | ✅ OK |

### AI Features

| API Called | Method | Backend Exists? | Auth Required? | Status |
|------------|--------|-----------------|----------------|--------|
| `/api/ai/phrases/categories` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/ai/phrases/categories` | POST | ✅ Yes | ❌ No | ✅ OK |
| `/api/ai/phrases/categories/:name` | PUT | ✅ Yes | ❌ No | ✅ OK |
| `/api/ai/phrases/categories/:name` | DELETE | ✅ Yes | ❌ No | ✅ OK |
| `/api/ai/phrases` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/ai/phrases` | POST | ✅ Yes | ❌ No | ✅ OK |
| `/api/ai/phrases/:id` | PUT | ✅ Yes | ❌ No | ✅ OK |
| `/api/ai/phrases/:id` | DELETE | ✅ Yes | ❌ No | ✅ OK |
| `/api/ai/phrases/init-categories` | POST | ✅ Yes | ❌ No | ✅ OK |

### Weekly Evaluations

| API Called | Method | Backend Exists? | Auth Required? | Status |
|------------|--------|-----------------|----------------|--------|
| `/api/weekly-evaluations` | GET | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/weekly-evaluations` | POST | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/weekly-evaluations/:id` | GET | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/weekly-evaluations/:id` | PUT | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/weekly-evaluations/:id` | DELETE | ✅ Yes | ❌ No | ⚠️ Inconsistent auth |
| `/api/weekly-evaluations/:id/submit` | POST | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/weekly-evaluations/:id/approve` | POST | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/weekly-evaluations/:id/reject` | POST | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/weekly-evaluations/:id/admin-feedback` | POST | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/weekly-evaluations/:id/assign-homework` | POST | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/weekly-evaluations/student/:studentId` | GET | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/weekly-evaluations/approved` | GET | ✅ Yes | ✅ Yes | ✅ OK |
| `/api/teachers/:teacherId/weekly-evaluations` | GET | ✅ Yes | ✅ Yes | ✅ OK |

### Student Services

| API Called | Method | Backend Exists? | Auth Required? | Status |
|------------|--------|-----------------|----------------|--------|
| `/api/students/:studentId/homework-suggestions` | GET | ✅ Yes | ❌ No | ✅ OK |
| `/api/assignments/:assignmentId/submit-homework` | POST | ✅ Yes | ❌ No | ✅ OK |

### Authentication

| API Called | Method | Backend Exists? | Auth Required? | Status |
|------------|--------|-----------------|----------------|--------|
| `/api/auth/login` | POST | ✅ Yes | ❌ No | ✅ OK |
| `/api/auth/request-unlock` | POST | ✅ Yes | ❌ No | ✅ OK |

### Public Registration

| API Called | Method | Backend Exists? | Auth Required? | Status |
|------------|--------|-----------------|----------------|--------|
| `/api/public/student-registration` | POST | ✅ Yes | ❌ No | ✅ OK |

### Audio Service

| API Called | Method | Backend Exists? | Auth Required? | Status |
|------------|--------|-----------------|----------------|--------|
| `/api/mistakes/audio` | POST | ✅ Yes | ❌ No | ✅ OK |

---

## Recommendations

### Immediate Actions Required

1. **Create Missing Endpoints:**
   - `POST /api/assignments/upload-homework-file` - Used by EnhancedAssignmentForm
   - `POST /api/tickets/bulk-delete` - Used by BackendDataContext
   - `POST /api/tickets/:ticketId/assign-next` - Used by BackendDataContext
   - `POST /api/tickets/:ticketId/approve` - Used by BackendDataContext
   - `POST /api/tickets/:ticketId/approve-and-advance` - Used by BackendDataContext
   - `POST /api/tickets/:ticketId/skip-to-finalize` - Used by BackendDataContext
   - `POST /api/tickets/:ticketId/finalize` - Used by BackendDataContext

2. **Verify Unverified Endpoints:**
   - Test all endpoints marked with ⚠️ UNVERIFIED
   - Confirm they work as expected
   - Update api-map.md with verification status

3. **Fix Authentication Inconsistencies:**
   - Standardize auth requirements for `/api/users`, `/api/students`, `/api/teachers`
   - Update frontend to match backend requirements
   - Document auth requirements in api-map.md

4. **Remove or Implement Unused Backend Routes:**
   - Evaluate if unused routes are needed
   - Either implement frontend calls or remove backend routes
   - Document decision in api-map.md

### Long-Term Improvements

1. **API Versioning:** Consider adding `/api/v1/` prefix for future API changes
2. **OpenAPI/Swagger:** Generate API documentation from code
3. **API Testing:** Create integration tests for all endpoints
4. **Type Safety:** Generate TypeScript types from API schema
5. **Rate Limiting:** Document rate limits in api-map.md

---

## Next Steps

1. ✅ Backend routes extracted and documented
2. ⏳ Frontend API calls extraction (in progress)
3. ⏳ Cross-reference frontend calls with backend routes
4. ⏳ Verify all endpoints work correctly
5. ⏳ Fix critical issues (missing endpoints)
6. ⏳ Update api-map.md with verified status
7. ⏳ Create integration tests

---

## Notes

- This audit is based on static code analysis
- Some endpoints may be dynamically generated or called conditionally
- Frontend API extraction needs manual review of key files
- Some endpoints may be legacy and no longer used

