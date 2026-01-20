# Interactive Mushaf Architecture

## Overview

The Interactive Mushaf is a React component library (`@umar-academy/mushaf`) that renders Quranic text word-by-word with interactive features for mistake marking, tajweed highlighting, and verse selection. It's built as a standalone package that can be imported and used across the application.

## Package Structure

```
packages/mushaf/
├── src/
│   ├── components/          # React components
│   │   ├── InteractiveMushaf.tsx      # Main component (3345 lines)
│   │   ├── InteractiveMushafSimple.tsx # Simplified version
│   │   ├── MistakeCounters.tsx        # Mistake counting UI
│   │   ├── TajweedExplanationCard.tsx # Tajweed explanations
│   │   ├── MobileMistakeBottomSheet.tsx # Mobile mistake UI
│   │   └── MushafZoomControls.tsx      # Zoom controls
│   ├── services/            # Data fetching & utilities
│   │   ├── qpcV1Assets.ts   # SQLite database loading (layouts & glyphs)
│   │   ├── quranApi.ts      # Backend API integration
│   │   └── audioService.ts  # Audio upload for mistakes
│   ├── hooks/               # Custom React hooks
│   │   ├── useMushafViewMode.ts
│   │   ├── useMobileGestures.ts
│   │   ├── useMistakeCounts.ts
│   │   └── useMushafZoom.ts
│   ├── types/               # TypeScript definitions
│   │   ├── mushaf.ts
│   │   └── mushaf-layout.ts
│   ├── data/
│   │   └── fallbackChapters.ts  # 114 surahs with Arabic names
│   └── utils/
│       └── tajweedExplanations.ts
└── package.json
```

## Core Components

### 1. **InteractiveMushaf** (Main Component)

The main component that orchestrates the entire Mushaf experience:

**Key Features:**
- Word-by-word rendering with click interactions
- Mistake marking (current + historical)
- Tajweed highlighting
- Verse selection (single/double click)
- Mobile-responsive design
- Zoom controls
- Surah/Juz index navigation
- Focus mode (fullscreen)

**Props:**
```typescript
interface InteractiveMushafProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  mistakes: MushafMistake[];              // Current mistakes
  historicalMistakes?: MushafMistake[];    // Student's past mistakes
  onMistakeMark: (mistake) => void;
  onVerseDoubleClick?: (surah, ayah, page) => void;
  readOnly?: boolean;
  mode?: 'marking' | 'viewing';
  zoom?: number;
  enableZoom?: boolean;
  // ... more props
}
```

### 2. **WordByWordPage** (Rendering Engine)

The core rendering component that displays a single page:

**Data Loading Priority:**
1. **SQLite Database (Primary)** - Local `.db` files:
   - `/data/layouts/qpc-v1-15-lines.db` - Page layouts (line positions)
   - `/data/glyphs/qpc-v1-glyph-codes-wbw.db` - Word glyphs/text
   - Uses `sql.js` to query SQLite in the browser

2. **MongoDB API (Fallback)** - Backend database:
   - `/api/quran/pages/:pageNumber/lines` - Page layout
   - `/api/quran/pages/:pageNumber/words` - Word data

3. **JSON Files (Legacy)** - Static files:
   - `/data/words/word_by_word.json` - Complete word data
   - `/data/layouts/page_*.json` - Page layouts

**Rendering Process:**
```typescript
// 1. Load layout (line positions)
const layout = await getQpcV1Layout(pageNumber);
// Returns: { page_number, lines: [{ line_number, first_word_id, last_word_id, ... }] }

// 2. Load words (glyphs/text)
const words = await getAllQpcV1Words();
// Returns: [{ word_index, surah, ayah, text, ... }]

// 3. Render lines with words
layout.lines.map(line => {
  const lineWords = words.filter(w => 
    w.word_index >= line.first_word_id && 
    w.word_index <= line.last_word_id
  );
  return <div>{lineWords.map(word => <span>{word.text}</span>)}</div>;
});
```

## Data Sources

### 1. **SQLite Databases** (Primary)

**Technology:** `sql.js` - SQLite compiled to WebAssembly

**Files:**
- `qpc-v1-15-lines.db` - Contains page layouts
- `qpc-v1-glyph-codes-wbw.db` - Contains word glyphs

**Loading Process:**
```typescript
// Initialize sql.js
const SQL = await initSqlJs({ locateFile: (file) => `/sqljs/${file}` });

// Load database
const dbBuffer = await fetch('/data/layouts/qpc-v1-15-lines.db')
  .then(res => res.arrayBuffer());
const db = new SQL.Database(new Uint8Array(dbBuffer));

// Query layout
const result = db.exec(`
  SELECT * FROM layouts 
  WHERE page_number = ${pageNumber}
