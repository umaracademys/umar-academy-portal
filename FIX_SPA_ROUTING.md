# 🔧 Fix: 404 Error on Routes (/login, /dashboard, etc.)

## 🎯 Problem

When you visit `https://umar-academy-frontend.onrender.com/login` directly, you get a 404 error.

**Why?** Render's static hosting tries to find a file at `/login/index.html`, but React Router handles routing on the client side.

---

## ✅ Solution: Configure SPA Redirects

### Option 1: Using Render Dashboard (Recommended)

1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com
   - Click on your **Frontend Service** (Static Site)

2. **Configure Redirect**
   - Go to **Settings** tab
   - Scroll to **"Redirects/Rewrites"** section
   - Add this rule:
     ```
     /*    /index.html   200
     ```
   - Or use the format:
     - Source: `/*`
     - Destination: `/index.html`
     - Status: `200`

3. **Save and Redeploy**
   - Click "Save Changes"
   - Wait for redeploy (2-5 minutes)

### Option 2: Verify _redirects File (Already Created)

I've already created a `public/_redirects` file with the correct redirect rule. Verify it's being included in the build:

**Check if file exists:**
```bash
cat public/_redirects
```

Should show:
```
/*    /index.html   200
```

**Verify it's copied to dist:**
```bash
ls -la dist/_redirects
```

If it's not there, Vite might not be copying it. We'll need to configure Vite to include it.

---

## 🔍 How to Check Current Status

### Test Current Setup:

1. Visit: https://umar-academy-frontend.onrender.com
   - Should load the login page ✅

2. Visit: https://umar-academy-frontend.onrender.com/login
   - If 404 → Redirect not configured ❌
   - If loads → Redirect working ✅

3. Visit: https://umar-academy-frontend.onrender.com/dashboard
   - Should redirect to login if not authenticated
   - Or load dashboard if authenticated

---

## 🛠️ If _redirects File Isn't Working

### Update Vite Config

If Render isn't picking up the `_redirects` file, we need to ensure Vite copies it:

**Update `vite.config.ts`:**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { join } from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-redirects',
      closeBundle() {
        copyFileSync(
          join(__dirname, 'public/_redirects'),
          join(__dirname, 'dist/_redirects')
        )
      }
    }
  ],
})
```

Or use the simpler approach - configure redirect in Render dashboard instead.

---

## 📋 Quick Checklist

- [ ] `public/_redirects` file exists with `/*    /index.html   200`
- [ ] File is copied to `dist/_redirects` after build
- [ ] OR redirect is configured in Render dashboard
- [ ] Frontend has been redeployed
- [ ] Test `/login` route - should work now

---

## 🎯 Recommended Action

**Use Render Dashboard to configure redirect** (Easiest method):

1. Render Dashboard → Frontend Service → Settings
2. Add redirect rule: `/* → /index.html` (Status: 200)
3. Save and wait for redeploy

This is the most reliable method for Render Static Sites! 🚀

---

## ✅ After Fix

Once configured:
- ✅ `/login` → Loads login page
- ✅ `/dashboard` → Loads dashboard (if authenticated)
- ✅ `/students` → Loads students page
- ✅ All React Router routes work correctly
- ✅ Direct URL access works (no more 404)

---

**Need help?** Let me know if you want me to update the Vite config or if you prefer using Render dashboard settings!

