# 📊 Data Storage Guide

This document explains where all your application data is stored.

## 🗄️ Primary Database: MongoDB

All your application data is stored in **MongoDB**. The database connection is configured via the `MONGODB_URI` environment variable.

### MongoDB Collections (Data Types)

Your MongoDB database contains the following collections:

1. **Users** (`users`)
   - User accounts (admin, superadmin, teachers, students)
   - Authentication credentials
   - User profiles and avatars

2. **Students** (`students`)
   - Student profiles
   - Student IDs and user relationships
   - Enrollment information
   - Assigned teachers

3. **Teachers** (`teachers`)
   - Teacher profiles
   - Contact information
   - Assigned students
   - Payroll and schedule information
   - Qualifications and experience

4. **Assignments** (`assignments`)
   - All assignments (classwork, homework)
   - Assignment submissions
   - Mushaf markings (mistakes)
   - Homework instructions
   - Links to tickets and recitation reviews

5. **Tickets** (`tickets`)
   - Assignment tickets (workflow management)
   - Ticket status and workflow steps
   - Progress notes
   - Audio links
   - Mushaf markings

6. **Recitation Reviews** (`recitationreviews`)
   - Recitation review records
   - Feedback and notes
   - Audio recordings

7. **Quran Pages** (`quranpages`)
   - Page layout data (15-line format)
   - Line information (ayah, surah_name, basmallah)
   - Word ID ranges per line

8. **Quran Words** (`quranwords`)
   - Word-by-word data
   - Text, surah, ayah information
   - Page numbers

9. **Quran Chapters** (`quranchapters`)
   - Chapter (Surah) information
   - Names (simple, Arabic, complex)
   - Page ranges
   - Verse counts

10. **Personal Mushaf** (`personalmushafs`)
    - Historical mistake records per student
    - Mistake details (type, page, surah, ayah)
    - Audio recordings of mistakes

11. **Admin Notifications** (`adminnotifications`)
    - System notifications
    - Assignment notifications
    - Ticket notifications

## 🔗 MongoDB Connection

### Local Development
- **Default URI**: `mongodb://localhost:27017/umar-academy-portal`
- **Configuration**: Set in `backend/server.js` or via `MONGODB_URI` environment variable

### Production (Render)
- **Location**: MongoDB Atlas (cloud) or Render MongoDB
- **Configuration**: Set via `MONGODB_URI` environment variable in Render dashboard
- **Format**: `mongodb+srv://username:password@cluster.mongodb.net/database-name`

### How to Find Your MongoDB URI

1. **Check Render Dashboard**:
   - Go to your Render service
   - Click on "Environment" tab
   - Look for `MONGODB_URI` variable

2. **Check MongoDB Atlas** (if using):
   - Log into MongoDB Atlas
   - Go to your cluster
   - Click "Connect" → "Connect your application"
   - Copy the connection string

3. **Local MongoDB**:
   - If running locally: `mongodb://localhost:27017/umar-academy-portal`
   - Default database name: `umar-academy-portal`

## 📁 File Storage

### Audio Files (Mistake Recordings)
- **Location**: `backend/uploads/mistakes/`
- **Format**: `.webm` files
- **URL Pattern**: `/uploads/mistakes/mistake-{timestamp}-{random}.webm`
- **Access**: Served via Express static file server at `/uploads`

### Static Data Files

1. **Word-by-Word JSON**:
   - **Source**: `packages/mushaf/public/data/words/word_by_word.json`
   - **Deployed**: Copied to `dist/public/data/words/` during build
   - **Access**: Served as static file from frontend

2. **Quran Layout Data**:
   - **Source**: MongoDB collections (`quranpages`, `quranwords`)
   - **Previously**: SQLite databases (now migrated to MongoDB)
   - **Access**: Via backend API endpoints

## 🌐 Data Locations by Environment

### Local Development
```
MongoDB:      mongodb://localhost:27017/umar-academy-portal
Audio Files:  backend/uploads/mistakes/
Static Data:  packages/mushaf/public/data/words/
Build Files:  dist/
```

