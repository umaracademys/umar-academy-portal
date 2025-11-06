# Mushaf Component Separation Proposal

## 🎯 Objective
Separate the Mushaf component into its own project for better maintainability, reusability, and independent development.

## 📊 Current State Analysis

### Components to Extract
- `InteractiveMushaf.tsx` (~1,300 lines) - Main component
- `InteractiveMushafSimple.tsx` (~300 lines) - Simplified version
- `MistakeModal` (embedded in InteractiveMushaf)

### Types to Extract
- `src/types/mushaf.ts` - Core mistake types
- `src/types/mushaf-layout.ts` - Layout types
- Related interfaces from `InteractiveMushaf.tsx`

### Services to Extract
- Parts of `quranApi.ts` (Mushaf-specific functions)
- `audioService.ts` (if used only by Mushaf)

### Data Files
- `word_by_word.json` (8.4MB) - Large file, needs special handling
- Layout files (if any local ones exist)

---

## 🏗️ Architecture Options

### Option 1: Monorepo with pnpm Workspaces (RECOMMENDED) ⭐

**Structure:**
```
umar-academy-portal/
├── packages/
│   ├── mushaf/              # Separate Mushaf package
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── types/
│   │   │   ├── services/
│   │   │   └── index.ts     # Main export
│   │   ├── public/
│   │   │   └── data/        # word_by_word.json
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   └── umar-academy/        # Main app
│       ├── src/
│       └── package.json
├── package.json             # Root workspace config
└── pnpm-workspace.yaml
```

**Pros:**
- ✅ Single repository, easy to manage
- ✅ Shared dependencies
- ✅ Easy cross-package development
- ✅ TypeScript types shared naturally
- ✅ Can build independently
- ✅ Can publish Mushaf as separate npm package later

**Cons:**
- ⚠️ Requires pnpm setup (or npm/yarn workspaces)
- ⚠️ Slightly more complex initial setup

**Integration:**
```typescript
// In main app
import { InteractiveMushaf } from '@umar-academy/mushaf';
```

---

### Option 2: Separate npm Package

**Structure:**
```
umar-academy-portal/         # Main app
├── src/
└── package.json

umar-academy-mushaf/         # Separate repo
├── src/
├── dist/                    # Built output
├── package.json
└── README.md
```

**Pros:**
- ✅ Complete independence
- ✅ Can be versioned separately
- ✅ Can be used in multiple projects
- ✅ Clear boundaries

**Cons:**
- ⚠️ Two repositories to manage
- ⚠️ Version coordination needed
- ⚠️ More complex CI/CD
- ⚠️ Need to publish to npm (or private registry)

**Integration:**
```bash
npm install @umar-academy/mushaf
```
```typescript
import { InteractiveMushaf } from '@umar-academy/mushaf';
```

---

### Option 3: Git Submodule

**Structure:**
```
umar-academy-portal/
├── src/
└── packages/
    └── mushaf/              # Git submodule
        └── src/
```

**Pros:**
- ✅ Separate repository
- ✅ Version control per project

**Cons:**
- ⚠️ Complex git workflow
- ⚠️ Not ideal for frequent updates
- ⚠️ Developer experience issues

**Not Recommended** ❌

---

### Option 4: Simple Package Folder (Lightweight)

**Structure:**
```
umar-academy-portal/
├── packages/
│   └── mushaf/              # Just a folder, not a package
│       ├── src/
│       └── package.json     # For building only
├── src/
│   └── components/
│       └── MushafWrapper.tsx  # Import from packages/mushaf
└── package.json
```

**Pros:**
- ✅ Simplest approach
- ✅ No workspace setup needed
- ✅ Easy to refactor later

**Cons:**
- ⚠️ Less clear boundaries
- ⚠️ Can't easily publish separately

---

## 🎨 Recommended Approach: Monorepo with pnpm Workspaces

### Step-by-Step Implementation

#### Phase 1: Setup Monorepo Structure

1. **Install pnpm** (if not already):
```bash
npm install -g pnpm
```

