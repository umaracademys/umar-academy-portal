# Backend models

- **Active models** live in this folder (e.g. `Notification.js`). Schemas for Student, Teacher, Assignment, Ticket, and others are defined inline in `backend/server.js`. No duplicate or redundant models; Phase E audit confirmed clean separation.
- **Legacy models** are in `backend/models/legacy/` (Conversation, Message). They are archived with a deprecation comment at the top. Do not use in production unless explicitly needed (e.g. unified messaging routes or migrations).
