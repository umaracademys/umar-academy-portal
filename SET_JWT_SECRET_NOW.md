# 🔐 Set JWT_SECRET in Render - Quick Guide

## ✅ Generated JWT_SECRET (Ready to Use)

**Copy this value:**
```
4qEy82CMuJ1yhM0wcgE7gkYGQpNMwnR3WfudA30VuVI=
```

## 📋 Step-by-Step Instructions

### 1. Go to Render Dashboard
- Visit: https://dashboard.render.com
- Log in to your account

### 2. Find Your Backend Service
- Look for: **umar-academy-backend** (or your backend service name)
- Click on it

### 3. Navigate to Environment Tab
- Click **"Environment"** in the left sidebar
- You'll see a list of current environment variables

### 4. Add/Update JWT_SECRET
- Click **"Add Environment Variable"** button (or find existing JWT_SECRET and click edit)
- **Key:** `JWT_SECRET`
- **Value:** `4qEy82CMuJ1yhM0wcgE7gkYGQpNMwnR3WfudA30VuVI=`
- Click **"Save Changes"**

### 5. Verify Other Required Variables
Make sure these are also set:

- ✅ `MONGODB_URI` - Your MongoDB connection string (should already be set)
- ✅ `NODE_ENV` - Should be `production`
- ✅ `FRONTEND_URL` - Your frontend URL (if using CORS)

### 6. Redeploy
- Render will automatically redeploy when you save environment variables
- Wait 2-5 minutes for redeploy to complete
- Check the logs to confirm the JWT_SECRET warning is gone

## ✅ Verification

After redeploy, check the backend logs. You should see:
- ✅ No JWT_SECRET warning
- ✅ Server starts successfully
- ✅ MongoDB connection successful

## 🔍 Quick Check

Visit: https://umar-academy-backend.onrender.com/api/health

Should return status "OK" with no errors.

---

**Note:** Keep this JWT_SECRET secure. Don't share it publicly or commit it to git.