2. **Create workspace structure:**
```
mkdir -p packages/mushaf/src/{components,types,services,utils}
mkdir -p packages/mushaf/public/data/words
```

3. **Create root `pnpm-workspace.yaml`:**
```yaml
packages:
  - 'packages/*'
  - '.'  # Main app
```

4. **Update root `package.json`:**
```json
{
  "name": "umar-academy-portal-monorepo",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter umar-academy-portal dev",
    "build": "pnpm -r build",
    "build:mushaf": "pnpm --filter @umar-academy/mushaf build",
    "build:app": "pnpm --filter umar-academy-portal build"
  }
}
```

#### Phase 2: Create Mushaf Package

1. **Create `packages/mushaf/package.json`:**
```json
{
  "name": "@umar-academy/mushaf",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./styles": "./dist/styles.css"
  },
  "files": [
    "dist",
    "public"
  ],
  "scripts": {
    "dev": "vite build --watch",
    "build": "tsc && vite build",
    "prepublishOnly": "pnpm build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.8"
  },
  "peerDependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

2. **Create `packages/mushaf/vite.config.ts`:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'UmarAcademyMushaf',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
    copyPublicDir: true,
  },
  publicDir: 'public',
});
```

3. **Create `packages/mushaf/src/index.ts`:**
```typescript
// Main exports
export { InteractiveMushaf } from './components/InteractiveMushaf';
export { InteractiveMushafSimple } from './components/InteractiveMushafSimple';
export type { 
  MushafMistake, 
  MushafPage, 
  MushafSession,
  MistakeType 
} from './types/mushaf';
export type { Word, Line, LayoutPage } from './types/layout';
export { fetchPageLines, getQuranChapters } from './services/quranApi';
```

#### Phase 3: Move Files

1. **Move components:**
   - `src/components/InteractiveMushaf.tsx` → `packages/mushaf/src/components/`
   - `src/components/InteractiveMushafSimple.tsx` → `packages/mushaf/src/components/`

2. **Move types:**
   - `src/types/mushaf.ts` → `packages/mushaf/src/types/`
   - `src/types/mushaf-layout.ts` → `packages/mushaf/src/types/`
   - Extract types from `InteractiveMushaf.tsx` → `packages/mushaf/src/types/`

3. **Move services:**
   - Extract Mushaf-related functions from `quranApi.ts` → `packages/mushaf/src/services/quranApi.ts`
   - `audioService.ts` → `packages/mushaf/src/services/` (if Mushaf-only)

4. **Move data:**
   - `public/data/words/word_by_word.json` → `packages/mushaf/public/data/words/`
   - Update paths in components

#### Phase 4: Update Main App

1. **Update main app `package.json`:**
```json
{
  "name": "umar-academy-portal",
  "dependencies": {
    "@umar-academy/mushaf": "workspace:*",
    // ... other deps
  }
}
```

2. **Update imports in main app:**
```typescript
// Before
import InteractiveMushaf from '../components/InteractiveMushaf';

// After
import { InteractiveMushaf } from '@umar-academy/mushaf';
```

3. **Update build configuration:**
   - Ensure main app can resolve the workspace package
   - Update Vite config if needed

---

## 📦 Data Handling Strategy

### Option A: Bundle with Package (Simple)
- Include `word_by_word.json` in `packages/mushaf/public/`
- Serve via CDN or static hosting
- **Pros:** Simple, works out of the box
- **Cons:** Large package size (8.4MB)

### Option B: External CDN (Recommended) ⭐
- Host `word_by_word.json` on CDN or backend
- Mushaf package fetches from URL
- **Pros:** Smaller package, can update data independently
- **Cons:** Requires CDN/backend setup

### Option C: Lazy Loading
- Load data on-demand per page/surah
- Use backend API endpoints
- **Pros:** Fast initial load, scalable
- **Cons:** More API calls, requires backend

**Recommendation:** Start with Option A, migrate to Option B/C later.

---

## 🔧 Build Configuration

### Mushaf Package Build
- Builds to `dist/` as ES module
- Exports TypeScript types
- Includes CSS (if extracted)