### Production (Render)
```
MongoDB:      mongodb+srv://...@cluster.mongodb.net/umar-academy-portal
              (Set via MONGODB_URI environment variable)
Audio Files:  backend/uploads/mistakes/
              (Ephemeral - lost on redeploy unless using persistent storage)
Static Data:  Included in frontend build (dist/)
Build Files:  Auto-generated during Render build
```

## 🔄 Data Migration

### Quran Data
- **Migrated from**: SQLite databases (`qpc-hafs-15-lines.db`, `qpc-v4.db`, etc.)
- **Migrated to**: MongoDB collections (`quranpages`, `quranwords`, `quranchapters`)
- **Migration Script**: `backend/migrateSqliteToMongo.js`
- **Status**: ✅ Completed (all Quran data now in MongoDB)

### User/Student/Teacher Data
- **Source**: Can be imported from MongoDB Atlas or other sources
- **Import Scripts**: 
  - `backend/copy-all-atlas-data.cjs`
  - `backend/import-from-atlas.cjs`
  - `backend/seedDatabase.js`

## 📊 How to Access Your Data

### 1. MongoDB Compass (GUI)
- Download MongoDB Compass
- Connect using your `MONGODB_URI`
- Browse all collections and documents

### 2. MongoDB Shell (CLI)
```bash
mongosh "your-mongodb-uri"
use umar-academy-portal
show collections
db.users.find()
db.students.find()
# etc.
```

### 3. Via Backend API
- All data accessible via REST API endpoints
- Base URL: `https://umar-academy-backend.onrender.com/api`
- Endpoints:
  - `/api/users`
  - `/api/students`
  - `/api/teachers`
  - `/api/assignments`
  - `/api/tickets`
  - `/api/quran/pages/:pageNumber/lines`

### 4. Via Frontend Application
- All data displayed through the React frontend
- Accessed via `BackendDataContext` and API calls

## 🔐 Data Backup

### Recommended Backup Strategy

1. **MongoDB Atlas** (if using):
   - Automatic backups enabled by default
   - Manual backups via Atlas UI

2. **Manual Backup**:
   ```bash
   # Export MongoDB data
   mongodump --uri="your-mongodb-uri" --out=./backup
   
   # Restore from backup
   mongorestore --uri="your-mongodb-uri" ./backup
   ```

3. **Audio Files**:
   - Currently stored in `backend/uploads/mistakes/`
   - ⚠️ **Important**: On Render, these files are ephemeral (lost on redeploy)
   - **Recommendation**: Use cloud storage (S3, Cloudinary) for production

## 📝 Environment Variables

Set these in your Render dashboard or `.env` file:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/umar-academy-portal
PORT=3001
FRONTEND_URL=https://umar-academy-frontend.onrender.com
```

## 🚨 Important Notes

1. **Audio Files on Render**: 
   - Files in `backend/uploads/` are **ephemeral**
   - They will be lost when the server restarts or redeploys
   - Consider using cloud storage for production

2. **MongoDB Atlas**:
   - Free tier has limitations
   - Make sure to configure IP whitelist
   - Monitor data usage

3. **Data Persistence**:
   - All critical data (users, students, assignments, tickets) is in MongoDB ✅
   - Quran data is in MongoDB ✅
   - Audio files need cloud storage for persistence ⚠️

## 🔍 Verify Your Data

1. **Check MongoDB Connection**:
   ```bash
   # In Render shell or locally
   node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('✅ Connected')).catch(e => console.error('❌ Error:', e))"
   ```

2. **Check Collections**:
   ```bash
   mongosh "your-mongodb-uri"
   use umar-academy-portal
   db.getCollectionNames()
   ```

3. **Count Documents**:
   ```bash
   db.users.countDocuments()
   db.students.countDocuments()
   db.assignments.countDocuments()
   db.tickets.countDocuments()
   ```

## 📞 Need Help?

If you need to:
- **Access your MongoDB**: Check Render environment variables for `MONGODB_URI`
- **Backup data**: Use `mongodump` command
- **Migrate data**: Use migration scripts in `backend/`
- **Check data**: Use MongoDB Compass or mongosh

---

**Last Updated**: 2024
**Database**: MongoDB
**Storage Location**: Cloud (MongoDB Atlas) or Local MongoDB

