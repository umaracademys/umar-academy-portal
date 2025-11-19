# 📝 How to Add Students to Umar Academy Portal

## 🎯 Quick Guide

There are **two ways** to add students to the portal:

---

## Method 1: From the Students Page (`/students`)

### Steps:
1. **Navigate to Students Page**
   - Click **"Students"** in the sidebar
   - Or go directly to `/students` URL

2. **Click "Add Student" Button**
   - Look for the **"+ Add Student"** button at the top of the left sidebar
   - Click it to open the registration form

3. **Fill in Student Information**
   - **Full Name** (required)
   - **Parent/Guardian Name** (required)
   - **Email** (required) - This will be used for login
   - **Contact** (phone number)
   - **Program** - Select from:
     - Full Time HQ
     - Part Time HQ
     - After School Reading
   - **Tuition Fee** (default: $500)
   - **Registration Amount** (default: $100)
   - **Assigned Teacher** (optional - select from dropdown)
   - **Schedule**:
     - Days (Monday, Tuesday, etc.)
     - Start Time (e.g., 09:00)
     - End Time (e.g., 12:00)
   - **Siblings** (optional - add if student has siblings enrolled)

4. **Click "Register Student"**
   - The form will create:
     - A **User account** (for login)
     - A **Student profile** (with all details)
   - Default password: `password123` (student should change this on first login)

5. **Success!**
   - Student will appear in the students list
   - They can now log in with their email and default password

---

## Method 2: From the Super Admin Dashboard (`/dashboard`)

### Steps:
1. **Navigate to Dashboard**
   - Go to `/dashboard` (or click "Overview" in sidebar)

2. **Go to Students Section**
   - Click **"Students"** in the sidebar (or use the "Manage Students" quick action card)
   - This will show the Students section within the dashboard

3. **Click "Add Student"**
   - In the Students section, look for the **"Add Student"** button
   - Or use the **"Add Student"** quick action card from the Overview section

4. **Fill in the Form**
   - Same form as Method 1
   - Fill in all required fields

5. **Register Student**
   - Click **"Register Student"**
   - Student will be created and appear in the list

---

## 📋 Required Information

### Minimum Required Fields:
- ✅ **Full Name** - Student's full name
- ✅ **Parent/Guardian Name** - Parent or guardian's name
- ✅ **Email** - Unique email address (used for login)
- ✅ **Contact** - Phone number

### Optional Fields:
- Program (defaults to "Full Time HQ")
- Tuition Fee (defaults to $500)
- Registration Amount (defaults to $100)
- Assigned Teacher
- Schedule (days and times)
- Siblings

---

## 🔐 Default Login Credentials

When a student is added:
- **Email**: The email you entered
- **Password**: `password123` (default)
- **Role**: Automatically set to "student"

**Important**: Students should change their password after first login!

---

## ✏️ Editing Students

To edit an existing student:
1. Go to **Students** page (`/students`)
2. Click on a student from the list
3. View their details in the right panel
4. To edit, go back to the **Dashboard** → **Students** section
5. Click on the student → Click **"Edit"** button
6. Make changes and save

---

## 🗑️ Deleting Students

To delete a student:
1. Go to **Dashboard** → **Students** section
2. Find the student in the list
3. Click **"Delete"** button
4. Confirm deletion

**Warning**: This will also delete the associated user account!

---

## 💡 Tips

- **Email must be unique** - Each student needs a unique email address
- **Assign Teachers** - You can assign students to teachers during registration or later
- **Siblings** - If a student has siblings, add them in the "Siblings" section
- **Schedule** - Set up the student's class schedule during registration
- **Bulk Import** - For adding multiple students, use the bulk operations feature (coming soon)

---

## ❓ Troubleshooting

### "Failed to create user" error
- Check if the email already exists
- Ensure you're logged in as Super Admin or Admin
- Check backend server is running

### Student not appearing in list
- Refresh the page
- Check if student was created successfully (check browser console)
- Verify you're looking at the correct program filter

### Can't assign teacher
- Make sure teachers exist in the system first
- Go to **Teachers** section and add teachers if needed

---

## 📞 Need Help?

If you encounter any issues:
1. Check the browser console for errors
2. Verify backend server is running on port 3001
3. Ensure you're logged in with proper permissions (Super Admin or Admin)

