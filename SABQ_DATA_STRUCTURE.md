# Sabq Data Structure from Approved Tickets

This document describes the complete structure of Sabq data as it flows from approved tickets to assignments.

## 1. Ticket Schema - `sabqEntries` Array

When a Sabq ticket is approved/submitted, it contains an array of `sabqEntries`:

```javascript
// Location: backend/server.js, lines 6172-6193
sabqEntries: [{
  id: String,                    // Unique identifier for this Sabq entry
  recitationRange: {
    surahNumber: Number,         // e.g., 40
    surahName: String,           // Arabic name, e.g., "غافر"
    juzNumber: Number,           // Optional, e.g., 24
    startAyahNumber: Number,     // e.g., 1
    startAyahText: String,       // Full Arabic text of start ayah
    endAyahNumber: Number,       // e.g., 7
    endAyahText: String          // Full Arabic text of end ayah
  },
  mistakes: [{                   // Array of TicketMistake objects
    id: String,
    type: String,                // 'madd', 'holding', 'memory', 'ikhfa', 'tech', 'other', 'letter', 'heavy_letter', 'no_rounding_lips', 'heavy_h', 'light_l', 'atkee'
    page: Number,
    surah: Number,
    ayah: Number,
    wordIndex: Number,           // Word position in ayah
    wordText: String,            // Arabic word text where mistake occurred
    position: {
      x: Number,
      y: Number
    },
    note: String,                // Optional note
    audioUrl: String,            // Optional audio recording
    timestamp: Date
  }],
  mistakeCount: Mixed,          // Number (1-20) or 'weak'
  atkees: Number,               // Numeric value 1-20 (replaces mistakeSeverity)
  tajweedIssues: [{
    type: String,                // 'heavy_letters', 'fatha_not_vertical', 'kasrah_not_horizontal', 'clarity_compromised', 'lack_of_confidence', 'incorrect_stops', 'ghunnah_error', 'qalqalah_error', 'idgham_error', 'madd_error', 'tajweed_rule_violation'
    surahName: String,           // Arabic surah name
    wordText: String,            // Arabic word text where error occurred
    note: String                 // Optional note
  }],
  adminComment: String          // Admin's comment for this specific entry
}]
```

## 2. Ticket Schema - `homeworkRange` (Optional)

The ticket also includes a `homeworkRange` for homework assignment:

```javascript
// Location: backend/server.js, lines 6194-6202
homeworkRange: {
  surahNumber: Number,
  surahName: String,            // Arabic name
  juzNumber: Number,
  startAyahNumber: Number,
  startAyahText: String,        // Full Arabic text
  endAyahNumber: Number,
  endAyahText: String            // Full Arabic text
}
```

## 3. Assignment Classwork - `classwork.sabq` Array

When the ticket is approved, each `sabqEntry` is converted to a `ClassworkPhase` entry in the assignment:

```javascript
// Location: backend/server.js, lines 7931-7952
{
  type: 'sabq',                 // Always 'sabq'
  assignmentRange: String,      // e.g., "Surah غافر, Ayah 1-7 (Juz 24)"
  details: String,              // Admin comment (stored in details field)
  surahNumber: Number,          // From recitationRange.surahNumber
  surahName: String,            // From recitationRange.surahName (Arabic)
  juzNumber: Number,            // From recitationRange.juzNumber
  fromAyah: Number,             // From recitationRange.startAyahNumber
  toAyah: Number,               // From recitationRange.endAyahNumber
  startAyahText: String,        // From recitationRange.startAyahText (Arabic)
  endAyahText: String,          // From recitationRange.endAyahText (Arabic)
  mistakesSummary: String,      // Generated summary, e.g., "Count: 5 | Atkees: 12 | Total Mistakes: 3"
  mistakeCount: Mixed,          // Number or 'weak' (from sabqEntry.mistakeCount)
  atkees: Number,              // 1-20 (from sabqEntry.atkees)
  mistakes: [{                  // Array of mistakes with wordText
    id: String,
    type: String,
    page: Number,
    surah: Number,
    ayah: Number,
    wordIndex: Number,
    position: {
      x: Number,
      y: Number
    },
    note: String,
    audioUrl: String,
    workflowStep: 'sabq',       // Always 'sabq'
    timestamp: Date,
    wordText: String            // Arabic word text (CRITICAL - must be included)
  }],
  tajweedIssues: [{             // Array of tajweed issues
    type: String,
    surahName: String,          // Arabic surah name
    wordText: String,            // Arabic word text
    note: String
  }],
  teacherReviewComment: String, // Admin comment (same as adminComment)
  adminComment: String,         // Admin comment for this entry
  fromTicketId: String,         // Ticket ID that created this entry
  sabqEntryId: String,          // ID of the specific sabqEntry within the ticket
  createdAt: Date               // When this entry was added to assignment
}
```

