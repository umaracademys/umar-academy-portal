# 🔍 Check Students on Render - Correct Instructions

## ✅ Correct Way to Run Script on Render

### Step 1: Access Render Shell

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your **Backend Service**
3. Click **"Shell"** tab (top menu)

### Step 2: Navigate to Backend Directory

```bash
cd backend
```

### Step 3: Run the Script

```bash
node checkProductionStudents.js
```

**OR** if you're already in the backend directory:

```bash
node checkProductionStudents.js
```

---

## ⚠️ Common Errors

### Error: `Cannot find module '/opt/render/project/src/backend/backend/...'`

**Problem:** You're running the script with the wrong path.

**Solution:**
- Make sure you're in the `backend` directory: `cd backend`
- Then run: `node checkProductionStudents.js`
- **Don't** use: `node backend/checkProductionStudents.js` (that causes the double path)

---

## 🎯 Alternative: Quick Check via API

Instead of running a script, you can check students directly via API:

### Option 1: Browser
Visit:
```
https://umar-academy-backend.onrender.com/api/students
```

### Option 2: curl
```bash
curl https://umar-academy-backend.onrender.com/api/students
```

### Option 3: Browser Console
1. Go to your dashboard
2. Open DevTools (F12)
3. Go to **Console** tab
4. Run:
```javascript
fetch('https://umar-academy-backend.onrender.com/api/students')
  .then(r => r.json())
  .then(students => {
    console.log('Total students:', students.length);
    students.forEach(s => console.log(`- ${s.fullName} (${s.email})`));
  });
```

---

## 📋 What You Should See

The script will show:
- Total number of students
- List of all students with:
  - Full Name
  - Email
  - Student ID
  - Status
  - Program
  - Whether they can login

---

## 🔧 If Script Doesn't Exist

If the file doesn't exist on Render:

1. **Push it to GitHub first:**
   ```bash
   git add backend/checkProductionStudents.js
   git commit -m "Add production student check script"
   git push
   ```

2. **Wait for Render to redeploy** (2-5 minutes)

3. **Then run the script** in Render Shell

---

## ✅ Quick Test

To verify you're in the right directory:

```bash
# Check current directory
pwd

# Should show: /opt/render/project/src/backend

# List files
ls -la

# Should show checkProductionStudents.js
```

Then run:
```bash
node checkProductionStudents.js
```

