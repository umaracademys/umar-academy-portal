# 🎯 Frontend Domain Update Guide

## ✅ Quick Fix Steps

Since your **backend domain stayed the same** and only the **frontend domain changed**, follow these steps:

---

## **Step 1: Update Frontend Environment Variable**

### In Render Dashboard (Frontend Service):

1. Go to **Render Dashboard** → Your **Frontend Service**
2. Click **"Environment"** tab
3. Add/Update this variable:

```
VITE_API_BASE_URL = https://umar-academy-backend.onrender.com/api
```

**Important:** 
- Use your **actual backend domain** (the one that stayed the same)
- Must include `/api` at the end
- Example: `https://umar-academy-backend.onrender.com/api`

4. Click **"Save Changes"**
5. Render will **auto-redeploy** (wait 2-5 minutes)

---

## **Step 2: Update Backend CORS Configuration**

### Option A: Using Environment Variable (Recommended)

1. Go to **Render Dashboard** → Your **Backend Service**
2. Click **"Environment"** tab
3. Update this variable:

```
FRONTEND_URL = https://your-new-frontend-domain.com
```

**Important:**
- Replace with your **new frontend domain**
- **NO trailing slash**
- Example: `https://umar-academy-frontend-new.onrender.com`

4. Click **"Save Changes"**
5. Click **"Manual Deploy"** → **"Deploy latest commit"**

### Option B: Add Multiple Domains (If you need both old and new)

If you need to support both old and new domains temporarily:

1. Go to **Render Dashboard** → Your **Backend Service**
2. Click **"Environment"** tab
3. Add this variable:

```
ADDITIONAL_FRONTEND_URLS = https://old-frontend-domain.com,https://new-frontend-domain.com
```

4. Click **"Save Changes"**
5. Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## **Step 3: Verify Configuration**

### Check Frontend API URL:

1. Open your **new frontend** in browser
2. Open **Browser Console** (F12)
3. Type: `console.log(import.meta.env.VITE_API_BASE_URL)`
4. Should show: `https://your-backend-domain.com/api`

### Check Backend CORS:

1. Open browser console on your frontend
2. Try logging in or making any API call
3. Check **Network tab** for CORS errors
4. Look for `Access-Control-Allow-Origin` header in response

### Test Backend Health:

Visit: `https://your-backend-domain.com/api/health`

Should return: `{ "status": "ok" }`

---

## **Step 4: Clear Browser Cache**

After updating:

1. Clear browser cache: `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Or use Incognito/Private mode
3. Clear localStorage:
   ```javascript
   localStorage.clear();
   ```

---

## 🐛 **Common Issues**

### Issue: CORS Error

**Error:** `Access-Control-Allow-Origin` error in console

**Fix:**
- Make sure `FRONTEND_URL` in backend environment variables matches your **new frontend domain**
- Redeploy backend after updating environment variable
- Check backend logs in Render dashboard for CORS errors

### Issue: 404 Errors on API Calls

**Error:** `Failed to fetch` or `404 Not Found`

**Fix:**
- Check `VITE_API_BASE_URL` includes `/api` at the end
- Should be: `https://backend.com/api` (NOT `https://backend.com`)
- Verify backend is running (check Render dashboard)

### Issue: Still Seeing Old Domain

**Fix:**
- Clear browser cache completely
- Use Incognito/Private browsing mode
- Check DNS propagation (can take up to 48 hours)

---

## 📋 **Quick Checklist**

- [ ] Updated `VITE_API_BASE_URL` in **frontend** environment variables
- [ ] Updated `FRONTEND_URL` in **backend** environment variables  
- [ ] Redeployed **frontend** (auto-redeploys after env var change)
- [ ] Redeployed **backend** (manual deploy needed)
- [ ] Verified API health endpoint works
- [ ] Cleared browser cache/localStorage
- [ ] Tested login/logout flow

---

## 🆘 **Still Having Issues?**

Share these details:
1. Your **new frontend domain**
2. Your **backend domain** (the one that stayed the same)
3. Screenshot of browser console errors
4. Screenshot of Network tab showing API calls

