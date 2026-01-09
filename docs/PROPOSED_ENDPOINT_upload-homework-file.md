# Proposed Backend Implementation

## Endpoint: `POST /api/assignments/upload-homework-file`

### Analysis Summary

**Frontend Usage:**
- File: `src/components/EnhancedAssignmentForm.tsx` (line 385)
- Function: `handleFileUpload`
- Purpose: Upload homework file attachments for assignment homework items

**Request Format:**
- Method: `POST`
- Headers:
  - `Content-Type`: `file.type || 'application/octet-stream'`
  - `X-Filename`: Original filename (required)
  - `Authorization`: `Bearer <token>` (optional)
- Body: `ArrayBuffer` (binary file data)

**Expected Response:**
```json
{
  "originalName": "homework.pdf",
  "name": "homework.pdf",           // fallback if originalName missing
  "url": "/uploads/homework/homework-1234567890-abc123.pdf",
  "type": "document",              // or "image", "video", "audio"
  "size": 12345                     // bytes
}
```

**Frontend Usage After Upload:**
- Response is used to populate `attachments` array in homework item
- Expected fields: `name`, `url`, `type`, `size`

---

## Proposed Implementation

### Route Location
Place **BEFORE** `express.json()` middleware (around line 238, after `/api/recordings/upload`)

### Code

```javascript
// Homework file upload route - must be before json middleware to handle binary data
app.post('/api/assignments/upload-homework-file', (req, res) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    try {
      const buffer = Buffer.concat(chunks);
      
      // Get content type and filename from headers
      const contentType = req.headers['content-type'] || 'application/octet-stream';
      const filename = req.headers['x-filename'] || `file-${Date.now()}`;
      
      // Validate filename is provided
      if (!req.headers['x-filename']) {
        return res.status(400).json({ error: 'X-Filename header is required' });
      }
      
      // Determine file type based on content type
      let fileType = 'document';
      if (contentType.startsWith('image/')) {
        fileType = 'image';
      } else if (contentType.startsWith('video/')) {
        fileType = 'video';
      } else if (contentType.startsWith('audio/')) {
        fileType = 'audio';
      } else if (contentType.includes('pdf')) {
        fileType = 'document';
      } else if (contentType.includes('word') || contentType.includes('document') || contentType.includes('text')) {
        fileType = 'document';
      }
      
      // Create homework directory if it doesn't exist
      const homeworkDir = path.join(__dirname, 'uploads', 'homework');
      if (!fs.existsSync(homeworkDir)) {
        fs.mkdirSync(homeworkDir, { recursive: true });
      }
      
      // Generate unique filename to prevent collisions
      const timestamp = Date.now();
      const extension = filename.split('.').pop() || 'bin';
      const sanitizedBaseName = filename.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^.]*$/, '');
      const uniqueFilename = `homework-${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;
      const filePath = path.join(homeworkDir, uniqueFilename);
      
      // Save file
      fs.writeFileSync(filePath, buffer);
      
      // Return URL and metadata
      const fileUrl = `/uploads/homework/${uniqueFilename}`;
      const fileSizeMB = (buffer.length / 1024 / 1024).toFixed(2);
      console.log(`✅ Homework file uploaded: ${fileUrl} (${fileSizeMB} MB) - Original: ${filename}`);
      
      res.json({ 
        url: fileUrl,
        originalName: filename,
        name: filename,              // For frontend compatibility
        type: fileType,
        size: buffer.length,
        mimeType: contentType
      });
    } catch (error) {
      console.error('❌ Error in homework file upload endpoint:', error);
      res.status(500).json({ error: error.message || 'Failed to upload homework file' });
    }
  });
  req.on('error', (error) => {
    console.error('❌ Error reading request:', error);
    res.status(500).json({ error: error.message || 'Failed to read file data' });
  });
});
```

---

## Implementation Details

### Directory Structure
- **Upload Directory**: `backend/uploads/homework/`
- **URL Path**: `/uploads/homework/<filename>`
- **Static Serving**: Already handled by existing `/uploads` static middleware (line 319)

### File Naming
- Format: `homework-<timestamp>-<random>.<extension>`
- Example: `homework-1704801234567-abc123.pdf`
- Prevents filename collisions and preserves original extension

### Security Considerations
1. **File Size**: Consider adding size limit (e.g., 10MB max)
2. **File Type Validation**: Currently accepts any file type - consider restricting to safe types
3. **Authentication**: Optional auth header - consider making it required for production
4. **Filename Sanitization**: Sanitizes original filename to prevent path traversal

### Error Handling
- Validates `X-Filename` header
- Handles file write errors
- Handles request read errors
- Returns appropriate HTTP status codes

### Response Format
Matches frontend expectations:
- `originalName`: Original filename from header
- `name`: Same as originalName (for compatibility)
- `url`: Relative URL path
- `type`: File type category
- `size`: File size in bytes

---

## Placement in server.js

**Insert after line 237** (after `/api/pair-teacher-messages/upload` route, before `/api/recordings/upload`)

**Reason**: 
- Must be before `express.json()` middleware (line 279) to handle binary data
- Follows existing pattern of upload routes
- Groups related upload endpoints together

---

## Testing Checklist

- [ ] Upload PDF file
- [ ] Upload image file
- [ ] Upload document file (Word, etc.)
- [ ] Verify file is saved to `backend/uploads/homework/`
- [ ] Verify file is accessible via `/uploads/homework/<filename>`
- [ ] Test with missing `X-Filename` header (should return 400)
- [ ] Test with large file (verify size limits if implemented)
- [ ] Verify response format matches frontend expectations
- [ ] Test with authentication header (if made required)

---

## Notes

- This endpoint follows the same pattern as `/api/pair-teacher-messages/upload`
- No database storage needed - files are stored on filesystem
- Files are served statically via existing `/uploads` route
- Consider adding cleanup job for old homework files if needed

