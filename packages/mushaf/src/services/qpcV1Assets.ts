import type { Database, SqlJsStatic } from 'sql.js';
import type { LayoutPage, Line, Word } from '../components/InteractiveMushaf';

const LAYOUT_DB_PATH = '/data/layouts/qpc-v1-15-lines.db';
const WORDS_DB_PATH = '/data/glyphs/qpc-v1-glyph-codes-wbw.db';
const FONT_DIR_NAME = encodeURIComponent('QPC V1 Font.woff');

let sqlJsPromise: Promise<SqlJsStatic> | null = null;
let layoutDbPromise: Promise<Database> | null = null;
let wordsDbPromise: Promise<Database> | null = null;
let wordsCachePromise: Promise<Word[]> | null = null;
const loadedFonts = new Map<number, string>();

const locateFile = (file: string) => (file.endsWith('.wasm') ? `/sqljs/${file}` : file);

async function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = (async () => {
      console.log('🔧 Attempting to load sql.js...');
      const isTypedArray = (value: any) => ArrayBuffer.isView(value) || value instanceof ArrayBuffer;
      const pickInitFunction = (moduleNamespace: any) => {
        const visited = new Set<any>();
        const stack: any[] = [moduleNamespace];

        while (stack.length) {
          const current = stack.pop();
          if (!current || visited.has(current)) continue;
          visited.add(current);

          if (typeof current === 'function') {
            return current;
          }

          if (typeof current !== 'object' || isTypedArray(current)) {
            continue;
          }

          for (const key of Object.keys(current)) {
            const value = current[key];
            if (key === 'initSqlJs' && typeof value === 'function') {
              return value;
            }
            stack.push(value);
          }
        }

        return null;
      };

      // Try loading from local public folder first
      try {
        console.log(`📦 Trying to load sql.js from local public folder...`);
        const script = document.createElement('script');
        script.src = '/sqljs/sql-wasm.js';
        script.async = true;
        
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout loading sql.js script'));
          }, 10000);
          
          script.onload = () => {
            clearTimeout(timeout);
            console.log(`✅ sql.js script loaded from local file`);
            // @ts-ignore - sql.js is loaded globally
            if (typeof window.initSqlJs === 'function') {
              resolve();
            } else {
              // Wait a bit for initSqlJs to be available
              setTimeout(() => {
                // @ts-ignore
                if (typeof window.initSqlJs === 'function') {
                  resolve();
                } else {
                  reject(new Error('initSqlJs not found after script load'));
                }
              }, 100);
            }
          };
          script.onerror = (err) => {
            clearTimeout(timeout);
            reject(new Error(`Failed to load sql.js script: ${err}`));
          };
          document.head.appendChild(script);
        });
        
        // @ts-ignore
        const SQL = await window.initSqlJs({ locateFile });
        console.log(`✅ sql.js initialized from local file`);
        return SQL as SqlJsStatic;
      } catch (localError) {
        console.warn(`⚠️ Local file load failed, trying CDN:`, localError);
        
        // Fallback to CDN
        try {
          console.log(`📦 Trying to load sql.js from CDN...`);
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/sql-wasm.js';
          script.async = true;
          
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Timeout loading sql.js from CDN'));
            }, 10000);
            
            script.onload = () => {
              clearTimeout(timeout);
              console.log(`✅ sql.js script loaded from CDN`);
              // @ts-ignore
              if (typeof window.initSqlJs === 'function') {
                resolve();
              } else {
                setTimeout(() => {
                  // @ts-ignore
                  if (typeof window.initSqlJs === 'function') {
                    resolve();
                  } else {
                    reject(new Error('initSqlJs not found after CDN load'));
                  }
                }, 100);
              }
            };
            script.onerror = (err) => {
              clearTimeout(timeout);
              reject(new Error(`Failed to load sql.js from CDN: ${err}`));
            };
            document.head.appendChild(script);
          });
          
          // @ts-ignore
          const SQL = await window.initSqlJs({ locateFile });
          console.log(`✅ sql.js initialized from CDN`);
          return SQL as SqlJsStatic;
        } catch (cdnError) {
          console.warn(`⚠️ CDN load also failed:`, cdnError);
        }
      }

      // Try local imports
      const specifiers = [
        'sql.js',
        'sql.js/dist/sql-wasm.js',
        'sql.js/dist/sql-wasm.js?module'
      ];

      for (const specifier of specifiers) {
        try {
          console.log(`📦 Trying to import ${specifier}...`);
          const module = await import(/* @vite-ignore */ specifier);
          const initSqlJs =
            module?.default?.initSqlJs ||
            module?.initSqlJs ||
            module?.default?.default ||
            module?.default ||
            pickInitFunction(module);

          if (typeof initSqlJs === 'function') {
            console.log(`✅ Found initSqlJs function in ${specifier}`);
            const sqlJs = await initSqlJs({ locateFile });
            console.log(`✅ sql.js initialized successfully`);
            return sqlJs as SqlJsStatic;
          }

          console.group('🧩 sql.js module shape');
          console.log('specifier:', specifier);
          console.log('module keys:', Object.keys(module || {}));
          console.log('module.default keys:', module?.default && Object.keys(module.default));
          console.log('typeof module:', typeof module);
          console.log('typeof module.default:', typeof module?.default);
          console.log('typeof module.default.default:', typeof module?.default?.default);
          console.groupEnd();
        } catch (error) {
          console.warn(`⚠️ Failed to import ${specifier}:`, error);
        }
      }

      const error = new Error('sql.js init function not found');
      console.error('❌ sql.js initialization failed:', error);
      throw error;
    })();
  }
  return sqlJsPromise;
}

