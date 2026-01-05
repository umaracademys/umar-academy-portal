# 🌐 Domain Migration Troubleshooting Guide

## ⚠️ Common Issues During Domain Migration

If you're updating your domain and experiencing errors, here are the most common causes and fixes:

---

## 🔍 **Step 1: Check What Errors You're Seeing**

### Common Error Types:
1. **CORS Errors** - "Access-Control-Allow-Origin" errors
2. **404 Errors** - API endpoints not found
3. **Network Errors** - Failed to fetch, connection refused
4. **Authentication Errors** - Token issues, login failures

---

## ✅ **Step 2: Update Environment Variables**

### **Frontend (Static Site on Render)**

1. Go to **Render Dashboard** → Your Frontend Service
2. Click **"Environment"** tab
3. Update/Add these variables:

```
VITE_API_BASE_URL = https://your-new-backend-domain.com/api
```

**Important:** 
- Replace `your-new-backend-domain.com` with your actual backend domain
- Make sure it includes `/api` at the end
- Example: `https://umar-academy-backend.onrender.com/api`

### **Backend (Web Service on Render)**

1. Go to **Render Dashboard** → Your Backend Service  
2. Click **"Environment"** tab
3. Update/Add these variables:

```
FRONTEND_URL = https://your-new-frontend-domain.com
NODE_ENV = production
PORT = 10000
MONGODB_URI = your-mongodb-connection-string
JWT_SECRET = your-jwt-secret-key
```

**Important:**
- Replace `your-new-frontend-domain.com` with your actual frontend domain
- **NO trailing slash** for FRONTEND_URL
- Example: `https://umar-academy-frontend.onrender.com`

---

## 🔧 **Step 3: Update CORS Configuration**

The backend needs to allow your new frontend domain. Check `backend/server.js`:

```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,  // ✅ This should be your new domain
  'https://umar-academy-frontend-m2at.onrender.com'  // ⚠️ Update this if changed
].filter(Boolean);
```

**If your domain changed**, you may need to temporarily add both old and new domains:

```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  'https://old-domain.onrender.com',  // Old domain (temporary)
  'https://new-domain.onrender.com'    // New domain
].filter(Boolean);
```

---

## 🚀 **Step 4: Redeploy Services**

After updating environment variables:

1. **Frontend**: Render will auto-redeploy (watch the logs)
2. **Backend**: Click **"Manual Deploy"** → **"Deploy latest commit"**

**Wait 3-5 minutes** for both services to finish deploying.

---

## 🧪 **Step 5: Verify Configuration**

### Check Frontend API URL:

1. Open your frontend in browser
2. Open **Browser Console** (F12)
3. Type: `console.log(import.meta.env.VITE_API_BASE_URL)`
4. Should show: `https://your-new-backend-domain.com/api`

### Check Backend CORS:

1. Open browser console
2. Try making an API call
3. Check Network tab for CORS errors
4. Look for `Access-Control-Allow-Origin` header in response

### Test API Connection:

1. Visit: `https://your-backend-domain.com/api/health`
2. Should return: `{ "status": "ok" }`

---

## 🔄 **Step 6: DNS Propagation**

If you changed your domain (not just Render subdomain):

1. **DNS changes can take 24-48 hours** to propagate globally
2. Some users may see old domain, others new domain
3. **Solution**: Keep both domains in CORS temporarily

---

## 🐛 **Common Issues & Fixes**

### Issue 1: "Failed to fetch" or "Network Error"

**Cause:** Frontend can't reach backend

**Fix:**
- Check `VITE_API_BASE_URL` is set correctly
- Verify backend is running (check Render dashboard)
- Check backend URL is accessible: `https://your-backend.com/api/health`

### Issue 2: CORS Error

**Cause:** Backend doesn't allow frontend domain

**Fix:**
- Update `FRONTEND_URL` in backend environment variables
- Add new domain to `allowedOrigins` in `backend/server.js`
- Redeploy backend

### Issue 3: 404 Errors on API Calls

**Cause:** Wrong API base URL

**Fix:**
- Check `VITE_API_BASE_URL` includes `/api`
- Should be: `https://domain.com/api` (NOT `https://domain.com`)
- Verify in browser console

### Issue 4: Authentication Errors

**Cause:** Token stored with old domain

**Fix:**
- Clear browser localStorage: `localStorage.clear()`
- Log out and log back in
- Check `JWT_SECRET` is set in backend

---

## 📋 **Quick Checklist**

- [ ] Updated `VITE_API_BASE_URL` in frontend environment
- [ ] Updated `FRONTEND_URL` in backend environment  
- [ ] Updated CORS allowed origins in `backend/server.js`
- [ ] Redeployed both frontend and backend
- [ ] Verified API health endpoint works
- [ ] Cleared browser cache/localStorage
- [ ] Tested login/logout flow

---

## 🆘 **Still Having Issues?**

1. **Check Render Logs:**
   - Frontend: Build logs, Runtime logs
   - Backend: Runtime logs (look for CORS errors)

2. **Check Browser Console:**
   - Network tab: See actual API calls being made
   - Console tab: See JavaScript errors

3. **Verify Environment Variables:**
   - Make sure they're saved (not just typed)
   - No extra spaces or quotes
   - Correct format (https://, no trailing slashes except /api)

4. **Test Backend Directly:**
   ```bash
   curl https://your-backend-domain.com/api/health
   ```

---

## 📞 **Need Help?**

Share these details:
1. What errors you're seeing (screenshot of console)
2. Your new frontend domain
3. Your new backend domain
4. Render service status (both frontend and backend)

