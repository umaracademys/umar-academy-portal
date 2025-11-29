# 📝 Teacher Evaluation System - User Guide

## 🎯 Overview

The Teacher Evaluation System allows Super Admins and Admins to create evaluation forms for teachers, assign them to specific teachers, and track their completion. Teachers can complete evaluations with various question types including text, multiple choice (MCQ), audio, video, and file uploads.

---

## 👥 User Roles & Access

### **Super Admin** 👑
- ✅ Create, edit, and delete evaluations
- ✅ Assign evaluations to teachers
- ✅ View all evaluation results
- ✅ Filter and analyze results

### **Admin** 🛡️
- ✅ Create, edit evaluations
- ✅ Assign evaluations to teachers
- ✅ View all evaluation results
- ✅ Filter and analyze results

### **Teacher** 👨‍🏫
- ✅ View assigned evaluations
- ✅ Complete evaluations
- ✅ View own evaluation history
- ❌ Cannot create or assign evaluations

---

## 🚀 Getting Started

### **Step 1: Access the Evaluation System**

#### **For Super Admin/Admin:**
1. Login to the portal
2. Go to your dashboard (Super Admin Dashboard or Admin Dashboard)
3. Look for the **"Teacher Evaluations"** quick action button
4. Click it to open the Evaluation Management interface

#### **For Teachers:**
1. Login to the portal
2. Go to Teacher Dashboard
3. Look for **"My Evaluations"** in the Quick Actions section
4. Click it to see your assigned evaluations

---

## 📋 Creating an Evaluation (Super Admin/Admin)

### **Step 1: Open Evaluation Management**
- Click **"Teacher Evaluations"** button on your dashboard
- Click **"+ Create Evaluation"** button

### **Step 2: Fill Basic Information**
- **Title** (Required): Give your evaluation a name (e.g., "Q4 2024 Teacher Performance Review")
- **Description**: Optional description of what this evaluation covers
- **Start Date**: When the evaluation period begins
- **End Date**: When the evaluation period ends
- **Auto-Save**: Enable automatic saving of progress (recommended)

### **Step 3: Add Questions**
Click **"+ Add Question"** for each question you want to include:

#### **Question Types:**

1. **Text Question**
   - Teacher types a free-form answer
   - Use for: Open-ended feedback, comments, explanations

2. **Multiple Choice (MCQ)**
   - Teacher selects one option from a list
   - **Important**: You must set the correct answer
   - Teacher cannot proceed to next question until they select the correct answer
   - Use for: Knowledge checks, skill assessments
   - **Setup**:
     - Enter options (one per line)
     - Enter the correct answer (must match one of the options exactly)

3. **Audio Question**
   - Teacher records or uploads audio
   - You can provide a media URL for them to listen to
   - Use for: Pronunciation tests, recitation evaluations

4. **Video Question**
   - Teacher records or uploads video
   - You can provide a media URL for them to watch
   - Use for: Teaching demonstrations, presentation skills

5. **File Upload Question**
   - Teacher uploads any file type
   - Use for: Document submissions, portfolio items

#### **Question Settings:**
- **Question Text**: The actual question
- **Instructions**: Additional guidance (optional)
- **Required**: Check if this question must be answered
- **Order**: Automatically set based on when you add questions

### **Step 4: Save Evaluation**
- Click **"Save Evaluation"** when done
- Status will be set to "draft" by default
- Change status to "active" when ready to assign

---

## 👤 Assigning Evaluations to Teachers

### **Step 1: Select Evaluation**
- In Evaluation Management, find the evaluation you want to assign
- Click **"Assign"** button (or use the assignment feature)

### **Step 2: Select Teachers**
- Choose one or more teachers from the list
- Set a **Due Date** (optional but recommended)
- Click **"Assign"**

### **Step 3: Teachers Receive Assignment**
- Teachers will see the evaluation in their **"My Evaluations"** section
- Status will show as "assigned"

---

## ✅ Completing an Evaluation (Teacher)

### **Step 1: View Assigned Evaluations**
- Go to Teacher Dashboard
- Click **"My Evaluations"** in Quick Actions
- You'll see all your assigned evaluations with:
  - Status (assigned, in progress, completed)
  - Progress percentage
  - Due date (if set)

### **Step 2: Start Evaluation**
- Click **"Start"** or **"Continue"** on an evaluation
- Review the evaluation title and description
- Click **"Start Evaluation"** to begin

### **Step 3: Answer Questions**

#### **For Text Questions:**
- Type your answer in the text box
- Answer is auto-saved after 2 seconds of inactivity (if auto-save enabled)

#### **For MCQ Questions:**
- Select one option by clicking the radio button
- **Important**: You must select the correct answer to proceed
- If incorrect, you'll see an error message
- Keep trying until you select the correct answer
- Once correct, you can proceed to the next question

