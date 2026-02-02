# UI/UX Redesign — Phase 1 (Foundation)

Visual + UX redesign only. No backend, APIs, or data flow changes.

---

## Completed

### 1. Design system (`src/index.css`)

- **Typography:** `.heading-page`, `.heading-section`, `.heading-card`, `.body-text`, `.caption` for clear hierarchy (page > section > body).
- **Body:** Flat `bg-gray-50` feel; default text color `gray-800`.
- **Touch:** Existing `touch-target`, `mobile-scroll`, `safe-top`/`safe-bottom` kept.

### 2. Global layout

- **Header** (`src/components/Header.tsx`):
  - Flat white bar, subtle border (no heavy shadow).
  - Brand: "Umar Academy" with `.heading-page`.
  - Hamburger (mobile): min 44×44px, tap-friendly.
  - Refresh, notifications, user, Logout: same behavior, flatter styling and 44px targets.
- **Sidebar** (`src/components/Sidebar.tsx`):
  - Flat white, slim (w-56 on desktop, w-[280px] on mobile drawer).
  - Nav items: min 44px height, rounded-lg, primary for active, gray for rest.
  - No gradient; no internal overlay (AppLayout handles overlay).
  - `onMobileClose` added so link/close button closes the drawer.
- **AppLayout** (`src/components/layout/AppLayout.tsx`):
  - Flat `bg-gray-50` (no gradient).
  - Overlay: simple `bg-black/30`; tap closes via `onOverlayClick`.
  - Main: consistent padding, max-width content.

### 3. Shared components

- **Button** (`src/components/ui/Button.tsx`): Flat variants (no heavy shadows), min 44px, `touch-manipulation`.
- **Card** (`src/components/ui/Card.tsx`): White, `rounded-lg`, light border (no shadow).

### 4. Example page (StudentsPage)

- Section with `.heading-page` + `.caption` (no Card wrapper for title).
- Single white rounded panel for list; spacing used for hierarchy.

---

## Validation

- `pnpm run build:fast` — pass
- `pnpm run build:mushaf` — pass

---

## Next steps (same visual language)

1. **Dashboards:** Admin, Teacher, Student — sections with headings + spacing; minimal cards; one primary action per view.
2. **High-traffic:** Teachers, Assignments, Attendance — stacked list cards on mobile; clean tables on desktop; full-width primary buttons on mobile.
3. **Rest:** Tickets, Messages, Mushaf, Reports, Permissions — same typography, spacing, flat surfaces, 44px targets.
4. **Mobile:** Ensure no horizontal scroll; sticky primary action where needed; drawer smooth (already wired).

Use `.heading-page` / `.heading-section` / `.caption` and the updated Header/Sidebar/AppLayout/Button/Card across all pages for a consistent, modern, mobile-first UI.
