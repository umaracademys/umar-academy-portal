# Backend API routes

- **Inline routes:** Most API endpoints are defined in **`backend/server.js`** (e.g. `/api/users`, `/api/students`, `/api/assignments`, `/api/tickets`, `/api/weekly-evaluations`). Order matters: specific paths (e.g. `/api/users/locked`) must be registered before parameterized paths (e.g. `/api/users/:id`).
- **Mounted routers:**
  - **`routes/messages.js`** — unified messaging: `/api/conversations`, `/api/conversations/:id/messages`, lock/unlock, admin stats. Uses legacy models `Conversation` and `Message` from `models/legacy/`.
  - **`routes/recitationRoutes.js`** — recitation monitoring (mounted at `/api`).
  - **`routes/liveRecitationRoutes.js`** — live recitation (mounted at `/api`).
- **Phase E audit:** No duplicate API paths or conflicting HTTP verbs were found. One frontend bug was fixed: `SuperAdminMessagesPage` was calling `/api/api/conversations/...` (double `/api`); corrected to use `API_BASE` which already includes `/api`.