async function loadDatabase(path: string, existingPromise: Promise<Database> | null): Promise<Database> {
  if (existingPromise) {
    console.log(`♻️ Reusing existing database promise for ${path}`);
    return existingPromise;
  }
  console.log(`📦 Loading SQLite database from ${path}`);
  try {
    console.log(`🔧 Getting sql.js instance...`);
    const SQL = await getSqlJs();
    console.log(`✅ sql.js loaded successfully, type:`, typeof SQL);
    console.log(`📡 Fetching database file from ${path}...`);
    const response = await fetch(path);
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      console.error(`❌ HTTP error response:`, errorText.substring(0, 200));
      throw new Error(`Failed to load database from ${path} (status ${response.status}): ${errorText.substring(0, 100)}`);
    }
    const buffer = await response.arrayBuffer();
    console.log(`✅ Database file loaded, size: ${buffer.byteLength} bytes`);
    if (buffer.byteLength === 0) {
      throw new Error(`Database file is empty (0 bytes)`);
    }
    console.log(`🔧 Creating SQLite database instance...`);
    const db = new SQL.Database(new Uint8Array(buffer));
    console.log(`✅ SQLite database initialized successfully`);
    return db;
  } catch (error) {
    console.error(`❌ Failed to load database from ${path}:`, error);
    if (error instanceof Error) {
      console.error(`❌ Error message:`, error.message);
      console.error(`❌ Error stack:`, error.stack);
    }
    throw error;
  }
}

async function getLayoutDatabase(): Promise<Database> {
  if (!layoutDbPromise) {
    layoutDbPromise = loadDatabase(LAYOUT_DB_PATH, layoutDbPromise);
  }
  return layoutDbPromise;
}

async function getWordsDatabase(): Promise<Database> {
  if (!wordsDbPromise) {
    wordsDbPromise = loadDatabase(WORDS_DB_PATH, wordsDbPromise);
  }
  return wordsDbPromise;
}

