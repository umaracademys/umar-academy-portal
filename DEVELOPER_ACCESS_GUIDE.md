# Developer Access Guide

This guide explains how to grant developer access to the portal while protecting user privacy through automatic data masking.

## Overview

The portal includes automatic data masking functionality that protects personal information when accessed by developer/test accounts. This allows developers to test the system without seeing real user data.

## How It Works

When a user logs in with a developer account, all personal information is automatically masked:
- **Names**: Replaced with generic names (John Smith, Jane Johnson, etc.)
- **Emails**: Replaced with test emails (user1@example.com, user2@test.com, etc.)
- **Phone Numbers**: Replaced with test numbers ((555) 000-XXXX)
- **Addresses**: Replaced with generic addresses

The data structure and relationships remain intact, so functionality can be tested normally.

## Creating a Developer Account

### Option 1: Create via Backend API

You can create a developer account directly in MongoDB or via the backend API:

```javascript
// Example: Create a developer user
{
  "name": "Developer Account",
  "email": "developer@test.com",  // Email containing "@test" triggers developer mode
  "password": "your-secure-password",
  "role": "superadmin"  // or "admin" for limited access
}
```

### Option 2: Mark Existing Account as Developer

Add a flag to an existing user document in MongoDB:

```javascript
// In User collection
{
  "_id": "...",
  "email": "developer@example.com",
  "role": "superadmin",
  "isDeveloper": true,  // Add this flag
  // ... other fields
}
```

### Option 3: Use Email Pattern

Any account with an email containing:
- `@developer`
- `@test`
- `@demo`

Will automatically be treated as a developer account.

## Developer Account Detection

The system detects developer accounts by checking:
1. User role is `"developer"` or `"test"`
2. Email contains `@developer`, `@test`, or `@demo`
3. User object has `isDeveloper: true` or `isTestAccount: true`

## What Gets Masked

### Students
- `fullName` → Generic name (John Smith, Jane Johnson, etc.)
- `parentName` → Generic name
- `email` → Test email (user1@example.com, etc.)
- `contact` / `phone` → Test phone ((555) 000-XXXX)
- `address` → Generic address

### Teachers
- `fullName` → Generic name
- `email` → Test email
- `contact` / `phoneNumber` / `phone` → Test phone
- `address` → Generic address
- `emergencyContact` → Test phone

### Admins
- `fullName` → Generic name
- `email` → Test email
- `contact` → Test phone

### Other Data
- Assignment `assignedByName` → Generic name
- Message sender names → Generic names
- Any other fields containing personal information

## What Stays Unmasked

- IDs and references (to maintain data relationships)
- Program types (Full-Time HQ, Part-Time HQ, etc.)
- Status fields (active, inactive, etc.)
- Dates and timestamps
- Academic data (grades, assignments, etc.)
- System configuration data

## Testing with Developer Account

1. **Login**: Use the developer account credentials
2. **Automatic Masking**: All personal data is automatically masked
3. **Full Functionality**: All features work normally
4. **No Real Data Exposure**: Real user information is never displayed

## Security Notes

- Developer accounts should have strong passwords
- Consider limiting developer account permissions if needed
- Monitor developer account usage
- Developer accounts can be disabled by setting `loginEnabled: false` in the User document

## Disabling Developer Mode

To disable developer mode for an account:
1. Remove the `isDeveloper` flag
2. Change the email to not contain `@developer`, `@test`, or `@demo`
3. Change the role from `"developer"` or `"test"`

## Example Developer Account Setup

```javascript
// MongoDB User Document
{
  "_id": ObjectId("..."),
  "name": "Developer Test Account",
  "email": "developer@test.com",
  "password": "$2b$10$...", // Hashed password
  "role": "superadmin",
  "isDeveloper": true,
  "loginEnabled": true,
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

## Verification

To verify masking is working:
1. Login with developer account
2. Navigate to Students or Teachers page
3. Check that names are generic (John Smith, Jane Johnson, etc.)
4. Check that emails are test emails (user1@example.com, etc.)
5. Check that phone numbers are test numbers ((555) 000-XXXX)

## Support

If you need to create a developer account or have questions about data masking, contact the system administrator.

