# Test Credentials

⚠️ **SECURITY NOTE:** These are test credentials. Never commit production credentials.

## Actual Test Accounts

These credentials are used by the E2E test suite:

### Student
- **Email:** `saria_mdn@yahoo.com`
- **Password:** `Maya2025!`
- **Role:** Student

### Teacher
- **Email:** `rashid86amir82@gmail.com`
- **Password:** `Rashid2025`
- **Role:** Teacher

### Admin
- **Email:** `umairrasheed969@gmail.com`
- **Password:** `Umair123!!!`
- **Role:** Admin

## Running Tests

The tests use these credentials by default. You can override them with environment variables:

```bash
export E2E_STUDENT_EMAIL=saria_mdn@yahoo.com
export E2E_STUDENT_PASSWORD=Maya2025!
export E2E_TEACHER_EMAIL=rashid86amir82@gmail.com
export E2E_TEACHER_PASSWORD=Rashid2025
export E2E_ADMIN_EMAIL=umairrasheed969@gmail.com
export E2E_ADMIN_PASSWORD=Umair123!!!

pnpm test:e2e:mobile
```

## Verification

To verify credentials work, test the login API:

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

## Setting Up Test Users

Before running tests, ensure the test users exist in your database:

```bash
# Create/update test users in database
pnpm setup:test-users

# Or run directly
node backend/createTestUsers.js
```

This script will:
- Create the test users if they don't exist
- Update passwords if users already exist
- Enable login for all test users
- Disable password change requirement for testing
