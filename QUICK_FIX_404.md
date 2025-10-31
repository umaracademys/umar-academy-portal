# 🚨 Quick Fix for 404 Errors

## ⚡ Immediate Action Required

### Step 1: Check What's Returning 404

**Open Browser Console (F12):**
1. Go to **Network** tab
2. Refresh the page
3. Look for **red/failed requests**
4. Click on the failed request
5. Check the **Request URL** - this tells you what's failing

---

## 🔍 Common 404 Scenarios & Fixes

### Scenario 1: `/api/users` Returns 404

**Problem:** Frontend trying to call backend API but getting 404

**Fix:**
1. **Check Backend is Running:**
   ```bash
   curl https://umar-academy-portal-hfvb.onrender.com/api/health
   ```
   - If this returns 404, your backend isn't deployed
   - If this works, continue to step 2

2. **Set Frontend Environment Variable:**
   - Render Dashboard → Frontend Service
   - Environment tab → Add:
     ```
     VITE_API_BASE_URL = https://umar-academy-portal-hfvb.onrender.com/api
     ```
   - Save and wait for redeploy (2-5 minutes)

### Scenario 2: Routes like `/dashboard` Return 404

**Problem:** React Router routes returning 404

**Fix:**
- ✅ Already fixed with `_redirects` file
- Wait for redeploy after environment variable change
- If still 404, check Render Static Site settings

### Scenario 3: Static Files (JS/CSS) Return 404

**Problem:** Build files not being served

**Fix:**
1. Check Render build logs - did build succeed?
2. Verify **Publish Directory** is set to `dist`
3. Check if `dist` folder has files after build

---

## 🔧 Diagnostic Steps

### 1. Test Backend Manually

```bash
# Test health endpoint
curl https://umar-academy-portal-hfvb.onrender.com/api/health

# Test users endpoint
curl https://umar-academy-portal-hfvb.onrender.com/api/users
```

**Expected Results:**
- Health: `{"status":"OK","message":"Backend is running"}`
- Users: Array of user objects or `[]`

**If Both Return 404:**
- Backend isn't deployed or wrong URL
- Check Render dashboard for backend service

### 2. Check Frontend Environment Variable

**In Render Dashboard:**
1. Frontend Service → Environment tab
2. Look for `VITE_API_BASE_URL`
3. Should be: `https://umar-academy-portal-hfvb.onrender.com/api`
4. If missing or wrong → Update it

### 3. Check Browser Console

**What to Look For:**
```
Failed to load resource: the server responded with a status of 404
GET https://umar-academy-portal-hfvb.onrender.com/api/users 404
```

This tells you:
- Which URL is failing
- Whether it's the correct backend URL
- If backend endpoint exists

---

## 🎯 Most Likely Issue

**The `VITE_API_BASE_URL` environment variable is NOT set in Render.**

### To Fix:

1. **Go to Render Dashboard**
2. **Click on your Frontend Service (Static Site)**
3. **Click "Environment" tab**
4. **Add New Environment Variable:**
   - Key: `VITE_API_BASE_URL`
   - Value: `https://umar-academy-portal-hfvb.onrender.com/api`
5. **Save**
6. **Wait for auto-redeploy** (2-5 minutes)
7. **Test again**

---

## 📋 Quick Checklist

- [ ] Backend is deployed and running
- [ ] Backend health check works: `/api/health`
- [ ] Frontend environment variable `VITE_API_BASE_URL` is set
- [ ] Environment variable points to correct backend URL
- [ ] Frontend has been redeployed after setting variable
- [ ] Browser console shows correct API URL being called

---

## 🆘 If Still Getting 404

**Share This Information:**
1. The **exact URL** from Network tab that's returning 404
2. **Backend health check result:**
   ```bash
   curl https://umar-academy-portal-hfvb.onrender.com/api/health
   ```
3. **Screenshot** of Browser Network tab showing the failed request
4. **Render environment variables** (screenshot or list)

This will help identify the exact issue! 🔍

