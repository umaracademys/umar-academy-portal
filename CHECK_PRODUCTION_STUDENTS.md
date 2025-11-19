# 🔍 Check Production Students on Render

Your production database on Render is different from your local database. To see what students are in production:

## Method 1: Check via Render Shell (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Open your **Backend Service**
3. Click **"Shell"** tab
4. Run:
   ```bash
   cd backend
   node checkAllStudents.js
   ```

This will show all students in your **production MongoDB database**.

---

## Method 2: Check via API

You can also check via the API endpoint:

```bash
curl https://umar-academy-backend.onrender.com/api/students
```

Or visit in browser:
```
https://umar-academy-backend.onrender.com/api/students
```

---

## Method 3: Check in Browser Console

1. Go to your dashboard: https://umar-academy-frontend-m2at.onrender.com/dashboard
2. Open browser console (F12)
3. Go to **Network** tab
4. Look for request to `/api/students`
5. Click on it → Check **Response** tab
6. You'll see the JSON with all students

---

## What You're Seeing

You mentioned seeing:
- **Hummah**
- **IA** 
- **Musa**

These students are in your **production MongoDB database** (on Render), but not in your **local database**.

---

## To Sync Production Data to Local

If you want to see the same students locally, you can:

1. **Export from production** (via API or MongoDB export)
2. **Import to local** database
3. Or just work with production directly

---

## Quick Check Script for Production

Create this script and run it on Render:

```javascript
// backend/checkProductionStudents.js
const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;

const studentSchema = new mongoose.Schema({}, { strict: false });
const Student = mongoose.model('Student', studentSchema);

(async () => {
  await mongoose.connect(MONGODB_URI);
  const students = await Student.find({}).sort({ fullName: 1 });
  console.log(`Total: ${students.length}`);
  students.forEach(s => {
    console.log(`- ${s.fullName} (${s.email})`);
  });
  process.exit(0);
})();
```

Run on Render Shell:
```bash
node backend/checkProductionStudents.js
```

---

**The students you see on the dashboard are from your production MongoDB database, which is different from your local one!**

