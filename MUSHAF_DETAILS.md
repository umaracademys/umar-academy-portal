# Mushaf Component - Complete Details

## 📦 Package Information

**Package Name:** `@umar-academy/mushaf`  
**Location:** `packages/mushaf/`  
**Version:** 1.0.0  
**Type:** React Component Library (ES Module)

## 🎯 Core Features

### 1. **Interactive Mushaf Display**
- Word-by-word Quranic text rendering
- Page navigation (1-604 pages)
- Real-time Arabic text display using QPC V1 fonts
- Responsive design with RTL (Right-to-Left) support
- High-quality typography with proper Arabic font rendering

### 2. **Mistake Marking System**
- Click on any word to mark a mistake
- 6 mistake types:
  - Memory Mistake
  - Mad (Elongation) Mistake
  - Ikhfa Mistake
  - Ghunna Mistake
  - Holding/Fluency Mistake
  - Other Mistake
- Optional notes for each mistake
- Audio recording support for mistake explanations
- Visual highlighting of marked mistakes

### 3. **Surah Index Navigation**
- Searchable list of all 114 Surahs
- Arabic and English names
- Quick jump to any Surah
- Page range display for each Surah
- Minimizable sidebar

### 4. **Historical Mistakes Tracking**
- Display mistakes from previous sessions
- Toggle between current and historical mistakes
- Color-coded mistake indicators
- Personal Mushaf for each student

### 5. **Page Layout System**
- 15-line format (QPC V1 standard)
- Line-by-line rendering
- Proper spacing and justification
- Surah name headers
- Basmallah display

## 🏗️ Architecture

### Component Structure

```
packages/mushaf/
├── src/
│   ├── components/
│   │   ├── InteractiveMushaf.tsx      # Main component (1625 lines)
│   │   └── InteractiveMushafSimple.tsx # Simplified version
│   ├── services/
│   │   ├── quranApi.ts                # Quran API integration
│   │   ├── qpcV1Assets.ts             # Font & layout loading
│   │   └── audioService.ts            # Audio upload service
│   ├── types/
│   │   ├── mushaf.ts                  # Core types
│   │   └── mushaf-layout.ts           # Layout types
│   ├── data/
│   │   └── fallbackChapters.ts        # Fallback Surah data
│   └── index.ts                       # Package exports
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 📊 Data Sources

### 1. **Quran API Integration**
- **Base URL:** Configurable via `VITE_API_BASE_URL`
- **Endpoints Used:**
  - `GET /api/quran/chapters` - Get all 114 Surahs
  - `GET /api/quran/pages/:pageNumber/lines` - Get page layout
  - `GET /api/quran/pages/:pageNumber/verses` - Get verses for page

### 2. **SQLite Databases (QPC V1)**
- **Layout Database:** `/data/layouts/qpc-v1-15-lines.db`
  - Contains line mappings for each page
  - Word ID ranges for each line
  - Line types (ayah, surah_name, basmallah)
  
- **Words Database:** `/data/glyphs/qpc-v1-glyph-codes-wbw.db`
  - Word-by-word text data
  - Word indices
  - Surah and Ayah mappings

### 3. **Font System**
- **Primary Font:** QPC V1 Font (per-page fonts)
- **Fallback Fonts:** Amiri, Scheherazade New, Arabic Typesetting, Traditional Arabic
- Fonts loaded dynamically per page
- Font files stored in `/public/fonts/`

## 🔧 Technical Implementation

### Key Technologies

1. **React 18** - Component framework
2. **TypeScript** - Type safety
3. **SQL.js** - Client-side SQLite database access
4. **Vite** - Build tool
5. **Tailwind CSS** - Styling

### Component Props

```typescript
interface InteractiveMushafProps {
  currentPage: number;                    // Current page (1-604)
  onPageChange: (page: number) => void;   // Page change handler
  mistakes: MushafMistake[];              // Current mistakes
  historicalMistakes?: MushafMistake[];   // Historical mistakes
  onMistakeMark: (mistake: Omit<MushafMistake, 'id' | 'timestamp'>) => void;
  readOnly?: boolean;                     // View-only mode
  mode?: 'marking' | 'viewing';          // Interaction mode
  studentName?: string;                   // Student name display
  onBack?: () => void;                    // Back button handler
  showHistorical?: boolean;               // Show historical mistakes
}
```

### Mistake Types

```typescript
type MistakeType = 
  | 'madd'              // Mad (Elongation)
  | 'holding'           // Holding/Fluency
  | 'memory'            // Memory Mistake
  | 'ikhfa'             // Ikhfa Mistake
  | 'tech'              // Ghunna Mistake
  | 'other'             // Other Mistake
  | 'letter'            // Letter Mistake
  | 'heavy_letter'      // Heavy Letter
  | 'no_rounding_lips'  // No Rounding Lips
  | 'heavy_h'           // Heavy H
  | 'light_l'           // Light L
  | 'atkee';            // Atkee
