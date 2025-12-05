# AI Phrase Library - User Guide

## 📚 Overview

The AI Phrase Library is a smart suggestion system that helps teachers write consistent, professional evaluations and reports. As you type, it suggests relevant phrases from a curated library.

---

## 🎯 Quick Start

### Step 1: Initialize Categories (Super Admin Only)

1. Log in as **Super Admin**
2. Go to `/super-admin/ai-library` or click "AI Phrase Library" from the dashboard
3. Click the **"Init"** button to create default categories:
   - Progress Report
   - Evaluation
   - Attendance
   - General
   - Tajweed
   - Memory
   - Mistakes

### Step 2: Add Phrases

**Super Admin & Admin:**
- Navigate to the AI Library page
- Select a category
- Click **"+ Add Phrase"**
- Type your phrase and select the category
- Click **"Create"**

**Example phrases:**
- "Excellent pronunciation of Arabic letters"
- "Needs practice with madd (elongation) rules"
- "Memorized 2 pages this week with good retention"
- "Student showed improvement in fixing common mistakes"

### Step 3: Use in Forms

The AI suggestions appear automatically when you type in:
- **Weekly Evaluation Form** (Tajweed, Memory, Mistakes sections)
- Any text field that uses `AiSuggestionsInput`

---

## 👥 Role-Based Usage

### 🔴 Super Admin

**Access:** `/super-admin/ai-library`

**Capabilities:**
- ✅ Create new categories
- ✅ Edit/delete categories (except system categories)
- ✅ Add unlimited phrases to any category
- ✅ Edit/delete any phrase
- ✅ Initialize default categories
- ✅ View usage statistics

**How to:**
1. **Create Category:**
   - Click **"+ Add"** next to Categories
   - Enter category name (e.g., `progress_report`)
   - Enter display name (e.g., `Progress Report`)
   - Add description (optional)
   - Click **"Create"**

2. **Add Phrase:**
   - Select a category from the sidebar
   - Click **"+ Add Phrase"**
   - Type your phrase
   - Select category (if different)
   - Click **"Create"**

3. **Edit/Delete:**
   - Click **"Edit"** on any phrase to modify
   - Click **"Delete"** to remove (soft delete)

### 🟡 Admin

**Access:** `/admin/ai-library`

**Capabilities:**
- ✅ Add phrases to existing categories
- ✅ Edit/delete phrases they create
- ❌ Cannot create new categories
- ❌ Cannot delete categories

**How to:**
1. Navigate to `/admin/ai-library`
2. Select a category from the sidebar
3. Click **"+ Add Phrase"**
4. Type your phrase and select category
5. Click **"Create"**

### 🟢 Teacher / Staff

**Capabilities:**
- ✅ Receive AI suggestions while typing
- ✅ Click suggestions to insert them
- ❌ Cannot manage the library

**How to Use Suggestions:**

1. **In Weekly Evaluation Form:**
   - Start typing in any text field (Tajweed, Memory, Mistakes, General Notes)
   - Suggestions appear automatically in a dropdown
   - Click a suggestion to insert it
   - Or use keyboard:
     - **Arrow Up/Down**: Navigate suggestions
     - **Enter**: Select highlighted suggestion
     - **Escape**: Close suggestions

2. **Example:**
   ```
   Type: "excellent"
   ↓
   Suggestions appear:
   - "Excellent pronunciation of Arabic letters"
   - "Excellent application of tajweed rules"
   - "Excellent retention of memorized pages"
   ↓
   Click or press Enter to insert
   ```

---

## 📝 Using in Weekly Evaluation Form

The AI suggestions are already integrated! Just start typing:

### Tajweed Section
- **Category:** `tajweed`
- **Fields:** Strengths, Areas for Improvement, Specific Notes
- **Example:** Type "pronunciation" → See tajweed-related suggestions

### Memory Section
- **Category:** `memory`
- **Fields:** Memorized Pages, Retention Quality, Specific Notes
- **Example:** Type "memorized" → See memory-related suggestions

