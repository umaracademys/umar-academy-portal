# Testing Credentials Setup

## Important Note

⚠️ **The E2E tests require real users to exist in the database!**

The test credentials (`ahmed@umaracademy.com`, `teacher@umaracademy.com`, etc.) must exist in your database for the tests to work.

## Setting Up Test Users

### Option 1: Use Seeded Users

If you've run the seed script, use these credentials:

```bash
export E2E_STUDENT_EMAIL=ahmed@umaracademy.com
export E2E_STUDENT_PASSWORD=password123
export E2E_TEACHER_EMAIL=teacher@umaracademy.com
export E2E_TEACHER_PASSWORD=password123
export E2E_ADMIN_EMAIL=admin@umaracademy.com
export E2E_ADMIN_PASSWORD=password123
```

### Option 2: Seed the Database

If users don't exist, seed the database:

```bash
cd backend
node seedDatabase.js
```

This creates:
- Super Admin: `sadmin@umaracademy.org` / `password123`
- Admin: `admin@umaracademy.com` / `password123`
- Teacher: `teacher@umaracademy.com` / `password123`
- Student: `ahmed@umaracademy.com` / `password123`

### Option 3: Create Test Users Manually

Create users through the Super Admin dashboard or use the API directly.

## Verifying Users Exist

Check if users exist in the database:

```bash
cd backend
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost:27017/umar-academy-portal').then(async () => { const User = mongoose.model('User', new mongoose.Schema({email: String, role: String}, {collection: 'users'})); const users = await User.find({}).select('email role'); console.log(JSON.stringify(users, null, 2)); process.exit(0); });"
```

## Running Tests

After ensuring users exist, run tests:

```bash
# Set credentials (if different from defaults)
export E2E_STUDENT_EMAIL=ahmed@umaracademy.com
export E2E_STUDENT_PASSWORD=password123

# Run tests
pnpm test:e2e:mobile
```

## Troubleshooting

### Tests fail with "Invalid credentials"

1. Check if users exist in database (see above)
2. Verify credentials match database users
3. Ensure backend is running
4. Check database connection

### Tests timeout on login

1. Check backend is running: `curl http://localhost:3001/api/health`
2. Check frontend is running: `curl http://localhost:5173`
3. Verify credentials are correct
4. Check browser console for errors
