# Classwork Display Structure - Sample Examples

This document shows the expected structure and display format for Sabq, Sabqi, and Manzil classwork entries.

---

## 📋 Structure Overview

Each classwork entry displays in a **two-column card layout**:

**Left Column (Metadata):**
- Surah (Arabic name)
- Ayah Range
- Mistakes (Count, Atkees, Total Mistakes)
- Tajweed Issues
- Teacher Comment
- Date

**Right Column (Arabic Text):**
- Combined start/end ayah text
- "Start" and "End" labels positioned correctly

---

## 1️⃣ Sabq Entry Example

```
┌─────────────────────────────────────────────────────────────────┐
│  Surah: الأنفال                                                │
│  Ayah Range: 5-6                                                │
│  Mistakes: Count: 3 | Atkees: 4 | Total Mistakes: 1           │
│  Tajweed Issues: incorrect_stops, ghunnah_error                 │
│  Teacher Comment: NI                                             │
│  Date: 1/21/2026                                                │
│                                                                  │
│  [Arabic Text with Start/End labels]                            │
│  كَمَا أَخْرَجَكَ رَبُّكَ مِنْ بَيْتِكَ بِالْحَقِّ وَإِنَّ    │
│  Start                                                          │
│  فَرِيقًا مِنَ الْمُؤْمِنِينَ لَكَارِهُونَ                      │
│  End                                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Sample Data Structure:
```typescript
{
  type: 'sabq',
  assignmentRange: 'Surah الأنفال, Ayah 5-6',
  surahName: 'الأنفال',
  surahNumber: 8,
  fromAyah: 5,
  toAyah: 6,
  startAyahText: 'كَمَا أَخْرَجَكَ رَبُّكَ مِنْ بَيْتِكَ بِالْحَقِّ وَإِنَّ',
  endAyahText: 'فَرِيقًا مِنَ الْمُؤْمِنِينَ لَكَارِهُونَ',
  mistakeCount: 3,
  atkees: 4,
  mistakes: [
    {
      id: 'mistake-1',
      type: 'madd',
      page: 178,
      surah: 8,
      ayah: 5,
      wordIndex: 3,
      wordText: 'رَبُّكَ',
      note: 'Madd not held long enough'
    }
  ],
  tajweedIssues: [
    { type: 'incorrect_stops', note: 'Stopped at wrong place' },
    { type: 'ghunnah_error', note: 'Ghunnah not pronounced correctly' }
  ],
  teacherReviewComment: 'NI',
  createdAt: '2026-01-21T10:30:00Z'
}
```

---

## 2️⃣ Sabqi Entry Example

```
┌─────────────────────────────────────────────────────────────────┐
│  Surah: البقرة                                                  │
│  Ayah Range: 1-5                                                 │
│  Mistakes: Count: 2 | Atkees: 3 | Total Mistakes: 2            │
│  Tajweed Issues: heavy_letters, madd_error                      │
│  Teacher Comment: Good progress, focus on heavy letters         │
│  Date: 1/20/2026                                                │
│                                                                  │
│  [Arabic Text with Start/End labels]                            │
│  الم ذَلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ هُدًى لِلْمُتَّقِينَ    │
│  Start                                                          │
│  الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ وَيُقِيمُونَ الصَّلَاةَ      │
│  End                                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Sample Data Structure:
```typescript
{
  type: 'sabqi',
  assignmentRange: 'Surah البقرة, Ayah 1-5',
  surahName: 'البقرة',
  surahNumber: 2,
  fromAyah: 1,
  toAyah: 5,
  startAyahText: 'الم ذَلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ هُدًى لِلْمُتَّقِينَ',
  endAyahText: 'الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ وَيُقِيمُونَ الصَّلَاةَ',
  mistakeCount: 2,
  atkees: 3,
  mistakes: [
    {
      id: 'mistake-2',
      type: 'heavy_letter',
      page: 2,
      surah: 2,
      ayah: 1,
      wordIndex: 1,
      wordText: 'الم',
      note: 'Heavy letter not pronounced correctly'
    },
    {
      id: 'mistake-3',
      type: 'madd',
      page: 2,
      surah: 2,
      ayah: 3,
      wordIndex: 5,
      wordText: 'يُؤْمِنُونَ',
      note: 'Madd error'
    }
  ],
  tajweedIssues: [
    { type: 'heavy_letters', note: 'Focus on heavy letter pronunciation' },
    { type: 'madd_error', note: 'Madd duration needs improvement' }
  ],
  teacherReviewComment: 'Good progress, focus on heavy letters',
  createdAt: '2026-01-20T14:15:00Z'
}
```

---

## 3️⃣ Manzil Entry Example