### Mistakes Section
- **Category:** `mistakes`
- **Fields:** How Mistakes Were Fixed, Improvement
- **Example:** Type "fixed" → See mistake-related suggestions

### General Notes
- **Category:** `evaluation`
- **Field:** General Notes
- **Example:** Type "progress" → See evaluation-related suggestions

---

## 💡 Best Practices

### For Super Admins & Admins:

1. **Organize by Category:**
   - Keep phrases relevant to their category
   - Use clear, professional language

2. **Common Phrases First:**
   - Add frequently used phrases
   - The system tracks usage and prioritizes popular phrases

3. **Be Specific:**
   - Instead of "Good work", use "Excellent pronunciation of Arabic letters"
   - Instead of "Needs improvement", use "Needs practice with madd (elongation) rules"

4. **Regular Updates:**
   - Add new phrases based on common patterns
   - Remove outdated phrases

### For Teachers:

1. **Start Typing:**
   - Don't wait for suggestions - just start typing
   - Suggestions appear after 300ms

2. **Use Keyboard Navigation:**
   - Faster than clicking
   - Arrow keys to navigate, Enter to select

3. **Combine Suggestions:**
   - You can use multiple suggestions
   - Edit them after inserting

4. **Customize:**
   - Suggestions are starting points
   - Feel free to modify them for specific students

---

## 🔍 Features

### Fuzzy Matching
- Type partial words → System finds matching phrases
- Example: Type "taj" → Finds "tajweed" phrases

### Usage Tracking
- System tracks which phrases are used most
- Popular phrases appear first in suggestions

### Category-Based
- Each field uses the appropriate category
- Ensures relevant suggestions

### Real-Time Suggestions
- Appears as you type (300ms debounce)
- No need to click buttons

---

## 🛠️ Troubleshooting

### No Suggestions Appearing?

1. **Check Category:**
   - Make sure phrases exist in the category
   - Visit `/super-admin/ai-library` to verify

2. **Check Network:**
   - Ensure you're connected to the backend
   - Check browser console for errors

3. **Initialize Categories:**
   - Super Admin should click "Init" button
   - This creates default categories

### Suggestions Not Relevant?

1. **Add More Phrases:**
   - Super Admin/Admin can add phrases
   - More phrases = better suggestions

2. **Check Category:**
   - Ensure phrases are in the correct category
   - Each field uses a specific category

### Can't Create Category?

- **Admin:** Cannot create categories (Super Admin only)
- **Super Admin:** Make sure category name is unique
- System categories cannot be deleted

---

## 📊 Usage Statistics

- Phrases show usage count (e.g., "Used 15 times")
- Most-used phrases appear first in suggestions
- Helps identify popular phrases

---

## 🎓 Example Workflow

### Scenario: Teacher Writing Weekly Evaluation

1. **Open Weekly Evaluation Form**
   - Navigate to student profile
   - Click "Add Evaluation"

2. **Tajweed Section:**
   - Type "excellent" in Strengths field
   - See suggestions: "Excellent pronunciation of Arabic letters"
   - Click to insert

3. **Memory Section:**
   - Type "memorized" in Memorized Pages
   - See suggestions: "Memorized 2 pages this week"
   - Press Enter to select

4. **Mistakes Section:**
   - Type "fixed" in How Fixed
   - See suggestions: "Fixed through repeated practice"
   - Click to insert

5. **General Notes:**
   - Type "overall"
   - See suggestions: "Overall good progress this week"
   - Select and customize

---

## 🔗 Related Features

- **Mistake Library:** Separate library for common mistakes and fixes
- **AI Summarize:** Button to summarize entire evaluation
- **Get Suggestions:** Button for predefined suggestions (different from AI Library)

---

## 📞 Support

If you encounter issues:
1. Check this guide
2. Verify your role permissions
3. Contact Super Admin for library management
4. Check browser console for errors

---

## 🚀 Next Steps

1. **Super Admin:** Initialize categories and add initial phrases
2. **Admin:** Add phrases to existing categories
3. **Teachers:** Start using suggestions in evaluation forms
4. **Everyone:** Build the library over time with common phrases

Happy typing! 🎉