`);
```

**Advantages:**
- Fast local queries
- No network requests
- Complete data offline

### 2. **MongoDB Backend** (Fallback)

**Endpoints:**
- `GET /api/quran/pages/:pageNumber/lines` - Page layout
- `GET /api/quran/pages/:pageNumber/words` - Word data
- `GET /api/quran/chapters` - Surah metadata
- `GET /api/quran/surahs/:surahId/verses` - Verse text

**Schema:**
```javascript
// QuranPage collection
{
  page_number: Number,
  lines: [{
    line_number: Number,
    first_word_id: Number,
    last_word_id: Number,
    is_centered: Boolean,
    line_type: String
  }]
}

// QuranWord collection
{
  word_id: Number,
  surah: Number,
  ayah: Number,
  word: Number,
  text: String,
  page_number: Number,
  version: String // 'v4' or 'nastaleeq'
}
```

### 3. **Font Loading**

**QPC V1 Font:**
- Font files stored per page: `/data/fonts/QPC V1 Font.woff`
- Dynamically loaded based on page number
- Falls back to system Arabic fonts if unavailable

## Interaction System

### Click Handling

**Single Click (Word):**
- Marks a mistake
- Opens mistake modal
- Records: surah, ayah, word_index, position

**Double Click (Verse):**
- Selects start/end ayah
- Triggers `onVerseDoubleClick(surah, ayah, page)`
- Used for recitation range selection

**Letter Click:**
- Marks mistake at specific letter
- Records: `letterIndex` within word
- Used for precise tajweed errors

### Mistake System

**Mistake Types:**
```typescript
type MistakeType = 
  | 'madd' | 'holding' | 'memory' | 'ikhfa' | 'tech' 
  | 'letter' | 'heavy_letter' | 'hamza' | 'sukoon' 
  | 'shaddah' | 'tanween' | 'waqf' | 'sifaat' | 'makharij'
  | 'atkee' | 'other';
```

**Mistake Data Structure:**
```typescript
interface MushafMistake {
  id: string;
  type: MistakeType;
  page: number;
  surah: number;
  ayah: number;
  wordIndex?: number;
  letterIndex?: number;
  position?: { x: number; y: number };
  note?: string;
  audioUrl?: string;
  timestamp: Date;
}
```

**Visual Highlighting:**
- Current mistakes: Red/orange borders
- Historical mistakes: Gray borders (optional)
- Tajweed errors: Color-coded by type

## Mobile Optimization

### Responsive Design
- Touch gestures for navigation
- Bottom sheet for mistake input (mobile)
- Swipe gestures for page navigation
- Adaptive font sizes

### Performance
- Lazy loading of page data
- Caching of loaded pages
- Virtual scrolling for long pages
- Optimized re-renders with React.memo

## State Management

**Local State (useState):**
- Current page
- Selected word
- Mistake modal visibility
- Zoom level
- View mode (focus/normal)

**Derived State (useMemo):**
- Filtered mistakes for current page
- Word-to-mistake mapping
- Layout calculations

**External State (Props):**
- Mistakes array (from parent)
- Historical mistakes (from backend)
- Page navigation (controlled by parent)

## Build System

**Vite Configuration:**
- Library mode build
- React externalized (peer dependency)
- TypeScript compilation
- Public assets copied to dist

**Package Export:**
```json
{
  "name": "@umar-academy/mushaf",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./styles": "./dist/styles.css"
  }
}
```

## Usage Example

```typescript
import { InteractiveMushaf } from '@umar-academy/mushaf';

<InteractiveMushaf
  currentPage={1}
  onPageChange={setPage}
  mistakes={currentMistakes}
  historicalMistakes={studentMistakes}
  onMistakeMark={handleMistakeMark}
  onVerseDoubleClick={handleAyahSelection}
  readOnly={false}
  mode="marking"
  zoom={1.0}
  enableZoom={true}
/>
```

## Key Technologies

- **React 18** - Component framework
- **TypeScript** - Type safety
- **sql.js** - SQLite in browser (WebAssembly)
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Portals** - Modal rendering

## Performance Optimizations

1. **Lazy Loading:** Pages loaded on-demand
2. **Memoization:** Expensive calculations cached
3. **Virtual Scrolling:** Only visible words rendered
4. **Debouncing:** Click handlers debounced
5. **Code Splitting:** Components loaded as needed

## Future Enhancements

- Audio playback per word
- Advanced tajweed visualization
- Multi-mushaf support (different fonts/versions)
- Offline-first architecture
- Progressive Web App (PWA) support