## 4. Data Flow: Ticket → Assignment

### Step 1: Admin Submits Sabq Ticket
**Endpoint:** `POST /api/tickets/:id/submit-sabq`
**Location:** `backend/server.js`, lines 8294-8451

**Request Body:**
```javascript
{
  sabqEntries: [/* Array of sabqEntry objects */],
  homeworkRange: {/* Optional homework range */},
  adminComment: "Overall admin comment"
}
```

### Step 2: Ticket is Updated
```javascript
ticket.sabqEntries = sabqEntries;
ticket.homeworkRange = homeworkRange;
ticket.adminComment = adminComment;
ticket.status = 'sent_to_assignment';
```

### Step 3: Assignment is Updated
**Function:** `updateAssignmentFromTicket(assignment, ticket)`
**Location:** `backend/server.js`, lines 7844-8123

For each `sabqEntry` in `ticket.sabqEntries`:
1. Creates a `classworkEntry` object
2. Maps all fields from `sabqEntry` to `classworkEntry`
3. Adds it to `assignment.classwork.sabq` array

### Step 4: Assignment is Saved
The assignment is saved with all Sabq entries in `classwork.sabq` array.

## 5. Example: Complete Data Structure

### Example Ticket (After Approval)
```javascript
{
  _id: "696ebf841fd1c17c8edbf156",
  type: "sabq",
  status: "sent_to_assignment",
  studentId: "691cf52526d55913bbd44cff",
  studentName: "Abdullah Memon",
  sabqEntries: [
    {
      id: "sabq-entry-1",
      recitationRange: {
        surahNumber: 40,
        surahName: "غافر",
        juzNumber: 24,
        startAyahNumber: 1,
        startAyahText: "حم تَنزِيلُ الْكِتَابِ مِنَ اللَّهِ الْعَزِيزِ الْعَلِيمِ",
        endAyahNumber: 7,
        endAyahText: "الَّذِينَ يَحْمِلُونَ الْعَرْشَ وَمَنْ حَوْلَهُ يُسَبِّحُونَ بِحَمْدِ رَبِّهِمْ"
      },
      mistakes: [
        {
          id: "mistake-1",
          type: "madd",
          page: 467,
          surah: 40,
          ayah: 3,
          wordIndex: 64385,
          wordText: "الْعَزِيزِ",
          position: { x: 100, y: 200 },
          note: "Madd not held long enough",
          timestamp: new Date()
        }
      ],
      mistakeCount: 5,
      atkees: 12,
      tajweedIssues: [
        {
          type: "heavy_letters",
          surahName: "غافر",
          wordText: "الْعَزِيزِ",
          note: "Heavy letter not pronounced correctly"
        }
      ],
      adminComment: "Good recitation, but needs work on madd"
    }
  ],
  homeworkRange: {
    surahNumber: 40,
    surahName: "غافر",
    startAyahNumber: 8,
    startAyahText: "رَبَّنَا وَسِعْتَ كُلَّ شَيْءٍ رَحْمَةً وَعِلْمًا",
    endAyahNumber: 10,
    endAyahText: "وَقُل رَّبِّ اغْفِرْ وَارْحَمْ وَأَنتَ خَيْرُ الرَّاحِمِينَ"
  },
  adminComment: "Overall comment for the ticket"
}
```

