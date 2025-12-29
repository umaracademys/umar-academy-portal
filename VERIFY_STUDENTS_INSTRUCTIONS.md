# Step-by-Step Instructions: Verify Students in Database

## On Render Server Shell

Follow these steps exactly to verify if your students exist in the database:

### Step 1: Navigate to Project Root
```bash
cd /opt/render/project/src
```

### Step 2: Check Your Current Directory
```bash
pwd
```
You should see: `/opt/render/project/src`

### Step 3: Verify the Script Exists
```bash
ls -la backend/verifyStudentList.js
```
You should see the file listed. If you see "No such file", the script hasn't been deployed yet.

### Step 4: Run the Verification Script
```bash
node backend/verifyStudentList.js
```

### Step 5: Wait for Results
The script will:
- Connect to MongoDB
- Check all 77 students from your CSV export
- Verify each student in Students collection
- Verify each student in Users collection
- Verify passwords match
- Display a detailed report

### Step 6: Review the Output

You'll see output like:
```
📋 Verifying 77 students from CSV export...
================================================================================
  1. Aaliyah Anam                    ✅ Student ✅ User ✅ Password Match
  2. Aaqib Dolani                    ✅ Student ✅ User ✅ Password Match
  ...
```

And at the end:
```
📊 SUMMARY:

Total Students in CSV:     77
Found in Students table:   XX (XX.X%)
Found in Users table:      XX (XX.X%)
Have Password:             XX (XX.X%)
Password Matches:          XX (XX.X%)
```

### Expected Results

- ✅ **If all students are found**: All 77 should show as ✅ Student ✅ User ✅ Password Match
- ⚠️ **If some are missing**: You'll see lists of missing students/users
- ❌ **If passwords don't match**: You'll see which passwords need to be regenerated

## Troubleshooting

### If you get "Cannot find module" error:
- Make sure you're in `/opt/render/project/src` (project root)
- Run `cd /opt/render/project/src` first
- Then run `node backend/verifyStudentList.js`

### If you get "MongoDB connection error":
- The script will show the error details
- Make sure `MONGODB_URI` environment variable is set in Render

### If script doesn't exist:
- The script needs to be deployed first
- Check if it's in your git repository
- Pull latest changes: `git pull` (if git is configured on Render)

## What to Do After Verification

### If All Students Found ✅
- Everything is working correctly!
- Passwords are set and match the exported CSV

### If Students Missing from Users Table ❌
- Those students cannot login
- You need to create User accounts for them
- Use the password generation feature to create accounts

### If Passwords Don't Match ❌
- Passwords may have been changed after export
- Regenerate passwords for those students
- Export again to get the new passwords

### If Students Missing from Students Table ❌
- Those students don't exist in the system
- You may need to add them first
- Or check if the email addresses are different

## Quick Copy-Paste Commands

```bash
# Navigate to project root
cd /opt/render/project/src

# Run verification script
node backend/verifyStudentList.js
```

That's it! The script will show you exactly which students exist and which passwords are working.

