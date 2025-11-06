# Step-by-Step Instructions: Run Quran Migration on Render

## Prerequisites
✅ SQLite files are now in the repository (temporarily)
✅ Migration script is ready: `backend/migrateSqliteToMongo.js`
✅ All code has been pushed to GitHub

## Step 1: Wait for Render Deployment
1. Go to your Render dashboard: https://dashboard.render.com
2. Navigate to your **backend service** (`umar-academy-backend`)
3. Wait for the deployment to complete (it should automatically deploy after the git push)
4. Verify the deployment is successful (green status)

## Step 2: Access Render Shell/Console

### Option A: Using Render Web Console (Recommended)
1. In your backend service dashboard, click on the **"Shell"** tab (or **"Console"**)
2. This will open a web-based terminal

### Option B: Using SSH (if enabled)
1. Get your SSH command from Render dashboard
2. Connect via SSH from your local terminal

## Step 3: Run the Migration

Once you're in the Render shell/console, run these commands:

```bash
# Navigate to backend directory
cd backend

# Verify SQLite files are present
ls -lh *.db

# You should see:
# - qpc-hafs-15-lines.db
# - qpc-nastaleeq.db
# - qpc-v4.db

# Run the migration script
npm run migrate-quran
```

## Step 4: Monitor Migration Progress

The migration script will output progress logs. You should see:

```
🔄 Starting SQLite to MongoDB migration...
📊 Connecting to MongoDB: mongodb://...
✅ Connected to MongoDB
📄 Migrating page layout data...
   Found X page records
   Cleared existing page data
   Inserted batch 1 (1000/X)
   ...
✅ Page layout migration complete
📝 Migrating word data (nastaleeq)...
   ...
✅ Word data migration complete for nastaleeq
📝 Migrating word data (v4)...
   ...
✅ Word data migration complete for v4
🔗 Updating page numbers for words...
   ...
✅ Migration complete!
📊 Summary:
   - Pages: 9046
   - Words (nastaleeq): X
   - Words (v4): X
```

**Expected duration:** 2-5 minutes depending on database connection speed

## Step 5: Verify Migration Success

### Test 1: Check API Endpoint
```bash
# Test the page lines endpoint
curl https://umar-academy-backend.onrender.com/api/quran/pages/1/lines?version=v4
```

**Expected result:** JSON response with page layout data (not a 404 error)

### Test 2: Check Multiple Pages
```bash
# Test page 2
curl https://umar-academy-backend.onrender.com/api/quran/pages/2/lines?version=v4

# Test page 604 (last page)
curl https://umar-academy-backend.onrender.com/api/quran/pages/604/lines?version=v4
```

### Test 3: Check from Frontend
1. Go to your frontend URL: https://umar-academy-frontend-m2at.onrender.com
2. Navigate to a page that uses the Mushaf component
3. Verify that pages load correctly without 404 errors

## Step 6: Clean Up (After Successful Migration)

Once you've verified the migration is successful:

### Remove SQLite Files from Git

**On your local machine:**

```bash
cd /Users/muhammadumar/umar-academy-portal

# Remove SQLite files from git
git rm backend/qpc-hafs-15-lines.db backend/qpc-nastaleeq.db backend/qpc-v4.db

# Commit the removal
git commit -m "Remove SQLite files after successful migration to MongoDB"

# Push to repository
git push
```

**Note:** The files will remain in git history, but won't be in future commits. This is fine for temporary migration files.

## Troubleshooting

### Error: "better-sqlite3 not available"
```bash
# Install the package
npm install better-sqlite3
```

### Error: "MongoDB connection failed"
- Check that `MONGODB_URI` environment variable is set correctly in Render
- Go to: Render Dashboard → Your Backend Service → Environment
- Verify the MongoDB connection string is correct

### Error: "Page 1 not found in database"
- Migration didn't complete successfully
- Check the migration logs for errors
- Re-run the migration: `npm run migrate-quran`

### Migration is Slow
- This is normal for large datasets
- Be patient, it should complete in 2-5 minutes
- Don't close the shell/console during migration

### Files Not Found in Render
- Wait for the deployment to complete
- Verify the files are in the repository: `ls -lh backend/*.db`
- If files are missing, check the git commit history

## What Gets Migrated

✅ **Page Layout Data** (QuranPage collection)
   - 9,046 page lines (15 lines per page × 604 pages)
   - Line types: ayah, surah_name, basmallah
   - Word ID mappings

✅ **Word Data** (QuranWord collection)
   - Nastaleeq version words
   - V4 version words
   - Page number associations

❌ **Word data from word_by_word.json** is NOT migrated
   - This file is already deployed and used by the frontend
   - No migration needed for this

## Success Criteria

✅ Migration script completes without errors
✅ API endpoint returns data (not 404)
✅ Frontend can load Mushaf pages
✅ All 604 pages are accessible

## Next Steps After Migration

1. ✅ Verify migration success (Step 5)
2. ✅ Remove SQLite files from git (Step 6)
3. ✅ Test the application thoroughly
4. ✅ Monitor for any issues

---

**Need Help?** Check the migration logs for specific error messages and refer to `MIGRATION_INSTRUCTIONS.md` for alternative solutions.

