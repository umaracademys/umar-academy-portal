# Setting Environment Variables on Render

## Required Environment Variables

Your backend service requires these environment variables to be set in Render:

### 1. JWT_SECRET (Required) ⚠️ CURRENTLY MISSING
A secure random string used to sign JWT tokens. 

**Generated Secret (Ready to Use):**
```
4qEy82CMuJ1yhM0wcgE7gkYGQpNMwnR3WfudA30VuVI=
```

**How to generate (if you need a new one):**
```bash
openssl rand -base64 32
```

**Or use Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Set in Render:**
1. Go to Render Dashboard → Your Backend Service
2. Click "Environment" tab
3. Click "Add Environment Variable"
4. Key: `JWT_SECRET`
5. Value: `4qEy82CMuJ1yhM0wcgE7gkYGQpNMwnR3WfudA30VuVI=`
6. Click "Save Changes"
7. Wait for auto-redeploy (2-5 minutes)

### 2. MONGODB_URI (Required)
Your MongoDB connection string.

**Format:**
```
mongodb+srv://username:password@cluster.mongodb.net/database-name
```

**Set in Render:**
- Go to Render Dashboard → Your Backend Service
- Click "Environment" tab
- Add or update: `MONGODB_URI` = (your MongoDB connection string)

### 3. NODE_ENV (Optional but Recommended)
Set to `production` for production deployments.

**Set in Render:**
- Go to Render Dashboard → Your Backend Service
- Click "Environment" tab
- Add or update: `NODE_ENV` = `production`

### 4. PORT (Usually Auto-set by Render)
Render usually sets this automatically, but if needed:
- `PORT` = `3001` (or whatever port your service uses)

### 5. FRONTEND_URL (Optional)
The URL of your frontend application (for CORS configuration).

**Set in Render:**
- Go to Render Dashboard → Your Backend Service
- Click "Environment" tab
- Add or update: `FRONTEND_URL` = `https://your-frontend-url.onrender.com`

## Steps to Set Environment Variables on Render

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Select your Backend Service**
3. **Click on "Environment" tab**
4. **Click "Add Environment Variable"** for each variable
5. **Enter the Key and Value**
6. **Click "Save Changes"**
7. **Redeploy** (or Render will auto-redeploy if enabled)

## Quick Checklist

- [ ] JWT_SECRET is set (generated secure random string)
- [ ] MONGODB_URI is set (MongoDB connection string)
- [ ] NODE_ENV is set to `production`
- [ ] FRONTEND_URL is set (if using CORS)
- [ ] All variables are saved
- [ ] Service has been redeployed

## Security Notes

- **Never commit environment variables to git**
- **Keep JWT_SECRET secret and secure**
- **Use different JWT_SECRET for production vs development**
- **Rotate JWT_SECRET periodically for better security**
- **Ensure MONGODB_URI includes proper authentication**

## Troubleshooting

### Server won't start:
- Check that JWT_SECRET is set and not the default value
- Check that MONGODB_URI is set correctly
- Check Render logs for specific error messages

### Authentication fails:
- Verify JWT_SECRET is the same across all services (if using multiple)
- Check that JWT_SECRET is not the default placeholder value
- Ensure JWT_SECRET is at least 32 characters long

### Database connection fails:
- Verify MONGODB_URI format is correct
- Check MongoDB Atlas IP whitelist (should allow all IPs or Render's IPs)
- Ensure MongoDB user has proper permissions

