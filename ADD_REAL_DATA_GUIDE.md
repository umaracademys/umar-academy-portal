# 📝 Guide: Adding Real Data to Umar Academy Portal

## 🗑️ Step 1: Clear Demo Data

First, remove all demo data from the database:

```bash
cd backend
npm run clear
```

This will:
- ✅ Delete all demo users (except Super Admin)
- ✅ Delete all students
- ✅ Delete all teachers
- ✅ Delete all assignments
- ✅ Delete all tickets
- ✅ Delete all notifications
- ✅ Keep Super Admin login (so you can still access the portal)

---

## 📋 Step 2: Add Real Data Through the Portal

### Login as Super Admin:
- **Email:** `sadmin@umaracademy.org`
- **Password:** Your existing password (or `password123` if not changed)

### Add Real Students:
1. Go to **Students** section
2. Click **"Register New Student"**
3. Fill in real student information:
   - Full Name
   - Email
   - Contact
   - Program (Full Time HQ, Part Time HQ, After School Reading)
   - Level
   - Assign to Teacher (if available)
   - Parent/Guardian info
   - Payment information
4. Click **"Register Student"**

### Add Real Teachers:
1. Go to **Teachers** section
2. Click **"Register New Teacher"**
3. Fill in real teacher information:
   - Full Name
   - Email
   - Contact
   - Department
   - Specialization
   - Employment Type
   - Schedule
   - Salary information
4. Click **"Register Teacher"**

### Add Real Admins:
1. Go to **Admins** section
2. Click **"Register New Admin"**
3. Fill in real admin information:
   - Full Name
   - Email
   - Contact
   - Permissions
4. Click **"Register Admin"**

---

## 🔄 Step 3: Assign Students to Teachers

After creating students and teachers:
1. Go to **Students** section
2. Click **"View"** on a student
3. In student profile, assign them to a teacher
4. Or use bulk operations to assign multiple students

---

## ✅ Step 4: Verify Data

1. Check **Students** list - should show your real students
2. Check **Teachers** list - should show your real teachers
3. Check **Admins** list - should show your real admins
4. Login as a teacher - should see assigned students
5. Login as a student - should see their profile

---

## 🎫 Step 5: Test Ticket Workflow

1. As Super Admin, click **"➕ Assign New Ticket"**
2. Select a real student
3. Select workflow step (Sabq/Sabqi/Manzil)
4. Assign to a real teacher
5. Login as that teacher
6. Click **"🎫 My Tickets"** - should see the ticket
7. Fill it out and submit

---

## 📊 All Data is Saved to MongoDB

- All data you add through the portal is automatically saved
- No need to run any scripts
- Everything is stored in MongoDB Atlas
- Data persists across sessions

---

## 🚨 Important Notes

1. **Don't delete Super Admin** - This is your main login account
2. **Email must be unique** - Each user needs a unique email
3. **Programs available:**
   - Full Time HQ
   - Part Time HQ
   - After School Reading
4. **Real passwords:** Set secure passwords for real users (change from default)
5. **Teacher-Student assignment:** Make sure to assign students to teachers after creating them

---

## 🔐 Security Tips

For production:
- Change Super Admin password from default
- Use strong, unique passwords for all users
- Enable 2FA when available
- Regularly audit user access

---

## 📝 Quick Reference

**Clear Demo Data:**
```bash
cd backend
npm run clear
```

**Login Credentials:**
- Super Admin: `sadmin@umaracademy.org` / (your password)

**Add Data:**
- Use the portal UI - it's all saved automatically!

---

Your portal is now ready for real data! 🎉

