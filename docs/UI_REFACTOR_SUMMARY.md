# UI Foundation Refactor Summary

This document summarizes the refactor of the Umar Academy React frontend to use the new UI foundation (AppLayout, Card, Button, EmptyState, useLoadingState, api.ts).

---

## Completed Refactors

### 1. **API layer (`src/services/api.ts`)**
- **Added:** `getTeachers()`, `getPersonalMushaf(studentId)`.
- **Existing:** `getApiBase()`, `getAuthToken()`, `getAuthHeaders()`, `fetchApi()`, `getConversations()`, `getConversationStats()`, `lockConversation()`, `getStudents()`, `getAssignments()`, `getAssignmentsMe()`, `getTickets()`, `getTeacherAttendance()`.
- Use these helpers instead of inline `fetch` + `API_BASE`; pair with `useLoadingState` and `EmptyState` in the UI.

### 2. **StudentsPage** (template)
- **Layout:** Header + AppLayout + Sidebar (drawer on mobile via `sidebarOpen`).
- **UI:** Card (CardHeader, CardContent), Button (ui), EmptyState, useLoadingState for initial load.
- **Data:** Still uses `useData()`; loading/error/empty handled with `run(refreshData)` and EmptyState/loading spinner.

### 3. **TeachersPage**
- **Layout:** Header + AppLayout + Sidebar; same pattern as StudentsPage.
- **UI:** Card, Button, EmptyState, useLoadingState.
- **Data:** useData(); combined teachers+admins logic preserved; error/loading/empty via useLoadingState + EmptyState.

### 4. **PermissionsPage**
- **Layout:** Header + AppLayout + Sidebar.
- **UI:** Card for header + stats grid + Permission Manager; Button for Refresh; useLoadingState for load/refresh; EmptyState for error.
- **Access:** Superadmin-only gate unchanged.

### 5. **AssignmentManagement**
- **Layout:** Header + AppLayout + Sidebar (activeSection `assignments`).
- **UI:** Error/loading replaced with EmptyState and shared loading spinner; view-mode buttons use Button from `src/components/ui/Button.tsx`.
- **Structure:** Content wrapped in `{!displayError && ( <> ... )}`; modals remain inside AppLayout children.

### 6. **AdminDashboard**
- **Layout:** Switched to Header + AppLayout + Sidebar (same shell as StudentsPage/TeachersPage).
- **Content:** `renderSection()` and all modals are now children of AppLayout; no change to section content or modals.

### 7. **MessagesPage**
- **Layout:** Header + AppLayout + Sidebar (activeSection `messages`).
- **UI:** Card (CardHeader, CardContent), EmptyState for loading/empty; conversation list uses touch-friendly cards (`min-h-[44px]`, responsive grid).
- **Data:** Still uses `getTeacherStudentMessages` from BackendDataContext; loading/empty handled in-card.

---

## Shared Components Used

| Component / Hook | Location | Usage |
|-----------------|----------|--------|
| **AppLayout** | `src/components/layout/AppLayout.tsx` | Sidebar + main; `sidebarOpen` for mobile drawer. |
| **Card** | `src/components/ui/Card.tsx` | CardHeader, CardContent, CardFooter; `padding="none"` where needed. |
| **Button** | `src/components/ui/Button.tsx` | Primary/outline, `fullWidthMobile`, touch-friendly. |
| **EmptyState** | `src/components/ui/EmptyState.tsx` | Error/empty with optional Retry action. |
| **useLoadingState** | `src/hooks/useLoadingState.ts` | `run(fn)` for async load; loading/error state. |

---

## Pages Not Refactored (Deferred)

- **SuperAdminDashboard:** Still uses custom flex layout; can be switched to AppLayout in a follow-up.
- **TeacherDashboard, StudentDashboard:** Large pages; layout shell can be applied later.
- **TeacherAttendanceView, TeacherAttendanceManagement:** Can adopt AppLayout + Card + useLoadingState next.
- **ProfessionalMessagesPage, SuperAdminMessagesPage:** Can adopt same layout + api.ts conversation helpers.
- **MushafReviewPage:** Specialized layout; can use AppLayout + Card where appropriate.
- **Forms:** react-hook-form + FormField not added; forms still use existing components. Optional follow-up.

---

## Verification

- `pnpm run build:mushaf` — **pass**
- `pnpm run build:fast` — **pass**

---

## Next Steps (Optional)

1. Apply AppLayout + Card + useLoadingState to SuperAdminDashboard, TeacherDashboard, StudentDashboard.
2. Refactor Attendance and Messaging (Professional/SuperAdmin) pages to use the same layout and api.ts.
3. Add react-hook-form and wrap forms with FormField where desired.
4. Replace remaining inline `fetch` calls with api.ts helpers and useLoadingState + EmptyState.
5. Consolidate duplicate UI (e.g. messaging list, attendance tables) into shared components.

All refactored pages are **mobile-first**, use **touch-friendly** targets where applied, and keep **behavior unchanged** except for layout and loading/error/empty presentation.
