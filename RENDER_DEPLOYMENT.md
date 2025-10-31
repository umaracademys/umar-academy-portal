# 🚀 Render Deployment Guide

Complete guide to deploy Umar Academy Portal to Render.

## 📋 Prerequisites

1. **GitHub Repository**: Your code is already on GitHub ✅
2. **Render Account**: Sign up at [render.com](https://render.com) (free tier available)
3. **MongoDB Database**: 
   - Option A: MongoDB Atlas (free tier) - Recommended
   - Option B: Render's MongoDB service

---

## 🗄️ Step 1: Set Up MongoDB Atlas (Recommended)

### Create MongoDB Atlas Account

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for free
3. Create a new cluster (choose **FREE M0** tier)
4. Create a database user:
   - Go to **Database Access** → **Add New Database User**
   - Username: `umar-academy-user` (or your choice)
   - Password: Generate a strong password (save it!)
   - Database User Privileges: **Atlas admin**
5. Whitelist IP Address:
   - Go to **Network Access** → **Add IP Address**
   - Click **Allow Access from Anywhere** (for Render)
6. Get Connection String:
   - Go to **Database** → **Connect** → **Connect your application**
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `umar-academy-portal`
   
   Example: `mongodb+srv://umar-academy-user:yourpassword@cluster0.xxxxx.mongodb.net/umar-academy-portal?retryWrites=true&w=majority`

---

## 🔧 Step 2: Deploy Backend API

### On Render Dashboard:

1. **New Web Service**
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub repository: `umaracademys/umar-academy-portal`
   - Click **"Connect"**

2. **Configure Backend Service**:
   - **Name**: `umar-academy-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

3. **Environment Variables**:
   - Click **"Advanced"** → **"Add Environment Variable"**
   - Add these:
     ```
     NODE_ENV = production
     PORT = 10000
     MONGODB_URI = mongodb+srv://your-connection-string-here
     FRONTEND_URL = https://umar-academy-frontend.onrender.com
     ```
   - **MONGODB_URI**: Paste your MongoDB Atlas connection string from Step 1

4. **Create Service**
   - Click **"Create Web Service"**
   - Wait for deployment (5-10 minutes)

5. **Get Backend URL**:
   - Once deployed, you'll see: `https://umar-academy-backend.onrender.com`
   - **Save this URL** - you'll need it for the frontend!

---

## 🎨 Step 3: Deploy Frontend

### On Render Dashboard:

1. **New Static Site**
   - Click **"New +"** → **"Static Site"**
   - Connect your GitHub repository: `umaracademys/umar-academy-portal`

2. **Configure Frontend Service**:
   - **Name**: `umar-academy-frontend`
   - **Branch**: `main`
   - **Root Directory**: (leave empty - root of repo)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

3. **Environment Variables**:
   - Click **"Advanced"** → **"Add Environment Variable"**
   - Add:
     ```
     VITE_API_BASE_URL = https://umar-academy-backend.onrender.com/api
     ```
   - ⚠️ **Replace** `umar-academy-backend` with your actual backend service name from Step 2

4. **Create Static Site**
   - Click **"Create Static Site"**
   - Wait for deployment (5-10 minutes)

5. **Get Frontend URL**:
   - Once deployed: `https://umar-academy-frontend.onrender.com`
   - **This is your live application!** 🎉

---

## ✅ Step 4: Update Backend with Frontend URL

After frontend is deployed:

1. Go to your **Backend Service** on Render
2. Click **"Environment"** tab
3. Update `FRONTEND_URL`:
   ```
   FRONTEND_URL = https://umar-academy-frontend.onrender.com
   ```
4. Click **"Save Changes"**
5. Service will automatically redeploy

---

## 🔄 Step 5: Test Your Deployment

1. **Visit your frontend URL**: `https://umar-academy-frontend.onrender.com`
2. **Test login**: Use your super admin credentials
3. **Check backend health**: Visit `https://umar-academy-backend.onrender.com/api/health`
4. **Test API**: Try creating a student or teacher

---

## 🔐 Important Notes

### Environment Variables Checklist

**Backend:**
- ✅ `NODE_ENV` = `production`
- ✅ `PORT` = `10000`
- ✅ `MONGODB_URI` = Your MongoDB Atlas connection string
- ✅ `FRONTEND_URL` = Your frontend Render URL

**Frontend:**
- ✅ `VITE_API_BASE_URL` = Your backend Render URL + `/api`

### MongoDB Atlas Security

- ✅ Keep your MongoDB password secure
- ✅ Don't commit `.env` files to GitHub
- ✅ Use strong passwords for database users
- ✅ Regularly rotate credentials

---

## 🐛 Troubleshooting

### Backend Issues

**Error: "Cannot connect to MongoDB"**
- Check MongoDB Atlas IP whitelist (allow all IPs)
- Verify connection string format
- Check username/password in connection string

**Error: "Port already in use"**
- Render uses port 10000 automatically - don't hardcode it
- Make sure `PORT` environment variable is set

**Error: "CORS error"**
- Update `FRONTEND_URL` in backend environment variables
- Restart backend service after updating

### Frontend Issues

**Error: "Cannot fetch from API"**
- Check `VITE_API_BASE_URL` is correct
- Ensure backend is deployed and running
- Check browser console for CORS errors

**Error: "Build failed"**
- Check build logs on Render
- Ensure all dependencies are in `package.json`
- Try running `npm install && npm run build` locally first

### General Issues

**Slow first load**:
- Render free tier spins down after inactivity
- First request takes ~30 seconds to wake up
- Consider paid tier for production (always-on)

**Database connection lost**:
- Check MongoDB Atlas cluster status
- Verify connection string is correct
- Check MongoDB Atlas network access settings

---

## 🎯 Quick Deploy Checklist

- [ ] MongoDB Atlas account created
- [ ] MongoDB cluster created and connection string copied
- [ ] Backend service deployed on Render
- [ ] Backend environment variables set
- [ ] Frontend service deployed on Render
- [ ] Frontend environment variables set
- [ ] Frontend URL updated in backend
- [ ] Application tested and working
- [ ] Database seeded (optional - create admin users)

---

## 📊 Render Dashboard URLs

After deployment, you can manage services at:
- **Dashboard**: [dashboard.render.com](https://dashboard.render.com)
- **Backend Logs**: Available in your backend service dashboard
- **Frontend Logs**: Available in your frontend service dashboard

---

## 🚀 Production Tips

1. **Use MongoDB Atlas Production Cluster** (not free tier for production)
2. **Enable Render Auto-Deploy** (deploys on every push to main)
3. **Set up monitoring** in Render dashboard
4. **Use custom domains** (Render supports this)
5. **Enable SSL** (automatic on Render)
6. **Set up backups** for MongoDB Atlas
7. **Use environment-specific configs** (dev/staging/prod)

---

## 📝 Environment Variables Template

Save this for reference:

### Backend (.env equivalent)
```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/umar-academy-portal?retryWrites=true&w=majority
FRONTEND_URL=https://umar-academy-frontend.onrender.com
```

### Frontend (.env equivalent)
```
VITE_API_BASE_URL=https://umar-academy-backend.onrender.com/api
```

---

**🎉 Congratulations!** Your Umar Academy Portal is now live on Render!

Need help? Check Render docs: [render.com/docs](https://render.com/docs)