#### **For Audio/Video Questions:**
- If a media file is provided, use the player to listen/watch
- Click "Choose File" to upload your recording
- Preview your upload before proceeding

#### **For File Upload Questions:**
- Click "Choose File" to select a file
- Supported: Any file type
- File will be uploaded (Cloudinary integration pending)

### **Step 4: Navigate Questions**
- Use **"← Previous"** to go back
- Use **"Save & Next"** to save and move forward
- Progress bar shows completion percentage
- Question indicators show:
  - 🔵 Blue: Current question
  - 🟢 Green: Completed questions
  - ⚪ Gray: Not yet answered

### **Step 5: Complete Evaluation**
- Answer all required questions
- Click **"Complete Evaluation"** on the last question
- Status changes to "completed"
- You can no longer edit answers

---

## 📊 Viewing Results (Super Admin/Admin)

### **Step 1: Access Results**
- Click **"Evaluation Results"** button on your dashboard
- You'll see a list of all completed and in-progress evaluations

### **Step 2: Filter Results**
Use the filter options:
- **Status**: Filter by completed, in progress, assigned, overdue
- **Evaluation ID**: Filter by specific evaluation
- **Teacher ID**: Filter by specific teacher

### **Step 3: View Detailed Results**
- Click on any result to see:
  - Teacher name
  - Evaluation title
  - Completion status
  - Progress percentage
  - All answers with timestamps
  - MCQ correctness indicators (✅ Correct / ❌ Incorrect)
  - Media uploads (if any)

### **Step 4: Analyze Performance**
- View completion rates
- Check MCQ accuracy
- Review text responses
- Download or export results (feature pending)

---

## 🔑 Key Features

### **1. MCQ Validation**
- Teachers must answer MCQ questions correctly before proceeding
- Prevents guessing and ensures understanding
- Shows immediate feedback (correct/incorrect)

### **2. Auto-Save**
- Automatically saves progress every 2 seconds
- Prevents data loss if browser closes
- Shows "Saving..." indicator when active

### **3. Progress Tracking**
- Visual progress bar (0-100%)
- Question-by-question indicators
- Completion status tracking

### **4. Question Navigation**
- Can navigate back to previous questions
- Can only proceed forward if MCQ is correct
- Visual indicators show answered/unanswered questions

### **5. Media Support**
- Audio player for audio questions
- Video player for video questions
- File upload support (Cloudinary integration pending)

---

## 📱 Responsive Design

The evaluation system works on:
- 💻 Desktop computers
- 📱 Tablets
- 📱 Mobile phones

All interfaces are fully responsive and touch-friendly.

---

## ⚠️ Important Notes

### **For Admins/Super Admins:**
- Evaluations in "draft" status can be edited
- Active evaluations can be assigned but editing is limited
- Archived evaluations are read-only
- Cannot delete evaluations with existing assignments

### **For Teachers:**
- Once completed, evaluations cannot be edited
- MCQ questions require correct answers to proceed
- Auto-save works in the background (don't worry about losing progress)
- Due dates are shown but not enforced (feature pending)

### **MCQ Questions:**
- Correct answer must match exactly (case-sensitive)
- Options should be clear and distinct
- Consider using simple, unambiguous answers

---

## 🐛 Troubleshooting

### **"Cannot proceed to next question"**
- Check if MCQ question has correct answer selected
- Ensure you've selected the exact correct answer (case-sensitive)

### **"Evaluation not found"**
- Refresh the page
- Check if evaluation was deleted or archived
- Contact admin if issue persists

### **"Auto-save not working"**
- Check browser console for errors
- Ensure evaluation has auto-save enabled
- Try manually clicking "Save & Next"

### **"Media upload failed"**
- Cloudinary integration is pending
- Currently using local file URLs (temporary)
- Contact admin for media upload support

---

## 🎯 Best Practices

### **Creating Evaluations:**
1. Start with a clear title and description
2. Use a mix of question types for comprehensive assessment
3. Set realistic due dates
4. Test MCQ questions yourself before assigning
5. Enable auto-save for better user experience

### **For MCQ Questions:**
1. Keep options concise and clear
2. Avoid ambiguous answers
3. Use consistent formatting (all caps or all lowercase)
4. Test the correct answer matches exactly

### **For Teachers:**
1. Complete evaluations before due date
2. Read questions carefully before answering
3. For MCQ, think through options before selecting
4. Save progress frequently (auto-save helps)

---

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Review the troubleshooting section
3. Contact your system administrator
4. Check browser console for error messages

---

## 🚀 Future Enhancements

Coming soon:
- ✅ Cloudinary integration for media uploads
- ✅ PDF export of results
- ✅ Email notifications for assignments
- ✅ Due date enforcement
- ✅ Evaluation templates
- ✅ Bulk assignment
- ✅ Analytics dashboard

---

**Last Updated:** November 2024  
**Version:** 1.0.0


