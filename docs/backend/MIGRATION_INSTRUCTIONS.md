# Quran Data Migration Instructions for Render

## Problem
The MongoDB database on Render is empty because the Quran page layout data hasn't been migrated. The SQLite `.db` files are not deployed to Render because they're in `.gitignore`.

## Solution Options

### Option 1: Use API Migration Script (Recommended if you have qul.tarteel.ai credentials)

1. **Set environment variables on Render:**
   - Go to your Render backend service dashboard
   - Navigate to "Environment" tab
   - Add these environment variables:
     - `QUL_TARTEEL_CLIENT_ID` - Your qul.tarteel.ai client ID
     - `QUL_TARTEEL_CLIENT_SECRET` - Your qul.tarteel.ai client secret

2. **Run the migration script:**
   ```bash
   npm run migrate-quran-api
   ```

   Or manually:
   ```bash
   node migrateQuranFromApi.js
   ```

   This script will:
   - Download the SQLite file from qul.tarteel.ai API
   - Migrate the data to MongoDB
   - Clean up the temporary file

### Option 2: Temporarily Commit SQLite Files (Simplest)

1. **Temporarily allow SQLite files in git:**
   ```bash
   # Edit .gitignore and comment out the *.db line temporarily
   # Or use git add -f to force add the files
   ```

2. **Add the SQLite files to git:**
   ```bash
   cd backend
   git add -f qpc-hafs-15-lines.db qpc-nastaleeq.db qpc-v4.db
   git commit -m "Temporarily add SQLite files for migration"
   git push
   ```

3. **Run migration on Render:**
   - SSH into your Render instance, or
   - Use Render's shell/console to run:
     ```bash
     npm run migrate-quran
     ```

4. **Remove SQLite files from git (after migration):**
   ```bash
   git rm backend/qpc-hafs-15-lines.db backend/qpc-nastaleeq.db backend/qpc-v4.db
   git commit -m "Remove SQLite files after migration"
   git push
   ```

### Option 3: Manual Upload to Render

1. **Download the SQLite files locally** (if you don't have them):
   - Visit: https://qul.tarteel.ai/resources/mushaf-layout/19?page=
   - Sign in and download the SQLite file

2. **Upload to Render:**
   - Use Render's file system or SSH to upload the files
   - Place them in the `backend/` directory

3. **Run migration:**
   ```bash
   npm run migrate-quran
   ```

## Verify Migration

After running the migration, verify it worked:

1. **Check MongoDB:**
   ```bash
   # In Render shell or locally
   node -e "
   const mongoose = require('mongoose');
   const { QuranPage } = require('./quranSchemas');
   mongoose.connect(process.env.MONGODB_URI).then(async () => {
     const count = await QuranPage.countDocuments();
     console.log('Total pages in database:', count);
     process.exit(0);
   });
   "
   ```

2. **Test the API:**
   ```bash
   curl https://umar-academy-backend.onrender.com/api/quran/pages/1/lines?version=v4
   ```

   Should return page layout data, not a 404 error.

## Notes

- The migration only migrates **page layout data** (QuranPage collection)
- **Word data** (QuranWord collection) is not migrated by these scripts
- Word data comes from `word_by_word.json` which is already deployed
- The migration script will clear existing data before inserting new data

## Troubleshooting

### Error: "better-sqlite3 not available"
- The `better-sqlite3` package may not be installed
- Run: `npm install better-sqlite3`

### Error: "MongoDB connection failed"
- Check that `MONGODB_URI` environment variable is set correctly on Render
- Verify MongoDB connection string format

### Error: "Page 1 not found in database"
- Migration didn't complete successfully
- Check migration logs for errors
- Re-run the migration script

### Error: "QUL_TARTEEL_CLIENT_ID not set"
- You need to set the environment variables for Option 1
- Or use Option 2 or 3 instead