```

### Data Structures

#### MushafMistake
```typescript
{
  id: string;
  type: MistakeType;
  page: number;
  surah: number;
  ayah: number;
  wordIndex?: number;
  position?: { x: number; y: number };
  note?: string;
  audioUrl?: string;
  timestamp: Date;
}
```

#### Word
```typescript
{
  word_index: number;
  surah: number;
  ayah: number;
  text: string;
}
```

#### LayoutPage
```typescript
{
  page_number: number;
  lines: Line[];
  metadata?: {
    mushaf_name?: string;
    code?: string;
    pages_count?: number;
    lines_per_page?: number;
    font_name?: string;
  };
}
```

## 🎨 UI Features

### Visual Elements

1. **Page Display**
   - Centered Mushaf page
   - Page number badge
   - Proper Arabic text rendering
   - RTL text direction

2. **Mistake Highlighting**
   - Red background for current mistakes
   - Yellow/orange for historical mistakes
   - Hover effects on words
   - Click to mark mistake

3. **Navigation**
   - Previous/Next page buttons
   - Page number input
   - Surah index sidebar
   - Quick jump to Surah

4. **Mistake Modal**
   - Mistake type selector
   - Optional note field
   - Audio recording button
   - Save/Cancel actions

## 🔌 API Integration

### Backend Endpoints Required

1. **GET /api/quran/chapters**
   - Returns list of all 114 Surahs
   - Includes Arabic names, page ranges, verse counts

2. **GET /api/quran/pages/:pageNumber/lines**
   - Returns line layout for a page
   - Includes word IDs, line types, Surah numbers

3. **GET /api/quran/pages/:pageNumber/verses**
   - Returns verses for a page
   - Used for word-by-word mapping

4. **POST /api/recordings/upload** (Optional)
   - Uploads audio recordings for mistakes
   - Returns recording URL

## 📱 Usage Examples

### Basic Usage
```tsx
import { InteractiveMushaf } from '@umar-academy/mushaf';

<InteractiveMushaf
  currentPage={1}
  onPageChange={setPage}
  mistakes={mistakes}
  onMistakeMark={handleMistakeMark}
  readOnly={false}
  mode="marking"
/>
```

### With Historical Mistakes
```tsx
<InteractiveMushaf
  currentPage={currentPage}
  onPageChange={setCurrentPage}
  mistakes={currentMistakes}
  historicalMistakes={historicalMistakes}
  onMistakeMark={handleMistakeMark}
  showHistorical={true}
  readOnly={false}
  mode="marking"
  studentName="Ahmed Ali"
/>
```

## 🗄️ Database Dependencies

### SQLite Files (in `/public/data/`)

1. **qpc-v1-15-lines.db**
   - Page layout data
   - Line mappings
   - Word ID ranges

2. **qpc-v1-glyph-codes-wbw.db**
   - Word-by-word text
   - Word indices
   - Surah/Ayah mappings

### Font Files (in `/public/fonts/`)

- Per-page QPC V1 fonts (QPCV1-Page-1.woff, QPCV1-Page-2.woff, etc.)
- Fallback Arabic fonts

## 🎯 Key Capabilities

1. **Word-by-Word Interaction**
   - Click any word to mark mistake
   - Visual feedback on hover
   - Word-level precision

2. **Multi-Mode Support**
   - Marking mode (teachers can mark mistakes)
   - Viewing mode (read-only display)
   - Historical mode (show past mistakes)

3. **Audio Integration**
   - Record audio explanations for mistakes
   - Upload and store recordings
   - Playback support

4. **Responsive Design**
   - Mobile-friendly
   - Tablet optimized
   - Desktop full-featured

5. **Performance Optimized**
   - Lazy loading of fonts
   - Cached database queries
   - Efficient re-rendering

## 🔄 Integration Points

### Used In:
- `TeacherTicketReview` - Teachers mark mistakes during review
- `AdminTicketReview` - Admins view mistakes during approval
- `StudentAssignmentHistory` - Students view their personal Mushaf
- `TeacherStudentReports` - Teachers view student progress

### Data Flow:
1. Student recites → Ticket created
2. Teacher reviews → Marks mistakes in Mushaf
3. Mistakes saved → Stored with ticket
4. Admin approves → Mistakes added to assignment
5. Student views → Historical mistakes displayed

## 📈 Statistics

- **Total Lines of Code:** ~1,625 lines (InteractiveMushaf.tsx)
- **Components:** 2 main components
- **Services:** 3 service modules
- **Type Definitions:** 2 type files
- **Pages Supported:** 604 pages (full Quran)
- **Surahs Supported:** 114 Surahs
- **Mistake Types:** 12 types
- **Fonts:** Per-page fonts + 4 fallback fonts

## 🚀 Build & Deployment

### Build Process
```bash
cd packages/mushaf
pnpm build
```

### Output
- `dist/index.js` - Compiled component
- `dist/index.d.ts` - TypeScript definitions
- Fonts and databases copied to dist

### Package Exports
- `InteractiveMushaf` - Main component
- `InteractiveMushafSimple` - Simplified version
- `MistakeModal` - Mistake marking modal
- `MushafPage` - Page display component
- `WordByWordPage` - Word-by-word page component
- All types and services

## 🔐 Configuration

### Environment Variables
- `VITE_API_BASE_URL` - Backend API base URL (default: `http://localhost:3001/api`)

### Runtime Configuration
- Can be overridden via `window.MUSHAF_API_BASE`

## 📝 Notes

- Uses QPC V1 (Quran Page Complex V1) format
- 15-line per page standard
- Supports both API and SQLite data sources
- Fallback mechanisms for offline/API failure scenarios
- Fully typed with TypeScript
- Accessible and keyboard navigable