```
┌─────────────────────────────────────────────────────────────────┐
│  Surah: الفاتحة                                                 │
│  Ayah Range: 1-7                                                │
│  Mistakes: Count: 1 | Atkees: 2 | Total Mistakes: 1            │
│  Tajweed Issues: clarity_compromised                            │
│  Teacher Comment: Excellent recitation, minor clarity issue     │
│  Date: 1/19/2026                                                │
│                                                                  │
│  [Arabic Text with Start/End labels]                            │
│  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ                        │
│  Start                                                          │
│  الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ                          │
│  الرَّحْمَٰنِ الرَّحِيمِ                                        │
│  مَالِكِ يَوْمِ الدِّينِ                                        │
│  إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ                      │
│  اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ                            │
│  صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ                        │
│  غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ              │
│  End                                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Sample Data Structure:
```typescript
{
  type: 'manzil',
  assignmentRange: 'Surah الفاتحة, Ayah 1-7',
  surahName: 'الفاتحة',
  surahNumber: 1,
  fromAyah: 1,
  toAyah: 7,
  startAyahText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  endAyahText: 'غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
  mistakeCount: 1,
  atkees: 2,
  mistakes: [
    {
      id: 'mistake-4',
      type: 'clarity',
      page: 1,
      surah: 1,
      ayah: 4,
      wordIndex: 2,
      wordText: 'نَعْبُدُ',
      note: 'Slight clarity issue'
    }
  ],
  tajweedIssues: [
    { type: 'clarity_compromised', note: 'Minor clarity issue in ayah 4' }
  ],
  teacherReviewComment: 'Excellent recitation, minor clarity issue',
  createdAt: '2026-01-19T09:00:00Z'
}
```

---

## 📊 Complete Example: Assignment with All Three Types

### Assignment Structure:
```typescript
{
  id: 'assignment-123',
  studentId: 'student-456',
  studentName: 'Ahmed Ali',
  status: 'active',
  classwork: {
    sabq: [
      {
        type: 'sabq',
        assignmentRange: 'Surah الأنفال, Ayah 5-6',
        surahName: 'الأنفال',
        surahNumber: 8,
        fromAyah: 5,
        toAyah: 6,
        startAyahText: 'كَمَا أَخْرَجَكَ رَبُّكَ مِنْ بَيْتِكَ بِالْحَقِّ وَإِنَّ',
        endAyahText: 'فَرِيقًا مِنَ الْمُؤْمِنِينَ لَكَارِهُونَ',
        mistakeCount: 3,
        atkees: 4,
        mistakes: [...],
        tajweedIssues: [
          { type: 'incorrect_stops', note: 'Stopped at wrong place' },
          { type: 'ghunnah_error', note: 'Ghunnah not pronounced correctly' }
        ],
        teacherReviewComment: 'NI',
        fromTicketId: 'ticket-789',
        createdAt: '2026-01-21T10:30:00Z'
      }
    ],
    sabqi: [
      {
        type: 'sabqi',
        assignmentRange: 'Surah البقرة, Ayah 1-5',
        surahName: 'البقرة',
        surahNumber: 2,
        fromAyah: 1,
        toAyah: 5,
        startAyahText: 'الم ذَلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ هُدًى لِلْمُتَّقِينَ',
        endAyahText: 'الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ وَيُقِيمُونَ الصَّلَاةَ',
        mistakeCount: 2,
        atkees: 3,
        mistakes: [...],
        tajweedIssues: [
          { type: 'heavy_letters', note: 'Focus on heavy letter pronunciation' },
          { type: 'madd_error', note: 'Madd duration needs improvement' }
        ],
        teacherReviewComment: 'Good progress, focus on heavy letters',
        fromTicketId: 'ticket-790',
        createdAt: '2026-01-20T14:15:00Z'
      }
    ],
    manzil: [
      {
        type: 'manzil',
        assignmentRange: 'Surah الفاتحة, Ayah 1-7',
        surahName: 'الفاتحة',
        surahNumber: 1,
        fromAyah: 1,
        toAyah: 7,
        startAyahText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        endAyahText: 'غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
        mistakeCount: 1,
        atkees: 2,
        mistakes: [...],
        tajweedIssues: [
          { type: 'clarity_compromised', note: 'Minor clarity issue in ayah 4' }
        ],
        teacherReviewComment: 'Excellent recitation, minor clarity issue',
        fromTicketId: 'ticket-791',
        createdAt: '2026-01-19T09:00:00Z'
      }
    ]
  }
}
```

---

## 🎨 Visual Display Format

### Card Layout (Two Columns):

```
┌──────────────────────────────────────────────────────────────┐
│  LEFT COLUMN (Metadata)        │  RIGHT COLUMN (Arabic Text) │
│                                │                             │
│  Surah: الأنفال               │  كَمَا أَخْرَجَكَ رَبُّكَ   │
│                                │  Start                      │
│  Ayah Range: 5-6               │                             │
│                                │  فَرِيقًا مِنَ الْمُؤْمِنِينَ│
│  Mistakes:                     │  End                        │
│  Count: 3 | Atkees: 4 |        │                             │
│  Total Mistakes: 1             │                             │
│                                │                             │
│  Tajweed Issues:               │                             │
│  incorrect_stops,              │                             │
│  ghunnah_error                 │                             │
│                                │                             │
│  Teacher Comment:              │                             │
│  NI                            │                             │
│                                │                             │
│  Date: 1/21/2026               │                             │
└──────────────────────────────────────────────────────────────┘
```

---

## ✅ Key Points

1. **All fields are displayed** in a consistent two-column layout
2. **Arabic text** is shown with proper RTL direction and Start/End labels
3. **Mistakes summary** shows Count, Atkees, and Total Mistakes
4. **Tajweed issues** are listed as comma-separated values
5. **Teacher comment** is displayed in italic
6. **Date** shows when the entry was created
7. **Color coding**: Purple for Sabq, Blue for Sabqi, Green for Manzil

---

## 📍 Where This Appears

This structure is used in:
- ✅ **Assignment History** (`StudentAssignmentHistory.tsx`)
- ✅ **Edit Assignment Page** (`EnhancedAssignmentForm.tsx`) - for read-only ticket-based entries
- ✅ **Student Portal** (`StudentAssignments.tsx`)
- ✅ **Ticket History** (when using "Use This Ticket" button)

All entries follow this exact same structure for consistency across the application.
