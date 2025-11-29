# 🔧 Fix Production User Logins

## Problem
Users getting **401 Unauthorized** errors when trying to login to production.

## Solution
Run the fix script on Render Shell to ensure all users can login.

---

## Steps to Fix Production Logins

### Step 1: Access Render Shell

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your **Backend Service**
3. Click **"Shell"** tab (top menu)

### Step 2: Navigate to Backend Directory

```bash
cd backend
```

### Step 3: Run the Fix Script

```bash
node fixProductionUserLogins.js
```

This will:
- ✅ Enable login for all users (`loginEnabled: true`)
- ✅ Hash any plain text passwords
- ✅ Set default password (`password123`) for users without passwords
- ✅ Show summary of fixes

---

## What the Script Does

1. **Checks all users** in production database
2. **Enables login** if disabled
3. **Hashes passwords** if stored as plain text
4. **Sets default password** for users without passwords
5. **Shows summary** of all changes

---

## After Running the Script

### Users with Reset Passwords

If any users had their passwords reset to `password123`, you'll see a list like:

```
⚠️  IMPORTANT - Users with reset passwords:
   1. John Doe (john@example.com) - Role: student
      Default password: password123
```

**Action Required:**
- Inform these users of their temporary password
- Ask them to change it after first login

---

## Verify Fix Worked

After running the script, you should see:

```
📋 Login Status Check:
   Total users: XX
   Login disabled: 0
   No password: 0
   Plain text password: 0
   ✅ Ready to login: XX
```

All users should be ready to login!

---

## Common Issues

### Issue: "MONGODB_URI not set"

**Problem:** Script can't find MongoDB connection string.

**Fix:** Make sure you're running on Render Shell (it has MONGODB_URI set automatically).

### Issue: "Cannot find module"

**Problem:** Script file doesn't exist on Render.

**Fix:** 
1. Push the script to GitHub first:
   ```bash
   git add backend/fixProductionUserLogins.js
   git commit -m "Add production login fix script"
   git push
   ```
2. Wait for Render to redeploy (2-5 minutes)
3. Run the script again

---

## Alternative: Fix Individual User

If you need to fix a specific user's password:

```bash
node resetPassword.js user@example.com newpassword123
```

---

## Testing Login

After fixing, test login with:

1. Go to production frontend: https://umar-academy-frontend-m2at.onrender.com
2. Try logging in with:
   - Email: `user@example.com`
   - Password: `password123` (if reset) or their existing password
   - Role: Select correct role (student/teacher/admin/superadmin)

---

## Need Help?

If users still can't login after running the script:

1. Check the error message in browser console
2. Verify email and role match exactly
3. Try resetting password for that specific user
4. Check Render logs for backend errors

