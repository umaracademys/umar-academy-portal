# 📋 Parent Registration Form - Guide

## Overview
A public registration form that parents can fill out to register their children. When submitted, it creates a notification in your admin portal.

---

## 🔗 Public Registration Link

**URL:** `http://localhost:5173/register`

This link can be shared with parents - **no login required!**

---

## ✨ Features

### For Parents:
- ✅ Public access (no login needed)
- ✅ Comprehensive form with all student and parent information
- ✅ Program selection (Full Time HQ, Part Time HQ, After School Reading)
- ✅ Previous education tracking
- ✅ Emergency contact information
- ✅ Special needs/accommodations field
- ✅ Terms and conditions agreement
- ✅ Success confirmation message

### For Admin/SuperAdmin:
- ✅ **Automatic notification** when form is submitted
- ✅ Notification appears in **Notification Center** (bell icon)
- ✅ High priority notification (marked as important)
- ✅ Click notification to navigate to Students page
- ✅ Full registration data stored in notification

---

## 📝 Form Fields

### Student Information
- Full Name * (required)
- Date of Birth * (required)
- Gender * (required)
- Current Grade/Level

### Parent/Guardian Information
- Parent/Guardian Full Name * (required)
- Email Address * (required)
- Phone Number * (required)
- Relationship to Student
- Alternate Contact

### Program Selection
- Preferred Program * (required)
- Preferred Schedule
- Previous Quran Education (checkbox)
- Previous Education Details (if applicable)

### Address Information
- Street Address
- City
- State/Province
- Zip/Postal Code
- Country

### Emergency Contact
- Emergency Contact Name
- Emergency Contact Phone

### Additional Information
- Special Needs or Accommodations
- Additional Notes or Comments

### Agreement
- Terms and Conditions * (required)
- Data Collection Consent * (required)

---

## 🔔 Notification System

### When a parent submits the form:
1. **Notification is created** in the database
2. **High priority** notification appears in admin portal
3. **Notification shows:**
   - Title: "New Student Registration Request"
   - Message: "{Parent Name} submitted a registration request for {Student Name}. Program: {Program}"
   - Icon: 📋
   - Priority: High
   - Full registration data stored

### How to view notifications:
1. Log in as Admin or SuperAdmin
2. Click the **bell icon** (🔔) in the header
3. See all registration requests
4. Click on a notification to go to Students page
5. Mark as read when reviewed

---

## 🛠️ Technical Details

### API Endpoint
- **URL:** `POST /api/public/student-registration`
- **Auth:** None required (public endpoint)
- **Response:** Success message with notification ID

### Notification Type
- Type: `student_registration_request`
- Priority: `high`
- Data: Full registration form data stored in `registrationData` field

### Route
- **Path:** `/register`
- **Component:** `ParentRegistrationForm`
- **Access:** Public (no authentication required)

---

## 📤 Sharing the Form

### Option 1: Direct Link
Share this link with parents:
```
http://localhost:5173/register
```

### Option 2: Embed in Website
You can embed this form in your website or share the link via:
- Email
- WhatsApp
- Social media
- Website footer
- QR code

### Option 3: Custom Domain
If you have a custom domain, the link would be:
```
https://yourdomain.com/register
```

---

## 🔍 Viewing Registration Requests

1. **In Notification Center:**
   - Click bell icon in admin dashboard
   - Filter by "High Priority" to see registration requests
   - Click notification to navigate to Students page

2. **In Students Page:**
   - Navigate to `/students`
   - Registration requests can be reviewed and converted to student records

---

## ✅ Next Steps (Future Enhancement)

You may want to:
1. Create a "Registration Requests" section in Students page
2. Add ability to approve/reject registration requests
3. Auto-create student record from approved registration
4. Send email confirmation to parents
5. Add registration request details modal

---

## 🎯 Current Status

✅ Public registration form created
✅ API endpoint working
✅ Notification system integrated
✅ Route added to app
✅ Notification appears in admin portal
✅ Click notification navigates to Students page

**Ready to use!** Share the link: `http://localhost:5173/register`

