# Test Credentials Status

⚠️ **IMPORTANT:** The test credentials need to be verified against the actual database.

## Current Test Credentials (Configured)

The tests are configured to use:
- **Student:** `saria_mdn@yahoo.com` / `Maya2025!`
- **Teacher:** `rashid86amir82@gmail.com` / `Rashid2025`
- **Admin:** `umairrasheed969@gmail.com` / `Umair123!!!`

## Verification Required

**These users must exist in your database for the tests to work.**

### Check If Users Exist

Run this command to check if the users exist:

```bash
cd backend
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost:27017/umar-academy-portal').then(async () => { const User = mongoose.model('User', new mongoose.Schema({email: String, role: String}, {collection: 'users'})); const student = await User.findOne({email: 'saria_mdn@yahoo.com'}); const teacher = await User.findOne({email: 'rashid86amir82@gmail.com'}); const admin = await User.findOne({email: 'umairrasheed969@gmail.com'}); console.log('Student:', student ? 'EXISTS' : 'NOT FOUND'); console.log('Teacher:', teacher ? 'EXISTS' : 'NOT FOUND'); console.log('Admin:', admin ? 'EXISTS' : 'NOT FOUND'); process.exit(0); });"
```

### Test Login API

Verify credentials work via API:

```bash
# Test student login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"saria_mdn@yahoo.com","password":"Maya2025!","role":"student"}'

# Test teacher login  
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rashid86amir82@gmail.com","password":"Rashid2025","role":"teacher"}'

# Test admin login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"umairrasheed969@gmail.com","password":"Umair123!!!","role":"admin"}'
```

## If Users Don't Exist

If the users don't exist, you have two options:

### Option 1: Create the Users

Create the users in the database with the specified credentials.

### Option 2: Update Test Credentials

Update the test credentials in `e2e/mobile-cache-performance.spec.ts` to use users that actually exist in your database.

## Next Steps

1. Verify users exist in database
2. Verify credentials work via API
3. Run tests: `pnpm test:e2e:mobile`