### Main App Integration
- Imports from `@umar-academy/mushaf`
- Vite resolves workspace packages automatically
- Can use in development mode with watch

---

## 🎨 Styling Strategy

### Option 1: Tailwind CSS (Current)
- Keep Tailwind in Mushaf package
- Requires Tailwind in both packages
- **Pros:** Consistent styling
- **Cons:** Duplicate CSS if not shared

### Option 2: CSS Modules
- Self-contained styles
- **Pros:** No external dependencies
- **Cons:** More work to migrate

### Option 3: Shared Tailwind Config
- Single Tailwind config in monorepo root
- Both packages use it
- **Pros:** Consistent, no duplication
- **Cons:** Requires setup

**Recommendation:** Option 1 (keep Tailwind) for now, migrate to Option 3 later.

---

## 📝 API Interface Design

### Clean API Surface
```typescript
// packages/mushaf/src/index.ts
export interface InteractiveMushafProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  mistakes: MushafMistake[];
  historicalMistakes?: MushafMistake[];
  onMistakeMark: (mistake: Omit<MushafMistake, 'id' | 'timestamp'>) => void;
  readOnly?: boolean;
  mode?: 'marking' | 'viewing';
  studentName?: string;
  onBack?: () => void;
  showHistorical?: boolean;
  // Configuration
  apiBaseUrl?: string;  // For fetching layouts/data
  dataSource?: 'local' | 'cdn' | 'api';  // How to load data
}
```

### Configuration Provider (Optional)
```typescript
// packages/mushaf/src/contexts/MushafConfig.tsx
export const MushafConfigProvider = ({ 
  apiBaseUrl, 
  dataSource,
  children 
}) => {
  // Provides configuration to all Mushaf components
};
```

---

## 🚀 Migration Plan

### Phase 1: Setup (Week 1)
- [ ] Setup monorepo structure
- [ ] Create Mushaf package skeleton
- [ ] Configure build system

### Phase 2: Extract (Week 1-2)
- [ ] Move components
- [ ] Move types
- [ ] Move services
- [ ] Update imports

### Phase 3: Test (Week 2)
- [ ] Ensure Mushaf works in isolation
- [ ] Test integration with main app
- [ ] Fix any issues

### Phase 4: Optimize (Week 2-3)
- [ ] Optimize data loading
- [ ] Improve build configuration
- [ ] Add documentation

### Phase 5: Deploy (Week 3)
- [ ] Update CI/CD
- [ ] Deploy and test
- [ ] Monitor performance

---

## ✅ Benefits

1. **Separation of Concerns**
   - Mushaf logic isolated
   - Easier to test
   - Clear boundaries

2. **Independent Development**
   - Can develop Mushaf separately
   - Different release cycles
   - Easier code reviews

3. **Reusability**
   - Can use in other projects
   - Can publish to npm
   - Share with community

4. **Better Performance**
   - Can optimize Mushaf bundle separately
   - Lazy loading easier
   - Better tree-shaking

5. **Maintainability**
   - Smaller, focused codebase
   - Easier to understand
   - Better documentation

---

## ⚠️ Considerations

1. **Breaking Changes**
   - Need to version API carefully
   - Coordinate updates between packages

2. **Development Workflow**
   - Need to build Mushaf before main app (or use watch mode)
   - More complex setup initially

3. **Bundle Size**
   - Still need to handle large data files
   - Consider CDN for production

4. **Testing**
   - Need tests for Mushaf package
   - Integration tests for main app

---

## 🎯 Recommendation

**Start with Option 1 (Monorepo with pnpm Workspaces)** because:
- ✅ Best balance of simplicity and flexibility
- ✅ Easy to refactor later if needed
- ✅ Can publish separately if needed
- ✅ Good developer experience
- ✅ Works well with existing setup

**Next Steps:**
1. Review this proposal
2. Choose approach (recommend Option 1)
3. Start with Phase 1 (setup)
4. Iterate based on feedback

---

## 📚 Additional Resources

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Vite Library Mode](https://vitejs.dev/guide/build.html#library-mode)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

---

**Questions or concerns? Let's discuss before implementation!**

