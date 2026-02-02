# How to Update Super Admin Password on Render

## Quick Fix

When you run the password update script on Render, make sure the `MONGODB_URI` environment variable is set.

## Steps

1. **Open Render Shell**:
   - Go to your Render Dashboard
   - Select your Backend service
   - Click on "Shell" tab

2. **Run the update script**:
   ```bash
   node backend/updateSuperAdminPassword.js
   ```

3. **If you get connection error**, check environment variables:
   ```bash
   echo $MONGODB_URI
   ```
   
   If it's empty, the environment variable is not set. You need to set it in Render dashboard.

## Setting MONGODB_URI on Render

1. Go to your Backend service in Render Dashboard
2. Click on "Environment" tab
3. Look for `MONGODB_URI` variable
4. If it doesn't exist, click "Add Environment Variable"
5. Add:
   - Key: `MONGODB_URI`
   - Value: Your MongoDB connection string (same one used by your backend server)

## Alternative: Use Backend API Endpoint

Instead of running the script, you can update the password through the backend API if you have admin access.

Or, you can temporarily add a script that runs during deployment, or use MongoDB directly through MongoDB Atlas dashboard.

## Current Credentials (After Update)

- Email: `sadmin@umaracademy.org`
- Password: `Password123!!!`
- Role: `superadmin`

