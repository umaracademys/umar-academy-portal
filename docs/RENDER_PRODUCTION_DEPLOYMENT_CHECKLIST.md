# Production Deployment Checklist — Render

**Target branch:** `main` (audit-hardened)  
**Last updated:** 2025-02-01

---

## Pre-deploy (local)

- [ ] `git checkout main && git pull origin main`
- [ ] Run audit scripts (dry-run):
  ```bash
  node backend/scripts/permissionsAuditAndFix.js --dry-run
  node backend/scripts/auditRolePermissionConsistency.js
  ```
- [ ] Run production test locally:
  ```bash
  API_BASE_URL=http://localhost:3001/api node backend/production-test.js
  ```
- [ ] Confirm no uncommitted changes: `git status`

---

## Backend (umar-academy-backend)

### Environment variables (Render → Environment)

| Variable       | Required | Notes |
|----------------|----------|-------|
| `MONGODB_URI`  | ✅ Yes   | Production MongoDB connection string |
| `JWT_SECRET`   | ✅ Yes   | 64+ chars; server fails to start if missing/invalid |
| `NODE_ENV`     | ✅ Yes   | `production` |
| `PORT`         | Auto     | Render sets this; default 10000 in render.yaml |
| `FRONTEND_URL` | Recommended | Frontend URL for CORS; e.g. `https://umar-academy-frontend.onrender.com` |
| `ADDITIONAL_FRONTEND_URLS` | Optional | Comma-separated extra CORS origins |

### Build & start

- **Build command:** `corepack prepare pnpm@9.0.0 --activate && if [ -f "server.js" ] && [ -f "package.json" ]; then pnpm install --frozen-lockfile --prefer-offline; elif [ -d "backend" ]; then cd backend && pnpm install --frozen-lockfile --prefer-offline; else echo "Error: Backend directory not found. Current dir: $(pwd)" && ls -la && exit 1; fi`
- **Start command:** `if [ -f "server.js" ]; then node server.js; else cd backend && node server.js; fi`
- **Root directory:** Project root (or per render.yaml)
- **Health check path:** `/api/health`

### Validation

- [ ] Health: `curl https://<backend-url>/api/health` → `{"status":"ok"}`
- [ ] Login: `curl -X POST https://<backend-url>/api/auth/login -H "Content-Type: application/json" -d '{"email":"...","password":"...","role":"admin"}'` → returns JWT
- [ ] CORS: Frontend can call API (no CORS errors in browser console)

### JWT_SECRET

- Must be 64+ characters
- Generate: `openssl rand -base64 48`
- Server will not start if missing, default, or too short

---

## Frontend (umar-academy-frontend)

### Environment variables

| Variable             | Required | Notes |
|----------------------|----------|-------|
| `VITE_API_BASE_URL`  | ✅ Yes   | Backend API base; e.g. `https://umar-academy-backend.onrender.com/api` |
| `NODE_ENV`           | ✅ Yes   | `production` |
| `PORT`               | Auto     | Render sets; default 10000 in render.yaml |

### Build & start

- **Build command:** `bash render-build.sh`  
  - Uses corepack + pnpm  
  - Builds `@umar-academy/mushaf`  
  - Runs `pnpm run build:fast`
- **Start command:** `node frontend-server.js`
- **Health check path:** `/health`

### Validation

- [ ] Health: `curl https://<frontend-url>/health` → 200
- [ ] App loads: Visit URL in browser
- [ ] Login works: Student, teacher, admin (see docs/TEST_CREDENTIALS.md)
- [ ] API calls succeed: No 404/CORS from frontend to backend

---

## Post-deploy smoke tests (audit-hardened)

| Test                 | Expected |
|----------------------|----------|
| Student login        | Redirect to student dashboard; blocked from /teachers, /students, admin routes |
| Teacher login        | Scoped data; canManageTeachers/canManageStudents enforced |
| Admin login          | Full access per permissions |
| Unauthenticated user | Blocked from protected routes; redirected to login |
| Health endpoints     | Backend `/api/health`, frontend `/health` return 200 |

---

## Render dashboard checklist

### Backend service

- [ ] Branch: `main`
- [ ] Auto-deploy: enabled (optional)
- [ ] Build command: matches render.yaml or dashboard override
- [ ] Start command: matches render.yaml
- [ ] Health check path: `/api/health`
- [ ] Env vars: MONGODB_URI, JWT_SECRET, FRONTEND_URL
- [ ] Plan: Free tier spins down after inactivity; first request may be slow

### Frontend service

- [ ] Branch: `main`
- [ ] Build command: `bash render-build.sh` (or clear to use render.yaml)
- [ ] Start command: `node frontend-server.js`
- [ ] Health check path: `/health`
- [ ] Env vars: VITE_API_BASE_URL pointing to backend
- [ ] FRONTEND_URL in backend must match this service URL for CORS

---

## Deploy order

1. Deploy backend first (or ensure it is reachable)
2. Set `FRONTEND_URL` on backend to actual frontend URL
3. Deploy frontend with `VITE_API_BASE_URL` pointing to backend
4. Re-deploy backend if FRONTEND_URL was added/updated (CORS)

---

## Troubleshooting

| Issue                     | Check |
|---------------------------|-------|
| Backend won't start       | JWT_SECRET set and 64+ chars; MONGODB_URI valid |
| CORS errors               | FRONTEND_URL in backend includes frontend origin |
| Frontend 404 on API       | VITE_API_BASE_URL correct; no trailing slash for base |
| Build fails (frontend)    | `render-build.sh` runs; pnpm/corepack available |
| Build fails (backend)     | Root has `backend/` dir; pnpm install succeeds |

---

## References

- `docs/PRODUCTION_READINESS.md` — What is secure, open, deferred
- `docs/SECURITY_MODEL.md` — Roles, permissions, ownership
- `docs/backend/RENDER_MIGRATION_STEPS.md` — Quran migration
- `docs/audits/RENDER_BUILD_FIX.md` — Build command notes
- `backend/production-test.js` — Automated production checks
