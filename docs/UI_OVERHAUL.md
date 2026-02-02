# Umar Academy UI Overhaul — Professional & Mobile-First

**Goal:** Redesign the frontend for a professional, unique, fast, mobile-first experience. All pages remain wired to the backend; functionality is preserved; usability is improved.

---

## 1. Tech Stack & Dependencies

| Area | Stack |
|------|--------|
| Framework | React + TypeScript |
| Styling | Tailwind CSS (primary, secondary, accent, muted, forms-friendly) |
| Routing | React Router v6 (role-aware routing maintained) |
| State & Hooks | useLoadingState, usePermission, BackendDataContext; React Query optional |
| Icons | Add `lucide-react` for consistent icons (optional) |
| Forms | Existing forms; migrate to react-hook-form + FormField where needed |
| UI | Tailwind + shared components (Button, Card, Modal, EmptyState, FormField); Shadcn/ui can be added via `npx shadcn-ui@latest init` for more components |

**Mobile-first:** Use responsive classes (`sm:`, `md:`, `lg:`), touch-friendly elements (min 44px), full-width buttons/inputs on mobile where appropriate.

---

## 2. Global Setup

### Tailwind

- **Config:** `tailwind.config.js` — extended colors: `primary`, `secondary`, `accent`, `muted`, `success`, `warning`, `error`, `info`, `background`, `surface`.
- **Utilities:** `src/index.css` — `touch-target`, `mobile-scroll`, `safe-top`/`safe-bottom` for safe areas.

### Base Layout

- **AppLayout** (`src/components/layout/AppLayout.tsx`): Responsive sidebar (drawer on mobile, fixed on desktop) + main content area. Use for dashboards that need a consistent shell.
- **Header:** Existing `Header` / `DashboardHeader` — top navbar with role-aware links.
- **Footer:** Optional; add per-page or global if needed.

---

## 3. Shared Components & Hooks

| Component / Hook | Location | Purpose |
|------------------|----------|---------|
| **EmptyState** | `src/components/ui/EmptyState.tsx` | Reusable empty view (title, message, icon, action). |
| **useLoadingState** | `src/hooks/useLoadingState.ts` | Async loading/error/success; `run(fn)` helper. |
| **Card** | `src/components/ui/Card.tsx` | Responsive card (CardHeader, CardContent, CardFooter). |
| **Button** | `src/components/ui/Button.tsx` | Primary, secondary, outline, ghost, danger; `fullWidthMobile`; min 44px height. |
| **FormField** | `src/components/ui/FormField.tsx` | Label + input/select/textarea wrapper with error/hint. |
| **Modal** | `src/components/ui/Modal.tsx` | Full-screen on mobile (drawer), centered on desktop. |
| **ConfirmationModal** | `src/components/ui/ConfirmationModal.tsx` | Existing confirmation dialog. |
| **DashboardHeader** | `src/components/ui/DashboardHeader.tsx` | Existing dashboard header. |
| **ToastContainer** | `src/components/ui/ToastContainer.tsx` | Existing toasts. |
| **AppLayout** | `src/components/layout/AppLayout.tsx` | Sidebar + main content; optional sidebar open state. |

**Mobile-friendly:** Card, Button, Modal, EmptyState, FormField, and AppLayout use responsive classes and touch targets. Tables: use horizontal scroll or card layout on mobile (per-page).

---

## 4. Template Page: Students Page

**StudentsPage** (`src/pages/StudentsPage.tsx`) is the reference implementation for the new foundation:

- **AppLayout** — Page uses `Header` + `AppLayout` with `Sidebar` (drawer on mobile via `sidebarOpen`).
- **Card** — Main content wrapped in `Card` / `CardHeader` / `CardContent` from `src/components/ui/Card.tsx`.
- **Button** — Retry action uses `Button` from `src/components/ui/Button.tsx` with `fullWidthMobile`.
- **EmptyState** — Shown when the list fails to load (error + Retry).
- **useLoadingState** — Initial load uses `run(refreshData)`; loading spinner and error are handled in the main content area.
- **Responsive** — Title and layout use `sm:` breakpoints; touch-friendly targets.

Use this page as the pattern when refactoring Dashboards, Assignments, Attendance, Tickets, Messages, and Reports.

---

## 5. Pages & UI Patterns

Apply these patterns across pages (migrate incrementally):

- **Dashboards:** Cards stack vertically on mobile, grid on desktop (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). Metrics panels: horizontal scroll if needed (`overflow-x-auto`).
- **Assignments / Tickets / Lists:** Responsive tables or stacked cards on mobile; filters collapse into dropdowns/drawers on small screens.
- **Forms:** Full-width inputs on mobile; sticky or pinned submit button; use FormField for labels and errors.
- **Attendance:** Filter sidebar collapses to drawer on mobile; tables scroll horizontally or use card layout.
- **Messages:** Conversation list above messages on mobile; message bubbles tap-friendly; lock/stats accessible.
- **Mushaf / Recitation:** Keep readable and interactive on mobile; swipe/scroll-friendly navigation.

---

## 6. API & Wiring

- **Central API:** `src/services/api.ts` — `getApiBase()`, `getAuthToken()`, `getAuthHeaders()`, conversation helpers (`getConversations`, `getConversationStats`, `lockConversation`). Add more endpoint helpers (e.g. `getStudents`, `getAssignments`, `getTickets`) as pages are refactored.
- **Existing data:** BackendDataContext still provides students, assignments, tickets, etc. New code can use api.ts for new flows or gradual migration.
- **Loading/error/empty:** Use `useLoadingState` + `EmptyState` for consistent UX.

---

## 7. Mobile-First & Responsiveness

- Touch targets ≥ 44px (use `touch-target` or `min-h-[44px] min-w-[44px]`).
- Full-width buttons/inputs on mobile where appropriate (Button has `fullWidthMobile`).
- Collapsible filters, drawers, and modals (Modal is full-screen on mobile by default).
- Horizontal scroll for tables when needed (`overflow-x-auto mobile-scroll`).
- Typography and spacing: use Tailwind spacing and text size classes; test on small viewports.

---

## 8. Performance

- Lazy-load heavy components (App.tsx already uses `lazy()` for routes).
- Avoid unnecessary DOM nodes; keep lists virtualized if very long (e.g. react-window where already used).
- Prefer shared components and small bundles; add Shadcn only where needed.
- Use React.memo and stable callbacks where it helps re-renders.

---

## 9. Verification & Testing

- **Build:** `pnpm run build:mushaf` and `pnpm run build:fast` must pass.
- **Manual:** Test critical flows on mobile, tablet, and desktop.
- **Lighthouse:** Run mobile audit for performance and accessibility when making large page changes.

---

## 10. Adding New Pages / Components

- Use **AppLayout** for pages with sidebar + content.
- Use **Card**, **Button**, **FormField**, **Modal**, **EmptyState** from `src/components/ui/`.
- Use **useLoadingState** for async operations.
- Call API via **api.ts** or BackendDataContext; avoid inline `fetch` + raw URLs.
- Use Tailwind responsive classes (`sm:`, `md:`, `lg:`) and `touch-target` for tap targets.
- Document new shared components in `src/components/README.md`.