export async function getQpcV1Layout(pageNumber: number): Promise<LayoutPage | null> {
  console.log(`📖 [getQpcV1Layout] START - Loading QPC V1 layout for page ${pageNumber} from ${LAYOUT_DB_PATH}`);
  try {
    console.log(`📖 [getQpcV1Layout] Step 1: Getting layout database...`);
    const db = await getLayoutDatabase();
    console.log(`✅ [getQpcV1Layout] Step 1: Database loaded successfully, type:`, typeof db);
    
    const stmt = db.prepare(
      'SELECT page_number, line_number, line_type, is_centered, first_word_id, last_word_id, surah_number FROM pages WHERE page_number = ? ORDER BY line_number ASC'
    );
    stmt.bind([pageNumber]);
    const lines: Line[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject();
      const firstWordRaw = row.first_word_id as number | string | null;
      const lastWordRaw = row.last_word_id as number | string | null;
      const surahRaw = row.surah_number as number | string | null;
      const rawLineType = (row.line_type as string) || 'ayah';
      const normalizedLineType = rawLineType.toLowerCase();
      const lineType: Line['line_type'] =
        normalizedLineType === 'surah_name'
          ? 'surah_name'
          : normalizedLineType === 'basmallah'
            ? 'basmallah'
            : 'ayah';

      lines.push({
        page_number: Number(row.page_number ?? pageNumber),
        line_number: Number(row.line_number ?? 0),
        line_type: lineType,
        is_centered: Number(row.is_centered) === 1,
        first_word_id:
          firstWordRaw === null || firstWordRaw === '' ? null : Number(firstWordRaw),
        last_word_id:
          lastWordRaw === null || lastWordRaw === '' ? null : Number(lastWordRaw),
        surah_number:
          surahRaw === null || surahRaw === '' ? undefined : Number(surahRaw),
      });
    }

    stmt.free();

    if (lines.length === 0) {
      console.warn(`⚠️ No lines found in QPC V1 database for page ${pageNumber}`);
      return null;
    }

    console.log(`✅ Loaded ${lines.length} lines from QPC V1 database for page ${pageNumber}`);
    return {
      page_number: pageNumber,
      lines,
      metadata: {
        mushaf_name: 'QPC V1',
        code: 'qpc_v1',
        pages_count: 604,
        lines_per_page: 15,
        font_name: 'QPC V1 Font',
      },
    };
  } catch (error) {
    console.error(`❌ Error loading QPC V1 layout for page ${pageNumber}:`, error);
    console.error(`💡 Check if ${LAYOUT_DB_PATH} exists and is accessible`);
    return null;
  }
}

async function loadAllQpcWords(): Promise<Word[]> {
  const db = await getWordsDatabase();
  // Keep individual glyphs for display - don't group them
  // Grouping will be done on-the-fly when needed for mistake reports
  // Try to get all columns to see what's available
  const stmt = db.prepare('SELECT * FROM words LIMIT 1');
  let sampleRow: any = null;
  if (stmt.step()) {
    sampleRow = stmt.getAsObject();
    console.log('📋 Sample word row structure:', Object.keys(sampleRow));
    console.log('📋 Sample word row values:', sampleRow);
  }
  stmt.free();
  
  // Now load all words
  const allStmt = db.prepare('SELECT id, surah, ayah, word, text FROM words ORDER BY surah, ayah, id ASC');
  const words: Word[] = [];
  const wordGroups = new Map<string, number>(); // Track word numbers per ayah

  while (allStmt.step()) {
    const row = allStmt.getAsObject();
    const surah = Number(row.surah);
    const ayah = Number(row.ayah);
    const ayahKey = `${surah}:${ayah}`;
    
    // The 'word' field might be the word number within the ayah, or it might be something else
    // Let's try using it, but also track word numbers ourselves based on consecutive glyphs
    const dbWordNum = Number(row.word || 0);
    
    // If word number is 0 or same as id, it's probably not a word number - we'll need to infer it
    let wordNum = dbWordNum;
    if (wordNum === 0 || wordNum === Number(row.id)) {
      // Try to infer word number by looking at consecutive glyphs
      // For now, we'll use a simple heuristic: group consecutive glyphs that don't have spaces
      // But actually, let's check if the word field has any pattern
      wordNum = dbWordNum;
    }
    
    words.push({
      word_index: Number(row.id),
      surah: surah,
      ayah: ayah,
      text: (row.text as string) || '',
      // Store word number for later grouping
      word: wordNum,
    } as Word & { word?: number });
  }

  allStmt.free();
  
  // Debug: Check word number distribution for first few ayahs
  const firstAyah = words.find(w => w.surah === 1 && w.ayah === 1);
  if (firstAyah) {
    const firstAyahWords = words.filter(w => w.surah === 1 && w.ayah === 1).slice(0, 20);
    console.log('📊 First 20 glyphs of Surah 1, Ayah 1:', firstAyahWords.map(w => ({
      word_index: w.word_index,
      word: (w as Word & { word?: number }).word,
      text: w.text
    })));
  }
  
  return words;
}

