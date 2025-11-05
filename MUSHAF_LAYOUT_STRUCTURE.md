# Mushaf Layout Structure Documentation

Based on qul.tarteel.ai structure: https://qul.tarteel.ai/resources/mushaf-layout

## Current Database

**File:** `src/data/layouts/qpc-v4-tajweed-15-lines.db`
- **Mushaf:** QPC v4 Tajweed
- **Pages:** 604 (complete Quran)
- **Lines per page:** 15
- **Total lines:** 9,046
- **Font:** v4-tajweed

## Database Schema

### `info` Table (Metadata)
```json
{
  "name": "QPC v4 tajweed",
  "number_of_pages": 604,
  "lines_per_page": 15,
  "font_name": "v4-tajweed"
}
```

### `pages` Table (Page Lines Mapping)
```sql
CREATE TABLE pages (
  page_number INTEGER,
  line_number INTEGER,
  line_type TEXT,           -- "ayah", "surah_name", or "basmallah"
  is_centered INTEGER,      -- 1 for true, 0 for false
  first_word_id INTEGER,    -- NULL for surah_name/basmallah lines
  last_word_id INTEGER,     -- NULL for surah_name/basmallah lines
  surah_number INTEGER      -- Present for surah_name lines
)
```

## Data Structure

### 1. Mushaf Metadata

```typescript
interface MushafMetadata {
  id: number;
  mushaf_name: string;      // e.g., "QCF V1 (1405H print)"
  code: string;             // e.g., "qpc_v1", "qpc_v4"
  pages_count: number;      // 604 for complete Quran
  lines_per_page: number;   // 15 for standard Mushaf
  font_name: string;        // e.g., "v1", "v4-tajweed"
}
```

### 2. Page Lines Mapping

This is the heart of mushaf rendering - mapping each line on each page:

```typescript
interface PageLine {
  mushaf_id?: number;       // Optional: for multi-mushaf support
  page_number: number;      // 1-604
  line_number: number;      // 1-15 (varies on first pages)
  line_type: "surah_name" | "basmallah" | "ayah";
  is_centered: boolean;
  surah_number?: number;    // Present for surah_name lines
  first_word_id: number | null;  // Points to word ID (e.g., word "بِسْمِ")
  last_word_id: number | null;   // Points to word ID (e.g., word "ٱلرَّحِيمِ")
}
```

**Example Line Types:**

**Surah Name Line:**
```json
{
  "page_number": 1,
  "line_number": 1,
  "line_type": "surah_name",
  "is_centered": true,
  "surah_number": 1,
  "first_word_id": null,
  "last_word_id": null
}
```

**Ayah Line:**
```json
{
  "page_number": 1,
  "line_number": 2,
  "line_type": "ayah",
  "is_centered": true,
  "first_word_id": 1,    // Points to word "بِسْمِ"
  "last_word_id": 4      // Points to word "ٱلرَّحِيمِ"
}
```

**Basmallah Line:**
```json
{
  "page_number": 2,
  "line_number": 1,
  "line_type": "basmallah",
  "is_centered": true,
  "first_word_id": null,
  "last_word_id": null
}
```

### 3. Special Pages

The first two pages of Surah Al-Fatihah and Surah Al-Baqarah have only **8 lines each** due to their special formatting with chapter headers, instead of the standard 15 lines.

## Structural Divisions (Future Support)

These can be retrieved from qul.tarteel.ai's API endpoints for enhanced navigation:

### Juz (30 divisions)
```typescript
interface Juz {
  id: number;
  first_verse_key: string;  // e.g., "1:1"
  last_verse_key: string;   // e.g., "2:141"
  verses_count: number;
}
```

### Hizb (60 divisions - 2 per Juz)
```typescript
interface Hizb {
  id: number;
  juz_id: number;
  first_verse_key: string;
  last_verse_key: string;
}
```

### Rub (240 divisions - 4 per Hizb)
Quarters of Juz for finer navigation.

### Manzil (7 divisions)
For weekly completion tracking.

### Ruku (558 thematic sections)
Thematic sections within surahs.

### Sajdah (15 prostration verses)
Special verses requiring prostration.

## Implementation Notes

1. **Word IDs:** Word IDs in the database are 1-based sequential across the entire surah, not globally unique.

2. **Word Lookup:** To get the actual words for a line:
   - Filter words by surah
   - Use sequential index (1-based) matching `first_word_id` to `last_word_id`
   - Sort by word_index to ensure correct order

3. **Null Handling:** `first_word_id` and `last_word_id` are `null` for:
   - `surah_name` lines (display surah name in Arabic)
   - `basmallah` lines (display ﷽ symbol)

4. **Centering:** Lines with `is_centered: true` should be center-aligned (common for surah names and basmallah).

## TypeScript Types

See `src/types/mushaf-layout.ts` for complete type definitions.

## API Endpoints

- **Backend:** `/api/quran/pages/:pageNumber/lines?version=v4`
- **Returns:** Page layout with lines and word data

## Related Files

- `src/components/InteractiveMushaf.tsx` - Main Mushaf component
- `src/types/mushaf-layout.ts` - Type definitions
- `backend/server.js` - API endpoint implementation
- `src/services/quranApi.ts` - Frontend API service

