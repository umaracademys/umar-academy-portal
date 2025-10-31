# 🎨 Frontend Deployment on Render - Step by Step

## 📋 Prerequisites
- ✅ GitHub repository connected to Render
- ✅ Backend deployed and running (to get backend URL)

---

## 🚀 Step 1: Create Static Site

1. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - Sign in

2. **Click "New +"** button (top right)
   - Select **"Static Site"**

3. **Connect Repository**
   - Click **"Connect account"** if not connected
   - Select your GitHub account
   - Choose repository: `umaracademys/umar-academy-portal`
   - Click **"Connect"**

---

## ⚙️ Step 2: Configure Frontend Service

### Basic Settings:

1. **Name**: `umar-academy-frontend` (or your preferred name)
   - This will be part of your URL: `https://umar-academy-frontend.onrender.com`

2. **Branch**: `main`
   - The branch with your code

3. **Root Directory**: (Leave EMPTY)
   - Since frontend code is in root of repository

4. **Build Command**: 
   ```
   npm install && npm run build
   ```
   - This installs dependencies and builds the React app

5. **Publish Directory**: `dist`
   - This is where Vite outputs the built files

---

## 🔧 Step 3: Add Environment Variable

1. **Click "Advanced"** button (at the bottom)

2. **Add Environment Variable**:
   - Click **"Add Environment Variable"**
   - Key: `VITE_API_BASE_URL`
   - Value: `https://<your-backend-name>.onrender.com/api`
   
   ⚠️ **Important**: Replace `<your-backend-name>` with your actual backend service name!
   
   Example:
   ```
   VITE_API_BASE_URL = https://umar-academy-backend.onrender.com/api
   ```

3. **Save** the environment variable

---

## ▶️ Step 4: Deploy

1. **Click "Create Static Site"** button (at the bottom)

2. **Wait for Deployment** (5-10 minutes):
   - Build logs will show:
     - `npm install` running
     - `npm run build` running
     - Files being uploaded
     - Deployment successful

3. **Get Your URL**:
   - Once deployed, you'll see: `https://umar-academy-frontend.onrender.com`
   - Or similar based on your service name

---

## ✅ Step 5: Verify Deployment

1. **Visit your frontend URL**
   - Should see the login page
   - No console errors

2. **Check Build Logs** (if issues):
   - Click on your service → "Logs" tab
   - Look for any errors

3. **Test API Connection**:
   - Open browser console (F12)
   - Login and check network tab
   - API calls should go to your backend URL

---

## 🔄 Step 6: Update Backend with Frontend URL

After frontend is deployed:

1. **Go to Backend Service** on Render
2. **Environment** tab
3. **Update `FRONTEND_URL`**:
   ```
   FRONTEND_URL = https://umar-academy-frontend.onrender.com
   ```
   (Use your actual frontend URL)

4. **Save** - Backend will auto-redeploy

---

## 🎯 Quick Configuration Summary

```
Service Type: Static Site
Name: umar-academy-frontend
Branch: main
Root Directory: (empty)
Build Command: npm install && npm run build
Publish Directory: dist
Environment Variable:
  VITE_API_BASE_URL = https://<backend-url>/api
```

---

## 🐛 Common Issues

### Build Fails: "Cannot find module"
- **Fix**: Check Root Directory is empty (not `backend`)
- **Fix**: Verify `package.json` exists in root

### Build Fails: "Build command failed"
- **Fix**: Check build logs for specific error
- **Fix**: Try running `npm install && npm run build` locally first

### Frontend shows blank page
- **Fix**: Check browser console for errors
- **Fix**: Verify `VITE_API_BASE_URL` is set correctly
- **Fix**: Ensure backend is deployed and accessible

### API calls fail (CORS errors)
- **Fix**: Update `FRONTEND_URL` in backend environment variables
- **Fix**: Restart backend after updating

---

## 📝 Notes

- **Auto-Deploy**: Render automatically deploys when you push to `main` branch
- **Build Time**: Usually 5-10 minutes
- **Free Tier**: May spin down after inactivity (takes ~30 seconds to wake up)
- **Custom Domain**: Can be added in Render settings

---

## ✅ Success Checklist

- [ ] Static site created
- [ ] Build command: `npm install && npm run build`
- [ ] Publish directory: `dist`
- [ ] Environment variable `VITE_API_BASE_URL` set
- [ ] Deployment successful
- [ ] Frontend URL accessible
- [ ] Backend `FRONTEND_URL` updated
- [ ] Can login and use the app

---

**🎉 Your frontend will be live at:** `https://umar-academy-frontend.onrender.com`

**Need the backend URL?** Check your backend service dashboard on Render!

