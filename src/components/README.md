# Frontend components

- **Shared UI:** `ui/` — **Button** (primary, secondary, outline, ghost, danger; `fullWidthMobile`, touch-friendly), **Card** (CardHeader, CardContent, CardFooter), **FormField** (label + input wrapper, error/hint), **Modal** (full-screen on mobile, centered on desktop), **EmptyState**, **ToastContainer**, **ConfirmationModal**, **DashboardHeader**. Use these for consistency and mobile-first layouts.
- **Layout:** `layout/AppLayout.tsx` — responsive sidebar (drawer on mobile) + main content; use for dashboards. See **StudentsPage** (`src/pages/StudentsPage.tsx`) as the template.
- **Shared hooks:** `useLoadingState` (src/hooks/useLoadingState.ts) for loading/error handling; adopt in dashboards and lists.
- **Feature components:** Grouped by domain (messaging, workflow, attendance, etc.). See `docs/UI_OVERHAUL.md` for UI guidelines and `PHASE_E_AUDIT_REPORT.md` for legacy/duplicate notes.
- **API:** Use `src/services/api.ts` for central API helpers; see file header and `docs/UI_OVERHAUL.md`.
- **Mobile-friendly:** Button, Card, Modal, EmptyState, FormField, and AppLayout are responsive and touch-optimized (min 44px targets where applicable).
- **Legacy/unused:** `permission-manager-v2/` is marked legacy/unused; `EnhancedWeeklyEvaluationForm` is the active evaluation form.
