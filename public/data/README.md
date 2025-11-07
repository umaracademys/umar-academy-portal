# Data Files Structure

This directory contains local data files for the Mushaf component.

## Folder Structure

```
public/data/
├── layouts/
│   └── page_2.json          # Page layout JSON files (one per page)
│   └── page_3.json
│   └── ...
├── words/
│   └── word_by_word.json    # Word-by-word data (all words)
└── qpc-hafs-word-by-word.json  # Alternative word-by-word data location
```

## File Formats

### Layout Files (`layouts/page_*.json`)
Each page layout file should follow this structure:
```json
{
  "page_number": 2,
  "lines": [
    {
      "page_number": 2,
      "line_number": 1,
      "first_word_id": 1,
      "last_word_id": 15,
      "is_centered": false,
      "line_type": "ayah",
      "surah_number": 2
    },
    ...
  ]
}
```

### Word Data (`words/word_by_word.json`)
Word-by-word data can be in either format:

**Option 1: Object format (keys like "1:1:1")**
```json
{
  "1:1:1": {
    "id": 1,
    "surah": "1",
    "ayah": "1",
    "word": "1",
    "location": "1:1:1",
    "text": "بِسۡمِ"
  },
  ...
}
```

**Option 2: Array format**
```json
[
  {
    "word_index": 1,
    "surah": 1,
    "ayah": 1,
    "text": "بِسۡمِ"
  },
  ...
]
```

## Loading Priority

The component will try to load files in this order:

1. **Layouts**: `/data/layouts/page_*.json` → Tarteel API (fallback)
2. **Words**: `/data/words/word_by_word.json` → `/data/qpc-hafs-word-by-word.json` → Dynamic import (fallback)

## Adding Files

To use local files:
1. Place layout JSON files in `public/data/layouts/` (e.g., `page_2.json`, `page_3.json`, etc.)
2. Place word-by-word JSON file in `public/data/words/word_by_word.json`
3. The component will automatically use these files if they exist






