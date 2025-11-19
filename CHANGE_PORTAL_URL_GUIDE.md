# 🔗 How to Change Your Portal URL

This guide explains how to change the URL of your Umar Academy Portal for both local development and production deployment.

---

## 📋 Overview

Your portal uses two main URL configurations:

1. **Frontend URL**: Where users access the portal (e.g., `https://umar-academy-frontend.onrender.com`)
2. **Backend API URL**: Where the frontend makes API calls (e.g., `https://umar-academy-backend.onrender.com/api`)

---

## 🏠 For Local Development

### Option 1: Using Environment Variables (Recommended)

Create a `.env` file in the **root directory** of your project:

```bash
# .env (in project root)
VITE_API_BASE_URL=http://localhost:3001/api
```

**Note:** Vite only reads `.env` files that start with `VITE_`. The frontend will automatically use this value.

### Option 2: Default Behavior

If no `.env` file exists, the frontend defaults to:
- `http://localhost:3001/api` (for API calls)

The backend defaults to:
- `http://localhost:3001` (port 3001)
- CORS allows all origins (`*`) in development

---

## 🌐 For Production (Render Deployment)

### Step 1: Update Frontend Environment Variable

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Find your **Frontend Service** (Static Site or Web Service)
3. Click on it → Go to **"Environment"** tab
4. Find or add: `VITE_API_BASE_URL`
5. Set value to: `https://your-backend-url.onrender.com/api`
   - Replace `your-backend-url` with your actual backend service name
   - Example: `https://umar-academy-backend.onrender.com/api`
6. Click **"Save Changes"**
7. Render will automatically redeploy (2-5 minutes)

### Step 2: Update Backend Environment Variable

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Find your **Backend Service** (Web Service)
3. Click on it → Go to **"Environment"** tab
4. Find or add: `FRONTEND_URL`
5. Set value to: `https://your-frontend-url.onrender.com`
   - Replace `your-frontend-url` with your actual frontend service name
   - Example: `https://umar-academy-frontend.onrender.com`
6. Click **"Save Changes"**
7. Render will automatically redeploy (2-5 minutes)

### Step 3: Update render.yaml (Optional)

If you're using `render.yaml` for infrastructure as code, update it:

```yaml
services:
  # Backend Service
  - type: web
    name: umar-academy-backend
    envVars:
      - key: FRONTEND_URL
        value: https://umar-academy-frontend.onrender.com  # Update this

  # Frontend Service
  - type: web
    name: umar-academy-frontend
    envVars:
      - key: VITE_API_BASE_URL
        value: https://umar-academy-backend.onrender.com/api  # Update this
```

Then commit and push to trigger a redeploy.

---

## 🔍 How URLs Are Used

### Frontend (`VITE_API_BASE_URL`)

Used in these files:
- `src/contexts/BackendDataContext.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/ActivityLog.tsx`
- `src/modules/student/pages/StudentDashboard.tsx`
- `src/modules/student/pages/StudentAssignments.tsx`
- `packages/mushaf/src/services/quranApi.ts`
- And other components making API calls

**Format:** Should end with `/api`
- ✅ Correct: `https://backend.onrender.com/api`
- ❌ Wrong: `https://backend.onrender.com` (missing `/api`)

### Backend (`FRONTEND_URL`)

Used in:
- `backend/server.js` (CORS configuration)

**Format:** Should be the full frontend URL without trailing slash
- ✅ Correct: `https://frontend.onrender.com`
- ❌ Wrong: `https://frontend.onrender.com/` (trailing slash)

---

## ✅ Verification Steps

### 1. Check Frontend Environment Variable

Open browser console (F12) and run:
```javascript
console.log(import.meta.env.VITE_API_BASE_URL)
```

Should show your backend URL + `/api`

### 2. Check Backend CORS

1. Open browser console (F12)
2. Go to **Network** tab
3. Make an API request (e.g., login)
4. Check the request URL - should go to your backend
5. Check for CORS errors - should be none

### 3. Test API Connection

```bash
# Test backend health
curl https://your-backend-url.onrender.com/api/health

# Should return:
# {"status":"OK","message":"Backend is running"}
```

---

## 🔄 Changing to a Custom Domain

If you want to use a custom domain (e.g., `portal.umaracademy.org`):

### 1. Configure Custom Domain in Render

1. Go to your service in Render Dashboard
2. Click **"Settings"** → **"Custom Domains"**
3. Add your custom domain
4. Follow Render's DNS instructions

### 2. Update Environment Variables

After your custom domain is active:

**Frontend:**
```
VITE_API_BASE_URL=https://api.umaracademy.org/api
```

**Backend:**
```
FRONTEND_URL=https://portal.umaracademy.org
```

### 3. Update CORS in Backend

The backend will automatically use `FRONTEND_URL` for CORS, so once you update the environment variable, CORS will work.

---

## 🐛 Troubleshooting

### Problem: Frontend still calls `localhost:3001`

**Solution:**
1. Check `VITE_API_BASE_URL` is set in Render
2. Clear browser cache
3. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
4. Check browser console for the actual API base URL

### Problem: CORS errors in production

**Solution:**
1. Verify `FRONTEND_URL` is set correctly in backend
2. Ensure no trailing slash in `FRONTEND_URL`
3. Restart backend service
4. Check backend logs for CORS errors

### Problem: 404 errors on API calls

**Solution:**
1. Verify `VITE_API_BASE_URL` ends with `/api`
2. Check backend service is running
3. Test backend health endpoint
4. Check backend logs for route errors

---

## 📝 Quick Reference

| Environment Variable | Location | Purpose | Example |
|---------------------|----------|---------|---------|
| `VITE_API_BASE_URL` | Frontend | API endpoint URL | `https://backend.onrender.com/api` |
| `FRONTEND_URL` | Backend | CORS origin | `https://frontend.onrender.com` |
| `MONGODB_URI` | Backend | Database connection | `mongodb+srv://...` |
| `JWT_SECRET` | Backend | Token signing | `your-secret-key` |
| `NODE_ENV` | Both | Environment mode | `production` |

---

## 🚀 After Changing URLs

1. **Wait for redeploy** (2-5 minutes on Render)
2. **Clear browser cache** (or use incognito mode)
3. **Test login** to verify API connection
4. **Check browser console** for any errors
5. **Test key features** (student registration, assignments, etc.)

---

## 💡 Tips

- Always test in a browser incognito window after changing URLs
- Keep a backup of your current working environment variables
- Use Render's environment variable sync feature if managing multiple services
- Document your URLs in a secure location for team reference

---

**Need Help?** Check the browser console (F12) for specific error messages, and review Render deployment logs for backend issues.

