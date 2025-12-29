# How to Update Password on Render Shell

## Steps

1. **Open Render Shell**:
   - Go to Render Dashboard → Backend Service → Shell tab

2. **Navigate to project root**:
   ```bash
   cd /opt/render/project/src
   ```

3. **Verify you're in the right directory**:
   ```bash
   ls -la
   ```
   You should see `backend/`, `package.json`, etc.

4. **Check MongoDB URI is set**:
   ```bash
   echo $MONGODB_URI
   ```
   Should show your MongoDB connection string.

5. **Run the password update script**:
   ```bash
   node backend/updateSuperAdminPassword.js
   ```

6. **Or reset lockout and password**:
   ```bash
   node backend/resetSuperAdminLockout.js
   ```

## Expected Output

```
🔧 Connecting to MongoDB...
✅ Connected to MongoDB
✅ Password updated successfully!

🔑 Updated Login Credentials:
   Email: sadmin@umaracademy.org
   Password: Password123!!!

✅ You can now login with these credentials!
```

## Troubleshooting

### If you get "Cannot find module":
- Make sure you're in `/opt/render/project/src` (project root)
- Not in `/opt/render/project/src/backend`

### If you get MongoDB connection error:
- Check `echo $MONGODB_URI` shows your connection string
- If empty, set it in Render Dashboard → Environment tab

### If script says MONGODB_URI not set:
- The script now requires MONGODB_URI to be set
- Set it in Render Dashboard → Environment tab
- Redeploy or restart the service