### Example Assignment Classwork Entry
```javascript
{
  classwork: {
    sabq: [
      {
        type: "sabq",
        assignmentRange: "Surah غافر, Ayah 1-7 (Juz 24)",
        details: "Good recitation, but needs work on madd",
        surahNumber: 40,
        surahName: "غافر",
        juzNumber: 24,
        fromAyah: 1,
        toAyah: 7,
        startAyahText: "حم تَنزِيلُ الْكِتَابِ مِنَ اللَّهِ الْعَزِيزِ الْعَلِيمِ",
        endAyahText: "الَّذِينَ يَحْمِلُونَ الْعَرْشَ وَمَنْ حَوْلَهُ يُسَبِّحُونَ بِحَمْدِ رَبِّهِمْ",
        mistakesSummary: "Count: 5 | Atkees: 12 | Total Mistakes: 1",
        mistakeCount: 5,
        atkees: 12,
        mistakes: [
          {
            id: "mistake-1",
            type: "madd",
            page: 467,
            surah: 40,
            ayah: 3,
            wordIndex: 64385,
            wordText: "الْعَزِيزِ",
            position: { x: 100, y: 200 },
            note: "Madd not held long enough",
            workflowStep: "sabq",
            timestamp: Date
          }
        ],
        tajweedIssues: [
          {
            type: "heavy_letters",
            surahName: "غافر",
            wordText: "الْعَزِيزِ",
            note: "Heavy letter not pronounced correctly"
          }
        ],
        teacherReviewComment: "Good recitation, but needs work on madd",
        adminComment: "Good recitation, but needs work on madd",
        fromTicketId: "696ebf841fd1c17c8edbf156",
        sabqEntryId: "sabq-entry-1",
        createdAt: Date
      },
      {
        // Homework entry (if homeworkRange is provided)
        type: "sabq",
        assignmentRange: "Homework: Surah غافر, Ayah 8-10",
        details: "Homework for next day",
        surahNumber: 40,
        surahName: "غافر",
        fromAyah: 8,
        toAyah: 10,
        startAyahText: "رَبَّنَا وَسِعْتَ كُلَّ شَيْءٍ رَحْمَةً وَعِلْمًا",
        endAyahText: "وَقُل رَّبِّ اغْفِرْ وَارْحَمْ وَأَنتَ خَيْرُ الرَّاحِمِينَ",
        fromTicketId: "696ebf841fd1c17c8edbf156-homework",
        createdAt: Date
      }
    ],
    sabqi: [],
    manzil: []
  }
}
```

## 6. Key Files

1. **Ticket Schema Definition:** `backend/server.js`, lines 6129-6250
2. **SabqEntry Schema:** `backend/server.js`, lines 6172-6193
3. **ClassworkPhase Schema:** `backend/server.js`, lines 5930-6004
4. **Update Function:** `backend/server.js`, lines 7844-8123 (`updateAssignmentFromTicket`)
5. **Submit Endpoint:** `backend/server.js`, lines 8294-8451 (`POST /api/tickets/:id/submit-sabq`)
6. **Sync Function:** `backend/server.js`, lines 8127-8291 (`syncAssignmentFromTickets`)

## 7. Important Notes

1. **Multiple Entries:** A single Sabq ticket can have multiple `sabqEntries`, each representing a different recitation session.

2. **Word Text:** The `wordText` field in mistakes is **critical** - it contains the exact Arabic word where the mistake occurred. This is used for display in the UI.

3. **Arabic Text:** All surah names and ayah text should be in Arabic. The `surahName`, `startAyahText`, and `endAyahText` fields must contain Arabic text, not numbers.

4. **Atkees vs Mistake Severity:** The old `mistakeSeverity` field has been replaced with `atkees` (numeric 1-20 only).

5. **Homework Range:** If `homeworkRange` is provided, it creates a separate entry in `classwork.sabq` with `assignmentRange` prefixed with "Homework:".

6. **Sync Function:** The `syncAssignmentFromTickets` function automatically populates missing detailed fields when assignments are fetched, ensuring data consistency.