// Helper function to reconstruct full words from glyphs
export function reconstructWordsFromGlyphs(glyphs: Word[]): Word[] {
  // Group glyphs by (surah, ayah, word) to reconstruct full words
  const wordMap = new Map<string, Array<Word & { word?: number }>>();
  
  glyphs.forEach(glyph => {
    const wordNum = (glyph as Word & { word?: number }).word || 0;
    const key = `${glyph.surah}:${glyph.ayah}:${wordNum}`;
    if (!wordMap.has(key)) {
      wordMap.set(key, []);
    }
    wordMap.get(key)!.push(glyph as Word & { word?: number });
  });
  
  // Create Word objects with combined text
  const words: Word[] = [];
  const processedKeys = new Set<string>();
  
  glyphs.forEach(glyph => {
    const wordNum = (glyph as Word & { word?: number }).word || 0;
    const key = `${glyph.surah}:${glyph.ayah}:${wordNum}`;
    if (!processedKeys.has(key)) {
      processedKeys.add(key);
      const glyphGroup = wordMap.get(key) || [];
      const combinedText = glyphGroup.map(g => g.text).join('').trim();
      
      // Use the first glyph's id as the word_index
      words.push({
        word_index: glyph.word_index,
        surah: glyph.surah,
        ayah: glyph.ayah,
        text: combinedText || glyph.text,
      });
    }
  });
  
  return words;
}

export async function getAllQpcV1Words(): Promise<Word[]> {
  if (!wordsCachePromise) {
    wordsCachePromise = loadAllQpcWords();
  }
  return wordsCachePromise;
}

export async function ensureQpcV1Font(pageNumber: number): Promise<string> {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return 'Amiri';
  }

  if (!loadedFonts.has(pageNumber)) {
    const fontFamily = `QPCV1-Page-${pageNumber}`;
    const fontPath = `/fonts/${FONT_DIR_NAME}/p${pageNumber}.woff`;
    console.log(`🔤 Loading QPC V1 font for page ${pageNumber} from: ${fontPath}`);
    try {
      const fontFace = new FontFace(fontFamily, `url(${fontPath})`);
      const loadedFont = await fontFace.load();
      document.fonts.add(loadedFont);
      loadedFonts.set(pageNumber, fontFamily);
      console.log(`✅ QPC V1 font loaded successfully: ${fontFamily}`);
      
      // Verify font is available
      if (document.fonts.check(`16px ${fontFamily}`)) {
        console.log(`✅ Font verified and ready to use: ${fontFamily}`);
      } else {
        console.warn(`⚠️ Font loaded but not yet available for use: ${fontFamily}`);
      }
    } catch (error) {
      console.error(`❌ Failed to load QPC V1 font for page ${pageNumber} from ${fontPath}:`, error);
      loadedFonts.set(pageNumber, 'Amiri');
    }
  }

  return loadedFonts.get(pageNumber) || 'Amiri';
}
