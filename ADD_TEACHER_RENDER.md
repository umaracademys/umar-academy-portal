# 👨‍🏫 Add Teacher to Render (Production)

Guide to add teacher `rashid86amir82@gmail.com` to your production database on Render.

---

## 🎯 Method 1: Using Render Shell (Recommended)

### Step 1: Access Render Shell

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Find your **Backend Service** (e.g., `umar-academy-backend`)
3. Click on it
4. Click on the **"Shell"** tab (or **"Console"** tab) in the top menu
5. This opens a web-based terminal

### Step 2: Navigate to Backend Directory

```bash
cd backend
```

### Step 3: Run the Add Teacher Script

```bash
node addTeacher.js
```

### Step 4: Verify Output

You should see:
```
🔧 Connecting to MongoDB...
✅ Connected to MongoDB

📝 Creating user...
✅ User created: rashid86amir82@gmail.com
📝 Creating teacher profile...
✅ Teacher profile created: Rashid Amir

🎉 Teacher added successfully!

🔑 Login Credentials:
   Email: rashid86amir82@gmail.com
   Password: password123
   Role: Teacher
```

---

## 🎯 Method 2: Using API Endpoint (Alternative)

If you prefer to use the API directly:

### Step 1: Login as Super Admin

Get your JWT token by logging in:
```bash
curl -X POST https://your-backend-url.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sadmin@umaracademy.org",
    "password": "Admin123!",
    "role": "superadmin"
  }'
```

Save the `token` from the response.

### Step 2: Create User First

```bash
curl -X POST https://your-backend-url.onrender.com/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Rashid Amir",
    "email": "rashid86amir82@gmail.com",
    "role": "teacher",
    "password": "password123"
  }'
```

Save the `_id` from the response.

### Step 3: Create Teacher Profile

```bash
curl -X POST https://your-backend-url.onrender.com/api/teachers \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId": "TCH'$(date +%s)'",
    "userId": "USER_ID_FROM_STEP_2",
    "fullName": "Rashid Amir",
    "email": "rashid86amir82@gmail.com",
    "contact": "",
    "department": "Quran",
    "location": "",
    "employmentType": "full-time",
    "status": "active",
    "assignedStudents": [],
    "permissions": {
      "canViewAssessments": true,
      "canEditAssessments": true,
      "canViewEvaluations": true,
      "canEditEvaluations": true,
      "canViewFinancials": false,
      "canManageSchedule": true,
      "canContactParents": true,
      "canViewStudentEmail": true,
      "canViewStudentContact": true,
      "canViewStudentPersonalInfo": true
    },
    "payroll": {
      "monthlySalary": 0,
      "currency": "USD",
      "paymentType": "monthly"
    },
    "schedule": {
      "workingDays": [],
      "workingHours": {
        "start": "",
        "end": ""
      },
      "timezone": "UTC"
    },
    "hireDate": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
  }'
```

---

## ✅ Verification

After adding the teacher, verify it was created:

### Option 1: Check via API

```bash
# Get all teachers
curl https://your-backend-url.onrender.com/api/teachers

# Should include rashid86amir82@gmail.com
```

### Option 2: Check via Render Shell

```bash
# In Render Shell, run:
node -e "
const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI).then(async () => {
  const Teacher = mongoose.model('Teacher', new mongoose.Schema({}, { strict: false }));
  const teacher = await Teacher.findOne({ email: 'rashid86amir82@gmail.com' });
  if (teacher) {
    console.log('✅ Teacher found:');
    console.log('   Email:', teacher.email);
    console.log('   Full Name:', teacher.fullName);
    console.log('   Status:', teacher.status);
  } else {
    console.log('❌ Teacher not found');
  }
  process.exit(0);
});
"
```

### Option 3: Login Test

1. Go to your frontend URL
2. Try logging in with:
   - **Email:** `rashid86amir82@gmail.com`
   - **Password:** `password123`
   - **Role:** `Teacher`
3. Should successfully login!

---

## 🔑 Login Credentials

After adding the teacher:

- **Email:** `rashid86amir82@gmail.com`
- **Password:** `password123` (default - should be changed)
- **Role:** `Teacher`

---

## ⚠️ Important Notes

1. **Password Security:** The default password is `password123`. The teacher should change it after first login.

2. **Complete Profile:** The teacher profile is created with minimal information. Update it with:
   - Full name (if different from "Rashid Amir")
   - Contact/phone number
   - Location
   - Schedule/working hours
   - Other required details

3. **If Teacher Already Exists:** The script will detect if the user already exists and:
   - If user exists but no teacher profile → Creates teacher profile
   - If both exist → Shows existing information and exits

---

## 🐛 Troubleshooting

### Error: "Cannot find module"

**Problem:** Script not found in Render

**Solution:**
1. Make sure you're in the `backend` directory: `cd backend`
2. Verify the file exists: `ls -la addTeacher.js`
3. If file doesn't exist, push it to GitHub first:
   ```bash
   git add backend/addTeacher.js
   git commit -m "Add teacher script"
   git push
   ```
4. Wait for Render to redeploy
5. Try again

### Error: "MongoDB connection failed"

**Problem:** `MONGODB_URI` not set or incorrect

**Solution:**
1. Check environment variables in Render dashboard
2. Verify `MONGODB_URI` is set correctly
3. Test connection: `node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('✅ Connected')).catch(e => console.error('❌', e))"`

### Error: "Duplicate email"

**Problem:** Teacher already exists

**Solution:**
- The script will detect this and show existing information
- If you need to update, use the API or update directly in MongoDB

---

## 📝 Quick Reference

**Script Location:** `backend/addTeacher.js`

**Email:** `rashid86amir82@gmail.com`

**Default Password:** `password123`

**Default Name:** `Rashid Amir`

---

**Need help?** Check Render logs or contact support!

