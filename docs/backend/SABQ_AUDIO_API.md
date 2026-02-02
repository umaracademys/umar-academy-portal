# Sabq Audio API Documentation

Complete API documentation for Sabq audio handling pipeline.

## Endpoints

### POST /api/audio/sabq/upload

Upload audio clip for a Sabq recitation mistake.

**Authentication:** Required (Admin or Teacher only)

**Content-Type:** `multipart/form-data`

**Request Fields:**
- `audio` (file, required): Audio file (MP3 or WAV, max 10MB)
- `studentId` (string, required): Student ID
- `ticketId` (string, required): Sabq ticket ID
- `sabqEntryId` (string, required): ID of the specific sabqEntry within the ticket
- `surahNumber` (number, required): Surah number
- `ayahNumber` (number, required): Ayah number
- `wordText` (string, required): Arabic word text where mistake occurred
- `mistakeId` (string, optional): ID of the specific mistake (if audio is for a mistake)

**Example Request (using curl):**
```bash
curl -X POST http://localhost:3001/api/audio/sabq/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audio=@mistake-audio.mp3" \
  -F "studentId=691cf52526d55913bbd44cff" \
  -F "ticketId=696ebf841fd1c17c8edbf156" \
  -F "sabqEntryId=sabq-entry-1" \
  -F "surahNumber=40" \
  -F "ayahNumber=7" \
  -F "wordText=الْعَزِيزِ" \
  -F "mistakeId=mistake-1"
```

**Example Request (using JavaScript/Fetch):**
```javascript
const formData = new FormData();
formData.append('audio', audioFile); // File object
formData.append('studentId', '691cf52526d55913bbd44cff');
formData.append('ticketId', '696ebf841fd1c17c8edbf156');
formData.append('sabqEntryId', 'sabq-entry-1');
formData.append('surahNumber', '40');
formData.append('ayahNumber', '7');
formData.append('wordText', 'الْعَزِيزِ'); // Arabic text
formData.append('mistakeId', 'mistake-1');

const response = await fetch('http://localhost:3001/api/audio/sabq/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
```

**Success Response (200):**
```json
{
  "audioUrl": "/uploads/sabq-audio/sabq-691cf52526d55913bbd44cff-696ebf841fd1c17c8edbf156-sabq-entry-1-1768872000000-abc123.mp3",
  "duration": null,
  "format": "mp3",
  "id": "65a1b2c3d4e5f6g7h8i9j0k1"
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields or invalid file type
- `403 Forbidden`: User is not admin or teacher
- `404 Not Found`: Ticket not found or not a Sabq ticket
- `413 Payload Too Large`: File exceeds 10MB limit
- `500 Internal Server Error`: Server error

---

### GET /api/audio/sabq/by-ticket/:ticketId

Retrieve all audio clips for a specific ticket, grouped by surah → ayah → wordText.

**Authentication:** Required

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 100, max: 100)

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/audio/sabq/by-ticket/696ebf841fd1c17c8edbf156?page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Success Response (200):**
```json
{
  "ticketId": "696ebf841fd1c17c8edbf156",
  "audioClips": [
    {
      "surahNumber": 40,
      "ayahs": [
        {
          "ayahNumber": 7,
          "words": [
            {
              "wordText": "الْعَزِيزِ",
              "audioUrl": "/uploads/sabq-audio/sabq-...-abc123.mp3",
              "duration": null,
              "format": "mp3",
              "mistakeId": "mistake-1",
              "sabqEntryId": "sabq-entry-1",
              "uploadedBy": "690646f921eac3a070d91b2a",
              "uploadedByName": "Admin User",
              "createdAt": "2026-01-20T10:30:00.000Z"
            }
          ]
        }
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

**Notes:**
- Arabic `wordText` is preserved exactly as submitted
- No numeric ayah rendering - only Arabic text
- Grouped structure: surah → ayah → words array

---

### GET /api/audio/sabq/by-assignment/:assignmentId

Retrieve all audio clips for a specific assignment, grouped by surah → ayah → wordText.

**Authentication:** Required

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 100, max: 100)

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/audio/sabq/by-assignment/696ed1911fd1c17c8edc361d?page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Success Response (200):**
```json
{
  "assignmentId": "696ed1911fd1c17c8edc361d",
  "audioClips": [
    {
      "surahNumber": 40,
      "ayahs": [
        {
          "ayahNumber": 7,
          "words": [
            {
              "wordText": "الْعَزِيزِ",
              "audioUrl": "/uploads/sabq-audio/sabq-...-abc123.mp3",
              "duration": null,
              "format": "mp3",
              "mistakeId": "mistake-1",
              "sabqEntryId": "sabq-entry-1",
              "ticketId": "696ebf841fd1c17c8edbf156",
              "uploadedBy": "690646f921eac3a070d91b2a",
              "uploadedByName": "Admin User",
              "createdAt": "2026-01-20T10:30:00.000Z"
            }
          ]
        }
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

**Notes:**
- Returns audio from all tickets linked to the assignment's Sabq entries
- Includes `ticketId` in word objects for traceability
- Same grouping structure as ticket endpoint

---

## Data Flow

### 1. Upload Audio
```
User uploads audio → POST /api/audio/sabq/upload
  ↓
SabqAudioClip document created
  ↓
If mistakeId provided → Ticket.sabqEntries[].mistakes[].audioUrl updated
  ↓
Returns audioUrl
```

### 2. Submit Ticket
```
Admin submits Sabq ticket → POST /api/tickets/:id/submit-sabq
  ↓
updateAssignmentFromTicket() called
  ↓
Assignment.classwork.sabq[].mistakes[].audioUrl preserved
  ↓
Assignment saved with audio URLs
```

### 3. Sync Assignment
```
GET /api/assignments → syncAssignmentFromTickets() called
  ↓
Missing audioUrl restored from ticket if missing
  ↓
Assignment updated (audio preserved)
```

---

## Schema Reference

### SabqAudioClip
```javascript
{
  _id: ObjectId,
  studentId: String (indexed),
  ticketId: String (indexed),
  sabqEntryId: String,
  mistakeId: String (optional),
  surahNumber: Number (indexed),
  ayahNumber: Number (indexed),
  wordText: String, // Arabic text - MUST be preserved
  audioUrl: String, // e.g., "/uploads/sabq-audio/..."
  duration: Number (optional), // seconds
  format: String, // "mp3" or "wav"
  uploadedBy: String, // User ID
  uploadedByName: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `{ studentId: 1, surahNumber: 1, ayahNumber: 1 }` - For grouped queries
- `{ ticketId: 1, sabqEntryId: 1 }` - For ticket-based queries
- `{ ticketId: 1 }` - For assignment sync queries

---

## Error Handling

All endpoints fail gracefully:
- Missing audio: Returns empty array, not error
- Invalid ticket/assignment: Returns 404 with clear error message
- File validation: Returns 400 with specific validation error
- Permission denied: Returns 403 with clear message

---

## Security

- **Authentication:** All endpoints require valid JWT token
- **Authorization:** Upload endpoint requires admin/teacher role
- **File Validation:** Only MP3 and WAV allowed, max 10MB
- **Path Sanitization:** Filenames sanitized to prevent path traversal
- **Arabic Text:** Preserved exactly as submitted (no encoding issues)

---

## Performance

- **Indexes:** Compound indexes for efficient queries
- **Pagination:** All retrieval endpoints support pagination (max 100 per page)
- **Lazy Loading:** Audio files served statically, not loaded into memory
- **Graceful Degradation:** Missing audio doesn't break the flow
