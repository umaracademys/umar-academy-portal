# 🚀 Render Quick Start Guide

## Your MongoDB Connection String

**Complete Connection String:**
```
mongodb+srv://umaracademys:FVsQSZvUcD7y8tU@cluster0.mnqimhg.mongodb.net/umar-academy-portal?retryWrites=true&w=majority
```

**✅ Database Name:** `umar-academy-portal`

---

## 📋 Step-by-Step Deployment

### Step 1: Deploy Backend API (5 minutes)

1. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - Sign up/Login with GitHub

2. **Create New Web Service**
   - Click **"New +"** → **"Web Service"**
   - Connect repository: `umaracademys/umar-academy-portal`
   - Click **"Connect"**

3. **Configure Service**
   - **Name**: `umar-academy-backend`
   - **Region**: Choose closest (e.g., `Oregon (US West)`)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. **Add Environment Variables** (Click "Advanced")
   ```
   NODE_ENV = production
   PORT = 10000
   MONGODB_URI = mongodb+srv://umaracademys:FVsQSZvUcD7y8tU@cluster0.mnqimhg.mongodb.net/umar-academy-portal?retryWrites=true&w=majority
   FRONTEND_URL = https://umar-academy-frontend.onrender.com
   ```

5. **Create Service**
   - Click **"Create Web Service"**
   - Wait ~5 minutes for deployment
   - **Save your backend URL** (e.g., `https://umar-academy-backend.onrender.com`)

---

### Step 2: Deploy Frontend (5 minutes)

1. **Create Static Site**
   - Click **"New +"** → **"Static Site"**
   - Connect repository: `umaracademys/umar-academy-portal`

2. **Configure Service**
   - **Name**: `umar-academy-frontend`
   - **Branch**: `main`
   - **Root Directory**: (leave empty)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

3. **Add Environment Variable**
   ```
   VITE_API_BASE_URL = https://umar-academy-backend.onrender.com/api
   ```
   ⚠️ **Replace `umar-academy-backend` with your actual backend service name from Step 1**

4. **Create Static Site**
   - Click **"Create Static Site"**
   - Wait ~5 minutes for deployment
   - **Save your frontend URL** (e.g., `https://umar-academy-frontend.onrender.com`)

---

### Step 3: Update Backend with Frontend URL

1. Go to your **Backend Service** on Render
2. Click **"Environment"** tab
3. Edit `FRONTEND_URL`:
   ```
   FRONTEND_URL = https://umar-academy-frontend.onrender.com
   ```
   ⚠️ **Replace with your actual frontend URL from Step 2**
4. Click **"Save Changes"** (auto-redeploys)

---

## ✅ Quick Checklist

- [ ] Backend deployed on Render
- [ ] Backend URL saved
- [ ] Frontend deployed on Render
- [ ] Frontend URL saved
- [ ] `VITE_API_BASE_URL` set in frontend (points to backend)
- [ ] `FRONTEND_URL` updated in backend (points to frontend)
- [ ] Both services showing "Live" status

---

## 🔍 Test Your Deployment

1. **Check Backend Health:**
   - Visit: `https://umar-academy-backend.onrender.com/api/health`
   - Should show: `{"status":"OK","message":"Backend is running"}`

2. **Test Frontend:**
   - Visit your frontend URL
   - Try logging in with super admin credentials
   - Test creating a student or teacher

---

## 🎯 Your Live URLs

After deployment, your app will be available at:

- **Frontend**: `https://umar-academy-frontend.onrender.com`
- **Backend API**: `https://umar-academy-backend.onrender.com/api`
- **Health Check**: `https://umar-academy-backend.onrender.com/api/health`

---

## ⚠️ Important Notes

1. **First Load Delay**: Render free tier spins down after 15 min inactivity. First request takes ~30 seconds.

2. **Auto-Deploy**: Render automatically deploys on every push to `main` branch.

3. **Logs**: View logs in Render dashboard for debugging.

4. **Environment Variables**: Keep your MongoDB connection string secure. Never commit it to GitHub.

---

## 🐛 Troubleshooting

**Backend won't start:**
- Check MongoDB connection string format
- Verify MongoDB Atlas network access (whitelist all IPs: 0.0.0.0/0)
- Check backend logs in Render dashboard

**Frontend can't connect to backend:**
- Verify `VITE_API_BASE_URL` is correct
- Check CORS settings in backend
- Ensure backend URL includes `/api` at the end

**MongoDB connection errors:**
- Check MongoDB Atlas cluster is running
- Verify username/password in connection string
- Check network access in MongoDB Atlas dashboard

---

## 🎉 You're Done!

Your Umar Academy Portal is now live! 🚀

