# 🔍 Troubleshooting 404 Errors

## Understanding 404 Errors

A **404 error** means the server couldn't find the requested resource. This can happen in several places:

---

## 🎯 Common 404 Error Scenarios

### 1. Frontend Route 404 (React Router)
**Symptom:** Page shows 404 when navigating to routes like `/dashboard`, `/students`, etc.

**Cause:** React Router trying to handle routes that don't exist, or routes not properly configured.

**Fix:** This is normal for Single Page Applications (SPA). Make sure:
- You're using a Static Site (not Web Service) on Render
- You have a `_redirects` file or similar for SPA routing

### 2. API Endpoint 404
**Symptom:** Browser console shows:
```
Failed to load resource: the server responded with a status of 404
GET https://umar-academy-portal-hfvb.onrender.com/api/users 404
```

**Cause:** 
- Backend API endpoint doesn't exist
- Wrong API base URL configured
- Backend not deployed or not running

**Fix:**
1. Check backend is running: `https://umar-academy-portal-hfvb.onrender.com/api/health`
2. Verify `VITE_API_BASE_URL` environment variable is set correctly
3. Check backend routes exist in `backend/server.js`

### 3. Static Asset 404
**Symptom:** Images, CSS, or JS files not loading

**Cause:** 
- Build artifacts not properly deployed
- Wrong publish directory
- Asset paths incorrect

**Fix:**
- Check Render build logs
- Verify `Publish Directory` is set to `dist`
- Check if files exist in the `dist` folder after build

---

## 🔧 Step-by-Step Troubleshooting

### Step 1: Identify the 404 Source

**Open Browser Console (F12):**
1. Go to **Network** tab
2. Try to reproduce the error
3. Look for red/failed requests
4. Check the **Request URL** column to see what's failing

### Step 2: Check Backend Health

Test if backend is running:
```bash
curl https://umar-academy-portal-hfvb.onrender.com/api/health
```

**Expected Response:**
```json
{"status":"OK","message":"Backend is running"}
```

**If you get 404:**
- Backend might not be deployed
- Backend might be on a different URL
- Check Render dashboard for backend service URL

### Step 3: Check Frontend Environment Variable

**In Render Dashboard → Frontend Service:**
1. Go to **Environment** tab
2. Verify `VITE_API_BASE_URL` is set
3. Should be: `https://umar-academy-portal-hfvb.onrender.com/api`
   - Or your actual backend URL + `/api`

### Step 4: Check API Endpoints

**Verify backend has these routes:**
- `/api/health` ✅ (health check)
- `/api/users` ✅ (user management)
- `/api/students` ✅ (students)
- `/api/teachers` ✅ (teachers)
- `/api/admins` ✅ (admins)
- `/api/assignments` ✅ (assignments)

**Test an endpoint:**
```bash
curl https://umar-academy-portal-hfvb.onrender.com/api/users
```

---

## 🛠️ Common Fixes

### Fix 1: Frontend SPA Routing

If you get 404 on routes like `/dashboard`:

**Create `public/_redirects` file:**
```
/*    /index.html   200
```

**Or configure Render:**
- Static Site settings
- Add redirect rule: `/* -> /index.html`

### Fix 2: API Base URL Not Set

**In Render → Frontend Service → Environment:**
- Add: `VITE_API_BASE_URL` = `https://your-backend-url.onrender.com/api`
- Save and redeploy

### Fix 3: Backend Not Deployed

**Check Render Dashboard:**
1. Verify backend service exists
2. Check if it's running (status should be "Live")
3. Look at backend logs for errors
4. Verify MongoDB connection is working

### Fix 4: CORS Errors (Related)

If you see CORS errors instead of 404:
- Update backend `FRONTEND_URL` environment variable
- Should be: `https://umar-academy-frontend.onrender.com`

---

## 📋 Quick Checklist

- [ ] Backend service is deployed and running
- [ ] Backend health check works: `/api/health`
- [ ] Frontend `VITE_API_BASE_URL` is set correctly
- [ ] Backend `FRONTEND_URL` is set correctly
- [ ] Browser console shows specific error details
- [ ] Network tab shows which request is failing
- [ ] React Router routes are configured correctly

---

## 🧪 Test Commands

```bash
# Test backend health
curl https://umar-academy-portal-hfvb.onrender.com/api/health

# Test users endpoint
curl https://umar-academy-portal-hfvb.onrender.com/api/users

# Test if frontend is accessible
curl https://umar-academy-frontend.onrender.com

# Check frontend redirects (should return index.html)
curl https://umar-academy-frontend.onrender.com/dashboard
```

---

## 📸 Screenshot Help

When reporting a 404 error, include:
1. **Browser Console** screenshot (F12 → Console tab)
2. **Network Tab** screenshot (F12 → Network tab → look for red requests)
3. **The URL** that's showing 404
4. **What you were trying to do** when the error occurred

---

## 🆘 Still Having Issues?

Share:
1. The **exact URL** that returns 404
2. **Browser console** errors
3. **Network tab** - which request failed
4. **Backend logs** from Render
5. **Frontend logs** from Render

This will help identify the exact issue! 🔍

