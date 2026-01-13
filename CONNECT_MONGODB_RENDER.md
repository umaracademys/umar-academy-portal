# Connecting to MongoDB in Render

## Method 1: Using Render Shell (Recommended)

### Step 1: Access Render Shell
1. Go to your Render dashboard: https://dashboard.render.com
2. Select your backend service (e.g., `umar-academy-backend`)
3. Click on **"Shell"** tab in the left sidebar
4. Click **"Open Shell"** button

### Step 2: Connect to MongoDB
Once in the Render shell, you can:

```bash
# Check if MongoDB URI is set
echo $MONGODB_URI

# Connect using Node.js script
node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('✅ Connected')).catch(e => console.error('❌ Error:', e))"
```

### Step 3: Use MongoDB Shell Scripts
```bash
# Count users
node -e "require('dotenv').config(); const mongoose = require('mongoose'); const User = mongoose.model('User', new mongoose.Schema({}, {strict: false})); mongoose.connect(process.env.MONGODB_URI).then(async () => { const count = await User.countDocuments(); console.log('Total users:', count); process.exit(0); })"

# Check specific user
node backend/checkUser.js shrashidua@gmail.com

# Count all users
node backend/countUsers.js
```

---

## Method 2: Using MongoDB Compass (GUI)

### Step 1: Get MongoDB Connection String
1. Go to Render dashboard → Your backend service
2. Click **"Environment"** tab
3. Find `MONGODB_URI` variable
4. Copy the connection string (it looks like: `mongodb+srv://...`)

### Step 2: Connect with MongoDB Compass
1. Download MongoDB Compass: https://www.mongodb.com/products/compass
2. Open MongoDB Compass
3. Paste your connection string
4. Click **"Connect"**

---

## Method 3: Using mongosh (MongoDB Shell)

### If MongoDB Atlas:
```bash
# Install mongosh if not available
# Then connect:
mongosh "your-mongodb-uri-from-render"
```

### In Render Shell:
```bash
# Check if mongosh is available
which mongosh

# If available, connect:
mongosh $MONGODB_URI
```

---

## Method 4: Using Node.js Scripts in Render

### Upload Scripts to Render
The scripts in `backend/` folder are already available in your Render deployment.

### Run Scripts via Render Shell:
```bash
# Navigate to backend directory
cd backend

# Run any script
node checkUser.js email@example.com
node countUsers.js
node verifyMongoConnection.js
```

---

## Quick Commands for Render Shell

### Check MongoDB Connection
```bash
node backend/verifyMongoConnection.js
```

### Count Users
```bash
node backend/countUsers.js
```

### Check Specific User
```bash
node backend/checkUser.js user@email.com
```

### List All Collections
```bash
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name).join(', '));
  process.exit(0);
});
"
```

### Find User by Email
```bash
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const User = mongoose.model('User', new mongoose.Schema({}, {strict: false}));
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const user = await User.findOne({ email: 'shrashidua@gmail.com' });
  if (user) {
    console.log('User found:', user.email, user.role);
  } else {
    console.log('User not found');
  }
  process.exit(0);
});
"
```

---

## Troubleshooting

### If MONGODB_URI is not set:
1. Go to Render dashboard → Environment tab
2. Add `MONGODB_URI` variable
3. Value should be your MongoDB connection string

### If connection fails:
1. Check MongoDB Atlas IP whitelist (if using Atlas)
2. Verify connection string format
3. Check if MongoDB service is running

### If scripts don't work:
1. Make sure you're in the correct directory: `cd backend`
2. Check if Node.js modules are installed: `npm list mongoose`
3. Try installing dependencies: `npm install`

---

## Environment Variables in Render

Make sure these are set in Render dashboard:
- `MONGODB_URI` - Your MongoDB connection string
- `NODE_ENV` - Set to `production`
- `JWT_SECRET` - Your JWT secret key
- `FRONTEND_URL` - Your frontend URL

---

## Security Notes

⚠️ **Important:**
- Never commit MongoDB connection strings to git
- Always use environment variables
- Keep your MongoDB credentials secure
- Use MongoDB Atlas IP whitelist for additional security

---

## Next Steps

1. **Access Render Shell**: Go to your Render dashboard → Shell
2. **Run verification**: `node backend/verifyMongoConnection.js`
3. **Check users**: `node backend/countUsers.js`
4. **Query data**: Use the scripts in `backend/` folder
