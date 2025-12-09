# How to Check Developer Account in Backend Shell

This guide explains how to verify the developer account in your production MongoDB database.

## Method 1: Using Render Shell (Recommended)

### Step 1: Access Render Shell

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your **backend service** (umar-academy-backend)
3. Click on the **"Shell"** tab (or look for "Open Shell" button)
4. This opens a terminal connected to your production environment

### Step 2: Run the Check Script

In the Render shell, run:

```bash
# The script will use the MONGODB_URI from environment variables automatically
node backend/checkDeveloperAccount.js
```

Or if you want to check with a specific MongoDB URI:

```bash
MONGODB_URI="your-mongodb-uri" node backend/checkDeveloperAccount.js
```

### Step 3: View Results

The script will show:
- ✅ If developer account exists
- Account details (email, role, flags)
- Password verification
- All other developer/test accounts

---

## Method 2: Using MongoDB Compass or mongosh

### Option A: MongoDB Compass (GUI)

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect using your MongoDB URI:
   ```
   mongodb+srv://umaracademys:FVsQSZvUcD7y8tU@cluster0.mnqimhg.mongodb.net/umar-academy-portal
   ```
3. Navigate to `umar-academy-portal` database
4. Open `users` collection
5. Search for email: `developer@test.com`

### Option B: mongosh (Command Line)

```bash
# Connect to MongoDB
mongosh "mongodb+srv://umaracademys:FVsQSZvUcD7y8tU@cluster0.mnqimhg.mongodb.net/umar-academy-portal"

# Switch to database
use umar-academy-portal

# Find developer account
db.users.findOne({ email: "developer@test.com" })

# Check all developer accounts
db.users.find({ 
  $or: [
    { isDeveloper: true },
    { isTestAccount: true },
    { email: /@(test|developer|demo)/i }
  ]
})
```

---

## Method 3: Using Local Script (if you have MongoDB URI)

If you have the production MongoDB URI, you can run the check script locally:

```bash
# Check production database
MONGODB_URI="mongodb+srv://umaracademys:FVsQSZvUcD7y8tU@cluster0.mnqimhg.mongodb.net/umar-academy-portal?retryWrites=true&w=majority" npm run check-developer
```

Or directly:

```bash
MONGODB_URI="your-production-uri" node backend/checkDeveloperAccount.js
```

---

## What to Look For

The developer account should have:

```javascript
{
  email: "developer@test.com",
  name: "Developer Account",
  role: "superadmin",
  loginEnabled: true,
  isDeveloper: true,        // ✅ This enables data masking
  isTestAccount: true,      // ✅ This also enables data masking
  password: "$2a$10$..."    // Hashed password
}
```

---

## Quick Check Commands

### In Render Shell:

```bash
# Check if account exists
node backend/checkDeveloperAccount.js

# Or use Node.js directly
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const dev = await User.findOne({ email: 'developer@test.com' });
  console.log(dev ? '✅ Found: ' + dev.email : '❌ Not found');
  process.exit(0);
});
"
```

### In MongoDB Compass or mongosh:

```javascript
// Find developer account
db.users.findOne({ email: "developer@test.com" })

// Check all users with developer flags
db.users.find({ 
  $or: [
    { isDeveloper: true },
    { isTestAccount: true }
  ]
}).pretty()
```

---

## Troubleshooting

### If account not found:

1. **Check MongoDB connection:**
   ```bash
   # In Render shell
   echo $MONGODB_URI
   ```

2. **Verify database name:**
   - Should be: `umar-academy-portal`
   - Check connection string includes correct database

3. **Recreate account:**
   ```bash
   # In Render shell
   MONGODB_URI="your-uri" node backend/createDeveloperProduction.js
   ```

### If password doesn't match:

The password should be: `developer123`

If it doesn't match, you can reset it by:
1. Deleting the account
2. Recreating it with the script

---

## Expected Output

When you run `checkDeveloperAccount.js`, you should see:

```
🔌 Connecting to MongoDB...
   URI: mongodb+srv://***:***@cluster0.mnqimhg.mongodb.net/umar-academy-portal
✅ Connected to MongoDB

✅ Developer account found!

📋 Account Details:
   Email: developer@test.com
   Name: Developer Account
   Role: superadmin
   Login Enabled: true
   isDeveloper: true
   isTestAccount: true
   Created: 2024-12-XX...
   Updated: 2024-12-XX...
   Has Password: Yes (hashed)
   Password Match (developer123): ✅ Yes

✅ Disconnected from MongoDB
```

---

**Need help?** Check the Render logs or MongoDB Atlas dashboard for connection issues.

