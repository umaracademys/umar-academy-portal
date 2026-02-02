# Step 0 — Preparation (MongoDB)

Before running any scripts or changes against your **production** MongoDB (e.g. Render/Atlas), do the following.

---

## 1. Get your MongoDB URI

- **Render:** In your Render dashboard → your backend service → **Environment** → `MONGODB_URI`.
- **Atlas:** Cluster → **Connect** → **Connect your application** → copy the connection string.

It will look like:

```text
mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

- Use this as `MONGODB_URI` when running scripts locally, or keep it in Render’s environment for the backend.
- **Never commit the URI (or password) to git.** Use `.env` (gitignored) or Render env vars.

---

## 2. Backup production before making changes

**Always backup the production DB before audits, fixes, or migrations.**

### Option A — MongoDB Atlas (recommended)

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com).
2. Select your project and cluster.
3. **Backup** (or **Database** → **Backups**):
   - Use **Continuous Backup** snapshots if enabled, or
   - **Download** a snapshot / point-in-time restore as needed.

### Option B — mongodump (command line)

From a machine that can reach your cluster:

```bash
# Install MongoDB Database Tools if needed:
# macOS: brew install mongodb-database-tools

# Full dump of the database (replace with your real URI; use .env or export)
mongodump --uri="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/umar-academy-portal?retryWrites=true&w=majority" --out=./backup-$(date +%Y%m%d)

# Dump only the users collection (example)
mongodump --uri="YOUR_MONGODB_URI" --collection=users --out=./backup-users-$(date +%F)
```

- Store the `backup-*` folder somewhere safe (and not in git).
- If you see a TLS certificate error (`tls: failed to verify certificate`), try updating MongoDB Database Tools (`brew upgrade mongodb-database-tools`) or use Atlas Backup / Export in the Atlas UI.
- To restore later: `mongorestore --uri="YOUR_URI" ./backup-YYYY-MM-DD/umar-academy-portal`

---

## 3. Run scripts against production (optional)

When you’re ready to run backend scripts (audit, fix, etc.) against production:

```bash
# From repo root; use your production URI (e.g. from .env or export)
MONGODB_URI="mongodb+srv://..." node backend/scripts/auditMongoUsersTeachersAdmins.js

# Or ensure .env in project root contains MONGODB_URI, then:
node backend/scripts/auditMongoUsersTeachersAdmins.js
```

See:

- `backend/scripts/README.md` — list of scripts and flags.
- `docs/MONGO_AUDIT_USERS_TEACHERS_ADMINS.md` — audit usage.

---

## Checklist

- [ ] MongoDB URI is available (Render or Atlas) and **not** committed to git.
- [ ] Production DB is backed up (Atlas snapshot and/or `mongodump`).
- [ ] Scripts are run with `MONGODB_URI` set (e.g. in `.env` or environment).
