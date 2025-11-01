# 🧪 Local Testing Guide - Ticket Workflow System

## 🚀 Starting Servers

Both servers should now be running in the background:

### Backend Server
- **URL:** http://localhost:3001
- **API Health Check:** http://localhost:3001/api/health
- **MongoDB:** Uses `MONGODB_URI` environment variable or defaults to `mongodb://localhost:5175/umar-academy-portal`

### Frontend Server
- **URL:** http://localhost:5173 (or check terminal for actual port)
- **Opens automatically** in your browser

---

## 📋 Quick Test Steps

### 1. Open the Application
Go to: **http://localhost:5173** (or the port shown in terminal)

### 2. Login
- Use your admin credentials:
  - **Email:** `sadmin@umaracademy.org`
  - **Password:** `password123`
  - **Role:** Super Admin

### 3. Test Ticket Workflow

#### As Admin:
1. Click **"➕ Assign New Ticket"** button (top right)
2. Fill the form:
   - Select a student
   - Choose workflow step: **"📖 Sabq"**
   - Select a teacher
   - Choose program
3. Click **"Assign Ticket"**

#### As Teacher:
1. Logout and login as teacher:
   - **Email:** `teacher@umaracademy.com`
   - **Password:** `password123`
   - **Role:** Teacher
2. Click **"🎫 My Tickets"** button
3. Click **"Start"** on the assigned ticket
4. Fill in:
   - Progress notes
   - (Optional) Audio link
5. Click **"Submit for Review"**

#### Back as Admin:
1. Login as admin again
2. Click **"🎫 Manage Tickets"**
3. You should see the pending ticket
4. Click **"Review"**
5. Review the submission
6. Click **"Approve"**
7. Click **"Assign to Next Teacher"** → Select teacher → Creates next step (Sabqi)
8. Continue the chain...
9. When on "Finalize" step, click **"Finalize"** to add report and homework

---

## 🔍 What to Look For

### Ticket Status Colors:
- 🔵 **Blue** - Assigned
- 🟡 **Yellow** - In Progress
- 🟣 **Purple** - Pending Review
- 🟢 **Green** - Approved
- 🔴 **Red** - Needs Revision
- 🔵 **Blue** - Finalized
- ⚫ **Gray** - Completed

### Features to Test:
✅ Create ticket  
✅ Teacher fills ticket  
✅ Submit for review  
✅ Admin reviews  
✅ Approve/Reject  
✅ Assign to next teacher  
✅ Chain linking (Sabq → Sabqi → Manzil → Finalize)  
✅ Finalize with homework  
✅ Assignment appears on student page  

---

## 🐛 Troubleshooting

### Backend Not Starting?
```bash
cd backend
npm install
npm start
```

### Frontend Not Starting?
```bash
npm install
npm run dev
```

### MongoDB Connection Issues?
- Check if MongoDB is running locally
- Or set `MONGODB_URI` environment variable
- Default: `mongodb://localhost:5175/umar-academy-portal`

### No Data?
Run the seed script:
```bash
cd backend
npm run seed
```

---

## 📊 Expected URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001/api
- **Health Check:** http://localhost:3001/api/health
- **Tickets API:** http://localhost:3001/api/tickets

---

## ✨ Enjoy Testing!

Everything should be working locally now. Let me know if you see any issues! 🎉

