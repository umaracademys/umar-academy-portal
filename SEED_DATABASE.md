# 🌱 Seed Database - Create Initial Users

## 🎯 Problem

Your database is empty - that's why you see:
- 👥 Users loaded: 0
- 👨‍🏫 Teachers loaded: 0
- 📝 Assignments loaded: 0

**Solution:** Seed the database with initial users!

---

## ✅ Solution: Seed Database on Render

### Method 1: Using Render Shell (Recommended)

1. **Go to Render Dashboard:**
   - Visit: https://dashboard.render.com
   - Click on your **Backend Service** (Web Service)

2. **Open Shell:**
   - Click **"Shell"** tab (in the top menu)
   - Or click the terminal icon

3. **Run Seed Command:**
   ```bash
   node seedDatabase.js
   ```

4. **Verify:**
   - Should see: "✅ Super Admin created", "✅ Admin created", etc.
   - Exit shell when done

### Method 2: Add Seed on Startup (Automatic)

Update backend to seed on first startup if database is empty.

---

## 🔑 Created Credentials

After seeding, you can login with:

### Super Admin
- **Email:** `sadmin@umaracademy.org`
- **Password:** `password123`
- **Role:** Super Admin

### Admin
- **Email:** `admin@umaracademy.com`
- **Password:** `password123`

### Teacher
- **Email:** `teacher@umaracademy.com`
- **Password:** `password123`

### Student
- **Email:** `ahmed@umaracademy.com`
- **Password:** `password123`

---

## 🧪 Test After Seeding

1. **Check Users Endpoint:**
   ```bash
   curl https://umar-academy-portal-hfvb.onrender.com/api/users
   ```
   Should return an array with 4 users

2. **Try Login:**
   - Visit: https://umar-academy-frontend.onrender.com
   - Login with: `sadmin@umaracademy.org` / `password123`
   - Should work now!

---

## 📝 Alternative: Manual User Creation

If you can't access Render Shell, you can create users via API:

```bash
curl -X POST https://umar-academy-portal-hfvb.onrender.com/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Super Admin",
    "email": "sadmin@umaracademy.org",
    "role": "superadmin",
    "password": "password123"
  }'
```

**Note:** You'll need to hash the password first (the seed script does this automatically).

---

## ⚠️ Important Notes

- The seed script checks if users exist before creating (won't duplicate)
- Password is hashed using bcrypt
- All users created with default password: `password123`
- Change passwords in production for security

---

## 🔄 Re-run Seed

If you need to re-seed:
- The script will skip existing users
- Safe to run multiple times
- Won't create duplicates

---

**After seeding, login should work!** 🎉

