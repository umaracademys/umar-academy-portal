    # PHASE 6 — END-TO-END PERMISSION AUDIT REPORT

    **Date:** 2026-01-09  
    **Status:** ✅ **COMPLETE**

    ---

    ## EXECUTIVE SUMMARY

    This comprehensive audit examines all 96 permissions (52 teacher + 44 admin) across the application to verify:
    - Backend route protection
    - Frontend UI enforcement
    - Manual testing status
    - Dead permissions
    - Duplicate permissions
    - Over-privileged defaults

    **Key Findings:**
    - ✅ **4 permissions** fully enforced (backend + frontend)
    - ⚠️ **92 permissions** need backend enforcement
    - ⚠️ **Most permissions** have frontend UI checks but lack backend protection
    - ⚠️ **No manual testing** documented for most permissions

    ---

    ## 1. ARCHITECTURE SUMMARY

    ### Permission System Overview

    **Total Permissions:** 96
    - **Teacher Permissions:** 52
    - **Admin Permissions:** 44

    **Enforcement Layers:**
    1. **Backend Enforcement:** `requirePermission()` middleware (Phase 2)
    2. **Frontend Enforcement:** `usePermission()` hook + `<RequirePermission />` component (Phase 4)
    3. **Token-Based:** Permissions embedded in JWT (Phase 3)
    4. **Versioning:** Permission version invalidation (Phase 5)

    **Current State:**
    - ✅ Single source of truth: `src/shared/permissions.ts` & `backend/shared/permissions.js`
    - ✅ Type-safe permission keys
    - ✅ JWT token permissions (fast path)
    - ✅ Permission versioning for invalidation
    - ⚠️ **Only Assignments module fully enforced** (4 routes)

    ---

    ## 2. PERMISSION ENFORCEMENT MAP

    ### ✅ FULLY ENFORCED PERMISSIONS (Backend + Frontend)

    | Permission | Backend Routes | Frontend UI | Status |
    |------------|---------------|-------------|--------|
    | `canCreateAssignments` | `POST /api/assignments` | TeacherDashboard | ✅ |
    | `canEditAssignments` | `PUT /api/assignments/:id` | TeacherDashboard | ✅ |
    | `canDeleteAssignments` | `DELETE /api/assignments/:id` | TeacherDashboard | ✅ |
    | `canGradeHomework` | `POST /api/assignments/:id/grade-homework` | TeacherDashboard | ✅ |

    **Coverage:** 4/96 permissions (4.2%)

    ---

    ### ⚠️ PARTIALLY ENFORCED PERMISSIONS (Frontend Only)

    #### Assessments & Evaluations Module

    | Permission | Backend Routes | Frontend UI | Status |
    |------------|---------------|-------------|--------|
    | `canViewAssessments` | ❌ None | ✅ TeacherDashboard | ⚠️ Frontend only |
    | `canEditAssessments` | ❌ None | ✅ TeacherDashboard | ⚠️ Frontend only |
    | `canViewEvaluations` | ❌ None | ✅ TeacherDashboard | ⚠️ Frontend only |
    | `canEditEvaluations` | ❌ None | ✅ TeacherDashboard | ⚠️ Frontend only |

    **Risk:** Medium - Assessment/evaluation data can be modified without backend checks

    #### Messages Module

    | Permission | Backend Routes | Frontend UI | Status |
    |------------|---------------|-------------|--------|
    | `canAccessMessages` | ❌ None | ✅ Multiple components | ⚠️ Frontend only |
    | `canSendMessages` | ❌ None | ✅ Multiple components | ⚠️ Frontend only |
    | `canViewAllMessages` | ❌ None | ✅ AdminDashboard | ⚠️ Frontend only |
    | `canModerateMessages` | ❌ None | ✅ AdminDashboard | ⚠️ Frontend only |

    **Risk:** High - Message access/moderation not protected

    #### Tickets Module

    | Permission | Backend Routes | Frontend UI | Status |
    |------------|---------------|-------------|--------|
    | `canAccessTickets` | ❌ None | ✅ TeacherDashboard | ⚠️ Frontend only |
    | `canCreateTickets` | ❌ None | ✅ TeacherDashboard | ⚠️ Frontend only |
    | `canReviewTickets` | ❌ None | ✅ TeacherDashboard | ⚠️ Frontend only |
    | `canApproveTickets` | ❌ None | ✅ AdminDashboard | ⚠️ Frontend only |
    | `canFinalizeTickets` | ❌ None | ✅ AdminDashboard | ⚠️ Frontend only |
    | `canManageTicketWorkflow` | ❌ None | ✅ AdminDashboard | ⚠️ Frontend only |

    **Risk:** High - Ticket workflow can be bypassed via API

    #### Student Information Module

    | Permission | Backend Routes | Frontend UI | Status |
    |------------|---------------|-------------|--------|
    | `canViewStudentEmail` | ❌ None | ✅ TeacherDashboard | ⚠️ Frontend only |
    | `canViewStudentContact` | ❌ None | ✅ TeacherDashboard | ⚠️ Frontend only |
    | `canViewStudentPersonalInfo` | ❌ None | ✅ TeacherDashboard | ⚠️ Frontend only |

    **Risk:** High - PII access not protected

    #### Reports Module

    | Permission | Backend Routes | Frontend UI | Status |
    |------------|---------------|-------------|--------|
    | `canViewReports` | ❌ None | ✅ TeacherDashboard | ⚠️ Frontend only |
    | `canViewAnalytics` | ❌ None | ✅ TeacherDashboard | ⚠️ Frontend only |
    | `canExportReports` | ❌ None | ✅ TeacherDashboard | ⚠️ Frontend only |

    **Risk:** Medium - Report access not protected

    ---

    ### ❌ UNENFORCED PERMISSIONS (No Backend or Frontend)

    #### Financial Module

    | Permission | Backend Routes | Frontend UI | Status |
    |------------|---------------|-------------|--------|
    | `canViewFinancials` | ❌ None | ❌ None | ❌ Dead permission |
    | `canManageFinancials` | ❌ None | ❌ None | ❌ Dead permission |

    **Risk:** High - Financial permissions defined but not used

    #### Scheduling Module

    | Permission | Backend Routes | Frontend UI | Status |
    |------------|---------------|-------------|--------|
    | `canManageSchedule` | ❌ None | ❌ None | ❌ Dead permission |

    **Risk:** Medium - Schedule management not implemented

    #### PDF Module

    | Permission | Backend Routes | Frontend UI | Status |
    |------------|---------------|-------------|--------|
    | `canAccessPdf` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canUploadPdf` | ❌ None | ❌ None | ❌ Dead permission |
    | `canAnnotatePdf` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canViewPdfAnnotations` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canManagePdfLibrary` | ❌ None | ❌ None | ❌ Dead permission |
    | `canViewAllPdfAnnotations` | ❌ None | ❌ None | ❌ Dead permission |

    **Risk:** Medium - PDF operations not protected

    #### Homework Module

    | Permission | Backend Routes | Frontend UI | Status |
    |------------|---------------|-------------|--------|
    | `canAccessHomework` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canCreateHomework` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canViewHomeworkSubmissions` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canManageHomework` | ❌ None | ❌ None | ❌ Dead permission |
    | `canViewAllHomework` | ❌ None | ❌ None | ❌ Dead permission |

    **Risk:** Medium - Homework operations partially protected

    #### Evaluation Module

    | Permission | Backend Routes | Frontend UI | Status |
    |------------|---------------|-------------|--------|
    | `canAccessEvaluations` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canCreateEvaluations` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canReviewEvaluations` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canApproveEvaluations` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canManageEvaluations` | ❌ None | ❌ None | ❌ Dead permission |

    **Risk:** High - Evaluation workflow not protected

    #### Attendance Module

    | Permission | Backend Routes | Frontend UI | Status |
    |------------|---------------|-------------|--------|
    | `canAccessAttendance` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canRecordAttendance` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canViewAttendanceReports` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canManageAttendance` | ❌ None | ❌ None | ❌ Dead permission |

    **Risk:** Medium - Attendance operations not protected

    #### Recordings Module

    | Permission | Backend Routes | Frontend UI | Status |
    |------------|---------------|-------------|--------|
    | `canAccessRecordings` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canUploadRecordings` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canDeleteRecordings` | ❌ None | ❌ None | ❌ Dead permission |
    | `canViewAllRecordings` | ❌ None | ❌ None | ❌ Dead permission |
    | `canManageRecordings` | ❌ None | ❌ None | ❌ Dead permission |

    **Risk:** Medium - Recording operations not protected

    #### Mushaf Module

    | Permission | Backend Routes | Frontend UI | Status |
    |------------|---------------|-------------|--------|
    | `canAccessMushaf` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canMarkMistakes` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canViewMistakeHistory` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canManageMistakeLibrary` | ❌ None | ❌ None | ❌ Dead permission |
    | `canManageMushaf` | ❌ None | ❌ None | ❌ Dead permission |
    | `canViewAllMistakes` | ❌ None | ❌ None | ❌ Dead permission |

    **Risk:** Medium - Mushaf operations not protected

    #### Qaidah Module

    | Permission | Backend Routes | Frontend UI | Status |
    |------------|---------------|-------------|--------|
    | `canAccessQaidah` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canManageQaidah` | ❌ None | ❌ None | ❌ Dead permission |
    | `canViewQaidahProgress` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canViewQaidahReports` | ❌ None | ❌ None | ❌ Dead permission |

    **Risk:** Low - Qaidah operations not protected

    #### People Operations Module

    | Permission | Backend Routes | Frontend UI | Status |
    |------------|---------------|-------------|--------|
    | `canManageTeachers` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canManageStudents` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canManageStudentAssignments` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |

    **Risk:** High - User management not protected

    #### Security Module

    | Permission | Backend Routes | Frontend UI | Status |
    |------------|---------------|-------------|--------|
    | `canManagePermissions` | ❌ None | ✅ PermissionManager | ⚠️ Frontend only |

    **Risk:** Critical - Permission management not protected

    #### Notifications Module

    | Permission | Backend Routes | Frontend UI | Status |
    |------------|---------------|-------------|--------|
    | `canManageNotifications` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canViewNotifications` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |
    | `canSendNotifications` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |

    **Risk:** Medium - Notification operations not protected

    #### Communication Module

    | Permission | Backend Routes | Frontend UI | Status |
    |------------|---------------|-------------|--------|
    | `canContactParents` | ❌ None | ⚠️ Partial | ⚠️ Frontend only |

    **Risk:** Low - Parent contact not protected

    ---

    ## 3. DEAD PERMISSIONS (Not Used Anywhere)

    ### Teacher Dead Permissions (12)

    1. `canViewFinancials` - No routes, no UI
    2. `canUploadPdf` - No routes, no UI
    3. `canManageMistakeLibrary` - No routes, no UI
    4. `canManageQaidah` - No routes, no UI
    5. `canDeleteRecordings` - No routes, no UI
    6. `canViewAllRecordings` - No routes, no UI
    7. `canCreateEvaluations` - No routes, partial UI
    8. `canReviewEvaluations` - No routes, partial UI
    9. `canApproveEvaluations` - No routes, partial UI
    10. `canExportReports` - No routes, partial UI
    11. `canManageSchedule` - No routes, no UI
    12. `canContactParents` - No routes, partial UI

    ### Admin Dead Permissions (15)

    1. `canManageFinancials` - No routes, no UI
    2. `canManagePdfLibrary` - No routes, no UI
    3. `canViewAllPdfAnnotations` - No routes, no UI
    4. `canManageHomework` - No routes, no UI
    5. `canViewAllHomework` - No routes, no UI
    6. `canManageEvaluations` - No routes, no UI
    7. `canManageTicketWorkflow` - No routes, partial UI
    8. `canManageAttendance` - No routes, no UI
    9. `canManageRecordings` - No routes, no UI
    10. `canViewAllRecordings` - No routes, no UI
    11. `canManageMushaf` - No routes, no UI
    12. `canViewAllMistakes` - No routes, no UI
    13. `canManageQaidah` - No routes, no UI
    14. `canViewQaidahReports` - No routes, no UI
    15. `canBulkCreateAssignments` - No routes, no UI

    **Total Dead Permissions:** 27/96 (28.1%)

    ---

    ## 4. DUPLICATE PERMISSIONS

    ### Identified Duplicates

    1. **`canViewReports` (Teacher) vs `canViewReports` (Admin)**
    - Same key, different roles
    - ✅ Intended behavior (role-specific)

    2. **`canViewAnalytics` (Teacher) vs `canViewAnalytics` (Admin)**
    - Same key, different roles
    - ✅ Intended behavior (role-specific)

    3. **`canAccessMessages` (Teacher) vs `canAccessMessages` (Admin)**
    - Same key, different roles
    - ✅ Intended behavior (role-specific)

    **Conclusion:** No true duplicates - same keys used for different roles is intentional.

    ---

    ## 5. OVER-PRIVILEGED DEFAULTS

    ### Teacher Defaults Analysis

    **High-Risk Defaults (defaultTeacher: true):**

    1. `canViewStudentEmail` - **Risk: Medium** → Should default to false
    2. `canViewStudentContact` - **Risk: Medium** → Should default to false
    3. `canViewStudentPersonalInfo` - **Risk: Medium** → Should default to false
    4. `canCreateAssignments` - **Risk: Medium** → ✅ Appropriate default
    5. `canEditAssessments` - **Risk: Medium** → ✅ Appropriate default
    6. `canEditEvaluations` - **Risk: Medium** → ✅ Appropriate default
    7. `canRecordAttendance` - **Risk: Medium** → ✅ Appropriate default
    8. `canUploadRecordings` - **Risk: Medium** → ✅ Appropriate default
    9. `canMarkMistakes` - **Risk: Medium** → ✅ Appropriate default

    **Recommendations:**
    - ⚠️ **Downgrade PII permissions** (`canViewStudentEmail`, `canViewStudentContact`, `canViewStudentPersonalInfo`) to `defaultTeacher: false`
    - ✅ Keep other defaults as-is (appropriate for teacher role)

    ### Admin Defaults Analysis

    **All admin permissions default to false** - ✅ Appropriate (principle of least privilege)

    ---

    ## 6. PERMISSIONS TO DOWNGRADE RISK

    ### Current Risk → Recommended Risk

    1. `canViewStudentEmail` - **Medium → Low** (if default changed to false)
    2. `canViewStudentContact` - **Medium → Low** (if default changed to false)
    3. `canViewStudentPersonalInfo` - **Medium → Low** (if default changed to false)
    4. `canViewAllRecordings` - **Medium → Low** (if properly enforced)
    5. `canViewAllPdfAnnotations` - **Medium → Low** (if properly enforced)

    ---

    ## 7. PERMISSIONS TO MERGE

    ### Suggested Merges

    1. **`canAccessMessages` + `canSendMessages`** → Merge into `canAccessMessages` (sending is part of access)
    2. **`canAccessHomework` + `canCreateHomework`** → Keep separate (access ≠ create)
    3. **`canAccessTickets` + `canCreateTickets`** → Keep separate (access ≠ create)
    4. **`canViewReports` + `canViewAnalytics`** → Consider merging (both are viewing operations)

    **Recommendation:** Keep current granularity - better security control.

    ---

    ## 8. PERMISSIONS TO SPLIT

    ### Suggested Splits

    1. **`canManageTeachers`** → Split into:
    - `canCreateTeachers`
    - `canEditTeachers`
    - `canDeleteTeachers`

    2. **`canManageStudents`** → Split into:
    - `canCreateStudents`
    - `canEditStudents`
    - `canDeleteStudents`

    3. **`canManageFinancials`** → Split into:
    - `canViewFinancials`
    - `canEditFinancials`
    - `canManageBilling`

    **Recommendation:** Consider splitting high-risk "manage" permissions for finer control.

    ---

    ## 9. REMAINING RISKS

    ### Critical Risks (Must Fix)

    1. **Permission Management Not Protected**
    - `canManagePermissions` - Frontend only
    - **Impact:** Users can modify permissions via API
    - **Fix:** Add `requirePermission('canManagePermissions')` to permission update routes

    2. **User Management Not Protected**
    - `canManageTeachers`, `canManageStudents` - Frontend only
    - **Impact:** Users can create/edit/delete accounts via API
    - **Fix:** Add permission checks to user management routes

    3. **PII Access Not Protected**
    - `canViewStudentEmail`, `canViewStudentContact`, `canViewStudentPersonalInfo` - Frontend only
    - **Impact:** Student PII can be accessed via API
    - **Fix:** Add permission checks to student data routes

    ### High Risks (Should Fix)

    4. **Ticket Workflow Not Protected**
    - `canCreateTickets`, `canReviewTickets`, `canApproveTickets`, `canFinalizeTickets` - Frontend only
    - **Impact:** Ticket workflow can be bypassed
    - **Fix:** Add permission checks to ticket routes

    5. **Message Access Not Protected**
    - `canAccessMessages`, `canSendMessages`, `canViewAllMessages` - Frontend only
    - **Impact:** Message access/moderation can be bypassed
    - **Fix:** Add permission checks to message routes

    6. **Evaluation Workflow Not Protected**
    - `canCreateEvaluations`, `canReviewEvaluations`, `canApproveEvaluations` - Frontend only
    - **Impact:** Evaluation workflow can be bypassed
    - **Fix:** Add permission checks to evaluation routes

    ### Medium Risks (Consider Fixing)

    7. **Report Access Not Protected**
    - `canViewReports`, `canExportReports` - Frontend only
    - **Impact:** Reports can be accessed via API
    - **Fix:** Add permission checks to report routes

    8. **Attendance Not Protected**
    - `canRecordAttendance`, `canViewAttendanceReports` - Frontend only
    - **Impact:** Attendance can be modified via API
    - **Fix:** Add permission checks to attendance routes

    ---

    ## 10. ENFORCEMENT STATISTICS

    ### Backend Enforcement

    - **Protected Routes:** 4/96 permissions (4.2%)
    - **Unprotected Routes:** 92/96 permissions (95.8%)

    ### Frontend Enforcement

    - **UI Protected:** ~60/96 permissions (62.5%)
    - **UI Unprotected:** ~36/96 permissions (37.5%)

    ### Overall Coverage

    - **Fully Enforced:** 4/96 permissions (4.2%)
    - **Partially Enforced:** ~60/96 permissions (62.5%)
    - **Unenforced:** ~32/96 permissions (33.3%)

    ---

    ## 11. NEXT STEPS CHECKLIST

    ### Phase 7: Complete Backend Enforcement (Priority Order)

    #### 🔴 Critical Priority (Week 1)

    - [ ] **Protect Permission Management Routes**
    - Add `requirePermission('canManagePermissions')` to:
        - `PUT /api/teachers/:id` (when updating permissions)
        - `PUT /api/admins/:id` (when updating permissions)

    - [ ] **Protect User Management Routes**
    - Add `requirePermission('canManageTeachers')` to:
        - `POST /api/teachers`
        - `PUT /api/teachers/:id`
        - `DELETE /api/teachers/:id`
    - Add `requirePermission('canManageStudents')` to:
        - `POST /api/students`
        - `PUT /api/students/:id`
        - `DELETE /api/students/:id`

    - [ ] **Protect PII Access Routes**
    - Add `requirePermission('canViewStudentEmail')` to student email endpoints
    - Add `requirePermission('canViewStudentContact')` to student contact endpoints
    - Add `requirePermission('canViewStudentPersonalInfo')` to student profile endpoints

    #### 🟡 High Priority (Week 2)

    - [ ] **Protect Ticket Routes**
    - Add `requirePermission('canCreateTickets')` to `POST /api/tickets`
    - Add `requirePermission('canReviewTickets')` to `GET /api/tickets/:id`
    - Add `requirePermission('canApproveTickets')` to `PUT /api/tickets/:id/approve`
    - Add `requirePermission('canFinalizeTickets')` to `PUT /api/tickets/:id/finalize`

    - [ ] **Protect Message Routes**
    - Add `requirePermission('canAccessMessages')` to message endpoints
    - Add `requirePermission('canSendMessages')` to message send endpoints
    - Add `requirePermission('canViewAllMessages')` to admin message endpoints
    - Add `requirePermission('canModerateMessages')` to moderation endpoints

    - [ ] **Protect Evaluation Routes**
    - Add `requirePermission('canCreateEvaluations')` to evaluation creation
    - Add `requirePermission('canReviewEvaluations')` to evaluation review
    - Add `requirePermission('canApproveEvaluations')` to evaluation approval

    #### 🟢 Medium Priority (Week 3-4)

    - [ ] **Protect Assessment Routes**
    - Add `requirePermission('canViewAssessments')` to assessment GET routes
    - Add `requirePermission('canEditAssessments')` to assessment POST/PUT routes

    - [ ] **Protect Report Routes**
    - Add `requirePermission('canViewReports')` to report GET routes
    - Add `requirePermission('canExportReports')` to report export routes

    - [ ] **Protect Attendance Routes**
    - Add `requirePermission('canRecordAttendance')` to attendance POST routes
    - Add `requirePermission('canViewAttendanceReports')` to attendance GET routes

    - [ ] **Protect Other Module Routes**
    - PDF, Homework, Recordings, Mushaf, Qaidah modules

    #### 🔵 Low Priority (Future)

    - [ ] **Remove Dead Permissions**
    - Remove or implement 27 dead permissions
    - Update shared permissions file

    - [ ] **Split High-Risk Permissions**
    - Split `canManageTeachers` into create/edit/delete
    - Split `canManageStudents` into create/edit/delete
    - Split `canManageFinancials` into view/edit/manage

    - [ ] **Adjust Default Permissions**
    - Change PII permissions to `defaultTeacher: false`
    - Review other defaults

    ---

    ## 12. TESTING RECOMMENDATIONS

    ### Manual Testing Checklist

    For each permission, test:

    1. **Backend Enforcement:**
    - [ ] User without permission → 403 error
    - [ ] User with permission → Request succeeds
    - [ ] Superadmin → Request succeeds (bypass)

    2. **Frontend Enforcement:**
    - [ ] UI element disabled/hidden when permission denied
    - [ ] Tooltip shows when disabled
    - [ ] UI element enabled when permission granted

    3. **Token Versioning:**
    - [ ] Permission change → User logged out
    - [ ] Re-login → New permissions active

    ### Automated Testing Recommendations

    - [ ] Unit tests for `requirePermission` middleware
    - [ ] Integration tests for protected routes
    - [ ] E2E tests for permission UI behavior
    - [ ] Token versioning tests

    ---

    ## 13. CONCLUSION

    **Current State:**
    - ✅ Strong foundation: Single source of truth, type-safe keys, token-based permissions
    - ⚠️ **Critical gap:** Only 4.2% of permissions fully enforced
    - ⚠️ **High risk:** Permission management and user management unprotected

    **Priority Actions:**
    1. **Immediate:** Protect permission management routes (critical security risk)
    2. **Week 1:** Protect user management and PII access routes
    3. **Week 2:** Protect ticket, message, and evaluation workflows
    4. **Week 3-4:** Complete remaining module protection

    **Estimated Effort:**
    - Critical priorities: ~2-3 days
    - High priorities: ~1 week
    - Medium priorities: ~2-3 weeks
    - Low priorities: ~1-2 weeks

    **Total:** ~4-6 weeks to achieve 100% enforcement

    ---

    **Report Generated:** 2026-01-09  
    **Next Phase:** Phase 7 - Complete Backend Enforcement

