# 🔧 Environment Variables Setup Guide

## 🎯 CRITICAL: Fix 404 Errors

Your frontend is getting 404 errors because it's trying to call `http://localhost:3001/api` instead of your production backend.

---

## ✅ Solution: Set Environment Variable

### Step 1: Go to Render Dashboard

1. Visit: https://dashboard.render.com
2. Find your **Frontend Service** (Static Site)
3. Click on it

### Step 2: Add Environment Variable

1. Click **"Environment"** tab (left sidebar)
2. Click **"Add Environment Variable"** button
3. Enter:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://umar-academy-portal-hfvb.onrender.com/api`
4. Click **"Save Changes"**

### Step 3: Wait for Redeploy

- Render will automatically redeploy (2-5 minutes)
- Watch the logs to see build progress
- Status will change to "Live" when done

### Step 4: Test

1. Visit: https://umar-academy-frontend.onrender.com/login
2. Open browser console (F12)
3. Check Network tab - API calls should now go to your backend
4. Try logging in - should work!

---

## 🔍 How to Verify It's Set Correctly

### Check in Browser Console:

1. Open browser console (F12)
2. Go to **Console** tab
3. Type: `console.log(import.meta.env.VITE_API_BASE_URL)`
4. Should show: `https://umar-academy-portal-hfvb.onrender.com/api`
5. If shows `undefined` → Environment variable not set
6. If shows `http://localhost:3001/api` → Wrong value set

---

## 📋 Complete Environment Variables Checklist

### Frontend (Static Site)

```
VITE_API_BASE_URL = https://umar-academy-portal-hfvb.onrender.com/api
```

### Backend (Web Service)

```
NODE_ENV = production
PORT = 10000
MONGODB_URI = mongodb+srv://umaracademys:FVsQSZvUcD7y8tU@cluster0.mnqimhg.mongodb.net/umar-academy-portal?retryWrites=true&w=majority
FRONTEND_URL = https://umar-academy-frontend.onrender.com
```

---

## 🚨 Current Status

- ✅ **Backend:** Running at https://umar-academy-portal-hfvb.onrender.com
- ✅ **Backend Health:** Working (`/api/health` returns OK)
- ❌ **Frontend API URL:** Not configured (using localhost)
- ⏳ **Action Needed:** Set `VITE_API_BASE_URL` environment variable

---

## 💡 Why This Matters

When `VITE_API_BASE_URL` is not set:
- Frontend defaults to `http://localhost:3001/api`
- This URL doesn't exist in production
- All API calls return **404 errors**
- Login, data loading, everything fails

After setting the environment variable:
- Frontend uses your production backend URL
- API calls work correctly
- Login and all features work

---

## 🎉 After Setup

Once the environment variable is set and frontend redeploys:

1. **Test Login:**
   - Email: `sadmin@umaracademy.org`
   - Password: `password123`
   - Should work now!

2. **Check Console:**
   - No more 404 errors
   - API calls go to correct backend
   - Data loads successfully

---

**Need help?** Share a screenshot of your Render Environment tab and I can guide you through it! 🚀

