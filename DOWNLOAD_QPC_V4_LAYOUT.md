# Download QPC v4 Layout (Tajweed) from qul.tarteel.ai

## Current Status

✅ **You already have the layout file:**
- Location: `src/data/layouts/qpc-v4-tajweed-15-lines.db`
- Pages: 604 (complete Quran)
- File size: ~236 KB

## Manual Download Instructions

Since the download requires authentication, follow these steps:

### Option 1: Download from Website

1. **Visit the resource page:**
   ```
   https://qul.tarteel.ai/resources/mushaf-layout/19?page=
   ```

2. **Sign in to your account** (or create one if needed)

3. **Click the "Download sqlite" button**

4. **Save the file to:**
   ```
   src/data/layouts/qpc-v4-tajweed-15-lines.db
   ```

### Option 2: Use API (if you have credentials)

If you have API credentials for qul.tarteel.ai:

```bash
# Get access token first
curl -X POST https://qul.tarteel.ai/api/oauth/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "grant_type=client_credentials"

# Then download the file
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o src/data/layouts/qpc-v4-tajweed-15-lines.db \
  "https://qul.tarteel.ai/api/resources/mushaf-layout/19/download?format=sqlite"
```

## Verify Current File

To check if your current file is valid:

```bash
# Check number of pages
sqlite3 src/data/layouts/qpc-v4-tajweed-15-lines.db "SELECT COUNT(DISTINCT page_number) FROM pages;"

# Check structure
sqlite3 src/data/layouts/qpc-v4-tajweed-15-lines.db ".schema pages"

# Check sample data
sqlite3 src/data/layouts/qpc-v4-tajweed-15-lines.db "SELECT * FROM pages WHERE page_number = 1 LIMIT 5;"
```

## Resource Information

- **Resource ID:** 19
- **Name:** QPC v4 layout (tajweed)
- **Format:** SQLite database
- **Tables:** `pages`, `info`
- **Total Pages:** 604

## Database Structure

### `pages` table:
- `page_number` - Page number (1-604)
- `line_number` - Line number on page (1-15)
- `line_type` - Type: `ayah`, `surah_name`, or `basmallah`
- `is_centered` - Boolean (1 or 0)
- `first_word_id` - First word ID for this line
- `last_word_id` - Last word ID for this line
- `surah_number` - Surah number

## Related Files

- Layout database: `src/data/layouts/qpc-v4-tajweed-15-lines.db`
- Word data: `src/data/words/word_by_word.json`
- Font files: `public/fonts/`

## Need Help?

If the download link doesn't work or you need assistance:
1. Check if you're logged into qul.tarteel.ai
2. Verify you have access to resource ID 19
3. Try downloading in incognito/private browsing mode
4. Contact qul.tarteel.ai support if download issues persist

